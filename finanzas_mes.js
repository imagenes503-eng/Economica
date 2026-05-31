// =====================================================================
//  📦 MÓDULO DE PROVEEDORES — Despensa Económica
//
//  SECCIONES:
//  🛒 Preventas  — días en que el proveedor pasa a tomar pedido
//  🚚 Entregas   — días en que el proveedor trae el producto
//  💾 Persistencia 100% localStorage
// =====================================================================

(function _inyectarEstilosProveedores() {
  if (document.getElementById('proveedoresStyles')) return;
  const s = document.createElement('style');
  s.id = 'proveedoresStyles';
  s.textContent = `

    #pgFinanzasMes { padding: 0 0 90px 0; }

    /* ══ HERO ════════════════════════════════════════════════════════ */
    .pv-hero {
      background: linear-gradient(145deg, #020d07 0%, #052e16 45%, #0a3d20 75%, #14532d 100%);
      padding: 24px 18px 22px;
      margin-bottom: 20px;
      position: relative;
      overflow: hidden;
    }
    .pv-hero::before {
      content: '';
      position: absolute;
      top: -40px; right: -40px;
      width: 180px; height: 180px;
      background: radial-gradient(circle, rgba(134,239,172,0.12) 0%, transparent 70%);
      pointer-events: none;
    }
    .pv-hero::after {
      content: '';
      position: absolute;
      bottom: -30px; left: -20px;
      width: 140px; height: 140px;
      background: radial-gradient(circle, rgba(22,163,74,0.1) 0%, transparent 70%);
      pointer-events: none;
    }
    .pv-hero-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 18px;
      position: relative; z-index: 1;
    }
    .pv-hero-eyebrow {
      font-size: 10px;
      font-weight: 900;
      color: #4ade80;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-family: Nunito, sans-serif;
      margin-bottom: 5px;
    }
    .pv-hero-title {
      font-size: 22px;
      font-weight: 900;
      color: #fff;
      font-family: Nunito, sans-serif;
      line-height: 1.15;
      letter-spacing: -0.3px;
    }
    .pv-hero-sub {
      font-size: 12px;
      font-weight: 700;
      color: rgba(255,255,255,0.5);
      font-family: Nunito, sans-serif;
      margin-top: 4px;
    }

    /* ── Stat cards ── */
    .pv-stats-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      position: relative; z-index: 1;
    }
    @media (min-width: 480px) { .pv-stats-row { grid-template-columns: repeat(4, 1fr); } }
    .pv-stat-card {
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.13);
      border-radius: 16px;
      padding: 14px 13px;
      backdrop-filter: blur(10px);
      transition: background 0.2s;
    }
    .pv-stat-card:hover { background: rgba(255,255,255,0.11); }
    .pv-stat-label {
      font-size: 9px;
      font-weight: 900;
      color: rgba(255,255,255,0.5);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      font-family: Nunito, sans-serif;
      margin-bottom: 6px;
    }
    .pv-stat-val {
      font-size: 26px;
      font-weight: 900;
      font-family: Nunito, sans-serif;
      line-height: 1;
    }
    .pv-stat-val.verde   { color: #86efac; }
    .pv-stat-val.azul    { color: #93c5fd; }
    .pv-stat-val.naranja { color: #fcd34d; }
    .pv-stat-val.blanco  { color: #fff; }
    .pv-stat-sub {
      font-size: 10px;
      font-weight: 700;
      color: rgba(255,255,255,0.38);
      font-family: Nunito, sans-serif;
      margin-top: 4px;
    }

    /* ══ CUERPO ═══════════════════════════════════════════════════════ */
    .pv-body {
      padding: 0 14px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* ── Alerta día de hoy ── */
    .pv-hoy-card {
      border-radius: 16px;
      padding: 0;
      overflow: hidden;
      border: 1.5px solid;
    }
    .pv-hoy-card.verde  { border-color: #bbf7d0; background: linear-gradient(135deg,#f0fdf4,#dcfce7); }
    .pv-hoy-card.gris   { border-color: #e2e8f0; background: var(--surface2,#f8fafc); }
    .pv-hoy-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 13px 15px 10px;
    }
    .pv-hoy-icon-wrap {
      width: 36px; height: 36px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; flex-shrink: 0;
    }
    .pv-hoy-icon-wrap.verde  { background: #dcfce7; }
    .pv-hoy-icon-wrap.gris   { background: #f1f5f9; }
    .pv-hoy-title {
      font-size: 13px;
      font-weight: 900;
      font-family: Nunito, sans-serif;
    }
    .pv-hoy-title.verde { color: #14532d; }
    .pv-hoy-title.gris  { color: var(--text-muted,#64748b); }
    .pv-hoy-sub {
      font-size: 11px;
      font-weight: 700;
      font-family: Nunito, sans-serif;
      color: var(--text-muted,#64748b);
      margin-top: 1px;
    }
    .pv-hoy-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 0 15px 13px;
    }
    .pv-hoy-chip {
      display: flex; align-items: center; gap: 5px;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 900;
      font-family: Nunito, sans-serif;
    }
    .pv-hoy-chip.prev { background:#dbeafe; color:#1e40af; border:1px solid #bfdbfe; }
    .pv-hoy-chip.entr { background:#fef3c7; color:#92400e; border:1px solid #fde68a; }

    /* ══ PANEL GENÉRICO ═══════════════════════════════════════════════ */
    .pv-panel {
      border-radius: 20px;
      overflow: hidden;
      border: 1.5px solid var(--border,#e2e8f0);
      background: var(--surface2,#f8fafc);
      box-shadow: 0 2px 12px rgba(0,0,0,0.05);
    }
    .pv-panel-header {
      display: flex;
      align-items: center;
      gap: 11px;
      padding: 15px 17px 14px;
      background: var(--surface,#fff);
      border-bottom: 1.5px solid var(--border,#e2e8f0);
    }
    .pv-panel-icon-wrap {
      width: 38px; height: 38px;
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; flex-shrink: 0;
    }
    .pv-panel-icon-wrap.azul    { background: #dbeafe; }
    .pv-panel-icon-wrap.naranja { background: #fef3c7; }
    .pv-panel-icon-wrap.verde   { background: #dcfce7; }
    .pv-panel-titles { flex: 1; }
    .pv-panel-title {
      font-size: 15px;
      font-weight: 900;
      color: var(--text,#0f172a);
      font-family: Nunito, sans-serif;
      line-height: 1.1;
    }
    .pv-panel-desc {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-muted,#64748b);
      font-family: Nunito, sans-serif;
      margin-top: 2px;
    }
    .pv-count-badge {
      min-width: 26px; height: 26px;
      padding: 0 8px;
      border-radius: 30px;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 900;
      font-family: Nunito, sans-serif;
    }
    .pv-count-badge.azul    { background:#dbeafe; color:#1e40af; border:1px solid #bfdbfe; }
    .pv-count-badge.naranja { background:#fef3c7; color:#92400e; border:1px solid #fde68a; }
    .pv-panel-body { padding: 16px 17px; }

    /* ── Formulario ── */
    .pv-form-grid {
      display: grid;
      gap: 13px;
      margin-bottom: 14px;
    }
    .pv-field label {
      display: block;
      font-size: 10px;
      font-weight: 900;
      color: var(--text-muted,#64748b);
      text-transform: uppercase;
      letter-spacing: 0.6px;
      font-family: Nunito, sans-serif;
      margin-bottom: 6px;
    }
    .pv-inp {
      width: 100%;
      padding: 12px 14px;
      border: 1.5px solid var(--border,#e2e8f0);
      border-radius: 12px;
      font-size: 15px;
      font-weight: 700;
      font-family: Nunito, sans-serif;
      color: var(--text,#0f172a);
      background: var(--surface,#fff);
      box-sizing: border-box;
      outline: none;
      transition: border-color .2s, box-shadow .2s;
    }
    .pv-inp:focus { border-color:#16a34a; box-shadow:0 0 0 3px rgba(22,163,74,.1); }
    .pv-inp.azul:focus   { border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,.1); }
    .pv-inp.naranja:focus { border-color:#f59e0b; box-shadow:0 0 0 3px rgba(245,158,11,.1); }
    .pv-inp.edit-azul    { border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,.08); }
    .pv-inp.edit-naranja { border-color:#f59e0b; box-shadow:0 0 0 3px rgba(245,158,11,.08); }

    /* ── Días pill buttons ── */
    .pv-dias-wrap { display: flex; flex-direction: column; gap: 7px; }
    .pv-dias-label {
      font-size: 10px;
      font-weight: 900;
      color: var(--text-muted,#64748b);
      text-transform: uppercase;
      letter-spacing: 0.6px;
      font-family: Nunito, sans-serif;
    }
    .pv-dias-row {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
    }
    .pv-dia-pill {
      padding: 8px 15px;
      border-radius: 40px;
      border: 2px solid var(--border,#e2e8f0);
      background: var(--surface,#fff);
      font-size: 12px;
      font-weight: 900;
      font-family: Nunito, sans-serif;
      color: var(--text-muted,#94a3b8);
      cursor: pointer;
      transition: all .15s;
      user-select: none;
      letter-spacing: 0.2px;
    }
    .pv-dia-pill:hover { border-color: #94a3b8; color: var(--text,#0f172a); }

    /* Activo azul (preventas) */
    .pv-dia-pill.on-azul {
      background: linear-gradient(135deg,#3b82f6,#2563eb);
      border-color: #2563eb;
      color: #fff;
      box-shadow: 0 3px 10px rgba(59,130,246,.35);
    }
    /* Activo naranja (entregas) */
    .pv-dia-pill.on-naranja {
      background: linear-gradient(135deg,#f59e0b,#d97706);
      border-color: #d97706;
      color: #fff;
      box-shadow: 0 3px 10px rgba(245,158,11,.35);
    }
    /* Edición azul */
    .pv-dia-pill.edit-azul {
      background: linear-gradient(135deg,#60a5fa,#3b82f6);
      border-color: #3b82f6;
      color: #fff;
      box-shadow: 0 3px 10px rgba(59,130,246,.25);
      opacity: 0.85;
    }
    /* Edición naranja */
    .pv-dia-pill.edit-naranja {
      background: linear-gradient(135deg,#fbbf24,#f59e0b);
      border-color: #f59e0b;
      color: #fff;
      box-shadow: 0 3px 10px rgba(245,158,11,.25);
      opacity: 0.85;
    }

    /* ── Botones de acción principal ── */
    .btn-pv {
      width: 100%;
      padding: 13px;
      border: none;
      border-radius: 14px;
      font-size: 14px;
      font-weight: 900;
      font-family: Nunito, sans-serif;
      cursor: pointer;
      transition: all .15s;
      letter-spacing: 0.2px;
    }
    .btn-pv:hover { transform: translateY(-1px); }
    .btn-pv:active { transform: translateY(0); }

    .btn-pv-azul {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: #fff;
      box-shadow: 0 4px 14px rgba(59,130,246,.35);
    }
    .btn-pv-azul:hover { box-shadow: 0 6px 20px rgba(59,130,246,.45); }

    .btn-pv-naranja {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: #fff;
      box-shadow: 0 4px 14px rgba(245,158,11,.35);
    }
    .btn-pv-naranja:hover { box-shadow: 0 6px 20px rgba(245,158,11,.45); }

    .btn-pv-edit-azul {
      background: linear-gradient(135deg, #60a5fa, #3b82f6);
      color: #fff;
      box-shadow: 0 4px 14px rgba(96,165,250,.3);
    }
    .btn-pv-edit-naranja {
      background: linear-gradient(135deg, #fbbf24, #f59e0b);
      color: #fff;
      box-shadow: 0 4px 14px rgba(251,191,36,.3);
    }

    .btn-pv-ghost {
      width: 100%;
      padding: 11px;
      background: transparent;
      color: var(--text-muted,#64748b);
      border: 1.5px solid var(--border,#e2e8f0);
      border-radius: 14px;
      font-size: 13px;
      font-weight: 900;
      font-family: Nunito, sans-serif;
      cursor: pointer;
      transition: all .15s;
      margin-top: 7px;
    }
    .btn-pv-ghost:hover { border-color:#94a3b8; background: var(--surface,#fff); }

    /* ── Banner edición ── */
    .pv-edit-banner {
      display: flex; align-items: center; gap: 9px;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 12px; font-weight: 900;
      font-family: Nunito, sans-serif;
      margin-bottom: 13px;
    }
    .pv-edit-banner.azul    { background:#eff6ff; border:1.5px solid #bfdbfe; color:#1e40af; }
    .pv-edit-banner.naranja { background:#fffbeb; border:1.5px solid #fde68a; color:#92400e; }

    /* ══ TABLA ═════════════════════════════════════════════════════ */
    .pv-table-scroll { overflow-x: auto; }
    table.pv-tbl {
      width: 100%;
      border-collapse: collapse;
      font-family: Nunito, sans-serif;
    }
    table.pv-tbl thead tr { background: var(--surface,#fff); }
    table.pv-tbl thead th {
      padding: 10px 14px;
      font-size: 10px;
      font-weight: 900;
      color: var(--text-muted,#94a3b8);
      text-transform: uppercase;
      letter-spacing: 0.7px;
      text-align: left;
      border-bottom: 2px solid var(--border,#e2e8f0);
      white-space: nowrap;
    }
    table.pv-tbl thead th:last-child { text-align: right; }
    table.pv-tbl tbody tr {
      border-bottom: 1px solid var(--border,#f1f5f9);
      transition: background .1s;
    }
    table.pv-tbl tbody tr:last-child { border-bottom: none; }
    table.pv-tbl tbody tr:hover { background: rgba(0,0,0,0.02); }
    table.pv-tbl tbody tr.editing { background: #f8faff; }
    table.pv-tbl tbody td {
      padding: 13px 14px;
      font-size: 13px;
      font-weight: 700;
      color: var(--text,#0f172a);
      vertical-align: middle;
    }
    table.pv-tbl tbody td:last-child { text-align: right; white-space: nowrap; }

    /* ── Celda nombre con avatar ── */
    .pv-cell-nombre {
      display: flex; align-items: center; gap: 11px;
    }
    .pv-avatar {
      width: 36px; height: 36px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 900;
      font-family: Nunito, sans-serif;
      color: #fff; flex-shrink: 0;
      text-transform: uppercase;
    }
    .pv-avatar.azul    { background: linear-gradient(135deg,#3b82f6,#1d4ed8); }
    .pv-avatar.naranja { background: linear-gradient(135deg,#f59e0b,#b45309); }
    .pv-nombre-main {
      font-size: 14px; font-weight: 900;
      color: var(--text,#0f172a);
      font-family: Nunito, sans-serif;
    }
    .pv-nombre-editing-tag {
      font-size: 9px; font-weight: 900;
      text-transform: uppercase; letter-spacing: 0.5px;
      font-family: Nunito, sans-serif;
      margin-top: 2px;
    }
    .pv-nombre-editing-tag.azul    { color: #3b82f6; }
    .pv-nombre-editing-tag.naranja { color: #f59e0b; }

    /* ── Chips de días en tabla ── */
    .pv-chips-row { display: flex; flex-wrap: wrap; gap: 5px; }
    .pv-chip {
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px; font-weight: 900;
      font-family: Nunito, sans-serif;
    }
    .pv-chip.azul    { background:#dbeafe; color:#1e40af; border:1px solid #bfdbfe; }
    .pv-chip.naranja { background:#fef3c7; color:#92400e; border:1px solid #fde68a; }

    /* ── Botones edit/del en tabla ── */
    .btn-tbl {
      padding: 6px 12px;
      border-radius: 9px;
      font-size: 11px; font-weight: 900;
      font-family: Nunito, sans-serif;
      cursor: pointer;
      transition: all .12s;
      border: 1.5px solid;
    }
    .btn-tbl-edit-azul {
      background: #eff6ff; color: #1d4ed8;
      border-color: #bfdbfe;
      margin-right: 5px;
    }
    .btn-tbl-edit-azul:hover { background: #dbeafe; }
    .btn-tbl-edit-naranja {
      background: #fffbeb; color: #92400e;
      border-color: #fde68a;
      margin-right: 5px;
    }
    .btn-tbl-edit-naranja:hover { background: #fef3c7; }
    .btn-tbl-del {
      background: #fef2f2; color: #991b1b;
      border-color: #fecaca;
    }
    .btn-tbl-del:hover { background: #fee2e2; }

    /* ── Empty state ── */
    .pv-empty {
      padding: 30px 20px;
      text-align: center;
      font-size: 13px; font-weight: 700;
      color: var(--text-muted,#94a3b8);
      font-family: Nunito, sans-serif;
    }
    .pv-empty-icon { font-size: 30px; margin-bottom: 8px; }

    /* ── Separador de sección ── */
    .pv-section-sep {
      display: flex; align-items: center; gap: 10px;
      margin: 4px 0 14px;
    }
    .pv-section-sep span {
      font-size: 10px; font-weight: 900;
      text-transform: uppercase; letter-spacing: 0.8px;
      font-family: Nunito, sans-serif;
      color: var(--text-muted,#94a3b8);
      white-space: nowrap;
    }
    .pv-section-sep::before, .pv-section-sep::after {
      content: ''; flex: 1;
      height: 1px; background: var(--border,#e2e8f0);
    }
  `;
  document.head.appendChild(s);
})();

