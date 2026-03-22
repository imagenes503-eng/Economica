// =====================================================================
//  DESPENSA ECONÓMICA — Supabase Sync v3
//  ✅ Login con PIN por tienda
//  ✅ Sync en tiempo real en cada movimiento
//  ✅ Fusión inteligente de stock (igual que el sistema JSON local)
//     Stock final = stockBase − ventas_tel1 − ventas_tel2 − ...
// =====================================================================

let _sesionActiva = false;
let _tiendaId     = null;

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

async function _sbDelete(tabla) {
  const url = _sbUrl(), key = _sbKey();
  if (!url || !key) throw new Error('Sin configuración de Supabase');
  const resp = await fetch(url + '/rest/v1/' + tabla + '?id=neq.null', {
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
        <p style="font-size:13px;color:var(--text-muted);font-weight:700;margin:0;">Al entrar, los datos de la nube se fusionan correctamente con los locales</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:13px;">
        <div>
          <label style="font-size:12px;font-weight:900;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px;">ID de Tienda</label>
          <input id="loginTiendaId" type="text" placeholder="ej: tienda1, despensa, mi-tienda"
            style="width:100%;padding:11px 14px;border:2px solid var(--border-mid);border-radius:10px;font-size:15px;font-family:Nunito,sans-serif;font-weight:700;box-sizing:border-box;"
            value="${localStorage.getItem('vpos_tiendaId') || ''}">
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px;font-weight:700;">Usa el mismo ID en todos tus telefonos</div>
        </div>
        <div>
          <label style="font-size:12px;font-weight:900;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;display:block;margin-bottom:5px;">PIN (4 digitos)</label>
          <input id="loginPin" type="password" inputmode="numeric" maxlength="4" placeholder="••••"
            style="width:100%;padding:11px 14px;border:2px solid var(--border-mid);border-radius:10px;font-size:22px;letter-spacing:8px;font-family:'Space Mono',monospace;font-weight:700;box-sizing:border-box;text-align:center;">
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px;font-weight:700;">Primera vez: el PIN que escribas queda guardado</div>
        </div>
        <div id="loginError" style="display:none;background:rgba(220,38,38,.1);border:1px solid rgba(220,38,38,.3);border-radius:8px;padding:10px 12px;font-size:13px;color:#dc2626;font-weight:700;text-align:center;"></div>
        <button onclick="intentarLogin()" id="btnLogin"
          style="background:var(--green);color:#fff;border:none;border-radius:12px;padding:14px;font-size:16px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;width:100%;margin-top:4px;">
          🔑 Entrar y sincronizar
        </button>
        <div style="text-align:center;">
          <button onclick="entrarSinLogin()" style="background:none;border:none;color:var(--text-muted);font-size:13px;font-weight:700;font-family:Nunito,sans-serif;cursor:pointer;text-decoration:underline;">
            Continuar sin sesion (solo datos locales)
          </button>
        </div>
      </div>
      <div style="margin-top:16px;padding:12px;background:var(--green-light);border-radius:10px;font-size:12px;color:var(--green-dark);font-weight:700;">
        💡 El sistema fusiona ventas de ambos telefonos igual que el boton de fusionar backup. El stock se recalcula exacto: stock base − ventas de todos los telefonos.
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
      if (rows[0].pin !== pin) {
        _mostrarLoginError('PIN incorrecto');
        btn.disabled = false; btn.textContent = 'Entrar y sincronizar';
        return;
      }
    } else {
      await _sbPost('sesiones', { tienda_id: tiendaId, pin, created_at: new Date().toISOString() }, false);
    }
    _tiendaId = tiendaId;
    _sesionActiva = true;
    localStorage.setItem('vpos_tiendaId', tiendaId);
    localStorage.setItem('vpos_sesionActiva', '1');
    document.getElementById('modalLogin').classList.remove('open');
    _actualizarBadgeLogin();
    btn.textContent = 'Cargando y fusionando...';
    toast('Sesion iniciada. Sincronizando...');
    // Al entrar, fusionar datos de la nube con los locales (igual que fusionar backup)
    await sheetsImportar(false);
  } catch(e) {
    _mostrarLoginError('Error: ' + e.message);
    btn.disabled = false; btn.textContent = 'Entrar y sincronizar';
  }
}

function entrarSinLogin() {
  document.getElementById('modalLogin')?.classList.remove('open');
  toast('Entrando con datos locales', false, true);
}

