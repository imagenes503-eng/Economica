// =====================================================================
//  📋 CIERRE DIARIO DE CAJA — v8
// =====================================================================
(function _estilosCierre() {
  if (document.getElementById('cierreDiaStyles')) return;
  const s = document.createElement('style');
  s.id = 'cierreDiaStyles';
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
    :root{
      --cd-brand:#1e40af;--cd-brand2:#3b82f6;--cd-accent:#06b6d4;
      --cd-green:#059669;--cd-amber:#d97706;--cd-red:#dc2626;--cd-purple:#7c3aed;
      --cd-bg:#f0f4f8;--cd-surface:#ffffff;--cd-surface2:#f8fafc;
      --cd-border:#e2e8f0;--cd-text:#0f172a;--cd-muted:#64748b;
      --cd-shadow:0 1px 3px rgba(15,23,42,0.08),0 4px 16px rgba(15,23,42,0.06);
      --cd-shadow-lg:0 4px 24px rgba(15,23,42,0.12),0 1px 4px rgba(15,23,42,0.08);
      --cd-radius:16px;--cd-ff:'Plus Jakarta Sans',sans-serif;
    }
    #pgCierreDia { padding:0 0 100px;background:var(--cd-bg);min-height:100vh;font-family:var(--cd-ff); }
    /* ── Hero ── */
    .cd-hero {
      background:linear-gradient(145deg,#0f172a 0%,#1e3a8a 45%,#1d4ed8 100%);
      padding:22px 18px 18px;margin-bottom:0;position:relative;overflow:hidden;
    }
    .cd-hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 70% -10%,rgba(99,179,237,0.18),transparent),radial-gradient(ellipse 50% 80% at 10% 110%,rgba(16,185,129,0.12),transparent);pointer-events:none;}
    .cd-hero-top{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:16px;position:relative;}
    .cd-hero-title{font-size:19px;font-weight:800;color:#fff;letter-spacing:-0.3px;}
    .cd-hero-fecha{font-size:11px;font-weight:600;color:rgba(255,255,255,0.6);margin-top:2px;}
    .cd-fecha-inp{padding:7px 12px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.22);border-radius:10px;color:#fff;font-size:12px;font-weight:700;font-family:var(--cd-ff);cursor:pointer;outline:none;backdrop-filter:blur(4px);}
    .cd-fecha-inp::-webkit-calendar-picker-indicator{filter:invert(1);}
    .cd-hero-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;position:relative;}
    .cd-hstat{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:13px;padding:11px 12px;backdrop-filter:blur(8px);}
    .cd-hstat-lbl{font-size:9px;font-weight:700;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:5px;}
    .cd-hstat-val{font-size:17px;font-weight:800;color:#fff;line-height:1;letter-spacing:-0.5px;}
    /* ── Body ── */
    .cd-body{padding:16px 14px;display:flex;flex-direction:column;gap:12px;}
    /* ── Panel cards ── */
    .cd-panel{background:var(--cd-surface);border:1px solid var(--cd-border);border-radius:var(--cd-radius);overflow:hidden;box-shadow:var(--cd-shadow);transition:box-shadow .2s;}
    .cd-panel:hover{box-shadow:var(--cd-shadow-lg);}
    .cd-panel-header{cursor:pointer;display:flex;align-items:center;gap:10px;padding:14px 16px;background:var(--cd-surface);flex-wrap:wrap;}
    .cd-panel-body{display:none;padding:14px 16px;}
    .cd-panel-toggle{font-size:20px;font-weight:700;color:var(--cd-muted);margin-left:auto;line-height:1;opacity:0.5;}
    .cd-panel-icon{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}
    .cd-panel-title{font-size:14px;font-weight:700;color:var(--cd-text);flex:1;min-width:100px;letter-spacing:-0.2px;}
    /* ── Modal ── */
    .cd-modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,0.65);z-index:9000;display:flex;align-items:flex-end;justify-content:center;opacity:0;pointer-events:none;transition:opacity .22s;backdrop-filter:blur(2px);}
    .cd-modal-overlay.active{opacity:1;pointer-events:all;}
    .cd-modal-sheet{background:var(--cd-surface,#fff);border-radius:24px 24px 0 0;width:100%;max-width:600px;max-height:93vh;display:flex;flex-direction:column;transform:translateY(100%);transition:transform .3s cubic-bezier(.32,.72,0,1);padding-bottom:env(safe-area-inset-bottom,16px);box-shadow:0 -12px 48px rgba(15,23,42,0.2);}
    .cd-modal-overlay.active .cd-modal-sheet{transform:translateY(0);}
    .cd-modal-handle{width:40px;height:4px;background:var(--cd-border,#e2e8f0);border-radius:2px;margin:12px auto 10px;display:block;flex-shrink:0;}
    .cd-modal-header{display:flex;align-items:center;gap:10px;padding:0 16px 14px;border-bottom:1px solid var(--cd-border);flex-shrink:0;}
    .cd-modal-icon{width:36px;height:36px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}
    .cd-modal-title{font-size:16px;font-weight:800;color:var(--cd-text);flex:1;letter-spacing:-0.3px;}
    .cd-modal-close{background:var(--cd-surface2,#f8fafc);border:1px solid var(--cd-border);border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer;color:var(--cd-muted);flex-shrink:0;transition:all .15s;}
    .cd-modal-close:hover{background:#fee2e2;color:#dc2626;border-color:#fca5a5;}
    .cd-modal-body{padding:16px;overflow-y:auto;-webkit-overflow-scrolling:touch;flex:1;}
    .cd-modal-body .cd-panel-body{display:block!important;padding:0;}
    .cd-modal-actions{display:flex;gap:10px;padding:12px 16px 10px;border-top:1px solid var(--cd-border);flex-shrink:0;flex-wrap:wrap;background:var(--cd-surface,#fff);}
    .cd-modal-actions .cd-btn-update{flex:1;min-width:110px;padding:13px 14px;font-size:13px;border-radius:12px;font-weight:700;}
    /* ── Fields & inputs ── */
    .cd-montos-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:4px;}
    @media(min-width:480px){.cd-montos-grid{grid-template-columns:repeat(3,1fr);}}
    .cd-field label{display:block;font-size:10px;font-weight:700;color:var(--cd-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px;}
    .cd-inp{width:100%;padding:10px 13px;border:1.5px solid var(--cd-border);border-radius:11px;font-size:14px;font-weight:700;font-family:var(--cd-ff);color:var(--cd-text);background:var(--cd-surface2);box-sizing:border-box;outline:none;transition:border-color .18s,background .18s,box-shadow .18s;}
    .cd-inp:focus{border-color:var(--cd-brand2);background:#fff;box-shadow:0 0 0 3px rgba(59,130,246,0.12);}
    .cd-inp.big{font-size:22px;padding:13px 14px;font-weight:800;}
    /* ── Total rows ── */
    .cd-total-row{display:flex;justify-content:space-between;align-items:center;padding:11px 14px;border-radius:12px;margin-top:10px;background:#eff6ff;}
    .cd-total-row span:first-child{font-size:12px;font-weight:700;color:#1e40af;}
    .cd-total-row span:last-child{font-size:18px;font-weight:800;color:#1e40af;letter-spacing:-0.5px;}
    .cd-total-row.green{background:#ecfdf5;} .cd-total-row.green span{color:#059669!important;}
    .cd-total-row.amber{background:#fffbeb;} .cd-total-row.amber span{color:#d97706!important;}
    .cd-total-row.red{background:#fef2f2;} .cd-total-row.red span{color:#dc2626!important;}
    .cd-total-row.purple{background:#faf5ff;} .cd-total-row.purple span{color:#7c3aed!important;}
    /* ── Sep ── */
    .cd-sep{font-size:10px;font-weight:700;color:var(--cd-muted);text-transform:uppercase;letter-spacing:0.6px;margin:14px 0 8px;display:flex;align-items:center;gap:6px;}
    .cd-sep::after{content:'';flex:1;height:1px;background:var(--cd-border);}
    /* ── Buttons ── */
    .cd-btn-update{padding:8px 14px;background:rgba(30,64,175,0.08);border:1.5px solid rgba(30,64,175,0.2);border-radius:10px;font-size:11px;font-weight:700;font-family:var(--cd-ff);color:var(--cd-brand);cursor:pointer;transition:all .15s;white-space:nowrap;}
    .cd-btn-update:hover{background:rgba(30,64,175,0.14);border-color:rgba(30,64,175,0.35);}
    .cd-btn-update:active{transform:scale(0.97);}
    .cd-btn-update.green{background:rgba(5,150,105,0.08);border-color:rgba(5,150,105,0.25);color:var(--cd-green);}
    .cd-btn-update.green:hover{background:rgba(5,150,105,0.14);}
    .cd-btn-update.red{background:rgba(220,38,38,0.08);border-color:rgba(220,38,38,0.25);color:var(--cd-red);}
    .cd-btn-add{padding:11px 16px;background:linear-gradient(135deg,var(--cd-brand),var(--cd-brand2));color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:700;font-family:var(--cd-ff);cursor:pointer;white-space:nowrap;transition:all .15s;box-shadow:0 2px 8px rgba(30,64,175,0.25);}
    .cd-btn-add:hover{opacity:0.9;transform:translateY(-1px);box-shadow:0 4px 14px rgba(30,64,175,0.3);}
    .cd-btn-add:active{transform:scale(0.98);}
    /* ── Item list ── */
    .cd-item-list{display:flex;flex-direction:column;gap:8px;margin-bottom:12px;}
    .cd-item-row{background:var(--cd-surface2);border:1px solid var(--cd-border);border-radius:12px;padding:11px 13px;}
    .cd-item-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;}
    .cd-item-desc{font-size:13px;font-weight:700;color:var(--cd-text);}
    .cd-item-monto{font-size:14px;font-weight:800;}
    .cd-item-del{background:none;border:none;cursor:pointer;color:var(--cd-muted);font-size:15px;padding:3px 6px;border-radius:7px;transition:all .15s;}
    .cd-item-del:hover{background:rgba(220,38,38,0.1);color:#dc2626;}
    .cd-item-denoms{display:flex;flex-wrap:wrap;gap:4px;margin-top:5px;}
    .cd-item-denom{font-size:10px;font-weight:700;background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;padding:2px 8px;color:#dc2626;}
    .cd-item-denom.inv{background:#dcfce7;border-color:#86efac;color:#15803d;}
    /* ── Cambios grid ── */
    .cd-cambio-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:4px;}
    @media(min-width:480px){.cd-cambio-grid{grid-template-columns:repeat(3,1fr);}}
    .cd-cambio-item{background:var(--cd-surface2);border:1.5px solid var(--cd-border);border-radius:12px;padding:11px 12px;}
    .cd-cambio-lbl{font-size:10px;font-weight:700;color:var(--cd-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;}
    .cd-add-row{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:end;}
    /* ── Tabla mensual ── */
    .cd-mes-tabla{width:100%;border-collapse:collapse;font-family:var(--cd-ff);font-size:12px;}
    .cd-mes-tabla th{background:#eff6ff;color:#1e40af;font-weight:700;padding:8px 10px;text-align:left;border-bottom:2px solid #bfdbfe;}
    .cd-mes-tabla td{padding:8px 10px;border-bottom:1px solid var(--cd-border);color:var(--cd-text);font-weight:600;}
    .cd-mes-tabla tr:last-child td{border-bottom:none;}
    .cd-mes-tabla tr:hover td{background:#f8fafc;}
    .cd-2col-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:0;}
    .cd-2col-grid .cd-panel{margin-bottom:0;}
    /* ── Capture preview (pantalla) ── */
    .cd-cap-wrap{width:100%;margin-bottom:14px;}
    .cd-resumen-captura{background:#fff;border:2.5px solid #1e40af;border-radius:14px;font-family:var(--cd-ff);width:100%;box-sizing:border-box;overflow:hidden;}
    .cd-cap-inner{padding:18px 14px 14px;box-sizing:border-box;}
    /* Header captura: emoji grande + título bold + fecha */
    .cd-cap-header-wrap{text-align:center;margin-bottom:14px;}
    .cd-cap-title-emoji{font-size:28px;display:block;margin-bottom:4px;}
    .cd-cap-title{font-size:22px;font-weight:900;color:#0f172a;text-align:center;letter-spacing:-0.5px;display:inline;}
    .cd-cap-fecha{font-size:13px;font-weight:700;color:#2563eb;text-align:center;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;}
    /* 2 col grid */
    .cd-cap-2col{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;}
    @media(max-width:500px){.cd-cap-2col{grid-template-columns:1fr;}}
    /* Cards con borde azul y fondo blanco */
    .cd-cap-col{border:2px solid #3b82f6;border-radius:12px;padding:10px 12px;background:#fff;}
    /* Header de sección: fondo azul con texto blanco */
    .cd-cap-section-title{font-size:10px;font-weight:800;color:#fff;background:#1e40af;border-radius:7px;padding:5px 10px;margin:-10px -12px 10px;text-align:center;text-transform:uppercase;letter-spacing:0.6px;display:block;}
    /* Filas: texto negro, valores a la derecha */
    .cd-cap-row{display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:600;color:#1e293b;padding:5px 0;border-bottom:1px solid #dbeafe;}
    .cd-cap-row:last-child{border-bottom:none;}
    .cd-cap-row.total{font-size:14px;font-weight:800;border-top:2px solid #2563eb;border-bottom:none;margin-top:5px;padding-top:7px;color:#1e40af;}
    .cd-cap-row.grand{font-size:14px;font-weight:800;color:#0f172a;background:#eff6ff;border-radius:10px;padding:10px 12px;margin-top:8px;border:2px solid #3b82f6;}
    /* Saldo en caja — full width, borde azul fuerte */
    .cd-cap-saldo-full{border:2px solid #1e40af;border-radius:12px;overflow:hidden;margin-bottom:10px;}
    .cd-cap-saldo-header{background:#1e40af;color:#fff;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.6px;padding:8px 14px;text-align:center;}
    .cd-cap-saldo-body{padding:10px 14px;}
    /* Alquiler row */
    .cd-cap-alq-row{display:flex;justify-content:space-between;align-items:center;background:#fffbeb;border:2px solid #f59e0b;border-radius:10px;padding:10px 14px;margin-top:8px;}
    .cd-cap-alq-row span:first-child{font-size:13px;font-weight:700;color:#92400e;}
    .cd-cap-alq-row span:last-child{font-size:16px;font-weight:900;color:#d97706;}
    /* ── PRINT MODE 9:16: 1080px × ~1920px, contenido centrado y lleno ── */
    .cd-print-mode .cd-resumen-captura{width:1080px!important;min-height:1920px!important;border:none!important;margin:0!important;border-radius:0!important;background:#ffffff!important;display:flex!important;flex-direction:column!important;justify-content:center!important;}
    .cd-print-mode .cd-cap-inner{padding:60px 52px 52px!important;flex:1!important;display:flex!important;flex-direction:column!important;justify-content:center!important;}
    .cd-print-mode .cd-cap-title-emoji{font-size:72px!important;margin-bottom:10px!important;}
    .cd-print-mode .cd-cap-title{font-size:64px!important;letter-spacing:-1px!important;}
    .cd-print-mode .cd-cap-fecha{font-size:28px!important;margin-top:10px!important;letter-spacing:2px!important;}
    .cd-print-mode .cd-cap-header-wrap{margin-bottom:44px!important;text-align:center!important;}
    .cd-print-mode .cd-cap-2col{gap:24px!important;margin-bottom:24px!important;grid-template-columns:1fr 1fr!important;}
    .cd-print-mode .cd-cap-col{padding:22px 24px!important;border-width:2.5px!important;border-radius:16px!important;}
    .cd-print-mode .cd-cap-section-title{font-size:18px!important;padding:10px 16px!important;margin:-22px -24px 16px!important;border-radius:13px 13px 0 0!important;}
    .cd-print-mode .cd-cap-row{font-size:24px!important;padding:11px 0!important;border-bottom-width:1.5px!important;}
    .cd-print-mode .cd-cap-row.total{font-size:27px!important;padding-top:13px!important;margin-top:8px!important;border-top-width:2.5px!important;}
    .cd-print-mode .cd-cap-row.grand{font-size:28px!important;padding:16px 20px!important;margin-top:12px!important;border-width:2.5px!important;}
    .cd-print-mode .cd-cap-saldo-full{border-radius:16px!important;margin-bottom:24px!important;border-width:2.5px!important;}
    .cd-print-mode .cd-cap-saldo-header{font-size:22px!important;padding:14px 24px!important;}
    .cd-print-mode .cd-cap-saldo-body{padding:18px 24px!important;}
    .cd-print-mode .cd-cap-alq-row{padding:18px 24px!important;margin-top:18px!important;border-radius:14px!important;border-width:2.5px!important;}
    .cd-print-mode .cd-cap-alq-row span:first-child{font-size:26px!important;}
    .cd-print-mode .cd-cap-alq-row span:last-child{font-size:30px!important;}
    .cd-print-mode .cd-cap-gastos-row{padding:9px 0!important;}
    .cd-print-mode .cd-cap-gastos-desc,.cd-print-mode .cd-cap-gastos-total{font-size:22px!important;}
    .cd-print-mode .cd-cap-gastos-denoms{font-size:16px!important;}
    /* Util colors */
    .val-pos{color:#059669;} .val-neg{color:#dc2626;} .val-warn{color:#d97706;}
    .val-blue{color:#1e40af;} .val-purple{color:#7c3aed;}
    /* ── Action buttons ── */
    .btn-cd-captura{width:100%;padding:15px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;border-radius:14px;font-size:14px;font-weight:800;font-family:var(--cd-ff);cursor:pointer;box-shadow:0 4px 16px rgba(5,150,105,0.3);transition:all .15s;display:flex;align-items:center;justify-content:center;gap:8px;letter-spacing:-0.2px;}
    .btn-cd-captura:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(5,150,105,0.35);}
    .btn-cd-captura:disabled{opacity:0.6;cursor:wait;transform:none;}
    .btn-cd-pdf{width:100%;padding:13px;background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;border:none;border-radius:14px;font-size:14px;font-weight:700;font-family:var(--cd-ff);cursor:pointer;box-shadow:0 4px 14px rgba(220,38,38,0.28);transition:all .15s;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:8px;}
    .btn-cd-pdf:hover{transform:translateY(-1px);}
    .cd-nota-area{width:100%;padding:10px 13px;border:1.5px solid var(--cd-border);border-radius:11px;font-size:13px;font-weight:600;font-family:var(--cd-ff);color:var(--cd-text);background:var(--cd-surface2);box-sizing:border-box;outline:none;resize:vertical;min-height:70px;transition:border-color .18s;}
    .cd-nota-area:focus{border-color:var(--cd-brand2);box-shadow:0 0 0 3px rgba(59,130,246,0.12);}
  `;
  document.head.appendChild(s);
})();

// ══ Estado ══════════════════════════════════════════════════════════════
let _cdFecha  = new Date().toISOString().split('T')[0];
let _cdGastos = [];   // [{id,desc,montos,total,inventario:{costo,ganancia}}]
let _cdDeudas = [];
let _cdCambiosAplicados = []; // historial de cambios para captura
let _cdVentaSnapshot = null;  // última venta aplicada
let _cdSaldoAyerCache = null; // saldo del día anterior para captura
let _cdVentaAyerCache = null; // venta del día anterior para captura (Fix 4+8)
let _cdRestoring = false;    // true mientras se restauran datos al cargar — bloquea el guardado
// Persistencia independiente: se leen al arrancar, no se borran con "borrar datos"
let _cdSaldoCajaPersist = (()=>{try{const r=localStorage.getItem('vpos_saldoCaja');return r?JSON.parse(r):null;}catch(e){return null;}})();
let _cdCajaAyerPersist  = (()=>{try{const r=localStorage.getItem('vpos_cajaAyer'); return r?JSON.parse(r):null;}catch(e){return null;}})();
// Registro mensual (persiste en IDB)
let _cdMesData = {
  saldoInicio: 0,      // saldo en efectivo al inicio del mes
  inventarioInicial: 0,// valor del inventario al inicio del mes
  ventas: [],          // [{fecha,total,alquiler}]
  gastos: [],          // [{fecha,desc,total,tipoInv,costoInv,gananciaInv}]
  objetivoGananciaNeta: 1200, // meta de ganancia neta mensual (efectivo+inventario final − inicial)
};

const _CD_DENOMS = [
  {id:'Billetes',label:'💵 Billetes'},{id:'Monedas',label:'🪙 M. Dólar'},
  {id:'Coras',label:'🔵 Coras'},{id:'C10',label:'🟡 10 cts'},
  {id:'C05',label:'🟤 5 cts'},{id:'C01',label:'⚪ 1 cto'},
];

function _cdFmtFecha(iso){if(!iso)return'—';const[y,m,d]=iso.split('-');const dN=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];return`${dN[new Date(iso+'T12:00:00').getDay()]} ${d}/${m}/${y.slice(2)}`;}
function _cdUID(){return'cd_'+Date.now()+'_'+Math.random().toString(36).slice(2,5);}
function _cdV(id){return parseFloat(document.getElementById(id)?.value||'0')||0;}
function _cdSet(id,v,clearZero=false){const e=document.getElementById(id);if(e&&v!=null){const n=Number(v);e.value=(clearZero&&n===0)?'':n.toFixed(2);}}
function _cdTxt(id,v){const e=document.getElementById(id);if(e)e.textContent=v;}
function _cdSumArr(arr){return arr.reduce((s,x)=>s+Number(x.total||0),0);}
function _cdFmt(n){return'$'+n.toFixed(2);}
function _cdLeerMontos(px){return{Billetes:_cdV(px+'Billetes'),Monedas:_cdV(px+'Monedas'),Coras:_cdV(px+'Coras'),C10:_cdV(px+'C10'),C05:_cdV(px+'C05'),C01:_cdV(px+'C01')};}
function _cdTotalM(m){return(m.Billetes||0)+(m.Monedas||0)+(m.Coras||0)+(m.C10||0)+(m.C05||0)+(m.C01||0);}

// ══ Persistencia automática del cierre ═══════════════════════════════════
let _cdBroadcastTimer = null;
function _cdGuardarEstadoAutomatico(){
  if(_cdRestoring) return;
  try{
    const data={
      fecha:_cdFecha,
      ventaTotal:_cdV('cdVentaTotal'),
      ventaAlquiler:_cdV('cdVentaAlquilerHoy'),
      alquiler:_cdV('cdAlquiler'),
      ayerAlquiler:_cdV('cdAyerAlquiler'),
      venta:_cdLeerMontos('cdVenta'),
      ventaSnapshot:_cdVentaSnapshot,
      gastos:_cdGastos,
      cambios:_cdCambiosAplicados,
      ts:Date.now()
    };
    // Guardar INMEDIATAMENTE en localStorage (ambas claves para compatibilidad)
    localStorage.setItem('vpos_cierre_estado', JSON.stringify(data));
    localStorage.setItem('vpos_cd_estadoDia_'+_cdFecha, JSON.stringify({valor:data, ts:data.ts}));
    // Supabase + broadcast: debounced 1.5s
    clearTimeout(_cdBroadcastTimer);
    _cdBroadcastTimer = setTimeout(()=>{
      _cdSbSave('estadoDia_'+_cdFecha, data).catch(()=>{});
      if(typeof _broadcast==='function') _broadcast('cierre_estado',{fecha:_cdFecha,data});
    }, 1500);
  }catch(e){}
}

// _cdSaldoChanged: guarda inmediatamente al escribir + feedback visual
function _cdSaldoChanged(){
  _cdGuardarSaldoCajaExplicit();
  _cdFlashBtnGuardar();
}

// Feedback visual en el botón Guardar
let _cdFlashTimer = null;
function _cdFlashBtnGuardar(){
  const btn = document.getElementById('cdBtnGuardarSaldo');
  const msg = document.getElementById('cdSaldoGuardadoMsg');
  if(btn){
    btn.style.background = 'linear-gradient(135deg,#059669,#10b981)';
    btn.innerHTML = '✅ Guardado';
    clearTimeout(_cdFlashTimer);
    _cdFlashTimer = setTimeout(()=>{
      btn.style.background = 'linear-gradient(135deg,#15803d,#16a34a)';
      btn.innerHTML = '💾 Guardar saldo en caja';
    }, 1200);
  }
  if(msg){
    msg.style.display='block';
    setTimeout(()=>{ msg.style.display='none'; }, 1800);
  }
}

// Presionar el botón manualmente
function _cdGuardarSaldoBtn(){
  _cdGuardarSaldoCajaExplicit();
  _cdFlashBtnGuardar();
  if(typeof toast==='function') toast('💾 Saldo en caja guardado');
}

// Guarda saldo en localStorage + Supabase + realtime
let _cdSaldoBroadcastTimer = null;
function _cdGuardarSaldoCajaExplicit(){
  if(_cdRestoring) return;
  try{
    const saldoM=_cdLeerMontos('cdSaldo');
    const alqVal=_cdV('cdAlquiler');
    _cdSaldoCajaPersist={montos:saldoM,alquiler:alqVal,ts:Date.now()};
    localStorage.setItem('vpos_saldoCaja',JSON.stringify(_cdSaldoCajaPersist));
    localStorage.setItem('vpos_cd_saldoCaja_'+_cdFecha, JSON.stringify({valor:_cdSaldoCajaPersist,ts:_cdSaldoCajaPersist.ts}));
    clearTimeout(_cdSaldoBroadcastTimer);
    _cdSaldoBroadcastTimer = setTimeout(()=>{
      _cdSbSave('saldoCaja_'+_cdFecha, _cdSaldoCajaPersist).catch(()=>{});
      if(typeof _broadcast==='function') _broadcast('cierre_saldo',{fecha:_cdFecha,saldo:_cdSaldoCajaPersist});
    }, 1500);
  }catch(e){}
}

// Guarda caja ayer en localStorage + Supabase + realtime
let _cdAyerBroadcastTimer = null;
function _cdGuardarCajaAyerExplicit(){
  if(_cdRestoring) return;
  try{
    const ayerM=_cdLeerMontos('cdAyer');
    const alqAyer=_cdV('cdAyerAlquiler');
    _cdCajaAyerPersist={montos:ayerM,alquiler:alqAyer,fecha:_cdFecha,ts:Date.now()};
    localStorage.setItem('vpos_cajaAyer',JSON.stringify(_cdCajaAyerPersist));
    localStorage.setItem('vpos_cd_cajaAyer_'+_cdFecha, JSON.stringify({valor:_cdCajaAyerPersist,ts:_cdCajaAyerPersist.ts}));
    clearTimeout(_cdAyerBroadcastTimer);
    _cdAyerBroadcastTimer = setTimeout(()=>{
      _cdSbSave('cajaAyer_'+_cdFecha, _cdCajaAyerPersist).catch(()=>{});
      if(typeof _broadcast==='function') _broadcast('cierre_cajaayer',{fecha:_cdFecha,datos:_cdCajaAyerPersist});
    }, 1500);
  }catch(e){}
}

function _cdRestaurarEstadoAutomatico(){
  _cdRestoring = true;

  // ── PASO 1: restaurar INMEDIATAMENTE desde localStorage (síncrono, nunca falla)
  const _lsGet = (key) => { try{ const r=localStorage.getItem(key); return r?JSON.parse(r):null; }catch(e){return null;} };

  // Leer todas las fuentes locales
  const lsSaldoWrap  = _lsGet('vpos_cd_saldoCaja_'+_cdFecha);
  const lsAyerWrap   = _lsGet('vpos_cd_cajaAyer_'+_cdFecha);
  const lsEstWrap    = _lsGet('vpos_cd_estadoDia_'+_cdFecha);
  const lsGastosWrap = _lsGet('vpos_cd_gastosDia_'+_cdFecha);
  const lsCambiosWrap= _lsGet('vpos_cd_cambiosDia_'+_cdFecha);
  const lsVentaSnap  = _lsGet('vpos_cd_ventaSnap_'+_cdFecha);
  // Compatibilidad con claves antiguas
  const lsSaldoOld   = _lsGet('vpos_saldoCaja');
  const lsAyerOld    = _lsGet('vpos_cajaAyer');
  const lsEstOld     = _lsGet('vpos_cierre_estado');

  const _pickTs = (a, b) => { if(!a) return b; if(!b) return a; return ((a.ts||0)>=(b.ts||0))?a:b; };

  const saldoLocal = _pickTs(lsSaldoWrap?.valor ?? lsSaldoWrap, lsSaldoOld) || _cdSaldoCajaPersist;
  const ayerLocal  = _pickTs(lsAyerWrap?.valor ?? lsAyerWrap, lsAyerOld)   || _cdCajaAyerPersist;
  const estLocal   = _pickTs(lsEstWrap?.valor ?? lsEstWrap, lsEstOld);
  // Gastos y cambios: usar su propia clave si existe, si no usar estado
  const gastosLocal  = lsGastosWrap?.valor ?? null;
  const cambiosLocal = lsCambiosWrap?.valor ?? null;
  const ventaSnapLocal = lsVentaSnap?.valor ?? null;

  // Aplicar datos locales ahora mismo (sin esperar Supabase)
  const _aplicar = (saldo, ayer, estado, gastos, cambios, ventaSnap) => {
    if(saldo && !saldo.borrado){
      _cdSaldoCajaPersist = saldo;
      _CD_DENOMS.forEach(d=>_cdSet('cdSaldo'+d.id, saldo.montos?.[d.id]||0, true));
      _cdSet('cdAlquiler', saldo.alquiler||0, true);
    }
    if(ayer && !ayer.borrado){
      _cdCajaAyerPersist = ayer;
      _CD_DENOMS.forEach(d=>_cdSet('cdAyer'+d.id, ayer.montos?.[d.id]||0, true));
      if(ayer.alquiler!=null) _cdSet('cdAyerAlquiler', ayer.alquiler, true);
    }
    if(estado && !estado.borrado){
      _cdSet('cdVentaTotal', estado.ventaTotal||0, true);
      _cdSet('cdVentaAlquilerHoy', estado.ventaAlquiler||0, true);
      _CD_DENOMS.forEach(d=>_cdSet('cdVenta'+d.id, estado.venta?.[d.id]||0, true));
      if(estado.ventaSnapshot) _cdVentaSnapshot = estado.ventaSnapshot;
    }
    // ventaSnapshot: usar clave propia si es más reciente y no fue borrado
    if(ventaSnap?.ventaSnapshot && !ventaSnap?.borrado) {
      const snapTs = ventaSnap.ts || 0;
      const estTs  = (estado?.ventaSnapshot?.ts) || 0;
      if(snapTs >= estTs) _cdVentaSnapshot = ventaSnap.ventaSnapshot;
    }
    // Gastos: usar clave propia si existe, si no usar los del estado
    const gastosFinales = gastos?.gastos ?? (estado && !estado.borrado ? estado.gastos : null);
    if(Array.isArray(gastosFinales)) _cdGastos = gastosFinales;
    // Cambios: igual
    const cambiosFinales = cambios?.cambios ?? (estado && !estado.borrado ? estado.cambios : null);
    if(Array.isArray(cambiosFinales)) _cdCambiosAplicados = cambiosFinales;
    _cdRenderListas();
    _cdActualizarStats();
    // Segundo pase con delay para asegurar que datos async (saldoAyer) ya cargaron
    setTimeout(()=>{ if(typeof _cdActualizarStats==='function') _cdActualizarStats(); }, 300);
  };

  setTimeout(()=>{
    _aplicar(saldoLocal, ayerLocal, estLocal, gastosLocal, cambiosLocal, ventaSnapLocal);
    _cdRestoring = false;
  }, 60);

  // ── PASO 2: en paralelo, intentar Supabase para sincronizar con el otro teléfono
  Promise.all([
    _cdSbLoad('saldoCaja_'+_cdFecha).catch(()=>null),
    _cdSbLoad('cajaAyer_'+_cdFecha).catch(()=>null),
    _cdSbLoad('estadoDia_'+_cdFecha).catch(()=>null),
    _cdSbLoad('gastosDia_'+_cdFecha).catch(()=>null),
    _cdSbLoad('cambiosDia_'+_cdFecha).catch(()=>null),
    _cdSbLoad('ventaSnap_'+_cdFecha).catch(()=>null)
  ]).then(([sbSaldo, sbAyer, sbEstado, sbGastos, sbCambios, sbVentaSnap])=>{
    const saldoFinal   = _pickTs(sbSaldo, saldoLocal);
    const ayerFinal    = _pickTs(sbAyer, ayerLocal);
    let estFinal       = _pickTs(sbEstado, estLocal);
    if(estFinal && estFinal.borrado) estFinal = null;
    const gastosFinal  = _pickTs(sbGastos, gastosLocal);
    const cambiosFinal = _pickTs(sbCambios, cambiosLocal);
    const ventaSnapFin = _pickTs(sbVentaSnap, ventaSnapLocal);

    const sbMasReciente =
      (sbSaldo     && (sbSaldo.ts||0)     > (saldoLocal?.ts||0))    ||
      (sbAyer      && (sbAyer.ts||0)      > (ayerLocal?.ts||0))     ||
      (sbEstado    && !sbEstado.borrado   && (sbEstado.ts||0)    > (estLocal?.ts||0))   ||
      (sbGastos    && (sbGastos.ts||0)    > (gastosLocal?.ts||0))   ||
      (sbCambios   && (sbCambios.ts||0)   > (cambiosLocal?.ts||0))  ||
      (sbVentaSnap && (sbVentaSnap.ts||0) > (ventaSnapLocal?.ts||0));

    if(sbMasReciente){
      _cdRestoring = true;
      setTimeout(()=>{
        _aplicar(saldoFinal, ayerFinal, estFinal, gastosFinal, cambiosFinal, ventaSnapFin);
        _cdRestoring = false;
      }, 60);
    }
  }).catch(()=>{ /* offline */ });
}

function _cdMesKey(){return _cdFecha.substring(0,7);}
// Compara un fechaISO (timestamp UTC completo) contra un mes "YYYY-MM" usando
// la fecha LOCAL del dispositivo, no el prefijo de texto UTC. Esto evita que
// una venta de la noche (ej. 8pm) quede mal clasificada en el mes/día
// siguiente solo porque en UTC ya cambió la fecha (El Salvador es UTC-6).
function _fechaISOEnMes(fechaISO, mesKey){
  try{
    const d = new Date(fechaISO);
    const ym = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
    return ym === mesKey;
  }catch{ return false; }
}

function _cdBloqueMontosHTML(px){
  const isSaldo = px==='cdSaldo';
  const extraBlur = isSaldo ? ` onblur="_cdAplicarSaldoAQueda()"` : '';
  // Para saldo: el oninput llama _cdSaldoChanged() que guarda inmediatamente
  const onI = isSaldo
    ? `_cdActualizarStats();_cdSaldoChanged()`
    : `_cdActualizarStats()`;
  return`<div class="cd-montos-grid">
    <div class="cd-field"><label>💵 Billetes ($)</label><input class="cd-inp" type="number" id="${px}Billetes" min="0" step="0.01" placeholder="0.00" oninput="${onI}"${extraBlur}></div>
    <div class="cd-field"><label>🪙 M. Dólar ($)</label><input class="cd-inp" type="number" id="${px}Monedas" min="0" step="0.01" placeholder="0.00" oninput="${onI}"${extraBlur}></div>
    <div class="cd-field"><label>🔵 Coras ($)</label><input class="cd-inp" type="number" id="${px}Coras" min="0" step="0.01" placeholder="0.00" oninput="${onI}"${extraBlur}></div>
    <div class="cd-field"><label>🟡 10 centavos ($)</label><input class="cd-inp" type="number" id="${px}C10" min="0" step="0.01" placeholder="0.00" oninput="${onI}"${extraBlur}></div>
    <div class="cd-field"><label>🟤 5 centavos ($)</label><input class="cd-inp" type="number" id="${px}C05" min="0" step="0.01" placeholder="0.00" oninput="${onI}"${extraBlur}></div>
    <div class="cd-field"><label>⚪ 1 centavo ($)</label><input class="cd-inp" type="number" id="${px}C01" min="0" step="0.01" placeholder="0.00" oninput="${onI}"${extraBlur}></div>
  </div>`;
}

// ══ Persistencia IDB ════════════════════════════════════════════════════
async function _cdCargarMes(){
  const r = await _cdSbLoad('cierreMes_'+_cdMesKey());
  if(r) _cdMesData = {...{saldoInicio:0,inventarioInicial:0,ventas:[],gastos:[],objetivoGananciaNeta:1200}, ...r};
  else _cdMesData = {saldoInicio:0,inventarioInicial:0,ventas:[],gastos:[],objetivoGananciaNeta:1200};
}
async function _cdGuardarMes(){
  await _cdSbSave('cierreMes_'+_cdMesKey(), _cdMesData);
  _cdSubirMesSupabase();
  if(typeof syncAhora==='function') syncAhora('todo');
  // Notificar a otros dispositivos en tiempo real
  if(typeof _broadcast==='function') _broadcast('cierre_dia_actualizado', { mes: _cdMesKey(), datos: _cdMesData });
}
// Saldo de ayer → Supabase primero
async function _cdCargarSaldoAyer(){
  const ayer=new Date(new Date(_cdFecha).getTime()-86400000).toISOString().split('T')[0];
  return await _cdSbLoad('cierreSaldo_'+ayer);
}
async function _cdGuardarSaldoHoy(saldo){
  await _cdSbSave('cierreSaldo_'+_cdFecha, saldo);
  if(typeof syncAhora==='function') syncAhora('todo');
  // Notificar a otros dispositivos en tiempo real
  if(typeof _broadcast==='function') _broadcast('cierre_dia_actualizado', { fecha: _cdFecha, saldo });
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

  // Primera carga: obtener datos de red. Re-renders usan caché.
  const yaRenderizado = pg.dataset.cdInit === '1';
  if(!yaRenderizado){
    await _cdCargarMes();
    const saldoAyer=await _cdCargarSaldoAyer();
    _cdSaldoAyerCache = saldoAyer;
    const ventaAyer=await _cdCargarVentaAyer();
    _cdVentaAyerCache = ventaAyer;
  } else {
    await _cdCargarMes(); // solo el mes, es rápido (local)
  }
  pg.dataset.cdInit = '1';
  // Actualizar imagen después de que todos los datos async estén listos
  setTimeout(()=>{ if(typeof _cdActualizarStats==='function') _cdActualizarStats(); }, 200);
  const saldoAyer = _cdSaldoAyerCache;
  // Cargar queda persistido (sobrevive reinicio de mes)
  const quedaPersistida=await _idbCargarQueda();
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
  const totalAlquilerMes=_cdMesData.ventas.reduce((s,v)=>s+(v.alquiler||0),0);
  const totalInvCosto=_cdMesData.gastos.filter(g=>g.tipoInv).reduce((s,g)=>s+(g.costoInv||0),0);
  const totalInvGanancia=_cdMesData.gastos.filter(g=>g.tipoInv).reduce((s,g)=>s+(g.gananciaInv||0),0);
  const saldoEfec=(_cdMesData.saldoInicio||0);
  const invIni=(_cdMesData.inventarioInicial||0);
  const ventasACajaMes=totalVentasMes-totalAlquilerMes;
  // Caja final = efectivo inicio - gastos + ventas a caja
  const cajaFinal=saldoEfec-totalGastosMes+ventasACajaMes;

  // ── COGS real: costo de lo vendido este mes ──────────────────────────
  // Usa costoItem guardado en cada venta (desde la versión actualizada).
  // Para ventas antiguas sin costoItem, estima con precio de compra actual.
  const _mesPrefix = _cdMesKey(); // 'YYYY-MM'
  const cogsDelMes = (typeof historial !== 'undefined' ? historial : [])
    .filter(v => v.fechaISO && _fechaISOEnMes(v.fechaISO, _mesPrefix))
    .reduce((total, venta) => {
      return total + (venta.items || []).reduce((s, it) => {
        if (it.costoItem !== undefined) return s + Number(it.costoItem || 0);
        // fallback para ventas antiguas
        const prod = (typeof productos !== 'undefined' ? productos : [])
          .find(x => String(x.id) === String(it.id));
        return s + (prod ? (Number(prod.compra) || 0) : 0) * Number(it.cant || 0);
      }, 0);
    }, 0);

  // Inventario final = inventario inicio - COGS real + ganancia de recompras
  // (se sigue usando en el resumen "Registro Mensual" ya existente, sin cambios)
  const invFinal = Math.max(0, invIni - cogsDelMes + totalInvGanancia);

  // ── OBJETIVO DE GANANCIA MENSUAL (sección totalmente aparte) ─────────
  // Cálculo profesional en 2 componentes independientes, ambos en vivo:
  //
  //  A) Ganancia EN INVENTARIO (potencial, aún no vendida):
  //     Se calcula directamente del stock real de cada producto:
  //     Σ stock_actual × (precio_venta − precio_compra)
  //     → Refleja INMEDIATAMENTE cualquier "Registrar Entrada de Inventario",
  //       sin depender de ningún registro manual de gasto.
  //
  //  B) Ganancia YA REALIZADA en efectivo (ventas de este mes):
  //     Ingreso real del mes − Costo real de lo vendido (COGS), tomado
  //     directo del historial de ventas (mismo dato que usa el resto del
  //     cierre), así que cuando un producto se vende, su ganancia se
  //     "traslada" automáticamente de A) hacia B) — nunca se cuenta doble,
  //     porque al venderse el producto sale del stock (A baja) y entra
  //     al historial de ventas (B sube) en la misma proporción.
  //
  //  TOTAL = A + B  → esto es lo que se compara contra la meta mensual.
  const objetivoMeta = Number(_cdMesData.objetivoGananciaNeta || 1200);

  // A) Ganancia potencial en inventario, en tiempo real
  const gananciaInventarioAhora = (typeof productos !== 'undefined' ? productos : [])
    .reduce((s, p) => s + (Number(p.stock) || 0) * ((Number(p.venta) || 0) - (Number(p.compra) || 0)), 0);

  // B) Ganancia ya realizada: ingreso real del mes − COGS real del mes
  const ingresoRealMes = (typeof historial !== 'undefined' ? historial : [])
    .filter(v => v.fechaISO && _fechaISOEnMes(v.fechaISO, _mesPrefix))
    .reduce((total, venta) => {
      return total + (venta.items || []).reduce((s, it) => {
        const totalItem = it.totalItem !== undefined
          ? Number(it.totalItem)
          : Number(it.precio || 0) * Number(it.cantCobrada || it.cant || 0);
        return s + totalItem;
      }, 0);
    }, 0);
  const gananciaEfectivoMes = ingresoRealMes - cogsDelMes;

  const gananciaGeneralMes = gananciaInventarioAhora + gananciaEfectivoMes;
  const progresoPct = objetivoMeta > 0 ? Math.max(0, Math.min(999, (gananciaGeneralMes / objetivoMeta) * 100)) : 0;
  const faltaParaMeta = Math.max(0, objetivoMeta - gananciaGeneralMes);
  const metaCumplida = gananciaGeneralMes >= objetivoMeta;

  // ── LO QUE TENGO EN MI TIENDA (patrimonio total en tiempo real) ──────
  // Efectivo inicial del mes + lo que ya se ha vendido (neto de gastos)
  // + el valor real del inventario que queda ahora mismo (a precio de VENTA).
  // Se actualiza solo: cada venta mueve el efectivo vendido y baja el stock;
  // cada "Registrar Entrada de Inventario" sube el valor del inventario.
  //
  // NOTA: el "efectivo inicial" real lo llena el usuario en
  // Inventario → Capital e Inventario → "Efectivo al Iniciar" (variable
  // global `efectivoInicial` de app.js). Ese es el campo que de verdad se
  // usa; el de Cierre Diario (saldoEfec) puede estar vacío y no debe
  // hacer que esta sección se vea en $0 si el otro campo sí tiene valor.
  const efectivoInicialReal = (typeof efectivoInicial !== 'undefined' && Number(efectivoInicial) > 0)
    ? Number(efectivoInicial)
    : saldoEfec;

  // Los gastos/pagos reales del negocio se registran en Reportes → Gastos
  // y Pagos (array global `pagos`, categorías FACTURA + GASTO) — es un
  // módulo totalmente aparte del "Registro Mensual" de Cierre Diario, así
  // que se lee directo de ahí para que esta sección quede siempre exacta.
  //
  // Se separan en dos, a pedido: "Pago de Factura" (FACTURA) es el único
  // que descuenta del TOTAL principal; "Gasto Mensual" (GASTO) se muestra
  // aparte y solo se resta en el segundo total ("TOTAL − Gasto Mensual").
  const _pagosMes = (typeof pagos !== 'undefined' ? pagos : [])
    .filter(g => typeof esMesActual === 'function' ? esMesActual(g.fechaISO) : true);
  const totalFacturasReal     = _pagosMes.filter(g => g.cat === 'FACTURA').reduce((s, g) => s + Number(g.monto || 0), 0);
  const totalGastoMensualReal = _pagosMes.filter(g => g.cat === 'GASTO').reduce((s, g) => s + Number(g.monto || 0), 0);

  const efectivoVendidoNeto = ingresoRealMes - totalFacturasReal;
  const valorInventarioActual = (typeof productos !== 'undefined' ? productos : [])
    .reduce((s, p) => s + (Number(p.stock) || 0) * (Number(p.venta) || 0), 0);
  const patrimonioTotal = efectivoInicialReal + efectivoVendidoNeto + valorInventarioActual;
  const patrimonioTotalMenosGastoMensual = patrimonioTotal - totalGastoMensualReal;

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
          <button class="cd-btn-update green" onclick="_cdCalcular('venta')">🧮 Calcular</button><div class="cd-panel-toggle">⌄</div>
        </div>
        <div class="cd-panel-body">
          <div class="cd-field" style="margin-bottom:10px;">
            <label>Total vendido ($)</label>
            <input class="cd-inp big" type="number" id="cdVentaTotal" min="0" step="0.01" placeholder="0.00" value="${vSug>0?vSug.toFixed(2):''}" oninput="_cdAutoRecalcSaldo()">
            ${vSug>0?`<div style="font-size:11px;color:#0369a1;font-weight:700;margin-top:4px;">💡 Del POS: $${vSug.toFixed(2)}</div>`:''}
          </div>
          <div class="cd-field" style="margin-bottom:10px;">
            <label>🏘 Menos alquiler de hoy ($)</label>
            <input class="cd-inp" type="number" id="cdVentaAlquilerHoy" min="0" step="0.01" placeholder="0.00" oninput="_cdAutoRecalcSaldo()">
          </div>
          <div class="cd-sep">Desglose recibido</div>
          ${_cdBloqueMontosHTML('cdVenta')}
          <div id="cdVentaAlqMsg" style="display:none;margin-top:6px;padding:7px 10px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:10px;font-weight:700;color:#b45309;font-family:Nunito,sans-serif;"></div>
          <div class="cd-total-row"><span>Suma desglose</span><span id="cdVentaDesgloseTotal">$0.00</span></div>
        </div>
      </div>

      <!-- CAJA DÍA DE AYER -->
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#fef9c3;">📦</div>
          <div class="cd-panel-title">Caja Día de Ayer</div>
          <button class="cd-btn-update" onclick="_cdGuardarAyer()">💾 Guardar saldo actual</button><div class="cd-panel-toggle">⌄</div>
        </div>
        <div class="cd-panel-body">
          ${_cdBloqueMontosHTML('cdAyer')}
          <div class="cd-field" style="margin-top:12px;">
            <label>🏘 Alquiler acumulado ayer ($)</label>
            <input class="cd-inp" type="number" id="cdAyerAlquiler" min="0" step="0.01" placeholder="0.00" oninput="_cdActualizarStats()">
          </div>
          <div class="cd-total-row amber" style="margin-top:8px;"><span>Total caja ayer <span style="font-size:9px;font-weight:700;color:#b45309;opacity:0.75;">(sin alquiler)</span></span><span id="cdAyerTotal">$0.00</span></div>
        </div>
      </div>

      <!-- GASTOS / PAGOS -->
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#fee2e2;">📤</div>
          <div class="cd-panel-title">Gastos / Pagos del Día</div>
          <button class="cd-btn-update" onclick="_cdActualizarStats()" style="background:#dc2626;color:#fff;border-color:#dc2626;font-size:11px;padding:5px 10px;">📸 Actualizar imagen</button>
          <div class="cd-panel-toggle">⌄</div>
        </div>
        <div class="cd-panel-body">
          <div class="cd-item-list" id="cdGastosList"></div>
          <div style="background:#fef2f2;border:1.5px solid #fca5a5;border-radius:12px;padding:12px;margin-top:4px;">
            <div style="font-size:11px;font-weight:900;color:#dc2626;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:10px;">➕ Registrar gasto / pago</div>
            <div class="cd-field" style="margin-bottom:10px;">
              <label>Descripción</label>
              <input class="cd-inp" type="text" id="cdGastoDesc" placeholder="Ej: Pepsi, Luz, Alquiler…" onkeydown="if(event.key==='Enter')_cdAgregarGasto()">
            </div>
            <div class="cd-sep" style="margin-top:0;">¿Qué se sacó de caja?</div>
            ${_cdBloqueMontosHTML('cdGastoForm')}
            <div style="margin-top:12px;padding:10px 12px;background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;font-weight:900;color:#15803d;font-family:Nunito,sans-serif;margin-bottom:8px;">
                <input type="checkbox" id="cdGastoEsInventario" onchange="_cdToggleInvFields()" style="width:16px;height:16px;accent-color:#16a34a;"> 📦 Este pago es para inventario (tiene ganancia)
              </label>
              <div id="cdGastoInvFields" style="display:none;grid-template-columns:1fr 1fr;gap:8px;">
                <div class="cd-field"><label>Costo pagado ($)</label><input class="cd-inp" type="number" id="cdGastoInvCosto" min="0" step="0.01" placeholder="0.00"></div>
                <div class="cd-field"><label>Valor de venta ($) con ganancia</label><input class="cd-inp" type="number" id="cdGastoInvVenta" min="0" step="0.01" placeholder="0.00" oninput="_cdCalcularGanancia()"></div>
                <div class="cd-field" style="grid-column:span 2;"><label>Ganancia estimada</label><div id="cdGastoGananciaLbl" style="padding:8px 12px;background:#dcfce7;border-radius:8px;font-size:14px;font-weight:900;color:#15803d;font-family:Nunito,sans-serif;">$0.00</div></div>
              </div>
            </div>
            <button class="cd-btn-add" style="width:100%;margin-top:10px;" onclick="_cdAgregarGasto()">➕ Registrar gasto</button>
          </div>
          <div class="cd-total-row red" style="margin-top:12px;"><span>Total gastos del día</span><span id="cdGastosTotal">$0.00</span></div>
        </div>
      </div>

      <!-- CAMBIOS DEL DÍA -->
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#fef3c7;">🔄</div>
          <div class="cd-panel-title">Cambios del Día</div>
          <button class="cd-btn-update" onclick="_cdCalcular('cambios')" style="background:#f59e0b;color:#fff;border-color:#f59e0b;">🧮 Calcular</button><div class="cd-panel-toggle">⌄</div>
        </div>
        <div class="cd-panel-body">
          <div style="font-size:11px;color:var(--text-muted);font-weight:700;margin-bottom:12px;">Sale de una denominación → entra en otra. Opera sobre el saldo actual en caja sin alterar venta ni gastos.</div>
          <div class="cd-cambio-grid">${cambioGrid}</div>
          <div id="cdCambioResumen" style="margin-top:12px;"></div>
          <div class="cd-total-row amber" style="margin-top:8px;"><span>Total cambios del día</span><span id="cdCambiosTotal">$0.00</span></div>
          ${_cdCambiosAplicados.length ? `
          <div style="margin-top:8px;">
            <div class="cd-sep" style="margin-top:0;">Cambios ya aplicados hoy</div>
            ${_cdCambiosAplicados.map(m=>`<div style="font-size:12px;font-weight:700;color:var(--text-muted);padding:3px 0;font-family:Nunito,sans-serif;">• ${m.de} −$${m.monto.toFixed(2)} → ${m.hacia} +$${m.monto.toFixed(2)}</div>`).join('')}
          </div>` : ''}
        </div>
      </div>

      <!-- SALDO QUE QUEDÓ AYER (automático) -->
      ${saldoAyer ? `
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#f5f3ff;">📅</div>
          <div class="cd-panel-title">Saldo que Quedó Ayer</div>
          <button class="cd-btn-update" onclick="_cdCargarSaldoAyerEnCaja()">⬆ Usar como saldo inicial</button><div class="cd-panel-toggle">⌄</div>
        </div>
        <div class="cd-panel-body">
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
      <div class="cd-panel" style="border:2px solid #15803d;">
        <div class="cd-panel-header" style="background:linear-gradient(135deg,#15803d,#16a34a);">
          <div class="cd-panel-icon" style="background:rgba(255,255,255,.2);color:#fff;">🏦</div>
          <div class="cd-panel-title" style="color:#fff;">Saldo en Caja</div>
          <div class="cd-panel-toggle">⌄</div>
        </div>
        <div class="cd-panel-body">
          <div style="font-size:11px;color:#15803d;font-weight:700;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px 12px;margin-bottom:12px;font-family:Nunito,sans-serif;">
            💰 Resultado en tiempo real: Venta + Ayer − Alquiler − Gastos ± Cambios
          </div>
          ${_cdBloqueMontosHTML('cdSaldo')}
          <div class="cd-field" style="margin-top:12px;">
            <label>🏘 Total alquiler acumulado ($) — guardado aparte</label>
            <input class="cd-inp" type="number" id="cdAlquiler" min="0" step="0.01" placeholder="0.00" oninput="_cdActualizarStats();_cdSaldoChanged()">
          </div>
          <div class="cd-total-row green"><span>💰 Total físico en caja</span><span id="cdSaldoTotal" style="font-size:1.1em;">$0.00</span></div>
          <div class="cd-total-row amber" style="margin-top:6px;"><span>Alquiler acumulado</span><span id="cdAlquilerTotal">$0.00</span></div>
          <div class="cd-total-row" style="margin-top:6px;background:#e0f2fe;"><span style="color:#0369a1;font-weight:900;">📊 Total caja + alquiler</span><span id="cdCajaAlquilerTotal" style="color:#0369a1;">$0.00</span></div>
          <button id="cdBtnGuardarSaldo"
            onclick="_cdGuardarSaldoBtn()"
            style="margin-top:14px;width:100%;padding:13px;background:linear-gradient(135deg,#15803d,#16a34a);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:800;font-family:var(--cd-ff);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 3px 10px rgba(21,128,61,0.3);transition:all .2s;">
            💾 Guardar saldo en caja
          </button>
          <div id="cdSaldoGuardadoMsg" style="display:none;text-align:center;font-size:11px;font-weight:700;color:#15803d;margin-top:6px;font-family:var(--cd-ff);">✓ Saldo guardado correctamente</div>
        </div>
      </div>
      <!-- REGISTRO MENSUAL -->
      <div class="cd-panel">
        <div class="cd-panel-header">
          <div class="cd-panel-icon" style="background:#dbeafe;">📅</div>
          <div class="cd-panel-title">Registro Mensual — ${_cdMesKey()}</div>
        </div>
        <div class="cd-panel-body">
          <!-- Saldos iniciales del mes -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
            <div class="cd-field">
              <label>💵 Saldo efectivo al inicio del mes ($)</label>
              <input class="cd-inp" type="number" id="cdMesSaldoInicio" min="0" step="0.01" placeholder="0.00" value="${saldoEfec||''}" onchange="_cdGuardarSaldoInicio()">
            </div>
            <div class="cd-field">
              <label>📦 Inventario inicial del mes ($)</label>
              <input class="cd-inp" type="number" id="cdMesInvInicial" min="0" step="0.01" placeholder="0.00" value="${invIni||''}" onchange="_cdGuardarInventarioInicial()">
            </div>
          </div>
          <!-- Subtotal saldo+inventario (solo lectura) -->
          <div style="display:flex;justify-content:space-between;align-items:center;padding:9px 14px;background:#e0f2fe;border-radius:10px;font-family:Nunito,sans-serif;margin-bottom:14px;">
            <span style="font-size:12px;font-weight:900;color:#0369a1;">💰 Saldo inicial + Inventario inicial</span>
            <span style="font-size:16px;font-weight:900;color:#0369a1;">$${(saldoEfec+invIni).toFixed(2)}</span>
          </div>
          <!-- Ventas del mes -->
          <div class="cd-sep" style="margin-top:4px;">📈 Ventas registradas este mes</div>
          <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;margin-bottom:8px;">
            <table class="cd-mes-tabla" id="cdMesTablaVentas">
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
            <table class="cd-mes-tabla" id="cdMesTablaGastos">
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
                  <td colspan="2" style="font-weight:900;color:#dc2626;">TOTAL GASTOS</td>
                  <td style="font-weight:900;color:#dc2626;">$${totalGastosMes.toFixed(2)}</td>
                  <td style="font-weight:900;color:#15803d;">Total ganancia inv: $${totalInvGanancia.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <!-- Resumen mensual -->
          <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:14px 16px;margin-top:8px;">
            <div style="font-size:13px;font-weight:900;color:#15803d;margin-bottom:10px;font-family:Nunito,sans-serif;">📊 Resumen del mes</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;font-family:Nunito,sans-serif;">
              <div style="color:var(--text-muted);font-weight:700;">Saldo efectivo inicio:</div><div style="font-weight:900;color:#0369a1;">$${saldoEfec.toFixed(2)}</div>
              <div style="color:var(--text-muted);font-weight:700;">− Gastos del saldo:</div><div style="font-weight:900;color:#dc2626;">-$${totalGastosMes.toFixed(2)}</div>
              <div style="color:var(--text-muted);font-weight:700;">+ Ventas a caja:</div><div style="font-weight:900;color:#15803d;">+$${ventasACajaMes.toFixed(2)}</div>
              <div style="color:var(--text-muted);font-weight:700;border-top:1px solid #bbf7d0;padding-top:6px;font-weight:900;">💵 Debería haber en CAJA:</div>
              <div style="font-weight:900;color:#0369a1;font-size:14px;border-top:1px solid #bbf7d0;padding-top:6px;">$${cajaFinal.toFixed(2)}</div>
              <div style="color:var(--text-muted);font-weight:700;margin-top:6px;">Inventario inicial:</div><div style="font-weight:900;color:#7c3aed;">$${invIni.toFixed(2)}</div>
              <div style="color:var(--text-muted);font-weight:700;">− Costo de lo vendido (COGS):</div><div style="font-weight:900;color:#dc2626;">-$${cogsDelMes.toFixed(2)}</div>
              <div style="color:var(--text-muted);font-weight:700;">+ Ganancia de recompras:</div><div style="font-weight:900;color:#15803d;">+$${totalInvGanancia.toFixed(2)}</div>
              <div style="color:var(--text-muted);font-weight:700;border-top:1px solid #bbf7d0;padding-top:6px;">📦 Debería haber en INVENTARIO:</div>
              <div style="font-weight:900;color:#7c3aed;font-size:14px;border-top:1px solid #bbf7d0;padding-top:6px;">$${invFinal.toFixed(2)}</div>
            </div>
          </div>
          <!-- Botones PDF y reiniciar -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px;">
            <button class="btn-cd-pdf" onclick="_cdGenerarPDFMensual()" style="font-size:12px;padding:11px;">📄 Descargar Estado de Resultados</button>
            <button class="cd-btn-update red" style="padding:11px;border-radius:10px;width:100%;" onclick="_cdReiniciarMes()">♻️ Reiniciar mes</button>
          </div>
        </div>
      </div>

      <!-- CAPTURA RESPONSIVE EN PANTALLA, 1080x1920 AL DESCARGAR -->
      <div class="cd-cap-wrap">
        <div class="cd-resumen-captura" id="cdResumenCaptura">
          <div class="cd-cap-inner">
            <div class="cd-cap-title">📋 CIERRE DE CAJA</div>
            <div class="cd-cap-fecha" id="cdCapFecha">${_cdFmtFecha(_cdFecha).toUpperCase()}</div>

            <!-- 1+2: Caja Día de Ayer FIRST | Venta del Día -->
            <div class="cd-cap-2col">
              <div class="cd-cap-col" id="capAyerWrap">
                <div class="cd-cap-section-title" id="capAyerFechaTitle">📦 Caja Día de Ayer</div>
                <div class="cd-cap-row"><span>💵 Billetes</span><span id="capAyerBilletes">—</span></div>
                <div class="cd-cap-row"><span>🪙 M. Dólar</span><span id="capAyerMonedas">—</span></div>
                <div class="cd-cap-row"><span>🔵 Coras</span><span id="capAyerCoras">—</span></div>
                <div class="cd-cap-row"><span>🟡 10 centavos</span><span id="capAyerC10">—</span></div>
                <div class="cd-cap-row"><span>🟤 5 centavos</span><span id="capAyerC05">—</span></div>
                <div class="cd-cap-row"><span>⚪ 1 centavo</span><span id="capAyerC01">—</span></div>
                <div class="cd-cap-row total"><span>Total ayer</span><span class="val-purple" id="capAyerTotal">—</span></div>
              </div>
              <div class="cd-cap-col">
                <div class="cd-cap-section-title">💹 Venta del Día</div>
                <div class="cd-cap-row"><span>Total venta</span><span class="val-blue" id="capVentaTotal">$0.00</span></div>
                <div class="cd-cap-row"><span>💵 Billetes</span><span id="capVBilletes">$0.00</span></div>
                <div class="cd-cap-row"><span>🪙 M. Dólar</span><span id="capVMonedas">$0.00</span></div>
                <div class="cd-cap-row"><span>🔵 Coras</span><span id="capVCoras">$0.00</span></div>
                <div class="cd-cap-row"><span>🟡 10 cts</span><span id="capVC10">$0.00</span></div>
                <div class="cd-cap-row"><span>🟤 5 cts</span><span id="capVC05">$0.00</span></div>
                <div class="cd-cap-row"><span>⚪ 1 cto</span><span id="capVC01">$0.00</span></div>
                <div id="capAlqHoyWrap" style="display:none;"><div class="cd-cap-row"><span>🏘 −Alquiler hoy</span><span class="val-warn" id="capAlqHoy">$0.00</span></div></div>
                <div class="cd-cap-row total"><span>Total venta - alquiler</span><span class="val-blue" id="capVentaTotalFinal">$0.00</span></div>
              </div>
            </div>

            <!-- 3+4: Gastos | Cambios del Día (lado a lado) -->
            <div class="cd-cap-2col">
              <div class="cd-cap-col">
                <div class="cd-cap-section-title">📤 Gastos / Pagos del Día</div>
                <div id="capGastosDetalleList"><div class="cd-cap-row"><span>Sin gastos</span><span>—</span></div></div>
                <div class="cd-cap-row total"><span>Total gastos</span><span class="val-neg" id="capGTotal">$0.00</span></div>
              </div>
              <div class="cd-cap-col">
                <div class="cd-cap-section-title">🔄 Cambios del Día</div>
                <div id="capCambiosList"><div class="cd-cap-row"><span>Sin cambios</span><span>—</span></div></div>
                <div class="cd-cap-row total"><span>Total cambios aplicados</span><span class="val-warn" id="capCambiosTotal">$0.00</span></div>
              </div>
            </div>

            <!-- 4. Saldo en Caja — ancho completo, destacado -->
            <div class="cd-cap-saldo-full">
              <div class="cd-cap-saldo-header">🏦 Saldo en Caja — <span id="capSaldoFecha"></span></div>
              <div class="cd-cap-saldo-body">
                <div class="cd-cap-row"><span>💵 Billetes</span><span id="capSBilletes">$0.00</span></div>
                <div class="cd-cap-row"><span>🪙 M. Dólar</span><span id="capSMonedas">$0.00</span></div>
                <div class="cd-cap-row"><span>🔵 Coras</span><span id="capSCoras">$0.00</span></div>
                <div class="cd-cap-row"><span>🟡 10 centavos</span><span id="capSC10">$0.00</span></div>
                <div class="cd-cap-row"><span>🟤 5 centavos</span><span id="capSC05">$0.00</span></div>
                <div class="cd-cap-row"><span>⚪ 1 centavo</span><span id="capSC01">$0.00</span></div>
                <div class="cd-cap-row total"><span>💰 Total físico en caja</span><span class="val-pos" id="capSaldoTotal">$0.00</span></div>
              </div>
            </div>
            <!-- Alquiler acumulado -->
            <div class="cd-cap-alq-row"><span>🏘 Alquiler acumulado</span><span id="capAlquilerFinal">$0.00</span></div>
            <!-- Pendientes (deudas) — oculto si vacío -->
            <div id="capDeudasList" style="display:none;margin-top:8px;">
              <div class="cd-cap-section-title" style="margin:0 0 6px;background:#7c3aed;">📋 Pendientes / Deudas</div>
              <div id="capDeudasItems"></div>
              <div class="cd-cap-row total" style="color:#7c3aed;border-color:#7c3aed;"><span>Total pendientes</span><span id="capDTotal">$0.00</span></div>
            </div>
            <!-- Nota del cierre — oculto si vacío -->
            <div id="capNotaWrap" style="display:none;margin-top:8px;padding:10px 12px;background:#fefce8;border:1.5px solid #fde047;border-radius:10px;font-size:12px;font-weight:700;color:#713f12;"></div>
          </div>
        </div>
      </div>
      <button class="btn-cd-captura" onclick="_cdTomarCaptura()">📸 Descargar imagen 1080×1920</button>
      <button onclick="_cdBorrarDatosCierre()" style="width:100%;margin-top:8px;padding:13px;background:#fff;border:2px solid #dc2626;color:#dc2626;border-radius:14px;font-size:14px;font-weight:900;cursor:pointer;font-family:Nunito,sans-serif;letter-spacing:0.2px;">🗑 Borrar datos del cierre</button>

      <!-- ═══════════════════════════════════════════════════════════════
           🎯 OBJETIVO MENSUAL DE GANANCIA — sección aparte, no interfiere
           con el resto del cierre. Combina 2 fuentes en tiempo real:
             A) Ganancia potencial en el inventario que aún no se vende
             B) Ganancia ya realizada de lo que sí se vendió este mes
      ═══════════════════════════════════════════════════════════════ -->
      <div class="cd-panel" style="border:2px solid #7c3aed;margin-top:4px;">
        <div class="cd-panel-header" style="background:linear-gradient(135deg,#6d28d9,#7c3aed);">
          <div class="cd-panel-icon" style="background:rgba(255,255,255,.2);color:#fff;">🎯</div>
          <div class="cd-panel-title" style="color:#fff;">Objetivo Mensual de Ganancia</div>
          <div class="cd-panel-toggle" style="color:#fff;opacity:.8;">⌄</div>
        </div>
        <div class="cd-panel-body">
          <div style="font-size:11px;color:var(--text-muted);font-weight:700;margin-bottom:12px;line-height:1.5;">
            💡 Se suman dos fuentes en tiempo real: la ganancia que ya está "guardada" dentro del inventario
            (aunque no se haya vendido) y la ganancia que ya se hizo efectivo con las ventas de este mes.
          </div>

          <div class="cd-field" style="margin-bottom:14px;">
            <label>🎯 Meta de ganancia total del mes ($)</label>
            <input class="cd-inp big" type="number" id="cdObjetivoMeta" min="0" step="1" placeholder="1200.00" value="${objetivoMeta || ''}" onchange="_cdGuardarObjetivoMeta()">
          </div>

          <!-- A) Ganancia en inventario (potencial, tiempo real) -->
          <div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:12px;padding:12px 14px;margin-bottom:10px;">
            <div style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:900;color:#1e40af;text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px;">
              📦 A) Ganancia en Inventario <span style="font-weight:700;text-transform:none;opacity:.75;">(aún sin vender)</span>
            </div>
            <div style="font-size:22px;font-weight:900;color:#1e40af;">$${gananciaInventarioAhora.toFixed(2)}</div>
            <div style="font-size:10px;color:#3b82f6;font-weight:700;margin-top:3px;">
              Suma de (precio venta − precio compra) × stock actual, de todos tus productos.
              Se actualiza solo con cada "Registrar Entrada de Inventario".
            </div>
          </div>

          <!-- B) Ganancia ya realizada en efectivo (ventas del mes) -->
          <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:12px 14px;margin-bottom:10px;">
            <div style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:900;color:#15803d;text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px;">
              💵 B) Ganancia Ya Realizada <span style="font-weight:700;text-transform:none;opacity:.75;">(ventas de este mes)</span>
            </div>
            <div style="font-size:22px;font-weight:900;color:#15803d;">$${gananciaEfectivoMes.toFixed(2)}</div>
            <div style="font-size:10px;color:#16a34a;font-weight:700;margin-top:3px;">
              Ingresos reales del mes ($${ingresoRealMes.toFixed(2)}) menos el costo real de lo vendido ($${cogsDelMes.toFixed(2)}).
              Cuando vendes algo, su ganancia se traslada de A) hacia acá — nunca se cuenta dos veces.
            </div>
          </div>

          <!-- Barra de progreso -->
          <div style="margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;font-size:10.5px;font-weight:800;color:var(--text-muted);margin-bottom:4px;">
              <span>Progreso hacia la meta</span><span>${progresoPct.toFixed(0)}%</span>
            </div>
            <div style="background:#ede9fe;border-radius:99px;height:14px;overflow:hidden;">
              <div style="height:100%;width:${Math.min(100, progresoPct)}%;background:linear-gradient(90deg,#7c3aed,${metaCumplida ? '#16a34a' : '#a78bfa'});border-radius:99px;transition:width .3s;"></div>
            </div>
          </div>

          <!-- Total general -->
          <div style="background:${metaCumplida ? '#f0fdf4' : '#fef2f2'};border:1.5px solid ${metaCumplida ? '#86efac' : '#fca5a5'};border-radius:12px;padding:14px 16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;padding-bottom:8px;border-bottom:1px dashed ${metaCumplida ? '#bbf7d0' : '#fecaca'};">
              <span style="font-size:11px;font-weight:800;color:#1e40af;">📦 Ganancia en inventario</span>
              <span style="font-size:13px;font-weight:900;color:#1e40af;">$${gananciaInventarioAhora.toFixed(2)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:8px;border-bottom:1px dashed ${metaCumplida ? '#bbf7d0' : '#fecaca'};">
              <span style="font-size:11px;font-weight:800;color:#15803d;">💵 Ganancia ya en efectivo</span>
              <span style="font-size:13px;font-weight:900;color:#15803d;">$${gananciaEfectivoMes.toFixed(2)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <span style="font-size:12px;font-weight:900;color:var(--text-muted);">💰 TOTAL GENERAL DE GANANCIA</span>
              <span style="font-size:19px;font-weight:900;color:${metaCumplida ? '#15803d' : '#b45309'};">$${gananciaGeneralMes.toFixed(2)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <span style="font-size:12px;font-weight:800;color:var(--text-muted);">🎯 Meta mínima a alcanzar</span>
              <span style="font-size:14px;font-weight:900;color:#7c3aed;">$${objetivoMeta.toFixed(2)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid ${metaCumplida ? '#bbf7d0' : '#fecaca'};padding-top:8px;">
              <span style="font-size:12px;font-weight:900;color:${metaCumplida ? '#15803d' : '#dc2626'};">
                ${metaCumplida ? '✅ ¡Meta cumplida o superada!' : '📉 Aún falta para la meta'}
              </span>
              <span style="font-size:14px;font-weight:900;color:${metaCumplida ? '#15803d' : '#dc2626'};">
                ${metaCumplida ? '+$'+(gananciaGeneralMes - objetivoMeta).toFixed(2)+' extra' : '-$'+faltaParaMeta.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════════════════
           🏪 LO QUE TENGO EN MI TIENDA — patrimonio total en tiempo real
           Efectivo inicial + lo ya vendido (neto de gastos) + inventario
           actual a valor de costo. Se actualiza solo con cada venta y
           cada entrada de inventario, sin ningún paso manual extra.
      ═══════════════════════════════════════════════════════════════ -->
      <div class="cd-panel" style="border:2px solid #0891b2;margin-top:4px;">
        <div class="cd-panel-header" style="background:linear-gradient(135deg,#0e7490,#0891b2);">
          <div class="cd-panel-icon" style="background:rgba(255,255,255,.2);color:#fff;">🏪</div>
          <div class="cd-panel-title" style="color:#fff;">Lo Que Tengo en Mi Tienda</div>
          <div class="cd-panel-toggle" style="color:#fff;opacity:.8;">⌄</div>
        </div>
        <div class="cd-panel-body">
          <div style="font-size:11px;color:var(--text-muted);font-weight:700;margin-bottom:12px;line-height:1.5;">
            💡 Suma todo lo que tienes ahora mismo entre dinero e inventario. Se actualiza en tiempo real:
            cada venta mueve dinero a esta cuenta y baja el inventario; cada entrada de inventario nueva lo sube.
            El "Pago de Factura" (mercancía) se descuenta del total principal; el "Gasto Mensual" (luz, agua, etc.)
            se muestra aparte y solo se resta en el segundo total.
          </div>

          <div style="background:#ecfeff;border:1.5px solid #a5f3fc;border-radius:12px;padding:14px 16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:8px;border-bottom:1px dashed #a5f3fc;">
              <span style="font-size:11.5px;font-weight:800;color:#0e7490;">💵 Efectivo inicial del mes</span>
              <span style="font-size:13px;font-weight:900;color:#0e7490;">$${efectivoInicialReal.toFixed(2)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
              <span style="font-size:11.5px;font-weight:800;color:#0e7490;">📈 Ventas cobradas este mes</span>
              <span style="font-size:13px;font-weight:900;color:#15803d;">+$${ingresoRealMes.toFixed(2)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:8px;border-bottom:1px dashed #a5f3fc;">
              <span style="font-size:11.5px;font-weight:800;color:#0e7490;">🧾 Pago de Factura este mes</span>
              <span style="font-size:13px;font-weight:900;color:#dc2626;">-$${totalFacturasReal.toFixed(2)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:8px;border-bottom:1px dashed #a5f3fc;">
              <span style="font-size:11.5px;font-weight:800;color:#0e7490;">📦 Inventario actual (a precio de venta)</span>
              <span style="font-size:13px;font-weight:900;color:#0e7490;">+$${valorInventarioActual.toFixed(2)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:13px;font-weight:900;color:#0e7490;">🏪 TOTAL EN MI TIENDA AHORA</span>
              <span style="font-size:21px;font-weight:900;color:#0e7490;">$${patrimonioTotal.toFixed(2)}</span>
            </div>
          </div>

          <!-- Gasto Mensual: aparte, solo se resta en el segundo total -->
          <div style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:12px;padding:14px 16px;margin-top:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:8px;border-bottom:1px dashed #fed7aa;">
              <span style="font-size:11.5px;font-weight:800;color:#9a3412;">💸 Gasto Mensual este mes</span>
              <span style="font-size:13px;font-weight:900;color:#dc2626;">-$${totalGastoMensualReal.toFixed(2)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:13px;font-weight:900;color:#9a3412;">🏪 TOTAL EN MI TIENDA AHORA − Gasto Mensual</span>
              <span style="font-size:21px;font-weight:900;color:#9a3412;">$${patrimonioTotalMenosGastoMensual.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  `;
  _cdRenderListas();
  // Restaurar saldo y ayer INMEDIATAMENTE (sin setTimeout) antes que _cdAutoRecalcSaldo
  if(_cdSaldoCajaPersist){
    _CD_DENOMS.forEach(d=>{const el=document.getElementById('cdSaldo'+d.id);if(el)el.value=_cdSaldoCajaPersist.montos?.[d.id]||0;});
    const alqEl=document.getElementById('cdAlquiler');if(alqEl)alqEl.value=_cdSaldoCajaPersist.alquiler||0;
  }
  if(_cdCajaAyerPersist){
    _CD_DENOMS.forEach(d=>{const el=document.getElementById('cdAyer'+d.id);if(el)el.value=_cdCajaAyerPersist.montos?.[d.id]||0;});
    const alqAEl=document.getElementById('cdAyerAlquiler');if(alqAEl&&_cdCajaAyerPersist.alquiler!=null)alqAEl.value=_cdCajaAyerPersist.alquiler;
  }
  _cdRestoring = true; // bloquear guardado durante restauración
  _cdAutoRecalcSaldo();_cdRestaurarEstadoAutomatico();
  // ── Build global modal overlay ──────────────────────────────────────
  setTimeout(()=>{
    // Current panel body being shown in modal
    let _cdActiveBody = null;
    let _cdActiveBodyParent = null;

    // Create single overlay if not exists
    let overlay = document.getElementById('cdModalOverlay');
    if(!overlay){
      overlay = document.createElement('div');
      overlay.id = 'cdModalOverlay';
      overlay.className = 'cd-modal-overlay';
      overlay.innerHTML = '<div class="cd-modal-sheet" id="cdModalSheet">' +
        '<span class="cd-modal-handle"></span>' +
        '<div class="cd-modal-header">' +
          '<div class="cd-modal-icon" id="cdModalIcon"></div>' +
          '<div class="cd-modal-title" id="cdModalTitle"></div>' +
          '<button class="cd-modal-close" onclick="_cdCerrarModal()">✕</button>' +
        '</div>' +
        '<div class="cd-modal-body" id="cdModalBody"></div>' +
        '<div class="cd-modal-actions" id="cdModalActions"></div>' +
      '</div>';
      document.body.appendChild(overlay);
      overlay.addEventListener('click',(e)=>{ if(e.target===overlay) _cdCerrarModal(); });
    }

    // Patch _cdCerrarModal to also restore body node
    const _origCerrar = window._cdCerrarModal;
    window._cdCerrarModal = function(){
      if(_cdActiveBody && _cdActiveBodyParent){
        _cdActiveBody.style.display = 'none';
        _cdActiveBodyParent.appendChild(_cdActiveBody);
        _cdActiveBody = null;
        _cdActiveBodyParent = null;
      }
      const ov = document.getElementById('cdModalOverlay');
      if(ov) ov.classList.remove('active');
      document.body.style.overflow = '';
    };

    // Wire each panel card as a modal trigger
    document.querySelectorAll('.cd-panel').forEach((panel)=>{
      const header  = panel.querySelector('.cd-panel-header');
      const body    = panel.querySelector('.cd-panel-body');
      const icon    = panel.querySelector('.cd-panel-icon');
      const title   = panel.querySelector('.cd-panel-title');
      const actBtns = panel.querySelectorAll('.cd-btn-update');

      if(header && !header.dataset.acc){
        header.dataset.acc='1';
        header.addEventListener('click',(e)=>{
          if(e.target.closest('button,input,select,a')) return;
          if(!body) return;

          const iconEl  = document.getElementById('cdModalIcon');
          const titleEl = document.getElementById('cdModalTitle');
          const bodyEl  = document.getElementById('cdModalBody');
          const actEl   = document.getElementById('cdModalActions');

          // Restore previous body if another panel was open
          if(_cdActiveBody && _cdActiveBodyParent){
            _cdActiveBody.style.display = 'none';
            _cdActiveBodyParent.appendChild(_cdActiveBody);
          }

          // Set header info
          if(iconEl){ iconEl.innerHTML = icon ? icon.innerHTML : ''; iconEl.style.cssText = icon ? icon.style.cssText : ''; }
          if(titleEl) titleEl.innerHTML = title ? title.innerHTML : '';

          // MOVE real body node into modal (keeps all IDs, event listeners, oninput attrs)
          body.style.display = 'block';
          bodyEl.innerHTML = '';
          bodyEl.appendChild(body);
          _cdActiveBody = body;
          _cdActiveBodyParent = panel;

          // Build action buttons in footer
          if(actEl){
            actEl.innerHTML = '';
            actBtns.forEach(btn=>{
              const clone = btn.cloneNode(true);
              clone.style.cssText = btn.style.cssText + ';flex:1;min-width:120px;';
              actEl.appendChild(clone);
            });
          }

          overlay.classList.add('active');
          document.body.style.overflow = 'hidden';
        });
      }
    });
  },50);

  // Restaurar "Queda en Efectivo" persistido si existe
  if(quedaPersistida){
    setTimeout(()=>{
      _CD_DENOMS.forEach(d=>_cdSet('cdQueda'+d.id,quedaPersistida[d.id]||0));
      _cdActualizarStats();
    },50);
  }
  // Saldo y Ayer se restauran via _cdRestaurarEstadoAutomatico desde globals persist
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
  _cdVentaSnapshot={total:ventaTotal,alqHoy,montos:{...V},ts:Date.now()};
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
  // Guardar venta en Supabase + localStorage
  const ventaData={fecha:_cdFecha,total:ventaTotal,alquiler:alqHoy,montos:{...V},ts:Date.now()};
  _cdSbSave('ventaDia_'+_cdFecha, ventaData);
  try{localStorage.setItem('vpos_cd_ventaDia_'+_cdFecha, JSON.stringify({valor:ventaData,ts:ventaData.ts}));}catch(e){}
  // Limpiar campos venta
  _cdSet('cdVentaTotal',0,true);_cdSet('cdVentaAlquilerHoy',0,true);
  _CD_DENOMS.forEach(d=>_cdSet('cdVenta'+d.id,0,true));
  if(typeof toast==='function')toast(`✓ Venta $${ventaTotal.toFixed(2)} sumada al saldo. Alquiler $${alqHoy.toFixed(2)} apartado.`);
  _cdActualizarStats();
  // Guardar saldo actualizado + broadcast inmediato
  _cdGuardarSaldoCajaExplicit();
  // Broadcast independiente para el otro teléfono
  _cdSaveVentaSnapshot(); // persistir snapshot (reutiliza la función centralizada)
  if(typeof _broadcast==='function') _broadcast('cierre_venta',{
    fecha:_cdFecha,
    ventaSnapshot:_cdVentaSnapshot,
    saldo:_cdSaldoCajaPersist,
    ts:ventaData.ts
  });
}

// ══ Saldo de ayer ════════════════════════════════════════════════════════
async function _cdCargarSaldoAyerEnCaja(){
  const sAyer=await _cdCargarSaldoAyer();
  if(!sAyer){if(typeof toast==='function')toast('No hay saldo guardado de ayer',true);return;}
  _CD_DENOMS.forEach(d=>_cdSet('cdSaldo'+d.id,sAyer[d.id]||0));
  if(typeof toast==='function')toast('✓ Saldo de ayer cargado como saldo inicial de hoy');
  _cdActualizarStats();
}

// Cargar venta del día anterior → Supabase primero
async function _cdCargarVentaAyer(){
  const ayerIso=new Date(new Date(_cdFecha).getTime()-86400000).toISOString().split('T')[0];
  return await _cdSbLoad('ventaDia_'+ayerIso);
}

async function _cdGuardarSaldoHoyYCapturar(){
  const Q=_cdLeerMontos('cdQueda');
  await _cdGuardarSaldoHoy(Q);
  _idbGuardarQueda(Q);
  if(typeof toast==='function')toast('✓ Saldo de hoy guardado');
}

function _cdGuardarQuedaManual(){
  const Q=_cdLeerMontos('cdQueda');
  _idbGuardarQueda(Q);
  _cdGuardarSaldoHoy(Q);
  if(typeof toast==='function')toast('✓ "Queda en Efectivo" guardado permanentemente');
  _cdActualizarStats();
}

// ══ RECÁLCULO EN TIEMPO REAL ══════════════════════════════════════════════
function _cdAutoRecalcSaldo(){
  const ventaTotal=_cdV('cdVentaTotal');
  const ayerTotal=_cdTotalM(_cdLeerMontos('cdAyer'));
  if(ventaTotal<=0 && ayerTotal<=0) return;

  const alqHoy=_cdV('cdVentaAlquilerHoy');
  _CD_DENOMS.forEach(d=>{
    let v=_cdV('cdVenta'+d.id);
    const a=_cdV('cdAyer'+d.id);
    if(d.id==='Billetes') v=Math.max(0,v-alqHoy);
    _cdSet('cdSaldo'+d.id, v+a);
  });
  // Restar gastos registrados
  _cdGastos.forEach(g=>{
    _CD_DENOMS.forEach(d=>{
      _cdSet('cdSaldo'+d.id, Math.max(0,_cdV('cdSaldo'+d.id)-(g.montos[d.id]||0)));
    });
  });
  // NOTE: pending cambios are NOT applied here — they are previewed only
  // in the UI text. They get applied once via _cdAplicarCambios().
  _cdActualizarStats();
}

// ══ CALCULAR EN CADENA ═══════════════════════════════════════════════════
// Cada botón recalcula desde cero hasta su etapa:
//   venta   → Saldo = Venta + Ayer
//   gastos  → Saldo = Venta + Ayer − Gastos (por denominación)
//   cambios → Aplica redistribución SOBRE el saldo actual en caja (no recalcula desde venta/ayer/gastos)
//   saldo   → recalculo completo incluyendo cambios pendientes
function _cdCalcular(etapa){

  // ── Cambios: opera SOLO sobre el saldo actual en caja ─────────────────
  // No depende de venta del día, venta de ayer ni gastos. Usa los valores
  // actuales de cdSaldo* como base y redistribuye denominaciones.
  if(etapa==='cambios'){
    const movs=_cdCalcularCambiosPendientes();
    if(!movs.length){
      if(typeof toast==='function')toast('No hay cambios ingresados',true);
      return;
    }
    movs.forEach(m=>{
      _cdSet('cdSaldo'+m.deId,
        Math.max(0,_cdV('cdSaldo'+m.deId)-m.monto));
      _cdSet('cdSaldo'+m.haciaId,
        _cdV('cdSaldo'+m.haciaId)+m.monto);
      // Guardar historial para captura
      _cdCambiosAplicados.push({
        ...m,
        hora:new Date().toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'})
      });
    });
    _cdSaveCambios(); // guardar independiente
    // Limpiar inputs de cambios tras aplicar
    _CD_DENOMS.forEach(d=>{ _cdSet('cdCambioSale'+d.id,0,true); });
    const t=_cdTotalM(_cdLeerMontos('cdSaldo'));
    if(typeof toast==='function'){
      toast(`✓ Cambios aplicados — Caja: $${t.toFixed(2)}`);
    }
    _cdActualizarStats();
    _cdGuardarEstadoAutomatico(); // guardar estado completo incluyendo saldo
    return;
  }

  // ── Resto de etapas: recalculan desde venta + ayer ────────────────────

  // Paso 1: Saldo = Venta por denominación + Ayer por denominación − Alquiler de hoy (sale de billetes)
  const alqHoy=_cdV('cdVentaAlquilerHoy');
  _CD_DENOMS.forEach(d=>{
    let v=_cdV('cdVenta'+d.id);
    const a=_cdV('cdAyer'+d.id);
    if(d.id==='Billetes') v=Math.max(0, v-alqHoy);
    _cdSet('cdSaldo'+d.id, v+a);
  });

  if(etapa==='venta'){
    if(alqHoy>0){_cdSet('cdAlquiler', _cdV('cdAlquiler')+alqHoy);}
    // ── Congelar datos de venta en la imagen del día ──────────────────────
    // Guardamos un snapshot para que la captura refleje exactamente lo
    // calculado, independientemente de cambios posteriores en el formulario.
    const _snapVTotal = _cdV('cdVentaTotal');
    const _snapMontos = _cdLeerMontos('cdVenta');
    _cdVentaSnapshot = {total:_snapVTotal, alqHoy:alqHoy, montos:{..._snapMontos}, ts:Date.now()};
    _cdSaveVentaSnapshot(); // persistir inmediatamente
    const t=_cdTotalM(_cdLeerMontos('cdSaldo'));
    const msg=alqHoy>0
      ? `✓ Saldo = Venta + Ayer − Alquiler $${alqHoy.toFixed(2)} = $${t.toFixed(2)}`
      : `✓ Saldo calculado: Venta + Ayer = $${t.toFixed(2)}`;
    if(typeof toast==='function')toast(msg);
    _cdActualizarStats();
    return;
  }

  // Paso 2: Restar Gastos por denominación
  _cdGastos.forEach(g=>{
    _CD_DENOMS.forEach(d=>{
      _cdSet('cdSaldo'+d.id, Math.max(0,_cdV('cdSaldo'+d.id)-(g.montos[d.id]||0)));
    });
  });

  if(etapa==='gastos'){
    const t=_cdTotalM(_cdLeerMontos('cdSaldo'));
    if(typeof toast==='function')toast(`✓ Saldo tras gastos = $${t.toFixed(2)}`);
    _cdActualizarStats();
    return;
  }

  // saldo (botón en Saldo en Caja): recalculo completo incluyendo cambios pendientes
  const movs=_cdCalcularCambiosPendientes();
  movs.forEach(m=>{
    _cdSet('cdSaldo'+m.deId,   Math.max(0,_cdV('cdSaldo'+m.deId)-m.monto));
    _cdSet('cdSaldo'+m.haciaId, _cdV('cdSaldo'+m.haciaId)+m.monto);
  });

  const total=_cdTotalM(_cdLeerMontos('cdSaldo'));
  if(typeof toast==='function')toast(`💰 Efectivo físico en caja: $${total.toFixed(2)}`);
  _cdActualizarStats();
  _cdCerrarModal();
}

// Helper: cerrar modal popup (el override real se aplica en el setTimeout del render)
function _cdCerrarModal(){
  const ov = document.getElementById('cdModalOverlay');
  if(ov) ov.classList.remove('active');
  document.body.style.overflow = '';
}

function _cdGuardarAyer(){
  const A=_cdLeerMontos('cdSaldo');
  const totalAyer=_cdTotalM(A);
  const alqAcum=_cdV('cdAlquiler');
  _CD_DENOMS.forEach(d=>{ _cdSet('cdAyer'+d.id, A[d.id]||0); });
  _cdSet('cdAyerAlquiler', alqAcum);
  _cdCajaAyerPersist={montos:A,alquiler:alqAcum,fecha:_cdFecha,ts:Date.now()};
  try{
    localStorage.setItem('vpos_cajaAyer', JSON.stringify(_cdCajaAyerPersist));
    localStorage.setItem('vpos_cd_cajaAyer_'+_cdFecha, JSON.stringify({valor:_cdCajaAyerPersist,ts:_cdCajaAyerPersist.ts}));
  }catch(e){}
  _cdSaldoAyerCache = {...A};
  // Supabase + realtime
  _cdSbSave('cajaAyer_'+_cdFecha, _cdCajaAyerPersist).catch(()=>{});
  if(typeof _broadcast==='function') _broadcast('cierre_cajaayer',{fecha:_cdFecha,datos:_cdCajaAyerPersist});
  if(typeof toast==='function'){ toast(`💾 Caja del día guardada correctamente — $${totalAyer.toFixed(2)}`); }
  _cdCerrarModal();
  _cdActualizarStats();
}

function _cdBorrarDatosCierre(){
  if(!confirm('¿Borrar gastos, cambios y venta del día?\n(Caja de Ayer y Saldo en Caja NO se borran)')) return;
  _cdGastos=[];
  _cdDeudas=[];
  _cdCambiosAplicados=[];
  _cdVentaSnapshot=null;
  ['cdVentaTotal','cdVentaAlquilerHoy'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  _CD_DENOMS.forEach(d=>{
    _cdSet('cdVenta'+d.id,0,true);
    _cdSet('cdGastoForm'+d.id,0,true);
    _cdSet('cdCambioSale'+d.id,0,true);
  });
  const ts = Date.now();
  localStorage.removeItem('vpos_cierre_estado');
  localStorage.removeItem('vpos_cd_estadoDia_'+_cdFecha);
  localStorage.removeItem('vpos_cd_gastosDia_'+_cdFecha);
  localStorage.removeItem('vpos_cd_cambiosDia_'+_cdFecha);
  localStorage.removeItem('vpos_cd_ventaSnap_'+_cdFecha);
  const vacio={fecha:_cdFecha,ventaTotal:0,ventaAlquiler:0,alquiler:0,ayerAlquiler:0,
    venta:{},ventaSnapshot:null,gastos:[],cambios:[],borrado:true,ts};
  _cdSbSave('estadoDia_'+_cdFecha, vacio).catch(()=>{});
  _cdSbSave('gastosDia_'+_cdFecha, {gastos:[],fecha:_cdFecha,ts}).catch(()=>{});
  _cdSbSave('cambiosDia_'+_cdFecha, {cambios:[],fecha:_cdFecha,ts}).catch(()=>{});
  _cdSbSave('ventaSnap_'+_cdFecha, {ventaSnapshot:null,fecha:_cdFecha,ts,borrado:true}).catch(()=>{});
  if(typeof _broadcast==='function') _broadcast('cierre_borrado',{fecha:_cdFecha});
  _cdRenderListas();
  _cdActualizarStats();
  if(typeof toast==='function'){ toast('🗑 Gastos y cambios del día borrados'); }
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

  // Aplicar cambios directamente sobre el saldo actual (sin undo previo,
  // porque _cdAutoRecalcSaldo NO aplica cambios pendientes en preview)
  movs.forEach(m=>{
    _cdSet('cdSaldo'+m.deId,   Math.max(0,_cdV('cdSaldo'+m.deId)-m.monto));
    _cdSet('cdSaldo'+m.haciaId, _cdV('cdSaldo'+m.haciaId)+m.monto);
    _cdSet('cdQueda'+m.deId,   Math.max(0,_cdV('cdQueda'+m.deId)-m.monto));
    _cdSet('cdQueda'+m.haciaId, _cdV('cdQueda'+m.haciaId)+m.monto);
    _cdCambiosAplicados.push({...m,hora:new Date().toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'})});
  });
  _cdSaveCambios(); // guardar independiente del estado general

  // Clear pending inputs
  _CD_DENOMS.forEach(d=>{
    _cdSet('cdCambioSale'+d.id,0,true);
    const sel=document.getElementById('cdCambioHacia'+d.id);
    if(sel) sel.value='';
  });

  if(typeof toast==='function')toast('✓ Cambios aplicados al saldo');
  _cdActualizarStats();
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
  _cdSaveGastos(); // guardar independiente del estado general
  // Registrar en mensual
  _cdMesData.gastos.push({id:g.id,fecha:_cdFecha,desc,total,tipoInv:!!inventario,costoInv:inventario?.costo||0,gananciaInv:inventario?.ganancia||0});
  _cdGuardarMes();
  document.getElementById('cdGastoDesc').value='';
  _CD_DENOMS.forEach(d=>_cdSet('cdGastoForm'+d.id,0,true));
  if(document.getElementById('cdGastoInvCosto')) document.getElementById('cdGastoInvCosto').value='';
  if(document.getElementById('cdGastoInvVenta')) document.getElementById('cdGastoInvVenta').value='';
  if(document.getElementById('cdGastoEsInventario'))document.getElementById('cdGastoEsInventario').checked=false;
  _cdToggleInvFields();
  _cdRenderListas();
  _cdActualizarStats();
  if(typeof toast==='function')toast(`✓ Pago registrado y descontado del saldo`);
}
function _cdEliminarGasto(id){
  const g=_cdGastos.find(x=>x.id===id);
  if(g)_CD_DENOMS.forEach(d=>{if(g.montos[d.id]>0)_cdSet('cdSaldo'+d.id,_cdV('cdSaldo'+d.id)+g.montos[d.id]);});
  _cdGastos=_cdGastos.filter(x=>x.id!==id);
  _cdSaveGastos();
  _cdMesData.gastos=_cdMesData.gastos.filter(x=>x.id!==id);
  _cdGuardarMes();_cdRenderListas();_cdActualizarStats();
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
function _cdEliminarVentaMes(id){
  _cdMesData.ventas=_cdMesData.ventas.filter(v=>v.id!==id);
  _cdGuardarMes();
  _cdActualizarStats();
  // Re-render solo la tabla de ventas del mes (sin re-renderizar todo)
  const tbl=document.querySelector('#cdMesTablaVentas tbody');
  if(tbl){
    const totalV=_cdMesData.ventas.reduce((s,v)=>s+v.total,0);
    const totalAlq=_cdMesData.ventas.reduce((s,v)=>s+(v.alquiler||0),0);
    tbl.innerHTML=_cdMesData.ventas.length?_cdMesData.ventas.slice().reverse().map(v=>`<tr><td>${_cdFmtFecha(v.fecha)}</td><td style="color:#15803d;font-weight:900;">$${v.total.toFixed(2)}</td><td style="color:#b45309;">$${(v.alquiler||0).toFixed(2)}</td><td style="color:#0369a1;font-weight:900;">$${(v.total-(v.alquiler||0)).toFixed(2)}</td><td><button style="background:none;border:none;cursor:pointer;color:#dc2626;font-size:14px;padding:2px 6px;" onclick="_cdEliminarVentaMes('${v.id}')">✕</button></td></tr>`).join(''):'<tr><td colspan="5" style="text-align:center;color:#94a3b8;">Sin ventas registradas</td></tr>';
    const tfoot=document.querySelector('#cdMesTablaVentas tfoot tr');
    if(tfoot){if(tfoot.cells[1])tfoot.cells[1].textContent='$'+totalV.toFixed(2);if(tfoot.cells[2])tfoot.cells[2].textContent='$'+totalAlq.toFixed(2);if(tfoot.cells[3])tfoot.cells[3].textContent='$'+(totalV-totalAlq).toFixed(2);}
  }
}
function _cdEliminarGastoMes(id){
  _cdMesData.gastos=_cdMesData.gastos.filter(g=>g.id!==id);
  _cdGuardarMes();
  _cdActualizarStats();
  // Re-render solo la tabla de gastos del mes
  const tbl=document.querySelector('#cdMesTablaGastos tbody');
  if(tbl){
    const totalG=_cdMesData.gastos.reduce((s,g)=>s+g.total,0);
    tbl.innerHTML=_cdMesData.gastos.length?_cdMesData.gastos.slice().reverse().map(g=>`<tr><td>${_cdFmtFecha(g.fecha)}</td><td>${g.desc}</td><td style="color:#dc2626;font-weight:900;">$${g.total.toFixed(2)}</td><td style="color:#15803d;">${g.tipoInv?`Costo: $${g.costoInv.toFixed(2)} → Venta: $${(g.costoInv+g.gananciaInv).toFixed(2)} (+$${g.gananciaInv.toFixed(2)})`:'-'}</td><td><button style="background:none;border:none;cursor:pointer;color:#dc2626;font-size:14px;padding:2px 6px;" onclick="_cdEliminarGastoMes('${g.id}')">✕</button></td></tr>`).join(''):'<tr><td colspan="5" style="text-align:center;color:#94a3b8;">Sin gastos registrados</td></tr>';
    const tfoot=document.querySelector('#cdMesTablaGastos tfoot tr');
    if(tfoot){tfoot.cells[2].textContent='$'+totalG.toFixed(2);}
  }
}
function _cdGuardarSaldoInicio(){_cdMesData.saldoInicio=_cdV('cdMesSaldoInicio');_cdGuardarMes();}
function _cdGuardarInventarioInicial(){_cdMesData.inventarioInicial=_cdV('cdMesInvInicial');_cdGuardarMes();}

// ── Objetivo Mensual de Ganancia (sección aparte) ──
// Reutiliza el mismo _cdMesData / _cdGuardarMes que ya sincroniza
// automáticamente entre dispositivos (Supabase + localStorage + IDB),
// así que no requiere ninguna tabla ni lógica de sync nueva.
function _cdGuardarObjetivoMeta(){
  const val = _cdV('cdObjetivoMeta');
  _cdMesData.objetivoGananciaNeta = val > 0 ? val : 1200;
  _cdGuardarMes();
  if(typeof toast==='function') toast('✓ Meta de ganancia guardada: $' + _cdMesData.objetivoGananciaNeta.toFixed(2));
  renderCierreDia();
}

// ══ Stats ════════════════════════════════════════════════════════════════
function _cdActualizarStats(){
  _cdGuardarEstadoAutomatico();

  const ventaActual=_cdV('cdVentaTotal');
  const alqHoyActual=_cdV('cdVentaAlquilerHoy');
  const S=_cdLeerMontos('cdSaldo'),Q=_cdLeerMontos('cdQueda');
  const A=_cdLeerMontos('cdAyer');
  const alquilerAcum=_cdV('cdAlquiler');
  const totalGastos=_cdSumArr(_cdGastos);
  const totalDeudas=_cdDeudas.reduce((s,x)=>s+Number(x.monto||0),0);
  const totalSaldo=_cdTotalM(S);
  const totalQueda=_cdTotalM(Q);
  const totalAyer=_cdTotalM(A);
  const movsPendientes=_cdCalcularCambiosPendientes();
  const $=_cdFmt;
  _cdTxt('cdAyerTotal',$(totalAyer));

  if(alqHoyActual>0){const m=document.getElementById('cdVentaAlqMsg');if(m){m.style.display='block';m.textContent=`🏘 $${alqHoyActual.toFixed(2)} saldrán de billetes al alquiler. A caja entrarán: $${Math.max(0,ventaActual-alqHoyActual).toFixed(2)}`;}}
  else{const m=document.getElementById('cdVentaAlqMsg');if(m)m.style.display='none';}

  const totalCambiosPendientes=_CD_DENOMS.reduce((s,d)=>s+_cdV('cdCambioSale'+d.id),0);
  const totalCambiosAplicados=_cdCambiosAplicados.reduce((s,m)=>s+(m.monto||0),0);
  const totalCambiosCaptura=totalCambiosAplicados+totalCambiosPendientes;
  _cdTxt('capCambiosTotal',$(totalCambiosCaptura));
  _cdTxt('cdCambiosTotal',$(totalCambiosPendientes));
  _cdTxt('cdStatVenta',$(Math.max(0,(ventaActual||(_cdVentaSnapshot?.total||0))-alqHoyActual)));
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
  _cdTxt('capAlqHoy',$(capAlq));_cdTxt('capVentaTotalFinal',$(Math.max(0,capVT-capAlq)));
  // Fix 4: Add fecha to "Saldo en Caja" title in capture
  const capSaldoFechaEl = document.getElementById('capSaldoFecha');
  if(capSaldoFechaEl) capSaldoFechaEl.textContent = _cdFmtFecha(_cdFecha);
  const capAyerFechaTitleEl = document.getElementById('capAyerFechaTitle');
  if(capAyerFechaTitleEl){
    const ayerIsoTitle=new Date(new Date(_cdFecha).getTime()-86400000).toISOString().split('T')[0];
    capAyerFechaTitleEl.textContent = _cdFmtFecha(ayerIsoTitle);
  }

  _cdTxt('capSBilletes',$(S.Billetes));_cdTxt('capSMonedas',$(S.Monedas));_cdTxt('capSCoras',$(S.Coras));
  _cdTxt('capSC10',$(S.C10));_cdTxt('capSC05',$(S.C05));_cdTxt('capSC01',$(S.C01));
  _cdTxt('capSaldoTotal',$(totalSaldo));

  // Saldo de ayer en captura (Punto 4 — con fecha)
  const ay=_cdSaldoAyerCache;
  if(ay){
    const ayerIso=new Date(new Date(_cdFecha).getTime()-86400000).toISOString().split('T')[0];
    _cdTxt('capAyerFechaLbl',_cdFmtFecha(ayerIso));
    _cdTxt('capAyerBilletes',$(ay.Billetes||0));
    _cdTxt('capAyerMonedas',$(ay.Monedas||0));
    _cdTxt('capAyerCoras',$(ay.Coras||0));
    _cdTxt('capAyerC10',$(ay.C10||0));
    _cdTxt('capAyerC05',$(ay.C05||0));
    _cdTxt('capAyerC01',$(ay.C01||0));
    _cdTxt('capAyerTotal',$(_cdTotalM(ay)));
    const ayWrap=document.getElementById('capAyerWrap');if(ayWrap)ayWrap.style.display='';
  } else {
    // Show ayer section even if empty, with message
    _cdTxt('capAyerFechaTitle', '');
    const noAyer = ['capAyerBilletes','capAyerMonedas','capAyerCoras','capAyerC10','capAyerC05','capAyerC01'];
    noAyer.forEach(id=>_cdTxt(id,'—'));
    _cdTxt('capAyerTotal','Sin datos');
    // Actualizar captura — Caja Día de Ayer desde campos cdAyer
  const A=_cdLeerMontos('cdAyer');
  const totalAyer=_cdTotalM(A);
  _CD_DENOMS.forEach(d=>{
    const v=A[d.id]||0;
    _cdTxt('capAyer'+d.id, v>0?$(v):'—');
  });
  _cdTxt('capAyerTotal', totalAyer>0 ? $(totalAyer) : 'Sin datos');
  }
  // Venta del día anterior (Fix 4+8 — permanente)
  const va=_cdVentaAyerCache;
  const vaRow=document.getElementById('capVentaAyerRow');
  if(va&&vaRow){vaRow.style.display='';_cdTxt('capVentaAyerVal',$(va.total));}
  else if(vaRow){vaRow.style.display='none';}

  const capGD=document.getElementById('capGastosDetalleList');
  if(capGD) capGD.innerHTML=_cdGastos.length
    ?_cdGastos.map(x=>{
        const denoms=_CD_DENOMS.filter(d=>(x.montos[d.id]||0)>0)
          .map(d=>{const lbl=d.id==='Billetes'?'Bill':d.id==='Monedas'?'Mnd':d.id==='Coras'?'Cor':d.id;return lbl+' $'+(x.montos[d.id]||0).toFixed(2);}).join(' · ');
        return '<div class="cd-cap-gastos-row" style="border-bottom:1px solid #bae6fd;padding:4px 0;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;">' +
            '<span class="cd-cap-gastos-desc" style="font-size:11px;font-weight:900;color:#1e3a5f;">📌 '+x.desc+'</span>' +
            '<span class="cd-cap-gastos-total" style="font-size:11px;font-weight:900;color:#dc2626;white-space:nowrap;margin-left:8px;">−$'+x.total.toFixed(2)+'</span>' +
          '</div>' +
          (denoms?'<div class="cd-cap-gastos-denoms" style="font-size:9px;color:#64748b;margin-top:2px;">'+denoms+'</div>':'') +
          '</div>';
      }).join('')
    :`<div class="cd-cap-row"><span>Sin gastos</span><span>—</span></div>`;
  _cdTxt('capGTotal',$(totalGastos));

  // Cambios en captura — todos los aplicados + pendientes
  const todosLosCambios=[..._cdCambiosAplicados,...movsPendientes.map(m=>({...m,pendiente:true}))];
  const capCL=document.getElementById('capCambiosList');
  if(capCL) capCL.innerHTML=todosLosCambios.length
    ?todosLosCambios.map(m=>`<div class="cd-cap-row"><span>${m.de}→${m.hacia}${m.pendiente?' (pendiente)':''}</span><span>$${m.monto.toFixed(2)}</span></div>`).join('')
    :`<div class="cd-cap-row"><span>Sin cambios</span><span>—</span></div>`;

  // Deudas en captura — mostrar bloque solo si hay pendientes
  const capD=document.getElementById('capDeudasList');
  const capDItems=document.getElementById('capDeudasItems');
  if(capD){
    if(_cdDeudas.length){
      capD.style.display='block';
      if(capDItems) capDItems.innerHTML=_cdDeudas.map(x=>`<div class="cd-cap-row"><span>${x.desc}</span><span class="val-purple">$${Number(x.monto||0).toFixed(2)}</span></div>`).join('');
      _cdTxt('capDTotal',$(totalDeudas));
    } else {
      capD.style.display='none';
    }
  }
  // Queda en Efectivo removed from capture (Fix 4)
  _cdTxt('capAlquilerFinal',$(alquilerAcum));
  const nw=document.getElementById('capNotaWrap');
  const nt=document.getElementById('cdNota')?.value?.trim()||'';
  if(nw){nw.style.display=nt?'block':'none';nw.textContent='📝 '+nt;}
  // Saldo se guarda SOLO desde acciones explícitas del usuario (no aquí)
}

// ══ Captura 1080x1920 ═════════════════════════════════════════════════════
async function _cdTomarCaptura(){
  const el=document.getElementById('cdResumenCaptura');if(!el)return;
  const btn=document.querySelector('.btn-cd-captura');
  if(btn){btn.disabled=true;btn.innerHTML='⏳ Generando…';}
  try{
    if(!window.html2canvas){await new Promise((r,j)=>{const sc=document.createElement('script');sc.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';sc.onload=r;sc.onerror=j;document.head.appendChild(sc);});}
    // 9:16 — 1080×1920 output (2× = 2160×3840)
    const OUT_W=1080, OUT_H=1920, SCALE=2;
    const PX_W=OUT_W*SCALE, PX_H=OUT_H*SCALE;
    document.body.classList.add('cd-print-mode');
    await new Promise(r=>setTimeout(r,180));
    // Capture element at exact print size (min-height:1920px set by CSS)
    const capH=Math.max(el.scrollHeight, OUT_H);
    const c=await window.html2canvas(el,{
      scale:SCALE,useCORS:true,backgroundColor:'#ffffff',
      width:OUT_W,height:capH,windowWidth:OUT_W,
      scrollX:0,scrollY:-window.scrollY,logging:false
    });
    document.body.classList.remove('cd-print-mode');
    // Output canvas: exactly 9:16
    const outCanvas=document.createElement('canvas');
    outCanvas.width=PX_W; outCanvas.height=PX_H;
    const ctx=outCanvas.getContext('2d');

    // Helpers para el path redondeado (reutilizado varias veces)
    const BORDER = 20;
    const RADIUS = 100;      // radio de esquinas
    const BW = BORDER;       // grosor del marco
    function roundedPath(x,y,w,h,r){
      ctx.beginPath();
      ctx.moveTo(x+r,y);
      ctx.lineTo(x+w-r,y);
      ctx.arcTo(x+w,y,x+w,y+r,r);
      ctx.lineTo(x+w,y+h-r);
      ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
      ctx.lineTo(x+r,y+h);
      ctx.arcTo(x,y+h,x,y+h-r,r);
      ctx.lineTo(x,y+r);
      ctx.arcTo(x,y,x+r,y,r);
      ctx.closePath();
    }

    // 1. Fondo azul en TODO el canvas (llena esquinas)
    ctx.fillStyle='#1e40af';
    ctx.fillRect(0,0,PX_W,PX_H);

    // 2. Clip al área interior redondeada (dentro del marco)
    ctx.save();
    roundedPath(BW,BW,PX_W-BW*2,PX_H-BW*2,RADIUS-BW/2);
    ctx.clip();

    // 3. Fondo blanco dentro del clip
    ctx.fillStyle='#ffffff';
    ctx.fillRect(BW,BW,PX_W-BW*2,PX_H-BW*2);

    // 4. Contenido centrado dentro del área interior
    const drawW=PX_W-BW*2;
    const drawH=Math.round(c.height*(drawW/c.width));
    const dy=BW+Math.max(0,Math.round((PX_H-BW*2-drawH)/2));
    ctx.drawImage(c,BW,dy,drawW,Math.min(drawH,PX_H-BW*2));

    ctx.restore();

    // 5. Borde exterior redondeado encima (para que sea nítido)
    roundedPath(BW/2,BW/2,PX_W-BW,PX_H-BW,RADIUS);
    ctx.strokeStyle='#1e40af';
    ctx.lineWidth=BW;
    ctx.stroke();

    const lnk=document.createElement('a');
    lnk.download=`Cierre_${_cdFecha}.png`;lnk.href=outCanvas.toDataURL('image/png');
    document.body.appendChild(lnk);lnk.click();document.body.removeChild(lnk);
    if(typeof toast==='function')toast('📸 Imagen 9:16 descargada ('+OUT_W+'×'+OUT_H+')');
  }catch(e){
    document.body.classList.remove('cd-print-mode');
    if(typeof toast==='function')toast('⚠ Error: '+e.message,true);
  }
  finally{if(btn){btn.disabled=false;btn.innerHTML='📸 Descargar imagen 9:16';}}
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
  const totalV  =_cdMesData.ventas.reduce((s,v)=>s+v.total,0);
  const totalAlq=_cdMesData.ventas.reduce((s,v)=>s+(v.alquiler||0),0);
  const totalACaja=totalV-totalAlq;
  const totalG  =_cdMesData.gastos.reduce((s,g)=>s+g.total,0);
  const totalInvG=_cdMesData.gastos.filter(g=>g.tipoInv).reduce((s,g)=>s+(g.gananciaInv||0),0);
  const sIni=_cdMesData.saldoInicio||0;
  const invIniPDF=_cdMesData.inventarioInicial||0;
  const cajaFinalPDF = sIni - totalG + totalACaja;

  const _pdfMesKey = mes; // 'YYYY-MM'
  const cogsPDF = (typeof historial !== 'undefined' ? historial : [])
    .filter(v => v.fechaISO && _fechaISOEnMes(v.fechaISO, _pdfMesKey))
    .reduce((total, venta) => {
      return total + (venta.items || []).reduce((s, it) => {
        if (it.costoItem !== undefined) return s + Number(it.costoItem || 0);
        const prod = (typeof productos !== 'undefined' ? productos : [])
          .find(x => String(x.id) === String(it.id));
        return s + (prod ? (Number(prod.compra) || 0) : 0) * Number(it.cant || 0);
      }, 0);
    }, 0);

  const invFinalPDF = Math.max(0, invIniPDF - cogsPDF + totalInvG);
  const saldoTeorico=cajaFinalPDF;

  // ══════════════════════════════════════════════════════════════════
  // DATOS ADICIONALES PARA EL ESTADO DE RESULTADOS PROFESIONAL
  // (misma lógica exacta que usan las secciones en pantalla, para que
  //  los números del PDF siempre coincidan con lo que ves en la app)
  // ══════════════════════════════════════════════════════════════════

  // Ingreso real del mes (para Utilidad Bruta / Objetivo / Patrimonio)
  const acumProductosMes = {}; // por producto: cant, totalVenta, totalCosto
  (typeof historial !== 'undefined' ? historial : []).forEach(v => {
    if (!v.fechaISO || !_fechaISOEnMes(v.fechaISO, _pdfMesKey)) return;
    (v.items || []).forEach(item => {
      const key = item.id ? String(item.id) : ('legacy:' + item.nom);
      const prod = item.id ? (productos || []).find(p => String(p.id) === String(item.id)) : null;
      const cat  = (prod && prod.cat) ? prod.cat : (item.cat || 'SIN CATEGORÍA');
      if (!acumProductosMes[key]) acumProductosMes[key] = { nom: item.nom||'—', cat, cant: 0, totalVenta: 0, totalCosto: 0 };
      const cant = Number(item.cant || 0);
      acumProductosMes[key].cant += cant;
      let totVenta;
      if (item.totalItem !== undefined) totVenta = Number(item.totalItem);
      else if (item.cantCobrada !== undefined) totVenta = Number(item.cantCobrada) * Number(item.precio || 0);
      else if (item.esPromo || item.paqueteLabel) totVenta = Number(item.precio || 0);
      else totVenta = cant * Number(item.precio || 0);
      acumProductosMes[key].totalVenta += totVenta;
      const costoUd = Number(item.costoUd || item.compra || 0);
      acumProductosMes[key].totalCosto += cant * costoUd;
    });
  });
  const ingresoRealMes = Object.values(acumProductosMes).reduce((s,v)=>s+v.totalVenta,0);
  const utilidadBruta  = ingresoRealMes - cogsPDF;

  // Gastos y Pagos reales (módulo aparte de Reportes → Gastos y Pagos)
  const _pagosMesPDF = (typeof pagos !== 'undefined' ? pagos : [])
    .filter(g => typeof esMesActual === 'function' ? esMesActual(g.fechaISO) : (g.fechaISO||'').startsWith(_pdfMesKey));
  const totalFacturasPDF     = _pagosMesPDF.filter(g=>g.cat==='FACTURA').reduce((s,g)=>s+Number(g.monto||0),0);
  const totalGastoMensualPDF = _pagosMesPDF.filter(g=>g.cat==='GASTO').reduce((s,g)=>s+Number(g.monto||0),0);
  const totalGastosOperativos = totalFacturasPDF + totalGastoMensualPDF;
  const utilidadNetaMes = utilidadBruta - totalGastosOperativos;

  // Objetivo Mensual de Ganancia (misma fórmula que la sección en pantalla)
  const objetivoMetaPDF = Number(_cdMesData.objetivoGananciaNeta || 1200);
  const gananciaInventarioAhoraPDF = (typeof productos !== 'undefined' ? productos : [])
    .reduce((s,p)=> s + (Number(p.stock)||0) * ((Number(p.venta)||0) - (Number(p.compra)||0)), 0);
  const gananciaEfectivoMesPDF = ingresoRealMes - cogsPDF;
  const gananciaGeneralMesPDF = gananciaInventarioAhoraPDF + gananciaEfectivoMesPDF;
  const metaCumplidaPDF = gananciaGeneralMesPDF >= objetivoMetaPDF;

  // Lo Que Tengo en Mi Tienda (patrimonio total en tiempo real)
  const efectivoInicialRealPDF = (typeof efectivoInicial !== 'undefined' && Number(efectivoInicial) > 0)
    ? Number(efectivoInicial) : sIni;
  const valorInventarioActualPDF = (typeof productos !== 'undefined' ? productos : [])
    .reduce((s,p)=> s + (Number(p.stock)||0) * (Number(p.venta)||0), 0);
  const efectivoVendidoNetoPDF = ingresoRealMes - totalFacturasPDF;
  const patrimonioTotalPDF = efectivoInicialRealPDF + efectivoVendidoNetoPDF + valorInventarioActualPDF;
  const patrimonioMenosGastoPDF = patrimonioTotalPDF - totalGastoMensualPDF;

  // Ranking de productos por ganancia del mes (Invertido/Ganancia)
  const rankingProductosMes = Object.values(acumProductosMes)
    .map(v => ({ nom:v.nom, cant:v.cant, invertido:v.totalCosto, ganancia:v.totalVenta - v.totalCosto }))
    .sort((a,b)=> b.ganancia - a.ganancia);

  // Prioridad por Ganancia (por unidad, inventario completo)
  const rankingGananciaUnidad = (typeof productos !== 'undefined' ? productos : [])
    .map(p => ({ nom:p.nom||'—', costo:Number(p.compra||0), venta:Number(p.venta||0), ganancia:Number(p.venta||0)-Number(p.compra||0) }))
    .sort((a,b)=> b.ganancia - a.ganancia);

  const w=doc.internal.pageSize.getWidth();
  const pageH=doc.internal.pageSize.getHeight();
  let y=18;

  // ── Helpers ──────────────────────────────────────────────────────────
  const checkPage=()=>{ if(y>pageH-18){doc.addPage();y=18;} };
  const row=(lbl,val,cy,colorL=[50,50,50],colorV=[12,74,110])=>{
    doc.setFontSize(10);doc.setFont('helvetica','normal');doc.setTextColor(...colorL);doc.text(lbl,14,cy);
    doc.setFont('helvetica','bold');doc.setTextColor(...colorV);doc.text(val,w-14,cy,{align:'right'});
    doc.setDrawColor(3,105,161);doc.setLineWidth(0.4);doc.line(14,cy+1.5,w-14,cy+1.5);
  };
  const rowTotal=(lbl,val,cy,color=[3,105,161])=>{
    doc.setFillColor(224,242,254);doc.rect(14,cy-5,w-28,7,'F');
    doc.setFontSize(11);doc.setFont('helvetica','bold');doc.setTextColor(...color);
    doc.text(lbl,16,cy);doc.text(val,w-16,cy,{align:'right'});
    doc.setDrawColor(...color);doc.setLineWidth(0.8);doc.line(14,cy+2,w-14,cy+2);
  };
  const separator=(cy)=>{doc.setDrawColor(3,105,161);doc.setLineWidth(1.2);doc.line(14,cy,w-14,cy);};
  const sectionHeader=(txt,cy,bgColor=[3,105,161])=>{
    doc.setFillColor(...bgColor);doc.rect(14,cy-6,w-28,8,'F');
    doc.setFontSize(11);doc.setFont('helvetica','bold');doc.setTextColor(255,255,255);
    doc.text(txt,w/2,cy,{align:'center'});
  };
  const miniTabla=(headers,rows,cy,colColors)=>{
    doc.setFillColor(3,105,161);doc.rect(14,cy-5,w-28,6,'F');
    doc.setFontSize(8.5);doc.setFont('helvetica','bold');doc.setTextColor(255,255,255);
    headers.forEach(h=>{doc.text(h.txt,h.x,cy,h.align?{align:h.align}:{});});
    cy+=7;
    rows.forEach((r,i)=>{
      checkPage();
      if(i%2===0){doc.setFillColor(240,249,255);doc.rect(14,cy-5,w-28,7,'F');}
      doc.setFontSize(9);
      r.forEach((val,ci)=>{
        doc.setTextColor(...(colColors[ci]||[30,30,30]));
        doc.setFont('helvetica', ci===0?'bold':'normal');
        doc.text(String(val), headers[ci].x, cy, headers[ci].align?{align:headers[ci].align}:{});
      });
      doc.setDrawColor(186,230,253);doc.setLineWidth(0.25);doc.line(14,cy+1.5,w-14,cy+1.5);
      cy+=7;
    });
    return cy;
  };

  // ── ENCABEZADO ────────────────────────────────────────────────────────
  doc.setFillColor(12,74,110);doc.rect(0,0,w,22,'F');
  doc.setFontSize(16);doc.setFont('helvetica','bold');doc.setTextColor(255,255,255);
  doc.text('ESTADO DE RESULTADOS',w/2,10,{align:'center'});
  doc.setFontSize(10);doc.setFont('helvetica','normal');
  doc.text('Despensa Económica · Mes: '+mes+'   |   Generado: '+new Date().toLocaleDateString('es-SV'),w/2,16,{align:'center'});
  y=30;

  // ── 1. INGRESOS Y UTILIDAD BRUTA ──────────────────────────────────────
  sectionHeader('INGRESOS Y COSTO DE VENTAS',y,[21,128,61]);y+=8;
  row('Ventas totales del mes',          '$'+ingresoRealMes.toFixed(2), y,[50,50,50],[21,128,61]); y+=8;
  row('Menos costo de ventas (COGS)',    '-$'+cogsPDF.toFixed(2),       y,[50,50,50],[220,38,38]); y+=8;
  rowTotal('UTILIDAD BRUTA: $'+utilidadBruta.toFixed(2), '', y,[21,128,61]); y+=14;

  // ── 2. GASTOS OPERATIVOS ──────────────────────────────────────────────
  checkPage();
  sectionHeader('GASTOS OPERATIVOS DEL MES',y,[180,30,30]);y+=8;
  row('Pago de Facturas (mercancía)',    '-$'+totalFacturasPDF.toFixed(2),     y,[50,50,50],[220,38,38]); y+=8;
  row('Gasto Mensual (luz, agua, etc.)', '-$'+totalGastoMensualPDF.toFixed(2), y,[50,50,50],[220,38,38]); y+=8;
  rowTotal('TOTAL GASTOS OPERATIVOS: $'+totalGastosOperativos.toFixed(2), '', y,[180,30,30]); y+=14;

  // ── 3. UTILIDAD NETA DEL MES ──────────────────────────────────────────
  checkPage();
  sectionHeader('UTILIDAD NETA DEL MES',y,[12,74,110]);y+=8;
  row('Utilidad bruta',           '$'+utilidadBruta.toFixed(2),          y,[50,50,50],[21,128,61]); y+=8;
  row('Menos gastos operativos',  '-$'+totalGastosOperativos.toFixed(2), y,[50,50,50],[220,38,38]); y+=8;
  rowTotal((utilidadNetaMes>=0?'UTILIDAD NETA: $':'PÉRDIDA NETA: $')+Math.abs(utilidadNetaMes).toFixed(2), '', y,
    utilidadNetaMes>=0?[21,128,61]:[220,38,38]); y+=16;

  // ── 4. OBJETIVO MENSUAL DE GANANCIA ───────────────────────────────────
  checkPage();
  sectionHeader('OBJETIVO MENSUAL DE GANANCIA',y,[124,58,237]);y+=8;
  row('Ganancia en inventario (aún sin vender)', '$'+gananciaInventarioAhoraPDF.toFixed(2), y,[50,50,50],[30,64,175]); y+=8;
  row('Ganancia ya realizada (ventas del mes)',  '$'+gananciaEfectivoMesPDF.toFixed(2),      y,[50,50,50],[21,128,61]); y+=8;
  row('Meta mínima establecida',                 '$'+objetivoMetaPDF.toFixed(2),             y,[50,50,50],[124,58,237]); y+=8;
  rowTotal((metaCumplidaPDF?'META CUMPLIDA - GANANCIA TOTAL: $':'META NO CUMPLIDA - GANANCIA TOTAL: $')+gananciaGeneralMesPDF.toFixed(2),
    '', y, metaCumplidaPDF?[21,128,61]:[220,38,38]); y+=16;

  // ── 5. LO QUE TENGO EN MI TIENDA (patrimonio) ─────────────────────────
  checkPage();
  sectionHeader('LO QUE TENGO EN MI TIENDA',y,[8,145,178]);y+=8;
  row('Efectivo inicial del mes',                 '$'+efectivoInicialRealPDF.toFixed(2), y,[50,50,50],[8,145,178]); y+=8;
  row('Mas ventas cobradas este mes',              '+$'+ingresoRealMes.toFixed(2),        y,[50,50,50],[21,128,61]); y+=8;
  row('Menos pago de facturas este mes',           '-$'+totalFacturasPDF.toFixed(2),       y,[50,50,50],[220,38,38]); y+=8;
  row('Mas inventario actual (a precio de venta)', '+$'+valorInventarioActualPDF.toFixed(2), y,[50,50,50],[8,145,178]); y+=8;
  rowTotal('TOTAL EN MI TIENDA AHORA: $'+patrimonioTotalPDF.toFixed(2), '', y,[8,145,178]); y+=10;
  row('Menos gasto mensual (luz, agua, etc.)', '-$'+totalGastoMensualPDF.toFixed(2), y,[50,50,50],[220,38,38]); y+=8;
  rowTotal('TOTAL - GASTO MENSUAL: $'+patrimonioMenosGastoPDF.toFixed(2), '', y,[154,52,18]); y+=16;

  // ── 6. TOP PRODUCTOS DEL MES POR GANANCIA ─────────────────────────────
  checkPage();
  sectionHeader('PRODUCTOS DEL MES - INVERTIDO Y GANANCIA',y,[3,105,161]);y+=8;
  if(rankingProductosMes.length){
    const top = rankingProductosMes.slice(0,10);
    y = miniTabla(
      [{txt:'Producto',x:16},{txt:'Uds',x:110,align:'center'},{txt:'Invertido',x:140,align:'right'},{txt:'Ganancia',x:w-14,align:'right'}],
      top.map(p=>[p.nom,String(p.cant),'$'+p.invertido.toFixed(2),'$'+p.ganancia.toFixed(2)]),
      y,
      [[30,30,30],[22,101,52],[180,83,9],[21,128,61]]
    );
    y+=8;
  } else {
    doc.setFontSize(10);doc.setTextColor(150,150,150);doc.text('Sin ventas registradas este mes',w/2,y,{align:'center'});y+=10;
  }

  // ── 7. PRIORIDAD POR GANANCIA (por unidad, inventario completo) ──────
  checkPage();
  sectionHeader('PRIORIDAD POR GANANCIA - MEJOR Y MENOR MARGEN',y,[124,58,237]);y+=8;
  if(rankingGananciaUnidad.length){
    const mejores = rankingGananciaUnidad.slice(0,5);
    const peores  = rankingGananciaUnidad.slice(-5).reverse();
    doc.setFontSize(9);doc.setFont('helvetica','bold');doc.setTextColor(21,128,61);doc.text('Mejor margen:',16,y);y+=6;
    y = miniTabla(
      [{txt:'Producto',x:16},{txt:'Costo',x:120,align:'right'},{txt:'Venta',x:150,align:'right'},{txt:'Ganancia/Ud.',x:w-14,align:'right'}],
      mejores.map(p=>[p.nom,'$'+p.costo.toFixed(2),'$'+p.venta.toFixed(2),'$'+p.ganancia.toFixed(2)]),
      y,[[30,30,30],[100,50,180],[30,30,30],[21,128,61]]
    );
    y+=8; checkPage();
    doc.setFontSize(9);doc.setFont('helvetica','bold');doc.setTextColor(220,38,38);doc.text('Menor margen:',16,y);y+=6;
    y = miniTabla(
      [{txt:'Producto',x:16},{txt:'Costo',x:120,align:'right'},{txt:'Venta',x:150,align:'right'},{txt:'Ganancia/Ud.',x:w-14,align:'right'}],
      peores.map(p=>[p.nom,'$'+p.costo.toFixed(2),'$'+p.venta.toFixed(2),'$'+p.ganancia.toFixed(2)]),
      y,[[30,30,30],[100,50,180],[30,30,30],[220,38,38]]
    );
    y+=8;
  } else {
    doc.setFontSize(10);doc.setTextColor(150,150,150);doc.text('Sin productos en el inventario',w/2,y,{align:'center'});y+=10;
  }

  // ── 8. RESUMEN DE CAJA (Cierre Diario, como antes) ────────────────────
  checkPage();
  sectionHeader('RESUMEN DE CAJA (CIERRE DIARIO)',y);y+=6;
  row('Saldo efectivo al inicio del mes', '$'+sIni.toFixed(2),      y,[50,50,50],[3,105,161]); y+=8;
  row('Menos gastos pagados del saldo',  '-$'+totalG.toFixed(2),    y,[50,50,50],[220,38,38]); y+=8;
  row('Mas ventas que entraron a caja',  '+$'+totalACaja.toFixed(2),y,[50,50,50],[21,128,61]); y+=8;
  rowTotal('DEBERIA HABER EN CAJA: $'+cajaFinalPDF.toFixed(2), '', y,[3,105,161]); y+=12;
  row('Inventario inicial del mes',         '$'+invIniPDF.toFixed(2),  y,[50,50,50],[100,50,180]); y+=8;
  row('Menos costo de lo vendido (COGS)',  '-$'+cogsPDF.toFixed(2),   y,[50,50,50],[220,38,38]); y+=8;
  row('Mas ganancia de recompras',          '+$'+totalInvG.toFixed(2), y,[50,50,50],[21,128,61]); y+=8;
  rowTotal('DEBERIA QUEDAR EN INVENTARIO: $'+invFinalPDF.toFixed(2), '', y,[100,50,180]); y+=14;

  // ── VENTAS DEL MES (detalle, igual que antes) ─────────────────────────
  checkPage();
  sectionHeader('VENTAS DEL MES ('+_cdMesData.ventas.length+')',y);y+=8;
  if(_cdMesData.ventas.length){
    doc.setFillColor(3,105,161);doc.rect(14,y-5,w-28,6,'F');
    doc.setFontSize(9);doc.setFont('helvetica','bold');doc.setTextColor(255,255,255);
    doc.text('Fecha',16,y);doc.text('Venta total',70,y);doc.text('Alquiler',110,y);doc.text('A caja',w-16,y,{align:'right'});
    y+=7;
    _cdMesData.ventas.forEach((v,i)=>{
      checkPage();
      if(i%2===0){doc.setFillColor(240,249,255);doc.rect(14,y-5,w-28,7,'F');}
      doc.setFontSize(10);doc.setFont('helvetica','normal');doc.setTextColor(30,30,30);
      doc.text(_cdFmtFecha(v.fecha),16,y);
      doc.setFont('helvetica','bold');doc.setTextColor(3,105,161);
      doc.text('$'+v.total.toFixed(2),70,y);
      doc.setTextColor(180,83,9);
      doc.text('$'+(v.alquiler||0).toFixed(2),110,y);
      doc.setTextColor(21,128,61);
      doc.text('$'+(v.total-(v.alquiler||0)).toFixed(2),w-14,y,{align:'right'});
      doc.setDrawColor(186,230,253);doc.setLineWidth(0.25);doc.line(14,y+1.5,w-14,y+1.5);
      y+=8;
    });
    rowTotal('TOTAL  Ventas: $'+totalV.toFixed(2)+'  Alquiler: $'+totalAlq.toFixed(2)+'  A caja: $'+totalACaja.toFixed(2),'',y); y+=14;
  } else {
    doc.setFontSize(10);doc.setTextColor(150,150,150);doc.text('Sin ventas registradas',w/2,y,{align:'center'});y+=10;
  }

  // ── GASTOS DEL MES (detalle Cierre Diario, igual que antes) ───────────
  checkPage();
  sectionHeader('GASTOS Y PAGOS DEL MES ('+_cdMesData.gastos.length+')',y,[180,30,30]);y+=8;
  if(_cdMesData.gastos.length){
    doc.setFillColor(180,30,30);doc.rect(14,y-5,w-28,6,'F');
    doc.setFontSize(9);doc.setFont('helvetica','bold');doc.setTextColor(255,255,255);
    doc.text('Fecha',16,y);doc.text('Descripcion',50,y);doc.text('Ganancia inv.',120,y);doc.text('Total pagado',w-16,y,{align:'right'});
    y+=7;
    _cdMesData.gastos.forEach((g,i)=>{
      checkPage();
      if(i%2===0){doc.setFillColor(255,242,242);doc.rect(14,y-5,w-28,7,'F');}
      doc.setFontSize(9);doc.setFont('helvetica','normal');doc.setTextColor(30,30,30);
      doc.text(_cdFmtFecha(g.fecha),16,y);
      const desc=(g.desc||'Pago').replace(/[^\x20-\x7E\u00C0-\u024F]/g,'').trim()||'Pago';
      doc.text(desc.substring(0,28),50,y);
      doc.setTextColor(21,128,61);
      doc.text(g.tipoInv?'+$'+g.gananciaInv.toFixed(2):'-',120,y);
      doc.setFont('helvetica','bold');doc.setTextColor(220,38,38);
      doc.text('$'+g.total.toFixed(2),w-14,y,{align:'right'});
      doc.setDrawColor(252,165,165);doc.setLineWidth(0.25);doc.line(14,y+1.5,w-14,y+1.5);
      y+=8;
    });
  }
  if(!_cdMesData.gastos.length){doc.setFontSize(10);doc.setTextColor(150,150,150);doc.text('Sin gastos registrados',w/2,y,{align:'center'});y+=8;}
  rowTotal('TOTAL GASTOS (registro Cierre Diario)', '$'+totalG.toFixed(2), y, [220,38,38]); y+=16;

  // ── PIE ───────────────────────────────────────────────────────────────
  checkPage();
  separator(y);y+=8;
  doc.setFontSize(9);doc.setFont('helvetica','italic');doc.setTextColor(120,120,120);
  doc.text('Despensa Económica — Estado de Resultados '+mes,w/2,y,{align:'center'});

  doc.save(`Estado_Resultados_${mes}.pdf`);
  if(typeof toast==='function')toast('📄 Estado de Resultados descargado');
}

// ══ Reiniciar mes ════════════════════════════════════════════════════════
function _cdReiniciarMes(){
  if(!confirm('¿Reiniciar el registro mensual?\n\nSe borrarán: ventas del mes, gastos/pagos, historial.\nNO se toca: "Esto Queda en Efectivo" (se mantiene igual).\n\nDescarga el PDF antes si quieres conservar el historial.'))return;

  // Limpiar registro mensual (se conserva el objetivo de ganancia configurado)
  const _objetivoPrevio = _cdMesData.objetivoGananciaNeta || 1200;
  _cdMesData={saldoInicio:0,inventarioInicial:0,ventas:[],gastos:[],objetivoGananciaNeta:_objetivoPrevio};
  _cdGuardarMes();

  // Limpiar venta snapshot (Punto 2 — no mostrar venta del mes anterior en captura nueva)
  _cdVentaSnapshot=null;

  // Limpiar estado diario: gastos, deudas, cambios, saldo en caja
  _cdGastos=[];_cdDeudas=[];_cdCambiosAplicados=[];

  // Limpiar campos de Venta del día y Saldo en Caja
  // pero MANTENER los campos de "Queda en Efectivo" intactos
  const quedaGuardada=_cdLeerMontos('cdQueda'); // leer antes de re-renderizar
  _idbGuardarQueda(quedaGuardada);              // persistir

  if(typeof toast==='function')toast('✓ Mes reiniciado. "Queda en Efectivo" conservado.');
  renderCierreDia();
  // Restaurar Queda después de renderizar
  setTimeout(()=>{
    _CD_DENOMS.forEach(d=>_cdSet('cdQueda'+d.id,quedaGuardada[d.id]||0));
    _cdActualizarStats();
  },100);
}

// Persistir "Queda en Efectivo" en Supabase (no en IDB) — sobrevive reinicio
function _idbGuardarQueda(montos){
  // Guardar en Supabase si está disponible
  if(typeof _sbPost==='function'&&typeof _getTiendaId==='function'){
    try{
      _sbPost('cierre_diario',{
        id:_getTiendaId()+'_queda_efectivo',
        tienda_id:_getTiendaId(),
        fecha:'queda_efectivo',
        datos:JSON.stringify({tipo:'queda_efectivo',montos,updated:new Date().toISOString()}),
        updated_at:new Date().toISOString()
      },true).catch(e=>console.warn('[Queda]',e.message));
    }catch(e){}
  }
  // También en IDB como respaldo local
  try{ idbSet('vpos_quedaEfectivo',montos); }catch(e){}
  // Y clave genérica via _cdSbSave
  _cdSbSave('quedaEfectivo', montos);
}
async function _idbCargarQueda(){
  // Intentar cargar de Supabase primero
  if(typeof _sbGet==='function'&&typeof _getTiendaId==='function'){
    try{
      const rows=await _sbGet('cierre_diario',{select:'datos',id:'eq.'+_getTiendaId()+'_queda_efectivo'});
      if(rows&&rows.length&&rows[0].datos){
        const d=JSON.parse(rows[0].datos);
        if(d.montos)return d.montos;
      }
    }catch(e){}
  }
  // Fallback a IDB
  try{ return await idbGet('vpos_quedaEfectivo')||null; }catch(e){return null;}
}

// ══ Fecha ═════════════════════════════════════════════════════════════════
function _cdCambiarFecha(fecha){
  _cdFecha=fecha;_cdVentaSnapshot=null;_cdCambiosAplicados=[];
  _cdTxt('cdHeroFechaLbl',_cdFmtFecha(fecha));_cdTxt('cdCapFecha',_cdFmtFecha(fecha).toUpperCase());
  _cdGastos=[];_cdDeudas=[];
  // Re-render mínimo: solo limpiar venta/gastos del día anterior, mantener saldo y ayer
  _CD_DENOMS.forEach(d=>_cdSet('cdVenta'+d.id,0,true));
  const vEl=document.getElementById('cdVentaTotal');if(vEl)vEl.value='';
  _cdRenderListas();_cdActualizarStats();
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
window._cdGuardarInventarioInicial = _cdGuardarInventarioInicial;
window._cdGuardarQuedaManual     = _cdGuardarQuedaManual;
window._cdToggleInvFields        = _cdToggleInvFields;
window._cdCalcularGanancia       = _cdCalcularGanancia;
window._cdGenerarPDFMensual      = _cdGenerarPDFMensual;
window._cdReiniciarMes           = _cdReiniciarMes;

window._cdCargarVentaAyer = _cdCargarVentaAyer;
window._cdCerrarModal = _cdCerrarModal;
window._cdGuardarSaldoCajaExplicit = _cdGuardarSaldoCajaExplicit;
window._cdGuardarSaldoBtn = _cdGuardarSaldoBtn;
window._cdSaldoChanged = _cdSaldoChanged;
window._cdFlashBtnGuardar = _cdFlashBtnGuardar;
window._cdGuardarCajaAyerExplicit  = _cdGuardarCajaAyerExplicit;
// ── Guardar ventaSnapshot de forma independiente ─────────────────────────
function _cdSaveVentaSnapshot(){
  if(!_cdVentaSnapshot) return;
  const ts = _cdVentaSnapshot.ts || Date.now();
  _cdVentaSnapshot.ts = ts; // asegurar ts
  const wrapped = {valor:{ventaSnapshot:_cdVentaSnapshot,fecha:_cdFecha,ts}, ts};
  try{ localStorage.setItem('vpos_cd_ventaSnap_'+_cdFecha, JSON.stringify(wrapped)); }catch(e){}
  _cdSbSave('ventaSnap_'+_cdFecha, {ventaSnapshot:_cdVentaSnapshot,fecha:_cdFecha,ts}).catch(()=>{});
}

// ── Guardar gastos del día de forma independiente (persiste al recargar) ──
function _cdSaveGastos() {
  const data = { gastos: _cdGastos, fecha: _cdFecha, ts: Date.now() };
  try {
    localStorage.setItem('vpos_cd_gastosDia_'+_cdFecha, JSON.stringify({ valor: data, ts: data.ts }));
  } catch(e) {}
  _cdSbSave('gastosDia_'+_cdFecha, data).catch(()=>{});
  if(typeof _broadcast==='function') _broadcast('cierre_gastos', { fecha: _cdFecha, gastos: _cdGastos, ts: data.ts });
}

// ── Guardar cambios del día de forma independiente (persiste al recargar) ──
function _cdSaveCambios() {
  const data = { cambios: _cdCambiosAplicados, fecha: _cdFecha, ts: Date.now() };
  try {
    localStorage.setItem('vpos_cd_cambiosDia_'+_cdFecha, JSON.stringify({ valor: data, ts: data.ts }));
  } catch(e) {}
  _cdSbSave('cambiosDia_'+_cdFecha, data).catch(()=>{});
  if(typeof _broadcast==='function') _broadcast('cierre_cambios', { fecha: _cdFecha, cambios: _cdCambiosAplicados, ts: data.ts });
}


// ══ Storage: todo en Supabase, IDB solo como caché ═══════════════════
async function _cdSbSave(clave, valor) {
  const tiendaId = typeof _getTiendaId === 'function' ? _getTiendaId() : 'local';
  const id = tiendaId + '_' + clave;
  const ts = Date.now();
  // 1. Siempre guardar en localStorage inmediatamente (más rápido, no falla)
  try { localStorage.setItem('vpos_cd_' + clave, JSON.stringify({ valor, ts })); } catch(e) {}
  // 2. Guardar en IDB
  try { await idbSet('vpos_' + clave, valor); } catch(e) {}
  // 3. Guardar en Supabase (puede fallar si offline)
  try {
    await _sbPost('cierre_diario', {
      id, tienda_id: tiendaId, fecha: clave,
      datos: JSON.stringify({ clave, valor, ts }),
      updated_at: new Date().toISOString()
    }, true);
  } catch(e) { /* sin conexión — IDB y localStorage ya tienen los datos */ }
}
async function _cdSbLoad(clave) {
  const tiendaId = typeof _getTiendaId === 'function' ? _getTiendaId() : 'local';
  let sbValor = null, sbTs = 0;
  let lsValor = null, lsTs = 0;
  let idbValor = null;

  // 1. Intentar Supabase
  try {
    if (typeof _sbGet === 'function') {
      const rows = await _sbGet('cierre_diario', {
        select: 'datos', id: 'eq.' + tiendaId + '_' + clave
      });
      if (rows && rows.length && rows[0].datos) {
        const d = JSON.parse(rows[0].datos);
        if (d && d.valor !== undefined) { sbValor = d.valor; sbTs = d.ts || 0; }
      }
    }
  } catch(e) {}

  // 2. Leer localStorage
  try {
    const raw = localStorage.getItem('vpos_cd_' + clave);
    if (raw) { const d = JSON.parse(raw); lsValor = d.valor; lsTs = d.ts || 0; }
  } catch(e) {}

  // 3. Leer IDB como último recurso
  try { idbValor = await idbGet('vpos_' + clave) || null; } catch(e) {}

  // Devolver el más reciente (por ts)
  if (sbValor !== null && sbTs >= lsTs) return sbValor;
  if (lsValor !== null) return lsValor;
  return idbValor;
}

// ══ Realtime: escuchar cambios del otro dispositivo ═══════════════════════
// Se engancha cuando supabase_sync registra cambios en cierre_diario
// ══ Cierre Diario — recibir broadcast del otro dispositivo ═══════════════
let _cdLastBroadcastTs = 0; // evitar procesamiento doble
function _cdRecibirBroadcast(evento, payload) {
  // No bloquear por _cdRestoring — cada handler gestiona su propio ciclo
  const hoy = new Date().toISOString().split('T')[0];
  const fecha = payload.fecha || '';
  if (fecha && fecha !== _cdFecha && fecha !== hoy) return;

  // Evitar duplicados si llegan dos broadcasts casi simultáneos
  const ts = payload.data?.ts || payload.saldo?.ts || payload.datos?.ts || 0;
  if (ts && ts === _cdLastBroadcastTs) return;
  if (ts) _cdLastBroadcastTs = ts;

  if (evento === 'cierre_estado' && payload.data) {
    const d = payload.data;
    if (d.borrado) {
      _cdRestoring = true;
      _cdGastos=[]; _cdDeudas=[]; _cdCambiosAplicados=[]; _cdVentaSnapshot=null;
      ['cdVentaTotal','cdVentaAlquilerHoy'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
      _CD_DENOMS.forEach(dn=>{ _cdSet('cdVenta'+dn.id,0,true); _cdSet('cdGastoForm'+dn.id,0,true); });
      localStorage.removeItem('vpos_cierre_estado');
      _cdRenderListas(); _cdActualizarStats();
      _cdRestoring = false;
      if(typeof toast==='function') toast('🗑 Cierre borrado desde otro dispositivo');
      return;
    }
    _cdRestoring = true;
    setTimeout(()=>{
      _cdSet('cdVentaTotal', d.ventaTotal||0, true);
      _cdSet('cdVentaAlquilerHoy', d.ventaAlquiler||0, true);
      _CD_DENOMS.forEach(dn=>_cdSet('cdVenta'+dn.id, d.venta?.[dn.id]||0, true));
      // Fusionar cambios y gastos: usar los del broadcast si son más recientes
      if(Array.isArray(d.gastos)) _cdGastos = d.gastos;
      if(Array.isArray(d.cambios)) _cdCambiosAplicados = d.cambios;
      if(d.ventaSnapshot) _cdVentaSnapshot = d.ventaSnapshot;
      // Actualizar localStorage con datos recibidos
      localStorage.setItem('vpos_cierre_estado', JSON.stringify(d));
      _cdRenderListas(); _cdActualizarStats();
      _cdRestoring = false;
      if(typeof toast==='function') toast('🔄 Actualizado desde otro dispositivo');
    }, 80);
  }

  // Saldo en caja: actualizar silenciosamente (sin toast)
  if (evento === 'cierre_saldo' && payload.saldo) {
    _cdRestoring = true;
    setTimeout(()=>{
      _cdSaldoCajaPersist = payload.saldo;
      localStorage.setItem('vpos_saldoCaja', JSON.stringify(payload.saldo));
      _CD_DENOMS.forEach(dn=>_cdSet('cdSaldo'+dn.id, payload.saldo.montos?.[dn.id]||0, true));
      _cdSet('cdAlquiler', payload.saldo.alquiler||0, true);
      _cdActualizarStats();
      _cdRestoring = false;
    }, 80);
  }

  // Caja ayer: actualizar silenciosamente
  if (evento === 'cierre_cajaayer' && payload.datos) {
    _cdRestoring = true;
    setTimeout(()=>{
      _cdCajaAyerPersist = payload.datos;
      localStorage.setItem('vpos_cajaAyer', JSON.stringify(payload.datos));
      _CD_DENOMS.forEach(dn=>_cdSet('cdAyer'+dn.id, payload.datos.montos?.[dn.id]||0, true));
      if(payload.datos.alquiler!=null) _cdSet('cdAyerAlquiler', payload.datos.alquiler, true);
      _cdActualizarStats();
      _cdRestoring = false;
    }, 80);
  }

  // Venta del día: actualizar saldo y snapshot
  if (evento === 'cierre_venta' && payload.ts) {
    if (payload.ts === _cdLastBroadcastTs) return;
    _cdLastBroadcastTs = payload.ts;
    if (payload.ventaSnapshot) {
      _cdVentaSnapshot = payload.ventaSnapshot;
      try { localStorage.setItem('vpos_cd_ventaSnap_'+_cdFecha, JSON.stringify({valor:{ventaSnapshot:payload.ventaSnapshot,fecha:_cdFecha,ts:payload.ts},ts:payload.ts})); } catch(e) {}
    }
    // Actualizar saldo en caja si viene
    if (payload.saldo) {
      _cdRestoring = true;
      _cdSaldoCajaPersist = payload.saldo;
      localStorage.setItem('vpos_saldoCaja', JSON.stringify(payload.saldo));
      localStorage.setItem('vpos_cd_saldoCaja_'+_cdFecha, JSON.stringify({valor:payload.saldo,ts:payload.ts}));
      _CD_DENOMS.forEach(dn=>_cdSet('cdSaldo'+dn.id, payload.saldo.montos?.[dn.id]||0, true));
      _cdSet('cdAlquiler', payload.saldo.alquiler||0, true);
      _cdRestoring = false;
    }
    _cdActualizarStats();
    // Si _cdSaldoAyerCache no está cargado, cargarlo y volver a actualizar
    if(!_cdSaldoAyerCache && typeof _cdCargarSaldoAyer === 'function'){
      _cdCargarSaldoAyer().then(s=>{ if(s){_cdSaldoAyerCache=s; _cdActualizarStats();} }).catch(()=>{});
    }
    if(typeof toast==='function') toast('💹 Venta aplicada desde otro dispositivo');
  }

  // Gastos: actualizar silenciosamente
  if (evento === 'cierre_gastos' && Array.isArray(payload.gastos)) {
    const ts = payload.ts || 0;
    if (ts && ts === _cdLastBroadcastTs) return;
    if (ts) _cdLastBroadcastTs = ts;
    _cdGastos = payload.gastos;
    try { localStorage.setItem('vpos_cd_gastosDia_'+_cdFecha, JSON.stringify({valor:{gastos:payload.gastos,fecha:_cdFecha,ts},ts})); } catch(e) {}
    _cdRenderListas();
    _cdActualizarStats();
    setTimeout(()=>{ if(typeof _cdActualizarStats==='function') _cdActualizarStats(); }, 250);
  }

  // Cambios: actualizar silenciosamente
  if (evento === 'cierre_cambios' && Array.isArray(payload.cambios)) {
    const ts = payload.ts || 0;
    if (ts && ts === _cdLastBroadcastTs) return;
    if (ts) _cdLastBroadcastTs = ts;
    _cdCambiosAplicados = payload.cambios;
    try { localStorage.setItem('vpos_cd_cambiosDia_'+_cdFecha, JSON.stringify({valor:{cambios:payload.cambios,fecha:_cdFecha,ts},ts})); } catch(e) {}
    _cdRenderListas();
    _cdActualizarStats();
    setTimeout(()=>{ if(typeof _cdActualizarStats==='function') _cdActualizarStats(); }, 250);
  }

  if (evento === 'cierre_borrado') {
    _cdRestoring = true;
    _cdGastos=[]; _cdDeudas=[]; _cdCambiosAplicados=[]; _cdVentaSnapshot=null;
    ['cdVentaTotal','cdVentaAlquilerHoy'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
    _CD_DENOMS.forEach(dn=>{ _cdSet('cdVenta'+dn.id,0,true); _cdSet('cdGastoForm'+dn.id,0,true); });
    localStorage.removeItem('vpos_cierre_estado');
    localStorage.removeItem('vpos_cd_estadoDia_'+(payload.fecha||_cdFecha));
    localStorage.removeItem('vpos_cd_gastosDia_'+(payload.fecha||_cdFecha));
    localStorage.removeItem('vpos_cd_cambiosDia_'+(payload.fecha||_cdFecha));
    localStorage.removeItem('vpos_cd_ventaSnap_'+(payload.fecha||_cdFecha));
    _cdRenderListas(); _cdActualizarStats();
    _cdRestoring = false;
    if(typeof toast==='function') toast('🗑 Cierre borrado desde otro dispositivo');
  }
}
window._cdRecibirBroadcast = _cdRecibirBroadcast;

