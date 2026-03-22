// =====================================================================
//  DESPENSA ECONÓMICA — Supabase Sync v4
//  ✅ Login con PIN por tienda
//  ✅ "Enviar datos" → sube snapshot completo + notifica otros teléfonos
//  ✅ "Recibir datos" → fusiona exactamente igual que el botón Fusionar
//  ✅ Banner de notificación en tiempo real entre teléfonos
//  ✅ Sync en tiempo real en cada movimiento
// =====================================================================

let _sesionActiva = false;
let _tiendaId     = null;
let _dispositivoId = localStorage.getItem('vpos_dispositivoId') || ('dev_' + Math.random().toString(36).slice(2,8));
localStorage.setItem('vpos_dispositivoId', _dispositivoId);

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
  if (!url || !key) throw new Error('Sin configuración de Supabase');
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
  if (!url || !key) throw new Error('Sin config');
  const qs = '?' + new URLSearchParams(filtro).toString();
  const resp = await fetch(url + '/rest/v1/' + tabla + qs, {
    method: 'DELETE',
    headers: { 'apikey': key, 'Authorization': 'Bearer ' + key, 'Prefer': 'return=minimal' }
  });
  if (!resp.ok) { const txt = await resp.text(); throw new Error('HTTP ' + resp.status + ': ' + txt); }
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
    <div class="modal-box" style="max-width:400px;">
      <div style="text-align:center;margin-bottom:18px;">
        <div style="font-size:42px;margin-bottom:8px;">🏪</div>
        <h2 style="font-size:20px;font-weight:900;color:var(--text);margin:0 0 4px;">Iniciar Sesion</h2>
        <p style="font-size:13px;color:var(--text-muted);font-weight:700;margin:0;">Comparte datos entre todos tus telefonos en tiempo real</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:13px;">
        <div>
          <label style="font-size:12px;font-weight:900;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px;">ID de Tienda</label>
          <input id="loginTiendaId" type="text" placeholder="ej: tienda1, despensa"
            style="width:100%;padding:11px 14px;border:2px solid var(--border-mid);border-radius:10px;font-size:15px;font-family:Nunito,sans-serif;font-weight:700;box-sizing:border-box;"
            value="${localStorage.getItem('vpos_tiendaId') || ''}">
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px;font-weight:700;">Usa el mismo ID en todos tus telefonos</div>
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
            Continuar sin sesion (solo datos locales)
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
  const pin      = (document.getElementById('loginPin')?.value || '').trim();
  const btn      = document.getElementById('btnLogin');
  if (!tiendaId) { _mostrarLoginError('Ingresa un ID de tienda'); return; }
  if (!pin || pin.length < 4) { _mostrarLoginError('El PIN debe tener 4 digitos'); return; }
  if (!_sbUrl() || !_sbKey()) { _mostrarLoginError('Primero configura Supabase en Sync'); return; }
  btn.disabled = true; btn.textContent = 'Verificando...';
  try {
    const rows = await _sbGet('sesiones', { select: '*', tienda_id: 'eq.' + tiendaId });
    if (rows && rows.length > 0) {
      if (rows[0].pin !== pin) { _mostrarLoginError('PIN incorrecto'); btn.disabled = false; btn.textContent = 'Entrar'; return; }
    } else {
      await _sbPost('sesiones', { tienda_id: tiendaId, pin, created_at: new Date().toISOString() }, false);
    }
    _tiendaId = tiendaId; _sesionActiva = true;
    localStorage.setItem('vpos_tiendaId', tiendaId);
    localStorage.setItem('vpos_sesionActiva', '1');
    document.getElementById('modalLogin').classList.remove('open');
    _actualizarBadgeLogin();
    iniciarPollNotificaciones();
    toast('Sesion iniciada como: ' + tiendaId);
  } catch(e) {
    _mostrarLoginError('Error: ' + e.message);
    btn.disabled = false; btn.textContent = 'Entrar';
  }
}

