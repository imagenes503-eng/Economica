// =====================================================================
//  finanzas_fix.js v2 — Fix DEFINITIVO sync + tiempo real
//  Despensa Económica — Módulo Finanzas del Mes
//
//  INSTRUCCIONES: Agregar en index.html DESPUÉS de finanzas_mes.js:
//  <script src="finanzas_mes.js"></script>
//  <script src="finanzas_fix.js"></script>
//
//  POR QUÉ EL PARCHE ANTERIOR NO FUNCIONÓ:
//  _fmGuardar y _fmSubirSupabase son funciones LOCALES (closure del módulo).
//  Parchear window.* no las intercepta — el código interno usa referencias
//  locales. Este fix reemplaza _fmEliminarMovimiento y _fmAgregarMovimiento
//  que SÍ están en window (llamadas desde onclick en el HTML) con versiones
//  que implementan su propia lógica: tombstones + merge-before-upload.
// =====================================================================

(function () {
  'use strict';

  // ── Estado del fix ────────────────────────────────────────────────────
  let _pollingTimer   = null;
  let _ultimoUpdateAt = null;
  let _subiendo       = false;   // mutex para evitar subidas simultáneas

  // ══════════════════════════════════════════════════════════════════════
  //  HELPERS SUPABASE
  //  _sbGet y _sbPost son globales (de supabase_sync.js) ✅
  // ══════════════════════════════════════════════════════════════════════

  function _tid() {
    if (typeof _getTiendaId === 'function') return _getTiendaId();
    if (typeof _tiendaId    !== 'undefined') return _tiendaId;
    return localStorage.getItem('vpos_tiendaId') || null;
  }

  async function _sbBajar(mes) {
    if (typeof _sbGet !== 'function' || !_tid()) return null;
    try {
      const rows = await _sbGet('finanzas_mes', {
        select: 'datos,updated_at',
        tienda_id: 'eq.' + _tid(),
        mes:       'eq.' + mes,
        limit:     '1'
      });
      if (!rows || !rows.length) return null;
      if (rows[0].updated_at) _ultimoUpdateAt = rows[0].updated_at;
      const raw = rows[0].datos;
      return typeof raw === 'string' ? JSON.parse(raw) : (raw || null);
    } catch(e) { console.warn('[FM-Fix] sbBajar:', e.message); return null; }
  }

  async function _sbSubir(mes, datos) {
    if (typeof _sbPost !== 'function' || !_tid()) return;
    const id = _tid() + '_' + mes;
    await _sbPost('finanzas_mes', {
      id, tienda_id: _tid(), mes,
      datos: JSON.stringify(datos),
      updated_at: new Date().toISOString()
    }, true);
  }

  // ── IDB / localStorage ────────────────────────────────────────────────
  async function _localSet(mes, d) {
    const k = 'fm_datos_' + mes;
    try {
      if (typeof idbSet === 'function') await idbSet(k, d);
      else localStorage.setItem(k, JSON.stringify(d));
    } catch(e) {}
  }

  async function _localGet(mes) {
    const k = 'fm_datos_' + mes;
    try {
      if (typeof idbGet === 'function') return await idbGet(k) || null;
      const r = localStorage.getItem(k);
      return r ? JSON.parse(r) : null;
    } catch(e) { return null; }
  }

  // ══════════════════════════════════════════════════════════════════════
  //  NORMALIZAR — asegura estructura con tombstones
  // ══════════════════════════════════════════════════════════════════════

  function _norm(d) {
    if (!d) d = {};
    if (!d._eliminados) d._eliminados = { ventas:[], facturas:[], gastos:[] };
    ['ventas','facturas','gastos'].forEach(t => {
      if (!Array.isArray(d[t]))                d[t]                 = [];
      if (!Array.isArray(d._eliminados[t]))    d._eliminados[t]     = [];
      if (typeof d.efectivoInicial   === 'undefined') d.efectivoInicial   = 0;
      if (typeof d.inventarioInicial === 'undefined') d.inventarioInicial = 0;
    });
    return d;
  }

  // ══════════════════════════════════════════════════════════════════════
  //  MERGE — corazón del fix
  //
  //  Reglas:
  //  • Un ID en _eliminados de CUALQUIER lado → eliminado en ambos
  //  • Items con mismo ID → gana el _ts más alto
  //  • Escalares → gana la versión con _updatedAt más reciente
  // ══════════════════════════════════════════════════════════════════════

  function _merge(L, R) {
    _norm(L); _norm(R);

    // Unión de tombstones
    const elim = {};
    ['ventas','facturas','gastos'].forEach(t => {
      elim[t] = [...new Set([...(L._eliminados[t]||[]), ...(R._eliminados[t]||[])])];
    });

    // Merge de array por tipo
    function mergeArr(aL, aR, dead) {
      const m = {};
      (aR||[]).forEach(i => { if (i && i.id) m[i.id] = i; });
      (aL||[]).forEach(i => {
        if (!i || !i.id) return;
        if (!m[i.id] || Number(i._ts||0) >= Number(m[i.id]._ts||0)) m[i.id] = i;
      });
      return Object.values(m).filter(i =>
        !dead.has(i.id) && i.fecha && /^\d{4}-\d{2}-\d{2}$/.test(i.fecha)
      );
    }

    // Escalares: versión más reciente gana
    const tsL = new Date(L._updatedAt||0).getTime();
    const tsR = new Date(R._updatedAt||0).getTime();
    const base = tsL >= tsR ? L : R;

    const res = {
      efectivoInicial:   base.efectivoInicial   ?? 0,
      inventarioInicial: base.inventarioInicial ?? 0,
      _eliminados: elim,
      _updatedAt: new Date().toISOString()
    };
    ['ventas','facturas','gastos'].forEach(t => {
      res[t] = mergeArr(L[t], R[t], new Set(elim[t]));
    });
    return res;
  }

  // ══════════════════════════════════════════════════════════════════════
  //  GUARDAR CON MERGE
  //  Flujo: leer remoto → merge → guardar local → subir merged
  // ══════════════════════════════════════════════════════════════════════

  async function _guardar(mes, local) {
    if (_subiendo) await new Promise(r => setTimeout(r, 500));
    _subiendo = true;
    try {
      _norm(local);
      local._updatedAt = new Date().toISOString();

      let merged = local;
      if (navigator.onLine) {
        const remoto = await _sbBajar(mes);
        if (remoto) merged = _merge(local, remoto);
      }

      // Actualizar _fmDatos en memoria (variable del módulo original)
      if (typeof _fmDatos !== 'undefined') Object.assign(_fmDatos, merged);

      await _localSet(mes, merged);

      if (navigator.onLine) {
        await _sbSubir(mes, merged);
        _ultimoUpdateAt = merged._updatedAt;
      }
    } catch(e) {
      console.warn('[FM-Fix] Error guardar:', e.message);
      await _localSet(mes, local);
    } finally {
      _subiendo = false;
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  //  HELPERS DE UI
  // ══════════════════════════════════════════════════════════════════════

  const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

  function _dia(iso) {
    if (!iso) return '';
    const [y,m,d] = iso.split('-').map(Number);
    return DIAS[new Date(y,m-1,d).getDay()] || '';
  }

  function _fmt(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '—';
    const [y,m,d] = iso.split('-');
    return `${d}/${m}/${String(y).slice(2)}`;
  }

  function _renderItem(item, tipo, estilo) {
    const s = estilo === 'ingreso' ? '+' : '-';
    return `<div class="fm-mov-item">
      <span class="fm-mov-fecha">${_fmt(item.fecha)}</span>
      <span style="font-size:10px;font-weight:900;color:var(--text-muted,#888);min-width:26px">${_dia(item.fecha)}</span>
      <span class="fm-mov-nota">${item.nota||'—'}</span>
      <span class="fm-mov-monto ${estilo}">${s}$${Number(item.monto||0).toFixed(2)}</span>
      <button class="btn-fm-del" onclick="_fmEliminarMovimiento('${tipo}','${item.id}')" title="Eliminar">✕</button>
    </div>`;
  }

  function _actualizarLista(tipo, estilo, items) {
    const IDS = { ventas:'fmVentasList', facturas:'fmFacturasList', gastos:'fmGastosList' };
    const TOT = { ventas:'fmVentasTotal',facturas:'fmFacturasTotal',gastos:'fmGastosTotal' };
    const CNT = { ventas:'fmVentasCnt',  facturas:'fmFacturasCnt',  gastos:'fmGastosCnt'  };

    const ok = (items||[])
      .filter(i => i && i.id && /^\d{4}-\d{2}-\d{2}$/.test(i.fecha))
      .sort((a,b) => b.fecha.localeCompare(a.fecha));

    const el = document.getElementById(IDS[tipo]);
    if (el) el.innerHTML = ok.length
      ? ok.map(i => _renderItem(i, tipo, estilo)).join('')
      : '<div class="fm-empty">Sin registros aún</div>';

    const tot = ok.reduce((s,v) => s+Number(v.monto||0), 0);
    const eT = document.getElementById(TOT[tipo]); if (eT) eT.textContent = '$'+tot.toFixed(2);
    const eC = document.getElementById(CNT[tipo]);  if (eC) eC.textContent = ok.length;
  }

  function _actualizarProyeccion() {
    if (typeof _fmDatos === 'undefined') return;
    const tv = (_fmDatos.ventas  ||[]).reduce((s,v)=>s+Number(v.monto||0),0);
    const tf = (_fmDatos.facturas||[]).reduce((s,v)=>s+Number(v.monto||0),0);
    const tg = (_fmDatos.gastos  ||[]).reduce((s,v)=>s+Number(v.monto||0),0);
    const ei = Number(_fmDatos.efectivoInicial  ||0);
    const ii = Number(_fmDatos.inventarioInicial||0);
    const dd = ei+tv-tf-tg;
    const s  = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
    s('fmPrDinero',    '$'+dd.toFixed(2));
    s('fmPrInventario','$'+Math.max(0,ii-tv).toFixed(2));
    s('fmPrVentas',    '$'+tv.toFixed(2));
    s('fmPrEgresos',   '$'+(tf+tg).toFixed(2));
    s('fmVentasTotal', '$'+tv.toFixed(2));
    s('fmFacturasTotal','$'+tf.toFixed(2));
    s('fmGastosTotal', '$'+tg.toFixed(2));
  }

  function _mes() {
    return (typeof _fmMesActual !== 'undefined')
      ? _fmMesActual
      : new Date().toISOString().substring(0,7);
  }

  // ══════════════════════════════════════════════════════════════════════
  //  _fmEliminarMovimiento — REEMPLAZADA (está en window ✅)
  // ══════════════════════════════════════════════════════════════════════

  window._fmEliminarMovimiento = async function (tipo, id) {
    if (!confirm('¿Eliminar este registro?')) return;
    if (typeof _fmDatos === 'undefined' || !_fmDatos[tipo]) {
      if (typeof toast === 'function') toast('Error: datos no cargados', true);
      return;
    }

    _norm(_fmDatos);

    // 1. Tombstone
    if (!_fmDatos._eliminados[tipo].includes(id)) {
      _fmDatos._eliminados[tipo].push(id);
    }
    // 2. Filtrar local
    _fmDatos[tipo] = _fmDatos[tipo].filter(i => i.id !== id);

    // 3. Guardar con merge (propaga eliminación al otro teléfono)
    await _guardar(_mes(), _fmDatos);

    if (typeof toast === 'function') toast('Registro eliminado');

    // 4. Actualizar UI
    const estilos = { ventas:'ingreso', facturas:'egreso', gastos:'egreso' };
    _actualizarLista(tipo, estilos[tipo]||'egreso', _fmDatos[tipo]);
    _actualizarProyeccion();
  };

  // ══════════════════════════════════════════════════════════════════════
  //  _fmAgregarMovimiento — REEMPLAZADA (está en window ✅)
  //  Necesita merge-before-upload para no resucitar items borrados en otro
  // ══════════════════════════════════════════════════════════════════════

  window._fmAgregarMovimiento = async function (tipo, fechaId, montoId, notaId, estiloMonto) {
    const fecha = document.getElementById(fechaId)?.value;
    const monto = parseFloat(document.getElementById(montoId)?.value || '0');
    const nota  = document.getElementById(notaId)?.value?.trim() || '';

    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      if (typeof toast === 'function') toast('Selecciona una fecha válida', true);
      return;
    }
    if (!monto || monto <= 0) {
      if (typeof toast === 'function') toast('Ingresa un monto válido', true);
      return;
    }

    _norm(_fmDatos);

    const id  = tipo + '_' + Date.now() + '_' + Math.random().toString(36).slice(2,5);
    _fmDatos[tipo].push({ id, fecha, monto, nota, _ts: Date.now() });

    await _guardar(_mes(), _fmDatos);

    const mel = document.getElementById(montoId); if (mel) mel.value = '';
    const nel = document.getElementById(notaId);  if (nel) nel.value = '';

    if (typeof toast === 'function') toast('✓ Registrado correctamente');
    _actualizarLista(tipo, estiloMonto, _fmDatos[tipo]);
    _actualizarProyeccion();
  };

  // ══════════════════════════════════════════════════════════════════════
  //  POLLING — sincronización en tiempo real cada 25 segundos
  // ══════════════════════════════════════════════════════════════════════

  async function _poll() {
    if (!navigator.onLine) return;
    if (document.visibilityState !== 'visible') return;
    if (!_tid()) return;

    // Solo si la página finanzas está visible
    const pg = document.getElementById('pgFinanzasMes');
    if (!pg || getComputedStyle(pg).display === 'none') return;

    const mes = _mes();
    try {
      if (typeof _sbGet !== 'function') return;

      // Pedir solo updated_at (petición mínima)
      const rows = await _sbGet('finanzas_mes', {
        select: 'updated_at',
        tienda_id: 'eq.' + _tid(),
        mes:       'eq.' + mes,
        limit:     '1'
      });
      if (!rows || !rows.length) return;
      const remotoTs = rows[0].updated_at;
      if (!remotoTs || remotoTs === _ultimoUpdateAt) return; // sin cambios

      console.log('[FM-Fix] 🔄 Cambio remoto detectado → actualizando');
      _ultimoUpdateAt = remotoTs;

      // Bajar datos completos y mergear
      const remoto = await _sbBajar(mes);
      if (!remoto) return;
      const local  = _norm(typeof _fmDatos !== 'undefined' ? _fmDatos : {});
      const merged = _merge(local, remoto);

      if (typeof _fmDatos !== 'undefined') Object.assign(_fmDatos, merged);
      await _localSet(mes, merged);

      // Actualizar UI
      const estilos = { ventas:'ingreso', facturas:'egreso', gastos:'egreso' };
      ['ventas','facturas','gastos'].forEach(t => {
        _actualizarLista(t, estilos[t], merged[t]);
      });
      _actualizarProyeccion();

      // Toast solo si no está escribiendo
      if (typeof toast === 'function' &&
          (!document.activeElement || document.activeElement.tagName !== 'INPUT')) {
        toast('🔄 Sincronizado con otro dispositivo');
      }
    } catch(e) { /* silencioso — offline temporal */ }
  }

  function _startPolling() {
    if (_pollingTimer) return;
    _pollingTimer = setInterval(_poll, 25000);
    console.log('[FM-Fix] Polling 25s iniciado');
  }
  function _stopPolling() {
    clearInterval(_pollingTimer);
    _pollingTimer = null;
  }

  // ── Activar polling al abrir finanzas, pausar al salir ───────────────

  const _renderOrig = window.renderFinanzasMes;
  window.renderFinanzasMes = async function (pgId) {
    _startPolling();
    if (typeof _renderOrig === 'function') await _renderOrig(pgId);

    // Merge inmediato al abrir: actualiza datos que cambiaron en el otro teléfono
    const mes = _mes();
    const remoto = await _sbBajar(mes);
    if (remoto && typeof _fmDatos !== 'undefined') {
      const merged = _merge(_norm(_fmDatos), remoto);
      Object.assign(_fmDatos, merged);
      await _localSet(mes, merged);
      const estilos = { ventas:'ingreso', facturas:'egreso', gastos:'egreso' };
      ['ventas','facturas','gastos'].forEach(t => {
        _actualizarLista(t, estilos[t], merged[t]);
      });
      _actualizarProyeccion();
    }
  };

  // Hookear navegación para pausar polling al salir de finanzas
  ['mostrarPagina','irA','mostrarTab','switchPage','abrirPagina','renderPagina'].forEach(fn => {
    const orig = window[fn];
    if (typeof orig !== 'function') return;
    window[fn] = function (...args) {
      const dest = String(args[0]||'').toLowerCase();
      if (dest.includes('finanz')) _startPolling(); else _stopPolling();
      return orig.apply(this, args);
    };
  });

  // Pausar/reanudar con visibilidad del documento
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      _startPolling();
      setTimeout(_poll, 600); // check inmediato al volver
    } else {
      _stopPolling();
    }
  });

  // ── Arranque ──────────────────────────────────────────────────────────
  setTimeout(_startPolling, 2000);

  console.log('[FM-Fix] ✅ v2 cargado — tombstones + merge + polling 25s');

})();
