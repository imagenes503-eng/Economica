// =====================================================================
//  📦 AGENDA DE PROVEEDORES — Despensa Económica
//  Un solo formulario · Días de pedido y entrega (Lun–Dom)
//  Persistencia 100% localStorage — clave: vpos_agenda_proveedores
// =====================================================================

(function _estilosAgendaProv() {
  if (document.getElementById('agendaProvStyles')) return;
  const s = document.createElement('style');
  s.id = 'agendaProvStyles';
  s.textContent = `

    #pgFinanzasMes { padding: 0 0 90px 0; }

    /* ══ HERO ═══════════════════════════════════════════════════════ */
    .ap-hero {
      background: linear-gradient(145deg, #020d07 0%, #052e16 45%, #0a3d20 75%, #14532d 100%);
      padding: 24px 18px 22px;
      margin-bottom: 20px;
      position: relative;
      overflow: hidden;
    }
    .ap-hero::before {
      content:''; position:absolute;
      top:-50px; right:-50px;
      width:200px; height:200px;
      background:radial-gradient(circle,rgba(134,239,172,.13) 0%,transparent 70%);
      pointer-events:none;
    }
    .ap-hero::after {
      content:''; position:absolute;
      bottom:-40px; left:-30px;
      width:160px; height:160px;
      background:radial-gradient(circle,rgba(22,163,74,.09) 0%,transparent 70%);
      pointer-events:none;
    }
    .ap-hero-inner { position:relative; z-index:1; }
    .ap-hero-eyebrow {
      font-size:10px; font-weight:900;
      color:#4ade80; text-transform:uppercase;
      letter-spacing:1.6px; font-family:Nunito,sans-serif;
      margin-bottom:5px;
    }
    .ap-hero-title {
      font-size:23px; font-weight:900;
      color:#fff; font-family:Nunito,sans-serif;
      line-height:1.15; letter-spacing:-.3px;
      margin-bottom:3px;
    }
    .ap-hero-sub {
      font-size:12px; font-weight:700;
      color:rgba(255,255,255,.48); font-family:Nunito,sans-serif;
      margin-bottom:18px;
    }
    .ap-stats-row {
      display:grid;
      grid-template-columns:repeat(2,1fr);
      gap:10px;
    }
    @media(min-width:480px){ .ap-stats-row{grid-template-columns:repeat(4,1fr);} }
    .ap-stat {
      background:rgba(255,255,255,.08);
      border:1px solid rgba(255,255,255,.14);
      border-radius:15px;
      padding:13px 14px;
      backdrop-filter:blur(10px);
    }
    .ap-stat-lbl {
      font-size:9px; font-weight:900;
      color:rgba(255,255,255,.45); text-transform:uppercase;
      letter-spacing:.9px; font-family:Nunito,sans-serif;
      margin-bottom:6px;
    }
    .ap-stat-num {
      font-size:27px; font-weight:900;
      font-family:Nunito,sans-serif; line-height:1;
    }
    .ap-stat-num.v { color:#86efac; }
    .ap-stat-num.a { color:#93c5fd; }
    .ap-stat-num.n { color:#fcd34d; }
    .ap-stat-num.w { color:#fff; }
    .ap-stat-sub {
      font-size:10px; font-weight:700;
      color:rgba(255,255,255,.35); font-family:Nunito,sans-serif;
      margin-top:4px;
    }

    /* ══ HOY ═════════════════════════════════════════════════════════ */
    .ap-hoy {
      border-radius:16px; overflow:hidden;
      border:1.5px solid;
    }
    .ap-hoy.act  { border-color:#bbf7d0; background:linear-gradient(135deg,#f0fdf4,#dcfce7); }
    .ap-hoy.idle { border-color:#e2e8f0; background:var(--surface2,#f8fafc); }
    .ap-hoy-head {
      display:flex; align-items:center; gap:10px;
      padding:13px 15px 9px;
    }
    .ap-hoy-ico {
      width:36px; height:36px; border-radius:50%;
      display:flex; align-items:center; justify-content:center;
      font-size:18px; flex-shrink:0;
    }
    .ap-hoy-ico.act  { background:#dcfce7; }
    .ap-hoy-ico.idle { background:#f1f5f9; }
    .ap-hoy-title {
      font-size:13px; font-weight:900;
      font-family:Nunito,sans-serif;
    }
    .ap-hoy-title.act  { color:#14532d; }
    .ap-hoy-title.idle { color:var(--text-muted,#64748b); }
    .ap-hoy-sub {
      font-size:11px; font-weight:700;
      color:var(--text-muted,#64748b); font-family:Nunito,sans-serif;
      margin-top:1px;
    }
    .ap-hoy-chips {
      display:flex; flex-wrap:wrap; gap:6px;
      padding:0 15px 13px;
    }
    .ap-chip-ped {
      padding:4px 12px; border-radius:20px;
      font-size:11px; font-weight:900; font-family:Nunito,sans-serif;
      background:#dbeafe; color:#1e40af; border:1px solid #bfdbfe;
      display:flex; align-items:center; gap:4px;
    }
    .ap-chip-ent {
      padding:4px 12px; border-radius:20px;
      font-size:11px; font-weight:900; font-family:Nunito,sans-serif;
      background:#fef3c7; color:#92400e; border:1px solid #fde68a;
      display:flex; align-items:center; gap:4px;
    }

    /* ══ PANEL ═══════════════════════════════════════════════════════ */
    .ap-panel {
      background:var(--surface2,#f8fafc);
      border:1.5px solid var(--border,#e2e8f0);
      border-radius:20px; overflow:hidden;
      box-shadow:0 2px 12px rgba(0,0,0,.05);
    }
    .ap-panel-hdr {
      display:flex; align-items:center; gap:11px;
      padding:15px 17px 14px;
      background:var(--surface,#fff);
      border-bottom:1.5px solid var(--border,#e2e8f0);
    }
    .ap-panel-ico {
      width:38px; height:38px; border-radius:12px;
      display:flex; align-items:center; justify-content:center;
      font-size:19px; flex-shrink:0;
    }
    .ap-panel-ico.verde   { background:#dcfce7; }
    .ap-panel-ico.azul    { background:#dbeafe; }
    .ap-panel-ico.naranja { background:#fef3c7; }
    .ap-panel-txt { flex:1; }
    .ap-panel-title {
      font-size:15px; font-weight:900;
      color:var(--text,#0f172a); font-family:Nunito,sans-serif;
    }
    .ap-panel-desc {
      font-size:11px; font-weight:700;
      color:var(--text-muted,#64748b); font-family:Nunito,sans-serif;
      margin-top:2px;
    }
    .ap-badge {
      min-width:26px; height:26px; padding:0 8px;
      border-radius:30px;
      display:inline-flex; align-items:center; justify-content:center;
      font-size:12px; font-weight:900; font-family:Nunito,sans-serif;
      background:#dcfce7; color:#15803d; border:1px solid #bbf7d0;
    }
    .ap-panel-body { padding:17px 18px; }

    /* ── Formulario ── */
    .ap-field { display:flex; flex-direction:column; gap:6px; margin-bottom:14px; }
    .ap-field label {
      font-size:10px; font-weight:900;
      color:var(--text-muted,#64748b); text-transform:uppercase;
      letter-spacing:.6px; font-family:Nunito,sans-serif;
    }
    .ap-inp {
      width:100%; padding:12px 14px;
      border:1.5px solid var(--border,#e2e8f0);
      border-radius:12px;
      font-size:15px; font-weight:700;
      font-family:Nunito,sans-serif;
      color:var(--text,#0f172a);
      background:var(--surface,#fff);
      box-sizing:border-box; outline:none;
      transition:border-color .2s, box-shadow .2s;
    }
    .ap-inp:focus { border-color:#16a34a; box-shadow:0 0 0 3px rgba(22,163,74,.1); }
    .ap-inp.edit  { border-color:#f59e0b; box-shadow:0 0 0 3px rgba(245,158,11,.1); }

    /* ── Grupos de días ── */
    .ap-dias-grupo { margin-bottom:14px; }
    .ap-dias-lbl {
      font-size:10px; font-weight:900;
      color:var(--text-muted,#64748b); text-transform:uppercase;
      letter-spacing:.6px; font-family:Nunito,sans-serif;
      margin-bottom:8px; display:flex; align-items:center; gap:6px;
    }
    .ap-dias-row { display:flex; flex-wrap:wrap; gap:7px; }

    /* Pills de días */
    .ap-day {
      padding:8px 15px; border-radius:40px;
      border:2px solid var(--border,#e2e8f0);
      background:var(--surface,#fff);
      font-size:12px; font-weight:900;
      font-family:Nunito,sans-serif;
      color:var(--text-muted,#94a3b8);
      cursor:pointer; transition:all .15s;
      user-select:none;
    }
    .ap-day:hover { border-color:#94a3b8; color:var(--text,#0f172a); }
    .ap-day.ped-on {
      background:linear-gradient(135deg,#3b82f6,#2563eb);
      border-color:#2563eb; color:#fff;
      box-shadow:0 3px 10px rgba(59,130,246,.35);
    }
    .ap-day.ent-on {
      background:linear-gradient(135deg,#f59e0b,#d97706);
      border-color:#d97706; color:#fff;
      box-shadow:0 3px 10px rgba(245,158,11,.35);
    }
    .ap-day.ped-edit {
      background:linear-gradient(135deg,#60a5fa,#3b82f6);
      border-color:#3b82f6; color:#fff; opacity:.82;
    }
    .ap-day.ent-edit {
      background:linear-gradient(135deg,#fbbf24,#f59e0b);
      border-color:#f59e0b; color:#fff; opacity:.82;
    }

    /* ── Divisor ── */
    .ap-div {
      display:flex; align-items:center; gap:10px;
      margin:4px 0 14px;
    }
    .ap-div span {
      font-size:10px; font-weight:900; text-transform:uppercase;
      letter-spacing:.7px; font-family:Nunito,sans-serif;
      color:var(--text-muted,#94a3b8); white-space:nowrap;
    }
    .ap-div::before,.ap-div::after {
      content:''; flex:1; height:1px;
      background:var(--border,#e2e8f0);
    }

    /* ── Botones ── */
    .ap-btn {
      width:100%; padding:13px; border:none; border-radius:14px;
      font-size:14px; font-weight:900; font-family:Nunito,sans-serif;
      cursor:pointer; transition:all .15s; letter-spacing:.2px;
    }
    .ap-btn:hover  { transform:translateY(-1px); }
    .ap-btn:active { transform:translateY(0); }
    .ap-btn-verde {
      background:linear-gradient(135deg,#16a34a,#15803d);
      color:#fff; box-shadow:0 4px 14px rgba(22,163,74,.35);
    }
    .ap-btn-verde:hover { box-shadow:0 6px 20px rgba(22,163,74,.45); }
    .ap-btn-amber {
      background:linear-gradient(135deg,#f59e0b,#d97706);
      color:#fff; box-shadow:0 4px 14px rgba(245,158,11,.35);
    }
    .ap-btn-amber:hover { box-shadow:0 6px 20px rgba(245,158,11,.45); }
    .ap-btn-ghost {
      width:100%; padding:11px; background:transparent;
      color:var(--text-muted,#64748b);
      border:1.5px solid var(--border,#e2e8f0);
      border-radius:14px; font-size:13px; font-weight:900;
      font-family:Nunito,sans-serif; cursor:pointer;
      transition:all .15s; margin-top:8px;
    }
    .ap-btn-ghost:hover { border-color:#94a3b8; background:var(--surface,#fff); }

    /* ── Banner edición ── */
    .ap-edit-banner {
      display:flex; align-items:center; gap:9px;
      padding:10px 14px; border-radius:12px; margin-bottom:14px;
      font-size:12px; font-weight:900; font-family:Nunito,sans-serif;
      background:#fffbeb; border:1.5px solid #fde68a; color:#92400e;
    }

    /* ══ TABLA ═══════════════════════════════════════════════════════ */
    .ap-tbl-scroll { overflow-x:auto; }
    table.ap-tbl {
      width:100%; border-collapse:collapse;
      font-family:Nunito,sans-serif;
    }
    table.ap-tbl thead tr { background:var(--surface,#fff); }
    table.ap-tbl thead th {
      padding:11px 15px;
      font-size:10px; font-weight:900;
      color:var(--text-muted,#94a3b8);
      text-transform:uppercase; letter-spacing:.7px;
      text-align:left;
      border-bottom:2px solid var(--border,#e2e8f0);
      white-space:nowrap;
    }
    table.ap-tbl thead th:last-child { text-align:right; }
    table.ap-tbl tbody tr {
      border-bottom:1px solid var(--border,#f1f5f9);
      transition:background .1s;
    }
    table.ap-tbl tbody tr:last-child { border-bottom:none; }
    table.ap-tbl tbody tr:hover { background:rgba(0,0,0,.02); }
    table.ap-tbl tbody tr.editing-row { background:#fffdf5; }
    table.ap-tbl tbody td {
      padding:13px 15px;
      font-size:13px; font-weight:700;
      color:var(--text,#0f172a); vertical-align:middle;
    }
    table.ap-tbl tbody td:last-child { text-align:right; white-space:nowrap; }

    /* celda nombre */
    .ap-cell-nombre { display:flex; align-items:center; gap:11px; }
    .ap-avatar {
      width:38px; height:38px; border-radius:50%;
      background:linear-gradient(135deg,#16a34a,#059669);
      display:flex; align-items:center; justify-content:center;
      font-size:13px; font-weight:900; color:#fff;
      font-family:Nunito,sans-serif; flex-shrink:0;
      text-transform:uppercase;
    }
    .ap-avatar.editing-av {
      background:linear-gradient(135deg,#f59e0b,#b45309);
    }
    .ap-nombre-main {
      font-size:14px; font-weight:900;
      color:var(--text,#0f172a); font-family:Nunito,sans-serif;
    }
    .ap-editing-tag {
      font-size:9px; font-weight:900;
      text-transform:uppercase; letter-spacing:.5px;
      font-family:Nunito,sans-serif; color:#f59e0b;
      margin-top:2px;
    }

    /* chips en tabla */
    .ap-chips { display:flex; flex-wrap:wrap; gap:5px; }
    .ap-chip-p {
      padding:3px 10px; border-radius:20px;
      font-size:11px; font-weight:900; font-family:Nunito,sans-serif;
      background:#dbeafe; color:#1e40af; border:1px solid #bfdbfe;
    }
    .ap-chip-e {
      padding:3px 10px; border-radius:20px;
      font-size:11px; font-weight:900; font-family:Nunito,sans-serif;
      background:#fef3c7; color:#92400e; border:1px solid #fde68a;
    }
    .ap-chips-empty {
      font-size:11px; font-weight:700;
      color:var(--text-muted,#cbd5e1); font-family:Nunito,sans-serif;
    }

    /* botones tabla */
    .ap-btn-tbl {
      padding:6px 12px; border-radius:9px;
      font-size:11px; font-weight:900;
      font-family:Nunito,sans-serif; cursor:pointer;
      transition:all .12s; border:1.5px solid;
    }
    .ap-btn-edit {
      background:#fffbeb; color:#92400e; border-color:#fde68a;
      margin-right:5px;
    }
    .ap-btn-edit:hover { background:#fef3c7; }
    .ap-btn-del {
      background:#fef2f2; color:#991b1b; border-color:#fecaca;
    }
    .ap-btn-del:hover { background:#fee2e2; }

    /* empty */
    .ap-empty {
      padding:32px 20px; text-align:center;
      font-size:13px; font-weight:700;
      color:var(--text-muted,#94a3b8); font-family:Nunito,sans-serif;
    }
    .ap-empty-ico { font-size:32px; margin-bottom:9px; }
  `;
  document.head.appendChild(s);
})();