// ══════════════════════════════════════════════════════════════════════
//  CONSTANTES & ESTADO
// ══════════════════════════════════════════════════════════════════════

const _PV_DIAS       = ['Lunes','Martes','Miércoles','Jueves','Viernes'];
const _PV_ABREV      = { Lunes:'Lun', Martes:'Mar', 'Miércoles':'Mié', Jueves:'Jue', Viernes:'Vie' };
const _PV_LS_PREV    = 'vpos_preventas';
const _PV_LS_ENTR    = 'vpos_entregas';

let _pvPreventas     = [];   // { id, nombre, dias[] }
let _pvEntregas      = [];
let _pvEditPrevId    = null;
let _pvEditEntrId    = null;
let _pvDiasPrev      = new Set();
let _pvDiasEntr      = new Set();

// ══════════════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════════════

const _pvUID  = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const _pvHoy  = () => ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][new Date().getDay()];
const _pvInit = n => {
  const w = (n||'').trim().split(' ');
  return w.length >= 2 ? (w[0][0]+w[1][0]).toUpperCase() : (n||'??').slice(0,2).toUpperCase();
};
const _pvNormId = dia => 'pvDPill_' + dia.replace(/[^a-zA-Z]/g,'');

// ══════════════════════════════════════════════════════════════════════
//  PERSISTENCIA
// ══════════════════════════════════════════════════════════════════════

