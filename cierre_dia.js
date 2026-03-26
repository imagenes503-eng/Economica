// =====================================================================
//  📋 CIERRE DIARIO DE CAJA — Despensa Económica
//
//  Permite registrar y enviar a Supabase el reporte diario:
//  - Venta total del día
//  - Desglose: billetes, monedas de dólar, coras
//  - Gastos pagados ese día (alquiler, facturas, otros)
//  - Cambios/vueltos entregados
//  - Saldo en caja acumulado
//  - Deudas pendientes (lo que se les debe a clientes/proveedores)
//  - Resumen final de monedas separadas
//
//  Tabla Supabase: cierre_diario
//  Columnas: id, tienda_id, fecha, datos (JSON), created_at
// =====================================================================

(function _inyectarEstilosCierre() {
  if (document.getElementById('cierreDiaStyles')) return;
  const s = document.createElement('style');
  s.id = 'cierreDiaStyles';
  s.textContent = `
    /* ══ Página Cierre Diario ══ */
    #pgCierreDia { padding: 0 0 80px; }

    /* Hero */
    .cd-hero {
      background: linear-gradient(135deg, #0c4a6e 0%, #075985 50%, #0369a1 100%);
      padding: 20px 18px 16px;
      margin-bottom: 16px;
    }
    .cd-hero-top {
      display: flex; align-items: center; justify-content: space-between;
      gap: 10px; flex-wrap: wrap; margin-bottom: 12px;
    }
    .cd-hero-title {
      font-size: 18px; font-weight: 900; color: #fff;
      font-family: Nunito, sans-serif; display: flex; align-items: center; gap: 8px;
    }
    .cd-hero-fecha { font-size: 12px; font-weight: 900; color: rgba(255,255,255,0.7); font-family: Nunito, sans-serif; }
    .cd-fecha-inp {
      padding: 6px 10px; background: rgba(255,255,255,0.12);
      border: 1.5px solid rgba(255,255,255,0.25); border-radius: 9px;
      color: #fff; font-size: 13px; font-weight: 900; font-family: Nunito, sans-serif;
      cursor: pointer; outline: none;
    }
    .cd-fecha-inp::-webkit-calendar-picker-indicator { filter: invert(1); }

    /* Stats hero */
    .cd-hero-stats {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
    }
    .cd-hstat {
      background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.18);
      border-radius: 12px; padding: 10px 12px; backdrop-filter: blur(6px);
    }
    .cd-hstat-lbl { font-size: 10px; font-weight: 900; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 0.4px; font-family: Nunito, sans-serif; margin-bottom: 3px; }
    .cd-hstat-val { font-size: 18px; font-weight: 900; color: #fff; font-family: Nunito, sans-serif; line-height: 1; }

    /* Body */
    .cd-body { padding: 0 14px; display: flex; flex-direction: column; gap: 16px; }

    /* Panel */
    .cd-panel {
      background: var(--surface2); border: 1.5px solid var(--border);
      border-radius: 16px; overflow: hidden;
    }
    .cd-panel-header {
      display: flex; align-items: center; gap: 9px; padding: 12px 16px;
      border-bottom: 1px solid var(--border); background: var(--surface);
    }
    .cd-panel-icon {
      width: 30px; height: 30px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0;
    }
    .cd-panel-title { font-size: 13px; font-weight: 900; color: var(--text); font-family: Nunito, sans-serif; flex: 1; }
    .cd-panel-body { padding: 14px 16px; }

    /* Inputs */
    .cd-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .cd-grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
    @media (max-width: 400px) { .cd-grid3 { grid-template-columns: 1fr 1fr; } }
    .cd-field label {
      display: block; font-size: 10px; font-weight: 900; color: var(--text-muted);
      text-transform: uppercase; letter-spacing: 0.4px; font-family: Nunito, sans-serif; margin-bottom: 4px;
    }
    .cd-inp {
      width: 100%; padding: 10px 12px; border: 1.5px solid var(--border);
      border-radius: 10px; font-size: 14px; font-weight: 900; font-family: Nunito, sans-serif;
      color: var(--text); background: var(--surface); box-sizing: border-box; outline: none; transition: border-color 0.2s;
    }
    .cd-inp:focus { border-color: #0369a1; background: #fff; }
    .cd-inp.big { font-size: 20px; padding: 12px 14px; }

    /* Total row */
    .cd-total-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 12px; background: #f0f9ff; border-radius: 0 0 12px 12px;
      font-family: Nunito, sans-serif; margin-top: 12px;
    }
    .cd-total-row span:first-child { font-size: 12px; font-weight: 900; color: #0369a1; }
    .cd-total-row span:last-child  { font-size: 17px; font-weight: 900; color: #0369a1; }

    /* Lista de gastos/deudas */
    .cd-item-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
    .cd-item-row {
      display: grid; grid-template-columns: 1fr auto auto; gap: 8px; align-items: center;
      background: var(--surface); border: 1px solid var(--border); border-radius: 9px; padding: 8px 10px;
    }
    .cd-item-desc { font-size: 12px; font-weight: 900; color: var(--text); font-family: Nunito, sans-serif; }
    .cd-item-monto { font-size: 13px; font-weight: 900; font-family: Nunito, sans-serif; white-space: nowrap; }
    .cd-item-monto.neg { color: #dc2626; }
    .cd-item-monto.pos { color: #16a34a; }
    .cd-item-del { background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: 14px; padding: 2px 5px; border-radius: 5px; }
    .cd-item-del:hover { background: rgba(220,38,38,0.1); color: #dc2626; }

    /* Add row form */
    .cd-add-row { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; align-items: end; }
    @media (max-width: 380px) { .cd-add-row { grid-template-columns: 1fr 1fr; } }
    .cd-btn-add {
      padding: 10px 14px; background: #0369a1; color: #fff; border: none;
      border-radius: 10px; font-size: 12px; font-weight: 900; font-family: Nunito, sans-serif;
      cursor: pointer; white-space: nowrap; transition: all 0.15s;
    }
    .cd-btn-add:hover { background: #075985; }

    /* Resumen final */
    .cd-resumen {
      border-radius: 14px; padding: 16px; font-family: Nunito, sans-serif; border: 1.5px solid;
    }
    .cd-resumen.ok     { background: #f0fdf4; border-color: #bbf7d0; }
    .cd-resumen.warn   { background: #fffbeb; border-color: #fde68a; }
    .cd-resumen.normal { background: #f0f9ff; border-color: #bae6fd; }
    .cd-res-title { font-size: 14px; font-weight: 900; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
    .cd-res-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
    .cd-res-item { display: flex; flex-direction: column; gap: 2px; }
    .cd-res-lbl { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.4px; opacity: 0.6; }
    .cd-res-val { font-size: 16px; font-weight: 900; }

    /* Botón guardar/enviar */
    .btn-cd-guardar {
      width: 100%; padding: 14px; background: linear-gradient(135deg, #0369a1, #075985);
      color: #fff; border: none; border-radius: 13px; font-size: 15px; font-weight: 900;
      font-family: Nunito, sans-serif; cursor: pointer; box-shadow: 0 4px 14px rgba(3,105,161,0.35);
      transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .btn-cd-guardar:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(3,105,161,0.45); }
    .btn-cd-guardar:disabled { opacity: 0.6; cursor: wait; transform: none; }

    /* Historial de cierres */
    .cd-hist-item {
      padding: 10px 14px; border-bottom: 1px solid var(--border);
      display: flex; align-items: center; gap: 12px; cursor: pointer; transition: background 0.15s;
    }
    .cd-hist-item:hover { background: #f0f9ff; }
    .cd-hist-item:last-child { border-bottom: none; }
    .cd-hist-fecha { font-size: 13px; font-weight: 900; color: var(--text); font-family: Nunito, sans-serif; min-width: 90px; }
    .cd-hist-venta { font-size: 14px; font-weight: 900; color: #0369a1; font-family: Nunito, sans-serif; }
    .cd-hist-meta  { font-size: 11px; color: var(--text-muted); font-weight: 700; font-family: Nunito, sans-serif; flex: 1; }
    .cd-hist-badge {
      font-size: 11px; font-weight: 900; font-family: Nunito, sans-serif;
      padding: 3px 9px; border-radius: 20px; background: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe;
    }
    .cd-hist-badge.enviado { background: #dcfce7; color: #15803d; border-color: #bbf7d0; }

    /* Nota final */
    .cd-nota-area {
      width: 100%; padding: 10px 12px; border: 1.5px solid var(--border); border-radius: 10px;
      font-size: 13px; font-weight: 700; font-family: Nunito, sans-serif; color: var(--text);
      background: var(--surface); box-sizing: border-box; outline: none; resize: vertical;
      min-height: 70px; transition: border-color 0.2s;
    }
    .cd-nota-area:focus { border-color: #0369a1; }
  `;
  document.head.appendChild(s);
})();

