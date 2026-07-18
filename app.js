// ===== SHEETS/SUPABASE — funciones definidas en supabase_sync.js =====
// sheetsEnviar, sheetsImportar, sheetsExportarTodo, etc. → supabase_sync.js

// ===== FIN SHEETS/SUPABASE (todo en supabase_sync.js) =====

/* =====================================================================
   DESPENSA ECONÓMICA — Motor IndexedDB
   Migración automática desde localStorage si hay datos previos.
   Todos los datos se guardan en IndexedDB. localStorage ya no se usa.
   ===================================================================== */

const APP_SCHEMA_VERSION = 4;
const DB_NAME    = 'DespensaEconomicaDB';
const DB_VERSION = 2;          // v2: agrega object store offline_queue
const KV_STORE   = 'kv';
const OQ_STORE   = 'offline_queue'; // cola de operaciones pendientes sin conexión

// ===== 1. CAPA IndexedDB =====

let _db = null;
let _dbPromise = null; // evitar múltiples opens simultáneos

function getDB() {
  if (_db) return Promise.resolve(_db);
  if (_dbPromise) return _dbPromise;
  _dbPromise = _abrirIDB(0).then(db => { _dbPromise = null; return db; })
                             .catch(e => { _dbPromise = null; throw e; });
  return _dbPromise;
}

function _setupUpgrade(db) {
  if (!db.objectStoreNames.contains(KV_STORE)) db.createObjectStore(KV_STORE);
  if (!db.objectStoreNames.contains(OQ_STORE)) {
    const s = db.createObjectStore(OQ_STORE, { keyPath: 'id' });
    s.createIndex('by_ts', 'ts', { unique: false });
  }
}

function _abrirIDB(intento) {
  return new Promise((resolve, reject) => {
    let req;
    try { req = indexedDB.open(DB_NAME, DB_VERSION); }
    catch(e) { return reject(e); }

    req.onupgradeneeded = (e) => {
      try { _setupUpgrade(e.target.result); } catch(ue) {}
    };

    req.onsuccess = (e) => {
      _db = e.target.result;
      // Al detectar que otra pestaña quiere actualizar la versión → cerrar limpiamente
      _db.onversionchange = () => { _db.close(); _db = null; };
      // Al detectar error inesperado en transacción → resetear
      _db.onerror = () => { _db = null; };
      resolve(_db);
    };

    req.onerror = (e) => {
      const msg = (e.target.error || {}).message || 'error desconocido';
      console.warn('[IDB] Error intento ' + intento + ':', msg);
      if (intento < 4) {
        setTimeout(() => _abrirIDB(intento + 1).then(resolve).catch(reject), 500 * (intento + 1));
      } else {
        // Último recurso: borrar la BD corrupta y empezar de cero
        console.warn('[IDB] Intentando recuperación — borrando BD...');
        const del = indexedDB.deleteDatabase(DB_NAME);
        del.onsuccess = () => _abrirIDB(0).then(resolve).catch(reject);
        del.onerror   = () => reject(e.target.error);
      }
    };

    req.onblocked = () => {
      console.warn('[IDB] Bloqueado intento ' + intento + ' — esperando cierre de pestaña anterior...');
      // Esperar más tiempo porque hay otra pestaña/tab con la BD abierta
      if (intento < 6) {
        setTimeout(() => _abrirIDB(intento + 1).then(resolve).catch(reject), 800 * (intento + 1));
      } else {
        reject(new Error('IDB bloqueado persistente'));
      }
    };
  });
}

async function idbGet(key) {
  const db = await getDB();
  return new Promise((res, rej) => {
    const req = db.transaction(KV_STORE, 'readonly').objectStore(KV_STORE).get(key);
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}

async function idbSet(key, value) {
  const db = await getDB();
  return new Promise((res, rej) => {
    const req = db.transaction(KV_STORE, 'readwrite').objectStore(KV_STORE).put(value, key);
    req.onsuccess = () => res();
    req.onerror   = () => rej(req.error);
  });
}

async function idbSetMany(entries) {
  const db = await getDB();
  return new Promise((res, rej) => {
    const tx    = db.transaction(KV_STORE, 'readwrite');
    const store = tx.objectStore(KV_STORE);
    entries.forEach(([k, v]) => store.put(v, k));
    tx.oncomplete = () => res();
    tx.onerror    = () => rej(tx.error);
  });
}

async function idbGetMany(keys) {
  const db = await getDB();
  return new Promise((res, rej) => {
    const tx      = db.transaction(KV_STORE, 'readonly');
    const store   = tx.objectStore(KV_STORE);
    const results = {};
    let pending   = keys.length;
    if (!pending) { res(results); return; }
    keys.forEach(k => {
      const req = store.get(k);
      req.onsuccess = () => {
        results[k] = req.result;
        if (--pending === 0) res(results);
      };
      req.onerror = () => rej(req.error);
    });
  });
}

// ===== 1b. COLA OFFLINE — operaciones pendientes cuando no hay internet =====

async function oqPush(operacion, datos) {
  const db = await getDB();
  return new Promise((res, rej) => {
    const entry = { id: 'oq_' + Date.now() + '_' + Math.random().toString(36).slice(2,6), ts: Date.now(), operacion, datos };
    const req = db.transaction(OQ_STORE, 'readwrite').objectStore(OQ_STORE).add(entry);
    req.onsuccess = () => res(entry.id);
    req.onerror   = () => rej(req.error);
  });
}

async function oqGetAll() {
  const db = await getDB();
  return new Promise((res, rej) => {
    const req = db.transaction(OQ_STORE, 'readonly').objectStore(OQ_STORE).index('by_ts').getAll();
    req.onsuccess = () => res(req.result || []);
    req.onerror   = () => rej(req.error);
  });
}

async function oqDelete(id) {
  const db = await getDB();
  return new Promise((res, rej) => {
    const req = db.transaction(OQ_STORE, 'readwrite').objectStore(OQ_STORE).delete(id);
    req.onsuccess = () => res();
    req.onerror   = () => rej(req.error);
  });
}

async function oqCount() {
  const db = await getDB();
  return new Promise((res, rej) => {
    const req = db.transaction(OQ_STORE, 'readonly').objectStore(OQ_STORE).count();
    req.onsuccess = () => res(req.result || 0);
    req.onerror   = () => rej(req.error);
  });
}

async function migrarDesdeLocalStorage() {
  // Si ya migramos antes, no repetir
  const yaMigrado = await idbGet('_migrated_from_ls');
  if (yaMigrado) return false;

  const lsKeys = [
    'vpos_productos','vpos_ventasDia','vpos_ventasSem','vpos_ventasMes',
    'vpos_historial','vpos_pagos','vpos_ventasDiarias','vpos_restockLog',
    'vpos_efectivoInicial','vpos_inventarioInicial',
    'vpos_ultimoBackup','vpos_pagina','vpos_tabGasto','vpos_schemaVersion'
  ];

  const hayDatos = lsKeys.some(k => localStorage.getItem(k) !== null);
  if (!hayDatos) {
    // Sin datos en LS, marcar igual para no volver a intentar
    await idbSet('_migrated_from_ls', true);
    return false;
  }

  setLoadingMsg('Migrando datos desde almacenamiento anterior…');

  const entries = [['_migrated_from_ls', true]];
  lsKeys.forEach(k => {
    const raw = localStorage.getItem(k);
    if (raw === null) return;
    try {
      entries.push([k, JSON.parse(raw)]);
    } catch {
      entries.push([k, raw]);
    }
  });

  await idbSetMany(entries);

  // Limpiar localStorage después de migración exitosa
  lsKeys.forEach(k => localStorage.removeItem(k));
  localStorage.setItem('vpos_migrated_to_idb', '1');

  console.log('[IDB] Migración desde localStorage completada.');
  return true;
}

// ===== VALIDACIÓN DE FECHA DE REPORTES =====
// ventasDia/Sem/Mes se guardan en IDB sin fecha. Si el dispositivo
// no se usó en un día, al abrir mostraría datos viejos.
// Esta función valida y resetea los reportes si el período cambió.

function _validarFechaReportes() {
  const ahora    = new Date();
  const hoyStr   = ahora.toDateString();           // "Mon Jan 06 2025"
  const mesStr   = ahora.getFullYear() + '-' + ahora.getMonth(); // "2025-0"
  const lunesStr = _lunesDeLaSemanaStr();

  const guardado = {
    dia:  localStorage.getItem('vpos_reporteFechaDia'),
    sem:  localStorage.getItem('vpos_reporteFechaSem'),
    mes:  localStorage.getItem('vpos_reporteFechaMes'),
  };

  let cambio = false;
  if (guardado.dia !== hoyStr) {
    ventasDia = {};
    localStorage.setItem('vpos_reporteFechaDia', hoyStr);
    // ── FIX: nuevo día natural → limpiar timestamp de reset manual ──
    localStorage.removeItem('vpos_reinicioDiaTs');
    localStorage.removeItem('vpos_reinicioDiaFecha');
    cambio = true;
    console.log('[Fecha] Nuevo día — ventasDia reseteado');
  }
  if (guardado.sem !== lunesStr) {
    ventasSem = {};
    localStorage.setItem('vpos_reporteFechaSem', lunesStr);
    cambio = true;
    console.log('[Fecha] Nueva semana — ventasSem reseteado');
  }
  if (guardado.mes !== mesStr) {
    ventasMes = {};
    localStorage.setItem('vpos_reporteFechaMes', mesStr);
    cambio = true;
    console.log('[Fecha] Nuevo mes — ventasMes reseteado');
  }
  return cambio;
}

function _lunesDeLaSemanaStr() {
  const hoy = new Date();
  const dia = hoy.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + diff);
  return lunes.toDateString();
}

// Recalcular ventasDia/Sem/Mes desde el historial en memoria (fuente de verdad)
// ── FIX: helper para leer el timestamp del último reset manual del día ──
function _getReinicioDiaTs() {
  const ts    = localStorage.getItem('vpos_reinicioDiaTs');
  const fecha = localStorage.getItem('vpos_reinicioDiaFecha');
  // Solo aplica si el reset fue hoy (no de un día anterior)
  if (!ts || !fecha || fecha !== new Date().toDateString()) return null;
  return new Date(ts);
}

function _recalcularReportesDesdeHistorial() {
  const ahora      = new Date();
  const hoy        = ahora.toDateString();
  const lunes      = typeof _lunesDeLaSemana === 'function' ? _lunesDeLaSemana() : new Date();
  // ── FIX: respetar corte del reset manual ──
  const resetTs    = _getReinicioDiaTs();
  ventasDia = {}; ventasSem = {}; ventasMes = {};
  (historial || []).forEach(v => {
    if (!v.fechaISO && !v.fecha) return;
    const fecha  = new Date(v.fechaISO || v.fecha);
    const esHoy  = fecha.toDateString() === hoy;
    const esSem  = fecha >= lunes;
    const esMes  = fecha.getMonth() === ahora.getMonth() && fecha.getFullYear() === ahora.getFullYear();
    // Si hay reset manual hoy, ignorar ventas anteriores al corte en ventasDia
    const pasaCorte = !esHoy || !resetTs || fecha >= resetTs;
    (v.items || []).forEach(it => {
      const pid  = String(it.id || ''); if (!pid || pid === 'null') return;
      const cant = Number(it.cant || 0);
      // Lógica: if (hayPromocion) total = precioPromocion × cantPaquetes
      //         else               total = cantidad × precioUnitario
      // totalItem es la fuente de verdad cuando existe (ventas nuevas).
      // Para ventas antiguas: usar cantCobrada (paquetes facturados) × precio.
      // El fallback cant×precio era incorrecto porque cant=unidades_físicas
      // y precio=precio_paquete → resultado inflado.
      let tot;
      if (it.totalItem !== undefined) {
        tot = Number(it.totalItem);                         // fuente exacta
      } else if (it.cantCobrada !== undefined) {
        tot = Number(it.cantCobrada) * Number(it.precio || 0); // billing × precio
      } else if (it.esPromo || it.paqueteLabel) {
        // Venta antigua de paquete sin cantCobrada: precio YA es el precio del paquete.
        // No podemos saber cuántos paquetes fueron, asumimos 1 por entrada.
        tot = Number(it.precio || 0);
      } else {
        tot = cant * Number(it.precio || 0);                // normal: unidades × precio
      }
      const base = { id: pid, nom: it.nom || '', cat: it.cat || '', cant: 0, total: 0 };
      if (esHoy && pasaCorte) { if (!ventasDia[pid]) ventasDia[pid] = {...base}; ventasDia[pid].cant += cant; ventasDia[pid].total += tot; }
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

let productos     = [];
let ventasDia     = {};
let ventasSem     = {};
let ventasMes     = {};
let historial     = [];
let pagos         = [];
let ventasDiarias = [];
let restockLog    = []; // registro de entradas de stock para fusión correcta
let carrito       = [];
let cobroDigits   = '';
let productosEliminados = []; // IDs de productos borrados — evita que vuelvan al fusionar
let pagosEliminados     = []; // IDs de pagos/gastos borrados — evita que vuelvan desde Supabase
let cobrosEliminados    = []; // IDs de cobros borrados por devolución — evita que vuelvan al fusionar
let ventasDiariasEliminadas = []; // fechas YYYY-MM-DD borradas — evita que vuelvan al fusionar

let efectivoInicial   = 0;
let inventarioInicial = 0; // precio venta × stock (baseline del mes)
let inventarioCosto   = 0; // precio compra × stock (valor real de la inversión)
let tabGasto          = 'mes';
let _paginaActual     = 'pgDash';
let _ultimoBackup     = null;
let _backupNum        = 0;    // contador auto-incremental de backups
let _datosAFusionar   = null;

let facturaNum    = 0;  // contador del registro de control de mercadería

let _destPeriodo = 'semana1';
const PERIODOS_DEST = {
  semana1: { label: 'Última semana',   dias: 7  },
  semana2: { label: 'Últimas 2 semanas', dias: 14 },
  semana3: { label: 'Últimas 3 semanas', dias: 21 },
  mes:     { label: 'Último mes',       dias: 30 }
};

// ===== 4. PERSISTENCIA =====

let _salvarTimer = null;
function salvar(doRender = true) {
  clearTimeout(_salvarTimer);
  _salvarTimer = setTimeout(() => {
    // ── 1. Supabase: tablas individuales (ventas, productos, pagos…) ──
    if (typeof syncAhora === 'function') syncAhora('todo');

    // ── 2. Snapshot automático — mismo mecanismo que "Enviar mis datos" ──
    if (typeof _autoEnviarSnapshot === 'function') _autoEnviarSnapshot();

    // ── 3. IDB como caché offline en paralelo ──
    const _ahora = new Date();
    // Actualizar marcas de fecha para que _validarFechaReportes sepa que estos datos son de hoy
    localStorage.setItem('vpos_reporteFechaDia', _ahora.toDateString());
    localStorage.setItem('vpos_reporteFechaMes', _ahora.getFullYear() + '-' + _ahora.getMonth());
    idbSetMany([
      ['vpos_productos',           productos],
      ['vpos_ventasDia',           ventasDia],
      ['vpos_ventasSem',           ventasSem],
      ['vpos_ventasMes',           ventasMes],
      ['vpos_historial',           historial],
      ['vpos_pagos',               pagos],
      ['vpos_ventasDiarias',       ventasDiarias],
      ['vpos_restockLog',          restockLog],
      ['vpos_productosEliminados', productosEliminados],
      ['vpos_pagosEliminados',     pagosEliminados],
      ['vpos_cobrosEliminados',    cobrosEliminados],
      ['vpos_ventasDiariasElim',   ventasDiariasEliminadas],
    ]).catch(err => {
      console.warn('[IDB caché] Error:', err);
    });
  }, 80);

  if (doRender) actualizarTodo();
}

function salvarSesion() {
  idbSet('vpos_tabGasto', tabGasto).catch(console.error);
  const pg = document.querySelector('.page.active');
  if (pg) {
    _paginaActual = pg.id;
    idbSet('vpos_pagina', pg.id).catch(console.error);
  }
}

// ===== 5. CARGA =====

// Carga datos de sesión/UI desde IDB (no van a Supabase)
async function _cargarMetadatosIDB() {
  const keys = [
    'vpos_efectivoInicial','vpos_inventarioInicial','vpos_inventarioCosto',
    'vpos_ultimoBackup','vpos_backupNum','vpos_pagina','vpos_tabGasto',
    'vpos_facturaNum','vpos_stockInicialSnap'
  ];
  const data = await idbGetMany(keys);

  const ef = data['vpos_efectivoInicial'];
  efectivoInicial   = (ef !== undefined && ef !== null) ? parseFloat(ef) || 0 : 0;
  const inv = data['vpos_inventarioInicial'];
  inventarioInicial = (inv !== undefined && inv !== null) ? parseFloat(inv) || 0 : 0;
  const invC = data['vpos_inventarioCosto'];
  inventarioCosto   = (invC !== undefined && invC !== null) ? parseFloat(invC) || 0 : 0;
  _ultimoBackup = data['vpos_ultimoBackup'] || null;
  _backupNum    = Number(data['vpos_backupNum'] || 0);
  facturaNum    = Number(data['vpos_facturaNum'] || 0);
  _paginaActual = data['vpos_pagina']       || 'pgDash';
  tabGasto      = data['vpos_tabGasto']     || 'mes';
  window._stockInicialSnap = data['vpos_stockInicialSnap'] || null;

  // ── Reinicio único del contador: los números anteriores fueron de prueba
  //    mientras el sistema se llamaba "Factura Digital". Ahora que es
  //    "Registro de Control de Mercadería", el conteo arranca de nuevo desde 0.
  const _yaMigrado = await idbGet('vpos_registroMigradoV1').catch(() => null);
  if (!_yaMigrado) {
    facturaNum = 0;
    await idbSet('vpos_facturaNum', 0).catch(console.error);
    await idbSet('vpos_registroMigradoV1', true).catch(console.error);
  }
}

// Carga caché IDB como fallback offline (datos de negocio)
async function _cargarCacheIDB() {
  const keys = [
    'vpos_productos','vpos_ventasDia','vpos_ventasSem','vpos_ventasMes',
    'vpos_historial','vpos_pagos','vpos_ventasDiarias','vpos_restockLog',
    'vpos_productosEliminados','vpos_pagosEliminados','vpos_cobrosEliminados','vpos_ventasDiariasElim'
  ];
  const data = await idbGetMany(keys);
  productos             = data['vpos_productos']           || [];
  ventasDia             = data['vpos_ventasDia']           || {};
  ventasSem             = data['vpos_ventasSem']           || {};
  ventasMes             = data['vpos_ventasMes']           || {};
  historial             = data['vpos_historial']           || [];
  pagos                 = data['vpos_pagos']               || [];
  ventasDiarias         = data['vpos_ventasDiarias']       || [];
  restockLog            = data['vpos_restockLog']          || [];
  productosEliminados   = data['vpos_productosEliminados'] || [];
  pagosEliminados       = data['vpos_pagosEliminados']     || [];
  cobrosEliminados      = data['vpos_cobrosEliminados']    || [];
  ventasDiariasEliminadas = data['vpos_ventasDiariasElim'] || [];
  ventasDia = normalizeReport(ventasDia);
  ventasSem = normalizeReport(ventasSem);
  ventasMes = normalizeReport(ventasMes);
  historial = normalizeHistorial(historial);
  pagos     = normalizePagos(pagos);

  // Validar fechas: si cambió el día/semana/mes, resetear el reporte correspondiente
  // Esto evita que aparezcan datos de ayer en la pantalla al abrir la app
  _validarFechaReportes();
}

async function cargarDatos() {
  // 1. Metadatos de sesión/UI siempre desde IDB (rápido, no van a Supabase)
  await _cargarMetadatosIDB();

  // 2. Si hay sesión activa → cargar datos desde Supabase (fuente de verdad)
  //    Si Supabase falla o no hay sesión → usar caché IDB como fallback
  const tieneSupabase = typeof _sbUrl === 'function' && _sbUrl() && _sbKey();
  const tieneSesion   = typeof _sesionActiva !== 'undefined' && _sesionActiva;

  if (tieneSupabase && tieneSesion) {
    try {
      // Supabase cargará los datos en _autoCargarDesdeSupa() al restaurar sesión.
      // Aquí precargamos IDB para que la UI no quede vacía mientras llega Supabase.
      await _cargarCacheIDB();
      console.log('[Carga] Cache IDB mostrado — Supabase cargará en segundo plano.');
    } catch(e) {
      console.warn('[Carga] Error leyendo caché IDB, UI vacía hasta que llegue Supabase:', e.message);
    }
  } else {
    // Sin sesión todavía: mostrar caché IDB (o vacío si primera vez)
    await _cargarCacheIDB();
  }

  // Persistir versión de schema
  idbSet('vpos_schemaVersion', String(APP_SCHEMA_VERSION)).catch(console.error);
}

async function migrateAndLoad() {
  await migrarDesdeLocalStorage();
  await cargarDatos();
}

// ===== 6. HELPERS GENERALES =====

function nowISO() { return new Date().toISOString(); }
// ===== SONIDO DE CARRITO (Web Audio API — sin archivos externos) =====
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}
function sonidoCarrito() {
  try {
    const ctx = getAudioCtx();
    const t = ctx.currentTime;

    // Sonido de lector de código de barras:
    // Beep corto, agudo, con ataque casi instantáneo y caída rápida
    // Un solo tono puro ~1900Hz, duración ~80ms — igual que un lector Honeywell/Zebra
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'square';              // onda cuadrada: más "electrónico" que sine
    osc.frequency.setValueAtTime(1900, t);

    // Envolvente: ataque 2ms, sostenido 70ms, caída 15ms
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.28, t + 0.002);
    gain.gain.setValueAtTime(0.28, t + 0.072);
    gain.gain.linearRampToValueAtTime(0, t + 0.087);

    osc.start(t);
    osc.stop(t + 0.09);
  } catch(e) {}
}
// ===== ACTUALIZACIÓN RÁPIDA DE STOCK EN TABLA (sin rerenderizar todo) =====
function actualizarStockFila(p) {
  // Solo si la página de inventario está visible
  const tbody = document.getElementById('tbodyInv');
  if (!tbody || !document.getElementById('pgInventario')?.classList.contains('active')) return;
  // Buscar la fila por el botón que tiene el id del producto
  const btns = tbody.querySelectorAll('button[onclick]');
  for (const btn of btns) {
    if (btn.getAttribute('onclick')?.includes(`editarProd(${p.id})`)) {
      const row = btn.closest('tr');
      if (!row) break;
      // Actualizar solo la celda de stock (columna 7, índice 6)
      const critico = (p.stock || 0) <= (p.min || 0);
      const celdaStock = row.cells[6];
      if (celdaStock) {
        celdaStock.innerHTML = critico
          ? `<span class="badge badge-red">! ${p.stock || 0}</span>`
          : `<span class="badge badge-green">${p.stock || 0}</span>`;
        if (critico) row.classList.add('row-critico');
      }
      // Actualizar celda de valor (columna 8, índice 7)
      const celdaVal = row.cells[7];
      if (celdaVal) celdaVal.innerHTML = `<span class="mono td-green" style="font-weight:900;">$${_ventaTotalProd(p).toFixed(2)}</span>`;
      break;
    }
  }
}

// ===== PANEL DE CAJA =====
function renderCajaPanelMini() {
  // Resumen rápido en el botón del dashboard
  const el = document.getElementById('cajaPanelResumen');
  if (!el) return;
  const { compra: invC } = calcValorInventario();
  const mes = (ventasDiarias||[]).filter(v=>esMesActual(v.fecha+'T00:00:00')).reduce((s,v)=>s+Number(v.monto||0),0);
  const gastos = pagos.filter(g=>esMesActual(g.fechaISO)&&(g.cat==='GASTO'||g.cat==='FACTURA')).reduce((s,g)=>s+Number(g.monto||0),0);
  const caja = efectivoInicial + mes - gastos;
  const capital = caja + invC;
  el.innerHTML = `
    <div style="font-size:11px;color:#a7f3d0;font-weight:700;">Caja</div>
    <div style="font-size:16px;font-weight:900;color:#fff;font-family:'Space Mono',monospace;">$${caja.toFixed(2)}</div>
    <div style="font-size:10px;color:#6ee7b7;font-weight:700;">Capital $${capital.toFixed(2)}</div>`;
  // Also update fecha labels
  const f1 = document.getElementById('cajaPanelFecha');
  const f2 = document.getElementById('cajaPanelFecha2');
  const mesNombre = new Date().toLocaleDateString('es-SV',{month:'long',year:'numeric'});
  const mn = mesNombre.charAt(0).toUpperCase()+mesNombre.slice(1);
  if (f1) f1.textContent = mn;
  if (f2) f2.textContent = mn;
}

function renderCajaPanel() {
  // Use sub-page containers if on pgEstadoCaja, else the hidden ones on pgDash
  const onSub = document.getElementById('pgEstadoCaja')?.classList?.contains('active');
  const grid    = document.getElementById(onSub ? 'cajaGridPrincipalSub' : 'cajaGridPrincipal');
  const flujo   = document.getElementById(onSub ? 'cajaFlujoMesSub'      : 'cajaFlujoMes');
  const balance = document.getElementById(onSub ? 'cajaBalanceFinalSub'  : 'cajaBalanceFinal');
  const fecha   = document.getElementById(onSub ? 'cajaPanelFecha2'      : 'cajaPanelFecha');
  if (!grid) { renderCajaPanelMini(); return; }
  renderCajaPanelMini();

  // ── Datos base ──────────────────────────────────────────────────────────────
  const ahora              = new Date();
  const diasMes            = new Date(ahora.getFullYear(), ahora.getMonth()+1, 0).getDate();
  const diaActual          = ahora.getDate();
  const mesNombre          = ahora.toLocaleDateString('es-SV', {month:'long', year:'numeric'});
  const hoyISO             = _fechaLocalISO(ahora); // "YYYY-MM-DD" (fecha LOCAL, no UTC)

  // Inventario actual
  const { compra: invCompra, venta: invVenta } = calcValorInventario();

  // Ventas acumuladas del mes (del POS)
  const ventasMesTotal     = totalReporte(ventasMes);
  // Ventas de hoy (POS)
  const ventasHoyTotal     = totalReporte(ventasDia);

  // ── FUENTE ÚNICA DE VERDAD PARA CAPITAL: ventasDiarias ──
  // El historial y ventasDia son contadores de reporte — NUNCA tocan cajaActual ni capitalTotal
  const ventaDiariaHoy     = (ventasDiarias || []).find(v => v.fecha === hoyISO);
  const hoyYaRegistrado    = !!ventaDiariaHoy;
  const ventasHoyEnCaja    = hoyYaRegistrado ? Number(ventaDiariaHoy.monto || 0) : 0;
  // Suma de todos los días registrados formalmente en el mes actual
  const totalVentasDiariasDelMes = (ventasDiarias || [])
    .filter(v => esMesActual(v.fecha + 'T00:00:00'))
    .reduce((s, v) => s + Number(v.monto || 0), 0);
  // entroACaja = ventas confirmadas del mes (para mostrar en panel de flujo)
  const entroACaja         = totalVentasDiariasDelMes;

  // Promedio diario basado en días con ventas registradas
  const diasConVentas      = (ventasDiarias || []).filter(v => esMesActual(v.fecha + 'T00:00:00')).length;
  const promedioDiario     = diasConVentas > 0
    ? (ventasDiarias || []).filter(v => esMesActual(v.fecha + 'T00:00:00')).reduce((s,v) => s + Number(v.monto||0), 0) / diasConVentas
    : (ventasMesTotal > 0 && diaActual > 0 ? ventasMesTotal / diaActual : 0);

  // Gastos del mes (facturas + pagos)
  const gastosMes          = pagos.filter(g => esMesActual(g.fechaISO));
  const totalFacturas      = gastosMes.filter(g => g.cat === 'FACTURA').reduce((s,g) => s + Number(g.monto||0), 0);
  const totalGastosOtros   = gastosMes.filter(g => g.cat === 'GASTO').reduce((s,g) => s + Number(g.monto||0), 0);
  const totalEgresos       = totalFacturas + totalGastosOtros;

  // Inventario: lo que salió (a precio compra) vs lo que entró a caja
  const invSalido          = invCompra > 0
    ? Math.max(0, inventarioInicial - invCompra)   // reducción del valor de inventario
    : 0;

  // Caja actual = efectivo inicial + ventas formalmente registradas por día - egresos
  // El historial de cobros NO se suma aquí — ya está capturado en ventasDiarias al registrar cada día
  const cajaActual         = efectivoInicial + totalVentasDiariasDelMes - totalEgresos;

  const salioDeCaja        = totalEgresos;

  const comprasMes         = pagos.filter(g => esMesActual(g.fechaISO) && g.cat === 'COMPRA')
                               .reduce((s,g) => s + Number(g.monto||0), 0);

  // ── COGS: Costo de lo Vendido en el mes ─────────────────────────────────────
  // Para cada venta del mes, suma costoItem (guardado al vender) o estima con
  // precio compra actual del producto si la venta es antigua y no tiene costo guardado.
  const cogsDelMes = (historial || [])
    .filter(v => esMesActual(v.fechaISO))
    .reduce((total, venta) => {
      return total + (venta.items || []).reduce((s, it) => {
        if (it.costoItem !== undefined) return s + Number(it.costoItem || 0);
        // fallback para ventas antiguas sin costoItem: buscar precio compra actual
        const prod = (productos || []).find(x => String(x.id) === String(it.id));
        const costoUnit = prod ? (Number(prod.compra) || 0) : 0;
        return s + costoUnit * Number(it.cant || 0);
      }, 0);
    }, 0);

  // ── Capital y Ganancia Real ──────────────────────────────────────────────────
  // Capital Total = caja actual + inventario ACTUAL a precio costo (tiempo real)
  // Usar inventarioInicial inflaba el capital con cada venta porque la caja subía
  // pero el inventario fijo no bajaba. Ahora ambos son valores en tiempo real.
  const capitalTotal       = cajaActual + invCompra;
  // capitalInicial sigue usando inventarioInicial (fijo) — es el baseline del mes
  // para comparar cuánto tenías vs cuánto tienes ahora.
  const capitalInicial     = efectivoInicial + inventarioInicial;

  // Ganancia Bruta = Ventas confirmadas − COGS (margen real de lo vendido)
  const gananciaBruta      = totalVentasDiariasDelMes - cogsDelMes;
  // Ganancia Neta  = Ganancia Bruta − Gastos operativos (facturas + gastos, NO compras de inventario)
  const gananciaNeta       = gananciaBruta - totalEgresos;
  // Para compatibilidad con el badge de capital (flujo de caja):
  const ganancia           = gananciaNeta;
  const esGanancia         = ganancia >= 0;

  // Proyección al cierre del mes
  const proyeccionMes      = promedioDiario * diasMes;
  const diasRestantes      = diasMes - diaActual;

  // ── Actualizar fecha ────────────────────────────────────────────────────────
  if (fecha) fecha.textContent = mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1);

  // ── Variables extra para el rediseño ───────────────────────────────────────
  // invCostoBase: inventario inicial a precio compra (fijo del mes).
  // Fallback a inventarioInicial (también fijo) si inventarioCosto aún no fue sincronizado.
  // NUNCA usar invCompra como fallback — ese es tiempo real y cambia con cada venta.
  const invCostoBase       = (typeof inventarioCosto !== 'undefined' && inventarioCosto > 0)
                               ? inventarioCosto
                               : (inventarioInicial > 0 ? inventarioInicial * 0.7 : 0);
  // 0.7 es un margen estimado si no hay dato de costo — se reemplaza al sincronizar
  const capitalTotalCosto  = cajaActual + invCompra;   // informativo (costo real)
  const capitalTotalVenta  = cajaActual + invVenta;    // informativo (potencial)
  const margenMes          = totalVentasDiariasDelMes > 0
    ? Math.round(((totalVentasDiariasDelMes - cogsDelMes) / totalVentasDiariasDelMes) * 100)
    : 0;
  const totalUnidades      = (productos||[]).reduce((s,p) => s + (Number(p.stock)||0), 0);
  const gananciaPotencial  = invVenta - invCompra;
  const esGN               = gananciaNeta >= 0;

  // ── Helper de card ──────────────────────────────────────────────────────────
  const card = (icon, lbl, val, sub, color='#111827', bg='#fff', border='#e5e7eb') =>
    `<div style="background:${bg};border:1.5px solid ${border};border-radius:12px;padding:12px 14px;">
      <div style="font-size:10px;font-weight:900;color:#6b7280;text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px;">${icon} ${lbl}</div>
      <div style="font-size:22px;font-weight:900;color:${color};font-family:'Space Mono',monospace;">${val}</div>
      <div style="font-size:10px;color:#9ca3af;margin-top:3px;font-weight:700;">${sub}</div>
    </div>`;

  // ═══════════════════════════════════════════════════════════════════════════
  // SECCIÓN 1 — CAJA
  // ═══════════════════════════════════════════════════════════════════════════
  const hoyPendienteTxt = !hoyYaRegistrado && ventasHoyTotal > 0
    ? `<div style="margin-top:5px;background:#fef3c7;border:1px solid #fcd34d;border-radius:7px;padding:4px 8px;font-size:11px;font-weight:800;color:#92400e;">⏳ Hoy $${ventasHoyTotal.toFixed(2)} pendiente — registra en Ventas por Día</div>`
    : (hoyYaRegistrado ? `<div style="margin-top:5px;background:#dcfce7;border:1px solid #86efac;border-radius:7px;padding:4px 8px;font-size:11px;font-weight:800;color:#15803d;">✅ Hoy registrado: $${ventasHoyEnCaja.toFixed(2)}</div>` : '');

  grid.innerHTML = `
    <!-- ══ 1. CAJA ══════════════════════════════════════════════ -->
    <div style="background:#fff;border:2px solid #86efac;border-radius:14px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#065f46,#047857);padding:11px 16px;display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;background:rgba(255,255,255,.2);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;">💵</div>
        <div><div style="font-size:13px;font-weight:900;color:#fff;">CAJA</div>
        <div style="font-size:11px;color:#a7f3d0;font-weight:700;">Dinero físico disponible</div></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;padding:12px 14px;">
        ${card('🏁','Caja Inicial','$'+efectivoInicial.toFixed(2),'Dinero al inicio del mes','#0369a1','#f0f9ff','#7dd3fc')}
        ${card('📈','Entró a Caja','$'+entroACaja.toFixed(2),'Ventas cobradas del mes','#15803d','#f0fdf4','#86efac')}
        ${card('📤','Salió de Caja','$'+totalEgresos.toFixed(2),'Gastos + facturas del mes',totalEgresos>0?'#dc2626':'#6b7280',totalEgresos>0?'#fef2f2':'#f9fafb',totalEgresos>0?'#fca5a5':'#e5e7eb')}
        <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #22c55e;border-radius:12px;padding:12px 14px;">
          <div style="font-size:10px;font-weight:900;color:#15803d;text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px;">💵 CAJA ACTUAL</div>
          <div style="font-size:22px;font-weight:900;color:#15803d;font-family:'Space Mono',monospace;">$${cajaActual.toFixed(2)}</div>
          <div style="font-size:10px;color:#4ade80;margin-top:3px;font-weight:700;">Dinero disponible ahora</div>
          ${hoyPendienteTxt}
        </div>
      </div>
      <div style="background:#f0fdf4;border-top:1px solid #bbf7d0;padding:7px 14px;font-size:11px;color:#15803d;font-weight:700;">
        ℹ️ Caja Actual = $${efectivoInicial.toFixed(2)} + $${entroACaja.toFixed(2)} − $${totalEgresos.toFixed(2)} = $${cajaActual.toFixed(2)}
      </div>
    </div>

    <!-- ══ 2. INVENTARIO INICIAL (fijo del mes) ══════════════════ -->
    <div style="background:#fff;border:2px solid #fcd34d;border-radius:14px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#78350f,#92400e);padding:11px 16px;display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;background:rgba(255,255,255,.2);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;">📦</div>
        <div><div style="font-size:13px;font-weight:900;color:#fff;">INVENTARIO INICIAL</div>
        <div style="font-size:11px;color:#fde68a;font-weight:700;">Valor fijo al inicio del mes — no cambia con las ventas</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:12px 14px;">
        <div style="background:#fffbeb;border:2px solid #fcd34d;border-radius:12px;padding:12px 14px;">
          <div style="font-size:10px;font-weight:900;color:#92400e;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">💰 A PRECIO DE VENTA</div>
          <div style="font-size:22px;font-weight:900;color:#d97706;font-family:'Space Mono',monospace;">$${inventarioInicial.toFixed(2)}</div>
          <div style="font-size:10px;color:#b45309;margin-top:3px;font-weight:700;">Stock inicial × precio venta</div>
          <div style="margin-top:5px;font-size:9px;background:#fef3c7;color:#92400e;padding:3px 6px;border-radius:5px;font-weight:900;">📊 Valor potencial al inicio</div>
        </div>
        <div style="background:#f0f9ff;border:2px solid #7dd3fc;border-radius:12px;padding:12px 14px;">
          <div style="font-size:10px;font-weight:900;color:#0369a1;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">🏷️ A PRECIO DE COSTO</div>
          <div style="font-size:22px;font-weight:900;color:#0369a1;font-family:'Space Mono',monospace;">$${invCostoBase.toFixed(2)}</div>
          <div style="font-size:10px;color:#38bdf8;margin-top:3px;font-weight:700;">Stock inicial × precio compra</div>
          <div style="margin-top:5px;font-size:9px;background:#e0f2fe;color:#0369a1;padding:3px 6px;border-radius:5px;font-weight:900;">📌 Tu inversión real al inicio</div>
        </div>
      </div>
      <div style="background:#fffbeb;border-top:1px solid #fde68a;padding:7px 14px;font-size:11px;color:#92400e;font-weight:700;">
        ℹ️ Se fijan el 1° del mes. Actualízalos en Inventario → Capital e Inventario → 🔄 Recalcular
      </div>
    </div>

    <!-- ══ 3. INVENTARIO ACTUAL ════════════════════════════════════ -->
    <div style="background:#fff;border:2px solid #7dd3fc;border-radius:14px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#0369a1,#0284c7);padding:11px 16px;display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;background:rgba(255,255,255,.2);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;">📦</div>
        <div><div style="font-size:13px;font-weight:900;color:#fff;">INVENTARIO ACTUAL</div>
        <div style="font-size:11px;color:#bae6fd;font-weight:700;">Valor en tiempo real del stock disponible hoy</div></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;padding:12px 14px;">
        ${card('🏷️','Valor a Costo','$'+invCompra.toFixed(2),'Suma de (costo × stock)','#7c3aed','#faf5ff','#a855f7')}
        ${card('💰','Valor a Precio Venta','$'+invVenta.toFixed(2),'Suma de (precio venta × stock)','#0369a1','#f0f9ff','#7dd3fc')}
        ${card('📈','Ganancia Potencial','$'+gananciaPotencial.toFixed(2),'Valor venta − Valor costo',gananciaPotencial>=0?'#15803d':'#dc2626',gananciaPotencial>=0?'#f0fdf4':'#fef2f2',gananciaPotencial>=0?'#86efac':'#fca5a5')}
      </div>
      <div style="background:#f0f9ff;border-top:1px solid #bae6fd;padding:7px 14px;font-size:11px;color:#0369a1;font-weight:700;">
        ℹ️ Ganancia potencial no es dinero en caja. Es el valor que podrías ganar si vendes todo.
      </div>
    </div>

    <!-- ══ 4. RENDIMIENTO DEL MES ══════════════════════════════════ -->
    <div style="background:#fff;border:2px solid ${esGN?'#86efac':'#fca5a5'};border-radius:14px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,${esGN?'#064e3b,#065f46':'#7f1d1d,#991b1b'});padding:11px 16px;display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;background:rgba(255,255,255,.2);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;">📊</div>
        <div><div style="font-size:13px;font-weight:900;color:#fff;">RENDIMIENTO DEL MES</div>
        <div style="font-size:11px;color:${esGN?'#a7f3d0':'#fca5a5'};font-weight:700;">Resumen de ventas y utilidad</div></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;padding:12px 14px;">
        ${card('🛒','Ventas Totales','$'+totalVentasDiariasDelMes.toFixed(2),'Total vendido en el mes','#15803d','#f0fdf4','#86efac')}
        ${card('📦','Costo de Ventas','$'+cogsDelMes.toFixed(2),'Costo de productos vendidos','#7c3aed','#faf5ff','#c4b5fd')}
        ${card('🧾','Gastos del Mes','$'+totalEgresos.toFixed(2),'Gastos operativos del mes',totalEgresos>0?'#dc2626':'#6b7280',totalEgresos>0?'#fef2f2':'#f9fafb',totalEgresos>0?'#fca5a5':'#e5e7eb')}
        <div style="background:linear-gradient(135deg,${esGN?'#f0fdf4,#dcfce7':'#fef2f2,#fee2e2'});border:2px solid ${esGN?'#22c55e':'#ef4444'};border-radius:12px;padding:12px 14px;">
          <div style="font-size:10px;font-weight:900;color:${esGN?'#15803d':'#dc2626'};text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px;">${esGN?'✅':'🔴'} UTILIDAD NETA</div>
          <div style="font-size:22px;font-weight:900;color:${esGN?'#15803d':'#dc2626'};font-family:'Space Mono',monospace;">${esGN?'+':''}$${gananciaNeta.toFixed(2)}</div>
          <div style="font-size:10px;color:${esGN?'#4ade80':'#f87171'};margin-top:3px;font-weight:700;">Ventas − Costo − Gastos</div>
        </div>
      </div>
      <div style="background:${esGN?'#f0fdf4':'#fef2f2'};border-top:1px solid ${esGN?'#bbf7d0':'#fca5a5'};padding:7px 14px;font-size:11px;color:${esGN?'#15803d':'#dc2626'};font-weight:700;">
        ℹ️ Utilidad Neta = $${totalVentasDiariasDelMes.toFixed(2)} − $${cogsDelMes.toFixed(2)} − $${totalEgresos.toFixed(2)} = ${esGN?'+':''}$${gananciaNeta.toFixed(2)}
      </div>
    </div>

    <!-- ══ 5. CAPITAL TOTAL (informativo) ════════════════════════════ -->
    <div style="background:#fff;border:2px solid #e5e7eb;border-radius:14px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#1e3a5f,#1d4ed8);padding:11px 16px;display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;background:rgba(255,255,255,.2);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;">🏦</div>
        <div><div style="font-size:13px;font-weight:900;color:#fff;">CAPITAL TOTAL</div>
        <div style="font-size:11px;color:#bfdbfe;font-weight:700;">Solo informativo — no afecta ningún cálculo</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:12px 14px;">
        <div style="background:#f0f9ff;border:2px solid #7dd3fc;border-radius:12px;padding:12px 14px;">
          <div style="font-size:10px;font-weight:900;color:#0369a1;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">🏷️ A PRECIO COSTO</div>
          <div style="font-size:22px;font-weight:900;color:#0369a1;font-family:'Space Mono',monospace;">$${capitalTotalCosto.toFixed(2)}</div>
          <div style="font-size:10px;color:#38bdf8;margin-top:3px;font-weight:700;">Caja + inv. a costo</div>
          <div style="margin-top:5px;font-size:9px;background:#e0f2fe;color:#0369a1;padding:3px 6px;border-radius:5px;font-weight:900;">📌 Tu inversión real total</div>
        </div>
        <div style="background:#f0fdf4;border:2px solid #22c55e;border-radius:12px;padding:12px 14px;">
          <div style="font-size:10px;font-weight:900;color:#15803d;text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">💰 A PRECIO VENTA</div>
          <div style="font-size:22px;font-weight:900;color:#15803d;font-family:'Space Mono',monospace;">$${capitalTotalVenta.toFixed(2)}</div>
          <div style="font-size:10px;color:#4ade80;margin-top:3px;font-weight:700;">Caja + inv. a precio venta</div>
          <div style="margin-top:5px;font-size:9px;background:#dcfce7;color:#15803d;padding:3px 6px;border-radius:5px;font-weight:900;">🚀 Valor máximo si vendes todo</div>
        </div>
      </div>
    </div>

    <!-- ══ 6. ESTADÍSTICAS RÁPIDAS ════════════════════════════════ -->
    <div style="background:#fff;border:2px solid #e5e7eb;border-radius:14px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#374151,#111827);padding:11px 16px;display:flex;align-items:center;gap:10px;">
        <div style="width:32px;height:32px;background:rgba(255,255,255,.2);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;">📉</div>
        <div><div style="font-size:13px;font-weight:900;color:#fff;">ESTADÍSTICAS RÁPIDAS</div>
        <div style="font-size:11px;color:#9ca3af;font-weight:700;">Indicadores clave del mes</div></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;padding:12px 14px;">
        ${card('📅','Promedio Diario','$'+promedioDiario.toFixed(2),'Ventas promedio por día','#0369a1','#f0f9ff','#7dd3fc')}
        ${card('%','Margen de Ganancia',margenMes+'%','Utilidad ÷ Ventas × 100',margenMes>=30?'#15803d':margenMes>=15?'#d97706':'#dc2626',margenMes>=30?'#f0fdf4':margenMes>=15?'#fffbeb':'#fef2f2',margenMes>=30?'#86efac':margenMes>=15?'#fcd34d':'#fca5a5')}
        ${card('🔮','Proyección del Mes','$'+proyeccionMes.toFixed(2),'Si mantienes el promedio','#7c3aed','#faf5ff','#c4b5fd')}
        ${card('📦','Productos en Stock',totalUnidades.toLocaleString(),'Unidades disponibles hoy','#374151','#f9fafb','#e5e7eb')}
      </div>
      <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:7px 14px;font-size:10px;color:#6b7280;font-weight:700;">
        ℹ️ Los datos se actualizan automáticamente cada vez que realizas una venta o registro.
      </div>
    </div>
  `;
  // flujo y balance — limpiar (todo está en el grid rediseñado)
  if (flujo)   flujo.innerHTML   = '';
  if (balance) balance.innerHTML = '';
}

// ===== DEBOUNCE HELPERS =====
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
const debounceBuscarV    = debounce(buscarV, 120);
const debounceRenderInv  = debounce(renderInv, 180);

// ===== requestAnimationFrame wrapper para renders costosos =====
function rafRender(fn) {
  if (window.requestAnimationFrame) requestAnimationFrame(fn);
  else fn();
}
function nowTS()  { return Date.now(); }
function uid() {
  return (crypto && crypto.randomUUID) ? crypto.randomUUID()
    : String(Date.now()) + '_' + Math.random().toString(16).slice(2);
}
function fmtP(n) {
  if (!n && n !== 0) return '0.00';
  const s = parseFloat(n).toFixed(3);
  return s.endsWith('0') ? parseFloat(n).toFixed(2) : s;
}
function hoyStr() {
  return new Date().toLocaleDateString('es-SV').replace(/\//g, '-');
}
// Fecha LOCAL en formato YYYY-MM-DD (evita el bug de toISOString(), que usa
// UTC y adelanta la fecha un día en la noche para zonas horarias negativas
// como El Salvador, ej: una venta a las 8pm del 17/7 quedaba fechada 18/7).
function _fechaLocalISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function autoBackup(motivo) {
  // Solo actualiza el timestamp — las descargas automáticas están desactivadas
  // Para hacer backup manual usa el botón "Exportar" en la barra de respaldo
  setTimeout(() => {
    _backupNum += 1;
    idbSet('vpos_backupNum', _backupNum).catch(console.error);
    _ultimoBackup = nowISO();
    idbSet('vpos_ultimoBackup', _ultimoBackup).catch(console.error);
    actualizarSubtituloBackup();
  }, 400);
}

function descargarJSON(datos, filename) {
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function toast(msg, err = false, info = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (err ? ' err' : info ? ' info' : '');
  setTimeout(() => t.className = 'toast', 2600);
}
function esHoy(fechaISO) {
  try { const f = new Date(fechaISO); return f.toDateString() === new Date().toDateString(); }
  catch { return false; }
}
function esMesActual(fechaISO) {
  try {
    const f = new Date(fechaISO), n = new Date();
    return f.getMonth() === n.getMonth() && f.getFullYear() === n.getFullYear();
  } catch { return false; }
}
function isProbablyProductIdKey(k) {
  return /^[0-9]{9,}$/.test(String(k));
}

// ===== 7. NORMALIZACIÓN DE DATOS =====

function normalizeReport(reportObj) {
  const out = {};
  for (const k in (reportObj || {})) {
    const v = reportObj[k] || {};
    if (isProbablyProductIdKey(k)) {
      const pid = String(k);
      out[pid] = {
        id:    pid,
        nom:   v.nom   || (productos.find(p => String(p.id) === pid)?.nom) || '—',
        cat:   v.cat   || (productos.find(p => String(p.id) === pid)?.cat) || '',
        cant:  Number(v.cant  || 0),
        total: Number(v.total || 0)
      };
    } else {
      const name = String(k);
      const p    = productos.find(x => (x.nom || '') === name);
      if (p) {
        const pid = String(p.id);
        if (!out[pid]) out[pid] = { id: pid, nom: p.nom, cat: p.cat, cant: 0, total: 0 };
        out[pid].cant  += Number(v.cant  || 0);
        out[pid].total += Number(v.total || 0);
      } else {
        const lid = 'legacy:' + name;
        out[lid] = { id: lid, nom: name, cat: v.cat || 'SIN CATEGORÍA', cant: Number(v.cant || 0), total: Number(v.total || 0), legacy: true };
      }
    }
  }
  return out;
}

function normalizeHistorial(hist) {
  const out = (hist || []).map(v => {
    const id       = v.id || uid();
    const fechaISO = v.fechaISO || null;
    const ts       = Number(v.ts || (fechaISO ? Date.parse(fechaISO) : 0) || 0);
    const items    = (v.items || []).map(it => {
      const pid = it.id ? String(it.id) : null;
      if (pid) return { ...it, id: String(it.id) };
      const p = productos.find(p => p.nom === it.nom);
      return { ...it, id: p ? String(p.id) : null };
    });
    return {
      ...v, id, fechaISO, ts,
      // BUG FIX: NO usar v.fecha como fallback de fechaStr porque v.fecha es el
      // timestamp ISO crudo (ej: "2026-05-02T00:46:30.767+00:00") que llega de Supabase.
      // Solo conservar v.fechaStr si ya es una cadena formateada (no un ISO timestamp).
      fechaStr: (v.fechaStr && !/^\d{4}-\d{2}-\d{2}T/.test(v.fechaStr))
        ? v.fechaStr
        : (fechaISO ? new Date(fechaISO).toLocaleString('es-SV') : '—'),
      items
    };
  });
  out.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  return out;
}

function normalizePagos(p) {
  const out = (p || []).map(g => ({
    ...g,
    id:       g.id || Date.now(),
    fechaISO: g.fechaISO || g.fecha || nowISO(),
    ts:       Number(g.ts || (g.fechaISO ? Date.parse(g.fechaISO) : Date.parse(g.fecha || '')) || 0),
    fechaStr: g.fechaStr || (g.fechaISO ? new Date(g.fechaISO).toLocaleString('es-SV') : (g.fechaStr || '—'))
  }));
  out.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  return out;
}

// ===== 8. UI — Loading & IDB Status =====

function setLoadingMsg(msg) {
  const el = document.getElementById('loadingMsg');
  if (el) el.textContent = msg;
}
function setLoadingBadge(msg) {
  const el = document.getElementById('loadingBadge');
  if (el) el.textContent = msg;
}
function ocultarOverlay() {
  const o = document.getElementById('appLoadingOverlay');
  if (!o) return;
  o.classList.add('hidden');
  setTimeout(() => { o.style.display = 'none'; }, 450);
}
function setIDBStatus(ok) {
  const dot  = document.getElementById('idbDot');
  const text = document.getElementById('idbStatusText');
  if (dot)  dot.classList.toggle('err', !ok);
  if (text) text.textContent = ok ? 'IDB ✓' : 'IDB ✗';
}

// ===== 9. NAVEGACIÓN =====

function navTo(pgId, pushHistory = true) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const pgEl = document.getElementById(pgId);
  if (!pgEl) return;
  pgEl.classList.add('active');
  const ids    = ['pgDash', 'pgInventario', 'pgReportes', 'pgDestacados', 'pgVentasDiarias', 'pgSync', 'pgAdmin', 'pgFinanzasMes','pgCierreDia'];
  const invSubPgs = ['pgInvRegistrar','pgInvCapital','pgInvAnalisis','pgInvProductos'];
  const tabIdx = ids.indexOf(pgId);
  if (tabIdx >= 0) { const tabs = document.querySelectorAll('.nav-tab'); if (tabs[tabIdx]) tabs[tabIdx].classList.add('active'); }
  ['dniVenta', 'dniInventario', 'dniReportes', 'dniDestacados', 'dniVentasDiarias', 'dniSync', 'dniAdmin'].forEach((id, i) => {
    const el = document.getElementById(id);
    const esSubInv = id === 'dniInventario' && invSubPgs.includes(pgId);
    if (el) el.classList.toggle('active', ids[i] === pgId || esSubInv);
  });
  if (pgId === 'pgDestacados') renderDestacados();
  if (pgId === 'pgVentasDiarias') { initVentasDiarias(); autoRegistrarVentaDiaria(); renderVentasDiarias(); }
  if (pgId === 'pgEstadoCaja')    { renderCajaPanel(); }
  if (pgId === 'pgAdmin' && typeof renderAdminPanel === 'function') renderAdminPanel();
  if (pgId === 'pgFinanzasMes' && typeof renderFinanzasMes === 'function') renderFinanzasMes(pgId);
  if (pgId === 'pgCierreDia' && typeof renderCierreDia === 'function') renderCierreDia(pgId);
  idbSet('vpos_pagina', pgId).catch(console.error);
  _paginaActual = pgId;
  renderPagina(pgId);
  actualizarStats();
  // Historia de navegación para botón atrás del móvil
  if (pushHistory) {
    try {
      history.pushState({ pgId }, '', '#' + pgId);
    } catch(e) {}
  }
}

// ===== BOTÓN ATRÁS DEL MÓVIL — navegar entre páginas sin cerrar la app =====
window.addEventListener('popstate', (e) => {
  // Si hay algún modal abierto, cerrarlo primero
  const openModal = document.querySelector('.modal.open');
  if (openModal) { openModal.classList.remove('open'); history.pushState({}, '', location.href); return; }
  const pgId = e.state?.pgId || 'pgDash';
  const validas = ['pgDash','pgInventario','pgInvRegistrar','pgInvCapital','pgInvAnalisis','pgInvProductos','pgReportes','pgDestacados','pgVentasDiarias','pgSync','pgAdmin','pgFinanzasMes','pgCierreDia','pgEstadoCaja'];
  navTo(validas.includes(pgId) ? pgId : 'pgDash', false);
});

function toggleDrawer() {
  const drawer = document.getElementById('navDrawer');
  const btn    = document.getElementById('hamburgerBtn');
  drawer.classList.contains('open') ? cerrarDrawer() : (drawer.classList.add('open'), btn.classList.add('open'), document.body.style.overflow = 'hidden');
}
function cerrarDrawer() {
  document.getElementById('navDrawer').classList.remove('open');
  document.getElementById('hamburgerBtn').classList.remove('open');
  document.body.style.overflow = '';
}

// ===== 10. STATS =====

function totalReporte(rep) { return Object.values(rep || {}).reduce((s, v) => s + Number(v.total || 0), 0); }
function totalCantReporte(rep) { return Object.values(rep || {}).reduce((s, v) => s + Number(v.cant || 0), 0); }

function actualizarStats() {
  document.getElementById('statProds').innerHTML  = `Productos: <b>${productos.length}</b>`;
  const totalHoy = totalReporte(ventasDia);
  document.getElementById('statVentas').innerHTML = `Hoy: <b>$${totalHoy.toFixed(2)}</b>`;

  const totalMes   = totalReporte(ventasMes);
  const itemsHoy   = totalCantReporte(ventasDia);
  const criticos   = productos.filter(p => p.stock <= p.min).length;
  const gastosMes  = pagos.filter(g => esMesActual(g.fechaISO)).reduce((s, g) => s + Number(g.monto || 0), 0);

  ['drawerStatProds', 'drawerStatVentas', 'drawerStatMes', 'drawerStatCrit'].forEach((id, i) => {
    const el = document.getElementById(id); if (!el) return;
    el.textContent = [productos.length, '$' + totalHoy.toFixed(2), '$' + totalMes.toFixed(2), criticos][i];
    if (i === 3) el.style.color = criticos > 0 ? '#f87171' : '#86efac';
  });

  const html = `
    <div class="stat-box"><div class="s-lbl">Venta Hoy</div><div class="s-val">$${totalHoy.toFixed(2)}</div></div>
    <div class="stat-box"><div class="s-lbl">Ítems Hoy</div><div class="s-val">${itemsHoy}</div></div>
    <div class="stat-box"><div class="s-lbl">Venta Mes</div><div class="s-val">$${totalMes.toFixed(2)}</div></div>
    <div class="stat-box"><div class="s-lbl">Cobros</div><div class="s-val">${historial.length}</div></div>
    <div class="stat-box"><div class="s-lbl">Gastos Mes</div><div class="s-val" style="color:var(--red)">$${gastosMes.toFixed(2)}</div></div>
    <div class="stat-box"><div class="s-lbl">Stock Crit.</div><div class="s-val" style="color:${criticos > 0 ? 'var(--red)' : 'var(--green)'}">${criticos}</div></div>
  `;
  ['statsRowDash', 'statsRow'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = html; });
}

// ===== 11. INVENTARIO =====

function guardarEfectivoInicial() {
  efectivoInicial = parseFloat(document.getElementById('inpEfectivoInicial').value) || 0;
  idbSet('vpos_efectivoInicial', efectivoInicial).catch(console.error);
  renderInvTotales();
  if (typeof syncAhora === 'function') syncAhora('config');
}
function guardarInventarioInicial() {
  inventarioInicial = parseFloat(document.getElementById('inpInventarioInicial').value) || 0;
  idbSet('vpos_inventarioInicial', inventarioInicial).catch(console.error);
  renderInvTotales();
  if (typeof syncAhora === 'function') syncAhora('config');
}

function actualizarInventarioInicialAuto() {
  // Solo calcula si aún es 0 (primera vez del mes). Después es un baseline fijo.
  const inp = document.getElementById('inpInventarioInicial');
  const inpC = document.getElementById('inpInventarioCosto');
  if (inventarioInicial > 0) {
    if (inp) inp.value = inventarioInicial.toFixed(2);
    if (inpC) inpC.value = inventarioCosto.toFixed(2);
    if (typeof renderInvTotales === 'function') renderInvTotales();
    return;
  }
  const totalInv  = (productos || []).reduce((s, p) => s + _ventaTotalProd(p), 0);
  const totalCost = (productos || []).reduce((s, p) => s + _costoTotalProd(p), 0);
  inventarioInicial = parseFloat(totalInv.toFixed(2));
  inventarioCosto   = parseFloat(totalCost.toFixed(2));
  idbSet('vpos_inventarioInicial', inventarioInicial).catch(console.error);
  idbSet('vpos_inventarioCosto',   inventarioCosto).catch(console.error);
  if (inp)  inp.value  = inventarioInicial.toFixed(2);
  if (inpC) inpC.value = inventarioCosto.toFixed(2);
  if (typeof renderInvTotales === 'function') renderInvTotales();
  if (typeof syncAhora === 'function') syncAhora('config');
  // Broadcast para que el teléfono offline reciba inventarioCosto inmediatamente
  if (typeof _broadcast === 'function') {
    _broadcast('config_actualizada', {
      inventarioInicial: inventarioInicial,
      inventarioCosto:   inventarioCosto,
      efectivoInicial:   typeof efectivoInicial !== 'undefined' ? efectivoInicial : 0
    });
  }
}

function recalcularInventarioInicialManual() {
  // Recalcula inventarioInicial (precio venta × stock) e inventarioCosto (precio compra × stock).
  if (!confirm('¿Actualizar el inventario inicial con el valor actual?\n\nRecalcula SUM(stock × precio venta) y SUM(stock × precio compra). Afecta ganancia/pérdida del mes.')) return;
  const totalInv  = (productos || []).reduce((s, p) => s + _ventaTotalProd(p), 0);
  const totalCost = (productos || []).reduce((s, p) => s + _costoTotalProd(p), 0);
  inventarioInicial = parseFloat(totalInv.toFixed(2));
  inventarioCosto   = parseFloat(totalCost.toFixed(2));
  idbSet('vpos_inventarioInicial', inventarioInicial).catch(console.error);
  idbSet('vpos_inventarioCosto',   inventarioCosto).catch(console.error);
  // Guardar snapshot de stock por producto
  const snap = {};
  (productos || []).forEach(p => { snap[String(p.id)] = { nom: p.nom || '—', cat: p.cat || 'SIN CATEGORÍA', stock: Number(p.stock || 0) }; });
  idbSet('vpos_stockInicialSnap', snap).catch(console.error);
  window._stockInicialSnap = snap;
  const inp  = document.getElementById('inpInventarioInicial');
  const inpC = document.getElementById('inpInventarioCosto');
  if (inp)  inp.value  = inventarioInicial.toFixed(2);
  if (inpC) inpC.value = inventarioCosto.toFixed(2);
  if (typeof renderInvTotales === 'function') renderInvTotales();
  if (typeof renderCajaPanel === 'function') renderCajaPanel();
  if (typeof syncAhora === 'function') syncAhora('config');
  if (typeof _broadcast === 'function') {
    _broadcast('config_actualizada', {
      inventarioInicial: inventarioInicial,
      inventarioCosto:   inventarioCosto,
      efectivoInicial:   typeof efectivoInicial !== 'undefined' ? efectivoInicial : 0
    });
  }
  toast('✅ Inv. inicial: $' + inventarioInicial.toFixed(2) + ' (venta) · $' + inventarioCosto.toFixed(2) + ' (costo)');
  piRender();
  syncAhora('stockInicial');
}


// ===== REDONDEO SEGURO A 2 DECIMALES =====
function money(n) {
  return Number(parseFloat(n || 0).toFixed(2));
}

function _compraUdReal(p) {
  // FUENTE ÚNICA DE VERDAD: p.compra es el costo promedio ponderado calculado por el
  // formulario de registro (_regPresActualizarResumen) al guardar el producto.
  // Es el valor más preciso porque incluye TODOS los paquetes con sus costos reales.
  if (Number(p.compra) > 0) return money(p.compra);

  // Fallback solo cuando p.compra no está definido (producto muy antiguo):
  // usar el paquete de mayor volumen como aproximación.
  const pkgs = (p.paquetes || []).filter(pk => pk.cant > 1 && pk.precioCompra > 0);
  if (pkgs.length) {
    const pkMax = pkgs.slice().sort((a,b) => b.cant - a.cant)[0];
    return money(pkMax.precioCompra);
  }
  return money(0);
}

// ─── FUENTE ÚNICA DE VERDAD: VALOR VENTA TOTAL DEL PRODUCTO ──────────────────
// SIEMPRE recalcula desde p.stock actual. NUNCA usar p.ventaTotal como shortcut
// porque ese snapshot se desactualiza en cuanto se hace una venta (p.stock baja
// pero p.ventaTotal queda con el valor del momento del registro).
function _ventaTotalProd(p) {
  const paquetes = (p.paquetes || []).filter(pk => Number(pk.cant) > 1 && Number(pk.precio) > 0);
  if (!paquetes.length) return (p.stock || 0) * (p.venta || 0);

  const pkgsOrdenados = paquetes.slice().sort((a, b) => b.cant - a.cant);
  let stockRest = Math.max(0, p.stock || 0);
  let total = 0;
  pkgsOrdenados.forEach(pk => {
    const udsXPres = Number(pk.cant) || 1;
    const cantPres = Math.floor(stockRest / udsXPres);
    total    += cantPres * Number(pk.precio);
    stockRest = stockRest - cantPres * udsXPres;
  });
  total += stockRest * (p.venta || 0);
  return money(total);
}

// ─── FUENTE ÚNICA DE VERDAD: COSTO TOTAL DEL PRODUCTO ────────────────────────
// SIEMPRE recalcula desde p.stock actual. NUNCA usar p.costoTotal como shortcut
// porque ese snapshot se desactualiza cuando se hacen ventas (p.stock baja).
function _costoTotalProd(p) {
  const costoUd = _compraUdReal(p);
  const activeLotes = (p.lotes || []).filter(l => (l.stockRestante || 0) > 0);

  // Calcula el costo real de N unidades usando la estructura de paquetes guardada,
  // igual que _ventaTotalProd usa los precios de venta. Esto evita depender de que
  // p.compra sea el promedio ponderado exacto (puede quedar desactualizado al agregar
  // presentaciones sin re-guardar).
  function _costoDeStock(stock) {
    const paquetes = (p.paquetes || []).filter(pk =>
      Number(pk.cant) > 1 && (Number(pk.costoPresEntrado) > 0 || Number(pk.precioCompra) > 0)
    );
    if (!paquetes.length) return stock * costoUd;
    const pkgsOrdenados = paquetes.slice().sort((a, b) => b.cant - a.cant);
    let stockRest = Math.max(0, stock);
    let total = 0;
    pkgsOrdenados.forEach(pk => {
      const udsXPres  = Number(pk.cant) || 1;
      const cantPres  = Math.floor(stockRest / udsXPres);
      // Preferir costoPresEntrado (precio exacto por presentación ingresado por el usuario);
      // si no existe (producto antiguo), reconstruir desde precioCompra × uds.
      const costoPres = Number(pk.costoPresEntrado) > 0
        ? Number(pk.costoPresEntrado)
        : Number(pk.precioCompra) * udsXPres;
      total    += cantPres * costoPres;
      stockRest -= cantPres * udsXPres;
    });
    // Unidades sueltas: usar costoUnidadEntrado (precio real de unidad suelta) si existe.
    const costoSuelto = Number(p.costoUnidadEntrado) > 0 ? Number(p.costoUnidadEntrado) : costoUd;
    total += stockRest * costoSuelto;
    return money(total);
  }

  if (activeLotes.length === 0) {
    return _costoDeStock(p.stock || 0);
  }
  const lotStock  = activeLotes.reduce((s, l) => s + (l.stockRestante || 0), 0);
  const mainStock = Math.max(0, (p.stock || 0) - lotStock);
  let costo = _costoDeStock(mainStock);
  activeLotes.forEach(l => {
    costo = money(
      costo + money((l.stockRestante || 0) * money(l.compra || costoUd))
    );
  });
  return money(costo);
}

function calcValorInventario() {
  let compra = 0;
  let venta = 0;

  productos.forEach(p => {
    compra = money(compra + money(_costoTotalProd(p)));
    venta  = money(venta + money(_ventaTotalProd(p)));
  });

  return {
    compra: money(compra),
    venta: money(venta)
  };
}

function renderInvTotales() {
  const panel = document.getElementById('invTotalesPanel'); if (!panel) return;
  const { compra: totalInvCompra, venta: totalInvVenta } = calcValorInventario();
  const totalVentasMesPOS = totalReporte(ventasMes);
  const totalGastosMes    = pagos.filter(g => esMesActual(g.fechaISO) && (g.cat==='GASTO'||g.cat==='FACTURA')).reduce((s, g) => s + Number(g.monto || 0), 0);
  // FUENTE ÚNICA: ventasDiarias — el historial/ventasDia NO alimentan cajaActual
  const hoyISOInv          = _fechaLocalISO();
  const ventasConfirmadas  = (ventasDiarias || [])
    .filter(v => esMesActual(v.fecha + 'T00:00:00'))
    .reduce((s, v) => s + Number(v.monto || 0), 0);
  const cajaActual         = efectivoInicial + ventasConfirmadas - totalGastosMes;
  const totalCapCompra     = totalInvCompra + cajaActual;
  const totalCapVenta      = totalInvVenta  + cajaActual;

  // Vars necesarias para punto equilibrio
  const ahoraInv   = new Date();
  const diasMesInv = new Date(ahoraInv.getFullYear(), ahoraInv.getMonth()+1, 0).getDate();
  const diaActInv  = ahoraInv.getDate();
  const diasConVentasInv = (ventasDiarias || []).filter(v => esMesActual(v.fecha + 'T00:00:00')).length;
  const promedioVtaDiariaInv = diasConVentasInv > 0
    ? (ventasDiarias || []).filter(v => esMesActual(v.fecha + 'T00:00:00')).reduce((s,v) => s + Number(v.monto||0), 0) / diasConVentasInv
    : 0;

  const peBox  = document.getElementById('puntoEquilibrio');
  const peGrid = document.getElementById('peGrid');
  const hayPE  = efectivoInicial > 0 || inventarioInicial > 0;

  if (peBox && peGrid) {
    if (hayPE) {
      peBox.style.display = 'block';

      // Punto equilibrio = capital inicial a COSTO (efectivo + inventario al precio de compra)
      const invCostoBase  = (typeof inventarioCosto !== 'undefined' && inventarioCosto > 0)
                              ? inventarioCosto : inventarioInicial;
      const puntoEq       = efectivoInicial + invCostoBase;
      // capitalActual = caja actual + inventario ACTUAL a precio costo (tiempo real).
      // Usar invCostoBase (fijo) inflaba el capital porque caja subía al vender
      // pero el inventario base no bajaba → falsa ganancia de $1 por cada venta.
      const capitalActual = cajaActual + totalInvCompra;
      const diferencia    = capitalActual - puntoEq;
      // Ganancia solo de ventas = utilidad neta (ventas - costo vendido - gastos)
      const cogsInv = (historial||[]).filter(v=>esMesActual(v.fechaISO))
        .reduce((s,v)=>s+(Number(v.costoTotal||0)||((v.items||[]).reduce((a,i)=>a+(Number(i.costoUd||i.compra||0)*Number(i.cant||1)),0))),0);
      const gananciaVentas = ventasConfirmadas - cogsInv - totalGastosMes;
      const estaArriba    = diferencia >= 0;
      const colorDif      = estaArriba ? 'var(--green)' : 'var(--red)';
      const bgDif         = estaArriba ? 'var(--green-light)' : 'rgba(220,38,38,0.07)';
      const borderDif     = estaArriba ? 'var(--green)' : 'rgba(220,38,38,0.4)';
      const pctMes        = Math.round((diaActInv / diasMesInv) * 100);
      const ventasNecesarias = diasMesInv > 0 ? (puntoEq + totalGastosMes) / diasMesInv : 0;

      // ── Construir fila de "Capital Inicial" resumida ───────────────────────
      const capIniVenta = efectivoInicial + inventarioInicial;
      const capIniCosto = efectivoInicial + invCostoBase;
      const margenInv   = inventarioInicial > 0 ? Math.round(((inventarioInicial - invCostoBase) / inventarioInicial) * 100) : 0;

      peGrid.innerHTML = `
        <!-- Fila 1: Capital Inicial desglosado -->
        <div style="grid-column:1/-1;font-size:11px;font-weight:900;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;padding:4px 0 2px;">
          📌 Capital Inicial del Mes
        </div>

        <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:10px;padding:12px;">
          <div style="font-size:10px;font-weight:900;color:#15803d;margin-bottom:4px;">💵 EFECTIVO INICIAL</div>
          <div style="font-size:20px;font-weight:900;color:#15803d;">$${efectivoInicial.toFixed(2)}</div>
          <div style="font-size:10px;color:#4ade80;margin-top:3px;font-weight:700;">Dinero en caja al inicio</div>
        </div>

        <div style="background:#fffbeb;border:2px solid #fcd34d;border-radius:10px;padding:12px;">
          <div style="font-size:10px;font-weight:900;color:#92400e;margin-bottom:4px;">📦 INVENTARIO INICIAL</div>
          <div style="font-size:20px;font-weight:900;color:#92400e;">$${inventarioInicial.toFixed(2)}</div>
          <div style="font-size:10px;color:#d97706;margin-top:3px;font-weight:700;">Valuado a precio de venta</div>
        </div>

        <div style="background:#f0f9ff;border:2px solid #7dd3fc;border-radius:10px;padding:12px;">
          <div style="font-size:10px;font-weight:900;color:#0369a1;margin-bottom:4px;">🏷️ INVENTARIO A COSTO</div>
          <div style="font-size:20px;font-weight:900;color:#0369a1;">$${invCostoBase.toFixed(2)}</div>
          <div style="font-size:10px;color:#38bdf8;margin-top:3px;font-weight:700;">Lo que pagaste por la mercancía · Margen ${margenInv}%</div>
        </div>

        <!-- Fila 2: Capital inicial total (dos versiones) -->
        <div style="grid-column:1/-1;font-size:11px;font-weight:900;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;padding:8px 0 2px;">
          🏁 Capital Inicial Total
        </div>

        <div style="background:#faf5ff;border:2px solid #a855f7;border-radius:10px;padding:12px;">
          <div style="font-size:10px;font-weight:900;color:#7c3aed;margin-bottom:4px;">⚖️ CAPITAL INICIAL A COSTO</div>
          <div style="font-size:20px;font-weight:900;color:#7c3aed;">$${capIniCosto.toFixed(2)}</div>
          <div style="font-size:10px;color:#a78bfa;margin-top:3px;font-weight:700;">Efectivo + Inv. a costo — tu inversión real</div>
          <div style="margin-top:5px;font-size:9px;background:#ede9fe;color:#5b21b6;padding:3px 6px;border-radius:5px;font-weight:900;">⚠️ Mínimo a recuperar para no perder</div>
        </div>

        <div style="background:#f0fdf4;border:2px solid #22c55e;border-radius:10px;padding:12px;">
          <div style="font-size:10px;font-weight:900;color:#15803d;margin-bottom:4px;">📈 CAPITAL INICIAL A VENTA</div>
          <div style="font-size:20px;font-weight:900;color:#15803d;">$${capIniVenta.toFixed(2)}</div>
          <div style="font-size:10px;color:#4ade80;margin-top:3px;font-weight:700;">Efectivo + Inv. a precio venta</div>
          <div style="margin-top:5px;font-size:9px;background:#dcfce7;color:#15803d;padding:3px 6px;border-radius:5px;font-weight:900;">📊 Valor potencial si vendes todo</div>
        </div>

        <!-- Fila 3: Capital Actual vs Inicial → Resultado -->
        <div style="grid-column:1/-1;font-size:11px;font-weight:900;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;padding:8px 0 2px;">
          📊 Capital Actual vs Capital Inicial
        </div>

        <div style="background:rgba(29,78,216,0.04);border:2px solid rgba(29,78,216,0.3);border-radius:10px;padding:12px;">
          <div style="font-size:10px;font-weight:900;color:#1d4ed8;margin-bottom:4px;">💼 CAPITAL HOY</div>
          <div style="font-size:20px;font-weight:900;color:#1d4ed8;">$${capitalActual.toFixed(2)}</div>
          <div style="font-size:10px;color:#60a5fa;margin-top:3px;font-weight:700;">Caja actual + Inventario actual a costo</div>
          <div style="margin-top:4px;font-size:10px;color:#6b7280;font-weight:700;">📅 Día ${diaActInv} de ${diasMesInv} · ${pctMes}% del mes</div>
        </div>

        <div style="background:${bgDif};border:2px solid ${borderDif};border-radius:10px;padding:12px;">
          <div style="font-size:10px;font-weight:900;color:${colorDif};margin-bottom:4px;">${estaArriba ? '✅ RESULTADO: GANANCIA' : '🔴 RESULTADO: PÉRDIDA'}</div>
          <div style="font-size:22px;font-weight:900;color:${colorDif};">${estaArriba ? '+' : ''}$${diferencia.toFixed(2)}</div>
          <div style="font-size:10px;color:${colorDif};margin-top:3px;font-weight:700;">vs. Capital inicial a costo ($${capIniCosto.toFixed(2)})</div>
          ${promedioVtaDiariaInv > 0 ? `<div style="margin-top:5px;font-size:9px;background:rgba(0,0,0,0.05);color:${colorDif};padding:3px 6px;border-radius:5px;font-weight:900;">📈 Promedio diario: $${promedioVtaDiariaInv.toFixed(2)} · Meta/día: $${ventasNecesarias.toFixed(2)}</div>` : ''}
        </div>

        <!-- Fila 4: Ganancia solo de Ventas -->
        <div style="grid-column:1/-1;font-size:11px;font-weight:900;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;padding:8px 0 2px;">
          🛒 Ganancia Solo de Ventas
        </div>

        <div style="grid-column:1/-1;background:${gananciaVentas>=0?'#f0fdf4':'rgba(220,38,38,0.05)'};border:2px solid ${gananciaVentas>=0?'#86efac':'rgba(220,38,38,0.3)'};border-radius:10px;padding:12px;">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px;">
            <div style="text-align:center;">
              <div style="font-size:9px;font-weight:900;color:#6b7280;">💰 VENTAS</div>
              <div style="font-size:16px;font-weight:900;color:#15803d;">$${ventasConfirmadas.toFixed(2)}</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:9px;font-weight:900;color:#6b7280;">📦 COSTO</div>
              <div style="font-size:16px;font-weight:900;color:#92400e;">$${cogsInv.toFixed(2)}</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:9px;font-weight:900;color:#6b7280;">💸 GASTOS</div>
              <div style="font-size:16px;font-weight:900;color:#dc2626;">$${totalGastosMes.toFixed(2)}</div>
            </div>
          </div>
          <div style="border-top:1px solid ${gananciaVentas>=0?'#86efac':'rgba(220,38,38,0.3)'};padding-top:8px;display:flex;justify-content:space-between;align-items:center;">
            <div style="font-size:10px;font-weight:900;color:#6b7280;">Ventas − Costo − Gastos</div>
            <div style="font-size:20px;font-weight:900;color:${gananciaVentas>=0?'#15803d':'#dc2626'};">${gananciaVentas>=0?'+':''}$${gananciaVentas.toFixed(2)}</div>
          </div>
          <div style="font-size:9px;color:#6b7280;margin-top:4px;">⚠️ No incluye compras de inventario — solo lo que generaron las ventas</div>
        </div>
      `;
    } else peBox.style.display = 'none';
  }

  // ── Margen bruto actual del inventario en stock ─────────────────────────
  const margenActual = totalInvVenta > 0 ? Math.round(((totalInvVenta - totalInvCompra) / totalInvVenta) * 100) : 0;

  panel.innerHTML = `
    <!-- Fila A: Inventario en Stock -->
    <div style="grid-column:1/-1;font-size:11px;font-weight:900;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;padding:0 0 4px;">
      📦 Inventario en Stock Hoy
    </div>

    <div style="background:#fff;border:2px solid #e5e7eb;border-radius:10px;padding:11px;text-align:center;">
      <div style="font-size:10px;font-weight:900;color:#374151;margin-bottom:4px;">🗂️ TOTAL PRODUCTOS</div>
      <div style="font-size:26px;font-weight:900;color:#111827;">${productos.length}</div>
      <div style="font-size:10px;color:#9ca3af;margin-top:3px;font-weight:700;">artículos registrados</div>
    </div>

    <div style="background:#f0f9ff;border:2px solid #7dd3fc;border-radius:10px;padding:11px;">
      <div style="font-size:10px;font-weight:900;color:#0369a1;margin-bottom:4px;">🏷️ VALOR A PRECIO COSTO</div>
      <div style="font-size:20px;font-weight:900;color:#0369a1;">$${totalInvCompra.toFixed(2)}</div>
      <div style="font-size:10px;color:#38bdf8;margin-top:3px;font-weight:700;">Lo que pagaste por el stock actual</div>
    </div>

    <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:10px;padding:11px;">
      <div style="font-size:10px;font-weight:900;color:#15803d;margin-bottom:4px;">💰 VALOR A PRECIO VENTA</div>
      <div style="font-size:20px;font-weight:900;color:#15803d;">$${totalInvVenta.toFixed(2)}</div>
      <div style="font-size:10px;color:#4ade80;margin-top:3px;font-weight:700;">Potencial si vendes todo · Margen ${margenActual}%</div>
    </div>

    <!-- Fila B: Dinero en Caja -->
    <div style="grid-column:1/-1;font-size:11px;font-weight:900;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;padding:8px 0 4px;">
      💵 Dinero en Caja Hoy
    </div>

    <div style="background:#fffbeb;border:2px solid #fcd34d;border-radius:10px;padding:11px;grid-column:1/-1;">
      <div style="font-size:10px;font-weight:900;color:#92400e;margin-bottom:4px;">💵 CAJA ACTUAL</div>
      <div style="font-size:26px;font-weight:900;color:#d97706;">$${cajaActual.toFixed(2)}</div>
      <div style="font-size:10px;color:#b45309;margin-top:3px;font-weight:700;">Efectivo inicial $${efectivoInicial.toFixed(2)} + ventas confirmadas − gastos del mes</div>
    </div>

    <!-- Fila C: Capital Total Real -->
    <div style="grid-column:1/-1;font-size:11px;font-weight:900;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;padding:8px 0 4px;">
      🏦 Capital Total Actual (Caja + Inventario)
    </div>

    <div style="background:#f0f9ff;border:2px solid #7dd3fc;border-radius:10px;padding:11px;">
      <div style="font-size:10px;font-weight:900;color:#0369a1;margin-bottom:4px;">📊 CAPITAL A PRECIO COSTO</div>
      <div style="font-size:20px;font-weight:900;color:#0369a1;">$${totalCapCompra.toFixed(2)}</div>
      <div style="font-size:10px;color:#38bdf8;margin-top:3px;font-weight:700;">Caja + inv. a costo</div>
      <div style="margin-top:5px;font-size:9px;background:#e0f2fe;color:#0369a1;padding:3px 6px;border-radius:5px;font-weight:900;">📌 Lo que tienes en valor real de inversión</div>
    </div>

    <div style="background:#f0fdf4;border:2px solid #22c55e;border-radius:10px;padding:11px;">
      <div style="font-size:10px;font-weight:900;color:#15803d;margin-bottom:4px;">📈 CAPITAL A PRECIO VENTA</div>
      <div style="font-size:22px;font-weight:900;color:#15803d;">$${totalCapVenta.toFixed(2)}</div>
      <div style="font-size:10px;color:#4ade80;margin-top:3px;font-weight:700;">Caja + inv. a venta</div>
      <div style="margin-top:5px;font-size:9px;background:#dcfce7;color:#15803d;padding:3px 6px;border-radius:5px;font-weight:900;">🚀 Valor máximo si vendes todo el stock</div>
    </div>
  `;
}

// ── PAQUETES INLINE EN FORMULARIO DE REGISTRO ──
// ═══════════════════════════════════════════════════════════════
// REGISTRO MODERNO: PRESENTACIONES E INVENTARIO
// Cada fila = una presentación (paquete, medio paq, unidad, etc.)
// Stock, compra y venta se derivan automáticamente de las filas.
// ═══════════════════════════════════════════════════════════════

let _regPres = [];   // [{id, label, uds, cant, costo, venta}]

// Compatibilidad: _formPkgTemp apunta al mismo array
Object.defineProperty(window, '_formPkgTemp', {
  get() { return _regPres; }, set(v) { _regPres = v; }, configurable: true
});

// Tipos predefinidos de fila para autocompletar el label
const _REG_TIPOS = [
  { val:'paquete',   label:'Paquete' },
  { val:'medio',     label:'Medio paquete' },
  { val:'unidad',    label:'Unidad' },
  { val:'caja',      label:'Caja' },
  { val:'docena',    label:'Docena' },
  { val:'custom',    label:'Personalizado' },
];

function regPresAgregar(tipo) {
  const labels = { paquete:'Paquete', medio:'Medio Paquete', unidad:'Unidad', caja:'Caja', docena:'Docena', custom:'Presentación' };
  const label  = labels[tipo] || 'Presentación';
  _regPres.push({ id: Date.now() + Math.random(), label, uds: tipo==='unidad'?1:tipo==='medio'?25:tipo==='docena'?12:50, cant: 0, costo: 0, venta: 0 });
  _regPresRender();
}

function regPresEliminar(id) {
  _regPres = _regPres.filter(r => String(r.id) !== String(id));
  _regPresRender();
}

function regPresEditar(id, campo, valor) {
  const r = _regPres.find(r => String(r.id) === String(id));
  if (!r) return;
  if (campo === 'label') r.label = valor;
  else r[campo] = parseFloat(valor) || 0;
  // Actualizar totales y campos ocultos en tiempo real
  _regPresActualizarResumen();
  // Re-renderizar tarjetas solo para actualizar subtotales (conservar focus)
  // Usamos un pequeño truco: actualizar solo el footer de la tarjeta activa
  const card = document.querySelector('[data-id="' + String(r.id) + '"].reg-pres-card');
  if (card) {
    const uds  = Number(r.uds)||0, cant = Number(r.cant)||0;
    const cost = Number(r.costo)||0, vta = Number(r.venta)||0;
    const showSub = cant > 0 && (cost > 0 || vta > 0);
    const costoSub = cost*cant, ventaSub = vta*cant;
    const margen = vta>0&&cost>0 ? (((vta-cost)/cost)*100).toFixed(0) : null;
    let sub = card.querySelector('.reg-pres-subtotal');
    if (showSub) {
      const html = '<div class="reg-pres-subtotal">' +
        '<span style="color:var(--text-muted);">📦 ' + (uds*cant) + ' uds · costo <strong style="color:#b45309;">$' + costoSub.toFixed(2) + '</strong></span>' +
        '<span style="color:var(--green-dark);">venta <strong>$' + ventaSub.toFixed(2) + '</strong>' + (margen ? ' <span style="font-size:10px;color:var(--amber);margin-left:4px;">+' + margen + '%</span>' : '') + '</span>' +
        '</div>';
      if (sub) sub.outerHTML = html; else card.insertAdjacentHTML('beforeend', html);
    } else if (sub) sub.remove();
  }
}

function _regPresRender() {
  const cont = document.getElementById('regPresentaciones');
  if (!cont) return;
  if (!_regPres.length) {
    cont.innerHTML = `<div style="text-align:center;padding:18px;font-size:13px;color:var(--text-muted);font-weight:700;background:#fafafa;border-radius:11px;border:2px dashed var(--border-mid);">
      📦 Sin presentaciones — usa el botón de abajo para agregar
    </div>`;
    const res = document.getElementById('regResumen');
    if (res) res.style.display = 'none';
    ['inpCompra','inpVenta','inpStock','inpCostoTotal','inpVentaTotal'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
    return;
  }

  cont.innerHTML = _regPres.map(r => {
    const uds   = Number(r.uds)  || 0;
    const cant  = Number(r.cant) || 0;
    const costo = Number(r.costo)|| 0;
    const venta = Number(r.venta)|| 0;
    const udsTotal  = uds * cant;
    const costoSub  = costo * cant;
    const ventaSub  = venta * cant;
    const showSub   = cant > 0 && (costo > 0 || venta > 0);
    const margen    = venta > 0 && costo > 0 ? (((venta - costo) / costo)*100).toFixed(0) : null;
    return `<div class="reg-pres-card" data-id="${r.id}">
      <div class="reg-pres-card-header">
        <input class="reg-pres-card-title" type="text" value="${r.label||''}" placeholder="Nombre ej: Paquete, Unidad…"
          oninput="regPresEditar('${r.id}','label',this.value)">
        <button type="button" class="reg-pres-del" onclick="regPresEliminar('${r.id}')" title="Eliminar presentación">✕</button>
      </div>
      <div class="reg-pres-card-grid">
        <div class="reg-pres-field uds">
          <label style="color:var(--text-muted);">📏 Uds por presentación</label>
          <input type="number" min="1" step="1" value="${r.uds||''}" placeholder="50"
            oninput="regPresEditar('${r.id}','uds',this.value)">
        </div>
        <div class="reg-pres-field cant">
          <label style="color:var(--green-dark);">🛒 Cantidad comprada</label>
          <input type="number" min="0" step="0.5" value="${r.cant||''}" placeholder="0"
            oninput="regPresEditar('${r.id}','cant',this.value)">
        </div>
        <div class="reg-pres-field costo">
          <label style="color:#b45309;">💲 Precio costo / pres.</label>
          <input type="number" min="0" step="any" value="${r.costo||''}" placeholder="0.00"
            oninput="regPresEditar('${r.id}','costo',this.value)">
        </div>
        <div class="reg-pres-field venta">
          <label style="color:var(--green-dark);">🏷 Precio venta / pres.</label>
          <input type="number" min="0" step="any" value="${r.venta||''}" placeholder="0.00"
            oninput="regPresEditar('${r.id}','venta',this.value)">
        </div>
      </div>
      ${showSub ? `<div class="reg-pres-subtotal">
        <span style="color:var(--text-muted);">📦 ${udsTotal} uds · costo <strong style="color:#b45309;">$${costoSub.toFixed(2)}</strong></span>
        <span style="color:var(--green-dark);">venta <strong>$${ventaSub.toFixed(2)}</strong>${margen?` <span style="font-size:10px;color:var(--amber);margin-left:4px;">+${margen}%</span>`:''}
        </span>
      </div>` : ''}
    </div>`;
  }).join('');

  _regPresActualizarResumen();
}

function _regPresActualizarResumen() {
  let totalUds = 0, totalCosto = 0, totalVenta = 0;
  const detalle = [];

  _regPres.forEach(r => {
    const uds   = Number(r.uds)  || 0;
    const cant  = Number(r.cant) || 0;
    const costo = Number(r.costo)|| 0;
    const venta = Number(r.venta)|| 0;
    if (cant <= 0 && costo <= 0 && venta <= 0) return;
    const udsTotal = uds * cant;
    totalUds   += udsTotal;
    totalCosto += costo * cant;
    totalVenta += venta * cant;
    detalle.push(`<span style="background:#fff;border:1px solid var(--border-mid);border-radius:6px;padding:3px 9px;">${r.label||'Pres.'}: ${cant} × ${uds} uds = ${udsTotal} uds</span>`);
  });

  // Siempre calcular precio de venta unitario, independiente de cantidades
  const costoPorUd = totalUds > 0 ? totalCosto / totalUds : 0;
  // precio venta ud = fila más pequeña que tenga venta definida
  const filaMin = _regPres.filter(r=>Number(r.uds)>0&&Number(r.venta)>0).sort((a,b)=>Number(a.uds)-Number(b.uds))[0];
  const ventaUd = filaMin ? Number(filaMin.venta) / Number(filaMin.uds) : 0;
  // Costo unitario: si hay cantidades usar promedio ponderado real (costoPorUd).
  // Si no hay cantidades, usar la fila de MAYOR volumen con costo (paquete grande = precio real de compra).
  // Nunca usar la fila de unidad suelta para p.compra porque infla el valor del inventario.
  const filasConCosto = _regPres.filter(r=>Number(r.uds)>0&&Number(r.costo)>0);
  const filaMaxC = filasConCosto.sort((a,b)=>Number(b.uds)-Number(a.uds))[0]; // mayor volumen primero
  const compraUd = costoPorUd > 0 ? costoPorUd
    : (filaMaxC ? Number(filaMaxC.costo) / Number(filaMaxC.uds) : 0);

  // SIEMPRE actualizar campos ocultos (incluso si cant=0, para reflejar precios)
  const elC = document.getElementById('inpCompra');
  const elV = document.getElementById('inpVenta');
  const elS = document.getElementById('inpStock');
  const elT = document.getElementById('inpCostoTotal');
  const elTV= document.getElementById('inpVentaTotal');
  if(elC)  elC.value  = (compraUd || costoPorUd).toFixed(4);
  if(elV)  elV.value  = ventaUd.toFixed(4);
  if(elS)  elS.value  = Math.round(totalUds);
  if(elT)  elT.value  = totalCosto.toFixed(6);
  if(elTV) elTV.value = totalVenta.toFixed(6); // valor venta exacto por presentación

  // Mostrar/ocultar resumen visual
  const box = document.getElementById('regResumen');
  if (!box) return;
  const hasData = totalUds > 0 || totalCosto > 0 || ventaUd > 0;
  box.style.display = hasData ? '' : 'none';
  if (!hasData) return;
  const elUds    = document.getElementById('regResUds');
  const elCosto  = document.getElementById('regResCosto');
  const elVenta  = document.getElementById('regResVenta');
  const elDetalle= document.getElementById('regResDetalle');
  if(elUds)    elUds.textContent   = totalUds + ' uds';
  if(elCosto)  elCosto.textContent = '$' + totalCosto.toFixed(2);
  if(elVenta)  elVenta.textContent = '$' + totalVenta.toFixed(2);
  if(elDetalle)elDetalle.innerHTML = detalle.join('');
}

// Carga presentaciones existentes al editar un producto
function _regPresCargar(paquetes, stockUd, compraUd, ventaUd, costoUnidadEntrado, ventaUnidadEntrada) {
  _regPres = [];

  // Descomponer el stock total en presentaciones (de mayor a menor), como un sistema de denominaciones.
  // Ej: 244 uds con paquetes [50, 25, 5] → 4 paquetes (200), 1×½paquete (25), 1×dólar (5), 14 uds sueltas
  const pkgsOrdenados = (paquetes || [])
    .filter(pk => (pk.cant || 1) > 1)
    .slice().sort((a, b) => b.cant - a.cant); // mayor primero

  let stockRestante = Math.max(0, stockUd || 0);

  if (pkgsOrdenados.length) {
    pkgsOrdenados.forEach(pk => {
      const udsXPres = pk.cant || 1;
      const cantPres = Math.floor(stockRestante / udsXPres);
      stockRestante  = stockRestante - (cantPres * udsXPres); // residuo
      _regPres.push({
        id:    pk.id || Date.now() + Math.random(),
        label: pk.label || ('Paquete ' + pk.cant + ' uds'),
        uds:   udsXPres,
        cant:  cantPres,   // cantidad de presentaciones que caben en el stock actual
        costo: pk.costoPresEntrado != null
          ? pk.costoPresEntrado   // valor exacto que el usuario ingresó
          : pk.precioCompra ? parseFloat((pk.precioCompra * udsXPres).toFixed(6)) : parseFloat((compraUd * udsXPres).toFixed(6)),
        venta: pk.precio || 0
      });
    });
  }

  // Unidad: el residuo que no cabe en ningún paquete
  _regPres.push({
    id:    'unidad_' + Date.now(),
    label: 'Unidad',
    uds:   1,
    cant:  stockRestante,
    costo: costoUnidadEntrado != null && costoUnidadEntrado > 0 ? costoUnidadEntrado : (compraUd || 0),
    venta: ventaUnidadEntrada != null && ventaUnidadEntrada > 0 ? ventaUnidadEntrada : (ventaUd  || 0)
  });

  _regPresRender();
}

// Compatibilidad con funciones antiguas que llamen formPkgRender
function formPkgRender() { _regPresRender(); }
function formPkgAgregar() { regPresAgregar('custom'); }
function formPkgEliminar(i) {
  const sorted = _regPres.slice().sort((a,b) => b.uds - a.uds);
  if (sorted[i]) regPresEliminar(sorted[i].id);
}
function formPkgPreview() {}  // ya no se usa

function guardarProducto(e) {
  e.preventDefault();
  if (typeof _puedeHacer === 'function' && !_puedeHacer('inventario')) { toast('No tienes permiso para editar inventario', true); return; }
  // Bloquear _autoCargarDesdeSupa 5s para que no sobreescriba el producto recién guardado
  if (typeof _bloquearAutoCargar === 'function') _bloquearAutoCargar(5000);
  const id        = document.getElementById('editId').value;
  const newCod    = document.getElementById('inpCod').value.trim();
  const newAbrev  = document.getElementById('inpAbrev').value.toUpperCase().trim();
  const newNom    = document.getElementById('inpNom').value.toUpperCase().trim();
  const newCat    = document.getElementById('inpCat').value.toUpperCase().trim();
  // Derivar compra/venta/stock de los campos hidden (calculados por _regPresActualizarResumen)
  _regPresActualizarResumen(); // asegurar que los hidden estén frescos
  const newCompra     = parseFloat(document.getElementById('inpCompra').value) || 0;
  const newVenta      = parseFloat(document.getElementById('inpVenta').value)  || 0;
  const newStock      = parseInt(document.getElementById('inpStock').value)    || 0;
  const newCostoTotal = parseFloat(document.getElementById('inpCostoTotal')?.value) || 0;
  const newVentaTotal = parseFloat(document.getElementById('inpVentaTotal')?.value) || 0;
  const newMin    = parseInt(document.getElementById('inpMin').value)      || 0;
  const newImg    = _imagenPendiente !== undefined ? _imagenPendiente : (id ? (productos.find(x => String(x.id) === String(id))?.img || null) : null);

  // Si aún no hay presentaciones (forma directa sin navTo), auto-crear fila Unidad
  if (_regPres.length === 0) {
    _regPres = [{ id: Date.now(), label: 'Unidad', uds: 1, cant: 0, costo: 0, venta: 0 }];
  }

  // Construir paquetes en formato compatible con el sistema de venta
  // Solo guardar presentaciones con más de 1 unidad como "paquete"
  // Las filas de unidad suelta (uds=1) NO se guardan como paquete para evitar
  // duplicados en el picker (el picker ya agrega "Unidad" manualmente).
  // Guardar costo y venta exactos de la fila "Unidad" para restaurarlos al editar
  const filaUnidad = _regPres.find(r => Number(r.uds) === 1);
  const costoUnidadEntrado = filaUnidad ? Number(Number(filaUnidad.costo).toFixed(2)) : 0;
  const ventaUnidadEntrada = filaUnidad ? Number(Number(filaUnidad.venta).toFixed(2)) : 0;

  const newPaquetes = _regPres
    .filter(r => Number(r.uds) > 1 && Number(r.venta) > 0)
    .map(r => ({
      id:              String(r.id),
      cant:            Number(r.uds),
      precio:          Number(r.venta),
      precioCompra:    Number(r.uds) > 0 ? Number((Number(r.costo) / Number(r.uds)).toFixed(2)) : 0,
      costoPresEntrado: Number(Number(r.costo).toFixed(2)), // valor exacto ingresado por el usuario (sin recalcular)
      label:           r.label || ''
    }));

  if (id) {
    const existing   = productos.find(x => String(x.id) === String(id));
    let lotesActuales = existing ? (existing.lotes || []) : [];
    if (existing && (existing.stock || 0) > 0) {
      const compraChanged = Math.abs(newCompra - (existing.compra || 0)) > 0.001;
      const ventaChanged  = Math.abs(newVenta  - (existing.venta  || 0)) > 0.001;
      const stockAdded    = newStock > (existing.stock || 0);
      if ((compraChanged || ventaChanged) && stockAdded) {
        // Solo crear lote cuando hay stock nuevo (compra real de mercancía a precio distinto)
        lotesActuales = [...lotesActuales, { compra: existing.compra || 0, ventaOrig: existing.venta || 0, stockInicial: existing.stock || 0, stockRestante: existing.stock || 0, fecha: new Date().toLocaleString('es-SV') }];
      } else if (compraChanged && !stockAdded) {
        // Corrección de precio sin stock nuevo: limpiar lotes obsoletos que cubran ≥ stock actual
        // para que el inventario use el nuevo p.compra en todos los cálculos.
        const totalLoteStock = lotesActuales.reduce((s, l) => s + (l.stockRestante || 0), 0);
        if (totalLoteStock >= newStock) {
          lotesActuales = [];
        }
      }
    }
    productos = productos.map(x => String(x.id) === String(id)
      ? { id: Number(id), cod: newCod, nom: newNom, cat: newCat, abrev: newAbrev, compra: newCompra, venta: newVenta, stock: newStock, min: newMin, costoTotal: newCostoTotal, ventaTotal: newVentaTotal, costoUnidadEntrado, ventaUnidadEntrada, lotes: lotesActuales, paquetes: newPaquetes, img: newImg, _ts: Date.now() }
      : x);
  } else {
    productos.push({ id: Date.now(), cod: newCod, nom: newNom, cat: newCat, abrev: newAbrev, compra: newCompra, venta: newVenta, stock: newStock, min: newMin, costoTotal: newCostoTotal, ventaTotal: newVentaTotal, costoUnidadEntrado, ventaUnidadEntrada, lotes: [], paquetes: newPaquetes, img: newImg, _ts: Date.now() });
  }
  // Capturar el ID del producto ANTES de cancelarEdicion (resetea el form)
  const _broadcastId = id || (productos.length > 0 ? String(productos[productos.length - 1].id) : null);
  cancelarEdicion();
  salvar();
  toast(id ? 'Producto actualizado' : 'Producto guardado');
  autoBackup(id ? 'Producto_editado' : 'Producto_nuevo');
  if (typeof _registrarAccion === 'function') _registrarAccion(id ? 'editar_producto' : 'nuevo_producto', newNom || '');
  // Sincronizar productos a Supabase inmediatamente
  if (typeof syncAhora === 'function') syncAhora('productos');
  // Enviar snapshot para que otros dispositivos reciban el producto nuevo/editado
  if (typeof _autoEnviarSnapshot === 'function') setTimeout(_autoEnviarSnapshot, 800);
  // Volver al listado después de guardar
  if (typeof navTo === 'function') navTo('pgInvProductos');
  // Broadcast instantáneo con los datos correctos capturados antes del reset
  if (typeof _broadcast === 'function' && _broadcastId) {
    const savedProdB = productos.find(x => String(x.id) === _broadcastId);
    if (savedProdB) _broadcast('producto', { ...savedProdB, img: null });
  }
  // Sync img inmediatamente — tanto al poner imagen como al borrarla
  if (typeof syncImgProducto === 'function') {
    const savedProd = productos.find(x => String(x.id) === String(id || ''));
    if (savedProd) {
      setTimeout(() => syncImgProducto(savedProd), 300);
    } else if (!id && newImg) {
      // producto nuevo con img — buscar por img
      const np = productos.find(x => x.img === newImg);
      if (np) setTimeout(() => syncImgProducto(np), 300);
    }
  }
}

function renderInv() {
  const filtro = (document.getElementById('filtroInv')?.value || '').toUpperCase();
  const lista  = productos.filter(p => !filtro || (p.nom||'').includes(filtro) || (p.cod||'').includes(filtro) || (p.cat||'').includes(filtro));
  const cnt    = document.getElementById('cntProds');
  if (cnt) cnt.textContent = `${lista.length} / ${productos.length}`;

  const inpEf = document.getElementById('inpEfectivoInicial');
  if (inpEf && inpEf.value === '') inpEf.value = efectivoInicial > 0 ? efectivoInicial : '';
  const inpInvR = document.getElementById('inpInventarioInicial');
  if (inpInvR && inpInvR.value === '') inpInvR.value = inventarioInicial > 0 ? inventarioInicial : '';

  renderInvTotales();

  const cont = document.getElementById('invCardsContainer');
  const tbody = document.getElementById('tbodyInv'); // fallback compat

  if (!cont && !tbody) return;

  if (!lista.length) {
    if (cont) cont.innerHTML = `<div class="empty"><span class="empty-icon">📦</span>${filtro ? 'Sin resultados para "' + filtro + '"' : 'Sin productos registrados'}</div>`;
    if (tbody) tbody.innerHTML = `<tr><td colspan="10"><div class="empty"><span class="empty-icon">📦</span>Sin productos</div></td></tr>`;
    return;
  }

  const cards = lista.map(p => {
    const critico  = (p.stock||0) <= (p.min||0);
    const pkgs     = (p.paquetes||[]).sort((a,b)=>b.cant-a.cant);
    const margen   = (p.compra||0) > 0 ? Math.round(((p.venta-p.compra)/p.compra)*100) : null;
    const totalVal = _ventaTotalProd(p).toFixed(2);
    const imgHtml  = p.img
      ? `<img src="${p.img}" loading="lazy" class="inv-card-img" style="width:36px;height:36px;">`
      : `<div class="inv-card-img">${(p.cat||'📦').charAt(0)}</div>`;

    const pkgChips = pkgs.length
      ? pkgs.map(pk => `<span class="inv-pkg-chip">${pk.label||pk.cant+' uds'} $${fmtP(pk.precio)}</span>`).join('')
      : `<span class="inv-pkg-chip" style="background:#f8fafc;color:var(--text-muted);">—</span>`;

    return `<div class="inv-prod-card${critico?' critico':''}">
      <div class="inv-card-top">
        ${imgHtml}
        <div style="flex:1;min-width:0;">
          <div class="inv-card-name">${p.nom}</div>
          <div class="inv-card-cat">${p.cat||''}</div>
        </div>
      </div>
      <div class="inv-card-metrics">
        <div class="inv-metric amber">
          <div class="inv-metric-label">Costo</div>
          <div class="inv-metric-val">$${fmtP(p.compra||0)}</div>
        </div>
        <div class="inv-metric green">
          <div class="inv-metric-label">Venta${margen?' +'+margen+'%':''}</div>
          <div class="inv-metric-val">$${fmtP(p.venta||0)}</div>
        </div>
        <div class="inv-metric${critico?' red':''} stock-full">
          <div class="inv-metric-label">${critico?'⚠ ':''}Stock · Val $${totalVal}</div>
          <div class="inv-metric-val">${p.stock||0} uds</div>
        </div>
      </div>
      <div class="inv-card-pkgs">${pkgChips}</div>
      <div class="inv-card-actions">
        <button class="inv-card-btn inv-btn-stock" onclick="abrirRestock('${p.id}')">+📦</button>
        <button class="inv-card-btn inv-btn-edit"  onclick="editarProd('${p.id}')">✎ Edit</button>
        <button class="inv-card-btn inv-btn-pkg"   onclick="abrirGestionPaquetes('${p.id}')">📦</button>
        <button class="inv-card-btn inv-btn-del"   onclick="borrarProd('${p.id}')">✕</button>
      </div>
    </div>`;
  });

  if (cont) cont.innerHTML = cards.join('');

  // Totales (tfoot compat)
  const tfoot = document.getElementById('tfootInv');
  if (tfoot) {
    const totalVentaLista = lista.reduce((s,p)=>s+_ventaTotalProd(p),0);
    tfoot.innerHTML = '';
  }

  // Resumen total tarjetas
  const totEl = document.getElementById('invCardsTotal');
  if (totEl) {
    const tv = lista.reduce((s,p)=>s+_ventaTotalProd(p),0);
    // CORRECCIÓN: calcular costo total correcto incluyendo lotes históricos
    // Usar _costoTotalProd (fuente única de verdad) para costo total
    const tc = lista.reduce((s,p) => s + _costoTotalProd(p), 0);
    const ganancia = tv - tc;
    totEl.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:10px;text-align:center;">
          <div style="font-size:9px;font-weight:900;color:#b45309;text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px;">Total Costo</div>
          <div style="font-family:'Space Mono',monospace;font-size:15px;font-weight:700;color:#b45309;">$${tc.toFixed(2)}</div>
        </div>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px;text-align:center;">
          <div style="font-size:9px;font-weight:900;color:var(--green-dark);text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px;">Valor Venta</div>
          <div style="font-family:'Space Mono',monospace;font-size:15px;font-weight:700;color:var(--green-dark);">$${tv.toFixed(2)}</div>
        </div>
        <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1.5px solid var(--green);border-radius:10px;padding:10px;text-align:center;">
          <div style="font-size:9px;font-weight:900;color:var(--green-dark);text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px;">Ganancia Bruta</div>
          <div style="font-family:'Space Mono',monospace;font-size:16px;font-weight:900;color:var(--green);">$${ganancia.toFixed(2)}</div>
        </div>
      </div>`;
  }
}


function previsualizarImagen(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // ── Comprimir SIEMPRE a máximo 400px y ~100KB para que Supabase lo guarde sin cortes ──
      const MAX_B64 = 120 * 1024; // 120 KB en base64 ≈ 90KB real
      const maxDim  = 400;        // max 400px — suficiente para thumbnail de producto
      const canvas  = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxDim || h > maxDim) {
        const f = maxDim / Math.max(w, h);
        w = Math.round(w * f); h = Math.round(h * f);
      }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      let quality = 0.82;
      let dataURL = canvas.toDataURL('image/jpeg', quality);
      while (dataURL.length > MAX_B64 && quality > 0.25) {
        quality -= 0.08;
        dataURL = canvas.toDataURL('image/jpeg', quality);
      }
      const kb = Math.round(dataURL.length * 0.75 / 1024);
      toast(`✓ Imagen lista (~${kb} KB)`);
      _imagenPendiente = dataURL;
      const prev = document.getElementById('imgPreview');
      prev.innerHTML = `<img src="${dataURL}" style="width:100%;height:100%;object-fit:cover;border-radius:9px;">`;
      prev.style.border = '2px solid var(--green)';
      document.getElementById('btnQuitarImg').style.display = '';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
function quitarImagen() {
  _imagenPendiente = null;
  document.getElementById('imgPreview').innerHTML = '📷';
  document.getElementById('imgPreview').style.border = '2px dashed #7dd3fc';
  document.getElementById('inpImagen').value = '';
  document.getElementById('btnQuitarImg').style.display = 'none';
  // Limpiar también el campo URL si está visible
  const inpUrl = document.getElementById('inpUrlImg');
  if (inpUrl) inpUrl.value = '';
}

function toggleUrlImg() {
  const panel = document.getElementById('panelUrlImg');
  const flecha = document.getElementById('flechaUrlImg');
  if (!panel) return;
  const abierto = panel.style.display !== 'none';
  panel.style.display = abierto ? 'none' : 'block';
  if (flecha) flecha.textContent = abierto ? '▼' : '▲';
}

function usarUrlImagen() {
  const inp = document.getElementById('inpUrlImg');
  if (!inp) return;
  const url = inp.value.trim();
  if (!url) { toast('Pega una URL primero', true); return; }

  // Validación básica: debe ser https:// y parecer una imagen
  if (!url.startsWith('https://')) { toast('La URL debe comenzar con https://', true); return; }

  // Previsualizar cargando desde la URL para confirmar que es válida
  const testImg = new Image();
  testImg.onload = () => {
    _imagenPendiente = url;
    const prev = document.getElementById('imgPreview');
    prev.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:9px;">`;
    prev.style.border = '2px solid var(--green)';
    const btnQ = document.getElementById('btnQuitarImg');
    if (btnQ) btnQ.style.display = '';
    // Cerrar el panel después de usar
    const panel = document.getElementById('panelUrlImg');
    const flecha = document.getElementById('flechaUrlImg');
    if (panel) panel.style.display = 'none';
    if (flecha) flecha.textContent = '▼';
    toast('✓ Imagen desde URL lista');
  };
  testImg.onerror = () => {
    toast('No se pudo cargar la imagen. Verifica que la URL sea pública y correcta.', true);
  };
  testImg.src = url;
}

function editarProd(id) {
  const p = productos.find(x => String(x.id) === String(id)); if (!p) return;
  ['editId','inpCod','inpAbrev','inpNom','inpCat','inpCompra','inpVenta','inpStock','inpMin'].forEach((fid, i) => {
    document.getElementById(fid).value = [p.id, p.cod||'', p.abrev||'', p.nom||'', p.cat||'', p.compra||0, p.venta||0, p.stock||0, p.min||0][i];
  });
  // Cargar imagen si existe
  _imagenPendiente = undefined;
  const prev = document.getElementById('imgPreview');
  const btnQ = document.getElementById('btnQuitarImg');
  // Resetear panel URL al abrir edición
  const _urlInp = document.getElementById('inpUrlImg');
  if (_urlInp) _urlInp.value = '';
  const _urlPanel = document.getElementById('panelUrlImg');
  const _urlFlecha = document.getElementById('flechaUrlImg');
  if (_urlPanel) _urlPanel.style.display = 'none';
  if (_urlFlecha) _urlFlecha.textContent = '▼';
  // Si la imagen actual es una URL (no base64), mostrarla y también rellenar el campo URL
  if (p.img) {
    prev.innerHTML = `<img src="${p.img}" style="width:100%;height:100%;object-fit:cover;border-radius:9px;">`;
    prev.style.border = '2px solid var(--green)';
    if (btnQ) btnQ.style.display = '';
    // Si es URL de Storage (no base64), pre-rellenar el campo para que el usuario pueda verla/editarla
    if (p.img.startsWith('https://') && _urlInp) {
      _urlInp.value = p.img;
      if (_urlPanel) _urlPanel.style.display = 'block';
      if (_urlFlecha) _urlFlecha.textContent = '▲';
    }
  } else {
    prev.innerHTML = '📷';
    prev.style.border = '2px dashed #7dd3fc';
    if (btnQ) btnQ.style.display = 'none';
  }
  document.getElementById('formTitulo').textContent = '✎ Editando: ' + p.nom;
  document.getElementById('btnGuardar').textContent = '✔ ACTUALIZAR PRODUCTO';
  document.getElementById('btnCancelarEdit').style.display = 'inline-flex';
  navTo('pgInvRegistrar');
  setTimeout(function(){ window.scrollTo({top:0,behavior:'smooth'}); }, 80);
  // Cargar presentaciones del producto en el formulario
  _regPresCargar(p.paquetes, p.stock, p.compra, p.venta, p.costoUnidadEntrado, p.ventaUnidadEntrada);
  // Auto-open the register/edit dropdown (legacy — no-op now)
  const dropContent = document.getElementById('dropRegistrar');
  const dropBtn     = document.getElementById('dropBtnRegistrar');
  if (dropContent && !dropContent.classList.contains('open')) {
    document.querySelectorAll('.inv-dropdown-content').forEach(el => el.classList.remove('open'));
    document.querySelectorAll('.inv-dropdown-btn').forEach(el => el.classList.remove('open'));
    dropContent.classList.add('open');
    if (dropBtn) dropBtn.classList.add('open');
  }
  setTimeout(() => { const el = document.getElementById('dropBtnRegistrar'); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); }, 120);
}
// ===== RESTOCK — Agregar cantidades compradas =====
// ── RESTOCK: variables de estado ──
let _restockModo  = 'simple'; // 'simple' | 'presentaciones'
let _restockLineas = [];      // líneas de entrada por presentación

function abrirRestock(id) {
  const p = productos.find(x => String(x.id) === String(id)); if (!p) return;
  document.getElementById('restockProdId').value = id;

  const imgEl = document.getElementById('restockProdImg');
  imgEl.innerHTML = p.img
    ? `<img src="${p.img}" style="width:100%;height:100%;object-fit:cover;border-radius:9px;">`
    : `<span style="font-size:22px;">${(p.cat||'📦')[0]}</span>`;

  document.getElementById('restockProdNom').textContent       = p.nom;
  document.getElementById('restockProdNomTitle').textContent  = p.nom;
  document.getElementById('restockProdStock').textContent     = `Stock actual: ${p.stock||0} uds  ·  Mín: ${p.min||0}  ·  P.compra: $${fmtP(p.compra||0)}`;

  document.getElementById('restockCantidad').value     = '';
  document.getElementById('restockPrecioCompra').value = '';
  document.getElementById('restockResumen').style.display = 'none';

  _restockLineas = [];

  // Si el producto tiene paquetes, abrir directamente en modo presentaciones
  if ((p.paquetes||[]).length > 0) {
    _restockSetModoUI('presentaciones');
    _restockIniciarLineas(p);
    _restockRenderLineas(p);
  } else {
    _restockSetModoUI('simple');
  }

  abrirModal('modalRestock');
  setTimeout(() => {
    if ((p.paquetes||[]).length > 0) return; // foco no necesario en modo pres
    document.getElementById('restockCantidad')?.focus();
  }, 80);
}

function restockSetModo(modo) {
  _restockModo = modo;
  _restockSetModoUI(modo);
  if (modo === 'presentaciones') {
    const pid = document.getElementById('restockProdId').value;
    const p   = productos.find(x => String(x.id) === String(pid));
    if (_restockLineas.length === 0) _restockIniciarLineas(p);
    _restockRenderLineas(p);
  }
}

function _restockSetModoUI(modo) {
  _restockModo = modo;
  const btnS = document.getElementById('btnModoSimple');
  const btnP = document.getElementById('btnModoPresentaciones');
  const divS = document.getElementById('restockModoSimple');
  const divP = document.getElementById('restockModoPresentaciones');
  if (modo === 'simple') {
    btnS.style.cssText += ';background:var(--green);color:#fff;border-color:var(--green);';
    btnP.style.cssText += ';background:#fff;color:var(--text-muted);border-color:var(--border-mid);';
    divS.style.display = ''; divP.style.display = 'none';
  } else {
    btnP.style.cssText += ';background:var(--green);color:#fff;border-color:var(--green);';
    btnS.style.cssText += ';background:#fff;color:var(--text-muted);border-color:var(--border-mid);';
    divP.style.display = ''; divS.style.display = 'none';
  }
}

function _restockIniciarLineas(p) {
  _restockLineas = [];
  if (!p) return;
  const pkgs = (p.paquetes||[]).slice().sort((a,b)=>b.cant-a.cant);
  // Una línea por paquete existente (cant=0 para que el usuario llene)
  pkgs.forEach(pk => {
    // CORRECCIÓN: costo debe ser precio de COMPRA por presentación, no venta (pk.precio).
    const costoXPres = pk.precioCompra > 0
      ? pk.precioCompra * pk.cant
      : (Number(p.compra) > 0 ? Number(p.compra) * pk.cant : 0);
    _restockLineas.push({
      id: uid(), pkgId: String(pk.id),
      label: pk.label || ('Paquete ' + pk.cant + ' uds'),
      uds: pk.cant, cant: '', costo: costoXPres, venta: pk.precio||0,
      esNuevo: false
    });
  });
  // Línea de unidad siempre al final
  _restockLineas.push({
    id: uid(), pkgId: 'unidad',
    label: 'Unidad', uds: 1, cant: '', costo: p.compra||0, venta: p.venta||0,
    esNuevo: false
  });
}

function _restockRenderLineas(p) {
  if (!p) { const pid = document.getElementById('restockProdId').value; p = productos.find(x=>String(x.id)===String(pid)); }
  const cont = document.getElementById('restockLineas');
  if (!cont) return;
  const pkgs = (p&&p.paquetes||[]).slice().sort((a,b)=>b.cant-a.cant);

  // Opciones para el dropdown de nombre
  function _pkgOpts(ln) {
    const existentes = pkgs.map(pk =>
      `<div class="rs-pkg-opt" onclick="restockSelPkg('${ln.id}','${pk.id}')" style="padding:9px 13px;cursor:pointer;font-weight:800;font-size:13px;border-bottom:1px solid #f0f0f0;display:flex;justify-content:space-between;align-items:center;" onmouseover="this.style.background='#f0fdf4'" onmouseout="this.style.background=''">
        <span>📦 ${pk.label||('Paquete '+pk.cant+' uds')}</span>
        <span style="font-size:11px;color:var(--text-muted);">${pk.cant} uds · $${fmtP(pk.precio)}</span>
      </div>`
    ).join('');
    const unidadSel = ln.pkgId==='unidad' ? 'background:#f0fdf4;' : '';
    return existentes +
      `<div class="rs-pkg-opt" onclick="restockSelPkg('${ln.id}','unidad')" style="padding:9px 13px;cursor:pointer;font-weight:800;font-size:13px;border-bottom:1px solid #f0f0f0;${unidadSel}" onmouseover="this.style.background='#f0fdf4'" onmouseout="this.style.background='${unidadSel}'">🔹 Unidad</div>` +
      `<div class="rs-pkg-opt" onclick="restockSelPkg('${ln.id}','nuevo')" style="padding:9px 13px;cursor:pointer;font-weight:900;font-size:13px;color:var(--green-dark);" onmouseover="this.style.background='#f0fdf4'" onmouseout="this.style.background=''">➕ Nuevo paquete</div>`;
  }

  cont.innerHTML = _restockLineas.map((ln, i) => {
    const udsNum   = Number(ln.uds)||1;
    const cantNum  = Number(ln.cant)||0;
    const costoNum = Number(ln.costo)||0;
    const ventaNum = Number(ln.venta)||0;
    const udsTotal = udsNum * cantNum;
    const costoSub = costoNum * cantNum;
    const showSub  = cantNum > 0 && (costoNum > 0 || ventaNum > 0);
    const margen   = ventaNum > 0 && costoNum > 0 ? (((ventaNum - costoNum)/costoNum)*100).toFixed(0) : null;

    // Nombre label que muestra el dropdown
    const nombreMostrado = ln.pkgId === 'unidad' ? 'Unidad'
      : ln.pkgId === 'nuevo' ? (ln.label || 'Nuevo paquete')
      : (pkgs.find(pk=>String(pk.id)===String(ln.pkgId))?.label || ln.label || 'Seleccionar...');

    return `<div class="reg-pres-card" data-rsid="${ln.id}" style="position:relative;">
      <div class="reg-pres-card-header" style="position:relative;">
        <div style="position:relative;flex:1;">
          <input class="reg-pres-card-title" type="text" value="${nombreMostrado}"
            placeholder="Toca para elegir presentación…"
            readonly
            onclick="restockToggleDropdown('${ln.id}')"
            style="cursor:pointer;background:var(--green-light);caret-color:transparent;">
          <div id="rsdrop_${ln.id}" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:999;background:#fff;border:2px solid var(--green);border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.13);overflow:hidden;margin-top:3px;">
            ${_pkgOpts(ln)}
          </div>
        </div>
        <button type="button" class="reg-pres-del" onclick="restockEliminarLinea('${ln.id}')" title="Eliminar">✕</button>
      </div>
      <div class="reg-pres-card-grid">
        <div class="reg-pres-field uds">
          <label style="color:var(--text-muted);">📏 Uds por presentación</label>
          <input type="number" min="1" step="1" value="${ln.uds||''}" placeholder="50"
            ${ln.pkgId !== 'nuevo' && ln.pkgId !== 'unidad' && pkgs.find(pk=>String(pk.id)===String(ln.pkgId)) ? 'readonly style="background:#f5f5f5;"' : ''}
            oninput="restockEditarLinea('${ln.id}','uds',this.value)">
        </div>
        <div class="reg-pres-field cant">
          <label style="color:var(--green-dark);">🛒 Cantidad comprada</label>
          <input type="number" min="0" step="0.5" value="${ln.cant||''}" placeholder="0"
            oninput="restockEditarLinea('${ln.id}','cant',this.value)">
        </div>
        <div class="reg-pres-field costo">
          <label style="color:#b45309;">💲 Precio costo / pres.</label>
          <input type="number" min="0" step="any" value="${ln.costo||''}" placeholder="0.00"
            oninput="restockEditarLinea('${ln.id}','costo',this.value)">
        </div>
        <div class="reg-pres-field venta">
          <label style="color:var(--green-dark);">🏷 Precio venta / pres.</label>
          <input type="number" min="0" step="any" value="${ln.venta||''}" placeholder="0.00"
            oninput="restockEditarLinea('${ln.id}','venta',this.value)">
        </div>
      </div>
      ${showSub ? `<div class="reg-pres-subtotal">
        <span style="color:var(--text-muted);">📦 ${udsTotal} uds · costo <strong style="color:#b45309;">$${costoSub.toFixed(2)}</strong></span>
        <span style="color:var(--green-dark);">venta <strong>$${(ventaNum*cantNum).toFixed(2)}</strong>${margen ? ` <span style="font-size:10px;color:var(--amber);margin-left:4px;">+${margen}%</span>` : ''}</span>
      </div>` : ''}
    </div>`;
  }).join('');

  _restockActualizarResumenPres(p);
}

function restockAgregarLinea() {
  const pid = document.getElementById('restockProdId').value;
  const p   = productos.find(x=>String(x.id)===String(pid));
  _restockLineas.push({
    id: uid(), pkgId: null,
    label: '', uds: '', cant: '', costo: '', venta: '',
    esNuevo: true
  });
  _restockRenderLineas(p);
}

function restockToggleDropdown(id) {
  // Cerrar todos los otros dropdowns abiertos
  document.querySelectorAll('[id^="rsdrop_"]').forEach(el => {
    if (el.id !== 'rsdrop_' + id) el.style.display = 'none';
  });
  const dd = document.getElementById('rsdrop_' + id);
  if (dd) dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
}
// Cerrar dropdowns restock al tocar fuera
document.addEventListener('click', function(e) {
  if (!e.target.closest('.reg-pres-card') && !e.target.closest('[id^="rsdrop_"]')) {
    document.querySelectorAll('[id^="rsdrop_"]').forEach(el => el.style.display = 'none');
  }
}, true);

function restockSelPkg(lineaId, pkgId) {
  const ln = _restockLineas.find(l=>l.id===lineaId); if (!ln) return;
  const pid = document.getElementById('restockProdId').value;
  const p   = productos.find(x=>String(x.id)===String(pid));
  const pkgs = (p&&p.paquetes||[]);

  ln.pkgId = pkgId;
  if (pkgId === 'unidad') {
    ln.label = 'Unidad'; ln.uds = 1;
    ln.costo = p ? p.compra||0 : 0;
    ln.venta = p ? p.venta||0  : 0;
    ln.esNuevo = false;
  } else if (pkgId === 'nuevo') {
    ln.label = ''; ln.uds = ''; ln.costo = ''; ln.venta = '';
    ln.esNuevo = true;
  } else {
    const pk = pkgs.find(pk=>String(pk.id)===pkgId);
    if (pk) {
      ln.label = pk.label || ('Paquete '+pk.cant+' uds');
      ln.uds   = pk.cant;
      ln.costo = pk.precio || 0;
      ln.venta = pk.precio || 0;
      ln.esNuevo = false;
    }
  }
  // Cerrar dropdown
  const dd = document.getElementById('rsdrop_' + lineaId);
  if (dd) dd.style.display = 'none';
  _restockRenderLineas(p);
}

function restockEliminarLinea(id) {
  _restockLineas = _restockLineas.filter(l=>l.id!==id);
  const pid = document.getElementById('restockProdId').value;
  _restockRenderLineas(productos.find(x=>String(x.id)===String(pid)));
}

function restockCambiarTipo(id, valor) {
  // legacy - no longer used but kept for compatibility
}

function restockEditarLinea(id, campo, valor) {
  const ln = _restockLineas.find(l=>l.id===id); if (!ln) return;
  // label stays as string, numeric fields parsed as float
  if (campo === 'label') ln.label = valor;
  else ln[campo] = valor === '' ? '' : (parseFloat(valor)||0);
  const pid = document.getElementById('restockProdId').value;
  _restockActualizarResumenPres(productos.find(x=>String(x.id)===String(pid)));
}

function _restockActualizarResumenPres(p) {
  let totalUds = 0, totalInv = 0;
  const lineasValidas = [];
  _restockLineas.forEach(ln => {
    const cant  = Number(ln.cant)||0;
    const costo = Number(ln.costo)||0;
    const udsLn = Number(ln.uds)||1;
    if (cant <= 0) return;
    const uds = udsLn * cant;
    totalUds += uds; totalInv += costo * cant;
    lineasValidas.push({ ln, uds, sub: costo * cant });
  });
  const box  = document.getElementById('restockResumenPres');
  const boxC = document.getElementById('restockPrecioUdCalc');
  const boxL = document.getElementById('restockResumenPresLineas');
  if (!lineasValidas.length) { if(box)box.style.display='none'; if(boxC)boxC.style.display='none'; return; }
  if(box)box.style.display='';
  if(boxL)boxL.innerHTML = lineasValidas.map(({ln,uds,sub}) => {
    const lbl = `${ln.cant} × ${ln.label||('Pres.')} → ${uds} uds`;
    return `<div style="display:flex;justify-content:space-between;"><span>📌 ${lbl}</span><span style="color:var(--green-dark);">$${sub.toFixed(2)}</span></div>`;
  }).join('');
  if(document.getElementById('restockTotalUds')) document.getElementById('restockTotalUds').textContent = Math.round(totalUds)+' uds';
  if(document.getElementById('restockTotalInv')) document.getElementById('restockTotalInv').textContent = '$'+totalInv.toFixed(2);
  if(boxC && totalUds>0) { boxC.style.display=''; boxC.innerHTML = `💲 Costo promedio por unidad: <strong style="color:var(--green-dark);font-family:'Space Mono',monospace;">$${fmtP(totalInv/totalUds)}</strong>`; }
  else if(boxC) boxC.style.display='none';
}

function restockActualizarResumen() {
  const pid  = document.getElementById('restockProdId').value;
  const p    = productos.find(x => String(x.id) === String(pid));
  const cant = parseInt(document.getElementById('restockCantidad').value) || 0;
  const prec = parseFloat(document.getElementById('restockPrecioCompra').value) || null;
  const resEl= document.getElementById('restockResumen');
  if (!p || cant <= 0) { resEl.style.display='none'; return; }
  const stockNuevo = (p.stock||0) + cant;
  const costoTotal = prec ? (cant*prec).toFixed(2) : null;
  resEl.style.display = 'block';
  resEl.innerHTML = `
    <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>Stock actual</span><span class="mono">${p.stock||0} uds</span></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>+ Agregar</span><span class="mono" style="color:var(--green);">+${cant} uds</span></div>
    <div style="display:flex;justify-content:space-between;font-weight:900;color:var(--green-dark);border-top:1px solid var(--border);padding-top:6px;margin-top:2px;"><span>Nuevo stock total</span><span class="mono">${stockNuevo} uds</span></div>
    ${costoTotal?`<div style="display:flex;justify-content:space-between;margin-top:4px;color:var(--blue);"><span>Costo total</span><span class="mono">$${costoTotal}</span></div>`:''}
  `;
}

function confirmarRestock() {
  const pid = document.getElementById('restockProdId').value;
  const p   = productos.find(x => String(x.id) === String(pid)); if (!p) return;
  let cantTotal = 0, nuevoPrecio = null;

  if (_restockModo === 'simple') {
    cantTotal   = parseInt(document.getElementById('restockCantidad').value) || 0;
    nuevoPrecio = parseFloat(document.getElementById('restockPrecioCompra').value) || null;
    if (cantTotal <= 0) { toast('Ingresa una cantidad válida', true); return; }
  } else {
    let totalInv = 0;
    _restockLineas.forEach(ln => {
      const cant  = Number(ln.cant)||0;
      const costo = Number(ln.costo)||0;
      const udsLn = Number(ln.uds)||1;
      if (cant <= 0) return;
      const uds = udsLn * cant;
      cantTotal += uds; totalInv += costo * cant;

      // Actualizar precio venta del paquete existente si cambió
      if (ln.pkgId && ln.pkgId !== 'unidad' && ln.pkgId !== 'nuevo' && ln.pkgId !== null) {
        const pk = (p.paquetes||[]).find(pk => String(pk.id) === String(ln.pkgId));
        if (pk) {
          if (Number(ln.venta) > 0) pk.precio = Number(ln.venta);
          if (Number(ln.costo) > 0) pk.precioCompra = Number(ln.costo) / udsLn;
        }
      }
      // Agregar nuevo paquete si es "nuevo" y tiene datos suficientes
      if (ln.pkgId === 'nuevo' && Number(ln.uds) > 1 && Number(ln.venta) > 0) {
        if (!p.paquetes) p.paquetes = [];
        const nuevoId = String(Date.now() + Math.random());
        p.paquetes.push({
          id:           nuevoId,
          cant:         udsLn,
          precio:       Number(ln.venta),
          precioCompra: costo > 0 ? costo / udsLn : 0,
          label:        ln.label || ('Paquete ' + udsLn + ' uds')
        });
      }
      // Actualizar precio unitario si es fila de unidad
      if (ln.pkgId === 'unidad' && Number(ln.venta) > 0) {
        p.venta = Number(ln.venta);
      }
    });
    if (cantTotal <= 0) { toast('Agrega al menos una presentación con cantidad', true); return; }
    nuevoPrecio = totalInv > 0 ? totalInv/cantTotal : null;
  }

  if (nuevoPrecio && Math.abs(nuevoPrecio-(p.compra||0))>0.001 && (p.stock||0)>0) {
    if (!p.lotes) p.lotes = [];
    p.lotes.push({ compra:p.compra||0, ventaOrig:p.venta||0, stockInicial:p.stock||0, stockRestante:p.stock||0, fecha:new Date().toLocaleString('es-SV') });
    p.compra = parseFloat(nuevoPrecio.toFixed(4));
  } else if (nuevoPrecio) {
    p.compra = parseFloat(nuevoPrecio.toFixed(4));
  }

  p.stock = (p.stock||0) + Math.round(cantTotal);
  restockLog.push({ id:uid(), ts:nowTS(), prodId:String(p.id), cant:Math.round(cantTotal), precioCompra:nuevoPrecio||p.compra||0, fechaStr:new Date().toLocaleString('es-SV') });

  salvar(); cerrarModal('modalRestock');
  const modoLabel = _restockModo==='presentaciones' ? ` (${_restockLineas.filter(l=>Number(l.cant)>0).length} presentaciones)` : '';
  toast(`✓ +${Math.round(cantTotal)} uds agregadas a ${p.nom}  →  Stock: ${p.stock}${modoLabel}`);
  autoBackup('Stock_agregado');
  if (typeof syncAhora==='function') syncAhora('restock');
  if (typeof _broadcast==='function') _broadcast('producto', {...p, img:undefined});
}

function cancelarEdicion() {
  document.getElementById('formProd').reset();
  document.getElementById('editId').value = '';
  document.getElementById('inpAbrev').value = '';
  document.getElementById('formTitulo').textContent = 'Registrar Producto';
  document.getElementById('btnGuardar').textContent = '+ GUARDAR PRODUCTO';
  document.getElementById('btnCancelarEdit').style.display = 'none';
  _imagenPendiente = undefined;
  const prev = document.getElementById('imgPreview');
  if (prev) { prev.innerHTML = '📷'; prev.style.border = '2px dashed #7dd3fc'; }
  const btnQ = document.getElementById('btnQuitarImg');
  if (btnQ) btnQ.style.display = 'none';
  const inpImg = document.getElementById('inpImagen');
  if (inpImg) inpImg.value = '';
  // Resetear panel de URL
  const _ui = document.getElementById('inpUrlImg');
  const _up = document.getElementById('panelUrlImg');
  const _uf = document.getElementById('flechaUrlImg');
  if (_ui) _ui.value = '';
  if (_up) _up.style.display = 'none';
  if (_uf) _uf.textContent = '▼';
  // Resetear presentaciones del formulario — siempre iniciar con fila Unidad vacía
  _regPresCargar([], 0, 0, 0);
}
function borrarProd(id) {
  if (typeof _puedeHacer === 'function' && !_puedeHacer('inventario')) { toast('No tienes permiso para eliminar productos', true); return; }
  if (confirm('¿Eliminar este producto?')) {
    productos = productos.filter(p => String(p.id) !== String(id));
    const idStr = String(id);
    if (!productosEliminados.includes(idStr)) productosEliminados.push(idStr);
    // Broadcast instantáneo del borrado a todos los dispositivos conectados
    if (typeof _broadcast === 'function') _broadcast('producto_borrado', { id: idStr });
    salvar(); renderInv(); toast('Producto eliminado', true);
    if (typeof syncBorrarProducto === 'function') syncBorrarProducto(id);
    // Re-enviar snapshot inmediatamente con productosEliminados actualizado
    if (typeof _autoEnviarSnapshot === 'function') setTimeout(_autoEnviarSnapshot, 500);
  }
}

// ===== 12. VENTA =====

function abrirModalVenta() {
  document.getElementById('busquedaVenta').value = '';
  const s = document.getElementById('sugVenta');
  s.style.display = 'none'; s.innerHTML = '';
  renderCarrito();
  abrirModal('modalVenta');
  setTimeout(() => document.getElementById('busquedaVenta')?.focus(), 50);
}
function cerrarVenta() {
  carrito.forEach(i => {
    const p = productos.find(x => x.id === i.id);
    if (p) p.stock += i.cant * (i.stockPorCant || 1);
  });
  carrito = [];
  renderCarrito();
  cerrarModal('modalVenta');
  renderInv();
  salvarSesion();
}
function buscarV() {
  const txt = document.getElementById('busquedaVenta').value.toUpperCase().trim();
  const sug = document.getElementById('sugVenta');
  sug.innerHTML = '';
  if (!txt) { sug.style.display = 'none'; return; }
  const m = productos.filter(p => {
    const nom = (p.nom||'').toUpperCase(), abrev = (p.abrev||'').toUpperCase(), cod = (p.cod||'').toUpperCase();
    return nom.startsWith(txt) || abrev === txt || abrev.startsWith(txt) || cod.startsWith(txt);
  });
  if (!m.length) {
    sug.innerHTML = `<div style="text-align:center;padding:18px;color:var(--text-muted);font-weight:700;font-size:13px;background:#fff;border-radius:12px;border:1px solid var(--border);">Sin coincidencias para "${txt}"</div>`;
    sug.style.display = 'block'; return;
  }
  const grid = document.createElement('div');
  grid.className = 'sug-grid';
  m.forEach(p => {
    const sinStock = (p.stock || 0) <= 0;
    const stockBajo = !sinStock && (p.stock || 0) <= (p.min || 0);
    const stockColor = sinStock ? 'color:#dc2626' : stockBajo ? 'color:#d97706' : 'color:#4b7a5a';
    const stockTxt = sinStock ? 'Sin stock' : `Stock: ${p.stock}`;
    const hasImg = !!p.img;
    const d = document.createElement('div');
    d.className = 'sug-item' + (sinStock ? ' sin-stock' : '') + (hasImg ? ' has-img' : '');
    d.innerHTML = `
      ${hasImg
        ? `<img class="sug-item-img" src="${p.img}" alt="${p.nom}" loading="lazy">`
        : `<div class="sug-item-ph">${p.cat ? p.cat.charAt(0) : '🛒'}</div>`}
      <div class="sug-item-body">
        <div class="sug-item-cat">${p.cat || 'General'}</div>
        <div class="sug-name">${p.nom}</div>
        <div class="sug-price">$${fmtP(p.venta||0)}</div>
        ${sinStock
        ? '<div class="sug-stock-badge sug-stock-sin">✕ Sin stock</div>'
        : stockBajo
          ? `<div class="sug-stock-badge sug-stock-bajo">⚠ ${stockTxt}</div>`
          : `<div class="sug-stock-badge sug-stock-ok">● ${stockTxt}</div>`}
      </div>
      ${!sinStock ? '<div class="sug-tap-hint">＋ Toca para agregar</div>' : ''}
    `;
    if (!sinStock) {
      d.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        // Ocultar teclado del teléfono inmediatamente
        document.activeElement?.blur();
        document.getElementById('busquedaVenta')?.blur();
        const busq = document.getElementById('busquedaVenta');
        if (busq) { busq.value = ''; }
        sug.style.display = 'none'; sug.innerHTML = '';
        // Pequeño delay para que el teclado del teléfono cierre antes de abrir el modal
        setTimeout(() => {
          (p.paquetes||[]).some(pk => pk.precio > 0 && pk.cant > 1) ? abrirPickerPaquetes(p) : abrirTecladoCantidad(p, null);
        }, 80);
      });
    }
    grid.appendChild(d);
  });
  sug.appendChild(grid);
  sug.style.display = 'block';
}
function vibrarFuerte(cant) { /* vibración desactivada */ }
function addCarrito(p) {
  if ((p.stock || 0) <= 0) { toast('Sin stock disponible', true); return; }
  const cartKey = p.id + '_unit';
  const item = carrito.find(c => c.cartKey === cartKey);
  if (item) item.cant++;
  else carrito.push({ cartKey, id: p.id, nom: p.nom, venta: p.venta, cant: 1, stockPorCant: 1, paqueteLabel: null });
  p.stock--;
  renderCarrito(); salvarSesion();
  actualizarStockFila(p);
  sonidoCarrito();
  const cantActual = carrito.find(c => c.cartKey === cartKey)?.cant || 1;
  toast(`✓ ${p.nom} — cantidad: ${cantActual}`);
}
function addCarritoConPaquete(p, pkg) {
  if ((p.stock || 0) < pkg.cant) { toast(`Stock insuficiente — quedan ${p.stock} uds`, true); return; }
  const cartKey = p.id + '_pkg_' + pkg.id;
  const item = carrito.find(c => c.cartKey === cartKey);
  if (item) { if ((p.stock || 0) < pkg.cant) { toast('Stock insuficiente', true); return; } item.cant++; }
  else carrito.push({ cartKey, id: p.id, nom: p.nom, venta: pkg.precio, cant: 1, stockPorCant: pkg.cant, paqueteLabel: `${pkg.cant} × $${fmtP(pkg.precio)}` });
  p.stock -= pkg.cant;
  renderCarrito(); salvarSesion();
  actualizarStockFila(p);
  sonidoCarrito();
  const cantActualPkg = carrito.find(c => c.cartKey === cartKey)?.cant || 1;
  toast(`✓ ${p.nom} — paquete × ${cantActualPkg}`);
}
function cambiarCant(cartKey, delta) {
  const item  = carrito.find(c => c.cartKey === cartKey);
  const pOrig = productos.find(p => p.id === (item ? item.id : -1));
  if (!item || !pOrig) return;
  const spc = item.stockPorCant || 1;
  if (delta > 0) {
    if ((pOrig.stock || 0) < spc) { toast('Sin stock', true); return; }
    item.cant++; pOrig.stock -= spc;
  } else {
    item.cant--; pOrig.stock += spc;
    if (item.cant <= 0) carrito = carrito.filter(c => c.cartKey !== cartKey);
  }
  renderCarrito(); renderInv(); salvarSesion();
}
function vaciarCarrito() {
  if (!carrito.length) return;
  carrito.forEach(i => { const p = productos.find(x => x.id === i.id); if (p) p.stock += i.cant * (i.stockPorCant || 1); });
  carrito = [];
  renderCarrito(); renderInv(); salvarSesion();
}
function renderCarrito() {
  const c = document.getElementById('carVenta');
  if (!carrito.length) {
    c.innerHTML = `<div class="empty"><span class="empty-icon">🛒</span>Carrito vacío — busca un producto arriba</div>`;
    document.getElementById('txtTotal').textContent = '$0.00';
    return;
  }
  let total = 0;
  c.innerHTML = [...carrito].reverse().map(i => {
    const sub = i.venta * i.cant; total += sub;
    const pkgBadge = i.paqueteLabel ? `<span class="cart-pkg-badge">📦 ${i.paqueteLabel}</span>` : '';
    const prod = productos.find(x => x.id === i.id);
    const imgEl = prod?.img
      ? `<img src="${prod.img}" class="cart-img" style="object-fit:cover;">`
      : `<div class="cart-img">${(prod?.cat||'🛒')[0]}</div>`;
    const precioLbl = i.paqueteLabel ? `$${fmtP(i.venta)}/paq` : `$${fmtP(i.venta)} c/u`;
    return `<div class="cart-item">
      ${imgEl}
      <div class="cart-info">
        <div class="cart-name">${i.nom}${pkgBadge}</div>
        <div class="cart-sub">${precioLbl}</div>
      </div>
      <div class="cart-controls">
        <div class="cart-total">$${sub.toFixed(2)}</div>
        <div class="qty-row">
          <button class="qty-btn minus" onclick="cambiarCant('${i.cartKey}',-1)">−</button>
          <span class="qty-num">${i.cant}</span>
          <button class="qty-btn plus" onclick="cambiarCant('${i.cartKey}',1)">+</button>
        </div>
      </div>
    </div>`;
  }).join('');
  document.getElementById('txtTotal').textContent = '$' + total.toFixed(2);

  // ── Resumen Ingreso / Costo / Utilidad en el carrito ─────────
  const totalCostoCarrito = carrito.reduce((s, i) => {
    const p = productos.find(x => x.id === i.id);
    return s + (p ? (Number(p.compra)||0) : 0) * i.cant * (i.stockPorCant||1);
    }, 0);
  const utilCarrito = total - totalCostoCarrito;
  const utilPos     = utilCarrito >= 0;
  let resEl = document.getElementById('carritoUtilidad');
  if (!resEl) {
    resEl = document.createElement('div');
    resEl.id = 'carritoUtilidad';
    c.parentNode.insertBefore(resEl, c.nextSibling);
  }
  resEl.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:8px 0 2px;border-top:2px dashed #e5e7eb;margin-top:6px;text-align:center;">
      <div>
        <div style="font-size:9px;font-weight:900;color:#15803d;text-transform:uppercase;">💰 Ingreso</div>
        <div style="font-size:13px;font-weight:900;color:#15803d;">$${total.toFixed(2)}</div>
      </div>
      <div>
        <div style="font-size:9px;font-weight:900;color:#dc2626;text-transform:uppercase;">📦 Costo</div>
        <div style="font-size:13px;font-weight:900;color:#dc2626;">$${totalCostoCarrito.toFixed(2)}</div>
      </div>
      <div style="background:${utilPos ? '#f0fdf4' : '#fef2f2'};border-radius:8px;padding:2px 4px;">
        <div style="font-size:9px;font-weight:900;color:${utilPos ? '#059669' : '#dc2626'};text-transform:uppercase;">${utilPos ? '✅ Utilidad' : '🔴 Pérdida'}</div>
        <div style="font-size:13px;font-weight:900;color:${utilPos ? '#059669' : '#dc2626'};">${utilPos ? '+' : ''}$${utilCarrito.toFixed(2)}</div>
      </div>
    </div>`;
}

// ===== 13b. TECLADO NUMÉRICO DE CANTIDAD =====

let _cantProd = null;
let _cantOp   = null;
let _cantDigits = '';

function abrirTecladoCantidad(p, op) {
  // Asegurar que el teclado del teléfono esté oculto
  document.activeElement?.blur();

  _cantProd   = p;
  _cantOp     = op;   // null = unidad simple, objeto = opcion del picker
  _cantDigits = '';  // vacío para que el usuario ingrese su cantidad

  // Precio de referencia para subtotal
  const precio = op ? op.precio : (p.venta || 0);
  const stockPorCant = op ? (op.stockPorCant || 1) : 1;
  const stockDisp = op ? op.disponibles : Math.floor((p.stock || 0) / stockPorCant);
  const labelPrecio = op
    ? (op.paqueteLabel || op.label || `$${fmtP(precio)}`)
    : `$${fmtP(precio)} c/u`;

  // Header del producto
  const imgEl = p.img
    ? `<img class="cant-prod-img" src="${p.img}" alt="${p.nom}">`
    : `<div class="cant-prod-img-ph">${(p.cat||'🛒')[0]}</div>`;

  document.getElementById('cantProdInfo').innerHTML = `
    ${imgEl}
    <div style="min-width:0;">
      <div class="cant-prod-nom">${p.nom}</div>
      <div class="cant-prod-precio">${labelPrecio}</div>
    </div>`;

  // Stock badge
  document.getElementById('cantStockBadge').textContent =
    stockDisp > 0 ? `Disponibles: ${stockDisp}` : '⚠ Stock limitado';

  window._cantPrecioRef     = precio;
  window._cantStockDispRef  = stockDisp;

  _cantActualizarDisplay();
  abrirModal('modalCantidad');
}

function _cantActualizarDisplay() {
  const num  = parseInt(_cantDigits) || 0;
  const prec = window._cantPrecioRef || 0;
  const disp = document.getElementById('cantDisplay');
  const sub  = document.getElementById('cantSubtotal');
  if (!disp) return;
  disp.textContent = _cantDigits === '' ? '—' : (num || '0');
  disp.style.opacity = _cantDigits === '' ? '0.3' : '1';
  // Siempre mostrar precio unitario; agregar subtotal cuando hay cantidad
  if (_cantDigits === '') {
    sub.textContent = `$${prec.toFixed(2)} c/u`;
    sub.style.opacity = '1';
  } else {
    sub.textContent = `$${prec.toFixed(2)} × ${num} = $${(num * prec).toFixed(2)}`;
    sub.style.opacity = '1';
  }
  disp.classList.remove('bump');
  void disp.offsetWidth;
  disp.classList.add('bump');
  setTimeout(() => disp.classList.remove('bump'), 150);
}

function cantTecladoDigito(d) {
  if (_cantDigits === '0' || _cantDigits === '') {
    _cantDigits = d === '0' ? '' : d;
  } else {
    if (_cantDigits.length >= 4) return; // máx 9999
    _cantDigits += d;
  }
  _cantActualizarDisplay();
}

function cantTecladoBorrar() {
  _cantDigits = _cantDigits.slice(0, -1);
  _cantActualizarDisplay();
}

function cantTecladoConfirmar() {
  const cant = parseInt(_cantDigits) || 0;
  if (cant < 1) { toast('Ingresa una cantidad', true); return; }
  const p  = _cantProd;
  const op = _cantOp;
  if (!p) return;

  const stockPorCant = op ? (op.stockPorCant || 1) : 1;
  const totalStock   = cant * stockPorCant;

  if ((p.stock || 0) < totalStock) {
    toast(`Sin stock suficiente — quedan ${Math.floor((p.stock||0)/stockPorCant)}`, true);
    return;
  }

  cerrarModal('modalCantidad');

  if (!op || op.pkgId === null) {
    // Unidad simple
    const cartKey = p.id + '_unit';
    const item = carrito.find(c => c.cartKey === cartKey);
    if (item) item.cant += cant;
    else carrito.push({ cartKey, id: p.id, nom: p.nom, venta: p.venta, cant, stockPorCant: 1, paqueteLabel: null });
    p.stock -= cant;
  } else {
    // Paquete / presentación
    const pkg = (p.paquetes||[]).find(pk => pk.id === op.pkgId);
    if (!pkg) return;
    const cartKey = p.id + '_pkg_' + pkg.id;
    const item = carrito.find(c => c.cartKey === cartKey);
    if (item) item.cant += cant;
    else carrito.push({ cartKey, id: p.id, nom: p.nom, venta: pkg.precio, cant, stockPorCant: pkg.cant, paqueteLabel: `${pkg.cant} × $${fmtP(pkg.precio)}` });
    p.stock -= cant * pkg.cant;
  }

  renderCarrito(); salvarSesion();
  actualizarStockFila(p);
  sonidoCarrito();
  vibrarFuerte(cant);

  // Limpiar búsqueda para agilizar siguiente producto
  const busq = document.getElementById('busquedaVenta');
  if (busq) { busq.value = ''; busq.dispatchEvent(new Event('input')); setTimeout(() => busq.focus(), 80); }

  const label = op && op.label && op.pkgId !== null ? `${op.label} ×${cant}` : `×${cant}`;
  toast(`✓ ${p.nom} — ${label}`);
}

// ===== 13. PAQUETES =====

let _pkgProdIdActivo = null;

function abrirGestionPaquetes(prodId) {
  const p = productos.find(x => String(x.id) === String(prodId)); if (!p) return;
  _pkgProdIdActivo = prodId;
  document.getElementById('pkgProdId').value  = prodId;
  document.getElementById('pkgProdNom').textContent = p.nom + ' · Stock: ' + (p.stock||0) + ' uds';
  document.getElementById('pkgUnitInfo').textContent = `1 unidad  →  $${fmtP(p.venta)}`;
  document.getElementById('pkgInpCant').value   = '';
  document.getElementById('pkgInpPrecio').value = '';
  document.getElementById('pkgPreviewBox').style.display = 'none';
  renderPkgLista(p);
  abrirModal('modalPaquetes');
}

function renderPkgLista(p) {
  const lista = document.getElementById('pkgLista');
  if (!p) p = productos.find(x => x.id === _pkgProdIdActivo);
  if (!p) return;
  const paquetes = (p.paquetes || []).slice().sort((a,b) => b.cant - a.cant);

  if (!paquetes.length) {
    lista.innerHTML = `<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:13px;font-weight:700;">Sin presentaciones — agrega una abajo</div>`;
    return;
  }

  // Calcular ventas por paquete desde el historial
  const ventasPorPkg = {};
  historial.forEach(v => {
    (v.items||[]).forEach(it => {
      if (String(it.id) !== String(p.id) || !it.paqueteLabel) return;
      const key = it.paqueteLabel;
      if (!ventasPorPkg[key]) ventasPorPkg[key] = { cant: 0, ingresos: 0 };
      ventasPorPkg[key].cant     += Number(it.cant || 0);
      ventasPorPkg[key].ingresos += Number(it.cant || 0) * Number(it.precio || 0);
    });
  });

  lista.innerHTML = paquetes.map((pk, i) => {
    const label    = `${pk.cant} × $${fmtP(pk.precio)}`;
    const stats    = ventasPorPkg[label] || { cant: 0, ingresos: 0 };
    const precioUd = pk.precio / pk.cant;
    const hayStock = (p.stock||0) >= pk.cant;
    return `
    <div style="background:#fff;border:1.5px solid var(--border);border-radius:12px;padding:12px 14px;display:grid;grid-template-columns:1fr auto;gap:8px;align-items:start;">
      <div>
        <!-- encabezado presentación -->
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="background:var(--green);color:#fff;border-radius:8px;padding:3px 10px;font-size:13px;font-weight:900;">${pk.cant} uds</span>
          <span style="font-family:'Space Mono',monospace;font-size:17px;font-weight:900;color:var(--green);">$${fmtP(pk.precio)}</span>
          ${!hayStock ? `<span class="badge badge-red" style="font-size:10px;">Sin stock</span>` : ''}
        </div>
        <!-- detalle -->
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <div style="font-size:11px;color:var(--text-muted);font-weight:700;">💲 $${fmtP(precioUd)}/ud</div>
          <div style="font-size:11px;color:var(--blue);font-weight:700;">📦 Vendidas: ${stats.cant} uds</div>
          <div style="font-size:11px;color:var(--green-dark);font-weight:700;">💰 Ingresos: $${stats.ingresos.toFixed(2)}</div>
        </div>
      </div>
      <button class="btn btn-danger" style="padding:6px 10px;font-size:12px;" onclick="borrarPaquete(${i})">✕</button>
    </div>`;
  }).join('');
}

function pkgPreview() {
  const cant   = parseInt(document.getElementById('pkgInpCant').value)   || 0;
  const precio = parseFloat(document.getElementById('pkgInpPrecio').value) || 0;
  const box    = document.getElementById('pkgPreviewBox');
  if (cant < 1 || precio <= 0) { box.style.display='none'; return; }
  const p = productos.find(x => x.id === _pkgProdIdActivo);
  const precioUd = precio / cant;
  const base     = p ? p.venta : 0;
  const ahorro   = base > 0 ? (((base*cant - precio)/(base*cant))*100).toFixed(0) : null;
  box.style.display = 'block';
  box.innerHTML = `
    <div style="display:flex;gap:16px;flex-wrap:wrap;">
      <span>📦 ${cant} uds por <b>$${fmtP(precio)}</b></span>
      <span>💲 $${fmtP(precioUd)} por unidad</span>
      ${ahorro ? `<span style="color:var(--green);">🏷 ${ahorro}% más barato que unidad</span>` : ''}
    </div>`;
}

function guardarPaquete() {
  const cant   = parseInt(document.getElementById('pkgInpCant').value)    || 0;
  const precio = parseFloat(document.getElementById('pkgInpPrecio').value) || 0;
  if (cant < 1)    { toast('La cantidad debe ser al menos 1', true); return; }
  if (precio <= 0) { toast('El precio debe ser mayor a 0', true);    return; }
  const p = productos.find(x => String(x.id) === String(_pkgProdIdActivo)); if (!p) return;
  if (!p.paquetes) p.paquetes = [];
  if (p.paquetes.find(pk => pk.cant === cant)) { toast('Ya existe una presentación de ' + cant + ' uds', true); return; }
  p.paquetes.push({ id: Date.now(), cant, precio });
  p.paquetes.sort((a,b) => a.cant - b.cant);
  document.getElementById('pkgInpCant').value   = '';
  document.getElementById('pkgInpPrecio').value = '';
  document.getElementById('pkgPreviewBox').style.display = 'none';
  salvar();
  renderPkgLista(p);
  toast(`✓ Presentación ${cant} uds por $${fmtP(precio)} guardada`);
  if (typeof syncAhora === 'function') syncAhora('productos');
}

function borrarPaquete(idx) {
  const p = productos.find(x => String(x.id) === String(_pkgProdIdActivo)); if (!p) return;
  const pk = (p.paquetes||[]).slice().sort((a,b)=>b.cant-a.cant)[idx];
  if (!pk || !confirm(`¿Eliminar presentación de ${pk.cant} uds por $${fmtP(pk.precio)}?`)) return;
  p.paquetes = p.paquetes.filter(x => x.id !== pk.id);
  salvar(); renderPkgLista(p);
  toast('Presentación eliminada', true);
  if (typeof syncAhora === 'function') syncAhora('productos');
}

// Descompone stock en denominaciones de paquetes (igual que _regPresCargar)
function _desglosarStock(p) {
  const pkgs = (p.paquetes||[]).filter(pk=>pk.cant>1).slice().sort((a,b)=>b.cant-a.cant);
  let resto = Math.max(0, p.stock||0);
  const result = [];
  pkgs.forEach(pk => {
    const q = Math.floor(resto / pk.cant);
    resto -= q * pk.cant;
    result.push({ pk, q });
  });
  result.push({ pk: null, q: resto }); // unidades sueltas
  return result;
}

function abrirPickerPaquetes(p) {
  const stock = p.stock || 0;

  // Calcular desglose para header y disponibilidad
  const desglose = _desglosarStock(p);
  const partes = desglose
    .filter(d => d.q > 0)
    .map(d => d.pk
      ? `<b>${d.q}</b> ${d.pk.label || ('×'+d.pk.cant)}`
      : `<b>${d.q}</b> ud${d.q!==1?'s':''}`)
    .join(' · ');

  document.getElementById('pickerProdNom').innerHTML =
    `<span style="font-weight:900;">${p.nom}</span>` +
    `<span style="display:block;font-size:11px;color:var(--text-muted);margin-top:2px;">${partes || (stock+' uds')}</span>`;

  const cont = document.getElementById('pickerOpciones');

  // Filtrar paquetes válidos: precio > 0 y stock suficiente
  const pkgsValidos = (p.paquetes||[])
    .filter(pk => pk.precio > 0 && pk.cant > 1 && stock >= pk.cant)
    .sort((a,b) => b.cant - a.cant);

  const opciones = [
    { label: 'Unidad', sublabel: '1 unidad', cant: 1, precio: p.venta, stockPorCant: 1, pkgId: null,
      disponibles: stock },
    ...pkgsValidos.map(pk => ({
        label:        pk.label || ('Paquete ' + pk.cant + ' uds'),
        sublabel:     pk.cant + ' unidades',
        cant:         pk.cant,
        precio:       pk.precio,
        stockPorCant: pk.cant,
        pkgId:        pk.id,
        disponibles:  Math.floor(stock / pk.cant)
      }))
  ];

  cont.innerHTML = opciones.map((op, i) => {
    const precioUd = op.cant > 0 ? (op.precio / op.cant) : op.precio;
    const isBase   = op.pkgId === null;
    const border   = isBase ? 'var(--border-mid)' : 'var(--green)';
    const bg       = isBase ? '#fff' : 'var(--green-light)';
    const dispTxt  = op.disponibles > 0
      ? `<span style="font-size:10px;background:${isBase?'#f3f4f6':'#dcfce7'};color:${isBase?'#6b7280':'#15803d'};border-radius:6px;padding:1px 6px;font-weight:800;">quedan ${op.disponibles}</span>`
      : '';
    return `<button onclick="seleccionarPresentacion(${p.id},${i})" style="background:${bg};border:2px solid ${border};border-radius:12px;padding:13px 16px;cursor:pointer;text-align:left;font-family:'Nunito',sans-serif;transition:all 0.12s;width:100%;" onmouseover="this.style.borderColor='var(--green)';this.style.transform='translateY(-1px)'" onmouseout="this.style.borderColor='${border}';this.style.transform=''">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:16px;font-weight:900;color:var(--text);">${op.label}</span>
            ${dispTxt}
          </div>
          <div style="font-size:11px;font-weight:700;color:var(--text-muted);margin-top:2px;">${op.sublabel} · $${fmtP(precioUd)} c/u</div>
        </div>
        <div style="font-family:'Space Mono',monospace;font-size:22px;font-weight:900;color:var(--green);">$${fmtP(op.precio)}</div>
      </div>
    </button>`;
  }).join('');

  window._pickerOpts = { p, opciones };
  abrirModal('modalPickerPkg');
}

function seleccionarPresentacion(prodId, idx) {
  cerrarModal('modalPickerPkg');
  const { p, opciones } = window._pickerOpts || {};
  if (!p || !opciones) return;
  const op = opciones[idx];
  if (!op) return;
  document.activeElement?.blur();
  setTimeout(() => abrirTecladoCantidad(p, op), 80);
}

// ===== 14. COBRO =====

function abrirCobro() {
  if (!carrito.length) { toast('Carrito vacío', true); return; }
  cobroDigits = '';
  const total = carrito.reduce((a, i) => a + i.venta * i.cant, 0);
  document.getElementById('cobroMonto').textContent = '$' + total.toFixed(2);
  actualizarCobro();
  abrirModal('modalCobro');
}
function actualizarCobro() {
  let disp;
  if (!cobroDigits || cobroDigits === '.') disp = 'CABAL';
  else if (cobroDigits.includes('.')) {
    const [ent, dec = ''] = cobroDigits.split('.');
    disp = '$' + parseInt(ent || '0').toLocaleString('es-SV') + '.' + (dec + '00').substring(0, 2);
  } else disp = '$' + parseInt(cobroDigits).toLocaleString('es-SV') + '.00';
  const dispEl = document.getElementById('dispEfectivo');
  dispEl.textContent = disp;
  dispEl.classList.toggle('active', !!cobroDigits && cobroDigits !== '.');
  dispEl.classList.toggle('cabal', !cobroDigits || cobroDigits === '.');
  const total    = parseFloat(document.getElementById('cobroMonto').textContent.replace('$', '').replace(',', ''));
  const efectivo = cobroDigits ? (parseFloat(cobroDigits) || 0) : total;
  document.getElementById('cobroVuelto').textContent = '$' + Math.max(0, efectivo - total).toFixed(2);
}
function initKeypad() {
  const tn = document.getElementById('tecladoNum'); if (!tn) return;
  tn.innerHTML = '';
  ['7','8','9','4','5','6','1','2','3','.','0','C'].forEach(n => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'key-n' + (n === 'C' ? ' clr' : n === '.' ? ' dot' : '');
    b.textContent = n === 'C' ? '⌫' : n;
    b.onclick = () => {
      if (n === 'C') cobroDigits = cobroDigits.slice(0, -1);
      else if (n === '.') { if (!cobroDigits.includes('.')) cobroDigits += '.'; }
      else {
        if (cobroDigits.includes('.')) { const dec = cobroDigits.split('.')[1]; if (dec.length < 2) cobroDigits += n; }
        else cobroDigits += n;
      }
      actualizarCobro();
    };
    tn.appendChild(b);
  });
}
function finalizarVenta() {
  const total    = parseFloat(document.getElementById('cobroMonto').textContent.replace('$', '').replace(',', ''));
  const efectivo = cobroDigits ? (parseFloat(cobroDigits) || 0) : total;
  if (efectivo < total) { toast('El pago no es suficiente', true); return; }
  const fechaISO = nowISO(), ts = nowTS();
  const venta = {
    id: uid(), ts, fechaISO,
    fechaStr: new Date(fechaISO).toLocaleString('es-SV'),
    items: carrito.map(i => { const p = productos.find(x => x.id === i.id); const esPromo = !!(i.stockPorCant && i.stockPorCant > 1); return { id: String(i.id), nom: i.nom, cant: i.cant * (i.stockPorCant || 1), cantCobrada: i.cant, precio: i.venta, compra: p ? (Number(p.compra) || 0) : 0, totalItem: i.venta * i.cant, costoItem: (p ? (Number(p.compra) || 0) : 0) * i.cant * (i.stockPorCant || 1), esPromo, cat: (p && p.cat) ? p.cat : '', paqueteLabel: i.paqueteLabel || null }; }),
    total: total.toFixed(2), pago: efectivo.toFixed(2), vuelto: Math.max(0, efectivo - total).toFixed(2)
  };
  historial.unshift(venta);

  // Validar que ventasDia/Sem/Mes sean del período actual antes de sumar
  if (typeof _validarFechaReportes === 'function') _validarFechaReportes();
  carrito.forEach(i => {
    const p   = productos.find(x => x.id === i.id);
    const pid = String(i.id);
    const realCant = i.cant * (i.stockPorCant || 1);
    [ventasDia, ventasSem, ventasMes].forEach(r => {
      if (!r[pid]) r[pid] = { id: pid, nom: i.nom, cat: p ? (p.cat || '') : '', cant: 0, total: 0 };
      r[pid].cant  += realCant;
      r[pid].total += i.venta * i.cant;
      if (p && p.cat) r[pid].cat = p.cat;
      if (p && p.nom) r[pid].nom = p.nom;
    });
    // CRÍTICO: actualizar p._ts para que _autoCargarDesdeSupa detecte el cambio
    // y use el stock de Supabase (post-venta) en lugar del stock local del teléfono offline.
    if (p) p._ts = Date.now();
    if (p && p.lotes && p.lotes.length > 0) {
      let restante = realCant;
      p.lotes.forEach(lot => { if (restante > 0 && (lot.stockRestante || 0) > 0) { const d = Math.min(restante, lot.stockRestante); lot.stockRestante -= d; restante -= d; } });
    }
  });
  carrito = []; cobroDigits = '';
  // FIX: Llamar ANTES de salvar() para que ventasDiarias ya tenga el monto
  // correcto cuando Supabase suba el snapshot. Antes se llamaba 400ms DESPUÉS,
  // subiendo ventasDiarias=[] y causando que Estado de Caja mostrara $0.
  if (typeof autoRegistrarVentaDiaria === 'function') autoRegistrarVentaDiaria();
  salvar(); renderCarrito(); cerrarModal('modalCobro'); cerrarModal('modalVenta');
  toast(`✓ Cobrado — $${venta.total}`);
  autoBackup('Venta');
  if (typeof _registrarAccion === 'function') _registrarAccion('venta', '$' + venta.total + ' — ' + (venta.items||[]).map(i=>i.cant+'x '+i.nom).join(', '));

  // ── Venta atómica: RPC en Supabase garantiza stock correcto entre múltiples cajas ──
  const _syncFallback = () => {
    if (typeof syncAhora === 'function') { syncAhora('venta', venta); syncAhora('historial'); syncAhora('productos'); }
    if (typeof _autoEnviarSnapshot === 'function') setTimeout(_autoEnviarSnapshot, 200);
  };
  // Broadcast instantáneo a otros dispositivos (<100ms)
  if (typeof _broadcast === 'function') {
    const ventaBroadcast = { ...venta, items_json: JSON.stringify(venta.items || []) };
    _broadcast('venta', ventaBroadcast);
  }
  if (typeof registrarVentaAtomica === 'function') {
    registrarVentaAtomica(venta).then(res => {
      if (res.ok) {
        // RPC exitosa → actualizar stock local con valores reales de Supabase
        (res.stocks || []).forEach(({ id, stock }) => {
          const p = productos.find(x => String(x.id) === String(id));
          if (p && typeof stock === 'number') { p.stock = stock; actualizarStockFila(p); }
        });
        if (typeof _autoEnviarSnapshot === 'function') setTimeout(_autoEnviarSnapshot, 200);
        if (typeof syncAhora === 'function') syncAhora('productos');
      } else {
        _syncFallback(); // offline o error → flujo normal
      }
    }).catch(_syncFallback);
  } else {
    _syncFallback();
  }
  abrirModalFactura(venta);
  if (typeof _hookTicketAlVender === "function") _hookTicketAlVender(venta);
  if (typeof renderDashboardPro === "function") setTimeout(renderDashboardPro, 400);
  // autoRegistrarVentaDiaria ya se llama sincrónicamente antes de salvar() (ver arriba)
}

// ===== 14B. REGISTRO DE CONTROL DE MERCADERÍA =====

let _ventaParaFactura = null;

function abrirModalFactura(venta) {
  _ventaParaFactura = venta;
  // Render preview
  renderFacturaPreview(venta);
  abrirModal('modalFactura');
}

function renderFacturaPreview(venta) {
  const items = venta.items || [];
  let rows = '';
  items.forEach(it => {
    // FIX: totalItem evita que precio_paquete × uds_fisicas infle el subtotal
    const sub = (it.totalItem !== undefined ? Number(it.totalItem) : it.precio * (it.cantCobrada || it.cant)).toFixed(2);
    rows += `<tr>
      <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;font-weight:700;">${it.nom}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:700;">${it.cant}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;">$${Number(it.precio).toFixed(2)}</td>
      <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:900;color:#16a34a;">$${sub}</td>
    </tr>`;
  });
  document.getElementById('factPreviewBody').innerHTML = rows;
  document.getElementById('factPreviewTotal').textContent = '$' + venta.total;
}

// ── Construye el PDF de comprobante para CUALQUIER venta (actual o histórica) ──
// Ya NO incluye ningún número de registro/control, según fue solicitado.
function _construirPDFVenta(venta) {
  const cliente  = 'Cliente';
  const contacto = '';
  const items    = venta.items || [];

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a5' });

  const W = doc.internal.pageSize.getWidth();
  const VERDE = [22, 163, 74];
  const NEGRO = [5, 46, 22];
  const GRIS  = [100, 116, 139];

  // ── Encabezado ──
  doc.setFillColor(...VERDE);
  doc.rect(0, 0, W, 24, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16); doc.setTextColor(255, 255, 255);
  doc.text('Despensa Económica', 14, 12);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text('Encargada: Abigail', 14, 18);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  doc.text('REGISTRO DE CONTROL DE ENTREGA', W - 14, 18, { align: 'right' });

  let y = 32;

  // ── Datos del cliente ──
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(10, y - 5, W - 20, contacto ? 18 : 13, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...NEGRO);
  doc.text('CLIENTE:', 14, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text(cliente, 38, y);
  if (contacto) {
    y += 6;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...GRIS);
    doc.text('Tel/Email:', 14, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...NEGRO);
    doc.text(contacto, 38, y);
  }
  y += 10;

  // Fecha
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRIS);
  doc.text('Fecha: ' + venta.fechaStr, 14, y); y += 8;

  // ── Tabla de productos ──
  const cabeceras = [['Producto', 'Cant.', 'Precio', 'Total']];
  const filas = items.map(it => [
    it.nom,
    String(it.cant),
    '$' + Number(it.precio).toFixed(2),
    '$' + (it.totalItem !== undefined ? Number(it.totalItem) : it.precio * (it.cantCobrada || it.cant)).toFixed(2)
  ]);

  doc.autoTable({
    head: cabeceras,
    body: filas,
    startY: y,
    styles: { fontSize: 9, textColor: NEGRO, font: 'helvetica', fontStyle: 'normal' },
    headStyles: { fillColor: VERDE, textColor: [255,255,255], fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: [240, 253, 244] },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'right',  cellWidth: 22 },
      3: { halign: 'right',  cellWidth: 24, fontStyle: 'bold', textColor: VERDE }
    },
    margin: { left: 10, right: 10 },
  });

  y = doc.lastAutoTable.finalY + 6;

  // ── Total general ──
  doc.setFillColor(...VERDE);
  doc.roundedRect(10, y, W - 20, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
  doc.text('TOTAL GENERAL', 16, y + 9);
  doc.setFontSize(14);
  doc.text('$' + venta.total, W - 14, y + 9, { align: 'right' });
  y += 20;

  // Pago y vuelto
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRIS);
  doc.text(`Pagó: $${venta.pago}  |  Vuelto: $${venta.vuelto}`, 14, y); y += 10;

  // ── Nota legal ──
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(10, y - 4, W - 20, 20, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...NEGRO);
  const notaLineas = doc.splitTextToSize(
    'Este documento no es una Factura Comercial ni un Crédito Fiscal. Es un registro de control de entrega de mercadería.',
    W - 28
  );
  notaLineas.forEach((linea, i) => {
    doc.text(linea, W / 2, y + (i * 5), { align: 'center' });
  });
  y += notaLineas.length * 5 + 8;

  // Gracias
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...NEGRO);
  doc.text('¡Gracias por su compra!', W / 2, y, { align: 'center' });

  return { doc, cliente };
}

function _nombreArchivoComprobante(cliente) {
  const marca = new Date();
  const sello = marca.toISOString().slice(0,19).replace(/[-T:]/g, '');
  return `Comprobante_${cliente.replace(/\s+/g, '_')}_${sello}.pdf`;
}

function generarFacturaPDF() {
  if (!_ventaParaFactura) return;
  const { doc, cliente } = _construirPDFVenta(_ventaParaFactura);
  doc.save(_nombreArchivoComprobante(cliente));
  toast('✓ Registro descargado');
  cerrarModal('modalFactura');
}

// ── Descargar el comprobante de una venta YA registrada en el historial ──
// (para cuando el cliente pide su comprobante después de haber pagado)
function descargarRegistroHistorial(idx) {
  const venta = historial[idx];
  if (!venta) { toast('⚠️ No se encontró ese cobro'); return; }
  if (!window.jspdf) { toast('⚠️ jsPDF no cargó todavía, intenta de nuevo'); return; }
  const { doc, cliente } = _construirPDFVenta(venta);
  doc.save(_nombreArchivoComprobante(cliente));
  toast('✓ Registro descargado');
}

// ===== 15. REPORTES =====

function actualizarCats() {
  const sel = document.getElementById('selCat'); if (!sel) return;
  const val = sel.value;
  sel.innerHTML = '<option value="todas">Todas</option>';
  const cats = [...new Set(productos.map(p => p.cat).filter(Boolean))].sort();
  cats.forEach(c => sel.innerHTML += `<option value="${c}">${c}</option>`);
  sel.value = cats.includes(val) ? val : 'todas';
  // También poblar el selector de categoría para PDF por rango
  const selPdf = document.getElementById('pdfCategoria'); if (!selPdf) return;
  const valPdf = selPdf.value;
  selPdf.innerHTML = '<option value="todas">📦 Todas las categorías</option>';
  cats.forEach(c => selPdf.innerHTML += `<option value="${c}">${c}</option>`);
  selPdf.value = cats.includes(valPdf) ? valPdf : 'todas';
}
function renderVentas() {
  const f     = document.getElementById('selCat')?.value || 'todas';
  const tbody = document.getElementById('tbodyVentas'); if (!tbody) return;
  // Enriquecer categoria desde el array de productos si el reporte no la trae
  const rows = Object.values(ventasDia || {}).map(v => {
    const prod = productos.find(p => String(p.id) === String(v.id));
    return { ...v, cat: (prod && prod.cat) ? prod.cat : (v.cat || '') };
  }).filter(v => f === 'todas' || (v.cat || '') === f).sort((a, b) => (b.total || 0) - (a.total || 0));
  if (!rows.length) { tbody.innerHTML = `<tr><td colspan="4"><div class="empty"><span class="empty-icon">📊</span>Sin ventas registradas</div></td></tr>`; return; }
  tbody.innerHTML = rows.map(v => {
    const catLabel = v.cat || '—';
    return `<tr><td class="td-bold">${v.nom||'—'}</td><td><span class="badge badge-green" style="font-size:11px;">${catLabel}</span></td><td class="mono">${Number(v.cant||0)}</td><td class="mono td-green">$${Number(v.total||0).toFixed(2)}</td></tr>`;
  }).join('');
}
// ── Filtro de fecha para Historial de Cobros ──────────────────────────────────
function _histFechaToStr(fechaISO) {
  // Devuelve 'YYYY-MM-DD' en hora local a partir de un ISO string
  try { const d = new Date(fechaISO); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
  catch(e) { return ''; }
}
function histFiltroPreset(preset) {
  const desdeEl  = document.getElementById('histDesde');
  const hastaEl  = document.getElementById('histHasta');
  const hoy      = new Date();
  const hoyStr   = _histFechaToStr(hoy.toISOString());
  // Resaltar botón activo
  ['histBtnHoy','histBtnSemana','histBtnMes','histBtnTodo'].forEach(id => {
    const el = document.getElementById(id); if (el) el.classList.remove('active');
  });
  if (preset === 'hoy') {
    if (desdeEl) desdeEl.value = hoyStr;
    if (hastaEl) hastaEl.value = hoyStr;
    const b = document.getElementById('histBtnHoy'); if (b) b.classList.add('active');
  } else if (preset === 'semana') {
    const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - ((hoy.getDay()+6)%7));
    if (desdeEl) desdeEl.value = _histFechaToStr(lunes.toISOString());
    if (hastaEl) hastaEl.value = hoyStr;
    const b = document.getElementById('histBtnSemana'); if (b) b.classList.add('active');
  } else if (preset === 'mes') {
    const primeroDeMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    if (desdeEl) desdeEl.value = _histFechaToStr(primeroDeMes.toISOString());
    if (hastaEl) hastaEl.value = hoyStr;
    const b = document.getElementById('histBtnMes'); if (b) b.classList.add('active');
  } else if (preset === 'todo') {
    if (desdeEl) desdeEl.value = '';
    if (hastaEl) hastaEl.value = '';
    const b = document.getElementById('histBtnTodo'); if (b) b.classList.add('active');
  }
  // 'custom' no activa ningún botón (el usuario escribió fechas manualmente)
  renderHistorial();
}
function _histGetFiltro() {
  const desde = document.getElementById('histDesde')?.value || '';
  const hasta = document.getElementById('histHasta')?.value || '';
  return { desde, hasta };
}
// ──────────────────────────────────────────────────────────────────────────────
function renderHistorial() {
  const div      = document.getElementById('historialList'); if (!div) return;
  const acumEl   = document.getElementById('histAcum');
  const acumVal  = document.getElementById('histAcumVal');
  const contEl   = document.getElementById('histContador');

  // Aplicar filtro de fecha
  const { desde, hasta } = _histGetFiltro();
  const filtrado = historial.filter((v, _realIdx) => {
    if (!desde && !hasta) return true;
    const fechaStr = _histFechaToStr(v.fechaISO || '');
    if (!fechaStr) return true; // sin fecha → siempre mostrar
    if (desde && fechaStr < desde) return false;
    if (hasta && fechaStr > hasta) return false;
    return true;
  });

  // Contador de cobros visibles
  if (contEl) {
    if (desde || hasta) {
      contEl.textContent = `${filtrado.length} de ${historial.length} cobro${historial.length !== 1 ? 's' : ''}`;
    } else {
      contEl.textContent = historial.length ? `${historial.length} cobro${historial.length !== 1 ? 's' : ''}` : '';
    }
  }

  if (!filtrado.length) {
    div.innerHTML = historial.length
      ? `<div class="empty"><span class="empty-icon">🔍</span>Sin cobros en el rango de fechas seleccionado</div>`
      : `<div class="empty"><span class="empty-icon">🕓</span>Sin cobros registrados</div>`;
    if (acumEl) acumEl.style.display = 'none';
    return;
  }

  const totalAcum = filtrado.reduce((s, v) => s + parseFloat(v.total || 0), 0);
  if (acumEl) acumEl.style.display = 'flex';
  if (acumVal) acumVal.textContent = '$' + totalAcum.toFixed(2);

  div.innerHTML = filtrado.map((v) => {
    // Índice real en historial para editar correctamente
    const idx = historial.indexOf(v);
    // Formatear fecha
    let fechaMostrar = v.fechaStr || '—';
    // BUG FIX: Supabase devuelve timestamps con "+00:00" en vez de "Z",
    // por eso la condición anterior (includes('Z')) fallaba y mostraba el ISO crudo.
    // Ahora detectamos cualquier formato ISO con regex.
    if (fechaMostrar && /^\d{4}-\d{2}-\d{2}T/.test(fechaMostrar)) {
      try { const _d = new Date(fechaMostrar); if (!isNaN(_d.getTime())) fechaMostrar = _d.toLocaleString('es-SV'); } catch(e) {}
    }
    const totalFmt  = parseFloat(v.total  || 0).toFixed(2);
    const pagoFmt   = parseFloat(v.pago   || 0).toFixed(2);
    const vueltoFmt = parseFloat(v.vuelto || 0).toFixed(2);
    // ── Calcular totales financieros de la venta ──────────────────
    const ventaIngreso  = parseFloat(v.total || 0);
    const ventaCosto    = (v.items||[]).reduce((s, it) => {
      if (it.costoItem !== undefined) return s + Number(it.costoItem || 0);
      const prod = (productos||[]).find(x => String(x.id) === String(it.id));
      return s + (prod ? (Number(prod.compra)||0) : 0) * Number(it.cant||0);
    }, 0);
    const ventaUtilidad = ventaIngreso - ventaCosto;
    const esUtil        = ventaUtilidad >= 0;

    // ── Desglose por ítem ─────────────────────────────────────────
    const itemsHtml = (v.items||[]).map(it => {
      const itIngreso  = Number(it.totalItem || 0) || (Number(it.precio||0) * Number(it.cantCobrada||it.cant||1));
      const itCosto    = Number(it.costoItem  || 0) || (Number(it.compra||0) * Number(it.cant||1));
      const itUtilidad = itIngreso - itCosto;
      const itPos      = itUtilidad >= 0;
      return `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:5px 0;border-bottom:1px dashed #e5e7eb;gap:6px;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:12px;font-weight:800;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${it.cant}× ${it.nom}${it.paqueteLabel ? ` <span style="font-size:10px;color:#7c3aed;">(${it.paqueteLabel})</span>` : ''}
            </div>
            <div style="font-size:10px;color:#6b7280;margin-top:2px;">
              $${Number(it.precio||0).toFixed(2)} venta · $${Number(it.compra||0).toFixed(2)} costo
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <div style="font-size:12px;font-weight:900;color:#15803d;">$${itIngreso.toFixed(2)}</div>
            <div style="font-size:10px;color:#dc2626;">-$${itCosto.toFixed(2)}</div>
            <div style="font-size:11px;font-weight:900;color:${itPos ? '#059669' : '#dc2626'};">${itPos ? '+' : ''}$${itUtilidad.toFixed(2)}</div>
          </div>
        </div>`;
    }).join('');

    return `
    <div class="hist-item" style="padding:0;overflow:hidden;">
      <!-- Cabecera de la venta -->
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px 8px;border-bottom:1px solid #f3f4f6;">
        <div class="hist-date">📅 ${fechaMostrar}</div>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-ghost" style="padding:4px 10px;font-size:11px;" onclick="descargarRegistroHistorial(${idx})">📥 Registro</button>
          <button class="btn btn-amber" style="padding:4px 10px;font-size:11px;" onclick="abrirEditarCobro(${idx})">✏️ Editar</button>
        </div>
      </div>

      <!-- Ítems con desglose -->
      <div style="padding:4px 12px 6px;">${itemsHtml}</div>

      <!-- Resumen financiero de la venta -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;background:#f9fafb;border-top:2px solid #e5e7eb;padding:8px 12px;gap:4px;text-align:center;">
        <div>
          <div style="font-size:9px;font-weight:900;color:#15803d;text-transform:uppercase;">💰 Ingreso</div>
          <div style="font-size:14px;font-weight:900;color:#15803d;">$${ventaIngreso.toFixed(2)}</div>
        </div>
        <div>
          <div style="font-size:9px;font-weight:900;color:#dc2626;text-transform:uppercase;">📦 Costo</div>
          <div style="font-size:14px;font-weight:900;color:#dc2626;">$${ventaCosto.toFixed(2)}</div>
        </div>
        <div style="background:${esUtil ? '#f0fdf4' : '#fef2f2'};border-radius:8px;padding:2px 4px;">
          <div style="font-size:9px;font-weight:900;color:${esUtil ? '#059669' : '#dc2626'};text-transform:uppercase;">${esUtil ? '✅ Utilidad' : '🔴 Pérdida'}</div>
          <div style="font-size:14px;font-weight:900;color:${esUtil ? '#059669' : '#dc2626'};">${esUtil ? '+' : ''}$${ventaUtilidad.toFixed(2)}</div>
        </div>
      </div>

      <!-- Pago y vuelto -->
      <div style="padding:6px 12px;background:#fff;border-top:1px solid #f3f4f6;display:flex;justify-content:space-between;">
        <span style="font-size:11px;color:var(--text-muted);">Pagó: $${pagoFmt} · Vuelto: $${vueltoFmt}</span>
      </div>
    </div>`;
  }).join('');
}
function renderCritico() {
  const tbody = document.getElementById('tbodyCritico'); if (!tbody) return;
  const lista = productos.filter(p => (p.stock || 0) <= (p.min || 0));
  if (!lista.length) { tbody.innerHTML = `<tr><td colspan="5"><div class="empty"><span class="empty-icon">✅</span>Sin stock crítico</div></td></tr>`; return; }
  tbody.innerHTML = lista.map(p => `<tr class="row-critico"><td><code style="font-size:11px;">${p.cod||'—'}</code></td><td class="td-bold">${p.nom||'—'}</td><td>${p.cat||''}</td><td><span class="badge badge-red">⚠ ${p.stock||0}</span></td><td class="mono" style="color:var(--text-muted)">${p.min||0}</td></tr>`).join('');
}
function renderPagos() {
  const tbody   = document.getElementById('tbodyGastos');
  const resumen = document.getElementById('gastosResumen'); if (!tbody) return;
  const lista   = pagos.filter(g => esMesActual(g.fechaISO));
  const totalFacturas = lista.filter(g => g.cat === 'FACTURA').reduce((s, g) => s + Number(g.monto || 0), 0);
  const totalGastos   = lista.filter(g => g.cat === 'GASTO').reduce((s, g) => s + Number(g.monto || 0), 0);
  if (resumen) {
    resumen.innerHTML = `
      <div class="stat-box" style="border-color:rgba(29,78,216,0.3);"><div class="s-lbl" style="color:var(--blue);">🧾 Facturas</div><div class="s-val" style="color:var(--blue);font-size:18px;">$${totalFacturas.toFixed(2)}</div><div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${lista.filter(g=>g.cat==='FACTURA').length} pagos</div></div>
      <div class="stat-box" style="border-color:rgba(220,38,38,0.3);"><div class="s-lbl" style="color:var(--red);">💸 Gastos</div><div class="s-val" style="color:var(--red);font-size:18px;">$${totalGastos.toFixed(2)}</div><div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${lista.filter(g=>g.cat==='GASTO').length} gastos</div></div>
      <div class="stat-box" style="border-color:rgba(220,38,38,0.4);background:rgba(220,38,38,0.03);"><div class="s-lbl" style="color:var(--red);">📊 Total Mes</div><div class="s-val" style="color:var(--red);font-size:18px;">$${(totalFacturas+totalGastos).toFixed(2)}</div><div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${lista.length} registros</div></div>
    `;
  }
  if (!lista.length) { tbody.innerHTML = `<tr><td colspan="5"><div class="empty"><span class="empty-icon">💸</span>Sin gastos este mes</div></td></tr>`; return; }
  tbody.innerHTML = lista.map(g => {
    const esFact = g.cat === 'FACTURA';
    return `<tr>
      <td style="font-size:11px;color:var(--text-muted);white-space:nowrap;">${g.fechaStr||'—'}</td>
      <td class="td-bold">${g.concepto||'—'}</td>
      <td>${esFact ? `<span class="badge badge-blue">🧾 FACTURA</span>` : `<span class="badge badge-red">💸 GASTO</span>`}</td>
      <td class="mono td-red">$${Number(g.monto||0).toFixed(2)}</td>
      <td><button class="btn btn-danger" onclick="borrarGasto(${g.id})" style="padding:5px 8px;font-size:11px;">✕</button></td>
    </tr>`;
  }).join('');
}
function guardarGasto(e, tipo) {
  e.preventDefault();
  if (typeof _puedeHacer === 'function' && !_puedeHacer('gastos')) { toast('No tienes permiso para registrar gastos', true); return; }
  const descId  = tipo === 'FACTURA' ? 'inpFDesc' : 'inpGDesc';
  const montoId = tipo === 'FACTURA' ? 'inpFMonto' : 'inpGMonto';
  const monto   = parseFloat(document.getElementById(montoId).value) || 0;
  if (monto <= 0) { toast('Monto inválido', true); return; }
  const fechaISO = nowISO();
  const nuevoPago = { id: Date.now(), concepto: document.getElementById(descId).value.toUpperCase().trim(), cat: tipo, monto, fechaISO, ts: nowTS(), fechaStr: new Date(fechaISO).toLocaleString('es-SV') };
  pagos.unshift(nuevoPago);
  e.target.reset();
  salvar();
  toast(`${tipo === 'FACTURA' ? '🧾 Factura' : '💸 Gasto'} registrado — $${monto.toFixed(2)}`);
  autoBackup(tipo === 'FACTURA' ? 'Factura' : 'Gasto');
  // Sync en tiempo real: Supabase + broadcast instantáneo a otros dispositivos
  if (typeof syncAhora === 'function') syncAhora('pagos');
  if (typeof _broadcast === 'function') _broadcast('pago_agregado', { pago: nuevoPago });
}
function borrarGasto(id) {
  if (confirm('¿Eliminar este registro?')) {
    // Registrar ID como eliminado para que no vuelva desde Supabase
    const idStr = String(id);
    if (!pagosEliminados.includes(idStr)) pagosEliminados.push(idStr);
    // FIX: comparar como string — Supabase devuelve IDs como string pero el botón
    // pasa un número. La comparación estricta (!==) fallaba y el pago no se borraba.
    pagos = pagos.filter(g => String(g.id) !== idStr); salvar(); toast('Registro eliminado', true);
    if (typeof syncBorrarPago === 'function') syncBorrarPago(id);
    // FIX: notificar a otros teléfonos conectados para que borren el pago en tiempo real
    if (typeof _broadcast === 'function') _broadcast('pago_borrado', { id: idStr });
  }
}
function renderBalance() {
  const card = document.getElementById('balanceMesCard');
  const lbl  = document.getElementById('balanceMesLabel'); if (!card) return;
  const now  = new Date();
  const mesNombre = now.toLocaleDateString('es-SV', { month: 'long', year: 'numeric' });
  if (lbl) lbl.textContent = mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1);
  const totalIngresos = totalReporte(ventasMes);
  const totalGastos   = pagos.filter(g => esMesActual(g.fechaISO)).reduce((s, g) => s + Number(g.monto || 0), 0);
  const balance = totalIngresos - totalGastos;
  const esPos   = balance >= 0;
  card.innerHTML = `
    <div class="balance-item"><div class="b-lbl">💰 Ingresos del Mes</div><div class="b-val b-val-green">$${totalIngresos.toFixed(2)}</div><div class="b-sub">${Object.keys(ventasMes).length} producto(s) vendido(s)</div></div>
    <div class="balance-item"><div class="b-lbl">💸 Gastos del Mes</div><div class="b-val b-val-red">$${totalGastos.toFixed(2)}</div><div class="b-sub">${pagos.filter(g=>esMesActual(g.fechaISO)).length} gasto(s) registrado(s)</div></div>
    <div class="balance-item ${esPos ? 'net' : 'net-neg'}"><div class="b-lbl">${esPos ? '📈' : '📉'} Balance Neto</div><div class="b-val" style="color:${esPos?'var(--green)':'var(--red)'};">$${balance.toFixed(2)}</div><div class="b-sub" style="color:${esPos?'var(--green)':'var(--red)'};">${esPos ? '✓ Mes positivo' : '⚠ Mes en pérdida'}</div></div>
  `;
}

// ===== 16. PDF =====


// ===== PDF HELPERS =====
function _pdfHeader(doc, titulo, subtitulo, ancho) {
  const W = ancho || 210;
  doc.setFillColor(22, 163, 74);
  doc.rect(0, 0, W, 24, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('DESPENSA ECONÓMICA', 12, 10);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(titulo, 12, 17);
  doc.setFontSize(8);
  doc.text(subtitulo, W - 12, 17, { align: 'right' });
  return 30; // startY
}

function _pdfAutoTable(doc, head, body, startY, opts) {
  opts = opts || {};
  doc.autoTable({
    head,
    body,
    startY,
    styles: {
      fontSize: 8,
      textColor: [15, 23, 42],
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
      font: 'helvetica'
    },
    headStyles: {
      fillColor: [22, 163, 74],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 }
    },
    alternateRowStyles: { fillColor: [245, 255, 248] },
    tableLineColor: [200, 200, 200],
    tableLineWidth: 0.1,
    ...(opts)
  });
  return doc.lastAutoTable.finalY;
}

function _pdfDesgloseStock(p) {
  if (!(p.paquetes && p.paquetes.length)) return '';
  const pkgs = p.paquetes.filter(pk=>pk.cant>1).slice().sort((a,b)=>b.cant-a.cant);
  let resto = Math.max(0, p.stock || 0);
  const partes = [];
  pkgs.forEach(pk => {
    const q = Math.floor(resto / pk.cant);
    resto -= q * pk.cant;
    if (q > 0) partes.push(q + ' ' + (pk.label || ('×'+pk.cant)));
  });
  if (resto > 0) partes.push(resto + ' ud' + (resto !== 1 ? 's' : ''));
  return partes.length ? partes.join('  |  ') : (p.stock + ' uds');
}
function generarPDFInventarioActual() {
  if (!window.jspdf) { toast('jsPDF no disponible', true); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const now = new Date();
  const fechaStr = now.toLocaleDateString('es-SV') + ' ' + now.toLocaleTimeString('es-SV');

  let y = _pdfHeader(doc, 'INVENTARIO DE PRODUCTOS', fechaStr, 210);

  const filtro = (document.getElementById('filtroInv')?.value || '').toUpperCase();
  const lista  = filtro
    ? productos.filter(p => (p.nom||'').toUpperCase().includes(filtro) || (p.cat||'').toUpperCase().includes(filtro))
    : [...productos].sort((a,b)=>(a.cat||'').localeCompare(b.cat||'') || (a.nom||'').localeCompare(b.nom||''));

  const totalVenta = lista.reduce((s,p)=>s+_ventaTotalProd(p),0);
  const totalCosto = lista.reduce((s,p)=>s+_costoTotalProd(p),0);

  // Agrupar por categoría
  const porCat = {};
  lista.forEach(p => {
    const cat = p.cat || 'SIN CATEGORÍA';
    if (!porCat[cat]) porCat[cat] = [];
    porCat[cat].push(p);
  });

  for (const cat of Object.keys(porCat).sort()) {
    const rows = porCat[cat].map(p => {
      const desglose = _pdfDesgloseStock(p);
      const stockStr = desglose || String(p.stock || 0);
      return [
        p.nom || '—',
        cat,
        `$${(p.compra||0).toFixed(2)}`,
        `$${(p.venta||0).toFixed(2)}`,
        String(p.stock || 0),
        stockStr !== String(p.stock||0) ? stockStr : '—'
      ];
    });

    y = _pdfAutoTable(doc,
      [[{ content: cat, colSpan: 6, styles: { fillColor:[22,163,74], textColor:[255,255,255], fontStyle:'bold', fontSize:9 }}],
       ['Nombre', 'Categoría', 'P. Costo', 'P. Venta', 'Stock', 'Desglose presentaciones']],
      rows, y, {
        columnStyles: {
          0: { fontStyle: 'bold' },
          2: { halign: 'right', textColor:[180,83,9] },
          3: { halign: 'right' },
          4: { halign: 'center', fontStyle: 'bold', textColor:[22,101,52] },
          5: { fontSize: 7, textColor:[80,80,80] }
        }
      }) + 6;

    if (y > 265) { doc.addPage(); y = 15; }
  }

  // Footer totales
  doc.setFillColor(240, 253, 244);
  doc.rect(12, y, 186, 16, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(22, 101, 52);
  doc.text(`${lista.length} productos`, 16, y + 6.5);
  doc.setTextColor(180, 83, 9);
  doc.text(`Valor total costo: $${totalCosto.toFixed(2)}`, 16, y + 13);
  doc.setTextColor(22, 101, 52);
  doc.text(`Valor total venta: $${totalVenta.toFixed(2)}`, 198, y + 6.5, { align: 'right' });

  doc.save(`Inventario_${now.toLocaleDateString('es-SV').replace(/\//g,'-')}.pdf`);
  toast('✓ PDF de inventario descargado');
}

function _pdfBuildReporte(doc, titulo, subtitulo, acumData, catFiltro, opts = {}) {
  const conGanancia = !!opts.conGanancia; // true solo para Mensual/Semanal/Período
  let y = _pdfHeader(doc, titulo, subtitulo, 210);

  // Caja explicativa opcional: "qué refleja este PDF" (solo si se indica)
  if (opts.descripcion) {
    const lines = doc.splitTextToSize(opts.descripcion, 178);
    const boxH = 6 + lines.length * 4;
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(12, y, 186, boxH, 2, 2, 'F');
    doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5); doc.setTextColor(22, 101, 52);
    lines.forEach((line, i) => doc.text(line, 16, y + 5 + i * 4));
    y += boxH + 5;
  }

  const cats = {}; let totalGlobal = 0; let totalInvertidoGlobal = 0; let totalGananciaGlobal = 0;

  Object.values(acumData || {}).forEach(v => {
    const cat = v.cat || 'SIN CATEGORÍA';
    if (catFiltro && catFiltro !== 'todas' && cat !== catFiltro) return;
    if (!cats[cat]) cats[cat] = [];
    // Desglose de paquetes vendidos
    const prod = v.id ? productos.find(p => String(p.id) === String(v.id)) : null;
    const pkgs = prod ? (prod.paquetes||[]).filter(pk=>pk.cant>1).slice().sort((a,b)=>b.cant-a.cant) : [];
    let desgloseTxt = '';
    if (pkgs.length && v.cant > 0) {
      let resto = Number(v.cant || 0);
      const partes = [];
      pkgs.forEach(pk => {
        const q = Math.floor(resto / pk.cant);
        resto -= q * pk.cant;
        if (q > 0) partes.push(q + ' ' + (pk.label || ('×'+pk.cant)));
      });
      if (resto > 0) partes.push(resto + ' ud' + (resto!==1?'s':''));
      if (partes.length) desgloseTxt = partes.join('  |  ');
    }

    if (conGanancia) {
      const invertido = Number(v.totalCosto || 0);
      const ventaTotal = Number(v.totalVenta !== undefined ? v.totalVenta : v.total || 0);
      const ganancia = ventaTotal - invertido;
      cats[cat].push([
        v.nom || '—',
        String(Number(v.cant || 0)),
        desgloseTxt || '—',
        `$${invertido.toFixed(2)}`,
        `$${ganancia.toFixed(2)}`
      ]);
      totalInvertidoGlobal += invertido;
      totalGananciaGlobal  += ganancia;
    } else {
      cats[cat].push([
        v.nom || '—',
        String(Number(v.cant || 0)),
        desgloseTxt || '—',
        `$${Number(v.total||0).toFixed(2)}`
      ]);
      totalGlobal += Number(v.total || 0);
    }
  });

  if (!Object.keys(cats).length) {
    doc.setFontSize(11); doc.setTextColor(220,38,38);
    doc.text('Sin ventas registradas en este período.', 14, y + 10);
    return conGanancia ? { totalInvertidoGlobal: 0, totalGananciaGlobal: 0 } : totalGlobal;
  }

  const headerRow = conGanancia
    ? ['Producto','Uds vendidas','Desglose','Invertido','Ganancia']
    : ['Producto','Uds vendidas','Desglose','Total'];
  const colSpanN = conGanancia ? 5 : 4;

  for (const cat of Object.keys(cats).sort()) {
    const rows = cats[cat].slice().sort((a,b) => Number(b[1]) - Number(a[1]));
    y = _pdfAutoTable(doc,
      [[{ content: cat, colSpan: colSpanN, styles:{fillColor:[22,163,74],textColor:[255,255,255],fontStyle:'bold',fontSize:9}}],
       headerRow],
      rows, y, {
        columnStyles: conGanancia ? {
          0: { fontStyle: 'normal' },
          1: { halign: 'center', fontStyle: 'normal', textColor:[22,101,52] },
          2: { fontSize: 8, fontStyle: 'normal', textColor:[15,23,42] },
          3: { halign: 'right', fontStyle: 'normal', textColor:[180,83,9] },
          4: { halign: 'right', fontStyle: 'normal', textColor:[21,128,61] }
        } : {
          0: { fontStyle: 'normal' },
          1: { halign: 'center', fontStyle: 'normal', textColor:[22,101,52] },
          2: { fontSize: 8, fontStyle: 'normal', textColor:[15,23,42] },
          3: { halign: 'right', fontStyle: 'normal' }
        }
      }) + 6;
    if (y > 265) { doc.addPage(); y = 15; }
  }

  // Footer
  if (conGanancia) {
    doc.setFillColor(255,251,235);
    doc.rect(12, y, 186, 16, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(9);
    doc.setTextColor(180,83,9);
    doc.text('TOTAL INVERTIDO:', 16, y + 6.5);
    doc.text(`$${totalInvertidoGlobal.toFixed(2)}`, 198, y + 6.5, { align:'right' });
    doc.setTextColor(21,128,61);
    doc.text('TOTAL GANANCIA:', 16, y + 13);
    doc.text(`$${totalGananciaGlobal.toFixed(2)}`, 198, y + 13, { align:'right' });
    return { totalInvertidoGlobal, totalGananciaGlobal };
  } else {
    doc.setFillColor(240,253,244);
    doc.rect(12, y, 186, 10, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(22,101,52);
    doc.text('TOTAL VENTAS:', 16, y + 6.5);
    doc.text(`$${totalGlobal.toFixed(2)}`, 198, y + 6.5, { align:'right' });
    return totalGlobal;
  }
}

function generarPDF(tipo) {
  if (!window.jspdf) { toast('jsPDF no disponible', true); return; }
  const filtro = document.getElementById('selCat')?.value || 'todas';
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const now = new Date();
  const subtitulo = `${tipo.charAt(0).toUpperCase()+tipo.slice(1)} · ${now.toLocaleDateString('es-SV')} ${now.toLocaleTimeString('es-SV')}`;

  if (tipo === 'mensual' || tipo === 'semanal') {
    // ── Reporte Mensual/Semanal con Invertido/Ganancia por producto ──
    // Se calcula directo del historial real del período (misma lógica de
    // costo que usa el Reporte por Período), no del acumulado simple.
    const lunes = typeof _lunesDeLaSemana === 'function' ? new Date(_lunesDeLaSemana()) : null;
    const acum = {};
    (historial || []).forEach(v => {
      if (!v.fechaISO && !v.fecha) return;
      const fecha = new Date(v.fechaISO || v.fecha);
      const enPeriodo = tipo === 'mensual'
        ? (typeof esMesActual === 'function' ? esMesActual(v.fechaISO) : true)
        : (lunes ? fecha >= lunes : true);
      if (!enPeriodo) return;
      (v.items || []).forEach(item => {
        const key = item.id ? String(item.id) : ('legacy:' + item.nom);
        const prod = item.id ? productos.find(p => String(p.id) === String(item.id)) : null;
        const cat  = (prod && prod.cat) ? prod.cat : (item.cat || 'SIN CATEGORÍA');
        if (!acum[key]) acum[key] = { id: item.id||null, nom: item.nom||'—', cat, cant: 0, totalVenta: 0, totalCosto: 0 };
        const cant = Number(item.cant || 0);
        acum[key].cant += cant;
        let totVenta;
        if (item.totalItem !== undefined) {
          totVenta = Number(item.totalItem);
        } else if (item.cantCobrada !== undefined) {
          totVenta = Number(item.cantCobrada) * Number(item.precio || 0);
        } else if (item.esPromo || item.paqueteLabel) {
          totVenta = Number(item.precio || 0);
        } else {
          totVenta = cant * Number(item.precio || 0);
        }
        acum[key].totalVenta += totVenta;
        const costoUd = Number(item.costoUd || item.compra || 0);
        acum[key].totalCosto += cant * costoUd;
      });
    });

    _pdfBuildReporte(doc, `REPORTE ${tipo.toUpperCase()}`, subtitulo, acum, filtro, { conGanancia: true });
    doc.save(`Despensa_${tipo}_${now.toLocaleDateString('es-SV').replace(/\//g,'-')}.pdf`);
    toast(`✓ PDF ${tipo} descargado`);
    return;
  }

  // ── Diario: sin cambios, igual que siempre ──
  const data = ventasDia;
  const acum = {};
  Object.entries(data || {}).forEach(([k, v]) => {
    acum[k] = { id: k, nom: v.nom||'—', cat: v.cat||'SIN CATEGORÍA', cant: Number(v.cant||0), total: Number(v.total||0) };
  });

  _pdfBuildReporte(doc, `REPORTE ${tipo.toUpperCase()}`, subtitulo, acum, filtro);
  doc.save(`Despensa_${tipo}_${now.toLocaleDateString('es-SV').replace(/\//g,'-')}.pdf`);
  toast(`✓ PDF ${tipo} descargado`);
}

function setRangoPDF(preset) {
  const hoy   = new Date();
  const pad   = n => String(n).padStart(2, '0');
  const fmt   = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

  // Lunes de la semana actual
  const diaSem = hoy.getDay() === 0 ? 6 : hoy.getDay() - 1; // 0=lun
  const lunesActual = new Date(hoy); lunesActual.setDate(hoy.getDate() - diaSem);
  lunesActual.setHours(0,0,0,0);

  let desde, hasta;

  if (preset === 'semana_actual') {
    desde = lunesActual;
    hasta = hoy;
  } else if (preset === 'semana_anterior') {
    const lunesAnterior = new Date(lunesActual); lunesAnterior.setDate(lunesActual.getDate() - 7);
    const domAnterior   = new Date(lunesActual); domAnterior.setDate(lunesActual.getDate() - 1);
    desde = lunesAnterior;
    hasta = domAnterior;
  } else if (preset === 'mes_actual') {
    desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    hasta = hoy;
  }

  document.getElementById('pdfFechaDesde').value = fmt(desde);
  document.getElementById('pdfFechaHasta').value = fmt(hasta);
}

function generarPDFRango() {
  const desdeVal  = document.getElementById('pdfFechaDesde').value;
  const hastaVal  = document.getElementById('pdfFechaHasta').value;
  const catFiltro = document.getElementById('pdfCategoria')?.value || 'todas';
  if (!desdeVal || !hastaVal) { toast('Selecciona fecha de inicio y fin', true); return; }
  const desde = new Date(desdeVal + 'T00:00:00'), hasta = new Date(hastaVal + 'T23:59:59');
  if (desde > hasta) { toast('La fecha de inicio debe ser antes que la final', true); return; }

  // Acumular ventas del período por producto (con costo, para Invertido/Ganancia)
  const acum = {};
  historial.forEach(v => {
    const ts = v.ts || (v.fechaISO ? Date.parse(v.fechaISO) : 0);
    if (!ts || new Date(ts) < desde || new Date(ts) > hasta) return;
    (v.items || []).forEach(item => {
      const key = item.id ? String(item.id) : ('legacy:' + item.nom);
      const prod = item.id ? productos.find(p => String(p.id) === String(item.id)) : null;
      const cat  = (prod && prod.cat) ? prod.cat : (item.cat || 'SIN CATEGORÍA');
      if (!acum[key]) acum[key] = { id: item.id||null, nom: item.nom||'—', cat, cant: 0, totalVenta: 0, totalCosto: 0 };
      const cant = Number(item.cant || 0);
      acum[key].cant += cant;
      let totVenta;
      if (item.totalItem !== undefined) {
        totVenta = Number(item.totalItem);
      } else if (item.cantCobrada !== undefined) {
        totVenta = Number(item.cantCobrada) * Number(item.precio || 0);
      } else if (item.esPromo || item.paqueteLabel) {
        totVenta = Number(item.precio || 0);
      } else {
        totVenta = cant * Number(item.precio || 0);
      }
      acum[key].totalVenta += totVenta;
      const costoUd = Number(item.costoUd || item.compra || 0);
      acum[key].totalCosto += cant * costoUd;
    });
  });
  // Asegurar categoría
  for (const k in acum) {
    if (!acum[k].cat && !k.startsWith('legacy:')) {
      const p = productos.find(p => String(p.id) === k);
      if (p && p.cat) acum[k].cat = p.cat;
    }
    if (!acum[k].cat) acum[k].cat = 'SIN CATEGORÍA';
  }

  if (!window.jspdf) { toast('jsPDF no disponible', true); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const now = new Date();
  const rangoStr = `${desde.toLocaleDateString('es-SV')} al ${hasta.toLocaleDateString('es-SV')}`;
  const catLabel = catFiltro === 'todas' ? 'Todas las categorías' : catFiltro;
  const subtitulo = `${rangoStr} · ${catLabel}`;
  const descripcion = 'Este reporte muestra, para cada producto vendido dentro del rango de fechas seleccionado: '
    + 'las unidades vendidas, el desglose de presentaciones, cuánto invertiste (costo real) y cuánto ganaste '
    + '(precio de venta − costo) en ese período.';

  const { totalInvertidoGlobal, totalGananciaGlobal } =
    _pdfBuildReporte(doc, 'REPORTE POR PERÍODO', subtitulo, acum, catFiltro, { conGanancia: true, descripcion });

  const totalVentaGlobal = Object.values(acum).reduce((s, v) => s + Number(v.totalVenta || 0), 0);
  const diasRango = Math.max(1, Math.round((hasta - desde) / (1000*60*60*24)) + 1);
  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 24 : 280;
  if (finalY < 285) {
    doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(100,116,139);
    doc.text(`Período: ${diasRango} día${diasRango!==1?'s':''} · Venta total: $${totalVentaGlobal.toFixed(2)} · Promedio de ganancia diaria: $${(totalGananciaGlobal/diasRango).toFixed(2)}`, 14, finalY);
  }

  doc.save(`Reporte_${desdeVal}_${hastaVal}${catFiltro!=='todas'?'_'+catFiltro:''}.pdf`);
  toast(`✓ PDF generado — ${rangoStr}${catFiltro!=='todas'?' · '+catFiltro:''}`);
}

// ===== 17. DESTACADOS =====

// ===== 17B. PRIORIDAD POR GANANCIA — ranking en vivo desde el inventario =====
// Reemplaza el antiguo "Productos Destacados" (más vendidos por período).
// Ahora ordena TODOS los productos del inventario de mayor a menor ganancia
// por unidad (precio de venta − precio de compra). Se recalcula cada vez
// que se abre la página, así que siempre refleja el inventario actual.
function renderDestacados() {
  // Al abrir la sección, siempre arranca en la vista de Ganancia por Unidad
  const vG = document.getElementById('destVistaGanancia');
  const vV = document.getElementById('destVistaVendidos');
  if (vG) vG.style.display = '';
  if (vV) vV.style.display = 'none';

  const lbl = document.getElementById('destResumenLabel');
  if (lbl) lbl.textContent = 'En vivo · inventario actual';

  const lista = (productos || [])
    .map(p => {
      const costo    = Number(p.compra || 0);
      const venta    = Number(p.venta  || 0);
      const ganancia = venta - costo;
      return { nom: p.nom || '—', cat: p.cat || 'SIN CATEGORÍA', stock: Number(p.stock || 0), costo, venta, ganancia };
    })
    .sort((a, b) => b.ganancia - a.ganancia);

  const resGrid = document.getElementById('destResumenGrid');
  if (resGrid) {
    const promedio = lista.length ? lista.reduce((s, x) => s + x.ganancia, 0) / lista.length : 0;
    const mejor = lista[0], peor = lista[lista.length - 1];
    resGrid.innerHTML = `
      <div class="stat-box"><div class="s-lbl">Productos</div><div class="s-val">${lista.length}</div></div>
      <div class="stat-box"><div class="s-lbl">Ganancia Promedio/Ud.</div><div class="s-val">$${promedio.toFixed(2)}</div></div>
      <div class="stat-box"><div class="s-lbl">Mejor Margen</div><div class="s-val" style="font-size:13px;">${mejor ? mejor.nom : '—'}</div></div>
      <div class="stat-box"><div class="s-lbl">Menor Margen</div><div class="s-val" style="font-size:13px;">${peor ? peor.nom : '—'}</div></div>
    `;
  }

  const cont = document.getElementById('destGananciaLista'); if (!cont) return;
  if (!lista.length) {
    cont.innerHTML = `<div class="empty"><span class="empty-icon">📦</span>No hay productos en el inventario todavía.</div>`;
    return;
  }
  const filas = lista.map((p, i) => {
    const medalla = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i + 1);
    const colorGan = p.ganancia > 0 ? 'var(--green-600)' : p.ganancia < 0 ? 'var(--red)' : 'var(--text-muted)';
    return `
      <tr>
        <td style="text-align:center;width:34px;">${medalla}</td>
        <td class="td-bold">${p.nom}</td>
        <td>${p.cat}</td>
        <td class="mono" style="text-align:right;">$${p.costo.toFixed(2)}</td>
        <td class="mono" style="text-align:right;">$${p.venta.toFixed(2)}</td>
        <td style="text-align:center;">${p.stock}</td>
        <td class="mono" style="text-align:right;font-weight:900;color:${colorGan};">$${p.ganancia.toFixed(2)}</td>
      </tr>
    `;
  }).join('');
  cont.innerHTML = `
    <div class="tbl-wrap">
      <table>
        <thead>
          <tr>
            <th style="text-align:center;">#</th>
            <th>Producto</th>
            <th>Categoría</th>
            <th style="text-align:right;">Costo</th>
            <th style="text-align:right;">Venta</th>
            <th style="text-align:center;">Stock</th>
            <th style="text-align:right;">Ganancia/Ud.</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
  `;
}

// ===== 17C. PRODUCTOS MÁS VENDIDOS — subpágina con filtro de fechas, en vivo =====
let _destVFiltro = 'mes'; // filtro activo: 'hoy'|'semana'|'mes'|'todo'|'custom'

function mostrarDestSubVendidos() {
  document.getElementById('destVistaGanancia').style.display = 'none';
  document.getElementById('destVistaVendidos').style.display = '';
  // Por defecto, al entrar, filtra por "Este Mes" (siempre recalculado en vivo)
  if (!document.getElementById('destVFechaDesde').value) {
    _destVFiltro = 'mes';
  }
  filtrarDestVendidos(_destVFiltro);
}

function volverDestGanancia() {
  document.getElementById('destVistaVendidos').style.display = 'none';
  document.getElementById('destVistaGanancia').style.display = '';
  renderDestacados();
}

function filtrarDestVendidos(tipo) {
  const hoy = new Date();
  let desde, hasta = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59);

  if (tipo === 'hoy') {
    desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0);
  } else if (tipo === 'semana') {
    desde = typeof _lunesDeLaSemana === 'function' ? new Date(_lunesDeLaSemana()) : new Date(hoy);
  } else if (tipo === 'mes') {
    desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1, 0, 0, 0);
  } else if (tipo === 'todo') {
    desde = new Date(2000, 0, 1);
  } else {
    // 'custom': usa los inputs de fecha
    const dVal = document.getElementById('destVFechaDesde').value;
    const hVal = document.getElementById('destVFechaHasta').value;
    if (!dVal && !hVal) { tipo = 'mes'; desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1, 0, 0, 0); }
    else {
      desde = dVal ? new Date(dVal + 'T00:00:00') : new Date(2000, 0, 1);
      hasta = hVal ? new Date(hVal + 'T23:59:59') : hasta;
    }
  }

  _destVFiltro = tipo;
  ['hoy','semana','mes','todo'].forEach(t => {
    const btn = document.getElementById('destVBtn_' + t);
    if (btn) btn.classList.toggle('active', t === tipo);
  });
  if (tipo !== 'custom') {
    document.getElementById('destVFechaDesde').value = desde.toISOString().slice(0,10);
    document.getElementById('destVFechaHasta').value = hasta.toISOString().slice(0,10);
  }

  const rangoLbl = document.getElementById('destVRangoLabel');
  if (rangoLbl) rangoLbl.textContent = `📅 Del ${desde.toLocaleDateString('es-SV')} al ${hasta.toLocaleDateString('es-SV')} · en vivo`;

  // Acumular ventas reales del rango, directo del historial (siempre actual)
  const acum = {};
  (historial || []).forEach(v => {
    const ts = v.ts || (v.fechaISO ? Date.parse(v.fechaISO) : 0);
    if (!ts || new Date(ts) < desde || new Date(ts) > hasta) return;
    (v.items || []).forEach(item => {
      const key = item.id ? String(item.id) : ('legacy:' + item.nom);
      const prod = item.id ? productos.find(p => String(p.id) === String(item.id)) : null;
      const cat  = (prod && prod.cat) ? prod.cat : (item.cat || 'SIN CATEGORÍA');
      if (!acum[key]) acum[key] = { nom: item.nom || '—', cat, cant: 0, total: 0, costo: 0 };
      const cant = Number(item.cant || 0);
      acum[key].cant += cant;
      // Venta real del ítem — respeta presentaciones/paquetes/promos, igual que en Reportes
      let totItem;
      if (item.totalItem !== undefined) {
        totItem = Number(item.totalItem);
      } else if (item.cantCobrada !== undefined) {
        totItem = Number(item.cantCobrada) * Number(item.precio || 0);
      } else if (item.esPromo || item.paqueteLabel) {
        totItem = Number(item.precio || 0);
      } else {
        totItem = cant * Number(item.precio || 0);
      }
      acum[key].total += totItem;
      // Costo real del ítem — el costo por unidad se multiplica por las
      // unidades REALES vendidas (cant), sin importar si se vendió por
      // paquete/promo; así la ganancia sale correcta en cualquier presentación.
      const costoUd = Number(item.costoUd || item.compra || 0);
      acum[key].costo += cant * costoUd;
    });
  });

  const lista = Object.values(acum).sort((a, b) => b.cant - a.cant);

  const resGrid = document.getElementById('destResumenGridVendidos');
  if (resGrid) {
    const totalUds = lista.reduce((s, x) => s + x.cant, 0);
    const totalVenta = lista.reduce((s, x) => s + x.total, 0);
    const totalGanancia = lista.reduce((s, x) => s + (x.total - x.costo), 0);
    resGrid.innerHTML = `
      <div class="stat-box"><div class="s-lbl">Productos Vendidos</div><div class="s-val">${lista.length}</div></div>
      <div class="stat-box"><div class="s-lbl">Unidades Totales</div><div class="s-val">${totalUds}</div></div>
      <div class="stat-box"><div class="s-lbl">Venta Total</div><div class="s-val">$${totalVenta.toFixed(2)}</div></div>
      <div class="stat-box"><div class="s-lbl">Ganancia Total</div><div class="s-val">$${totalGanancia.toFixed(2)}</div></div>
    `;
  }

  const cont = document.getElementById('destVendidosLista'); if (!cont) return;
  if (!lista.length) {
    cont.innerHTML = `<div class="empty"><span class="empty-icon">📊</span>No hay ventas registradas en este rango de fechas.</div>`;
    return;
  }
  const filas = lista.map((p, i) => {
    const medalla = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i + 1);
    const ganancia = p.total - p.costo;
    const colorGan = ganancia > 0 ? 'var(--green-600)' : ganancia < 0 ? 'var(--red)' : 'var(--text-muted)';
    return `
      <tr>
        <td style="text-align:center;width:34px;">${medalla}</td>
        <td class="td-bold">${p.nom}</td>
        <td>${p.cat}</td>
        <td class="mono" style="text-align:right;">$${p.total.toFixed(2)}</td>
        <td class="mono td-green" style="text-align:right;font-weight:900;">${p.cant} uds</td>
        <td class="mono" style="text-align:right;font-weight:900;color:${colorGan};">$${ganancia.toFixed(2)}</td>
      </tr>
    `;
  }).join('');
  cont.innerHTML = `
    <div class="tbl-wrap">
      <table>
        <thead>
          <tr>
            <th style="text-align:center;">#</th>
            <th>Producto</th>
            <th>Categoría</th>
            <th style="text-align:right;">Vendido ($)</th>
            <th style="text-align:right;">Unidades</th>
            <th style="text-align:right;">Ganancia</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
  `;
}

// ===== 18. REINICIOS =====

function reiniciarDia() {
  if (typeof _puedeHacer === 'function' && !_puedeHacer('reiniciar')) { toast('Solo el Admin puede reiniciar', true); return; }
  if (!confirm('¿Reiniciar el reporte del día?\n\nSolo se borra el contador del día.\nEl historial de cobros, ventas del mes y pagos NO se tocan.')) return;

  // Solo resetear el acumulado diario — NO tocar historial, ventasMes ni pagos
  ventasDia = {};

  // ── FIX: guardar timestamp del reset para que el dashboard y el recálculo
  //         desde historial no restauren ventas anteriores al reset ──
  const tsReset = new Date().toISOString();
  localStorage.setItem('vpos_reinicioDiaTs', tsReset);
  localStorage.setItem('vpos_reinicioDiaFecha', new Date().toDateString());

  localStorage.setItem('vpos_reporteFechaDia', new Date().toDateString());
  salvar();
  actualizarTodo();
  toast('✓ Reporte del día reiniciado (cobros y mes intactos)');

  // ── FIX BUG 1 & 2: Avisar a TODOS los otros teléfonos vía broadcast ──
  // Así todos aplican el mismo reset al instante, sin doble conteo en capital total
  if (typeof _broadcast === 'function') {
    _broadcast('reinicio_dia', { ts: tsReset, fecha: new Date().toDateString() });
  }
  // Subir snapshot limpio para teléfonos que inicien sesión después
  // + snapshot_push para notificar a teléfonos que estaban desconectados al momento del reset
  setTimeout(() => {
    if (typeof _autoEnviarSnapshot === 'function') _autoEnviarSnapshot();
    if (typeof _broadcast === 'function') _broadcast('snapshot_push', { tienda: typeof _getTiendaId === 'function' ? _getTiendaId() : '' });
  }, 1000);
  // NO llamamos syncAhora('venta_diaria') aquí — evita que la fusión automática
  // traiga de vuelta ventasDiarias y confunda el capital total
}
function abrirModalReiniciarSemana() {
  if (typeof _puedeHacer === 'function' && !_puedeHacer('reiniciar')) { toast('Solo el Admin puede reiniciar', true); return; }
  const catsEnSem = {};
  Object.values(ventasSem || {}).forEach(v => { const cat = v.cat||'SIN CATEGORÍA'; catsEnSem[cat] ??= {cant:0,total:0}; catsEnSem[cat].cant+=Number(v.cant||0); catsEnSem[cat].total+=Number(v.total||0); });
  const grid = document.getElementById('catGridSem'); grid.innerHTML = '';
  if (!Object.keys(catsEnSem).length) { grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><span class="empty-icon">📊</span>No hay ventas registradas esta semana</div>`; abrirModal('modalReiniciarSem'); return; }
  const btnTodo = document.createElement('button'); btnTodo.className = 'btn btn-danger'; btnTodo.style.gridColumn = '1/-1'; btnTodo.textContent = '⚠️ REINICIAR TODAS LAS CATEGORÍAS';
  btnTodo.onclick = () => { if (confirm('¿Reiniciar TODA la semana?\n\nSolo se borra el contador semanal.\nEl historial de cobros, ventas del mes y pagos NO se tocan.')) { ventasSem = {}; salvar(); cerrarModal('modalReiniciarSem'); toast('✓ Semana reiniciada (cobros y mes intactos)'); if (typeof _broadcast === 'function') _broadcast('reinicio_sem', { ventasSem: {} }); if (typeof _autoEnviarSnapshot === 'function') setTimeout(_autoEnviarSnapshot, 800); } };
  grid.appendChild(btnTodo);
  Object.keys(catsEnSem).sort().forEach(cat => {
    const info = catsEnSem[cat]; const btn = document.createElement('button'); btn.className='btn btn-ghost'; btn.style.padding='12px'; btn.style.justifyContent='space-between';
    btn.innerHTML=`<span style="font-weight:900;">${cat}</span><span class="mono" style="color:var(--green);">$${info.total.toFixed(2)}</span>`;
    btn.onclick = () => { if (confirm(`¿Reiniciar la categoría "${cat}"?`)) { const nuevo={}; for(const pid in ventasSem){ if((ventasSem[pid].cat||'SIN CATEGORÍA')!==cat) nuevo[pid]=ventasSem[pid]; } ventasSem=nuevo; salvar(); cerrarModal('modalReiniciarSem'); toast(`✓ "${cat}" reiniciada`); if (typeof _broadcast === 'function') _broadcast('reinicio_sem', { ventasSem }); if (typeof _autoEnviarSnapshot === 'function') setTimeout(_autoEnviarSnapshot, 800); } };
    grid.appendChild(btn);
  });
  abrirModal('modalReiniciarSem');
}
function reiniciarHistorial() {
  if (typeof _puedeHacer === 'function' && !_puedeHacer('reiniciar')) { toast('Solo el Admin puede borrar el historial', true); return; }
  if (!confirm('¿Borrar todo el historial de cobros?')) return;

  // ── LIMPIAR historial y ventasDiarias — SIN restaurar stock al inventario ──
  // Para devolver unidades al stock, usa el botón "Devolver" dentro de cada cobro individual.
  historial = []; ventasDiarias = [];
  // BUGFIX SYNC: guardar timestamp del borrado como tombstone.
  // _fusionarDos() ignorará ventas anteriores a este momento.
  localStorage.setItem('vpos_historialWipeTs', new Date().toISOString());
  // Recalcular en este teléfono y actualizar TODA la UI (capital, caja, reportes)
  if (typeof _recalcularReportesDesdeHistorial === 'function') _recalcularReportesDesdeHistorial();
  if (typeof actualizarTodo === 'function') actualizarTodo();
  salvar();

  toast('Historial borrado');

  // 1️⃣ Broadcast instantáneo → teléfonos conectados actualizan en tiempo real
  // El payload incluye ventasDiarias:[] para que el otro teléfono las borre de una vez.
  // BUGFIX SYNC: incluir historialWipeTs en el broadcast para que el otro teléfono
  // guarde la lápida y su _fusionarDos también ignore ventas antiguas.
  if (typeof _broadcast === 'function') _broadcast('historial_actualizado', {
    historial: [], ventasDiarias: [],
    historialWipeTs: localStorage.getItem('vpos_historialWipeTs') || new Date().toISOString()
  });
  // 2️⃣ Subir a Supabase (borra filas en DB) → teléfonos desconectados no cargan datos viejos al reconectar
  if (typeof syncAhora === 'function') { syncAhora('historial'); syncAhora('venta_diaria'); }
  // 3️⃣ Subir snapshot propio SOLO después de que Supabase procesó los DELETEs (5s de margen).
  // ── FIX LIMPIAR: NO emitir 'snapshot_push' aquí ──
  // snapshot_push causaba que el OTRO teléfono ejecutara _autoCargarDesdeSupa() antes
  // de que el DELETE de Supabase terminara, restaurando las ventasDiarias recién borradas.
  // El broadcast del paso 1 ya sincroniza los teléfonos conectados en <100ms.
  // El snapshot subido aquí cubrirá teléfonos que se reconecten más tarde.
  setTimeout(() => {
    if (typeof _autoEnviarSnapshot === 'function') _autoEnviarSnapshot();
  }, 5000);
}

// ===== 19. EDITAR COBRO =====

let _editCobroIdx = -1, _editCobroTemp = null;
function abrirEditarCobro(idx) { _editCobroIdx = idx; _editCobroTemp = (historial[idx].items||[]).map(i => ({...i, devuelto:false})); renderEditarCobro(); abrirModal('modalEditarCobro'); }
function renderEditarCobro() {
  const v = historial[_editCobroIdx];
  document.getElementById('editCobroFecha').textContent = '📅 ' + (v.fechaStr||'—');
  document.getElementById('editCobroItems').innerHTML = _editCobroTemp.map((item,i) => {
    if (item.devuelto) return `<div class="edit-cobro-item" style="opacity:0.5;"><div class="edit-cobro-info"><div class="edit-cobro-nom" style="text-decoration:line-through;">${item.nom}</div><div class="edit-cobro-meta">${item.cant} × $${Number(item.precio||0).toFixed(2)}</div></div><button class="btn btn-ghost" onclick="deshacer_devolucion(${i})" style="padding:5px 9px;font-size:11px;margin-left:8px;">↩ Deshacer</button></div>`;
    return `<div class="edit-cobro-item"><div class="edit-cobro-info"><div class="edit-cobro-nom">${item.nom}</div><div class="edit-cobro-meta">${item.cant} × $${Number(item.precio||0).toFixed(2)}</div></div><span class="edit-cobro-price">$${(Number(item.cant||0)*Number(item.precio||0)).toFixed(2)}</span><button class="btn btn-danger" onclick="marcarDevolucion(${i})" style="padding:5px 10px;font-size:12px;">✕ Devolver</button></div>`;
  }).join('');
  document.getElementById('editCobroTotal').textContent = '$' + _editCobroTemp.filter(i=>!i.devuelto).reduce((s,i)=>s+Number(i.cant||0)*Number(i.precio||0),0).toFixed(2);
}
function marcarDevolucion(i) { _editCobroTemp[i].devuelto = true; renderEditarCobro(); }
function deshacer_devolucion(i) { _editCobroTemp[i].devuelto = false; renderEditarCobro(); }
function guardarEdicionCobro() {
  const v = historial[_editCobroIdx];
  const devolver  = _editCobroTemp.filter(i => i.devuelto);
  const activos   = _editCobroTemp.filter(i => !i.devuelto);
  if (!devolver.length) { toast('No marcaste ningún producto para devolver', true); return; }

  if (!activos.length) {
    if (!confirm('Se devolverán TODOS los productos. Esto eliminará el cobro completo. ¿Continuar?')) return;
    // BUGFIX SYNC: registrar ID como eliminado antes de splice para que _fusionarDos no lo restaure
    const _cobroId = String(v.id || '');
    if (_cobroId && !cobrosEliminados.includes(_cobroId)) cobrosEliminados.push(_cobroId);
    historial.splice(_editCobroIdx, 1);
  } else {
    const nuevoTotal = activos.reduce((s,i) => s+Number(i.cant||0)*Number(i.precio||0), 0);
    historial[_editCobroIdx] = { ...v, items: activos.map(i => { const {devuelto,...rest}=i; return rest; }), total: nuevoTotal.toFixed(2) };
  }

  // Restaurar stock y recolectar productos afectados para broadcast
  const productosAfectados = [];
  devolver.forEach(item => {
    const pid  = item.id ? String(item.id) : null;
    if (pid) {
      const prod = productos.find(p => String(p.id) === pid);
      if (prod) {
        prod.stock += Number(item.cant || 0);
        prod._ts = Date.now(); // marcar como modificado para sync
        if (!productosAfectados.some(p => String(p.id) === pid)) productosAfectados.push(prod);
      }
      [ventasDia, ventasSem, ventasMes].forEach(rep => {
        if (rep[pid]) {
          const montoIt = item.totalItem !== undefined ? Number(item.totalItem)
            : item.cantCobrada !== undefined ? Number(item.cantCobrada)*Number(item.precio||0)
            : Number(item.cant||0)*Number(item.precio||0);
          rep[pid].cant  -= Number(item.cant||0);
          rep[pid].total -= montoIt;
          if (rep[pid].cant <= 0) delete rep[pid];
        }
      });
    } else {
      const prod = productos.find(p => p.nom === item.nom);
      if (prod) {
        prod.stock += Number(item.cant || 0);
        prod._ts = Date.now();
        if (!productosAfectados.some(p => p.nom === item.nom)) productosAfectados.push(prod);
      }
    }
  });

  // ── Actualizar ventasDiarias: restar el monto devuelto del día correspondiente ──
  const fechaDev = v.fechaISO ? v.fechaISO.split('T')[0] : null;
  // Usar totalItem cuando existe para evitar inflación en ventas de paquetes
  const montoDevuelto = devolver.reduce((s, it) => {
    if (it.totalItem !== undefined) return s + Number(it.totalItem);
    if (it.cantCobrada !== undefined) return s + Number(it.cantCobrada) * Number(it.precio||0);
    return s + Number(it.cant||0) * Number(it.precio||0);
  }, 0);
  if (fechaDev && montoDevuelto > 0) {
    const vdIdx = (ventasDiarias || []).findIndex(vd => vd.fecha === fechaDev);
    if (vdIdx >= 0) {
      const nuevoMonto = Math.max(0, Number(ventasDiarias[vdIdx].monto || 0) - montoDevuelto);
      ventasDiarias[vdIdx] = { ...ventasDiarias[vdIdx], monto: nuevoMonto, _auto: true };
      idbSetMany([['vpos_ventasDiarias', ventasDiarias]]).catch(console.error);
      if (typeof syncAhora === 'function') syncAhora('venta_diaria');
    }
  }

  salvar(); cerrarModal('modalEditarCobro'); toast('✓ Devolución registrada — stock restaurado y ventas del día ajustadas');
  if (typeof syncAhora === 'function') syncAhora('productos');

  // ── FIX DESCUADRE: broadcast historial + productos afectados juntos ──
  // El evento 'historial_actualizado' incluye ahora los productos con stock actualizado
  // para que el otro teléfono los aplique sin depender del Supabase sync
  if (typeof _broadcast === 'function') {
    _broadcast('historial_actualizado', {
      historial: historial.map(v => ({...v, img: undefined})),
      productos_devolucion: productosAfectados.map(p => ({...p, img: undefined})),
      cobrosEliminados: cobrosEliminados,
      // Incluir ventasDiarias para que el otro teléfono descuente el monto devuelto
      ventasDiarias: ventasDiarias
    });
  }
}

// ===== 20. BACKUP / IMPORT / FUSIÓN =====

function exportarDatos() {
  const datos = { version: APP_SCHEMA_VERSION, exportado: nowISO(), efectivoInicial, inventarioInicial, productos, ventasDia, ventasSem, ventasMes, historial, pagos, ventasDiarias, restockLog };
  descargarJSON(datos, `Despensa_Economica_backup_${hoyStr()}.json`);
  _ultimoBackup = nowISO();
  idbSet('vpos_ultimoBackup', _ultimoBackup).catch(console.error);
  actualizarSubtituloBackup();
  toast('✓ Backup exportado — guárdalo en un lugar seguro');
}

function importarDatos(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const datos = JSON.parse(e.target.result);
      if (!datos.productos || !Array.isArray(datos.productos)) { toast('Archivo inválido o corrupto', true); return; }
      if (!confirm(`¿Restaurar backup?\n\n• ${datos.productos.length} productos\n• ${(datos.historial||[]).length} cobros\n• ${(datos.pagos||[]).length} gastos\n\nEsto reemplazará TODOS los datos actuales.`)) { event.target.value = ''; return; }
      productos = datos.productos || [];
      ventasDia = datos.ventasDia || {}; ventasSem = datos.ventasSem || {}; ventasMes = datos.ventasMes || {};
      historial = datos.historial || []; pagos = datos.pagos || []; ventasDiarias = datos.ventasDiarias || [];
      restockLog = datos.restockLog || [];
      ventasDia = normalizeReport(ventasDia); ventasSem = normalizeReport(ventasSem); ventasMes = normalizeReport(ventasMes);
      historial = normalizeHistorial(historial); pagos = normalizePagos(pagos);
      // ── Restaurar efectivo e inventario inicial ──────────────────────────
      if (datos.efectivoInicial !== undefined && datos.efectivoInicial !== null) {
        efectivoInicial = parseFloat(datos.efectivoInicial) || 0;
        idbSet('vpos_efectivoInicial', efectivoInicial).catch(console.error);
      }
      if (datos.inventarioInicial !== undefined && datos.inventarioInicial !== null) {
        inventarioInicial = parseFloat(datos.inventarioInicial) || 0;
        idbSet('vpos_inventarioInicial', inventarioInicial).catch(console.error);
      }
      salvar(); event.target.value = ''; toast(`✓ Datos restaurados — ${datos.productos.length} productos cargados`);
    } catch { toast('Error al leer el archivo', true); event.target.value = ''; }
  };
  reader.readAsText(file);
}

function actualizarSubtituloBackup() {
  const sub   = document.getElementById('backupSubtitle');
  const alert = document.getElementById('backupAlert');
  if (!sub) return;
  const ultimo = _ultimoBackup;
  if (!ultimo) { sub.textContent = 'Nunca has exportado un backup'; if (alert && productos.length > 0) alert.style.display = 'flex'; return; }
  const fecha = new Date(ultimo), ahora = new Date();
  const diasDiff = Math.floor((ahora - fecha) / 86400000);
  if (diasDiff === 0)      sub.textContent = `Último backup: hoy ${fecha.toLocaleTimeString('es-SV', {hour:'2-digit',minute:'2-digit'})}`;
  else if (diasDiff === 1) sub.textContent = `Último backup: ayer ${fecha.toLocaleDateString('es-SV')}`;
  else                     sub.textContent = `Último backup: hace ${diasDiff} días (${fecha.toLocaleDateString('es-SV')})`;
  if (alert) alert.style.display = diasDiff >= 3 ? 'flex' : 'none';
}

function fusionarDatos(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const ext = JSON.parse(e.target.result);
      if (!ext.productos || !Array.isArray(ext.productos)) { toast('Archivo inválido', true); return; }
      _datosAFusionar = ext;

      // ── Preview detallado ────────────────────────────────────────────────
      const extNorm       = normalizeReport(ext.ventasDia || {});
      const nuevosPs      = (ext.productos || []).filter(ep => !productos.find(lp => String(lp.id) === String(ep.id))).length;
      const ventaDiaLocal = totalReporte(ventasDia);
      const ventaDiaExt   = totalReporte(extNorm);
      const ventaMesLocal = totalReporte(ventasMes);
      const ventaMesExt   = totalReporte(normalizeReport(ext.ventasMes || {}));
      const cobrosExt     = (ext.historial || []).filter(v => !historial.find(h => h.id === v.id)).length;
      const gastosExt     = (ext.pagos || []).filter(g => !pagos.find(p => p.id === g.id)).length;
      const restockExt    = (ext.restockLog || []).filter(r => !(restockLog||[]).find(lr => lr.id === r.id)).length;

      document.getElementById('fusionPreview').innerHTML = `
        <div style="background:rgba(29,78,216,0.06);border:1.5px solid rgba(29,78,216,0.2);border-radius:var(--r-sm);padding:12px 14px;font-size:12px;font-weight:800;color:var(--blue);margin-bottom:12px;">
          🔀 <b>Fusión inteligente:</b> el stock se recalculará automáticamente sumando todas las ventas y entradas de ambos teléfonos. No se perderá ningún dato.
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
          <div class="stat-box"><div class="s-lbl">💰 Venta día combinada</div><div class="s-val" style="color:var(--green);font-size:17px;">$${(ventaDiaLocal+ventaDiaExt).toFixed(2)}</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Este: $${ventaDiaLocal.toFixed(2)} + Otro: $${ventaDiaExt.toFixed(2)}</div></div>
          <div class="stat-box"><div class="s-lbl">📅 Venta mes combinada</div><div class="s-val" style="color:var(--green);font-size:17px;">$${(ventaMesLocal+ventaMesExt).toFixed(2)}</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Este: $${ventaMesLocal.toFixed(2)} + Otro: $${ventaMesExt.toFixed(2)}</div></div>
          <div class="stat-box"><div class="s-lbl">🧾 Cobros nuevos</div><div class="s-val">${cobrosExt}</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">sin duplicados</div></div>
          <div class="stat-box"><div class="s-lbl">📦 Productos nuevos</div><div class="s-val">${nuevosPs}</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">del otro teléfono</div></div>
          <div class="stat-box"><div class="s-lbl">💸 Gastos nuevos</div><div class="s-val">${gastosExt}</div></div>
          <div class="stat-box"><div class="s-lbl">📥 Entradas de stock</div><div class="s-val">${restockExt}</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">para recalcular stock</div></div>
        </div>
        <div style="background:var(--green-light);border:1px solid var(--border-mid);border-radius:var(--r-sm);padding:10px 13px;font-size:12px;font-weight:800;color:var(--green-dark);">
          ✅ El stock de cada producto quedará exacto: inventario base − todas las ventas de ambos teléfonos + todas las entradas registradas.
        </div>
      `;
      event.target.value = '';
      abrirModal('modalFusionar');
    } catch { toast('Error al leer el archivo', true); event.target.value = ''; }
  };
  reader.readAsText(file);
}
function fusionarReporte(a, b) {
  const out = { ...normalizeReport(a) };
  for (const k in normalizeReport(b)) { if (out[k]) { out[k].cant += Number(b[k]?.cant||0); out[k].total += Number(b[k]?.total||0); } else out[k] = { ...b[k] }; }
  return out;
}

function confirmarFusion() {
  if (!_datosAFusionar) return;
  const ext = _datosAFusionar;

  // ── 0. CAPTURAR IDs DEL HISTORIAL LOCAL ANTES DE FUSIONAR ───────────────
  // CRÍTICO: esto debe hacerse ANTES del paso 3 (fusión de historial)
  // para poder separar correctamente cobros locales vs externos al recalcular stock
  const idsCobrosLocalAntes = new Set(historial.map(v => v.id));
  const idsCobrosExtAntes   = new Set((ext.historial || []).map(v => v.id));

  // ── 1. PRODUCTOS: agregar los que no existen localmente ─────────────────
  const idsLocales = new Set(productos.map(p => String(p.id)));
  (ext.productos || []).forEach(ep => {
    if (!idsLocales.has(String(ep.id))) productos.push(ep);
  });

  // ── 2. VENTAS (reportes): sumar cant y total por producto ───────────────
  ventasDia = fusionarReporte(ventasDia, ext.ventasDia || {});
  ventasSem = fusionarReporte(ventasSem, ext.ventasSem || {});
  ventasMes = fusionarReporte(ventasMes, ext.ventasMes || {});

  // ── 3. HISTORIAL DE COBROS: unir sin duplicados ─────────────────────────
  const seenH = new Set(historial.map(v => v.id));
  (normalizeHistorial(ext.historial || [])).forEach(v => { if (!seenH.has(v.id)) historial.push(v); });
  historial.sort((a, b) => (b.ts||0) - (a.ts||0));

  // ── 4. GASTOS/PAGOS: unir sin duplicados ───────────────────────────────
  const seenP = new Set(pagos.map(g => g.id));
  (normalizePagos(ext.pagos || [])).forEach(g => { if (!seenP.has(g.id)) pagos.push(g); });
  pagos.sort((a, b) => (b.ts||0) - (a.ts||0));

  // ── 5. VENTAS DIARIAS MANUALES: unir, si misma fecha sumar montos ───────
  (ext.ventasDiarias || []).forEach(vExt => {
    const idx = ventasDiarias.findIndex(vL => vL.fecha === vExt.fecha);
    if (idx >= 0) {
      // Si la misma fecha existe en ambos, sumar los montos
      ventasDiarias[idx].monto = (Number(ventasDiarias[idx].monto||0) + Number(vExt.monto||0));
      ventasDiarias[idx].nota  = [ventasDiarias[idx].nota, vExt.nota].filter(Boolean).join(' | ') || '';
    } else {
      ventasDiarias.push({ ...vExt });
    }
  });
  ventasDiarias.sort((a,b) => a.fecha.localeCompare(b.fecha));

  // ── 6. RESTOCK LOG: unir sin duplicados ────────────────────────────────
  const seenR = new Set((restockLog||[]).map(r => r.id));
  (ext.restockLog || []).forEach(r => { if (!seenR.has(r.id)) restockLog.push(r); });
  restockLog.sort((a,b) => (a.ts||0) - (b.ts||0));

  // ── 7. RECALCULAR STOCK DE CADA PRODUCTO ────────────────────────────────
  // CORRECCIÓN: usamos idsCobrosLocalAntes / idsCobrosExtAntes capturados
  // ANTES de fusionar el historial (paso 3). Si se capturan después, todos
  // los IDs quedan mezclados y vendioExt resulta siempre 0, descontando
  // solo una venta cuando debería descontar las de ambos teléfonos.
  //
  // Ejemplo: 55 dianas, tel1 vendió 1 (stock→54), tel2 vendió 1 (stock→54)
  // stockBase = max(54+1, 54+1) = 55
  // stockFinal = 55 - 1 - 1 = 53 ✅

  productos.forEach(p => {
    const pid = String(p.id);

    const extProd    = (ext.productos || []).find(ep => String(ep.id) === pid);
    const stockLocal = p.stock || 0;
    const stockExt   = extProd ? (extProd.stock || 0) : 0;

    // Ventas del teléfono LOCAL: cobros que solo existían en el local
    let vendioLocal = 0;
    historial.forEach(v => {
      if (idsCobrosLocalAntes.has(v.id) && !idsCobrosExtAntes.has(v.id)) {
        (v.items||[]).forEach(it => { if (String(it.id) === pid) vendioLocal += Number(it.cant||0); });
      }
    });

    // Ventas del teléfono EXTERNO: cobros que solo existían en el externo
    let vendioExt = 0;
    (normalizeHistorial(ext.historial||[])).forEach(v => {
      if (idsCobrosExtAntes.has(v.id) && !idsCobrosLocalAntes.has(v.id)) {
        (v.items||[]).forEach(it => { if (String(it.id) === pid) vendioExt += Number(it.cant||0); });
      }
    });

    // Reconstruir inventario base desde cada teléfono y tomar el mayor por seguridad
    const stockBaseLocal = stockLocal + vendioLocal;
    const stockBaseExt   = extProd ? (stockExt + vendioExt) : stockBaseLocal;
    const stockBase      = Math.max(stockBaseLocal, stockBaseExt);

    // Stock final = inventario base − ventas de ambos teléfonos
    const stockFinal = Math.max(0, stockBase - vendioLocal - vendioExt);

    p.stock = stockFinal;
  });

  _datosAFusionar = null;
  salvar();
  cerrarModal('modalFusionar');
  toast('✅ Fusión completada — stock, ventas y entradas actualizados', false, true);
}

// ===== 21. REINICIAR MES =====

function abrirModalReiniciarMes() {
  if (typeof _puedeHacer === 'function' && !_puedeHacer('reiniciar')) { toast('Solo el Admin puede reiniciar el mes', true); return; }
  const now = new Date(), mesNombre = now.toLocaleDateString('es-SV', {month:'long',year:'numeric'});
  const totalV = totalReporte(ventasMes);
  const totalG = pagos.filter(g => esMesActual(g.fechaISO)).reduce((s,g) => s+Number(g.monto||0), 0);
  const balance = totalV - totalG;
  document.getElementById('modalReiniciarMesResumen').innerHTML = `
    <div style="background:rgba(220,38,38,0.06);border:1px solid rgba(220,38,38,0.2);border-radius:var(--r-sm);padding:12px 14px;margin-bottom:12px;">
      <div style="font-weight:900;color:var(--red);margin-bottom:6px;">Resumen del mes: ${mesNombre.charAt(0).toUpperCase()+mesNombre.slice(1)}</div>
      <div style="display:flex;justify-content:space-between;"><span>Total ventas</span><span class="mono">$${totalV.toFixed(2)}</span></div>
      <div style="display:flex;justify-content:space-between;"><span>Gastos</span><span class="mono" style="color:var(--red)">$${totalG.toFixed(2)}</span></div>
      <div style="display:flex;justify-content:space-between;"><span>Balance</span><span class="mono" style="color:${balance>=0?'var(--green)':'var(--red)'}">$${balance.toFixed(2)}</span></div>
    </div>
  `;
  abrirModal('modalReiniciarMes');
}
// ══════════════════════════════════════════════════════════════════
// ESTADO DE RESULTADOS — PDF profesional generado al Reiniciar Mes
// Se genera en orientación horizontal (landscape) y reúne TODOS los
// datos actuales de la página: ventas reales, costos, gastos operativos
// (Facturas + Gasto Mensual), objetivo mensual de ganancia, patrimonio
// total ("Lo Que Tengo en Mi Tienda"), y los rankings de productos por
// ganancia. Se genera ANTES de borrar nada, con los datos tal como
// están en ese momento.
// ══════════════════════════════════════════════════════════════════
function _calcularEstadoResultados() {
  const now = new Date();
  const mesClave = now.toISOString().substring(0, 7);
  const mesNombre = now.toLocaleDateString('es-SV', { month: 'long', year: 'numeric' });

  // ── Recolectar datos reales del mes (misma lógica que el resto de la app) ──
  const acumProductosMes = {};
  (historial || []).forEach(v => {
    if (!v.fechaISO || !esMesActual(v.fechaISO)) return;
    (v.items || []).forEach(item => {
      const key = item.id ? String(item.id) : ('legacy:' + item.nom);
      const prod = item.id ? productos.find(p => String(p.id) === String(item.id)) : null;
      const cat  = (prod && prod.cat) ? prod.cat : (item.cat || 'SIN CATEGORÍA');
      if (!acumProductosMes[key]) acumProductosMes[key] = { nom: item.nom||'—', cat, cant: 0, totalVenta: 0, totalCosto: 0 };
      const cant = Number(item.cant || 0);
      acumProductosMes[key].cant += cant;
      let totVenta;
      if (item.totalItem !== undefined) totVenta = Number(item.totalItem);
      else if (item.cantCobrada !== undefined) totVenta = Number(item.cantCobrada) * Number(item.precio || 0);
      else if (item.esPromo || item.paqueteLabel) totVenta = Number(item.precio || 0);
      else totVenta = cant * Number(item.precio || 0);
      acumProductosMes[key].totalVenta += totVenta;
      const costoUd = Number(item.costoUd || item.compra || 0);
      acumProductosMes[key].totalCosto += cant * costoUd;
    });
  });
  const ingresoRealMes = Object.values(acumProductosMes).reduce((s,v)=>s+v.totalVenta,0);
  const cogsMes = Object.values(acumProductosMes).reduce((s,v)=>s+v.totalCosto,0);
  const utilidadBruta = ingresoRealMes - cogsMes;

  const pagosMes = (pagos || []).filter(g => esMesActual(g.fechaISO));
  const totalFacturas     = pagosMes.filter(g=>g.cat==='FACTURA').reduce((s,g)=>s+Number(g.monto||0),0);
  const totalGastoMensual = pagosMes.filter(g=>g.cat==='GASTO').reduce((s,g)=>s+Number(g.monto||0),0);
  const totalGastosOperativos = totalFacturas + totalGastoMensual;
  const utilidadNetaMes = utilidadBruta - totalGastosOperativos;

  const objetivoMeta = Number((typeof _cdMesData !== 'undefined' && _cdMesData.objetivoGananciaNeta) || 1200);
  const gananciaInventarioAhora = productos.reduce((s,p)=> s + (Number(p.stock)||0) * ((Number(p.venta)||0) - (Number(p.compra)||0)), 0);
  const gananciaEfectivoMes = ingresoRealMes - cogsMes;
  const gananciaGeneralMes = gananciaInventarioAhora + gananciaEfectivoMes;
  const metaCumplida = gananciaGeneralMes >= objetivoMeta;

  const efectivoInicialReal = Number(efectivoInicial || 0);
  const valorInventarioActual = productos.reduce((s,p)=> s + (Number(p.stock)||0) * (Number(p.venta)||0), 0);
  const efectivoVendidoNeto = ingresoRealMes - totalFacturas;
  const patrimonioTotal = efectivoInicialReal + efectivoVendidoNeto + valorInventarioActual;
  const patrimonioMenosGasto = patrimonioTotal - totalGastoMensual;

  const rankingProductosMes = Object.values(acumProductosMes)
    .map(v => ({ nom:v.nom, cant:v.cant, invertido:v.totalCosto, ganancia:v.totalVenta - v.totalCosto }))
    .sort((a,b)=> b.ganancia - a.ganancia);

  const rankingGananciaUnidad = productos
    .map(p => ({ nom:p.nom||'—', costo:Number(p.compra||0), venta:Number(p.venta||0), ganancia:Number(p.venta||0)-Number(p.compra||0) }))
    .sort((a,b)=> b.ganancia - a.ganancia);

  const ventasDiariasMes = (typeof ventasDiarias !== 'undefined' ? ventasDiarias : [])
    .filter(v => v.fecha && v.fecha.startsWith(mesClave))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  return {
    now, mesClave, mesNombre, ingresoRealMes, cogsMes, utilidadBruta,
    totalFacturas, totalGastoMensual, totalGastosOperativos, utilidadNetaMes,
    objetivoMeta, gananciaInventarioAhora, gananciaEfectivoMes, gananciaGeneralMes, metaCumplida,
    efectivoInicialReal, valorInventarioActual, patrimonioTotal, patrimonioMenosGasto,
    rankingProductosMes, rankingGananciaUnidad, ventasDiariasMes
  };
}

function generarEstadoResultadosPDF() {
  if (!window.jspdf) { toast('jsPDF no disponible', true); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const {
    now, mesClave, mesNombre, ingresoRealMes, cogsMes, utilidadBruta,
    totalFacturas, totalGastoMensual, totalGastosOperativos, utilidadNetaMes,
    objetivoMeta, gananciaInventarioAhora, gananciaEfectivoMes, gananciaGeneralMes, metaCumplida,
    efectivoInicialReal, valorInventarioActual, patrimonioTotal, patrimonioMenosGasto,
    rankingProductosMes, rankingGananciaUnidad, ventasDiariasMes
  } = _calcularEstadoResultados();

  // ── Helpers de dibujo (estilo consistente, adaptado a horizontal) ──
  let y = 32;
  const checkPage = () => { if (y > pageH - 16) { doc.addPage(); y = 16; } };
  const row = (lbl, val, colorV=[12,74,110]) => {
    if (y > pageH - 20) { doc.addPage(); y = 16; } // evita que una fila quede cortada al final de la página
    doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor(50,50,50); doc.text(lbl, 14, y);
    doc.setFont('helvetica','bold'); doc.setTextColor(...colorV); doc.text(val, w-14, y, {align:'right'});
    doc.setDrawColor(3,105,161); doc.setLineWidth(0.3); doc.line(14, y+1.5, w-14, y+1.5);
    y += 7;
  };
  const rowTotal = (lbl, color=[3,105,161]) => {
    if (y > pageH - 24) { doc.addPage(); y = 16; } // evita que el total quede partido entre dos páginas
    doc.setFillColor(224,242,254); doc.rect(14, y-5, w-28, 7, 'F');
    doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(...color);
    doc.text(lbl, 16, y);
    doc.setDrawColor(...color); doc.setLineWidth(0.7); doc.line(14, y+2, w-14, y+2);
    y += 11;
  };
  const sectionHeader = (txt, bgColor=[3,105,161]) => {
    checkPage();
    doc.setFillColor(...bgColor); doc.rect(14, y-6, w-28, 8, 'F');
    doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255);
    doc.text(txt, w/2, y, {align:'center'});
    y += 9;
  };

  // ── ENCABEZADO ──
  doc.setFillColor(12,74,110); doc.rect(0,0,w,22,'F');
  doc.setFontSize(17); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255);
  doc.text('ESTADO DE RESULTADOS', w/2, 11, {align:'center'});
  doc.setFontSize(10); doc.setFont('helvetica','normal');
  doc.text('Despensa Económica · ' + (mesNombre.charAt(0).toUpperCase()+mesNombre.slice(1)) + '   |   Generado: ' + now.toLocaleString('es-SV'), w/2, 18, {align:'center'});

  // ── 1. INGRESOS Y COSTO DE VENTAS ──
  sectionHeader('INGRESOS Y COSTO DE VENTAS', [21,128,61]);
  row('Ventas totales del mes', '$'+ingresoRealMes.toFixed(2), [21,128,61]);
  row('Menos costo de ventas (COGS)', '-$'+cogsMes.toFixed(2), [220,38,38]);
  rowTotal('UTILIDAD BRUTA: $'+utilidadBruta.toFixed(2), [21,128,61]);

  // ── 2. GASTOS OPERATIVOS ──
  sectionHeader('GASTOS OPERATIVOS DEL MES', [180,30,30]);
  row('Pago de Facturas (mercancía)', '-$'+totalFacturas.toFixed(2), [220,38,38]);
  row('Gasto Mensual (luz, agua, etc.)', '-$'+totalGastoMensual.toFixed(2), [220,38,38]);
  rowTotal('TOTAL GASTOS OPERATIVOS: $'+totalGastosOperativos.toFixed(2), [180,30,30]);

  // ── 3. UTILIDAD NETA ──
  sectionHeader('UTILIDAD NETA DEL MES', [12,74,110]);
  row('Utilidad bruta', '$'+utilidadBruta.toFixed(2), [21,128,61]);
  row('Menos gastos operativos', '-$'+totalGastosOperativos.toFixed(2), [220,38,38]);
  rowTotal((utilidadNetaMes>=0?'UTILIDAD NETA: $':'PÉRDIDA NETA: $')+Math.abs(utilidadNetaMes).toFixed(2), utilidadNetaMes>=0?[21,128,61]:[220,38,38]);

  // ── 4. OBJETIVO MENSUAL DE GANANCIA ──
  sectionHeader('OBJETIVO MENSUAL DE GANANCIA', [124,58,237]);
  row('Ganancia en inventario (aún sin vender)', '$'+gananciaInventarioAhora.toFixed(2), [30,64,175]);
  row('Ganancia ya realizada (ventas del mes)', '$'+gananciaEfectivoMes.toFixed(2), [21,128,61]);
  row('Meta mínima establecida', '$'+objetivoMeta.toFixed(2), [124,58,237]);
  rowTotal((metaCumplida?'META CUMPLIDA - GANANCIA TOTAL: $':'META NO CUMPLIDA - GANANCIA TOTAL: $')+gananciaGeneralMes.toFixed(2), metaCumplida?[21,128,61]:[220,38,38]);

  // ── 5. LO QUE TENGO EN MI TIENDA ──
  sectionHeader('LO QUE TENGO EN MI TIENDA', [8,145,178]);
  row('Efectivo inicial del mes', '$'+efectivoInicialReal.toFixed(2), [8,145,178]);
  row('Mas ventas cobradas este mes', '+$'+ingresoRealMes.toFixed(2), [21,128,61]);
  row('Menos pago de facturas este mes', '-$'+totalFacturas.toFixed(2), [220,38,38]);
  row('Mas inventario actual (a precio de venta)', '+$'+valorInventarioActual.toFixed(2), [8,145,178]);
  rowTotal('TOTAL EN MI TIENDA AHORA: $'+patrimonioTotal.toFixed(2), [8,145,178]);
  row('Menos gasto mensual (luz, agua, etc.)', '-$'+totalGastoMensual.toFixed(2), [220,38,38]);
  rowTotal('TOTAL - GASTO MENSUAL: $'+patrimonioMenosGasto.toFixed(2), [154,52,18]);

  // ── 6. PRODUCTOS DEL MES — INVERTIDO Y GANANCIA (tabla) ──
  sectionHeader('PRODUCTOS DEL MES - INVERTIDO Y GANANCIA', [3,105,161]);
  if (rankingProductosMes.length) {
    doc.autoTable({
      startY: y,
      head: [['Producto', 'Unidades', 'Invertido', 'Ganancia']],
      body: rankingProductosMes.slice(0, 20).map(p => [p.nom, String(p.cant), '$'+p.invertido.toFixed(2), '$'+p.ganancia.toFixed(2)]),
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [3,105,161], textColor: [255,255,255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240,249,255] },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'right', textColor: [180,83,9] },
        3: { halign: 'right', textColor: [21,128,61], fontStyle: 'bold' }
      },
      margin: { left: 14, right: 14 }
    });
    y = doc.lastAutoTable.finalY + 10;
  } else {
    doc.setFontSize(10); doc.setTextColor(150,150,150); doc.text('Sin ventas registradas este mes', w/2, y, {align:'center'}); y += 10;
  }

  // ── 7. PRIORIDAD POR GANANCIA (mejor y menor margen) ──
  checkPage();
  sectionHeader('PRIORIDAD POR GANANCIA - INVENTARIO COMPLETO', [124,58,237]);
  if (rankingGananciaUnidad.length) {
    doc.autoTable({
      startY: y,
      head: [['#', 'Producto', 'Costo', 'Venta', 'Ganancia/Ud.']],
      body: rankingGananciaUnidad.map((p,i) => [String(i+1), p.nom, '$'+p.costo.toFixed(2), '$'+p.venta.toFixed(2), '$'+p.ganancia.toFixed(2)]),
      styles: { fontSize: 8.5, cellPadding: 2.2 },
      headStyles: { fillColor: [124,58,237], textColor: [255,255,255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245,243,255] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        2: { halign: 'right', textColor: [100,50,180] },
        3: { halign: 'right' },
        4: { halign: 'right', fontStyle: 'bold', textColor: [21,128,61] }
      },
      margin: { left: 14, right: 14 },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const g = Number(data.cell.raw.replace('$',''));
          if (g < 0) data.cell.styles.textColor = [220,38,38];
        }
      }
    });
    y = doc.lastAutoTable.finalY + 10;
  } else {
    doc.setFontSize(10); doc.setTextColor(150,150,150); doc.text('Sin productos en el inventario', w/2, y, {align:'center'}); y += 10;
  }

  // ── VENTAS POR DÍA (módulo "Ventas por Día", registro/auto por fecha) ──
  checkPage();
  sectionHeader('VENTAS POR DÍA DEL MES', [21,128,61]);
  if (ventasDiariasMes.length) {
    const totalVD = ventasDiariasMes.reduce((s, v) => s + Number(v.monto || 0), 0);
    doc.autoTable({
      startY: y,
      head: [['Fecha', 'Monto Vendido', 'Origen', 'Nota']],
      body: ventasDiariasMes.map(v => [
        v.fecha,
        '$' + Number(v.monto || 0).toFixed(2),
        v._auto ? 'Automático (POS)' : 'Manual',
        v.nota || '—'
      ]),
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [21,128,61], textColor: [255,255,255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240,253,244] },
      columnStyles: {
        1: { halign: 'right', fontStyle: 'bold', textColor: [21,128,61] },
        2: { halign: 'center' }
      },
      margin: { left: 14, right: 14 },
      foot: [['TOTAL', '$' + totalVD.toFixed(2), '', '']],
      footStyles: { fillColor: [220,252,231], textColor: [6,95,70], fontStyle: 'bold' }
    });
    y = doc.lastAutoTable.finalY + 10;
  } else {
    doc.setFontSize(10); doc.setTextColor(150,150,150); doc.text('Sin registros de Ventas por Día este mes', w/2, y, {align:'center'}); y += 10;
  }

  // ── PIE ──
  checkPage();
  doc.setDrawColor(3,105,161); doc.setLineWidth(1); doc.line(14, y, w-14, y); y += 7;
  doc.setFontSize(9); doc.setFont('helvetica','italic'); doc.setTextColor(120,120,120);
  doc.text('Despensa Económica — Estado de Resultados ' + mesClave, w/2, y, {align:'center'});

  doc.save(`Estado_Resultados_${mesClave}.pdf`);
  toast('📄 Estado de Resultados descargado');
}

// ══════════════════════════════════════════════════════════════════
// IMAGEN 4K (9:16) DEL ESTADO DE RESULTADOS — reemplaza al backup JSON
// al Reiniciar Mes. Misma información y mismos colores que el PDF,
// condensada en una sola imagen vertical de alta resolución.
// ══════════════════════════════════════════════════════════════════
function generarImagenEstadoResultados() {
  const {
    now, mesClave, mesNombre, ingresoRealMes, cogsMes, utilidadBruta,
    totalFacturas, totalGastoMensual, totalGastosOperativos, utilidadNetaMes,
    objetivoMeta, gananciaInventarioAhora, gananciaEfectivoMes, gananciaGeneralMes, metaCumplida,
    efectivoInicialReal, valorInventarioActual, patrimonioTotal, patrimonioMenosGasto,
    rankingProductosMes, rankingGananciaUnidad, ventasDiariasMes
  } = _calcularEstadoResultados();

  const W = 2160, H = 3840; // 4K UHD vertical, exactamente 9:16
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const PAD = 48;

  ctx.fillStyle = '#f8fafb'; ctx.fillRect(0, 0, W, H);

  let y = 0;

  // Encabezado
  ctx.fillStyle = '#0c4a6e'; ctx.fillRect(0, 0, W, 190);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 58px Arial'; ctx.textAlign = 'center';
  ctx.fillText('ESTADO DE RESULTADOS', W/2, 95);
  ctx.font = '30px Arial'; ctx.fillStyle = '#bae6fd';
  const mesCap = mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1);
  ctx.fillText(`Despensa Económica · ${mesCap}`, W/2, 140);
  ctx.font = '24px Arial'; ctx.fillStyle = '#7dd3fc';
  ctx.fillText(`Generado: ${now.toLocaleString('es-SV')}`, W/2, 172);
  y = 230;

  const sectionHeader = (txt, color) => {
    ctx.fillStyle = color; ctx.fillRect(PAD, y - 34, W - PAD*2, 58);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 30px Arial'; ctx.textAlign = 'center';
    ctx.fillText(txt, W/2, y + 6);
    y += 46;
  };
  const row = (lbl, val, colorVal = '#0c4a6e') => {
    ctx.font = '27px Arial'; ctx.fillStyle = '#333'; ctx.textAlign = 'left';
    ctx.fillText(lbl, PAD + 8, y);
    ctx.font = 'bold 27px Arial'; ctx.fillStyle = colorVal; ctx.textAlign = 'right';
    ctx.fillText(val, W - PAD - 8, y);
    ctx.strokeStyle = '#0369a1'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD, y + 12); ctx.lineTo(W - PAD, y + 12); ctx.stroke();
    y += 44;
  };
  const rowTotal = (lbl, color) => {
    ctx.fillStyle = '#e0f2fe'; ctx.fillRect(PAD, y - 30, W - PAD*2, 50);
    ctx.font = 'bold 28px Arial'; ctx.fillStyle = color; ctx.textAlign = 'left';
    ctx.fillText(lbl, PAD + 12, y);
    y += 64;
  };

  // 1. Ingresos y Costo de Ventas
  sectionHeader('INGRESOS Y COSTO DE VENTAS', '#15803d');
  row('Ventas totales del mes', '$'+ingresoRealMes.toFixed(2), '#15803d');
  row('Menos costo de ventas (COGS)', '-$'+cogsMes.toFixed(2), '#dc2626');
  rowTotal('UTILIDAD BRUTA: $'+utilidadBruta.toFixed(2), '#15803d');

  // 2. Gastos Operativos
  sectionHeader('GASTOS OPERATIVOS DEL MES', '#b41e1e');
  row('Pago de Facturas (mercancía)', '-$'+totalFacturas.toFixed(2), '#dc2626');
  row('Gasto Mensual (luz, agua, etc.)', '-$'+totalGastoMensual.toFixed(2), '#dc2626');
  rowTotal('TOTAL GASTOS OPERATIVOS: $'+totalGastosOperativos.toFixed(2), '#b41e1e');

  // 3. Utilidad Neta
  sectionHeader('UTILIDAD NETA DEL MES', '#0c4a6e');
  row('Utilidad bruta', '$'+utilidadBruta.toFixed(2), '#15803d');
  row('Menos gastos operativos', '-$'+totalGastosOperativos.toFixed(2), '#dc2626');
  rowTotal((utilidadNetaMes>=0?'UTILIDAD NETA: $':'PÉRDIDA NETA: $')+Math.abs(utilidadNetaMes).toFixed(2), utilidadNetaMes>=0?'#15803d':'#dc2626');

  // 4. Objetivo Mensual de Ganancia
  sectionHeader('OBJETIVO MENSUAL DE GANANCIA', '#7c3aed');
  row('Ganancia en inventario (sin vender)', '$'+gananciaInventarioAhora.toFixed(2), '#1e40af');
  row('Ganancia ya realizada (ventas)', '$'+gananciaEfectivoMes.toFixed(2), '#15803d');
  row('Meta mínima establecida', '$'+objetivoMeta.toFixed(2), '#7c3aed');
  rowTotal((metaCumplida?'META CUMPLIDA: $':'META NO CUMPLIDA: $')+gananciaGeneralMes.toFixed(2), metaCumplida?'#15803d':'#dc2626');

  // 5. Lo Que Tengo en Mi Tienda
  sectionHeader('LO QUE TENGO EN MI TIENDA', '#0891b2');
  row('Efectivo inicial del mes', '$'+efectivoInicialReal.toFixed(2), '#0891b2');
  row('Mas ventas cobradas', '+$'+ingresoRealMes.toFixed(2), '#15803d');
  row('Menos facturas pagadas', '-$'+totalFacturas.toFixed(2), '#dc2626');
  row('Mas inventario (a venta)', '+$'+valorInventarioActual.toFixed(2), '#0891b2');
  rowTotal('TOTAL EN MI TIENDA: $'+patrimonioTotal.toFixed(2), '#0891b2');
  row('Menos gasto mensual', '-$'+totalGastoMensual.toFixed(2), '#dc2626');
  rowTotal('TOTAL − GASTO MENSUAL: $'+patrimonioMenosGasto.toFixed(2), '#9a3412');

  // 6. Top productos del mes
  sectionHeader('PRODUCTOS DEL MES — TOP GANANCIA', '#0369a1');
  if (rankingProductosMes.length) {
    rankingProductosMes.slice(0, 5).forEach((p, i) => {
      row(`${i+1}. ${p.nom}`, '$'+p.ganancia.toFixed(2), p.ganancia >= 0 ? '#15803d' : '#dc2626');
    });
  } else {
    ctx.font = '24px Arial'; ctx.fillStyle = '#9ca3af'; ctx.textAlign = 'center';
    ctx.fillText('Sin ventas registradas este mes', W/2, y); y += 44;
  }

  // 7. Prioridad por Ganancia (mejor y menor margen)
  sectionHeader('PRIORIDAD POR GANANCIA — INVENTARIO', '#7c3aed');
  if (rankingGananciaUnidad.length) {
    ctx.font = 'bold 24px Arial'; ctx.fillStyle = '#15803d'; ctx.textAlign = 'left';
    ctx.fillText('Mejor margen:', PAD + 8, y); y += 40;
    rankingGananciaUnidad.slice(0, 3).forEach(p => row(p.nom, '$'+p.ganancia.toFixed(2), '#15803d'));
    ctx.font = 'bold 24px Arial'; ctx.fillStyle = '#dc2626'; ctx.textAlign = 'left';
    ctx.fillText('Menor margen:', PAD + 8, y); y += 40;
    rankingGananciaUnidad.slice(-3).reverse().forEach(p => row(p.nom, '$'+p.ganancia.toFixed(2), '#dc2626'));
  }

  // 8. Ventas por Día
  sectionHeader('VENTAS POR DÍA DEL MES', '#15803d');
  if (ventasDiariasMes.length) {
    const totalVD = ventasDiariasMes.reduce((s, v) => s + Number(v.monto || 0), 0);
    ventasDiariasMes.slice(-6).forEach(v => row(v.fecha, '$'+Number(v.monto||0).toFixed(2), '#15803d'));
    rowTotal('TOTAL VENTAS POR DÍA: $'+totalVD.toFixed(2), '#15803d');
  } else {
    ctx.font = '24px Arial'; ctx.fillStyle = '#9ca3af'; ctx.textAlign = 'center';
    ctx.fillText('Sin registros de Ventas por Día', W/2, y); y += 44;
  }

  // Pie — rellena el resto del lienzo para mantener el formato 9:16 completo
  ctx.strokeStyle = '#0369a1'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(PAD, y + 20); ctx.lineTo(W - PAD, y + 20); ctx.stroke();
  ctx.font = 'italic 22px Arial'; ctx.fillStyle = '#9ca3af'; ctx.textAlign = 'center';
  ctx.fillText(`Despensa Económica — Estado de Resultados ${mesClave}`, W/2, H - 40);

  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `Estado_Resultados_${mesClave}.png`;
  link.click();
  toast('🖼️ Imagen del Estado de Resultados descargada');
}

function ejecutarReiniciarMes() {
  if (!confirm('Se descargará una imagen resumen y un backup JSON completo, y luego se reiniciará el mes. ¿Continuar?')) return;

  // Generar la imagen 4K (9:16) con el resumen del mes, ANTES de borrar nada
  try { generarImagenEstadoResultados(); } catch (e) { console.error('Error generando imagen del Estado de Resultados:', e); }

  // Backup JSON completo (respaldo real de datos, para poder restaurar si algo falla)
  const mesClave = new Date().toISOString().substring(0, 7);
  const fmDatosBackup = (typeof _fmDatos !== 'undefined') ? _fmDatos : null;

  descargarJSON({
    version: APP_SCHEMA_VERSION,
    exportado: nowISO(),
    tipo: 'cierre-de-mes',
    efectivoInicial, inventarioInicial,
    productos, ventasDia, ventasSem, ventasMes,
    historial, pagos, ventasDiarias, restockLog,
    finanzasMes: fmDatosBackup ? { mes: mesClave, datos: fmDatosBackup } : null
  }, `Backup_CierreMes_${hoyStr()}.json`);

  // Resetear datos del mes
  // Antes de borrar, se marcan TODAS las fechas como "eliminadas" (tombstone)
  // para que ningún proceso de sincronización/fusión las vuelva a traer de
  // vuelta desde otro dispositivo o desde la nube al recargar la página.
  const _fechasVDBorradas = (ventasDiarias || []).map(v => v.fecha).filter(Boolean);
  _fechasVDBorradas.forEach(f => { if (!ventasDiariasEliminadas.includes(f)) ventasDiariasEliminadas.push(f); });
  idbSet('vpos_ventasDiariasElim', ventasDiariasEliminadas).catch(console.error);
  if (typeof _broadcast === 'function') _broadcast('ventas_dia_eliminada', { ventasDiariasEliminadas });

  historial = []; pagos = []; ventasDiarias = []; restockLog = [];
  idbSet('vpos_ventasDiarias', []).catch(console.error);
  ventasDia = {}; ventasSem = {}; ventasMes = {};
  productos.forEach(p => { p.lotes = []; });
  efectivoInicial = 0; inventarioInicial = 0; inventarioCosto = 0;
  idbSet('vpos_efectivoInicial', 0).catch(console.error);
  idbSet('vpos_inventarioInicial', 0).catch(console.error);
  idbSet('vpos_inventarioCosto', 0).catch(console.error);
  const inpEf  = document.getElementById('inpEfectivoInicial');  if (inpEf)  inpEf.value  = '';
  const inpInv = document.getElementById('inpInventarioInicial'); if (inpInv) inpInv.value = '';
  const inpIC  = document.getElementById('inpInventarioCosto');   if (inpIC)  inpIC.value  = '';

  // Limpiar finanzas del mes actual en IDB y Supabase
  if (typeof idbSet === 'function') {
    idbSet(`fm_datos_${mesClave}`, null).catch(console.error);
  }
  if (typeof _sbDeleteFiltro === 'function' && typeof _getTiendaId === 'function') {
    const tid = _getTiendaId();
    if (tid) {
      _sbDeleteFiltro('finanzas_mes', { tienda_id: 'eq.' + tid, mes: 'eq.' + mesClave }).catch(() => {});
      // También limpiar cierres diarios del mes en Supabase
      const mesInicio = mesClave + '-01';
      const mesFin    = mesClave + '-31';
      _sbDeleteFiltro('cierre_diario', { tienda_id: 'eq.' + tid, fecha: 'gte.' + mesInicio, 'fecha.lte': mesFin }).catch(() => {});
    }
  }
  // Resetear estado en memoria del módulo finanzas
  if (typeof _fmDatos !== 'undefined') {
    // eslint-disable-next-line no-global-assign
    try {
      window._fmDatos = { efectivoInicial: 0, inventarioInicial: 0, ventas: [], facturas: [], gastos: [] };
    } catch(e) {}
  }

  salvar(); cerrarModal('modalReiniciarMes'); toast('Mes reiniciado — inventario intacto', false, true);

  // Borrar log de acciones del mes en Supabase SOLO para esta tienda
  if (typeof _sbDeleteFiltro === 'function' && typeof _getTiendaId === 'function') {
    const tid = _getTiendaId();
    if (tid) {
      _sbDeleteFiltro('acciones_log', { tienda_id: 'eq.' + tid }).catch(() => {});
    }
  }

  // 1️⃣ Broadcast instantáneo → todos los teléfonos conectados limpian sus datos en tiempo real
  if (typeof _broadcast === 'function') {
    _broadcast('reinicio_mes', {
      ts: new Date().toISOString(),
      efectivoInicial: 0,
      inventarioInicial: 0
    });
  }

  // 2️⃣ Subir datos vacíos a Supabase → al iniciar sesión, phone B carga datos limpios
  //    syncAhora('todo') llama a _subirHistorial (borra ventas), _subirPagos (borra pagos),
  //    _subirVentasDiarias (borra ventas_diarias) porque los arrays ahora están vacíos
  if (typeof syncAhora === 'function') syncAhora('todo');

  // 3️⃣ Subir snapshot con estado limpio + señal push para reconexiones
  setTimeout(() => {
    if (typeof _autoEnviarSnapshot === 'function') _autoEnviarSnapshot();
    if (typeof _broadcast === 'function') {
      _broadcast('snapshot_push', { tienda: typeof _getTiendaId === 'function' ? _getTiendaId() : '' });
    }
  }, 2000);
}

// ===== 22. MODAL =====

let _lastFocus = null;
function abrirModal(id) {
  const m = document.getElementById(id); if (!m) return;
  _lastFocus = document.activeElement;
  m.classList.add('open');
  // No auto-enfocar en modalCantidad para no re-abrir el teclado del teléfono
  if (id !== 'modalCantidad') {
    setTimeout(() => { const f = m.querySelector('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'); if (f) f.focus(); }, 20);
  }
}
function cerrarModal(id) {
  const m = document.getElementById(id); if (!m) return;
  m.classList.remove('open');
  if (_lastFocus && typeof _lastFocus.focus === 'function') _lastFocus.focus();
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { const open = document.querySelector('.modal.open'); if (open) open.classList.remove('open'); } });

// ===== 23. VER CÓDIGO =====

function abrirModalCodigo() {
  document.getElementById('areaCodigo').value = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
  abrirModal('modalCodigo');
}
function seleccionarTodoCodigo() {
  const area = document.getElementById('areaCodigo'); area.focus(); area.select();
  try { document.execCommand('copy'); toast('✓ Código copiado al portapapeles'); } catch { toast('Selecciona el texto manualmente y copia'); }
}
function descargarCodigoHTML() {
  const blob = new Blob(['<!DOCTYPE html>\n' + document.documentElement.outerHTML], {type:'text/html'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = 'Despensa_Economica_codigo.html';
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  toast('✓ Archivo HTML descargado');
}

// ===== 24. SOFT RELOAD =====

async function softReload() {
  salvarSesion();
  if (carrito.length) { toast('Hay una venta en curso. Finaliza o cancela antes de recargar.', true); return; }

  const btn = document.getElementById('reloadBtn');
  if (btn) btn.classList.add('spin');

  // Cargar caché local primero (UI instantánea)
  await migrateAndLoad();
  const validas = ['pgDash','pgInventario','pgReportes','pgDestacados','pgVentasDiarias','pgSync','pgFinanzasMes','pgCierreDia'];
  navTo(validas.includes(_paginaActual) ? _paginaActual : 'pgDash');
  renderCarrito(); actualizarStats();
  const _pgActiva = document.querySelector('.page.active');
  if (_pgActiva) renderPagina(_pgActiva.id);
  actualizarSubtituloBackup();

  // Descargar datos frescos de Supabase si hay sesión activa
  if (typeof _sesionActiva !== 'undefined' && _sesionActiva && typeof _autoCargarDesdeSupa === 'function') {
    toast('🔄 Sincronizando con la nube…');
    await _autoCargarDesdeSupa();
    const _pgActiva2 = document.querySelector('.page.active');
    if (_pgActiva2) renderPagina(_pgActiva2.id);
    actualizarStats();
  }

  if (btn) setTimeout(() => btn.classList.remove('spin'), 500);
  toast('✓ App actualizada desde Supabase', false, true);
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (carrito.length) return;
    // Al volver a la pestaña: mostrar caché local y luego bajar Supabase
    migrateAndLoad().then(async () => {
      actualizarTodo();
      if (typeof _sesionActiva !== 'undefined' && _sesionActiva && typeof _autoCargarDesdeSupa === 'function') {
        await _autoCargarDesdeSupa();
        actualizarTodo();
      }
    }).catch(console.error);
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'F5' || (e.ctrlKey && e.key === 'r') || (e.metaKey && e.key === 'r')) { e.preventDefault(); softReload(); }
});

// ===== VD. VENTAS DIARIAS MANUALES =====

function initVentasDiarias() {
  // BUG FIX: sanear ventasDiarias que ya están corruptas en IDB/localStorage.
  // El bug subía las fechas como "tiendaId_YYYY-MM-DD" a Supabase y las descargaba
  // sin quitar el prefijo, dejando fecha="despensa1_2026-04-30" en vez de "2026-04-30".
  // Este saneador detecta y limpia cualquier entrada corrupta antes de renderizar.
  const _fechaISO_RE = /^\d{4}-\d{2}-\d{2}$/;
  let _dirty = false;
  ventasDiarias = (ventasDiarias || []).map(v => {
    if (!v.fecha || _fechaISO_RE.test(v.fecha)) return v; // ya está limpia
    // Intentar extraer YYYY-MM-DD del final de la cadena corrupta
    const _m = v.fecha.match(/(\d{4}-\d{2}-\d{2})$/);
    if (_m) { _dirty = true; return { ...v, fecha: _m[1] }; }
    return null; // entrada irreparable → descartar
  }).filter(Boolean);
  // Deduplicar por fecha (puede haber duplicados si había entradas corruptas y limpias)
  const _seen = new Set();
  ventasDiarias = ventasDiarias.filter(v => { if (_seen.has(v.fecha)) return false; _seen.add(v.fecha); return true; });
  if (_dirty) {
    salvar(false);
    idbSetMany([['vpos_ventasDiarias', ventasDiarias]]).catch(() => {});
    console.log('[initVD] Fechas corruptas saneadas en ventasDiarias');
  }
  // Poner fecha de hoy por defecto si el campo está vacío
  const inp = document.getElementById('vdFecha');
  if (inp && !inp.value) {
    inp.value = _fechaLocalISO();
  }
  // Llenar el selector de mes/año
  poblarFiltroMes();
}

function poblarFiltroMes() {
  const sel = document.getElementById('vdFiltroMes');
  if (!sel) return;
  const meses = new Set();
  (ventasDiarias || []).forEach(v => {
    if (v.fecha) meses.add(v.fecha.substring(0, 7)); // YYYY-MM
  });
  // Agregar mes actual siempre
  meses.add(new Date().toISOString().substring(0, 7));
  const sorted = [...meses].sort((a, b) => b.localeCompare(a));
  const prevVal = sel.value;
  sel.innerHTML = sorted.map(m => {
    const [y, mo] = m.split('-');
    const label = new Date(Number(y), Number(mo) - 1).toLocaleDateString('es-SV', { month: 'long', year: 'numeric' });
    return `<option value="${m}">${label.charAt(0).toUpperCase() + label.slice(1)}</option>`;
  }).join('');
  if (prevVal && sorted.includes(prevVal)) sel.value = prevVal;
}

function guardarVentaDiaria() {
  const fecha  = document.getElementById('vdFecha').value;
  const monto  = parseFloat(document.getElementById('vdMonto').value);
  const nota   = document.getElementById('vdNota').value.trim();

  if (!fecha) { toast('Selecciona una fecha', true); return; }
  if (isNaN(monto) || monto < 0) { toast('Ingresa un monto válido', true); return; }

  // Si ya existe esa fecha, actualizar
  const idx = ventasDiarias.findIndex(v => v.fecha === fecha);
  if (idx >= 0) {
    if (!confirm(`Ya hay una venta registrada para el ${formatFechaVD(fecha)} ($${ventasDiarias[idx].monto.toFixed(2)}). ¿Reemplazar?`)) { toast("Sin cambios — venta existente conservada"); return; }
    ventasDiarias[idx] = { fecha, monto, nota };
  } else {
    ventasDiarias.push({ fecha, monto, nota });
  }
  ventasDiarias.sort((a, b) => a.fecha.localeCompare(b.fecha));
  salvar(false);
  idbSetMany([['vpos_ventasDiarias', ventasDiarias]]).catch(console.error);
  // Sync Supabase
  if (typeof syncAhora === 'function') syncAhora('venta_diaria');
  // ── FIX: broadcast instantáneo → el otro teléfono recibe la venta en <100ms ──
  // syncAhora solo sube a Supabase pero no notifica al otro teléfono en tiempo real.
  // El broadcast 'venta_diaria_actualizada' lleva toda la lista para que el receptor
  // pueda hacer merge y no dependa del polling.
  if (typeof _broadcast === 'function') _broadcast('venta_diaria_actualizada', { ventasDiarias: ventasDiarias });

  document.getElementById('vdMonto').value = '';
  document.getElementById('vdNota').value  = '';
  // Avanzar fecha al siguiente día
  const d = new Date(fecha + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  document.getElementById('vdFecha').value = _fechaLocalISO(d);

  poblarFiltroMes();
  renderVentasDiarias();
  toast('✓ Venta guardada');
}

// ── Auto-registro: sincroniza ventasDiarias con el total del POS de hoy ──
// Se llama automáticamente al finalizar cada venta y al abrir la página.
// El usuario puede editar/corregir manualmente desde el formulario.
function autoRegistrarVentaDiaria() {
  const hoy   = _fechaLocalISO();
  const total = typeof totalReporte === 'function' ? totalReporte(ventasDia || {}) : 0;
  if (total <= 0) return; // nada vendido hoy, no registrar

  const idx = (ventasDiarias || []).findIndex(v => v.fecha === hoy);
  if (idx >= 0) {
    // Solo actualizar si el total POS es mayor (nunca bajar una venta confirmada)
    if (total <= Number(ventasDiarias[idx].monto || 0)) return;
    ventasDiarias[idx] = { ...ventasDiarias[idx], monto: total, _auto: true };
  } else {
    ventasDiarias.push({ fecha: hoy, monto: total, nota: 'Auto-POS', _auto: true });
  }
  ventasDiarias.sort((a, b) => a.fecha.localeCompare(b.fecha));
  salvar(false);
  idbSetMany([['vpos_ventasDiarias', ventasDiarias]]).catch(console.error);
  if (typeof syncAhora === 'function') syncAhora('venta_diaria');
  if (typeof _broadcast === 'function') _broadcast('venta_diaria_actualizada', { ventasDiarias });
  // Refrescar UI si la página está abierta
  if (typeof renderVentasDiarias === 'function' && document.getElementById('pgVentasDiarias')?.classList?.contains('active')) {
    renderVentasDiarias();
  }
  if (typeof renderCajaPanel === 'function') renderCajaPanel();
}

// Llenar el campo de monto con el total del POS (para corrección manual)
function vdLlenarDesdePOS() {
  const hoy   = _fechaLocalISO();
  const total = typeof totalReporte === 'function' ? totalReporte(ventasDia || {}) : 0;
  const inp = document.getElementById('vdFecha');
  if (inp) inp.value = hoy;
  const inpM = document.getElementById('vdMonto');
  if (inpM) { inpM.value = total.toFixed(2); inpM.focus(); }
  toast('💡 Monto del POS cargado — edita si necesitas y guarda');
}

function eliminarVentaDiaria(fecha) {
  if (!confirm(`¿Eliminar la venta del ${formatFechaVD(fecha)}?`)) return;
  ventasDiarias = ventasDiarias.filter(v => v.fecha !== fecha);
  // FIX: recalcular ventasMes/ventasDia/ventasSem en este teléfono también
  if (typeof _recalcularReportesDesdeHistorial === 'function') _recalcularReportesDesdeHistorial();
  salvar(false);
  renderVentasDiarias();
  toast('Venta eliminada', true);
  // Broadcast instantáneo → otros teléfonos eliminan ese día en tiempo real
  // BUGFIX SYNC: guardar fecha en tombstone para que _fusionarDos no la restaure desde snapshots
  if (!ventasDiariasEliminadas.includes(fecha)) ventasDiariasEliminadas.push(fecha);
  salvar(false);
  idbSetMany([['vpos_ventasDiariasElim', ventasDiariasEliminadas]]).catch(() => {});
  if (typeof _broadcast === 'function') _broadcast('ventas_dia_eliminada', { fecha, ventasDiariasEliminadas });
  if (typeof syncBorrarVentaDiaria === 'function') syncBorrarVentaDiaria(fecha);
}

function formatFechaVD(fechaISO) {
  // fechaISO = "YYYY-MM-DD"
  const [y, m, d] = fechaISO.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}

const DIAS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function renderVentasDiarias() {
  poblarFiltroMes();
  const sel   = document.getElementById('vdFiltroMes');
  const mes   = sel ? sel.value : new Date().toISOString().substring(0, 7);
  const lista = (ventasDiarias || []).filter(v => v.fecha && v.fecha.startsWith(mes));

  // Resumen
  const total  = lista.reduce((s, v) => s + Number(v.monto || 0), 0);
  const dias   = lista.length;
  const promedio = dias ? total / dias : 0;
  const maxDia = dias ? lista.reduce((best, v) => Number(v.monto) > Number(best.monto) ? v : best, lista[0]) : null;

  const resumen = document.getElementById('vdResumenMes');
  if (resumen) resumen.innerHTML = `
    <div class="stat-box"><div class="s-lbl">Total del Mes</div><div class="s-val" style="color:#0369a1;">$${total.toFixed(2)}</div></div>
    <div class="stat-box"><div class="s-lbl">Días Registrados</div><div class="s-val">${dias}</div></div>
    <div class="stat-box"><div class="s-lbl">Promedio Diario</div><div class="s-val" style="font-size:17px;">$${promedio.toFixed(2)}</div></div>
    <div class="stat-box"><div class="s-lbl">Mejor Día</div><div class="s-val" style="font-size:15px;">${maxDia ? '$' + Number(maxDia.monto).toFixed(2) : '—'}</div></div>
  `;

  // Tabla
  const tbody = document.getElementById('tbodyVentasDiarias');
  const tfoot = document.getElementById('tfootVentasDiarias');
  if (!tbody) return;

  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted);font-weight:700;">Sin ventas registradas para este mes</td></tr>`;
    if (tfoot) tfoot.innerHTML = '';
    return;
  }

  // Ordenar desc para mostrar más reciente primero
  const listaMostrar = [...lista].sort((a, b) => b.fecha.localeCompare(a.fecha));
  tbody.innerHTML = listaMostrar.map(v => {
    const d = new Date(v.fecha + 'T12:00:00');
    const diaNom = DIAS_ES[d.getDay()];
    const esHoyFlag = v.fecha === _fechaLocalISO();
    return `<tr${esHoyFlag ? ' style="background:#f0fdf4;"' : ''}>
      <td><span class="mono" style="font-size:13px;">${formatFechaVD(v.fecha)}</span></td>
      <td><span class="badge badge-green">${diaNom}</span></td>
      <td><span class="mono td-green" style="font-size:15px;">$${Number(v.monto).toFixed(2)}</span></td>
      <td style="color:var(--text-muted);font-size:12px;">${v.nota || '—'}</td>
      <td style="text-align:right;">
        <button class="btn btn-danger" style="padding:5px 9px;font-size:11px;" onclick="eliminarVentaDiaria('${v.fecha}')">✕</button>
      </td>
    </tr>`;
  }).join('');

  if (tfoot) tfoot.innerHTML = `
    <tr style="background:var(--green-light);">
      <td colspan="2" style="font-weight:900;color:var(--green-dark);padding:11px 12px;font-size:13px;">TOTAL DEL MES</td>
      <td class="mono td-green" style="font-size:16px;font-weight:900;padding:11px 12px;">$${total.toFixed(2)}</td>
      <td colspan="2" style="color:var(--text-muted);font-size:12px;padding:11px 12px;">${dias} días · prom $${promedio.toFixed(2)}/día</td>
    </tr>
  `;
}

function exportarVentasDiariasCSV() {
  const sel  = document.getElementById('vdFiltroMes');
  const mes  = sel ? sel.value : new Date().toISOString().substring(0, 7);
  const lista = (ventasDiarias || []).filter(v => v.fecha && v.fecha.startsWith(mes));
  if (!lista.length) { toast('No hay ventas para exportar', true); return; }
  const rows = ['Fecha,Monto,Nota', ...lista.map(v => `${formatFechaVD(v.fecha)},${Number(v.monto).toFixed(2)},"${(v.nota||'').replace(/"/g,'""')}"`)];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const a    = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Ventas_${mes}.csv`;
  a.click(); URL.revokeObjectURL(a.href);
  toast('✓ CSV exportado');
}



function actualizarTodo() {
  actualizarStats(); // siempre (navbar)
  renderCajaPanel(); // siempre (Dashboard)
  const pg = document.querySelector('.page.active');
  const pgId = pg ? pg.id : '';
  // Solo renderizar la página visible
  if (pgId === 'pgDash')         { if (typeof renderDashboardPro === 'function') renderDashboardPro(); }
  if (pgId === 'pgInventario')   { renderInv(); actualizarCats(); }
  if (pgId === 'pgInvProductos') { renderInv(); actualizarCats(); }
  if (pgId === 'pgInvAnalisis')  { if (typeof renderInvAnalisis==='function') renderInvAnalisis(); }
  if (pgId === 'pgInvCapital')   { if (typeof actualizarInventarioInicialAuto==='function') actualizarInventarioInicialAuto(); if (typeof renderInvTotales==='function') renderInvTotales(); if (typeof piCargarYRender==='function') piCargarYRender(); }
  if (pgId === 'pgReportes')     { renderVentas(); renderHistorial(); renderCritico(); renderPagos(); renderBalance(); if (typeof actualizarCats==='function') actualizarCats(); }
  if (pgId === 'pgDestacados')   { renderDestacados(); }
  if (pgId === 'pgVentasDiarias'){ renderVentasDiarias(); }
}

// Render completo para cuando se navega a una página
function renderPagina(pgId) {
  if (pgId === 'pgDash')          { renderCajaPanelMini(); if (typeof renderDashboardPro === 'function') setTimeout(renderDashboardPro, 50); }
  if (pgId === 'pgInventario')    { renderInv(); actualizarCats(); poblarInvAnCat(); if (!document.getElementById('invAnDesde')?.value && !document.getElementById('invAnHasta')?.value) { invAnSetRango(30); } else { renderInvAnalisis(); } }
  if (pgId === 'pgReportes')      { renderVentas(); if (!document.getElementById('histDesde')?.value && !document.getElementById('histHasta')?.value) { histFiltroPreset('hoy'); } else { renderHistorial(); } renderCritico(); renderPagos(); renderBalance(); if (typeof actualizarCats==='function') actualizarCats(); }
  if (pgId === 'pgDestacados')    { renderDestacados(); }
  if (pgId === 'pgVentasDiarias') { renderVentasDiarias(); }
  if (pgId === 'pgAdmin' && typeof renderAdminPanel === 'function') renderAdminPanel();
  if (pgId === 'pgFinanzasMes' && typeof renderFinanzasMes === 'function') renderFinanzasMes(pgId);
  if (pgId === 'pgCierreDia' && typeof renderCierreDia === 'function') renderCierreDia(pgId);
  // Sub-páginas inventario
  if (pgId === 'pgInvCapital') { if (typeof actualizarInventarioInicialAuto==='function') actualizarInventarioInicialAuto(); if (typeof renderInvTotales==='function') renderInvTotales(); if (typeof piCargarYRender==='function') piCargarYRender(); }
  if (pgId === 'pgInvAnalisis') { if (typeof poblarInvAnCat==='function') poblarInvAnCat(); if (typeof renderInvAnalisis==='function') renderInvAnalisis(); }
  if (pgId === 'pgInvProductos') { if (typeof renderInv==='function') renderInv(); if (typeof actualizarCats==='function') actualizarCats(); }
  if (pgId === 'pgInvRegistrar') {
    if (typeof actualizarCats==='function') actualizarCats();
    // Si no hay presentaciones, agregar fila Unidad por defecto
    if (_regPres.length === 0) {
      _regPres = [{ id: Date.now(), label: 'Unidad', uds: 1, cant: 0, costo: 0, venta: 0 }];
    }
    // Siempre re-renderizar al abrir para asegurar que el contenedor está listo
    setTimeout(() => _regPresRender(), 0);
  }
}

// ===== 26. INIT (async) =====

(async function init() {
  try {
    setLoadingMsg('Iniciando almacenamiento local…');
    // Reintentar hasta 4 veces — maneja recargas rápidas y pestañas duplicadas
    let idbOk = false;
    for (let t = 0; t < 4; t++) {
      try {
        _db = null; // forzar nueva apertura
        await getDB();
        idbOk = true;
        break;
      } catch (idbErr) {
        console.warn('[Init] IDB intento', t + 1, '/', 4, idbErr.message);
        if (t < 3) {
          setLoadingMsg('Iniciando almacenamiento… (' + (t + 2) + '/4)');
          await new Promise(r => setTimeout(r, 800));
        }
      }
    }
    if (!idbOk) throw new Error('IDB no disponible tras 4 intentos');
    setIDBStatus(true);

    setLoadingMsg('Cargando caché local…');
    await migrateAndLoad();

    setLoadingBadge('Listo ✓');
    setLoadingMsg('Conectando a Supabase…');

    initKeypad();

    const inpEf = document.getElementById('inpEfectivoInicial');
    if (inpEf) inpEf.value = efectivoInicial > 0 ? efectivoInicial : '';
    const inpInv = document.getElementById('inpInventarioInicial');
    if (inpInv) inpInv.value = inventarioInicial > 0 ? inventarioInicial : '';

    const validas = ['pgDash','pgInventario','pgReportes','pgDestacados','pgVentasDiarias','pgSync','pgFinanzasMes','pgCierreDia'];
    navTo(validas.includes(_paginaActual) ? _paginaActual : 'pgDash');
    // Establecer estado inicial en el historial del navegador
    try { history.replaceState({ pgId: _paginaActual }, '', '#' + _paginaActual); } catch(e) {}

    renderCarrito();
    actualizarStats();        // siempre (navbar)
    renderPagina(_paginaActual); // solo la página activa
    actualizarSubtituloBackup();

    window.addEventListener('beforeunload', () => salvarSesion());
    setInterval(() => salvarSesion(), 30000);
    window.addEventListener('pageshow', (e) => { if (e.persisted) softReload(); });

    ocultarOverlay();
    actualizarBadgeSheets(); // Google Sheets badge
    await iniciarAutoSync();  // Restaurar sesion y rol antes de continuar

    // Cargar alarmas PDF e iniciar monitor
    await cargarAlarmasPDF();
    actualizarResumenAlarmas();
    poblarCategoriasSelectorAlarma();
    iniciarMonitorAlarmas();

  } catch (err) {
    console.error('[IDB] Error fatal en init:', err);
    setIDBStatus(false);
    setLoadingMsg('Error al iniciar la base de datos');
    setLoadingBadge('⚠ IDB no disponible');
    document.getElementById('loadingBadge').style.background = 'rgba(220,38,38,0.12)';
    document.getElementById('loadingBadge').style.color = '#dc2626';
    document.getElementById('loadingBadge').style.borderColor = 'rgba(220,38,38,0.3)';
    // Mostrar botón de reintento
    const overlay = document.getElementById('appLoadingOverlay');
    const btn = document.createElement('button');
    btn.textContent = '🔄 Reintentar'; btn.style.cssText = 'margin-top:8px;padding:12px 24px;background:var(--green);color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;';
    btn.onclick = () => location.reload();
    overlay.appendChild(btn);
  }
// ===== MENÚ DESPLEGABLE INVENTARIO =====

function toggleInvDropdown(contentId, btnId) {
  const content = document.getElementById(contentId);
  const btn = document.getElementById(btnId);
  if (!content || !btn) return;
  const isOpen = content.classList.contains('open');
  // Cerrar todos primero
  document.querySelectorAll('.inv-dropdown-content').forEach(el => el.classList.remove('open'));
  document.querySelectorAll('.inv-dropdown-btn').forEach(el => el.classList.remove('open'));
  // Abrir el que se presionó (si estaba cerrado)
  if (!isOpen) {
    content.classList.add('open');
    btn.classList.add('open');
  }
}
// Exponer al scope global para que los onclick del HTML puedan llamarla
window.toggleInvDropdown = toggleInvDropdown;

// =====================================================================
//  📋 PEDIDOS ONLINE — Panel en el POS
// =====================================================================
let _ordersPolling = null;

async function _checkPedidosNuevos() {
  try {
    const nuevo = await idbGet('vpos_pedidosNuevo');
    const fab   = document.getElementById('ordersFab');
    if (!fab) return;
    if (nuevo) {
      fab.style.display = 'flex';
    }
    // Count pending
    const pedidos = (await idbGet('vpos_pedidosOnline')) || [];
    const pendientes = pedidos.filter(p => p.estado === 'nuevo').length;
    if (pendientes > 0) {
      fab.style.display = 'flex';
      fab.innerHTML = `<span class="fab-dot"></span> 📋 ${pendientes} Pedido${pendientes !== 1 ? 's' : ''} Nuevo${pendientes !== 1 ? 's' : ''}`;
    } else {
      fab.style.display = 'none';
    }
  } catch(e) {}
}

function abrirPedidosAdmin() {
  document.getElementById('ordersBg').classList.add('open');
  renderPedidosAdmin();
  // Mark as seen
  idbSet('vpos_pedidosNuevo', false).catch(() => {});
}
function cerrarPedidosAdmin() {
  document.getElementById('ordersBg').classList.remove('open');
}

async function renderPedidosAdmin() {
  const w = document.getElementById('ordersList');
  try {
    const pedidos = (await idbGet('vpos_pedidosOnline')) || [];
    if (!pedidos.length) {
      w.innerHTML = '<div style="padding:22px;text-align:center;color:var(--text-muted);font-size:13px;font-weight:700;">No hay pedidos online aún</div>';
      return;
    }
    w.innerHTML = pedidos.map((p, idx) => {
      const stLbl = { nuevo: '🕐 Nuevo', aceptado: '✅ Aceptado', rechazado: '❌ Rechazado' }[p.estado] || 'Nuevo';
      const items = (p.items || []).map(i => `${i.cant}× ${i.nom}`).join(', ');
      const acc = p.estado === 'nuevo' ? `<div class="op-actions">
        <button class="op-acc" onclick="responderPedidoPOS(${idx},'aceptado')">✅ Aceptar</button>
        <button class="op-rej" onclick="responderPedidoPOS(${idx},'rechazado')">❌ Rechazar</button>
      </div>` : '';
      return `<div class="op-card">
        <div class="op-head">
          <div class="op-num">${p.id}</div>
          <div class="op-st ${p.estado}">${stLbl}</div>
        </div>
        <div class="op-body">
          <b>${p.nombre}</b> · 📞 ${p.tel}<br>
          ${p.delivery === 'domicilio' ? `📍 ${p.dir || 'Sin dirección'}` : '🏪 Retiro en tienda'}<br>
          💳 ${p.pago} · 💰 $${p.total}<br>
          ${p.nota ? `📝 ${p.nota}<br>` : ''}📦 ${items}<br>
          🕐 ${p.fecha}
        </div>
        ${acc}
      </div>`;
    }).join('');
  } catch(e) {
    w.innerHTML = '<div style="padding:22px;text-align:center;color:var(--text-muted);">Error al cargar pedidos</div>';
  }
}

async function responderPedidoPOS(idx, decision) {
  try {
    const pedidos = (await idbGet('vpos_pedidosOnline')) || [];
    const pedido  = pedidos[idx];
    if (!pedido) return;
    pedido.estado = decision;

    if (decision === 'aceptado') {
      // Discount inventory and register sale
      const vd = (await idbGet('vpos_ventasDia')) || {};
      const vs = (await idbGet('vpos_ventasSem')) || {};
      const vm = (await idbGet('vpos_ventasMes')) || {};

      (pedido.items || []).forEach(item => {
        const p   = productos.find(x => x.id === item.id);
        const pid = String(item.id);
        if (p && (p.stock || 0) >= item.cant) { p.stock -= item.cant; actualizarStockFila(p); }
        [vd, vs, vm].forEach(r => {
          if (!r[pid]) r[pid] = { id: pid, nom: item.nom, cat: item.cat || '', cant: 0, total: 0 };
          r[pid].cant  += item.cant;
          r[pid].total += item.precio * item.cant;
        });
      });

      const venta = {
        id: pedido.id, ts: Date.now(), fechaISO: new Date().toISOString(),
        fechaStr: pedido.fecha, origen: 'tienda_online',
        // Full customer data preserved in the sale record
        cliente:   pedido.nombre,
        telefono:  pedido.tel   || '',
        direccion: pedido.dir   || (pedido.delivery==='retiro' ? 'Retiro en tienda' : ''),
        delivery:  pedido.delivery || 'domicilio',
        nota:      pedido.nota  || '',
        pago: pedido.pago, envio: pedido.envio,
        items: (pedido.items || []).map(i => ({ id: String(i.id), nom: i.nom, cant: i.cant, precio: i.precio, cat: i.cat })),
        total: pedido.total, pago_monto: pedido.total, vuelto: '0.00'
      };
      historial.unshift(venta);

      await idbSet('vpos_ventasDia', vd);
      await idbSet('vpos_ventasSem', vs);
      await idbSet('vpos_ventasMes', vm);
      salvar();
      toast('✅ Pedido aceptado — inventario actualizado');
    } else {
      toast('❌ Pedido rechazado');
    }

    await idbSet('vpos_pedidosOnline', pedidos);
    renderPedidosAdmin();
    _checkPedidosNuevos();
  } catch(e) { toast('Error: ' + e.message, true); }
}

// Start polling when app loads
setTimeout(() => {
  _checkPedidosNuevos();
  _ordersPolling = setInterval(_checkPedidosNuevos, 20000); // check every 20s
}, 2000);

window.abrirPedidosAdmin  = abrirPedidosAdmin;
window.cerrarPedidosAdmin = cerrarPedidosAdmin;
window.responderPedidoPOS = responderPedidoPOS;

})();
// ===== REPORTE + PEDIDO INTERACTIVO =====

// Datos globales del módulo de pedido
const _rpPedido = {}; // { prodId: { pres: 'unidad'|pkgIdx, cant: Number } }

// Almacena snapshot del reporte S1 para PDF
let _rpS1Snapshot = { rangoStr: '', catLabel: '', invInicialVenta: 0, invInicialCosto: 0, filas: [] };

function abrirReportePedido() {
  _rp_render();
  abrirModal('modalReportePedido');
}

// Se llama cuando el usuario cambia la categoría DENTRO del modal —
// vuelve a calcular todo en vivo sin cerrar el modal.
function rp_cambiarCategoria() {
  _rp_render();
}

function _rp_poblarCatFiltro(valorPrevio) {
  const sel = document.getElementById('rp_catFiltro'); if (!sel) return 'todas';
  const cats = [...new Set(productos.map(p => p.cat).filter(Boolean))].sort();
  sel.innerHTML = '<option value="todas">📦 Todas las categorías</option>';
  cats.forEach(c => sel.innerHTML += `<option value="${c}">${c}</option>`);
  const preferido = valorPrevio || document.getElementById('pdfCategoria')?.value || 'todas';
  sel.value = cats.includes(preferido) ? preferido : 'todas';
  return sel.value;
}

function _rp_render() {
  const desdeVal  = document.getElementById('pdfFechaDesde').value;
  const hastaVal  = document.getElementById('pdfFechaHasta').value;
  if (!desdeVal || !hastaVal) { toast('Selecciona fecha de inicio y fin', true); return; }
  const desde = new Date(desdeVal + 'T00:00:00');
  const hasta  = new Date(hastaVal + 'T23:59:59');
  if (desde > hasta) { toast('La fecha inicio debe ser antes que la final', true); return; }

  // Poblar/conservar el filtro de categoría propio del modal
  const catFiltro = _rp_poblarCatFiltro(document.getElementById('rp_catFiltro')?.value);

  const rangoStr = `${desde.toLocaleDateString('es-SV')} al ${hasta.toLocaleDateString('es-SV')}`;
  const catLabel = catFiltro === 'todas' ? 'Todas las categorías' : catFiltro;
  const sub = document.getElementById('rp_subtitulo');
  if (sub) sub.textContent = `${rangoStr} · ${catLabel}`;

  // Calcular ventas del período — usando misma lógica que totalReporte()
  const acum = {};
  historial.forEach(v => {
    const ts = v.ts || (v.fechaISO ? Date.parse(v.fechaISO) : 0);
    if (!ts || new Date(ts) < desde || new Date(ts) > hasta) return;
    (v.items || []).forEach(item => {
      const key = item.id ? String(item.id) : ('legacy:' + item.nom);
      const prod = item.id ? productos.find(p => String(p.id) === String(item.id)) : null;
      const cat  = (prod && prod.cat) ? prod.cat : (item.cat || 'SIN CATEGORÍA');
      if (!acum[key]) acum[key] = { id: item.id||null, nom: item.nom||'—', cat, cant: 0, totalVenta: 0, totalCosto: 0 };
      const cant = Number(item.cant || 0);
      acum[key].cant += cant;
      // Total venta exacto (misma lógica que totalReporte)
      let totVenta;
      if (item.totalItem !== undefined) {
        totVenta = Number(item.totalItem);
      } else if (item.cantCobrada !== undefined) {
        totVenta = Number(item.cantCobrada) * Number(item.precio || 0);
      } else if (item.esPromo || item.paqueteLabel) {
        totVenta = Number(item.precio || 0);
      } else {
        totVenta = cant * Number(item.precio || 0);
      }
      acum[key].totalVenta += totVenta;
      // Total costo: cant × costoUd (o compra como fallback)
      const costoUd = Number(item.costoUd || item.compra || 0);
      acum[key].totalCosto += cant * costoUd;
    });
  });

  // Lista filtrada — SOLO productos con ventas en el período
  let listaConVentas = (productos || []).filter(p => {
    if (catFiltro !== 'todas' && (p.cat || 'SIN CATEGORÍA') !== catFiltro) return false;
    return acum[String(p.id)] && acum[String(p.id)].cant > 0;
  });
  listaConVentas = listaConVentas.slice().sort((a,b) => (a.cat||'').localeCompare(b.cat||'') || (a.nom||'').localeCompare(b.nom||''));

  // Sección 2 (Pedido) ahora muestra EXACTAMENTE los mismos productos que
  // la Sección 1: solo los que tuvieron ventas en el período y categoría elegidos.
  let listaTodos = listaConVentas;

  // Inventario inicial guardado (snapshot de cuando se presionó Recalcular)
  const invInicialVenta = typeof inventarioInicial !== 'undefined' ? (inventarioInicial || 0) : 0;
  const invInicialCosto = typeof inventarioCosto   !== 'undefined' ? (inventarioCosto   || 0) : 0;

  // ---- SECCIÓN 1 — Solo productos con ventas ----
  const tbody1 = document.getElementById('rp_s1_tbody');
  const snapFilas = [];
  if (tbody1) {
    let rows = '';
    let totalCostoS1 = 0, totalVentaS1 = 0;
    let lastCat = null;

    if (!listaConVentas.length) {
      rows = `<tr><td colspan="6" style="text-align:center;padding:20px;color:#6b7280;font-weight:700;">Sin ventas registradas en este período para los filtros seleccionados.</td></tr>`;
    } else {
      listaConVentas.forEach(p => {
        const cat = p.cat || 'SIN CATEGORÍA';
        if (cat !== lastCat) {
          rows += `<tr><td colspan="6" style="background:#dcfce7;color:#166534;font-size:11px;font-weight:900;padding:6px 10px;border-bottom:1px solid #86efac;">📦 ${cat}</td></tr>`;
          lastCat = cat;
        }
        const key = String(p.id);
        const vendido    = acum[key] ? acum[key].cant : 0;
        const costoUd    = _compraUdReal(p);
        const ventaUd    = p.venta || 0;
        // Usar totales acumulados del historial (incluye paquetes correctamente)
        const costoTotal = acum[key] ? acum[key].totalCosto : 0;
        const ventaTotal = acum[key] ? acum[key].totalVenta : 0;
        const gananciaFila = ventaTotal - costoTotal;
        totalCostoS1 += costoTotal;
        totalVentaS1 += ventaTotal;
        const stockBajo = (p.stock || 0) <= (p.min || 0);
        rows += `<tr style="border-bottom:1px solid #f0fdf4;${stockBajo?'background:#fef2f2;':''}">
          <td style="padding:7px 10px;font-weight:700;color:#1e293b;">${p.nom || '—'}<br><span style="font-size:10px;color:#6b7280;">${cat}</span></td>
          <td style="padding:7px 10px;text-align:center;font-weight:900;color:${stockBajo?'#dc2626':'#16a34a'};">${p.stock || 0}</td>
          <td style="padding:7px 10px;text-align:center;font-weight:700;color:#1d4ed8;">${vendido}</td>
          <td style="padding:7px 10px;text-align:right;font-weight:700;color:#7c3aed;">$${costoTotal.toFixed(2)}</td>
          <td style="padding:7px 10px;text-align:right;font-weight:700;color:#16a34a;">$${ventaTotal.toFixed(2)}</td>
          <td style="padding:7px 10px;text-align:right;font-weight:900;color:#15803d;">$${gananciaFila.toFixed(2)}</td>
        </tr>`;
        snapFilas.push({ id: String(p.id), nom: p.nom||'—', cat, stock: p.stock||0, vendido, costoTotal, ventaTotal, gananciaFila, costoUd, ventaUd });
      });
      const gananciaTotalS1 = totalVentaS1 - totalCostoS1;
      rows += `<tr style="background:#f0fdf4;border-top:2px solid #16a34a;">
        <td colspan="3" style="padding:9px 10px;font-weight:900;font-size:13px;color:#065f46;">TOTAL GENERAL</td>
        <td style="padding:9px 10px;text-align:right;font-weight:900;font-size:14px;color:#7c3aed;">$${totalCostoS1.toFixed(2)}</td>
        <td style="padding:9px 10px;text-align:right;font-weight:900;font-size:14px;color:#16a34a;">$${totalVentaS1.toFixed(2)}</td>
        <td style="padding:9px 10px;text-align:right;font-weight:900;font-size:14px;color:#15803d;">$${gananciaTotalS1.toFixed(2)}</td>
      </tr>`;
    }
    tbody1.innerHTML = rows;
    const elCosto = document.getElementById('rp_s1_totalCosto');
    const elVenta = document.getElementById('rp_s1_totalVenta');
    if (elCosto) elCosto.textContent = '$' + totalCostoS1.toFixed(2);
    if (elVenta) elVenta.textContent = '$' + totalVentaS1.toFixed(2);

    // "Disponible para recomprar" = costo recuperado de lo VENDIDO (no el
    // valor de todo el inventario) — es el dinero real que ya recuperaste
    // de esta venta y puedes usar para volver a comprar el mismo producto.
    const gananciaS1 = totalVentaS1 - totalCostoS1;
    const elDineroDisp = document.getElementById('rp_s1_dineroDisponible');
    if (elDineroDisp) elDineroDisp.textContent = '$' + totalCostoS1.toFixed(2);
    const elGanancia = document.getElementById('rp_s1_ganancia');
    if (elGanancia) elGanancia.textContent = '$' + gananciaS1.toFixed(2);
    const elFormula = document.getElementById('rp_s1_formula');
    if (elFormula) elFormula.textContent =
      `Costo recuperado $${totalCostoS1.toFixed(2)} + Ganancia $${gananciaS1.toFixed(2)} = Total Venta $${totalVentaS1.toFixed(2)}`;

    // Guardar snapshot para PDF
    _rpS1Snapshot = { rangoStr, catLabel, invInicialVenta, invInicialCosto, filas: snapFilas,
      totalCosto: totalCostoS1, totalVenta: totalVentaS1, ganancia: gananciaS1 };
  }

  // ---- SECCIÓN 2 — Todos los productos del filtro ----
  const tbody2 = document.getElementById('rp_s2_tbody');
  if (tbody2) {
    let rows = '';
    let lastCat2 = null;
    listaTodos.forEach(p => {
      const cat = p.cat || 'SIN CATEGORÍA';
      if (cat !== lastCat2) {
        rows += `<tr><td colspan="4" style="background:#dbeafe;color:#1e3a8a;font-size:11px;font-weight:900;padding:6px 10px;border-bottom:1px solid #93c5fd;">📦 ${cat}</td></tr>`;
        lastCat2 = cat;
      }
      const pid = String(p.id);
      const costoUd = _compraUdReal(p);
      const pkgs = (p.paquetes || []).filter(pk => Number(pk.cant) > 1).slice().sort((a,b) => b.cant - a.cant);
      // Selector muestra precio COSTO
      let presOptions = `<option value="unidad">Unidad — costo: $${costoUd.toFixed(2)}</option>`;
      pkgs.forEach((pk, idx) => {
        const label = pk.label || ('Paquete ' + pk.cant + ' uds');
        const udsXPk = Number(pk.cant) || 1;
        const costoPk = pk.precioCompra > 0 ? pk.precioCompra * udsXPk : costoUd * udsXPk;
        presOptions += `<option value="pkg_${idx}">${label} — costo: $${costoPk.toFixed(2)}</option>`;
      });
      rows += `<tr style="border-bottom:1px solid #eff6ff;" id="rp_row_${pid}">
        <td style="padding:7px 10px;font-weight:700;color:#1e293b;vertical-align:middle;">${p.nom || '—'}<br><span style="font-size:10px;color:#6b7280;">${cat}</span></td>
        <td style="padding:7px 8px;vertical-align:middle;">
          <div style="display:flex;flex-direction:column;gap:5px;">
            <select id="rp_pres_${pid}" onchange="rp_calcRow('${pid}')" style="font-size:12px;padding:4px 6px;border:1.5px solid #93c5fd;border-radius:7px;background:#f0f9ff;font-weight:700;">${presOptions}</select>
            <input type="number" id="rp_cant_${pid}" min="0" step="1" placeholder="Cantidad" value="" oninput="rp_calcRow('${pid}')" style="font-size:13px;padding:5px 8px;border:1.5px solid #93c5fd;border-radius:7px;width:100%;font-weight:900;text-align:center;background:#fff;">
          </div>
        </td>
        <td style="padding:7px 10px;text-align:right;font-weight:900;color:#7c3aed;vertical-align:middle;" id="rp_costo_${pid}">—</td>
        <td style="padding:7px 10px;text-align:right;font-weight:900;color:#2563eb;vertical-align:middle;" id="rp_venta_${pid}">—</td>
      </tr>`;
    });
    tbody2.innerHTML = rows;
  }

  rp_recalcTotalesS2();
}

function rp_calcRow(pid) {
  const presEl = document.getElementById('rp_pres_' + pid);
  const cantEl = document.getElementById('rp_cant_' + pid);
  const costoEl = document.getElementById('rp_costo_' + pid);
  const ventaEl = document.getElementById('rp_venta_' + pid);
  if (!presEl || !cantEl) return;

  const cant = parseFloat(cantEl.value) || 0;
  const presVal = presEl.value;
  const p = productos.find(pr => String(pr.id) === pid);
  if (!p) return;

  let costoUnit = 0, ventaUnit = 0;

  if (presVal === 'unidad') {
    costoUnit = _compraUdReal(p);
    ventaUnit = p.venta || 0;
  } else if (presVal.startsWith('pkg_')) {
    const pkgIdx = parseInt(presVal.replace('pkg_', ''), 10);
    const pkgs = (p.paquetes || []).filter(pk => Number(pk.cant) > 1).slice().sort((a,b) => b.cant - a.cant);
    const pk = pkgs[pkgIdx];
    if (pk) {
      const udsXPk = Number(pk.cant) || 1;
      costoUnit = pk.precioCompra > 0 ? pk.precioCompra * udsXPk : _compraUdReal(p) * udsXPk;
      ventaUnit = pk.precio || 0;
    }
  }

  const totalCosto = costoUnit * cant;
  const totalVenta = ventaUnit * cant;

  if (costoEl) costoEl.textContent = cant > 0 ? '$' + totalCosto.toFixed(2) : '—';
  if (ventaEl) ventaEl.textContent = cant > 0 ? '$' + totalVenta.toFixed(2) : '—';

  // Guardar en _rpPedido
  if (cant > 0) {
    _rpPedido[pid] = { cant, presVal, costoUnit, ventaUnit, totalCosto, totalVenta };
  } else {
    delete _rpPedido[pid];
  }

  rp_recalcTotalesS2();
}

function rp_recalcTotalesS2() {
  let totalC = 0, totalV = 0;
  Object.values(_rpPedido).forEach(r => { totalC += r.totalCosto; totalV += r.totalVenta; });
  const elC = document.getElementById('rp_s2_totalCosto');
  const elV = document.getElementById('rp_s2_totalVenta');
  if (elC) elC.textContent = '$' + totalC.toFixed(2);
  if (elV) elV.textContent = '$' + totalV.toFixed(2);
}

function rp_limpiarPedido() {
  if (!confirm('¿Limpiar todas las cantidades del pedido?')) return;
  Object.keys(_rpPedido).forEach(k => delete _rpPedido[k]);
  // Reset inputs
  document.querySelectorAll('[id^="rp_cant_"]').forEach(el => { el.value = ''; });
  document.querySelectorAll('[id^="rp_costo_"], [id^="rp_venta_"]').forEach(el => { el.textContent = '—'; });
  rp_recalcTotalesS2();
  toast('✓ Pedido limpiado');
}

// Llena automáticamente las cantidades del pedido con exactamente lo que
// se vendió en la Sección 1 (mismo período de fechas y categoría elegidos),
// para reponer solo lo que realmente salió del inventario.
function rp_reponerVentas() {
  const snap = _rpS1Snapshot;
  if (!snap || !snap.filas || !snap.filas.length) {
    toast('Primero elige fechas/categoría en la Sección 1', true);
    return;
  }
  let count = 0;
  snap.filas.forEach(f => {
    if (f.vendido > 0) {
      const cantEl = document.getElementById('rp_cant_' + f.id);
      if (cantEl) {
        cantEl.value = f.vendido;
        rp_calcRow(String(f.id));
        count++;
      }
    }
  });
  toast(count > 0 ? `✓ Repuestas las cantidades vendidas de ${count} producto${count!==1?'s':''}` : 'No hay ventas en este período para reponer');
}

function rp_descargarImagenesPedido() {
  // Recoger solo filas con nombre + cantidad completados
  const filas = [];
  document.querySelectorAll('[id^="rp_cant_"]').forEach(el => {
    const pid = el.id.replace('rp_cant_', '');
    const cant = parseFloat(el.value) || 0;
    if (cant <= 0) return;
    const p = productos.find(pr => String(pr.id) === pid);
    if (!p) return;
    filas.push({ nom: p.nom || '—', cant });
  });

  if (!filas.length) { toast('Ingresa cantidades en el pedido primero', true); return; }

  const POR_IMG = 30;
  // Solo generar imágenes para bloques que tengan datos reales
  const bloques = [];
  for (let i = 0; i < filas.length; i += POR_IMG) {
    const bloque = filas.slice(i, i + POR_IMG);
    if (bloque.length > 0) bloques.push(bloque);
  }
  const totalImgs = bloques.length;

  let totalCostoPedido = 0, totalVentaPedido = 0;
  Object.values(_rpPedido).forEach(r => { totalCostoPedido += r.totalCosto; totalVentaPedido += r.totalVenta; });
  const gananciaPedido = totalVentaPedido - totalCostoPedido;

  toast(`⏳ Generando ${totalImgs*2} imágenes (${totalImgs} con datos + ${totalImgs} para proveedor)...`);

  bloques.forEach((bloque, idx) => {
    // Versión CON datos (costo/venta/ganancia) — para ti
    _rpGenerarImagen(bloque, idx + 1, totalImgs, totalCostoPedido, totalVentaPedido, gananciaPedido, true);
    // Versión SIN datos financieros — para enviar al proveedor
    _rpGenerarImagen(bloque, idx + 1, totalImgs, totalCostoPedido, totalVentaPedido, gananciaPedido, false);
  });
}

function _rpGenerarImagen(filas, numImg, totalImgs, totalCostoPedido, totalVentaPedido, gananciaPedido, conDatos) {
  const SCALE    = 4; // resolución alta (equivalente a ~4K) para que se vea nítida al imprimir o hacer zoom
  // Mismas dimensiones que sección 1 (350 + 5×130 = 1000 unidades base)
  const COL_NOM  = 700;   // columna producto más ancha para llenar el espacio
  const COL_CANT = 300;   // columna cantidad
  const ANCHO    = (COL_NOM + COL_CANT) * SCALE;  // = 2000px como S1
  const H_BAND   = 64  * SCALE;
  const H_SUB    = 28  * SCALE;
  const H_RESUMEN = 62 * SCALE;   // banda de totales (solo versión "con datos")
  const H_GANANCIA = 34 * SCALE;  // fórmula de ganancia (solo versión "con datos")
  const H_HEAD   = 38  * SCALE;
  const H_FILA   = 40  * SCALE;
  const H_FOOT   = 38  * SCALE;
  const POR_IMG  = 30;
  const ALTO = H_BAND + H_SUB + H_HEAD + H_FILA * POR_IMG + H_FOOT + (conDatos ? (H_RESUMEN + H_GANANCIA) : 0);

  const canvas = document.createElement('canvas');
  canvas.width = ANCHO; canvas.height = ALTO;
  const ctx = canvas.getContext('2d');

  // Fondo
  ctx.fillStyle = '#f8fafb'; ctx.fillRect(0, 0, ANCHO, ALTO);

  // Banda verde
  const grad = ctx.createLinearGradient(0, 0, ANCHO, 0);
  grad.addColorStop(0, '#064e3b'); grad.addColorStop(0.5, '#065f46'); grad.addColorStop(1, '#047857');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, ANCHO, H_BAND);

  // Círculo decorativo
  ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = '#6ee7b7';
  ctx.beginPath(); ctx.arc(ANCHO - 55*SCALE, H_BAND/2, 44*SCALE, 0, Math.PI*2); ctx.fill(); ctx.restore();

  // Título
  ctx.fillStyle = '#ffffff'; ctx.font = `bold ${20*SCALE}px Arial`; ctx.textAlign = 'left';
  ctx.fillText('🛒  PEDIDO DE COMPRA', 20*SCALE, 38*SCALE);
  if (!conDatos) {
    ctx.font = `bold ${11*SCALE}px Arial`; ctx.textAlign = 'right';
    ctx.fillStyle = '#d1fae5';
    ctx.fillText('PARA PROVEEDOR', ANCHO - 20*SCALE, 38*SCALE);
  }

  // Sub-banda
  ctx.fillStyle = '#022c22'; ctx.fillRect(0, H_BAND, ANCHO, H_SUB);
  const hoy = new Date().toLocaleDateString('es-SV', {day:'2-digit', month:'long', year:'numeric'});
  ctx.fillStyle = '#6ee7b7'; ctx.font = `${11*SCALE}px Arial`; ctx.textAlign = 'left';
  ctx.fillText(`Fecha: ${hoy}`, 20*SCALE, H_BAND + 19*SCALE);
  ctx.textAlign = 'right'; ctx.fillStyle = '#a7f3d0';
  ctx.fillText(`Imagen ${numImg} / ${totalImgs}`, ANCHO - 20*SCALE, H_BAND + 19*SCALE);

  // Cabecera columnas
  const yCH = H_BAND + H_SUB;
  ctx.fillStyle = '#059669'; ctx.fillRect(0, yCH, ANCHO, H_HEAD);
  ctx.fillStyle = '#10b981'; ctx.fillRect(0, yCH + H_HEAD - 3*SCALE, ANCHO, 3*SCALE);

  const xCant = COL_NOM * SCALE;
  ctx.fillStyle = '#ffffff'; ctx.font = `bold ${13*SCALE}px Arial`;
  ctx.textAlign = 'left'; ctx.fillText('PRODUCTO', 50*SCALE, yCH + 25*SCALE);
  ctx.textAlign = 'center'; ctx.fillText('CANTIDAD', xCant + COL_CANT*SCALE/2, yCH + 25*SCALE);

  ctx.strokeStyle = '#34d399'; ctx.lineWidth = 2*SCALE;
  ctx.beginPath(); ctx.moveTo(xCant, yCH); ctx.lineTo(xCant, yCH + H_HEAD); ctx.stroke();

  // Filas
  const yFilas = yCH + H_HEAD;
  for (let i = 0; i < POR_IMG; i++) {
    const y = yFilas + i * H_FILA;
    const fila = filas[i] || null;

    ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#f0fdf4';
    ctx.fillRect(0, y, ANCHO, H_FILA);

    ctx.strokeStyle = '#d1fae5'; ctx.lineWidth = 1*SCALE;
    ctx.beginPath(); ctx.moveTo(0, y + H_FILA); ctx.lineTo(ANCHO, y + H_FILA); ctx.stroke();

    ctx.strokeStyle = '#a7f3d0'; ctx.lineWidth = 1.5*SCALE;
    ctx.beginPath(); ctx.moveTo(xCant, y); ctx.lineTo(xCant, y + H_FILA); ctx.stroke();

    // Chip número
    const numL = i + 1 + (numImg - 1) * POR_IMG;
    ctx.fillStyle = fila ? '#059669' : '#d1fae5';
    ctx.beginPath(); ctx.roundRect(10*SCALE, y + 10*SCALE, 32*SCALE, 20*SCALE, 6*SCALE); ctx.fill();
    ctx.fillStyle = fila ? '#ffffff' : '#a7f3d0';
    ctx.font = `bold ${10*SCALE}px Arial`; ctx.textAlign = 'center';
    ctx.fillText(String(numL), 26*SCALE, y + 24*SCALE);

    if (fila) {
      // Nombre
      ctx.fillStyle = '#064e3b'; ctx.font = `bold ${13*SCALE}px Arial`; ctx.textAlign = 'left';
      let nom = fila.nom; const maxW = (COL_NOM - 50) * SCALE;
      while (ctx.measureText(nom).width > maxW && nom.length > 1) nom = nom.slice(0, -1);
      if (nom !== fila.nom) nom += '…';
      ctx.fillText(nom, 50*SCALE, y + H_FILA/2 + 5*SCALE);

      // Chip cantidad
      const cx = xCant + COL_CANT*SCALE/2;
      const rw = 80*SCALE, rh = H_FILA - 14*SCALE, rx = cx - rw/2, ry = y + 7*SCALE;
      const cg = ctx.createLinearGradient(rx, ry, rx + rw, ry + rh);
      cg.addColorStop(0, '#059669'); cg.addColorStop(1, '#047857');
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.roundRect(rx, ry, rw, rh, 10*SCALE); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.font = `bold ${16*SCALE}px Arial`; ctx.textAlign = 'center';
      ctx.fillText(String(fila.cant), cx, ry + rh/2 + 6*SCALE);
    }
  }

  // Footer
  const yFoot = yFilas + POR_IMG * H_FILA;
  const fg = ctx.createLinearGradient(0, yFoot, ANCHO, yFoot);
  fg.addColorStop(0, '#064e3b'); fg.addColorStop(1, '#047857');
  ctx.fillStyle = fg; ctx.fillRect(0, yFoot, ANCHO, H_FOOT);
  ctx.fillStyle = '#6ee7b7'; ctx.font = `${11*SCALE}px Arial`; ctx.textAlign = 'center';
  ctx.fillText(`Generado: ${new Date().toLocaleString('es-SV')}  ·  ${filas.length} producto${filas.length!==1?'s':''}  ·  Imagen ${numImg}/${totalImgs}`, ANCHO/2, yFoot + 24*SCALE);

  // ── Datos financieros (Total Costo/Venta Pedido + Ganancia) — SOLO en la versión "con datos" para ti ──
  if (conDatos) {
    const yRes = yFoot + H_FOOT;
    ctx.fillStyle = '#f0fdf4'; ctx.fillRect(0, yRes, ANCHO, H_RESUMEN);
    ctx.strokeStyle = '#a7f3d0'; ctx.lineWidth = 2*SCALE;
    ctx.beginPath(); ctx.moveTo(0, yRes); ctx.lineTo(ANCHO, yRes); ctx.stroke();

    const statChip = (label, val, cx, cy, colorTxt, border) => {
      const rw = 320*SCALE, rh = 46*SCALE, rx = cx - rw/2, ry = cy - rh/2;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = border; ctx.lineWidth = 1.5*SCALE;
      ctx.beginPath(); ctx.roundRect(rx, ry, rw, rh, 8*SCALE); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#6b7280'; ctx.font = `bold ${8*SCALE}px Arial`; ctx.textAlign = 'center';
      ctx.fillText(label, cx, ry + 15*SCALE);
      ctx.fillStyle = colorTxt; ctx.font = `bold ${15*SCALE}px Arial`;
      ctx.fillText(val, cx, ry + 35*SCALE);
    };
    const cy1 = yRes + H_RESUMEN/2;
    statChip('TOTAL COSTO PEDIDO', '$'+totalCostoPedido.toFixed(2), ANCHO*0.28, cy1, '#7c3aed', '#c4b5fd');
    statChip('TOTAL VENTA PEDIDO', '$'+totalVentaPedido.toFixed(2), ANCHO*0.72, cy1, '#16a34a', '#86efac');

    const yGan = yRes + H_RESUMEN;
    ctx.fillStyle = '#ecfdf5'; ctx.fillRect(0, yGan, ANCHO, H_GANANCIA);
    ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 1.5*SCALE;
    const fRx = 20*SCALE, fRy = yGan + 4*SCALE, fRw = ANCHO - 40*SCALE, fRh = H_GANANCIA - 8*SCALE;
    ctx.beginPath(); ctx.roundRect(fRx, fRy, fRw, fRh, 8*SCALE); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#065f46'; ctx.font = `bold ${12*SCALE}px Arial`; ctx.textAlign = 'center';
    ctx.fillText(`Ganancia = Venta $${totalVentaPedido.toFixed(2)} − Costo $${totalCostoPedido.toFixed(2)} = $${gananciaPedido.toFixed(2)}`, ANCHO/2, fRy + fRh/2 + 5*SCALE);
  }

  ctx.strokeStyle = '#059669'; ctx.lineWidth = 3*SCALE;
  ctx.strokeRect(1.5*SCALE, 1.5*SCALE, ANCHO - 3*SCALE, ALTO - 3*SCALE);

  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = conDatos ? `pedido_${numImg}_datos.png` : `pedido_${numImg}_proveedor.png`;
  link.click();
  toast(`✓ Imagen ${numImg}/${totalImgs} (${conDatos ? 'con datos' : 'proveedor'}) descargada`);
}


// PDF de la SECCIÓN 1 — usa el snapshot guardado al abrir el panel
function rp_descargarPDFS1() {
  const snap = _rpS1Snapshot;
  if (!snap || !snap.filas || !snap.filas.length) {
    toast('Abre el panel de reporte primero para generar las imágenes', true);
    return;
  }
  const stockSnap = window._stockInicialSnap || {};
  const filas = snap.filas.map(f => {
    const sp = stockSnap[String(f.id)] || null;
    return {
      nom:      f.nom,
      stockIni: sp ? sp.stock : null,
      stockAct: f.stock,
      // Siempre usar el "vendido" real (del historial de ventas, ya cuenta
      // bien los paquetes/cajas/presentaciones). NO restar stock actual al
      // inicial, porque si entró mercancía nueva durante el período eso
      // arruina el cálculo (el stock puede subir aunque sí se haya vendido).
      vendido:  f.vendido,
      costoUd:  f.costoUd || 0,
      ventaUd:  f.ventaUd || 0
    };
  });

  const POR_IMG = 30;
  // Solo imágenes con datos reales
  const bloques = [];
  for (let i = 0; i < filas.length; i += POR_IMG) {
    const b = filas.slice(i, i + POR_IMG);
    if (b.length > 0) bloques.push(b);
  }
  const totalImgs = bloques.length;
  if (!totalImgs) { toast('No hay datos para descargar', true); return; }
  toast(`⏳ Generando ${totalImgs} imagen${totalImgs > 1 ? 'es' : ''}...`);

  const SCALE   = 4; // resolución alta (equivalente a ~4K) para que se vea nítida al imprimir o hacer zoom
  // 6 columnas: Producto | Stock Ini | Stock Act | Vendido | P.Costo | P.Venta
  const COL_NOM = 350;
  const COL_W   = 130; // ancho igual para las 5 cols de datos
  const ANCHO   = (COL_NOM + COL_W * 5) * SCALE;
  const H_BAND  = 64  * SCALE;
  const H_SUB   = 28  * SCALE;
  const H_HEAD  = 38  * SCALE;
  const H_FILA  = 40  * SCALE;
  const H_FOOT  = 38  * SCALE;
  const H_RESUMEN = 92 * SCALE; // banda de totales + ganancia, AHORA hasta abajo, en TODAS las imágenes

  bloques.forEach((bloque, imgIdx) => {
    const ALTO = H_BAND + H_SUB + H_HEAD + H_FILA * POR_IMG + H_FOOT + H_RESUMEN;
    const canvas = document.createElement('canvas');
    canvas.width  = ANCHO;
    canvas.height = ALTO;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#f8fafb';
    ctx.fillRect(0, 0, ANCHO, ALTO);

    // Banda roja
    const grad = ctx.createLinearGradient(0, 0, ANCHO, 0);
    grad.addColorStop(0,'#7f1d1d'); grad.addColorStop(0.5,'#991b1b'); grad.addColorStop(1,'#b91c1c');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, ANCHO, H_BAND);

    ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = '#fca5a5';
    ctx.beginPath(); ctx.arc(ANCHO - 55*SCALE, H_BAND/2, 44*SCALE, 0, Math.PI*2); ctx.fill(); ctx.restore();

    ctx.fillStyle = '#fff'; ctx.font = `bold ${20*SCALE}px Arial`; ctx.textAlign = 'left';
    ctx.fillText('📋  VENTAS DEL PERÍODO', 20*SCALE, 38*SCALE);

    // Sub-banda
    ctx.fillStyle = '#450a0a'; ctx.fillRect(0, H_BAND, ANCHO, H_SUB);
    const hoy = new Date().toLocaleDateString('es-SV', {day:'2-digit',month:'long',year:'numeric'});
    ctx.fillStyle = '#fca5a5'; ctx.font = `${11*SCALE}px Arial`; ctx.textAlign = 'left';
    ctx.fillText(`📅 ${snap.rangoStr}  ·  ${snap.catLabel}  ·  ${hoy}`, 20*SCALE, H_BAND + 19*SCALE);
    ctx.textAlign = 'right'; ctx.fillStyle = '#fecaca';
    ctx.fillText(`Imagen ${imgIdx+1} / ${totalImgs}`, ANCHO - 20*SCALE, H_BAND + 19*SCALE);

    // Cabecera columnas
    const yCH = H_BAND + H_SUB;
    ctx.fillStyle = '#dc2626'; ctx.fillRect(0, yCH, ANCHO, H_HEAD);
    ctx.fillStyle = '#ef4444'; ctx.fillRect(0, yCH + H_HEAD - 3*SCALE, ANCHO, 3*SCALE);

    const xC = [
      COL_NOM * SCALE,                           // xINI
      (COL_NOM + COL_W) * SCALE,                 // xACT
      (COL_NOM + COL_W*2) * SCALE,               // xVEN
      (COL_NOM + COL_W*3) * SCALE,               // xCOSTO
      (COL_NOM + COL_W*4) * SCALE                // xVENTA
    ];

    ctx.fillStyle = '#fff'; ctx.font = `bold ${11*SCALE}px Arial`;
    ctx.textAlign = 'left';
    ctx.fillText('PRODUCTO', 50*SCALE, yCH + 25*SCALE);
    ctx.textAlign = 'center';
    const hdrs = ['STOCK INICIAL','STOCK ACTUAL','VENDIDO','P. COSTO','P. VENTA'];
    xC.forEach((x, i) => ctx.fillText(hdrs[i], x + COL_W*SCALE/2, yCH + 25*SCALE));

    xC.forEach(x => {
      ctx.strokeStyle = '#f87171'; ctx.lineWidth = 2*SCALE;
      ctx.beginPath(); ctx.moveTo(x, yCH); ctx.lineTo(x, yCH + H_HEAD); ctx.stroke();
    });

    // Filas
    const yFilas = yCH + H_HEAD;
    for (let i = 0; i < POR_IMG; i++) {
      const y = yFilas + i * H_FILA;
      const f = bloque[i] || null;

      ctx.fillStyle = i%2===0 ? '#fff' : '#fff5f5';
      ctx.fillRect(0, y, ANCHO, H_FILA);

      ctx.strokeStyle = '#fecaca'; ctx.lineWidth = 1*SCALE;
      ctx.beginPath(); ctx.moveTo(0, y+H_FILA); ctx.lineTo(ANCHO, y+H_FILA); ctx.stroke();

      xC.forEach(x => {
        ctx.strokeStyle = '#fee2e2'; ctx.lineWidth = 1*SCALE;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y+H_FILA); ctx.stroke();
      });

      // Chip número línea
      const numL = i + 1 + imgIdx * POR_IMG;
      ctx.fillStyle = f ? '#dc2626' : '#fecaca';
      ctx.beginPath(); ctx.roundRect(10*SCALE, y+10*SCALE, 32*SCALE, 20*SCALE, 6*SCALE); ctx.fill();
      ctx.fillStyle = f ? '#fff' : '#f87171'; ctx.font = `bold ${10*SCALE}px Arial`; ctx.textAlign = 'center';
      ctx.fillText(String(numL), 26*SCALE, y + 24*SCALE);

      if (f) {
        // Nombre
        ctx.fillStyle = '#1e293b'; ctx.font = `bold ${12*SCALE}px Arial`; ctx.textAlign = 'left';
        let nom = f.nom; const maxW = (COL_NOM - 48) * SCALE;
        while (ctx.measureText(nom).width > maxW && nom.length > 1) nom = nom.slice(0,-1);
        if (nom !== f.nom) nom += '…';
        ctx.fillText(nom, 50*SCALE, y + H_FILA/2 + 5*SCALE);

        const chip = (val, cx, color, bg, prefix) => {
          const str = val !== null && val !== undefined ? (prefix||'') + String(val) : '—';
          const rw = (COL_W - 14)*SCALE, rh = H_FILA - 14*SCALE;
          const rx = cx - rw/2, ry = y + 7*SCALE;
          ctx.fillStyle = bg;
          ctx.beginPath(); ctx.roundRect(rx, ry, rw, rh, 9*SCALE); ctx.fill();
          ctx.fillStyle = color;
          ctx.font = `bold ${13*SCALE}px Arial`; ctx.textAlign = 'center';
          ctx.fillText(str, cx, ry + rh/2 + 5*SCALE);
        };

        const cx = xC.map((x, i) => x + COL_W*SCALE/2);
        chip(f.stockIni, cx[0], '#7c3aed', '#f5f3ff');
        chip(f.stockAct, cx[1], '#15803d', '#f0fdf4');
        const cVen = f.vendido > 0 ? '#dc2626' : '#6b7280';
        chip(f.vendido,  cx[2], cVen, f.vendido > 0 ? '#fef2f2' : '#f9fafb');
        chip(f.costoUd.toFixed(2), cx[3], '#92400e', '#fffbeb', '$');
        chip(f.ventaUd.toFixed(2), cx[4], '#065f46', '#ecfdf5', '$');
      }
    }

    // Footer
    const yFoot = yFilas + POR_IMG * H_FILA;
    const fg = ctx.createLinearGradient(0, yFoot, ANCHO, yFoot);
    fg.addColorStop(0, '#7f1d1d'); fg.addColorStop(1, '#b91c1c');
    ctx.fillStyle = fg; ctx.fillRect(0, yFoot, ANCHO, H_FOOT);
    ctx.fillStyle = '#fca5a5'; ctx.font = `${11*SCALE}px Arial`; ctx.textAlign = 'center';
    ctx.fillText(`Generado: ${new Date().toLocaleString('es-SV')}  ·  ${bloque.length} producto${bloque.length!==1?'s':''}  ·  ${imgIdx+1}/${totalImgs}`, ANCHO/2, yFoot + 24*SCALE);

    // ── Banda de resumen (TOTALES GENERALES), hasta abajo, en TODAS las imágenes ──
    const yRes = yFoot + H_FOOT;
    ctx.fillStyle = '#fff5f5'; ctx.fillRect(0, yRes, ANCHO, H_RESUMEN);
    ctx.strokeStyle = '#fecaca'; ctx.lineWidth = 2*SCALE;
    ctx.beginPath(); ctx.moveTo(0, yRes); ctx.lineTo(ANCHO, yRes); ctx.stroke();

    const statChip = (label, val, cx, cy, colorTxt, bg, border) => {
      const rw = 220*SCALE, rh = 46*SCALE, rx = cx - rw/2, ry = cy - rh/2;
      ctx.fillStyle = bg; ctx.strokeStyle = border; ctx.lineWidth = 1.5*SCALE;
      ctx.beginPath(); ctx.roundRect(rx, ry, rw, rh, 8*SCALE); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#6b7280'; ctx.font = `bold ${8*SCALE}px Arial`; ctx.textAlign = 'center';
      ctx.fillText(label, cx, ry + 15*SCALE);
      ctx.fillStyle = colorTxt; ctx.font = `bold ${15*SCALE}px Arial`;
      ctx.fillText(val, cx, ry + 35*SCALE);
    };

    const cy1 = yRes + 30*SCALE;
    const xA = ANCHO * 0.145, xB = ANCHO * 0.395, xC2 = ANCHO * 0.645, xD = ANCHO * 0.895;
    statChip('TOTAL COSTO (VENDIDO)', '$'+snap.totalCosto.toFixed(2), xA, cy1, '#7c3aed', '#fff', '#c4b5fd');
    statChip('TOTAL VENTA (VENDIDO)', '$'+snap.totalVenta.toFixed(2), xB, cy1, '#16a34a', '#fff', '#86efac');
    statChip('DISPONIBLE P/RECOMPRAR', '$'+snap.totalCosto.toFixed(2), xC2, cy1, '#b45309', '#fff', '#fde68a');
    statChip('GANANCIA DE LO VENDIDO', '$'+snap.ganancia.toFixed(2), xD, cy1, '#15803d', '#fff', '#86efac');

    // Fórmula
    ctx.fillStyle = '#ecfdf5'; ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 1.5*SCALE;
    const fRw = ANCHO - 40*SCALE, fRx = 20*SCALE, fRy = yRes + 58*SCALE, fRh = 28*SCALE;
    ctx.beginPath(); ctx.roundRect(fRx, fRy, fRw, fRh, 8*SCALE); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#065f46'; ctx.font = `bold ${11*SCALE}px Arial`; ctx.textAlign = 'center';
    ctx.fillText(`Costo recuperado $${snap.totalCosto.toFixed(2)}  +  Ganancia $${snap.ganancia.toFixed(2)}  =  Total Venta $${snap.totalVenta.toFixed(2)}`, ANCHO/2, fRy + 18*SCALE);

    ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 3*SCALE;
    ctx.strokeRect(1.5*SCALE, 1.5*SCALE, ANCHO - 3*SCALE, ALTO - 3*SCALE);

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `ventas_${imgIdx+1}.png`;
    link.click();
    toast(`✓ Imagen ${imgIdx+1}/${totalImgs} descargada`);
  });
}

// PDF del período: ventas reales del rango con Invertido/Ganancia por producto
// PDF de Inventario Actual: valorización del stock que tienes ahora mismo
// (Costo Inv. / Venta Inv.), más las unidades vendidas dentro del rango
// de fechas elegido como dato complementario. Antes decía "Reporte de
// Período", lo cual confundía porque el costo/venta NO dependía de las
// fechas — solo la columna "Vendido" sí. Se renombra para reflejar
// exactamente lo que muestra.
function generarPDFRangoSimple() {
  const desdeVal  = document.getElementById('pdfFechaDesde').value;
  const hastaVal  = document.getElementById('pdfFechaHasta').value;
  const catFiltro = document.getElementById('pdfCategoria')?.value || 'todas';
  if (!desdeVal || !hastaVal) { toast('Selecciona fecha de inicio y fin', true); return; }
  const desde = new Date(desdeVal + 'T00:00:00');
  const hasta  = new Date(hastaVal + 'T23:59:59');
  if (desde > hasta) { toast('La fecha inicio debe ser antes que la final', true); return; }

  // Unidades vendidas dentro del rango (dato complementario, sí depende de las fechas)
  const acum = {};
  historial.forEach(v => {
    const ts = v.ts || (v.fechaISO ? Date.parse(v.fechaISO) : 0);
    if (!ts || new Date(ts) < desde || new Date(ts) > hasta) return;
    (v.items || []).forEach(item => {
      const key = item.id ? String(item.id) : ('legacy:' + item.nom);
      const prod = item.id ? productos.find(p => String(p.id) === String(item.id)) : null;
      const cat  = (prod && prod.cat) ? prod.cat : (item.cat || 'SIN CATEGORÍA');
      if (!acum[key]) acum[key] = { id: item.id||null, nom: item.nom||'—', cat, cantVendida: 0 };
      acum[key].cantVendida += Number(item.cant || 0);
    });
  });

  if (!window.jspdf) { toast('jsPDF no disponible', true); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const rangoStr = `${desde.toLocaleDateString('es-SV')} al ${hasta.toLocaleDateString('es-SV')}`;
  const catLabel = catFiltro === 'todas' ? 'Todas las categorías' : catFiltro;

  // Header
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(255,255,255);
  doc.text('INVENTARIO ACTUAL', 105, 13, { align: 'center' });
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(`Vendido entre ${rangoStr}  ·  ${catLabel}`, 105, 21, { align: 'center' });

  let y = 34;

  // Descripción de qué muestra el PDF
  doc.setFillColor(240, 249, 255);
  const descripcion = 'Costo Inv. y Venta Inv. muestran el valor de TODO el stock actual de cada producto '
    + '(no dependen de las fechas). La columna "Vendido" sí es del rango de fechas seleccionado.';
  const descLines = doc.splitTextToSize(descripcion, 178);
  const descH = 6 + descLines.length * 4;
  doc.roundedRect(10, y, 190, descH, 2, 2, 'F');
  doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5); doc.setTextColor(30, 64, 175);
  descLines.forEach((line, i) => doc.text(line, 14, y + 5 + i * 4));
  y += descH + 6;

  let lista = (productos || []).filter(p => catFiltro === 'todas' || (p.cat || 'SIN CATEGORÍA') === catFiltro);
  lista = lista.slice().sort((a,b) => (a.cat||'').localeCompare(b.cat||'') || (a.nom||'').localeCompare(b.nom||''));

  let totalCostoG = 0, totalVentaG = 0;

  const rows = [];
  lista.forEach(p => {
    const cat = p.cat || 'SIN CATEGORÍA';
    const key = String(p.id);
    const vendido = acum[key] ? acum[key].cantVendida : 0;
    const costoTotal = _costoTotalProd(p);
    const ventaTotal = _ventaTotalProd(p);
    totalCostoG += costoTotal;
    totalVentaG += ventaTotal;
    rows.push([p.nom || '—', cat, String(p.stock || 0), String(vendido), '$' + costoTotal.toFixed(2), '$' + ventaTotal.toFixed(2)]);
  });

  if (window.jspdf && doc.autoTable) {
    doc.autoTable({
      startY: y,
      head: [['Producto', 'Categoría', 'Stock', 'Vendido', 'Costo Inv.', 'Venta Inv.']],
      body: rows,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [37, 99, 235], textColor: [255,255,255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { fontStyle: 'bold' },
        2: { halign: 'center' },
        3: { halign: 'center', textColor: [29, 78, 216] },
        4: { halign: 'right', textColor: [124, 58, 237] },
        5: { halign: 'right', textColor: [22, 163, 74] }
      },
      margin: { left: 10, right: 10 }
    });
    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 6 : 270;
    doc.setFillColor(240, 249, 255);
    doc.rect(10, finalY, 190, 12, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(30,58,138);
    doc.text('TOTAL GENERAL:', 14, finalY + 8);
    doc.setTextColor(124,58,237);
    doc.text('Costo: $' + totalCostoG.toFixed(2), 110, finalY + 8);
    doc.setTextColor(22,101,52);
    doc.text('Venta: $' + totalVentaG.toFixed(2), 160, finalY + 8);
  }

  doc.save(`Inventario_actual_${desdeVal}_${hastaVal}${catFiltro!=='todas'?'_'+catFiltro:''}.pdf`);
  toast(`✓ PDF generado — Inventario Actual`);
}

// ===== PRODUCTO INICIAL — sección de Capital e Inventario =====

function piRender() {
  const tbody = document.getElementById('piTbody');
  if (!tbody) return;
  const snap = window._stockInicialSnap || {};
  if (!Object.keys(snap).length) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:20px;color:#9ca3af;">Presiona "Recalcular inventario inicial" para registrar el stock actual de cada producto.</td></tr>';
    return;
  }
  // Ordenar por categoría y nombre
  const keys = Object.keys(snap).sort((a, b) => {
    const pa = snap[a], pb = snap[b];
    return (pa.cat||'').localeCompare(pb.cat||'') || (pa.nom||'').localeCompare(pb.nom||'');
  });
  let html = '';
  let lastCat = null;
  keys.forEach((pid, i) => {
    const entry = snap[pid];
    const cat = entry.cat || 'SIN CATEGORÍA';
    if (cat !== lastCat) {
      html += `<tr><td colspan="3" style="background:#fff1f2;color:#be123c;font-size:10px;font-weight:900;padding:5px 10px;border-bottom:1px solid #fda4af;">📦 ${cat}</td></tr>`;
      lastCat = cat;
    }
    html += `<tr style="border-bottom:1px solid #fff1f2;${i%2===0?'background:#fff':'background:#fff9f9'}">
      <td style="padding:7px 10px;font-weight:700;color:#1e293b;">${entry.nom||'—'}</td>
      <td style="padding:7px 10px;text-align:center;font-size:11px;color:#6b7280;font-weight:600;">${cat}</td>
      <td style="padding:7px 10px;text-align:center;">
        <input type="number" min="0" step="1"
          value="${entry.stock}"
          id="piInp_${pid}"
          style="width:70px;border:1.5px solid #fda4af;border-radius:7px;padding:4px 6px;font-size:14px;font-weight:900;text-align:center;color:#be123c;background:#fff1f2;"
          oninput="piCambio('${pid}', this.value)">
      </td>
    </tr>`;
  });
  tbody.innerHTML = html;
}

function piCambio(pid, val) {
  if (!window._stockInicialSnap) return;
  const entry = window._stockInicialSnap[pid];
  if (entry) entry.stock = parseInt(val) || 0;
}

async function piGuardarManual() {
  if (!window._stockInicialSnap || !Object.keys(window._stockInicialSnap).length) {
    toast('No hay datos de stock inicial para guardar', true);
    return;
  }
  // Leer todos los inputs por si no se disparó oninput
  Object.keys(window._stockInicialSnap).forEach(pid => {
    const inp = document.getElementById('piInp_' + pid);
    if (inp) window._stockInicialSnap[pid].stock = parseInt(inp.value) || 0;
  });
  await idbSet('vpos_stockInicialSnap', window._stockInicialSnap).catch(console.error);
  toast('✅ Stock inicial guardado');
  syncAhora('stockInicial');
}

// Cargar y renderizar al navegar a la sección
function piCargarYRender() {
  if (window._stockInicialSnap) { piRender(); return; }
  idbGet('vpos_stockInicialSnap').then(snap => {
    window._stockInicialSnap = snap || null;
    piRender();
  }).catch(() => piRender());
}
window.piCargarYRender = piCargarYRender;
window.piGuardarManual = piGuardarManual;
