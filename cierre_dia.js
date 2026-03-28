// =====================================================================
//  📋 CIERRE DIARIO DE CAJA — v3
// =====================================================================
(function _inyectarEstilosCierre() {
  if (document.getElementById('cierreDiaStyles')) return;
  const s = document.createElement('style');
  s.id = 'cierreDiaStyles';
  s.textContent = `
    #pgCierreDia { padding: 0 0 100px; }
    .cd-hero { background:linear-gradient(135deg,#0c4a6e 0%,#075985 50%,#0369a1 100%); padding:20px 18px 16px; margin-bottom:16px; }
    .cd-hero-top { display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px; }
    .cd-hero-title { font-size:18px;font-weight:900;color:#fff;font-family:Nunito,sans-serif;display:flex;align-items:center;gap:8px; }
    .cd-hero-fecha { font-size:12px;font-weight:900;color:rgba(255,255,255,0.7);font-family:Nunito,sans-serif; }
    .cd-fecha-inp { padding:6px 10px;background:rgba(255,255,255,0.12);border:1.5px solid rgba(255,255,255,0.25);border-radius:9px;color:#fff;font-size:13px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;outline:none; }
    .cd-fecha-inp::-webkit-calendar-picker-indicator { filter:invert(1); }
    .cd-hero-stats { display:grid;grid-template-columns:repeat(3,1fr);gap:8px; }
    .cd-hstat { background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.18);border-radius:12px;padding:10px 12px;backdrop-filter:blur(6px); }
    .cd-hstat-lbl { font-size:10px;font-weight:900;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.4px;font-family:Nunito,sans-serif;margin-bottom:3px; }
    .cd-hstat-val { font-size:17px;font-weight:900;color:#fff;font-family:Nunito,sans-serif;line-height:1; }
    .cd-body { padding:0 14px;display:flex;flex-direction:column;gap:16px; }
    .cd-panel { background:var(--surface2);border:1.5px solid var(--border);border-radius:16px;overflow:hidden; }
    .cd-panel-header { display:flex;align-items:center;gap:9px;padding:12px 16px;border-bottom:1px solid var(--border);background:var(--surface); }
    .cd-panel-icon { width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0; }
    .cd-panel-title { font-size:13px;font-weight:900;color:var(--text);font-family:Nunito,sans-serif;flex:1; }
    .cd-panel-body { padding:14px 16px; }
    .cd-montos-grid { display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:4px; }
    @media(min-width:480px){ .cd-montos-grid { grid-template-columns:repeat(3,1fr); } }
    .cd-field label { display:block;font-size:10px;font-weight:900;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.4px;font-family:Nunito,sans-serif;margin-bottom:4px; }
    .cd-inp { width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:14px;font-weight:900;font-family:Nunito,sans-serif;color:var(--text);background:var(--surface);box-sizing:border-box;outline:none;transition:border-color 0.2s; }
    .cd-inp:focus { border-color:#0369a1;background:#fff; }
    .cd-inp.big { font-size:20px;padding:12px 14px; }
    .cd-total-row { display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#f0f9ff;border-radius:10px;font-family:Nunito,sans-serif;margin-top:12px; }
    .cd-total-row span:first-child { font-size:12px;font-weight:900;color:#0369a1; }
    .cd-total-row span:last-child  { font-size:17px;font-weight:900;color:#0369a1; }
    .cd-item-list { display:flex;flex-direction:column;gap:6px;margin-bottom:10px; }
    .cd-item-row { display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:8px 10px; }
    .cd-item-desc { font-size:12px;font-weight:900;color:var(--text);font-family:Nunito,sans-serif; }
    .cd-item-monto { font-size:13px;font-weight:900;font-family:Nunito,sans-serif;white-space:nowrap; }
    .cd-item-monto.neg { color:#dc2626; }
    .cd-item-del { background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:14px;padding:2px 5px;border-radius:5px; }
    .cd-item-del:hover { background:rgba(220,38,38,0.1);color:#dc2626; }
    .cd-add-row { display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:end; }
    .cd-btn-add { padding:10px 14px;background:#0369a1;color:#fff;border:none;border-radius:10px;font-size:12px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;white-space:nowrap;transition:all 0.15s; }
    .cd-btn-add:hover { background:#075985; }
    .cd-sep { font-size:10px;font-weight:900;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;margin-top:14px; }

    /* Resumen captura */
    .cd-resumen-captura { background:#fff;border:2.5px solid #0369a1;border-radius:16px;padding:18px;font-family:Nunito,sans-serif; }
    .cd-cap-title { font-size:17px;font-weight:900;color:#0c4a6e;margin-bottom:4px;text-align:center; }
    .cd-cap-fecha { font-size:12px;font-weight:700;color:#0369a1;text-align:center;margin-bottom:14px; }
    .cd-cap-section { margin-bottom:12px; }
    .cd-cap-section-title { font-size:11px;font-weight:900;color:#0369a1;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1.5px solid #bae6fd;padding-bottom:4px;margin-bottom:6px; }
    .cd-cap-row { display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:700;color:var(--text);padding:3px 0; }
    .cd-cap-row.total { font-size:15px;font-weight:900;border-top:1.5px solid #bae6fd;margin-top:4px;padding-top:6px; }
    .cd-cap-row.grand-total { font-size:16px;font-weight:900;color:#0c4a6e;background:#e0f2fe;border-radius:8px;padding:8px 10px;margin-top:6px; }
    .val-pos { color:#15803d; } .val-neg { color:#dc2626; } .val-warn { color:#b45309; }
    .val-blue { color:#0369a1; } .val-purple { color:#7c3aed; }
    .cd-cap-divider { height:1.5px;background:#e0f2fe;margin:10px 0; }

    .btn-cd-guardar { width:100%;padding:14px;background:linear-gradient(135deg,#0369a1,#075985);color:#fff;border:none;border-radius:13px;font-size:15px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(3,105,161,0.35);transition:all 0.15s;display:flex;align-items:center;justify-content:center;gap:8px; }
    .btn-cd-guardar:hover { transform:translateY(-1px); }
    .btn-cd-guardar:disabled { opacity:0.6;cursor:wait;transform:none; }
    .btn-cd-captura { width:100%;padding:13px;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;border:none;border-radius:13px;font-size:14px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(22,163,74,0.3);transition:all 0.15s;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:10px; }
    .btn-cd-captura:hover { transform:translateY(-1px); }

    .cd-hist-item { padding:10px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;cursor:pointer;transition:background 0.15s; }
    .cd-hist-item:hover { background:#f0f9ff; }
    .cd-hist-item:last-child { border-bottom:none; }
    .cd-hist-fecha { font-size:13px;font-weight:900;color:var(--text);font-family:Nunito,sans-serif;min-width:90px; }
    .cd-hist-venta { font-size:14px;font-weight:900;color:#0369a1;font-family:Nunito,sans-serif; }
    .cd-hist-meta  { font-size:11px;color:var(--text-muted);font-weight:700;font-family:Nunito,sans-serif;flex:1; }
    .cd-hist-badge { font-size:11px;font-weight:900;font-family:Nunito,sans-serif;padding:3px 9px;border-radius:20px;background:#dbeafe;color:#1d4ed8;border:1px solid #bfdbfe; }
    .cd-hist-badge.enviado { background:#dcfce7;color:#15803d;border-color:#bbf7d0; }
    .cd-nota-area { width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;font-weight:700;font-family:Nunito,sans-serif;color:var(--text);background:var(--surface);box-sizing:border-box;outline:none;resize:vertical;min-height:70px; }
    .cd-nota-area:focus { border-color:#0369a1; }
  `;
  document.head.appendChild(s);
})();