// ══════════════════════════════════════════════════════════════════════
//  ESTADO
// ══════════════════════════════════════════════════════════════════════

const _AP_LS   = 'vpos_agenda_proveedores';
const _AP_DIAS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const _AP_ABR  = { Lunes:'Lun',Martes:'Mar','Miércoles':'Mié',Jueves:'Jue',Viernes:'Vie',Sábado:'Sáb',Domingo:'Dom' };

let _apLista   = [];   // { id, nombre, pedido:[], entrega:[] }
let _apEditId  = null;
let _apDiasPed = new Set();
let _apDiasEnt = new Set();

// ══════════════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════════════

const _apUID  = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const _apHoy  = () => _AP_DIAS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
const _apInit = n => {
  const w = (n||'').trim().split(' ');
  return (w.length >= 2 ? w[0][0]+w[1][0] : (n||'??').slice(0,2)).toUpperCase();
};
const _apPillId = (dia, tipo) => 'apPill_' + tipo + '_' + dia.replace(/[^a-zA-Z]/g,'');

// ══════════════════════════════════════════════════════════════════════
//  PERSISTENCIA
// ══════════════════════════════════════════════════════════════════════

function _apCargar() {
  try { _apLista = JSON.parse(localStorage.getItem(_AP_LS)||'[]'); }
  catch { _apLista = []; }
}
function _apGuardar() {
  localStorage.setItem(_AP_LS, JSON.stringify(_apLista));
}

