// =====================================================================
//  fix_final.js — Fix definitivo: Historial cobros + POS productos
//  Despensa Económica
//
//  INSTALAR en index.html DESPUÉS de supabase_sync.js y app.js:
//  <script src="supabase_sync.js"></script>
//  <script src="app.js"></script>
//  <script src="auth_fix.js"></script>
//  <script src="fix_final.js"></script>   ← esta línea
//
//  ═══════════════════════════════════════════════════════════════════
//  BUG 1 — Historial: eliminación no se propaga al otro teléfono
//  ─────────────────────────────────────────────────────────────────
//  CAUSA RAÍZ: _fusionarDos() línea 1527 solo AGREGA items del
//  historial externo al local. NUNCA elimina. Entonces:
//  • Teléfono A borra cobro → sube snapshot sin ese cobro
//  • Teléfono B hace _autoFusionar → ve que A no tiene el cobro
//    pero B sí → regla "agregar si falta" → el cobro RESUCITA en B
//  No hay lista de tombstones (historialEliminados) para historial.
//
//  SOLUCIÓN:
//  • Mantener window.historialEliminados = Set de IDs borrados
//  • Incluirlo en el broadcast historial_actualizado
//  • Aplicarlo en renderHistorial (filtrar antes de mostrar)
//  • Polling propio cada 25s que lee Supabase directamente
//
//  ═══════════════════════════════════════════════════════════════════
//  BUG 2 — POS: productos visibles pero no seleccionables
//  ─────────────────────────────────────────────────────────────────
//  CAUSA RAÍZ: debounceBuscarV es una `const` en app.js. No está en
//  window. No se puede reemplazar desde afuera. El oninput del HTML
//  llama a debounceBuscarV() → la función original → touchstart hace
//  blur() → teclado cierra → reflow → elemento .sug-item se mueve
//  300ms → click no dispara porque el punto de toque ya no coincide.
//
//  SOLUCIÓN:
//  • Event delegation en #sugVenta (el contenedor no se mueve)
//  • touchend en el contenedor → e.preventDefault() → ejecutar acción
//  • Funciona sin reemplazar debounceBuscarV
// =====================================================================

