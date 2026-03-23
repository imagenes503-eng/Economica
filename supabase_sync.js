// =====================================================================
//  DESPENSA ECONÓMICA — Supabase Sync v6
//  ✅ Login con PIN
//  ✅ Sync MANUAL — sin notificaciones automáticas
//  ✅ Flujo: Tel#1 envía → Tel#2 fusiona y reenvía → ambos descargan
//  ✅ Botón limpiar Supabase completo
// =====================================================================

let _sesionActiva   = false;
let _tiendaId       = null;
let _usuarioActual  = null;  // { id, nombre, usuario, rol }
let _dispositivoId  = localStorage.getItem('vpos_dispositivoId') || ('dev_' + Math.random().toString(36).slice(2,8));
localStorage.setItem('vpos_dispositivoId', _dispositivoId);

// Roles disponibles
const ROLES = {
  admin:  { label: 'Admin',  color: '#7c3aed', puede: ['vender','inventario','reportes','gastos','config','usuarios','fusionar'] },
  cajero: { label: 'Cajero', color: '#1d4ed8', puede: ['vender'] }
};

function _puedeHacer(accion) {
  if (!_usuarioActual) return false;
  const rol = ROLES[_usuarioActual.rol] || ROLES.cajero;
  return rol.puede.includes(accion);
}

function _registrarAccion(accion, detalle) {
  if (!_sbUrl() || !_sbKey() || !_usuarioActual) return;
  _sbPost('acciones_log', {
    id: 'act_' + Date.now() + '_' + Math.random().toString(36).slice(2,5),
    tienda_id: _getTiendaId(),
    usuario_id: _usuarioActual.id,
    usuario_nom: _usuarioActual.nombre,
    accion, detalle: detalle || '',
    created_at: new Date().toISOString()
  }, false).catch(() => {});
}

function _sbUrl() { return (localStorage.getItem('vpos_supabaseUrl') || '').replace(/\/$/, ''); }
function _sbKey() { return localStorage.getItem('vpos_supabaseKey') || ''; }
function _getTiendaId() { return _tiendaId || localStorage.getItem('vpos_tiendaId') || 'default'; }

async function _sbGet(tabla, params) {
  const url = _sbUrl(), key = _sbKey();
  if (!url || !key) throw new Error('Sin configuración de Supabase');
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const resp = await fetch(url + '/rest/v1/' + tabla + qs, {
    headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
  });
  if (!resp.ok) { const txt = await resp.text(); throw new Error('HTTP ' + resp.status + ': ' + txt); }
  return resp.json();
}

async function _sbPost(tabla, body, upsert) {
  const url = _sbUrl(), key = _sbKey();
  if (!url || !key) throw new Error('Sin config');
  const pref = upsert ? 'resolution=merge-duplicates,return=minimal' : 'return=minimal';
  const resp = await fetch(url + '/rest/v1/' + tabla, {
    method: 'POST',
    headers: { 'apikey': key, 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'Prefer': pref },
    body: JSON.stringify(body)
  });
  if (!resp.ok) { const txt = await resp.text(); throw new Error('HTTP ' + resp.status + ': ' + txt); }
}

async function _sbDeleteFiltro(tabla, filtro) {
  const url = _sbUrl(), key = _sbKey();
  if (!url || !key) return;
  const qs = '?' + new URLSearchParams(filtro).toString();
  await fetch(url + '/rest/v1/' + tabla + qs, {
    method: 'DELETE',
    headers: { 'apikey': key, 'Authorization': 'Bearer ' + key, 'Prefer': 'return=minimal' }
  });
}

async function _sbDeleteAll(tabla) {
  const url = _sbUrl(), key = _sbKey();
  if (!url || !key) return;
  await fetch(url + '/rest/v1/' + tabla + '?id=neq.null', {
    method: 'DELETE',
    headers: { 'apikey': key, 'Authorization': 'Bearer ' + key, 'Prefer': 'return=minimal' }
  });
}

// =====================================================================
//  🔐 LOGIN
// =====================================================================

function abrirLogin() {
  if (_sesionActiva) {
    if (confirm('Sesion activa como "' + _getTiendaId() + '". Cerrar sesion?')) cerrarSesion();
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
        <div style="font-size:42px;margin-bottom:8px;">🏪</div>
        <h2 style="font-size:20px;font-weight:900;color:var(--text);margin:0 0 4px;">Iniciar Sesion</h2>
        <p style="font-size:13px;color:var(--text-muted);font-weight:700;margin:0;">Ingresa con tu usuario personal</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:13px;">
        <div>
          <label style="font-size:12px;font-weight:900;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px;">ID de Tienda</label>
          <input id="loginTiendaId" type="text" placeholder="ej: tienda1, despensa"
            style="width:100%;padding:11px 14px;border:2px solid var(--border-mid);border-radius:10px;font-size:15px;font-family:Nunito,sans-serif;font-weight:700;box-sizing:border-box;"
            value="${localStorage.getItem('vpos_tiendaId') || ''}">
        </div>
        <div>
          <label style="font-size:12px;font-weight:900;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px;">Usuario</label>
          <input id="loginUsuario" type="text" placeholder="tu nombre de usuario"
            style="width:100%;padding:11px 14px;border:2px solid var(--border-mid);border-radius:10px;font-size:15px;font-family:Nunito,sans-serif;font-weight:700;box-sizing:border-box;"
            value="${localStorage.getItem('vpos_usuario') || ''}">
        </div>
        <div>
          <label style="font-size:12px;font-weight:900;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px;">PIN (4 digitos)</label>
          <input id="loginPin" type="password" inputmode="numeric" maxlength="4" placeholder="••••"
            style="width:100%;padding:11px 14px;border:2px solid var(--border-mid);border-radius:10px;font-size:22px;letter-spacing:8px;font-family:'Space Mono',monospace;font-weight:700;box-sizing:border-box;text-align:center;">
        </div>
        <div id="loginError" style="display:none;background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.3);border-radius:8px;padding:10px 12px;font-size:13px;color:#dc2626;font-weight:700;text-align:center;"></div>
        <button onclick="intentarLogin()" id="btnLogin"
          style="background:var(--green);color:#fff;border:none;border-radius:12px;padding:14px;font-size:16px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;width:100%;margin-top:4px;">
          🔑 Entrar
        </button>
        <div style="text-align:center;">
          <button onclick="entrarSinLogin()" style="background:none;border:none;color:var(--text-muted);font-size:13px;font-weight:700;font-family:Nunito,sans-serif;cursor:pointer;text-decoration:underline;">
            Continuar sin sesion (acceso limitado)
          </button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });
  document.getElementById('loginPin').addEventListener('keydown', e => { if (e.key === 'Enter') intentarLogin(); });
}