// ══════════════════════════════════════════════════════════════════════
//  TOGGLE PILLS (sin re-render del DOM completo)
// ══════════════════════════════════════════════════════════════════════

function _apTogglePed(dia) {
  const editing = !!_apEditId;
  const clsOn = editing ? 'ped-edit' : 'ped-on';
  const el = document.getElementById(_apPillId(dia, 'ped'));
  if (!el) return;
  if (_apDiasPed.has(dia)) {
    _apDiasPed.delete(dia);
    el.classList.remove('ped-on','ped-edit');
  } else {
    _apDiasPed.add(dia);
    el.classList.remove('ped-on','ped-edit');
    el.classList.add(clsOn);
  }
}
function _apToggleEnt(dia) {
  const editing = !!_apEditId;
  const clsOn = editing ? 'ent-edit' : 'ent-on';
  const el = document.getElementById(_apPillId(dia, 'ent'));
  if (!el) return;
  if (_apDiasEnt.has(dia)) {
    _apDiasEnt.delete(dia);
    el.classList.remove('ent-on','ent-edit');
  } else {
    _apDiasEnt.add(dia);
    el.classList.remove('ent-on','ent-edit');
    el.classList.add(clsOn);
  }
}

// ══════════════════════════════════════════════════════════════════════
//  ACCIONES
// ══════════════════════════════════════════════════════════════════════