function _pvCargar() {
  try {
    _pvPreventas = JSON.parse(localStorage.getItem(_PV_LS_PREV)||'[]');
    _pvEntregas  = JSON.parse(localStorage.getItem(_PV_LS_ENTR)||'[]');
  } catch { _pvPreventas = []; _pvEntregas = []; }
}
function _pvGuardar() {
  localStorage.setItem(_PV_LS_PREV, JSON.stringify(_pvPreventas));
  localStorage.setItem(_PV_LS_ENTR, JSON.stringify(_pvEntregas));
}

// ══════════════════════════════════════════════════════════════════════
//  TOGGLE DÍAS — manejado con clase CSS sin re-render completo
// ══════════════════════════════════════════════════════════════════════

function _pvTogglePrevDia(dia) {
  const editing = !!_pvEditPrevId;
  const clsOn   = editing ? 'edit-azul' : 'on-azul';
  const el = document.getElementById(_pvNormId(dia) + '_prev');
  if (!el) return;
  if (_pvDiasPrev.has(dia)) {
    _pvDiasPrev.delete(dia);
    el.classList.remove('on-azul','edit-azul');
  } else {
    _pvDiasPrev.add(dia);
    el.classList.remove('on-azul','edit-azul');
    el.classList.add(clsOn);
  }
}
function _pvToggleEntrDia(dia) {
  const editing = !!_pvEditEntrId;
  const clsOn   = editing ? 'edit-naranja' : 'on-naranja';
  const el = document.getElementById(_pvNormId(dia) + '_entr');
  if (!el) return;
  if (_pvDiasEntr.has(dia)) {
    _pvDiasEntr.delete(dia);
    el.classList.remove('on-naranja','edit-naranja');
  } else {
    _pvDiasEntr.add(dia);
    el.classList.remove('on-naranja','edit-naranja');
    el.classList.add(clsOn);
  }
}

