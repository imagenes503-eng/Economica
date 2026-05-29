// =====================================================================
//  📋 CIERRE DIARIO DE CAJA — v8.1 (Completo y Corregido)
// =====================================================================
(function _estilosCierre() {
  if (document.getElementById('cierreDiaStyles')) return;
  const s = document.createElement('style');
  s.id = 'cierreDiaStyles';
  s.textContent = `
    #pgCierreDia { padding:0 0 100px; font-family:'Roboto', sans-serif; background:#f4f6f9; }
    
    /* Hero */
    .cd-hero { background:linear-gradient(135deg,#0c4a6e,#075985,#0369a1); padding:20px 18px 16px; margin-bottom:16px; }
    .cd-hero-top { display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px; }
    .cd-hero-title { font-size:18px;font-weight:900;color:#fff;font-family:Nunito,sans-serif; }
    .cd-hero-fecha { font-size:12px;font-weight:900;color:rgba(255,255,255,0.7);font-family:Nunito,sans-serif; }
    .cd-fecha-inp { padding:6px 10px;background:rgba(255,255,255,0.12);border:1.5px solid rgba(255,255,255,0.25);border-radius:20px;color:#fff;font-weight:700;font-size:13px;outline:none;text-align:center; }
    
    /* CAMBIO: Contenedor y Botones de Secciones (Subventanas) */
    .cd-nav-container { display:flex; gap:8px; overflow-x:auto; padding:4px 0; margin-top:10px; scrollbar-width:none; }
    .cd-nav-container::-webkit-scrollbar { display:none; }
    .cd-nav-btn { background:rgba(255,255,255,0.12); color:rgba(255,255,255,0.85); border:1px solid rgba(255,255,255,0.15); padding:8px 16px; border-radius:20px; font-family:'Nunito',sans-serif; font-size:13px; font-weight:700; cursor:pointer; white-space:nowrap; transition:all 0.2s ease; }
    .cd-nav-btn.active { background:#fff; color:#0369a1; box-shadow:0 4px 10px rgba(0,0,0,0.15); border-color:#fff; }

    /* Estructura de Subventanas */
    .cd-subventana { display:none; background:#fff; border-radius:12px; padding:16px; margin:0 12px 16px; box-shadow:0 2px 8px rgba(0,0,0,0.04); border:1px solid #e2e8f0; }
    .cd-subventana.active { display:block; animation:cdFadeIn 0.25s ease-in-out; }

    @keyframes cdFadeIn {
      from { opacity:0; transform:translateY(6px); }
      to { opacity:1; transform:translateY(0); }
    }

    /* Tablas y Controles */
    .cd-card-title { font-size:14px; font-weight:800; color:#1e293b; margin-bottom:12px; display:flex; align-items:center; gap:6px; text-transform:uppercase; letter-spacing:0.5px; }
    .cd-tabla { width:100%; border-collapse:collapse; margin-bottom:10px; }
    .cd-tabla th { background:#f8fafc; text-align:left; padding:8px 10px; font-size:11px; font-weight:700; color:#64748b; border-bottom:1px solid #e2e8f0; }
    .cd-tabla td { padding:8px 10px; font-size:13px; color:#334155; border-bottom:1px solid #f1f5f9; vertical-align:middle; }
    .cd-inp { width:100%; padding:6px 10px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; font-weight:600; color:#1e293b; background:#fff; box-sizing:border-box; transition:border 0.2s; }
    .cd-inp:focus { border-color:#0284c7; outline:none; background:#f0f9ff; }
    .cd-inp-read { background:#f8fafc!important; color:#64748b!important; font-weight:700; border-color:#e2e8f0!important; }
    
    /* Totales y Alertas */
    .cd-total-row { background:#f8fafc; font-weight:700; }
    .cd-total-row td { border-top:1px solid #cbd5e1; color:#0f172a; font-size:13px; }
    .cd-badge-delta { padding:4px 8px; border-radius:6px; font-size:12px; font-weight:800; display:inline-block; }
    .cd-delta-ok { background:#dcfce7; color:#15803d; }
    .cd-delta-error { background:#fee2e2; color:#b91c1c; }
    
    /* Botón de descarga */
    .cd-btn-descargar { display:flex; align-items:center; justify-content:center; gap:8px; width:calc(100% - 24px); margin:16px 12px; padding:12px; background:#0284c7; color:#fff; border:none; border-radius:10px; font-size:14px; font-weight:700; cursor:pointer; box-shadow:0 4px 6px -1px rgba(2,132,199,0.2); transition:all 0.2s; }
    .cd-btn-descargar:active { transform:scale(0.98); background:#0369a1; }
  `;
  document.head.appendChild(s);
})();