function _mostrarLoginError(msg) {
  const el = document.getElementById('loginError');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function cerrarSesion() {
  _sesionActiva = false; _tiendaId = null;
  localStorage.removeItem('vpos_sesionActiva');
  localStorage.removeItem('vpos_tiendaId');
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
//  ⚡ SYNC EN TIEMPO REAL
// =====================================================================

let _syncQueue   = [];
let _syncRunning = false;
let _syncTimer   = null;
let _lastVenta   = null;

/**
 * Llamar en cada movimiento. Tipos:
 *   'venta'        → sube el cobro a ventas + actualiza restock_log del carrito
 *   'productos'    → sube stock_base de productos (no el stock actual)
 *   'restock'      → sube entrada de stock a restock_log + stock_base
 *   'venta_diaria' → sube ventas_diarias
 *   'pagos'        → sube pagos/facturas
 */
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
        // 1. Guardar el cobro completo (con items JSON para recalcular stock)
        await _sbPost('ventas', {
          id: v.id,
          fecha_iso: v.fecha || new Date().toISOString(),
          total: parseFloat(v.total) || 0,
          pago:  parseFloat(v.pago)  || 0,
          vuelto: parseFloat(v.vuelto) || 0,
          items: v.items || '',
          items_json: v.itemsJSON ? JSON.stringify(v.itemsJSON) : null
        }, true);
        // 2. Actualizar stock_base de productos (no el stock actual)
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
  } catch(e) {
    console.warn('[Sync]', e.message);
    _dot('red');
  } finally {
    _syncRunning = false;
    if (_syncQueue.length) setTimeout(_ejecutarSync, 1000);
  }
}

// Sube el stock_base (inventario inicial sin descontar ventas) de cada producto.
// stock_base = stock_actual + todo lo que se ha vendido desde Supabase
// Esto permite que la fusión recalcule el stock exacto.
async function _subirStockBase() {
  if (!productos || !productos.length) return;
  const rows = productos.map(p => ({
    id: String(p.id),
    nom: p.nom || '', cat: p.cat || '',
    compra: p.compra || 0, venta: p.venta || 0,
    stock_base: _calcStockBase(p),   // inventario antes de ventas del historial local
    stock: p.stock || 0,             // stock actual (para referencia, no se usa en fusión)
    min: p.min || 0,
    cod: p.cod || '', abrev: p.abrev || '',
    img: p.img || null,
    paquetes: p.paquetes || [],
    lotes: p.lotes || []
  }));
  for (let i = 0; i < rows.length; i += 50) {
    await _sbPost('productos', rows.slice(i, i + 50), true);
  }
}

// Calcula el stock_base: stock actual + lo que este teléfono ha vendido de ese producto
function _calcStockBase(p) {
  const pid = String(p.id);
  let vendidoLocal = 0;
  historial.forEach(v => {
    (v.items || []).forEach(it => {
      if (String(it.id) === pid) vendidoLocal += Number(it.cant || 0);
    });
  });
  return (p.stock || 0) + vendidoLocal;
}


async function _subirConfig() {
  // Guarda efectivo inicial e inventario inicial en una tabla config
  try {
    await _sbPost('config', {
      clave: 'efectivoInicial',
      valor: String(typeof efectivoInicial !== 'undefined' ? efectivoInicial : 0),
      updated_at: new Date().toISOString()
    }, true);
    await _sbPost('config', {
      clave: 'inventarioInicial',
      valor: String(typeof inventarioInicial !== 'undefined' ? inventarioInicial : 0),
      updated_at: new Date().toISOString()
    }, true);
  } catch(e) { console.warn('[subirConfig]', e.message); }
}

async function _subirRestockLog() {
  if (!restockLog || !restockLog.length) return;
  const rows = restockLog.map(r => ({
    id: r.id,
    ts: r.ts || Date.now(),
    prod_id: String(r.prodId),
    cant: r.cant || 0,
    precio_compra: r.precioCompra || 0,
    fecha_str: r.fechaStr || ''
  }));
  for (let i = 0; i < rows.length; i += 50) {
    await _sbPost('restock_log', rows.slice(i, i + 50), true);
  }
}

async function _subirVentasDiarias() {
  if (!ventasDiarias || !ventasDiarias.length) return;
  const rows = ventasDiarias.map(v => ({
    fecha: v.fecha,
    monto: parseFloat(v.monto) || 0,
    nota: v.nota || ''
  }));
  await _sbPost('ventas_diarias', rows, true);
}

