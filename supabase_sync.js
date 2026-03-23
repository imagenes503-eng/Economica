// =====================================================================
//  DESPENSA ECONÓMICA — Supabase Sync v7
//  ✅ Login con Supabase Auth (correo + contraseña)
//  ✅ Roles admin/cajero desde tabla perfiles
//  ✅ Restricciones por rol correctas
//  ✅ URL+Key guardadas en Supabase
// =====================================================================

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

function _sbUrl() { return (localStorage.getItem('vpos_supabaseUrl') || '').replace(/\/$/, ''); }
function _sbKey() { return localStorage.getItem('vpos_supabaseKey') || ''; }
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
    if (confirm('Sesion activa como "' + (_usuarioActual?.email || '') + '".\n¿Cerrar sesion?')) cerrarSesion();
    return;
  }
  _crearModalLogin();
  document.getElementById('modalLogin').classList.add('open');
}

function _crearModalLogin() {
  if (document.getElementById('modalLogin')) return;
  const modal = document.createElement('div');
  modal.id = 'modalLogin';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:420px;">
      <div style="text-align:center;margin-bottom:18px;">
        <div style="font-size:40px;margin-bottom:8px;">🏪</div>
        <h2 style="font-size:20px;font-weight:900;color:var(--text);margin:0 0 4px;">Iniciar Sesion</h2>
        <p id="loginSubtitle" style="font-size:13px;color:var(--text-muted);font-weight:700;margin:0;">Ingresa con tu correo y contraseña</p>
      </div>

      <!-- Tabs -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:16px;background:var(--surface2);border-radius:10px;padding:4px;">
        <button id="tabEntrar" onclick="_loginTab('entrar')" style="padding:8px;border:none;border-radius:8px;font-family:Nunito,sans-serif;font-weight:900;font-size:13px;cursor:pointer;background:var(--green);color:#fff;">Entrar</button>
        <button id="tabRegistrar" onclick="_loginTab('registrar')" style="padding:8px;border:none;border-radius:8px;font-family:Nunito,sans-serif;font-weight:900;font-size:13px;cursor:pointer;background:transparent;color:var(--text-muted);">Registrarse</button>
      </div>

      <div style="display:flex;flex-direction:column;gap:12px;">
        <!-- Solo en registro -->
        <div id="campoNombre" style="display:none;">
          <label style="font-size:12px;font-weight:900;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px;">Nombre</label>
          <input id="loginNombre" type="text" placeholder="Tu nombre"
            style="width:100%;padding:11px 14px;border:2px solid var(--border-mid);border-radius:10px;font-size:15px;font-family:Nunito,sans-serif;font-weight:700;box-sizing:border-box;">
        </div>
        <!-- Solo en registro -->
        <div id="campoTienda" style="display:none;">
          <label style="font-size:12px;font-weight:900;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px;">ID de Tienda</label>
          <input id="loginTiendaId" type="text" placeholder="ej: tienda1, despensa"
            style="width:100%;padding:11px 14px;border:2px solid var(--border-mid);border-radius:10px;font-size:15px;font-family:Nunito,sans-serif;font-weight:700;box-sizing:border-box;"
            value="${localStorage.getItem('vpos_tiendaId') || ''}">
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px;font-weight:700;">Usa el mismo ID en todos tus telefonos</div>
        </div>

        <div>
          <label style="font-size:12px;font-weight:900;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px;">Correo electrónico</label>
          <input id="loginEmail" type="email" placeholder="correo@ejemplo.com"
            style="width:100%;padding:11px 14px;border:2px solid var(--border-mid);border-radius:10px;font-size:15px;font-family:Nunito,sans-serif;font-weight:700;box-sizing:border-box;"
            value="${localStorage.getItem('vpos_email') || ''}">
        </div>
        <div>
          <label style="font-size:12px;font-weight:900;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px;">Contraseña</label>
          <input id="loginPassword" type="password" placeholder="mínimo 6 caracteres"
            style="width:100%;padding:11px 14px;border:2px solid var(--border-mid);border-radius:10px;font-size:15px;font-family:Nunito,sans-serif;font-weight:700;box-sizing:border-box;">
        </div>

        <div id="loginError" style="display:none;background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.3);border-radius:8px;padding:10px 12px;font-size:13px;color:#dc2626;font-weight:700;text-align:center;"></div>

        <button onclick="intentarLogin()" id="btnLogin"
          style="background:var(--green);color:#fff;border:none;border-radius:12px;padding:14px;font-size:16px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;width:100%;margin-top:4px;">
          🔑 Entrar
        </button>
        <div style="text-align:center;">
          <button onclick="entrarSinLogin()" style="background:none;border:none;color:var(--text-muted);font-size:12px;font-weight:700;font-family:Nunito,sans-serif;cursor:pointer;text-decoration:underline;">
            Continuar sin sesion (acceso limitado)
          </button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
  document.getElementById('loginPassword').addEventListener('keydown', e => { if (e.key === 'Enter') intentarLogin(); });
}

