// =====================================================================
//  📋 CIERRE DIARIO DE CAJA — v5
// =====================================================================
(function _estilosCierre() {
  if (document.getElementById('cierreDiaStyles')) return;
  const s = document.createElement('style');
  s.id = 'cierreDiaStyles';
  s.textContent = `
    #pgCierreDia { padding:0 0 100px; }
    /* Hero */
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
    /* Body */
    .cd-body { padding:0 14px;display:flex;flex-direction:column;gap:16px; }
    .cd-panel { background:var(--surface2);border:1.5px solid var(--border);border-radius:16px;overflow:hidden; }
    .cd-panel-header { display:flex;align-items:center;gap:9px;padding:12px 16px;border-bottom:1px solid var(--border);background:var(--surface); }
    .cd-panel-icon { width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0; }
    .cd-panel-title { font-size:13px;font-weight:900;color:var(--text);font-family:Nunito,sans-serif;flex:1; }
    .cd-panel-body { padding:14px 16px; }
    /* Grid inputs */
    .cd-montos-grid { display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:4px; }
    @media(min-width:480px){ .cd-montos-grid { grid-template-columns:repeat(3,1fr); } }
    .cd-field label { display:block;font-size:10px;font-weight:900;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.4px;font-family:Nunito,sans-serif;margin-bottom:4px; }
    .cd-inp { width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:14px;font-weight:900;font-family:Nunito,sans-serif;color:var(--text);background:var(--surface);box-sizing:border-box;outline:none;transition:border-color 0.2s; }
    .cd-inp:focus { border-color:#0369a1;background:#fff; }
    .cd-inp.big { font-size:20px;padding:12px 14px; }
    /* Totals */
    .cd-total-row { display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#f0f9ff;border-radius:10px;font-family:Nunito,sans-serif;margin-top:8px; }
    .cd-total-row span:first-child { font-size:12px;font-weight:900;color:#0369a1; }
    .cd-total-row span:last-child  { font-size:17px;font-weight:900;color:#0369a1; }
    .cd-total-row.green span { color:#15803d!important;background:transparent; } .cd-total-row.green { background:#f0fdf4; }
    .cd-total-row.amber span { color:#b45309!important; } .cd-total-row.amber { background:#fffbeb; }
    .cd-total-row.red   span { color:#dc2626!important; } .cd-total-row.red   { background:#fef2f2; }
    .cd-total-row.purple span { color:#7c3aed!important; } .cd-total-row.purple { background:#faf5ff; }
    /* Separator */
    .cd-sep { font-size:10px;font-weight:900;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;margin-top:14px; }
    /* Update button */
    .cd-btn-update { display:flex;align-items:center;gap:6px;padding:8px 14px;background:rgba(3,105,161,0.1);border:1.5px solid rgba(3,105,161,0.3);border-radius:9px;font-size:12px;font-weight:900;font-family:Nunito,sans-serif;color:#0369a1;cursor:pointer;transition:all 0.15s;white-space:nowrap; }
    .cd-btn-update:hover { background:rgba(3,105,161,0.18); }
    /* Gastos list */
    .cd-item-list { display:flex;flex-direction:column;gap:6px;margin-bottom:10px; }
    .cd-item-row { background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:10px 12px; }
    .cd-item-head { display:flex;align-items:center;justify-content:space-between;margin-bottom:4px; }
    .cd-item-desc { font-size:12px;font-weight:900;color:var(--text);font-family:Nunito,sans-serif; }
    .cd-item-monto { font-size:13px;font-weight:900;color:#dc2626;font-family:Nunito,sans-serif; }
    .cd-item-del { background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:14px;padding:2px 5px;border-radius:5px; }
    .cd-item-del:hover { background:rgba(220,38,38,0.1);color:#dc2626; }
    .cd-item-denoms { display:flex;flex-wrap:wrap;gap:4px;margin-top:4px; }
    .cd-item-denom { font-size:10px;font-weight:700;font-family:Nunito,sans-serif;background:#fef2f2;border:1px solid #fca5a5;border-radius:5px;padding:2px 7px;color:#dc2626; }
    /* Add gasto */
    .cd-btn-add { padding:10px 14px;background:#0369a1;color:#fff;border:none;border-radius:10px;font-size:12px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;white-space:nowrap;transition:all 0.15s; }
    .cd-btn-add:hover { background:#075985; }
    /* Cambios */
    .cd-cambio-grid { display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:4px; }
    @media(min-width:480px){ .cd-cambio-grid { grid-template-columns:repeat(3,1fr); } }
    .cd-cambio-item { background:var(--surface);border:1.5px solid var(--border);border-radius:10px;padding:10px 11px; }
    .cd-cambio-lbl { font-size:10px;font-weight:900;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.4px;font-family:Nunito,sans-serif;margin-bottom:6px; }
    /* Deudas */
    .cd-add-row { display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:end; }

    /* ── RESUMEN CAPTURA (optimizado para smartphone) ── */
    .cd-resumen-captura {
      background:#fff; border:2.5px solid #0369a1; border-radius:16px;
      padding:16px; font-family:Nunito,sans-serif; width:100%; box-sizing:border-box;
    }
    .cd-cap-title { font-size:18px;font-weight:900;color:#0c4a6e;text-align:center;margin-bottom:3px; }
    .cd-cap-fecha { font-size:12px;font-weight:700;color:#0369a1;text-align:center;margin-bottom:14px; }

    /* Dos columnas horizontales para captura */
    .cd-cap-2col { display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px; }
    .cd-cap-col { border:1.5px solid #bae6fd;border-radius:10px;padding:10px; }

    /* Sección dentro de columna */
    .cd-cap-section-title {
      font-size:10px;font-weight:900;color:#0369a1;text-transform:uppercase;letter-spacing:0.5px;
      background:#e0f2fe;border-radius:6px;padding:4px 8px;margin-bottom:6px;text-align:center;
    }
    /* Fila con línea de cuaderno */
    .cd-cap-row {
      display:flex;justify-content:space-between;align-items:center;
      font-size:11px;font-weight:700;color:#1e3a5f;padding:4px 0;
      border-bottom:1px solid #e0f2fe; /* línea pálida tipo cuaderno */
    }
    .cd-cap-row:last-child { border-bottom:none; }
    .cd-cap-row.total {
      font-size:13px;font-weight:900;
      border-top:2px solid #0369a1; /* línea azul marcada para totales */
      border-bottom:none;margin-top:4px;padding-top:5px;
    }
    .cd-cap-row.grand {
      font-size:13px;font-weight:900;color:#0c4a6e;
      background:#e0f2fe;border-radius:8px;padding:7px 9px;margin-top:6px;
      border-bottom:none;
    }
    .val-pos { color:#15803d; } .val-neg { color:#dc2626; } .val-warn { color:#b45309; }
    .val-blue { color:#0369a1; } .val-purple { color:#7c3aed; }

    /* Divisor azul entre bloques de 2 columnas */
    .cd-cap-divider { height:2px;background:#0369a1;border-radius:2px;margin:10px 0;opacity:0.35; }

    /* Botones */
    .btn-cd-guardar { width:100%;padding:14px;background:linear-gradient(135deg,#0369a1,#075985);color:#fff;border:none;border-radius:13px;font-size:15px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(3,105,161,0.35);transition:all 0.15s;display:flex;align-items:center;justify-content:center;gap:8px; }
    .btn-cd-guardar:hover { transform:translateY(-1px); }
    .btn-cd-guardar:disabled { opacity:0.6;cursor:wait;transform:none; }
    .btn-cd-captura { width:100%;padding:13px;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;border:none;border-radius:13px;font-size:14px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(22,163,74,0.3);transition:all 0.15s;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:10px; }
    .btn-cd-captura:hover { transform:translateY(-1px); }
    /* Historial */
    .cd-hist-item { padding:10px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;cursor:pointer;transition:background 0.15s; }
    .cd-hist-item:hover { background:#f0f9ff; } .cd-hist-item:last-child { border-bottom:none; }
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
let _cdGastos    = []; // [{id,desc,montos:{billetes,monedas,coras,c10,c05,c01},total}]
let _cdDeudas    = [];
let _cdHistorial = [];
const _CD_DENOMS = [
  {id:'Billetes',label:'💵 Billetes'},{id:'Monedas',label:'🪙 M. Dólar'},
  {id:'Coras',label:'🔵 Coras'},{id:'C10',label:'🟡 10 cts'},
  {id:'C05',label:'🟤 5 cts'},{id:'C01',label:'⚪ 1 cto'},
];

// ══ Helpers ══════════════════════════════════════════════════════════════
function _cdFmtFecha(iso){if(!iso)return'—';const[y,m,d]=iso.split('-');const dN=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];return`${dN[new Date(iso+'T12:00:00').getDay()]} ${d}/${m}/${y.slice(2)}`;}
function _cdUID(){return'cd_'+Date.now()+'_'+Math.random().toString(36).slice(2,5);}
function _cdV(id){return parseFloat(document.getElementById(id)?.value||'0')||0;}
function _cdSet(id,v){const e=document.getElementById(id);if(e&&v!=null)e.value=v;}
function _cdTxt(id,v){const e=document.getElementById(id);if(e)e.textContent=v;}
function _cdSumArr(arr){return arr.reduce((s,x)=>s+Number(x.total||0),0);}
function _cdFmt(n){return'$'+n.toFixed(2);}
function _cdLeerMontos(px){return{billetes:_cdV(px+'Billetes'),monedas:_cdV(px+'Monedas'),coras:_cdV(px+'Coras'),c10:_cdV(px+'C10'),c05:_cdV(px+'C05'),c01:_cdV(px+'C01')};}
function _cdTotalM(m){return m.billetes+m.monedas+m.coras+m.c10+m.c05+m.c01;}

// ══ Persistencia ════════════════════════════════════════════════════════
async function _cdCargarHistorial(){try{const r=await idbGet('vpos_cierreDiario');_cdHistorial=r||[];}catch(e){_cdHistorial=[];}}
async function _cdGuardarHistorial(){try{await idbSet('vpos_cierreDiario',_cdHistorial);}catch(e){}}
async function _cdSubirSupabase(cierre){
  if(typeof _sbPost!=='function'||typeof _getTiendaId!=='function')return false;
  try{await _sbPost('cierre_diario',{id:_getTiendaId()+'_'+cierre.fecha,tienda_id:_getTiendaId(),fecha:cierre.fecha,datos:JSON.stringify(cierre),updated_at:new Date().toISOString()},true);return true;}
  catch(e){console.warn('[CD]',e.message);return false;}
}
async function _cdCargarSupabase(){
  if(typeof _sbGet!=='function'||typeof _getTiendaId!=='function')return;
  try{const rows=await _sbGet('cierre_diario',{select:'fecha,datos',tienda_id:'eq.'+_getTiendaId(),order:'fecha.desc',limit:30});
    if(rows&&rows.length)_cdHistorial=rows.map(r=>typeof r.datos==='string'?JSON.parse(r.datos):r.datos);}
  catch(e){}
}

// ══ HTML reutilizable para bloque de montos ══════════════════════════════
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

// ══ Render principal ════════════════════════════════════════════════════
async function renderCierreDia(pgId){
  pgId=pgId||'pgCierreDia';
  const pg=document.getElementById(pgId);if(!pg)return;
  await _cdCargarHistorial();await _cdCargarSupabase();
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
          <button class="cd-btn-update" onclick="_cdPropagar('venta')" title="Propagar a Saldo en Caja">🔄 Actualizar Saldo</button>
        </div>
        <div class="cd-panel-body">
          <div class="cd-field" style="margin-bottom:12px;">
            <label>Total vendido ($)</label>
            <input class="cd-inp big" type="number" id="cdVentaTotal" min="0" step="0.01" placeholder="0.00" value="${vSug>0?vSug.toFixed(2):''}" oninput="_cdActualizarStats()">
            ${vSug>0?`<div style="font-size:11px;color:#0369a1;font-weight:700;margin-top:4px;">💡 Del POS de hoy: $${vSug.toFixed(2)}</div>`:''}
          </div>
          <div class="cd-field" style="margin-bottom:12px;">
            <label>🏘 Apartar para alquiler hoy ($)</label>
            <input class="cd-inp" type="number" id="cdVentaAlquilerHoy" min="0" step="0.01" placeholder="0.00" oninput="_cdActualizarStats()">
          </div>
          <div class="cd-sep">Desglose del dinero recibido</div>
          ${_cdBloqueMontosHTML('cdVenta')}
          <div class="cd-total-row"><span>Suma desglose</span><span id="cdVentaDesgloseTotal">$0.00</span></div>
        </div>
      </div>

      <!-- SALDO EN CAJA -->
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#dcfce7;">🏦</div>
          <div class="cd-panel-title">Saldo en Caja</div>
          <button class="cd-btn-update" onclick="_cdPropagar('saldo')" title="Propagar a Esto Queda en Efectivo">🔄 Actualizar Queda</button>
        </div>
        <div class="cd-panel-body">
          <div style="font-size:11px;color:var(--text-muted);font-weight:700;margin-bottom:10px;">Dinero en caja <strong>antes</strong> de la venta de hoy</div>
          ${_cdBloqueMontosHTML('cdSaldo')}
          <div class="cd-field" style="margin-top:12px;">
            <label>🏘 Alquiler acumulado total ($) — antes de hoy</label>
            <input class="cd-inp" type="number" id="cdAlquiler" min="0" step="0.01" placeholder="0.00" oninput="_cdActualizarStats()">
          </div>
          <div class="cd-total-row green"><span>Total saldo previo en caja</span><span id="cdSaldoTotal">$0.00</span></div>
          <div class="cd-total-row amber" style="margin-top:6px;"><span>Total dinero en el alquiler</span><span id="cdAlquilerTotal">$0.00</span></div>
          <div class="cd-total-row" style="margin-top:6px;background:#e0f2fe;"><span style="color:#0369a1;font-weight:900;">💰 Total caja + alquiler</span><span id="cdCajaAlquilerTotal" style="color:#0369a1;">$0.00</span></div>
        </div>
      </div>

      <!-- GASTOS / PAGOS DEL DÍA — con desglose por denominación -->
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#fee2e2;">📤</div>
          <div class="cd-panel-title">Gastos / Pagos del Día</div>
        </div>
        <div class="cd-panel-body">
          <div class="cd-item-list" id="cdGastosList"></div>
          <!-- Formulario nuevo gasto -->
          <div style="background:#fef2f2;border:1.5px solid #fca5a5;border-radius:12px;padding:12px;margin-top:4px;">
            <div style="font-size:11px;font-weight:900;color:#dc2626;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:10px;">➕ Registrar gasto / pago</div>
            <div class="cd-field" style="margin-bottom:10px;">
              <label>Descripción del pago</label>
              <input class="cd-inp" type="text" id="cdGastoDesc" placeholder="Ej: Se pagó la Coca Cola…">
            </div>
            <div class="cd-sep" style="margin-top:0;">¿Qué se sacó de caja para pagar?</div>
            ${_cdBloqueMontosHTML('cdGastoForm')}
            <button class="cd-btn-add" style="width:100%;margin-top:10px;background:#dc2626;" onclick="_cdAgregarGasto()">
              ✅ Registrar pago
            </button>
          </div>
          <div class="cd-total-row red" style="margin-top:12px;"><span>Total gastos del día</span><span id="cdGastosTotal">$0.00</span></div>
        </div>
      </div>

      <!-- CAMBIOS DEL DÍA -->
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#fef3c7;">🔄</div>
          <div class="cd-panel-title">Cambios del Día</div>
        </div>
        <div class="cd-panel-body">
          <div style="font-size:11px;color:var(--text-muted);font-weight:700;margin-bottom:12px;">Solo redistribuyen el efectivo — el total en caja no cambia.</div>
          <div class="cd-cambio-grid">${cambioGrid}</div>
          <div id="cdCambioResumen" style="margin-top:12px;"></div>
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
          <div class="cd-total-row purple"><span>Total pendiente</span><span id="cdDeudasTotal">$0.00</span></div>
        </div>
      </div>

      <!-- ESTO QUEDA EN EFECTIVO -->
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

      <!-- RESUMEN CAPTURA — layout horizontal 2 columnas -->
      <div class="cd-resumen-captura" id="cdResumenCaptura">
        <div class="cd-cap-title">📋 CIERRE DE CAJA</div>
        <div class="cd-cap-fecha" id="cdCapFecha">${_cdFmtFecha(_cdFecha).toUpperCase()}</div>

        <!-- Fila 1: Venta del Día + Saldo en Caja -->
        <div class="cd-cap-2col">
          <div class="cd-cap-col">
            <div class="cd-cap-section-title">💹 Venta del Día</div>
            <div class="cd-cap-row"><span>Total</span><span class="val-blue" id="capVentaTotal">$0.00</span></div>
            <div class="cd-cap-row"><span>💵 Billetes</span><span id="capVBilletes">$0.00</span></div>
            <div class="cd-cap-row"><span>🪙 M. Dólar</span><span id="capVMonedas">$0.00</span></div>
            <div class="cd-cap-row"><span>🔵 Coras</span><span id="capVCoras">$0.00</span></div>
            <div class="cd-cap-row"><span>🟡 10 cts</span><span id="capVC10">$0.00</span></div>
            <div class="cd-cap-row"><span>🟤 5 cts</span><span id="capVC05">$0.00</span></div>
            <div class="cd-cap-row"><span>⚪ 1 cto</span><span id="capVC01">$0.00</span></div>
            <div id="capAlqHoyRow" style="display:none;"><div class="cd-cap-row"><span>🏘 Alq. hoy</span><span class="val-warn" id="capAlqHoy">$0.00</span></div></div>
            <div class="cd-cap-row total"><span>Para caja</span><span class="val-pos" id="capVentaParaCaja">$0.00</span></div>
          </div>
          <div class="cd-cap-col">
            <div class="cd-cap-section-title">🏦 Saldo en Caja</div>
            <div class="cd-cap-row"><span>💵 Billetes</span><span id="capSBilletes">$0.00</span></div>
            <div class="cd-cap-row"><span>🪙 M. Dólar</span><span id="capSMonedas">$0.00</span></div>
            <div class="cd-cap-row"><span>🔵 Coras</span><span id="capSCoras">$0.00</span></div>
            <div class="cd-cap-row"><span>🟡 10 cts</span><span id="capSC10">$0.00</span></div>
            <div class="cd-cap-row"><span>🟤 5 cts</span><span id="capSC05">$0.00</span></div>
            <div class="cd-cap-row"><span>⚪ 1 cto</span><span id="capSC01">$0.00</span></div>
            <div class="cd-cap-row"><span>🏘 Alquiler</span><span class="val-warn" id="capAlquilerTotal">$0.00</span></div>
            <div class="cd-cap-row total"><span>Previo</span><span class="val-pos" id="capSaldoPrevio">$0.00</span></div>
          </div>
        </div>

        <div class="cd-cap-divider"></div>

        <!-- Fila 2: Gastos + Cambios -->
        <div class="cd-cap-2col">
          <div class="cd-cap-col">
            <div class="cd-cap-section-title">📤 Gastos / Pagos</div>
            <div id="capGastosDetalleList"><div class="cd-cap-row"><span>Sin gastos</span><span>—</span></div></div>
            <div class="cd-cap-row total"><span>Total</span><span class="val-neg" id="capGTotal">$0.00</span></div>
          </div>
          <div class="cd-cap-col">
            <div class="cd-cap-section-title">🔄 Cambios del Día</div>
            <div id="capCambiosList"><div class="cd-cap-row"><span>Sin cambios</span><span>—</span></div></div>
            <div style="font-size:9px;color:var(--text-muted);font-weight:700;margin-top:6px;font-family:Nunito,sans-serif;">* No afectan el total</div>
          </div>
        </div>

        <div class="cd-cap-divider"></div>

        <!-- Fila 3: Pendientes + Queda en Efectivo -->
        <div class="cd-cap-2col">
          <div class="cd-cap-col">
            <div class="cd-cap-section-title">📝 Pendientes</div>
            <div id="capDeudasList"><div class="cd-cap-row"><span>Sin pendientes</span><span>—</span></div></div>
            <div class="cd-cap-row total"><span>Total</span><span class="val-purple" id="capDTotal">$0.00</span></div>
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

        <!-- Gran total + caja+alquiler -->
        <div class="cd-cap-row grand" style="margin-top:8px;">
          <span>💰 Total caja + alquiler</span><span id="capCajaAlquiler">$0.00</span>
        </div>
        <div class="cd-cap-row grand" style="margin-top:4px;">
          <span>🏦 Total en caja (saldo+venta−gastos)</span><span id="capTotalGeneral">$0.00</span>
        </div>

        <div id="capNotaWrap" style="display:none;margin-top:10px;padding:10px;background:#f0f9ff;border-radius:8px;font-size:12px;font-weight:700;color:#0369a1;font-family:Nunito,sans-serif;"></div>

        <button class="btn-cd-guardar" id="btnCdGuardar" onclick="_cdGuardarCierre()" style="margin-top:16px;">💾 Guardar y enviar reporte</button>
        <button class="btn-cd-captura" onclick="_cdTomarCaptura()">📸 Descargar captura para WhatsApp</button>
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
  _cdRenderListas();_cdActualizarStats();
}

// ══ Propagar valores ════════════════════════════════════════════════════
// Botón "Actualizar Saldo": suma venta al saldo en caja
function _cdPropagar(origen){
  if(origen==='venta'){
    // Sumar cada campo de venta a saldo
    _CD_DENOMS.forEach(d=>{
      const venta=_cdV('cdVenta'+d.id);
      const saldoActual=_cdV('cdSaldo'+d.id);
      _cdSet('cdSaldo'+d.id,(saldoActual+venta).toFixed(2));
    });
    if(typeof toast==='function') toast('✓ Saldo actualizado con la venta del día');
  }
  if(origen==='saldo'){
    // Copiar saldo a queda
    _CD_DENOMS.forEach(d=>{
      _cdSet('cdQueda'+d.id,_cdV('cdSaldo'+d.id).toFixed(2));
    });
    if(typeof toast==='function') toast('✓ "Queda en Efectivo" actualizado con el saldo');
  }
  _cdActualizarStats();
}

// ══ Listas ═══════════════════════════════════════════════════════════════
function _cdRenderListas(){
  const gEl=document.getElementById('cdGastosList');
  if(gEl) gEl.innerHTML=_cdGastos.length
    ?_cdGastos.map(x=>{
        const denStr=_CD_DENOMS.filter(d=>(x.montos[d.id.toLowerCase()]||x.montos[d.id]||0)>0)
          .map(d=>`<span class="cd-item-denom">${d.label} $${((x.montos[d.id.toLowerCase()]||x.montos[d.id]||0)).toFixed(2)}</span>`).join('');
        return`<div class="cd-item-row">
          <div class="cd-item-head"><span class="cd-item-desc">${x.desc}</span><div style="display:flex;align-items:center;gap:6px;"><span class="cd-item-monto">-$${x.total.toFixed(2)}</span><button class="cd-item-del" onclick="_cdEliminarGasto('${x.id}')">✕</button></div></div>
          <div class="cd-item-denoms">${denStr}</div>
        </div>`;}).join('')
    :`<div style="font-size:12px;color:var(--text-muted);font-weight:700;padding:4px 0;">Sin gastos registrados</div>`;
  const dEl=document.getElementById('cdDeudasList');
  if(dEl) dEl.innerHTML=_cdDeudas.length
    ?_cdDeudas.map(x=>`<div class="cd-item-row"><div class="cd-item-head"><span class="cd-item-desc">${x.desc}</span><div style="display:flex;align-items:center;gap:6px;"><span class="cd-item-monto" style="color:#7c3aed;">$${Number(x.total||x.monto||0).toFixed(2)}</span><button class="cd-item-del" onclick="_cdEliminarDeuda('${x.id}')">✕</button></div></div></div>`).join('')
    :`<div style="font-size:12px;color:var(--text-muted);font-weight:700;padding:4px 0;">Sin pendientes</div>`;
  _cdActualizarStats();
}

// ── Agregar gasto con desglose por denominación ───────────────────────
function _cdAgregarGasto(){
  const desc=document.getElementById('cdGastoDesc')?.value?.trim();
  if(!desc){if(typeof toast==='function')toast('Escribe una descripción',true);return;}
  const montos={};
  let total=0;
  _CD_DENOMS.forEach(d=>{
    const v=_cdV('cdGastoForm'+d.id);
    montos[d.id]=v;
    total+=v;
  });
  if(total<=0){if(typeof toast==='function')toast('Ingresa al menos un monto',true);return;}
  _cdGastos.push({id:_cdUID(),desc,montos,total});
  // Limpiar formulario
  document.getElementById('cdGastoDesc').value='';
  _CD_DENOMS.forEach(d=>{_cdSet('cdGastoForm'+d.id,0);});
  _cdRenderListas();
}
function _cdEliminarGasto(id){_cdGastos=_cdGastos.filter(x=>x.id!==id);_cdRenderListas();}
function _cdAgregarDeuda(){
  const desc=document.getElementById('cdDeudaDesc')?.value?.trim();
  const monto=parseFloat(document.getElementById('cdDeudaMonto')?.value||'0');
  if(!desc){if(typeof toast==='function')toast('Escribe una descripción',true);return;}
  if(!monto||monto<=0){if(typeof toast==='function')toast('Monto inválido',true);return;}
  _cdDeudas.push({id:_cdUID(),desc,monto,total:monto});
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

// ══ Stats y resumen ══════════════════════════════════════════════════════
function _cdActualizarStats(){
  const ventaTotal=_cdV('cdVentaTotal');
  const alqHoy=_cdV('cdVentaAlquilerHoy');
  const ventaParaCaja=ventaTotal-alqHoy;
  const V=_cdLeerMontos('cdVenta'),S=_cdLeerMontos('cdSaldo'),Q=_cdLeerMontos('cdQueda');
  const alquilerPrevio=_cdV('cdAlquiler');
  const alquilerTotal=alquilerPrevio+alqHoy;
  const totalGastos=_cdSumArr(_cdGastos);
  const totalDeudas=_cdDeudas.reduce((s,x)=>s+Number(x.total||x.monto||0),0);
  const totalSaldoPrev=_cdTotalM(S);
  const totalQueda=_cdTotalM(Q);
  const totalEnCaja=totalSaldoPrev+ventaParaCaja-totalGastos;
  const movimientos=_cdCalcularCambios();
  const $=_cdFmt;

  _cdTxt('cdStatVenta',$(ventaTotal));_cdTxt('cdStatGastos',$(totalGastos));_cdTxt('cdStatSaldo',$(totalEnCaja));
  _cdTxt('cdVentaDesgloseTotal',$(_cdTotalM(V)));
  _cdTxt('cdSaldoTotal',$(totalSaldoPrev));_cdTxt('cdAlquilerTotal',$(alquilerTotal));
  _cdTxt('cdCajaAlquilerTotal',$(totalSaldoPrev+alquilerTotal));
  _cdTxt('cdGastosTotal',$(totalGastos));_cdTxt('cdDeudasTotal',$(totalDeudas));_cdTxt('cdQuedaTotal',$(totalQueda));

  // Resumen cambios en panel
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
  const alqHoyRow=document.getElementById('capAlqHoyRow');
  if(alqHoyRow)alqHoyRow.style.display=alqHoy>0?'':'none';
  _cdTxt('capAlqHoy',$(alqHoy));_cdTxt('capVentaParaCaja',$(ventaParaCaja));

  _cdTxt('capSBilletes',$(S.billetes));_cdTxt('capSMonedas',$(S.monedas));_cdTxt('capSCoras',$(S.coras));
  _cdTxt('capSC10',$(S.c10));_cdTxt('capSC05',$(S.c05));_cdTxt('capSC01',$(S.c01));
  _cdTxt('capAlquilerTotal',$(alquilerTotal));_cdTxt('capSaldoPrevio',$(totalSaldoPrev));

  // Gastos en captura — mostrar por item con sus denominaciones
  const capGD=document.getElementById('capGastosDetalleList');
  if(capGD) capGD.innerHTML=_cdGastos.length
    ?_cdGastos.map(x=>{
        const denStr=_CD_DENOMS.filter(d=>(x.montos[d.id]||0)>0).map(d=>`<div class="cd-cap-row" style="font-size:10px;padding:2px 0;border-bottom:1px solid #f0f0f0;"><span>  ${d.label}</span><span class="val-neg">$${(x.montos[d.id]||0).toFixed(2)}</span></div>`).join('');
        return`<div class="cd-cap-row" style="font-weight:900;padding:4px 0 2px;border-bottom:none;"><span>${x.desc}</span><span class="val-neg">-$${x.total.toFixed(2)}</span></div>${denStr}`;
      }).join('')
    :`<div class="cd-cap-row"><span>Sin gastos</span><span>—</span></div>`;
  _cdTxt('capGTotal',$(totalGastos));

  const capCL=document.getElementById('capCambiosList');
  if(capCL) capCL.innerHTML=movimientos.length
    ?movimientos.map(m=>`<div class="cd-cap-row"><span>${m.de}→${m.hacia}</span><span>$${m.monto.toFixed(2)}</span></div>`).join('')
    :`<div class="cd-cap-row"><span>Sin cambios</span><span>—</span></div>`;

  const capD=document.getElementById('capDeudasList');
  if(capD) capD.innerHTML=_cdDeudas.length
    ?_cdDeudas.map(x=>`<div class="cd-cap-row"><span>${x.desc}</span><span class="val-purple">$${(x.total||x.monto||0).toFixed(2)}</span></div>`).join('')
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

// ══ Captura ═══════════════════════════════════════════════════════════════
async function _cdTomarCaptura(){
  const el=document.getElementById('cdResumenCaptura');if(!el)return;
  const btn=document.querySelector('.btn-cd-captura');
  if(btn){btn.disabled=true;btn.innerHTML='⏳ Generando…';}
  try{
    if(!window.html2canvas){
      await new Promise((res,rej)=>{const sc=document.createElement('script');sc.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';sc.onload=res;sc.onerror=rej;document.head.appendChild(sc);});
    }
    const canvas=await window.html2canvas(el,{scale:2,useCORS:true,backgroundColor:'#ffffff',width:el.offsetWidth,height:el.scrollHeight,windowWidth:el.offsetWidth});
    const link=document.createElement('a');link.download=`Cierre_${_cdFecha}.png`;link.href=canvas.toDataURL('image/png');
    document.body.appendChild(link);link.click();document.body.removeChild(link);
    if(typeof toast==='function')toast('📸 Captura lista para WhatsApp');
  }catch(e){if(typeof toast==='function')toast('⚠ Error: '+e.message,true);}
  finally{if(btn){btn.disabled=false;btn.innerHTML='📸 Descargar captura para WhatsApp';}}
}

// ══ Fecha ════════════════════════════════════════════════════════════════
function _cdCambiarFecha(fecha){
  _cdFecha=fecha;_cdTxt('cdHeroFechaLbl',_cdFmtFecha(fecha));_cdTxt('cdCapFecha',_cdFmtFecha(fecha).toUpperCase());
  _cdGastos=[];_cdDeudas=[];
  const ex=_cdHistorial.find(c=>c.fecha===fecha);
  if(ex)_cdCargarCierreEnForm(ex);else{_cdRenderListas();_cdActualizarStats();}
}
function _cdCargarCierreEnForm(c){
  _cdGastos=(c.gastos||[]).map(x=>({...x,id:x.id||_cdUID(),total:x.total||x.monto||0}));
  _cdDeudas=(c.deudas||[]).map(x=>({...x,id:x.id||_cdUID(),total:x.total||x.monto||0}));
  _cdSet('cdVentaTotal',c.ventaTotal);_cdSet('cdVentaAlquilerHoy',c.ventaAlquilerHoy||0);
  const ss=(px,obj)=>{if(!obj)return;_cdSet(px+'Billetes',obj.billetes);_cdSet(px+'Monedas',obj.monedas);_cdSet(px+'Coras',obj.coras);_cdSet(px+'C10',obj.c10);_cdSet(px+'C05',obj.c05);_cdSet(px+'C01',obj.c01);};
  ss('cdVenta',c.ventaMontos);ss('cdSaldo',c.saldoMontos);ss('cdQueda',c.quedaMontos);
  _cdSet('cdAlquiler',c.alquiler);_cdSet('cdNota',c.nota);
  if(c.cambiosSale)_CD_DENOMS.forEach(d=>{_cdSet('cdCambioSale'+d.id,c.cambiosSale[d.id]||0);});
  _cdRenderListas();
  if(typeof toast==='function')toast('📂 Cierre del '+_cdFmtFecha(c.fecha)+' cargado');
}

// ══ Guardar ═══════════════════════════════════════════════════════════════
async function _cdGuardarCierre(){
  const ventaTotal=_cdV('cdVentaTotal');
  if(!ventaTotal&&!_cdGastos.length){if(typeof toast==='function')toast('Ingresa al menos la venta del día',true);return;}
  const btn=document.getElementById('btnCdGuardar');if(btn){btn.disabled=true;btn.innerHTML='⏳ Guardando…';}
  const V=_cdLeerMontos('cdVenta'),S=_cdLeerMontos('cdSaldo'),Q=_cdLeerMontos('cdQueda');
  const alquiler=_cdV('cdAlquiler'),alqHoy=_cdV('cdVentaAlquilerHoy');
  const totalGastos=_cdSumArr(_cdGastos);
  const cambiosSale={};_CD_DENOMS.forEach(d=>{cambiosSale[d.id]=_cdV('cdCambioSale'+d.id);});
  const cierre={
    id:(typeof _getTiendaId==='function'?_getTiendaId():'local')+'_'+_cdFecha,
    tienda_id:typeof _getTiendaId==='function'?_getTiendaId():'',
    fecha:_cdFecha,fechaLabel:_cdFmtFecha(_cdFecha),ventaTotal,ventaAlquilerHoy:alqHoy,
    ventaMontos:V,saldoMontos:S,quedaMontos:Q,alquiler,cambiosSale,
    gastos:[..._cdGastos],deudas:[..._cdDeudas],
    totalGastos,totalDeudas:_cdDeudas.reduce((s,x)=>s+Number(x.total||x.monto||0),0),totalQueda:_cdTotalM(Q),
    saldoNeto:_cdTotalM(S)+(ventaTotal-alqHoy)-totalGastos,
    nota:document.getElementById('cdNota')?.value?.trim()||'',
    creadoPor:typeof _usuarioActual!=='undefined'?(_usuarioActual?.nombre||_usuarioActual?.email||'—'):'—',
    creadoEn:new Date().toISOString(),enviado:false,
  };
  const idx=_cdHistorial.findIndex(c=>c.fecha===_cdFecha);
  if(idx>=0)_cdHistorial[idx]=cierre;else _cdHistorial.unshift(cierre);
  await _cdGuardarHistorial();
  const subido=await _cdSubirSupabase(cierre);
  cierre.enviado=subido;
  if(idx>=0)_cdHistorial[idx]=cierre;else if(_cdHistorial[0])_cdHistorial[0].enviado=subido;
  await _cdGuardarHistorial();
  if(typeof toast==='function')toast(subido?'✅ Guardado y enviado':'💾 Guardado localmente',!subido);
  if(typeof _registrarAccion==='function')_registrarAccion('cierre_diario',`Venta: $${ventaTotal.toFixed(2)} | ${_cdFecha}`);
  const hw=document.getElementById('cdHistorialWrap');if(hw)hw.innerHTML=_cdRenderHistorial();
  if(btn){btn.disabled=false;btn.innerHTML='💾 Guardar y enviar reporte';}
}

// ══ Historial ════════════════════════════════════════════════════════════
function _cdRenderHistorial(){
  if(!_cdHistorial.length)return`<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;font-weight:700;">Sin cierres registrados</div>`;
  return[..._cdHistorial].sort((a,b)=>b.fecha.localeCompare(a.fecha)).slice(0,20).map(c=>`
    <div class="cd-hist-item" onclick="_cdCambiarFechaYCargar('${c.fecha}')">
      <div><div class="cd-hist-fecha">${_cdFmtFecha(c.fecha)}</div><div class="cd-hist-meta">Gastos: $${(c.totalGastos||0).toFixed(2)} · ${c.creadoPor||'—'}</div></div>
      <div class="cd-hist-venta">$${(c.ventaTotal||0).toFixed(2)}</div>
      <span class="cd-hist-badge ${c.enviado?'enviado':''}">${c.enviado?'☁ Enviado':'📱 Local'}</span>
    </div>`).join('');
}
function _cdCambiarFechaYCargar(fecha){
  _cdFecha=fecha;const inp=document.getElementById('cdFechaInput');if(inp)inp.value=fecha;_cdCambiarFecha(fecha);
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
window._cdPropagar            = _cdPropagar;
