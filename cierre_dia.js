// =====================================================================
//  📋 CIERRE DIARIO DE CAJA — v6
// =====================================================================
(function _estilosCierre() {
  if (document.getElementById('cierreDiaStyles')) return;
  const s = document.createElement('style');
  s.id = 'cierreDiaStyles';
  s.textContent = `
    #pgCierreDia { padding:0 0 100px; }
    .cd-hero { background:linear-gradient(135deg,#0c4a6e,#075985,#0369a1); padding:20px 18px 16px; margin-bottom:16px; }
    .cd-hero-top { display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px; }
    .cd-hero-title { font-size:18px;font-weight:900;color:#fff;font-family:Nunito,sans-serif; }
    .cd-hero-fecha { font-size:12px;font-weight:900;color:rgba(255,255,255,0.7);font-family:Nunito,sans-serif; }
    .cd-fecha-inp { padding:6px 10px;background:rgba(255,255,255,0.12);border:1.5px solid rgba(255,255,255,0.25);border-radius:9px;color:#fff;font-size:13px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;outline:none; }
    .cd-fecha-inp::-webkit-calendar-picker-indicator { filter:invert(1); }
    .cd-hero-stats { display:grid;grid-template-columns:repeat(3,1fr);gap:8px; }
    .cd-hstat { background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.18);border-radius:12px;padding:10px 12px; }
    .cd-hstat-lbl { font-size:10px;font-weight:900;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.4px;font-family:Nunito,sans-serif;margin-bottom:3px; }
    .cd-hstat-val { font-size:16px;font-weight:900;color:#fff;font-family:Nunito,sans-serif;line-height:1; }
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
    .cd-total-row { display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#f0f9ff;border-radius:10px;font-family:Nunito,sans-serif;margin-top:8px; }
    .cd-total-row span:first-child { font-size:12px;font-weight:900;color:#0369a1; }
    .cd-total-row span:last-child  { font-size:17px;font-weight:900;color:#0369a1; }
    .cd-total-row.green span { color:#15803d!important; } .cd-total-row.green { background:#f0fdf4; }
    .cd-total-row.amber span { color:#b45309!important; } .cd-total-row.amber { background:#fffbeb; }
    .cd-total-row.red   span { color:#dc2626!important; } .cd-total-row.red   { background:#fef2f2; }
    .cd-total-row.purple span { color:#7c3aed!important; } .cd-total-row.purple { background:#faf5ff; }
    .cd-sep { font-size:10px;font-weight:900;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;margin-top:14px; }
    .cd-btn-update { display:flex;align-items:center;gap:6px;padding:7px 12px;background:rgba(3,105,161,0.1);border:1.5px solid rgba(3,105,161,0.3);border-radius:9px;font-size:11px;font-weight:900;font-family:Nunito,sans-serif;color:#0369a1;cursor:pointer;transition:all 0.15s;white-space:nowrap; }
    .cd-btn-update:hover { background:rgba(3,105,161,0.18); }
    .cd-item-list { display:flex;flex-direction:column;gap:6px;margin-bottom:10px; }
    .cd-item-row { background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:10px 12px; }
    .cd-item-head { display:flex;align-items:center;justify-content:space-between;margin-bottom:4px; }
    .cd-item-desc { font-size:12px;font-weight:900;color:var(--text);font-family:Nunito,sans-serif; }
    .cd-item-monto { font-size:13px;font-weight:900;color:#dc2626;font-family:Nunito,sans-serif; }
    .cd-item-del { background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:14px;padding:2px 5px;border-radius:5px; }
    .cd-item-del:hover { background:rgba(220,38,38,0.1);color:#dc2626; }
    .cd-item-denoms { display:flex;flex-wrap:wrap;gap:4px;margin-top:4px; }
    .cd-item-denom { font-size:10px;font-weight:700;font-family:Nunito,sans-serif;background:#fef2f2;border:1px solid #fca5a5;border-radius:5px;padding:2px 7px;color:#dc2626; }
    .cd-btn-add { padding:10px 14px;background:#0369a1;color:#fff;border:none;border-radius:10px;font-size:12px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;white-space:nowrap;transition:all 0.15s; }
    .cd-btn-add:hover { background:#075985; }
    .cd-cambio-grid { display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:4px; }
    @media(min-width:480px){ .cd-cambio-grid { grid-template-columns:repeat(3,1fr); } }
    .cd-cambio-item { background:var(--surface);border:1.5px solid var(--border);border-radius:10px;padding:10px 11px; }
    .cd-cambio-lbl { font-size:10px;font-weight:900;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.4px;font-family:Nunito,sans-serif;margin-bottom:6px; }
    .cd-add-row { display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:end; }

    /* ── IMAGEN 1080x1920 ── */
    .cd-resumen-captura {
      background:#fff; border:3px solid #0369a1; border-radius:0;
      padding:0; font-family:Nunito,sans-serif;
      width:1080px; min-height:1920px;
      box-sizing:border-box; position:relative;
    }
    .cd-cap-inner { padding:60px 70px; box-sizing:border-box; }
    .cd-cap-title { font-size:52px;font-weight:900;color:#0c4a6e;text-align:center;margin-bottom:8px;letter-spacing:-0.5px; }
    .cd-cap-fecha { font-size:28px;font-weight:700;color:#0369a1;text-align:center;margin-bottom:40px; }
    .cd-cap-divider { height:4px;background:#0369a1;border-radius:2px;margin:32px 0;opacity:0.5; }
    /* Dos columnas */
    .cd-cap-2col { display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-bottom:28px; }
    .cd-cap-col { border:2px solid #bae6fd;border-radius:16px;padding:24px; }
    .cd-cap-section-title { font-size:20px;font-weight:900;color:#0369a1;background:#e0f2fe;border-radius:8px;padding:8px 16px;margin-bottom:14px;text-align:center;text-transform:uppercase;letter-spacing:0.5px; }
    /* Filas con líneas tipo cuaderno */
    .cd-cap-row { display:flex;justify-content:space-between;align-items:center;font-size:22px;font-weight:700;color:#1e3a5f;padding:8px 0;border-bottom:1px solid #e0f2fe; }
    .cd-cap-row:last-child { border-bottom:none; }
    .cd-cap-row.total { font-size:26px;font-weight:900;border-top:3px solid #0369a1;border-bottom:none;margin-top:8px;padding-top:12px; }
    .cd-cap-row.grand { font-size:28px;font-weight:900;color:#0c4a6e;background:#e0f2fe;border-radius:12px;padding:16px 20px;margin-top:10px;border-bottom:none; }
    .val-pos { color:#15803d; } .val-neg { color:#dc2626; } .val-warn { color:#b45309; }
    .val-blue { color:#0369a1; } .val-purple { color:#7c3aed; }

    .btn-cd-guardar { width:100%;padding:14px;background:linear-gradient(135deg,#0369a1,#075985);color:#fff;border:none;border-radius:13px;font-size:15px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(3,105,161,0.35);transition:all 0.15s;display:flex;align-items:center;justify-content:center;gap:8px; }
    .btn-cd-guardar:hover { transform:translateY(-1px); }
    .btn-cd-guardar:disabled { opacity:0.6;cursor:wait;transform:none; }
    .btn-cd-captura { width:100%;padding:13px;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;border:none;border-radius:13px;font-size:14px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(22,163,74,0.3);transition:all 0.15s;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:10px; }
    .btn-cd-captura:hover { transform:translateY(-1px); }
    .cd-nota-area { width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;font-weight:700;font-family:Nunito,sans-serif;color:var(--text);background:var(--surface);box-sizing:border-box;outline:none;resize:vertical;min-height:70px; }
    .cd-nota-area:focus { border-color:#0369a1; }
  `;
  document.head.appendChild(s);
})();