// ══ Variables de Estado Global ═══════════════════════════════════════
let _cdFechaAct = new Date().toISOString().split('T')[0];
const _cdConceptosGastos = ["Alquiler Diario", "Luz / Energía", "Internet / Teléfono", "Transporte / Fletes", "Limpieza / Cafetería", "Mantenimiento", "Otros Gastos"];
const _cdDenominaciones = [
  { v: 100, t: 'Billetes $100' }, { v: 50, t: 'Billetes $50' }, { v: 20, t: 'Billetes $20' },
  { v: 10, t: 'Billetes $10' }, { v: 5, t: 'Billetes $5' }, { v: 1, t: 'Billetes $1' },
  { v: 1.00, t: 'Monedas $1.00' }, { v: 0.25, t: 'Monedas $0.25' }, { v: 0.10, t: 'Monedas $0.10' },
  { v: 0.05, t: 'Monedas $0.05' }, { v: 0.01, t: 'Monedas $0.01' }
];

// ══ Inicialización Principal ═════════════════════════════════════════
async function _cdIniciar(contenedorId) {
  const container = document.getElementById(contenedorId);
  if (!container) return;

  container.innerHTML = `
    <div id="pgCierreDia">
      <div class="cd-hero">
        <div class="cd-hero-top">
          <div class="cd-hero-title">Cierre de Caja</div>
          <input type="date" id="cdInpFecha" class="cd-fecha-inp" value="${_cdFechaAct}">
        </div>
        
        <div class="cd-nav-container">
          <button class="cd-nav-btn active" onclick="_cdCambiarSeccion('resumen', this)">📋 Resumen</button>
          <button class="cd-nav-btn" onclick="_cdCambiarSeccion('ventas', this)">💰 Ventas</button>
          <button class="cd-nav-btn" onclick="_cdCambiarSeccion('cambios', this)">🔄 Cambios</button>
          <button class="cd-nav-btn" onclick="_cdCambiarSeccion('gastos', this)">📉 Gastos</button>
          <button class="cd-nav-btn" onclick="_cdCambiarSeccion('caja', this)">🏦 Caja Fis.</button>
        </div>
      </div>

      <div id="sec_resumen" class="cd-subventana active">
        <div class="cd-card-title">📊 Resumen General del Día</div>
        <table class="cd-tabla">
          <tr><td>(+) Total Ventas Brutas</td><td style="text-align:right; font-weight:700;" id="lblResVentas">$0.00</td></tr>
          <tr><td>(-) Total Cambios del Día</td><td style="text-align:right; color:#b91c1c;" id="lblResCambios">$0.00</td></tr>
          <tr><td>(-) Total Gastos Operativos</td><td style="text-align:right; color:#b91c1c;" id="lblResGastos">$0.00</td></tr>
          <tr class="cd-total-row"><td>(=) Total Neto Esperado en Caja</td><td style="text-align:right; color:#0369a1;" id="lblResNeto">$0.00</td></tr>
          <tr><td>(=) Total Efectivo Físico Real</td><td style="text-align:right; font-weight:700;" id="lblResFisico">$0.00</td></tr>
          <tr style="border-top:2px solid #cbd5e1;">
            <td><strong>Diferencia (Físico vs Esperado)</strong></td>
            <td style="text-align:right;" id="lblResDelta"><span class="cd-badge-delta cd-delta-ok">$0.00</span></td>
          </tr>
        </table>
        
        <div class="cd-card-title" style="margin-top:20px;">📌 Control de Alquiler Acumulado</div>
        <table class="cd-tabla">
          <tr><td>Alquiler Acumulado Ayer</td><td><input type="number" id="inpAlqAyer" class="cd-inp cd-inp-read" readonly value="0.00"></td></tr>
          <tr><td>(+) Alquiler Aplicado Hoy</td><td><input type="number" id="inpAlqHoy" class="cd-inp cd-inp-read" readonly value="0.00"></td></tr>
          <tr class="cd-total-row"><td>(=) Alquiler Acumulado Total</td><td style="text-align:right; padding-right:12px;" id="lblAlqTotal">$0.00</td></tr>
        </table>
      </div>

      <div id="sec_ventas" class="cd-subventana">
        <div class="cd-card-title">💰 Desglose de Ventas del Sistema</div>
        <table class="cd-tabla">
          <thead><tr><th>Método de Venta / Canal</th><th style="width:120px;">Monto ($)</th></tr></thead>
          <tbody id="tbVentasCuerpo">
            <tr><td>Ventas de Mostrador (Efectivo)</td><td><input type="number" id="inpVentaMostrador" class="cd-inp cd-v-calc" value="0.00" step="0.01"></td></tr>
            <tr><td>Ventas Digitales / Tarjeta</td><td><input type="number" id="inpVentaDigital" class="cd-inp cd-v-calc" value="0.00" step="0.01"></td></tr>
            <tr><td>Otros Ingresos de Caja</td><td><input type="number" id="inpVentaOtros" class="cd-inp cd-v-calc" value="0.00" step="0.01"></td></tr>
            <tr class="cd-total-row"><td>Total Bruto</td><td id="lblTotalVentasBrutas" style="text-align:right; padding-right:12px; font-weight:700;">$0.00</td></tr>
          </tbody>
        </table>
      </div>

      <div id="sec_cambios" class="cd-subventana">
        <div class="cd-card-title">🔄 Registro de Cambios Aplicados</div>
        <table class="cd-tabla">
          <thead><tr><th>Descripción / Concepto del Cambio</th><th style="width:120px;">Monto ($)</th></tr></thead>
          <tbody id="tbCambiosCuerpo">
            </tbody>
        </table>
      </div>

      <div id="sec_gastos" class="cd-subventana">
        <div class="cd-card-title">📉 Salidas de Dinero y Gastos</div>
        <table class="cd-tabla">
          <thead><tr><th>Concepto Autorizado</th><th style="width:120px;">Monto ($)</th></tr></thead>
          <tbody id="tbGastosCuerpo">
            </tbody>
        </table>
      </div>

      <div id="sec_caja" class="cd-subventana">
        <div class="cd-card-title">🏦 Arqueo y Saldo de Caja Físico</div>
        <div style="margin-bottom:14px; padding:10px; background:#f0f9ff; border-radius:8px; border:1px solid #bae6fd;">
          <label style="font-size:12px; font-weight:700; color:#0369a1; display:block; margin-bottom:4px;">Caja Día de Ayer ($):</label>
          <input type="number" id="inpCajaAyer" class="cd-inp" value="0.00" step="0.01" style="border-color:#0284c7; font-size:14px;">
        </div>
        <table class="cd-tabla">
          <thead><tr><th>Denominación</th><th style="width:80px;">Cant.</th><th style="width:100px; text-align:right;">Subtotal</th></tr></thead>
          <tbody id="tbCajaCuerpo">
            </tbody>
        </table>
      </div>

      <button class="cd-btn-descargar" onclick="_cdDescargarReporteImagen()">
        📸 Descargar Reporte en Imagen
      </button>
    </div>
  `;

  _cdConstruirFormulariosDinamicos();
  _cdAsignarEventosGoblales();
  await _cdCargarDatosDelDia();
}
window._cdIniciar = _cdIniciar;