function entrarSinLogin() {
  document.getElementById('modalLogin')?.classList.remove('open');
}

function _mostrarLoginError(msg) {
  const el = document.getElementById('loginError');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function cerrarSesion() {
  _sesionActiva = false; _tiendaId = null;
  localStorage.removeItem('vpos_sesionActiva');
  localStorage.removeItem('vpos_tiendaId');
  if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
  _actualizarBadgeLogin();
  toast('Sesion cerrada');
}

function _actualizarBadgeLogin() {
  const activa = _sesionActiva && _tiendaId;
  document.querySelectorAll('.login-status').forEach(el => {
    el.textContent = activa ? ('👤 ' + _getTiendaId()) : 'Iniciar sesion';
    el.style.color = activa ? '#16a34a' : '#6b7280';
  });
  actualizarBadgeSheets();
}

function restaurarSesion() {
  if (localStorage.getItem('vpos_sesionActiva') === '1') {
    _tiendaId = localStorage.getItem('vpos_tiendaId');
    _sesionActiva = true;
    _actualizarBadgeLogin();
  }
}

// =====================================================================
//  📤 ENVIAR DATOS — sube snapshot completo y notifica otros teléfonos
// =====================================================================

async function enviarDatosNube() {
  if (!_sbUrl() || !_sbKey()) { toast('Primero configura Supabase', true); return; }
  if (!_sesionActiva) { toast('Primero inicia sesion', true); return; }

  _dot('yellow');
  toast('Subiendo datos...');

  try {
    // Construir snapshot completo igual que exportarDatos()
    const snapshot = {
      version: typeof APP_SCHEMA_VERSION !== 'undefined' ? APP_SCHEMA_VERSION : 4,
      exportado: new Date().toISOString(),
      dispositivo: _dispositivoId,
      tienda: _getTiendaId(),
      productos,
      ventasDia,
      ventasSem,
      ventasMes,
      historial,
      pagos,
      ventasDiarias,
      restockLog: restockLog || []
    };

    // Subir snapshot en partes (Supabase tiene limite de 1MB por fila)
    // Dividimos en: productos+config y ventas+historial
    const snapshotStr = JSON.stringify(snapshot);

    // Guardar en tabla sync_snapshots
    const snapId = _getTiendaId() + '_' + Date.now();
    await _sbPost('sync_snapshots', {
      id: snapId,
      tienda_id: _getTiendaId(),
      dispositivo_id: _dispositivoId,
      datos: snapshotStr,
      created_at: new Date().toISOString()
    }, true);

    // Crear invitación para los otros teléfonos
    const inviteId = 'inv_' + Date.now();
    await _sbPost('sync_invites', {
      id: inviteId,
      tienda_id: _getTiendaId(),
      desde_dispositivo: _dispositivoId,
      snapshot_id: snapId,
      estado: 'pendiente',
      created_at: new Date().toISOString()
    }, false);

    _dot('green');
    toast('✅ Datos enviados — esperando que otros telefonos acepten');

  } catch(e) {
    console.error('[enviarDatos]', e);
    _dot('red');
    toast('Error: ' + e.message, true);
  }
}

// =====================================================================
//  📥 RECIBIR DATOS — fusiona igual que confirmarFusion en app.js
// =====================================================================

async function recibirDatosNube(snapshotId, inviteId) {
  _dot('yellow');
  toast('Descargando y fusionando datos...');
  try {
    // Descargar snapshot
    const rows = await _sbGet('sync_snapshots', { select: 'datos', id: 'eq.' + snapshotId });
    if (!rows || !rows.length) { toast('No se encontraron datos', true); return; }

    const ext = JSON.parse(rows[0].datos);
    if (!ext.productos || !Array.isArray(ext.productos)) { toast('Datos invalidos', true); return; }

    // ── Aplicar la misma lógica EXACTA de confirmarFusion ────────────

    // 0. Capturar IDs ANTES de fusionar
    const idsCobrosLocalAntes = new Set(historial.map(v => v.id));
    const idsCobrosExtAntes   = new Set((ext.historial || []).map(v => v.id));

    // 1. Productos: agregar los que no existen localmente
    const idsLocales = new Set(productos.map(p => String(p.id)));
    (ext.productos || []).forEach(ep => {
      if (!idsLocales.has(String(ep.id))) productos.push(ep);
      else {
        // Actualizar datos del producto (excepto stock, que se recalcula)
        const idx = productos.findIndex(p => String(p.id) === String(ep.id));
        if (idx >= 0) {
          productos[idx] = { ...productos[idx], nom: ep.nom||productos[idx].nom, cat: ep.cat||productos[idx].cat,
            compra: ep.compra||productos[idx].compra, venta: ep.venta||productos[idx].venta,
            min: ep.min||productos[idx].min, cod: ep.cod||productos[idx].cod,
            abrev: ep.abrev||productos[idx].abrev,
            img: ep.img !== undefined ? ep.img : productos[idx].img,
            paquetes: Array.isArray(ep.paquetes) ? ep.paquetes : productos[idx].paquetes,
            lotes: Array.isArray(ep.lotes) ? ep.lotes : productos[idx].lotes
          };
        }
      }
    });

    // 2. Reportes de ventas: sumar
    if (typeof fusionarReporte === 'function') {
      ventasDia = fusionarReporte(ventasDia, ext.ventasDia || {});
      ventasSem = fusionarReporte(ventasSem, ext.ventasSem || {});
      ventasMes = fusionarReporte(ventasMes, ext.ventasMes || {});
    }

    // 3. Historial de cobros: unir sin duplicados
    const seenH = new Set(historial.map(v => v.id));
    const histExt = typeof normalizeHistorial === 'function'
      ? normalizeHistorial(ext.historial || [])
      : (ext.historial || []);
    histExt.forEach(v => { if (!seenH.has(v.id)) historial.push(v); });
    historial.sort((a, b) => (b.ts||0) - (a.ts||0));

    // 4. Pagos/gastos: unir sin duplicados
    const seenP = new Set(pagos.map(g => String(g.id)));
    const pagosExt = typeof normalizePagos === 'function'
      ? normalizePagos(ext.pagos || [])
      : (ext.pagos || []);
    pagosExt.forEach(g => { if (!seenP.has(String(g.id))) pagos.push(g); });
    pagos.sort((a, b) => (b.ts||0) - (a.ts||0));

    // 5. Ventas diarias: unir, si misma fecha tomar el mayor
    (ext.ventasDiarias || []).forEach(vExt => {
      const idx = ventasDiarias.findIndex(vL => vL.fecha === vExt.fecha);
      if (idx >= 0) {
        ventasDiarias[idx].monto = Math.max(Number(ventasDiarias[idx].monto||0), Number(vExt.monto||0));
        if (vExt.nota && !ventasDiarias[idx].nota) ventasDiarias[idx].nota = vExt.nota;
      } else {
        ventasDiarias.push({ ...vExt });
      }
    });
    ventasDiarias.sort((a,b) => a.fecha.localeCompare(b.fecha));

    // 6. RestockLog: unir sin duplicados
    const seenR = new Set((restockLog||[]).map(r => r.id));
    (ext.restockLog || []).forEach(r => { if (!seenR.has(r.id)) restockLog.push(r); });
    restockLog.sort((a,b) => (a.ts||0) - (b.ts||0));

    // 7. RECALCULAR STOCK — igual que confirmarFusion
    productos.forEach(p => {
      const pid = String(p.id);
      const extProd  = (ext.productos || []).find(ep => String(ep.id) === pid);
      const stockLocal = p.stock || 0;
      const stockExt   = extProd ? (extProd.stock || 0) : 0;

      let vendioLocal = 0;
      historial.forEach(v => {
        if (idsCobrosLocalAntes.has(v.id) && !idsCobrosExtAntes.has(v.id)) {
          (v.items||[]).forEach(it => { if (String(it.id) === pid) vendioLocal += Number(it.cant||0); });
        }
      });

      let vendioExt = 0;
      histExt.forEach(v => {
        if (idsCobrosExtAntes.has(v.id) && !idsCobrosLocalAntes.has(v.id)) {
          (v.items||[]).forEach(it => { if (String(it.id) === pid) vendioExt += Number(it.cant||0); });
        }
      });

      const stockBaseLocal = stockLocal + vendioLocal;
      const stockBaseExt   = extProd ? (stockExt + vendioExt) : stockBaseLocal;
      const stockBase      = Math.max(stockBaseLocal, stockBaseExt);
      p.stock = Math.max(0, stockBase - vendioLocal - vendioExt);
    });

    // Guardar todo en IDB
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

    // Marcar invite como aceptado
    if (inviteId) {
      await _sbPost('sync_invites', { id: inviteId, estado: 'aceptado_' + _dispositivoId }, true).catch(()=>{});
    }

    actualizarTodo();
    _dot('green');
    toast('✅ Datos fusionados correctamente — stock actualizado', false, true);

    // Cerrar banner si está abierto
    const banner = document.getElementById('syncInviteBanner');
    if (banner) banner.remove();

  } catch(e) {
    console.error('[recibirDatos]', e);
    _dot('red');
    toast('Error al fusionar: ' + e.message, true);
  }
}

// =====================================================================
//  🔔 NOTIFICACIONES — poll cada 10 segundos buscando invitaciones
// =====================================================================

let _pollTimer = null;
let _invitesVistos = new Set(JSON.parse(localStorage.getItem('vpos_invitesVistos') || '[]'));

function iniciarPollNotificaciones() {
  if (_pollTimer) clearInterval(_pollTimer);
  _pollTimer = setInterval(_checkInvites, 10000);
  // Check inmediato
  setTimeout(_checkInvites, 2000);
}

async function _checkInvites() {
  if (!_sbUrl() || !_sbKey() || !_sesionActiva) return;
  try {
    // Buscar invites pendientes de mi tienda que no sean de este dispositivo
    const invites = await _sbGet('sync_invites', {
      select: '*',
      tienda_id: 'eq.' + _getTiendaId(),
      estado: 'eq.pendiente',
      order: 'created_at.desc',
      limit: 5
    });

    if (!invites || !invites.length) return;

    // Filtrar los que no son míos y no he visto
    const nuevos = invites.filter(inv =>
      inv.desde_dispositivo !== _dispositivoId &&
      !_invitesVistos.has(inv.id)
    );

    if (!nuevos.length) return;

    // Mostrar banner con el más reciente
    const inv = nuevos[0];
    _invitesVistos.add(inv.id);
    localStorage.setItem('vpos_invitesVistos', JSON.stringify([..._invitesVistos].slice(-50)));
    _mostrarBannerInvite(inv);

  } catch(e) { console.warn('[checkInvites]', e.message); }
}

function _mostrarBannerInvite(inv) {
  // Quitar banner anterior si existe
  const existing = document.getElementById('syncInviteBanner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'syncInviteBanner';
  banner.style.cssText = `
    position:fixed; bottom:80px; left:12px; right:12px; z-index:9998;
    background:linear-gradient(135deg,#1e3a5f,#1d4ed8);
    color:#fff; border-radius:16px; padding:16px 18px;
    box-shadow:0 8px 32px rgba(29,78,216,0.5);
    animation:slideUpBanner 0.4s cubic-bezier(0.22,1,0.36,1);
    font-family:Nunito,sans-serif;
  `;

  // Agregar animación CSS si no existe
  if (!document.getElementById('bannerStyle')) {
    const style = document.createElement('style');
    style.id = 'bannerStyle';
    style.textContent = '@keyframes slideUpBanner{from{transform:translateY(120px);opacity:0}to{transform:translateY(0);opacity:1}}';
    document.head.appendChild(style);
  }

  banner.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
      <div style="font-size:28px;">📲</div>
      <div>
        <div style="font-size:15px;font-weight:900;">Actualizacion disponible</div>
        <div style="font-size:12px;opacity:0.85;font-weight:700;">Otro telefono envio datos nuevos. Acepta para fusionar y quedar sincronizados.</div>
      </div>
    </div>
    <div style="display:flex;gap:10px;">
      <button onclick="recibirDatosNube('${inv.snapshot_id}','${inv.id}')"
        style="flex:2;background:#fff;color:#1d4ed8;border:none;border-radius:10px;padding:12px;font-size:14px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;">
        ✅ Aceptar actualizacion
      </button>
      <button onclick="document.getElementById('syncInviteBanner').remove()"
        style="flex:1;background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.3);border-radius:10px;padding:12px;font-size:13px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;">
        Ahora no
      </button>
    </div>
  `;

  document.body.appendChild(banner);

  // Auto-cerrar después de 60 segundos
  setTimeout(() => { if (document.getElementById('syncInviteBanner')) banner.remove(); }, 60000);
}

// =====================================================================
//  ⚡ SYNC EN TIEMPO REAL (push en cada acción)
// =====================================================================

let _syncQueue   = [];
let _syncRunning = false;
let _syncTimer   = null;
let _lastVenta   = null;

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
    _dot('yellow');
    for (const tipo of queue) {
      if (tipo === 'venta' && _lastVenta) {
        const v = _lastVenta; _lastVenta = null;
        await _sbPost('ventas', {
          id: v.id, fecha_iso: v.fecha || new Date().toISOString(),
          total: parseFloat(v.total)||0, pago: parseFloat(v.pago)||0,
          vuelto: parseFloat(v.vuelto)||0, items: v.items||'',
          items_json: v.items_json || null
        }, true);
        await _subirStockBase();
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
  finally {
    _syncRunning = false;
    if (_syncQueue.length) setTimeout(_ejecutarSync, 1000);
  }
}

async function _subirStockBase() {
  if (!productos || !productos.length) return;
  const rows = productos.map(p => ({
    id: String(p.id), nom: p.nom||'', cat: p.cat||'',
    compra: p.compra||0, venta: p.venta||0,
    stock_base: _calcStockBase(p), stock: p.stock||0, min: p.min||0,
    cod: p.cod||'', abrev: p.abrev||'', img: p.img||null,
    paquetes: p.paquetes||[], lotes: p.lotes||[]
  }));
  for (let i=0; i<rows.length; i+=50) await _sbPost('productos', rows.slice(i,i+50), true);
}

function _calcStockBase(p) {
  const pid = String(p.id);
  let vendido = 0;
  (historial||[]).forEach(v => {
    (v.items||[]).forEach(it => { if (String(it.id) === pid) vendido += Number(it.cant||0); });
  });
  return (p.stock||0) + vendido;
}

async function _subirConfig() {
  try {
    await _sbPost('config', { clave: 'efectivoInicial', valor: String(typeof efectivoInicial!=='undefined'?efectivoInicial:0), updated_at: new Date().toISOString() }, true);
    await _sbPost('config', { clave: 'inventarioInicial', valor: String(typeof inventarioInicial!=='undefined'?inventarioInicial:0), updated_at: new Date().toISOString() }, true);
  } catch(e) { console.warn('[subirConfig]', e.message); }
}

async function _subirRestockLog() {
  if (!restockLog || !restockLog.length) return;
  const rows = restockLog.map(r => ({ id: r.id, ts: r.ts||0, prod_id: String(r.prodId), cant: r.cant||0, precio_compra: r.precioCompra||0, fecha_str: r.fechaStr||'' }));
  for (let i=0; i<rows.length; i+=50) await _sbPost('restock_log', rows.slice(i,i+50), true);
}

async function _subirVentasDiarias() {
  if (!ventasDiarias || !ventasDiarias.length) return;
  const rows = ventasDiarias.map(v => ({ fecha: v.fecha, monto: parseFloat(v.monto)||0, nota: v.nota||'' }));
  await _sbPost('ventas_diarias', rows, true);
}

async function _subirPagos() {
  if (!pagos || !pagos.length) return;
  try {
    const rows = pagos.map(g => ({ id: String(g.id), fecha_iso: g.fechaISO||new Date().toISOString(), monto: parseFloat(g.monto)||0, cat: g.cat||'GASTO', nom: g.nom||g.concepto||'', nota: g.nota||'' }));
    for (let i=0; i<rows.length; i+=50) await _sbPost('pagos', rows.slice(i,i+50), true);
  } catch(e) { console.warn('[subirPagos]', e.message); }
}

// =====================================================================
//  🗑️ BORRAR EN SUPABASE
// =====================================================================

async function syncBorrarProducto(id) {
  if (!_sbUrl() || !_sbKey()) return;
  try {
    await _sbDeleteFiltro('productos', { id: 'eq.' + String(id) });
    await _sbPost('deleted_log', { id: 'del_prod_' + String(id) + '_' + Date.now(), tabla: 'productos', registro_id: String(id), deleted_at: new Date().toISOString() }, true);
    _dot('green');
  } catch(e) { console.warn('[syncBorrarProducto]', e.message); }
}

async function syncBorrarPago(id) {
  if (!_sbUrl() || !_sbKey()) return;
  try {
    await _sbDeleteFiltro('pagos', { id: 'eq.' + String(id) });
    await _sbPost('deleted_log', { id: 'del_pago_' + String(id) + '_' + Date.now(), tabla: 'pagos', registro_id: String(id), deleted_at: new Date().toISOString() }, true);
    _dot('green');
  } catch(e) { console.warn('[syncBorrarPago]', e.message); }
}

async function syncBorrarVentaDiaria(fecha) {
  if (!_sbUrl() || !_sbKey()) return;
  try {
    await _sbDeleteFiltro('ventas_diarias', { fecha: 'eq.' + fecha });
    await _sbPost('deleted_log', { id: 'del_vd_' + fecha + '_' + Date.now(), tabla: 'ventas_diarias', registro_id: fecha, deleted_at: new Date().toISOString() }, true);
    _dot('green');
  } catch(e) { console.warn('[syncBorrarVentaDiaria]', e.message); }
}

// =====================================================================
//  sheetsEnviar — compatibilidad con app.js
// =====================================================================
async function sheetsEnviar(accion, datos) {
  if (!_sbUrl() || !_sbKey()) return;
  try {
    if (accion === 'VENTA') {
      await _sbPost('ventas', { id: datos.id, fecha_iso: datos.fecha||new Date().toISOString(), total: parseFloat(datos.total)||0, pago: parseFloat(datos.pago)||0, vuelto: parseFloat(datos.vuelto)||0, items: datos.items||'', items_json: datos.items_json||null }, true);
      syncAhora('productos');
    }
    if (accion === 'PRODUCTOS')      syncAhora('productos');
    if (accion === 'VENTAS_DIARIAS') syncAhora('venta_diaria');
  } catch(e) { console.warn('[sheetsEnviar]', e.message); }
}

// sheetsImportar — mantener compatibilidad con botón "Importar desde nube"
async function sheetsImportar() {
  await recibirDatosNube(null, null);
}

// =====================================================================
//  CONFIG
// =====================================================================

function abrirConfigSheets() {
  document.getElementById('sbUrlInput').value = _sbUrl();
  document.getElementById('sbKeyInput').value = _sbKey();
  _actualizarBadgeSync();
  abrirModal('modalSheetsConfig');
}

function guardarConfigSheets() {
  const url = document.getElementById('sbUrlInput').value.trim();
  const key = document.getElementById('sbKeyInput').value.trim();
  if (url && !url.startsWith('https://')) { toast('La URL debe empezar con https://', true); return; }
  localStorage.setItem('vpos_supabaseUrl', url);
  localStorage.setItem('vpos_supabaseKey', key);
  actualizarBadgeSheets();
  cerrarModal('modalSheetsConfig');
  toast(url ? 'Supabase conectado' : 'Supabase desconectado');
}

function desconectarSupabase() {
  localStorage.removeItem('vpos_supabaseUrl');
  localStorage.removeItem('vpos_supabaseKey');
  actualizarBadgeSheets();
  cerrarModal('modalSheetsConfig');
  toast('Supabase desconectado');
}

function actualizarBadgeSheets() {
  const url = _sbUrl(), sesion = _sesionActiva && _tiendaId;
  document.querySelectorAll('.sheets-status').forEach(el => {
    if (sesion) { el.textContent = 'Sync: ' + _tiendaId; el.style.color = '#16a34a'; }
    else { el.textContent = url ? 'Sin sesion' : 'Sync'; el.style.color = url ? '#d97706' : '#6b7280'; }
  });
}

function _actualizarBadgeSync() {
  const ts = localStorage.getItem('vpos_ultimoSync');
  const el = document.getElementById('ultimoSyncLabel');
  if (!el) return;
  el.textContent = ts ? 'Ultimo sync: ' + new Date(ts).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'}) : 'Nunca sincronizado';
}

function iniciarAutoSync() {
  restaurarSesion();
  if (_sesionActiva) iniciarPollNotificaciones();
}

function _dot(color) {
  let dot = document.getElementById('syncDot');
  if (!dot) {
    dot = document.createElement('div');
    dot.id = 'syncDot';
    dot.style.cssText = 'position:fixed;top:8px;right:8px;z-index:9999;width:9px;height:9px;border-radius:50%;transition:all .3s;pointer-events:none;';
    document.body.appendChild(dot);
  }
  dot.style.background = {yellow:'#f59e0b',green:'#16a34a',red:'#ef4444'}[color]||'#ccc';
  dot.style.opacity='1';
  if (color!=='yellow') setTimeout(()=>{dot.style.opacity='0';}, color==='green'?2000:5000);
}

// =====================================================================
//  EXPORTAR MANUAL
// =====================================================================

async function sheetsExportarProductos() {
  if (!_sbUrl()) { toast('Primero configura Supabase', true); return; }
  toast('Exportando inventario...');
  try { await _subirStockBase(); toast('Inventario enviado (' + productos.length + ' productos)'); }
  catch(e) { toast('Error: ' + e.message, true); }
}

async function sheetsExportarVentasDiarias() {
  if (!_sbUrl()) { toast('Primero configura Supabase', true); return; }
  await _subirVentasDiarias(); toast('Ventas diarias enviadas');
}

async function sheetsExportarTodo() {
  if (!_sbUrl()) { toast('Primero configura Supabase', true); return; }
  toast('Exportando todo...');
  await _subirStockBase(); await _subirVentasDiarias(); await _subirRestockLog(); await _subirPagos();
  localStorage.setItem('vpos_ultimoSync', new Date().toISOString());
  _actualizarBadgeSync(); toast('Todo exportado a Supabase');
}

async function testConexionSupabase() {
  const url = (document.getElementById('sbUrlInput')?.value||'').trim().replace(/\/$/,'');
  const key = (document.getElementById('sbKeyInput')?.value||'').trim();
  const btn = document.getElementById('btnTestConexion');
  if (!url||!key) { toast('Ingresa la URL y la Key primero', true); return; }
  if (btn) { btn.disabled=true; btn.textContent='Probando...'; }
  try {
    const resp = await fetch(url+'/rest/v1/productos?select=id&limit=1', { headers:{'apikey':key,'Authorization':'Bearer '+key} });
    if (!resp.ok) { const txt=await resp.text(); throw new Error('HTTP '+resp.status+' — '+txt); }
    toast('Conexion exitosa a Supabase');
  } catch(e) { toast('Error: '+e.message, true); }
  finally { if (btn) { btn.disabled=false; btn.textContent='Probar conexion'; } }
}