let _cdFecha = new Date().toISOString().split('T')[0];
let _cdGastos = [];
let _cdDeudas = [];
const _CD_DENOMS = [
  {id:'Billetes',label:'💵 Billetes'},{id:'Monedas',label:'🪙 M. Dólar'},
  {id:'Coras',label:'🔵 Coras'},{id:'C10',label:'🟡 10 cts'},
  {id:'C05',label:'🟤 5 cts'},{id:'C01',label:'⚪ 1 cto'},
];

function _cdFmtFecha(iso){if(!iso)return'—';const[y,m,d]=iso.split('-');const dN=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];return`${dN[new Date(iso+'T12:00:00').getDay()]} ${d}/${m}/${y.slice(2)}`;}
function _cdUID(){return'cd_'+Date.now()+'_'+Math.random().toString(36).slice(2,5);}
function _cdV(id){return parseFloat(document.getElementById(id)?.value||'0')||0;}
function _cdSet(id,v){const e=document.getElementById(id);if(e&&v!=null)e.value=v;}
function _cdTxt(id,v){const e=document.getElementById(id);if(e)e.textContent=v;}
function _cdSumArr(arr){return arr.reduce((s,x)=>s+Number(x.total||0),0);}
function _cdFmt(n){return'$'+n.toFixed(2);}
function _cdLeerMontos(px){return{billetes:_cdV(px+'Billetes'),monedas:_cdV(px+'Monedas'),coras:_cdV(px+'Coras'),c10:_cdV(px+'C10'),c05:_cdV(px+'C05'),c01:_cdV(px+'C01')};}
function _cdTotalM(m){return m.billetes+m.monedas+m.coras+m.c10+m.c05+m.c01;}

function _cdBloqueMontosHTML(px){
  return`<div class="cd-montos-grid">
    <div class="cd-field"><label>💵 Billetes ($)</label><input class="cd-inp" type="number" id="${px}Billetes" min="0" step="0.01" placeholder="0.00" oninput="_cdActualizarStats()"></div>
    <div class="cd-field"><label>🪙 M. Dólar ($)</label><input class="cd-inp" type="number" id="${px}Monedas" min="0" step="0.01" placeholder="0.00" oninput="_cdActualizarStats()"></div>
    <div class="cd-field"><label>🔵 Coras ($)</label><input class="cd-inp" type="number" id="${px}Coras" min="0" step="0.01" placeholder="0.00" oninput="_cdActualizarStats()"></div>
    <div class="cd-field"><label>🟡 10 centavos ($)</label><input class="cd-inp" type="number" id="${px}C10" min="0" step="0.01" placeholder="0.00" oninput="_cdActualizarStats()"></div>
    <div class="cd-field"><label>🟤 5 centavos ($)</label><input class="cd-inp" type="number" id="${px}C05" min="0" step="0.01" placeholder="0.00" oninput="_cdActualizarStats()"></div>
    <div class="cd-field"><label>⚪ 1 centavo ($)</label><input class="cd-inp" type="number" id="${px}C01" min="0" step="0.01" placeholder="0.00" oninput="_cdActualizarStats()"></div>
  </div>`;
}

