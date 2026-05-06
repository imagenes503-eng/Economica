// =====================================================================
//  DESPENSA ECONÓMICA — Supabase Sync v9
//  ✅ Login con Supabase Auth (correo + contraseña)
//  ✅ Refresh token automático (sesión persistente sin re-login)
//  ✅ Roles admin/supervisor/cajero desde tabla perfiles
//  ✅ RLS real por tienda usando JWT del usuario
//  ✅ Restricciones visuales reforzadas por rol
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
let _refreshToken  = null; // Para renovar JWT automáticamente
let _refreshInterval = null;
let _dispositivoId = localStorage.getItem('vpos_dispositivoId') || ('dev_' + Math.random().toString(36).slice(2,8));
localStorage.setItem('vpos_dispositivoId', _dispositivoId);

const ROLES = {
  admin:      { label: 'Admin',      color: '#7c3aed', puede: ['vender','inventario','reportes','gastos','config','usuarios','fusionar','reiniciar','corte_caja','exportar'] },
  supervisor: { label: 'Supervisor', color: '#d97706', puede: ['vender','inventario','reportes','corte_caja'] },
  cajero:     { label: 'Cajero',     color: '#1d4ed8', puede: ['vender'] }
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

// Llamar a una función RPC de Supabase (PostgreSQL function)
async function _sbRpc(nombreFuncion, params) {
  const url = _sbUrl(), key = _sbKey();
  if (!url || !key) throw new Error('Sin configuración de Supabase');
  const resp = await fetch(url + '/rest/v1/rpc/' + nombreFuncion, {
    method: 'POST',
    headers: _headers({ 'Prefer': 'return=representation' }),
    body: JSON.stringify(params || {})
  });
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

      // Registrar la tienda en la tabla tiendas (requerido por foreign key de productos)
      await _sbPost('tiendas', {
        id: tiendaId,
        nombre: nombreTienda,
        created_at: new Date().toISOString()
      }, true).catch(e => console.warn('[Registro] tienda insert:', e.message));

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
  _authToken    = authData.access_token;
  _refreshToken = authData.refresh_token || null;
  const userId = authData.user?.id;

  // Guardar refresh token para persistencia sin re-login
  if (_refreshToken) localStorage.setItem('vpos_refreshToken', _refreshToken);

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

  // Guardar en localStorage
  // ── Si cambió la tienda respecto a la sesión anterior, limpiar datos locales ──
  const _tiendaAnterior = localStorage.getItem('vpos_tiendaId');
  if (_tiendaAnterior && _tiendaAnterior !== _tiendaId) {
    console.log('[Login] Cambio de tienda:', _tiendaAnterior, '→', _tiendaId, '— limpiando IndexedDB');
    const clavesLimpiar = ['vpos_productos','vpos_historial','vpos_pagos','vpos_ventasDiarias','vpos_ventasMes','vpos_ventasSem','vpos_restockLog'];
    for (const k of clavesLimpiar) { try { await idbSet(k, []); } catch(e) {} }
    if (typeof productos !== 'undefined') productos = [];
    if (typeof historial !== 'undefined') historial = [];
    if (typeof pagos     !== 'undefined') pagos = [];
  }
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
  _actualizarNombreTienda();

  toast('✅ Bienvenido ' + _usuarioActual.nombre + ' · ' + (ROLES[_usuarioActual.rol]?.label || ''));

  // Iniciar renovación automática del JWT cada 50 minutos
  _iniciarRefreshToken();

  // Descargar datos frescos de Supabase (fuente de verdad) de inmediato
  const btn = document.getElementById('btnLogin');
  if (btn) btn.textContent = 'Cargando datos...';
  await _cargarDatosAlIniciar();
  if (btn) btn.textContent = 'Iniciar sesión';

  // Iniciar Realtime (WebSocket) + polling fallback para recibir cambios de otros dispositivos
  _iniciarPolling();
  // Check inmediato al conectar (por si hubo cambios mientras no había sesión)
  setTimeout(_autoFusionar, 800);
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
  // Intentar snapshot fusionado primero (rápido — muestra datos al instante)
  let tieneDatosPrevios = false;
  try {
    const fusionId = _getTiendaId() + '_fusionado';
    const snaps = await _sbGet('sync_snapshots', { select: 'datos', id: 'eq.' + fusionId });
    if (snaps && snaps.length > 0) {
      await _aplicarDatos(JSON.parse(snaps[0].datos));
      tieneDatosPrevios = true;
    }
  } catch(e) { console.warn('[cargarDatos snapshot]', e.message); }

  // SIEMPRE cargar desde Supabase (fuente de verdad):
  // - Si no había snapshot: carga completa
  // - Si había snapshot: repara productos con nombre/precio vacíos (corrupción por broadcast)
  await _autoCargarDesdeSupa();
  // Reintentar fotos que fallaron + subir fotos nuevas sin subir
  setTimeout(async () => { await _syncFotosPendientes(); await _autoSyncFotos(); }, 3000);
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
  _detenerPolling(); // cierra WebSocket y polling
  clearInterval(_refreshInterval); // detener renovación automática
  _supabaseClient = null; // forzar nuevo cliente en el próximo login
  _sesionActiva = false; _tiendaId = null; _usuarioActual = null; _authToken = null; _refreshToken = null;
  localStorage.removeItem('vpos_sesionActiva');
  localStorage.removeItem('vpos_usuarioData');
  localStorage.removeItem('vpos_authToken');
  localStorage.removeItem('vpos_refreshToken');
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

// ── Renovación automática de JWT (cada 50 min) ────────────────────────
function _iniciarRefreshToken() {
  clearInterval(_refreshInterval);
  _refreshInterval = setInterval(async () => {
    const rt = _refreshToken || localStorage.getItem('vpos_refreshToken');
    if (!rt) return;
    try {
      const url = _sbUrl(), key = _sbKey();
      const r = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { 'apikey': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: rt })
      });
      const data = await r.json();
      if (data.access_token) {
        _authToken    = data.access_token;
        _refreshToken = data.refresh_token || rt;
        localStorage.setItem('vpos_authToken',    _authToken);
        localStorage.setItem('vpos_refreshToken', _refreshToken);
      }
    } catch(e) { console.warn('[Auth] Refresh token falló:', e); }
  }, 50 * 60 * 1000); // 50 minutos
}

async function restaurarSesion() {
  if (localStorage.getItem('vpos_sesionActiva') !== '1') return;
  const savedToken   = localStorage.getItem('vpos_authToken');
  const savedRefresh = localStorage.getItem('vpos_refreshToken');
  const savedUser    = localStorage.getItem('vpos_usuarioData');
  const savedTienda  = localStorage.getItem('vpos_tiendaId');
  if (!savedToken || !savedUser) return;

  _authToken    = savedToken;
  _refreshToken = savedRefresh || null;
  _tiendaId     = savedTienda;
  _sesionActiva = true;

  // Intentar renovar el token inmediatamente para verificar que sigue válido
  if (savedRefresh) {
    try {
      const url = _sbUrl(), key = _sbKey();
      const r = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { 'apikey': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: savedRefresh })
      });
      const data = await r.json();
      if (data.access_token) {
        _authToken    = data.access_token;
        _refreshToken = data.refresh_token || savedRefresh;
        localStorage.setItem('vpos_authToken',    _authToken);
        localStorage.setItem('vpos_refreshToken', _refreshToken);
      }
    } catch(e) {
      console.warn('[Auth] Sin conexión al restaurar — usando caché offline');
    }
  }

  try {
    // SIEMPRE leer perfil fresco desde Supabase para obtener rol actualizado
    const tempUser = JSON.parse(savedUser);
    const perfiles = await _sbGet('perfiles', { select: '*', id: 'eq.' + tempUser.id, activo: 'eq.true' });
    if (!perfiles || !perfiles.length) {
      // Cuenta desactivada — forzar cierre de sesión
      _sesionActiva = false; _tiendaId = null; _usuarioActual = null; _authToken = null; _refreshToken = null;
      localStorage.removeItem('vpos_sesionActiva');
      localStorage.removeItem('vpos_authToken');
      localStorage.removeItem('vpos_refreshToken');
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
    // Iniciar renovación automática
    _iniciarRefreshToken();
    // Descargar datos frescos de Supabase al restaurar sesión
    _autoCargarDesdeSupa();
    // Iniciar Realtime (WebSocket) + polling fallback
    _iniciarPolling();
    // Check inmediato al restaurar sesión
    setTimeout(_autoFusionar, 800);
  } catch(e) {
    try { _usuarioActual = JSON.parse(savedUser); } catch(e2) {}
    _actualizarBadgeLogin();
    if (_usuarioActual) _aplicarRestriccionesPorRol();
    if (_usuarioActual) _actualizarTabAdmin();
    if (_usuarioActual) _actualizarNombreTienda();
    _iniciarRefreshToken();
  }
}