// ══ Estado ══════════════════════════════════════════════════════════════
let _cdFecha     = new Date().toISOString().split('T')[0];
let _cdGastos    = [];
let _cdDeudas    = [];
let _cdHistorial = [];

// ══ Helpers ══════════════════════════════════════════════════════════════
function _cdFmtFecha(iso) {
  if (!iso) return '—';
  const [y,m,d] = iso.split('-');
  const dN = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  return `${dN[new Date(iso+'T12:00:00').getDay()]} ${d}/${m}/${y.slice(2)}`;
}
function _cdUID() { return 'cd_'+Date.now()+'_'+Math.random().toString(36).slice(2,5); }
function _cdV(id) { return parseFloat(document.getElementById(id)?.value||'0')||0; }
function _cdSet(id,v) { const e=document.getElementById(id); if(e&&v!=null) e.value=v; }
function _cdTxt(id,v) { const e=document.getElementById(id); if(e) e.textContent=v; }
function _cdSumArr(arr) { return arr.reduce((s,x)=>s+Number(x.monto||0),0); }
function _cdFmt(n) { return '$'+n.toFixed(2); }
function _cdLeerMontos(px) {
  return { billetes:_cdV(px+'Billetes'), monedas:_cdV(px+'Monedas'), coras:_cdV(px+'Coras'),
           c10:_cdV(px+'C10'), c05:_cdV(px+'C05'), c01:_cdV(px+'C01') };
}
function _cdTotalM(m) { return m.billetes+m.monedas+m.coras+m.c10+m.c05+m.c01; }

// ══ Persistencia ════════════════════════════════════════════════════════
async function _cdCargarHistorial() {
  try { const r=await idbGet('vpos_cierreDiario'); _cdHistorial=r||[]; } catch(e){ _cdHistorial=[]; }
}
async function _cdGuardarHistorial() {
  try { await idbSet('vpos_cierreDiario',_cdHistorial); } catch(e){}
}
async function _cdSubirSupabase(cierre) {
  if (typeof _sbPost!=='function'||typeof _getTiendaId!=='function') return false;
  try {
    await _sbPost('cierre_diario',{ id:_getTiendaId()+'_'+cierre.fecha, tienda_id:_getTiendaId(),
      fecha:cierre.fecha, datos:JSON.stringify(cierre), updated_at:new Date().toISOString() },true);
    return true;
  } catch(e){ console.warn('[CD]',e.message); return false; }
}
async function _cdCargarSupabase() {
  if (typeof _sbGet!=='function'||typeof _getTiendaId!=='function') return;
  try {
    const rows=await _sbGet('cierre_diario',{select:'fecha,datos',tienda_id:'eq.'+_getTiendaId(),order:'fecha.desc',limit:30});
    if (rows&&rows.length) _cdHistorial=rows.map(r=>typeof r.datos==='string'?JSON.parse(r.datos):r.datos);
  } catch(e){}
}

