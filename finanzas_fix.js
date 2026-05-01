// =====================================================================
//  finanzas_fix.js  v3 — SUPABASE ES LA ÚNICA FUENTE DE VERDAD
//  Despensa Económica — Módulo Finanzas del Mes
//
//  INSTALAR: en index.html, DESPUÉS de finanzas_mes.js
//  <script src="finanzas_mes.js"></script>
//  <script src="finanzas_fix.js"></script>   ← esta línea
//
//  REGLAS DE ORO:
//  ┌─────────────────────────────────────────────────────────────────┐
//  │  CON INTERNET  → leer/escribir SOLO en Supabase                │
//  │  SIN INTERNET  → leer/escribir SOLO en localStorage            │
//  │  NUNCA sincronizar local→Supabase al volver online (evita      │
//  │  resurrección de items borrados desde otro teléfono)           │
//  │                                                                 │
//  │  TELÉFONO A BORRA → Supabase actualizado → Teléfono B lee      │
//  │  Supabase en el próximo poll → UI actualizada ✅               │
//  └─────────────────────────────────────────────────────────────────┘
// =====================================================================

(function () {
  'use strict';

  // ══════════════════════════════════════════════════════════════════════
  //  1. SISTEMA DE LETRAS DE DISPOSITIVO  (A, B, C, D…)
  //
  //  Cada teléfono tiene una letra única dentro de la misma tienda.
  //  Se guarda en localStorage y se registra en Supabase.
  //  La letra aparece como badge flotante en la esquina de la pantalla.
  // ══════════════════════════════════════════════════════════════════════

  const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  function _letraKey() {
    return 'vpos_deviceLetra_' + (_tid() || 'default');
  }

  /** Devuelve la letra de este dispositivo (o null si aún no tiene) */
  function _getLetraLocal() {
    return localStorage.getItem(_letraKey()) || null;
  }

  /** Asigna y guarda la letra de este dispositivo */
  function _setLetraLocal(letra) {
    localStorage.setItem(_letraKey(), letra);
  }

  /**
   * Registra el dispositivo en Supabase y obtiene/asigna su letra.
   * Usa la tabla finanzas_mes con mes='_devices' como registro de dispositivos.
   */
  async function _registrarDispositivo() {
    // Si ya tiene letra guardada localmente, usarla
    const letraGuardada = _getLetraLocal();
    if (letraGuardada) {
      _mostrarBadgeDispositivo(letraGuardada);
      return letraGuardada;
    }

    if (!navigator.onLine || !_tid()) {
      // Sin internet: asignar letra temporal basada en timestamp
      const letraTmp = LETRAS[Math.floor(Math.random() * 6)]; // A-F aleatorio
      _setLetraLocal(letraTmp);
      _mostrarBadgeDispositivo(letraTmp + '?'); // ? indica pendiente de confirmar
      return letraTmp;
    }

    try {
      // Leer registro de dispositivos de Supabase
      const rows = await _sbGet('finanzas_mes', {
        select: 'datos',
        tienda_id: 'eq.' + _tid(),
        mes: 'eq._devices',
        limit: '1'
      });

      let dispositivos = {};
      if (rows && rows.length > 0) {
        const raw = rows[0].datos;
        dispositivos = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
      }

      // Encontrar siguiente letra disponible
      const letrasUsadas = Object.values(dispositivos); // { 'uuid1': 'A', 'uuid2': 'B' }
      const letraDisponible = LETRAS.find(l => !letrasUsadas.includes(l)) || 'X';

      // Generar ID único para este dispositivo si no tiene
      let deviceId = localStorage.getItem('vpos_deviceId');
      if (!deviceId) {
        deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
        localStorage.setItem('vpos_deviceId', deviceId);
      }

      // Registrar en Supabase
      dispositivos[deviceId] = letraDisponible;
      await _sbPost('finanzas_mes', {
        id:        _tid() + '__devices',
        tienda_id: _tid(),
        mes:       '_devices',
        datos:     JSON.stringify(dispositivos),
        updated_at: new Date().toISOString()
      }, true);

      _setLetraLocal(letraDisponible);
      _mostrarBadgeDispositivo(letraDisponible);
      console.log('[FM-Fix] 📱 Dispositivo registrado como:', letraDisponible);
      return letraDisponible;

    } catch(e) {
      console.warn('[FM-Fix] Error registrando dispositivo:', e.message);
      const tmp = 'X';
      _setLetraLocal(tmp);
      _mostrarBadgeDispositivo(tmp);
      return tmp;
    }
  }

  /** Muestra el badge flotante de la letra del dispositivo */
  function _mostrarBadgeDispositivo(letra) {
    // Eliminar badge anterior si existe
    const old = document.getElementById('fmDeviceBadge');
    if (old) old.remove();

    const badge = document.createElement('div');
    badge.id = 'fmDeviceBadge';
    badge.title = 'Dispositivo ' + letra;
    badge.style.cssText = `
      position: fixed;
      bottom: 70px;
      right: 12px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #166534, #16a34a);
      color: #fff;
      font-size: 15px;
      font-weight: 900;
      font-family: Nunito, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 10px rgba(0,0,0,0.25);
      z-index: 9999;
      cursor: default;
      border: 2px solid rgba(255,255,255,0.3);
      user-select: none;
    `;
    badge.textContent = letra;
    document.body.appendChild(badge);

    // Tooltip al tocar
    badge.addEventListener('click', () => {
      if (typeof toast === 'function') {
        toast('📱 Este dispositivo es: ' + letra);
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  //  2. HELPERS BÁSICOS
  // ══════════════════════════════════════════════════════════════════════

  function _tid() {
    if (typeof _getTiendaId === 'function') return _getTiendaId();
    if (typeof _tiendaId    !== 'undefined') return _tiendaId;
    return localStorage.getItem('vpos_tiendaId') || null;
  }

  function _mes() {
    return (typeof _fmMesActual !== 'undefined')
      ? _fmMesActual
      : new Date().toISOString().substring(0, 7);
  }

  /** Estructura base vacía */
  function _datoBase() {
    return {
      efectivoInicial: 0, inventarioInicial: 0,
      ventas: [], facturas: [], gastos: []
    };
  }

  /** Normaliza datos (campos faltantes → valores por defecto) */
  function _norm(d) {
    if (!d || typeof d !== 'object') return _datoBase();
    if (!Array.isArray(d.ventas))   d.ventas   = [];
    if (!Array.isArray(d.facturas)) d.facturas = [];
    if (!Array.isArray(d.gastos))   d.gastos   = [];
    d.efectivoInicial   = Number(d.efectivoInicial   || 0);
    d.inventarioInicial = Number(d.inventarioInicial || 0);
    // Limpiar items con fecha inválida
    ['ventas','facturas','gastos'].forEach(t => {
      d[t] = d[t].filter(i => i && i.id && /^\d{4}-\d{2}-\d{2}$/.test(i.fecha));
    });
    return d;
  }

  // ══════════════════════════════════════════════════════════════════════
  //  3. ACCESO A DATOS
  //
  //  CON INTERNET  → Supabase (fuente única de verdad)
  //  SIN INTERNET  → localStorage/IDB (caché offline)
  // ══════════════════════════════════════════════════════════════════════

  // ── Supabase ──────────────────────────────────────────────────────────

  async function _sbLeer(mes) {
    if (typeof _sbGet !== 'function' || !_tid()) return null;
    try {
      const rows = await _sbGet('finanzas_mes', {
        select: 'datos,updated_at',
        tienda_id: 'eq.' + _tid(),
        mes:       'eq.' + mes,
        limit:     '1'
      });
      if (!rows || !rows.length) return null;
      if (rows[0].updated_at) _ultimoUpdatedAt = rows[0].updated_at;
      const raw = rows[0].datos;
      return _norm(typeof raw === 'string' ? JSON.parse(raw) : (raw || null));
    } catch(e) {
      console.warn('[FM-Fix] sbLeer error:', e.message);
      return null;
    }
  }

  async function _sbEscribir(mes, datos) {
    if (typeof _sbPost !== 'function' || !_tid()) return false;
    const ahora = new Date().toISOString();
    datos._updatedAt = ahora;
    try {
      await _sbPost('finanzas_mes', {
        id:         _tid() + '_' + mes,
        tienda_id:  _tid(),
        mes,
        datos:      JSON.stringify(datos),
        updated_at: ahora
      }, true); // upsert
      _ultimoUpdatedAt = ahora;
      return true;
    } catch(e) {
      console.warn('[FM-Fix] sbEscribir error:', e.message);
      return false;
    }
  }

  // ── Local (offline cache) ─────────────────────────────────────────────

  async function _localLeer(mes) {
    const k = 'fm_datos_' + mes;
    try {
      if (typeof idbGet === 'function') return _norm(await idbGet(k)) || null;
      const r = localStorage.getItem(k);
      return r ? _norm(JSON.parse(r)) : null;
    } catch(e) { return null; }
  }

  async function _localEscribir(mes, datos) {
    const k = 'fm_datos_' + mes;
    try {
      if (typeof idbSet === 'function') await idbSet(k, datos);
      else localStorage.setItem(k, JSON.stringify(datos));
    } catch(e) {}
  }

  // ── Lector unificado: Supabase si hay internet, local si no ──────────

  async function _leer(mes) {
    if (navigator.onLine) {
      const remoto = await _sbLeer(mes);
      if (remoto) {
        // Actualizar caché local con los datos de Supabase
        await _localEscribir(mes, remoto);
        return remoto;
      }
    }
    // Offline o fallo de red → usar caché local
    const local = await _localLeer(mes);
    return local || _datoBase();
  }

  // ── Escritor unificado: escribe en Supabase si hay internet, si no en local
  //   IMPORTANTE: NUNCA sube local→Supabase al reconectar (evita resurrecciones)

  async function _escribir(mes, datos) {
    if (navigator.onLine) {
      const ok = await _sbEscribir(mes, datos);
      if (ok) {
        // Actualizar caché local con lo que subimos
        await _localEscribir(mes, datos);
        // Actualizar _fmDatos en memoria
        if (typeof _fmDatos !== 'undefined') Object.assign(_fmDatos, datos);
        return;
      }
    }
    // Sin internet o error → solo local
    await _localEscribir(mes, datos);
    if (typeof _fmDatos !== 'undefined') Object.assign(_fmDatos, datos);
  }

  // ══════════════════════════════════════════════════════════════════════
  //  4. POLLING — teléfono B se entera de cambios del teléfono A
  //
  //  Cada 20 segundos, pide solo updated_at a Supabase.
  //  Si cambió → baja datos completos → actualiza UI.
  //  Supabase es la fuente → no hay merge, no hay resurrecciones.
  // ══════════════════════════════════════════════════════════════════════

  let _pollingTimer    = null;
  let _ultimoUpdatedAt = null;
  let _pollingActivo   = false;

  async function _poll() {
    if (!navigator.onLine) return;
    if (document.visibilityState !== 'visible') return;
    if (!_tid()) return;

    // Solo si la sección finanzas está visible
    const pg = document.getElementById('pgFinanzasMes');
    if (!pg || getComputedStyle(pg).display === 'none') return;

    try {
      if (typeof _sbGet !== 'function') return;

      // Petición mínima: solo updated_at
      const rows = await _sbGet('finanzas_mes', {
        select:    'updated_at',
        tienda_id: 'eq.' + _tid(),
        mes:       'eq.' + _mes(),
        limit:     '1'
      });

      if (!rows || !rows.length) return;
      const remotoTs = rows[0].updated_at;
      if (!remotoTs || remotoTs === _ultimoUpdatedAt) return; // sin cambios

      console.log('[FM-Fix] 🔄 Cambio detectado (ts:', remotoTs, ')');
      _ultimoUpdatedAt = remotoTs;

      // Bajar datos completos desde Supabase (fuente de verdad)
      const datos = await _sbLeer(_mes());
      if (!datos) return;

      // Actualizar caché local
      await _localEscribir(_mes(), datos);

      // Actualizar _fmDatos en memoria
      if (typeof _fmDatos !== 'undefined') {
        // Reemplazar completamente (no merge) — Supabase es la verdad
        _fmDatos.efectivoInicial   = datos.efectivoInicial;
        _fmDatos.inventarioInicial = datos.inventarioInicial;
        _fmDatos.ventas    = datos.ventas;
        _fmDatos.facturas  = datos.facturas;
        _fmDatos.gastos    = datos.gastos;
      }

      // Actualizar UI
      _refreshUI();

      // Notificar al usuario (solo si no está escribiendo)
      const letraEste = _getLetraLocal() || '?';
      if (typeof toast === 'function' &&
          (!document.activeElement || document.activeElement.tagName !== 'INPUT')) {
        toast('🔄 Dispositivo ' + letraEste + ': datos actualizados');
      }

    } catch(e) {
      // Silencioso — puede ser offline temporal
    }
  }

  function _startPoll() {
    if (_pollingTimer) return;
    _pollingActivo = true;
    _pollingTimer = setInterval(_poll, 20000); // cada 20 segundos
    console.log('[FM-Fix] ▶ Polling 20s iniciado');
  }

  function _stopPoll() {
    _pollingActivo = false;
    clearInterval(_pollingTimer);
    _pollingTimer = null;
  }

  // ══════════════════════════════════════════════════════════════════════
  //  5. ACTUALIZAR UI SIN RECARGAR TODA LA PÁGINA
  // ══════════════════════════════════════════════════════════════════════

  const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

  function _dia(iso) {
    if (!iso) return '';
    const [y,m,d] = iso.split('-').map(Number);
    return DIAS[new Date(y,m-1,d).getDay()] || '';
  }

  function _fmtFecha(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '—';
    const [y,m,d] = iso.split('-');
    return `${d}/${m}/${String(y).slice(2)}`;
  }

  function _renderItem(item, tipo, estilo) {
    const s = estilo === 'ingreso' ? '+' : '-';
    return `
      <div class="fm-mov-item">
        <span class="fm-mov-fecha">${_fmtFecha(item.fecha)}</span>
        <span style="font-size:10px;font-weight:900;color:var(--text-muted,#888);min-width:26px">${_dia(item.fecha)}</span>
        <span class="fm-mov-nota">${item.nota || '—'}</span>
        <span class="fm-mov-monto ${estilo}">${s}$${Number(item.monto || 0).toFixed(2)}</span>
        <button class="btn-fm-del"
          onclick="_fmEliminarMovimiento('${tipo}','${item.id}')"
          title="Eliminar">✕</button>
      </div>`;
  }

  function _refreshLista(tipo, estilo) {
    const IDS = { ventas:'fmVentasList', facturas:'fmFacturasList', gastos:'fmGastosList' };
    const TOT = { ventas:'fmVentasTotal',facturas:'fmFacturasTotal',gastos:'fmGastosTotal' };
    const CNT = { ventas:'fmVentasCnt',  facturas:'fmFacturasCnt',  gastos:'fmGastosCnt'  };

    if (typeof _fmDatos === 'undefined') return;
    const items = (_fmDatos[tipo] || [])
      .filter(i => i && i.id && /^\d{4}-\d{2}-\d{2}$/.test(i.fecha))
      .sort((a,b) => b.fecha.localeCompare(a.fecha));

    const el = document.getElementById(IDS[tipo]);
    if (el) el.innerHTML = items.length
      ? items.map(i => _renderItem(i, tipo, estilo)).join('')
      : '<div class="fm-empty">Sin registros aún</div>';

    const total = items.reduce((s,v) => s + Number(v.monto || 0), 0);
    const eT = document.getElementById(TOT[tipo]);
    if (eT) eT.textContent = '$' + total.toFixed(2);
    const eC = document.getElementById(CNT[tipo]);
    if (eC) eC.textContent = items.length;
  }

  function _refreshProyeccion() {
    if (typeof _fmDatos === 'undefined') return;
    const tv = (_fmDatos.ventas   ||[]).reduce((s,v)=>s+Number(v.monto||0),0);
    const tf = (_fmDatos.facturas ||[]).reduce((s,v)=>s+Number(v.monto||0),0);
    const tg = (_fmDatos.gastos   ||[]).reduce((s,v)=>s+Number(v.monto||0),0);
    const ei = Number(_fmDatos.efectivoInicial   || 0);
    const ii = Number(_fmDatos.inventarioInicial || 0);
    const set = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
    set('fmPrDinero',    '$' + (ei+tv-tf-tg).toFixed(2));
    set('fmPrInventario','$' + Math.max(0, ii-tv).toFixed(2));
    set('fmPrVentas',    '$' + tv.toFixed(2));
    set('fmPrEgresos',   '$' + (tf+tg).toFixed(2));
    set('fmVentasTotal', '$' + tv.toFixed(2));
    set('fmFacturasTotal','$' + tf.toFixed(2));
    set('fmGastosTotal', '$' + tg.toFixed(2));
  }

  function _refreshUI() {
    _refreshLista('ventas',   'ingreso');
    _refreshLista('facturas', 'egreso');
    _refreshLista('gastos',   'egreso');
    _refreshProyeccion();
  }

  // ══════════════════════════════════════════════════════════════════════
  //  6. REEMPLAZAR _fmEliminarMovimiento  (llamada desde onclick ✅)
  //
  //  Flujo:
  //  1. Pedir Supabase (estado actual real)
  //  2. Filtrar el item borrado
  //  3. Escribir resultado en Supabase
  //  4. Actualizar UI local
  //  → Teléfono B lo verá en el próximo poll (20s)
  // ══════════════════════════════════════════════════════════════════════

  window._fmEliminarMovimiento = async function (tipo, id) {
    if (!confirm('¿Eliminar este registro?')) return;

    const letraEste = _getLetraLocal() || '?';

    try {
      let datos;

      if (navigator.onLine) {
        // ── CON INTERNET: leer estado actual de Supabase ──────────────
        // MUY IMPORTANTE: no usar _fmDatos local, leer de Supabase
        // para no borrar items que otro teléfono agregó mientras tanto
        datos = await _sbLeer(_mes());
        if (!datos) datos = _datoBase();
      } else {
        // ── SIN INTERNET: usar caché local ────────────────────────────
        datos = await _localLeer(_mes());
        if (!datos) datos = _datoBase();
      }

      // Verificar que el item existe antes de borrar
      const existia = (datos[tipo] || []).some(i => i.id === id);
      if (!existia) {
        if (typeof toast === 'function') toast('El registro ya fue eliminado', false);
        // Actualizar UI de todas formas para que quede consistente
        if (typeof _fmDatos !== 'undefined') {
          _fmDatos[tipo] = (datos[tipo] || []);
        }
        _refreshUI();
        return;
      }

      // Filtrar el item
      datos[tipo] = (datos[tipo] || []).filter(i => i.id !== id);

      // Escribir (Supabase si hay internet, local si no)
      await _escribir(_mes(), datos);

      if (typeof toast === 'function') toast('✓ Eliminado (dispositivo ' + letraEste + ')');
      _refreshUI();

    } catch(e) {
      console.error('[FM-Fix] Error eliminando:', e.message);
      if (typeof toast === 'function') toast('Error al eliminar: ' + e.message, true);
    }
  };

  // ══════════════════════════════════════════════════════════════════════
  //  7. REEMPLAZAR _fmAgregarMovimiento  (llamada desde onclick ✅)
  //
  //  Flujo:
  //  1. Pedir Supabase (estado actual real) — para no perder items de otros
  //  2. Agregar el nuevo item
  //  3. Escribir resultado en Supabase
  //  4. Actualizar UI local
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

    const letraEste = _getLetraLocal() || '?';

    try {
      let datos;

      if (navigator.onLine) {
        // Leer de Supabase para incluir cambios de otros dispositivos
        datos = await _sbLeer(_mes());
        if (!datos) datos = _datoBase();
      } else {
        datos = await _localLeer(_mes());
        if (!datos) datos = _datoBase();
      }

      // Agregar el nuevo item con ID único
      const id = tipo + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      datos[tipo] = datos[tipo] || [];
      datos[tipo].push({ id, fecha, monto, nota });

      // Escribir
      await _escribir(_mes(), datos);

      // Limpiar inputs
      const mel = document.getElementById(montoId); if (mel) mel.value = '';
      const nel = document.getElementById(notaId);  if (nel) nel.value = '';

      if (typeof toast === 'function') toast('✓ Registrado (dispositivo ' + letraEste + ')');
      _refreshUI();

    } catch(e) {
      console.error('[FM-Fix] Error agregando:', e.message);
      if (typeof toast === 'function') toast('Error al guardar: ' + e.message, true);
    }
  };

  // ══════════════════════════════════════════════════════════════════════
  //  8. PARCHEAR renderFinanzasMes — arrancar polling + sync inmediato
  // ══════════════════════════════════════════════════════════════════════

  const _renderOrig = window.renderFinanzasMes;

  window.renderFinanzasMes = async function (pgId) {
    // Registrar dispositivo si aún no tiene letra
    if (!_getLetraLocal()) {
      _registrarDispositivo(); // async, no bloquear
    } else {
      _mostrarBadgeDispositivo(_getLetraLocal());
    }

    // Llamar render original
    if (typeof _renderOrig === 'function') await _renderOrig(pgId);

    // Después del render, sincronizar con Supabase inmediatamente
    // (el render original carga desde Supabase o local, pero hacemos una
    //  segunda pasada para refrescar si hubo cambios recientes)
    if (navigator.onLine) {
      const datos = await _sbLeer(_mes());
      if (datos && typeof _fmDatos !== 'undefined') {
        // Reemplazar completamente con la versión de Supabase
        Object.assign(_fmDatos, datos);
        await _localEscribir(_mes(), datos);
        _refreshUI();
      }
    }

    // Arrancar polling
    _startPoll();
    // Poll inmediato para registrar el timestamp actual
    await _poll();
  };

  // ── Pausar/reanudar con visibilidad del documento ────────────────────
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      _startPoll();
      setTimeout(_poll, 500); // check inmediato al volver al app
    } else {
      _stopPoll();
    }
  });

  // ── Detener polling al navegar fuera de finanzas ─────────────────────
  ['mostrarPagina','irA','mostrarTab','switchPage','abrirPagina','renderPagina'].forEach(fn => {
    const orig = window[fn];
    if (typeof orig !== 'function') return;
    window[fn] = function (...args) {
      const dest = String(args[0] || '').toLowerCase();
      if (dest.includes('finanz')) {
        _startPoll();
      } else {
        _stopPoll();
      }
      return orig.apply(this, args);
    };
  });

  // ══════════════════════════════════════════════════════════════════════
  //  9. ARRANQUE — registrar dispositivo al cargar la página
  // ══════════════════════════════════════════════════════════════════════

  // Esperar a que supabase_sync.js haya inicializado la sesión
  function _intentarRegistro(intentos) {
    if (!_tid()) {
      if (intentos < 20) {
        setTimeout(() => _intentarRegistro(intentos + 1), 500);
      }
      return;
    }
    _registrarDispositivo();
  }

  setTimeout(() => _intentarRegistro(0), 1500);

  // ══════════════════════════════════════════════════════════════════════
  //  10. SQL NECESARIO EN SUPABASE
  //  Ejecutar una sola vez en el Editor SQL de Supabase:
  //
  //  ALTER TABLE finanzas_mes
  //    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  //
  //  CREATE INDEX IF NOT EXISTS idx_fm_tienda_mes
  //    ON finanzas_mes(tienda_id, mes);
  // ══════════════════════════════════════════════════════════════════════

  console.log('[FM-Fix] ✅ v3 cargado — Supabase como fuente única + letras + polling 20s');

})();