// Auto-carga directa desde tablas de Supabase al iniciar sesión (sin necesitar snapshot)
async function _autoCargarDesdeSupa() {
  if (!_sbUrl()||!_sbKey()||!_sesionActiva) return;
  try {
    _dot('yellow');

    // ── Productos ──────────────────────────────────────────────────────
    const prods = await _sbGet('productos', { select: '*', tienda_id: 'eq.' + _getTiendaId(), limit: 2000 }).catch(() => null);
    if (prods && prods.length > 0) {
      const sbProds = prods.map(p => ({
        // Strip tenant prefix from Supabase id (format: 'tiendaXXX_numericId')
        id: (()=>{ const raw=String(p.id||''); const u=raw.lastIndexOf('_'); const n=Number(u>=0?raw.slice(u+1):raw); return isNaN(n)?raw:n; })(),
        nom: p.nom || '', cat: p.cat || '',
        compra: Number(p.compra) || 0, venta: Number(p.venta) || 0,
        stock: Number(p.stock) || 0, min: Number(p.min) || 0,
        cod: p.cod || '', abrev: p.abrev || '',
        img: p.img || null, paquetes: p.paquetes || [], lotes: p.lotes || [],
        _ts: Number(p._ts) || 0
      }));
      // MERGE: comparar _ts para saber qué versión es más reciente
      const localById = {};
      (productos||[]).forEach(lp => { localById[String(lp.id)] = lp; });
      const merged = sbProds.map(sp => {
        const local = localById[String(sp.id)];
        if (local) {
          const localInvalido = !(local.nom || '').trim() || (!(local.venta) && !(local.compra));
          if (localInvalido) {
            return {
              ...sp,
              stock: Math.max(Number(sp.stock) || 0, Number(local.stock) || 0),
              img:      local.img || sp.img || null,
              paquetes: (sp.paquetes && sp.paquetes.length) ? sp.paquetes : (local.paquetes || []),
              lotes:    (sp.lotes    && sp.lotes.length)    ? sp.lotes    : (local.lotes    || []),
            };
          }
          // Supabase tiene versión más nueva (editada en otro dispositivo) → usarla
          const localTs = Number(local._ts) || 0;
          const sbTs    = Number(sp._ts)    || 0;
          if (sbTs > localTs) {
            return {
              ...sp,
              stock:    Math.max(Number(sp.stock) || 0, Number(local.stock) || 0),
              img:      local.img || sp.img || null,
              paquetes: (local.paquetes && local.paquetes.length) ? local.paquetes : (sp.paquetes || []),
              lotes:    (local.lotes    && local.lotes.length)    ? local.lotes    : (sp.lotes    || []),
            };
          }
          // Datos locales son más recientes — conservarlos
          return {
            ...local,
            img:      local.img      || sp.img      || null,
            paquetes: (local.paquetes && local.paquetes.length) ? local.paquetes : (sp.paquetes || []),
            lotes:    (local.lotes    && local.lotes.length)    ? local.lotes    : (sp.lotes    || []),
          };
        }
        // Producto nuevo de Supabase que no existe local
        return { ...sp, img: sp.img || null, paquetes: sp.paquetes || [], lotes: sp.lotes || [] };
      });
      // ── FIX BUG 3: filtrar productos eliminados localmente antes de aplicar ──
      const eliminados = typeof productosEliminados !== 'undefined' ? new Set((productosEliminados||[]).map(String)) : new Set();
      const mergedFiltrado = merged.filter(p => !eliminados.has(String(p.id)));

      // ── conservar productos que solo existen en local (no sincronizados aún) ──
      const sbIds = new Set(sbProds.map(p => String(p.id)));
      const soloLocales = (productos||[]).filter(lp => !sbIds.has(String(lp.id)) && !eliminados.has(String(lp.id)));
      productos = [...mergedFiltrado, ...soloLocales];
      if (soloLocales.length > 0) {
        console.log('[AutoCarga] ⚠️ Preservando', soloLocales.length, 'productos locales no sincronizados — re-subiendo a Supabase…');
        setTimeout(() => _subirStockBase().catch(e => console.warn('[AutoCarga] re-upload local:', e.message)), 3000);
      }
      idbSet('vpos_productos', productos).catch(() => {});
      idbSet('vpos_productosEliminados', typeof productosEliminados !== 'undefined' ? productosEliminados : []).catch(() => {});
      console.log('[AutoCarga] Productos:', productos.length, '(Supabase:', prods.length, '| solo local:', soloLocales.length + ', eliminados filtrados:', (merged.length - mergedFiltrado.length) + ')');
    } else if (productos && productos.length > 0) {
      await _subirStockBase();
    }

    // ── Ventas / Historial ─────────────────────────────────────────────
    // BUGFIX SYNC: guardar snapshot del historial local ANTES de leer Supabase
    // para poder preservar ventas locales que aún no se subieron al hacer el merge.
    const _historialPreMerge = [...(historial || [])];
    const ventas = await _sbGet('ventas', { select: '*', tienda_id: 'eq.' + _getTiendaId(), order: 'fecha_iso.desc', limit: 1000 }).catch(() => null);
    if (ventas && ventas.length > 0) {
      historial = ventas.map(v => {
        // Parsear items_json (array completo) con fallback a items texto
        let items = [];
        if (v.items_json) {
          try {
            const parsed = typeof v.items_json === 'string' ? JSON.parse(v.items_json) : v.items_json;
            if (Array.isArray(parsed)) items = parsed;
          } catch(e) {}
        }
        // Si items_json no vino, intentar reconstruir desde el string "2x Arroz | 1x Frijol"
        if (!items.length && v.items && typeof v.items === 'string') {
          items = v.items.split('|').map(s => s.trim()).filter(Boolean).map(s => {
            const m = s.match(/^(\d+)x\s+(.+)$/);
            if (m) {
              const nom = m[2].trim();
              const p   = (typeof productos !== 'undefined' ? productos : []).find(x => x.nom === nom);
              return { id: p ? String(p.id) : null, nom, cant: Number(m[1]) || 1, precio: p ? p.venta : 0, cat: p ? p.cat : '' };
            }
            return null;
          }).filter(Boolean);
        }
        const fechaISO = v.fecha_iso || v.fecha || new Date().toISOString();
        // BUG FIX: siempre generar fechaStr formateada aquí para que el historial
        // no muestre el timestamp ISO crudo (ej: "2026-05-02T00:46:30.767+00:00")
        const _fdObj = new Date(fechaISO);
        const fechaStr = isNaN(_fdObj.getTime()) ? '—' : _fdObj.toLocaleString('es-SV');
        return {
          id: v.id,
          fecha: fechaISO,
          fechaISO,
          fechaStr,
          ts: Date.parse(fechaISO) || 0,
          total: Number(v.total) || 0,
          pago: Number(v.pago) || 0,
          vuelto: Number(v.vuelto) || 0,
          items,
          items_json: v.items_json || null
        };
      });
      historial.sort((a, b) => (b.ts || 0) - (a.ts || 0));
      // BUGFIX SYNC: filtrar ventas de Supabase anteriores al borrado local (tombstone).
      const _wipeTs = localStorage.getItem('vpos_historialWipeTs');
      const _wipeMs = _wipeTs ? Date.parse(_wipeTs) : 0;
      if (_wipeMs > 0) historial = historial.filter(v => (v.ts || 0) >= _wipeMs);
      // BUGFIX SYNC: filtrar cobros eliminados individualmente (por devolución)
      const _cobrosElimSet = new Set((typeof cobrosEliminados !== 'undefined' ? cobrosEliminados : []).map(String));
      if (_cobrosElimSet.size > 0) historial = historial.filter(v => !_cobrosElimSet.has(String(v.id)));
      // BUGFIX SYNC: MERGE con ventas locales que aún no llegaron a Supabase.
      // Sin esto, _autoCargarDesdeSupa reemplaza el historial completo y borra
      // ventas locales recientes que se hicieron offline o que el RPC aún no subió.
      const _sbIds = new Set(historial.map(v => String(v.id)));
      const _soloLocales = (typeof historial_local_cache !== 'undefined' ? [] : []);
      // Ventas locales que NO están en Supabase aún → preservarlas
      (_historialPreMerge || []).forEach(lv => {
        if (!_sbIds.has(String(lv.id)) && (_wipeMs === 0 || (lv.ts||0) >= _wipeMs) && !_cobrosElimSet.has(String(lv.id))) {
          historial.push(lv);
        }
      });
      historial.sort((a, b) => (b.ts || 0) - (a.ts || 0));
      if (typeof normalizeHistorial === 'function') historial = normalizeHistorial(historial);
      idbSet('vpos_historial', historial).catch(() => {});
      console.log('[AutoCarga] Ventas:', ventas.length, '(wipe filter:', !!_wipeTs, ')');

      // ── RECALCULAR ventasDia / ventasSem / ventasMes desde historial ──
      // FIX SYNC: usar _recalcularReportesDesdeHistorial() para respetar el timestamp
      // del último reset manual del día (vpos_reinicioDiaTs), igual que en app.js.
      // Esto garantiza que si otro teléfono hizo "Reiniciar día", al cargar desde
      // Supabase no se restauren ventas anteriores al corte.
      if (typeof _recalcularReportesDesdeHistorial === 'function') {
        _recalcularReportesDesdeHistorial();
      } else {
        // Fallback por si app.js no cargó aún
        const hoy    = new Date().toDateString();
        const lunes  = _lunesDeLaSemana();
        const ahora  = new Date();
        ventasDia = {}; ventasSem = {}; ventasMes = {};
        historial.forEach(v => {
          if (!v.fechaISO && !v.fecha) return;
          const fecha = new Date(v.fechaISO || v.fecha);
          const esHoy = fecha.toDateString() === hoy;
          const esSem = fecha >= lunes;
          const esMes = fecha.getMonth() === ahora.getMonth() && fecha.getFullYear() === ahora.getFullYear();
          (v.items || []).forEach(it => {
            const pid  = String(it.id || ''); if (!pid || pid === 'null') return;
            const cant = Number(it.cant || 0);
            const tot  = cant * Number(it.precio || 0);
            const base = { id: pid, nom: it.nom || '', cat: it.cat || '', cant: 0, total: 0 };
            if (esHoy) { if (!ventasDia[pid]) ventasDia[pid] = {...base}; ventasDia[pid].cant += cant; ventasDia[pid].total += tot; }
            if (esSem) { if (!ventasSem[pid]) ventasSem[pid] = {...base}; ventasSem[pid].cant += cant; ventasSem[pid].total += tot; }
            if (esMes) { if (!ventasMes[pid]) ventasMes[pid] = {...base}; ventasMes[pid].cant += cant; ventasMes[pid].total += tot; }
          });
        });
        if (typeof normalizeReport === 'function') {
          ventasDia = normalizeReport(ventasDia);
          ventasSem = normalizeReport(ventasSem);
          ventasMes = normalizeReport(ventasMes);
        }
      }
      idbSet('vpos_ventasDia', ventasDia).catch(() => {});
      idbSet('vpos_ventasSem', ventasSem).catch(() => {});
      idbSet('vpos_ventasMes', ventasMes).catch(() => {});
    }

    // ── Pagos ──────────────────────────────────────────────────────────
    const pagosData = await _sbGet('pagos', { select: '*', tienda_id: 'eq.' + _getTiendaId(), order: 'fecha_iso.desc', limit: 500 }).catch(() => null);
    if (pagosData && pagosData.length > 0) {
      // Filtrar pagos que el usuario eliminó localmente (evita que vuelvan desde Supabase)
      const eliminadosPagos = typeof pagosEliminados !== 'undefined' ? new Set((pagosEliminados||[]).map(String)) : new Set();
      // Intentar borrar en Supabase los que aún no se borraron (ej: estaban offline al eliminar)
      if (eliminadosPagos.size > 0) {
        for (const pid of eliminadosPagos) {
          try { await _sbDeleteFiltro('pagos', { id: 'eq.' + pid }); } catch(e) {}
        }
      }
      pagos = pagosData
        .filter(p => !eliminadosPagos.has(String(p.id)))
        .map(p => ({
          // FIX: normalizar id siempre a string para que borrarGasto() lo filtre bien
          id: String(p.id),
          fechaISO: p.fecha_iso || p.fecha || new Date().toISOString(),
          fecha: p.fecha_iso || p.fecha || new Date().toISOString(),
          fechaStr: p.fecha_iso ? new Date(p.fecha_iso).toLocaleString('es-SV') : (p.fecha ? new Date(p.fecha).toLocaleString('es-SV') : '—'),
          ts: Date.parse(p.fecha_iso || p.fecha || '') || 0,
          monto: Number(p.monto) || 0,
          // FIX: mapear nom → concepto para que renderPagos muestre la descripción
          concepto: p.nom || p.nota || p.concepto || '',
          cat: p.cat || 'GASTO', nom: p.nom || '', nota: p.nota || ''
        }));
      if (typeof normalizePagos === 'function') pagos = normalizePagos(pagos);
      idbSet('vpos_pagos', pagos).catch(() => {});
    }

    // ── Restock log ────────────────────────────────────────────────────
    const restock = await _sbGet('restock_log', { select: '*', tienda_id: 'eq.' + _getTiendaId(), order: 'ts.desc', limit: 500 }).catch(() => null);
    if (restock && restock.length > 0) {
      restockLog = restock.map(r => ({
        id: r.id, ts: r.ts, prodId: r.prod_id,
        cant: r.cant, precioCompra: r.precio_compra, fechaStr: r.fecha_str
      }));
      idbSet('vpos_restockLog', restockLog).catch(() => {});
    }

    // ── Ventas diarias ─────────────────────────────────────────────────
    const vd = await _sbGet('ventas_diarias', { select: '*', tienda_id: 'eq.' + _getTiendaId(), order: 'fecha.desc', limit: 365 }).catch(() => null);
    if (vd && vd.length > 0) {
      // FIX race condition: NO reemplazar ciegamente. Supabase puede tener un valor
      // desactualizado si el upload de la venta reciente aún no terminó. Mergear
      // por fecha tomando el monto mayor para no retroceder ventas ya registradas.
      const _tid = _getTiendaId();
      vd.forEach(row => {
        const sbMonto = Number(row.monto) || 0;
        // BUG FIX: la fecha se sube como "tiendaId_YYYY-MM-DD" para unicidad en Supabase.
        // Al leer hay que quitar ese prefijo para que quede solo "YYYY-MM-DD".
        const fechaLimpia = row.fecha && row.fecha.startsWith(_tid + '_')
          ? row.fecha.slice(_tid.length + 1)
          : row.fecha;
        // Validar que quedó una fecha ISO real (YYYY-MM-DD)
        if (!fechaLimpia || !/^\d{4}-\d{2}-\d{2}$/.test(fechaLimpia)) return;
        // BUGFIX SYNC: ignorar fechas que fueron eliminadas localmente (tombstone)
        if (typeof ventasDiariasEliminadas !== 'undefined' && ventasDiariasEliminadas.includes(fechaLimpia)) return;
        const idx = ventasDiarias.findIndex(v => v.fecha === fechaLimpia);
        if (idx >= 0) {
          // Solo actualizar si Supabase trae un valor mayor (otro dispositivo vendió más)
          if (sbMonto > Number(ventasDiarias[idx].monto || 0)) {
            ventasDiarias[idx].monto = sbMonto;
          }
          // Conservar nota de Supabase si no hay una local
          if (!ventasDiarias[idx].nota && row.nota) ventasDiarias[idx].nota = row.nota;
        } else {
          // Fecha que no existe localmente → agregarla desde Supabase
          ventasDiarias.push({ fecha: fechaLimpia, monto: sbMonto, nota: row.nota || '' });
        }
      });
      ventasDiarias.sort((a, b) => a.fecha.localeCompare(b.fecha));
      idbSet('vpos_ventasDiarias', ventasDiarias).catch(() => {});
    }

    // ── Config ─────────────────────────────────────────────────────────
    const cfg = await _sbGet('config', { select: '*', tienda_id: 'eq.' + _getTiendaId() }).catch(() => null);
    if (cfg && cfg.length > 0) {
      cfg.forEach(row => {
        if (row.clave === 'efectivoInicial') {
          efectivoInicial = parseFloat(row.valor) || 0;
          idbSet('vpos_efectivoInicial', efectivoInicial).catch(() => {});
          const el = document.getElementById('inpEfectivoInicial');
          if (el) el.value = efectivoInicial > 0 ? efectivoInicial : '';
        }
        if (row.clave === 'inventarioInicial') {
          inventarioInicial = parseFloat(row.valor) || 0;
          idbSet('vpos_inventarioInicial', inventarioInicial).catch(() => {});
          const el = document.getElementById('inpInventarioInicial');
          if (el) el.value = inventarioInicial > 0 ? inventarioInicial : '';
        }
      });
    }

    if (typeof actualizarTodo === 'function') actualizarTodo();
    _dot('green');
    console.log('[AutoCarga] ✅ Supabase → datos frescos aplicados. ventasDia/Sem/Mes recalculados.');
  } catch(e) {
    console.warn('[AutoCarga] Sin conexión a Supabase, usando caché IDB:', e.message);
    _dot('red');
  }
}

