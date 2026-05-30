// =====================================================================
//  🏭 MÓDULO DE PROVEEDORES — Despensa Económica
//
//  FUNCIONALIDADES:
//  ✅ Registrar proveedores con nombre y días de pago (Lun–Vie)
//  ✅ Editar y eliminar proveedores
//  ✅ Registrar retiros por proveedor
//  ✅ Persistencia 100% en localStorage (vpos_proveedores / vpos_retiros)
// =====================================================================

// ── Inyección de estilos ──────────────────────────────────────────────
(function _inyectarEstilosProveedores() {
  if (document.getElementById('proveedoresStyles')) return;
  const s = document.createElement('style');
  s.id = 'proveedoresStyles';
  s.textContent = `

    /* ══════════════════════════════════════
       LAYOUT GENERAL
    ══════════════════════════════════════ */
    #pgFinanzasMes { padding: 0 0 80px 0; }

    /* ── Hero ── */
    .pv-hero {
      background: linear-gradient(135deg, #052e16 0%, #14532d 60%, #166534 100%);
      padding: 22px 18px 20px;
      margin-bottom: 18px;
    }
    .pv-hero-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .pv-hero-title {
      font-size: 20px;
      font-weight: 900;
      color: #fff;
      font-family: Nunito, sans-serif;
      display: flex;
      align-items: center;
      gap: 9px;
      line-height: 1.2;
    }
    .pv-hero-sub {
      font-size: 12px;
      font-weight: 700;
      color: rgba(255,255,255,0.65);
      font-family: Nunito, sans-serif;
      margin-top: 3px;
    }

    /* ── Stat cards en hero ── */
    .pv-stats-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    @media (min-width: 560px) {
      .pv-stats-row { grid-template-columns: repeat(3, 1fr); }
    }
    .pv-stat-card {
      background: rgba(255,255,255,0.11);
      border: 1.5px solid rgba(255,255,255,0.18);
      border-radius: 14px;
      padding: 13px 14px;
      backdrop-filter: blur(8px);
    }
    .pv-stat-label {
      font-size: 10px;
      font-weight: 900;
      color: rgba(255,255,255,0.6);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-family: Nunito, sans-serif;
      margin-bottom: 5px;
    }
    .pv-stat-val {
      font-size: 22px;
      font-weight: 900;
      color: #fff;
      font-family: Nunito, sans-serif;
      line-height: 1;
    }
    .pv-stat-val.verde  { color: #86efac; }
    .pv-stat-val.amarillo { color: #fde68a; }
    .pv-stat-sub {
      font-size: 11px;
      font-weight: 700;
      color: rgba(255,255,255,0.45);
      font-family: Nunito, sans-serif;
      margin-top: 3px;
    }

    /* ── Cuerpo principal ── */
    .pv-body {
      padding: 0 14px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    /* ── Panel genérico ── */
    .pv-panel {
      background: var(--surface2, #f8fafc);
      border: 1.5px solid var(--border, #e2e8f0);
      border-radius: 18px;
      overflow: hidden;
    }
    .pv-panel-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 13px 16px;
      border-bottom: 1.5px solid var(--border, #e2e8f0);
      background: var(--surface, #fff);
    }
    .pv-panel-icon {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 17px;
      flex-shrink: 0;
    }
    .pv-panel-title {
      font-size: 14px;
      font-weight: 900;
      color: var(--text, #0f172a);
      font-family: Nunito, sans-serif;
      flex: 1;
    }
    .pv-panel-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 24px;
      height: 24px;
      padding: 0 7px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 900;
      font-family: Nunito, sans-serif;
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #bbf7d0;
    }
    .pv-panel-body { padding: 16px; }

    /* ── Inputs ── */
    .pv-field { display: flex; flex-direction: column; gap: 5px; }
    .pv-field label {
      font-size: 10px;
      font-weight: 900;
      color: var(--text-muted, #64748b);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-family: Nunito, sans-serif;
    }
    .pv-inp {
      width: 100%;
      padding: 11px 13px;
      border: 1.5px solid var(--border, #e2e8f0);
      border-radius: 11px;
      font-size: 15px;
      font-weight: 700;
      font-family: Nunito, sans-serif;
      color: var(--text, #0f172a);
      background: var(--surface, #fff);
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .pv-inp:focus {
      border-color: #16a34a;
      box-shadow: 0 0 0 3px rgba(22,163,74,0.12);
    }
    .pv-inp.edit-mode {
      border-color: #f59e0b;
      box-shadow: 0 0 0 3px rgba(245,158,11,0.12);
    }
    .pv-inp-select {
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      padding-right: 34px;
    }

    /* ── Selector de días ── */
    .pv-dias-label {
      font-size: 10px;
      font-weight: 900;
      color: var(--text-muted, #64748b);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-family: Nunito, sans-serif;
      margin-bottom: 8px;
      display: block;
    }
    .pv-dias-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .pv-dia-btn {
      padding: 8px 14px;
      border-radius: 30px;
      border: 2px solid var(--border, #e2e8f0);
      background: var(--surface, #fff);
      font-size: 12px;
      font-weight: 900;
      font-family: Nunito, sans-serif;
      color: var(--text-muted, #64748b);
      cursor: pointer;
      transition: all 0.15s;
      user-select: none;
    }
    .pv-dia-btn:hover {
      border-color: #16a34a;
      color: #16a34a;
      background: #f0fdf4;
    }
    .pv-dia-btn.activo {
      background: linear-gradient(135deg, #16a34a, #15803d);
      border-color: #15803d;
      color: #fff;
      box-shadow: 0 2px 8px rgba(22,163,74,0.3);
    }
    .pv-dia-btn.edit-activo {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      border-color: #d97706;
      color: #fff;
      box-shadow: 0 2px 8px rgba(245,158,11,0.3);
    }

    /* ── Botones principales ── */
    .btn-pv-primary {
      width: 100%;
      padding: 13px;
      background: linear-gradient(135deg, #16a34a, #15803d);
      color: #fff;
      border: none;
      border-radius: 13px;
      font-size: 14px;
      font-weight: 900;
      font-family: Nunito, sans-serif;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(22,163,74,0.3);
      transition: all 0.15s;
      letter-spacing: 0.2px;
    }
    .btn-pv-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(22,163,74,0.4); }
    .btn-pv-primary:active { transform: translateY(0); }
    .btn-pv-primary.edit-mode {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      box-shadow: 0 4px 14px rgba(245,158,11,0.3);
    }
    .btn-pv-primary.edit-mode:hover { box-shadow: 0 6px 18px rgba(245,158,11,0.4); }

    .btn-pv-ghost {
      width: 100%;
      padding: 11px;
      background: transparent;
      color: var(--text-muted, #64748b);
      border: 1.5px solid var(--border, #e2e8f0);
      border-radius: 13px;
      font-size: 13px;
      font-weight: 900;
      font-family: Nunito, sans-serif;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-pv-ghost:hover { background: var(--surface, #f8fafc); border-color: #94a3b8; }

    /* ── Banner de modo edición ── */
    .pv-edit-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: #fffbeb;
      border: 1.5px solid #fde68a;
      border-radius: 11px;
      margin-bottom: 14px;
      font-size: 12px;
      font-weight: 900;
      font-family: Nunito, sans-serif;
      color: #92400e;
    }

    /* ── Tabla de proveedores ── */
    .pv-table-wrap {
      overflow-x: auto;
      border-radius: 0 0 14px 14px;
    }
    .pv-table {
      width: 100%;
      border-collapse: collapse;
      font-family: Nunito, sans-serif;
    }
    .pv-table thead tr {
      background: linear-gradient(135deg, #052e16, #14532d);
    }
    .pv-table thead th {
      padding: 11px 14px;
      font-size: 11px;
      font-weight: 900;
      color: rgba(255,255,255,0.85);
      text-transform: uppercase;
      letter-spacing: 0.6px;
      text-align: left;
      white-space: nowrap;
    }
    .pv-table thead th:last-child { text-align: center; }
    .pv-table tbody tr {
      border-bottom: 1px solid var(--border, #e2e8f0);
      transition: background 0.12s;
    }
    .pv-table tbody tr:last-child { border-bottom: none; }
    .pv-table tbody tr:hover { background: #f0fdf4; }
    .pv-table tbody td {
      padding: 12px 14px;
      font-size: 13px;
      font-weight: 700;
      color: var(--text, #0f172a);
      vertical-align: middle;
    }
    .pv-table tbody td:last-child { text-align: center; white-space: nowrap; }
    .pv-table-empty {
      padding: 28px 20px;
      text-align: center;
      font-size: 13px;
      font-weight: 700;
      color: var(--text-muted, #64748b);
      font-family: Nunito, sans-serif;
    }

    /* ── Nombre en tabla ── */
    .pv-nombre-cell {
      display: flex;
      align-items: center;
      gap: 9px;
    }
    .pv-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: linear-gradient(135deg, #16a34a, #059669);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 900;
      color: #fff;
      font-family: Nunito, sans-serif;
      flex-shrink: 0;
      text-transform: uppercase;
    }
    .pv-nombre-text {
      font-size: 14px;
      font-weight: 900;
      color: var(--text, #0f172a);
      font-family: Nunito, sans-serif;
    }

    /* ── Chips de días ── */
    .pv-dias-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }
    .pv-dia-chip {
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 900;
      font-family: Nunito, sans-serif;
      background: #dcfce7;
      color: #15803d;
      border: 1px solid #bbf7d0;
      white-space: nowrap;
    }

    /* ── Botones de acción en tabla ── */
    .btn-pv-edit {
      padding: 6px 11px;
      border: 1.5px solid #fde68a;
      background: #fffbeb;
      color: #92400e;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 900;
      font-family: Nunito, sans-serif;
      cursor: pointer;
      transition: all 0.12s;
      margin-right: 5px;
    }
    .btn-pv-edit:hover { background: #fef3c7; border-color: #f59e0b; }
    .btn-pv-del {
      padding: 6px 11px;
      border: 1.5px solid #fecaca;
      background: #fef2f2;
      color: #991b1b;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 900;
      font-family: Nunito, sans-serif;
      cursor: pointer;
      transition: all 0.12s;
    }
    .btn-pv-del:hover { background: #fee2e2; border-color: #f87171; }

    /* ── Sección retiros ── */
    .pv-retiro-form {
      display: grid;
      gap: 12px;
    }
    .pv-retiro-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    @media (max-width: 400px) {
      .pv-retiro-row { grid-template-columns: 1fr; }
    }

    /* ── Lista de retiros ── */
    .pv-retiro-list {
      max-height: 300px;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: #bbf7d0 transparent;
    }
    .pv-retiro-list::-webkit-scrollbar { width: 4px; }
    .pv-retiro-list::-webkit-scrollbar-thumb { background: #bbf7d0; border-radius: 10px; }

    .pv-retiro-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 11px 14px;
      border-bottom: 1px solid var(--border, #e2e8f0);
      font-family: Nunito, sans-serif;
      transition: background 0.12s;
    }
    .pv-retiro-item:last-child { border-bottom: none; }
    .pv-retiro-item:hover { background: #f0fdf4; }
    .pv-retiro-proveedor {
      font-size: 13px;
      font-weight: 900;
      color: var(--text, #0f172a);
      min-width: 80px;
    }
    .pv-retiro-nota {
      flex: 1;
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted, #64748b);
    }
    .pv-retiro-fecha {
      font-size: 11px;
      font-weight: 900;
      color: var(--text-muted, #64748b);
      white-space: nowrap;
    }
    .pv-retiro-monto {
      font-size: 14px;
      font-weight: 900;
      color: #dc2626;
      white-space: nowrap;
    }
    .btn-pv-retiro-del {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-muted, #94a3b8);
      font-size: 14px;
      padding: 3px 6px;
      border-radius: 6px;
      transition: all 0.1s;
    }
    .btn-pv-retiro-del:hover { background: rgba(220,38,38,0.1); color: #dc2626; }

    .pv-retiro-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 11px 14px;
      background: #fef2f2;
      border-top: 1.5px solid #fecaca;
      font-family: Nunito, sans-serif;
      border-radius: 0 0 14px 14px;
    }
    .pv-retiro-total span:first-child {
      font-size: 12px;
      font-weight: 900;
      color: #991b1b;
    }
    .pv-retiro-total span:last-child {
      font-size: 16px;
      font-weight: 900;
      color: #dc2626;
    }

    /* ── Divider / separador de sección ── */
    .pv-sep {
      font-size: 11px;
      font-weight: 900;
      color: var(--text-muted, #64748b);
      text-transform: uppercase;
      letter-spacing: 0.6px;
      font-family: Nunito, sans-serif;
      padding: 6px 0 8px;
      border-bottom: 1.5px solid var(--border, #e2e8f0);
      margin-bottom: 12px;
    }

    /* ── Días de la semana en la fila de hoy ── */
    .pv-hoy-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 14px;
      background: linear-gradient(135deg,#f0fdf4,#dcfce7);
      border: 1.5px solid #bbf7d0;
      border-radius: 13px;
      margin-bottom: 4px;
      font-family: Nunito, sans-serif;
    }
    .pv-hoy-icon { font-size: 20px; flex-shrink: 0; }
    .pv-hoy-text { flex: 1; }
    .pv-hoy-title {
      font-size: 13px;
      font-weight: 900;
      color: #14532d;
      margin-bottom: 4px;
    }
    .pv-hoy-provs {
      font-size: 12px;
      font-weight: 700;
      color: #15803d;
    }
    .pv-hoy-empty {
      font-size: 12px;
      font-weight: 700;
      color: #6b7280;
    }
  `;
  document.head.appendChild(s);
})();

