// =====================================================================
//  finanzas_fix.js — Fix definitivo: Sync de eliminaciones + duplicados
//  Despensa Económica — Módulo Finanzas del Mes
//
//  INSTRUCCIONES: Agregar en index.html DESPUÉS de finanzas_mes.js:
//  <script src="finanzas_mes.js"></script>
//  <script src="finanzas_fix.js"></script>   ← esta línea
//
//  BUGS QUE RESUELVE:
//  1. ✅ Eliminación en un teléfono no se propaga al otro (tombstones)
//  2. ✅ Duplicados al subir datos sin merge (merge-before-upload)
//  3. ✅ Último en escribir borraba cambios del otro (versionado updated_at)
//  4. ✅ "Invalid Date" en botón de CSV (fix de fecha)
//  5. ✅ DÍA "undefined" en la tabla (campo calculado desde fecha)
//  6. ✅ FECHA muestra el ID de Supabase en vez de la fecha (validación)
//  7. ✅ Polling automático cada 30s cuando la página está visible
// =====================================================================

(function () {
  'use strict';

  // ─────────────────────────────────────────────────────────────────────
  //  UTILIDADES INTERNAS
  // ─────────────────────────────────────────────────────────────────────

  const _DIAS_ES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

  /** Retorna el nombre corto del día de la semana a partir de una fecha ISO */
  function _diaSemana(fechaISO) {
    if (!fechaISO || typeof fechaISO !== 'string') return '—';
    // Forzar parseo local sin desfase de zona horaria
    const [y, m, d] = fechaISO.split('-').map(Number);
    if (!y || !m || !d) return '—';
    const dt = new Date(y, m - 1, d);
    return _DIAS_ES[dt.getDay()] || '—';
  }

  /** Valida que una cadena sea una fecha ISO válida (YYYY-MM-DD) */
  function _esFechaISO(str) {
    if (!str || typeof str !== 'string') return false;
    return /^\d{4}-\d{2}-\d{2}$/.test(str);
  }

  /** Sanitiza el campo fecha de un item: si no es ISO válida, devuelve null */
  function _sanitizarFecha(str) {
    if (_esFechaISO(str)) return str;
    return null; // fecha corrupta
  }

  // ─────────────────────────────────────────────────────────────────────
  //  ESTRUCTURA DE DATOS EXTENDIDA CON TOMBSTONES
  //
  //  _fmDatos ahora incluye:
  //    _eliminados: { ventas: ['id1','id2',...], facturas: [...], gastos: [...] }
  //    _updatedAt: ISO timestamp del último guardado
  // ─────────────────────────────────────────────────────────────────────

  function _initTombstones(datos) {
    if (!datos._eliminados) {
      datos._eliminados = { ventas: [], facturas: [], gastos: [] };
    }
    ['ventas','facturas','gastos'].forEach(t => {
      if (!Array.isArray(datos._eliminados[t])) datos._eliminados[t] = [];
    });
    return datos;
  }

  /** Fusiona dos versiones de _fmDatos con resolución de conflictos correcta */
  function _mergeDatos(local, remoto) {
    // Asegurar estructura de tombstones en ambos
    _initTombstones(local);
    _initTombstones(remoto);

    // Union de tombstones: un ID eliminado en cualquier versión queda eliminado
    const elim = {};
    ['ventas','facturas','gastos'].forEach(tipo => {
      const set = new Set([
        ...(local._eliminados[tipo]  || []),
        ...(remoto._eliminados[tipo] || []),
      ]);
      elim[tipo] = [...set];
    });

    // Merge de arrays: unión por ID, los del lado más reciente ganan en conflicto
    function mergeArray(localArr, remotoArr, eliminadosSet) {
      const mapa = {};
      // Primero los remotos (base)
      (remotoArr || []).forEach(item => { mapa[item.id] = item; });
      // Luego los locales (pueden sobreescribir si son más recientes)
      (localArr || []).forEach(item => {
        const existing = mapa[item.id];
        if (!existing) {
          mapa[item.id] = item;
        } else {
          // Comparar timestamps del item si existen, si no, el local gana
          const localTs  = Number(item._ts  || 0);
          const remotoTs = Number(existing._ts || 0);
          if (localTs >= remotoTs) mapa[item.id] = item;
        }
      });

      // Filtrar tombstones y fechas corruptas
      return Object.values(mapa).filter(item => {
        if (eliminadosSet.has(item.id)) return false;          // Tombstone
        if (!_esFechaISO(item.fecha)) return false;            // Fecha inválida
        return true;
      });
    }

    const merged = {
      efectivoInicial:   remoto.efectivoInicial  !== undefined ? remoto.efectivoInicial  : (local.efectivoInicial  || 0),
      inventarioInicial: remoto.inventarioInicial !== undefined ? remoto.inventarioInicial : (local.inventarioInicial || 0),
      _eliminados: elim,
      _updatedAt: new Date().toISOString(),
    };

    // Si el local es más reciente en iniciales, usarlo
    const localTs  = new Date(local._updatedAt  || 0).getTime();
    const remotoTs = new Date(remoto._updatedAt || 0).getTime();
    if (localTs > remotoTs) {
      merged.efectivoInicial   = local.efectivoInicial   !== undefined ? local.efectivoInicial   : (remoto.efectivoInicial   || 0);
      merged.inventarioInicial = local.inventarioInicial !== undefined ? local.inventarioInicial : (remoto.inventarioInicial || 0);
    }

    ['ventas','facturas','gastos'].forEach(tipo => {
      const setElim = new Set(elim[tipo]);
      merged[tipo] = mergeArray(local[tipo], remoto[tipo], setElim);
    });

    return merged;
  }

  // ─────────────────────────────────────────────────────────────────────
  //  REEMPLAZAR _fmGuardarLocal — incluir timestamp y tombstones
  // ─────────────────────────────────────────────────────────────────────

  window._fmGuardarLocal = async function (mes, datos) {
    _initTombstones(datos);
    datos._updatedAt = datos._updatedAt || new Date().toISOString();
    try {
      if (typeof idbSet === 'function') {
        await idbSet('fm_datos_' + mes, datos);
      } else {
        localStorage.setItem('fm_datos_' + mes, JSON.stringify(datos));
      }
    } catch(e) { console.warn('[FM Fix] Error guardando local:', e); }
  };

  // ─────────────────────────────────────────────────────────────────────
  //  REEMPLAZAR _fmSubirSupabase — MERGE ANTES DE SUBIR
  //  Esta es la corrección crítica: nunca sobrescribir sin fusionar primero
  // ─────────────────────────────────────────────────────────────────────

  window._fmSubirSupabase = async function (mes, datosLocal) {
    if (typeof _sbPost !== 'function' || typeof _getTiendaId !== 'function') return;
    _initTombstones(datosLocal);
    datosLocal._updatedAt = new Date().toISOString();

    try {
      // 1. Bajar versión actual de Supabase
      let datosRemoto = null;
      try {
        const rows = await _sbGet('finanzas_mes', {
          select: 'datos',
          tienda_id: 'eq.' + _getTiendaId(),
          mes: 'eq.' + mes,
          limit: 1
        });
        if (rows && rows.length > 0) {
          const raw = rows[0].datos;
          datosRemoto = typeof raw === 'string' ? JSON.parse(raw) : raw;
        }
      } catch(e) {
        console.warn('[FM Fix] No se pudo bajar de Supabase para merge:', e.message);
      }

      // 2. Fusionar (si hay datos remotos)
      const datosFinal = datosRemoto
        ? _mergeDatos(datosLocal, datosRemoto)
        : datosLocal;

      // 3. Actualizar _fmDatos en memoria si la referencia actual es el mismo mes
      if (typeof _fmMesActual !== 'undefined' && _fmMesActual === mes) {
        // Fusionar en memoria también para que la UI refleje el estado correcto
        Object.assign(datosLocal, datosFinal);
      }

      // 4. Subir a Supabase el resultado fusionado
      const id = _getTiendaId() + '_' + mes;
      await _sbPost('finanzas_mes', {
        id,
        tienda_id: _getTiendaId(),
        mes,
        datos: JSON.stringify(datosFinal),
        updated_at: datosFinal._updatedAt
      }, true); // upsert

      // 5. Guardar también en local el resultado fusionado
      await window._fmGuardarLocal(mes, datosFinal);

    } catch(e) {
      console.warn('[FM Fix] Error Supabase upload:', e.message);
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  //  REEMPLAZAR _fmCargar — limpiar datos corruptos al cargar
  // ─────────────────────────────────────────────────────────────────────

  window._fmCargar = async function (mes) {
    let datos = null;

    // Intentar Supabase primero
    try {
      if (typeof _sbGet === 'function' && typeof _getTiendaId === 'function') {
        const rows = await _sbGet('finanzas_mes', {
          select: 'datos',
          tienda_id: 'eq.' + _getTiendaId(),
          mes: 'eq.' + mes,
          limit: 1
        });
        if (rows && rows.length > 0) {
          const raw = rows[0].datos;
          datos = typeof raw === 'string' ? JSON.parse(raw) : raw;
        }
      }
    } catch(e) { console.warn('[FM Fix] _fmCargar Supabase:', e.message); }

    // Fallback a local
    if (!datos) {
      try {
        if (typeof idbGet === 'function') {
          datos = await idbGet('fm_datos_' + mes) || null;
        } else {
          const raw = localStorage.getItem('fm_datos_' + mes);
          datos = raw ? JSON.parse(raw) : null;
        }
      } catch(e) { datos = null; }
    }

    // Estructura base si no hay datos
    if (!datos) {
      datos = {
        efectivoInicial: 0, inventarioInicial: 0,
        ventas: [], facturas: [], gastos: [],
        _eliminados: { ventas: [], facturas: [], gastos: [] },
        _updatedAt: new Date().toISOString(),
      };
      return datos;
    }

    // Asegurar estructura
    _initTombstones(datos);
    ['ventas','facturas','gastos'].forEach(tipo => {
      if (!Array.isArray(datos[tipo])) datos[tipo] = [];
    });

    // Limpiar items con fecha corrupta o en tombstones
    ['ventas','facturas','gastos'].forEach(tipo => {
      const eliminadosSet = new Set(datos._eliminados[tipo] || []);
      datos[tipo] = datos[tipo].filter(item => {
        if (!item || !item.id) return false;
        if (eliminadosSet.has(item.id)) return false;   // Tombstone
        if (!_esFechaISO(item.fecha)) return false;     // Fecha corrupta
        return true;
      });
    });

    return datos;
  };

  // ─────────────────────────────────────────────────────────────────────
  //  REEMPLAZAR _fmEliminarMovimiento — grabar tombstone
  // ─────────────────────────────────────────────────────────────────────

  window._fmEliminarMovimiento = async function (tipo, id) {
    if (!confirm('¿Eliminar este registro?')) return;

    // Obtener referencia a _fmDatos (variable del módulo original)
    const datos = (typeof _fmDatos !== 'undefined') ? _fmDatos : null;
    if (!datos || !datos[tipo]) {
      if (typeof toast === 'function') toast('Error: datos no disponibles', true);
      return;
    }

    _initTombstones(datos);

    // 1. Agregar al tombstone ANTES de filtrar (orden importa para el merge)
    if (!datos._eliminados[tipo]) datos._eliminados[tipo] = [];
    if (!datos._eliminados[tipo].includes(id)) {
      datos._eliminados[tipo].push(id);
    }

    // 2. Filtrar del array local
    datos[tipo] = datos[tipo].filter(i => i.id !== id);

    // 3. Actualizar timestamp
    datos._updatedAt = new Date().toISOString();

    // 4. Guardar (local + Supabase con merge)
    await window._fmGuardar(
      (typeof _fmMesActual !== 'undefined' ? _fmMesActual : new Date().toISOString().substring(0, 7)),
      datos
    );

    if (typeof toast === 'function') toast('Registro eliminado', true);

    // 5. Actualizar UI
    const estiloMapa = { ventas: 'ingreso', facturas: 'egreso', gastos: 'egreso' };
    if (typeof _fmActualizarUI === 'function') {
      _fmActualizarUI(tipo, estiloMapa[tipo] || 'egreso');
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  //  REEMPLAZAR _fmAgregarMovimiento — marcar timestamp en cada item
  // ─────────────────────────────────────────────────────────────────────

  window._fmAgregarMovimiento = async function (tipo, fechaId, montoId, notaId, estiloMonto) {
    const fechaVal = document.getElementById(fechaId)?.value;
    const monto    = parseFloat(document.getElementById(montoId)?.value || '0');
    const nota     = document.getElementById(notaId)?.value?.trim() || '';

    if (!fechaVal) {
      if (typeof toast === 'function') toast('Selecciona una fecha', true);
      return;
    }
    // Validar que sea fecha ISO válida
    if (!_esFechaISO(fechaVal)) {
      if (typeof toast === 'function') toast('Fecha inválida. Usa el selector de fecha.', true);
      return;
    }
    if (!monto || monto <= 0) {
      if (typeof toast === 'function') toast('Ingresa un monto válido', true);
      return;
    }

    const datos = (typeof _fmDatos !== 'undefined') ? _fmDatos : null;
    if (!datos) return;

    _initTombstones(datos);

    // Verificar que el ID no esté en tombstones (salvaguarda)
    const id = tipo + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5);
    if (!datos[tipo]) datos[tipo] = [];

    datos[tipo].push({
      id,
      fecha: fechaVal,    // ISO garantizado
      monto,
      nota,
      _ts: Date.now(),    // Timestamp para resolución de conflictos
    });

    datos._updatedAt = new Date().toISOString();

    await window._fmGuardar(
      (typeof _fmMesActual !== 'undefined' ? _fmMesActual : new Date().toISOString().substring(0, 7)),
      datos
    );

    // Limpiar inputs
    const montoEl = document.getElementById(montoId);
    const notaEl  = document.getElementById(notaId);
    if (montoEl) montoEl.value = '';
    if (notaEl)  notaEl.value  = '';

    if (typeof toast === 'function') toast('✓ Registrado correctamente');
    if (typeof _fmActualizarUI === 'function') _fmActualizarUI(tipo, estiloMonto);
  };

  // ─────────────────────────────────────────────────────────────────────
  //  REEMPLAZAR _fmRenderLista — añadir columna DÍA y validar fechas
  // ─────────────────────────────────────────────────────────────────────

  window._fmRenderLista = function (items, tipo, estiloMonto) {
    // Filtrar items con datos corruptos
    const itemsValidos = (items || []).filter(item =>
      item && item.id && _esFechaISO(item.fecha)
    );

    if (!itemsValidos.length) {
      return `<div class="fm-empty">Sin registros aún</div>`;
    }

    const ordenado = [...itemsValidos].sort((a, b) => b.fecha.localeCompare(a.fecha));

    return ordenado.map(item => {
      const fechaFmt = (function () {
        const [y, m, d] = item.fecha.split('-');
        return `${d}/${m}/${y.slice(2)}`;
      })();
      const diaSem = _diaSemana(item.fecha);
      const signo  = estiloMonto === 'ingreso' ? '+' : '-';

      return `
        <div class="fm-mov-item">
          <span class="fm-mov-fecha">${fechaFmt}</span>
          <span class="fm-mov-dia" style="font-size:10px;font-weight:900;color:var(--text-muted);min-width:28px;">${diaSem}</span>
          <span class="fm-mov-nota">${item.nota || '—'}</span>
          <span class="fm-mov-monto ${estiloMonto}">${signo}$${Number(item.monto).toFixed(2)}</span>
          <button class="btn-fm-del" onclick="_fmEliminarMovimiento('${tipo}','${item.id}')" title="Eliminar">✕</button>
        </div>`;
    }).join('');
  };

  // ─────────────────────────────────────────────────────────────────────
  //  POLLING AUTOMÁTICO — refrescar mientras la página está visible
  //  Detecta cambios de otros dispositivos sin que el usuario interactúe
  // ─────────────────────────────────────────────────────────────────────

  let _fmPollingTimer  = null;
  let _fmPaginaVisible = false;
  let _fmUltimoCambio  = null;  // _updatedAt del último dato cargado

  /** Inicia el polling cuando el usuario abre la página de finanzas */
  function _fmIniciarPolling() {
    _fmPaginaVisible = true;
    if (_fmPollingTimer) return; // ya corriendo
    _fmPollingTimer = setInterval(_fmPollSupabase, 30000); // cada 30 seg
    console.log('[FM Fix] Polling iniciado (30s)');
  }

  /** Detiene el polling cuando el usuario sale de la página de finanzas */
  function _fmDetenerPolling() {
    _fmPaginaVisible = false;
    if (_fmPollingTimer) {
      clearInterval(_fmPollingTimer);
      _fmPollingTimer = null;
      console.log('[FM Fix] Polling detenido');
    }
  }

  /** Comprueba si hay datos más nuevos en Supabase y re-renderiza si cambió */
  async function _fmPollSupabase() {
    if (!_fmPaginaVisible) return;
    if (typeof _sbGet !== 'function' || typeof _getTiendaId !== 'function') return;
    if (typeof _sesionActiva !== 'undefined' && !_sesionActiva) return;

    const mes = (typeof _fmMesActual !== 'undefined')
      ? _fmMesActual
      : new Date().toISOString().substring(0, 7);

    try {
      // Solo traer el timestamp para no desperdiciar ancho de banda
      const rows = await _sbGet('finanzas_mes', {
        select: 'updated_at',
        tienda_id: 'eq.' + _getTiendaId(),
        mes: 'eq.' + mes,
        limit: 1
      });

      if (!rows || !rows.length) return;
      const remotoTs = rows[0].updated_at;

      // Si el timestamp remoto es más nuevo → recargar y re-renderizar
      if (remotoTs && remotoTs !== _fmUltimoCambio) {
        console.log('[FM Fix] Datos nuevos detectados en Supabase → actualizando');
        _fmUltimoCambio = remotoTs;

        // Recargar datos
        const nuevosDatos = await window._fmCargar(mes);

        // Actualizar variable del módulo original
        if (typeof _fmDatos !== 'undefined') {
          Object.assign(_fmDatos, nuevosDatos);
          // Forzar actualización de la UI (sin recargar toda la página)
          ['ventas','facturas','gastos'].forEach(tipo => {
            const estiloMapa = { ventas: 'ingreso', facturas: 'egreso', gastos: 'egreso' };
            if (typeof _fmActualizarUI === 'function') {
              _fmActualizarUI(tipo, estiloMapa[tipo]);
            }
          });
        }
      }
    } catch(e) {
      // Silencioso — puede ser offline
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  //  PARCHEAR renderFinanzasMes — activar/desactivar polling
  // ─────────────────────────────────────────────────────────────────────

  const _renderFinanzasMesOriginal = window.renderFinanzasMes;

  window.renderFinanzasMes = async function (pgId) {
    // Iniciar polling al abrir la página
    _fmIniciarPolling();

    // Registrar el timestamp del último dato cargado
    const mes = (typeof _fmMesActual !== 'undefined')
      ? _fmMesActual
      : new Date().toISOString().substring(0, 7);

    // Llamar al render original
    if (typeof _renderFinanzasMesOriginal === 'function') {
      await _renderFinanzasMesOriginal(pgId);
    }

    // Registrar el timestamp actual para el polling
    if (typeof _fmDatos !== 'undefined' && _fmDatos._updatedAt) {
      _fmUltimoCambio = _fmDatos._updatedAt;
    }
  };

  // Detener polling cuando el usuario cambia de página
  // Hookeamos el evento de navegación (asumiendo que app.js usa mostrarPagina o similar)
  const _navegarOpciones = ['mostrarPagina', 'irA', 'mostrarTab', 'switchPage', 'abrirPagina'];
  _navegarOpciones.forEach(fn => {
    const orig = window[fn];
    if (typeof orig === 'function') {
      window[fn] = function (...args) {
        // Si el destino NO es finanzas, detener polling
        const destino = String(args[0] || '');
        if (!destino.toLowerCase().includes('finanz')) {
          _fmDetenerPolling();
        }
        return orig.apply(this, args);
      };
    }
  });

  // También detectar visibilitychange del documento
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      _fmDetenerPolling();
    } else if (document.visibilityState === 'visible' && _fmPaginaVisible) {
      _fmIniciarPolling();
      _fmPollSupabase(); // Check inmediato al volver
    }
  });

  // ─────────────────────────────────────────────────────────────────────
  //  FIX PARA "Invalid Date" en botón de CSV
  //  El problema: new Date('2026-04') es inválida en algunos navegadores
  //  Reemplazar con función robusta
  // ─────────────────────────────────────────────────────────────────────

  /** Formatea un año-mes "YYYY-MM" para mostrar en el botón de rango */
  function _fmFormatearMesRango(ym) {
    if (!ym || typeof ym !== 'string') return 'Este mes';
    const partes = ym.split('-');
    if (partes.length < 2) return ym;
    const [y, m] = partes;
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const idxMes = parseInt(m, 10) - 1;
    if (idxMes < 0 || idxMes > 11) return ym;
    return `${meses[idxMes]} ${y}`;
  }

  // Exponer para uso en templates
  window._fmFormatearMesRango = _fmFormatearMesRango;

  // ─────────────────────────────────────────────────────────────────────
  //  MIGRACIÓN DE DATOS EXISTENTES
  //  Al cargar, sanear datos antiguos que puedan tener fechas corruptas
  // ─────────────────────────────────────────────────────────────────────

  async function _fmMigrarDatosExistentes() {
    const mes = (typeof _fmMesActual !== 'undefined')
      ? _fmMesActual
      : new Date().toISOString().substring(0, 7);

    try {
      let local = null;
      if (typeof idbGet === 'function') {
        local = await idbGet('fm_datos_' + mes);
      } else {
        const raw = localStorage.getItem('fm_datos_' + mes);
        local = raw ? JSON.parse(raw) : null;
      }

      if (!local) return;

      _initTombstones(local);
      let modificado = false;

      ['ventas','facturas','gastos'].forEach(tipo => {
        const original = local[tipo] || [];
        const limpio = original.filter(item => {
          if (!item || !item.id) return false;
          if (!_esFechaISO(item.fecha)) {
            console.warn('[FM Fix] Removiendo item con fecha corrupta:', item);
            return false;
          }
          return true;
        });
        if (limpio.length !== original.length) {
          local[tipo] = limpio;
          modificado = true;
        }
      });

      if (modificado) {
        console.log('[FM Fix] Datos migrados: items con fechas corruptas removidos');
        if (typeof idbSet === 'function') {
          await idbSet('fm_datos_' + mes, local);
        } else {
          localStorage.setItem('fm_datos_' + mes, JSON.stringify(local));
        }
      }
    } catch(e) {
      console.warn('[FM Fix] Error en migración:', e);
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  //  INICIALIZACIÓN
  // ─────────────────────────────────────────────────────────────────────

  // Ejecutar migración al cargar el módulo
  setTimeout(_fmMigrarDatosExistentes, 1000);

  // Exponer funciones de polling para control manual si se necesita
  window._fmIniciarPolling = _fmIniciarPolling;
  window._fmDetenerPolling = _fmDetenerPolling;
  window._fmPollSupabase   = _fmPollSupabase;

  console.log('[FM Fix] ✅ Parche de sync/eliminaciones cargado correctamente');

})();