async function renderCierreDia(pgId){
  pgId=pgId||'pgCierreDia';
  const pg=document.getElementById(pgId);if(!pg)return;
  const esHoy=_cdFecha===new Date().toISOString().split('T')[0];
  let vSug=0;
  if(esHoy&&typeof totalReporte==='function'&&typeof ventasDia!=='undefined')vSug=totalReporte(ventasDia);
  const cambioGrid=_CD_DENOMS.map(d=>`
    <div class="cd-cambio-item">
      <div class="cd-cambio-lbl">Sale de ${d.label}</div>
      <div class="cd-field" style="margin-bottom:6px;"><label>Monto ($)</label><input class="cd-inp" type="number" id="cdCambioSale${d.id}" min="0" step="0.01" placeholder="0.00" oninput="_cdActualizarStats()"></div>
      <div class="cd-field"><label>Entra en</label><select class="cd-inp" id="cdCambioHacia${d.id}" onchange="_cdActualizarStats()" style="padding:9px 10px;">${_CD_DENOMS.filter(x=>x.id!==d.id).map(x=>`<option value="${x.id}">${x.label}</option>`).join('')}</select></div>
    </div>`).join('');

  pg.innerHTML=`
    <div class="cd-hero">
      <div class="cd-hero-top">
        <div><div class="cd-hero-title">📋 Cierre Diario de Caja</div><div class="cd-hero-fecha" id="cdHeroFechaLbl">${_cdFmtFecha(_cdFecha)}</div></div>
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
          <button class="cd-btn-update" onclick="_cdPropagar('venta')">🔄 Actualizar Saldo</button>
        </div>
        <div class="cd-panel-body">
          <div class="cd-field" style="margin-bottom:12px;">
            <label>Total vendido ($)</label>
            <input class="cd-inp big" type="number" id="cdVentaTotal" min="0" step="0.01" placeholder="0.00" value="${vSug>0?vSug.toFixed(2):''}" oninput="_cdActualizarStats()">
            ${vSug>0?`<div style="font-size:11px;color:#0369a1;font-weight:700;margin-top:4px;">💡 Del POS de hoy: $${vSug.toFixed(2)}</div>`:''}
          </div>
          <div class="cd-field" style="margin-bottom:12px;">
            <label>🏘 Apartar para alquiler hoy ($) — se descuenta de los billetes</label>
            <input class="cd-inp" type="number" id="cdVentaAlquilerHoy" min="0" step="0.01" placeholder="0.00" oninput="_cdActualizarStats()">
            <div style="font-size:10px;color:var(--text-muted);font-weight:700;margin-top:3px;">Se descuenta de billetes de la venta y NO entra a saldo en caja</div>
          </div>
          <div class="cd-sep">Desglose del dinero recibido</div>
          ${_cdBloqueMontosHTML('cdVenta')}
          <div id="cdVentaAlqMsg" style="display:none;margin-top:8px;padding:8px 12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:11px;font-weight:700;color:#b45309;font-family:Nunito,sans-serif;"></div>
          <div class="cd-total-row"><span>Para saldo en caja (venta − alquiler)</span><span id="cdVentaDesgloseTotal">$0.00</span></div>
        </div>
      </div>

      <!-- SALDO EN CAJA -->
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#dcfce7;">🏦</div>
          <div class="cd-panel-title">Saldo en Caja</div>
          <button class="cd-btn-update" onclick="_cdPropagar('saldo')">🔄 Actualizar Queda</button>
        </div>
        <div class="cd-panel-body">
          <div style="font-size:11px;color:var(--text-muted);font-weight:700;margin-bottom:10px;">Dinero en caja <strong>antes</strong> de la venta de hoy</div>
          ${_cdBloqueMontosHTML('cdSaldo')}
          <div class="cd-field" style="margin-top:12px;">
            <label>🏘 Alquiler acumulado ($) — guardado aparte</label>
            <input class="cd-inp" type="number" id="cdAlquiler" min="0" step="0.01" placeholder="0.00" oninput="_cdActualizarStats()">
          </div>
          <div class="cd-total-row green"><span>Total saldo en caja (sin alquiler)</span><span id="cdSaldoTotal">$0.00</span></div>
          <div class="cd-total-row amber" style="margin-top:6px;"><span>Total dinero en el alquiler</span><span id="cdAlquilerTotal">$0.00</span></div>
          <div class="cd-total-row" style="margin-top:6px;background:#e0f2fe;"><span style="color:#0369a1;font-weight:900;">💰 Total caja + alquiler</span><span id="cdCajaAlquilerTotal" style="color:#0369a1;">$0.00</span></div>
        </div>
      </div>

      <!-- GASTOS -->
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#fee2e2;">📤</div>
          <div class="cd-panel-title">Gastos / Pagos del Día</div>
        </div>
        <div class="cd-panel-body">
          <div class="cd-item-list" id="cdGastosList"></div>
          <div style="background:#fef2f2;border:1.5px solid #fca5a5;border-radius:12px;padding:12px;margin-top:4px;">
            <div style="font-size:11px;font-weight:900;color:#dc2626;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:10px;">➕ Registrar gasto / pago</div>
            <div class="cd-field" style="margin-bottom:10px;">
              <label>Descripción del pago</label>
              <input class="cd-inp" type="text" id="cdGastoDesc" placeholder="Ej: Se pagó la Coca Cola…">
            </div>
            <div class="cd-sep" style="margin-top:0;">¿Qué se sacó de caja para pagar?</div>
            ${_cdBloqueMontosHTML('cdGastoForm')}
            <button class="cd-btn-add" style="width:100%;margin-top:10px;background:#dc2626;" onclick="_cdAgregarGasto()">✅ Registrar pago</button>
          </div>
          <div class="cd-total-row red" style="margin-top:12px;"><span>Total gastos del día</span><span id="cdGastosTotal">$0.00</span></div>
        </div>
      </div>

      <!-- CAMBIOS -->
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#fef3c7;">🔄</div>
          <div class="cd-panel-title">Cambios del Día</div>
          <button class="cd-btn-update" onclick="_cdAplicarCambiosASaldo()">✓ Aplicar a Saldo</button>
        </div>
        <div class="cd-panel-body">
          <div style="font-size:11px;color:var(--text-muted);font-weight:700;margin-bottom:12px;">Redistribuyen el efectivo entre denominaciones. Presiona "Aplicar a Saldo" para actualizar los campos.</div>
          <div class="cd-cambio-grid">${cambioGrid}</div>
          <div id="cdCambioResumen" style="margin-top:12px;"></div>
        </div>
      </div>

      <!-- PENDIENTES -->
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
          <div class="cd-total-row purple"><span>Total pendiente</span><span id="cdDeudasTotal">$0.00</span></div>
        </div>
      </div>

      <!-- QUEDA EN EFECTIVO -->
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#fef3c7;">🪙</div>
          <div class="cd-panel-title">Esto Queda en Efectivo</div>
        </div>
        <div class="cd-panel-body">
          <div style="font-size:11px;color:var(--text-muted);font-weight:700;margin-bottom:10px;">Conteo físico final de todo lo que queda en caja</div>
          ${_cdBloqueMontosHTML('cdQueda')}
          <div class="cd-total-row amber"><span>Total físico en caja</span><span id="cdQuedaTotal">$0.00</span></div>
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

      <!-- RESUMEN 1080x1920 -->
      <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;">
        <div class="cd-resumen-captura" id="cdResumenCaptura">
          <div class="cd-cap-inner">
            <div class="cd-cap-title">📋 CIERRE DE CAJA</div>
            <div class="cd-cap-fecha" id="cdCapFecha">${_cdFmtFecha(_cdFecha).toUpperCase()}</div>

            <!-- Fila 1: Venta + Saldo -->
            <div class="cd-cap-2col">
              <div class="cd-cap-col">
                <div class="cd-cap-section-title">💹 Venta del Día</div>
                <div class="cd-cap-row"><span>Total venta</span><span class="val-blue" id="capVentaTotal">$0.00</span></div>
                <div class="cd-cap-row"><span>💵 Billetes</span><span id="capVBilletes">$0.00</span></div>
                <div class="cd-cap-row"><span>🪙 M. Dólar</span><span id="capVMonedas">$0.00</span></div>
                <div class="cd-cap-row"><span>🔵 Coras</span><span id="capVCoras">$0.00</span></div>
                <div class="cd-cap-row"><span>🟡 10 cts</span><span id="capVC10">$0.00</span></div>
                <div class="cd-cap-row"><span>🟤 5 cts</span><span id="capVC05">$0.00</span></div>
                <div class="cd-cap-row"><span>⚪ 1 cto</span><span id="capVC01">$0.00</span></div>
                <div id="capAlqHoyWrap" style="display:none;"><div class="cd-cap-row"><span>🏘 Alquiler (de billetes)</span><span class="val-warn" id="capAlqHoy">$0.00</span></div></div>
                <div class="cd-cap-row total"><span>Para saldo en caja</span><span class="val-pos" id="capVentaParaCaja">$0.00</span></div>
              </div>
              <div class="cd-cap-col">
                <div class="cd-cap-section-title">🏦 Saldo en Caja</div>
                <div class="cd-cap-row"><span>💵 Billetes</span><span id="capSBilletes">$0.00</span></div>
                <div class="cd-cap-row"><span>🪙 M. Dólar</span><span id="capSMonedas">$0.00</span></div>
                <div class="cd-cap-row"><span>🔵 Coras</span><span id="capSCoras">$0.00</span></div>
                <div class="cd-cap-row"><span>🟡 10 cts</span><span id="capSC10">$0.00</span></div>
                <div class="cd-cap-row"><span>🟤 5 cts</span><span id="capSC05">$0.00</span></div>
                <div class="cd-cap-row"><span>⚪ 1 cto</span><span id="capSC01">$0.00</span></div>
                <div class="cd-cap-row"><span>🏘 Alquiler aparte</span><span class="val-warn" id="capAlquilerTotal">$0.00</span></div>
                <div class="cd-cap-row total"><span>Total previo</span><span class="val-pos" id="capSaldoPrevio">$0.00</span></div>
              </div>
            </div>

            <div class="cd-cap-divider"></div>

            <!-- Fila 2: Gastos + Cambios -->
            <div class="cd-cap-2col">
              <div class="cd-cap-col">
                <div class="cd-cap-section-title">📤 Gastos / Pagos</div>
                <div id="capGastosDetalleList"><div class="cd-cap-row"><span>Sin gastos</span><span>—</span></div></div>
                <div class="cd-cap-row total"><span>Total gastos</span><span class="val-neg" id="capGTotal">$0.00</span></div>
              </div>
              <div class="cd-cap-col">
                <div class="cd-cap-section-title">🔄 Cambios del Día</div>
                <div id="capCambiosList"><div class="cd-cap-row"><span>Sin cambios</span><span>—</span></div></div>
                <div style="font-size:16px;color:var(--text-muted);font-weight:700;margin-top:12px;font-family:Nunito,sans-serif;">* No afectan el total</div>
              </div>
            </div>

            <div class="cd-cap-divider"></div>

            <!-- Fila 3: Pendientes + Queda -->
            <div class="cd-cap-2col">
              <div class="cd-cap-col">
                <div class="cd-cap-section-title">📝 Pendientes</div>
                <div id="capDeudasList"><div class="cd-cap-row"><span>Sin pendientes</span><span>—</span></div></div>
                <div class="cd-cap-row total"><span>Total pendiente</span><span class="val-purple" id="capDTotal">$0.00</span></div>
              </div>
              <div class="cd-cap-col">
                <div class="cd-cap-section-title">🪙 Queda en Efectivo</div>
                <div class="cd-cap-row"><span>💵 Billetes</span><span id="capQBilletes">$0.00</span></div>
                <div class="cd-cap-row"><span>🪙 M. Dólar</span><span id="capQMonedas">$0.00</span></div>
                <div class="cd-cap-row"><span>🔵 Coras</span><span id="capQCoras">$0.00</span></div>
                <div class="cd-cap-row"><span>🟡 10 cts</span><span id="capQC10">$0.00</span></div>
                <div class="cd-cap-row"><span>🟤 5 cts</span><span id="capQC05">$0.00</span></div>
                <div class="cd-cap-row"><span>⚪ 1 cto</span><span id="capQC01">$0.00</span></div>
                <div class="cd-cap-row total"><span>Total físico</span><span class="val-pos" id="capQTotal">$0.00</span></div>
              </div>
            </div>

            <div class="cd-cap-divider"></div>

            <!-- Totales finales -->
            <div class="cd-cap-row grand"><span>💰 Caja + alquiler</span><span id="capCajaAlquiler">$0.00</span></div>
            <div class="cd-cap-row grand" style="margin-top:12px;"><span>🏦 Total neto en caja (saldo + venta − gastos)</span><span id="capTotalGeneral">$0.00</span></div>

            <div id="capNotaWrap" style="display:none;margin-top:28px;padding:20px 24px;background:#f0f9ff;border-radius:12px;font-size:22px;font-weight:700;color:#0369a1;font-family:Nunito,sans-serif;"></div>
          </div>
        </div>
      </div>

      <button class="btn-cd-captura" onclick="_cdTomarCaptura()">📸 Descargar imagen (1080×1920) para WhatsApp</button>

    </div>
  `;
  _cdRenderListas();_cdActualizarStats();
}