// =====================================================================
//  🔒 CONTROL DE ACCESO POR ROL
// =====================================================================

function _aplicarRestriccionesPorRol() {
  if (!_usuarioActual) return;
  const esSuperAdmin = _esSuperAdmin();
  const rol = _usuarioActual.rol || 'cajero';
  const esCajero     = rol === 'cajero';
  const esSupervisor = rol === 'supervisor';
  const esAdmin      = rol === 'admin';

  // Super admins (Santiago y Madelline) ven TODO sin restricciones
  if (esSuperAdmin) {
    // Mostrar badge de super admin
    _actualizarBadgeRol();
    return;
  }

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
    // Ocultar botones de corte y reportes (pos_pro.js)
    ['btnCorteCajaNv','btnReporteNv'].forEach(id => {
      const el = document.getElementById(id); if (el) el.style.display = 'none';
    });
    // Cajero SÍ puede ver Ventas por Día — asegurar que esté visible
    const dniVD = document.getElementById('dniVentasDiarias');
    if (dniVD) dniVD.style.display = '';
    const tabVD = document.querySelector('.nav-tab[onclick*="pgVentasDiarias"]');
    if (tabVD) tabVD.style.display = '';
  } else if (esSupervisor) {
    // Supervisor: puede ver inventario y reportes, no puede config ni usuarios
    const pgSync = document.getElementById('pgSync');
    if (pgSync) pgSync.style.display = 'none';
    document.querySelectorAll('.nav-tab, .drawer-nav-item').forEach(tab => {
      const onclick = tab.getAttribute('onclick') || '';
      if (onclick.includes('pgSync')) tab.style.display = 'none';
    });
    document.querySelectorAll('.btn-backup, .btn-restore').forEach(btn => {
      const oc = btn.getAttribute('onclick') || '';
      if (oc.includes('exportarDatos') || oc.includes('inputImportar') || oc.includes('inputFusionar')) {
        btn.style.display = 'none';
      }
    });
    // Supervisor puede usar corte de caja y reportes
    ['btnCorteCajaNv','btnReporteNv'].forEach(id => {
      const el = document.getElementById(id); if (el) el.style.display = '';
    });
  } else {
    // Admin de tienda (cliente con membresía): solo ve Venta, Inventario, Reportes, Ventas x Día
    const pgsOcultar = ['pgSync', 'pgDestacados', 'pgFinanzasMes', 'pgCierreDia'];
    pgsOcultar.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    document.querySelectorAll('.nav-tab, .drawer-nav-item').forEach(tab => {
      const onclick = tab.getAttribute('onclick') || '';
      if (pgsOcultar.some(p => onclick.includes(p))) tab.style.display = 'none';
    });
    // Ocultar Backup, Restaurar, Fusionar
    document.querySelectorAll('.btn-backup, .btn-restore').forEach(btn => {
      const oc  = btn.getAttribute('onclick') || '';
      const txt = (btn.textContent || '').trim();
      if (oc.includes('exportarDatos') || oc.includes('inputImportar') || oc.includes('inputFusionar') ||
          txt.includes('Backup') || txt.includes('Restaurar') || txt.includes('Fusionar')) {
        btn.style.display = 'none';
      }
    });
  }

  // Actualizar badge de rol en el botón de sesión
  _actualizarBadgeRol();
}