// ══ Bloque de inputs montos ══════════════════════════════════════════════
function _cdBloqueMontosHTML(px) {
  return `<div class="cd-montos-grid">
    <div class="cd-field"><label>💵 Billetes ($)</label><input class="cd-inp" type="number" id="${px}Billetes" min="0" step="0.01" placeholder="0.00" oninput="_cdActualizarStats()"></div>
    <div class="cd-field"><label>🪙 M. Dólar ($)</label><input class="cd-inp" type="number" id="${px}Monedas" min="0" step="0.01" placeholder="0.00" oninput="_cdActualizarStats()"></div>
    <div class="cd-field"><label>🔵 Coras ($)</label><input class="cd-inp" type="number" id="${px}Coras" min="0" step="0.01" placeholder="0.00" oninput="_cdActualizarStats()"></div>
    <div class="cd-field"><label>🟡 10 centavos ($)</label><input class="cd-inp" type="number" id="${px}C10" min="0" step="0.01" placeholder="0.00" oninput="_cdActualizarStats()"></div>
    <div class="cd-field"><label>🟤 5 centavos ($)</label><input class="cd-inp" type="number" id="${px}C05" min="0" step="0.01" placeholder="0.00" oninput="_cdActualizarStats()"></div>
    <div class="cd-field"><label>⚪ 1 centavo ($)</label><input class="cd-inp" type="number" id="${px}C01" min="0" step="0.01" placeholder="0.00" oninput="_cdActualizarStats()"></div>
  </div>`;
}