// ══ Estado del módulo ══════════════════════════════════════════════════
let _cdFecha = new Date().toISOString().split('T')[0];
let _cdGastos  = []; // [{ id, desc, monto }]
let _cdCambios = []; // [{ id, desc, monto }]
let _cdDeudas  = []; // [{ id, desc, monto }]
let _cdHistorial = []; // cierres guardados localmente

// ══ Helpers ════════════════════════════════════════════════════════════
function _cdFmtFecha(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  const dias = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const diaSem = dias[new Date(iso + 'T12:00:00').getDay()];
  return `${diaSem} ${d}/${m}/${y.slice(2)}`;
}
function _cdUID() { return 'cd_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5); }
function _cdSum(arr) { return arr.reduce((s, x) => s + Number(x.monto || 0), 0); }

// ══ Persistencia ═══════════════════════════════════════════════════════
async function _cdCargarHistorial() {
  try {
    const r = await idbGet('vpos_cierreDiario');
    _cdHistorial = r || [];
  } catch(e) { _cdHistorial = []; }
}
async function _cdGuardarHistorial() {
  try { await idbSet('vpos_cierreDiario', _cdHistorial); } catch(e) {}
}

async function _cdSubirSupabase(cierre) {
  if (typeof _sbPost !== 'function' || typeof _getTiendaId !== 'function') return false;
  try {
    await _sbPost('cierre_diario', {
      id: _getTiendaId() + '_' + cierre.fecha,
      tienda_id: _getTiendaId(),
      fecha: cierre.fecha,
      datos: JSON.stringify(cierre),
      updated_at: new Date().toISOString()
    }, true);
    return true;
  } catch(e) {
    console.warn('[CD] Error subiendo a Supabase:', e.message);
    return false;
  }
}

async function _cdCargarSupabase() {
  if (typeof _sbGet !== 'function' || typeof _getTiendaId !== 'function') return;
  try {
    const rows = await _sbGet('cierre_diario', {
      select: 'fecha,datos',
      tienda_id: 'eq.' + _getTiendaId(),
      order: 'fecha.desc',
      limit: 30
    });
    if (rows && rows.length) {
      _cdHistorial = rows.map(r => typeof r.datos === 'string' ? JSON.parse(r.datos) : r.datos);
    }
  } catch(e) {}
}

// ══ Render principal ════════════════════════════════════════════════════
async function renderCierreDia(pgId) {
  pgId = pgId || 'pgCierreDia';
  const pg = document.getElementById(pgId);
  if (!pg) return;

  await _cdCargarHistorial();
  // Intentar cargar desde Supabase (datos de todas las tiendas)
  await _cdCargarSupabase();

  // Autorellenar con datos del POS si es hoy
  const esHoy = _cdFecha === new Date().toISOString().split('T')[0];
  let ventasSugeridas = 0;
  if (esHoy && typeof totalReporte === 'function' && typeof ventasDia !== 'undefined') {
    ventasSugeridas = totalReporte(ventasDia);
  }

  pg.innerHTML = `
    <!-- HERO -->
    <div class="cd-hero">
      <div class="cd-hero-top">
        <div>
          <div class="cd-hero-title">📋 Cierre Diario de Caja</div>
          <div class="cd-hero-fecha" id="cdHeroFechaLbl">${_cdFmtFecha(_cdFecha)}</div>
        </div>
        <input type="date" class="cd-fecha-inp" id="cdFechaInput" value="${_cdFecha}"
          onchange="_cdCambiarFecha(this.value)">
      </div>
      <div class="cd-hero-stats">
        <div class="cd-hstat">
          <div class="cd-hstat-lbl">💵 Venta del Día</div>
          <div class="cd-hstat-val" id="cdStatVenta">$0.00</div>
        </div>
        <div class="cd-hstat">
          <div class="cd-hstat-lbl">📤 Gastos del Día</div>
          <div class="cd-hstat-val" id="cdStatGastos">$0.00</div>
        </div>
        <div class="cd-hstat">
          <div class="cd-hstat-lbl">🏦 Saldo Neto</div>
          <div class="cd-hstat-val" id="cdStatSaldo">$0.00</div>
        </div>
      </div>
    </div>

    <div class="cd-body">

      <!-- ── VENTA DEL DÍA ── -->
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#dbeafe;">💹</div>
          <div class="cd-panel-title">Venta Total del Día</div>
        </div>
        <div class="cd-panel-body">
          <div class="cd-field" style="margin-bottom:12px;">
            <label>Total vendido ($)</label>
            <input class="cd-inp big" type="number" id="cdVentaTotal" min="0" step="0.01"
              placeholder="0.00" value="${ventasSugeridas > 0 ? ventasSugeridas.toFixed(2) : ''}"
              oninput="_cdActualizarStats()">
            ${ventasSugeridas > 0 ? `<div style="font-size:11px;color:#0369a1;font-weight:700;margin-top:4px;">💡 Sugerido desde el POS de hoy: $${ventasSugeridas.toFixed(2)}</div>` : ''}
          </div>
          <div style="font-size:12px;font-weight:900;color:var(--text-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.4px;">Desglose del dinero recibido</div>
          <div class="cd-grid3" style="margin-bottom:4px;">
            <div class="cd-field">
              <label>💵 Billetes ($)</label>
              <input class="cd-inp" type="number" id="cdBilletes" min="0" step="0.01" placeholder="0.00" oninput="_cdActualizarStats()">
            </div>
            <div class="cd-field">
              <label>🪙 M. Dólar ($)</label>
              <input class="cd-inp" type="number" id="cdMonedas" min="0" step="0.01" placeholder="0.00" oninput="_cdActualizarStats()">
            </div>
            <div class="cd-field">
              <label>🔵 Coras ($)</label>
              <input class="cd-inp" type="number" id="cdCoras" min="0" step="0.01" placeholder="0.00" oninput="_cdActualizarStats()">
            </div>
          </div>
          <div class="cd-total-row" id="cdDesgloseTotalRow">
            <span>Suma desglose</span>
            <span id="cdDesgloseTotal">$0.00</span>
          </div>
        </div>
      </div>

      <!-- ── GASTOS DEL DÍA ── -->
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#fee2e2;">📤</div>
          <div class="cd-panel-title">Gastos / Pagos del Día</div>
        </div>
        <div class="cd-panel-body">
          <div class="cd-item-list" id="cdGastosList"></div>
          <div class="cd-add-row">
            <div class="cd-field">
              <label>Descripción</label>
              <input class="cd-inp" type="text" id="cdGastoDesc" placeholder="Ej: Alquiler, Pepsi, Luz…">
            </div>
            <div class="cd-field">
              <label>Monto ($)</label>
              <input class="cd-inp" type="number" id="cdGastoMonto" min="0" step="0.01" placeholder="0.00">
            </div>
            <button class="cd-btn-add" onclick="_cdAgregarItem('gastos')">➕ Agregar</button>
          </div>
          <div class="cd-total-row" style="background:#fef2f2;">
            <span style="color:#dc2626;">Total gastos del día</span>
            <span id="cdGastosTotal" style="color:#dc2626;">$0.00</span>
          </div>
        </div>
      </div>

      <!-- ── CAMBIOS / VUELTOS ENTREGADOS ── -->
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#fef3c7;">🔄</div>
          <div class="cd-panel-title">Cambios / Vueltos del Día</div>
        </div>
        <div class="cd-panel-body">
          <div class="cd-item-list" id="cdCambiosList"></div>
          <div class="cd-add-row">
            <div class="cd-field">
              <label>Descripción</label>
              <input class="cd-inp" type="text" id="cdCambioDesc" placeholder="Ej: $15 monedas dólar…">
            </div>
            <div class="cd-field">
              <label>Monto ($)</label>
              <input class="cd-inp" type="number" id="cdCambioMonto" min="0" step="0.01" placeholder="0.00">
            </div>
            <button class="cd-btn-add" onclick="_cdAgregarItem('cambios')">➕ Agregar</button>
          </div>
          <div class="cd-total-row" style="background:#fffbeb;">
            <span style="color:#b45309;">Total cambios entregados</span>
            <span id="cdCambiosTotal" style="color:#b45309;">$0.00</span>
          </div>
        </div>
      </div>

      <!-- ── SALDO EN CAJA (billetes que quedan) ── -->
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#dcfce7;">🏦</div>
          <div class="cd-panel-title">Saldo Acumulado en Caja</div>
        </div>
        <div class="cd-panel-body">
          <div class="cd-grid2">
            <div class="cd-field">
              <label>💵 Billetes en caja ($)</label>
              <input class="cd-inp" type="number" id="cdSaldoBilletes" min="0" step="0.01" placeholder="0.00" oninput="_cdActualizarStats()">
            </div>
            <div class="cd-field">
              <label>🪙 Monedas dólar ($)</label>
              <input class="cd-inp" type="number" id="cdSaldoMonedas" min="0" step="0.01" placeholder="0.00" oninput="_cdActualizarStats()">
            </div>
            <div class="cd-field">
              <label>🔵 Coras en caja ($)</label>
              <input class="cd-inp" type="number" id="cdSaldoCoras" min="0" step="0.01" placeholder="0.00" oninput="_cdActualizarStats()">
            </div>
            <div class="cd-field">
              <label>🏘 Alquiler acumulado ($)</label>
              <input class="cd-inp" type="number" id="cdAlquiler" min="0" step="0.01" placeholder="0.00" oninput="_cdActualizarStats()">
              <div style="font-size:10px;color:var(--text-muted);font-weight:700;margin-top:3px;">Dinero apartado para alquiler</div>
            </div>
          </div>
          <div class="cd-total-row" style="background:#f0fdf4;">
            <span style="color:#15803d;">Total en caja (billetes + monedas)</span>
            <span id="cdSaldoTotal" style="color:#15803d;">$0.00</span>
          </div>
        </div>
      </div>

      <!-- ── DEUDAS PENDIENTES ── -->
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#ede9fe;">📝</div>
          <div class="cd-panel-title">Pendientes / Deudas</div>
        </div>
        <div class="cd-panel-body">
          <div style="font-size:11px;color:var(--text-muted);font-weight:700;margin-bottom:8px;">Lo que le deben a ustedes o lo que ustedes deben</div>
          <div class="cd-item-list" id="cdDeudasList"></div>
          <div class="cd-add-row">
            <div class="cd-field">
              <label>Descripción</label>
              <input class="cd-inp" type="text" id="cdDeudaDesc" placeholder="Ej: 30 coras de Santiago…">
            </div>
            <div class="cd-field">
              <label>Monto ($)</label>
              <input class="cd-inp" type="number" id="cdDeudaMonto" min="0" step="0.01" placeholder="0.00">
            </div>
            <button class="cd-btn-add" onclick="_cdAgregarItem('deudas')">➕ Agregar</button>
          </div>
          <div class="cd-total-row" style="background:#faf5ff;">
            <span style="color:#7c3aed;">Total pendiente</span>
            <span id="cdDeudasTotal" style="color:#7c3aed;">$0.00</span>
          </div>
        </div>
      </div>

      <!-- ── MONEDAS SEPARADAS (resumen) ── -->
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#fef3c7;">🪙</div>
          <div class="cd-panel-title">Monedas Separadas (conteo final)</div>
        </div>
        <div class="cd-panel-body">
          <div class="cd-grid2">
            <div class="cd-field">
              <label>🪙 Total monedas dólar ($)</label>
              <input class="cd-inp" type="number" id="cdTotalMonedas" min="0" step="0.01" placeholder="0.00">
            </div>
            <div class="cd-field">
              <label>🔵 Total coras ($)</label>
              <input class="cd-inp" type="number" id="cdTotalCoras" min="0" step="0.01" placeholder="0.00">
            </div>
          </div>
        </div>
      </div>

      <!-- ── NOTA DEL DÍA ── -->
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#f0fdf4;">📝</div>
          <div class="cd-panel-title">Nota del Día (opcional)</div>
        </div>
        <div class="cd-panel-body">
          <textarea class="cd-nota-area" id="cdNota" placeholder="Observaciones del día, incidentes, comentarios…"></textarea>
        </div>
      </div>

      <!-- ── RESUMEN FINAL ── -->
      <div class="cd-resumen normal" id="cdResumenFinal">
        <div class="cd-res-title" style="color:#0369a1;">📊 Resumen del Cierre</div>
        <div class="cd-res-grid" id="cdResumenGrid">
          <div class="cd-res-item" style="color:#0369a1;"><span class="cd-res-lbl">Venta del día</span><span class="cd-res-val" id="cdRVenta">$0.00</span></div>
          <div class="cd-res-item" style="color:#dc2626;"><span class="cd-res-lbl">Total gastos</span><span class="cd-res-val" id="cdRGastos">$0.00</span></div>
          <div class="cd-res-item" style="color:#b45309;"><span class="cd-res-lbl">Cambios dados</span><span class="cd-res-val" id="cdRCambios">$0.00</span></div>
          <div class="cd-res-item" style="color:#15803d;"><span class="cd-res-lbl">Saldo neto</span><span class="cd-res-val" id="cdRSaldo">$0.00</span></div>
        </div>
        <button class="btn-cd-guardar" id="btnCdGuardar" onclick="_cdGuardarCierre()">
          💾 Guardar y enviar reporte
        </button>
      </div>

      <!-- ── HISTORIAL DE CIERRES ── -->
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#f0f9ff;">📅</div>
          <div class="cd-panel-title">Historial de Cierres</div>
          <button class="memb-refresh-btn" onclick="renderCierreDia()">🔄</button>
        </div>
        <div id="cdHistorialWrap">
          ${_cdRenderHistorial()}
        </div>
      </div>

    </div><!-- /cd-body -->
  `;

  _cdRenderListas();
  _cdActualizarStats();
}

// ── Render listas de items ────────────────────────────────────────────
function _cdRenderListas() {
  _cdRenderItemList('cdGastosList',  _cdGastos,  'gastos',  'neg');
  _cdRenderItemList('cdCambiosList', _cdCambios, 'cambios', 'neg');
  _cdRenderItemList('cdDeudasList',  _cdDeudas,  'deudas',  'pos');
  _cdActualizarTotalesListas();
}

function _cdRenderItemList(elId, arr, tipo, clsMonto) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (!arr.length) { el.innerHTML = `<div style="font-size:12px;color:var(--text-muted);font-weight:700;padding:4px 0;">Sin registros aún</div>`; return; }
  el.innerHTML = arr.map(item => `
    <div class="cd-item-row">
      <span class="cd-item-desc">${item.desc}</span>
      <span class="cd-item-monto ${clsMonto}">$${Number(item.monto).toFixed(2)}</span>
      <button class="cd-item-del" onclick="_cdEliminarItem('${tipo}','${item.id}')">✕</button>
    </div>`).join('');
}

