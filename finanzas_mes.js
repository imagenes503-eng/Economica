
// Calendario de Proveedores (reemplaza Finanzas Mes)

let _calProvMesActual = new Date().toISOString().substring(0,7);
let _calProvDatos = { proveedores: [] };

function _calProvHoy(){ return new Date().toISOString().split('T')[0]; }

async function renderFinanzasMes(pgId){
  pgId = pgId || 'pgFinanzasMes';
  const pg = document.getElementById(pgId);
  if(!pg) return;

  pg.innerHTML = `
    <div class="fm-hero">
      <div class="fm-hero-title">📅 Calendario</div>
    </div>

    <div class="fm-body">

      <div class="fm-panel">
        <div class="fm-panel-header">
          <div class="fm-panel-title">Registrar proveedor</div>
        </div>

        <div class="fm-panel-body">
          <div class="fm-field">
            <label>Proveedor</label>
            <input id="calProveedorNombre" class="fm-inp" placeholder="Nombre del proveedor">
          </div>

          <div class="fm-field" style="margin-top:10px;">
            <label>Fecha de visita</label>
            <input id="calProveedorFecha" type="date" class="fm-inp" value="${_calProvHoy()}">
          </div>

          <button class="btn-fm-add" style="margin-top:12px;width:100%;"
            onclick="_calGuardarProveedor()">
            ➕ Registrar proveedor
          </button>
        </div>
      </div>

      <div class="fm-panel">
        <div class="fm-panel-header">
          <div class="fm-panel-title">Calendario de proveedores</div>
        </div>
        <div class="fm-panel-body">
          <div id="calProveedorLista"></div>
        </div>
      </div>

    </div>
  `;

  _calRenderLista();
}

function _calRenderLista(){
  const cont = document.getElementById('calProveedorLista');
  if(!cont) return;

  if(!_calProvDatos.proveedores.length){
    cont.innerHTML = '<div class="fm-empty">Sin proveedores registrados</div>';
    return;
  }

  const items = [..._calProvDatos.proveedores]
    .sort((a,b)=>a.fecha.localeCompare(b.fecha));

  cont.innerHTML = items.map(p => `
    <div class="fm-mov-item">
      <span class="fm-mov-fecha">${p.fecha}</span>
      <span class="fm-mov-nota">${p.nombre}</span>
    </div>
  `).join('');
}

function _calGuardarProveedor(){
  const nombre = document.getElementById('calProveedorNombre')?.value?.trim();
  const fecha = document.getElementById('calProveedorFecha')?.value;

  if(!nombre || !fecha){
    if(typeof toast==='function') toast('Completa todos los campos', true);
    return;
  }

  _calProvDatos.proveedores.push({
    id: Date.now(),
    nombre,
    fecha
  });

  document.getElementById('calProveedorNombre').value = '';

  _calRenderLista();

  if(typeof toast==='function') toast('Proveedor registrado');
}

window.renderFinanzasMes = renderFinanzasMes;