// ══ Render principal ════════════════════════════════════════════════════
async function renderCierreDia(pgId) {
  pgId = pgId||'pgCierreDia';
  const pg = document.getElementById(pgId);
  if (!pg) return;
  await _cdCargarHistorial();
  await _cdCargarSupabase();
  const esHoy = _cdFecha===new Date().toISOString().split('T')[0];
  let vSug=0;
  if (esHoy&&typeof totalReporte==='function'&&typeof ventasDia!=='undefined') vSug=totalReporte(ventasDia);

  pg.innerHTML = `
    <div class="cd-hero">
      <div class="cd-hero-top">
        <div>
          <div class="cd-hero-title">📋 Cierre Diario de Caja</div>
          <div class="cd-hero-fecha" id="cdHeroFechaLbl">${_cdFmtFecha(_cdFecha)}</div>
        </div>
        <input type="date" class="cd-fecha-inp" id="cdFechaInput" value="${_cdFecha}" onchange="_cdCambiarFecha(this.value)">
      </div>
      <div class="cd-hero-stats">
        <div class="cd-hstat"><div class="cd-hstat-lbl">💹 Venta del Día</div><div class="cd-hstat-val" id="cdStatVenta">$0.00</div></div>
        <div class="cd-hstat"><div class="cd-hstat-lbl">📤 Total Gastos</div><div class="cd-hstat-val" id="cdStatGastos">$0.00</div></div>
        <div class="cd-hstat"><div class="cd-hstat-lbl">🏦 Total en Caja</div><div class="cd-hstat-val" id="cdStatSaldo">$0.00</div></div>
      </div>
    </div>

    <div class="cd-body">

      <!-- VENTA DEL DÍA -->
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#dbeafe;">💹</div>
          <div class="cd-panel-title">Venta del Día</div>
        </div>
        <div class="cd-panel-body">
          <div class="cd-field" style="margin-bottom:12px;">
            <label>Total vendido ($)</label>
            <input class="cd-inp big" type="number" id="cdVentaTotal" min="0" step="0.01" placeholder="0.00"
              value="${vSug>0?vSug.toFixed(2):''}" oninput="_cdActualizarStats()">
            ${vSug>0?`<div style="font-size:11px;color:#0369a1;font-weight:700;margin-top:4px;">💡 Del POS de hoy: $${vSug.toFixed(2)}</div>`:''}
          </div>
          <div class="cd-sep">Desglose del dinero recibido</div>
          ${_cdBloqueMontosHTML('cdVenta')}
          <div class="cd-total-row"><span>Suma desglose venta</span><span id="cdVentaDesgloseTotal">$0.00</span></div>
        </div>
      </div>

      <!-- SALDO EN CAJA -->
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#dcfce7;">🏦</div>
          <div class="cd-panel-title">Saldo en Caja</div>
        </div>
        <div class="cd-panel-body">
          <div style="font-size:11px;color:var(--text-muted);font-weight:700;margin-bottom:10px;">Dinero acumulado en caja <strong>antes</strong> de sumar la venta de hoy</div>
          ${_cdBloqueMontosHTML('cdSaldo')}
          <div class="cd-field" style="margin-top:10px;">
            <label>🏘 Alquiler acumulado ($) — dinero apartado</label>
            <input class="cd-inp" type="number" id="cdAlquiler" min="0" step="0.01" placeholder="0.00" oninput="_cdActualizarStats()">
          </div>
          <div class="cd-total-row" style="background:#f0fdf4;"><span style="color:#15803d;">Total saldo previo en caja</span><span id="cdSaldoTotal" style="color:#15803d;">$0.00</span></div>
        </div>
      </div>

      <!-- GASTOS / PAGOS DEL DÍA - con desglose por denominación -->
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#fee2e2;">📤</div>
          <div class="cd-panel-title">Gastos / Pagos del Día</div>
        </div>
        <div class="cd-panel-body">
          <div class="cd-sep" style="margin-top:0;">Desglose de lo que salió de caja</div>
          ${_cdBloqueMontosHTML('cdGasto')}
          <div style="margin-top:12px;font-size:11px;font-weight:900;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:8px;">Detalle de pagos (opcional)</div>
          <div class="cd-item-list" id="cdGastosList"></div>
          <div class="cd-add-row">
            <div class="cd-field"><label>Descripción</label><input class="cd-inp" type="text" id="cdGastoDesc" placeholder="Ej: Alquiler, Pepsi, Luz…"></div>
            <div class="cd-field"><label>Monto ($)</label><input class="cd-inp" type="number" id="cdGastoMonto" min="0" step="0.01" placeholder="0.00"></div>
            <button class="cd-btn-add" onclick="_cdAgregarGasto()">➕</button>
          </div>
          <div class="cd-total-row" style="background:#fef2f2;"><span style="color:#dc2626;">Total gastos del día</span><span id="cdGastosTotal" style="color:#dc2626;">$0.00</span></div>
        </div>
      </div>

      <!-- CAMBIOS DEL DÍA -->
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#fef3c7;">🔄</div>
          <div class="cd-panel-title">Cambios del Día</div>
        </div>
        <div class="cd-panel-body">
          <div class="cd-sep" style="margin-top:0;">Monedas y billetes entregados de cambio</div>
          ${_cdBloqueMontosHTML('cdCambio')}
          <div class="cd-total-row" style="background:#fffbeb;"><span style="color:#b45309;">Total cambios entregados</span><span id="cdCambiosTotal" style="color:#b45309;">$0.00</span></div>
        </div>
      </div>

      <!-- PENDIENTES / DEUDAS -->
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#ede9fe;">📝</div>
          <div class="cd-panel-title">Pendientes / Deudas</div>
        </div>
        <div class="cd-panel-body">
          <div class="cd-item-list" id="cdDeudasList"></div>
          <div class="cd-add-row">
            <div class="cd-field"><label>Descripción</label><input class="cd-inp" type="text" id="cdDeudaDesc" placeholder="Ej: 30 coras de Santiago…"></div>
            <div class="cd-field"><label>Monto ($)</label><input class="cd-inp" type="number" id="cdDeudaMonto" min="0" step="0.01" placeholder="0.00"></div>
            <button class="cd-btn-add" onclick="_cdAgregarDeuda()">➕</button>
          </div>
          <div class="cd-total-row" style="background:#faf5ff;"><span style="color:#7c3aed;">Total pendiente</span><span id="cdDeudasTotal" style="color:#7c3aed;">$0.00</span></div>
        </div>
      </div>

      <!-- ESTO QUEDA EN EFECTIVO -->
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#fef3c7;">🪙</div>
          <div class="cd-panel-title">Esto Queda en Efectivo</div>
        </div>
        <div class="cd-panel-body">
          <div style="font-size:11px;color:var(--text-muted);font-weight:700;margin-bottom:10px;">Conteo físico final de todo lo que queda en caja al cerrar el día</div>
          ${_cdBloqueMontosHTML('cdQueda')}
          <div class="cd-total-row" style="background:#fffbeb;"><span style="color:#b45309;">Total físico en caja</span><span id="cdQuedaTotal" style="color:#b45309;">$0.00</span></div>
        </div>
      </div>

      <!-- NOTA -->
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#f0fdf4;">📝</div>
          <div class="cd-panel-title">Nota del Día (opcional)</div>
        </div>
        <div class="cd-panel-body">
          <textarea class="cd-nota-area" id="cdNota" placeholder="Observaciones del día…" oninput="_cdActualizarStats()"></textarea>
        </div>
      </div>

      <!-- RESUMEN PARA CAPTURA -->
      <div class="cd-resumen-captura" id="cdResumenCaptura">
        <div class="cd-cap-title">📋 CIERRE DE CAJA</div>
        <div class="cd-cap-fecha" id="cdCapFecha">${_cdFmtFecha(_cdFecha).toUpperCase()}</div>

        <!-- Venta del día -->
        <div class="cd-cap-section">
          <div class="cd-cap-section-title">💹 Venta del Día</div>
          <div class="cd-cap-row"><span>Total venta</span><span class="val-blue" id="capVentaTotal">$0.00</span></div>
          <div class="cd-cap-row"><span>  💵 Billetes</span><span id="capVBilletes">$0.00</span></div>
          <div class="cd-cap-row"><span>  🪙 M. Dólar</span><span id="capVMonedas">$0.00</span></div>
          <div class="cd-cap-row"><span>  🔵 Coras</span><span id="capVCoras">$0.00</span></div>
          <div class="cd-cap-row"><span>  🟡 10 centavos</span><span id="capVC10">$0.00</span></div>
          <div class="cd-cap-row"><span>  🟤 5 centavos</span><span id="capVC05">$0.00</span></div>
          <div class="cd-cap-row"><span>  ⚪ 1 centavo</span><span id="capVC01">$0.00</span></div>
        </div>

        <div class="cd-cap-divider"></div>

        <!-- Saldo antes de hoy -->
        <div class="cd-cap-section">
          <div class="cd-cap-section-title">🏦 Saldo en Caja (antes de hoy)</div>
          <div class="cd-cap-row"><span>  💵 Billetes</span><span id="capSBilletes">$0.00</span></div>
          <div class="cd-cap-row"><span>  🪙 M. Dólar</span><span id="capSMonedas">$0.00</span></div>
          <div class="cd-cap-row"><span>  🔵 Coras</span><span id="capSCoras">$0.00</span></div>
          <div class="cd-cap-row"><span>  🟡 10 centavos</span><span id="capSC10">$0.00</span></div>
          <div class="cd-cap-row"><span>  🟤 5 centavos</span><span id="capSC05">$0.00</span></div>
          <div class="cd-cap-row"><span>  ⚪ 1 centavo</span><span id="capSC01">$0.00</span></div>
          <div class="cd-cap-row"><span>  🏘 Alquiler apartado</span><span class="val-warn" id="capAlquiler">$0.00</span></div>
          <div class="cd-cap-row total"><span>Total saldo previo</span><span class="val-pos" id="capSaldoPrevio">$0.00</span></div>
        </div>

        <div class="cd-cap-divider"></div>

        <!-- Gastos del día -->
        <div class="cd-cap-section">
          <div class="cd-cap-section-title">📤 Gastos / Pagos del Día</div>
          <div class="cd-cap-row"><span>  💵 Billetes</span><span class="val-neg" id="capGBilletes">$0.00</span></div>
          <div class="cd-cap-row"><span>  🪙 M. Dólar</span><span class="val-neg" id="capGMonedas">$0.00</span></div>
          <div class="cd-cap-row"><span>  🔵 Coras</span><span class="val-neg" id="capGCoras">$0.00</span></div>
          <div class="cd-cap-row"><span>  🟡 10 centavos</span><span class="val-neg" id="capGC10">$0.00</span></div>
          <div class="cd-cap-row"><span>  🟤 5 centavos</span><span class="val-neg" id="capGC05">$0.00</span></div>
          <div class="cd-cap-row"><span>  ⚪ 1 centavo</span><span class="val-neg" id="capGC01">$0.00</span></div>
          <div id="capGastosDetalleList"></div>
          <div class="cd-cap-row total"><span>Total gastos</span><span class="val-neg" id="capGTotal">$0.00</span></div>
        </div>

        <div class="cd-cap-divider"></div>

        <!-- Cambios del día -->
        <div class="cd-cap-section">
          <div class="cd-cap-section-title">🔄 Cambios del Día</div>
          <div class="cd-cap-row"><span>  💵 Billetes</span><span id="capCBilletes">$0.00</span></div>
          <div class="cd-cap-row"><span>  🪙 M. Dólar</span><span id="capCMonedas">$0.00</span></div>
          <div class="cd-cap-row"><span>  🔵 Coras</span><span id="capCCoras">$0.00</span></div>
          <div class="cd-cap-row"><span>  🟡 10 centavos</span><span id="capCC10">$0.00</span></div>
          <div class="cd-cap-row"><span>  🟤 5 centavos</span><span id="capCC05">$0.00</span></div>
          <div class="cd-cap-row"><span>  ⚪ 1 centavo</span><span id="capCC01">$0.00</span></div>
          <div class="cd-cap-row total"><span>Total cambios</span><span class="val-warn" id="capCTotal">$0.00</span></div>
        </div>

        <div class="cd-cap-divider"></div>

        <!-- Pendientes -->
        <div class="cd-cap-section">
          <div class="cd-cap-section-title">📝 Pendientes / Deudas</div>
          <div id="capDeudasList"><div class="cd-cap-row"><span>Sin pendientes</span><span>—</span></div></div>
          <div class="cd-cap-row total"><span>Total pendiente</span><span class="val-purple" id="capDTotal">$0.00</span></div>
        </div>

        <div class="cd-cap-divider"></div>

        <!-- Esto queda -->
        <div class="cd-cap-section">
          <div class="cd-cap-section-title">🪙 Esto Queda en Efectivo</div>
          <div class="cd-cap-row"><span>  💵 Billetes</span><span id="capQBilletes">$0.00</span></div>
          <div class="cd-cap-row"><span>  🪙 M. Dólar</span><span id="capQMonedas">$0.00</span></div>
          <div class="cd-cap-row"><span>  🔵 Coras</span><span id="capQCoras">$0.00</span></div>
          <div class="cd-cap-row"><span>  🟡 10 centavos</span><span id="capQC10">$0.00</span></div>
          <div class="cd-cap-row"><span>  🟤 5 centavos</span><span id="capQC05">$0.00</span></div>
          <div class="cd-cap-row"><span>  ⚪ 1 centavo</span><span id="capQC01">$0.00</span></div>
          <div class="cd-cap-row total"><span>TOTAL FÍSICO EN CAJA</span><span class="val-pos" id="capQTotal">$0.00</span></div>
        </div>

        <!-- Total general -->
        <div class="cd-cap-row grand-total">
          <span>💰 TOTAL EN CAJA (saldo + venta − gastos − cambios)</span>
          <span id="capTotalGeneral">$0.00</span>
        </div>

        <div id="capNotaWrap" style="display:none;margin-top:10px;padding:10px;background:#f0f9ff;border-radius:8px;font-size:12px;font-weight:700;color:#0369a1;"></div>

        <button class="btn-cd-guardar" id="btnCdGuardar" onclick="_cdGuardarCierre()" style="margin-top:16px;">
          💾 Guardar y enviar reporte
        </button>
        <button class="btn-cd-captura" id="btnCdCaptura" onclick="_cdTomarCaptura()">
          📸 Descargar captura para WhatsApp
        </button>
      </div>

      <!-- HISTORIAL -->
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#f0f9ff;">📅</div>
          <div class="cd-panel-title">Historial de Cierres</div>
          <button class="memb-refresh-btn" onclick="renderCierreDia()">🔄</button>
        </div>
        <div id="cdHistorialWrap">${_cdRenderHistorial()}</div>
      </div>

    </div>
  `;
  _cdRenderListas();
  _cdActualizarStats();
}