function _cdActualizarTotalesListas() {
  const _st = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = '$' + v.toFixed(2); };
  _st('cdGastosTotal',  _cdSum(_cdGastos));
  _st('cdCambiosTotal', _cdSum(_cdCambios));
  _st('cdDeudasTotal',  _cdSum(_cdDeudas));
}

// ── Agregar / eliminar items ──────────────────────────────────────────
function _cdAgregarItem(tipo) {
  const descMap  = { gastos: 'cdGastoDesc',  cambios: 'cdCambioDesc',  deudas: 'cdDeudaDesc'  };
  const montoMap = { gastos: 'cdGastoMonto', cambios: 'cdCambioMonto', deudas: 'cdDeudaMonto' };
  const arrMap   = { gastos: _cdGastos, cambios: _cdCambios, deudas: _cdDeudas };

  const descEl  = document.getElementById(descMap[tipo]);
  const montoEl = document.getElementById(montoMap[tipo]);
  const desc  = descEl?.value?.trim();
  const monto = parseFloat(montoEl?.value || '0');

  if (!desc)    { if (typeof toast === 'function') toast('Escribe una descripción', true); return; }
  if (!monto || monto <= 0) { if (typeof toast === 'function') toast('Ingresa un monto válido', true); return; }

  arrMap[tipo].push({ id: _cdUID(), desc, monto });
  if (descEl)  descEl.value  = '';
  if (montoEl) montoEl.value = '';

  _cdRenderListas();
  _cdActualizarStats();
}