async function intentarLogin() {
  const tiendaId = (document.getElementById('loginTiendaId')?.value || '').trim().toLowerCase().replace(/[^a-z0-9\-_]/g, '');
  const usuarioInput = (document.getElementById('loginUsuario')?.value || '').trim().toLowerCase().replace(/[^a-z0-9\-_]/g, '');
  const pin = (document.getElementById('loginPin')?.value || '').trim();
  const btn = document.getElementById('btnLogin');
  if (!tiendaId) { _mostrarLoginError('Ingresa un ID de tienda'); return; }
  if (!usuarioInput) { _mostrarLoginError('Ingresa tu usuario'); return; }
  if (!pin || pin.length < 4) { _mostrarLoginError('El PIN debe tener 4 digitos'); return; }
  if (!_sbUrl() || !_sbKey()) { _mostrarLoginError('Primero configura Supabase en Sync'); return; }
  btn.disabled = true; btn.textContent = 'Verificando...';
  try {
    // Buscar usuario en tabla usuarios
    const usRows = await _sbGet('usuarios', {
      select: '*', tienda_id: 'eq.' + tiendaId, usuario: 'eq.' + usuarioInput, activo: 'eq.true'
    });

    let usuarioData = null;

    if (usRows && usRows.length > 0) {
      // Usuario existe — verificar PIN
      if (usRows[0].pin !== pin) { _mostrarLoginError('PIN incorrecto'); btn.disabled = false; btn.textContent = 'Entrar'; return; }
      usuarioData = usRows[0];
    } else {
      // Primera vez — verificar si la tienda existe
      const tiendaRows = await _sbGet('sesiones', { select: '*', tienda_id: 'eq.' + tiendaId });

      if (tiendaRows && tiendaRows.length > 0) {
        // Tienda existe pero usuario no — crear usuario (cajero por defecto)
        const nuevoUsuario = {
          id: 'usr_' + Date.now(),
          tienda_id: tiendaId,
          nombre: usuarioInput.charAt(0).toUpperCase() + usuarioInput.slice(1),
          usuario: usuarioInput,
          pin, rol: 'cajero', activo: true,
          created_at: new Date().toISOString()
        };
        await _sbPost('usuarios', nuevoUsuario, false);
        usuarioData = nuevoUsuario;
        toast('Usuario creado como cajero. El admin puede cambiar tu rol.');
      } else {
        // Tienda nueva — crear tienda Y primer usuario como admin
        await _sbPost('sesiones', { tienda_id: tiendaId, pin, created_at: new Date().toISOString() }, false);
        const nuevoAdmin = {
          id: 'usr_' + Date.now(),
          tienda_id: tiendaId,
          nombre: usuarioInput.charAt(0).toUpperCase() + usuarioInput.slice(1),
          usuario: usuarioInput,
          pin, rol: 'admin', activo: true,
          created_at: new Date().toISOString()
        };
        await _sbPost('usuarios', nuevoAdmin, false);
        usuarioData = nuevoAdmin;
        toast('Primera vez — creado como Administrador.');
      }
    }

    // Guardar sesión
    _usuarioActual = usuarioData;
    localStorage.setItem('vpos_usuario', usuarioInput);
    localStorage.setItem('vpos_usuarioData', JSON.stringify(usuarioData));
    _tiendaId = tiendaId; _sesionActiva = true;
    localStorage.setItem('vpos_tiendaId', tiendaId);
    localStorage.setItem('vpos_sesionActiva', '1');
    document.getElementById('modalLogin').classList.remove('open');
    _actualizarBadgeLogin();
    _aplicarRestriccionesPorRol();
    _registrarAccion('login', 'Inicio de sesion desde ' + _dispositivoId);

    // ── Cargar datos automáticamente al iniciar sesión ──────────────
    // Busca el snapshot fusionado más reciente de esta tienda
    btn.textContent = 'Cargando datos...';
    try {
      const fusionId = tiendaId + '_fusionado';
      const snaps = await _sbGet('sync_snapshots', {
        select: 'datos', id: 'eq.' + fusionId
      });
      if (snaps && snaps.length > 0) {
        const datos = JSON.parse(snaps[0].datos);
        await _aplicarDatos(datos);
        toast('✅ Sesion iniciada — datos cargados desde la nube', false, true);
      } else {
        // No hay fusionado, buscar snapshot individual más reciente
        const snapsInd = await _sbGet('sync_snapshots', {
          select: 'datos',
          tienda_id: 'eq.' + tiendaId,
          order: 'created_at.desc',
          limit: 1
        });
        if (snapsInd && snapsInd.length > 0) {
          const datos = JSON.parse(snapsInd[0].datos);
          await _aplicarDatos(datos);
          toast('✅ Sesion iniciada — datos cargados desde la nube', false, true);
        } else {
          toast('Sesion iniciada. No hay datos en la nube aun — agrega tu inventario y usa Enviar datos.', false, true);
        }
      }
    } catch(eLoad) {
      console.warn('[login load]', eLoad.message);
      toast('Sesion iniciada como: ' + tiendaId);
    }

  } catch(e) {
    _mostrarLoginError('Error: ' + e.message);
    btn.disabled = false; btn.textContent = 'Entrar';
  }
}

function entrarSinLogin() { document.getElementById('modalLogin')?.classList.remove('open'); }
function _mostrarLoginError(msg) { const el = document.getElementById('loginError'); if (el) { el.textContent = msg; el.style.display = 'block'; } }

function cerrarSesion() {
  _sesionActiva = false; _tiendaId = null; _usuarioActual = null;
  localStorage.removeItem('vpos_sesionActiva');
  localStorage.removeItem('vpos_tiendaId');
  localStorage.removeItem('vpos_usuarioData');
  _actualizarBadgeLogin();
  _quitarRestriccionesPorRol();
  toast('Sesion cerrada');
}

function _actualizarBadgeLogin() {
  const activa = _sesionActiva && _tiendaId && _usuarioActual;
  document.querySelectorAll('.login-status').forEach(el => {
    if (activa) {
      const rol = ROLES[_usuarioActual.rol] || ROLES.cajero;
      el.textContent = _usuarioActual.nombre + ' · ' + rol.label;
      el.style.color = rol.color;
    } else {
      el.textContent = 'Iniciar sesion';
      el.style.color = '#6b7280';
    }
  });
  actualizarBadgeSheets();
}