(function () {
  'use strict';

  // ══════════════════════════════════════════════════════════════════════
  //  ██████  FIX 1 — HISTORIAL COBROS
  // ══════════════════════════════════════════════════════════════════════

  // Lista global de IDs de cobros eliminados (tombstones)
  // Se persiste en IDB para sobrevivir recargas
  if (typeof window.historialEliminados === 'undefined') {
    window.historialEliminados = [];
  }

  // Cargar tombstones guardados desde IDB al arrancar
  (async function _cargarTombstones() {
    try {
      if (typeof idbGet === 'function') {
        const saved = await idbGet('vpos_historialEliminados');
        if (Array.isArray(saved)) {
          window.historialEliminados = saved;
          console.log('[Fix] Tombstones cargados:', saved.length);
        }
      }
    } catch(e) {}
  })();

  // Guardar tombstones en IDB
  async function _guardarTombstones() {
    try {
      if (typeof idbSet === 'function') {
        await idbSet('vpos_historialEliminados', window.historialEliminados);
      }
    } catch(e) {}
  }

  // Aplicar tombstones al historial en memoria y en UI
  function _aplicarTombstones() {
    if (!window.historialEliminados.length) return false;
    if (typeof historial === 'undefined') return false;
    const set = new Set(window.historialEliminados.map(String));
    const antes = historial.length;
    historial = historial.filter(v => !set.has(String(v.id)));
    return historial.length !== antes; // true si hubo cambios
  }

  // ── 1A. Parchar guardarEdicionCobro ──────────────────────────────────
  //   Cuando se elimina un cobro, guardar su ID en los tombstones
  //   y asegurarse de que el broadcast incluya la lista de eliminados

  const _guardarEdicionCobroOrig = window.guardarEdicionCobro;

  window.guardarEdicionCobro = function () {
    // Capturar el ID del cobro ANTES de que el original lo elimine
    let idEliminado = null;
    try {
      if (typeof _editCobroIdx !== 'undefined' &&
          typeof historial     !== 'undefined' &&
          historial[_editCobroIdx]) {
        idEliminado = String(historial[_editCobroIdx].id);
      }
    } catch(e) {}

    // Ejecutar la función original
    if (typeof _guardarEdicionCobroOrig === 'function') {
      _guardarEdicionCobroOrig();
    }

    // Después de que el original terminó:
    setTimeout(() => {
      // Agregar a tombstones si el cobro fue eliminado del historial
      if (idEliminado) {
        const sigueExistiendo = (historial || []).some(v => String(v.id) === idEliminado);
        if (!sigueExistiendo) {
          // El cobro fue eliminado — registrar tombstone
          if (!window.historialEliminados.includes(idEliminado)) {
            window.historialEliminados.push(idEliminado);
          }
          _guardarTombstones();
          console.log('[Fix] Tombstone registrado para cobro:', idEliminado);

          // Broadcast CON tombstones para que el otro teléfono sepa inmediatamente
          if (typeof _broadcast === 'function') {
            _broadcast('historial_actualizado', {
              historial:           (historial || []).map(v => ({...v, img: undefined})),
              historialEliminados: window.historialEliminados
            });
          }

          // Subir historial a Supabase (fallback por si el broadcast falla)
          if (typeof syncAhora === 'function') {
            syncAhora('historial');
          }
        }
      }
    }, 100);
  };

  // ── 1B. Interceptar broadcast historial_actualizado recibido ─────────
  //   El broadcast original (supabase_sync.js línea 2205) ya reemplaza
  //   historial = nuevo. Pero no aplica los tombstones del remitente.
  //   Parchamos _broadcast para interceptar el ENVÍO, y usamos un
  //   MutationObserver + polling para el RECEPTOR.

  // Para el RECEPTOR: cada vez que actualizarTodo() se llame después
  // de recibir un broadcast, aplicar tombstones antes de render.
  const _actualizarTodoOrig = window.actualizarTodo;

  window.actualizarTodo = function () {
    // Aplicar tombstones antes de renderizar
    _aplicarTombstones();
    // Llamar original
    if (typeof _actualizarTodoOrig === 'function') {
      _actualizarTodoOrig();
    }
  };

  // ── 1C. Parchar renderHistorial ───────────────────────────────────────
  //   Filtrar tombstones justo antes de renderizar la lista de cobros

  const _renderHistorialOrig = window.renderHistorial;

  window.renderHistorial = function (...args) {
    _aplicarTombstones();
    if (typeof _renderHistorialOrig === 'function') {
      _renderHistorialOrig(...args);
    }
  };

  // ── 1D. Polling propio cada 25s para pgReportes ───────────────────────
  //   Lee directamente la tabla 'ventas' de Supabase.
  //   Compara con historial local. Si hay diferencia, fuerza sync.

  let _rptTimer    = null;
  let _rptLastHash = null;

  function _tid() {
    if (typeof _getTiendaId === 'function') return _getTiendaId();
    if (typeof _tiendaId    !== 'undefined') return _tiendaId;
    return localStorage.getItem('vpos_tiendaId') || null;
  }

  async function _pollReportes() {
    if (!navigator.onLine) return;
    if (document.visibilityState !== 'visible') return;
    if (!_tid() || typeof _sbGet !== 'function') return;

    const pg = document.querySelector('.page.active');
    if (!pg || pg.id !== 'pgReportes') return;

    try {
      // Pedir solo el ID y ts del cobro más reciente (petición mínima)
      const rows = await _sbGet('ventas', {
        select:    'id,fecha_iso',
        tienda_id: 'eq.' + _tid(),
        order:     'fecha_iso.desc',
        limit:     '1'
      });

      // Hash simple: ID del último cobro + cantidad total
      const localCount = (typeof historial !== 'undefined') ? historial.length : 0;
      const remoteId   = rows && rows.length ? rows[0].id : 'none';
      const hash       = remoteId + '_' + localCount;

      if (hash === _rptLastHash) return; // sin cambios
      _rptLastHash = hash;

      console.log('[Fix] 🔄 Cambio en reportes detectado → sincronizando');

      // Forzar sync completo
      if (typeof syncAhora === 'function') {
        syncAhora('historial');
        syncAhora('pagos');
      }

      // Re-renderizar después de que el sync termine
      setTimeout(() => {
        _aplicarTombstones();
        if (typeof renderHistorial === 'function') renderHistorial();
        if (typeof renderVentas    === 'function') renderVentas();
        if (typeof renderBalance   === 'function') renderBalance();
        if (typeof actualizarStats === 'function') actualizarStats();
      }, 1500);

    } catch(e) {} // silencioso
  }

  // Al abrir pgReportes: sync inmediato + iniciar polling
  const _renderPaginaOrig = window.renderPagina;

  window.renderPagina = function (pgId) {
    if (typeof _renderPaginaOrig === 'function') _renderPaginaOrig(pgId);

    if (pgId === 'pgReportes') {
      // Sync en segundo plano al abrir
      if (navigator.onLine) {
        setTimeout(() => {
          _aplicarTombstones();
          if (typeof syncAhora === 'function') {
            syncAhora('historial');
            syncAhora('pagos');
          }
          setTimeout(() => {
            if (typeof renderHistorial === 'function') renderHistorial();
            if (typeof renderVentas    === 'function') renderVentas();
            if (typeof renderBalance   === 'function') renderBalance();
          }, 1500);
        }, 300);
      }
      // Iniciar polling
      if (!_rptTimer) {
        _rptTimer = setInterval(_pollReportes, 25000);
      }
    } else {
      // Detener polling al salir de reportes
      clearInterval(_rptTimer);
      _rptTimer = null;
    }
  };

  // Pausar/reanudar con visibilidad
  document.addEventListener('visibilitychange', () => {
    const pg = document.querySelector('.page.active');
    if (document.visibilityState === 'visible' && pg && pg.id === 'pgReportes') {
      if (!_rptTimer) _rptTimer = setInterval(_pollReportes, 25000);
      setTimeout(_pollReportes, 600);
    } else if (document.visibilityState === 'hidden') {
      clearInterval(_rptTimer);
      _rptTimer = null;
    }
  });

  // ══════════════════════════════════════════════════════════════════════
  //  ██████  FIX 2 — POS: PRODUCTOS NO SELECCIONABLES
  //
  //  NO se reemplaza debounceBuscarV (es const en app.js, no en window).
  //  En cambio, se usa EVENT DELEGATION en #sugVenta:
  //
  //  • sugVenta es el contenedor que está fijo en la pantalla
  //  • Los .sug-item hijos se mueven cuando el teclado cierra
  //  • Pero el touchend en sugVenta se registra ANTES del reflow
  //  • e.preventDefault() cancela el click que vendría 300ms después
  //  • Así el producto se agrega al instante sin importar el reflow
  // ══════════════════════════════════════════════════════════════════════

  function _instalarDelegacion() {
    const sug = document.getElementById('sugVenta');
    if (!sug) {
      // sugVenta todavía no existe en el DOM — reintentar
      setTimeout(_instalarDelegacion, 300);
      return;
    }

    // Marcar para no instalar dos veces
    if (sug.dataset.fixInstalado) return;
    sug.dataset.fixInstalado = '1';

    // Variable para detectar scroll vs tap
    let _touchStartY = 0;
    let _touchStartX = 0;

    sug.addEventListener('touchstart', (e) => {
      _touchStartY = e.touches[0].clientY;
      _touchStartX = e.touches[0].clientX;
    }, { passive: true });

    sug.addEventListener('touchend', (e) => {
      const touch = e.changedTouches[0];
      if (!touch) return;

      // Si el usuario hizo scroll (movió más de 10px) → ignorar
      const deltaY = Math.abs(touch.clientY - _touchStartY);
      const deltaX = Math.abs(touch.clientX - _touchStartX);
      if (deltaY > 10 || deltaX > 10) return;

      // Buscar el .sug-item más cercano en el árbol de ancestros del toque
      let el = e.target;
      while (el && el !== sug) {
        if (el.classList && el.classList.contains('sug-item')) break;
        el = el.parentElement;
      }
      if (!el || !el.classList.contains('sug-item')) return;
      if (el.classList.contains('sin-stock')) return; // sin stock → no hacer nada

      // PREVENIR el click que vendría 300ms después (evitar doble disparo)
      e.preventDefault();

      // ── EJECUTAR ACCIÓN ──────────────────────────────────────────────
      // Leer el ID del producto desde el dataset (lo guardaremos abajo)
      const prodId = el.dataset.prodId;
      if (!prodId) return;

      const p = (typeof productos !== 'undefined' ? productos : [])
        .find(x => String(x.id) === prodId);
      if (!p) return;

      // Cerrar sugerencias
      const busq = document.getElementById('busquedaVenta');
      if (busq) busq.value = '';
      sug.style.display = 'none';
      sug.innerHTML = '';

      // Abrir picker o teclado de cantidad
      const pkgsDisponibles = (p.paquetes || []).filter(pk => (p.stock || 0) >= pk.cant);
      if (pkgsDisponibles.length > 0) {
        if (typeof abrirPickerPaquetes   === 'function') abrirPickerPaquetes(p);
      } else {
        if (typeof abrirTecladoCantidad === 'function') abrirTecladoCantidad({ p, mode: 'add' });
      }

    }, { passive: false }); // passive:false para poder usar preventDefault()

    console.log('[Fix] ✅ Delegación touchend instalada en #sugVenta');
  }

  // ── Parchar buscarV para que los .sug-item guarden data-prod-id ──────
  //   (necesario para que la delegación sepa qué producto es)
  //   Usamos MutationObserver en #sugVenta para agregar data-prod-id
  //   a los items después de que buscarV los renderice.

  function _patchSugItems(sug) {
    // Buscar todos los .sug-item que no tienen data-prod-id aún
    sug.querySelectorAll('.sug-item:not([data-prod-id])').forEach(item => {
      // Buscar el nombre del producto en el DOM del item
      const nomEl = item.querySelector('.sug-name');
      if (!nomEl) return;
      const nom = nomEl.textContent.trim().toUpperCase();
      const p = (typeof productos !== 'undefined' ? productos : [])
        .find(x => (x.nom || '').toUpperCase() === nom);
      if (p) {
        item.dataset.prodId = String(p.id);
      }
    });
  }

  // Observar cambios en #sugVenta para patchear items nuevos
  function _observarSugVenta() {
    const sug = document.getElementById('sugVenta');
    if (!sug) { setTimeout(_observarSugVenta, 300); return; }

    const obs = new MutationObserver(() => {
      _patchSugItems(sug);
    });
    obs.observe(sug, { childList: true, subtree: true });
    console.log('[Fix] ✅ Observer de #sugVenta activo');
  }

  // ── Inicializar todo cuando el DOM esté listo ─────────────────────────
  function _init() {
    _instalarDelegacion();
    _observarSugVenta();

    // Si pgReportes ya está activa al cargar (raro pero posible)
    const pg = document.querySelector('.page.active');
    if (pg && pg.id === 'pgReportes') {
      if (!_rptTimer) _rptTimer = setInterval(_pollReportes, 25000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    // DOM ya listo
    setTimeout(_init, 500);
  }

  console.log('[Fix] ✅ fix_final.js cargado — historial tombstones + touchend delegation');

})();