function _cdEliminarItem(tipo, id) {
  const arrMap = { gastos: _cdGastos, cambios: _cdCambios, deudas: _cdDeudas };
  if (!arrMap[tipo]) return;
  arrMap[tipo].splice(arrMap[tipo].findIndex(x => x.id === id), 1);
  _cdRenderListas();
  _cdActualizarStats();
}

// ── Actualizar stats del hero y resumen ───────────────────────────────
function _cdActualizarStats() {
  const venta    = parseFloat(document.getElementById('cdVentaTotal')?.value || '0') || 0;
  const billetes = parseFloat(document.getElementById('cdBilletes')?.value   || '0') || 0;
  const monedas  = parseFloat(document.getElementById('cdMonedas')?.value    || '0') || 0;
  const coras    = parseFloat(document.getElementById('cdCoras')?.value      || '0') || 0;
  const sBill    = parseFloat(document.getElementById('cdSaldoBilletes')?.value || '0') || 0;
  const sMon     = parseFloat(document.getElementById('cdSaldoMonedas')?.value  || '0') || 0;
  const sCoras   = parseFloat(document.getElementById('cdSaldoCoras')?.value    || '0') || 0;

  const totalGastos  = _cdSum(_cdGastos);
  const totalCambios = _cdSum(_cdCambios);
  const desgloseSum  = billetes + monedas + coras;
  const saldoTotal   = sBill + sMon + sCoras;
  const saldoNeto    = venta - totalGastos - totalCambios;

  const _st = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  _st('cdStatVenta',    '$' + venta.toFixed(2));
  _st('cdStatGastos',   '$' + totalGastos.toFixed(2));
  _st('cdStatSaldo',    '$' + saldoNeto.toFixed(2));
  _st('cdDesgloseTotal','$' + desgloseSum.toFixed(2));
  _st('cdSaldoTotal',   '$' + saldoTotal.toFixed(2));
  _st('cdRVenta',   '$' + venta.toFixed(2));
  _st('cdRGastos',  '$' + totalGastos.toFixed(2));
  _st('cdRCambios', '$' + totalCambios.toFixed(2));
  _st('cdRSaldo',   '$' + saldoNeto.toFixed(2));

  // Color del resumen
  const res = document.getElementById('cdResumenFinal');
  if (res) {
    res.className = 'cd-resumen ' + (saldoNeto > 0 ? 'ok' : saldoNeto < -10 ? 'warn' : 'normal');
  }
}