// ══ Navegación entre Subventanas ═════════════════════════════════════
function _cdCambiarSeccion(seccionId, boton) {
  document.querySelectorAll('.cd-nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.cd-subventana').forEach(s => s.classList.remove('active'));
  
  if (boton) boton.classList.add('active');
  const targetSec = document.getElementById('sec_' + seccionId);
  if (targetSec) targetSec.classList.add('active');
}
window._cdCambiarSeccion = _cdCambiarSeccion;

// ══ Construcción Dinámica de Renglones ═══════════════════════════════
function _cdConstruirFormulariosDinamicos() {
  const tbCambios = document.getElementById('tbCambiosCuerpo');
  tbCambios.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    tbCambios.innerHTML += `
      <tr>
        <td><input type="text" id="inpCambioDesc_${i}" class="cd-inp" placeholder="Ej. Cambio producto defectuoso..."></td>
        <td><input type="number" id="inpCambioMonto_${i}" class="cd-inp cd-c-calc" value="0.00" step="0.01"></td>
      </tr>
    `;
  }
  tbCambios.innerHTML += `<tr class="cd-total-row"><td>Total Cambios</td><td id="lblTotalCambios" style="text-align:right; padding-right:12px;">$0.00</td></tr>`;

  const tbGastos = document.getElementById('tbGastosCuerpo');
  tbGastos.innerHTML = '';
  _cdConceptosGastos.forEach((concepto, idx) => {
    tbGastos.innerHTML += `
      <tr>
        <td style="font-weight:600; color:#475569;">${concepto}</td>
        <td><input type="number" id="inpGasto_${idx}" class="cd-inp cd-g-calc" value="0.00" step="0.01"></td>
      </tr>
    `;
  });
  tbGastos.innerHTML += `<tr class="cd-total-row"><td>Total Gastos</td><td id="lblTotalGastos" style="text-align:right; padding-right:12px;">$0.00</td></tr>`;

  const tbCaja = document.getElementById('tbCajaCuerpo');
  tbCaja.innerHTML = '';
  _cdDenominaciones.forEach((d, idx) => {
    tbCaja.innerHTML += `
      <tr>
        <td>${d.t}</td>
        <td><input type="number" id="inpDenomCant_${idx}" class="cd-inp cd-denom-input" value="0" min="0" style="text-align:center;"></td>
        <td id="lblDenomSub_${idx}" style="text-align:right; font-weight:700; color:#334155;">$0.00</td>
      </tr>
    `;
  });
  tbCaja.innerHTML += `<tr class="cd-total-row"><td colspan="2">Total Efectivo Fis.</td><td id="lblTotalEfectivoFis" style="text-align:right;">$0.00</td></tr>`;
}