function _apGuardarProv() {
  const inp = document.getElementById('apNombre');
  const nombre = inp?.value?.trim();
  if (!nombre) {
    if (typeof toast==='function') toast('Escribe el nombre del proveedor', true);
    inp?.focus(); return;
  }
  const ped = [..._apDiasPed];
  const ent = [..._apDiasEnt];
  if (!ped.length && !ent.length) {
    if (typeof toast==='function') toast('Selecciona al menos un día de pedido o entrega', true);
    return;
  }
  const dup = _apLista.some(p => p.nombre.toLowerCase()===nombre.toLowerCase() && p.id!==_apEditId);
  if (dup) { if (typeof toast==='function') toast('Ya existe un proveedor con ese nombre', true); return; }

  if (_apEditId) {
    const i = _apLista.findIndex(p => p.id===_apEditId);
    if (i !== -1) { _apLista[i].nombre=nombre; _apLista[i].pedido=ped; _apLista[i].entrega=ent; }
    _apEditId = null;
    if (typeof toast==='function') toast('✓ Proveedor actualizado');
  } else {
    _apLista.push({ id:_apUID(), nombre, pedido:ped, entrega:ent });
    if (typeof toast==='function') toast(`✓ "${nombre}" registrado`);
  }
  _apDiasPed = new Set();
  _apDiasEnt = new Set();
  _apGuardar();
  _apRender();
}