// ── Cambiar fecha ─────────────────────────────────────────────────────
function _cdCambiarFecha(fecha) {
  _cdFecha = fecha;
  const lbl = document.getElementById('cdHeroFechaLbl');
  if (lbl) lbl.textContent = _cdFmtFecha(fecha);
  // Limpiar listas al cambiar fecha
  _cdGastos = []; _cdCambios = []; _cdDeudas = [];
  // Intentar cargar cierre existente de esa fecha
  const existente = _cdHistorial.find(c => c.fecha === fecha);
  if (existente) _cdCargarCierreEnForm(existente);
  else { _cdRenderListas(); _cdActualizarStats(); }
}

function _cdCargarCierreEnForm(cierre) {
  _cdGastos  = (cierre.gastos  || []).map(x => ({...x, id: x.id || _cdUID()}));
  _cdCambios = (cierre.cambios || []).map(x => ({...x, id: x.id || _cdUID()}));
  _cdDeudas  = (cierre.deudas  || []).map(x => ({...x, id: x.id || _cdUID()}));
  const _sv = (id, v) => { const e = document.getElementById(id); if (e && v != null) e.value = v; };
  _sv('cdVentaTotal',    cierre.ventaTotal);
  _sv('cdBilletes',      cierre.billetes);
  _sv('cdMonedas',       cierre.monedas);
  _sv('cdCoras',         cierre.coras);
  _sv('cdSaldoBilletes', cierre.saldoBilletes);
  _sv('cdSaldoMonedas',  cierre.saldoMonedas);
  _sv('cdSaldoCoras',    cierre.saldoCoras);
  _sv('cdAlquiler',      cierre.alquiler);
  _sv('cdTotalMonedas',  cierre.totalMonedas);
  _sv('cdTotalCoras',    cierre.totalCorasConteo);
  _sv('cdNota',          cierre.nota);
  _cdRenderListas();
  _cdActualizarStats();
  if (typeof toast === 'function') toast('📂 Cierre del ' + _cdFmtFecha(cierre.fecha) + ' cargado');
}