async function _subirPagos() {
  if (!pagos || !pagos.length) return;
  try {
    const rows = pagos.map(g => ({
      id: String(g.id),
      fecha_iso: g.fechaISO || new Date().toISOString(),
      monto: parseFloat(g.monto) || 0,
      cat: g.cat || 'GASTO',
      nom: g.nom || g.concepto || '',
      nota: g.nota || ''
    }));
    for (let i = 0; i < rows.length; i += 50) {
      await _sbPost('pagos', rows.slice(i, i + 50), true);
    }
  } catch(e) { console.warn('[syncPagos]', e.message); }
}

// =====================================================================
//  📥 IMPORTAR DESDE SUPABASE — fusión inteligente igual que el JSON
// =====================================================================

async function sheetsImportar(soloNuevos) {
  if (!_sbUrl() || !_sbKey()) { toast('Primero configura Supabase', true); return; }
  toast('Sincronizando con Supabase...');
  try {
    // Traer todo desde Supabase en paralelo (incluye deleted_log para aplicar borrados)
    const [dataProd, dataVentas, dataVD, dataRestock, dataPagos, dataDeleted, dataConfig] = await Promise.all([
      _sbGet('productos', { select: '*' }),
      _sbGet('ventas', { select: '*', order: 'fecha_iso.asc', limit: 5000 }),
      _sbGet('ventas_diarias', { select: '*' }),
      _sbGet('restock_log', { select: '*', order: 'ts.asc', limit: 5000 }).catch(() => []),
      _sbGet('pagos', { select: '*' }).catch(() => []),
      _sbGet('deleted_log', { select: '*' }).catch(() => []),
      _sbGet('config', { select: '*' }).catch(() => [])
    ]);

    // ── 0. APLICAR BORRADOS del otro teléfono PRIMERO ────────────────────
    // Si el otro teléfono borró algo, lo quitamos localmente antes de fusionar
    if (dataDeleted && dataDeleted.length) {
      dataDeleted.forEach(d => {
        if (d.tabla === 'productos') {
          productos = productos.filter(p => String(p.id) !== String(d.registro_id));
        }
        if (d.tabla === 'pagos') {
          pagos = pagos.filter(g => String(g.id) !== String(d.registro_id));
        }
        if (d.tabla === 'ventas_diarias') {
          ventasDiarias = ventasDiarias.filter(v => v.fecha !== d.registro_id);
        }
      });
    }

    // ── 0b. APLICAR CONFIG (efectivo e inventario inicial) ──────────────
    if (dataConfig && dataConfig.length) {
      dataConfig.forEach(row => {
        if (row.clave === 'efectivoInicial' && parseFloat(row.valor) > 0) {
          efectivoInicial = parseFloat(row.valor) || 0;
          idbSet('vpos_efectivoInicial', efectivoInicial).catch(()=>{});
          const el = document.getElementById('inpEfectivoInicial');
          if (el && !el.value) el.value = efectivoInicial;
        }
        if (row.clave === 'inventarioInicial' && parseFloat(row.valor) > 0) {
          inventarioInicial = parseFloat(row.valor) || 0;
          idbSet('vpos_inventarioInicial', inventarioInicial).catch(()=>{});
          const el = document.getElementById('inpInventarioInicial');
          if (el && !el.value) el.value = inventarioInicial;
        }
      });
    }

    // ── Capturar IDs locales ANTES de fusionar (igual que confirmarFusion) ──
    const idsCobrosLocal = new Set(historial.map(v => v.id));
    const idsCobrosNube  = new Set((dataVentas || []).map(v => v.id));

    // ── 1. Productos: agregar los que no existen localmente ──────────────
    if (dataProd && dataProd.length) {
      const idsLocales = new Set(productos.map(p => String(p.id)));
      (dataProd).forEach(r => {
        if (!idsLocales.has(String(r.id))) {
          productos.push({
            id: Number(r.id) || Date.now(),
            nom: r.nom || '', cat: r.cat || '',
            compra: parseFloat(r.compra) || 0,
            venta: parseFloat(r.venta) || 0,
            stock: parseInt(r.stock) || 0,
            min: parseInt(r.min) || 0,
            cod: r.cod || '', abrev: r.abrev || '',
            img: r.img || null,
            paquetes: Array.isArray(r.paquetes) ? r.paquetes : [],
            lotes: Array.isArray(r.lotes) ? r.lotes : []
          });
        }
      });
    }

    // ── 2. Historial de cobros: unir sin duplicados ──────────────────────
    const seenH = new Set(historial.map(v => v.id));
    (dataVentas || []).forEach(r => {
      if (!seenH.has(r.id)) {
        let items = [];
        // Intentar parsear items_json (estructura completa con id de producto)
        if (r.items_json) {
          try { items = JSON.parse(r.items_json); } catch(e) {}
        }
        // Fallback: parsear el campo items de texto "2x DIANA | 1x LECHE"
        if (!items.length && r.items) {
          items = r.items.split('|').map(s => {
            const m = s.trim().match(/^(\d+)x\s+(.+)$/);
            if (!m) return null;
            const nom = m[2].trim();
            const p   = productos.find(x => (x.nom||'').toUpperCase() === nom.toUpperCase());
            return p ? { id: String(p.id), nom: p.nom, cant: parseInt(m[1])||1, precio: p.venta } : null;
          }).filter(Boolean);
        }
        historial.push({
          id: r.id,
          fechaISO: r.fecha_iso || '',
          ts: r.fecha_iso ? Date.parse(r.fecha_iso) : 0,
          fechaStr: r.fecha_iso ? new Date(r.fecha_iso).toLocaleString('es-SV') : '',
          total: parseFloat(r.total) || 0,
          pago: parseFloat(r.pago) || 0,
          vuelto: parseFloat(r.vuelto) || 0,
          items,
          itemsStr: r.items || ''
        });
      }
    });
    historial.sort((a, b) => (b.ts || 0) - (a.ts || 0));

    // ── 3. Pagos/facturas: unir sin duplicados ───────────────────────────
    if (dataPagos && dataPagos.length) {
      const seenP = new Set(pagos.map(g => String(g.id)));
      dataPagos.forEach(r => {
        if (!seenP.has(String(r.id))) {
          pagos.push({
            id: r.id,
            concepto: r.nom || '',
            cat: r.cat || 'GASTO',
            monto: parseFloat(r.monto) || 0,
            fechaISO: r.fecha_iso || new Date().toISOString(),
            ts: r.fecha_iso ? Date.parse(r.fecha_iso) : 0,
            fechaStr: r.fecha_iso ? new Date(r.fecha_iso).toLocaleString('es-SV') : ''
          });
        }
      });
      pagos.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    }

    // ── 4. Ventas diarias: unir, si misma fecha sumar montos ─────────────
    if (dataVD && dataVD.length) {
      dataVD.forEach(r => {
        const idx = ventasDiarias.findIndex(v => v.fecha === r.fecha);
        if (idx >= 0) {
          // Si existe localmente, tomar el mayor (evitar duplicar si ya se subió)
          ventasDiarias[idx].monto = Math.max(
            Number(ventasDiarias[idx].monto || 0),
            Number(r.monto || 0)
          );
        } else {
          ventasDiarias.push({ fecha: r.fecha, monto: parseFloat(r.monto) || 0, nota: r.nota || '' });
        }
      });
      ventasDiarias.sort((a, b) => a.fecha.localeCompare(b.fecha));
    }

    // ── 5. Restock log: unir sin duplicados ──────────────────────────────
    if (dataRestock && dataRestock.length) {
      const seenR = new Set((restockLog || []).map(r => r.id));
      dataRestock.forEach(r => {
        if (!seenR.has(r.id)) {
          restockLog.push({
            id: r.id,
            ts: r.ts || 0,
            prodId: String(r.prod_id),
            cant: r.cant || 0,
            precioCompra: r.precio_compra || 0,
            fechaStr: r.fecha_str || ''
          });
        }
      });
      restockLog.sort((a, b) => (a.ts || 0) - (b.ts || 0));
    }

    // ── 6. RECALCULAR STOCK — igual que confirmarFusion en app.js ────────
    //
    // Para cada producto:
    //   vendidoLocal = lo que vendio ESTE telefono (cobros que solo existen local)
    //   vendidoNube  = lo que vendieron los OTROS telefonos (cobros que solo estan en nube)
    //   stockBase    = max(stock_local + vendidoLocal, stock_nube + vendidoNube)
    //   stockFinal   = stockBase − vendidoLocal − vendidoNube
    //
    // El stock_base en Supabase ya fue calculado por cada telefono como:
    //   stock_actual + ventas_locales
    // Por eso usamos ese valor para saber cual fue el inventario original.

    const stockBaseNube = {};
    (dataProd || []).forEach(r => {
      stockBaseNube[String(r.id)] = parseInt(r.stock_base) || parseInt(r.stock) || 0;
    });

    productos.forEach(p => {
      const pid = String(p.id);

      // Ventas que solo tiene este telefono (no estaban en Supabase antes de importar)
      let vendidoLocal = 0;
      historial.forEach(v => {
        if (idsCobrosLocal.has(v.id) && !idsCobrosNube.has(v.id)) {
          (v.items || []).forEach(it => {
            if (String(it.id) === pid) vendidoLocal += Number(it.cant || 0);
          });
        }
      });

      // Ventas que solo existen en Supabase (de otros telefonos)
      let vendidoNube = 0;
      historial.forEach(v => {
        if (idsCobrosNube.has(v.id) && !idsCobrosLocal.has(v.id)) {
          (v.items || []).forEach(it => {
            if (String(it.id) === pid) vendidoNube += Number(it.cant || 0);
          });
        }
      });

      // Stock base: tomar el mayor entre lo que tiene cada dispositivo
      const stockBaseLocal = (p.stock || 0) + vendidoLocal;
      const stockBaseRemoto = stockBaseNube[pid] || stockBaseLocal;
      const stockBase = Math.max(stockBaseLocal, stockBaseRemoto);

      // Stock final = base − todas las ventas
      p.stock = Math.max(0, stockBase - vendidoLocal - vendidoNube);
    });

    // ── 7. Guardar todo en IndexedDB ─────────────────────────────────────
    await idbSetMany([
      ['vpos_productos',     productos],
      ['vpos_historial',     historial],
      ['vpos_pagos',         pagos],
      ['vpos_ventasDiarias', ventasDiarias],
      ['vpos_restockLog',    restockLog]
    ]);
    actualizarTodo();

    localStorage.setItem('vpos_ultimoSync', new Date().toISOString());
    _actualizarBadgeSync();
    toast('✅ Sincronizado — stock fusionado correctamente');

    // Después de importar, subir los datos locales para que otros telefonos los vean
    setTimeout(() => {
      _subirStockBase().catch(()=>{});
      _subirRestockLog().catch(()=>{});
    }, 1500);

  } catch(e) {
    console.error('[Import]', e);
    toast('Error: ' + e.message, true);
  }
}

