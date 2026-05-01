// =====================================================================
//  sync_pos_fix.js — Fix: Historial Reportes + Productos no seleccionables
//  Despensa Económica
//
//  INSTALAR en index.html DESPUÉS de app.js y supabase_sync.js:
//  <script src="supabase_sync.js"></script>
//  <script src="auth_fix.js"></script>
//  <script src="sync_pos_fix.js"></script>   ← esta línea
//
//  BUG 1 — Historial no se sincroniza en tiempo real al editar cobros
//  ─────────────────────────────────────────────────────────────────
//  guardarEdicionCobro() hace syncAhora('productos') pero NUNCA
//  syncAhora('historial'). El historial editado va SOLO por broadcast.
//  Si teléfono B está en background, pierde el cambio para siempre.
//  Al abrir pgReportes tampoco hay pull de Supabase — usa datos en memoria.
//
//  BUG 2 — Productos aparecen en POS pero no se pueden seleccionar
//  ──────────────────────────────────────────────────────────────────
//  buscarV() hace busq.blur() en touchstart → el teclado virtual se
//  cierra → provoca un reflow/scroll de la página → el elemento
//  .sug-item se desplaza en pantalla → cuando el evento click llega
//  (~300ms después en iOS/Android), el browser detecta que el punto
//  de toque ya no coincide con el elemento (se movió) → el click
//  NO se dispara. El producto aparece pero no responde al toque.
// =====================================================================