function _loginTab(tab) {
  const esRegistrar = tab === 'registrar';
  document.getElementById('campoNombre').style.display = esRegistrar ? '' : 'none';
  document.getElementById('campoTienda').style.display = esRegistrar ? '' : 'none';
  document.getElementById('tabEntrar').style.background = esRegistrar ? 'transparent' : 'var(--green)';
  document.getElementById('tabEntrar').style.color = esRegistrar ? 'var(--text-muted)' : '#fff';
  document.getElementById('tabRegistrar').style.background = esRegistrar ? 'var(--green)' : 'transparent';
  document.getElementById('tabRegistrar').style.color = esRegistrar ? '#fff' : 'var(--text-muted)';
  document.getElementById('btnLogin').textContent = esRegistrar ? '✅ Crear cuenta' : '🔑 Entrar';
  document.getElementById('loginSubtitle').textContent = esRegistrar ? 'Crea tu cuenta para esta tienda' : 'Ingresa con tu correo y contraseña';
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
      const nombre   = (document.getElementById('loginNombre')?.value || '').trim();
      const tiendaId = (document.getElementById('loginTiendaId')?.value || '').trim().toLowerCase().replace(/[^a-z0-9\-_]/g, '');
      if (!nombre)   { _mostrarLoginError('Ingresa tu nombre'); btn.disabled = false; btn.textContent = '✅ Crear cuenta'; return; }
      if (!tiendaId) { _mostrarLoginError('Ingresa el ID de tienda'); btn.disabled = false; btn.textContent = '✅ Crear cuenta'; return; }

      const authData = await _authSignUp(email, password);
      const userId   = authData.user?.id || authData.id;
      if (!userId) throw new Error('No se pudo crear la cuenta');

      // Verificar si ya hay admin en esta tienda
      const admins = await _sbGet('perfiles', { select: 'id', tienda_id: 'eq.' + tiendaId, rol: 'eq.admin' }).catch(() => []);
      const esAdmin = !admins || admins.length === 0;

      // Crear perfil
      await _sbPost('perfiles', {
        id: userId, tienda_id: tiendaId, email,
        nombre: nombre, rol: esAdmin ? 'admin' : 'cajero',
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

  // Leer perfil del usuario
  const perfiles = await _sbGet('perfiles', { select: '*', id: 'eq.' + userId, activo: 'eq.true' });
  if (!perfiles || !perfiles.length) throw new Error('No se encontró tu perfil. Registrate primero.');

  const perfil = perfiles[0];
  _usuarioActual = { ...perfil, email };
  _tiendaId = tiendaIdOverride || perfil.tienda_id;
  _sesionActiva = true;

  // Guardar en localStorage
  localStorage.setItem('vpos_email', email);
  localStorage.setItem('vpos_authToken', _authToken);
  localStorage.setItem('vpos_usuarioData', JSON.stringify(_usuarioActual));
  localStorage.setItem('vpos_tiendaId', _tiendaId);
  localStorage.setItem('vpos_sesionActiva', '1');

  document.getElementById('modalLogin')?.classList.remove('open');
  _actualizarBadgeLogin();
  _aplicarRestriccionesPorRol();
  _registrarAccion('login', 'Inicio de sesion');

  // Cargar datos desde Supabase
  const btn = document.getElementById('btnLogin');
  if (btn) btn.textContent = 'Cargando datos...';
  await _cargarDatosAlIniciar();

  toast('✅ Bienvenido ' + _usuarioActual.nombre + ' · ' + (ROLES[_usuarioActual.rol]?.label || ''));
}

async function _cargarDatosAlIniciar() {
  try {
    const fusionId = _getTiendaId() + '_fusionado';
    const snaps = await _sbGet('sync_snapshots', { select: 'datos', id: 'eq.' + fusionId });
    if (snaps && snaps.length > 0) {
      await _aplicarDatos(JSON.parse(snaps[0].datos));
    } else {
      const snapsInd = await _sbGet('sync_snapshots', {
        select: 'datos', tienda_id: 'eq.' + _getTiendaId(),
        order: 'created_at.desc', limit: 1
      });
      if (snapsInd && snapsInd.length > 0) {
        await _aplicarDatos(JSON.parse(snapsInd[0].datos));
      }
    }
  } catch(e) { console.warn('[cargarDatos]', e.message); }
}

function entrarSinLogin() { document.getElementById('modalLogin')?.classList.remove('open'); }
function _mostrarLoginError(msg) { const el = document.getElementById('loginError'); if (el) { el.textContent = msg; el.style.display = 'block'; } }

async function cerrarSesion() {
  await _authSignOut();
  _sesionActiva = false; _tiendaId = null; _usuarioActual = null; _authToken = null;
  localStorage.removeItem('vpos_sesionActiva');
  localStorage.removeItem('vpos_usuarioData');
  localStorage.removeItem('vpos_authToken');
  _actualizarBadgeLogin();
  _quitarRestriccionesPorRol();
  toast('Sesion cerrada');
}

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
    if (perfiles && perfiles.length > 0) {
      _usuarioActual = { ...perfiles[0], email: tempUser.email };
      localStorage.setItem('vpos_usuarioData', JSON.stringify(_usuarioActual));
    } else {
      _usuarioActual = tempUser;
    }
    _actualizarBadgeLogin();
    _aplicarRestriccionesPorRol();
  } catch(e) {
    // Sin internet — usar datos guardados
    try { _usuarioActual = JSON.parse(savedUser); } catch(e2) {}
    _actualizarBadgeLogin();
    if (_usuarioActual) _aplicarRestriccionesPorRol();
  }
}