// =====================================================================
//  sheetsEnviar — compatibilidad con app.js existente
// =====================================================================
async function sheetsEnviar(accion, datos) {
  if (!_sbUrl() || !_sbKey()) return;
  try {
    if (accion === 'VENTA') {
      // Guardar items con estructura completa para poder recalcular stock
      
      await _sbPost('ventas', {
        id: datos.id,
        fecha_iso: datos.fecha || new Date().toISOString(),
        total: parseFloat(datos.total) || 0,
        pago:  parseFloat(datos.pago)  || 0,
        vuelto: parseFloat(datos.vuelto) || 0,
        items: datos.items || '',
        items_json: datos.items_json || (datos.itemsJSON ? JSON.stringify(datos.itemsJSON) : null)
      }, true);
      // Actualizar stock_base (stock + ventas locales)
      syncAhora('productos');
    }
    if (accion === 'PRODUCTOS')      syncAhora('productos');
    if (accion === 'VENTAS_DIARIAS') syncAhora('venta_diaria');
  } catch(e) { console.warn('[sheetsEnviar]', e.message); }
}


// =====================================================================
//  🗑️ BORRAR EN SUPABASE — se llama al eliminar localmente
// =====================================================================

async function syncBorrarProducto(id) {
  if (!_sbUrl() || !_sbKey()) return;
  try {
    const url = _sbUrl(), key = _sbKey();
    // 1. Borrar de productos
    await fetch(url + '/rest/v1/productos?id=eq.' + String(id), {
      method: 'DELETE',
      headers: { 'apikey': key, 'Authorization': 'Bearer ' + key, 'Prefer': 'return=minimal' }
    });
    // 2. Registrar el borrado en tabla deleted_log para que otros teléfonos lo apliquen
    await _sbPost('deleted_log', {
      id: 'del_prod_' + String(id) + '_' + Date.now(),
      tabla: 'productos',
      registro_id: String(id),
      deleted_at: new Date().toISOString()
    }, true);
    _dot('green');
    console.log('[Sync] Producto ' + id + ' borrado de Supabase');
  } catch(e) { console.warn('[syncBorrarProducto]', e.message); _dot('red'); }
}

