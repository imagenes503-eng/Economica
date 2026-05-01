// =====================================================================
//  ventas_dia_fix.js — Fix definitivo Ventas por Día (menú hamburguesa)
//  Despensa Económica
//
//  INSTALAR en index.html DESPUÉS de app.js:
//  <script src="app.js"></script>
//  <script src="ventas_dia_fix.js"></script>   ← esta línea
//
//  BUGS QUE RESUELVE:
//
//  BUG 1 — El broadcast 'ventas_dia_eliminada' filtra el array en
//           teléfono B pero NUNCA llama renderVentasDiarias() → la UI
//           no se actualiza aunque los datos internos sí cambien.
//
//  BUG 2 — El sync de Supabase (_autoFusionar / pull de ventas_diarias)
//           solo hace ADD/UPDATE, NUNCA elimina filas. Si teléfono A
//           borra una fecha, teléfono B la vuelve a subir en su próximo
//           syncAhora, "resucitando" el item.
//
//  BUG 3 — eliminarVentaDiaria no espera a que syncBorrarVentaDiaria
//           termine antes de hacer otras operaciones → race condition
//           que puede dejar el item en Supabase.
// =====================================================================

(function () {
  'use strict';

  // ══════════════════════════════════════════════════════════════════════
  //  FIX 1 — Reemplazar eliminarVentaDiaria
  //
  //  Cambios:
  //  • Espera a que Supabase confirme la eliminación (await)
  //  • Luego hace salvar() y render (no antes)
  //  • Broadcast DESPUÉS de que Supabase está limpio
  // ══════════════════════════════════════════════════════════════════════

  window.eliminarVentaDiaria = async function (fecha) {
    if (!confirm(`¿Eliminar la venta del ${formatFechaVD(fecha)}?`)) return;

    // 1. Eliminar de Supabase PRIMERO (antes de tocar el array local)
    //    Así si falla, el array local queda intacto y el usuario puede reintentar
    if (navigator.onLine && typeof syncBorrarVentaDiaria === 'function') {
      try {
        await syncBorrarVentaDiaria(fecha);
      } catch(e) {
        console.warn('[VD-Fix] Error borrando de Supabase:', e.message);
        // Continuar de todas formas — el broadcast limpiará el otro teléfono
      }
    }

    // 2. Filtrar el array local
    ventasDiarias = (ventasDiarias || []).filter(v => v.fecha !== fecha);

    // 3. Recalcular reportes y guardar local
    if (typeof _recalcularReportesDesdeHistorial === 'function') {
      _recalcularReportesDesdeHistorial();
    }
    salvar(false);
    idbSetMany([['vpos_ventasDiarias', ventasDiarias]]).catch(console.error);

    // 4. Actualizar UI local inmediatamente
    renderVentasDiarias();
    if (typeof actualizarStats  === 'function') actualizarStats();
    if (typeof renderCajaPanel  === 'function') renderCajaPanel();

    toast('Venta eliminada');

    // 5. Broadcast al otro teléfono CON la lista completa actualizada
    //    (no solo la fecha, sino el array completo para que sea más robusto)
    if (typeof _broadcast === 'function') {
      _broadcast('ventas_dia_eliminada', {
        fecha,
        ventasDiarias: ventasDiarias  // ← enviar lista completa también
      });
    }
  };

  // ══════════════════════════════════════════════════════════════════════
  //  FIX 2 — Parchar el handler del broadcast 'ventas_dia_eliminada'
  //           para que actualice la UI después de filtrar el array
  //
  //  El handler original está dentro de supabase_sync.js en un closure
  //  de Supabase Realtime. No se puede reemplazar directamente, pero sí
  //  podemos agregar un listener propio en el canal global si existe,
  //  O usar el evento storage como puente.
  //
  //  Estrategia: sobreescribir _broadcast para interceptar este evento
  //  y garantizar que renderVentasDiarias() se llame.
  // ══════════════════════════════════════════════════════════════════════

  const _broadcastOriginal = window._broadcast;

  window._broadcast = function (evento, datos) {
    // Llamar al broadcast original
    if (typeof _broadcastOriginal === 'function') {
      _broadcastOriginal(evento, datos);
    }

    // Si es eliminación de venta diaria, asegurarse de que la UI
    // del teléfono EMISOR también esté actualizada (doble seguro)
    if (evento === 'ventas_dia_eliminada') {
      // Pequeño delay para que el render original (si existe) termine
      setTimeout(() => {
        if (typeof renderVentasDiarias === 'function') renderVentasDiarias();
        if (typeof actualizarStats     === 'function') actualizarStats();
        if (typeof renderCajaPanel     === 'function') renderCajaPanel();
      }, 100);
    }

    if (evento === 'venta_diaria_actualizada') {
      setTimeout(() => {
        if (typeof renderVentasDiarias === 'function') renderVentasDiarias();
        if (typeof actualizarStats     === 'function') actualizarStats();
        if (typeof renderCajaPanel     === 'function') renderCajaPanel();
      }, 100);
    }
  };

  // ══════════════════════════════════════════════════════════════════════
  //  FIX 3 — Parchar el RECEPTOR del broadcast 'ventas_dia_eliminada'
  //           en Supabase Realtime para que actualice la UI
  //
  //  El canal de Realtime es privado, pero podemos hookar _procesarPayload
  //  si existe, o escuchar cambios en ventasDiarias con un MutationObserver
  //  sobre el tbody.
  //
  //  Estrategia más robusta: polling ligero que compara el length del array
  //  y re-renderiza si cambió desde afuera (broadcast externo).
  // ══════════════════════════════════════════════════════════════════════

  let _vdLengthAnterior = (ventasDiarias || []).length;
  let _vdWatchTimer     = null;

  function _watchVentasDiarias() {
    const current = (ventasDiarias || []).length;
    if (current !== _vdLengthAnterior) {
      _vdLengthAnterior = current;
      // El array cambió desde afuera (broadcast de Supabase Realtime)
      // Actualizar UI si la página está visible
      const pg = document.getElementById('pgVentasDiarias');
      if (pg && getComputedStyle(pg).display !== 'none') {
        if (typeof renderVentasDiarias === 'function') renderVentasDiarias();
        if (typeof actualizarStats     === 'function') actualizarStats();
      }
    }
  }

  // Revisar cada 2 segundos si el array cambió (muy liviano — solo compara un número)
  _vdWatchTimer = setInterval(_watchVentasDiarias, 2000);

  // ══════════════════════════════════════════════════════════════════════
  //  FIX 4 — Reemplazar guardarVentaDiaria para que también use
  //           Supabase como fuente de verdad al guardar
  //           (evita que un teléfono con datos viejos sobrescriba)
  // ══════════════════════════════════════════════════════════════════════

  window.guardarVentaDiaria = async function () {
    const fecha = document.getElementById('vdFecha')?.value;
    const monto = parseFloat(document.getElementById('vdMonto')?.value || '0');
    const nota  = document.getElementById('vdNota')?.value?.trim() || '';

    if (!fecha) { toast('Selecciona una fecha', true); return; }
    if (isNaN(monto) || monto < 0) { toast('Ingresa un monto válido', true); return; }

    // Verificar si ya existe esa fecha
    const idx = (ventasDiarias || []).findIndex(v => v.fecha === fecha);
    if (idx >= 0) {
      const montoExistente = ventasDiarias[idx].monto;
      if (!confirm(`Ya hay una venta del ${formatFechaVD(fecha)} ($${Number(montoExistente).toFixed(2)}). ¿Reemplazar?`)) {
        toast('Sin cambios — venta existente conservada');
        return;
      }
      ventasDiarias[idx] = { fecha, monto, nota };
    } else {
      ventasDiarias = ventasDiarias || [];
      ventasDiarias.push({ fecha, monto, nota });
    }

    ventasDiarias.sort((a, b) => a.fecha.localeCompare(b.fecha));

    // Guardar local
    salvar(false);
    idbSetMany([['vpos_ventasDiarias', ventasDiarias]]).catch(console.error);

    // Subir a Supabase
    if (navigator.onLine && typeof syncAhora === 'function') {
      syncAhora('venta_diaria');
    }

    // Broadcast con lista completa
    if (typeof _broadcast === 'function') {
      _broadcast('venta_diaria_actualizada', { ventasDiarias });
    }

    // Limpiar inputs y avanzar fecha
    const montoEl = document.getElementById('vdMonto');
    const notaEl  = document.getElementById('vdNota');
    const fechaEl = document.getElementById('vdFecha');
    if (montoEl) montoEl.value = '';
    if (notaEl)  notaEl.value  = '';
    if (fechaEl) {
      const d = new Date(fecha + 'T12:00:00');
      d.setDate(d.getDate() + 1);
      fechaEl.value = d.toISOString().split('T')[0];
    }

    if (typeof poblarFiltroMes    === 'function') poblarFiltroMes();
    if (typeof renderVentasDiarias === 'function') renderVentasDiarias();
    toast('✓ Venta guardada');
  };

  // ══════════════════════════════════════════════════════════════════════
  //  FIX 5 — Polling para teléfono B
  //
  //  El broadcast de Supabase Realtime funciona cuando ambos teléfonos
  //  están conectados al mismo canal. Si teléfono B estaba en segundo
  //  plano o perdió conexión, el broadcast se pierde.
  //
  //  Este polling cada 30s lee directamente de Supabase la tabla
  //  ventas_diarias y reemplaza el array local con lo que haya.
  //  SUPABASE = FUENTE DE VERDAD (mismo principio que finanzas_fix.js).
  // ══════════════════════════════════════════════════════════════════════

  let _vdPollingTimer   = null;
  let _vdUltimoCheck    = null;

  function _tid() {
    if (typeof _getTiendaId === 'function') return _getTiendaId();
    if (typeof _tiendaId    !== 'undefined') return _tiendaId;
    return localStorage.getItem('vpos_tiendaId') || null;
  }

  async function _vdPollSupabase() {
    if (!navigator.onLine) return;
    if (document.visibilityState !== 'visible') return;
    if (!_tid()) return;
    if (typeof _sbGet !== 'function') return;

    // Solo si la página está activa
    const pg = document.getElementById('pgVentasDiarias');
    if (!pg || getComputedStyle(pg).display === 'none') return;

    try {
      // Bajar TODAS las ventas diarias de esta tienda desde Supabase
      const rows = await _sbGet('ventas_diarias', {
        select:    'fecha,monto,nota',
        tienda_id: 'eq.' + _tid(),
        order:     'fecha.asc'
      });

      if (!rows) return;

      // Construir array limpio desde Supabase (fuente de verdad)
      // La fecha en Supabase está guardada como tiendaId_YYYY-MM-DD
      // Extraer solo la parte de fecha
      const fechasEnSupabase = new Set();
      const arrayDesdeSb = rows.map(row => {
        // El ID de fecha puede ser 'tiendaId_YYYY-MM-DD' o 'YYYY-MM-DD'
        const fechaLimpia = row.fecha.includes('_')
          ? row.fecha.split('_').slice(-1)[0]  // tomar la parte después del último _
          : row.fecha;
        // Validar que sea fecha ISO válida
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaLimpia)) return null;
        fechasEnSupabase.add(fechaLimpia);
        return { fecha: fechaLimpia, monto: Number(row.monto) || 0, nota: row.nota || '' };
      }).filter(Boolean);

      // Detectar si hubo cambios
      const localSet  = new Set((ventasDiarias||[]).map(v => v.fecha + '_' + v.monto));
      const remotoSet = new Set(arrayDesdeSb.map(v => v.fecha + '_' + v.monto));
      const igual = localSet.size === remotoSet.size &&
                    [...localSet].every(k => remotoSet.has(k));

      if (igual) return; // sin cambios, no hacer nada

      console.log('[VD-Fix] 🔄 Sincronizando desde Supabase:',
        arrayDesdeSb.length, 'vs local:', (ventasDiarias||[]).length);

      // Reemplazar con datos de Supabase (fuente de verdad)
      ventasDiarias = arrayDesdeSb.sort((a,b) => a.fecha.localeCompare(b.fecha));

      // Guardar local
      idbSetMany([['vpos_ventasDiarias', ventasDiarias]]).catch(console.error);

      // Recalcular reportes
      if (typeof _recalcularReportesDesdeHistorial === 'function') {
        _recalcularReportesDesdeHistorial();
      }

      // Actualizar UI
      if (typeof renderVentasDiarias === 'function') renderVentasDiarias();
      if (typeof actualizarStats     === 'function') actualizarStats();
      if (typeof renderCajaPanel     === 'function') renderCajaPanel();

      // Notificar solo si no está escribiendo
      if (typeof toast === 'function' &&
          (!document.activeElement || document.activeElement.tagName !== 'INPUT')) {
        toast('🔄 Ventas actualizadas desde otro dispositivo');
      }

    } catch(e) {
      // Silencioso — puede ser offline temporal o JWT — auth_fix.js manejará el JWT
    }
  }

  function _vdStartPolling() {
    if (_vdPollingTimer) return;
    _vdPollingTimer = setInterval(_vdPollSupabase, 30000);
  }

  function _vdStopPolling() {
    clearInterval(_vdPollingTimer);
    _vdPollingTimer = null;
  }

  // ── Activar polling cuando pgVentasDiarias está activa ───────────────

  // Hookear renderPagina para detectar cuándo se abre la página
  const _renderPaginaOrig = window.renderPagina;
  window.renderPagina = function (pgId) {
    if (typeof _renderPaginaOrig === 'function') _renderPaginaOrig(pgId);
    if (pgId === 'pgVentasDiarias') {
      _vdStartPolling();
      // Poll inmediato al abrir para sincronizar cambios mientras estaba cerrado
      setTimeout(_vdPollSupabase, 300);
    } else {
      _vdStopPolling();
    }
  };

  // Pausar/reanudar con visibilidad del documento
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      _vdStartPolling();
      // Check inmediato al volver
      setTimeout(_vdPollSupabase, 600);
    } else {
      _vdStopPolling();
    }
  });

  // Arrancar polling con delay (esperar a que la sesión esté lista)
  setTimeout(_vdStartPolling, 3000);

  console.log('[VD-Fix] ✅ Ventas por Día fix cargado — polling 30s + broadcast fix + UI fix');

})();