// =====================================================================
//  🔒 CONTROL DE ACCESO POR ROL
// =====================================================================

function _aplicarRestriccionesPorRol() {
  if (!_usuarioActual) return;
  const esCajero = _usuarioActual.rol === 'cajero';
  if (!esCajero) return; // Admin ve todo

  // Ocultar páginas completas
  ['pgReportes','pgInventario','pgVentasDiarias','pgSync'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  // Ocultar tabs de navegación
  document.querySelectorAll('.nav-tab, .drawer-nav-item').forEach(tab => {
    const onclick = tab.getAttribute('onclick') || '';
    if (['pgReportes','pgInventario','pgVentasDiarias','pgSync'].some(p => onclick.includes(p))) {
      tab.style.display = 'none';
    }
  });
  // Ocultar sección de respaldo completa para cajero
  const backupBar = document.querySelector('.backup-bar');
  if (backupBar) backupBar.style.display = 'none';
}

function _quitarRestriccionesPorRol() {
  ['pgReportes','pgInventario','pgVentasDiarias','pgSync'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = '';
  });
  document.querySelectorAll('.nav-tab, .drawer-nav-item').forEach(el => { el.style.display = ''; });
  const backupBar = document.querySelector('.backup-bar');
  if (backupBar) backupBar.style.display = '';
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
  if (!confirm('⚠️ Esto borrará TODOS los datos de Supabase.\nLos datos en este telefono NO se borran.\n\n¿Estas seguro?')) return;
  if (!confirm('Segunda confirmacion: ¿Borrar TODA la base de datos?')) return;
  _dot('yellow'); toast('Limpiando Supabase...');
  try {
    const tablas = ['sync_snapshots','sync_invites','ventas','pagos','restock_log','deleted_log','acciones_log'];
    for (const t of tablas) {
      await fetch(_sbUrl()+'/rest/v1/'+t+'?id=neq.null',{method:'DELETE',headers:_headers({'Prefer':'return=minimal'})}).catch(()=>{});
      await fetch(_sbUrl()+'/rest/v1/'+t+'?fecha=neq.null',{method:'DELETE',headers:_headers({'Prefer':'return=minimal'})}).catch(()=>{});
    }
    await fetch(_sbUrl()+'/rest/v1/ventas_diarias?fecha=neq.null',{method:'DELETE',headers:_headers({'Prefer':'return=minimal'})}).catch(()=>{});
    await fetch(_sbUrl()+'/rest/v1/productos?id=neq.null',{method:'DELETE',headers:_headers({'Prefer':'return=minimal'})}).catch(()=>{});
    _dot('green'); toast('✅ Supabase limpiado. Puedes empezar de cero.');
  } catch(e) { _dot('red'); toast('Error: '+e.message,true); }
}

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
  toast('✅ '+productos.length+' productos cargados correctamente',false,true);
}