function restaurarSesion() {
  if (localStorage.getItem('vpos_sesionActiva') === '1') {
    _tiendaId = localStorage.getItem('vpos_tiendaId');
    _sesionActiva = true;
    const savedUser = localStorage.getItem('vpos_usuarioData');
    if (savedUser) {
      try { _usuarioActual = JSON.parse(savedUser); } catch(e) {}
    }
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

  // Ocultar secciones bloqueadas para cajero
  const bloqueados = ['pgReportes','pgInventario','pgVentasDiarias','pgSync'];
  if (esCajero) {
    bloqueados.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    // Ocultar tabs de navegación
    document.querySelectorAll('.nav-tab').forEach(tab => {
      const onclick = tab.getAttribute('onclick') || '';
      if (onclick.includes('pgReportes') || onclick.includes('pgInventario') ||
          onclick.includes('pgVentasDiarias') || onclick.includes('pgSync')) {
        tab.style.display = 'none';
      }
    });
    document.querySelectorAll('.drawer-nav-item').forEach(item => {
      const onclick = item.getAttribute('onclick') || '';
      if (onclick.includes('pgReportes') || onclick.includes('pgInventario') ||
          onclick.includes('pgVentasDiarias') || onclick.includes('pgSync')) {
        item.style.display = 'none';
      }
    });
    // Mostrar badge de rol
    _mostrarBadgeRol();
  }
}

function _quitarRestriccionesPorRol() {
  // Restaurar visibilidad
  ['pgReportes','pgInventario','pgVentasDiarias','pgSync'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = '';
  });
  document.querySelectorAll('.nav-tab, .drawer-nav-item').forEach(el => {
    el.style.display = '';
  });
  const badge = document.getElementById('rolBadge');
  if (badge) badge.remove();
}

function _mostrarBadgeRol() {
  if (document.getElementById('rolBadge')) return;
  const badge = document.createElement('div');
  badge.id = 'rolBadge';
  const rol = ROLES[_usuarioActual?.rol] || ROLES.cajero;
  badge.style.cssText = 'position:fixed;bottom:70px;right:10px;z-index:500;background:' + rol.color + ';color:#fff;padding:6px 12px;border-radius:20px;font-size:12px;font-weight:900;font-family:Nunito,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.2);';
  badge.textContent = rol.label + ': ' + (_usuarioActual?.nombre || '');
  document.body.appendChild(badge);
}

// =====================================================================
//  👥 GESTIÓN DE USUARIOS (solo Admin)
// =====================================================================

