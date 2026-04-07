// =====================================================================
//  DESPENSA ECONÓMICA — Supabase Sync v8
//  ✅ Login con Supabase Auth (correo + contraseña)
//  ✅ Roles admin/cajero desde tabla perfiles
//  ✅ Restricciones por rol correctas
//  ✅ URL+Key guardadas en Supabase
//  ✅ Sistema de membresías con validación de expiración
//  ✅ Usuarios exentos: Santiago / Madelline
//  ✅ Pago en efectivo y tarjeta
// =====================================================================

// ── Usuarios exentos de membresía (Super Admins) ─────────────────────
const _EMAILS_EXENTOS = ['emilioenri71@gmail.com', 'a10.11.2002m@gmail.com'];

const _PLANES_MEMBRESIA = [
  { id: 'semanal',    label: 'Semanal',         precio: 3.00,  dias: 7,    icono: '📅', popular: false },
  { id: 'mensual',    label: 'Mensual',          precio: 11.00, dias: 30,   icono: '🗓️', popular: true  },
  { id: 'anual',      label: 'Anual',            precio: 125.00,dias: 365,  icono: '🏆', popular: false },
  { id: 'definitivo', label: 'Pago Único Total', precio: 500.00,dias: null, icono: '♾️', popular: false },
];

let _sesionActiva  = false;
let _tiendaId      = null;
let _usuarioActual = null; // { id, email, nombre, rol }
let _authToken     = null;
let _dispositivoId = localStorage.getItem('vpos_dispositivoId') || ('dev_' + Math.random().toString(36).slice(2,8));
localStorage.setItem('vpos_dispositivoId', _dispositivoId);

const ROLES = {
  admin:  { label: 'Admin',  color: '#7c3aed', puede: ['vender','inventario','reportes','gastos','config','usuarios','fusionar','reiniciar'] },
  cajero: { label: 'Cajero', color: '#1d4ed8', puede: ['vender'] }
};

function _puedeHacer(accion) {
  if (!_usuarioActual) return false;
  return (ROLES[_usuarioActual.rol] || ROLES.cajero).puede.includes(accion);
}

// ── Credenciales de Supabase ─────────────────────────────────────────
// Puedes escribir aquí tus credenciales para que cualquier dispositivo
// las tenga automáticamente sin necesidad de configurarlas.
// La anon key es pública y segura para estar en el frontend.
const _SB_URL_DEFAULT = 'https://bmusprrznlqkgzkpyfsi.supabase.co';  // ← pega aquí tu Project URL
const _SB_KEY_DEFAULT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtdXNwcnJ6bmxxa2d6a3B5ZnNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMjM5NDQsImV4cCI6MjA4OTY5OTk0NH0.ohhqWt0RPsg4m5r8TlQAfUuR62CiGZImMBE1FB9c-7w';  // ← pega aquí tu anon public key

function _sbUrl() {
  return (localStorage.getItem('vpos_supabaseUrl') || _SB_URL_DEFAULT).replace(/\/$/, '');
}
function _sbKey() {
  return localStorage.getItem('vpos_supabaseKey') || _SB_KEY_DEFAULT;
}
function _getTiendaId() { return _tiendaId || localStorage.getItem('vpos_tiendaId') || ''; }