// ══════════════════════════════════════════════════════════════════════
//  ACCIONES — PREVENTAS
// ══════════════════════════════════════════════════════════════════════

function _pvGuardarPrev() {
  const inp = document.getElementById('pvPrevNombre');
  const nombre = inp?.value?.trim();
  if (!nombre) { if(typeof toast==='function') toast('Escribe el nombre del proveedor', true); inp?.focus(); return; }
  const dias = [..._pvDiasPrev];
  if (!dias.length) { if(typeof toast==='function') toast('Selecciona al menos un día', true); return; }
  const dup = _pvPreventas.some(p => p.nombre.toLowerCase()===nombre.toLowerCase() && p.id!==_pvEditPrevId);
  if (dup) { if(typeof toast==='function') toast('Ya existe un proveedor con ese nombre', true); return; }

  if (_pvEditPrevId) {
    const i = _pvPreventas.findIndex(p => p.id===_pvEditPrevId);
    if (i !== -1) { _pvPreventas[i].nombre = nombre; _pvPreventas[i].dias = dias; }
    _pvEditPrevId = null;
    if(typeof toast==='function') toast('✓ Proveedor actualizado');
  } else {
    _pvPreventas.push({ id:_pvUID(), nombre, dias });
    if(typeof toast==='function') toast(`✓ "${nombre}" registrado en Preventas`);
  }
  _pvDiasPrev = new Set();
  _pvGuardar();
  _pvRefreshPrev();
}