function _apEditar(id) {
  const p = _apLista.find(x => x.id===id);
  if (!p) return;
  _apEditId  = id;
  _apDiasPed = new Set(p.pedido);
  _apDiasEnt = new Set(p.entrega);
  document.getElementById('apFormPanel')?.scrollIntoView({ behavior:'smooth', block:'start' });
  _apRenderForm();
  _apRenderTabla();
  setTimeout(() => { const el=document.getElementById('apNombre'); if(el){el.focus();el.select();} }, 80);
}

function _apCancelar() {
  _apEditId=null; _apDiasPed=new Set(); _apDiasEnt=new Set();
  _apRenderForm(); _apRenderTabla();
}

function _apBorrar(id) {
  const p = _apLista.find(x => x.id===id);
  if (!p || !confirm(`¿Eliminar a "${p.nombre}"?`)) return;
  _apLista = _apLista.filter(x => x.id!==id);
  if (_apEditId===id) { _apEditId=null; _apDiasPed=new Set(); _apDiasEnt=new Set(); }
  _apGuardar();
  _apRender();
  if (typeof toast==='function') toast('🗑 Proveedor eliminado');
}

// ══════════════════════════════════════════════════════════════════════
//  BUILDERS HTML
// ══════════════════════════════════════════════════════════════════════

