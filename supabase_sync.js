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
        <button class="login-tab-bt