// ══ Listas ═══════════════════════════════════════════════════════════════
function _cdRenderListas() {
  const gEl=document.getElementById('cdGastosList');
  if(gEl) gEl.innerHTML=_cdGastos.length
    ?_cdGastos.map(x=>`<div class="cd-item-row"><span class="cd-item-desc">${x.desc}</span><span class="cd-item-monto neg">$${Number(x.monto).toFixed(2)}</span><button class="cd-item-del" onclick="_cdEliminarGasto('${x.id}')">✕</button></div>`).join('')
    :`<div style="font-size:12px;color:var(--text-muted);font-weight:700;padding:4px 0;">Sin detalle de gastos</div>`;
  const dEl=document.getElementById('cdDeudasList');
  if(dEl) dEl.innerHTML=_cdDeudas.length
    ?_cdDeudas.map(x=>`<div class="cd-item-row"><span class="cd-item-desc">${x.desc}</span><span class="cd-item-monto" style="color:#7c3aed;">$${Number(x.monto).toFixed(2)}</span><button class="cd-item-del" onclick="_cdEliminarDeuda('${x.id}')">✕</button></div>`).join('')
    :`<div style="font-size:12px;color:var(--text-muted);font-weight:700;padding:4px 0;">Sin pendientes</div>`;
  _cdActualizarStats();
}