// Headers con JWT del usuario autenticado (más seguro que anon key)
function _headers(extra) {
  const key = _sbKey();
  const auth = _authToken ? ('Bearer ' + _authToken) : ('Bearer ' + key);
  return Object.assign({ 'apikey': key, 'Authorization': auth, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, extra || {});
}

async function _sbGet(tabla, params) {
  const url = _sbUrl(), key = _sbKey();
  if (!url || !key) throw new Error('Sin configuración de Supabase');
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const resp = await fetch(url + '/rest/v1/' + tabla + qs, { headers: _headers({'Prefer': ''}) });
  if (!resp.ok) { const txt = await resp.text(); throw new Error('HTTP ' + resp.status + ': ' + txt); }
  return resp.json();
}

async function _sbPost(tabla, body, upsert) {
  const url = _sbUrl(), key = _sbKey();
  if (!url || !key) throw new Error('Sin config');
  const h = _headers({ 'Prefer': upsert ? 'resolution=merge-duplicates,return=minimal' : 'return=minimal' });
  const resp = await fetch(url + '/rest/v1/' + tabla, { method: 'POST', headers: h, body: JSON.stringify(body) });
  if (!resp.ok) { const txt = await resp.text(); throw new Error('HTTP ' + resp.status + ': ' + txt); }
}

// PATCH: actualizar registro(s) que cumplan filtro — más confiable que upsert para updates
async function _sbPatch(tabla, filtro, body) {
  const url = _sbUrl(), key = _sbKey();
  if (!url || !key) throw new Error('Sin config');
  const qs = '?' + new URLSearchParams(filtro).toString();
  const h = _headers({ 'Prefer': 'return=minimal' });
  const resp = await fetch(url + '/rest/v1/' + tabla + qs, {
    method: 'PATCH', headers: h, body: JSON.stringify(body)
  });
  if (!resp.ok) { const txt = await resp.text(); throw new Error('HTTP ' + resp.status + ': ' + txt); }
}

async function _sbDeleteFiltro(tabla, filtro) {
  const url = _sbUrl(), key = _sbKey();
  if (!url || !key) return;
  await fetch(url + '/rest/v1/' + tabla + '?' + new URLSearchParams(filtro).toString(), {
    method: 'DELETE', headers: _headers({'Prefer': 'return=minimal'})
  });
}

// =====================================================================
//  🔐 SUPABASE AUTH
// =====================================================================

async function _authSignUp(email, password) {
  const url = _sbUrl(), key = _sbKey();
  const resp = await fetch(url + '/auth/v1/signup', {
    method: 'POST',
    headers: { 'apikey': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.msg || data.error_description || 'Error al registrar');
  return data;
}

async function _authSignIn(email, password) {
  const url = _sbUrl(), key = _sbKey();
  const resp = await fetch(url + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'apikey': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.msg || data.error_description || 'Correo o contraseña incorrectos');
  return data; // { access_token, user: { id, email } }
}

async function _authSignOut() {
  const url = _sbUrl(), key = _sbKey();
  if (!_authToken) return;
  await fetch(url + '/auth/v1/logout', {
    method: 'POST',
    headers: { 'apikey': key, 'Authorization': 'Bearer ' + _authToken }
  }).catch(() => {});
}

// =====================================================================
//  🔐 LOGIN MODAL
// =====================================================================

function abrirLogin() {
  if (_sesionActiva) {
    if (!document.getElementById('modalCerrarSesion')) {
      const m = document.createElement('div');
      m.id = 'modalCerrarSesion';
      m.style.cssText = 'position:fixed;inset:0;z-index:10065;background:rgba(5,46,22,0.75);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;padding:16px;';
      m.innerHTML = `
        <div style="background:#fff;border-radius:20px;width:100%;max-width:340px;box-shadow:0 24px 60px rgba(0,0,0,0.4);overflow:hidden;">
          <div style="background:linear-gradient(135deg,#166534,#16a34a);padding:22px 24px 18px;text-align:center;">
            <div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26px;margin:0 auto 10px;">👤</div>
            <div style="color:#fff;font-size:16px;font-weight:900;font-family:Nunito,sans-serif;" id="csDlgNombre">—</div>
            <div style="color:rgba(255,255,255,0.75);font-size:12px;font-weight:700;font-family:Nunito,sans-serif;margin-top:3px;" id="csDlgEmail">—</div>
          </div>
          <div style="padding:22px 24px;">
            <div style="font-size:14px;font-weight:700;color:#374151;font-family:Nunito,sans-serif;text-align:center;margin-bottom:20px;line-height:1.6;">
              ¿Deseas cerrar la sesión actual?
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <button onclick="document.getElementById('modalCerrarSesion').style.display='none'"
                style="padding:13px;background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:12px;font-size:14px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;color:#374151;">
                ✕ Cancelar
              </button>
              <button onclick="document.getElementById('modalCerrarSesion').style.display='none';cerrarSesion();"
                style="padding:13px;background:linear-gradient(135deg,#dc2626,#991b1b);border:none;border-radius:12px;font-size:14px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;color:#fff;box-shadow:0 4px 14px rgba(220,38,38,0.3);">
                🚪 Cerrar sesión
              </button>
            </div>
          </div>
        </div>`;
      m.addEventListener('click', e => { if (e.target === m) m.style.display = 'none'; });
      document.body.appendChild(m);
    }
    document.getElementById('csDlgNombre').textContent = _usuarioActual?.nombre || _usuarioActual?.email || '\u2014';
    document.getElementById('csDlgEmail').textContent  = _usuarioActual?.email || '';
    document.getElementById('modalCerrarSesion').style.display = 'flex';
    return;
  }
  _crearModalLogin();
  const modal = document.getElementById('modalLogin');
  if (modal) modal.style.display = 'flex';
}
function _crearModalLogin() {
  if (document.getElementById('modalLogin')) return;

  // Inyectar estilos de la pantalla de login
  if (!document.getElementById('loginStyles')) {
    const style = document.createElement('style');
    style.id = 'loginStyles';
    style.textContent = `
      #modalLogin {
        position: fixed; inset: 0; z-index: 10000;
        background: linear-gradient(135deg, #052e16 0%, #14532d 40%, #166534 100%);
        display: flex; align-items: center; justify-content: center;
        padding: 16px; overflow-y: auto;
        animation: loginFadeIn 0.4s ease;
      }
      @keyframes loginFadeIn { from { opacity: 0; } to { opacity: 1; } }
      #modalLogin.open { display: flex !important; }
      .login-card {
        background: #fff; border-radius: 24px; width: 100%; max-width: 440px;
        box-shadow: 0 32px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.08);
        overflow: hidden; animation: loginSlideUp 0.4s cubic-bezier(0.22,1,0.36,1);
      }
      @keyframes loginSlideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      .login-header {
        background: linear-gradient(135deg, #16a34a, #15803d);
        padding: 32px 28px 28px; text-align: center; position: relative;
      }
      .login-header-icon {
        width: 64px; height: 64px; background: rgba(255,255,255,0.2);
        border-radius: 20px; display: flex; align-items: center; justify-content: center;
        font-size: 32px; margin: 0 auto 14px; border: 2px solid rgba(255,255,255,0.3);
        backdrop-filter: blur(10px);
      }
      .login-header h1 { color: #fff; font-size: 22px; font-weight: 900; margin: 0 0 6px; font-family: Nunito, sans-serif; }
      .login-header p { color: rgba(255,255,255,0.8); font-size: 13px; font-weight: 700; margin: 0; font-family: Nunito, sans-serif; }
      .login-tabs {
        display: grid; grid-template-columns: 1fr 1fr; gap: 0;
        border-bottom: 2px solid #f0fdf4;
      }
      .login-tab-btn {
        padding: 14px 8px; border: none; background: #fff; font-family: Nunito, sans-serif;
        font-weight: 900; font-size: 14px; cursor: pointer; color: #6b7280;
        border-bottom: 3px solid transparent; margin-bottom: -2px; transition: all 0.2s;
      }
      .login-tab-btn.active { color: #16a34a; border-bottom-color: #16a34a; background: #f0fdf4; }
      .login-body { padding: 24px 28px; }
      .login-field { margin-bottom: 16px; }
      .login-field label {
        display: block; font-size: 11px; font-weight: 900; color: #6b7280;
        text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 6px;
        font-family: Nunito, sans-serif;
      }
      .login-field input {
        width: 100%; padding: 12px 16px; border: 2px solid #d1fae5;
        border-radius: 12px; font-size: 15px; font-family: Nunito, sans-serif; font-weight: 700;
        box-sizing: border-box; outline: none; transition: border-color 0.2s;
        background: #f9fafb; color: #052e16;
      }
      .login-field input:focus { border-color: #16a34a; background: #fff; }
      .login-field .field-hint { font-size: 11px; color: #9ca3af; font-weight: 700; margin-top: 5px; font-family: Nunito, sans-serif; }
      .login-btn-main {
        width: 100%; padding: 15px; background: linear-gradient(135deg, #16a34a, #15803d);
        color: #fff; border: none; border-radius: 14px; font-size: 16px; font-weight: 900;
        font-family: Nunito, sans-serif; cursor: pointer; margin-top: 4px;
        box-shadow: 0 4px 20px rgba(22,163,74,0.4); transition: all 0.2s;
        letter-spacing: 0.3px;
      }
      .login-btn-main:hover { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(22,163,74,0.5); }
      .login-btn-main:active { transform: translateY(0); }
      .login-btn-main:disabled { opacity: 0.7; cursor: wait; transform: none; }
      .login-error {
        background: #fef2f2; border: 1.5px solid #fca5a5; border-radius: 10px;
        padding: 11px 14px; font-size: 13px; color: #dc2626; font-weight: 700;
        text-align: center; margin-bottom: 14px; display: none; font-family: Nunito, sans-serif;
      }
      .login-divider {
        text-align: center; margin: 16px 0 0; font-size: 12px; color: #9ca3af;
        font-weight: 700; font-family: Nunito, sans-serif;
      }
      .login-divider button {
        background: none; border: none; color: #6b7280; font-size: 12px; font-weight: 700;
        font-family: Nunito, sans-serif; cursor: pointer; text-decoration: underline;
        text-underline-offset: 3px;
      }
      /* MODAL MEMBRESÍA */
      #modalMembresia {
        position: fixed; inset: 0; z-index: 10001;
        background: rgba(5,46,22,0.85); backdrop-filter: blur(8px);
        display: none; align-items: center; justify-content: center; padding: 16px;
        overflow-y: auto;
      }
      #modalMembresia.open { display: flex; }
      .membresia-card {
        background: #fff; border-radius: 24px; width: 100%; max-width: 480px;
        box-shadow: 0 32px 80px rgba(0,0,0,0.5);
        animation: loginSlideUp 0.35s cubic-bezier(0.22,1,0.36,1);
        overflow: hidden;
      }
      .membresia-header {
        background: linear-gradient(135deg, #1e3a5f, #1d4ed8);
        padding: 28px 24px 22px; text-align: center;
      }
      .membresia-header h2 { color: #fff; font-size: 20px; font-weight: 900; margin: 0 0 6px; font-family: Nunito, sans-serif; }
      .membresia-header p { color: rgba(255,255,255,0.8); font-size: 13px; font-weight: 700; margin: 0; font-family: Nunito, sans-serif; }
      .plan-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 20px 20px 0; }
      .plan-card {
        border: 2px solid #e5e7eb; border-radius: 16px; padding: 16px 12px; cursor: pointer;
        transition: all 0.2s; position: relative; background: #fff; text-align: center;
      }
      .plan-card:hover { border-color: #86efac; background: #f0fdf4; transform: translateY(-2px); }
      .plan-card.selected { border-color: #16a34a; background: #f0fdf4; box-shadow: 0 0 0 3px rgba(22,163,74,0.15); }
      .plan-card.popular::before {
        content: '⭐ Popular'; position: absolute; top: -10px; left: 50%; transform: translateX(-50%);
        background: #16a34a; color: #fff; font-size: 10px; font-weight: 900; font-family: Nunito, sans-serif;
        padding: 3px 10px; border-radius: 20px; white-space: nowrap;
      }
      .plan-icono { font-size: 24px; margin-bottom: 6px; }
      .plan-nombre { font-size: 13px; font-weight: 900; color: #052e16; font-family: Nunito, sans-serif; margin-bottom: 4px; }
      .plan-precio { font-size: 22px; font-weight: 900; color: #16a34a; font-family: Nunito, sans-serif; }
      .plan-precio span { font-size: 12px; color: #6b7280; font-weight: 700; }
      .plan-duracion { font-size: 11px; color: #9ca3af; font-weight: 700; font-family: Nunito, sans-serif; margin-top: 3px; }
      .pago-metodo-section { padding: 16px 20px 0; }
      .pago-metodo-section label { font-size: 11px; font-weight: 900; color: #6b7280; text-transform: uppercase; letter-spacing: 0.6px; font-family: Nunito, sans-serif; display: block; margin-bottom: 10px; }
      .pago-metodos { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .pago-metodo-btn {
        padding: 12px 8px; border: 2px solid #e5e7eb; border-radius: 12px; cursor: pointer;
        background: #fff; font-family: Nunito, sans-serif; font-weight: 900; font-size: 13px;
        transition: all 0.2s; text-align: center; color: #374151;
      }
      .pago-metodo-btn:hover { border-color: #86efac; background: #f0fdf4; }
      .pago-metodo-btn.selected { border-color: #1d4ed8; background: #eff6ff; color: #1d4ed8; }
      .membresia-footer { padding: 16px 20px 20px; }
      .membresia-resumen {
        background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px;
        padding: 12px 16px; margin-bottom: 14px; font-family: Nunito, sans-serif;
      }
      .membresia-resumen .res-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #166534; font-weight: 700; }
      .membresia-resumen .res-row.total { font-size: 16px; font-weight: 900; color: #052e16; margin-top: 8px; padding-top: 8px; border-top: 1px solid #bbf7d0; }
      .btn-pagar {
        width: 100%; padding: 15px; border: none; border-radius: 14px;
        font-size: 16px; font-weight: 900; font-family: Nunito, sans-serif;
        cursor: pointer; transition: all 0.2s; letter-spacing: 0.3px;
      }
      .btn-pagar.efectivo { background: linear-gradient(135deg, #059669, #065f46); color: #fff; box-shadow: 0 4px 16px rgba(5,150,105,0.4); }
      .btn-pagar.tarjeta { background: linear-gradient(135deg, #1d4ed8, #1e40af); color: #fff; box-shadow: 0 4px 16px rgba(29,78,216,0.4); }
      .btn-pagar:hover { transform: translateY(-1px); }
      .btn-pagar:disabled { opacity: 0.6; cursor: wait; transform: none; }
      .efectivo-instrucciones {
        background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 12px;
        padding: 14px 16px; font-size: 13px; color: #92400e; font-weight: 700;
        font-family: Nunito, sans-serif; line-height: 1.6; display: none;
      }
      .efectivo-instrucciones.visible { display: block; }
    `;
    document.head.appendChild(style);
  }

  const modal = document.createElement('div');
  modal.id = 'modalLogin';
  modal.innerHTML = `
    <div class="login-card">
      <div class="login-header">
        <div class="login-header-icon">🏪</div>
        <h1>Despensa Económica</h1>
        <p id="loginSubtitle">Sistema de Ventas Profesional</p>
      </div>
      <div class="login-tabs">
        <button class="login-tab-btn active" id="tabEntrar" onclick="_loginTab('entrar')">🔑 Iniciar Sesión</button>
        <button class="login-tab-btn" id="tabRegistrar" onclick="_loginTab('registrar')">✨ Registrarse</button>
      </div>
      <div class="login-body">
        <div id="loginError" class="login-error"></div>

        <div id="campoNombre" class="login-field" style="display:none;">
          <label>Nombre completo</label>
          <input id="loginNombre" type="text" placeholder="Tu nombre">
        </div>
        <div id="campoNombreTienda" class="login-field" style="display:none;">
          <label>Nombre de tu tienda</label>
          <input id="loginNombreTienda" type="text" placeholder="Ej: Tienda García, Super Hernández">
          <div class="field-hint">Este nombre aparecerá en tu app y tus reportes PDF</div>
        </div>
        <div id="campoTienda" class="login-field" style="display:none;">
          <label>ID de Tienda</label>
          <input id="loginTiendaId" type="text" placeholder="ej: tienda1, despensa" value="${localStorage.getItem('vpos_tiendaId') || ''}">
          <div class="field-hint">ID técnico — usa el mismo en todos tus dispositivos</div>
        </div>
        <div class="login-field">
          <label>Correo electrónico</label>
          <input id="loginEmail" type="email" placeholder="correo@ejemplo.com" value="${localStorage.getItem('vpos_email') || ''}">
        </div>
        <div class="login-field">
          <label>Contraseña</label>
          <div style="position:relative;">
            <input id="loginPassword" type="password" placeholder="mínimo 6 caracteres" style="padding-right:44px;width:100%;box-sizing:border-box;">
            <button type="button" id="btnTogglePass"
              onclick="(function(){const i=document.getElementById('loginPassword');const b=document.getElementById('btnTogglePass');i.type=i.type==='password'?'text':'password';b.textContent=i.type==='password'?'👁':'🙈';})()"
              style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:18px;line-height:1;padding:4px;color:#6b7280;">👁</button>
          </div>
          <div style="text-align:right;margin-top:6px;">
            <button type="button" onclick="_abrirRecuperarPass()"
              style="background:none;border:none;cursor:pointer;font-size:12px;font-weight:700;color:#16a34a;font-family:Nunito,sans-serif;padding:0;text-decoration:underline;">
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </div>

        <button onclick="intentarLogin()" id="btnLogin" class="login-btn-main">
          🔑 Entrar
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('loginPassword').addEventListener('keydown', e => { if (e.key === 'Enter') intentarLogin(); });

  // Crear también modal de membresía
  _crearModalMembresia();
}

function _loginTab(tab) {
  const esRegistrar = tab === 'registrar';
  document.getElementById('campoNombre').style.display = esRegistrar ? '' : 'none';
  document.getElementById('campoNombreTienda').style.display = esRegistrar ? '' : 'none';
  document.getElementById('campoTienda').style.display = esRegistrar ? '' : 'none';
  document.getElementById('tabEntrar').classList.toggle('active', !esRegistrar);
  document.getElementById('tabRegistrar').classList.toggle('active', esRegistrar);
  document.getElementById('btnLogin').textContent = esRegistrar ? '✅ Crear cuenta' : '🔑 Entrar';
  document.getElementById('loginSubtitle').textContent = esRegistrar ? 'Crea tu cuenta para tu tienda' : 'Sistema de Ventas Profesional';
  document.getElementById('loginError').style.display = 'none';
  window._loginMode = tab;
}

async function intentarLogin() {
  const esRegistrar = window._loginMode === 'registrar';
  const email    = (document.getElementById('loginEmail')?.value || '').trim();
  const password = (document.getElementById('loginPassword')?.value || '').trim();
  const btn      = document.getElementById('btnLogin');
  const errEl    = document.getElementById('loginError');
  errEl.style.display = 'none';

  if (!email || !email.includes('@')) { _mostrarLoginError('Ingresa un correo válido'); return; }
  if (!password || password.length < 6) { _mostrarLoginError('La contraseña debe tener al menos 6 caracteres'); return; }
  if (!_sbUrl() || !_sbKey()) { _mostrarLoginError('Primero configura Supabase en ⚙️ Sheets'); return; }

  btn.disabled = true;
  btn.textContent = esRegistrar ? 'Creando cuenta...' : 'Entrando...';

  try {
    if (esRegistrar) {
      // ── REGISTRO ───────────────────────────────────────────────────
      const nombre        = (document.getElementById('loginNombre')?.value || '').trim();
      const nombreTienda  = (document.getElementById('loginNombreTienda')?.value || '').trim();
      const tiendaId      = (document.getElementById('loginTiendaId')?.value || '').trim().toLowerCase().replace(/[^a-z0-9\-_]/g, '');
      if (!nombre)        { _mostrarLoginError('Ingresa tu nombre'); btn.disabled = false; btn.textContent = '✅ Crear cuenta'; return; }
      if (!nombreTienda)  { _mostrarLoginError('Ingresa el nombre de tu tienda'); btn.disabled = false; btn.textContent = '✅ Crear cuenta'; return; }
      if (!tiendaId)      { _mostrarLoginError('Ingresa el ID de tienda'); btn.disabled = false; btn.textContent = '✅ Crear cuenta'; return; }

      // ── Verificar si el correo ya tiene un perfil (activo o inactivo) ──
      const perfilesExistentes = await _sbGet('perfiles', { select: 'id,activo,tienda_id', email: 'eq.' + email }).catch(() => []);
      if (perfilesExistentes && perfilesExistentes.length > 0) {
        const activo = perfilesExistentes.find(p => p.activo);
        if (activo) {
          _mostrarLoginError('Ya existe una cuenta activa con ese correo. Usa "Entrar" para iniciar sesión.');
        } else {
          _mostrarLoginError('Este correo ya tiene una cuenta registrada (inactiva). Contacta al administrador para reactivarla.');
        }
        btn.disabled = false; btn.textContent = '✅ Crear cuenta'; return;
      }

      const authData = await _authSignUp(email, password);
      const userId   = authData.user?.id || authData.id;
      if (!userId) throw new Error('No se pudo crear la cuenta');

      // Verificar si ya hay admin en esta tienda
      const admins = await _sbGet('perfiles', { select: 'id', tienda_id: 'eq.' + tiendaId, rol: 'eq.admin' }).catch(() => []);
      const esAdmin = !admins || admins.length === 0;

      // Crear perfil con nombre de tienda
      await _sbPost('perfiles', {
        id: userId, tienda_id: tiendaId, email,
        nombre: nombre, tienda_nombre: nombreTienda,
        rol: esAdmin ? 'admin' : 'cajero',
        activo: true, created_at: new Date().toISOString()
      }, true);

      toast(esAdmin ? '✅ Cuenta creada — eres el Admin de esta tienda' : '✅ Cuenta creada como Cajero');

      // Auto-login después de registro
      await _completarLogin(email, password, tiendaId);

    } else {
      // ── LOGIN ───────────────────────────────────────────────────────
      await _completarLogin(email, password, null);
    }
  } catch(e) {
    _mostrarLoginError(e.message);
    btn.disabled = false;
    btn.textContent = esRegistrar ? '✅ Crear cuenta' : '🔑 Entrar';
  }
}

async function _completarLogin(email, password, tiendaIdOverride) {
  const authData = await _authSignIn(email, password);
  _authToken = authData.access_token;
  const userId = authData.user?.id;

  // Buscar perfil activo: primero por userId, si no hay buscar por email
  let perfiles = await _sbGet('perfiles', { select: '*', id: 'eq.' + userId, activo: 'eq.true' }).catch(() => []);

  if (!perfiles || !perfiles.length) {
    // Puede haber múltiples perfiles con el mismo correo — buscar el activo por email
    perfiles = await _sbGet('perfiles', { select: '*', email: 'eq.' + email, activo: 'eq.true', limit: 1 }).catch(() => []);
  }

  if (!perfiles || !perfiles.length) {
    throw new Error('Tu cuenta ha sido desactivada. Contacta al administrador para reactivarla.');
  }

  const perfil = perfiles[0];
  _usuarioActual = { ...perfil, email };
  _tiendaId = tiendaIdOverride || perfil.tienda_id;
  _sesionActiva = true;
  if (typeof iniciarAutoPoll === 'function') iniciarAutoPoll();

  // Guardar en localStorage
  localStorage.setItem('vpos_email', email);
  localStorage.setItem('vpos_authToken', _authToken);
  localStorage.setItem('vpos_usuarioData', JSON.stringify(_usuarioActual));
  localStorage.setItem('vpos_tiendaId', _tiendaId);
  localStorage.setItem('vpos_sesionActiva', '1');

  // ── Verificar membresía ──────────────────────────────────────────
  const esExento = _EMAILS_EXENTOS.includes(email.toLowerCase().trim());
  if (!esExento) {
    const membresiaActiva = await _verificarMembresia(userId, email);
    if (!membresiaActiva) {
      // Cerrar pantalla de login y mostrar modal de membresía
      const modalLogin = document.getElementById('modalLogin');
      if (modalLogin) modalLogin.style.display = 'none';
      _abrirModalMembresia(email, userId);
      return; // No continuar hasta que pague
    }
  }

  // Continuar con login normal
  _finalizarLogin();
}

async function _finalizarLogin() {
  const modalLogin = document.getElementById('modalLogin');
  if (modalLogin) modalLogin.style.display = 'none';
  _actualizarBadgeLogin();
  _aplicarRestriccionesPorRol();
  _registrarAccion('login', 'Inicio de sesion');
  _actualizarTabAdmin();
  _actualizarNombreTienda(); // Poner nombre de la tienda en toda la UI

  // Cargar datos desde Supabase
  const btn = document.getElementById('btnLogin');
  if (btn) btn.textContent = 'Cargando datos...';
  await _cargarDatosAlIniciar();

  // Inmediatamente subir datos locales que no están en Supabase
  setTimeout(async () => {
    try {
      if (typeof productos !== 'undefined' && productos && productos.length > 0) {
        await _subirStockBase();
      }
    } catch(e) { console.warn('[PostLogin upload]', e.message); }
  }, 500);

  toast('✅ Bienvenido ' + _usuarioActual.nombre + ' · ' + (ROLES[_usuarioActual.rol]?.label || ''));
}

// ── Actualizar nombre de la tienda en toda la UI ──────────────────────
function _actualizarNombreTienda() {
  // Para el super admin siempre es "Despensa Económica"
  const esSA = _esSuperAdmin();
  const nombre = esSA
    ? 'Despensa Económica'
    : (_usuarioActual?.tienda_nombre || _getTiendaId() || 'Mi Tienda');

  // Guardar en localStorage para persistir entre recargas
  localStorage.setItem('vpos_tiendaNombre', nombre);

  _aplicarNombreTiendaDOM(nombre);
}

function _aplicarNombreTiendaDOM(nombre) {
  // Separar en dos partes para el estilo: primera palabra bold + resto opaco
  const partes = nombre.split(' ');
  const p1 = partes[0];
  const p2 = partes.length > 1 ? ' ' + partes.slice(1).join(' ') : '';
  const html = p1 + (p2 ? `<span>${p2}</span>` : '');

  // Navbar logo
  const logo = document.querySelector('.logo');
  if (logo) logo.innerHTML = html;

  // Loading logo
  const loadingLogo = document.querySelector('.loading-logo');
  if (loadingLogo) loadingLogo.innerHTML = html;

  // Drawer brand
  const drawerBrand = document.querySelector('.drawer-brand');
  if (drawerBrand) drawerBrand.innerHTML = html;

  // Footer del drawer
  const drawerFooter = document.querySelector('.drawer-footer-txt');
  if (drawerFooter) drawerFooter.textContent = nombre + ' — Sistema de Punto de Venta';

  // Título de la pestaña del navegador
  document.title = nombre + ' — Sistema de Ventas';
}

async function _cargarDatosAlIniciar() {
  // Primero intentar snapshot fusionado (por compatibilidad)
  try {
    const fusionId = _getTiendaId() + '_fusionado';
    const snaps = await _sbGet('sync_snapshots', { select: 'datos', id: 'eq.' + fusionId });
    if (snaps && snaps.length > 0) {
      await _aplicarDatos(JSON.parse(snaps[0].datos));
      return; // snapshot encontrado, no necesitamos más
    }
  } catch(e) { console.warn('[cargarDatos snapshot]', e.message); }

  // Si no hay snapshot, cargar directamente de las tablas de Supabase
  await _autoCargarDesdeSupa();
}

function entrarSinLogin() {
  const modal = document.getElementById('modalLogin');
  if (modal) modal.style.display = 'none';
}
function _mostrarLoginError(msg) {
  const el = document.getElementById('loginError');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

async function cerrarSesion() {
  await _authSignOut();
  if (typeof detenerAutoPoll === 'function') detenerAutoPoll();
  _sesionActiva = false; _tiendaId = null; _usuarioActual = null; _authToken = null;
  localStorage.removeItem('vpos_sesionActiva');
  localStorage.removeItem('vpos_usuarioData');
  localStorage.removeItem('vpos_authToken');
  _actualizarBadgeLogin();
  _quitarRestriccionesPorRol();
  toast('Sesion cerrada');
  setTimeout(() => { abrirLogin(); }, 600);
}

// ── Recuperar contraseña ─────────────────────────────────────────────
function _abrirRecuperarPass() {
  // Crear modal si no existe
  if (!document.getElementById('modalRecuperarPass')) {
    const m = document.createElement('div');
    m.id = 'modalRecuperarPass';
    m.style.cssText = 'position:fixed;inset:0;z-index:10070;background:rgba(5,46,22,0.8);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;padding:16px;';
    m.innerHTML = `
      <div style="background:#fff;border-radius:20px;width:100%;max-width:400px;box-shadow:0 24px 60px rgba(0,0,0,0.4);overflow:hidden;">
        <div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:22px 24px 18px;display:flex;align-items:center;gap:12px;">
          <span style="font-size:26px;">🔑</span>
          <div>
            <div style="color:#fff;font-size:16px;font-weight:900;font-family:Nunito,sans-serif;">Recuperar contraseña</div>
            <div style="color:rgba(255,255,255,0.75);font-size:12px;font-weight:700;font-family:Nunito,sans-serif;">Te enviaremos un enlace por correo</div>
          </div>
        </div>
        <div style="padding:22px 24px;">
          <div style="margin-bottom:16px;">
            <label style="display:block;font-size:11px;font-weight:900;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;font-family:Nunito,sans-serif;margin-bottom:6px;">Correo electrónico</label>
            <input id="recPassEmail" type="email" placeholder="tu@correo.com"
              style="width:100%;padding:12px 14px;border:1.5px solid #d1fae5;border-radius:11px;font-size:15px;font-weight:700;font-family:Nunito,sans-serif;box-sizing:border-box;outline:none;">
          </div>
          <div id="recPassMsg" style="display:none;padding:10px 13px;border-radius:10px;font-size:13px;font-weight:700;font-family:Nunito,sans-serif;margin-bottom:14px;"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <button onclick="document.getElementById('modalRecuperarPass').style.display='none'"
              style="padding:13px;background:#f3f4f6;border:1.5px solid #d1d5db;border-radius:12px;font-size:14px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;color:#374151;">
              ✕ Cancelar
            </button>
            <button id="btnEnviarRecPass" onclick="_enviarRecuperarPass()"
              style="padding:13px;background:linear-gradient(135deg,#16a34a,#15803d);border:none;border-radius:12px;font-size:14px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;color:#fff;box-shadow:0 4px 14px rgba(22,163,74,0.3);">
              📧 Enviar enlace
            </button>
          </div>
        </div>
      </div>`;
    m.addEventListener('click', e => { if(e.target===m) m.style.display='none'; });
    document.body.appendChild(m);
  }
  // Prellenar con email del login si existe
  const loginEmail = document.getElementById('loginEmail')?.value?.trim();
  const recEmail   = document.getElementById('recPassEmail');
  if (recEmail && loginEmail) recEmail.value = loginEmail;
  document.getElementById('recPassMsg').style.display = 'none';
  document.getElementById('modalRecuperarPass').style.display = 'flex';
}

async function _enviarRecuperarPass() {
  const email = (document.getElementById('recPassEmail')?.value || '').trim();
  const msg   = document.getElementById('recPassMsg');
  const btn   = document.getElementById('btnEnviarRecPass');
  if (!email || !email.includes('@')) {
    if (msg) { msg.style.display='block'; msg.style.background='#fef2f2'; msg.style.color='#dc2626'; msg.textContent='⚠ Ingresa un correo válido'; }
    return;
  }
  if (btn) { btn.disabled=true; btn.textContent='⏳ Enviando…'; }
  try {
    const url = _sbUrl(), key = _sbKey();
    const resp = await fetch(url + '/auth/v1/recover', {
      method: 'POST',
      headers: { 'apikey': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (msg) {
      msg.style.display = 'block';
      if (resp.ok || resp.status === 200) {
        msg.style.background = '#f0fdf4'; msg.style.color = '#15803d';
        msg.textContent = '✅ Enlace enviado. Revisa tu bandeja de entrada (y spam).';
        if (btn) { btn.disabled=false; btn.textContent='📧 Enviar enlace'; }
      } else {
        msg.style.background = '#fef2f2'; msg.style.color = '#dc2626';
        msg.textContent = '⚠ No se pudo enviar. Verifica el correo.';
        if (btn) { btn.disabled=false; btn.textContent='📧 Enviar enlace'; }
      }
    }
  } catch(e) {
    if (msg) { msg.style.display='block'; msg.style.background='#fef2f2'; msg.style.color='#dc2626'; msg.textContent='⚠ Error: '+e.message; }
    if (btn) { btn.disabled=false; btn.textContent='📧 Enviar enlace'; }
  }
}
window._abrirRecuperarPass  = _abrirRecuperarPass;
window._enviarRecuperarPass = _enviarRecuperarPass;

function _actualizarBadgeLogin() {
  const activa = _sesionActiva && _tiendaId;
  document.querySelectorAll('.login-status').forEach(el => {
    el.textContent = activa ? ('Sync: ' + _getTiendaId()) : 'Iniciar sesion';
    el.style.color = activa ? '#16a34a' : '#6b7280';
  });
  actualizarBadgeSheets();
}

async function restaurarSesion() {
  if (localStorage.getItem('vpos_sesionActiva') !== '1') return;
  const savedToken = localStorage.getItem('vpos_authToken');
  const savedUser  = localStorage.getItem('vpos_usuarioData');
  const savedTienda = localStorage.getItem('vpos_tiendaId');
  if (!savedToken || !savedUser) return;
  try {
    _authToken = savedToken;
    _tiendaId  = savedTienda;
    _sesionActiva = true;
    // SIEMPRE leer perfil fresco desde Supabase para obtener rol actualizado
    const tempUser = JSON.parse(savedUser);
    const perfiles = await _sbGet('perfiles', { select: '*', id: 'eq.' + tempUser.id, activo: 'eq.true' });
    if (!perfiles || !perfiles.length) {
      // Cuenta desactivada — forzar cierre de sesión
      _sesionActiva = false; _tiendaId = null; _usuarioActual = null; _authToken = null;
      localStorage.removeItem('vpos_sesionActiva');
      localStorage.removeItem('vpos_authToken');
      localStorage.removeItem('vpos_usuarioData');
      setTimeout(() => abrirLogin(), 300);
      return;
    }
    if (perfiles && perfiles.length > 0) {
      _usuarioActual = { ...perfiles[0], email: tempUser.email };
      localStorage.setItem('vpos_usuarioData', JSON.stringify(_usuarioActual));
    }
    _actualizarBadgeLogin();
    _aplicarRestriccionesPorRol();
    _actualizarTabAdmin();
    _actualizarNombreTienda();
    const ml = document.getElementById('modalLogin');
    if (ml) ml.style.display = 'none';
    // Auto-cargar datos desde Supabase directamente (sin necesitar snapshot fusionado)
    setTimeout(() => _autoCargarDesdeSupa(), 600);
    if (typeof iniciarAutoPoll === 'function') iniciarAutoPoll();
  } catch(e) {
    try { _usuarioActual = JSON.parse(savedUser); } catch(e2) {}
    _actualizarBadgeLogin();
    if (_usuarioActual) _aplicarRestriccionesPorRol();
    if (_usuarioActual) _actualizarTabAdmin();
    if (_usuarioActual) _actualizarNombreTienda();
  }
}

// Auto-carga directa desde tablas de Supabase al iniciar sesión (sin necesitar snapshot)
async function _autoCargarDesdeSupa() {
  if (!_sbUrl()||!_sbKey()) return;
  const tid=_getTiendaId();if(!tid)return;
  try {
    // Cargar productos directamente de la tabla productos
    const prods = await _sbGet('productos', { select: '*', tienda_id: 'eq.'+tid, limit: 2000 }).catch(() => null);

    // If no products in productos table, try sync_snapshots as fallback
    if (!prods || prods.length === 0) {
      try {
        const snaps = await _sbGet('sync_snapshots', {
          select: 'datos', tienda_id: 'eq.'+tid, order: 'created_at.desc', limit: 1
        });
        if (snaps && snaps.length > 0) {
          const snapData = JSON.parse(snaps[0].datos);
          if (snapData && snapData.productos && snapData.productos.length > 0) {
            if (typeof _aplicarDatos === 'function') {
              await _aplicarDatos(snapData);
              if (typeof actualizarTodo === 'function') actualizarTodo();
              _dot('green');
              return; // loaded from snapshot
            }
          }
        }
      } catch(e2) { console.warn('[AutoCarga snapshot fallback]', e2.message); }
    }

    if (prods && prods.length > 0) {
      // Hay datos en Supabase → cargarlos
      const prodsApp = prods.map(p => ({
        id: Number(String(p.id).replace(tid+'_','')) || String(p.id).replace(tid+'_',''),
        nom: p.nom || '', cat: p.cat || '',
        compra: Number(p.compra) || 0, venta: Number(p.venta) || 0,
        stock: Number(p.stock) || 0, min: Number(p.min) || 0,
        cod: p.cod || '', abrev: p.abrev || '',
        img: p.img || null, paquetes: p.paquetes || [], lotes: p.lotes || []
      }));
      productos = prodsApp;
      await idbSet('vpos_productos', productos);
      console.log('[AutoCarga] Cargados', prods.length, 'productos de Supabase');
    } else if (typeof productos !== 'undefined' && productos && productos.length > 0) {
      // No hay datos en Supabase pero sí locales → subirlos
      console.log('[AutoCarga] Supabase vacío, subiendo', productos.length, 'productos locales...');
      await _subirStockBase();
      console.log('[AutoCarga] Productos subidos a Supabase');
    }

    // Cargar ventas
    const ventas = await _sbGet('ventas', { select: '*', order: 'fecha_iso.desc', limit: 500 }).catch(() => null);
    if (ventas && ventas.length > 0) {
      historial = ventas.map(v => ({
        id: v.id, fecha: v.fecha_iso, total: Number(v.total) || 0,
        pago: Number(v.pago) || 0, vuelto: Number(v.vuelto) || 0,
        items: v.items || '', items_json: v.items_json || null
      }));
      await idbSet('vpos_historial', historial);
    }

    // Cargar pagos
    const pagosData = await _sbGet('pagos', { select: '*', order: 'fecha_iso.desc', limit: 500 }).catch(() => null);
    if (pagosData && pagosData.length > 0) {
      pagos = pagosData.map(p => ({
        id: p.id, fecha: p.fecha_iso, monto: Number(p.monto) || 0,
        cat: p.cat || '', nom: p.nom || '', nota: p.nota || ''
      }));
      await idbSet('vpos_pagos', pagos);
    }

    // Cargar restock log
    const restock = await _sbGet('restock_log', { select: '*', order: 'ts.desc', limit: 500 }).catch(() => null);
    if (restock && restock.length > 0) {
      restockLog = restock.map(r => ({
        id: r.id, ts: r.ts, prodId: r.prod_id,
        cant: r.cant, precioCompra: r.precio_compra, fechaStr: r.fecha_str
      }));
      await idbSet('vpos_restockLog', restockLog);
    }

    if (typeof actualizarTodo === 'function') actualizarTodo();
    _dot('green');
  } catch(e) {
    console.warn('[AutoCarga] Error:', e.message);
    _dot('red');
  }
}

// =====================================================================
//  🔒 CONTROL DE ACCESO POR ROL
// =====================================================================

function _aplicarRestriccionesPorRol() {
  if (!_usuarioActual) return;
  const esSuperAdmin = _esSuperAdmin();
  const esCajero = _usuarioActual.rol === 'cajero';

  // Super admins (Santiago y Madelline) ven TODO sin restricciones
  if (esSuperAdmin) return;

  if (esCajero) {
    // Cajero: solo puede ver Venta y Ventas por Día — ocultar todo lo demás
    ['pgReportes','pgInventario','pgSync','pgFinanzasMes','pgCierreDia'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    document.querySelectorAll('.nav-tab, .drawer-nav-item').forEach(tab => {
      const onclick = tab.getAttribute('onclick') || '';
      if (['pgReportes','pgInventario','pgSync','pgFinanzasMes','pgCierreDia'].some(p => onclick.includes(p))) {
        tab.style.display = 'none';
      }
    });
    // Ocultar backup bar (exportar, restaurar, fusionar)
    const backupBar = document.querySelector('.backup-bar');
    if (backupBar) backupBar.style.display = 'none';
    // Cajero SÍ puede ver Ventas por Día — asegurar que esté visible
    const dniVD = document.getElementById('dniVentasDiarias');
    if (dniVD) dniVD.style.display = '';
    const tabVD = document.querySelector('.nav-tab[onclick*="pgVentasDiarias"]');
    if (tabVD) tabVD.style.display = '';
  } else {
    // Admin de tienda: puede ver todo excepto Sync P2P, y los botones exportar/restaurar/fusionar
    const pgSync = document.getElementById('pgSync');
    if (pgSync) pgSync.style.display = 'none';
    document.querySelectorAll('.nav-tab, .drawer-nav-item').forEach(tab => {
      const onclick = tab.getAttribute('onclick') || '';
      if (onclick.includes('pgSync')) tab.style.display = 'none';
    });
    // Ocultar botones exportar, restaurar, fusionar (pero no toda la backup-bar)
    document.querySelectorAll('.btn-backup, .btn-restore').forEach(btn => {
      const oc = btn.getAttribute('onclick') || '';
      if (oc.includes('exportarDatos') || oc.includes('inputImportar') || oc.includes('inputFusionar')) {
        btn.style.display = 'none';
      }
    });
  }
}

function _quitarRestriccionesPorRol() {
  ['pgReportes','pgInventario','pgVentasDiarias','pgSync','pgFinanzasMes','pgCierreDia'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = '';
  });
  document.querySelectorAll('.nav-tab, .drawer-nav-item').forEach(el => { el.style.display = ''; });
  const backupBar = document.querySelector('.backup-bar');
  if (backupBar) backupBar.style.display = '';
  document.querySelectorAll('.btn-backup, .btn-restore').forEach(btn => { btn.style.display = ''; });
}

function _registrarAccion(accion, detalle) {
  if (!_sbUrl() || !_sbKey() || !_usuarioActual) return;
  _sbPost('acciones_log', {
    id: 'act_' + Date.now() + '_' + Math.random().toString(36).slice(2,5),
    tienda_id: _getTiendaId(),
    usuario_id: _usuarioActual.id || '',
    usuario_nom: _usuarioActual.nombre || _usuarioActual.email || '',
    accion, detalle: detalle || '',
    created_at: new Date().toISOString()
  }, false).catch(() => {});
}

// =====================================================================
//  👥 GESTIÓN DE USUARIOS (solo Admin)
// =====================================================================

async function abrirGestionUsuarios() {
  if (!_puedeHacer('usuarios')) { toast('Solo el Admin puede gestionar usuarios', true); return; }
  if (!_sbUrl() || !_sbKey()) { toast('Primero configura Supabase', true); return; }
  const rows = await _sbGet('perfiles', { select: '*', tienda_id: 'eq.' + _getTiendaId(), order: 'created_at.asc' }).catch(() => []);
  if (document.getElementById('modalUsuarios')) document.getElementById('modalUsuarios').remove();
  const modal = document.createElement('div');
  modal.id = 'modalUsuarios';
  modal.className = 'modal';
  const lista = (rows || []).map(u => {
    const rolInfo = ROLES[u.rol] || ROLES.cajero;
    return `<div style="display:flex;align-items:center;gap:10px;padding:12px;background:var(--surface2);border-radius:10px;border:1px solid var(--border);margin-bottom:8px;">
      <div style="flex:1;">
        <div style="font-weight:900;font-size:14px;color:var(--text);">${u.nombre}</div>
        <div style="font-size:12px;color:var(--text-muted);">${u.email}</div>
      </div>
      <span style="background:${rolInfo.color};color:#fff;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:900;">${rolInfo.label}</span>
      ${u.id !== _usuarioActual?.id ? `<select onchange="cambiarRolUsuario('${u.id}',this.value)" style="padding:6px;border-radius:8px;border:1px solid var(--border);font-family:Nunito,sans-serif;font-weight:700;font-size:12px;">
        <option value="admin" ${u.rol==='admin'?'selected':''}>Admin</option>
        <option value="cajero" ${u.rol==='cajero'?'selected':''}>Cajero</option>
      </select>` : '<span style="font-size:11px;color:var(--text-muted);">(tú)</span>'}
    </div>`;
  }).join('');
  modal.innerHTML = `
    <div class="modal-box" style="max-width:480px;">
      <div class="modal-header" style="background:linear-gradient(135deg,#4c1d95,#7c3aed);">
        <h3 style="color:#fff;">👥 Usuarios de la tienda</h3>
        <button class="btn-close" onclick="cerrarModal('modalUsuarios')" style="background:rgba(255,255,255,0.15);color:#fff;">✕</button>
      </div>
      <div class="modal-body">
        <div style="font-size:12px;color:var(--text-muted);font-weight:700;margin-bottom:12px;">Los usuarios se registran desde el botón "Sesion" → "Registrarse"</div>
        ${lista || '<div style="text-align:center;color:var(--text-muted);padding:20px;">No hay usuarios</div>'}
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) cerrarModal('modalUsuarios'); });
  abrirModal('modalUsuarios');
}