// ══ Propagar ═══════════════════════════════════════════════════════════
function _cdPropagar(origen){
  if(origen==='venta'){
    // La venta aporta a saldo MENOS el alquiler (que sale de billetes)
    const alqHoy=_cdV('cdVentaAlquilerHoy');
    _CD_DENOMS.forEach(d=>{
      let aporte=_cdV('cdVenta'+d.id);
      // El alquiler se descuenta solo de billetes
      if(d.id==='Billetes') aporte=Math.max(0,aporte-alqHoy);
      const saldoActual=_cdV('cdSaldo'+d.id);
      _cdSet('cdSaldo'+d.id,(saldoActual+aporte).toFixed(2));
    });
    // Sumar alquiler al campo de alquiler acumulado
    const alqPrev=_cdV('cdAlquiler');
    _cdSet('cdAlquiler',(alqPrev+alqHoy).toFixed(2));
    if(typeof toast==='function')toast('✓ Saldo actualizado. Alquiler $'+alqHoy.toFixed(2)+' apartado de billetes.');
  }
  if(origen==='saldo'){
    // Copiar saldo actual (ya incluye venta menos gastos por denominación) a Queda
    _CD_DENOMS.forEach(d=>{
      const saldo=_cdV('cdSaldo'+d.id);
      const gastosDenom=_cdGastos.reduce((s,g)=>s+Number(g.montos[d.id]||0),0);
      _cdSet('cdQueda'+d.id,Math.max(0,saldo-gastosDenom).toFixed(2));
    });
    if(typeof toast==='function')toast('✓ "Queda en Efectivo" actualizado');
  }
  _cdActualizarStats();
}