function _cdAgregarGasto() {
  const desc=document.getElementById('cdGastoDesc')?.value?.trim();
  const monto=parseFloat(document.getElementById('cdGastoMonto')?.value||'0');
  if(!desc){if(typeof toast==='function')toast('Escribe una descripción',true);return;}
  if(!monto||monto<=0){if(typeof toast==='function')toast('Monto inválido',true);return;}
  _cdGastos.push({id:_cdUID(),desc,monto});
  document.getElementById('cdGastoDesc').value='';
  document.getElementById('cdGastoMonto').value='';
  _cdRenderListas();
}
function _cdEliminarGasto(id){_cdGastos=_cdGastos.filter(x=>x.id!==id);_cdRenderListas();}
function _cdAgregarDeuda(){
  const desc=document.getElementById('cdDeudaDesc')?.value?.trim();
  const monto=parseFloat(document.getElementById('cdDeudaMonto')?.value||'0');
  if(!desc){if(typeof toast==='function')toast('Escribe una descripción',true);return;}
  if(!monto||monto<=0){if(typeof toast==='function')toast('Monto inválido',true);return;}
  _cdDeudas.push({id:_cdUID(),desc,monto});
  document.getElementById('cdDeudaDesc').value='';
  document.getElementById('cdDeudaMonto').value='';
  _cdRenderListas();
}
function _cdEliminarDeuda(id){_cdDeudas=_cdDeudas.filter(x=>x.id!==id);_cdRenderListas();}