// =====================================================================
//  ⚡ SYNC EN TIEMPO REAL
// =====================================================================
let _syncQueue=[],_syncRunning=false,_syncTimer=null,_lastVenta=null;
function syncAhora(tipo,datos){if(!_sbUrl()||!_sbKey())return;if(tipo==='venta'&&datos)_lastVenta=datos;if(!_syncQueue.includes(tipo))_syncQueue.push(tipo);clearTimeout(_syncTimer);_syncTimer=setTimeout(_ejecutarSync,900);}
async function _ejecutarSync(){if(_syncRunning){setTimeout(_ejecutarSync,1500);return;}if(!_syncQueue.length)return;_syncRunning=true;const queue=[..._syncQueue];_syncQueue=[];try{for(const tipo of queue){if(tipo==='venta'&&_lastVenta){const v=_lastVenta;_lastVenta=null;await _sbPost('ventas',{id:v.id,fecha_iso:v.fecha||new Date().toISOString(),total:parseFloat(v.total)||0,pago:parseFloat(v.pago)||0,vuelto:parseFloat(v.vuelto)||0,items:v.items||'',items_json:v.items_json||null},true);}if(tipo==='productos'||tipo==='todo')await _subirStockBase();if(tipo==='restock'||tipo==='todo')await _subirRestockLog();if(tipo==='venta_diaria'||tipo==='todo')await _subirVentasDiarias();if(tipo==='pagos'||tipo==='todo')await _subirPagos();if(tipo==='config'||tipo==='todo')await _subirConfig();}localStorage.setItem('vpos_ultimoSync',new Date().toISOString());_actualizarBadgeSync();_dot('green');}catch(e){console.warn('[Sync]',e.message);_dot('red');}finally{_syncRunning=false;if(_syncQueue.length)setTimeout(_ejecutarSync,1000);}}
async function _subirStockBase(){if(!productos||!productos.length)return;const rows=productos.map(p=>({id:String(p.id),nom:p.nom||'',cat:p.cat||'',compra:p.compra||0,venta:p.venta||0,stock_base:_calcStockBase(p),stock:p.stock||0,min:p.min||0,cod:p.cod||'',abrev:p.abrev||'',img:p.img||null,paquetes:p.paquetes||[],lotes:p.lotes||[]}));for(let i=0;i<rows.length;i+=50)await _sbPost('productos',rows.slice(i,i+50),true);}
function _calcStockBase(p){const pid=String(p.id);let v=0;(historial||[]).forEach(h=>{(h.items||[]).forEach(it=>{if(String(it.id)===pid)v+=Number(it.cant||0);});});return(p.stock||0)+v;}
async function _subirConfig(){try{await _sbPost('config',{clave:'efectivoInicial',valor:String(typeof efectivoInicial!=='undefined'?efectivoInicial:0),updated_at:new Date().toISOString()},true);await _sbPost('config',{clave:'inventarioInicial',valor:String(typeof inventarioInicial!=='undefined'?inventarioInicial:0),updated_at:new Date().toISOString()},true);}catch(e){}}
async function _subirRestockLog(){if(!restockLog||!restockLog.length)return;for(let i=0;i<restockLog.length;i+=50)await _sbPost('restock_log',restockLog.slice(i,i+50).map(r=>({id:r.id,ts:r.ts||0,prod_id:String(r.prodId),cant:r.cant||0,precio_compra:r.precioCompra||0,fecha_str:r.fechaStr||''})),true);}
async function _subirVentasDiarias(){if(!ventasDiarias||!ventasDiarias.length)return;await _sbPost('ventas_diarias',ventasDiarias.map(v=>({fecha:v.fecha,monto:parseFloat(v.monto)||0,nota:v.nota||''})),true);}
async function _subirPagos(){if(!pagos||!pagos.length)return;try{for(let i=0;i<pagos.length;i+=50)await _sbPost('pagos',pagos.slice(i,i+50).map(g=>({id:String(g.id),fecha_iso:g.fechaISO||new Date().toISOString(),monto:parseFloat(g.monto)||0,cat:g.cat||'GASTO',nom:g.nom||g.concepto||'',nota:g.nota||''})),true);}catch(e){}}

