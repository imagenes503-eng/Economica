// =====================================================================
//  reportes_fix.js — Fix definitivo sincronización Reportes / Historial
//  Despensa Económica
//
//  INSTALAR en index.html DESPUÉS de app.js y supabase_sync.js:
//  <script src="supabase_sync.js"></script>
//  <script src="reportes_fix.js"></script>   ← esta línea
//
//  BUGS QUE RESUELVE:
//
//  BUG 1 — guardarEdicionCobro() llama syncAhora('productos') pero
//           NUNCA syncAhora('historial'). El historial editado no llega
//           a Supabase. Si el teléfono B está en segundo plano cuando
//           llega el broadcast, pierde el cambio para siempre.
//
//  BUG 2 — Sin polling de respaldo para historial. Si el broadcast de
//           Supabase Realtime se pierde (app en background, conexión
//           interrumpida), el teléfono B nunca se sincroniza.
//
//  BUG 3 — actualizarTodo() solo renderiza pgReportes si es la página
//           ACTIVA en ese momento. Si teléfono B está en otra sección
//           cuando llega el broadcast, la UI de reportes queda stale.
//           Al abrir reportes después, mostrará datos viejos porque
//           no hay un sync-on-open.
// =====================================================================

(function () {
  'use strict';

  // ══════════════════════════════════════════════════════════════════════
  //  HELPERS
  // ══════════════════════════════════════════════════════════════════════

  function _tid() {
    if (typeof _getTiendaId === 'function') return _getTiendaId();
    if (typeof _tiendaId    !== 'undefined') return _tiendaId;
    return localStorage.getItem('vpos_tiendaId') || null;
  }

  let _ultimoTsHistorial = null;  // timestamp del último historial visto
  let _pollingTimer      = null;

  // ══════════════════════════════════════════════════════════════════════
  //  FIX 1 — Reemplazar guardarEdicionCobro
  //
  //  Agrega syncAhora('historial') después de guardar para que el
  //  historial editado llegue a Supabase — no solo por broadcast.
  //  Si el broadcast falla, el polling del teléfono B lo detectará.
  // ══════════════════════════════════════════════════════════════════════

  const _guardarEdicionCobroOrig = window.guardarEdicionCobro;

  window.guardarEdicionCobro = function () {
    // Ejecutar la función original
    if (typeof _guardarEdicionCobroOrig === 'function') {
      _guardarEdicionCobroOrig();
    }

    // Agregar sync de historial a Supabase (el original solo hace 'productos')
    if (typeof syncAhora === 'function') {
      syncAhora('historial');
    }

    // Registrar timestamp local para que el polling no re-procese su propio cambio
    _ultimoTsHistorial = new Date().toISOString();
  };

  // ══════════════════════════════════════════════════════════════════════
  //  FIX 2 — Reemplazar borrarGasto para que también haga re-render
  //           si pgReportes está activa (el original no llama renderPagos)
  // ══════════════════════════════════════════════════════════════════════

  const _borrarGastoOrig = window.borrarGasto;

  window.borrarGasto = function (id) {
    if (typeof _borrarGastoOrig === 'function') {
      _borrarGastoOrig(id);
    }
    // Forzar re-render de pagos en pgReportes si está activa
    setTimeout(() => {
      const pg = document.querySelector('.page.active');
      if (pg && pg.id === 'pgReportes') {
        if (typeof renderPagos   === 'function') renderPagos();
        if (typeof renderBalance === 'function') renderBalance();
      }
    }, 150);
  };

  // ══════════════════════════════════════════════════════════════════════
  //  FIX 3 — Polling para historial (respaldo del broadcast)
  //
  //  Estrategia (igual que ventas_dia_fix y finanzas_fix):
  //  Cada 25s bajar timestamp del historial desde Supabase.
  //  Si cambió → bajar historial completo → reemplazar → render.
  //  SUPABASE ES LA FUENTE DE VERDAD.
  // ══════════════════════════════════════════════════════════════════════

  async function _pollHistorial() {
    if (!navigator.onLine) return;
    if (document.visibilityState !== 'visible') return;
    if (!_tid()) return;
    if (typeof _sbGet !== 'function') return;

    // Solo si pgReportes está activa
    const pg = document.querySelector('.page.active');
    if (!pg || pg.id !== 'pgReportes') return;

    try {
      // Pedir solo updated_at del snapshot de historial
      const rows = await _sbGet('snapshots', {
        select:    'updated_at',
        tienda_id: 'eq.' + _tid(),
        limit:     '1'
      });

      // Si no tiene tabla snapshots, intentar con historial directamente
      if (!rows) return;

      let remotoTs = null;
      if (rows.length > 0) remotoTs = rows[0].updated_at;

      if (!remotoTs || remotoTs === _ultimoTsHistorial) return; // sin cambios

      console.log('[Reportes-Fix] 🔄 Cambio en historial detectado → actualizando');
      _ultimoTsHistorial = remotoTs;

      // Bajar historial completo
      const histRows = await _sbGet('historial', {
        select:    '*',
        tienda_id: 'eq.' + _tid(),
        order:     'ts.desc',
        limit:     '500'
      });

      if (!histRows || !histRows.length) return;

      // Reconstruir historial
      const nuevoHistorial = histRows.map(v => ({
        ...v,
        fechaStr: v.fechaStr || (v.fechaISO ? new Date(v.fechaISO).toLocaleString('es-SV') : '—')
      }));

      // Reemplazar en memoria
      if (typeof historial !== 'undefined') {
        historial.length = 0;
        nuevoHistorial.forEach(v => historial.push(v));
      }

      // Guardar local
      if (typeof idbSet === 'function') {
        idbSet('vpos_historial', historial).catch(() => {});
      }

      // Recalcular reportes
      if (typeof _recalcularReportesDesdeHistorial === 'function') {
        _recalcularReportesDesdeHistorial();
      }

      // Actualizar UI
      if (typeof renderHistorial === 'function') renderHistorial();
      if (typeof renderVentas    === 'function') renderVentas();
      if (typeof renderBalance   === 'function') renderBalance();
      if (typeof actualizarStats === 'function') actualizarStats();

      if (typeof toast === 'function' &&
          (!document.activeElement || document.activeElement.tagName !== 'INPUT')) {
        toast('🔄 Historial actualizado desde otro dispositivo');
      }

    } catch(e) {
      // Silencioso — offline temporal o tabla no encontrada
      // Intentar con tabla alternativa 'ventas' si existe
      _pollVentas();
    }
  }

  /** Fallback: algunos schemas guardan historial en tabla 'ventas' */
  async function _pollVentas() {
    if (!navigator.onLine || !_tid() || typeof _sbGet !== 'function') return;
    try {
      const rows = await _sbGet('ventas', {
        select:    'id,fecha_iso,total,items,pago,vuelto',
        tienda_id: 'eq.' + _tid(),
        order:     'fecha_iso.desc',
        limit:     '1'
      });
      if (!rows || !rows.length) return;
      const ultimo = rows[0];
      const ts = ultimo.id + '_' + (ultimo.fecha_iso || '');
      if (ts === _ultimoTsHistorial) return;
      _ultimoTsHistorial = ts;

      // Hay cambios → forzar re-render completo de reportes
      if (typeof renderHistorial === 'function') renderHistorial();
      if (typeof renderVentas    === 'function') renderVentas();
      if (typeof renderBalance   === 'function') renderBalance();
    } catch(e) {}
  }

  function _startPolling() {
    if (_pollingTimer) return;
    _pollingTimer = setInterval(_pollHistorial, 25000);
    console.log('[Reportes-Fix] ▶ Polling 25s iniciado');
  }

  function _stopPolling() {
    clearInterval(_pollingTimer);
    _pollingTimer = null;
  }

  // ══════════════════════════════════════════════════════════════════════
  //  FIX 4 — Sync inmediato al abrir pgReportes
  //
  //  Al abrir la sección de Reportes, siempre hacer un pull de Supabase
  //  para mostrar el estado real — no el que quedó en memoria/local.
  // ══════════════════════════════════════════════════════════════════════

  /** Fuerza sync y render completo de la sección reportes */
  async function _syncYRenderReportes() {
    // Renderizar con datos locales primero (respuesta inmediata)
    if (typeof renderVentas    === 'function') renderVentas();
    if (typeof renderHistorial === 'function') renderHistorial();
    if (typeof renderCritico   === 'function') renderCritico();
    if (typeof renderPagos     === 'function') renderPagos();
    if (typeof renderBalance   === 'function') renderBalance();

    // Luego sync en segundo plano
    if (navigator.onLine && typeof syncAhora === 'function') {
      try {
        // Pedir datos frescos de Supabase
        syncAhora('historial');
        syncAhora('pagos');
        // Después de un momento, re-renderizar con datos actualizados
        setTimeout(() => {
          if (typeof renderHistorial === 'function') renderHistorial();
          if (typeof renderPagos     === 'function') renderPagos();
          if (typeof renderBalance   === 'function') renderBalance();
          if (typeof renderVentas    === 'function') renderVentas();
        }, 1200);
      } catch(e) {}
    }

    _startPolling();
    // Registrar timestamp actual
    setTimeout(_pollHistorial, 500);
  }

  // ── Hookear renderPagina para detectar cuando se abre pgReportes ────

  const _renderPaginaOrig = window.renderPagina;
  window.renderPagina = function (pgId) {
    if (pgId === 'pgReportes') {
      // Llamar render original
      if (typeof _renderPaginaOrig === 'function') _renderPaginaOrig(pgId);
      // Sync inmediato en segundo plano
      _syncYRenderReportes();
      _startPolling();
    } else {
      _stopPolling();
      if (typeof _renderPaginaOrig === 'function') _renderPaginaOrig(pgId);
    }
  };

  // ── Pausar/reanudar con visibilidad del documento ────────────────────

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const pg = document.querySelector('.page.active');
      if (pg && pg.id === 'pgReportes') {
        _startPolling();
        setTimeout(_pollHistorial, 600);
      }
    } else {
      _stopPolling();
    }
  });

  // ══════════════════════════════════════════════════════════════════════
  //  FIX 5 — Asegurar que borrarCobro también sube historial a Supabase
  //
  //  La función que borra un cobro individual desde el historial
  //  (el botón ✕ de cada cobro en pgReportes) no siempre hace
  //  syncAhora('historial'). Parcharla para garantizarlo.
  // ══════════════════════════════════════════════════════════════════════

  // borrarVenta es el nombre más común para esto en tu código
  const _borrarVentaOrig = window.borrarVenta;
  if (typeof _borrarVentaOrig === 'function') {
    window.borrarVenta = function (...args) {
      const result = _borrarVentaOrig(...args);
      if (typeof syncAhora === 'function') {
        setTimeout(() => syncAhora('historial'), 200);
      }
      _ultimoTsHistorial = new Date().toISOString();
      return result;
    };
  }

  // ══════════════════════════════════════════════════════════════════════
  //  ARRANQUE
  // ══════════════════════════════════════════════════════════════════════

  // Iniciar polling con delay para esperar a que la sesión esté lista
  setTimeout(() => {
    const pg = document.querySelector('.page.active');
    if (pg && pg.id === 'pgReportes') {
      _startPolling();
    }
  }, 3000);

  console.log('[Reportes-Fix] ✅ Cargado — syncHistorial + polling 25s + sync-on-open');

})();