function _pvEditarPrev(id) {
  const p = _pvPreventas.find(x => x.id===id);
  if (!p) return;
  _pvEditPrevId = id;
  _pvDiasPrev = new Set(p.dias);
  document.getElementById('pvFormPrevPanel')?.scrollIntoView({ behavior:'smooth', block:'start' });
  _pvRefreshPrev();
  setTimeout(() => { const el = document.getElementById('pvPrevNombre'); if(el){el.focus();el.select();} }, 80);
}

function _pvCancelarPrev() {
  _pvEditPrevId = null;
  _pvDiasPrev = new Set();
  _pvRefreshPrev();
}

function _pvBorrarPrev(id) {
  const p = _pvPreventas.find(x => x.id===id);
  if (!p || !confirm(`¿Eliminar "${p.nombre}" de Preventas?`)) return;
  _pvPreventas = _pvPreventas.filter(x => x.id!==id);
  if (_pvEditPrevId===id) { _pvEditPrevId=null; _pvDiasPrev=new Set(); }
  _pvGuardar();
  _pvRefreshPrev();
  if(typeof toast==='function') toast('🗑 Proveedor eliminado de Preventas');
}

// ══════════════════════════════════════════════════════════════════════
//  ACCIONES — ENTREGAS
// ══════════════════════════════════════════════════════════════════════

function _pvGuardarEntr() {
  const inp = document.getElementById('pvEntrNombre');
  const nombre = inp?.value?.trim();
  if (!nombre) { if(typeof toast==='function') toast('Escribe el nombre del proveedor', true); inp?.focus(); return; }
  const dias = [..._pvDiasEntr];
  if (!dias.length) { if(typeof toast==='function') toast('Selecciona al menos un día', true); return; }
  const dup = _pvEntregas.some(p => p.nombre.toLowerCase()===nombre.toLowerCase() && p.id!==_pvEditEntrId);
  if (dup) { if(typeof toast==='function') toast('Ya existe un proveedor con ese nombre', true); return; }

  if (_pvEditEntrId) {
    const i = _pvEntregas.findIndex(p => p.id===_pvEditEntrId);
    if (i !== -1) { _pvEntregas[i].nombre = nombre; _pvEntregas[i].dias = dias; }
    _pvEditEntrId = null;
    if(typeof toast==='function') toast('✓ Proveedor actualizado');
  } else {
    _pvEntregas.push({ id:_pvUID(), nombre, dias });
    if(typeof toast==='function') toast(`✓ "${nombre}" registrado en Entregas`);
  }
  _pvDiasEntr = new Set();
  _pvGuardar();
  _pvRefreshEntr();
}