async function abrirGestionUsuarios() {
  if (!_puedeHacer('usuarios')) { toast('Solo el Admin puede gestionar usuarios', true); return; }
  if (!_sbUrl() || !_sbKey()) { toast('Primero configura Supabase', true); return; }

  // Cargar usuarios de esta tienda
  const rows = await _sbGet('usuarios', { select: '*', tienda_id: 'eq.' + _getTiendaId(), order: 'created_at.asc' }).catch(() => []);

  if (document.getElementById('modalUsuarios')) document.getElementById('modalUsuarios').remove();

  const modal = document.createElement('div');
  modal.id = 'modalUsuarios';
  modal.className = 'modal';

  const lista = (rows || []).map(u => {
    const rolInfo = ROLES[u.rol] || ROLES.cajero;
    return `<div style="display:flex;align-items:center;gap:10px;padding:12px;background:var(--surface2);border-radius:10px;border:1px solid var(--border);margin-bottom:8px;">
      <div style="flex:1;">
        <div style="font-weight:900;font-size:14px;color:var(--text);">${u.nombre}</div>
        <div style="font-size:12px;color:var(--text-muted);">@${u.usuario}</div>
      </div>
      <span style="background:${rolInfo.color};color:#fff;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:900;">${rolInfo.label}</span>
      <select onchange="cambiarRolUsuario('${u.id}',this.value)" style="padding:6px;border-radius:8px;border:1px solid var(--border);font-family:Nunito,sans-serif;font-weight:700;font-size:12px;background:var(--surface);">
        <option value="admin" ${u.rol==='admin'?'selected':''}>Admin</option>
        <option value="cajero" ${u.rol==='cajero'?'selected':''}>Cajero</option>
      </select>
      ${u.id !== _usuarioActual?.id ? `<button onclick="toggleUsuario('${u.id}',${u.activo})" style="padding:6px 10px;border-radius:8px;border:none;background:${u.activo?'rgba(220,38,38,0.1)':'rgba(22,163,74,0.1)'};color:${u.activo?'#dc2626':'#16a34a'};font-size:11px;font-weight:900;cursor:pointer;font-family:Nunito,sans-serif;">${u.activo?'Desactivar':'Activar'}</button>` : '<span style="font-size:11px;color:var(--text-muted);">(tú)</span>'}
    </div>`;
  }).join('');

  modal.innerHTML = `
    <div class="modal-box" style="max-width:480px;">
      <div class="modal-header" style="background:linear-gradient(135deg,#4c1d95,#7c3aed);">
        <h3 style="color:#fff;">👥 Gestión de Usuarios</h3>
        <button class="btn-close" onclick="cerrarModal('modalUsuarios')" style="background:rgba(255,255,255,0.15);color:#fff;">✕</button>
      </div>
      <div class="modal-body">
        <div style="margin-bottom:14px;">${lista || '<div style="text-align:center;color:var(--text-muted);padding:20px;">No hay usuarios</div>'}</div>
        <div style="border-top:1px solid var(--border);padding-top:14px;">
          <div style="font-size:13px;font-weight:900;color:var(--text);margin-bottom:10px;">Agregar nuevo usuario</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
            <input id="nuevoNombre" type="text" placeholder="Nombre" style="padding:10px;border:1.5px solid var(--border-mid);border-radius:8px;font-family:Nunito,sans-serif;font-weight:700;font-size:13px;">
            <input id="nuevoUsuario" type="text" placeholder="Usuario (sin espacios)" style="padding:10px;border:1.5px solid var(--border-mid);border-radius:8px;font-family:Nunito,sans-serif;font-weight:700;font-size:13px;">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
            <input id="nuevoPin" type="password" inputmode="numeric" maxlength="4" placeholder="PIN 4 dígitos" style="padding:10px;border:1.5px solid var(--border-mid);border-radius:8px;font-family:Nunito,sans-serif;font-weight:700;font-size:13px;">
            <select id="nuevoRol" style="padding:10px;border:1.5px solid var(--border-mid);border-radius:8px;font-family:Nunito,sans-serif;font-weight:700;font-size:13px;">
              <option value="cajero">Cajero</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button onclick="crearNuevoUsuario()" style="width:100%;background:var(--green);color:#fff;border:none;border-radius:10px;padding:12px;font-size:14px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;">
            ➕ Crear usuario
          </button>
        </div>
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) cerrarModal('modalUsuarios'); });
  abrirModal('modalUsuarios');
}

async function crearNuevoUsuario() {
  const nombre  = document.getElementById('nuevoNombre')?.value.trim();
  const usuario = document.getElementById('nuevoUsuario')?.value.trim().toLowerCase().replace(/[^a-z0-9_]/g,'');
  const pin     = document.getElementById('nuevoPin')?.value.trim();
  const rol     = document.getElementById('nuevoRol')?.value;
  if (!nombre || !usuario || !pin || pin.length < 4) { toast('Completa todos los campos con PIN de 4 dígitos', true); return; }

  const existe = await _sbGet('usuarios', { select: 'id', tienda_id: 'eq.' + _getTiendaId(), usuario: 'eq.' + usuario });
  if (existe && existe.length > 0) { toast('Ese nombre de usuario ya existe', true); return; }

  await _sbPost('usuarios', { id: 'usr_' + Date.now(), tienda_id: _getTiendaId(), nombre, usuario, pin, rol, activo: true, created_at: new Date().toISOString() }, false);
  _registrarAccion('crear_usuario', nombre + ' (' + rol + ')');
  toast('✅ Usuario ' + nombre + ' creado como ' + rol);
  cerrarModal('modalUsuarios');
  setTimeout(() => abrirGestionUsuarios(), 300);
}

async function cambiarRolUsuario(userId, nuevoRol) {
  await _sbPost('usuarios', { id: userId, rol: nuevoRol }, true);
  _registrarAccion('cambiar_rol', userId + ' -> ' + nuevoRol);
  toast('Rol actualizado');
}

async function toggleUsuario(userId, activo) {
  await _sbPost('usuarios', { id: userId, activo: !activo }, true);
  _registrarAccion('toggle_usuario', userId + ' -> ' + (!activo ? 'activo' : 'inactivo'));
  toast(activo ? 'Usuario desactivado' : 'Usuario activado');
  cerrarModal('modalUsuarios');
  setTimeout(() => abrirGestionUsuarios(), 300);
}

// =====================================================================
//  📋 REGISTRO DE ACCIONES — ver log (solo Admin)
// =====================================================================

async function verRegistroAcciones() {
  if (!_puedeHacer('reportes')) { toast('Solo el Admin puede ver el registro', true); return; }
  const rows = await _sbGet('acciones_log', {
    select: '*', tienda_id: 'eq.' + _getTiendaId(),
    order: 'created_at.desc', limit: 100
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
//  🔄 SYNC AUTOMÁTICO — en cada acción importante
// =====================================================================

// =====================================================================
//  📤 ENVIAR DATOS — sube snapshot de ESTE teléfono a Supabase
//  El otro teléfono luego usa "Fusionar y actualizar" para combinar
// =====================================================================

async function enviarDatosNube() {
  if (!_sbUrl() || !_sbKey()) { toast('Primero configura Supabase', true); return; }
  if (!_sesionActiva) { toast('Primero inicia sesion', true); return; }
  if (!confirm('Esto sube todos tus datos actuales a Supabase.\nEl otro telefono podra fusionarlos con los suyos.\n\n¿Continuar?')) return;

  _dot('yellow');
  toast('Subiendo datos...');
  try {
    const snap = {
      version: typeof APP_SCHEMA_VERSION !== 'undefined' ? APP_SCHEMA_VERSION : 4,
      exportado: new Date().toISOString(),
      dispositivo: _dispositivoId,
      efectivoInicial: typeof efectivoInicial !== 'undefined' ? efectivoInicial : 0,
      inventarioInicial: typeof inventarioInicial !== 'undefined' ? inventarioInicial : 0,
      productos, ventasDia, ventasSem, ventasMes,
      historial, pagos, ventasDiarias,
      restockLog: restockLog || []
    };

    const snapId = _getTiendaId() + '_' + _dispositivoId;
    await _sbPost('sync_snapshots', {
      id: snapId,
      tienda_id: _getTiendaId(),
      dispositivo_id: _dispositivoId,
      datos: JSON.stringify(snap),
      created_at: new Date().toISOString()
    }, true);

    _dot('green');
    toast('✅ Datos subidos. Ahora ve al otro telefono y toca "Fusionar y actualizar".');
  } catch(e) {
    _dot('red');
    toast('Error: ' + e.message, true);
  }
}

// =====================================================================
//  🔀 FUSIONAR Y ACTUALIZAR — combina datos de Supabase con los locales
//  Luego sube el resultado para que el otro teléfono también lo descargue
// =====================================================================

async function fusionarYActualizar() {
  if (!_sbUrl() || !_sbKey()) { toast('Primero configura Supabase', true); return; }
  if (!_sesionActiva) { toast('Primero inicia sesion', true); return; }
  if (!confirm('Esto fusiona los datos de todos los telefonos de la tienda con los tuyos.\nAmbos telefonos quedaran con la misma informacion.\n\n¿Continuar?')) return;

  _dot('yellow');
  toast('Descargando y fusionando...');
  try {
    // 1. Descargar todos los snapshots de esta tienda
    const todosSnaps = await _sbGet('sync_snapshots', {
      select: '*',
      tienda_id: 'eq.' + _getTiendaId()
    });

    if (!todosSnaps || todosSnaps.length === 0) {
      toast('No hay datos de otros telefonos en Supabase. Pide que el otro telefono use "Enviar datos" primero.', true);
      return;
    }

    // 2. Incluir los datos de ESTE teléfono también
    const miSnap = {
      version: typeof APP_SCHEMA_VERSION !== 'undefined' ? APP_SCHEMA_VERSION : 4,
      exportado: new Date().toISOString(),
      dispositivo: _dispositivoId,
      efectivoInicial: typeof efectivoInicial !== 'undefined' ? efectivoInicial : 0,
      inventarioInicial: typeof inventarioInicial !== 'undefined' ? inventarioInicial : 0,
      productos, ventasDia, ventasSem, ventasMes,
      historial, pagos, ventasDiarias,
      restockLog: restockLog || []
    };

    // Parsear todos los snapshots remotos
    const remotos = todosSnaps
      .filter(s => s.dispositivo_id !== 'fusion' && s.dispositivo_id !== _dispositivoId)
      .map(s => { try { return JSON.parse(s.datos); } catch(e) { return null; } })
      .filter(Boolean);

    // 3. Fusionar este teléfono con todos los remotos
    let resultado = miSnap;
    for (const remoto of remotos) {
      resultado = _fusionarDos(resultado, remoto);
    }

    // 4. Aplicar el resultado a ESTE teléfono
    await _aplicarDatos(resultado);

    // 5. Subir el resultado fusionado para que el otro teléfono lo descargue
    const fusionId = _getTiendaId() + '_fusionado';
    await _sbPost('sync_snapshots', {
      id: fusionId,
      tienda_id: _getTiendaId(),
      dispositivo_id: 'fusion',
      datos: JSON.stringify(resultado),
      created_at: new Date().toISOString()
    }, true);

    // 6. IMPORTANTE: Borrar los snapshots individuales para que la próxima
    // fusión parta desde cero y no duplique ventas
    for (const snap of todosSnaps) {
      if (snap.dispositivo_id !== 'fusion') {
        try {
          await _sbDeleteFiltro('sync_snapshots', { id: 'eq.' + snap.id });
        } catch(e) {}
      }
    }

    _dot('green');
    toast('✅ Fusion completada. Ahora ve al otro telefono y toca "Descargar datos actualizados".');

  } catch(e) {
    _dot('red');
    toast('Error: ' + e.message, true);
    console.error(e);
  }
}

// =====================================================================
//  📥 DESCARGAR DATOS ACTUALIZADOS — el otro teléfono descarga el resultado
// =====================================================================

async function descargarDatosActualizados() {
  if (!_sbUrl() || !_sbKey()) { toast('Primero configura Supabase', true); return; }
  if (!_sesionActiva) { toast('Primero inicia sesion', true); return; }
  if (!confirm('Esto descarga los datos fusionados de Supabase y reemplaza los tuyos.\nAmbos telefonos quedaran con la misma informacion.\n\n¿Continuar?')) return;

  _dot('yellow');
  toast('Descargando datos fusionados...');
  try {
    const fusionId = _getTiendaId() + '_fusionado';
    const rows = await _sbGet('sync_snapshots', { select: 'datos', id: 'eq.' + fusionId });

    if (!rows || !rows.length) {
      toast('No hay datos fusionados disponibles. Pide que el otro telefono use "Fusionar y actualizar" primero.', true);
      return;
    }

    const datos = JSON.parse(rows[0].datos);
    await _aplicarDatos(datos);

    // Después de descargar, subir el estado actual de este teléfono como
    // nuevo snapshot limpio (punto de partida para la próxima fusión)
    // y borrar el snapshot fusionado para evitar reusos incorrectos
    setTimeout(async () => {
      try {
        const nuevoSnap = {
          version: typeof APP_SCHEMA_VERSION !== 'undefined' ? APP_SCHEMA_VERSION : 4,
          exportado: new Date().toISOString(),
          dispositivo: _dispositivoId,
          efectivoInicial: typeof efectivoInicial !== 'undefined' ? efectivoInicial : 0,
          inventarioInicial: typeof inventarioInicial !== 'undefined' ? inventarioInicial : 0,
          productos, ventasDia, ventasSem, ventasMes,
          historial, pagos, ventasDiarias,
          restockLog: restockLog || []
        };
        const snapId = _getTiendaId() + '_' + _dispositivoId;
        await _sbPost('sync_snapshots', {
          id: snapId, tienda_id: _getTiendaId(), dispositivo_id: _dispositivoId,
          datos: JSON.stringify(nuevoSnap), created_at: new Date().toISOString()
        }, true);
        // Borrar el snapshot fusionado — ya no es necesario
        await _sbDeleteFiltro('sync_snapshots', { id: 'eq.' + fusionId });
      } catch(e) { console.warn('[postDescarga]', e.message); }
    }, 1000);

    _dot('green');

  } catch(e) {
    _dot('red');
    toast('Error: ' + e.message, true);
  }
}

// =====================================================================
//  🗑️ LIMPIAR SUPABASE — borra toda la base de datos
// =====================================================================

async function limpiarSupabase() {
  if (!_sbUrl() || !_sbKey()) { toast('Primero configura Supabase', true); return; }
  if (!confirm('⚠️ ADVERTENCIA\n\nEsto borrará TODOS los datos de Supabase:\n- Productos\n- Ventas\n- Historial\n- Snapshots\n- Todo\n\nLos datos en este telefono NO se borran.\n\n¿Estas seguro?')) return;
  if (!confirm('Segunda confirmacion:\n¿Borrar TODA la base de datos de Supabase?')) return;

  _dot('yellow');
  toast('Limpiando Supabase...');
  try {
    const tablas = ['sync_snapshots', 'sync_invites', 'ventas', 'ventas_diarias', 'pagos', 'restock_log', 'deleted_log'];
    for (const tabla of tablas) {
      try {
        await fetch(_sbUrl() + '/rest/v1/' + tabla + '?id=neq.null', {
          method: 'DELETE',
          headers: { 'apikey': _sbKey(), 'Authorization': 'Bearer ' + _sbKey(), 'Prefer': 'return=minimal' }
        });
      } catch(e) { /* tabla puede no existir o tener distinta clave primaria */ }
      // ventas_diarias usa 'fecha' como PK
      try {
        await fetch(_sbUrl() + '/rest/v1/' + tabla + '?fecha=neq.null', {
          method: 'DELETE',
          headers: { 'apikey': _sbKey(), 'Authorization': 'Bearer ' + _sbKey(), 'Prefer': 'return=minimal' }
        });
      } catch(e) {}
    }
    // productos también
    try {
      await fetch(_sbUrl() + '/rest/v1/productos?id=neq.null', {
        method: 'DELETE',
        headers: { 'apikey': _sbKey(), 'Authorization': 'Bearer ' + _sbKey(), 'Prefer': 'return=minimal' }
      });
    } catch(e) {}
    _dot('green');
    toast('✅ Supabase limpiado. Puedes empezar de cero.');
  } catch(e) {
    _dot('red');
    toast('Error: ' + e.message, true);
  }
}

// =====================================================================
//  🔀 LÓGICA DE FUSIÓN — igual que confirmarFusion en app.js
// =====================================================================

function _fusionarDos(local, ext) {
  const idsCobrosLocal = new Set((local.historial || []).map(v => v.id));
  const idsCobrosExt   = new Set((ext.historial   || []).map(v => v.id));

  // 1. Productos: agregar los que no existen localmente
  const idsLocal = new Set((local.productos || []).map(p => String(p.id)));
  (ext.productos || []).forEach(ep => {
    if (!idsLocal.has(String(ep.id))) { local.productos.push(ep); idsLocal.add(String(ep.id)); }
  });

  // 2. Historial: unir sin duplicados PRIMERO (antes de recalcular reportes)
  const seenH = new Set((local.historial || []).map(v => v.id));
  (ext.historial || []).forEach(v => { if (!seenH.has(v.id)) { local.historial.push(v); seenH.add(v.id); } });
  local.historial.sort((a, b) => (b.ts || 0) - (a.ts || 0));

  // 3. RECONSTRUIR reportes desde cero usando el historial combinado
  // Esto garantiza que nunca se dupliquen ventas sin importar cuántas fusiones se hagan
  const hoy    = new Date().toDateString();
  const lunes  = _lunesDeLaSemana();
  local.ventasDia = {};
  local.ventasSem = {};
  local.ventasMes = {};
  const ahora = new Date();

  local.historial.forEach(v => {
    if (!v.fechaISO && !v.fecha) return;
    const fecha = new Date(v.fechaISO || v.fecha);
    const esHoy  = fecha.toDateString() === hoy;
    const esSem  = fecha >= lunes;
    const esMes  = fecha.getMonth() === ahora.getMonth() && fecha.getFullYear() === ahora.getFullYear();

    (v.items || []).forEach(it => {
      const pid   = String(it.id || '');
      if (!pid) return;
      const cant  = Number(it.cant || 0);
      const total = cant * Number(it.precio || 0);
      const base  = { id: pid, nom: it.nom||'', cat: it.cat||'', cant: 0, total: 0 };

      if (esHoy) {
        if (!local.ventasDia[pid]) local.ventasDia[pid] = { ...base };
        local.ventasDia[pid].cant  += cant;
        local.ventasDia[pid].total += total;
      }
      if (esSem) {
        if (!local.ventasSem[pid]) local.ventasSem[pid] = { ...base };
        local.ventasSem[pid].cant  += cant;
        local.ventasSem[pid].total += total;
      }
      if (esMes) {
        if (!local.ventasMes[pid]) local.ventasMes[pid] = { ...base };
        local.ventasMes[pid].cant  += cant;
        local.ventasMes[pid].total += total;
      }
    });
  });

  // 4. Pagos: unir sin duplicados
  const seenP = new Set((local.pagos || []).map(g => String(g.id)));
  (ext.pagos || []).forEach(g => { if (!seenP.has(String(g.id))) { local.pagos.push(g); seenP.add(String(g.id)); } });
  local.pagos.sort((a, b) => (b.ts || 0) - (a.ts || 0));

  // 5. Ventas diarias: unir, si misma fecha tomar el mayor (no sumar — evita duplicar)
  if (!local.ventasDiarias) local.ventasDiarias = [];
  (ext.ventasDiarias || []).forEach(vExt => {
    const idx = local.ventasDiarias.findIndex(vL => vL.fecha === vExt.fecha);
    if (idx >= 0) {
      // Tomar el mayor monto (no sumar — ambos teléfonos pueden tener el mismo registro)
      if (Number(vExt.monto) > Number(local.ventasDiarias[idx].monto)) {
        local.ventasDiarias[idx].monto = Number(vExt.monto);
      }
    } else {
      local.ventasDiarias.push({ ...vExt });
    }
  });
  local.ventasDiarias.sort((a, b) => a.fecha.localeCompare(b.fecha));

  // 6. RestockLog: unir sin duplicados
  if (!local.restockLog) local.restockLog = [];
  const seenR = new Set(local.restockLog.map(r => r.id));
  (ext.restockLog || []).forEach(r => { if (!seenR.has(r.id)) { local.restockLog.push(r); seenR.add(r.id); } });
  local.restockLog.sort((a, b) => (a.ts || 0) - (b.ts || 0));

  // 7. Recalcular stock — lógica exacta de confirmarFusion
  (local.productos || []).forEach(p => {
    const pid = String(p.id);
    const extProd    = (ext.productos || []).find(ep => String(ep.id) === pid);
    const stockLocal = p.stock || 0;
    const stockExt   = extProd ? (extProd.stock || 0) : 0;

    let vendioLocal = 0;
    (local.historial || []).forEach(v => {
      if (idsCobrosLocal.has(v.id) && !idsCobrosExt.has(v.id))
        (v.items || []).forEach(it => { if (String(it.id) === pid) vendioLocal += Number(it.cant || 0); });
    });

    let vendioExt = 0;
    (ext.historial || []).forEach(v => {
      if (idsCobrosExt.has(v.id) && !idsCobrosLocal.has(v.id))
        (v.items || []).forEach(it => { if (String(it.id) === pid) vendioExt += Number(it.cant || 0); });
    });

    const stockBase = Math.max(stockLocal + vendioLocal, extProd ? (stockExt + vendioExt) : (stockLocal + vendioLocal));
    p.stock = Math.max(0, stockBase - vendioLocal - vendioExt);
  });

  // 8. Efectivo e inventario inicial: tomar el mayor
  local.efectivoInicial   = Math.max(parseFloat(local.efectivoInicial || 0),   parseFloat(ext.efectivoInicial || 0));
  local.inventarioInicial = Math.max(parseFloat(local.inventarioInicial || 0), parseFloat(ext.inventarioInicial || 0));

  return local;
}

// Obtener el lunes de la semana actual
function _lunesDeLaSemana() {
  const hoy  = new Date();
  const dia  = hoy.getDay(); // 0=dom, 1=lun...
  const diff = (dia === 0 ? -6 : 1 - dia);
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + diff);
  lunes.setHours(0, 0, 0, 0);
  return lunes;
}

function _mergeRep(a, b) {
  const out = { ...a };
  for (const k in b) {
    if (out[k]) { out[k] = { ...out[k], cant: Number(out[k].cant||0)+Number(b[k].cant||0), total: Number(out[k].total||0)+Number(b[k].total||0) }; }
    else out[k] = { ...b[k] };
  }
  return out;
}

// =====================================================================
//  APLICAR DATOS — restaura completamente (igual que importarDatos)
// =====================================================================

async function _aplicarDatos(datos) {
  if (!datos || !datos.productos) return;

  productos     = datos.productos || [];
  ventasDia     = datos.ventasDia || {};
  ventasSem     = datos.ventasSem || {};
  ventasMes     = datos.ventasMes || {};
  historial     = datos.historial || [];
  pagos         = datos.pagos || [];
  ventasDiarias = datos.ventasDiarias || [];
  restockLog    = datos.restockLog || [];

  if (typeof normalizeReport    === 'function') { ventasDia = normalizeReport(ventasDia); ventasSem = normalizeReport(ventasSem); ventasMes = normalizeReport(ventasMes); }
  if (typeof normalizeHistorial === 'function') historial = normalizeHistorial(historial);
  if (typeof normalizePagos     === 'function') pagos = normalizePagos(pagos);

  if (datos.efectivoInicial !== undefined) {
    efectivoInicial = parseFloat(datos.efectivoInicial) || 0;
    idbSet('vpos_efectivoInicial', efectivoInicial).catch(() => {});
    const el = document.getElementById('inpEfectivoInicial');
    if (el) el.value = efectivoInicial > 0 ? efectivoInicial : '';
  }
  if (datos.inventarioInicial !== undefined) {
    inventarioInicial = parseFloat(datos.inventarioInicial) || 0;
    idbSet('vpos_inventarioInicial', inventarioInicial).catch(() => {});
    const el = document.getElementById('inpInventarioInicial');
    if (el) el.value = inventarioInicial > 0 ? inventarioInicial : '';
  }

  await idbSetMany([
    ['vpos_productos',     productos],
    ['vpos_ventasDia',     ventasDia],
    ['vpos_ventasSem',     ventasSem],
    ['vpos_ventasMes',     ventasMes],
    ['vpos_historial',     historial],
    ['vpos_pagos',         pagos],
    ['vpos_ventasDiarias', ventasDiarias],
    ['vpos_restockLog',    restockLog]
  ]);

  actualizarTodo();
  toast('✅ ' + productos.length + ' productos · datos actualizados correctamente', false, true);
}

// =====================================================================
//  ⚡ SYNC EN TIEMPO REAL (push silencioso en cada acción)
// =====================================================================

let _syncQueue = [], _syncRunning = false, _syncTimer = null, _lastVenta = null;

function syncAhora(tipo, datos) {
  if (!_sbUrl() || !_sbKey()) return;
  if (tipo === 'venta' && datos) _lastVenta = datos;
  if (!_syncQueue.includes(tipo)) _syncQueue.push(tipo);
  clearTimeout(_syncTimer);
  _syncTimer = setTimeout(_ejecutarSync, 900);
}

async function _ejecutarSync() {
  if (_syncRunning) { setTimeout(_ejecutarSync, 1500); return; }
  if (!_syncQueue.length) return;
  _syncRunning = true;
  const queue = [..._syncQueue]; _syncQueue = [];
  try {
    for (const tipo of queue) {
      if (tipo === 'venta' && _lastVenta) {
        const v = _lastVenta; _lastVenta = null;
        await _sbPost('ventas', { id: v.id, fecha_iso: v.fecha||new Date().toISOString(), total: parseFloat(v.total)||0, pago: parseFloat(v.pago)||0, vuelto: parseFloat(v.vuelto)||0, items: v.items||'', items_json: v.items_json||null }, true);
      }
      if (tipo === 'productos' || tipo === 'todo') await _subirStockBase();
      if (tipo === 'restock'   || tipo === 'todo') await _subirRestockLog();
      if (tipo === 'venta_diaria' || tipo === 'todo') await _subirVentasDiarias();
      if (tipo === 'pagos'    || tipo === 'todo') await _subirPagos();
      if (tipo === 'config'   || tipo === 'todo') await _subirConfig();
    }
    localStorage.setItem('vpos_ultimoSync', new Date().toISOString());
    _actualizarBadgeSync();
    _dot('green');
  } catch(e) { console.warn('[Sync]', e.message); _dot('red'); }
  finally { _syncRunning = false; if (_syncQueue.length) setTimeout(_ejecutarSync, 1000); }
}

async function _subirStockBase() {
  if (!productos||!productos.length) return;
  const rows = productos.map(p => ({ id: String(p.id), nom: p.nom||'', cat: p.cat||'', compra: p.compra||0, venta: p.venta||0, stock_base: _calcStockBase(p), stock: p.stock||0, min: p.min||0, cod: p.cod||'', abrev: p.abrev||'', img: p.img||null, paquetes: p.paquetes||[], lotes: p.lotes||[] }));
  for (let i=0; i<rows.length; i+=50) await _sbPost('productos', rows.slice(i,i+50), true);
}
function _calcStockBase(p) {
  const pid = String(p.id); let v = 0;
  (historial||[]).forEach(h => { (h.items||[]).forEach(it => { if (String(it.id)===pid) v+=Number(it.cant||0); }); });
  return (p.stock||0)+v;
}
async function _subirConfig() {
  try {
    await _sbPost('config', { clave:'efectivoInicial',   valor: String(typeof efectivoInicial!=='undefined'?efectivoInicial:0),   updated_at: new Date().toISOString() }, true);
    await _sbPost('config', { clave:'inventarioInicial', valor: String(typeof inventarioInicial!=='undefined'?inventarioInicial:0), updated_at: new Date().toISOString() }, true);
  } catch(e) {}
}
async function _subirRestockLog() {
  if (!restockLog||!restockLog.length) return;
  for (let i=0; i<restockLog.length; i+=50) await _sbPost('restock_log', restockLog.slice(i,i+50).map(r=>({id:r.id,ts:r.ts||0,prod_id:String(r.prodId),cant:r.cant||0,precio_compra:r.precioCompra||0,fecha_str:r.fechaStr||''})), true);
}
async function _subirVentasDiarias() {
  if (!ventasDiarias||!ventasDiarias.length) return;
  await _sbPost('ventas_diarias', ventasDiarias.map(v=>({fecha:v.fecha,monto:parseFloat(v.monto)||0,nota:v.nota||''})), true);
}
async function _subirPagos() {
  if (!pagos||!pagos.length) return;
  try { for (let i=0;i<pagos.length;i+=50) await _sbPost('pagos', pagos.slice(i,i+50).map(g=>({id:String(g.id),fecha_iso:g.fechaISO||new Date().toISOString(),monto:parseFloat(g.monto)||0,cat:g.cat||'GASTO',nom:g.nom||g.concepto||'',nota:g.nota||''})), true); } catch(e) {}
}

// =====================================================================
//  🗑️ BORRAR EN SUPABASE
// =====================================================================
async function syncBorrarProducto(id) { if (!_sbUrl()||!_sbKey()) return; try { await _sbDeleteFiltro('productos',{id:'eq.'+String(id)}); await _sbPost('deleted_log',{id:'del_prod_'+String(id)+'_'+Date.now(),tabla:'productos',registro_id:String(id),deleted_at:new Date().toISOString()},true); } catch(e) {} }
async function syncBorrarPago(id)     { if (!_sbUrl()||!_sbKey()) return; try { await _sbDeleteFiltro('pagos',{id:'eq.'+String(id)}); await _sbPost('deleted_log',{id:'del_pago_'+String(id)+'_'+Date.now(),tabla:'pagos',registro_id:String(id),deleted_at:new Date().toISOString()},true); } catch(e) {} }
async function syncBorrarVentaDiaria(fecha) { if (!_sbUrl()||!_sbKey()) return; try { await _sbDeleteFiltro('ventas_diarias',{fecha:'eq.'+fecha}); await _sbPost('deleted_log',{id:'del_vd_'+fecha+'_'+Date.now(),tabla:'ventas_diarias',registro_id:fecha,deleted_at:new Date().toISOString()},true); } catch(e) {} }

// =====================================================================
//  sheetsEnviar — compatibilidad con app.js
// =====================================================================
async function sheetsEnviar(accion, datos) {
  if (!_sbUrl()||!_sbKey()) return;
  try {
    if (accion==='VENTA') { await _sbPost('ventas',{id:datos.id,fecha_iso:datos.fecha||new Date().toISOString(),total:parseFloat(datos.total)||0,pago:parseFloat(datos.pago)||0,vuelto:parseFloat(datos.vuelto)||0,items:datos.items||'',items_json:datos.items_json||null},true); syncAhora('productos'); }
    if (accion==='PRODUCTOS') syncAhora('productos');
    if (accion==='VENTAS_DIARIAS') syncAhora('venta_diaria');
  } catch(e) { console.warn('[sheetsEnviar]',e.message); }
}
async function sheetsImportar() { await descargarDatosActualizados(); }

// =====================================================================
//  CONFIG
// =====================================================================
function abrirConfigSheets() { document.getElementById('sbUrlInput').value=_sbUrl(); document.getElementById('sbKeyInput').value=_sbKey(); _actualizarBadgeSync(); abrirModal('modalSheetsConfig'); }
function guardarConfigSheets() {
  const url=document.getElementById('sbUrlInput').value.trim(), key=document.getElementById('sbKeyInput').value.trim();
  if (url&&!url.startsWith('https://')) { toast('La URL debe empezar con https://',true); return; }
  localStorage.setItem('vpos_supabaseUrl',url); localStorage.setItem('vpos_supabaseKey',key);
  actualizarBadgeSheets(); cerrarModal('modalSheetsConfig'); toast(url?'Supabase conectado':'Supabase desconectado');
}
function desconectarSupabase() { localStorage.removeItem('vpos_supabaseUrl'); localStorage.removeItem('vpos_supabaseKey'); actualizarBadgeSheets(); cerrarModal('modalSheetsConfig'); toast('Supabase desconectado'); }
function actualizarBadgeSheets() {
  const url=_sbUrl(), sesion=_sesionActiva&&_tiendaId;
  document.querySelectorAll('.sheets-status').forEach(el => { if (sesion){el.textContent='Sync: '+_tiendaId;el.style.color='#16a34a';}else{el.textContent=url?'Sin sesion':'Sync';el.style.color=url?'#d97706':'#6b7280';} });
}
function _actualizarBadgeSync() { const ts=localStorage.getItem('vpos_ultimoSync'); const el=document.getElementById('ultimoSyncLabel'); if(!el)return; el.textContent=ts?'Ultimo sync: '+new Date(ts).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'}):'Nunca sincronizado'; }
function iniciarAutoSync() { restaurarSesion(); }  // Sin auto-poll — todo es manual
function _dot(color) { let d=document.getElementById('syncDot'); if(!d){d=document.createElement('div');d.id='syncDot';d.style.cssText='position:fixed;top:8px;right:8px;z-index:9999;width:9px;height:9px;border-radius:50%;transition:all .3s;pointer-events:none;';document.body.appendChild(d);} d.style.background={yellow:'#f59e0b',green:'#16a34a',red:'#ef4444'}[color]||'#ccc'; d.style.opacity='1'; if(color!=='yellow')setTimeout(()=>{d.style.opacity='0';},color==='green'?2000:5000); }
async function sheetsExportarProductos() { if(!_sbUrl()){toast('Primero configura Supabase',true);return;} try{await _subirStockBase();toast('Inventario enviado ('+productos.length+' productos)');}catch(e){toast('Error: '+e.message,true);} }
async function sheetsExportarVentasDiarias() { if(!_sbUrl()){toast('Primero configura Supabase',true);return;} await _subirVentasDiarias();toast('Ventas diarias enviadas'); }
async function sheetsExportarTodo() { if(!_sbUrl()){toast('Primero configura Supabase',true);return;} toast('Exportando todo...'); await _subirStockBase();await _subirVentasDiarias();await _subirRestockLog();await _subirPagos(); localStorage.setItem('vpos_ultimoSync',new Date().toISOString()); _actualizarBadgeSync();toast('Todo exportado a Supabase'); }
async function testConexionSupabase() { const url=(document.getElementById('sbUrlInput')?.value||'').trim().replace(/\/$/,''),key=(document.getElementById('sbKeyInput')?.value||'').trim(),btn=document.getElementById('btnTestConexion'); if(!url||!key){toast('Ingresa la URL y la Key primero',true);return;} if(btn){btn.disabled=true;btn.textContent='Probando...';} try{const r=await fetch(url+'/rest/v1/productos?select=id&limit=1',{headers:{'apikey':key,'Authorization':'Bearer '+key}});if(!r.ok){const t=await r.text();throw new Error('HTTP '+r.status+' — '+t);}toast('Conexion exitosa a Supabase');}catch(e){toast('Error: '+e.message,true);}finally{if(btn){btn.disabled=false;btn.textContent='Probar conexion';}} }