// ══════════════════════════════════════════════════════════════════════
//  ESTADO
// ══════════════════════════════════════════════════════════════════════

let _pvProveedores = [];   // [{ id, nombre, dias:[] }]
let _pvRetiros     = [];   // [{ id, proveedorId, proveedorNombre, fecha, monto, nota }]
let _pvEditandoId  = null; // ID del proveedor en edición

const _PV_KEY_PROV    = 'vpos_proveedores';
const _PV_KEY_RETIROS = 'vpos_retiros';
const _PV_DIAS        = ['Lunes','Martes','Miércoles','Jueves','Viernes'];
const _PV_DIA_ABREV   = { 'Lunes':'Lun','Martes':'Mar','Miércoles':'Mié','Jueves':'Jue','Viernes':'Vie' };

// ══════════════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════════════

function _pvUID() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2,7);
}

function _pvFechaHoy() {
  return new Date().toISOString().split('T')[0];
}

function _pvFmtFecha(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}

function _pvDiaHoy() {
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  return dias[new Date().getDay()];
}

function _pvIniciales(nombre) {
  if (!nombre) return '?';
  const parts = nombre.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return nombre.slice(0, 2).toUpperCase();
}

// ══════════════════════════════════════════════════════════════════════
//  PERSISTENCIA localStorage
// ══════════════════════════════════════════════════════════════════════