function _pvEditarEntr(id) {
  const p = _pvEntregas.find(x => x.id===id);
  if (!p) return;
  _pvEditEntrId = id;
  _pvDiasEntr = new Set(p.dias);
  document.getElementById('pvFormEntrPanel')?.scrollIntoView({ behavior:'smooth', block:'start' });
  _pvRefreshEntr();
  setTimeout(() => { const el = document.getElementById('pvEntrNombre'); if(el){el.focus();el.select();} }, 80);
}

function _pvCancelarEntr() {
  _pvEditEntrId = null;
  _pvDiasEntr = new Set();
  _pvRefreshEntr();
}

function _pvBorrarEntr(id) {
  const p = _pvEntregas.find(x => x.id===id);
  if (!p || !confirm(`¿Eliminar "${p.nombre}" de Entregas?`)) return;
  _pvEntregas = _pvEntregas.filter(x => x.id!==id);
  if (_pvEditEntrId===id) { _pvEditEntrId=null; _pvDiasEntr=new Set(); }
  _pvGuardar();
  _pvRefreshEntr();
  if(typeof toast==='function') toast('🗑 Proveedor eliminado de Entregas');
}

// ══════════════════════════════════════════════════════════════════════
//  BUILDERS DE HTML REUTILIZABLES
// ══════════════════════════════════════════════════════════════════════

function _pvBuildDiasPills(set, tipo) {
  // tipo: 'prev' | 'entr'
  const editing = tipo==='prev' ? !!_pvEditPrevId : !!_pvEditEntrId;
  const clsOn   = editing ? `edit-${tipo==='prev'?'azul':'naranja'}` : `on-${tipo==='prev'?'azul':'naranja'}`;
  return _PV_DIAS.map(dia => {
    const active = set.has(dia);
    return `<button
      type="button"
      id="${_pvNormId(dia)}_${tipo}"
      class="pv-dia-pill ${active ? clsOn : ''}"
      onclick="_pvToggle${tipo==='prev'?'Prev':'Entr'}Dia('${dia}')">
      ${_PV_ABREV[dia]}
    </button>`;
  }).join('');
}

function _pvBuildForm(tipo) {
  const isPrev  = tipo === 'prev';
  const color   = isPrev ? 'azul' : 'naranja';
  const editId  = isPrev ? _pvEditPrevId  : _pvEditEntrId;
  const diasSet = isPrev ? _pvDiasPrev    : _pvDiasEntr;
  const lista   = isPrev ? _pvPreventas   : _pvEntregas;
  const editing = !!editId;
  const prov    = editing ? lista.find(p=>p.id===editId) : null;
  const inpId   = isPrev ? 'pvPrevNombre' : 'pvEntrNombre';
  const fnSave  = isPrev ? '_pvGuardarPrev' : '_pvGuardarEntr';
  const fnCancel= isPrev ? '_pvCancelarPrev' : '_pvCancelarEntr';
  const btnClass= editing ? `btn-pv-edit-${color}` : `btn-pv-${color}`;
  const btnTxt  = editing ? '✅ Guardar cambios' : '➕ Registrar Proveedor';

  return `
    ${editing ? `
      <div class="pv-edit-banner ${color}">
        ✏️ Editando: <strong style="margin-left:4px;">${prov?.nombre}</strong>
      </div>` : ''}

    <div class="pv-form-grid">
      <div class="pv-field">
        <label>Nombre del Proveedor</label>
        <input
          class="pv-inp ${editing ? 'edit-'+color : ''}"
          type="text"
          id="${inpId}"
          placeholder="Ej: Distribuidora García"
          value="${prov?.nombre||''}"
          maxlength="60"
          onkeydown="if(event.key==='Enter')${fnSave}()">
      </div>
      <div class="pv-dias-wrap">
        <span class="pv-dias-label">Días</span>
        <div class="pv-dias-row">
          ${_pvBuildDiasPills(diasSet, tipo)}
        </div>
      </div>
    </div>

    <button class="btn-pv ${btnClass}" onclick="${fnSave}()">${btnTxt}</button>
    ${editing ? `<button class="btn-pv-ghost" onclick="${fnCancel}()">✕ Cancelar edición</button>` : ''}
  `;
}

