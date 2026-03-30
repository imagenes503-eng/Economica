// =====================================================================
//  📋 CIERRE DIARIO DE CAJA — v8
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
    .cd-panel-header { display:flex;align-items:center;gap:9px;padding:12px 16px;border-bottom:1px solid var(--border);background:var(--surface);flex-wrap:wrap;gap:6px; }
    .cd-panel-icon { width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0; }
    .cd-panel-title { font-size:13px;font-weight:900;color:var(--text);font-family:Nunito,sans-serif;flex:1;min-width:120px; }
    .cd-panel-body { padding:14px 16px; }
    .cd-montos-grid { display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:4px; }
    @media(min-width:480px){ .cd-montos-grid { grid-template-columns:repeat(3,1fr); } }
    .cd-field label { display:block;font-size:10px;font-weight:900;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.4px;font-family:Nunito,sans-serif;margin-bottom:4px; }
    .cd-inp { width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:14px;font-weight:900;font-family:Nunito,sans-serif;color:var(--text);background:var(--surface);box-sizing:border-box;outline:none;transition:border-color 0.2s; }
    .cd-inp:focus { border-color:#0369a1;background:#fff; }
    .cd-inp.big { font-size:20px;padding:12px 14px; }
    .cd-total-row { display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-radius:10px;font-family:Nunito,sans-serif;margin-top:8px;background:#f0f9ff; }
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
    .cd-btn-update.red { background:rgba(220,38,38,0.08);border-color:rgba(220,38,38,0.3);color:#dc2626; }
    .cd-item-list { display:flex;flex-direction:column;gap:6px;margin-bottom:10px; }
    .cd-item-row { background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:10px 12px; }
    .cd-item-head { display:flex;align-items:center;justify-content:space-between;margin-bottom:4px; }
    .cd-item-desc { font-size:12px;font-weight:900;color:var(--text);font-family:Nunito,sans-serif; }
    .cd-item-monto { font-size:13px;font-weight:900;font-family:Nunito,sans-serif; }
    .cd-item-del { background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:14px;padding:2px 5px;border-radius:5px; }
    .cd-item-del:hover { background:rgba(220,38,38,0.1);color:#dc2626; }
    .cd-item-denoms { display:flex;flex-wrap:wrap;gap:4px;margin-top:4px; }
    .cd-item-denom { font-size:10px;font-weight:700;font-family:Nunito,sans-serif;background:#fef2f2;border:1px solid #fca5a5;border-radius:5px;padding:2px 7px;color:#dc2626; }
    .cd-item-denom.inv { background:#dcfce7;border-color:#86efac;color:#15803d; }
    .cd-btn-add { padding:10px 14px;background:#0369a1;color:#fff;border:none;border-radius:10px;font-size:12px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;white-space:nowrap;transition:all 0.15s; }
    .cd-btn-add:hover { background:#075985; }
    .cd-cambio-grid { display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:4px; }
    @media(min-width:480px){ .cd-cambio-grid { grid-template-columns:repeat(3,1fr); } }
    .cd-cambio-item { background:var(--surface);border:1.5px solid var(--border);border-radius:10px;padding:10px 11px; }
    .cd-cambio-lbl { font-size:10px;font-weight:900;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.4px;font-family:Nunito,sans-serif;margin-bottom:6px; }
    .cd-add-row { display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:end; }
    /* Tabla mensual */
    .cd-mes-tabla { width:100%;border-collapse:collapse;font-family:Nunito,sans-serif;font-size:12px; }
    .cd-mes-tabla th { background:#e0f2fe;color:#0369a1;font-weight:900;padding:7px 10px;text-align:left;border-bottom:2px solid #bae6fd; }
    .cd-mes-tabla td { padding:7px 10px;border-bottom:1px solid var(--border);color:var(--text);font-weight:700; }
    .cd-mes-tabla tr:last-child td { border-bottom:none; }
    .cd-mes-tabla tr:hover td { background:#f0f9ff; }
    /* Captura 1080x1920 */
    .cd-cap-wrap { overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:16px;border:2px solid #0369a1;margin-bottom:12px; }
    .cd-resumen-captura { background:#fff;border:3px solid #0369a1;font-family:Nunito,sans-serif;width:1080px;min-height:1920px;box-sizing:border-box; }
    .cd-cap-inner { padding:56px 64px;box-sizing:border-box; }
    .cd-cap-title { font-size:56px;font-weight:900;color:#0c4a6e;text-align:center;margin-bottom:6px; }
    .cd-cap-fecha { font-size:28px;font-weight:700;color:#0369a1;text-align:center;margin-bottom:36px; }
    .cd-cap-divider { height:4px;background:#0369a1;border-radius:2px;margin:28px 0;opacity:0.4; }
    .cd-cap-2col { display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px; }
    .cd-cap-col { border:2px solid #bae6fd;border-radius:14px;padding:22px; }
    .cd-cap-section-title { font-size:19px;font-weight:900;color:#0369a1;background:#e0f2fe;border-radius:8px;padding:7px 14px;margin-bottom:12px;text-align:center;text-transform:uppercase;letter-spacing:0.5px; }
    .cd-cap-row { display:flex;justify-content:space-between;align-items:center;font-size:21px;font-weight:700;color:#1e3a5f;padding:7px 0;border-bottom:1px solid #e8f4fd; }
    .cd-cap-row:last-child { border-bottom:none; }
    .cd-cap-row.total { font-size:24px;font-weight:900;border-top:3px solid #0369a1;border-bottom:none;margin-top:6px;padding-top:10px; }
    .cd-cap-row.grand { font-size:26px;font-weight:900;color:#0c4a6e;background:#e0f2fe;border-radius:10px;padding:14px 18px;margin-top:8px;border-bottom:none; }
    .val-pos { color:#15803d; } .val-neg { color:#dc2626; } .val-warn { color:#b45309; }
    .val-blue { color:#0369a1; } .val-purple { color:#7c3aed; }
    .btn-cd-captura { width:100%;padding:14px;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;border:none;border-radius:13px;font-size:14px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(22,163,74,0.3);transition:all 0.15s;display:flex;align-items:center;justify-content:center;gap:8px; }
    .btn-cd-captura:hover { transform:translateY(-1px); }
    .btn-cd-captura:disabled { opacity:0.6;cursor:wait;transform:none; }
    .btn-cd-pdf { width:100%;padding:13px;background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;border:none;border-radius:13px;font-size:14px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(220,38,38,0.3);transition:all 0.15s;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:8px; }
    .btn-cd-pdf:hover { transform:translateY(-1px); }
    .cd-nota-area { width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;font-weight:700;font-family:Nunito,sans-serif;color:var(--text);background:var(--surface);box-sizing:border-box;outline:none;resize:vertical;min-height:70px; }
  `;
  document.head.appendChild(s);
})();

// ══ Estado ══════════════════════════════════════════════════════════════
let _cdFecha  = new Date().toISOString().split('T')[0];
let _cdGastos = [];   // [{id,desc,montos,total,inventario:{costo,ganancia}}]
let _cdDeudas = [];
let _cdCambiosAplicados = []; // historial de cambios para captura
let _cdVentaSnapshot = null;  // última venta aplicada
// Registro mensual (persiste en IDB)
let _cdMesData = {
  saldoInicio: 0, // saldo al inicio del mes
  ventas: [],     // [{fecha,total,alquiler}]
  gastos: [],     // [{fecha,desc,total,tipoInv,costoInv,gananciaInv}]
};

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
function _cdMesKey(){return _cdFecha.substring(0,7);}

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

// ══ Persistencia IDB ════════════════════════════════════════════════════
async function _cdCargarMes(){
  try{
    const k='vpos_cierreMes_'+_cdMesKey();
    const r=await idbGet(k);
    if(r)_cdMesData=r;
    else _cdMesData={saldoInicio:0,ventas:[],gastos:[]};
  }catch(e){_cdMesData={saldoInicio:0,ventas:[],gastos:[]};}
}
async function _cdGuardarMes(){
  try{ await idbSet('vpos_cierreMes_'+_cdMesKey(),_cdMesData); }catch(e){}
  _cdSubirMesSupabase();
}
// Saldo de ayer (saldo del día anterior guardado)
async function _cdCargarSaldoAyer(){
  try{
    const ayer=new Date(new Date(_cdFecha).getTime()-86400000).toISOString().split('T')[0];
    const r=await idbGet('vpos_cierreSaldo_'+ayer);
    return r||null;
  }catch(e){return null;}
}
async function _cdGuardarSaldoHoy(saldo){
  try{ await idbSet('vpos_cierreSaldo_'+_cdFecha,saldo); }catch(e){}
}

// ══ Supabase ════════════════════════════════════════════════════════════
async function _cdSubirMesSupabase(){
  if(typeof _sbPost!=='function'||typeof _getTiendaId!=='function')return;
  try{
    await _sbPost('cierre_mes',{
      id:_getTiendaId()+'_'+_cdMesKey(),
      tienda_id:_getTiendaId(),
      mes:_cdMesKey(),
      datos:JSON.stringify(_cdMesData),
      updated_at:new Date().toISOString()
    },true);
  }catch(e){console.warn('[CD-MES]',e.message);}
}
async function _cdSubirCierreSupabase(cierre){
  if(typeof _sbPost!=='function'||typeof _getTiendaId!=='function')return false;
  try{
    await _sbPost('cierre_diario',{
      id:_getTiendaId()+'_'+cierre.fecha,
      tienda_id:_getTiendaId(),
      fecha:cierre.fecha,
      datos:JSON.stringify(cierre),
      updated_at:new Date().toISOString()
    },true);
    return true;
  }catch(e){console.warn('[CD]',e.message);return false;}
}

// ══ Render principal ════════════════════════════════════════════════════
async function renderCierreDia(pgId){
  pgId=pgId||'pgCierreDia';
  const pg=document.getElementById(pgId);if(!pg)return;
  await _cdCargarMes();
  const saldoAyer=await _cdCargarSaldoAyer();
  const esHoy=_cdFecha===new Date().toISOString().split('T')[0];
  let vSug=0;
  if(esHoy&&typeof totalReporte==='function'&&typeof ventasDia!=='undefined')vSug=totalReporte(ventasDia);

  const cambioGrid=_CD_DENOMS.map(d=>`
    <div class="cd-cambio-item">
      <div class="cd-cambio-lbl">Sale de ${d.label}</div>
      <div class="cd-field" style="margin-bottom:6px;"><label>Monto ($)</label><input class="cd-inp" type="number" id="cdCambioSale${d.id}" min="0" step="0.01" placeholder="0.00" oninput="_cdActualizarStats()"></div>
      <div class="cd-field"><label>Entra en</label><select class="cd-inp" id="cdCambioHacia${d.id}" onchange="_cdActualizarStats()" style="padding:9px 10px;">${_CD_DENOMS.filter(x=>x.id!==d.id).map(x=>`<option value="${x.id}">${x.label}</option>`).join('')}</select></div>
    </div>`).join('');

  // Tabla mensual
  const totalVentasMes=_cdMesData.ventas.reduce((s,v)=>s+v.total,0);
  const totalGastosMes=_cdMesData.gastos.reduce((s,g)=>s+g.total,0);
  const totalAlquilerMes=_cdMesData.ventas.reduce((s,v)=>s+v.alquiler,0);
  const totalInvCosto=_cdMesData.gastos.filter(g=>g.tipoInv).reduce((s,g)=>s+g.costoInv,0);
  const totalInvGanancia=_cdMesData.gastos.filter(g=>g.tipoInv).reduce((s,g)=>s+g.gananciaInv,0);
  const saldoTeorico=_cdMesData.saldoInicio+totalVentasMes-totalGastosMes;

  pg.innerHTML=`
    <div class="cd-hero">
      <div class="cd-hero-top">
        <div><div class="cd-hero-title">📋 Cierre Diario de Caja</div><div class="cd-hero-fecha" id="cdHeroFechaLbl">${_cdFmtFecha(_cdFecha)}</div></div>
        <input type="date" class="cd-fecha-inp" id="cdFechaInput" value="${_cdFecha}" onchange="_cdCambiarFecha(this.value)">
      </div>
      <div class="cd-hero-stats">
        <div class="cd-hstat"><div class="cd-hstat-lbl">💹 Venta del Día</div><div class="cd-hstat-val" id="cdStatVenta">$0.00</div></div>
        <div class="cd-hstat"><div class="cd-hstat-lbl">📤 Gastos</div><div class="cd-hstat-val" id="cdStatGastos">$0.00</div></div>
        <div class="cd-hstat"><div class="cd-hstat-lbl">🏦 Saldo Caja</div><div class="cd-hstat-val" id="cdStatSaldo">$0.00</div></div>
      </div>
    </div>
    <div class="cd-body">

      <!-- VENTA DEL DÍA -->
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#dbeafe;">💹</div>
          <div class="cd-panel-title">Venta del Día</div>
          <button class="cd-btn-update green" onclick="_cdAplicarVentaASaldo()">🔄 Actualizar Caja</button>
        </div>
        <div class="cd-panel-body">
          <div class="cd-field" style="margin-bottom:12px;">
            <label>Total vendido ($)</label>
            <input class="cd-inp big" type="number" id="cdVentaTotal" min="0" step="0.01" placeholder="0.00" value="${vSug>0?vSug.toFixed(2):''}" oninput="_cdActualizarStats()">
            ${vSug>0?`<div style="font-size:11px;color:#0369a1;font-weight:700;margin-top:4px;">💡 Del POS: $${vSug.toFixed(2)}</div>`:''}
          </div>
          <div class="cd-field" style="margin-bottom:12px;">
            <label>🏘 Apartar para alquiler hoy ($) — sale de billetes</label>
            <input class="cd-inp" type="number" id="cdVentaAlquilerHoy" min="0" step="0.01" placeholder="0.00" oninput="_cdActualizarStats()">
          </div>
          <div class="cd-sep">Desglose del dinero recibido</div>
          ${_cdBloqueMontosHTML('cdVenta')}
          <div id="cdVentaAlqMsg" style="display:none;margin-top:8px;padding:8px 12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:11px;font-weight:700;color:#b45309;font-family:Nunito,sans-serif;"></div>
          <div class="cd-total-row"><span>Suma desglose</span><span id="cdVentaDesgloseTotal">$0.00</span></div>
        </div>
      </div>

      <!-- SALDO QUE QUEDÓ AYER -->
      ${saldoAyer ? `
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#f5f3ff;">📅</div>
          <div class="cd-panel-title">Saldo que Quedó Ayer</div>
          <button class="cd-btn-update" onclick="_cdCargarSaldoAyerEnCaja()" title="Cargar saldo de ayer como saldo inicial de hoy">⬆ Usar como saldo inicial</button>
        </div>
        <div class="cd-panel-body">
          <div style="font-size:11px;color:#7c3aed;font-weight:700;background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:8px 12px;margin-bottom:10px;font-family:Nunito,sans-serif;">
            El saldo que quedó en caja al cerrar el día anterior (${_cdFmtFecha(new Date(new Date(_cdFecha).getTime()-86400000).toISOString().split('T')[0])})
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            ${_CD_DENOMS.map(d=>`<div style="background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:8px 10px;font-family:Nunito,sans-serif;">
              <div style="font-size:10px;font-weight:900;color:var(--text-muted);text-transform:uppercase;">${d.label}</div>
              <div style="font-size:16px;font-weight:900;color:#7c3aed;">$${(saldoAyer[d.id]||0).toFixed(2)}</div>
            </div>`).join('')}
          </div>
          <div class="cd-total-row purple" style="margin-top:10px;"><span>Total saldo de ayer</span><span>$${_cdTotalM(saldoAyer).toFixed(2)}</span></div>
        </div>
      </div>` : ''}

      <!-- SALDO EN CAJA -->
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#dcfce7;">🏦</div>
          <div class="cd-panel-title">Saldo en Caja</div>
          <button class="cd-btn-update" onclick="_cdAplicarSaldoAQueda()">🔄 Actualizar Queda</button>
        </div>
        <div class="cd-panel-body">
          <div style="font-size:11px;color:#15803d;font-weight:700;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px 12px;margin-bottom:12px;font-family:Nunito,sans-serif;">
            ℹ️ Ingresa el saldo inicial la primera vez. Después se actualiza automáticamente con la venta y los gastos.
          </div>
          ${_cdBloqueMontosHTML('cdSaldo')}
          <div class="cd-field" style="margin-top:12px;">
            <label>🏘 Total alquiler acumulado ($) — guardado aparte</label>
            <input class="cd-inp" type="number" id="cdAlquiler" min="0" step="0.01" placeholder="0.00" oninput="_cdActualizarStats()">
          </div>
          <div class="cd-total-row green"><span>Total en caja</span><span id="cdSaldoTotal">$0.00</span></div>
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
              <label>Descripción</label>
              <input class="cd-inp" type="text" id="cdGastoDesc" placeholder="Ej: Pepsi, Luz, Alquiler…">
            </div>
            <div class="cd-sep" style="margin-top:0;">¿Qué se sacó de caja?</div>
            ${_cdBloqueMontosHTML('cdGastoForm')}
            <!-- Punto 6: inventario -->
            <div style="margin-top:12px;padding:10px 12px;background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;font-weight:900;color:#15803d;font-family:Nunito,sans-serif;margin-bottom:8px;">
                <input type="checkbox" id="cdGastoEsInventario" onchange="_cdToggleInvFields()" style="width:16px;height:16px;accent-color:#16a34a;"> 📦 Este pago es para inventario (tiene ganancia)
              </label>
              <div id="cdGastoInvFields" style="display:none;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div class="cd-field">
                  <label>Costo pagado ($)</label>
                  <input class="cd-inp" type="number" id="cdGastoInvCosto" min="0" step="0.01" placeholder="0.00">
                </div>
                <div class="cd-field">
                  <label>Valor de venta ($) con ganancia</label>
                  <input class="cd-inp" type="number" id="cdGastoInvVenta" min="0" step="0.01" placeholder="0.00" oninput="_cdCalcularGanancia()">
                </div>
                <div class="cd-field" style="grid-column:span 2;">
                  <label>Ganancia estimada</label>
                  <div id="cdGastoGananciaLbl" style="padding:8px 12px;background:#dcfce7;border-radius:8px;font-size:14px;font-weight:900;color:#15803d;font-family:Nunito,sans-serif;">$0.00</div>
                </div>
              </div>
            </div>
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
          <div style="font-size:11px;color:var(--text-muted);font-weight:700;margin-bottom:12px;">Solo redistribuyen denominaciones — presiona "Aplicar" para actualizar Saldo y Queda.</div>
          <div class="cd-cambio-grid">${cambioGrid}</div>
          <div id="cdCambioResumen" style="margin-top:12px;"></div>
          ${_cdCambiosAplicados.length ? `
          <div style="margin-top:8px;">
            <div class="cd-sep" style="margin-top:0;">Cambios ya aplicados hoy</div>
            ${_cdCambiosAplicados.map(m=>`<div style="font-size:12px;font-weight:700;color:var(--text-muted);padding:3px 0;font-family:Nunito,sans-serif;">• ${m.de} −$${m.monto.toFixed(2)} → ${m.hacia} +$${m.monto.toFixed(2)}</div>`).join('')}
          </div>` : ''}
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
          <button class="cd-btn-update" onclick="_cdGuardarSaldoHoyYCapturar()">💾 Guardar como saldo de hoy</button>
        </div>
        <div class="cd-panel-body">
          ${_cdBloqueMontosHTML('cdQueda')}
          <div class="cd-total-row amber"><span>Total físico en caja</span><span id="cdQuedaTotal">$0.00</span></div>
        </div>
      </div>

      <!-- NOTA -->
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#f0fdf4;">📝</div>
          <div class="cd-panel-title">Nota del Día</div>
        </div>
        <div class="cd-panel-body">
          <textarea class="cd-nota-area" id="cdNota" placeholder="Observaciones del día…" oninput="_cdActualizarStats()"></textarea>
        </div>
      </div>

      <!-- REGISTRO MENSUAL -->
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#dbeafe;">📅</div>
          <div class="cd-panel-title">Registro Mensual — ${_cdMesKey()}</div>
        </div>
        <div class="cd-panel-body">
          <div class="cd-field" style="margin-bottom:12px;">
            <label>💵 Saldo al inicio del mes ($)</label>
            <input class="cd-inp" type="number" id="cdMesSaldoInicio" min="0" step="0.01" placeholder="0.00" value="${_cdMesData.saldoInicio||''}" onchange="_cdGuardarSaldoInicio()">
          </div>
          <!-- Ventas del mes -->
          <div class="cd-sep" style="margin-top:4px;">📈 Ventas registradas este mes</div>
          <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;margin-bottom:8px;">
            <table class="cd-mes-tabla">
              <thead><tr><th>Fecha</th><th>Venta</th><th>Alquiler</th><th>A caja</th><th></th></tr></thead>
              <tbody>
                ${_cdMesData.ventas.length ? _cdMesData.ventas.slice().reverse().map(v=>`
                  <tr>
                    <td>${_cdFmtFecha(v.fecha)}</td>
                    <td style="color:#0369a1;font-weight:900;">$${v.total.toFixed(2)}</td>
                    <td style="color:#b45309;">$${(v.alquiler||0).toFixed(2)}</td>
                    <td style="color:#15803d;font-weight:900;">$${(v.total-(v.alquiler||0)).toFixed(2)}</td>
                    <td><button style="background:none;border:none;cursor:pointer;color:#dc2626;font-size:13px;" onclick="_cdEliminarVentaMes('${v.id}')">✕</button></td>
                  </tr>`).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">Sin ventas registradas</td></tr>'}
              </tbody>
              <tfoot>
                <tr style="background:#f0fdf4;">
                  <td style="font-weight:900;color:#15803d;">Total</td>
                  <td style="font-weight:900;color:#0369a1;">$${totalVentasMes.toFixed(2)}</td>
                  <td style="font-weight:900;color:#b45309;">$${totalAlquilerMes.toFixed(2)}</td>
                  <td style="font-weight:900;color:#15803d;">$${(totalVentasMes-totalAlquilerMes).toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <!-- Gastos del mes -->
          <div class="cd-sep">📤 Gastos / Pagos registrados este mes</div>
          <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;margin-bottom:8px;">
            <table class="cd-mes-tabla">
              <thead><tr><th>Fecha</th><th>Descripción</th><th>Total</th><th>Inventario</th><th></th></tr></thead>
              <tbody>
                ${_cdMesData.gastos.length ? _cdMesData.gastos.slice().reverse().map(g=>`
                  <tr>
                    <td>${_cdFmtFecha(g.fecha)}</td>
                    <td>${g.desc}</td>
                    <td style="color:#dc2626;font-weight:900;">$${g.total.toFixed(2)}</td>
                    <td style="color:#15803d;">${g.tipoInv?`Costo: $${g.costoInv.toFixed(2)} → Venta: $${(g.costoInv+g.gananciaInv).toFixed(2)} (+$${g.gananciaInv.toFixed(2)})`:'-'}</td>
                    <td><button style="background:none;border:none;cursor:pointer;color:#dc2626;font-size:13px;" onclick="_cdEliminarGastoMes('${g.id}')">✕</button></td>
                  </tr>`).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">Sin gastos registrados</td></tr>'}
              </tbody>
              <tfoot>
                <tr style="background:#fef2f2;">
                  <td colspan="2" style="font-weight:900;color:#dc2626;">Total gastos</td>
                  <td style="font-weight:900;color:#dc2626;">$${totalGastosMes.toFixed(2)}</td>
                  <td style="color:#15803d;font-weight:700;">Ganancia inv: $${totalInvGanancia.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <!-- Resumen mensual -->
          <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:14px 16px;margin-top:8px;">
            <div style="font-size:13px;font-weight:900;color:#15803d;margin-bottom:10px;font-family:Nunito,sans-serif;">📊 Resumen del mes</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;font-family:Nunito,sans-serif;">
              <div style="color:var(--text-muted);font-weight:700;">Saldo inicio:</div><div style="font-weight:900;color:#0369a1;">$${(_cdMesData.saldoInicio||0).toFixed(2)}</div>
              <div style="color:var(--text-muted);font-weight:700;">+ Ventas (a caja):</div><div style="font-weight:900;color:#15803d;">+$${(totalVentasMes-totalAlquilerMes).toFixed(2)}</div>
              <div style="color:var(--text-muted);font-weight:700;">− Gastos:</div><div style="font-weight:900;color:#dc2626;">-$${totalGastosMes.toFixed(2)}</div>
              <div style="color:var(--text-muted);font-weight:700;">Ganancia inventario:</div><div style="font-weight:900;color:#15803d;">$${totalInvGanancia.toFixed(2)}</div>
              <div style="color:var(--text-muted);font-weight:700;border-top:1px solid #bbf7d0;padding-top:6px;">Debería haber en caja:</div>
              <div style="font-weight:900;color:#0369a1;font-size:14px;border-top:1px solid #bbf7d0;padding-top:6px;">$${saldoTeorico.toFixed(2)}</div>
            </div>
          </div>
          <!-- Botones PDF y reiniciar -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px;">
            <button class="btn-cd-pdf" onclick="_cdGenerarPDFMensual()" style="font-size:12px;padding:11px;">📄 Descargar PDF del mes</button>
            <button class="cd-btn-update red" style="padding:11px;border-radius:10px;width:100%;" onclick="_cdReiniciarMes()">♻️ Reiniciar mes</button>
          </div>
        </div>
      </div>

      <!-- CAPTURA 1080x1920 -->
      <div class="cd-cap-wrap">
        <div class="cd-resumen-captura" id="cdResumenCaptura">
          <div class="cd-cap-inner">
            <div class="cd-cap-title">📋 CIERRE DE CAJA</div>
            <div class="cd-cap-fecha" id="cdCapFecha">${_cdFmtFecha(_cdFecha).toUpperCase()}</div>

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
                <div id="capAlqHoyWrap" style="display:none;"><div class="cd-cap-row"><span>🏘 Alquiler hoy</span><span class="val-warn" id="capAlqHoy">$0.00</span></div></div>
                <div class="cd-cap-row total"><span>Total venta del día</span><span class="val-blue" id="capVentaTotalFinal">$0.00</span></div>
              </div>
              <div class="cd-cap-col">
                <div class="cd-cap-section-title">🏦 Saldo en Caja</div>
                <div class="cd-cap-row"><span>💵 Billetes</span><span id="capSBilletes">$0.00</span></div>
                <div class="cd-cap-row"><span>🪙 M. Dólar</span><span id="capSMonedas">$0.00</span></div>
                <div class="cd-cap-row"><span>🔵 Coras</span><span id="capSCoras">$0.00</span></div>
                <div class="cd-cap-row"><span>🟡 10 cts</span><span id="capSC10">$0.00</span></div>
                <div class="cd-cap-row"><span>🟤 5 cts</span><span id="capSC05">$0.00</span></div>
                <div class="cd-cap-row"><span>⚪ 1 cto</span><span id="capSC01">$0.00</span></div>
                <div class="cd-cap-row total"><span>Total en caja</span><span class="val-pos" id="capSaldoTotal">$0.00</span></div>
              </div>
            </div>

            <div class="cd-cap-divider"></div>

            <div class="cd-cap-2col">
              <div class="cd-cap-col">
                <div class="cd-cap-section-title">📤 Gastos / Pagos</div>
                <div id="capGastosDetalleList"><div class="cd-cap-row"><span>Sin gastos</span><span>—</span></div></div>
                <div class="cd-cap-row total"><span>Total gastos</span><span class="val-neg" id="capGTotal">$0.00</span></div>
              </div>
              <div class="cd-cap-col">
                <div class="cd-cap-section-title">🔄 Cambios del Día</div>
                <div id="capCambiosList"><div class="cd-cap-row"><span>Sin cambios</span><span>—</span></div></div>
              </div>
            </div>

            <div class="cd-cap-divider"></div>

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

            <!-- Alquiler tamaño normal al final -->
            <div class="cd-cap-row grand"><span>🏘 Alquiler acumulado</span><span class="val-warn" id="capAlquilerFinal">$0.00</span></div>
            <div class="cd-cap-row grand" style="margin-top:10px;"><span>🏦 Total neto en caja</span><span id="capTotalGeneral">$0.00</span></div>

            <div id="capNotaWrap" style="display:none;margin-top:24px;padding:18px 22px;background:#f0f9ff;border-radius:12px;font-size:22px;font-weight:700;color:#0369a1;font-family:Nunito,sans-serif;"></div>
          </div>
        </div>
      </div>

      <button class="btn-cd-captura" onclick="_cdTomarCaptura()">📸 Descargar imagen 1080×1920</button>

    </div>
  `;
  _cdRenderListas();_cdActualizarStats();
}

// ══ Helpers inventario ══════════════════════════════════════════════════
function _cdToggleInvFields(){
  const cb=document.getElementById('cdGastoEsInventario');
  const f=document.getElementById('cdGastoInvFields');
  if(f)f.style.display=cb?.checked?'grid':'none';
}
function _cdCalcularGanancia(){
  const costo=_cdV('cdGastoInvCosto');
  const venta=_cdV('cdGastoInvVenta');
  const lbl=document.getElementById('cdGastoGananciaLbl');
  if(lbl)lbl.textContent='$'+(Math.max(0,venta-costo)).toFixed(2);
}

// ══ Aplicar venta al saldo ══════════════════════════════════════════════
function _cdAplicarVentaASaldo(){
  const ventaTotal=_cdV('cdVentaTotal');
  if(ventaTotal<=0){if(typeof toast==='function')toast('Ingresa la venta del día primero',true);return;}
  const alqHoy=_cdV('cdVentaAlquilerHoy');
  const V=_cdLeerMontos('cdVenta');
  _cdVentaSnapshot={total:ventaTotal,alqHoy,montos:{...V}};
  // Sumar al saldo (alquiler se descuenta de billetes)
  _CD_DENOMS.forEach(d=>{
    let ap=V[d.id]||0;
    if(d.id==='Billetes')ap=Math.max(0,ap-alqHoy);
    _cdSet('cdSaldo'+d.id,_cdV('cdSaldo'+d.id)+ap);
  });
  _cdSet('cdAlquiler',_cdV('cdAlquiler')+alqHoy);
  // Registrar en mensual
  _cdMesData.ventas.push({id:_cdUID(),fecha:_cdFecha,total:ventaTotal,alquiler:alqHoy});
  _cdGuardarMes();
  // Limpiar campos venta
  _cdSet('cdVentaTotal',0);_cdSet('cdVentaAlquilerHoy',0);
  _CD_DENOMS.forEach(d=>_cdSet('cdVenta'+d.id,0));
  if(typeof toast==='function')toast(`✓ Venta $${ventaTotal.toFixed(2)} sumada al saldo. Alquiler $${alqHoy.toFixed(2)} apartado.`);
  _cdActualizarStats();
}

// ══ Saldo de ayer ════════════════════════════════════════════════════════
async function _cdCargarSaldoAyerEnCaja(){
  const sAyer=await _cdCargarSaldoAyer();
  if(!sAyer){if(typeof toast==='function')toast('No hay saldo guardado de ayer',true);return;}
  _CD_DENOMS.forEach(d=>_cdSet('cdSaldo'+d.id,sAyer[d.id]||0));
  if(typeof toast==='function')toast('✓ Saldo de ayer cargado como saldo inicial de hoy');
  _cdActualizarStats();
}

async function _cdGuardarSaldoHoyYCapturar(){
  const Q=_cdLeerMontos('cdQueda');
  await _cdGuardarSaldoHoy(Q);
  if(typeof toast==='function')toast('✓ Saldo de hoy guardado. Mañana aparecerá en "Saldo que Quedó Ayer"');
}

function _cdAplicarSaldoAQueda(){
  _CD_DENOMS.forEach(d=>_cdSet('cdQueda'+d.id,_cdV('cdSaldo'+d.id)));
  if(typeof toast==='function')toast('✓ "Queda en Efectivo" actualizado');
  _cdActualizarStats();
}

// ══ Cambios ══════════════════════════════════════════════════════════════
function _cdCalcularCambiosPendientes(){
  const movs=[];
  _CD_DENOMS.forEach(d=>{
    const s=_cdV('cdCambioSale'+d.id);
    const hId=document.getElementById('cdCambioHacia'+d.id)?.value||'';
    if(s>0&&hId)movs.push({de:d.label,deId:d.id,hacia:_CD_DENOMS.find(x=>x.id===hId)?.label||hId,haciaId:hId,monto:s});
  });
  return movs;
}
function _cdAplicarCambios(){
  const movs=_cdCalcularCambiosPendientes();
  if(!movs.length){if(typeof toast==='function')toast('Ingresa al menos un cambio',true);return;}
  movs.forEach(m=>{
    _cdSet('cdSaldo'+m.deId,Math.max(0,_cdV('cdSaldo'+m.deId)-m.monto));
    _cdSet('cdSaldo'+m.haciaId,_cdV('cdSaldo'+m.haciaId)+m.monto);
    _cdSet('cdQueda'+m.deId,Math.max(0,_cdV('cdQueda'+m.deId)-m.monto));
    _cdSet('cdQueda'+m.haciaId,_cdV('cdQueda'+m.haciaId)+m.monto);
    _cdCambiosAplicados.push({...m,hora:new Date().toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'})});
  });
  _CD_DENOMS.forEach(d=>_cdSet('cdCambioSale'+d.id,0));
  if(typeof toast==='function')toast('✓ Cambios aplicados');
  _cdActualizarStats();
  // Re-render para mostrar historial
  const cambResumen=document.getElementById('cdCambioResumen');
  if(cambResumen)_cdActualizarStats();
}

// ══ Listas ════════════════════════════════════════════════════════════════
function _cdRenderListas(){
  const gEl=document.getElementById('cdGastosList');
  if(gEl) gEl.innerHTML=_cdGastos.length
    ?_cdGastos.map(x=>{
        const dens=_CD_DENOMS.filter(d=>(x.montos[d.id]||0)>0).map(d=>`<span class="cd-item-denom">${d.label} $${(x.montos[d.id]||0).toFixed(2)}</span>`).join('');
        const invTag=x.inventario?`<span class="cd-item-denom inv">📦 Costo $${x.inventario.costo.toFixed(2)} → Venta $${(x.inventario.costo+x.inventario.ganancia).toFixed(2)} (+$${x.inventario.ganancia.toFixed(2)})</span>`:'';
        return`<div class="cd-item-row"><div class="cd-item-head"><span class="cd-item-desc">${x.desc}</span><div style="display:flex;align-items:center;gap:6px;"><span class="cd-item-monto" style="color:#dc2626;">-$${x.total.toFixed(2)}</span><button class="cd-item-del" onclick="_cdEliminarGasto('${x.id}')">✕</button></div></div><div class="cd-item-denoms">${dens}${invTag}</div></div>`;
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
  // Inventario
  let inventario=null;
  if(document.getElementById('cdGastoEsInventario')?.checked){
    const costo=_cdV('cdGastoInvCosto')||total;
    const vtaInv=_cdV('cdGastoInvVenta');
    inventario={costo,ganancia:Math.max(0,vtaInv-costo)};
  }
  // Descontar del saldo
  _CD_DENOMS.forEach(d=>{if(montos[d.id]>0)_cdSet('cdSaldo'+d.id,Math.max(0,_cdV('cdSaldo'+d.id)-montos[d.id]));});
  const g={id:_cdUID(),desc,montos,total,inventario,fecha:_cdFecha};
  _cdGastos.push(g);
  // Registrar en mensual
  _cdMesData.gastos.push({id:g.id,fecha:_cdFecha,desc,total,tipoInv:!!inventario,costoInv:inventario?.costo||0,gananciaInv:inventario?.ganancia||0});
  _cdGuardarMes();
  document.getElementById('cdGastoDesc').value='';
  _CD_DENOMS.forEach(d=>_cdSet('cdGastoForm'+d.id,0));
  if(document.getElementById('cdGastoEsInventario'))document.getElementById('cdGastoEsInventario').checked=false;
  _cdToggleInvFields();
  _cdRenderListas();
  if(typeof toast==='function')toast(`✓ Pago registrado y descontado del saldo`);
}
function _cdEliminarGasto(id){
  const g=_cdGastos.find(x=>x.id===id);
  if(g)_CD_DENOMS.forEach(d=>{if(g.montos[d.id]>0)_cdSet('cdSaldo'+d.id,_cdV('cdSaldo'+d.id)+g.montos[d.id]);});
  _cdGastos=_cdGastos.filter(x=>x.id!==id);
  _cdMesData.gastos=_cdMesData.gastos.filter(x=>x.id!==id);
  _cdGuardarMes();_cdRenderListas();
}
function _cdAgregarDeuda(){
  const desc=document.getElementById('cdDeudaDesc')?.value?.trim();
  const monto=parseFloat(document.getElementById('cdDeudaMonto')?.value||'0');
  if(!desc||!monto||monto<=0){if(typeof toast==='function')toast('Completa descripción y monto',true);return;}
  _cdDeudas.push({id:_cdUID(),desc,monto});
  document.getElementById('cdDeudaDesc').value='';document.getElementById('cdDeudaMonto').value='';
  _cdRenderListas();
}
function _cdEliminarDeuda(id){_cdDeudas=_cdDeudas.filter(x=>x.id!==id);_cdRenderListas();}
// Eliminar de registro mensual
function _cdEliminarVentaMes(id){_cdMesData.ventas=_cdMesData.ventas.filter(v=>v.id!==id);_cdGuardarMes();renderCierreDia();}
function _cdEliminarGastoMes(id){_cdMesData.gastos=_cdMesData.gastos.filter(g=>g.id!==id);_cdGuardarMes();renderCierreDia();}
function _cdGuardarSaldoInicio(){_cdMesData.saldoInicio=_cdV('cdMesSaldoInicio');_cdGuardarMes();}

// ══ Stats ════════════════════════════════════════════════════════════════
function _cdActualizarStats(){
  const ventaActual=_cdV('cdVentaTotal');
  const alqHoyActual=_cdV('cdVentaAlquilerHoy');
  const S=_cdLeerMontos('cdSaldo'),Q=_cdLeerMontos('cdQueda');
  const alquilerAcum=_cdV('cdAlquiler');
  const totalGastos=_cdSumArr(_cdGastos);
  const totalDeudas=_cdDeudas.reduce((s,x)=>s+Number(x.monto||0),0);
  const totalSaldo=_cdTotalM(S);
  const totalQueda=_cdTotalM(Q);
  const movsPendientes=_cdCalcularCambiosPendientes();
  const $=_cdFmt;

  if(alqHoyActual>0){const m=document.getElementById('cdVentaAlqMsg');if(m){m.style.display='block';m.textContent=`🏘 $${alqHoyActual.toFixed(2)} saldrán de billetes al alquiler. A caja entrarán: $${Math.max(0,ventaActual-alqHoyActual).toFixed(2)}`;}}
  else{const m=document.getElementById('cdVentaAlqMsg');if(m)m.style.display='none';}

  _cdTxt('cdStatVenta',$(ventaActual||(_cdVentaSnapshot?.total||0)));
  _cdTxt('cdStatGastos',$(totalGastos));_cdTxt('cdStatSaldo',$(totalSaldo));
  _cdTxt('cdVentaDesgloseTotal',$(_cdTotalM(_cdLeerMontos('cdVenta'))));
  _cdTxt('cdSaldoTotal',$(totalSaldo));_cdTxt('cdAlquilerTotal',$(alquilerAcum));
  _cdTxt('cdCajaAlquilerTotal',$(totalSaldo+alquilerAcum));
  _cdTxt('cdGastosTotal',$(totalGastos));_cdTxt('cdDeudasTotal',$(totalDeudas));_cdTxt('cdQuedaTotal',$(totalQueda));

  // Cambios pendientes en panel
  const cRes=document.getElementById('cdCambioResumen');
  if(cRes) cRes.innerHTML=movsPendientes.length
    ?movsPendientes.map(m=>`<div style="display:flex;align-items:center;gap:8px;padding:5px 10px;background:var(--surface);border:1px solid var(--border);border-radius:7px;margin-bottom:4px;font-size:12px;font-family:Nunito,sans-serif;"><span style="font-weight:900;color:#dc2626;">${m.de} −$${m.monto.toFixed(2)}</span><span>→</span><span style="font-weight:900;color:#15803d;">${m.hacia} +$${m.monto.toFixed(2)}</span></div>`).join(''):'';

  // Captura
  const snap=_cdVentaSnapshot;
  const capV=snap?snap.montos:_cdLeerMontos('cdVenta');
  const capVT=snap?snap.total:ventaActual;
  const capAlq=snap?snap.alqHoy:alqHoyActual;
  _cdTxt('capVentaTotal',$(capVT));
  _cdTxt('capVBilletes',$(capV.Billetes||0));_cdTxt('capVMonedas',$(capV.Monedas||0));_cdTxt('capVCoras',$(capV.Coras||0));
  _cdTxt('capVC10',$(capV.C10||0));_cdTxt('capVC05',$(capV.C05||0));_cdTxt('capVC01',$(capV.C01||0));
  const aw=document.getElementById('capAlqHoyWrap');if(aw)aw.style.display=capAlq>0?'':'none';
  _cdTxt('capAlqHoy',$(capAlq));_cdTxt('capVentaTotalFinal',$(capVT));
  _cdTxt('capSBilletes',$(S.Billetes));_cdTxt('capSMonedas',$(S.Monedas));_cdTxt('capSCoras',$(S.Coras));
  _cdTxt('capSC10',$(S.C10));_cdTxt('capSC05',$(S.C05));_cdTxt('capSC01',$(S.C01));
  _cdTxt('capSaldoTotal',$(totalSaldo));

  const capGD=document.getElementById('capGastosDetalleList');
  if(capGD) capGD.innerHTML=_cdGastos.length
    ?_cdGastos.map(x=>{
        const ds=_CD_DENOMS.filter(d=>(x.montos[d.id]||0)>0).map(d=>`<div class="cd-cap-row" style="font-size:18px;padding:3px 0;border-bottom:1px solid #f0f9ff;"><span>${d.label}</span><span class="val-neg">$${(x.montos[d.id]||0).toFixed(2)}</span></div>`).join('');
        const inv=x.inventario?`<div class="cd-cap-row" style="font-size:16px;color:#15803d;padding:2px 0;border-bottom:none;"><span>📦 Ganancia</span><span>+$${x.inventario.ganancia.toFixed(2)}</span></div>`:'';
        return`<div class="cd-cap-row" style="font-weight:900;font-size:20px;padding:5px 0 2px;border-bottom:none;"><span>${x.desc}</span><span class="val-neg">-$${x.total.toFixed(2)}</span></div>${ds}${inv}`;
      }).join('')
    :`<div class="cd-cap-row"><span>Sin gastos</span><span>—</span></div>`;
  _cdTxt('capGTotal',$(totalGastos));

  // Cambios en captura — todos los aplicados + pendientes
  const todosLosCambios=[..._cdCambiosAplicados,...movsPendientes.map(m=>({...m,pendiente:true}))];
  const capCL=document.getElementById('capCambiosList');
  if(capCL) capCL.innerHTML=todosLosCambios.length
    ?todosLosCambios.map(m=>`<div class="cd-cap-row"><span>${m.de}→${m.hacia}${m.pendiente?' (pendiente)':''}</span><span>$${m.monto.toFixed(2)}</span></div>`).join('')
    :`<div class="cd-cap-row"><span>Sin cambios</span><span>—</span></div>`;

  const capD=document.getElementById('capDeudasList');
  if(capD) capD.innerHTML=_cdDeudas.length
    ?_cdDeudas.map(x=>`<div class="cd-cap-row"><span>${x.desc}</span><span class="val-purple">$${Number(x.monto||0).toFixed(2)}</span></div>`).join('')
    :`<div class="cd-cap-row"><span>Sin pendientes</span><span>—</span></div>`;
  _cdTxt('capDTotal',$(totalDeudas));
  _cdTxt('capQBilletes',$(Q.Billetes));_cdTxt('capQMonedas',$(Q.Monedas));_cdTxt('capQCoras',$(Q.Coras));
  _cdTxt('capQC10',$(Q.C10));_cdTxt('capQC05',$(Q.C05));_cdTxt('capQC01',$(Q.C01));_cdTxt('capQTotal',$(totalQueda));
  _cdTxt('capAlquilerFinal',$(alquilerAcum));
  _cdTxt('capTotalGeneral',$(totalSaldo));
  const nw=document.getElementById('capNotaWrap');
  const nt=document.getElementById('cdNota')?.value?.trim()||'';
  if(nw){nw.style.display=nt?'block':'none';nw.textContent='📝 '+nt;}
}

// ══ Captura 1080x1920 ═════════════════════════════════════════════════════
async function _cdTomarCaptura(){
  const el=document.getElementById('cdResumenCaptura');if(!el)return;
  const btn=document.querySelector('.btn-cd-captura');
  if(btn){btn.disabled=true;btn.innerHTML='⏳ Generando…';}
  try{
    if(!window.html2canvas){await new Promise((r,j)=>{const sc=document.createElement('script');sc.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';sc.onload=r;sc.onerror=j;document.head.appendChild(sc);});}
    const c=await window.html2canvas(el,{scale:1,useCORS:true,backgroundColor:'#ffffff',width:1080,height:Math.max(1920,el.scrollHeight),windowWidth:1080});
    const o=document.createElement('canvas');o.width=1080;o.height=1920;
    const ctx=o.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,1080,1920);ctx.drawImage(c,0,0);
    const lnk=document.createElement('a');lnk.download=`Cierre_${_cdFecha}.png`;lnk.href=o.toDataURL('image/png');
    document.body.appendChild(lnk);lnk.click();document.body.removeChild(lnk);
    if(typeof toast==='function')toast('📸 Imagen descargada');
  }catch(e){if(typeof toast==='function')toast('⚠ Error: '+e.message,true);}
  finally{if(btn){btn.disabled=false;btn.innerHTML='📸 Descargar imagen 1080×1920';}}
}

// ══ PDF Mensual ══════════════════════════════════════════════════════════
async function _cdGenerarPDFMensual(){
  if(typeof window.jspdf==='undefined'&&typeof window.jsPDF==='undefined'){
    if(typeof toast==='function')toast('Cargando PDF…');
    await new Promise((r,j)=>{const sc=document.createElement('script');sc.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';sc.onload=r;sc.onerror=j;document.head.appendChild(sc);});
  }
  const {jsPDF}=window.jspdf||window;
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const mes=_cdMesKey();
  const totalV=_cdMesData.ventas.reduce((s,v)=>s+v.total,0);
  const totalAlq=_cdMesData.ventas.reduce((s,v)=>s+v.alquiler,0);
  const totalG=_cdMesData.gastos.reduce((s,g)=>s+g.total,0);
  const totalInvG=_cdMesData.gastos.filter(g=>g.tipoInv).reduce((s,g)=>s+g.gananciaInv,0);
  const sIni=_cdMesData.saldoInicio||0;
  const saldoTeorico=sIni+(totalV-totalAlq)-totalG;
  let y=20;
  const w=doc.internal.pageSize.getWidth();
  const addLine=(txt,x,cy,sz=11,bold=false,color=[30,58,138])=>{doc.setFontSize(sz);doc.setFont('helvetica',bold?'bold':'normal');doc.setTextColor(...color);doc.text(txt,x,cy);};
  const addRow=(l,v,cy,color=[30,30,30])=>{addLine(l,15,cy,10,false,color);addLine(v,w-15,cy,10,true,color);doc.setDrawColor(200,220,240);doc.line(15,cy+2,w-15,cy+2);};

  addLine('CIERRE MENSUAL — '+mes,w/2,y,18,true,[12,74,110]);y+=8;
  addLine('Generado: '+new Date().toLocaleDateString('es-SV'),w/2,y,9,false,[100,100,100]);y+=12;

  // Resumen
  doc.setFillColor(224,242,254);doc.roundedRect(10,y,w-20,42,3,3,'F');
  addLine('RESUMEN DEL MES',15,y+8,12,true,[3,105,161]);
  addRow('Saldo al inicio del mes:','$'+sIni.toFixed(2),y+16,[30,30,30]);
  addRow('Total ventas brutas:','$'+totalV.toFixed(2),y+23,[22,163,74]);
  addRow('Total alquiler apartado:','$'+totalAlq.toFixed(2),y+30,[180,83,9]);
  addRow('Total gastos/pagos:','$'+totalG.toFixed(2),y+37,[220,38,38]);
  y+=52;

  doc.setFillColor(240,253,244);doc.roundedRect(10,y,w-20,28,3,3,'F');
  addLine('ANÁLISIS FINANCIERO',15,y+8,12,true,[21,128,61]);
  addRow('Ganancia de inventario estimada:','$'+totalInvG.toFixed(2),y+16,[21,128,61]);
  addRow('Debería haber en caja ahora:','$'+saldoTeorico.toFixed(2),y+23,[12,74,110]);
  y+=36;

  // Ventas
  addLine('VENTAS DEL MES',15,y,12,true,[12,74,110]);y+=6;
  _cdMesData.ventas.forEach(v=>{
    if(y>270){doc.addPage();y=20;}
    addRow(_cdFmtFecha(v.fecha)+' — Venta: $'+v.total.toFixed(2),'Alq: $'+(v.alquiler||0).toFixed(2)+' → Caja: $'+(v.total-(v.alquiler||0)).toFixed(2),y,[30,30,30]);y+=7;
  });
  y+=4;

  // Gastos
  if(y>240){doc.addPage();y=20;}
  addLine('GASTOS / PAGOS DEL MES',15,y,12,true,[220,38,38]);y+=6;
  _cdMesData.gastos.forEach(g=>{
    if(y>270){doc.addPage();y=20;}
    const inv=g.tipoInv?` (Inv. costo $${g.costoInv.toFixed(2)}, ganancia +$${g.gananciaInv.toFixed(2)})`:'';
    addRow(_cdFmtFecha(g.fecha)+' — '+g.desc+inv,'$'+g.total.toFixed(2),y,[30,30,30]);y+=7;
  });

  doc.save(`Cierre_Mensual_${mes}.pdf`);
  if(typeof toast==='function')toast('📄 PDF del mes descargado');
}

// ══ Reiniciar mes ════════════════════════════════════════════════════════
function _cdReiniciarMes(){
  if(!confirm('¿Reiniciar el registro mensual? Esto borrará todas las ventas y gastos del mes actual. El PDF ya descargado conserva el historial.'))return;
  _cdMesData={saldoInicio:0,ventas:[],gastos:[]};
  _cdGuardarMes();
  if(typeof toast==='function')toast('✓ Registro mensual reiniciado');
  renderCierreDia();
}

// ══ Fecha ═════════════════════════════════════════════════════════════════
function _cdCambiarFecha(fecha){
  _cdFecha=fecha;_cdVentaSnapshot=null;_cdCambiosAplicados=[];
  _cdTxt('cdHeroFechaLbl',_cdFmtFecha(fecha));_cdTxt('cdCapFecha',_cdFmtFecha(fecha).toUpperCase());
  _cdGastos=[];_cdDeudas=[];renderCierreDia();
}

// ══ Global ════════════════════════════════════════════════════════════════
window.renderCierreDia           = renderCierreDia;
window._cdAgregarGasto           = _cdAgregarGasto;
window._cdEliminarGasto          = _cdEliminarGasto;
window._cdAgregarDeuda           = _cdAgregarDeuda;
window._cdEliminarDeuda          = _cdEliminarDeuda;
window._cdEliminarVentaMes       = _cdEliminarVentaMes;
window._cdEliminarGastoMes       = _cdEliminarGastoMes;
window._cdActualizarStats        = _cdActualizarStats;
window._cdCambiarFecha           = _cdCambiarFecha;
window._cdTomarCaptura           = _cdTomarCaptura;
window._cdAplicarVentaASaldo     = _cdAplicarVentaASaldo;
window._cdAplicarSaldoAQueda     = _cdAplicarSaldoAQueda;
window._cdAplicarCambios         = _cdAplicarCambios;
window._cdCargarSaldoAyerEnCaja  = _cdCargarSaldoAyerEnCaja;
window._cdGuardarSaldoHoyYCapturar = _cdGuardarSaldoHoyYCapturar;
window._cdGuardarSaldoInicio     = _cdGuardarSaldoInicio;
window._cdToggleInvFields        = _cdToggleInvFields;
window._cdCalcularGanancia       = _cdCalcularGanancia;
window._cdGenerarPDFMensual      = _cdGenerarPDFMensual;
window._cdReiniciarMes           = _cdReiniciarMes;