function _pvCargar() {
  try {
    const rp = localStorage.getItem(_PV_KEY_PROV);
    const rr = localStorage.getItem(_PV_KEY_RETIROS);
    _pvProveedores = rp ? JSON.parse(rp) : [];
    _pvRetiros     = rr ? JSON.parse(rr) : [];
  } catch(e) {
    _pvProveedores = [];
    _pvRetiros = [];
  }
}

function _pvGuardar() {
  try {
    localStorage.setItem(_PV_KEY_PROV,    JSON.stringify(_pvProveedores));
    localStorage.setItem(_PV_KEY_RETIROS, JSON.stringify(_pvRetiros));
  } catch(e) { console.warn('[PV] Error guardando:', e); }
}

// ══════════════════════════════════════════════════════════════════════
//  DÍAS SELECCIONADOS (checkboxes visuales)
// ══════════════════════════════════════════════════════════════════════

// Conjunto de días activos en el formulario (guardado globalmente para
// que los botones puedan actualizar el estado sin rerenderizar todo).
let _pvDiasSeleccionados = new Set();

function _pvToggleDia(dia, editMode) {
  if (_pvDiasSeleccionados.has(dia)) {
    _pvDiasSeleccionados.delete(dia);
  } else {
    _pvDiasSeleccionados.add(dia);
  }
  // Actualizar UI del botón
  const btn = document.getElementById('pvDiaBtn_' + dia.replace('é','e').replace('é','e'));
  if (btn) {
    if (_pvDiasSeleccionados.has(dia)) {
      btn.classList.add(editMode ? 'edit-activo' : 'activo');
      btn.classList.remove(editMode ? 'activo' : 'edit-activo');
    } else {
      btn.classList.remove('activo', 'edit-activo');
    }
  }
}