// ══ Cálculos y actualización ═════════════════════════════════════════════
function _cdActualizarStats() {
  const ventaTotal=_cdV('cdVentaTotal');
  const V=_cdLeerMontos('cdVenta'), S=_cdLeerMontos('cdSaldo');
  const G=_cdLeerMontos('cdGasto'), C=_cdLeerMontos('cdCambio'), Q=_cdLeerMontos('cdQueda');
  const alquiler=_cdV('cdAlquiler');
  const totalGastosMontos=_cdTotalM(G);
  const totalGastosDetalle=_cdSumArr(_cdGastos);
  // Total gastos = lo que se sacó físicamente (por denominación)
  const totalGastos=totalGastosMontos || totalGastosDetalle;
  const totalDeudas=_cdSumArr(_cdDeudas);
  const totalCambios=_cdTotalM(C);
  const totalSaldoPrev=_cdTotalM(S)+alquiler;
  const totalQueda=_cdTotalM(Q);
  // Total en caja = saldo previo (sin alquiler) + venta - gastos - cambios
  const totalEnCaja=_cdTotalM(S)+ventaTotal-totalGastos-totalCambios;
  const $=_cdFmt;

  // Hero
  _cdTxt('cdStatVenta',$(ventaTotal));
  _cdTxt('cdStatGastos',$(totalGastos));
  _cdTxt('cdStatSaldo',$(totalEnCaja));

  // Totales secciones
  _cdTxt('cdVentaDesgloseTotal',$(_cdTotalM(V)));
  _cdTxt('cdSaldoTotal',$(totalSaldoPrev));
  _cdTxt('cdGastosTotal',$(totalGastos));
  _cdTxt('cdCambiosTotal',$(totalCambios));
  _cdTxt('cdDeudasTotal',$(totalDeudas));
  _cdTxt('cdQuedaTotal',$(totalQueda));

  // Resumen — Venta
  _cdTxt('capVentaTotal',$(ventaTotal));
  _cdTxt('capVBilletes',$(V.billetes));_cdTxt('capVMonedas',$(V.monedas));_cdTxt('capVCoras',$(V.coras));
  _cdTxt('capVC10',$(V.c10));_cdTxt('capVC05',$(V.c05));_cdTxt('capVC01',$(V.c01));

  // Resumen — Saldo previo
  _cdTxt('capSBilletes',$(S.billetes));_cdTxt('capSMonedas',$(S.monedas));_cdTxt('capSCoras',$(S.coras));
  _cdTxt('capSC10',$(S.c10));_cdTxt('capSC05',$(S.c05));_cdTxt('capSC01',$(S.c01));
  _cdTxt('capAlquiler',$(alquiler));
  _cdTxt('capSaldoPrevio',$(totalSaldoPrev));

  // Resumen — Gastos por denominación
  _cdTxt('capGBilletes',$(G.billetes));_cdTxt('capGMonedas',$(G.monedas));_cdTxt('capGCoras',$(G.coras));
  _cdTxt('capGC10',$(G.c10));_cdTxt('capGC05',$(G.c05));_cdTxt('capGC01',$(G.c01));
  const capGD=document.getElementById('capGastosDetalleList');
  if(capGD) capGD.innerHTML=_cdGastos.length
    ?_cdGastos.map(x=>`<div class="cd-cap-row"><span>  ${x.desc}</span><span class="val-neg">$${Number(x.monto).toFixed(2)}</span></div>`).join('')
    :'';
  _cdTxt('capGTotal',$(totalGastos));

  // Resumen — Cambios
  _cdTxt('capCBilletes',$(C.billetes));_cdTxt('capCMonedas',$(C.monedas));_cdTxt('capCCoras',$(C.coras));
  _cdTxt('capCC10',$(C.c10));_cdTxt('capCC05',$(C.c05));_cdTxt('capCC01',$(C.c01));
  _cdTxt('capCTotal',$(totalCambios));

  // Resumen — Deudas
  const capD=document.getElementById('capDeudasList');
  if(capD) capD.innerHTML=_cdDeudas.length
    ?_cdDeudas.map(x=>`<div class="cd-cap-row"><span>  ${x.desc}</span><span class="val-purple">$${Number(x.monto).toFixed(2)}</span></div>`).join('')
    :`<div class="cd-cap-row"><span>Sin pendientes</span><span>—</span></div>`;
  _cdTxt('capDTotal',$(totalDeudas));

  // Resumen — Queda
  _cdTxt('capQBilletes',$(Q.billetes));_cdTxt('capQMonedas',$(Q.monedas));_cdTxt('capQCoras',$(Q.coras));
  _cdTxt('capQC10',$(Q.c10));_cdTxt('capQC05',$(Q.c05));_cdTxt('capQC01',$(Q.c01));
  _cdTxt('capQTotal',$(totalQueda));

  // Gran total
  _cdTxt('capTotalGeneral',$(totalEnCaja));

  // Nota
  const notaWrap=document.getElementById('capNotaWrap');
  const notaTxt=document.getElementById('cdNota')?.value?.trim()||'';
  if(notaWrap){notaWrap.style.display=notaTxt?'block':'none';notaWrap.textContent='📝 '+notaTxt;}
}