function _actualizarBadgeRol() {
  if (!_usuarioActual) return;
  const rol = _usuarioActual.rol || 'cajero';
  const rolInfo = ROLES[rol] || ROLES.cajero;
  document.querySelectorAll('.login-status').forEach(el => {
    el.innerHTML = `<span style="background:${rolInfo.color}22;color:${rolInfo.color};border-radius:6px;padding:2px 7px;font-size:11px;font-weight:900;">${rolInfo.label}</span> ${_usuarioActual.nombre || _usuarioActual.email || ''}`;
  });
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
    const snap = { version: typeof APP_SCHEMA_VERSION!=='undefined'?APP_SCHEMA_VERSION:4, exportado: new Date().toISOString(),
      dispositivo: _dispositivoId, efectivoInicial: typeof efectivoInicial!=='undefined'?efectivoInicial:0,
      inventarioInicial: typeof inventarioInicial!=='undefined'?inventarioInicial:0,
      productos, ventasDia, ventasSem, ventasMes, historial, pagos, ventasDiarias, restockLog: restockLog||[] };
    await _sbPost('sync_snapshots', { id: _getTiendaId()+'_'+_dispositivoId, tienda_id: _getTiendaId(),
      dispositivo_id: _dispositivoId, datos: JSON.stringify(snap), created_at: new Date().toISOString() }, true);
    _registrarAccion('enviar_datos', productos.length+' productos');
    _dot('green'); toast('✅ Datos subidos. El otro telefono puede usar "Fusionar y actualizar".');
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
            Esto borrará <strong>TODOS</strong> los datos de Supabase (ventas, pagos, productos, logs) y reseteará el <strong>efectivo e inventario inicial</strong> a $0. Los demás datos de este teléfono no se borran.
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
  if (btn) { btn.disabled=true; btn.textContent='⏳ Limpiando…'; }
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

    // ── Limpiar finanzas y cierres en Supabase ──────────────────────────
    const tid = _getTiendaId();
    if (tid) {
      await fetch(_sbUrl()+'/rest/v1/finanzas_mes?tienda_id=eq.'+encodeURIComponent(tid),{method:'DELETE',headers:_headers({'Prefer':'return=minimal'})}).catch(()=>{});
      await fetch(_sbUrl()+'/rest/v1/cierre_diario?tienda_id=eq.'+encodeURIComponent(tid),{method:'DELETE',headers:_headers({'Prefer':'return=minimal'})}).catch(()=>{});
    }

    // ── Resetear efectivo e inventario inicial en IDB y UI ──────────────
    if (typeof window.efectivoInicial !== 'undefined')   window.efectivoInicial   = 0;
    if (typeof window.inventarioInicial !== 'undefined') window.inventarioInicial = 0;
    if (typeof idbSet === 'function') {
      await idbSet('vpos_efectivoInicial',   0).catch(()=>{});
      await idbSet('vpos_inventarioInicial', 0).catch(()=>{});
    }
    const inpEf  = document.getElementById('inpEfectivoInicial');
    const inpInv = document.getElementById('inpInventarioInicial');
    if (inpEf)  inpEf.value  = '';
    if (inpInv) inpInv.value = '';
    if (typeof renderCajaPanel === 'function') renderCajaPanel();
    if (typeof renderReportes  === 'function') renderReportes();

    _dot('green'); toast('✅ Supabase limpiado. Efectivo e inventario inicial reseteados.');
  } catch(e) { _dot('red'); toast('Error: '+e.message,true); }
  finally { if(btn){btn.disabled=false;btn.textContent='🗑 Sí, borrar todo';} }
}
window._ejecutarLimpiarSupabase = _ejecutarLimpiarSupabase;
// =====================================================================
//  FUSIÓN (misma lógica de antes)
// =====================================================================