// ══ Aplicar cambios al saldo ════════════════════════════════════════════
function _cdAplicarCambiosASaldo(){
  _CD_DENOMS.forEach(d=>{
    const sale=_cdV('cdCambioSale'+d.id);
    const haciaId=document.getElementById('cdCambioHacia'+d.id)?.value||'';
    if(sale>0&&haciaId){
      // Restar de denominación origen en saldo
      const sOrigen=_cdV('cdSaldo'+d.id);
      _cdSet('cdSaldo'+d.id,Math.max(0,sOrigen-sale).toFixed(2));
      // Sumar a denominación destino en saldo
      const sDest=_cdV('cdSaldo'+haciaId);
      _cdSet('cdSaldo'+haciaId,(sDest+sale).toFixed(2));
      // También actualizar en Queda
      const qOrigen=_cdV('cdQueda'+d.id);
      _cdSet('cdQueda'+d.id,Math.max(0,qOrigen-sale).toFixed(2));
      const qDest=_cdV('cdQueda'+haciaId);
      _cdSet('cdQueda'+haciaId,(qDest+sale).toFixed(2));
    }
  });
  // Limpiar campos de cambio
  _CD_DENOMS.forEach(d=>_cdSet('cdCambioSale'+d.id,0));
  if(typeof toast==='function')toast('✓ Cambios aplicados a Saldo y Queda en Efectivo');
  _cdActualizarStats();
}