function _pvDiasBtnId(dia) {
  // Normalizar tilde para usar como ID HTML
  return 'pvDiaBtn_' + dia.replace(/[áéíóúÁÉÍÓÚ]/g, c =>
    ({á:'a',é:'e',í:'i',ó:'o',ú:'u',Á:'A',É:'E',Í:'I',Ó:'O',Ú:'U'}[c]||c));
}

function _pvRenderDiasBtns(seleccionados, editMode) {
  return _PV_DIAS.map(dia => {
    const activo = seleccionados.includes(dia);
    const claseActivo = editMode ? 'edit-activo' : 'activo';
    return `<button
      type="button"
      id="${_pvDiasBtnId(dia)}"
      class="pv-dia-btn ${activo ? claseActivo : ''}"
      onclick="_pvToggleDia('${dia}', ${editMode})">
        ${_PV_DIA_ABREV[dia] || dia}
    </button>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════════════════
//  ACCIONES — PROVEEDORES
// ══════════════════════════════════════════════════════════════════════

function _pvAgregarProveedor() {
  const nombreEl = document.getElementById('pvNombreInp');
  const nombre = nombreEl?.value?.trim();

  if (!nombre) {
    if (typeof toast === 'function') toast('Escribe el nombre del proveedor', true);
    nombreEl?.focus();
    return;
  }

  const dias = [..._pvDiasSeleccionados];
  if (dias.length === 0) {
    if (typeof toast === 'function') toast('Selecciona al menos un día de pago', true);
    return;
  }

  // Verificar nombre duplicado
  const existe = _pvProveedores.some(p =>
    p.nombre.toLowerCase() === nombre.toLowerCase() && p.id !== _pvEditandoId
  );
  if (existe) {
    if (typeof toast === 'function') toast('Ya existe un proveedor con ese nombre', true);
    return;
  }

  if (_pvEditandoId) {
    // Modo edición
    const idx = _pvProveedores.findIndex(p => p.id === _pvEditandoId);
    if (idx !== -1) {
      _pvProveedores[idx].nombre = nombre;
      _pvProveedores[idx].dias   = dias;
      // Actualizar nombre en retiros existentes
      _pvRetiros.forEach(r => {
        if (r.proveedorId === _pvEditandoId) r.proveedorNombre = nombre;
      });
    }
    _pvEditandoId = null;
    if (typeof toast === 'function') toast('✓ Proveedor actualizado');
  } else {
    // Nuevo proveedor
    _pvProveedores.push({ id: _pvUID(), nombre, dias });
    if (typeof toast === 'function') toast(`✓ Proveedor "${nombre}" registrado`);
  }

  _pvGuardar();
  _pvDiasSeleccionados = new Set();
  _pvRenderTodo();
}

function _pvCancelarEdicion() {
  _pvEditandoId = null;
  _pvDiasSeleccionados = new Set();
  _pvRenderTodo();
}

function _pvIniciarEdicion(id) {
  const prov = _pvProveedores.find(p => p.id === id);
  if (!prov) return;

  _pvEditandoId = id;
  _pvDiasSeleccionados = new Set(prov.dias);

  // Scroll al formulario
  const panel = document.getElementById('pvFormPanel');
  if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

  _pvRenderTodo();

  // Poner foco en el input
  setTimeout(() => {
    const inp = document.getElementById('pvNombreInp');
    if (inp) { inp.focus(); inp.select(); }
  }, 100);
}

function _pvEliminarProveedor(id) {
  const prov = _pvProveedores.find(p => p.id === id);
  if (!prov) return;

  const tieneRetiros = _pvRetiros.some(r => r.proveedorId === id);
  const msg = tieneRetiros
    ? `¿Eliminar "${prov.nombre}"? Se borrarán también sus ${_pvRetiros.filter(r => r.proveedorId===id).length} retiro(s).`
    : `¿Eliminar al proveedor "${prov.nombre}"?`;

  if (!confirm(msg)) return;

  _pvProveedores = _pvProveedores.filter(p => p.id !== id);
  _pvRetiros     = _pvRetiros.filter(r => r.proveedorId !== id);

  if (_pvEditandoId === id) {
    _pvEditandoId = null;
    _pvDiasSeleccionados = new Set();
  }

  _pvGuardar();
  _pvRenderTodo();
  if (typeof toast === 'function') toast(`🗑 Proveedor eliminado`);
}

// ══════════════════════════════════════════════════════════════════════
//  ACCIONES — RETIROS
// ══════════════════════════════════════════════════════════════════════

function _pvRegistrarRetiro() {
  const provEl   = document.getElementById('pvRetiroProveedor');
  const montoEl  = document.getElementById('pvRetiroMonto');
  const notaEl   = document.getElementById('pvRetiroNota');
  const fechaEl  = document.getElementById('pvRetiroFecha');

  const provId   = provEl?.value;
  const monto    = parseFloat(montoEl?.value || '0');
  const nota     = notaEl?.value?.trim() || '';
  const fecha    = fechaEl?.value || _pvFechaHoy();

  if (!provId) {
    if (typeof toast === 'function') toast('Selecciona un proveedor', true);
    provEl?.focus();
    return;
  }
  if (!monto || monto <= 0) {
    if (typeof toast === 'function') toast('Ingresa un monto válido', true);
    montoEl?.focus();
    return;
  }

  const prov = _pvProveedores.find(p => p.id === provId);
  const retiro = {
    id: _pvUID(),
    proveedorId:     provId,
    proveedorNombre: prov?.nombre || '—',
    fecha,
    monto,
    nota,
  };

  _pvRetiros.unshift(retiro); // más reciente primero
  _pvGuardar();

  // Limpiar formulario de retiro
  if (provEl)  provEl.value  = '';
  if (montoEl) montoEl.value = '';
  if (notaEl)  notaEl.value  = '';
  if (fechaEl) fechaEl.value = _pvFechaHoy();

  _pvRenderRetiros();
  _pvRenderStats();
  if (typeof toast === 'function') toast(`✓ Retiro de $${monto.toFixed(2)} registrado`);
}

function _pvEliminarRetiro(id) {
  _pvRetiros = _pvRetiros.filter(r => r.id !== id);
  _pvGuardar();
  _pvRenderRetiros();
  _pvRenderStats();
  if (typeof toast === 'function') toast('🗑 Retiro eliminado');
}

// ══════════════════════════════════════════════════════════════════════
//  RENDER PARCIAL (sin reescribir todo el DOM)
// ══════════════════════════════════════════════════════════════════════

function _pvRenderStats() {
  const totalRetiros = _pvRetiros.reduce((s, r) => s + Number(r.monto || 0), 0);
  const el1 = document.getElementById('pvStatProveedores');
  const el2 = document.getElementById('pvStatRetiros');
  const el3 = document.getElementById('pvStatTotal');
  if (el1) el1.textContent = _pvProveedores.length;
  if (el2) el2.textContent = _pvRetiros.length;
  if (el3) el3.textContent = '$' + totalRetiros.toFixed(2);
}

function _pvRenderTabla() {
  const wrap = document.getElementById('pvTablaWrap');
  if (!wrap) return;

  if (_pvProveedores.length === 0) {
    wrap.innerHTML = `<div class="pv-table-empty">📭 Sin proveedores registrados aún</div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="pv-table-wrap">
      <table class="pv-table">
        <thead>
          <tr>
            <th>Proveedor</th>
            <th>Días de Pago</th>
            <th>Retiros</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${_pvProveedores.map(p => {
            const retirosProv = _pvRetiros.filter(r => r.proveedorId === p.id);
            const totalProv   = retirosProv.reduce((s, r) => s + Number(r.monto || 0), 0);
            const esEditando  = _pvEditandoId === p.id;
            return `
              <tr style="${esEditando ? 'background:#fffbeb;' : ''}">
                <td>
                  <div class="pv-nombre-cell">
                    <div class="pv-avatar" style="${esEditando ? 'background:linear-gradient(135deg,#f59e0b,#d97706);' : ''}">${_pvIniciales(p.nombre)}</div>
                    <div>
                      <div class="pv-nombre-text">${p.nombre}</div>
                      ${esEditando ? '<div style="font-size:10px;color:#92400e;font-weight:900;font-family:Nunito,sans-serif;">✏️ Editando…</div>' : ''}
                    </div>
                  </div>
                </td>
                <td>
                  <div class="pv-dias-chips">
                    ${p.dias.length > 0
                      ? p.dias.map(d => `<span class="pv-dia-chip">${_PV_DIA_ABREV[d] || d}</span>`).join('')
                      : '<span style="color:var(--text-muted);font-size:12px;">—</span>'
                    }
                  </div>
                </td>
                <td>
                  <div style="font-size:13px;font-weight:900;font-family:Nunito,sans-serif;">
                    ${retirosProv.length > 0
                      ? `<span style="color:#dc2626;">$${totalProv.toFixed(2)}</span>
                         <div style="font-size:11px;font-weight:700;color:var(--text-muted);">${retirosProv.length} retiro${retirosProv.length !== 1 ? 's' : ''}</div>`
                      : '<span style="color:var(--text-muted);font-size:12px;">Sin retiros</span>'
                    }
                  </div>
                </td>
                <td>
                  <button class="btn-pv-edit" onclick="_pvIniciarEdicion('${p.id}')">✏️ Editar</button>
                  <button class="btn-pv-del"  onclick="_pvEliminarProveedor('${p.id}')">🗑 Borrar</button>
                </td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;

  // Actualizar badge de conteo
  const badge = document.getElementById('pvTablaCountBadge');
  if (badge) badge.textContent = _pvProveedores.length;
}

function _pvRenderRetiros() {
  const list  = document.getElementById('pvRetirosList');
  const total = document.getElementById('pvRetirosTotal');
  const badge = document.getElementById('pvRetirosCountBadge');

  if (!list) return;

  const totalMonto = _pvRetiros.reduce((s, r) => s + Number(r.monto || 0), 0);
  if (total) total.textContent = '$' + totalMonto.toFixed(2);
  if (badge) badge.textContent = _pvRetiros.length;

  if (_pvRetiros.length === 0) {
    list.innerHTML = `<div class="pv-table-empty">📭 Sin retiros registrados</div>`;
    return;
  }

  list.innerHTML = _pvRetiros.map(r => `
    <div class="pv-retiro-item">
      <div style="font-size:18px;">💸</div>
      <div class="pv-retiro-proveedor">${r.proveedorNombre}</div>
      <div class="pv-retiro-nota">${r.nota || '—'}</div>
      <div class="pv-retiro-fecha">${_pvFmtFecha(r.fecha)}</div>
      <div class="pv-retiro-monto">−$${Number(r.monto).toFixed(2)}</div>
      <button class="btn-pv-retiro-del" onclick="_pvEliminarRetiro('${r.id}')" title="Eliminar">✕</button>
    </div>`).join('');
}

function _pvRenderFormulario() {
  const wrap = document.getElementById('pvFormWrap');
  if (!wrap) return;

  const editando = !!_pvEditandoId;
  const prov = editando ? _pvProveedores.find(p => p.id === _pvEditandoId) : null;
  const diasActivos = editando ? (prov?.dias || []) : [];

  // Sincronizar el set global
  if (editando) {
    _pvDiasSeleccionados = new Set(diasActivos);
  }

  wrap.innerHTML = `
    ${editando ? `
      <div class="pv-edit-banner">
        ✏️ Editando proveedor: <strong>${prov?.nombre}</strong>
      </div>` : ''}

    <div class="pv-field" style="margin-bottom:12px;">
      <label>${editando ? 'Nuevo nombre' : 'Nombre del Proveedor'}</label>
      <input
        class="pv-inp ${editando ? 'edit-mode' : ''}"
        type="text"
        id="pvNombreInp"
        placeholder="Ej: Distribuidora García"
        value="${prov?.nombre || ''}"
        maxlength="60"
        onkeydown="if(event.key==='Enter')_pvAgregarProveedor()">
    </div>

    <div style="margin-bottom:14px;">
      <span class="pv-dias-label">Días de Pago</span>
      <div class="pv-dias-grid">
        ${_pvRenderDiasBtns(diasActivos, editando)}
      </div>
    </div>

    <div style="display:grid;gap:8px;">
      <button class="btn-pv-primary ${editando ? 'edit-mode' : ''}" onclick="_pvAgregarProveedor()">
        ${editando ? '✅ Guardar cambios' : '➕ Registrar Proveedor'}
      </button>
      ${editando ? `<button class="btn-pv-ghost" onclick="_pvCancelarEdicion()">✕ Cancelar edición</button>` : ''}
    </div>`;
}

function _pvRenderHoyAlert() {
  const wrap = document.getElementById('pvHoyWrap');
  if (!wrap) return;
  const diaHoy = _pvDiaHoy();
  const hoy = _pvProveedores.filter(p => p.dias.includes(diaHoy));
  if (diaHoy === 'Sábado' || diaHoy === 'Domingo') {
    wrap.innerHTML = `
      <div class="pv-hoy-row">
        <div class="pv-hoy-icon">🌿</div>
        <div class="pv-hoy-text">
          <div class="pv-hoy-title">Hoy es ${diaHoy}</div>
          <div class="pv-hoy-empty">No hay proveedores programados para el fin de semana.</div>
        </div>
      </div>`;
    return;
  }
  wrap.innerHTML = `
    <div class="pv-hoy-row">
      <div class="pv-hoy-icon">${hoy.length > 0 ? '📦' : '✅'}</div>
      <div class="pv-hoy-text">
        <div class="pv-hoy-title">Proveedores de hoy — ${diaHoy}</div>
        ${hoy.length > 0
          ? `<div class="pv-hoy-provs">${hoy.map(p => '• ' + p.nombre).join('  ')}</div>`
          : `<div class="pv-hoy-empty">Sin proveedores programados para hoy.</div>`
        }
      </div>
    </div>`;
}

// Rerenderiza todo (formulario + tabla + retiros + stats + hoy)
function _pvRenderTodo() {
  _pvRenderFormulario();
  _pvRenderTabla();
  _pvRenderRetiros();
  _pvRenderStats();
  _pvRenderHoyAlert();
  // Actualizar select de proveedores en retiro
  const sel = document.getElementById('pvRetiroProveedor');
  if (sel) {
    const valorActual = sel.value;
    sel.innerHTML = `<option value="">— Seleccionar proveedor —</option>` +
      _pvProveedores.map(p => `<option value="${p.id}" ${p.id === valorActual ? 'selected' : ''}>${p.nombre}</option>`).join('');
  }
}

// ══════════════════════════════════════════════════════════════════════
//  RENDER PRINCIPAL
// ══════════════════════════════════════════════════════════════════════

function renderFinanzasMes(pgId) {
  pgId = pgId || 'pgFinanzasMes';
  const pg = document.getElementById(pgId);
  if (!pg) return;

  _pvCargar();
  _pvEditandoId = null;
  _pvDiasSeleccionados = new Set();

  const totalRetiros = _pvRetiros.reduce((s, r) => s + Number(r.monto || 0), 0);

  pg.innerHTML = `

    <!-- ══ HERO ══════════════════════════════════════════════════════ -->
    <div class="pv-hero">
      <div class="pv-hero-top">
        <div>
          <div class="pv-hero-title">🏭 Gestión de Proveedores</div>
          <div class="pv-hero-sub">Registro · Días de pago · Retiros</div>
        </div>
      </div>

      <div class="pv-stats-row">
        <div class="pv-stat-card">
          <div class="pv-stat-label">🏭 Proveedores</div>
          <div class="pv-stat-val verde" id="pvStatProveedores">${_pvProveedores.length}</div>
          <div class="pv-stat-sub">Registrados</div>
        </div>
        <div class="pv-stat-card">
          <div class="pv-stat-label">💸 Retiros</div>
          <div class="pv-stat-val amarillo" id="pvStatRetiros">${_pvRetiros.length}</div>
          <div class="pv-stat-sub">Totales</div>
        </div>
        <div class="pv-stat-card">
          <div class="pv-stat-label">💰 Total retirado</div>
          <div class="pv-stat-val" style="color:#fca5a5;" id="pvStatTotal">$${totalRetiros.toFixed(2)}</div>
          <div class="pv-stat-sub">Acumulado</div>
        </div>
      </div>
    </div>

    <!-- ══ CUERPO ══════════════════════════════════════════════════════ -->
    <div class="pv-body">

      <!-- ── Alerta de proveedores de HOY ── -->
      <div id="pvHoyWrap"></div>

      <!-- ── REGISTRO / EDICIÓN DE PROVEEDOR ── -->
      <div class="pv-panel" id="pvFormPanel">
        <div class="pv-panel-header">
          <div class="pv-panel-icon" style="background:#dcfce7;">🏭</div>
          <div class="pv-panel-title">Registrar Proveedor</div>
        </div>
        <div class="pv-panel-body">
          <div id="pvFormWrap"></div>
        </div>
      </div>

      <!-- ── TABLA DE PROVEEDORES ── -->
      <div class="pv-panel">
        <div class="pv-panel-header">
          <div class="pv-panel-icon" style="background:#dbeafe;">📋</div>
          <div class="pv-panel-title">Proveedores Registrados</div>
          <span class="pv-panel-badge" id="pvTablaCountBadge">${_pvProveedores.length}</span>
        </div>
        <div id="pvTablaWrap"></div>
      </div>

      <!-- ── RETIROS ── -->
      <div class="pv-panel">
        <div class="pv-panel-header">
          <div class="pv-panel-icon" style="background:#fee2e2;">💸</div>
          <div class="pv-panel-title">Retiros</div>
          <span class="pv-panel-badge" style="background:#fee2e2;color:#991b1b;border-color:#fecaca;" id="pvRetirosCountBadge">${_pvRetiros.length}</span>
        </div>
        <div class="pv-panel-body">

          <div class="pv-sep">Nuevo retiro</div>
          <div class="pv-retiro-form">
            <div class="pv-retiro-row">
              <div class="pv-field">
                <label>Proveedor</label>
                <select class="pv-inp pv-inp-select" id="pvRetiroProveedor">
                  <option value="">— Seleccionar proveedor —</option>
                  ${_pvProveedores.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('')}
                </select>
              </div>
              <div class="pv-field">
                <label>Monto ($)</label>
                <input class="pv-inp" type="number" id="pvRetiroMonto" min="0.01" step="0.01" placeholder="0.00">
              </div>
            </div>
            <div class="pv-retiro-row">
              <div class="pv-field">
                <label>Fecha</label>
                <input class="pv-inp" type="date" id="pvRetiroFecha" value="${_pvFechaHoy()}">
              </div>
              <div class="pv-field">
                <label>Nota (opcional)</label>
                <input class="pv-inp" type="text" id="pvRetiroNota" placeholder="Ej: pago semanal…" maxlength="80">
              </div>
            </div>
            <button class="btn-pv-primary" onclick="_pvRegistrarRetiro()">
              💸 Registrar Retiro
            </button>
          </div>

          <div style="margin-top:16px;">
            <div class="pv-sep">Historial de retiros</div>
            <div class="pv-retiro-list" id="pvRetirosList"></div>
            <div class="pv-retiro-total">
              <span>Total acumulado en retiros</span>
              <span id="pvRetirosTotal">$${totalRetiros.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  `;

  // Render de partes dinámicas
  _pvRenderFormulario();
  _pvRenderTabla();
  _pvRenderRetiros();
  _pvRenderHoyAlert();
}