function _fusionarDos(local, ext) {
  const idsCobrosLocal=new Set((local.historial||[]).map(v=>v.id));
  const idsCobrosExt=new Set((ext.historial||[]).map(v=>v.id));

  // FIX BUG 3: unir las listas de eliminados de ambos dispositivos
  const eliminadosLocal = new Set((local.productosEliminados||[]).map(String));
  const eliminadosExt   = new Set((ext.productosEliminados||[]).map(String));
  const todosEliminados = new Set([...eliminadosLocal, ...eliminadosExt]);

  // Primero filtrar productos locales que el otro dispositivo también borró
  local.productos = (local.productos||[]).filter(p => !eliminadosExt.has(String(p.id)));

  const idsLocal=new Set((local.productos||[]).map(p=>String(p.id)));
  // Solo agregar productos externos que NO están en la lista de eliminados
  (ext.productos||[]).forEach(ep=>{
    const eid = String(ep.id);
    if(!idsLocal.has(eid) && !todosEliminados.has(eid)){
      // FIX BUG 2: preservar imagen local si existe, traer la del externo si no
      local.productos.push(ep);
      idsLocal.add(eid);
    }
  });

  // FIX: para productos que ya están en local, si tienen datos vacíos (corruptos),
  // usar los datos del externo como base (más completos).
  local.productos = local.productos.map(lp => {
    const extP = (ext.productos||[]).find(ep => String(ep.id) === String(lp.id));
    if (!extP) return lp;
    const localInvalido = !(lp.nom || '').trim() || (!(lp.venta) && !(lp.compra));
    if (localInvalido && extP) {
      // Datos externos más completos — usarlos como base, preservar stock local si mayor
      return {
        ...extP,
        stock: Math.max(Number(extP.stock) || 0, Number(lp.stock) || 0),
        img: lp.img || extP.img || null,
      };
    }
    // Datos locales válidos — preservar imagen del externo si local no tiene
    if (!lp.img && extP.img) return { ...lp, img: extP.img };
    return lp;
  });

  // Persistir la lista unificada de eliminados
  local.productosEliminados = [...todosEliminados];

  // BUGFIX SYNC: respetar tombstone de borrado de historial.
  // Si local o ext tienen historialWipeTs, ignorar ventas anteriores a ese timestamp.
  const _wipeLocal = local.historialWipeTs ? Date.parse(local.historialWipeTs) : 0;
  const _wipeExt   = ext.historialWipeTs   ? Date.parse(ext.historialWipeTs)   : 0;
  const _wipeMax   = Math.max(_wipeLocal, _wipeExt);
  // Propagate the max wipeTs so it reaches all devices via subsequent snapshots
  if (_wipeMax > 0) local.historialWipeTs = new Date(_wipeMax).toISOString();
  // BUGFIX SYNC: unir listas de cobros eliminados por devolución de ambos dispositivos
  const _cobrosElimLocal = new Set((local.cobrosEliminados||[]).map(String));
  const _cobrosElimExt   = new Set((ext.cobrosEliminados||[]).map(String));
  const _todosElimCobros = new Set([..._cobrosElimLocal, ..._cobrosElimExt]);
  local.cobrosEliminados = [..._todosElimCobros];
  // Filter out local historial entries: older than wipe OR individually deleted
  local.historial = (local.historial||[]).filter(v =>
    (_wipeMax === 0 || (v.ts||0) >= _wipeMax) && !_todosElimCobros.has(String(v.id))
  );
  const seenH=new Set((local.historial||[]).map(v=>v.id));
  // Only add external entries that are not deleted and postdate the wipe timestamp
  (ext.historial||[]).forEach(v=>{
    if (!seenH.has(v.id) && (_wipeMax === 0 || (v.ts||0) >= _wipeMax) && !_todosElimCobros.has(String(v.id))) {
      local.historial.push(v); seenH.add(v.id);
    }
  });
  local.historial.sort((a,b)=>(b.ts||0)-(a.ts||0));
  const hoy=new Date().toDateString(), lunes=_lunesDeLaSemana(), ahora=new Date();

  // FIX Bug 1: respetar reinicioDiaTs al recalcular ventasDia.
  // Tomamos el timestamp de reset MÁS RECIENTE entre local, ext y localStorage.
  const tsLocal2  = local.reinicioDiaTs  || localStorage.getItem('vpos_reinicioDiaTs')  || '';
  const tsExt2    = ext.reinicioDiaTs    || '';
  const tsResetFusion = tsLocal2 > tsExt2 ? tsLocal2 : tsExt2;
  const resetCutoff   = tsResetFusion ? new Date(tsResetFusion) : null;
  // Propagar el timestamp ganador al snapshot resultante
  if (tsResetFusion) {
    local.reinicioDiaTs   = tsResetFusion;
    local.reinicioDiaFecha = local.reinicioDiaFecha || ext.reinicioDiaFecha || new Date().toDateString();
  }

  local.ventasDia={}; local.ventasSem={}; local.ventasMes={};
  local.historial.forEach(v=>{
    if(!v.fechaISO&&!v.fecha) return;
    const fecha=new Date(v.fechaISO||v.fecha);
    const esHoy=fecha.toDateString()===hoy, esSem=fecha>=lunes;
    const esMes=fecha.getMonth()===ahora.getMonth()&&fecha.getFullYear()===ahora.getFullYear();
    // Si hubo reset manual hoy, ignorar ventas anteriores al corte en ventasDia
    const pasaCorte = !esHoy || !resetCutoff || fecha >= resetCutoff;
    (v.items||[]).forEach(it=>{
      const pid=String(it.id||''); if(!pid) return;
      const cant=Number(it.cant||0), total=cant*Number(it.precio||0);
      const base={id:pid,nom:it.nom||'',cat:it.cat||'',cant:0,total:0};
      if(esHoy&&pasaCorte){if(!local.ventasDia[pid])local.ventasDia[pid]={...base};local.ventasDia[pid].cant+=cant;local.ventasDia[pid].total+=total;}
      if(esSem){if(!local.ventasSem[pid])local.ventasSem[pid]={...base};local.ventasSem[pid].cant+=cant;local.ventasSem[pid].total+=total;}
      if(esMes){if(!local.ventasMes[pid])local.ventasMes[pid]={...base};local.ventasMes[pid].cant+=cant;local.ventasMes[pid].total+=total;}
    });
  });
  const seenP=new Set((local.pagos||[]).map(g=>String(g.id)));
  (ext.pagos||[]).forEach(g=>{if(!seenP.has(String(g.id))){local.pagos.push(g);seenP.add(String(g.id));}});
  if(!local.ventasDiarias) local.ventasDiarias=[];
  // BUGFIX SYNC: unir tombstones de fechas eliminadas de ambos dispositivos
  const _vdElimLocal = new Set((local.ventasDiariasEliminadas||[]));
  const _vdElimExt   = new Set((ext.ventasDiariasEliminadas||[]));
  const _vdElimTodos = new Set([..._vdElimLocal, ..._vdElimExt]);
  local.ventasDiariasEliminadas = [..._vdElimTodos];
  // Eliminar del local cualquier fecha que esté en el tombstone unificado
  local.ventasDiarias = local.ventasDiarias.filter(v => !_vdElimTodos.has(v.fecha));
  (ext.ventasDiarias||[]).forEach(vExt=>{
    if (_vdElimTodos.has(vExt.fecha)) return; // ignorar fechas eliminadas
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

  // FIX BUG 2: antes de aplicar, mapear imágenes locales por id para preservarlas
  const imgsPorId = {};
  (typeof productos !== 'undefined' ? productos : []).forEach(p => {
    if (p.img) imgsPorId[String(p.id)] = p.img;
  });

  // Aplicar datos en memoria (fuente de verdad viene de Supabase/snapshot)
  productos=datos.productos||[]; ventasDia=datos.ventasDia||{}; ventasSem=datos.ventasSem||{};
  ventasMes=datos.ventasMes||{}; pagos=datos.pagos||[];
  ventasDiarias=datos.ventasDiarias||[]; restockLog=datos.restockLog||[];
  // BUGFIX SYNC: NO reemplazar historial directamente — hacer merge para preservar
  // ventas locales recientes que aún no llegaron al snapshot remoto.
  // Sin esto, _aplicarDatos borraba ventas hechas en este teléfono en los últimos
  // segundos antes de que registrarVentaAtomica terminara de subirlas a Supabase.
  {
    const _nuevoH = datos.historial || [];
    const _wipeMs2 = localStorage.getItem('vpos_historialWipeTs')
      ? Date.parse(localStorage.getItem('vpos_historialWipeTs')) : 0;
    const _elimSet2 = new Set((typeof cobrosEliminados !== 'undefined' ? cobrosEliminados : []).map(String));
    const _idsSnap = new Set(_nuevoH.map(v => String(v.id)));
    // Ventas locales que el snapshot no trae todavía → preservarlas
    (historial || []).forEach(lv => {
      if (_idsSnap.has(String(lv.id))) return;          // ya está en el snapshot
      if (_elimSet2.has(String(lv.id))) return;         // fue devuelta
      if (_wipeMs2 > 0 && (lv.ts||0) < _wipeMs2) return; // anterior al borrado masivo
      _nuevoH.push(lv);
    });
    _nuevoH.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    historial = _nuevoH;
  }

  // FIX BUG 3: restaurar lista de eliminados desde el snapshot
  if (typeof productosEliminados !== 'undefined') {
    const eliminadosSnap = datos.productosEliminados || [];
    // Unir con los eliminados locales que ya teníamos
    const union = new Set([...productosEliminados, ...eliminadosSnap.map(String)]);
    productosEliminados = [...union];
    // Aplicar filtro: quitar productos que están en la lista de eliminados
    productos = productos.filter(p => !union.has(String(p.id)));
  }

  // FIX BUG 2: restaurar imágenes locales que el snapshot no trae (img: null en snapshot)
  productos = productos.map(p => ({
    ...p,
    img: p.img || imgsPorId[String(p.id)] || null
  }));

  if(typeof normalizeReport==='function'){ventasDia=normalizeReport(ventasDia);ventasSem=normalizeReport(ventasSem);ventasMes=normalizeReport(ventasMes);}
  if(typeof normalizeHistorial==='function') historial=normalizeHistorial(historial);
  if(typeof normalizePagos==='function') pagos=normalizePagos(pagos);
  // FIX SYNC: aplicar timestamp de reset del día desde el snapshot remoto
  // Si el snapshot de otro teléfono tiene un reset más reciente, adoptarlo para que
  // _recalcularReportesDesdeHistorial() excluya las ventas anteriores al corte.
  if (datos.reinicioDiaTs && datos.reinicioDiaFecha) {
    const tsLocal  = localStorage.getItem('vpos_reinicioDiaTs')  || '';
    const tsRemoto = datos.reinicioDiaTs;
    if (tsRemoto > tsLocal) {
      localStorage.setItem('vpos_reinicioDiaTs',   tsRemoto);
      localStorage.setItem('vpos_reinicioDiaFecha', datos.reinicioDiaFecha);
      // Recalcular ventasDia respetando el nuevo corte
      if (typeof _recalcularReportesDesdeHistorial === 'function') _recalcularReportesDesdeHistorial();
    }
  }
  if(datos.efectivoInicial!==undefined){efectivoInicial=parseFloat(datos.efectivoInicial)||0;idbSet('vpos_efectivoInicial',efectivoInicial).catch(()=>{});const el=document.getElementById('inpEfectivoInicial');if(el)el.value=efectivoInicial>0?efectivoInicial:'';}
  if(datos.inventarioInicial!==undefined){inventarioInicial=parseFloat(datos.inventarioInicial)||0;idbSet('vpos_inventarioInicial',inventarioInicial).catch(()=>{});const el=document.getElementById('inpInventarioInicial');if(el)el.value=inventarioInicial>0?inventarioInicial:'';}
  // Actualizar caché IDB en paralelo (no bloquea la UI)
  idbSetMany([
    ['vpos_productos',productos],['vpos_ventasDia',ventasDia],['vpos_ventasSem',ventasSem],
    ['vpos_ventasMes',ventasMes],['vpos_historial',historial],['vpos_pagos',pagos],
    ['vpos_ventasDiarias',ventasDiarias],['vpos_restockLog',restockLog],
    ['vpos_productosEliminados', typeof productosEliminados !== 'undefined' ? productosEliminados : []]
  ]).catch(()=>{});
  actualizarTodo();
  toast('✅ '+productos.length+' productos cargados correctamente',false,true);
}

// =====================================================================
//  📵 MODO OFFLINE ROBUSTO
//  Detecta conexión, guarda operaciones en IDB, las replaya al volver
// =====================================================================

let _estaOnline       = navigator.onLine;
let _flushingQueue    = false;
let _offlineListener  = false;

// ── Modo "Usar sin internet" — almacenamiento solo local ─────────────
let _modoSoloLocal = localStorage.getItem('vpos_modoSoloLocal') === '1';

// ── Detectar y reaccionar a cambios de conexión ───────────────────────
function _iniciarDetectorConexion() {
  if (_offlineListener) return;
  _offlineListener = true;

  const alOnline = async () => {
    if (_estaOnline) return;
    _estaOnline = true;
    if (_modoSoloLocal) {
      // En modo solo local: registrar que hay internet pero no sincronizar
      console.log('[Offline] 🌐 Internet disponible — modo local activo, sin sincronizar');
      return;
    }
    _setOfflineUI(false);
    console.log('[Offline] 🌐 Conexión restaurada — vaciando cola');
    toast('🌐 Conexión restaurada — sincronizando datos…');
    await _flushOfflineQueue();
    // Retomar Realtime + polling y enviar snapshot
    _realtimeChannel = null; // forzar reconexión del WebSocket
    _iniciarPolling();
    if (typeof _autoEnviarSnapshot === 'function') _autoEnviarSnapshot();
  };

  const alOffline = () => {
    _estaOnline = false;
    _setOfflineUI(true);
    _detenerPolling();
    console.log('[Offline] 📵 Sin conexión — modo offline activado');
  };

  window.addEventListener('online',  alOnline);
  window.addEventListener('offline', alOffline);

  // Estado inicial
  if (!navigator.onLine) {
    _estaOnline = false;
    _setOfflineUI(true);
  }
}

// ── UI del modo offline ───────────────────────────────────────────────
function _setOfflineUI(offline) {
  const banner = document.getElementById('offlineBanner');
  const badge  = document.getElementById('offlineBadge');
  // En modo solo local, no mostrar banner de "sin red" — es intencional
  const mostrar = offline && !_modoSoloLocal;
  if (banner) banner.classList.toggle('visible', mostrar);
  if (badge)  badge.classList.toggle('visible',  mostrar);
  document.body.classList.toggle('offline-mode', mostrar);
  if (!offline) {
    // Resetear contador
    const cnt = document.getElementById('oqCountBadge');
    if (cnt) { cnt.textContent = '0'; cnt.classList.remove('visible'); }
  }
}

async function _actualizarContadorCola() {
  try {
    const n = await oqCount();
    const cnt = document.getElementById('oqCountBadge');
    if (!cnt) return;
    if (n > 0) { cnt.textContent = n; cnt.classList.add('visible'); }
    else        { cnt.classList.remove('visible'); }
  } catch(e) {}
}

// ── Encolar operación para cuando vuelva internet ────────────────────
async function _encolarOffline(operacion, datos) {
  try {
    await oqPush(operacion, datos);
    await _actualizarContadorCola();
    console.log('[Offline] 📥 Encolado:', operacion);
  } catch(e) {
    console.warn('[Offline] Error encolando:', e.message);
  }
}

// ── Vaciar cola cuando vuelve internet ───────────────────────────────
async function _flushOfflineQueue() {
  if (_flushingQueue) return;
  _flushingQueue = true;
  try {
    const pendientes = await oqGetAll();
    if (!pendientes.length) { _flushingQueue = false; return; }

    console.log('[Offline] 🚀 Vaciando', pendientes.length, 'operaciones pendientes');
    let procesados = 0;

    for (const entry of pendientes) {
      try {
        const d = entry.datos;
        switch (entry.operacion) {
          case 'venta':
            await _sbPost('ventas', {
              id: d.id, fecha_iso: d.fechaISO || d.fecha,
              total: parseFloat(d.total) || 0, pago: parseFloat(d.pago) || 0,
              vuelto: parseFloat(d.vuelto) || 0,
              tienda_id: _getTiendaId(),
              items: (Array.isArray(d.items) ? d.items.map(x=>x.cant+'x '+x.nom).join(' | ') : d.items) || '',
              items_json: d.items_json || (Array.isArray(d.items) ? JSON.stringify(d.items) : null)
            }, true);
            break;
          case 'pago':
            await _sbPost('pagos', {
              id: String(d.id), fecha_iso: d.fechaISO || new Date().toISOString(),
              monto: parseFloat(d.monto) || 0, cat: d.cat || 'GASTO',
              nom: d.nom || d.concepto || '', nota: d.nota || '',
              tienda_id: _getTiendaId()
            }, true);
            break;
          case 'producto':
            await _sbPost('productos', d, true);
            break;
          case 'snapshot':
            await _sbPost('sync_snapshots', d, true);
            break;
          case 'todo':
            await _subirHistorial();
            await _subirStockBase();
            await _subirPagos();
            await _subirVentasDiarias();
            break;
        }
        await oqDelete(entry.id);
        procesados++;
      } catch(e) {
        console.warn('[Offline] Error procesando entrada', entry.id, ':', e.message);
        // No borramos — lo reintentamos la próxima vez
      }
    }

    await _actualizarContadorCola();
    if (procesados > 0) {
      localStorage.setItem('vpos_ultimoSync', new Date().toISOString());
      if (typeof _actualizarBadgeSync === 'function') _actualizarBadgeSync();
      _dot('green');
      toast('✅ ' + procesados + ' operaciones sincronizadas con la nube');
      console.log('[Offline] ✅ Cola vaciada:', procesados, 'de', pendientes.length);
    }
  } catch(e) {
    console.warn('[Offline] Error vaciando cola:', e.message);
  } finally {
    _flushingQueue = false;
  }
}

// ── Verificar si hay conexión antes de llamar a Supabase ─────────────
function _hayConexion() {
  if (_modoSoloLocal) return false; // Modo sin internet: siempre local
  return _estaOnline && navigator.onLine;
}

// ── Toggle modo "Usar sin internet" ──────────────────────────────────
async function toggleModoSoloLocal() {
  _modoSoloLocal = !_modoSoloLocal;
  localStorage.setItem('vpos_modoSoloLocal', _modoSoloLocal ? '1' : '0');
  _actualizarUILocalMode();

  if (!_modoSoloLocal) {
    // Se desactivó el modo local → si hay internet, subir datos pendientes
    if (navigator.onLine) {
      _estaOnline = true;
      _setOfflineUI(false);
      toast('🌐 Modo en línea activado — sincronizando datos…');
      await _flushOfflineQueue();
      _iniciarPolling();
      if (typeof _autoEnviarSnapshot === 'function') _aut

// =====================================================================
//  🔄 FUNCIONES SYNC FALTANTES — syncAhora, registrarVentaAtomica, etc.
//  Agregadas para corregir: ventas no se guardaban en Supabase
// =====================================================================

// ── Subir historial completo a tabla ventas ───────────────────────────
async function _subirHistorial() {
  if (!_hayConexion()) return;
  const tiendaId = _getTiendaId();
  if (!tiendaId) { console.warn('[Sync] Sin tienda_id, abortando _subirHistorial'); return; }
  const hist = typeof historial !== 'undefined' ? (historial || []) : [];
  for (const v of hist.slice(0, 500)) {
    try {
      await _sbPost('ventas', {
        id: v.id,
        fecha_iso: v.fechaISO || v.fecha || new Date().toISOString(),
        total: parseFloat(v.total) || 0,
        pago: parseFloat(v.pago) || 0,
        vuelto: parseFloat(v.vuelto) || 0,
        tienda_id: tiendaId,
        items: (Array.isArray(v.items) ? v.items.map(x => x.cant + 'x ' + x.nom).join(' | ') : v.items) || '',
        items_json: v.items_json || (Array.isArray(v.items) ? JSON.stringify(v.items) : null)
      }, true);
    } catch(e) { console.warn('[Sync] subir venta error:', e.message); }
  }
  console.log('[Sync] _subirHistorial: ' + hist.length + ' ventas subidas');
}

// ── Subir productos a Supabase ────────────────────────────────────────
async function _subirStockBase() {
  if (!_hayConexion()) return;
  const tiendaId = _getTiendaId();
  if (!tiendaId) return;
  const prods = typeof productos !== 'undefined' ? (productos || []) : [];
  for (const p of prods) {
    try {
      const prodSb = { ...p, tienda_id: tiendaId };
      delete prodSb.img; // no subir imágenes base64 (muy grandes)
      await _sbPost('productos', prodSb, true);
    } catch(e) { console.warn('[Sync] subir producto error:', e.message); }
  }
}

// ── Subir pagos/gastos a Supabase ────────────────────────────────────
async function _subirPagos() {
  if (!_hayConexion()) return;
  const tiendaId = _getTiendaId();
  if (!tiendaId) return;
  const pags = typeof pagos !== 'undefined' ? (pagos || []) : [];
  for (const p of pags) {
    try {
      await _sbPost('pagos', {
        id: String(p.id),
        fecha_iso: p.fechaISO || new Date().toISOString(),
        monto: parseFloat(p.monto) || 0,
        cat: p.cat || 'GASTO',
        nom: p.nom || p.concepto || '',
        nota: p.nota || '',
        tienda_id: tiendaId
      }, true);
    } catch(e) { console.warn('[Sync] subir pago error:', e.message); }
  }
}

// ── Subir ventas diarias a Supabase ──────────────────────────────────
async function _subirVentasDiarias() {
  if (!_hayConexion()) return;
  const tiendaId = _getTiendaId();
  if (!tiendaId) return;
  const vd = typeof ventasDiarias !== 'undefined' ? (ventasDiarias || []) : [];
  for (const v of vd) {
    try {
      await _sbPost('ventas_diarias', { ...v, tienda_id: tiendaId }, true);
    } catch(e) { console.warn('[Sync] subir venta_diaria error:', e.message); }
  }
}

// ── registrarVentaAtomica: inserta venta individual en Supabase ───────
async function registrarVentaAtomica(venta) {
  if (!_hayConexion()) return { ok: false, error: 'sin_conexion' };
  const tiendaId = _getTiendaId();
  if (!tiendaId) return { ok: false, error: 'sin_tienda_id' };
  try {
    await _sbPost('ventas', {
      id: venta.id,
      fecha_iso: venta.fechaISO || venta.fecha || new Date().toISOString(),
      total: parseFloat(venta.total) || 0,
      pago: parseFloat(venta.pago) || 0,
      vuelto: parseFloat(venta.vuelto) || 0,
      tienda_id: tiendaId,
      items: (Array.isArray(venta.items) ? venta.items.map(x => x.cant + 'x ' + x.nom).join(' | ') : venta.items) || '',
      items_json: venta.items_json || (Array.isArray(venta.items) ? JSON.stringify(venta.items) : null)
    }, true);
    return { ok: true };
  } catch(e) {
    console.warn('[Sync] registrarVentaAtomica error:', e.message);
    // Encolar para reintento offline
    await _encolarOffline('venta', venta);
    return { ok: false, error: e.message };
  }
}

// ── syncAhora: punto de entrada desde app.js ─────────────────────────
async function syncAhora(tipo, datos) {
  if (!_hayConexion()) {
    if (tipo === 'venta' && datos) await _encolarOffline('venta', datos);
    else if (tipo === 'todo')    await _encolarOffline('todo', {});
    return;
  }
  const tiendaId = _getTiendaId();
  if (!tiendaId) { console.warn('[syncAhora] Sin tienda_id'); return; }

  try {
    switch (tipo) {
      case 'venta':
        if (datos) {
          await _sbPost('ventas', {
            id: datos.id,
            fecha_iso: datos.fechaISO || datos.fecha || new Date().toISOString(),
            total: parseFloat(datos.total) || 0,
            pago: parseFloat(datos.pago) || 0,
            vuelto: parseFloat(datos.vuelto) || 0,
            tienda_id: tiendaId,
            items: (Array.isArray(datos.items) ? datos.items.map(x => x.cant + 'x ' + x.nom).join(' | ') : datos.items) || '',
            items_json: datos.items_json || (Array.isArray(datos.items) ? JSON.stringify(datos.items) : null)
          }, true);
          console.log('[syncAhora] Venta guardada en Supabase:', datos.id);
        }
        break;
      case 'historial':  await _subirHistorial();     break;
      case 'productos':  await _subirStockBase();      break;
      case 'pagos':      await _subirPagos();          break;
      case 'venta_diaria': await _subirVentasDiarias(); break;
      case 'todo':
        await _subirHistorial();
        await _subirStockBase();
        await _subirPagos();
        await _subirVentasDiarias();
        break;
      case 'config':
      case 'restock':
        break; // manejados por otros mecanismos
    }
    localStorage.setItem('vpos_ultimoSync', new Date().toISOString());
    if (typeof _actualizarBadgeSync === 'function') _actualizarBadgeSync();
  } catch(e) {
    console.warn('[syncAhora] Error en "' + tipo + '":', e.message);
    if (tipo === 'venta' && datos) await _encolarOffline('venta', datos);
  }
}

// ── Realtime WebSocket ────────────────────────────────────────────────
let _realtimeChannel = null;
let _pollingInterval = null;

function _iniciarPolling() {
  _detenerPolling();
  if (!_hayConexion()) return;
  _iniciarRealtime();
  // Polling cada 30s como respaldo
  _pollingInterval = setInterval(async () => {
    if (!_hayConexion()) return;
    try { if (typeof _autoCargarDesdeSupa === 'function') await _autoCargarDesdeSupa(); } catch(e) {}
  }, 30000);
}

function _detenerPolling() {
  if (_pollingInterval) { clearInterval(_pollingInterval); _pollingInterval = null; }
  if (_realtimeChannel) {
    try { _realtimeChannel.unsubscribe(); } catch(e) {}
    _realtimeChannel = null;
  }
}

function _iniciarRealtime() {
  try {
    const sbUrl = _sbUrl(), sbKey = _sbKey(), tiendaId = _getTiendaId();
    if (!sbUrl || !sbKey || !tiendaId) return;
    if (typeof window.supabase === 'undefined' || !window.supabase.createClient) return;

    const client = window.supabase.createClient(sbUrl, sbKey, {
      auth: { persistSession: false }
    });
    _realtimeChannel = client
      .channel('despensa_' + tiendaId)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ventas', filter: 'tienda_id=eq.' + tiendaId },
        async () => { if (typeof _autoCargarDesdeSupa === 'function') await _autoCargarDesdeSupa(); })
      .on('broadcast', { event: 'venta' },
        async () => { if (typeof _autoCargarDesdeSupa === 'function') await _autoCargarDesdeSupa(); })
      .on('broadcast', { event: 'snapshot_push' },
        async () => { if (typeof _autoCargarDesdeSupa === 'function') await _autoCargarDesdeSupa(); })
      .subscribe(status => { console.log('[Realtime] Estado:', status); });
  } catch(e) {
    console.warn('[Realtime] Error iniciando:', e.message);
  }
}

function _broadcast(evento, datos) {
  if (_realtimeChannel) {
    try { _realtimeChannel.send({ type: 'broadcast', event: evento, payload: datos || {} }); } catch(e) {}
  }
}

async function _autoEnviarSnapshot() {
  if (!_hayConexion() || !_getTiendaId()) return;
  try {
    const snap = {
      version: typeof APP_SCHEMA_VERSION !== 'undefined' ? APP_SCHEMA_VERSION : 4,
      exportado: new Date().toISOString(),
      dispositivo: _dispositivoId,
      efectivoInicial: typeof efectivoInicial !== 'undefined' ? efectivoInicial : 0,
      inventarioInicial: typeof inventarioInicial !== 'undefined' ? inventarioInicial : 0,
      productos: typeof productos !== 'undefined' ? productos : [],
      ventasDia: typeof ventasDia !== 'undefined' ? ventasDia : {},
      ventasSem: typeof ventasSem !== 'undefined' ? ventasSem : {},
      ventasMes: typeof ventasMes !== 'undefined' ? ventasMes : {},
      historial: typeof historial !== 'undefined' ? (historial || []).slice(0, 200) : [],
      pagos: typeof pagos !== 'undefined' ? pagos : [],
      ventasDiarias: typeof ventasDiarias !== 'undefined' ? ventasDiarias : [],
      restockLog: typeof restockLog !== 'undefined' ? restockLog : []
    };
    await _sbPost('sync_snapshots', {
      id: _getTiendaId() + '_' + _dispositivoId,
      tienda_id: _getTiendaId(),
      dispositivo_id: _dispositivoId,
      datos: JSON.stringify(snap),
      created_at: new Date().toISOString()
    }, true);
    console.log('[AutoSnapshot] Snapshot enviado');
  } catch(e) { console.warn('[AutoSnapshot] Error:', e.message); }
}