function _apPillsHTML(setDias, tipo) {
  const editing = !!_apEditId;
  const clsOn = tipo==='ped'
    ? (editing ? 'ped-edit' : 'ped-on')
    : (editing ? 'ent-edit' : 'ent-on');
  const fn = tipo==='ped' ? '_apTogglePed' : '_apToggleEnt';
  return _AP_DIAS.map(dia => `
    <button type="button"
      id="${_apPillId(dia, tipo)}"
      class="ap-day ${setDias.has(dia) ? clsOn : ''}"
      onclick="${fn}('${dia}')">
      ${_AP_ABR[dia]}
    </button>`).join('');
}

function _apBuildForm() {
  const editing = !!_apEditId;
  const prov = editing ? _apLista.find(p=>p.id===_apEditId) : null;
  return `
    ${editing ? `
      <div class="ap-edit-banner">
        ✏️ Editando proveedor: <strong style="margin-left:4px;">${prov?.nombre}</strong>
      </div>` : ''}

    <div class="ap-field">
      <label>Nombre del Proveedor</label>
      <input class="ap-inp ${editing?'edit':''}" type="text" id="apNombre"
        placeholder="Ej: Distribuidora García…"
        value="${prov?.nombre||''}" maxlength="60"
        onkeydown="if(event.key==='Enter')_apGuardarProv()">
    </div>

    <div class="ap-div"><span>🛒 Día de pedido</span></div>
    <div class="ap-dias-grupo">
      <div class="ap-dias-row">${_apPillsHTML(_apDiasPed, 'ped')}</div>
    </div>

    <div class="ap-div"><span>🚚 Día de entrega</span></div>
    <div class="ap-dias-grupo" style="margin-bottom:16px;">
      <div class="ap-dias-row">${_apPillsHTML(_apDiasEnt, 'ent')}</div>
    </div>

    <button class="ap-btn ${editing?'ap-btn-amber':'ap-btn-verde'}" onclick="_apGuardarProv()">
      ${editing ? '✅ Guardar cambios' : '➕ Registrar Proveedor'}
    </button>
    ${editing ? `<button class="ap-btn-ghost" onclick="_apCancelar()">✕ Cancelar edición</button>` : ''}
  `;
}

