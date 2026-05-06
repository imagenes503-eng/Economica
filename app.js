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
      const tot  = cant * Number(it.precio || 0);
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
let inventarioInicial = 0;
let tabGasto          = 'mes';
let _paginaActual     = 'pgDash';
let _ultimoBackup     = null;
let _backupNum        = 0;    // contador auto-incremental de backups
let _datosAFusionar   = null;

let facturaNum    = 0;  // contador de facturas digitales

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
    'vpos_efectivoInicial','vpos_inventarioInicial',
    'vpos_ultimoBackup','vpos_backupNum','vpos_pagina','vpos_tabGasto',
    'vpos_facturaNum'
  ];
  const data = await idbGetMany(keys);

  const ef = data['vpos_efectivoInicial'];
  efectivoInicial   = (ef !== undefined && ef !== null) ? parseFloat(ef) || 0 : 0;
  const inv = data['vpos_inventarioInicial'];
  inventarioInicial = (inv !== undefined && inv !== null) ? parseFloat(inv) || 0 : 0;
  _ultimoBackup = data['vpos_ultimoBackup'] || null;
  _backupNum    = Number(data['vpos_backupNum'] || 0);
  facturaNum    = Number(data['vpos_facturaNum'] || 0);
  _paginaActual = data['vpos_pagina']       || 'pgDash';
  tabGasto      = data['vpos_tabGasto']     || 'mes';
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
        if (critico) row.class