async function cambiarRolUsuario(userId, nuevoRol) {
  await _sbPost('perfiles', { id: userId, rol: nuevoRol }, true);
  _registrarAccion('cambiar_rol', userId + ' -> ' + nuevoRol);
  toast('Rol actualizado');
}

async function verRegistroAcciones() {
  if (!_puedeHacer('reportes')) { toast('Solo el Admin puede ver el registro', true); return; }
  const rows = await _sbGet('acciones_log', {
    select: '*', tienda_id: 'eq.' + _getTiendaId(), order: 'created_at.desc', limit: 100
  }).catch(() => []);
  if (document.getElementById('modalAcciones')) document.getElementById('modalAcciones').remove();
  const modal = document.createElement('div');
  modal.id = 'modalAcciones';
  modal.className = 'modal';
  const lista = (rows || []).map(a => {
    const fecha = a.created_at ? new Date(a.created_at).toLocaleString('es-SV') : '';
    return `<div style="padding:10px 12px;border-bottom:1px solid var(--border);display:flex;gap:10px;align-items:flex-start;">
      <div style="flex:1;">
        <span style="font-weight:900;font-size:13px;color:var(--text);">${a.usuario_nom}</span>
        <span style="font-size:12px;color:var(--text-muted);margin-left:6px;">${a.accion}</span>
        ${a.detalle ? '<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">'+a.detalle+'</div>' : ''}
      </div>
      <span style="font-size:11px;color:var(--text-muted);white-space:nowrap;">${fecha}</span>
    </div>`;
  }).join('');
  modal.innerHTML = `
    <div class="modal-box" style="max-width:500px;">
      <div class="modal-header" style="background:linear-gradient(135deg,#1e3a5f,#1d4ed8);">
        <h3 style="color:#fff;">📋 Registro de Acciones</h3>
        <button class="btn-close" onclick="cerrarModal('modalAcciones')" style="background:rgba(255,255,255,0.15);color:#fff;">✕</button>
      </div>
      <div class="modal-body" style="padding:0;max-height:70vh;overflow-y:auto;">
        ${lista || '<div style="text-align:center;padding:30px;color:var(--text-muted);">Sin registros</div>'}
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) cerrarModal('modalAcciones'); });
  abrirModal('modalAcciones');
}

// =====================================================================
//  📤 ENVIAR / FUSIONAR / DESCARGAR
// =====================================================================

async function enviarDatosNube() {
  if (!_sbUrl()||!_sbKey()) { toast('Primero configura Supabase',true); return; }
  if (!_sesionActiva) { toast('Primero inicia sesion',true); return; }
  if (!_puedeHacer('fusionar')) { toast('Solo el Admin puede enviar datos',true); return; }
  if (!confirm('Esto sube todos tus datos actuales a Supabase.\nEl otro telefono podra fusionarlos.\n\n¿Continuar?')) return;
  _dot('yellow'); toast('Subiendo datos...');
  try {
    // 1. Guardar snapshot completo (para fusión entre dispositivos)
    const snap = { version: typeof APP_SCHEMA_VERSION!=='undefined'?APP_SCHEMA_VERSION:4, exportado: new Date().toISOString(),
      dispositivo: _dispositivoId, efectivoInicial: typeof efectivoInicial!=='undefined'?efectivoInicial:0,
      inventarioInicial: typeof inventarioInicial!=='undefined'?inventarioInicial:0,
      productos, ventasDia, ventasSem, ventasMes, historial, pagos, ventasDiarias, restockLog: restockLog||[] };
    await _sbPost('sync_snapshots', { id: _getTiendaId()+'_'+_dispositivoId, tienda_id: _getTiendaId(),
      dispositivo_id: _dispositivoId, datos: JSON.stringify(snap), created_at: new Date().toISOString() }, true);
    // 2. Guardar productos directamente en tabla productos (para carga directa)
    await _subirStockBase();
    // 3. Guardar ventas, pagos, restock directamente también
    await _subirVentasDiarias().catch(()=>{});
    await _subirRestockLog().catch(()=>{});
    await _subirPagos().catch(()=>{});
    _registrarAccion('enviar_datos', productos.length+' productos');
    _dot('green'); toast('✅ '+productos.length+' productos y datos subidos a Supabase.');
  } catch(e) { _dot('red'); toast('Error: '+e.message,true); }
}

async function fusionarYActualizar() {
  if (!_sbUrl()||!_sbKey()) { toast('Primero configura Supabase',true); return; }
  if (!_sesionActiva) { toast('Primero inicia sesion',true); return; }
  if (!_puedeHacer('fusionar')) { toast('Solo el Admin puede fusionar datos',true); return; }
  if (!confirm('Fusiona los datos de todos los telefonos con los tuyos.\n¿Continuar?')) return;
  _dot('yellow'); toast('Fusionando...');
  try {
    const todosSnaps = await _sbGet('sync_snapshots', { select:'*', tienda_id:'eq.'+_getTiendaId() });
    if (!todosSnaps||!todosSnaps.length) { toast('No hay datos en Supabase. Usa "Enviar datos" primero.',true); return; }
    const miSnap = { version:4, exportado:new Date().toISOString(), dispositivo:_dispositivoId,
      efectivoInicial:typeof efectivoInicial!=='undefined'?efectivoInicial:0,
      inventarioInicial:typeof inventarioInicial!=='undefined'?inventarioInicial:0,
      productos, ventasDia, ventasSem, ventasMes, historial, pagos, ventasDiarias, restockLog:restockLog||[] };
    const remotos = todosSnaps.filter(s=>s.dispositivo_id!=='fusion'&&s.dispositivo_id!==_dispositivoId)
      .map(s=>{try{return JSON.parse(s.datos);}catch(e){return null;}}).filter(Boolean);
    let resultado = miSnap;
    for (const r of remotos) resultado = _fusionarDos(resultado, r);
    await _aplicarDatos(resultado);
    const fusionId = _getTiendaId()+'_fusionado';
    await _sbPost('sync_snapshots', { id:fusionId, tienda_id:_getTiendaId(), dispositivo_id:'fusion',
      datos:JSON.stringify(resultado), created_at:new Date().toISOString() }, true);
    for (const s of todosSnaps) { if (s.dispositivo_id!=='fusion') { await _sbDeleteFiltro('sync_snapshots',{id:'eq.'+s.id}).catch(()=>{}); } }
    _registrarAccion('fusionar', remotos.length+' telefonos');
    _dot('green'); toast('✅ Fusion completada. El otro telefono puede usar "Descargar datos actualizados".');
  } catch(e) { _dot('red'); toast('Error: '+e.message,true); console.error(e); }
}

async function descargarDatosActualizados() {
  if (!_sbUrl()||!_sbKey()) { toast('Primero configura Supabase',true); return; }
  if (!_sesionActiva) { toast('Primero inicia sesion',true); return; }
  if (!_puedeHacer('fusionar')) { toast('Solo el Admin puede descargar datos',true); return; }
  if (!confirm('Descarga los datos fusionados y reemplaza los tuyos.\n¿Continuar?')) return;
  _dot('yellow'); toast('Descargando...');
  try {
    const fusionId = _getTiendaId()+'_fusionado';
    const rows = await _sbGet('sync_snapshots',{select:'datos',id:'eq.'+fusionId});
    if (!rows||!rows.length) { toast('No hay datos fusionados. Usa "Fusionar y actualizar" primero.',true); return; }
    await _aplicarDatos(JSON.parse(rows[0].datos));
    setTimeout(async()=>{
      try {
        const nuevoSnap = { version:4, exportado:new Date().toISOString(), dispositivo:_dispositivoId,
          efectivoInicial:typeof efectivoInicial!=='undefined'?efectivoInicial:0,
          inventarioInicial:typeof inventarioInicial!=='undefined'?inventarioInicial:0,
          productos,ventasDia,ventasSem,ventasMes,historial,pagos,ventasDiarias,restockLog:restockLog||[] };
        await _sbPost('sync_snapshots',{id:_getTiendaId()+'_'+_dispositivoId,tienda_id:_getTiendaId(),
          dispositivo_id:_dispositivoId,datos:JSON.stringify(nuevoSnap),created_at:new Date().toISOString()},true);
        await _sbDeleteFiltro('sync_snapshots',{id:'eq.'+fusionId});
      } catch(e){}
    },1000);
    _registrarAccion('descargar_datos','');
    _dot('green');
  } catch(e) { _dot('red'); toast('Error: '+e.message,true); }
}

async function limpiarSupabase() {
  if (!_puedeHacer('config')) { toast('Solo el Admin puede limpiar Supabase',true); return; }
  if (!_sbUrl()||!_sbKey()) { toast('Primero configura Supabase',true); return; }
  if (!document.getElementById('modalLimpiarSupa')) {
    const m = document.createElement('div');
    m.id = 'modalLimpiarSupa';
    m.style.cssText = 'position:fixed;inset:0;z-index:10070;background:rgba(5,46,22,0.75);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;padding:16px;';
    m.innerHTML = `
      <div style="background:#fff;border-radius:20px;width:100%;max-width:380px;box-shadow:0 24px 60px rgba(0,0,0,0.4);overflow:hidden;animation:loginSlideUp 0.3s cubic-bezier(0.22,1,0.36,1);">
        <div style="background:linear-gradient(135deg,#7f1d1d,#dc2626);padding:22px 24px 18px;text-align:center;">
          <div style="font-size:36px;margin-bottom:10px;">\u26a0\ufe0f</div>
          <div style="color:#fff;font-size:17px;font-weight:900;font-family:Nunito,sans-serif;">Limpiar base de datos</div>
          <div style="color:rgba(255,255,255,0.75);font-size:12px;font-weight:700;font-family:Nunito,sans-serif;margin-top:4px;">Esta acci\u00f3n no se puede deshacer</div>
        </div>
        <div style="padding:22px 24px;">
          <div style="background:#fef2f2;border:1.5px solid #fca5a5;border-radius:12px;padding:14px 16px;margin-bottom:18px;font-size:13px;font-weight:700;color:#991b1b;font-family:Nunito,sans-serif;line-height:1.6;">
            Esto borrar\u00e1 <strong>TODOS</strong> los datos de Supabase (ventas, pagos, productos, logs). Los datos en este tel\u00e9fono no se borran.
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <button onclick="document.getElementById('modalLimpiarSupa').style.display='none'"
              style="padding:13px;background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:12px;font-size:14px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;color:#374151;">
              \u2715 Cancelar
            </button>
            <button id="btnConfirmarLimpiar" onclick="_ejecutarLimpiarSupabase()"
              style="padding:13px;background:linear-gradient(135deg,#dc2626,#991b1b);border:none;border-radius:12px;font-size:14px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;color:#fff;box-shadow:0 4px 14px rgba(220,38,38,0.3);">
              \U0001f5d1 S\u00ed, borrar todo
            </button>
          </div>
        </div>
      </div>`;
    m.addEventListener('click', e => { if(e.target===m) m.style.display='none'; });
    document.body.appendChild(m);
  }
  document.getElementById('modalLimpiarSupa').style.display = 'flex';
}

async function _ejecutarLimpiarSupabase() {
  const btn = document.getElementById('btnConfirmarLimpiar');
  if (btn) { btn.disabled=true; btn.textContent='\u23f3 Limpiando…'; }
  document.getElementById('modalLimpiarSupa').style.display='none';
  _dot('yellow'); toast('Limpiando Supabase...');
  try {
    const tablas = ['sync_snapshots','sync_invites','ventas','pagos','restock_log','deleted_log','acciones_log'];
    for (const t of tablas) {
      await fetch(_sbUrl()+'/rest/v1/'+t+'?id=neq.null',{method:'DELETE',headers:_headers({'Prefer':'return=minimal'})}).catch(()=>{});
      await fetch(_sbUrl()+'/rest/v1/'+t+'?fecha=neq.null',{method:'DELETE',headers:_headers({'Prefer':'return=minimal'})}).catch(()=>{});
    }
    await fetch(_sbUrl()+'/rest/v1/ventas_diarias?fecha=neq.null',{method:'DELETE',headers:_headers({'Prefer':'return=minimal'})}).catch(()=>{});
    await fetch(_sbUrl()+'/rest/v1/productos?id=neq.null',{method:'DELETE',headers:_headers({'Prefer':'return=minimal'})}).catch(()=>{});
    _dot('green'); toast('\u2705 Supabase limpiado. Puedes empezar de cero.');
  } catch(e) { _dot('red'); toast('Error: '+e.message,true); }
  finally { if(btn){btn.disabled=false;btn.textContent='\U0001f5d1 S\u00ed, borrar todo';} }
}
window._ejecutarLimpiarSupabase = _ejecutarLimpiarSupabase;
// =====================================================================
//  FUSIÓN (misma lógica de antes)
// =====================================================================

function _fusionarDos(local, ext) {
  const idsCobrosLocal=new Set((local.historial||[]).map(v=>v.id));
  const idsCobrosExt=new Set((ext.historial||[]).map(v=>v.id));
  const idsLocal=new Set((local.productos||[]).map(p=>String(p.id)));
  (ext.productos||[]).forEach(ep=>{if(!idsLocal.has(String(ep.id))){local.productos.push(ep);idsLocal.add(String(ep.id));}});
  const seenH=new Set((local.historial||[]).map(v=>v.id));
  (ext.historial||[]).forEach(v=>{if(!seenH.has(v.id)){local.historial.push(v);seenH.add(v.id);}});
  local.historial.sort((a,b)=>(b.ts||0)-(a.ts||0));
  const hoy=new Date().toDateString(), lunes=_lunesDeLaSemana(), ahora=new Date();
  local.ventasDia={}; local.ventasSem={}; local.ventasMes={};
  local.historial.forEach(v=>{
    if(!v.fechaISO&&!v.fecha) return;
    const fecha=new Date(v.fechaISO||v.fecha);
    const esHoy=fecha.toDateString()===hoy, esSem=fecha>=lunes;
    const esMes=fecha.getMonth()===ahora.getMonth()&&fecha.getFullYear()===ahora.getFullYear();
    (v.items||[]).forEach(it=>{
      const pid=String(it.id||''); if(!pid) return;
      const cant=Number(it.cant||0), total=cant*Number(it.precio||0);
      const base={id:pid,nom:it.nom||'',cat:it.cat||'',cant:0,total:0};
      if(esHoy){if(!local.ventasDia[pid])local.ventasDia[pid]={...base};local.ventasDia[pid].cant+=cant;local.ventasDia[pid].total+=total;}
      if(esSem){if(!local.ventasSem[pid])local.ventasSem[pid]={...base};local.ventasSem[pid].cant+=cant;local.ventasSem[pid].total+=total;}
      if(esMes){if(!local.ventasMes[pid])local.ventasMes[pid]={...base};local.ventasMes[pid].cant+=cant;local.ventasMes[pid].total+=total;}
    });
  });
  const seenP=new Set((local.pagos||[]).map(g=>String(g.id)));
  (ext.pagos||[]).forEach(g=>{if(!seenP.has(String(g.id))){local.pagos.push(g);seenP.add(String(g.id));}});
  if(!local.ventasDiarias) local.ventasDiarias=[];
  (ext.ventasDiarias||[]).forEach(vExt=>{
    const idx=local.ventasDiarias.findIndex(vL=>vL.fecha===vExt.fecha);
    if(idx>=0){if(Number(vExt.monto)>Number(local.ventasDiarias[idx].monto))local.ventasDiarias[idx].monto=Number(vExt.monto);}
    else local.ventasDiarias.push({...vExt});
  });
  local.ventasDiarias.sort((a,b)=>a.fecha.localeCompare(b.fecha));
  if(!local.restockLog) local.restockLog=[];
  const seenR=new Set(local.restockLog.map(r=>r.id));
  (ext.restockLog||[]).forEach(r=>{if(!seenR.has(r.id)){local.restockLog.push(r);seenR.add(r.id);}});
  local.restockLog.sort((a,b)=>(a.ts||0)-(b.ts||0));
  (local.productos||[]).forEach(p=>{
    const pid=String(p.id);
    const extProd=(ext.productos||[]).find(ep=>String(ep.id)===pid);
    const stockLocal=p.stock||0, stockExt=extProd?(extProd.stock||0):0;
    let vendioLocal=0;
    (local.historial||[]).forEach(v=>{if(idsCobrosLocal.has(v.id)&&!idsCobrosExt.has(v.id))(v.items||[]).forEach(it=>{if(String(it.id)===pid)vendioLocal+=Number(it.cant||0);});});
    let vendioExt=0;
    (ext.historial||[]).forEach(v=>{if(idsCobrosExt.has(v.id)&&!idsCobrosLocal.has(v.id))(v.items||[]).forEach(it=>{if(String(it.id)===pid)vendioExt+=Number(it.cant||0);});});
    const stockBase=Math.max(stockLocal+vendioLocal,extProd?(stockExt+vendioExt):(stockLocal+vendioLocal));
    p.stock=Math.max(0,stockBase-vendioLocal-vendioExt);
  });
  local.efectivoInicial=Math.max(parseFloat(local.efectivoInicial||0),parseFloat(ext.efectivoInicial||0));
  local.inventarioInicial=Math.max(parseFloat(local.inventarioInicial||0),parseFloat(ext.inventarioInicial||0));
  return local;
}

function _lunesDeLaSemana(){const hoy=new Date(),dia=hoy.getDay(),diff=dia===0?-6:1-dia,lunes=new Date(hoy);lunes.setDate(hoy.getDate()+diff);lunes.setHours(0,0,0,0);return lunes;}

async function _aplicarDatos(datos) {
  if (!datos||!datos.productos) return;
  productos=datos.productos||[]; ventasDia=datos.ventasDia||{}; ventasSem=datos.ventasSem||{};
  ventasMes=datos.ventasMes||{}; historial=datos.historial||[]; pagos=datos.pagos||[];
  ventasDiarias=datos.ventasDiarias||[]; restockLog=datos.restockLog||[];
  if(typeof normalizeReport==='function'){ventasDia=normalizeReport(ventasDia);ventasSem=normalizeReport(ventasSem);ventasMes=normalizeReport(ventasMes);}
  if(typeof normalizeHistorial==='function') historial=normalizeHistorial(historial);
  if(typeof normalizePagos==='function') pagos=normalizePagos(pagos);
  if(datos.efectivoInicial!==undefined){efectivoInicial=parseFloat(datos.efectivoInicial)||0;idbSet('vpos_efectivoInicial',efectivoInicial).catch(()=>{});const el=document.getElementById('inpEfectivoInicial');if(el)el.value=efectivoInicial>0?efectivoInicial:'';}
  if(datos.inventarioInicial!==undefined){inventarioInicial=parseFloat(datos.inventarioInicial)||0;idbSet('vpos_inventarioInicial',inventarioInicial).catch(()=>{});const el=document.getElementById('inpInventarioInicial');if(el)el.value=inventarioInicial>0?inventarioInicial:'';}
  await idbSetMany([['vpos_productos',productos],['vpos_ventasDia',ventasDia],['vpos_ventasSem',ventasSem],['vpos_ventasMes',ventasMes],['vpos_historial',historial],['vpos_pagos',pagos],['vpos_ventasDiarias',ventasDiarias],['vpos_restockLog',restockLog]]);
  actualizarTodo();
  toast('✅ '+productos.length+' productos cargados');
  // También escribir en tabla productos para carga directa en otros dispositivos
  setTimeout(() => _subirStockBase().catch(()=>{}), 1000);
}

// =====================================================================
//  ⚡ SYNC EN TIEMPO REAL
// =====================================================================
let _syncQueue=[],_syncRunning=false,_syncTimer=null,_lastVenta=null;
function syncAhora(tipo,datos){if(!_sbUrl()||!_sbKey())return;if(tipo==='venta'&&datos)_lastVenta=datos;if(!_syncQueue.includes(tipo))_syncQueue.push(tipo);clearTimeout(_syncTimer);_syncTimer=setTimeout(_ejecutarSync,900);}
async function _ejecutarSync(){if(_syncRunning){setTimeout(_ejecutarSync,1500);return;}if(!_syncQueue.length)return;_syncRunning=true;const queue=[..._syncQueue];_syncQueue=[];try{for(const tipo of queue){if(tipo==='venta'&&_lastVenta){const v=_lastVenta;_lastVenta=null;await _sbPost('ventas',{id:v.id,fecha_iso:v.fecha||new Date().toISOString(),total:parseFloat(v.total)||0,pago:parseFloat(v.pago)||0,vuelto:parseFloat(v.vuelto)||0,items:v.items||'',items_json:v.items_json||null},true);}if(tipo==='productos'||tipo==='todo')await _subirStockBase();if(tipo==='restock'||tipo==='todo')await _subirRestockLog();if(tipo==='venta_diaria'||tipo==='todo')await _subirVentasDiarias();if(tipo==='pagos'||tipo==='todo')await _subirPagos();if(tipo==='config'||tipo==='todo')await _subirConfig();}localStorage.setItem('vpos_ultimoSync',new Date().toISOString());_actualizarBadgeSync();_dot('green');}catch(e){console.warn('[Sync]',e.message);_dot('red');}finally{_syncRunning=false;if(_syncQueue.length)setTimeout(_ejecutarSync,1000);}}
async function _subirStockBase(){
  if(!productos||!productos.length)return;
  if(!_sbUrl()||!_sbKey())return;
  const tid=_getTiendaId()||'sin_tienda';
  const rows=productos.map(p=>({
    id:tid+'_'+String(p.id), tienda_id:tid,
    nom:p.nom||'',cat:p.cat||'',
    compra:p.compra||0,venta:p.venta||0,
    stock_base:_calcStockBase(p),stock:p.stock||0,min:p.min||0,
    cod:p.cod||'',abrev:p.abrev||'',img:p.img||null,
    paquetes:p.paquetes||[],lotes:p.lotes||[]
  }));
  for(let i=0;i<rows.length;i+=50) await _sbPost('productos',rows.slice(i,i+50),true);
}
function _calcStockBase(p){const pid=String(p.id);let v=0;(historial||[]).forEach(h=>{(h.items||[]).forEach(it=>{if(String(it.id)===pid)v+=Number(it.cant||0);});});return(p.stock||0)+v;}
async function _subirConfig(){try{await _sbPost('config',{clave:'efectivoInicial',valor:String(typeof efectivoInicial!=='undefined'?efectivoInicial:0),updated_at:new Date().toISOString()},true);await _sbPost('config',{clave:'inventarioInicial',valor:String(typeof inventarioInicial!=='undefined'?inventarioInicial:0),updated_at:new Date().toISOString()},true);}catch(e){}}
async function _subirRestockLog(){if(!restockLog||!restockLog.length)return;for(let i=0;i<restockLog.length;i+=50)await _sbPost('restock_log',restockLog.slice(i,i+50).map(r=>({id:r.id,ts:r.ts||0,prod_id:String(r.prodId),cant:r.cant||0,precio_compra:r.precioCompra||0,fecha_str:r.fechaStr||''})),true);}
async function _subirVentasDiarias(){if(!ventasDiarias||!ventasDiarias.length)return;await _sbPost('ventas_diarias',ventasDiarias.map(v=>({fecha:v.fecha,monto:parseFloat(v.monto)||0,nota:v.nota||''})),true);}
async function _subirPagos(){if(!pagos||!pagos.length)return;if(!_sbUrl()||!_sbKey())return;try{for(let i=0;i<pagos.length;i+=50)await _sbPost('pagos',pagos.slice(i,i+50).map(g=>({id:String(g.id),fecha_iso:g.fechaISO||new Date().toISOString(),monto:parseFloat(g.monto)||0,cat:g.cat||'GASTO',nom:g.nom||g.concepto||'',nota:g.nota||''})),true);}catch(e){}}

// =====================================================================
//  🗑️ BORRAR EN SUPABASE
// =====================================================================
async function syncBorrarProducto(id){if(!_sbUrl()||!_sbKey())return;try{const tid2=_getTiendaId();await _sbDeleteFiltro('productos',{id:'eq.'+tid2+'_'+String(id)});await _sbPost('deleted_log',{id:'del_prod_'+String(id)+'_'+Date.now(),tabla:'productos',registro_id:String(id),deleted_at:new Date().toISOString()},true);}catch(e){}}
async function syncBorrarPago(id){if(!_sbUrl()||!_sbKey())return;try{await _sbDeleteFiltro('pagos',{id:'eq.'+String(id)});await _sbPost('deleted_log',{id:'del_pago_'+String(id)+'_'+Date.now(),tabla:'pagos',registro_id:String(id),deleted_at:new Date().toISOString()},true);}catch(e){}}
async function syncBorrarVentaDiaria(fecha){if(!_sbUrl()||!_sbKey())return;try{await _sbDeleteFiltro('ventas_diarias',{fecha:'eq.'+fecha});await _sbPost('deleted_log',{id:'del_vd_'+fecha+'_'+Date.now(),tabla:'ventas_diarias',registro_id:fecha,deleted_at:new Date().toISOString()},true);}catch(e){}}

async function sheetsEnviar(accion,datos){if(!_sbUrl()||!_sbKey())return;try{if(accion==='VENTA'){await _sbPost('ventas',{id:datos.id,fecha_iso:datos.fecha||new Date().toISOString(),total:parseFloat(datos.total)||0,pago:parseFloat(datos.pago)||0,vuelto:parseFloat(datos.vuelto)||0,items:datos.items||'',items_json:datos.items_json||null},true);syncAhora('productos');}if(accion==='PRODUCTOS')syncAhora('productos');if(accion==='VENTAS_DIARIAS')syncAhora('venta_diaria');}catch(e){console.warn('[sheetsEnviar]',e.message);}}
async function sheetsImportar(){await descargarDatosActualizados();}

// =====================================================================
//  CONFIG
// =====================================================================
function abrirConfigSheets(){document.getElementById('sbUrlInput').value=_sbUrl();document.getElementById('sbKeyInput').value=_sbKey();_actualizarBadgeSync();abrirModal('modalSheetsConfig');}
function guardarConfigSheets(){const url=document.getElementById('sbUrlInput').value.trim(),key=document.getElementById('sbKeyInput').value.trim();if(url&&!url.startsWith('https://')){toast('La URL debe empezar con https://',true);return;}localStorage.setItem('vpos_supabaseUrl',url);localStorage.setItem('vpos_supabaseKey',key);actualizarBadgeSheets();cerrarModal('modalSheetsConfig');toast(url?'Supabase conectado':'Supabase desconectado');}
function desconectarSupabase(){localStorage.removeItem('vpos_supabaseUrl');localStorage.removeItem('vpos_supabaseKey');actualizarBadgeSheets();cerrarModal('modalSheetsConfig');toast('Supabase desconectado');}
function actualizarBadgeSheets(){const url=_sbUrl(),sesion=_sesionActiva&&_tiendaId;document.querySelectorAll('.sheets-status').forEach(el=>{if(sesion){el.textContent='Sync: '+_tiendaId;el.style.color='#16a34a';}else{el.textContent=url?'Sin sesion':'Sync';el.style.color=url?'#d97706':'#6b7280';}});document.querySelectorAll('.login-status').forEach(el=>{if(sesion){el.textContent='Sync: '+_tiendaId;el.style.color='#16a34a';}else{el.textContent='Iniciar sesion';el.style.color='#6b7280';}});}
function _actualizarBadgeSync(){const ts=localStorage.getItem('vpos_ultimoSync');const el=document.getElementById('ultimoSyncLabel');if(!el)return;el.textContent=ts?'Ultimo sync: '+new Date(ts).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'}):'Nunca sincronizado';}
async function iniciarAutoSync() {
  // Aplicar nombre de tienda guardado antes del login (evita que se vea "Despensa Económica" a otros clientes)
  const nombreGuardado = localStorage.getItem('vpos_tiendaNombre');
  if (nombreGuardado) _aplicarNombreTiendaDOM(nombreGuardado);

  await restaurarSesion();
  // Si no hay sesión restaurada, mostrar pantalla de login
  if (!_sesionActiva) {
    setTimeout(() => { abrirLogin(); }, 200);
  }
}
function _dot(color){let d=document.getElementById('syncDot');if(!d){d=document.createElement('div');d.id='syncDot';d.style.cssText='position:fixed;top:8px;right:8px;z-index:9999;width:9px;height:9px;border-radius:50%;transition:all .3s;pointer-events:none;';document.body.appendChild(d);}d.style.background={yellow:'#f59e0b',green:'#16a34a',red:'#ef4444'}[color]||'#ccc';d.style.opacity='1';if(color!=='yellow')setTimeout(()=>{d.style.opacity='0';},color==='green'?2000:5000);}
async function sheetsExportarProductos(){if(!_sbUrl()){toast('Primero configura Supabase',true);return;}try{await _subirStockBase();toast('Inventario enviado ('+productos.length+' productos)');}catch(e){toast('Error: '+e.message,true);}}
async function sheetsExportarVentasDiarias(){if(!_sbUrl()){toast('Primero configura Supabase',true);return;}await _subirVentasDiarias();toast('Ventas diarias enviadas');}
async function sheetsExportarTodo(){if(!_sbUrl()){toast('Primero configura Supabase',true);return;}toast('Exportando...');await _subirStockBase();await _subirVentasDiarias();await _subirRestockLog();await _subirPagos();localStorage.setItem('vpos_ultimoSync',new Date().toISOString());_actualizarBadgeSync();toast('Todo exportado a Supabase');}
async function testConexionSupabase(){const url=(document.getElementById('sbUrlInput')?.value||'').trim().replace(/\/$/,''),key=(document.getElementById('sbKeyInput')?.value||'').trim(),btn=document.getElementById('btnTestConexion');if(!url||!key){toast('Ingresa la URL y la Key primero',true);return;}if(btn){btn.disabled=true;btn.textContent='Probando...';}try{const r=await fetch(url+'/rest/v1/productos?select=id&limit=1',{headers:{'apikey':key,'Authorization':'Bearer '+key}});if(!r.ok){const t=await r.text();throw new Error('HTTP '+r.status+' — '+t);}toast('Conexion exitosa a Supabase');}catch(e){toast('Error: '+e.message,true);}finally{if(btn){btn.disabled=false;btn.textContent='Probar conexion';}}}

// =====================================================================
//  💳 SISTEMA DE MEMBRESÍAS
//  Solo aplica a usuarios que NO están en _EMAILS_EXENTOS
// =====================================================================

async function _verificarMembresia(userId, email) {
  try {
    const rows = await _sbGet('membresias', {
      select: '*',
      user_id: 'eq.' + userId,
      activa: 'eq.true',
      order: 'fecha_inicio.desc',
      limit: 1
    });
    if (!rows || rows.length === 0) return false;
    const mem = rows[0];
    // Definitivo nunca vence
    if (!mem.fecha_vencimiento) return true;
    // Verificar si aún está vigente
    const ahora = new Date();
    const vence = new Date(mem.fecha_vencimiento);
    if (vence > ahora) return true;
    // Marcar como inactiva
    await _sbPost('membresias', { id: mem.id, activa: false }, true);
    return false;
  } catch(e) {
    console.warn('[verificarMembresia]', e.message);
    // Si no se puede verificar (sin internet), permitir si hay token guardado
    return !!localStorage.getItem('vpos_membresiaActiva');
  }
}

function _crearModalMembresia() {
  if (document.getElementById('modalMembresia')) return;
  const modal = document.createElement('div');
  modal.id = 'modalMembresia';

  const planesHTML = _PLANES_MEMBRESIA.map((p, i) => `
    <div class="plan-card ${p.popular ? 'popular' : ''}" id="planCard_${p.id}"
      onclick="_seleccionarPlan('${p.id}')">
      <div class="plan-icono">${p.icono}</div>
      <div class="plan-nombre">${p.label}</div>
      <div class="plan-precio">$${p.precio.toFixed(2)}<span>${p.dias ? ' / ' + (p.dias === 7 ? 'sem' : p.dias === 30 ? 'mes' : 'año') : ''}</span></div>
      <div class="plan-duracion">${p.dias ? p.dias + ' días' : 'Para siempre'}</div>
    </div>
  `).join('');

  modal.innerHTML = `
    <div class="membresia-card">
      <div class="membresia-header">
        <h2>🔓 Activa tu Membresía</h2>
        <p>Elige el plan que mejor se adapte a tu negocio</p>
      </div>

      <div class="plan-grid">
        ${planesHTML}
      </div>

      <div class="pago-metodo-section" style="margin-top:16px;">
        <label>Método de pago</label>
        <div class="pago-metodos">
          <button class="pago-metodo-btn selected" id="metodoEfectivo" onclick="_seleccionarMetodo('efectivo')">
            💵 Efectivo
          </button>
          <button class="pago-metodo-btn" id="metodoTarjeta" onclick="_seleccionarMetodo('tarjeta')">
            💳 Tarjeta
          </button>
        </div>
      </div>

      <div class="membresia-footer">
        <div class="membresia-resumen" id="membresiaResumen" style="display:none;">
          <div class="res-row">
            <span>Plan seleccionado</span>
            <span id="resumenPlan">—</span>
          </div>
          <div class="res-row">
            <span>Duración</span>
            <span id="resumenDuracion">—</span>
          </div>
          <div class="res-row">
            <span>Método</span>
            <span id="resumenMetodo">—</span>
          </div>
          <div class="res-row total">
            <span>Total a pagar</span>
            <span id="resumenTotal">—</span>
          </div>
        </div>

        <!-- Instrucciones pago en efectivo -->
        <div class="efectivo-instrucciones" id="efectivoInstrucciones">
          <div style="font-size:15px;font-weight:900;margin-bottom:8px;">📋 Instrucciones para pago en efectivo:</div>
          <div>1️⃣ Anota el plan y monto seleccionado</div>
          <div>2️⃣ Realiza el pago al administrador del sistema</div>
          <div>3️⃣ El administrador activará tu cuenta manualmente</div>
          <div style="margin-top:10px;padding-top:10px;border-top:1px solid #fde68a;font-size:12px;color:#b45309;">
            📞 Contacto: <strong>al administrador de tu tienda</strong>
          </div>
          <div style="margin-top:10px;">
            <button onclick="_confirmarPagoEfectivo()" id="btnConfirmarEfectivo" class="btn-pagar efectivo" style="margin-top:8px;">
              ✅ Confirmar — Pagaré en efectivo
            </button>
          </div>
        </div>

        <div id="membresiaBtnContainer">
          <button id="btnActivarMembresia" class="btn-pagar tarjeta" onclick="_procesarPago()" style="display:none;">
            💳 Pagar con Tarjeta
          </button>
        </div>

        <div id="membresiaError" style="display:none;background:#fef2f2;border:1.5px solid #fca5a5;border-radius:10px;padding:11px;font-size:13px;color:#dc2626;font-weight:700;text-align:center;margin-top:10px;font-family:Nunito,sans-serif;"></div>

        <div style="text-align:center;margin-top:14px;">
          <button onclick="_volverAlLogin()" style="background:none;border:none;color:#9ca3af;font-size:12px;font-weight:700;font-family:Nunito,sans-serif;cursor:pointer;text-decoration:underline;text-underline-offset:3px;">
            ← Volver / Usar otra cuenta
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

let _planSeleccionado = null;
let _metodoSeleccionado = 'efectivo';
let _membresiaUserId = null;
let _membresiaEmail = null;

function _abrirModalMembresia(email, userId) {
  _membresiaEmail = email;
  _membresiaUserId = userId;
  const modal = document.getElementById('modalMembresia');
  if (modal) modal.style.display = 'flex';
  // Reset
  _planSeleccionado = null;
  _metodoSeleccionado = 'efectivo';
  document.getElementById('membresiaResumen').style.display = 'none';
  document.getElementById('efectivoInstrucciones').classList.remove('visible');
  document.getElementById('btnActivarMembresia').style.display = 'none';
  document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('metodoEfectivo').classList.add('selected');
  document.getElementById('metodoTarjeta').classList.remove('selected');
}

function _seleccionarPlan(planId) {
  _planSeleccionado = _PLANES_MEMBRESIA.find(p => p.id === planId);
  document.querySelectorAll('.plan-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('planCard_' + planId).classList.add('selected');
  _actualizarResumenMembresia();
}

function _seleccionarMetodo(metodo) {
  _metodoSeleccionado = metodo;
  document.getElementById('metodoEfectivo').classList.toggle('selected', metodo === 'efectivo');
  document.getElementById('metodoTarjeta').classList.toggle('selected', metodo === 'tarjeta');
  _actualizarResumenMembresia();
}

function _actualizarResumenMembresia() {
  if (!_planSeleccionado) return;
  const resumen = document.getElementById('membresiaResumen');
  const efectivoInstr = document.getElementById('efectivoInstrucciones');
  const btnTarjeta = document.getElementById('btnActivarMembresia');

  resumen.style.display = 'block';
  document.getElementById('resumenPlan').textContent = _planSeleccionado.icono + ' ' + _planSeleccionado.label;
  document.getElementById('resumenDuracion').textContent = _planSeleccionado.dias ? _planSeleccionado.dias + ' días' : 'Para siempre ♾️';
  document.getElementById('resumenMetodo').textContent = _metodoSeleccionado === 'efectivo' ? '💵 Efectivo' : '💳 Tarjeta';
  document.getElementById('resumenTotal').textContent = '$' + _planSeleccionado.precio.toFixed(2);

  if (_metodoSeleccionado === 'efectivo') {
    efectivoInstr.classList.add('visible');
    btnTarjeta.style.display = 'none';
  } else {
    efectivoInstr.classList.remove('visible');
    btnTarjeta.style.display = 'block';
    btnTarjeta.textContent = '💳 Pagar $' + _planSeleccionado.precio.toFixed(2) + ' con Tarjeta';
  }
}

async function _confirmarPagoEfectivo() {
  if (!_planSeleccionado) { _mostrarMembresiaError('Selecciona un plan primero'); return; }
  const btn = document.getElementById('btnConfirmarEfectivo');
  btn.disabled = true;
  btn.textContent = '⏳ Registrando solicitud...';
  try {
    await _guardarSolicitudMembresia('efectivo_pendiente');
    document.getElementById('modalMembresia').style.display = 'none';
    // Mostrar confirmación y esperar activación manual
    _mostrarConfirmacionEfectivo();
  } catch(e) {
    _mostrarMembresiaError('Error al registrar: ' + e.message);
    btn.disabled = false;
    btn.textContent = '✅ Confirmar — Pagaré en efectivo';
  }
}

function _mostrarConfirmacionEfectivo() {
  // Crear overlay de confirmación
  const overlay = document.createElement('div');
  overlay.id = 'confirmacionEfectivo';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:10002;
    background:linear-gradient(135deg,#052e16,#14532d);
    display:flex;align-items:center;justify-content:center;padding:20px;
  `;
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:24px;padding:36px 28px;max-width:420px;width:100%;text-align:center;box-shadow:0 32px 80px rgba(0,0,0,0.5);">
      <div style="font-size:56px;margin-bottom:16px;">⏳</div>
      <h2 style="font-size:20px;font-weight:900;color:#052e16;font-family:Nunito,sans-serif;margin:0 0 12px;">Solicitud Registrada</h2>
      <p style="font-size:14px;color:#4b7a5a;font-weight:700;font-family:Nunito,sans-serif;line-height:1.6;margin:0 0 20px;">
        Tu solicitud de membresía <strong>${_planSeleccionado?.label || ''}</strong> por
        <strong>$${_planSeleccionado?.precio?.toFixed(2) || ''}</strong> fue registrada.<br><br>
        El administrador activará tu cuenta después de recibir el pago en efectivo.
      </p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px;margin-bottom:20px;font-size:13px;color:#166534;font-weight:700;font-family:Nunito,sans-serif;text-align:left;line-height:1.8;">
        <div>📧 Tu correo: <strong>${_membresiaEmail || ''}</strong></div>
        <div>💰 Monto: <strong>$${_planSeleccionado?.precio?.toFixed(2) || ''}</strong></div>
        <div>📅 Plan: <strong>${_planSeleccionado?.label || ''}</strong></div>
      </div>
      <button onclick="document.getElementById('confirmacionEfectivo').remove(); _volverAlLogin();"
        style="background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;border:none;border-radius:12px;padding:14px 28px;font-size:15px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;width:100%;">
        Entendido — Esperaré activación
      </button>
    </div>
  `;
  document.body.appendChild(overlay);
}

async function _procesarPago() {
  if (!_planSeleccionado) { _mostrarMembresiaError('Selecciona un plan primero'); return; }
  const btn = document.getElementById('btnActivarMembresia');
  btn.disabled = true;
  btn.textContent = '⏳ Procesando pago...';
  try {
    // Aquí integrarías tu pasarela de pago (Stripe, PayPal, etc.)
    // Por ahora se registra como pendiente de confirmación
    await _guardarSolicitudMembresia('tarjeta_pendiente');
    document.getElementById('modalMembresia').style.display = 'none';
    _mostrarConfirmacionTarjeta();
  } catch(e) {
    _mostrarMembresiaError('Error: ' + e.message);
    btn.disabled = false;
    btn.textContent = '💳 Pagar con Tarjeta';
  }
}

function _mostrarConfirmacionTarjeta() {
  const overlay = document.createElement('div');
  overlay.id = 'confirmacionTarjeta';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:10002;
    background:linear-gradient(135deg,#1e3a5f,#1e40af);
    display:flex;align-items:center;justify-content:center;padding:20px;
  `;
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:24px;padding:36px 28px;max-width:420px;width:100%;text-align:center;box-shadow:0 32px 80px rgba(0,0,0,0.5);">
      <div style="font-size:56px;margin-bottom:16px;">💳</div>
      <h2 style="font-size:20px;font-weight:900;color:#052e16;font-family:Nunito,sans-serif;margin:0 0 12px;">Pago con Tarjeta</h2>
      <p style="font-size:14px;color:#374151;font-weight:700;font-family:Nunito,sans-serif;line-height:1.6;margin:0 0 20px;">
        Para activar tu plan <strong>${_planSeleccionado?.label || ''}</strong>,
        contacta al administrador para configurar el pago con tarjeta por
        <strong>$${_planSeleccionado?.precio?.toFixed(2) || ''}</strong>.
      </p>
      <button onclick="document.getElementById('confirmacionTarjeta').remove(); _volverAlLogin();"
        style="background:linear-gradient(135deg,#1d4ed8,#1e40af);color:#fff;border:none;border-radius:12px;padding:14px 28px;font-size:15px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;width:100%;">
        Entendido
      </button>
    </div>
  `;
  document.body.appendChild(overlay);
}

async function _guardarSolicitudMembresia(estadoPago) {
  const ahora = new Date();
  const plan = _planSeleccionado;
  let fechaVenc = null;
  if (plan.dias) {
    fechaVenc = new Date(ahora.getTime() + plan.dias * 24 * 60 * 60 * 1000).toISOString();
  }
  await _sbPost('membresias', {
    id: 'mem_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    user_id: _membresiaUserId,
    email: _membresiaEmail,
    nombre: _usuarioActual?.nombre || '',
    tipo: plan.id,
    monto: plan.precio,
    pago: estadoPago,
    fecha_inicio: ahora.toISOString(),
    fecha_vencimiento: fechaVenc,
    activa: estadoPago === 'completado' // Solo activa si pago completado
  }, true);
}

function _mostrarMembresiaError(msg) {
  const el = document.getElementById('membresiaError');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function _volverAlLogin() {
  const m = document.getElementById('modalMembresia');
  if (m) m.style.display = 'none';
  // Cerrar sesión temporal y volver al login
  _sesionActiva = false; _tiendaId = null; _usuarioActual = null; _authToken = null;
  localStorage.removeItem('vpos_sesionActiva');
  localStorage.removeItem('vpos_authToken');
  abrirLogin();
}

// ── Admin: Activar membresía manualmente ─────────────────────────────
async function activarMembresiaManual(email, tipoMembresia) {
  if (!_esSuperAdmin()) { toast('Solo el administrador principal puede activar membresías', true); return; }
  const plan = _PLANES_MEMBRESIA.find(p => p.id === tipoMembresia);
  if (!plan) { toast('Tipo de membresía inválido: ' + tipoMembresia, true); return; }
  try {
    const ahora = new Date();
    let fechaVenc = null;
    if (plan.dias) {
      fechaVenc = new Date(ahora.getTime() + plan.dias * 24 * 60 * 60 * 1000).toISOString();
    }

    // Buscar solicitudes pendientes de ese email (efectivo O tarjeta)
    const pendientes = await _sbGet('membresias', {
      select: '*',
      email: 'eq.' + email,
      activa: 'eq.false',
      order: 'fecha_inicio.desc',
      limit: 1
    }).catch(() => []);

    if (pendientes && pendientes.length > 0) {
      // Actualizar el registro existente con PATCH (más confiable que upsert)
      await _sbPatch('membresias', { id: 'eq.' + pendientes[0].id }, {
        tipo: tipoMembresia,
        monto: plan.precio,
        pago: 'efectivo_confirmado',
        activa: true,
        fecha_inicio: ahora.toISOString(),
        fecha_vencimiento: fechaVenc
      });
    } else {
      // No hay solicitud previa — crear membresía activa directamente
      const users = await _sbGet('perfiles', { select: 'id', email: 'eq.' + email }).catch(() => []);
      const userId = users && users.length > 0 ? users[0].id : null;
      if (!userId) { toast('No se encontró usuario con ese correo', true); return; }
      await _sbPost('membresias', {
        id: 'mem_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        user_id: userId,
        email: email,
        nombre: users[0]?.nombre || '',
        tipo: tipoMembresia,
        monto: plan.precio,
        pago: 'efectivo_confirmado',
        fecha_inicio: ahora.toISOString(),
        fecha_vencimiento: fechaVenc,
        activa: true
      }, false);
    }
    _registrarAccion('activar_membresia', email + ' → ' + tipoMembresia);
    toast('✅ Membresía ' + plan.label + ' activada para ' + email);
  } catch(e) {
    toast('Error al activar: ' + e.message, true);
    console.error('[activarMembresia]', e);
  }
}

// =====================================================================
//  👑 PANEL DE ADMINISTRADOR — funciones completas
// =====================================================================

let _notifPendienteActual = null; // membresía pendiente en notif flotante

// ── Mostrar/ocultar tab de Admin según rol ────────────────────────────
// Solo el dueño principal (emails exentos) puede ver el panel Admin global
function _esSuperAdmin() {
  return _EMAILS_EXENTOS.includes((_usuarioActual?.email || '').toLowerCase().trim());
}

function _actualizarTabAdmin() {
  const esSuperAdmin = _esSuperAdmin();
  const tabAdmin = document.getElementById('tabAdmin');
  const dniAdmin = document.getElementById('dniAdmin');
  if (tabAdmin) tabAdmin.style.display = esSuperAdmin ? '' : 'none';
  if (dniAdmin) dniAdmin.style.display = esSuperAdmin ? '' : 'none';
  if (esSuperAdmin) {
    const heroUser = document.getElementById('adminHeroUser');
    if (heroUser) heroUser.textContent = _usuarioActual.nombre || _usuarioActual.email;
    iniciarMonitorMembresiasPendientes();
  }
  // Ocultar/mostrar botón "Ver Código" según si es super admin
  _actualizarBotonCodigo();
}

// Oculta el botón "Ver Código" para usuarios que no son el dueño principal
function _actualizarBotonCodigo() {
  const esSuperAdmin = _esSuperAdmin();
  document.querySelectorAll('.btn-ver-codigo').forEach(btn => {
    btn.style.display = esSuperAdmin ? '' : 'none';
  });
}

// ── Render completo del panel admin ──────────────────────────────────
async function renderAdminPanel() {
  if (!_esSuperAdmin()) {
    document.getElementById('pgAdmin').innerHTML = `
      <div style="text-align:center;padding:60px 20px;">
        <div style="font-size:48px;margin-bottom:16px;">🔒</div>
        <div style="font-size:18px;font-weight:900;color:var(--text);">Acceso restringido</div>
        <div style="font-size:14px;color:var(--text-muted);font-weight:700;margin-top:8px;">Solo el administrador principal puede ver este panel</div>
      </div>`;
    return;
  }
  adminCargarStats();
  adminCargarPendientes();
  adminCargarMembresias();
  adminCargarUsuarios();
  // Membresías activas con botón eliminar
  if (typeof renderMembresíasActivas === 'function') renderMembresíasActivas('membActivasContainer');
}

// ── Stats rápidas del admin ───────────────────────────────────────────
async function adminCargarStats() {
  try {
    const [usuarios, membresias] = await Promise.all([
      _sbGet('perfiles', { select: 'id,rol,activo', tienda_id: 'eq.' + _getTiendaId() }).catch(() => []),
      _sbGet('membresias', { select: 'id,activa,monto,pago,fecha_inicio' }).catch(() => [])
    ]);
    const activas = (membresias || []).filter(m => m.activa).length;
    const pendientes = (membresias || []).filter(m =>
      (m.pago === 'efectivo_pendiente' || m.pago === 'tarjeta_pendiente') && !m.activa
    ).length;
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const ingresosMes = (membresias || [])
      .filter(m => m.activa && new Date(m.fecha_inicio) >= inicioMes)
      .reduce((s, m) => s + Number(m.monto || 0), 0);

    const el = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
    el('adminStatUsuarios', (usuarios || []).length);
    el('adminStatActivas', activas);
    el('adminStatPendientes', pendientes);
    el('adminStatIngresos', '$' + ingresosMes.toFixed(2));

    // Actualizar badge de pendientes
    const badge = document.getElementById('adminPendBadge');
    if (badge) {
      badge.textContent = pendientes;
      badge.style.display = pendientes > 0 ? '' : 'none';
    }
  } catch(e) { console.warn('[adminStats]', e.message); }
}

// ── Cargar pendientes de aprobación ──────────────────────────────────
async function adminCargarPendientes() {
  const container = document.getElementById('adminPendList');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-weight:700;font-size:13px;">⏳ Cargando...</div>';
  try {
    const rows = await _sbGet('membresias', {
      select: '*',
      or: '(pago.eq.efectivo_pendiente,pago.eq.tarjeta_pendiente)',
      activa: 'eq.false',
      order: 'fecha_inicio.desc'
    }).catch(() => []);

    if (!rows || !rows.length) {
      container.innerHTML = `
        <div style="text-align:center;padding:30px;">
          <div style="font-size:36px;margin-bottom:10px;">✅</div>
          <div style="font-size:14px;font-weight:900;color:var(--text-muted);">Sin solicitudes pendientes</div>
        </div>`;
      // Limpiar badge
      const badge = document.getElementById('adminPendBadge');
      if (badge) badge.style.display = 'none';
      return;
    }

    // Badge
    const badge = document.getElementById('adminPendBadge');
    if (badge) { badge.textContent = rows.length; badge.style.display = ''; }

    container.innerHTML = rows.map(m => {
      const plan = _PLANES_MEMBRESIA.find(p => p.id === m.tipo) || { label: m.tipo, icono: '📋', precio: m.monto };
      const fecha = m.fecha_inicio ? new Date(m.fecha_inicio).toLocaleDateString('es-SV') : '';
      const metodo = m.pago === 'tarjeta_pendiente' ? '💳 Tarjeta' : '💵 Efectivo';
      const inicial = (m.nombre || m.email || '?').charAt(0).toUpperCase();
      return `
        <div class="mem-row">
          <div class="mem-avatar">${inicial}</div>
          <div class="mem-info">
            <div class="mem-name">${m.nombre || '—'}</div>
            <div class="mem-email">${m.email} · ${fecha}</div>
          </div>
          <div class="mem-plan-tag" style="--mpt-bg:rgba(245,158,11,0.1);--mpt-c:#b45309;--mpt-b:rgba(245,158,11,0.25);">
            ${plan.icono} ${plan.label} · $${Number(m.monto).toFixed(2)}
          </div>
          <span style="font-size:11px;color:var(--text-muted);font-weight:700;flex-shrink:0;">${metodo}</span>
          <div class="mem-btns">
            <button class="btn-accept" onclick="adminAceptarMembresia('${m.id}','${m.email}','${m.tipo}')">✅ Aceptar</button>
            <button class="btn-reject" onclick="adminRechazarMembresia('${m.id}','${m.email}')">✕</button>
          </div>
        </div>`;
    }).join('');
  } catch(e) {
    container.innerHTML = `<div style="color:var(--red);padding:16px;font-size:13px;font-weight:700;">Error: ${e.message}</div>`;
  }
}

// ── Aceptar membresía ─────────────────────────────────────────────────
async function adminAceptarMembresia(memId, email, tipoMembresia) {
  if (!confirm(`¿Activar membresía "${tipoMembresia}" para ${email}?`)) return;
  try {
    const plan = _PLANES_MEMBRESIA.find(p => p.id === tipoMembresia);
    const ahora = new Date();
    let fechaVenc = null;
    if (plan && plan.dias) {
      fechaVenc = new Date(ahora.getTime() + plan.dias * 24 * 60 * 60 * 1000).toISOString();
    }
    // PATCH directo por ID — la forma más confiable de actualizar en Supabase
    await _sbPatch('membresias', { id: 'eq.' + memId }, {
      pago: 'efectivo_confirmado',
      activa: true,
      fecha_inicio: ahora.toISOString(),
      fecha_vencimiento: fechaVenc
    });
    _registrarAccion('activar_membresia', email + ' → ' + tipoMembresia);
    toast('✅ Membresía activada para ' + email);
    // Marcar como vista para que no salga en notif esta sesión
    _memPendientesVistas.add(memId);
    _notifMostrada = false; // permitir siguiente notif
    adminCargarPendientes();
    adminCargarStats();
    adminCargarMembresias();
  } catch(e) {
    toast('Error al activar: ' + e.message, true);
    console.error('[adminAceptar]', e);
  }
}

// ── Rechazar membresía ────────────────────────────────────────────────
async function adminRechazarMembresia(memId, email) {
  if (!confirm(`¿Rechazar la solicitud de ${email}?`)) return;
  try {
    await _sbPatch('membresias', { id: 'eq.' + memId }, { pago: 'rechazado', activa: false });
    _registrarAccion('rechazar_membresia', email);
    toast('Solicitud rechazada');
    _memPendientesVistas.add(memId);
    _notifMostrada = false;
    adminCargarPendientes();
    adminCargarStats();
  } catch(e) { toast('Error: ' + e.message, true); }
}

// ── Historial de membresías ───────────────────────────────────────────
async function adminCargarMembresias() {
  const container = document.getElementById('adminMemHistorial');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;font-weight:700;">⏳ Cargando...</div>';
  try {
    const rows = await _sbGet('membresias', {
      select: '*', order: 'fecha_inicio.desc', limit: 30
    }).catch(() => []);

    if (!rows || !rows.length) {
      container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;font-weight:700;">Sin membresías registradas</div>';
      return;
    }

    container.innerHTML = rows.map(m => {
      const plan = _PLANES_MEMBRESIA.find(p => p.id === m.tipo) || { label: m.tipo, icono: '📋' };
      const fecha = m.fecha_inicio ? new Date(m.fecha_inicio).toLocaleDateString('es-SV') : '';
      const vence = m.fecha_vencimiento ? new Date(m.fecha_vencimiento).toLocaleDateString('es-SV') : 'Nunca';
      const activa = m.activa;
      const pendiente = m.pago === 'efectivo_pendiente' || m.pago === 'tarjeta_pendiente';
      const tagBg = activa ? '--mpt-bg:#dcfce7;--mpt-c:#16a34a;--mpt-b:#bbf7d0'
        : pendiente ? '--mpt-bg:rgba(245,158,11,0.1);--mpt-c:#b45309;--mpt-b:rgba(245,158,11,0.25)'
        : '--mpt-bg:rgba(220,38,38,0.08);--mpt-c:#dc2626;--mpt-b:rgba(220,38,38,0.2)';
      const tagLabel = activa ? '✅ Activa' : pendiente ? '⏳ Pendiente' : '✕ Inactiva';
      const inicial = (m.nombre || m.email || '?').charAt(0).toUpperCase();
      return `
        <div class="mem-row">
          <div class="mem-avatar" style="background:linear-gradient(135deg,${activa?'#059669,#065f46':pendiente?'#d97706,#b45309':'#9ca3af,#6b7280'})">${inicial}</div>
          <div class="mem-info">
            <div class="mem-name">${m.nombre || '—'}</div>
            <div class="mem-email">${m.email} · ${fecha}${m.fecha_vencimiento ? ' → ' + vence : ''}</div>
          </div>
          <div class="mem-plan-tag" style="${tagBg}">${plan.icono} ${plan.label}</div>
          <div class="mem-plan-tag" style="${tagBg}">${tagLabel}</div>
        </div>`;
    }).join('');
  } catch(e) {
    container.innerHTML = `<div style="color:var(--red);padding:16px;font-size:13px;font-weight:700;">Error: ${e.message}</div>`;
  }
}

// ── Lista de usuarios ─────────────────────────────────────────────────
async function adminCargarUsuarios() {
  const container = document.getElementById('adminUserList');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;font-weight:700;">⏳ Cargando...</div>';
  try {
    const [usuarios, membresias] = await Promise.all([
      _sbGet('perfiles', { select: '*', tienda_id: 'eq.' + _getTiendaId(), order: 'created_at.asc' }).catch(() => []),
      _sbGet('membresias', { select: 'user_id,activa,tipo', activa: 'eq.true' }).catch(() => [])
    ]);

    if (!usuarios || !usuarios.length) {
      container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;font-weight:700;">Sin usuarios</div>';
      return;
    }

    const memMap = {};
    (membresias || []).forEach(m => { memMap[m.user_id] = m; });

    container.innerHTML = `<div class="admin-users-list">${usuarios.map(u => {
      const esExentoU = _EMAILS_EXENTOS.includes((u.email||'').toLowerCase());
      const mem = memMap[u.id];
      const rolClass = u.rol === 'admin' ? '' : 'cajero';
      // Los usuarios exentos (dueños) se muestran como Admin; los demás son Clientes
      const rolLabel = esExentoU ? '👑 Admin' : '👤 Cliente';
      const rolClassFinal = esExentoU ? '' : 'cajero';
      const memTag = esExentoU
        ? '<span class="aur-mem exento">♾️ Exento</span>'
        : mem
          ? `<span class="aur-mem activa">✅ ${(_PLANES_MEMBRESIA.find(p=>p.id===mem.tipo)||{label:mem.tipo}).label}</span>`
          : '<span class="aur-mem vencida">Sin membresía</span>';
      const inicial = (u.nombre || u.email || '?').charAt(0).toUpperCase();
      const esMismoUsuario = u.id === _usuarioActual?.id;
      const tiendaLabel = u.tienda_id || '—';
      return `
        <div class="admin-user-row">
          <div class="aur-avatar">${inicial}</div>
          <div class="aur-info">
            <div class="aur-name">${u.nombre || '—'}</div>
            <div class="aur-email">${u.email || '—'}</div>
          </div>
          ${memTag}
          <span class="aur-role ${rolClassFinal}">${rolLabel}</span>
          ${!esExentoU ? `
            <button onclick="adminVerCredenciales('${(u.nombre||'').replace(/'/g,"\\'")}','${(u.email||'').replace(/'/g,"\\'")}','${tiendaLabel.replace(/'/g,"\\'")}','${u.id||''}')"
              style="background:rgba(29,78,216,0.1);color:#1d4ed8;border:1px solid rgba(29,78,216,0.25);border-radius:8px;padding:5px 10px;font-size:11px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;white-space:nowrap;"
              title="Ver datos de acceso del cliente">🔑 Datos</button>` : ''}
          ${!esMismoUsuario && !esExentoU ? `
            <button onclick="adminEliminarUsuario('${u.id}','${(u.email||'').replace(/'/g,"\\'")}','${(u.nombre||'').replace(/'/g,"\\'")}');adminCargarUsuarios();"
              style="background:rgba(220,38,38,0.1);color:#dc2626;border:1px solid rgba(220,38,38,0.25);border-radius:8px;padding:5px 10px;font-size:11px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;white-space:nowrap;"
              title="Eliminar usuario y revocar acceso">🗑 Eliminar</button>` : 
            esMismoUsuario ? '<span style="font-size:11px;color:var(--text-muted);font-weight:700;">(tú)</span>' : ''}
        </div>`;
    }).join('')}</div>`;
  } catch(e) {
    container.innerHTML = `<div style="color:var(--red);padding:16px;font-size:13px;font-weight:700;">Error: ${e.message}</div>`;
  }
}

// ── Eliminar / deshabilitar usuario ──────────────────────────────────
async function adminEliminarUsuario(userId, email, nombre) {
  if (!_esSuperAdmin()) { toast('Sin permiso', true); return; }
  const confirmar = confirm(`¿Eliminar el usuario "${nombre || email}"?\n\nSe desactivará su cuenta y no podrá iniciar sesión.\nEsta acción no se puede deshacer fácilmente.`);
  if (!confirmar) return;
  try {
    // Desactivar perfil en tabla perfiles
    await _sbPatch('perfiles', { id: 'eq.' + userId }, { activo: false });
    // Marcar membresías activas como revocadas
    await _sbPatch('membresias', { user_id: 'eq.' + userId, activa: 'eq.true' }, { activa: false, pago: 'revocado' }).catch(() => {});
    _registrarAccion('eliminar_usuario', email);
    toast('✅ Usuario ' + (nombre || email) + ' eliminado y acceso revocado');
    adminCargarStats();
    adminCargarUsuarios();
  } catch(e) {
    toast('Error al eliminar: ' + e.message, true);
    console.error('[adminEliminar]', e);
  }
}

// ── Ver datos de acceso del cliente ──────────────────────────────────
function adminVerCredenciales(nombre, email, tiendaId, userId) {
  // Crear modal si no existe
  if (!document.getElementById('modalCredCliente')) {
    const m = document.createElement('div');
    m.id = 'modalCredCliente';
    m.style.cssText = 'position:fixed;inset:0;z-index:10060;background:rgba(5,46,22,0.75);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;padding:16px;';
    m.innerHTML = `
      <div style="background:#fff;border-radius:20px;width:100%;max-width:400px;box-shadow:0 24px 60px rgba(0,0,0,0.4);overflow:hidden;animation:loginSlideUp 0.3s cubic-bezier(0.22,1,0.36,1);">
        <div style="background:linear-gradient(135deg,#1d4ed8,#1e40af);padding:20px 24px 16px;display:flex;align-items:center;gap:12px;">
          <span style="font-size:26px;">🔑</span>
          <div>
            <div style="color:#fff;font-size:16px;font-weight:900;font-family:Nunito,sans-serif;">Datos de acceso</div>
            <div style="color:rgba(255,255,255,0.7);font-size:12px;font-weight:700;font-family:Nunito,sans-serif;">Para ayudar al cliente a iniciar sesión</div>
          </div>
        </div>
        <div style="padding:22px 24px;">
          <div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:12px;padding:16px;margin-bottom:16px;">
            <div style="margin-bottom:12px;">
              <div style="font-size:10px;font-weight:900;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.5px;font-family:Nunito,sans-serif;margin-bottom:4px;">👤 Nombre</div>
              <div id="credNombre" style="font-size:15px;font-weight:900;color:#1e3a8a;font-family:Nunito,sans-serif;"></div>
            </div>
            <div style="margin-bottom:12px;">
              <div style="font-size:10px;font-weight:900;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.5px;font-family:Nunito,sans-serif;margin-bottom:4px;">📧 Correo electrónico</div>
              <div style="display:flex;align-items:center;gap:8px;">
                <div id="credEmail" style="font-size:14px;font-weight:900;color:#1e3a8a;font-family:Nunito,sans-serif;flex:1;word-break:break-all;"></div>
                <button onclick="navigator.clipboard.writeText(document.getElementById('credEmail').textContent).then(()=>toast('✓ Correo copiado'))"
                  style="background:#dbeafe;border:1px solid #bfdbfe;border-radius:7px;padding:4px 9px;font-size:11px;font-weight:900;cursor:pointer;color:#1d4ed8;font-family:Nunito,sans-serif;white-space:nowrap;">📋 Copiar</button>
              </div>
            </div>
            <div style="margin-bottom:4px;">
              <div style="font-size:10px;font-weight:900;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.5px;font-family:Nunito,sans-serif;margin-bottom:4px;">🏪 ID de Tienda</div>
              <div style="display:flex;align-items:center;gap:8px;">
                <div id="credTienda" style="font-size:14px;font-weight:900;color:#1e3a8a;font-family:Nunito,sans-serif;flex:1;"></div>
                <button onclick="navigator.clipboard.writeText(document.getElementById('credTienda').textContent).then(()=>toast('✓ ID copiado'))"
                  style="background:#dbeafe;border:1px solid #bfdbfe;border-radius:7px;padding:4px 9px;font-size:11px;font-weight:900;cursor:pointer;color:#1d4ed8;font-family:Nunito,sans-serif;white-space:nowrap;">📋 Copiar</button>
              </div>
            </div>
          </div>
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:11px 13px;margin-bottom:18px;font-size:12px;font-weight:700;color:#92400e;font-family:Nunito,sans-serif;line-height:1.6;">
            ⚠️ La <strong>contraseña no se almacena</strong> en el sistema por seguridad. Si el cliente la olvidó, debe usar <em>"¿Olvidaste tu contraseña?"</em> en el login para restablecerla por correo.
          </div>
          <button onclick="document.getElementById('modalCredCliente').style.display='none'"
            style="width:100%;padding:13px;background:linear-gradient(135deg,#1d4ed8,#1e40af);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;">
            ✓ Cerrar
          </button>
        </div>
      </div>`;
    m.addEventListener('click', e => { if (e.target === m) m.style.display = 'none'; });
    document.body.appendChild(m);
  }
  document.getElementById('credNombre').textContent = nombre || '—';
  document.getElementById('credEmail').textContent  = email  || '—';
  document.getElementById('credTienda').textContent = tiendaId || '—';
  document.getElementById('modalCredCliente').style.display = 'flex';
}
window.adminVerCredenciales = adminVerCredenciales;

// ── Activar manual desde panel admin ─────────────────────────────────
async function adminActivarManual() {
  const email = (document.getElementById('adminManualEmail')?.value || '').trim();
  const plan  = document.getElementById('adminManualPlan')?.value || 'mensual';
  if (!email || !email.includes('@')) { toast('Ingresa un correo válido', true); return; }
  await activarMembresiaManual(email, plan);
  adminCargarPendientes(); adminCargarStats(); adminCargarMembresias(); adminCargarUsuarios();
  document.getElementById('adminManualEmail').value = '';
}

// ── Log de acciones ───────────────────────────────────────────────────
async function adminCargarAcciones() {
  const container = document.getElementById('adminAccionesList');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:13px;font-weight:700;">⏳ Cargando...</div>';
  try {
    const rows = await _sbGet('acciones_log', {
      select: '*', tienda_id: 'eq.' + _getTiendaId(), order: 'created_at.desc', limit: 50
    }).catch(() => []);
    if (!rows || !rows.length) {
      container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;font-weight:700;">Sin registros</div>';
      return;
    }
    container.innerHTML = `<div style="max-height:320px;overflow-y:auto;">` + rows.map(a => {
      const fecha = a.created_at ? new Date(a.created_at).toLocaleString('es-SV', {dateStyle:'short',timeStyle:'short'}) : '';
      return `<div style="display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);">
        <div style="flex:1;min-width:0;">
          <span style="font-weight:900;font-size:12px;color:var(--text);">${a.usuario_nom}</span>
          <span style="font-size:12px;color:var(--text-muted);margin-left:6px;">${a.accion}</span>
          ${a.detalle ? `<div style="font-size:11px;color:var(--text-muted);margin-top:1px;">${a.detalle}</div>` : ''}
        </div>
        <span style="font-size:10px;color:var(--text-muted);white-space:nowrap;font-weight:700;">${fecha}</span>
      </div>`;
    }).join('') + '</div>';
  } catch(e) {
    container.innerHTML = `<div style="color:var(--red);padding:16px;font-size:13px;font-weight:700;">Error: ${e.message}</div>`;
  }
}

// =====================================================================
//  🔔 MONITOR DE MEMBRESÍAS PENDIENTES — notificación flotante
// =====================================================================

let _monitorMemTimer = null;
// IDs vistos en esta sesión únicamente — no persistimos para que siempre lleguen notifs nuevas
let _memPendientesVistas = new Set();
let _notifMostrada = false; // solo mostrar una notif a la vez

function iniciarMonitorMembresiasPendientes() {
  if (_monitorMemTimer) return; // ya corriendo
  // Verificar de inmediato al iniciar
  setTimeout(_verificarNuevasSolicitudes, 2000);
  _monitorMemTimer = setInterval(_verificarNuevasSolicitudes, 60000); // cada 60 seg
}

async function _verificarNuevasSolicitudes() {
  if (!_esSuperAdmin() || !_sbUrl() || !_sbKey()) return;
  try {
    const rows = await _sbGet('membresias', {
      select: 'id,nombre,email,tipo,monto,pago,fecha_inicio',
      or: '(pago.eq.efectivo_pendiente,pago.eq.tarjeta_pendiente)',
      activa: 'eq.false',
      order: 'fecha_inicio.desc'
    }).catch(() => []);

    if (!rows || !rows.length) {
      _actualizarBadgeAdminPendientes(0);
      return;
    }

    // Actualizar badge del tab Admin
    _actualizarBadgeAdminPendientes(rows.length);

    // Mostrar notif solo si no hay una ya visible Y hay solicitudes no vistas esta sesión
    if (!_notifMostrada) {
      const nueva = rows.find(m => !_memPendientesVistas.has(m.id));
      if (nueva) {
        _notifPendienteActual = nueva;
        _notifMostrada = true;
        _mostrarNotifNuevaSolicitud(nueva);
      }
    }
  } catch(e) { /* silencioso en monitor de fondo */ }
}

function _actualizarBadgeAdminPendientes(count) {
  // Badge en el tab de navbar
  const tabAdmin = document.getElementById('tabAdmin');
  if (!tabAdmin) return;
  let badge = tabAdmin.querySelector('.admin-pending-badge');
  if (count > 0) {
    if (!badge) {
      // Envolver en wrapper relativo
      let wrap = tabAdmin.parentElement;
      if (!wrap.classList.contains('nav-tab-wrap')) {
        wrap = document.createElement('div');
        wrap.className = 'nav-tab-wrap';
        tabAdmin.parentElement.insertBefore(wrap, tabAdmin);
        wrap.appendChild(tabAdmin);
      }
      badge = document.createElement('span');
      badge.className = 'admin-pending-badge';
      wrap.appendChild(badge);
    }
    badge.textContent = count;
  } else if (badge) {
    badge.remove();
  }
}

function _mostrarNotifNuevaSolicitud(mem) {
  const popup = document.getElementById('adminNotifPopup');
  if (!popup) return;
  const plan = _PLANES_MEMBRESIA.find(p => p.id === mem.tipo) || { label: mem.tipo, icono: '📋' };
  const metodo = mem.pago === 'tarjeta_pendiente' ? '💳 Tarjeta' : '💵 Efectivo';
  const fecha = mem.fecha_inicio ? new Date(mem.fecha_inicio).toLocaleDateString('es-SV') : '';

  const nNombre = document.getElementById('notifClientNombre');
  const nDetail = document.getElementById('notifClientDetail');
  if (nNombre) nNombre.textContent = (mem.nombre || mem.email || '—');
  if (nDetail) nDetail.textContent = `${plan.icono} ${plan.label} · $${Number(mem.monto).toFixed(2)} · ${metodo} · ${fecha}`;

  popup.classList.add('visible');
}

function adminCerrarNotif() {
  const popup = document.getElementById('adminNotifPopup');
  if (popup) popup.classList.remove('visible');
  _notifMostrada = false;
  // Marcar como vista en memoria de sesión (no en localStorage, para que llegue en próxima sesión)
  if (_notifPendienteActual) {
    _memPendientesVistas.add(_notifPendienteActual.id);
    _notifPendienteActual = null;
  }
}

async function adminAceptarDesdeNotif() {
  if (!_notifPendienteActual) return;
  const m = _notifPendienteActual;
  adminCerrarNotif();
  await adminAceptarMembresia(m.id, m.email, m.tipo);
}

async function adminRechazarDesdeNotif() {
  if (!_notifPendienteActual) return;
  const m = _notifPendienteActual;
  adminCerrarNotif();
  await adminRechazarMembresia(m.id, m.email);
}

// ── Llamar _actualizarTabAdmin después de restaurar sesión ────────────
const _orig_finalizarLogin = _finalizarLogin;
// Patch para activar tab admin al login
const _patchFinalizarLogin = async function() {
  await _orig_finalizarLogin.call(this);
  _actualizarTabAdmin();
};

// ══ DEBUG: Prueba completa de Supabase ══════════════════════════════
async function testSupabaseCompleto() {
  const url = _sbUrl(), key = _sbKey();
  const resultados = [];
  const log = (msg, ok) => { resultados.push((ok ? '✅' : '❌') + ' ' + msg); };

  log('URL configurada: ' + url, !!url);
  log('Key configurada: ' + (key ? key.substring(0,20)+'...' : 'NO'), !!key);
  log('Sesión activa: ' + _sesionActiva, _sesionActiva);
  log('Tienda ID: ' + (_getTiendaId()||'NO'), !!_getTiendaId());

  if (!url || !key) {
    alert('❌ Sin configuración de Supabase\n\n' + resultados.join('\n'));
    return;
  }

  // Test 1: Leer tabla perfiles
  try {
    const r = await fetch(url + '/rest/v1/perfiles?select=id&limit=1', {
      headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
    });
    const txt = await r.text();
    log('Leer perfiles (HTTP ' + r.status + ')', r.ok);
    if (!r.ok) log('Error perfiles: ' + txt.substring(0,100), false);
  } catch(e) { log('Error red: ' + e.message, false); }

  // Test 2: Leer tabla productos
  try {
    const r = await fetch(url + '/rest/v1/productos?select=id&limit=1', {
      headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
    });
    const txt = await r.text();
    log('Leer productos (HTTP ' + r.status + ')', r.ok);
    if (!r.ok) log('Error productos: ' + txt.substring(0,150), false);
  } catch(e) { log('Error red productos: ' + e.message, false); }

  // Test 3: Escribir en productos
  try {
    const testId = 'test_' + Date.now();
    const r = await fetch(url + '/rest/v1/productos', {
      method: 'POST',
      headers: {
        'apikey': key, 'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify({ id: testId, tienda_id: 'test', nom: 'TEST_BORRAR', cat: 'test', compra: 0, venta: 0, stock: 0, min: 0 })
    });
    const txt = await r.text();
    log('Escribir en productos (HTTP ' + r.status + ')', r.ok);
    if (!r.ok) log('Error escritura: ' + txt.substring(0,200), false);
    else {
      // Borrar el test
      await fetch(url + '/rest/v1/productos?id=eq.' + testId, {
        method: 'DELETE',
        headers: { 'apikey': key, 'Authorization': 'Bearer ' + key, 'Prefer': 'return=minimal' }
      }).catch(()=>{});
      log('Test borrado OK', true);
    }
  } catch(e) { log('Error escritura: ' + e.message, false); }

  // Test 4: Productos locales
  log('Productos en memoria: ' + (productos?.length||0), (productos?.length||0) > 0);

  const msg = resultados.join('\n');
  console.log('[Test Supabase]\n' + msg);
  alert('RESULTADO TEST SUPABASE:\n\n' + msg);
}
window.testSupabaseCompleto = testSupabaseCompleto;

// =====================================================================
//  🔄 AUTO-POLL — Descarga cambios de otros dispositivos cada 30 seg
// =====================================================================
let _autoPollTimer      = null;
let _autoPollUltimaVenta = null; // ISO — solo bajamos ventas más nuevas que esta

async function _autoPoll() {
  if (!_sbUrl() || !_sbKey() || !_sesionActiva) return;
  if (_syncRunning) return; // no interferir con una subida en curso
  try {
    const tid = _getTiendaId();
    if (!tid) return;

    // ── 1. Ventas nuevas de otros dispositivos ──────────────────────
    // Buscamos ventas registradas en los últimos 10 minutos que no estén
    // en el historial local. El ID usa crypto.randomUUID → nunca colisiona.
    const desde = _autoPollUltimaVenta
      ? _autoPollUltimaVenta
      : new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const ventasNuevas = await _sbGet('ventas', {
      select: 'id,fecha_iso,total,pago,vuelto,items,items_json',
      fecha_iso: 'gte.' + desde,
      order: 'fecha_iso.asc'
    }).catch(() => null);

    let hayNuevas = false;
    if (ventasNuevas && ventasNuevas.length) {
      ventasNuevas.forEach(v => {
        // Actualizar cursor aunque ya exista localmente
        if (!_autoPollUltimaVenta || v.fecha_iso > _autoPollUltimaVenta) {
          _autoPollUltimaVenta = v.fecha_iso;
        }
        // Solo agregar si no está ya en el historial
        if (historial && !historial.find(h => h.id === v.id)) {
          const itemsArr = (() => { try { return JSON.parse(v.items_json || '[]'); } catch(e) { return []; } })();
          historial.unshift({
            id:       v.id,
            fechaISO: v.fecha_iso,
            fecha:    v.fecha_iso,
            ts:       new Date(v.fecha_iso).getTime(),
            total:    Number(v.total)  || 0,
            pago:     Number(v.pago)   || 0,
            vuelto:   Number(v.vuelto) || 0,
            items:    itemsArr,
            items_json: v.items_json || null
          });

          // Descontar stock de los productos involucrados
          if (typeof productos !== 'undefined' && productos) {
            itemsArr.forEach(it => {
              const p = productos.find(x => String(x.id) === String(it.id));
              if (p) p.stock = Math.max(0, (p.stock || 0) - Number(it.cant || 0));
            });
          }
          hayNuevas = true;
        }
      });
    }

    // ── 2. Stock actualizado de productos ───────────────────────────
    const prodsRemoto = await _sbGet('productos', {
      select: 'id,stock',
      tienda_id: 'eq.' + tid,
      limit: 2000
    }).catch(() => null);

    if (prodsRemoto && prodsRemoto.length && typeof productos !== 'undefined' && productos) {
      prodsRemoto.forEach(sp => {
        const localId = String(sp.id).replace(tid + '_', '');
        const p = productos.find(x => String(x.id) === localId);
        if (p && p.stock !== Number(sp.stock)) {
          p.stock = Number(sp.stock) || 0;
          hayNuevas = true; // forzar render
        }
      });
    }

    // ── 3. Si hubo cambios, guardar y refrescar pantalla ───────────
    if (hayNuevas) {
      historial.sort((a, b) => (b.ts || 0) - (a.ts || 0));
      salvar();
      if (typeof actualizarTodo   === 'function') actualizarTodo();
      if (typeof renderInventario === 'function') renderInventario();
      _dot('green');
    }
  } catch(e) {
    // Silencioso — no molestar al usuario por errores de red en background
    console.warn('[AutoPoll]', e.message);
  }
}

/** Inicia el polling automático. Se llama tras login exitoso. */
function iniciarAutoPoll() {
  if (_autoPollTimer) clearInterval(_autoPollTimer);
  // Primer poll inmediato (por si hay datos de otros dispositivos ya)
  setTimeout(_autoPoll, 3000);
  // Luego cada 30 segundos
  _autoPollTimer = setInterval(_autoPoll, 30000);
  console.log('[AutoPoll] Iniciado — polling cada 30 seg');
}

/** Detiene el polling (al cerrar sesión). */
function detenerAutoPoll() {
  if (_autoPollTimer) { clearInterval(_autoPollTimer); _autoPollTimer = null; }
}
window.iniciarAutoPoll = iniciarAutoPoll;
window.detenerAutoPoll = detenerAutoPoll;