function _apBuildTabla() {
  if (!_apLista.length) return `
    <div class="ap-empty">
      <div class="ap-empty-ico">📋</div>
      Sin proveedores registrados aún
    </div>`;

  return `
    <div class="ap-tbl-scroll">
      <table class="ap-tbl">
        <thead><tr>
          <th>Proveedor</th>
          <th>🛒 Día de Pedido</th>
          <th>🚚 Día de Entrega</th>
          <th>Acciones</th>
        </tr></thead>
        <tbody>
          ${_apLista.map(p => {
            const isEd = p.id === _apEditId;
            return `
              <tr class="${isEd?'editing-row':''}">
                <td>
                  <div class="ap-cell-nombre">
                    <div class="ap-avatar ${isEd?'editing-av':''}">${_apInit(p.nombre)}</div>
                    <div>
                      <div class="ap-nombre-main">${p.nombre}</div>
                      ${isEd ? '<div class="ap-editing-tag">✏ Editando…</div>' : ''}
                    </div>
                  </div>
                </td>
                <td>
                  ${p.pedido?.length
                    ? `<div class="ap-chips">${p.pedido.map(d=>`<span class="ap-chip-p">${_AP_ABR[d]||d}</span>`).join('')}</div>`
                    : `<span class="ap-chips-empty">—</span>`}
                </td>
                <td>
                  ${p.entrega?.length
                    ? `<div class="ap-chips">${p.entrega.map(d=>`<span class="ap-chip-e">${_AP_ABR[d]||d}</span>`).join('')}</div>`
                    : `<span class="ap-chips-empty">—</span>`}
                </td>
                <td>
                  <button class="ap-btn-tbl ap-btn-edit" onclick="_apEditar('${p.id}')">✏ Editar</button>
                  <button class="ap-btn-tbl ap-btn-del"  onclick="_apBorrar('${p.id}')">🗑</button>
                </td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

function _apBuildHoy() {
  const diaHoy = _apHoy();
  const pedHoy = _apLista.filter(p => p.pedido?.includes(diaHoy));
  const entHoy = _apLista.filter(p => p.entrega?.includes(diaHoy));
  const hayAlgo = pedHoy.length || entHoy.length;
  const cls = hayAlgo ? 'act' : 'idle';
  return `
    <div class="ap-hoy ${cls}">
      <div class="ap-hoy-head">
        <div class="ap-hoy-ico ${cls}">${hayAlgo ? '📦' : '✅'}</div>
        <div>
          <div class="ap-hoy-title ${cls}">Hoy · ${diaHoy}</div>
          <div class="ap-hoy-sub">${
            hayAlgo
              ? `${pedHoy.length} pedido${pedHoy.length!==1?'s':''} · ${entHoy.length} entrega${entHoy.length!==1?'s':''} programada${entHoy.length!==1?'s':''}`
              : 'Sin movimientos de proveedores hoy'
          }</div>
        </div>
      </div>
      ${hayAlgo ? `
      <div class="ap-hoy-chips">
        ${pedHoy.map(p=>`<span class="ap-chip-ped">🛒 ${p.nombre}</span>`).join('')}
        ${entHoy.map(p=>`<span class="ap-chip-ent">🚚 ${p.nombre}</span>`).join('')}
      </div>` : ''}
    </div>`;
}

function _apBuildStats() {
  const total = _apLista.length;
  let maxPed=0, maxEnt=0;
  _AP_DIAS.forEach(d => {
    maxPed = Math.max(maxPed, _apLista.filter(p=>p.pedido?.includes(d)).length);
    maxEnt = Math.max(maxEnt, _apLista.filter(p=>p.entrega?.includes(d)).length);
  });
  const diaHoy  = _apHoy();
  const hoyAct  = new Set([
    ..._apLista.filter(p=>p.pedido?.includes(diaHoy)).map(p=>p.id),
    ..._apLista.filter(p=>p.entrega?.includes(diaHoy)).map(p=>p.id)
  ]).size;
  return { total, maxPed, maxEnt, hoyAct };
}

// ══════════════════════════════════════════════════════════════════════
//  REFRESH PARCIALES (evitan re-render del hero/stats)
// ══════════════════════════════════════════════════════════════════════

function _apRenderForm()  { const w=document.getElementById('apFormWrap');  if(w) w.innerHTML=_apBuildForm(); }
function _apRenderTabla() { const w=document.getElementById('apTablaWrap'); if(w) w.innerHTML=_apBuildTabla(); }
function _apRenderHoy()   { const w=document.getElementById('apHoyWrap');   if(w) w.innerHTML=_apBuildHoy(); }
function _apRenderStats() {
  const { total, maxPed, maxEnt, hoyAct } = _apBuildStats();
  const s1=document.getElementById('apStat1'); if(s1) s1.textContent=total;
  const s2=document.getElementById('apStat2'); if(s2) s2.textContent=hoyAct;
  const s3=document.getElementById('apStat3'); if(s3) s3.textContent=maxPed;
  const s4=document.getElementById('apStat4'); if(s4) s4.textContent=maxEnt;
  const b=document.getElementById('apBadge');  if(b)  b.textContent=total;
}
function _apRender() {
  _apRenderForm(); _apRenderTabla(); _apRenderHoy(); _apRenderStats();
}

// ══════════════════════════════════════════════════════════════════════
//  RENDER PRINCIPAL
// ══════════════════════════════════════════════════════════════════════

function renderFinanzasMes(pgId) {
  pgId = pgId || 'pgFinanzasMes';
  const pg = document.getElementById(pgId);
  if (!pg) return;

  _apCargar();
  _apEditId=null; _apDiasPed=new Set(); _apDiasEnt=new Set();

  const { total, maxPed, maxEnt, hoyAct } = _apBuildStats();

  pg.innerHTML = `

    <!-- HERO -->
    <div class="ap-hero">
      <div class="ap-hero-inner">
        <div class="ap-hero-eyebrow">Despensa Económica</div>
        <div class="ap-hero-title">📦 Agenda de Proveedores</div>
        <div class="ap-hero-sub">Días de pedido y entrega por proveedor</div>
        <div class="ap-stats-row">
          <div class="ap-stat">
            <div class="ap-stat-lbl">Total</div>
            <div class="ap-stat-num v" id="apStat1">${total}</div>
            <div class="ap-stat-sub">Proveedores</div>
          </div>
          <div class="ap-stat">
            <div class="ap-stat-lbl">Hoy</div>
            <div class="ap-stat-num a" id="apStat2">${hoyAct}</div>
            <div class="ap-stat-sub">Activos</div>
          </div>
          <div class="ap-stat">
            <div class="ap-stat-lbl">Pico pedidos</div>
            <div class="ap-stat-num n" id="apStat3">${maxPed}</div>
            <div class="ap-stat-sub">Max / día</div>
          </div>
          <div class="ap-stat">
            <div class="ap-stat-lbl">Pico entregas</div>
            <div class="ap-stat-num w" id="apStat4">${maxEnt}</div>
            <div class="ap-stat-sub">Max / día</div>
          </div>
        </div>
      </div>
    </div>

    <div style="padding:0 14px; display:flex; flex-direction:column; gap:20px;">

      <!-- Hoy -->
      <div id="apHoyWrap"></div>

      <!-- Formulario único -->
      <div class="ap-panel" id="apFormPanel">
        <div class="ap-panel-hdr">
          <div class="ap-panel-ico verde">🏭</div>
          <div class="ap-panel-txt">
            <div class="ap-panel-title">Registrar / Editar Proveedor</div>
            <div class="ap-panel-desc">Nombre · días de pedido · días de entrega</div>
          </div>
        </div>
        <div class="ap-panel-body">
          <div id="apFormWrap"></div>
        </div>
      </div>

      <!-- Tabla -->
      <div class="ap-panel">
        <div class="ap-panel-hdr">
          <div class="ap-panel-ico azul">📋</div>
          <div class="ap-panel-txt">
            <div class="ap-panel-title">Proveedores Registrados</div>
            <div class="ap-panel-desc">Pedido · Entrega · Lunes a Domingo</div>
          </div>
          <span class="ap-badge" id="apBadge">${total}</span>
        </div>
        <div id="apTablaWrap"></div>
      </div>

    </div>
  `;

  _apRender();
}