(function () {
  'use strict';

  // ══════════════════════════════════════════════════════════════════════
  //  FIX 1 — guardarEdicionCobro: agregar syncAhora('historial')
  //
  //  Reemplaza la función original para que además del broadcast,
  //  también suba el historial a Supabase (tabla ventas).
  //  Así si el broadcast falla, el teléfono B lo recupera de Supabase.
  // ══════════════════════════════════════════════════════════════════════

  const _guardarEdicionCobroOrig = window.guardarEdicionCobro;

  window.guardarEdicionCobro = function () {
    // Ejecutar función original (maneja toda la lógica de devolución)
    if (typeof _guardarEdicionCobroOrig === 'function') {
      _guardarEdicionCobroOrig();
    }

    // Subir historial a Supabase — el original solo hace syncAhora('productos')
    // Hacerlo con un pequeño delay para que salvar() del original termine primero
    setTimeout(() => {
      if (typeof syncAhora === 'function') {
        syncAhora('historial');
        console.log('[Fix] ✅ historial subido a Supabase después de edición');
      }
    }, 300);
  };

  // ══════════════════════════════════════════════════════════════════════
  //  FIX 2 — renderPagina: sync de Supabase al abrir pgReportes
  //
  //  Cuando el usuario abre la sección Reportes, primero renderizar
  //  con datos locales (respuesta inmediata), luego hacer pull de
  //  Supabase en segundo plano y re-renderizar con datos frescos.
  // ══════════════════════════════════════════════════════════════════════

  const _renderPaginaOrig = window.renderPagina;

  window.renderPagina = function (pgId) {
    // Ejecutar render original
    if (typeof _renderPaginaOrig === 'function') {
      _renderPaginaOrig(pgId);
    }

    // Al abrir reportes: pull de Supabase en background
    if (pgId === 'pgReportes' && navigator.onLine) {
      setTimeout(async () => {
        try {
          // Pedir datos frescos de Supabase (historial + pagos)
          if (typeof syncAhora === 'function') {
            syncAhora('historial');
            syncAhora('pagos');
          }
          // Re-renderizar después de que el sync termine
          setTimeout(() => {
            if (typeof renderHistorial === 'function') renderHistorial();
            if (typeof renderVentas    === 'function') renderVentas();
            if (typeof renderPagos     === 'function') renderPagos();
            if (typeof renderBalance   === 'function') renderBalance();
          }, 1500);
        } catch(e) {}
      }, 200);
    }
  };

  // ══════════════════════════════════════════════════════════════════════
  //  FIX 3 — buscarV: reemplazar click por touchend + preventDefault
  //
  //  El problema:
  //  touchstart → blur() → teclado cierra → reflow (página sube ~300px)
  //  → sug-item se mueve en pantalla → click llega 300ms después
  //  → el browser ve que el punto de toque ya no está sobre el elemento
  //  → click no se dispara → producto no responde
  //
  //  La solución:
  //  Usar touchend + e.preventDefault() → se ejecuta INMEDIATAMENTE
  //  al levantar el dedo, antes de que el reflow ocurra.
  //  Mantener click como fallback para desktop (mouse).
  //
  //  Reemplaza buscarV() con la versión corregida.
  // ══════════════════════════════════════════════════════════════════════

  window.buscarV = function () {
    const txt = (document.getElementById('busquedaVenta')?.value || '').toUpperCase().trim();
    const sug = document.getElementById('sugVenta');
    if (!sug) return;
    sug.innerHTML = '';

    if (!txt) { sug.style.display = 'none'; return; }

    const m = (typeof productos !== 'undefined' ? productos : []).filter(p => {
      const nom   = (p.nom   || '').toUpperCase();
      const abrev = (p.abrev || '').toUpperCase();
      const cod   = (p.cod   || '').toUpperCase();
      return nom.startsWith(txt) || abrev === txt || abrev.startsWith(txt) || cod.startsWith(txt);
    });

    if (!m.length) {
      sug.innerHTML = `<div style="text-align:center;padding:18px;color:var(--text-muted);font-weight:700;font-size:13px;background:#fff;border-radius:12px;border:1px solid var(--border);">Sin coincidencias para "${txt}"</div>`;
      sug.style.display = 'block';
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'sug-grid';

    m.forEach(p => {
      const sinStock  = (p.stock || 0) <= 0;
      const stockBajo = !sinStock && (p.stock || 0) <= (p.min || 0);
      const stockTxt  = sinStock ? 'Sin stock' : `Stock: ${p.stock}`;
      const hasImg    = !!p.img;

      const d = document.createElement('div');
      d.className = 'sug-item' + (sinStock ? ' sin-stock' : '') + (hasImg ? ' has-img' : '');
      d.innerHTML = `
        ${hasImg
          ? `<img class="sug-item-img" src="${p.img}" alt="${p.nom}" loading="lazy">`
          : `<div class="sug-item-ph">${p.cat ? p.cat.charAt(0) : '🛒'}</div>`}
        <div class="sug-item-body">
          <div class="sug-item-cat">${p.cat || 'General'}</div>
          <div class="sug-name">${p.nom}</div>
          <div class="sug-price">$${typeof fmtP === 'function' ? fmtP(p.venta || 0) : Number(p.venta||0).toFixed(2)}</div>
          ${sinStock
            ? '<div class="sug-stock-badge sug-stock-sin">✕ Sin stock</div>'
            : stockBajo
              ? `<div class="sug-stock-badge sug-stock-bajo">⚠ ${stockTxt}</div>`
              : `<div class="sug-stock-badge sug-stock-ok">● ${stockTxt}</div>`}
        </div>
        ${!sinStock ? '<div class="sug-tap-hint">＋ Toca para agregar</div>' : ''}
      `;

      if (!sinStock) {
        // ── FUNCIÓN QUE EJECUTA LA ACCIÓN ─────────────────────────────
        // Extraída para que touchend y click la llamen igual
        let _yaEjecutado = false; // evitar doble disparo (touchend + click)

        function _ejecutarSeleccion(e) {
          if (_yaEjecutado) return;
          _yaEjecutado = true;
          // Reiniciar para próxima vez (por si el modal se cierra y se vuelve a abrir)
          setTimeout(() => { _yaEjecutado = false; }, 600);

          if (e && typeof e.preventDefault === 'function') e.preventDefault();
          if (e && typeof e.stopPropagation === 'function') e.stopPropagation();

          // Cerrar sugerencias
          const busq = document.getElementById('busquedaVenta');
          if (busq) busq.value = '';
          sug.style.display = 'none';
          sug.innerHTML = '';

          // Abrir picker o teclado de cantidad
          const pkgsDisponibles = (p.paquetes || []).filter(pk => (p.stock || 0) >= pk.cant);
          if (pkgsDisponibles.length > 0) {
            if (typeof abrirPickerPaquetes === 'function') abrirPickerPaquetes(p);
          } else {
            if (typeof abrirTecladoCantidad === 'function') abrirTecladoCantidad({ p, mode: 'add' });
          }
        }

        // ── TOUCHSTART: solo hacer blur del input (cerrar teclado) ────
        // SIN guardar el touch aquí — el reflow puede mover el elemento
        d.addEventListener('touchstart', (e) => {
          const busq = document.getElementById('busquedaVenta');
          if (busq) busq.blur();
        }, { passive: true });

        // ── TOUCHEND: ejecutar AQUÍ, con preventDefault ───────────────
        // Se dispara ANTES del click, ANTES del reflow. Es el momento correcto.
        d.addEventListener('touchend', (e) => {
          // Verificar que el toque terminó dentro del elemento (no fue un scroll)
          const touch = e.changedTouches[0];
          if (touch) {
            const rect = d.getBoundingClientRect();
            const dentroX = touch.clientX >= rect.left && touch.clientX <= rect.right;
            const dentroY = touch.clientY >= rect.top  && touch.clientY <= rect.bottom;
            if (!dentroX || !dentroY) return; // fue un scroll, no un tap
          }
          _ejecutarSeleccion(e);
        }, { passive: false });

        // ── CLICK: fallback para desktop (mouse) ──────────────────────
        d.addEventListener('click', (e) => {
          _ejecutarSeleccion(e);
        });
      }

      grid.appendChild(d);
    });

    sug.appendChild(grid);
    sug.style.display = 'block';
  };

  // ══════════════════════════════════════════════════════════════════════
  //  FIX 4 — Polling historial para teléfono B
  //
  //  Cada 30s mientras pgReportes está activa, comparar el último
  //  cobro en Supabase con el local. Si hay diferencia → recargar.
  // ══════════════════════════════════════════════════════════════════════

  let _rptPolling  = null;
  let _rptUltimoId = null;

  function _tid() {
    if (typeof _getTiendaId === 'function') return _getTiendaId();
    if (typeof _tiendaId    !== 'undefined') return _tiendaId;
    return localStorage.getItem('vpos_tiendaId') || null;
  }

  async function _pollHistorial() {
    if (!navigator.onLine) return;
    if (document.visibilityState !== 'visible') return;
    if (!_tid()) return;
    if (typeof _sbGet !== 'function') return;

    // Solo si pgReportes está activa
    const pg = document.querySelector('.page.active');
    if (!pg || pg.id !== 'pgReportes') return;

    try {
      // Pedir el cobro más reciente para detectar cambios (request mínimo)
      const rows = await _sbGet('ventas', {
        select:    'id,fecha_iso',
        tienda_id: 'eq.' + _tid(),
        order:     'fecha_iso.desc',
        limit:     '1'
      });

      if (!rows || !rows.length) return;
      const ultimoId = rows[0].id + '_' + rows[0].fecha_iso;

      if (ultimoId === _rptUltimoId) return; // sin cambios
      _rptUltimoId = ultimoId;

      console.log('[Fix] 🔄 Cambio en historial Supabase → actualizando reportes');

      // Hacer pull completo y re-renderizar
      if (typeof syncAhora === 'function') syncAhora('historial');

      setTimeout(() => {
        if (typeof renderHistorial === 'function') renderHistorial();
        if (typeof renderVentas    === 'function') renderVentas();
        if (typeof renderBalance   === 'function') renderBalance();
        if (typeof actualizarStats === 'function') actualizarStats();
      }, 1200);

      if (typeof toast === 'function' &&
          (!document.activeElement || document.activeElement.tagName !== 'INPUT')) {
        toast('🔄 Historial actualizado');
      }
    } catch(e) {} // silencioso
  }

  function _startRptPolling() {
    if (_rptPolling) return;
    _rptPolling = setInterval(_pollHistorial, 30000);
  }
  function _stopRptPolling() {
    clearInterval(_rptPolling);
    _rptPolling = null;
  }

  // Activar polling al abrir pgReportes
  const _renderPaginaFix2 = window.renderPagina;
  window.renderPagina = function (pgId) {
    if (typeof _renderPaginaFix2 === 'function') _renderPaginaFix2(pgId);
    if (pgId === 'pgReportes') {
      _startRptPolling();
      setTimeout(_pollHistorial, 800);
    } else {
      _stopRptPolling();
    }
  };

  // Pausar con visibilidad
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const pg = document.querySelector('.page.active');
      if (pg && pg.id === 'pgReportes') {
        _startRptPolling();
        setTimeout(_pollHistorial, 600);
      }
    } else {
      _stopRptPolling();
    }
  });

  // Arrancar si ya está en pgReportes
  setTimeout(() => {
    const pg = document.querySelector('.page.active');
    if (pg && pg.id === 'pgReportes') _startRptPolling();
  }, 3000);

  console.log('[Fix] ✅ sync_pos_fix cargado — historial sync + touchend fix + polling 30s');

})();