function _pvBuildTabla(lista, tipo) {
  const isPrev = tipo === 'prev';
  const color  = isPrev ? 'azul' : 'naranja';
  const fnEdit = isPrev ? '_pvEditarPrev' : '_pvEditarEntr';
  const fnDel  = isPrev ? '_pvBorrarPrev' : '_pvBorrarEntr';
  const editId = isPrev ? _pvEditPrevId   : _pvEditEntrId;

  if (!lista.length) return `
    <div class="pv-empty">
      <div class="pv-empty-icon">${isPrev ? '📋' : '🚚'}</div>
      Sin proveedores registrados aún
    </div>`;

  return `
    <div class="pv-table-scroll">
      <table class="pv-tbl">
        <thead><tr>
          <th>Proveedor</th>
          <th>Días Programados</th>
          <th>Acciones</th>
        </tr></thead>
        <tbody>
          ${lista.map(p => {
            const isEditing = p.id === editId;
            return `<tr class="${isEditing?'editing':''}">
              <td>
                <div class="pv-cell-nombre">
                  <div class="pv-avatar ${color}">${_pvInit(p.nombre)}</div>
                  <div>
                    <div class="pv-nombre-main">${p.nombre}</div>
                    ${isEditing ? `<div class="pv-nombre-editing-tag ${color}">✏ Editando…</div>` : ''}
                  </div>
                </div>
              </td>
              <td>
                <div class="pv-chips-row">
                  ${p.dias.map(d => `<span class="pv-chip ${color}">${_PV_ABREV[d]||d}</span>`).join('')}
                </div>
              </td>
              <td>
                <button class="btn-tbl btn-tbl-edit-${color}" onclick="${fnEdit}('${p.id}')">✏ Editar</button>
                <button class="btn-tbl btn-tbl-del"            onclick="${fnDel}('${p.id}')">🗑</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

// ══════════════════════════════════════════════════════════════════════
//  REFRESH PARCIALES
// ══════════════════════════════════════════════════════════════════════

function _pvRefreshPrev() {
  const fWrap = document.getElementById('pvFormPrevWrap');
  const tWrap = document.getElementById('pvTablaPrevWrap');
  const badge = document.getElementById('pvPrevBadge');
  if (fWrap) fWrap.innerHTML = _pvBuildForm('prev');
  if (tWrap) tWrap.innerHTML = _pvBuildTabla(_pvPreventas, 'prev');
  if (badge) badge.textContent = _pvPreventas.length;
  _pvRefreshStats();
  _pvRefreshHoy();
}
function _pvRefreshEntr() {
  const fWrap = document.getElementById('pvFormEntrWrap');
  const tWrap = document.getElementById('pvTablaEntrWrap');
  const badge = document.getElementById('pvEntrBadge');
  if (fWrap) fWrap.innerHTML = _pvBuildForm('entr');
  if (tWrap) tWrap.innerHTML = _pvBuildTabla(_pvEntregas, 'entr');
  if (badge) badge.textContent = _pvEntregas.length;
  _pvRefreshStats();
  _pvRefreshHoy();
}

function _pvRefreshStats() {
  const dias = ['Lunes','Martes','Miércoles','Jueves','Viernes'];
  let maxPrev=0, maxEntr=0;
  dias.forEach(d => {
    const cp = _pvPreventas.filter(p=>p.dias.includes(d)).length;
    const ce = _pvEntregas.filter(p=>p.dias.includes(d)).length;
    if(cp>maxPrev) maxPrev=cp;
    if(ce>maxEntr) maxEntr=ce;
  });
  const s1 = document.getElementById('pvStat1');
  const s2 = document.getElementById('pvStat2');
  const s3 = document.getElementById('pvStat3');
  const s4 = document.getElementById('pvStat4');
  if(s1) s1.textContent = _pvPreventas.length;
  if(s2) s2.textContent = _pvEntregas.length;
  if(s3) s3.textContent = maxPrev;
  if(s4) s4.textContent = maxEntr;
}

function _pvRefreshHoy() {
  const wrap = document.getElementById('pvHoyWrap');
  if (!wrap) return;
  const diaHoy = _pvHoy();
  const esFinde = diaHoy==='Sábado'||diaHoy==='Domingo';
  const prevHoy = esFinde ? [] : _pvPreventas.filter(p=>p.dias.includes(diaHoy));
  const entrHoy = esFinde ? [] : _pvEntregas.filter(p=>p.dias.includes(diaHoy));
  const sinNada  = !prevHoy.length && !entrHoy.length;
  const clr = (!esFinde && (prevHoy.length||entrHoy.length)) ? 'verde' : 'gris';

  wrap.innerHTML = `
    <div class="pv-hoy-card ${clr}">
      <div class="pv-hoy-header">
        <div class="pv-hoy-icon-wrap ${clr}">${esFinde?'🌿':sinNada?'✅':'📦'}</div>
        <div>
          <div class="pv-hoy-title ${clr}">Hoy es ${diaHoy}</div>
          <div class="pv-hoy-sub">${
            esFinde ? 'Fin de semana — sin actividad de proveedores'
            : sinNada ? 'Sin preventas ni entregas programadas para hoy'
            : 'Proveedores programados para hoy'
          }</div>
        </div>
      </div>
      ${(!esFinde && (prevHoy.length||entrHoy.length)) ? `
      <div class="pv-hoy-chips">
        ${prevHoy.map(p=>`<span class="pv-hoy-chip prev">🛒 ${p.nombre}</span>`).join('')}
        ${entrHoy.map(p=>`<span class="pv-hoy-chip entr">🚚 ${p.nombre}</span>`).join('')}
      </div>` : ''}
    </div>`;
}

// ══════════════════════════════════════════════════════════════════════
//  RENDER PRINCIPAL
// ══════════════════════════════════════════════════════════════════════

function renderFinanzasMes(pgId) {
  pgId = pgId || 'pgFinanzasMes';
  const pg = document.getElementById(pgId);
  if (!pg) return;

  _pvCargar();
  _pvEditPrevId = null;
  _pvEditEntrId = null;
  _pvDiasPrev   = new Set();
  _pvDiasEntr   = new Set();

  const dias = ['Lunes','Martes','Miércoles','Jueves','Viernes'];
  let maxPrev=0, maxEntr=0;
  dias.forEach(d => {
    maxPrev = Math.max(maxPrev, _pvPreventas.filter(p=>p.dias.includes(d)).length);
    maxEntr = Math.max(maxEntr, _pvEntregas.filter(p=>p.dias.includes(d)).length);
  });

  pg.innerHTML = `

    <!-- ══ HERO ══════════════════════════════════════════════════════ -->
    <div class="pv-hero">
      <div class="pv-hero-top">
        <div>
          <div class="pv-hero-eyebrow">Control de proveedores</div>
          <div class="pv-hero-title">📦 Agenda de Proveedores</div>
          <div class="pv-hero-sub">Preventas y entregas por día de la semana</div>
        </div>
      </div>
      <div class="pv-stats-row">
        <div class="pv-stat-card">
          <div class="pv-stat-label">🛒 Preventas</div>
          <div class="pv-stat-val azul" id="pvStat1">${_pvPreventas.length}</div>
          <div class="pv-stat-sub">Proveedores</div>
        </div>
        <div class="pv-stat-card">
          <div class="pv-stat-label">🚚 Entregas</div>
          <div class="pv-stat-val naranja" id="pvStat2">${_pvEntregas.length}</div>
          <div class="pv-stat-sub">Proveedores</div>
        </div>
        <div class="pv-stat-card">
          <div class="pv-stat-label">📅 Max/día prev.</div>
          <div class="pv-stat-val verde" id="pvStat3">${maxPrev}</div>
          <div class="pv-stat-sub">Preventas</div>
        </div>
        <div class="pv-stat-card">
          <div class="pv-stat-label">📅 Max/día entr.</div>
          <div class="pv-stat-val blanco" id="pvStat4">${maxEntr}</div>
          <div class="pv-stat-sub">Entregas</div>
        </div>
      </div>
    </div>

    <div class="pv-body">

      <!-- ── Alerta de hoy ── -->
      <div id="pvHoyWrap"></div>

      <!-- ════════════════════════════════════════════════
           SECCIÓN 1 — PREVENTAS (azul)
      ═════════════════════════════════════════════════ -->

      <!-- Formulario preventas -->
      <div class="pv-panel" id="pvFormPrevPanel">
        <div class="pv-panel-header">
          <div class="pv-panel-icon-wrap azul">🛒</div>
          <div class="pv-panel-titles">
            <div class="pv-panel-title">Preventas</div>
            <div class="pv-panel-desc">Días en que el proveedor pasa a tomar pedido</div>
          </div>
        </div>
        <div class="pv-panel-body">
          <div id="pvFormPrevWrap"></div>
        </div>
      </div>

      <!-- Tabla preventas -->
      <div class="pv-panel">
        <div class="pv-panel-header">
          <div class="pv-panel-icon-wrap azul">📋</div>
          <div class="pv-panel-titles">
            <div class="pv-panel-title">Proveedores — Preventas</div>
          </div>
          <span class="pv-count-badge azul" id="pvPrevBadge">${_pvPreventas.length}</span>
        </div>
        <div id="pvTablaPrevWrap"></div>
      </div>

      <!-- ════════════════════════════════════════════════
           SECCIÓN 2 — ENTREGAS (naranja)
      ═════════════════════════════════════════════════ -->

      <!-- Formulario entregas -->
      <div class="pv-panel" id="pvFormEntrPanel">
        <div class="pv-panel-header">
          <div class="pv-panel-icon-wrap naranja">🚚</div>
          <div class="pv-panel-titles">
            <div class="pv-panel-title">Entregas</div>
            <div class="pv-panel-desc">Días en que el proveedor trae el producto</div>
          </div>
        </div>
        <div class="pv-panel-body">
          <div id="pvFormEntrWrap"></div>
        </div>
      </div>

      <!-- Tabla entregas -->
      <div class="pv-panel">
        <div class="pv-panel-header">
          <div class="pv-panel-icon-wrap naranja">📋</div>
          <div class="pv-panel-titles">
            <div class="pv-panel-title">Proveedores — Entregas</div>
          </div>
          <span class="pv-count-badge naranja" id="pvEntrBadge">${_pvEntregas.length}</span>
        </div>
        <div id="pvTablaEntrWrap"></div>
      </div>

    </div>
  `;

  // Render dinámico
  document.getElementById('pvFormPrevWrap').innerHTML = _pvBuildForm('prev');
  document.getElementById('pvTablaPrevWrap').innerHTML = _pvBuildTabla(_pvPreventas, 'prev');
  document.getElementById('pvFormEntrWrap').innerHTML  = _pvBuildForm('entr');
  document.getElementById('pvTablaEntrWrap').innerHTML = _pvBuildTabla(_pvEntregas, 'entr');
  _pvRefreshHoy();
}