// ══ Gestión de Eventos e Hilos de Entrada ════════════════════════════
function _cdAsignarEventosGoblales() {
  document.getElementById('cdInpFecha').addEventListener('change', async (e) => {
    _cdFechaAct = e.target.value;
    await _cdCargarDatosDelDia();
  });

  document.querySelectorAll('.cd-v-calc, .cd-c-calc, .cd-g-calc').forEach(inp => {
    inp.addEventListener('input', () => { _cdCalcularYGuardarTodo(); });
  });

  document.querySelectorAll('.cd-denom-input').forEach(inp => {
    inp.addEventListener('input', () => {
      _cdCalcularEfectivoFisico();
      _cdCalcularYGuardarTodo();
    });
  });

  // CAMBIO CORREGIDO: Al escribir en Caja de Ayer, se guarda y se recalcula instantáneamente el alquiler acumulado
  document.getElementById('inpCajaAyer').addEventListener('input', async (e) => {
    const val = parseFloat(e.target.value) || 0;
    await _cdSbSave(_cdFechaAct + '_caja_ayer', val);
    await _cdCalcularAlquilerYTotales(); 
  });

  for (let i = 1; i <= 5; i++) {
    document.getElementById(`inpCambioDesc_${i}`).addEventListener('change', async (e) => {
      await _cdSbSave(`${_cdFechaAct}_cambio_desc_${i}`, e.target.value);
    });
  }
}