// ══ Listas ═══════════════════════════════════════════════════════════════
function _cdRenderListas(){
  const gEl=document.getElementById('cdGastosList');
  if(gEl) gEl.innerHTML=_cdGastos.length
    ?_cdGastos.map(x=>{
        const denStr=_CD_DENOMS.filter(d=>(x.montos[d.id]||0)>0)
          .map(d=>`<span class="cd-item-denom">${d.label} $${(x.montos[d.id]||0).toFixed(2)}</span>`).join('');
        return`<div class="cd-item-row">
          <div class="cd-item-head"><span class="cd-item-desc">${x.desc}</span><div style="display:flex;align-items:center;gap:6px;"><span class="cd-item-monto">-$${x.total.toFixed(2)}</span><button class="cd-item-del" onclick="_cdEliminarGasto('${x.id}')">✕</button></div></div>
          <div class="cd-item-denoms">${denStr}</div>
        </div>`;}).join('')
    :`<div style="font-size:12px;color:var(--text-muted);font-weight:700;padding:4px 0;">Sin gastos registrados</div>`;
  const dEl=document.getElementById('cdDeudasList');
  if(dEl) dEl.innerHTML=_cdDeudas.length
    ?_cdDeudas.map(x=>`<div class="cd-item-row"><div class="cd-item-head"><span class="cd-item-desc">${x.desc}</span><div style="display:flex;align-items:center;gap:6px;"><span class="cd-item-monto" style="color:#7c3aed;">$${Number(x.monto||0).toFixed(2)}</span><button class="cd-item-del" onclick="_cdEliminarDeuda('${x.id}')">✕</button></div></div></div>`).join('')
    :`<div style="font-size:12px;color:var(--text-muted);font-weight:700;padding:4px 0;">Sin pendientes</div>`;
  _cdActualizarStats();
}

function _cdAgregarGasto(){
  const desc=document.getElementById('cdGastoDesc')?.value?.trim();
  if(!desc){if(typeof toast==='function')toast('Escribe una descripción',true);return;}
  const montos={};let total=0;
  _CD_DENOMS.forEach(d=>{const v=_cdV('cdGastoForm'+d.id);montos[d.id]=v;total+=v;});
  if(total<=0){if(typeof toast==='function')toast('Ingresa al menos un monto',true);return;}
  _cdGastos.push({id:_cdUID(),desc,montos,total});
  document.getElementById('cdGastoDesc').value='';
  _CD_DENOMS.forEach(d=>_cdSet('cdGastoForm'+d.id,0));
  _cdRenderListas();
}
function _cdEliminarGasto(id){_cdGastos=_cdGastos.filter(x=>x.id!==id);_cdRenderListas();}
function _cdAgregarDeuda(){
  const desc=document.getElementById('cdDeudaDesc')?.value?.trim();
  const monto=parseFloat(document.getElementById('cdDeudaMonto')?.value||'0');
  if(!desc){if(typeof toast==='function')toast('Escribe una descripción',true);return;}
  if(!monto||monto<=0){if(typeof toast==='function')toast('Monto inválido',true);return;}
  _cdDeudas.push({id:_cdUID(),desc,monto});
  document.getElementById('cdDeudaDesc').value='';document.getElementById('cdDeudaMonto').value='';
  _cdRenderListas();
}
function _cdEliminarDeuda(id){_cdDeudas=_cdDeudas.filter(x=>x.id!==id);_cdRenderListas();}