// =====================================================================
//  🗑️ BORRAR EN SUPABASE
// =====================================================================
async function syncBorrarProducto(id){if(!_sbUrl()||!_sbKey())return;try{await _sbDeleteFiltro('productos',{id:'eq.'+String(id)});await _sbPost('deleted_log',{id:'del_prod_'+String(id)+'_'+Date.now(),tabla:'productos',registro_id:String(id),deleted_at:new Date().toISOString()},true);}catch(e){}}
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
async function iniciarAutoSync(){await restaurarSesion();}
function _dot(color){let d=document.getElementById('syncDot');if(!d){d=document.createElement('div');d.id='syncDot';d.style.cssText='position:fixed;top:8px;right:8px;z-index:9999;width:9px;height:9px;border-radius:50%;transition:all .3s;pointer-events:none;';document.body.appendChild(d);}d.style.background={yellow:'#f59e0b',green:'#16a34a',red:'#ef4444'}[color]||'#ccc';d.style.opacity='1';if(color!=='yellow')setTimeout(()=>{d.style.opacity='0';},color==='green'?2000:5000);}
async function sheetsExportarProductos(){if(!_sbUrl()){toast('Primero configura Supabase',true);return;}try{await _subirStockBase();toast('Inventario enviado ('+productos.length+' productos)');}catch(e){toast('Error: '+e.message,true);}}
async function sheetsExportarVentasDiarias(){if(!_sbUrl()){toast('Primero configura Supabase',true);return;}await _subirVentasDiarias();toast('Ventas diarias enviadas');}
async function sheetsExportarTodo(){if(!_sbUrl()){toast('Primero configura Supabase',true);return;}toast('Exportando...');await _subirStockBase();await _subirVentasDiarias();await _subirRestockLog();await _subirPagos();localStorage.setItem('vpos_ultimoSync',new Date().toISOString());_actualizarBadgeSync();toast('Todo exportado a Supabase');}
async function testConexionSupabase(){const url=(document.getElementById('sbUrlInput')?.value||'').trim().replace(/\/$/,''),key=(document.getElementById('sbKeyInput')?.value||'').trim(),btn=document.getElementById('btnTestConexion');if(!url||!key){toast('Ingresa la URL y la Key primero',true);return;}if(btn){btn.disabled=true;btn.textContent='Probando...';}try{const r=await fetch(url+'/rest/v1/productos?select=id&limit=1',{headers:{'apikey':key,'Authorization':'Bearer '+key}});if(!r.ok){const t=await r.text();throw new Error('HTTP '+r.status+' — '+t);}toast('Conexion exitosa a Supabase');}catch(e){toast('Error: '+e.message,true);}finally{if(btn){btn.disabled=false;btn.textContent='Probar conexion';}}}