// ══ Motores de Cálculo y Lógica Financiera ═══════════════════════════
function _cdCalcularEfectivoFisico() {
  let totalFisico = 0;
  _cdDenominaciones.forEach((d, idx) => {
    const cant = parseInt(document.getElementById(`inpDenomCant_${idx}`).value) || 0;
    const sub = cant * d.v;
    totalFisico += sub;
    document.getElementById(`lblDenomSub_${idx}`).innerText = `$${sub.toFixed(2)}`;
  });
  document.getElementById('lblTotalEfectivoFis').innerText = `$${totalFisico.toFixed(2)}`;
  return totalFisico;
}

async function _cdCalcularAlquilerYTotales() {
  const cajaAyer = parseFloat(document.getElementById('inpCajaAyer').value) || 0;
  document.getElementById('inpAlqAyer').value = cajaAyer.toFixed(2);

  const alqHoy = parseFloat(document.getElementById('inpGasto_0').value) || 0;
  document.getElementById('inpAlqHoy').value = alqHoy.toFixed(2);

  const alqTotal = cajaAyer + alqHoy;
  document.getElementById('lblAlqTotal').innerText = `$${alqTotal.toFixed(2)}`;

  let totalVentas = 0;
  totalVentas += parseFloat(document.getElementById('inpVentaMostrador').value) || 0;
  totalVentas += parseFloat(document.getElementById('inpVentaDigital').value) || 0;
  totalVentas += parseFloat(document.getElementById('inpVentaOtros').value) || 0;
  document.getElementById('lblTotalVentasBrutas').innerText = `$${totalVentas.toFixed(2)}`;

  let totalCambios = 0;
  for (let i = 1; i <= 5; i++) {
    totalCambios += parseFloat(document.getElementById(`inpCambioMonto_${i}`).value) || 0;
  }
  document.getElementById('lblTotalCambios').innerText = `$${totalCambios.toFixed(2)}`;

  let totalGastos = 0;
  _cdConceptosGastos.forEach((_, idx) => {
    totalGastos += parseFloat(document.getElementById(`inpGasto_${idx}`).value) || 0;
  });
  document.getElementById('lblTotalGastos').innerText = `$${totalGastos.toFixed(2)}`;

  const netoEsperado = totalVentas - totalCambios - totalGastos;
  const efectivoFisico = _cdCalcularEfectivoFisico();
  const delta = efectivoFisico - netoEsperado;

  document.getElementById('lblResVentas').innerText = `$${totalVentas.toFixed(2)}`;
  document.getElementById('lblResCambios').innerText = `$${totalCambios.toFixed(2)}`;
  document.getElementById('lblResGastos').innerText = `$${totalGastos.toFixed(2)}`;
  document.getElementById('lblResNeto').innerText = `$${netoEsperado.toFixed(2)}`;
  document.getElementById('lblResFisico').innerText = `$${efectivoFisico.toFixed(2)}`;

  const resDelta = document.getElementById('lblResDelta');
  if (Math.abs(delta) < 0.02) {
    resDelta.innerHTML = `<span class="cd-badge-delta cd-delta-ok">Caja Cuadrada ($${delta.toFixed(2)})</span>`;
  } else if (delta > 0) {
    resDelta.innerHTML = `<span class="cd-badge-delta cd-delta-ok">Sobrante: +$${delta.toFixed(2)}</span>`;
  } else {
    resDelta.innerHTML = `<span class="cd-badge-delta cd-delta-error">Faltante: $${delta.toFixed(2)}</span>`;
  }
}