async function syncBorrarPago(id) {
  if (!_sbUrl() || !_sbKey()) return;
  try {
    const url = _sbUrl(), key = _sbKey();
    await fetch(url + '/rest/v1/pagos?id=eq.' + String(id), {
      method: 'DELETE',
      headers: { 'apikey': key, 'Authorization': 'Bearer ' + key, 'Prefer': 'return=minimal' }
    });
    await _sbPost('deleted_log', {
      id: 'del_pago_' + String(id) + '_' + Date.now(),
      tabla: 'pagos',
      registro_id: String(id),
      deleted_at: new Date().toISOString()
    }, true);
    _dot('green');
  } catch(e) { console.warn('[syncBorrarPago]', e.message); }
}

async function syncBorrarVentaDiaria(fecha) {
  if (!_sbUrl() || !_sbKey()) return;
  try {
    const url = _sbUrl(), key = _sbKey();
    await fetch(url + '/rest/v1/ventas_diarias?fecha=eq.' + fecha, {
      method: 'DELETE',
      headers: { 'apikey': key, 'Authorization': 'Bearer ' + key, 'Prefer': 'return=minimal' }
    });
    await _sbPost('deleted_log', {
      id: 'del_vd_' + fecha + '_' + Date.now(),
      tabla: 'ventas_diarias',
      registro_id: fecha,
      deleted_at: new Date().toISOString()
    }, true);
    _dot('green');
  } catch(e) { console.warn('[syncBorrarVentaDiaria]', e.message); }
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
  const url    = _sbUrl();
  const sesion = _sesionActiva && _tiendaId;
  document.querySelectorAll('.sheets-status').forEach(el => {
    if (sesion) { el.textContent = 'Sync: ' + _tiendaId; el.style.color = '#16a34a'; }
    else { el.textContent = url ? 'Sin sesion' : 'Sync'; el.style.color = url ? '#d97706' : '#6b7280'; }
  });
}