// ══ Captura de pantalla ══════════════════════════════════════════════════
async function _cdTomarCaptura() {
  const el = document.getElementById('cdResumenCaptura');
  if (!el) return;
  const btn = document.getElementById('btnCdCaptura');
  if (btn) { btn.disabled=true; btn.innerHTML='⏳ Generando imagen…'; }
  try {
    // Cargar html2canvas dinámicamente si no está
    if (!window.html2canvas) {
      await new Promise((res,rej)=>{
        const sc=document.createElement('script');
        sc.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        sc.onload=res; sc.onerror=rej;
        document.head.appendChild(sc);
      });
    }
    const canvas = await window.html2canvas(el, {
      scale: 2, useCORS: true, backgroundColor: '#ffffff',
      scrollX: 0, scrollY: 0,
      width: el.offsetWidth, height: el.scrollHeight
    });
    const link = document.createElement('a');
    link.download = `Cierre_${_cdFecha}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (typeof toast==='function') toast('📸 Captura descargada — lista para enviar por WhatsApp');
  } catch(e) {
    if (typeof toast==='function') toast('⚠ No se pudo generar la captura: '+e.message, true);
  } finally {
    if (btn) { btn.disabled=false; btn.innerHTML='📸 Descargar captura para WhatsApp'; }
  }
}

// ══ Cambiar fecha ════════════════════════════════════════════════════════
function _cdCambiarFecha(fecha) {
  _cdFecha=fecha;
  _cdTxt('cdHeroFechaLbl',_cdFmtFecha(fecha));
  _cdTxt('cdCapFecha',_cdFmtFecha(fecha).toUpperCase());
  _cdGastos=[]; _cdDeudas=[];
  const ex=_cdHistorial.find(c=>c.fecha===fecha);
  if(ex) _cdCargarCierreEnForm(ex);
  else { _cdRenderListas(); _cdActualizarStats(); }
}

function _cdCargarCierreEnForm(c) {
  _cdGastos=(c.gastos||[]).map(x=>({...x,id:x.id||_cdUID()}));
  _cdDeudas=(c.deudas||[]).map(x=>({...x,id:x.id||_cdUID()}));
  _cdSet('cdVentaTotal',c.ventaTotal);
  const ss=(px,obj)=>{ if(!obj)return; _cdSet(px+'Billetes',obj.billetes);_cdSet(px+'Monedas',obj.monedas);_cdSet(px+'Coras',obj.coras);_cdSet(px+'C10',obj.c10);_cdSet(px+'C05',obj.c05);_cdSet(px+'C01',obj.c01); };
  ss('cdVenta',c.ventaMontos);ss('cdSaldo',c.saldoMontos);ss('cdGasto',c.gastoMontos);ss('cdCambio',c.cambioMontos);ss('cdQueda',c.quedaMontos);
  _cdSet('cdAlquiler',c.alquiler); _cdSet('cdNota',c.nota);
  _cdRenderListas();
  if(typeof toast==='function') toast('📂 Cierre del '+_cdFmtFecha(c.fecha)+' cargado');
}

// ══ Guardar ═══════════════════════════════════════════════════════════════
async function _cdGuardarCierre() {
  const ventaTotal=_cdV('cdVentaTotal');
  if(!ventaTotal&&!_cdGastos.length){if(typeof toast==='function')toast('Ingresa al menos la venta del día',true);return;}
  const btn=document.getElementById('btnCdGuardar');
  if(btn){btn.disabled=true;btn.innerHTML='⏳ Guardando…';}
  const V=_cdLeerMontos('cdVenta'),S=_cdLeerMontos('cdSaldo'),G=_cdLeerMontos('cdGasto'),C=_cdLeerMontos('cdCambio'),Q=_cdLeerMontos('cdQueda');
  const alquiler=_cdV('cdAlquiler');
  const totalGastos=_cdTotalM(G)||_cdSumArr(_cdGastos);
  const cierre={
    id:(typeof _getTiendaId==='function'?_getTiendaId():'local')+'_'+_cdFecha,
    tienda_id:typeof _getTiendaId==='function'?_getTiendaId():'',
    fecha:_cdFecha, fechaLabel:_cdFmtFecha(_cdFecha), ventaTotal,
    ventaMontos:V, saldoMontos:S, gastoMontos:G, cambioMontos:C, quedaMontos:Q, alquiler,
    gastos:[..._cdGastos], deudas:[..._cdDeudas],
    totalGastos, totalCambios:_cdTotalM(C), totalDeudas:_cdSumArr(_cdDeudas),
    totalQueda:_cdTotalM(Q), saldoNeto:_cdTotalM(S)+ventaTotal-totalGastos-_cdTotalM(C),
    nota:document.getElementById('cdNota')?.value?.trim()||'',
    creadoPor:typeof _usuarioActual!=='undefined'?(_usuarioActual?.nombre||_usuarioActual?.email||'—'):'—',
    creadoEn:new Date().toISOString(), enviado:false,
  };
  const idx=_cdHistorial.findIndex(c=>c.fecha===_cdFecha);
  if(idx>=0)_cdHistorial[idx]=cierre; else _cdHistorial.unshift(cierre);
  await _cdGuardarHistorial();
  const subido=await _cdSubirSupabase(cierre);
  cierre.enviado=subido;
  if(idx>=0)_cdHistorial[idx]=cierre; else if(_cdHistorial[0])_cdHistorial[0].enviado=subido;
  await _cdGuardarHistorial();
  if(typeof toast==='function') toast(subido?'✅ Guardado y enviado':'💾 Guardado localmente (sin conexión)',!subido);
  if(typeof _registrarAccion==='function') _registrarAccion('cierre_diario',`Venta: $${ventaTotal.toFixed(2)} | Gastos: $${cierre.totalGastos.toFixed(2)} | ${_cdFecha}`);
  const hw=document.getElementById('cdHistorialWrap'); if(hw)hw.innerHTML=_cdRenderHistorial();
  if(btn){btn.disabled=false;btn.innerHTML='💾 Guardar y enviar reporte';}
}

// ══ Historial ═══════════════════════════════════════════════════════════
function _cdRenderHistorial() {
  if(!_cdHistorial.length) return `<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;font-weight:700;">Sin cierres registrados</div>`;
  return [..._cdHistorial].sort((a,b)=>b.fecha.localeCompare(a.fecha)).slice(0,20).map(c=>`
    <div class="cd-hist-item" onclick="_cdCambiarFechaYCargar('${c.fecha}')">
      <div>
        <div class="cd-hist-fecha">${_cdFmtFecha(c.fecha)}</div>
        <div class="cd-hist-meta">Gastos: $${(c.totalGastos||0).toFixed(2)} · ${c.creadoPor||'—'}</div>
      </div>
      <div class="cd-hist-venta">$${(c.ventaTotal||0).toFixed(2)}</div>
      <span class="cd-hist-badge ${c.enviado?'enviado':''}">${c.enviado?'☁ Enviado':'📱 Local'}</span>
    </div>`).join('');
}
function _cdCambiarFechaYCargar(fecha) {
  _cdFecha=fecha;
  const inp=document.getElementById('cdFechaInput'); if(inp)inp.value=fecha;
  _cdCambiarFecha(fecha);
}

// ══ Global ════════════════════════════════════════════════════════════════
window.renderCierreDia        = renderCierreDia;
window._cdAgregarGasto        = _cdAgregarGasto;
window._cdEliminarGasto       = _cdEliminarGasto;
window._cdAgregarDeuda        = _cdAgregarDeuda;
window._cdEliminarDeuda       = _cdEliminarDeuda;
window._cdActualizarStats     = _cdActualizarStats;
window._cdCambiarFecha        = _cdCambiarFecha;
window._cdCambiarFechaYCargar = _cdCambiarFechaYCargar;
window._cdGuardarCierre       = _cdGuardarCierre;
window._cdTomarCaptura        = _cdTomarCaptura;