// ══ Calcular cambios ════════════════════════════════════════════════════
function _cdCalcularCambios(){
  const movimientos=[];
  _CD_DENOMS.forEach(d=>{
    const sale=_cdV('cdCambioSale'+d.id);
    const haciaId=document.getElementById('cdCambioHacia'+d.id)?.value||'';
    if(sale>0&&haciaId) movimientos.push({de:d.label,hacia:_CD_DENOMS.find(x=>x.id===haciaId)?.label||haciaId,monto:sale});
  });
  return movimientos;
}

// ══ Stats ════════════════════════════════════════════════════════════════
function _cdActualizarStats(){
  const ventaTotal=_cdV('cdVentaTotal');
  const alqHoy=_cdV('cdVentaAlquilerHoy');
  // Alquiler se descuenta de billetes de la venta — venta para caja = venta total - alquiler
  const ventaParaCaja=Math.max(0,ventaTotal-alqHoy);
  const V=_cdLeerMontos('cdVenta'),S=_cdLeerMontos('cdSaldo'),Q=_cdLeerMontos('cdQueda');
  const alquilerPrevio=_cdV('cdAlquiler');
  const alquilerTotal=alquilerPrevio+alqHoy;
  // Gastos por denominación — restar de saldo
  const gastosPorDenom={Billetes:0,Monedas:0,Coras:0,C10:0,C05:0,C01:0};
  _cdGastos.forEach(g=>_CD_DENOMS.forEach(d=>{gastosPorDenom[d.id]+=(g.montos[d.id]||0);}));
  const totalGastos=_cdSumArr(_cdGastos);
  const totalDeudas=_cdDeudas.reduce((s,x)=>s+Number(x.monto||0),0);
  const totalSaldoPrev=_cdTotalM(S); // saldo previo puro (sin alquiler)
  const totalQueda=_cdTotalM(Q);
  // Total neto en caja: saldo previo + lo que entra de venta (sin alquiler) - gastos
  const totalEnCaja=totalSaldoPrev+ventaParaCaja-totalGastos;
  const movimientos=_cdCalcularCambios();
  const $=_cdFmt;

  // Alquiler mensaje
  const alqMsg=document.getElementById('cdVentaAlqMsg');
  if(alqMsg){
    if(alqHoy>0){
      alqMsg.style.display='block';
      alqMsg.textContent=`🏘 $${alqHoy.toFixed(2)} del alquiler se descuentan de billetes y quedan aparte. A caja entran: $${ventaParaCaja.toFixed(2)}`;
    }else{alqMsg.style.display='none';}
  }

  _cdTxt('cdStatVenta',$(ventaTotal));_cdTxt('cdStatGastos',$(totalGastos));_cdTxt('cdStatSaldo',$(totalEnCaja));
  _cdTxt('cdVentaDesgloseTotal',$(ventaParaCaja));
  _cdTxt('cdSaldoTotal',$(totalSaldoPrev));_cdTxt('cdAlquilerTotal',$(alquilerTotal));
  _cdTxt('cdCajaAlquilerTotal',$(totalSaldoPrev+alquilerTotal));
  _cdTxt('cdGastosTotal',$(totalGastos));_cdTxt('cdDeudasTotal',$(totalDeudas));_cdTxt('cdQuedaTotal',$(totalQueda));

  // Cambios en panel
  const cambioRes=document.getElementById('cdCambioResumen');
  if(cambioRes) cambioRes.innerHTML=movimientos.length
    ?movimientos.map(m=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--surface);border:1px solid var(--border);border-radius:8px;margin-bottom:5px;font-size:12px;font-family:Nunito,sans-serif;">
        <span style="font-weight:900;color:#dc2626;">${m.de} −$${m.monto.toFixed(2)}</span>
        <span style="color:var(--text-muted);">→</span>
        <span style="font-weight:900;color:#15803d;">${m.hacia} +$${m.monto.toFixed(2)}</span>
      </div>`).join(''):'';

  // ── Captura ──────────────────────────────────────────────────────────
  _cdTxt('capVentaTotal',$(ventaTotal));
  _cdTxt('capVBilletes',$(V.billetes));_cdTxt('capVMonedas',$(V.monedas));_cdTxt('capVCoras',$(V.coras));
  _cdTxt('capVC10',$(V.c10));_cdTxt('capVC05',$(V.c05));_cdTxt('capVC01',$(V.c01));
  const alqRow=document.getElementById('capAlqHoyWrap');if(alqRow)alqRow.style.display=alqHoy>0?'':'none';
  _cdTxt('capAlqHoy',$(alqHoy));_cdTxt('capVentaParaCaja',$(ventaParaCaja));
  _cdTxt('capSBilletes',$(S.billetes));_cdTxt('capSMonedas',$(S.monedas));_cdTxt('capSCoras',$(S.coras));
  _cdTxt('capSC10',$(S.c10));_cdTxt('capSC05',$(S.c05));_cdTxt('capSC01',$(S.c01));
  _cdTxt('capAlquilerTotal',$(alquilerTotal));_cdTxt('capSaldoPrevio',$(totalSaldoPrev));

  // Gastos con desglose en captura
  const capGD=document.getElementById('capGastosDetalleList');
  if(capGD) capGD.innerHTML=_cdGastos.length
    ?_cdGastos.map(x=>{
        const denStr=_CD_DENOMS.filter(d=>(x.montos[d.id]||0)>0).map(d=>`<div class="cd-cap-row" style="font-size:18px;padding:4px 0;border-bottom:1px solid #f0f9ff;"><span>${d.label}</span><span class="val-neg">$${(x.montos[d.id]||0).toFixed(2)}</span></div>`).join('');
        return`<div class="cd-cap-row" style="font-weight:900;font-size:20px;padding:6px 0 2px;border-bottom:none;"><span>${x.desc}</span><span class="val-neg">-$${x.total.toFixed(2)}</span></div>${denStr}`;
      }).join('')
    :`<div class="cd-cap-row"><span>Sin gastos</span><span>—</span></div>`;
  _cdTxt('capGTotal',$(totalGastos));

  const capCL=document.getElementById('capCambiosList');
  if(capCL) capCL.innerHTML=movimientos.length
    ?movimientos.map(m=>`<div class="cd-cap-row"><span>${m.de}→${m.hacia}</span><span>$${m.monto.toFixed(2)}</span></div>`).join('')
    :`<div class="cd-cap-row"><span>Sin cambios</span><span>—</span></div>`;

  const capD=document.getElementById('capDeudasList');
  if(capD) capD.innerHTML=_cdDeudas.length
    ?_cdDeudas.map(x=>`<div class="cd-cap-row"><span>${x.desc}</span><span class="val-purple">$${Number(x.monto||0).toFixed(2)}</span></div>`).join('')
    :`<div class="cd-cap-row"><span>Sin pendientes</span><span>—</span></div>`;
  _cdTxt('capDTotal',$(totalDeudas));
  _cdTxt('capQBilletes',$(Q.billetes));_cdTxt('capQMonedas',$(Q.monedas));_cdTxt('capQCoras',$(Q.coras));
  _cdTxt('capQC10',$(Q.c10));_cdTxt('capQC05',$(Q.c05));_cdTxt('capQC01',$(Q.c01));_cdTxt('capQTotal',$(totalQueda));
  _cdTxt('capCajaAlquiler',$(totalSaldoPrev+alquilerTotal));
  _cdTxt('capTotalGeneral',$(totalEnCaja));
  const notaWrap=document.getElementById('capNotaWrap');
  const notaTxt=document.getElementById('cdNota')?.value?.trim()||'';
  if(notaWrap){notaWrap.style.display=notaTxt?'block':'none';notaWrap.textContent='📝 '+notaTxt;}
}

// ══ Captura 1080x1920 ════════════════════════════════════════════════════
async function _cdTomarCaptura(){
  const el=document.getElementById('cdResumenCaptura');if(!el)return;
  const btn=document.querySelector('.btn-cd-captura');
  if(btn){btn.disabled=true;btn.innerHTML='⏳ Generando imagen…';}
  try{
    if(!window.html2canvas){
      await new Promise((res,rej)=>{const sc=document.createElement('script');sc.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';sc.onload=res;sc.onerror=rej;document.head.appendChild(sc);});
    }
    // Render a 1080x1920
    const canvas=await window.html2canvas(el,{
      scale:1, useCORS:true, backgroundColor:'#ffffff',
      width:1080, height:Math.max(1920,el.scrollHeight),
      windowWidth:1080
    });
    // Recortar a exactamente 1080x1920
    const out=document.createElement('canvas');
    out.width=1080;out.height=1920;
    const ctx=out.getContext('2d');
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,1080,1920);
    ctx.drawImage(canvas,0,0);
    const link=document.createElement('a');link.download=`Cierre_${_cdFecha}.png`;link.href=out.toDataURL('image/png');
    document.body.appendChild(link);link.click();document.body.removeChild(link);
    if(typeof toast==='function')toast('📸 Imagen 1080×1920 descargada — lista para WhatsApp/Facebook');
  }catch(e){if(typeof toast==='function')toast('⚠ Error: '+e.message,true);}
  finally{if(btn){btn.disabled=false;btn.innerHTML='📸 Descargar imagen (1080×1920) para WhatsApp';}}
}

// ══ Fecha ════════════════════════════════════════════════════════════════
function _cdCambiarFecha(fecha){
  _cdFecha=fecha;_cdTxt('cdHeroFechaLbl',_cdFmtFecha(fecha));_cdTxt('cdCapFecha',_cdFmtFecha(fecha).toUpperCase());
  _cdGastos=[];_cdDeudas=[];_cdRenderListas();_cdActualizarStats();
}

// ══ Global ════════════════════════════════════════════════════════════════
window.renderCierreDia           = renderCierreDia;
window._cdAgregarGasto           = _cdAgregarGasto;
window._cdEliminarGasto          = _cdEliminarGasto;
window._cdAgregarDeuda           = _cdAgregarDeuda;
window._cdEliminarDeuda          = _cdEliminarDeuda;
window._cdActualizarStats        = _cdActualizarStats;
window._cdCambiarFecha           = _cdCambiarFecha;
window._cdGuardarCierre          = function(){if(typeof toast==='function')toast('💾 Usa la captura de pantalla para guardar el reporte');};
window._cdTomarCaptura           = _cdTomarCaptura;
window._cdPropagar               = _cdPropagar;
window._cdAplicarCambiosASaldo   = _cdAplicarCambiosASaldo;