function _actualizarBadgeSync() {
  const ts = localStorage.getItem('vpos_ultimoSync');
  const el = document.getElementById('ultimoSyncLabel');
  if (!el) return;
  el.textContent = ts
    ? 'Ultimo sync: ' + new Date(ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
    : 'Nunca sincronizado';
}

// =====================================================================
//  🔄 PULL AUTOMÁTICO — revisa cambios cada 30 segundos
//  El push ocurre en cada acción (ya implementado).
//  El pull descarga lo que hicieron los OTROS teléfonos.
// =====================================================================

let _pullTimer = null;
let _ultimaVentaVista = null;  // ID de la última venta que ya teníamos
let _pulling = false;

async function _pullCambios() {
  if (!_sbUrl() || !_sbKey()) return;
  if (_pulling) return;
  _pulling = true;
  try {
    // Solo descargar lo que sea NUEVO desde la última vez
    // Comparamos cantidad de ventas, productos y deleted_log
    const [ventasNuevas, prodsActualizados, deletedNuevos, pagosnNuevos, vdNuevas] = await Promise.all([
      _sbGet('ventas', { select: 'id,fecha_iso,total,pago,vuelto,items,items_json', order: 'fecha_iso.desc', limit: 50 }),
      _sbGet('productos', { select: '*', order: 'updated_at.desc', limit: 200 }),
      _sbGet('deleted_log', { select: '*', order: 'deleted_at.desc', limit: 100 }),
      _sbGet('pagos', { select: '*', order: 'fecha_iso.desc', limit: 100 }).catch(() => []),
      _sbGet('ventas_diarias', { select: '*' }).catch(() => [])
    ]);

    let huboCambios = false;

    // ── Aplicar borrados primero ──────────────────────────────────────
    if (deletedNuevos && deletedNuevos.length) {
      const idsDelLocal = new Set((window._deletedLogVisto || []));
      deletedNuevos.forEach(d => {
        if (!idsDelLocal.has(d.id)) {
          if (d.tabla === 'productos') { productos = productos.filter(p => String(p.id) !== String(d.registro_id)); huboCambios = true; }
          if (d.tabla === 'pagos') { pagos = pagos.filter(g => String(g.id) !== String(d.registro_id)); huboCambios = true; }
          if (d.tabla === 'ventas_diarias') { ventasDiarias = ventasDiarias.filter(v => v.fecha !== d.registro_id); huboCambios = true; }
        }
      });
      window._deletedLogVisto = deletedNuevos.map(d => d.id);
    }

    // ── Ventas nuevas del otro teléfono ───────────────────────────────
    if (ventasNuevas && ventasNuevas.length) {
      const idsLocal = new Set(historial.map(v => v.id));
      ventasNuevas.forEach(r => {
        if (!idsLocal.has(r.id)) {
          let items = [];
          if (r.items_json) { try { items = JSON.parse(r.items_json); } catch(e) {} }
          if (!items.length && r.items) {
            items = r.items.split('|').map(s => {
              const m = s.trim().match(/^(\d+)x\s+(.+)$/);
              if (!m) return null;
              const p = productos.find(x => (x.nom||'').toUpperCase() === m[2].trim().toUpperCase());
              return p ? { id: String(p.id), nom: p.nom, cant: parseInt(m[1])||1, precio: p.venta } : null;
            }).filter(Boolean);
          }
          historial.unshift({
            id: r.id, fechaISO: r.fecha_iso || '',
            ts: r.fecha_iso ? Date.parse(r.fecha_iso) : 0,
            fechaStr: r.fecha_iso ? new Date(r.fecha_iso).toLocaleString('es-SV') : '',
            total: parseFloat(r.total)||0, pago: parseFloat(r.pago)||0,
            vuelto: parseFloat(r.vuelto)||0, items, itemsStr: r.items||''
          });
          huboCambios = true;
        }
      });
      if (huboCambios) historial.sort((a,b) => (b.ts||0)-(a.ts||0));
    }

    // ── Productos actualizados por el otro teléfono ───────────────────
    if (prodsActualizados && prodsActualizados.length) {
      prodsActualizados.forEach(r => {
        const idx = productos.findIndex(p => String(p.id) === String(r.id));
        if (idx >= 0) {
          // Solo actualizar si el updated_at de Supabase es más reciente
          const prodLocal = productos[idx];
          // Actualizar campos no-stock (nom, cat, precios, img, paquetes, etc.)
          // El stock se recalcula con la fusión — no sobreescribir directamente
          if (r.nom !== prodLocal.nom || r.cat !== prodLocal.cat ||
              parseFloat(r.venta) !== prodLocal.venta || parseFloat(r.compra) !== prodLocal.compra ||
              r.img !== prodLocal.img) {
            productos[idx] = {
              ...prodLocal,
              nom: r.nom || prodLocal.nom,
              cat: r.cat || prodLocal.cat,
              compra: parseFloat(r.compra) || prodLocal.compra,
              venta: parseFloat(r.venta) || prodLocal.venta,
              min: parseInt(r.min) || prodLocal.min,
              cod: r.cod || prodLocal.cod,
              abrev: r.abrev || prodLocal.abrev,
              img: r.img !== undefined ? r.img : prodLocal.img,
              paquetes: Array.isArray(r.paquetes) ? r.paquetes : prodLocal.paquetes,
              lotes: Array.isArray(r.lotes) ? r.lotes : prodLocal.lotes
            };
            huboCambios = true;
          }
        } else {
          // Producto nuevo que no tenía este teléfono
          productos.push({
            id: Number(r.id)||Date.now(), nom: r.nom||'', cat: r.cat||'',
            compra: parseFloat(r.compra)||0, venta: parseFloat(r.venta)||0,
            stock: parseInt(r.stock)||0, min: parseInt(r.min)||0,
            cod: r.cod||'', abrev: r.abrev||'', img: r.img||null,
            paquetes: Array.isArray(r.paquetes)?r.paquetes:[],
            lotes: Array.isArray(r.lotes)?r.lotes:[]
          });
          huboCambios = true;
        }
      });
    }

    // ── Pagos/facturas nuevos ─────────────────────────────────────────
    if (pagosnNuevos && pagosnNuevos.length) {
      const idsP = new Set(pagos.map(g => String(g.id)));
      pagosnNuevos.forEach(r => {
        if (!idsP.has(String(r.id))) {
          pagos.push({ id: r.id, concepto: r.nom||'', cat: r.cat||'GASTO',
            monto: parseFloat(r.monto)||0, fechaISO: r.fecha_iso||'',
            ts: r.fecha_iso ? Date.parse(r.fecha_iso) : 0,
            fechaStr: r.fecha_iso ? new Date(r.fecha_iso).toLocaleString('es-SV') : '' });
          huboCambios = true;
        }
      });
      if (huboCambios) pagos.sort((a,b) => (b.ts||0)-(a.ts||0));
    }

    // ── Ventas diarias nuevas ─────────────────────────────────────────
    if (vdNuevas && vdNuevas.length) {
      vdNuevas.forEach(r => {
        const idx = ventasDiarias.findIndex(v => v.fecha === r.fecha);
        if (idx < 0) { ventasDiarias.push({ fecha: r.fecha, monto: parseFloat(r.monto)||0, nota: r.nota||'' }); huboCambios = true; }
      });
      if (huboCambios) ventasDiarias.sort((a,b) => a.fecha.localeCompare(b.fecha));
    }

    // ── Si hubo cambios, guardar y actualizar UI ──────────────────────
    if (huboCambios) {
      await idbSetMany([
        ['vpos_productos', productos],
        ['vpos_historial', historial],
        ['vpos_pagos', pagos],
        ['vpos_ventasDiarias', ventasDiarias]
      ]);
      actualizarTodo();
      _dot('green');
      localStorage.setItem('vpos_ultimoSync', new Date().toISOString());
      _actualizarBadgeSync();
    }
  } catch(e) {
    console.warn('[Pull]', e.message);
  } finally {
    _pulling = false;
  }
}

function iniciarAutoSync() {
  restaurarSesion();
  // Pull cada 30 segundos para recibir cambios de otros teléfonos
  if (_pullTimer) clearInterval(_pullTimer);
  _pullTimer = setInterval(() => {
    if (_sbUrl() && _sbKey()) _pullCambios();
  }, 30000);
  // También hacer un pull inmediato al iniciar
  setTimeout(() => { if (_sbUrl() && _sbKey()) _pullCambios(); }, 3000);
}

function _dot(color) {
  let dot = document.getElementById('syncDot');
  if (!dot) {
    dot = document.createElement('div');
    dot.id = 'syncDot';
    dot.style.cssText = 'position:fixed;top:8px;right:8px;z-index:9999;width:9px;height:9px;border-radius:50%;transition:all .3s;pointer-events:none;';
    document.body.appendChild(dot);
  }
  dot.style.background = { yellow: '#f59e0b', green: '#16a34a', red: '#ef4444' }[color] || '#ccc';
  dot.style.opacity = '1';
  if (color !== 'yellow') setTimeout(() => { dot.style.opacity = '0'; }, color === 'green' ? 2000 : 5000);
}

// =====================================================================
//  EXPORTAR MANUAL
// =====================================================================

async function sheetsExportarProductos() {
  if (!_sbUrl()) { toast('Primero configura Supabase', true); return; }
  toast('Exportando inventario...');
  try {
    await _sbDelete('productos');
    await _subirStockBase();
    toast('Inventario enviado (' + productos.length + ' productos)');
  } catch(e) { toast('Error: ' + e.message, true); }
}

async function sheetsExportarVentasDiarias() {
  if (!_sbUrl()) { toast('Primero configura Supabase', true); return; }
  await _subirVentasDiarias();
  toast('Ventas diarias enviadas');
}

async function sheetsExportarTodo() {
  if (!_sbUrl()) { toast('Primero configura Supabase', true); return; }
  toast('Exportando todo...');
  await _subirStockBase();
  await _subirVentasDiarias();
  await _subirRestockLog();
  await _subirPagos();
  localStorage.setItem('vpos_ultimoSync', new Date().toISOString());
  _actualizarBadgeSync();
  toast('Todo exportado a Supabase');
}

async function testConexionSupabase() {
  const url = (document.getElementById('sbUrlInput')?.value || '').trim().replace(/\/$/, '');
  const key = (document.getElementById('sbKeyInput')?.value || '').trim();
  const btn = document.getElementById('btnTestConexion');
  if (!url || !key) { toast('Ingresa la URL y la Key primero', true); return; }
  if (btn) { btn.disabled = true; btn.textContent = 'Probando...'; }
  try {
    const resp = await fetch(url + '/rest/v1/productos?select=id&limit=1', {
      headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
    });
    if (!resp.ok) { const txt = await resp.text(); throw new Error('HTTP ' + resp.status + ' — ' + txt); }
    toast('Conexion exitosa a Supabase');
  } catch(e) { toast('Error: ' + e.message, true); }
  finally { if (btn) { btn.disabled = false; btn.textContent = 'Probar conexion'; } }
}