// ── Guardar cierre ────────────────────────────────────────────────────
async function _cdGuardarCierre() {
  const venta = parseFloat(document.getElementById('cdVentaTotal')?.value || '0') || 0;
  if (!venta && !_cdGastos.length) {
    if (typeof toast === 'function') toast('Ingresa al menos la venta del día', true);
    return;
  }

  const btn = document.getElementById('btnCdGuardar');
  if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Guardando…'; }

  const cierre = {
    id:              (_getTiendaId ? _getTiendaId() : 'local') + '_' + _cdFecha,
    tienda_id:       typeof _getTiendaId === 'function' ? _getTiendaId() : '',
    fecha:           _cdFecha,
    fechaLabel:      _cdFmtFecha(_cdFecha),
    ventaTotal:      venta,
    billetes:        parseFloat(document.getElementById('cdBilletes')?.value   || '0') || 0,
    monedas:         parseFloat(document.getElementById('cdMonedas')?.value    || '0') || 0,
    coras:           parseFloat(document.getElementById('cdCoras')?.value      || '0') || 0,
    gastos:          [..._cdGastos],
    cambios:         [..._cdCambios],
    deudas:          [..._cdDeudas],
    saldoBilletes:   parseFloat(document.getElementById('cdSaldoBilletes')?.value || '0') || 0,
    saldoMonedas:    parseFloat(document.getElementById('cdSaldoMonedas')?.value  || '0') || 0,
    saldoCoras:      parseFloat(document.getElementById('cdSaldoCoras')?.value    || '0') || 0,
    alquiler:        parseFloat(document.getElementById('cdAlquiler')?.value      || '0') || 0,
    totalMonedas:    parseFloat(document.getElementById('cdTotalMonedas')?.value  || '0') || 0,
    totalCorasConteo:parseFloat(document.getElementById('cdTotalCoras')?.value    || '0') || 0,
    nota:            document.getElementById('cdNota')?.value?.trim() || '',
    totalGastos:     _cdSum(_cdGastos),
    totalCambios:    _cdSum(_cdCambios),
    totalDeudas:     _cdSum(_cdDeudas),
    saldoNeto:       venta - _cdSum(_cdGastos) - _cdSum(_cdCambios),
    creadoPor:       typeof _usuarioActual !== 'undefined' ? (_usuarioActual?.nombre || _usuarioActual?.email || '—') : '—',
    creadoEn:        new Date().toISOString(),
    enviado:         false,
  };

  // Guardar local
  const idx = _cdHistorial.findIndex(c => c.fecha === _cdFecha);
  if (idx >= 0) _cdHistorial[idx] = cierre;
  else _cdHistorial.unshift(cierre);
  await _cdGuardarHistorial();

  // Subir a Supabase
  const subido = await _cdSubirSupabase(cierre);
  cierre.enviado = subido;
  if (idx >= 0) _cdHistorial[idx] = cierre;
  else if (_cdHistorial[0]) _cdHistorial[0] = cierre;
  await _cdGuardarHistorial();

  if (typeof toast === 'function') {
    toast(subido ? '✅ Cierre guardado y enviado al administrador' : '💾 Cierre guardado localmente (sin conexión)', !subido);
  }

  if (typeof _registrarAccion === 'function') {
    _registrarAccion('cierre_diario', `Venta: $${venta.toFixed(2)} | Gastos: $${cierre.totalGastos.toFixed(2)} | Fecha: ${_cdFecha}`);
  }

  // Actualizar historial en pantalla
  const histWrap = document.getElementById('cdHistorialWrap');
  if (histWrap) histWrap.innerHTML = _cdRenderHistorial();

  if (btn) { btn.disabled = false; btn.innerHTML = '💾 Guardar y enviar reporte'; }
}