async function _cdCalcularYGuardarTodo() {
  await _cdCalcularAlquilerYTotales();

  const datosPaquete = {
    vMostrador: parseFloat(document.getElementById('inpVentaMostrador').value) || 0,
    vDigital: parseFloat(document.getElementById('inpVentaDigital').value) || 0,
    vOtros: parseFloat(document.getElementById('inpVentaOtros').value) || 0,
    cambios: Array.from({length:5}, (_,i) => parseFloat(document.getElementById(`inpCambioMonto_${i+1}`).value) || 0),
    gastos: _cdConceptosGastos.map((_,idx) => parseFloat(document.getElementById(`inpGasto_${idx}`).value) || 0),
    denominaciones: _cdDenominaciones.map((_,idx) => parseInt(document.getElementById(`inpDenomCant_${idx}`).value) || 0)
  };

  await _cdSbSave(_cdFechaAct + '_datos_cierre', datosPaquete);
}

// ══ Recuperación de Datos Dinámicos ═════════════════════════════════
async function _cdCargarDatosDelDia() {
  const cajaAyer = await _cdSbLoad(_cdFechaAct + '_caja_ayer') || 0;
  document.getElementById('inpCajaAyer').value = parseFloat(cajaAyer).toFixed(2);

  for (let i = 1; i <= 5; i++) {
    const desc = await _cdSbLoad(`${_cdFechaAct}_cambio_desc_${i}`) || '';
    document.getElementById(`inpCambioDesc_${i}`).value = desc;
  }

  const paquete = await _cdSbLoad(_cdFechaAct + '_datos_cierre');
  if (paquete) {
    document.getElementById('inpVentaMostrador').value = paquete.vMostrador || 0;
    document.getElementById('inpVentaDigital').value = paquete.vDigital || 0;
    document.getElementById('inpVentaOtros').value = paquete.vOtros || 0;

    if (paquete.cambios) {
      paquete.cambios.forEach((monto, i) => {
        const input = document.getElementById(`inpCambioMonto_${i+1}`);
        if (input) input.value = monto;
      });
    }
    if (paquete.gastos) {
      paquete.gastos.forEach((monto, idx) => {
        const input = document.getElementById(`inpGasto_${idx}`);
        if (input) input.value = monto;
      });
    }
    if (paquete.denominaciones) {
      paquete.denominaciones.forEach((cant, idx) => {
        const input = document.getElementById(`inpDenomCant_${idx}`);
        if (input) input.value = cant;
      });
    }
  } else {
    document.getElementById('inpVentaMostrador').value = '0.00';
    document.getElementById('inpVentaDigital').value = '0.00';
    document.getElementById('inpVentaOtros').value = '0.00';
    for (let i = 1; i <= 5; i++) document.getElementById(`inpCambioMonto_${i}`).value = '0.00';
    _cdConceptosGastos.forEach((_, idx) => document.getElementById(`inpGasto_${idx}`).value = '0.00');
    _cdDenominaciones.forEach((_, idx) => document.getElementById(`inpDenomCant_${idx}`).value = '0');
  }

  await _cdCalcularAlquilerYTotales();
}

// ══ Storage Engine (Supabase + Local Cache Fallback) ═════════════════
async function _cdSbSave(clave, valor) {
  const tiendaId = typeof _getTiendaId === 'function' ? _getTiendaId() : 'local';
  const id = tiendaId + '_' + clave;
  try {
    if (typeof _sbPost === 'function') {
      await _sbPost('cierre_diario', {
        id, tienda_id: tiendaId, fecha: clave,
        datos: JSON.stringify({ clave, valor, ts: Date.now() }),
        updated_at: new Date