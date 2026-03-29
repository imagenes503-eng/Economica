// =====================================================================
//  📋 CIERRE DIARIO DE CAJA — v7
//  Lógica:
//  - Saldo en Caja: se ingresa 1 sola vez, luego se actualiza con botón
//  - Botón "Actualizar Caja": suma venta(−alquiler) y resta gastos al saldo
//  - Botón "Actualizar Queda": copia saldo actualizado a Queda en Efectivo
//  - Cambios: solo redistribuyen, afectan Saldo y Queda al aplicar
//  - Captura 1080x1920
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
    .cd-panel-header { display:flex;align-items:center;gap:9px;padding:12px 16px;border-bottom:1px solid var(--border);background:var(--surface);flex-wrap:wrap; }
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
    .cd-btn-update { padding:7px 12px;background:rgba(3,105,161,0.1);border:1.5px solid rgba(3,105,161,0.3);border-radius:9px;font-size:11px;font-weight:900;font-family:Nunito,sans-serif;color:#0369a1;cursor:pointer;transition:all 0.15s;white-space:nowrap; }
    .cd-btn-update:hover { background:rgba(3,105,161,0.18); }
    .cd-btn-update.green { background:rgba(22,163,74,0.1);border-color:rgba(22,163,74,0.3);color:#15803d; }
    .cd-btn-update.green:hover { background:rgba(22,163,74,0.18); }
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
    /* Captura 1080x1920 */
    .cd-resumen-captura { background:#fff;border:3px solid #0369a1;font-family:Nunito,sans-serif;width:1080px;min-height:1920px;box-sizing:border-box; }
    .cd-cap-inner { padding:56px 64px;box-sizing:border-box; }
    .cd-cap-title { font-size:56px;font-weight:900;color:#0c4a6e;text-align:center;margin-bottom:6px;letter-spacing:-0.5px; }
    .cd-cap-fecha { font-size:28px;font-weight:700;color:#0369a1;text-align:center;margin-bottom:36px; }
    .cd-cap-divider { height:4px;background:#0369a1;border-radius:2px;margin:28px 0;opacity:0.4; }
    .cd-cap-2col { display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px; }
    .cd-cap-col { border:2px solid #bae6fd;border-radius:14px;padding:22px; }
    .cd-cap-1col { border:2px solid #bae6fd;border-radius:14px;padding:22px;margin-bottom:24px; }
    .cd-cap-section-title { font-size:19px;font-weight:900;color:#0369a1;background:#e0f2fe;border-radius:8px;padding:7px 14px;margin-bottom:12px;text-align:center;text-transform:uppercase;letter-spacing:0.5px; }
    .cd-cap-row { display:flex;justify-content:space-between;align-items:center;font-size:21px;font-weight:700;color:#1e3a5f;padding:7px 0;border-bottom:1px solid #e8f4fd; }
    .cd-cap-row:last-child { border-bottom:none; }
    .cd-cap-row.total { font-size:24px;font-weight:900;border-top:3px solid #0369a1;border-bottom:none;margin-top:6px;padding-top:10px; }
    .cd-cap-row.grand { font-size:26px;font-weight:900;color:#0c4a6e;background:#e0f2fe;border-radius:10px;padding:14px 18px;margin-top:8px;border-bottom:none; }
    .cd-cap-row.alq-row { font-size:24px;font-weight:900;color:#b45309;background:#fffbeb;border-radius:10px;padding:14px 18px;margin-top:8px;border-bottom:none; }
    .val-pos { color:#15803d; } .val-neg { color:#dc2626; } .val-warn { color:#b45309; }
    .val-blue { color:#0369a1; } .val-purple { color:#7c3aed; }
    .btn-cd-captura { width:100%;padding:14px;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;border:none;border-radius:13px;font-size:14px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(22,163,74,0.3);transition:all 0.15s;display:flex;align-items:center;justify-content:center;gap:8px; }
    .btn-cd-captura:hover { transform:translateY(-1px); }
    .btn-cd-captura:disabled { opacity:0.6;cursor:wait;transform:none; }
    .cd-nota-area { width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;font-weight:700;font-family:Nunito,sans-serif;color:var(--text);background:var(--surface);box-sizing:border-box;outline:none;resize:vertical;min-height:70px; }
    .cd-nota-area:focus { border-color:#0369a1; }
  `;
  document.head.appendChild(s);
})();

// ══ Estado ══════════════════════════════════════════════════════════════
let _cdFecha  = new Date().toISOString().split('T')[0];
let _cdGastos = []; // [{id,desc,montos:{Billetes,Monedas,Coras,C10,C05,C01},total}]
let _cdDeudas = []; // [{id,desc,monto}]
// Datos guardados de la venta (para mostrar en captura aunque se limpien inputs)
let _cdVentaSnapshot = null; // {total, alqHoy, montos:{…}}

const _CD_DENOMS = [
  {id:'Billetes',label:'💵 Billetes'},{id:'Monedas',label:'🪙 M. Dólar'},
  {id:'Coras',label:'🔵 Coras'},{id:'C10',label:'🟡 10 cts'},
  {id:'C05',label:'🟤 5 cts'},{id:'C01',label:'⚪ 1 cto'},
];

function _cdFmtFecha(iso){if(!iso)return'—';const[y,m,d]=iso.split('-');const dN=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];return`${dN[new Date(iso+'T12:00:00').getDay()]} ${d}/${m}/${y.slice(2)}`;}
function _cdUID(){return'cd_'+Date.now()+'_'+Math.random().toString(36).slice(2,5);}
function _cdV(id){return parseFloat(document.getElementById(id)?.value||'0')||0;}
function _cdSet(id,v){const e=document.getElementById(id);if(e&&v!=null)e.value=Number(v).toFixed(2);}
function _cdTxt(id,v){const e=document.getElementById(id);if(e)e.textContent=v;}
function _cdSumArr(arr){return arr.reduce((s,x)=>s+Number(x.total||0),0);}
function _cdFmt(n){return'$'+n.toFixed(2);}
function _cdLeerMontos(px){return{Billetes:_cdV(px+'Billetes'),Monedas:_cdV(px+'Monedas'),Coras:_cdV(px+'Coras'),C10:_cdV(px+'C10'),C05:_cdV(px+'C05'),C01:_cdV(px+'C01')};}
function _cdTotalM(m){return(m.Billetes||0)+(m.Monedas||0)+(m.Coras||0)+(m.C10||0)+(m.C05||0)+(m.C01||0);}

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

// ══ Render ══════════════════════════════════════════════════════════════
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
          <button class="cd-btn-update green" onclick="_cdAplicarVentaASaldo()" title="Suma la venta al saldo de caja y limpia los campos">🔄 Actualizar Caja</button>
        </div>
        <div class="cd-panel-body">
          <div class="cd-field" style="margin-bottom:12px;">
            <label>Total vendido ($)</label>
            <input class="cd-inp big" type="number" id="cdVentaTotal" min="0" step="0.01" placeholder="0.00" value="${vSug>0?vSug.toFixed(2):''}" oninput="_cdActualizarStats()">
            ${vSug>0?`<div style="font-size:11px;color:#0369a1;font-weight:700;margin-top:4px;">💡 Del POS de hoy: $${vSug.toFixed(2)}</div>`:''}
          </div>
          <div class="cd-field" style="margin-bottom:12px;">
            <label>🏘 Apartar para alquiler hoy ($) — sale de billetes</label>
            <input class="cd-inp" type="number" id="cdVentaAlquilerHoy" min="0" step="0.01" placeholder="0.00" oninput="_cdActualizarStats()">
          </div>
          <div class="cd-sep">Desglose del dinero recibido en la venta</div>
          ${_cdBloqueMontosHTML('cdVenta')}
          <div id="cdVentaAlqMsg" style="display:none;margin-top:8px;padding:8px 12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:11px;font-weight:700;color:#b45309;font-family:Nunito,sans-serif;"></div>
          <div class="cd-total-row"><span>Suma desglose</span><span id="cdVentaDesgloseTotal">$0.00</span></div>
          <div style="font-size:11px;color:var(--text-muted);font-weight:700;margin-top:8px;font-family:Nunito,sans-serif;">
            💡 Cuando termines de ingresar la venta, presiona <strong>🔄 Actualizar Caja</strong> — los datos pasarán al saldo y los campos se limpiarán.
          </div>
        </div>
      </div>

      <!-- SALDO EN CAJA -->
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#dcfce7;">🏦</div>
          <div class="cd-panel-title">Saldo en Caja</div>
          <button class="cd-btn-update" onclick="_cdAplicarSaldoAQueda()">🔄 Actualizar Queda</button>
        </div>
        <div class="cd-panel-body">
          <div style="font-size:11px;color:#15803d;font-weight:700;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px 12px;margin-bottom:12px;font-family:Nunito,sans-serif;">
            ℹ️ Ingresa aquí el saldo inicial la primera vez. Después se actualiza automáticamente al presionar "🔄 Actualizar Caja" y al registrar gastos.
          </div>
          ${_cdBloqueMontosHTML('cdSaldo')}
          <div class="cd-field" style="margin-top:12px;">
            <label>🏘 Total alquiler acumulado ($) — guardado aparte</label>
            <input class="cd-inp" type="number" id="cdAlquiler" min="0" step="0.01" placeholder="0.00" oninput="_cdActualizarStats()">
          </div>
          <div class="cd-total-row green"><span>Total en caja (sin alquiler)</span><span id="cdSaldoTotal">$0.00</span></div>
          <div class="cd-total-row amber" style="margin-top:6px;"><span>Total alquiler acumulado</span><span id="cdAlquilerTotal">$0.00</span></div>
          <div class="cd-total-row" style="margin-top:6px;background:#e0f2fe;"><span style="color:#0369a1;font-weight:900;">💰 Total caja + alquiler</span><span id="cdCajaAlquilerTotal" style="color:#0369a1;">$0.00</span></div>
        </div>
      </div>

      <!-- GASTOS / PAGOS -->
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
              <input class="cd-inp" type="text" id="cdGastoDesc" placeholder="Ej: Pepsi, Luz, Alquiler…">
            </div>
            <div class="cd-sep" style="margin-top:0;">¿Qué se sacó de caja?</div>
            ${_cdBloqueMontosHTML('cdGastoForm')}
            <button class="cd-btn-add" style="width:100%;margin-top:10px;background:#dc2626;" onclick="_cdAgregarGasto()">✅ Registrar pago (descuenta de saldo)</button>
          </div>
          <div class="cd-total-row red" style="margin-top:12px;"><span>Total gastos del día</span><span id="cdGastosTotal">$0.00</span></div>
        </div>
      </div>

      <!-- CAMBIOS DEL DÍA -->
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#fef3c7;">🔄</div>
          <div class="cd-panel-title">Cambios del Día</div>
          <button class="cd-btn-update" onclick="_cdAplicarCambios()">✓ Aplicar cambios</button>
        </div>
        <div class="cd-panel-body">
          <div style="font-size:11px;color:var(--text-muted);font-weight:700;margin-bottom:12px;">Redistribuyen denominaciones sin cambiar el total. Presiona "Aplicar" para actualizar Saldo y Queda.</div>
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

      <!-- CAPTURA 1080x1920 -->
      <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:16px;border:2px solid #0369a1;">
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
                <div class="cd-cap-row total"><span>Total venta del día</span><span class="val-blue" id="capVentaLabel">$0.00</span></div>
                <div id="capVentaMenosAlqWrap" style="display:none;"><div class="cd-cap-row" style="font-size:18px;color:#b45309;"><span>Menos alquiler</span><span id="capVentaMenosAlq">$0.00</span></div></div>
              </div>
              <div class="cd-cap-col">
                <div class="cd-cap-section-title">🏦 Saldo en Caja</div>
                <div class="cd-cap-row"><span>💵 Billetes</span><span id="capSBilletes">$0.00</span></div>
                <div class="cd-cap-row"><span>🪙 M. Dólar</span><span id="capSMonedas">$0.00</span></div>
                <div class="cd-cap-row"><span>🔵 Coras</span><span id="capSCoras">$0.00</span></div>
                <div class="cd-cap-row"><span>🟡 10 cts</span><span id="capSC10">$0.00</span></div>
                <div class="cd-cap-row"><span>🟤 5 cts</span><span id="capSC05">$0.00</span></div>
                <div class="cd-cap-row"><span>⚪ 1 cto</span><span id="capSC01">$0.00</span></div>
                <div class="cd-cap-row total"><span>Total en caja</span><span class="val-pos" id="capSaldoPrevio">$0.00</span></div>
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
                <div style="font-size:16px;color:#94a3b8;font-weight:700;margin-top:10px;font-family:Nunito,sans-serif;">* Solo redistribuyen, no afectan el total</div>
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

            <!-- Fila 4: Alquiler ocupa todo el ancho -->
            <div class="cd-cap-1col" style="background:#fffbeb;border-color:#fde68a;">
              <div class="cd-cap-section-title" style="background:#fef3c7;color:#b45309;">🏘 Total Alquiler Acumulado</div>
              <div class="cd-cap-row alq-row" style="border:none;justify-content:center;font-size:36px;">
                <span id="capAlquilerTotalBig">$0.00</span>
              </div>
            </div>

            <!-- Totales finales -->
            <div class="cd-cap-row grand"><span>🏦 Total neto en caja</span><span id="capTotalGeneral">$0.00</span></div>

            <div id="capNotaWrap" style="display:none;margin-top:24px;padding:18px 22px;background:#f0f9ff;border-radius:12px;font-size:22px;font-weight:700;color:#0369a1;font-family:Nunito,sans-serif;"></div>
          </div>
        </div>
      </div>

      <button class="btn-cd-captura" onclick="_cdTomarCaptura()" style="margin-top:12px;">
        📸 Descargar imagen (1080×1920) para WhatsApp
      </button>

    </div>
  `;
  _cdRenderListas();_cdActualizarStats();
}

// ══ Aplicar venta al saldo y limpiar campos (Punto 4 y 2) ═══════════════
function _cdAplicarVentaASaldo(){
  const ventaTotal=_cdV('cdVentaTotal');
  if(ventaTotal<=0){if(typeof toast==='function')toast('Ingresa la venta del día primero',true);return;}
  const alqHoy=_cdV('cdVentaAlquilerHoy');
  const V=_cdLeerMontos('cdVenta');

  // Guardar snapshot para la captura antes de limpiar
  _cdVentaSnapshot={total:ventaTotal,alqHoy,montos:{...V}};

  // Sumar cada denominación de venta al saldo, descantando alquiler de billetes
  _CD_DENOMS.forEach(d=>{
    let aporte=V[d.id]||0;
    if(d.id==='Billetes') aporte=Math.max(0,aporte-alqHoy);
    const saldoActual=_cdV('cdSaldo'+d.id);
    _cdSet('cdSaldo'+d.id,saldoActual+aporte);
  });
  // Acumular alquiler
  const alqPrev=_cdV('cdAlquiler');
  _cdSet('cdAlquiler',alqPrev+alqHoy);

  // Limpiar campos de venta
  _cdSet('cdVentaTotal',0);_cdSet('cdVentaAlquilerHoy',0);
  _CD_DENOMS.forEach(d=>_cdSet('cdVenta'+d.id,0));

  if(typeof toast==='function')toast(`✓ Venta $${ventaTotal.toFixed(2)} sumada al saldo. Alquiler $${alqHoy.toFixed(2)} apartado.`);
  _cdActualizarStats();
}

// ══ Copiar saldo a Queda ═════════════════════════════════════════════════
function _cdAplicarSaldoAQueda(){
  _CD_DENOMS.forEach(d=>_cdSet('cdQueda'+d.id,_cdV('cdSaldo'+d.id)));
  if(typeof toast==='function')toast('✓ "Queda en Efectivo" actualizado con el saldo');
  _cdActualizarStats();
}

// ══ Cambios ═════════════════════════════════════════════════════════════
function _cdCalcularCambios(){
  const movs=[];
  _CD_DENOMS.forEach(d=>{
    const sale=_cdV('cdCambioSale'+d.id);
    const haciaId=document.getElementById('cdCambioHacia'+d.id)?.value||'';
    if(sale>0&&haciaId)movs.push({de:d.label,deId:d.id,hacia:_CD_DENOMS.find(x=>x.id===haciaId)?.label||haciaId,haciaId,monto:sale});
  });
  return movs;
}

function _cdAplicarCambios(){
  const movs=_cdCalcularCambios();
  if(!movs.length){if(typeof toast==='function')toast('Ingresa al menos un cambio',true);return;}
  movs.forEach(m=>{
    _cdSet('cdSaldo'+m.deId,Math.max(0,_cdV('cdSaldo'+m.deId)-m.monto));
    _cdSet('cdSaldo'+m.haciaId,_cdV('cdSaldo'+m.haciaId)+m.monto);
    _cdSet('cdQueda'+m.deId,Math.max(0,_cdV('cdQueda'+m.deId)-m.monto));
    _cdSet('cdQueda'+m.haciaId,_cdV('cdQueda'+m.haciaId)+m.monto);
  });
  _CD_DENOMS.forEach(d=>_cdSet('cdCambioSale'+d.id,0));
  if(typeof toast==='function')toast('✓ Cambios aplicados a Saldo y Queda en Efectivo');
  _cdActualizarStats();
}

// ══ Listas ═══════════════════════════════════════════════════════════════
function _cdRenderListas(){
  const gEl=document.getElementById('cdGastosList');
  if(gEl) gEl.innerHTML=_cdGastos.length
    ?_cdGastos.map(x=>{
        const dens=_CD_DENOMS.filter(d=>(x.montos[d.id]||0)>0).map(d=>`<span class="cd-item-denom">${d.label} $${(x.montos[d.id]||0).toFixed(2)}</span>`).join('');
        return`<div class="cd-item-row"><div class="cd-item-head"><span class="cd-item-desc">${x.desc}</span><div style="display:flex;align-items:center;gap:6px;"><span class="cd-item-monto">-$${x.total.toFixed(2)}</span><button class="cd-item-del" onclick="_cdEliminarGasto('${x.id}')">✕</button></div></div><div class="cd-item-denoms">${dens}</div></div>`;
      }).join('')
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
  // Descontar del saldo inmediatamente
  _CD_DENOMS.forEach(d=>{
    if(montos[d.id]>0){
      _cdSet('cdSaldo'+d.id,Math.max(0,_cdV('cdSaldo'+d.id)-montos[d.id]));
    }
  });
  _cdGastos.push({id:_cdUID(),desc,montos,total});
  document.getElementById('cdGastoDesc').value='';
  _CD_DENOMS.forEach(d=>_cdSet('cdGastoForm'+d.id,0));
  _cdRenderListas();
  if(typeof toast==='function')toast(`✓ Pago registrado y descontado del saldo`);
}
function _cdEliminarGasto(id){
  const g=_cdGastos.find(x=>x.id===id);
  if(g){// Devolver al saldo
    _CD_DENOMS.forEach(d=>{if(g.montos[d.id]>0)_cdSet('cdSaldo'+d.id,_cdV('cdSaldo'+d.id)+g.montos[d.id]);});
  }
  _cdGastos=_cdGastos.filter(x=>x.id!==id);_cdRenderListas();
}
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

// ══ Stats ═════════════════════════════════════════════════════════════════
function _cdActualizarStats(){
  // Venta actual (si no se ha aplicado aún)
  const ventaTotal=_cdV('cdVentaTotal');
  const alqHoy=_cdV('cdVentaAlquilerHoy');
  const S=_cdLeerMontos('cdSaldo'),Q=_cdLeerMontos('cdQueda');
  const alquilerAcum=_cdV('cdAlquiler');
  const totalGastos=_cdSumArr(_cdGastos);
  const totalDeudas=_cdDeudas.reduce((s,x)=>s+Number(x.monto||0),0);
  const totalSaldo=_cdTotalM(S);
  const totalQueda=_cdTotalM(Q);
  // Total neto = lo que hay en saldo (ya incluye venta aplicada y gastos descontados)
  const totalEnCaja=totalSaldo;
  const movs=_cdCalcularCambios();
  const $=_cdFmt;

  // Msg alquiler
  const alqMsg=document.getElementById('cdVentaAlqMsg');
  if(alqMsg){if(alqHoy>0){alqMsg.style.display='block';alqMsg.textContent=`🏘 $${alqHoy.toFixed(2)} saldrán de billetes al alquiler. A caja entrarán: $${Math.max(0,ventaTotal-alqHoy).toFixed(2)}`;}else alqMsg.style.display='none';}

  _cdTxt('cdStatVenta',$(ventaTotal||(_cdVentaSnapshot?.total||0)));
  _cdTxt('cdStatGastos',$(totalGastos));
  _cdTxt('cdStatSaldo',$(totalEnCaja));
  _cdTxt('cdVentaDesgloseTotal',$(_cdTotalM(_cdLeerMontos('cdVenta'))));
  _cdTxt('cdSaldoTotal',$(totalSaldo));
  _cdTxt('cdAlquilerTotal',$(alquilerAcum));
  _cdTxt('cdCajaAlquilerTotal',$(totalSaldo+alquilerAcum));
  _cdTxt('cdGastosTotal',$(totalGastos));
  _cdTxt('cdDeudasTotal',$(totalDeudas));
  _cdTxt('cdQuedaTotal',$(totalQueda));

  // Cambios panel
  const cambioRes=document.getElementById('cdCambioResumen');
  if(cambioRes) cambioRes.innerHTML=movs.length
    ?movs.map(m=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--surface);border:1px solid var(--border);border-radius:8px;margin-bottom:5px;font-size:12px;font-family:Nunito,sans-serif;"><span style="font-weight:900;color:#dc2626;">${m.de} −$${m.monto.toFixed(2)}</span><span style="color:var(--text-muted);">→</span><span style="font-weight:900;color:#15803d;">${m.hacia} +$${m.monto.toFixed(2)}</span></div>`).join(''):'';

  // ── Captura ──────────────────────────────────────────────────────────
  // Usar snapshot si existe (venta ya aplicada), si no usar inputs actuales
  const snap=_cdVentaSnapshot;
  const capVentaTotal=snap?snap.total:ventaTotal;
  const capAlqHoy=snap?snap.alqHoy:alqHoy;
  const capV=snap?snap.montos:_cdLeerMontos('cdVenta');

  _cdTxt('capVentaTotal',$(capVentaTotal));
  _cdTxt('capVBilletes',$(capV.Billetes||0));_cdTxt('capVMonedas',$(capV.Monedas||0));_cdTxt('capVCoras',$(capV.Coras||0));
  _cdTxt('capVC10',$(capV.C10||0));_cdTxt('capVC05',$(capV.C05||0));_cdTxt('capVC01',$(capV.C01||0));
  _cdTxt('capVentaLabel',$(capVentaTotal));
  const alqWrap=document.getElementById('capAlqHoyWrap');if(alqWrap)alqWrap.style.display=capAlqHoy>0?'':'none';
  _cdTxt('capAlqHoy',$(capAlqHoy));
  const menosAlqWrap=document.getElementById('capVentaMenosAlqWrap');if(menosAlqWrap)menosAlqWrap.style.display=capAlqHoy>0?'':'none';
  _cdTxt('capVentaMenosAlq',$(capAlqHoy));

  _cdTxt('capSBilletes',$(S.Billetes));_cdTxt('capSMonedas',$(S.Monedas));_cdTxt('capSCoras',$(S.Coras));
  _cdTxt('capSC10',$(S.C10));_cdTxt('capSC05',$(S.C05));_cdTxt('capSC01',$(S.C01));
  _cdTxt('capSaldoPrevio',$(totalSaldo));

  // Gastos
  const capGD=document.getElementById('capGastosDetalleList');
  if(capGD) capGD.innerHTML=_cdGastos.length
    ?_cdGastos.map(x=>{
        const dens=_CD_DENOMS.filter(d=>(x.montos[d.id]||0)>0).map(d=>`<div class="cd-cap-row" style="font-size:18px;padding:4px 0;border-bottom:1px solid #f0f9ff;"><span>${d.label}</span><span class="val-neg">$${(x.montos[d.id]||0).toFixed(2)}</span></div>`).join('');
        return`<div class="cd-cap-row" style="font-weight:900;font-size:20px;padding:6px 0 2px;border-bottom:none;"><span>${x.desc}</span><span class="val-neg">-$${x.total.toFixed(2)}</span></div>${dens}`;
      }).join('')
    :`<div class="cd-cap-row"><span>Sin gastos</span><span>—</span></div>`;
  _cdTxt('capGTotal',$(totalGastos));

  // Cambios en captura (Punto 5)
  const capCL=document.getElementById('capCambiosList');
  if(capCL) capCL.innerHTML=movs.length
    ?movs.map(m=>`<div class="cd-cap-row"><span>${m.de}→${m.hacia}</span><span>$${m.monto.toFixed(2)}</span></div>`).join('')
    :`<div class="cd-cap-row"><span>Sin cambios registrados</span><span>—</span></div>`;

  // Deudas
  const capD=document.getElementById('capDeudasList');
  if(capD) capD.innerHTML=_cdDeudas.length
    ?_cdDeudas.map(x=>`<div class="cd-cap-row"><span>${x.desc}</span><span class="val-purple">$${Number(x.monto||0).toFixed(2)}</span></div>`).join('')
    :`<div class="cd-cap-row"><span>Sin pendientes</span><span>—</span></div>`;
  _cdTxt('capDTotal',$(totalDeudas));

  _cdTxt('capQBilletes',$(Q.Billetes));_cdTxt('capQMonedas',$(Q.Monedas));_cdTxt('capQCoras',$(Q.Coras));
  _cdTxt('capQC10',$(Q.C10));_cdTxt('capQC05',$(Q.C05));_cdTxt('capQC01',$(Q.C01));_cdTxt('capQTotal',$(totalQueda));

  // Alquiler grande
  _cdTxt('capAlquilerTotalBig',$(alquilerAcum));

  // Total neto = saldo actual (ya tiene venta aplicada y gastos restados)
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
    const canvas=await window.html2canvas(el,{scale:1,useCORS:true,backgroundColor:'#ffffff',width:1080,height:Math.max(1920,el.scrollHeight),windowWidth:1080});
    const out=document.createElement('canvas');out.width=1080;out.height=1920;
    const ctx=out.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,1080,1920);ctx.drawImage(canvas,0,0);
    const link=document.createElement('a');link.download=`Cierre_${_cdFecha}.png`;link.href=out.toDataURL('image/png');
    document.body.appendChild(link);link.click();document.body.removeChild(link);
    if(typeof toast==='function')toast('📸 Imagen 1080×1920 descargada');
  }catch(e){if(typeof toast==='function')toast('⚠ Error: '+e.message,true);}
  finally{if(btn){btn.disabled=false;btn.innerHTML='📸 Descargar imagen (1080×1920) para WhatsApp';}}
}

// ══ Fecha ════════════════════════════════════════════════════════════════
function _cdCambiarFecha(fecha){
  _cdFecha=fecha;_cdVentaSnapshot=null;
  _cdTxt('cdHeroFechaLbl',_cdFmtFecha(fecha));_cdTxt('cdCapFecha',_cdFmtFecha(fecha).toUpperCase());
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
window._cdTomarCaptura           = _cdTomarCaptura;
window._cdAplicarVentaASaldo     = _cdAplicarVentaASaldo;
window._cdAplicarSaldoAQueda     = _cdAplicarSaldoAQueda;
window._cdAplicarCambios         = _cdAplicarCambios;