// ── Render historial ──────────────────────────────────────────────────
function _cdRenderHistorial() {
  if (!_cdHistorial.length) {
    return `<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;font-weight:700;">Sin cierres registrados</div>`;
  }
  const sorted = [..._cdHistorial].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 15);
  return sorted.map(c => `
    <div class="cd-hist-item" onclick="_cdCambiarFechaYCargar('${c.fecha}')">
      <div>
        <div class="cd-hist-fecha">${_cdFmtFecha(c.fecha)}</div>
        <div class="cd-hist-meta">Gastos: $${(c.totalGastos||0).toFixed(2)} · Por: ${c.creadoPor||'—'}</div>
      </div>
      <div class="cd-hist-venta">$${(c.ventaTotal||0).toFixed(2)}</div>
      <span class="cd-hist-badge ${c.enviado ? 'enviado' : ''}">${c.enviado ? '☁ Enviado' : '📱 Local'}</span>
    </div>`).join('');
}

function _cdCambiarFechaYCargar(fecha) {
  _cdFecha = fecha;
  const inp = document.getElementById('cdFechaInput');
  if (inp) inp.value = fecha;
  _cdCambiarFecha(fecha);
}

// ── Exponer globalmente ───────────────────────────────────────────────
window.renderCierreDia         = renderCierreDia;
window._cdAgregarItem          = _cdAgregarItem;
window._cdEliminarItem         = _cdEliminarItem;
window._cdActualizarStats      = _cdActualizarStats;
window._cdCambiarFecha         = _cdCambiarFecha;
window._cdCambiarFechaYCargar  = _cdCambiarFechaYCargar;
window._cdGuardarCierre        = _cdGuardarCierre;
