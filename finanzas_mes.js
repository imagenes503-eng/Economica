// =====================================================================
//  AGENDA DE PROVEEDORES — Despensa Económica
//  Los estilos se inyectan SOLO cuando renderFinanzasMes() es llamado.
//  Nada corre en tiempo de parseo del archivo.
// =====================================================================

// ── Constantes ───────────────────────────────────────────────────────
var _AP_DIAS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
var _AP_ABR  = {
  'Lunes':'Lun','Martes':'Mar','Miércoles':'Mié',
  'Jueves':'Jue','Viernes':'Vie','Sábado':'Sáb','Domingo':'Dom'
};
var _AP_LS       = 'vpos_agenda_proveedores';

// ── Estado (se reinicia en cada render) ──────────────────────────────
var _apLista   = [];
var _apEditId  = null;
var _apDiasPed = [];
var _apDiasEnt = [];

// ── Helpers ───────────────────────────────────────────────────────────
function _apUID() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2,6);
}
function _apHoy() {
  var d = new Date().getDay(); // 0=Dom
  return _AP_DIAS[d === 0 ? 6 : d - 1];
}
function _apInit(n) {
  var w = (n||'').trim().split(' ');
  return (w.length >= 2 ? w[0][0]+w[1][0] : (n||'??').slice(0,2)).toUpperCase();
}
function _apPillId(dia, tipo) {
  return 'apPill_' + tipo + '_' + dia.replace(/[^a-zA-Z]/g,'');
}
function _apRecibidosKey() {
  return 'vpos_rec_' + new Date().toISOString().split('T')[0];
}
function _apPedHechosKey() {
  return 'vpos_pedh_' + new Date().toISOString().split('T')[0];
}

// ── Persistencia ──────────────────────────────────────────────────────
function _apCargar() {
  try { _apLista = JSON.parse(localStorage.getItem(_AP_LS) || '[]'); }
  catch(e) { _apLista = []; }
}
function _apGuardar() {
  try { localStorage.setItem(_AP_LS, JSON.stringify(_apLista)); }
  catch(e) {}
}
function _apCargarRec() {
  try { return JSON.parse(localStorage.getItem(_apRecibidosKey()) || '[]'); }
  catch(e) { return []; }
}
function _apGuardarRec(arr) {
  try { localStorage.setItem(_apRecibidosKey(), JSON.stringify(arr)); }
  catch(e) {}
}
function _apCargarPedHechos() {
  try { return JSON.parse(localStorage.getItem(_apPedHechosKey()) || '[]'); }
  catch(e) { return []; }
}
function _apGuardarPedHechos(arr) {
  try { localStorage.setItem(_apPedHechosKey(), JSON.stringify(arr)); }
  catch(e) {}
}

// ── Toggle días ───────────────────────────────────────────────────────
function _apTogglePed(dia) {
  var i = _apDiasPed.indexOf(dia);
  if (i > -1) { _apDiasPed.splice(i,1); }
  else { _apDiasPed.push(dia); }
  var editing = !!_apEditId;
  var el = document.getElementById(_apPillId(dia,'ped'));
  if (!el) return;
  if (_apDiasPed.indexOf(dia) > -1) {
    el.className = 'ap-day ' + (editing ? 'ped-edit' : 'ped-on');
  } else {
    el.className = 'ap-day';
  }
}
function _apToggleEnt(dia) {
  var i = _apDiasEnt.indexOf(dia);
  if (i > -1) { _apDiasEnt.splice(i,1); }
  else { _apDiasEnt.push(dia); }
  var editing = !!_apEditId;
  var el = document.getElementById(_apPillId(dia,'ent'));
  if (!el) return;
  if (_apDiasEnt.indexOf(dia) > -1) {
    el.className = 'ap-day ' + (editing ? 'ent-edit' : 'ent-on');
  } else {
    el.className = 'ap-day';
  }
}

// ── CRUD Proveedores ─────────────────────────────────────────────────
function _apGuardarProv() {
  var inp = document.getElementById('apNombre');
  var nombre = inp ? inp.value.trim() : '';
  if (!nombre) {
    if (typeof toast==='function') toast('Escribe el nombre del proveedor', true);
    if (inp) inp.focus();
    return;
  }
  if (!_apDiasPed.length && !_apDiasEnt.length) {
    if (typeof toast==='function') toast('Selecciona al menos un día', true);
    return;
  }
  for (var k=0; k<_apLista.length; k++) {
    if (_apLista[k].nombre.toLowerCase()===nombre.toLowerCase() && _apLista[k].id!==_apEditId) {
      if (typeof toast==='function') toast('Ya existe un proveedor con ese nombre', true);
      return;
    }
  }
  if (_apEditId) {
    for (var j=0; j<_apLista.length; j++) {
      if (_apLista[j].id === _apEditId) {
        _apLista[j].nombre  = nombre;
        _apLista[j].pedido  = _apDiasPed.slice();
        _apLista[j].entrega = _apDiasEnt.slice();
        break;
      }
    }
    _apEditId = null;
    if (typeof toast==='function') toast('Proveedor actualizado');
  } else {
    _apLista.push({ id:_apUID(), nombre:nombre, pedido:_apDiasPed.slice(), entrega:_apDiasEnt.slice() });
    if (typeof toast==='function') toast('"'+nombre+'" registrado');
  }
  _apDiasPed = [];
  _apDiasEnt = [];
  _apGuardar();
  _apRefreshAll();
}

function _apEditar(id) {
  for (var i=0; i<_apLista.length; i++) {
    if (_apLista[i].id === id) {
      _apEditId  = id;
      _apDiasPed = (_apLista[i].pedido  || []).slice();
      _apDiasEnt = (_apLista[i].entrega || []).slice();
      var panel = document.getElementById('apFormPanel');
      var formBody = document.getElementById('apFormBody');
      var formChev = document.getElementById('apFormChev');
      if (formBody) { formBody.classList.remove('ap-panel-body-hidden'); }
      if (formChev) { formChev.classList.add('ap-chevron-open'); }
      if (panel) panel.scrollIntoView({ behavior:'smooth', block:'start' });
      _apRefreshForm();
      _apRefreshTabla();
      setTimeout(function(){
        var el=document.getElementById('apNombre');
        if(el){el.focus();el.select();}
      }, 80);
      return;
    }
  }
}

function _apCancelar() {
  _apEditId=null; _apDiasPed=[]; _apDiasEnt=[];
  _apRefreshForm(); _apRefreshTabla();
}

function _apBorrar(id) {
  var nombre = '';
  for (var i=0; i<_apLista.length; i++) {
    if (_apLista[i].id===id) { nombre=_apLista[i].nombre; break; }
  }
  if (!confirm('¿Eliminar a "'+nombre+'"?')) return;
  _apLista = _apLista.filter(function(p){ return p.id!==id; });
  if (_apEditId===id) { _apEditId=null; _apDiasPed=[]; _apDiasEnt=[]; }
  _apGuardar();
  _apRefreshAll();
  if (typeof toast==='function') toast('Proveedor eliminado');
}

function _apMarcarRecibido(id) {
  var rec = _apCargarRec();
  var idx = rec.indexOf(id);
  var nombre = '';
  for (var i=0; i<_apLista.length; i++) {
    if (_apLista[i].id===id) { nombre=_apLista[i].nombre; break; }
  }
  if (idx > -1) {
    rec.splice(idx,1);
    if (typeof toast==='function') toast(nombre+' marcado como pendiente');
  } else {
    rec.push(id);
    if (typeof toast==='function') toast('Recibido: '+nombre);
  }
  _apGuardarRec(rec);
  _apRefreshPedidos();
}

function _apMarcarPedidoHecho(id) {
  var pedh = _apCargarPedHechos();
  var idx  = pedh.indexOf(id);
  var nombre = '';
  for (var i=0; i<_apLista.length; i++) {
    if (_apLista[i].id===id) { nombre=_apLista[i].nombre; break; }
  }
  if (idx > -1) {
    pedh.splice(idx,1);
    if (typeof toast==='function') toast(nombre+' marcado como pendiente');
  } else {
    pedh.push(id);
    if (typeof toast==='function') toast('✅ Pedido hecho: '+nombre);
  }
  _apGuardarPedHechos(pedh);
  _apRefreshPreventas();
}

// ── Builders HTML ─────────────────────────────────────────────────────
function _apPillsHTML(selArr, tipo) {
  var editing = !!_apEditId;
  var html = '';
  for (var i=0; i<_AP_DIAS.length; i++) {
    var dia = _AP_DIAS[i];
    var active = selArr.indexOf(dia) > -1;
    var clsOn = tipo==='ped' ? (editing?'ped-edit':'ped-on') : (editing?'ent-edit':'ent-on');
    var fn = tipo==='ped' ? '_apTogglePed' : '_apToggleEnt';
    html += '<button type="button" id="'+_apPillId(dia,tipo)+'" class="ap-day'+(active?' '+clsOn:'')+'" onclick="'+fn+'(\''+dia+'\')">'+_AP_ABR[dia]+'</button>';
  }
  return html;
}

function _apBuildForm() {
  var editing = !!_apEditId;
  var prov = null;
  if (editing) {
    for (var i=0; i<_apLista.length; i++) {
      if (_apLista[i].id===_apEditId) { prov=_apLista[i]; break; }
    }
  }
  var html = '';
  if (editing) {
    html += '<div class="ap-edit-banner">✏️ Editando: <strong style="margin-left:4px;">'+(prov?prov.nombre:'')+'</strong></div>';
  }
  html += '<div class="ap-field"><label>Nombre del Proveedor</label>';
  html += '<input class="ap-inp'+(editing?' ap-inp-edit':'')+'" type="text" id="apNombre" placeholder="Ej: Distribuidora García" value="'+(prov?prov.nombre:'')+'" maxlength="60" onkeydown="if(event.key===\'Enter\')_apGuardarProv()"></div>';
  html += '<div class="ap-sep"><span>🛒 Día de pedido</span></div>';
  html += '<div class="ap-dias-row" style="margin-bottom:14px;">'+_apPillsHTML(_apDiasPed,'ped')+'</div>';
  html += '<div class="ap-sep"><span>🚚 Día de entrega</span></div>';
  html += '<div class="ap-dias-row" style="margin-bottom:16px;">'+_apPillsHTML(_apDiasEnt,'ent')+'</div>';
  html += '<button class="ap-btn '+(editing?'ap-btn-amber':'ap-btn-green')+'" onclick="_apGuardarProv()">'+(editing?'✅ Guardar cambios':'➕ Registrar Proveedor')+'</button>';
  if (editing) {
    html += '<button class="ap-btn-ghost" onclick="_apCancelar()">✕ Cancelar edición</button>';
  }
  return html;
}

function _apBuildTabla() {
  if (!_apLista.length) {
    return '<div class="ap-empty"><div class="ap-empty-ico">📋</div><div>Sin proveedores registrados</div></div>';
  }
  var html = '<div style="overflow-x:auto;"><table class="ap-tbl"><thead><tr>';
  html += '<th>Proveedor</th><th>🛒 Día de Pedido</th><th>🚚 Día de Entrega</th><th style="text-align:right;">Acciones</th>';
  html += '</tr></thead><tbody>';
  for (var i=0; i<_apLista.length; i++) {
    var p   = _apLista[i];
    var isEd = p.id === _apEditId;
    var pedChips = '';
    if (p.pedido && p.pedido.length) {
      for (var j=0; j<p.pedido.length; j++) {
        pedChips += '<span class="ap-chip-p">'+(_AP_ABR[p.pedido[j]]||p.pedido[j])+'</span>';
      }
    } else { pedChips = '<span class="ap-chip-none">—</span>'; }
    var entChips = '';
    if (p.entrega && p.entrega.length) {
      for (var k=0; k<p.entrega.length; k++) {
        entChips += '<span class="ap-chip-e">'+(_AP_ABR[p.entrega[k]]||p.entrega[k])+'</span>';
      }
    } else { entChips = '<span class="ap-chip-none">—</span>'; }

    html += '<tr'+(isEd?' class="ap-tbl-editing"':'')+'>';
    html += '<td><div class="ap-cell-n"><div class="ap-av'+(isEd?' ap-av-edit':'')+'">'+_apInit(p.nombre)+'</div>';
    html += '<div><div class="ap-nname">'+p.nombre+'</div>'+(isEd?'<div class="ap-edit-tag">✏ Editando…</div>':'')+'</div></div></td>';
    html += '<td><div class="ap-chips">'+pedChips+'</div></td>';
    html += '<td><div class="ap-chips">'+entChips+'</div></td>';
    html += '<td style="text-align:right;white-space:nowrap;">';
    html += '<button class="ap-btn-tbl ap-btn-tbl-edit" onclick="_apEditar(\''+p.id+'\')">✏ Editar</button>';
    html += '<button class="ap-btn-tbl ap-btn-tbl-del"  onclick="_apBorrar(\''+p.id+'\')">🗑</button>';
    html += '</td></tr>';
  }
  html += '</tbody></table></div>';
  return html;
}

function _apBuildPedidosHoy() {
  var diaHoy  = _apHoy();
  var rec     = _apCargarRec();
  var pedidos = [];
  for (var i=0; i<_apLista.length; i++) {
    if (_apLista[i].entrega && _apLista[i].entrega.indexOf(diaHoy) > -1) {
      pedidos.push(_apLista[i]);
    }
  }
  if (!pedidos.length) {
    return '<div class="ap-empty" style="padding:28px 20px;">'
      + '<div class="ap-empty-ico">🎉</div>'
      + '<div style="font-size:13px;font-weight:900;color:var(--text-muted,#64748b);font-family:Nunito,sans-serif;">Sin entregas programadas para ' + diaHoy + '</div>'
      + '</div>';
  }
  var totalRec = 0;
  for (var r=0; r<pedidos.length; r++) {
    if (rec.indexOf(pedidos[r].id) > -1) totalRec++;
  }
  var pct = Math.round((totalRec / pedidos.length) * 100);

  // pendientes primero
  var ordenados = [];
  for (var a=0; a<pedidos.length; a++) { if (rec.indexOf(pedidos[a].id)===-1) ordenados.push(pedidos[a]); }
  for (var b=0; b<pedidos.length; b++) { if (rec.indexOf(pedidos[b].id) > -1)  ordenados.push(pedidos[b]); }

  var html = '<div style="padding:13px 17px 0;">';
  html += '<div style="display:flex;justify-content:space-between;font-size:11px;font-weight:900;font-family:Nunito,sans-serif;color:var(--text-muted,#64748b);margin-bottom:6px;">';
  html += '<span>Pendientes: '+(pedidos.length-totalRec)+'</span><span style="color:#16a34a;">Recibidos: '+totalRec+' / '+pedidos.length+'</span></div>';
  html += '<div style="width:100%;height:8px;background:#e2e8f0;border-radius:20px;overflow:hidden;">';
  html += '<div style="height:100%;border-radius:20px;background:linear-gradient(90deg,#16a34a,#4ade80);width:'+pct+'%;transition:width .4s;"></div></div></div>';

  html += '<div style="padding:12px 17px 17px;display:flex;flex-direction:column;gap:9px;">';
  for (var n=0; n<ordenados.length; n++) {
    var p   = ordenados[n];
    var isRec = rec.indexOf(p.id) > -1;
    var cls = isRec ? 'recibido' : 'pendiente';
    html += '<div id="apPedItem_'+p.id+'" class="ap-ped-item ap-ped-'+cls+'">';
    html += '<div class="ap-ped-av ap-ped-av-'+cls+'">'+_apInit(p.nombre)+'</div>';
    html += '<div style="flex:1;min-width:0;">';
    html += '<div class="ap-ped-nombre ap-ped-nombre-'+cls+'">'+p.nombre+'</div>';
    html += '<div class="ap-ped-sub ap-ped-sub-'+cls+'">'+(isRec?'✓ Recibido hoy':'Entrega esperada · '+diaHoy)+'</div>';
    html += '</div>';
    html += '<span class="ap-ped-badge ap-ped-badge-'+cls+'">'+(isRec?'✅ Recibido':'⏳ Pendiente')+'</span>';
    html += '<button class="ap-btn-recibir" onclick="_apMarcarRecibido(\''+p.id+'\')">'+(isRec?'↩ Deshacer':'✓ Recibido')+'</button>';
    html += '</div>';
  }
  html += '</div>';
  return html;
}

function _apBuildPreventasHoy() {
  var diaHoy  = _apHoy();
  var pedh    = _apCargarPedHechos();
  var prevs   = [];
  for (var i=0; i<_apLista.length; i++) {
    if (_apLista[i].pedido && _apLista[i].pedido.indexOf(diaHoy) > -1) {
      prevs.push(_apLista[i]);
    }
  }
  if (!prevs.length) {
    return '<div class="ap-empty" style="padding:28px 20px;">'
      + '<div class="ap-empty-ico">🗒️</div>'
      + '<div style="font-size:13px;font-weight:900;color:var(--text-muted,#64748b);font-family:Nunito,sans-serif;">Sin preventas programadas para ' + diaHoy + '</div>'
      + '</div>';
  }
  var totalHecho = 0;
  for (var r=0; r<prevs.length; r++) { if (pedh.indexOf(prevs[r].id)>-1) totalHecho++; }
  var pct = Math.round((totalHecho / prevs.length) * 100);

  // pendientes primero
  var ordenados = [];
  for (var a=0; a<prevs.length; a++) { if (pedh.indexOf(prevs[a].id)===-1) ordenados.push(prevs[a]); }
  for (var b=0; b<prevs.length; b++) { if (pedh.indexOf(prevs[b].id) > -1) ordenados.push(prevs[b]); }

  var html = '<div style="padding:13px 17px 0;">';
  html += '<div style="display:flex;justify-content:space-between;font-size:11px;font-weight:900;font-family:Nunito,sans-serif;color:var(--text-muted,#64748b);margin-bottom:6px;">';
  html += '<span>Pendientes: '+(prevs.length-totalHecho)+'</span><span style="color:#7c3aed;">Pedidos hechos: '+totalHecho+' / '+prevs.length+'</span></div>';
  html += '<div style="width:100%;height:8px;background:#e2e8f0;border-radius:20px;overflow:hidden;">';
  html += '<div style="height:100%;border-radius:20px;background:linear-gradient(90deg,#7c3aed,#a78bfa);width:'+pct+'%;transition:width .4s;"></div></div></div>';

  html += '<div style="padding:12px 17px 17px;display:flex;flex-direction:column;gap:9px;">';
  for (var n=0; n<ordenados.length; n++) {
    var p    = ordenados[n];
    var isH  = pedh.indexOf(p.id) > -1;
    var cls  = isH ? 'phecho' : 'ppend';
    html += '<div class="ap-prev-item ap-prev-'+cls+'">';
    html += '<div class="ap-prev-av ap-prev-av-'+cls+'">'+_apInit(p.nombre)+'</div>';
    html += '<div style="flex:1;min-width:0;">';
    html += '<div class="ap-prev-nombre ap-prev-nombre-'+cls+'">'+p.nombre+'</div>';
    html += '<div class="ap-prev-sub ap-prev-sub-'+cls+'">'+(isH?'✓ Pedido realizado hoy':'Pasa hoy · haz tu pedido')+'</div>';
    html += '</div>';
    html += '<span class="ap-prev-badge ap-prev-badge-'+cls+'">'+(isH?'✅ Hecho':'📋 Pendiente')+'</span>';
    html += '<button class="ap-btn-pedido" onclick="_apMarcarPedidoHecho(\''+p.id+'\')">'+(isH?'↩ Deshacer':'✓ Pedido hecho')+'</button>';
    html += '</div>';
  }
  html += '</div>';
  return html;
}

function _apBuildHoyBanner() {
  var diaHoy  = _apHoy();
  var pedHoy  = [];
  var entHoy  = [];
  for (var i=0; i<_apLista.length; i++) {
    if (_apLista[i].pedido  && _apLista[i].pedido.indexOf(diaHoy)  > -1) pedHoy.push(_apLista[i]);
    if (_apLista[i].entrega && _apLista[i].entrega.indexOf(diaHoy) > -1) entHoy.push(_apLista[i]);
  }
  var hayAlgo = pedHoy.length || entHoy.length;
  var cls = hayAlgo ? 'ap-hoy-act' : 'ap-hoy-idle';
  var html = '<div class="ap-hoy '+cls+'">';
  html += '<div class="ap-hoy-head">';
  html += '<div class="ap-hoy-ico '+(hayAlgo?'ap-hoy-ico-act':'ap-hoy-ico-idle')+'">'+(hayAlgo?'📦':'✅')+'</div>';
  html += '<div><div class="ap-hoy-title '+(hayAlgo?'ap-hoy-title-act':'ap-hoy-title-idle')+'">Hoy · '+diaHoy+'</div>';
  html += '<div class="ap-hoy-sub">'+(hayAlgo ? pedHoy.length+' pedido(s) · '+entHoy.length+' entrega(s) hoy' : 'Sin movimientos programados hoy')+'</div>';
  html += '</div></div>';
  if (hayAlgo) {
    html += '<div class="ap-hoy-chips">';
    for (var p=0; p<pedHoy.length; p++) html += '<span class="ap-chip-ped">🛒 '+pedHoy[p].nombre+'</span>';
    for (var e=0; e<entHoy.length; e++) html += '<span class="ap-chip-ent">🚚 '+entHoy[e].nombre+'</span>';
    html += '</div>';
  }
  html += '</div>';
  return html;
}

// ── Refreshes parciales ───────────────────────────────────────────────
function _apRefreshForm() {
  var w = document.getElementById('apFormWrap');
  if (w) w.innerHTML = _apBuildForm();
}
function _apRefreshTabla() {
  var w = document.getElementById('apTablaWrap');
  if (w) w.innerHTML = _apBuildTabla();
  var b = document.getElementById('apBadge');
  if (b) b.textContent = _apLista.length;
}
function _apRefreshPedidos() {
  var w = document.getElementById('apPedidosWrap');
  if (w) w.innerHTML = _apBuildPedidosHoy();
  // counter header
  var diaHoy = _apHoy();
  var pedidos = [];
  for (var i=0; i<_apLista.length; i++) {
    if (_apLista[i].entrega && _apLista[i].entrega.indexOf(diaHoy) > -1) pedidos.push(_apLista[i]);
  }
  var rec = _apCargarRec();
  var totalRec = 0;
  for (var r=0; r<pedidos.length; r++) { if (rec.indexOf(pedidos[r].id)>-1) totalRec++; }
  var cnt = document.getElementById('apPedCnt');
  if (cnt) cnt.innerHTML = '<span style="font-size:22px;font-weight:900;color:#fff;font-family:Nunito,sans-serif;line-height:1;">'
    + pedidos.length + '</span><span style="font-size:9px;font-weight:900;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.8px;font-family:Nunito,sans-serif;">'
    + totalRec+'/'+pedidos.length+'&nbsp;✓</span>';
}
function _apRefreshStats() {
  var total = _apLista.length;
  var diaHoy = _apHoy();
  var hoySet = {};
  for (var i=0; i<_apLista.length; i++) {
    var p = _apLista[i];
    if ((p.pedido&&p.pedido.indexOf(diaHoy)>-1)||(p.entrega&&p.entrega.indexOf(diaHoy)>-1)) hoySet[p.id]=1;
  }
  var maxPed=0, maxEnt=0;
  for (var d=0; d<_AP_DIAS.length; d++) {
    var cp=0, ce=0;
    for (var j=0; j<_apLista.length; j++) {
      if (_apLista[j].pedido  && _apLista[j].pedido.indexOf(_AP_DIAS[d])  > -1) cp++;
      if (_apLista[j].entrega && _apLista[j].entrega.indexOf(_AP_DIAS[d]) > -1) ce++;
    }
    if (cp>maxPed) maxPed=cp;
    if (ce>maxEnt) maxEnt=ce;
  }
  var s1=document.getElementById('apS1'); if(s1) s1.textContent=total;
  var s2=document.getElementById('apS2'); if(s2) s2.textContent=Object.keys(hoySet).length;
  var s3=document.getElementById('apS3'); if(s3) s3.textContent=maxPed;
  var s4=document.getElementById('apS4'); if(s4) s4.textContent=maxEnt;
}
function _apRefreshHoy() {
  var w = document.getElementById('apHoyWrap');
  if (w) w.innerHTML = _apBuildHoyBanner();
}
function _apRefreshPreventas() {
  var w = document.getElementById('apPreventasWrap');
  if (w) w.innerHTML = _apBuildPreventasHoy();
  // actualizar contador del header
  var diaHoy = _apHoy();
  var prevs = [];
  for (var i=0; i<_apLista.length; i++) {
    if (_apLista[i].pedido && _apLista[i].pedido.indexOf(diaHoy) > -1) prevs.push(_apLista[i]);
  }
  var pedh = _apCargarPedHechos();
  var totalH = 0;
  for (var r=0; r<prevs.length; r++) { if (pedh.indexOf(prevs[r].id)>-1) totalH++; }
  var cnt = document.getElementById('apPrevCnt');
  if (cnt) cnt.innerHTML = '<span style="font-size:22px;font-weight:900;color:#fff;font-family:Nunito,sans-serif;line-height:1;">'
    + prevs.length + '</span><span style="font-size:9px;font-weight:900;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.8px;font-family:Nunito,sans-serif;">'
    + totalH+'/'+prevs.length+'&nbsp;✓</span>';
}
function _apRefreshAll() {
  _apRefreshForm(); _apRefreshTabla(); _apRefreshPedidos(); _apRefreshPreventas(); _apRefreshStats(); _apRefreshHoy();
}

// ── Toggle panels desplegables ────────────────────────────────────────
function _apTogglePanel(bodyId, chevronId) {
  var body = document.getElementById(bodyId);
  var chev = document.getElementById(chevronId);
  if (!body) return;
  var oculto = body.classList.contains('ap-panel-body-hidden');
  if (oculto) {
    body.classList.remove('ap-panel-body-hidden');
    if (chev) chev.classList.add('ap-chevron-open');
  } else {
    body.classList.add('ap-panel-body-hidden');
    if (chev) chev.classList.remove('ap-chevron-open');
  }
}

// ── Inyección de CSS (solo cuando se renderiza la página) ─────────────
function _apInyectarCSS() {
  if (document.getElementById('apStyles')) return;
  var s = document.createElement('style');
  s.id  = 'apStyles';
  s.textContent = [
    '#pgFinanzasMes{padding:0 0 90px 0;}',
    // HERO
    '.ap-hero{background:linear-gradient(145deg,#020d07 0%,#052e16 45%,#0a3d20 75%,#14532d 100%);padding:24px 18px 22px;margin-bottom:20px;position:relative;overflow:hidden;}',
    '.ap-hero-inner{position:relative;z-index:1;}',
    '.ap-eyebrow{font-size:10px;font-weight:900;color:#4ade80;text-transform:uppercase;letter-spacing:1.6px;font-family:Nunito,sans-serif;margin-bottom:5px;}',
    '.ap-hero-title{font-size:23px;font-weight:900;color:#fff;font-family:Nunito,sans-serif;line-height:1.15;margin-bottom:3px;}',
    '.ap-hero-sub{font-size:12px;font-weight:700;color:rgba(255,255,255,.48);font-family:Nunito,sans-serif;margin-bottom:18px;}',
    '.ap-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;}',
    '@media(min-width:480px){.ap-stats{grid-template-columns:repeat(4,1fr);}}',
    '.ap-stat{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);border-radius:15px;padding:13px 14px;backdrop-filter:blur(6px);}',
    '.ap-stat-lbl{font-size:9px;font-weight:900;color:rgba(255,255,255,.45);text-transform:uppercase;letter-spacing:.9px;font-family:Nunito,sans-serif;margin-bottom:6px;}',
    '.ap-stat-num{font-size:27px;font-weight:900;font-family:Nunito,sans-serif;line-height:1;}',
    '.ap-stat-sub{font-size:10px;font-weight:700;color:rgba(255,255,255,.35);font-family:Nunito,sans-serif;margin-top:4px;}',
    '.sv{color:#86efac;}.sa{color:#93c5fd;}.sn{color:#fcd34d;}.sw{color:#fff;}',
    // CUERPO
    '.ap-body{padding:0 14px;display:flex;flex-direction:column;gap:20px;}',
    // HOY BANNER
    '.ap-hoy{border-radius:16px;overflow:hidden;border:1.5px solid;}',
    '.ap-hoy-act{border-color:#bbf7d0;background:linear-gradient(135deg,#f0fdf4,#dcfce7);}',
    '.ap-hoy-idle{border-color:#e2e8f0;background:var(--surface2,#f8fafc);}',
    '.ap-hoy-head{display:flex;align-items:center;gap:10px;padding:13px 15px 9px;}',
    '.ap-hoy-ico{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}',
    '.ap-hoy-ico-act{background:#dcfce7;}.ap-hoy-ico-idle{background:#f1f5f9;}',
    '.ap-hoy-title{font-size:13px;font-weight:900;font-family:Nunito,sans-serif;}',
    '.ap-hoy-title-act{color:#14532d;}.ap-hoy-title-idle{color:var(--text-muted,#64748b);}',
    '.ap-hoy-sub{font-size:11px;font-weight:700;color:var(--text-muted,#64748b);font-family:Nunito,sans-serif;margin-top:1px;}',
    '.ap-hoy-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 15px 13px;}',
    '.ap-chip-ped{padding:4px 12px;border-radius:20px;font-size:11px;font-weight:900;font-family:Nunito,sans-serif;background:#dbeafe;color:#1e40af;border:1px solid #bfdbfe;}',
    '.ap-chip-ent{padding:4px 12px;border-radius:20px;font-size:11px;font-weight:900;font-family:Nunito,sans-serif;background:#fef3c7;color:#92400e;border:1px solid #fde68a;}',
    // PANEL
    '.ap-panel{background:var(--surface2,#f8fafc);border:1.5px solid var(--border,#e2e8f0);border-radius:20px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.04);}',
    '.ap-panel-hdr{display:flex;align-items:center;gap:11px;padding:15px 17px 14px;background:var(--surface,#fff);border-bottom:1.5px solid var(--border,#e2e8f0);}',
    '.ap-panel-hdr-toggle{cursor:pointer;user-select:none;transition:background .15s;}',
    '.ap-panel-hdr-toggle:hover{background:var(--surface2,#f8fafc);}',
    '.ap-panel-body-hidden{display:none;}',
    '.ap-chevron{font-size:17px;color:var(--text-muted,#94a3b8);transition:transform .25s;margin-left:6px;flex-shrink:0;line-height:1;}',
    '.ap-chevron-open{transform:rotate(180deg);}',
    '.ap-panel-ico{width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0;}',
    '.ico-verde{background:#dcfce7;}.ico-azul{background:#dbeafe;}.ico-naranja{background:#fef3c7;}',
    '.ap-panel-txt{flex:1;}',
    '.ap-panel-title{font-size:15px;font-weight:900;color:var(--text,#0f172a);font-family:Nunito,sans-serif;}',
    '.ap-panel-desc{font-size:11px;font-weight:700;color:var(--text-muted,#64748b);font-family:Nunito,sans-serif;margin-top:2px;}',
    '.ap-badge{min-width:26px;height:26px;padding:0 8px;border-radius:30px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;font-family:Nunito,sans-serif;background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;}',
    '.ap-panel-body{padding:17px 18px;}',
    // FORM
    '.ap-field{display:flex;flex-direction:column;gap:6px;margin-bottom:14px;}',
    '.ap-field label{font-size:10px;font-weight:900;color:var(--text-muted,#64748b);text-transform:uppercase;letter-spacing:.6px;font-family:Nunito,sans-serif;}',
    '.ap-inp{width:100%;padding:12px 14px;border:1.5px solid var(--border,#e2e8f0);border-radius:12px;font-size:15px;font-weight:700;font-family:Nunito,sans-serif;color:var(--text,#0f172a);background:var(--surface,#fff);box-sizing:border-box;outline:none;transition:border-color .2s,box-shadow .2s;}',
    '.ap-inp:focus{border-color:#16a34a;box-shadow:0 0 0 3px rgba(22,163,74,.1);}',
    '.ap-inp-edit{border-color:#f59e0b;box-shadow:0 0 0 3px rgba(245,158,11,.1);}',
    '.ap-sep{display:flex;align-items:center;gap:10px;margin:4px 0 10px;}',
    '.ap-sep span{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.7px;font-family:Nunito,sans-serif;color:var(--text-muted,#94a3b8);white-space:nowrap;}',
    '.ap-sep::before,.ap-sep::after{content:"";flex:1;height:1px;background:var(--border,#e2e8f0);}',
    '.ap-dias-row{display:flex;flex-wrap:wrap;gap:7px;}',
    // PILLS
    '.ap-day{padding:8px 15px;border-radius:40px;border:2px solid var(--border,#e2e8f0);background:var(--surface,#fff);font-size:12px;font-weight:900;font-family:Nunito,sans-serif;color:var(--text-muted,#94a3b8);cursor:pointer;transition:all .15s;user-select:none;}',
    '.ap-day:hover{border-color:#94a3b8;color:var(--text,#0f172a);}',
    '.ped-on{background:linear-gradient(135deg,#3b82f6,#2563eb);border-color:#2563eb;color:#fff;box-shadow:0 3px 10px rgba(59,130,246,.35);}',
    '.ent-on{background:linear-gradient(135deg,#f59e0b,#d97706);border-color:#d97706;color:#fff;box-shadow:0 3px 10px rgba(245,158,11,.35);}',
    '.ped-edit{background:linear-gradient(135deg,#60a5fa,#3b82f6);border-color:#3b82f6;color:#fff;opacity:.82;}',
    '.ent-edit{background:linear-gradient(135deg,#fbbf24,#f59e0b);border-color:#f59e0b;color:#fff;opacity:.82;}',
    // BOTONES
    '.ap-btn{width:100%;padding:13px;border:none;border-radius:14px;font-size:14px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;transition:all .15s;letter-spacing:.2px;}',
    '.ap-btn:hover{transform:translateY(-1px);}.ap-btn:active{transform:translateY(0);}',
    '.ap-btn-green{background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;box-shadow:0 4px 14px rgba(22,163,74,.35);}',
    '.ap-btn-amber{background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;box-shadow:0 4px 14px rgba(245,158,11,.35);}',
    '.ap-btn-ghost{width:100%;padding:11px;background:transparent;color:var(--text-muted,#64748b);border:1.5px solid var(--border,#e2e8f0);border-radius:14px;font-size:13px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;transition:all .15s;margin-top:8px;}',
    '.ap-btn-ghost:hover{border-color:#94a3b8;background:var(--surface,#fff);}',
    '.ap-edit-banner{display:flex;align-items:center;gap:9px;padding:10px 14px;border-radius:12px;margin-bottom:14px;font-size:12px;font-weight:900;font-family:Nunito,sans-serif;background:#fffbeb;border:1.5px solid #fde68a;color:#92400e;}',
    // TABLA
    '.ap-tbl{width:100%;border-collapse:collapse;font-family:Nunito,sans-serif;}',
    '.ap-tbl thead tr{background:var(--surface,#fff);}',
    '.ap-tbl thead th{padding:11px 15px;font-size:10px;font-weight:900;color:var(--text-muted,#94a3b8);text-transform:uppercase;letter-spacing:.7px;text-align:left;border-bottom:2px solid var(--border,#e2e8f0);white-space:nowrap;}',
    '.ap-tbl tbody tr{border-bottom:1px solid var(--border,#f1f5f9);transition:background .1s;}',
    '.ap-tbl tbody tr:last-child{border-bottom:none;}',
    '.ap-tbl tbody tr:hover{background:rgba(0,0,0,.02);}',
    '.ap-tbl-editing{background:#fffdf5;}',
    '.ap-tbl tbody td{padding:13px 15px;font-size:13px;font-weight:700;color:var(--text,#0f172a);vertical-align:middle;}',
    '.ap-cell-n{display:flex;align-items:center;gap:11px;}',
    '.ap-av{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#16a34a,#059669);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:#fff;font-family:Nunito,sans-serif;flex-shrink:0;text-transform:uppercase;}',
    '.ap-av-edit{background:linear-gradient(135deg,#f59e0b,#b45309);}',
    '.ap-nname{font-size:14px;font-weight:900;color:var(--text,#0f172a);font-family:Nunito,sans-serif;}',
    '.ap-edit-tag{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.5px;font-family:Nunito,sans-serif;color:#f59e0b;margin-top:2px;}',
    '.ap-chips{display:flex;flex-wrap:wrap;gap:5px;}',
    '.ap-chip-p{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:900;font-family:Nunito,sans-serif;background:#dbeafe;color:#1e40af;border:1px solid #bfdbfe;}',
    '.ap-chip-e{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:900;font-family:Nunito,sans-serif;background:#fef3c7;color:#92400e;border:1px solid #fde68a;}',
    '.ap-chip-none{font-size:11px;font-weight:700;color:var(--text-muted,#cbd5e1);font-family:Nunito,sans-serif;}',
    '.ap-btn-tbl{padding:6px 12px;border-radius:9px;font-size:11px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;transition:all .12s;border:1.5px solid;}',
    '.ap-btn-tbl-edit{background:#fffbeb;color:#92400e;border-color:#fde68a;margin-right:5px;}',
    '.ap-btn-tbl-edit:hover{background:#fef3c7;}',
    '.ap-btn-tbl-del{background:#fef2f2;color:#991b1b;border-color:#fecaca;}',
    '.ap-btn-tbl-del:hover{background:#fee2e2;}',
    '.ap-empty{padding:32px 20px;text-align:center;font-size:13px;font-weight:700;color:var(--text-muted,#94a3b8);font-family:Nunito,sans-serif;}',
    '.ap-empty-ico{font-size:32px;margin-bottom:9px;}',
    // PANEL PEDIDOS HOY
    '.ap-pedidos{background:var(--surface2,#f8fafc);border:1.5px solid #bbf7d0;border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(22,163,74,.1);}',
    '.ap-pedidos-hdr{display:flex;align-items:center;gap:11px;padding:15px 17px 14px;background:linear-gradient(135deg,#052e16,#166534);}',
    '.ap-pedidos-ico{width:40px;height:40px;border-radius:13px;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}',
    '.ap-pedidos-txt{flex:1;}',
    '.ap-pedidos-title{font-size:15px;font-weight:900;color:#fff;font-family:Nunito,sans-serif;}',
    '.ap-pedidos-sub{font-size:11px;font-weight:700;color:rgba(255,255,255,.55);font-family:Nunito,sans-serif;margin-top:2px;}',
    '.ap-ped-item{display:flex;align-items:center;gap:12px;padding:13px 14px;border-radius:14px;border:1.5px solid;transition:all .2s,transform .2s;}',
    '.ap-ped-pendiente{background:#fff;border-color:#e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,.05);}',
    '.ap-ped-pendiente:hover{border-color:#bbf7d0;}',
    '.ap-ped-recibido{background:#f0fdf4;border-color:#bbf7d0;}',
    '.ap-ped-av{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:#fff;font-family:Nunito,sans-serif;flex-shrink:0;text-transform:uppercase;}',
    '.ap-ped-av-pendiente{background:linear-gradient(135deg,#3b82f6,#1d4ed8);}',
    '.ap-ped-av-recibido{background:linear-gradient(135deg,#16a34a,#059669);}',
    '.ap-ped-nombre{font-size:14px;font-weight:900;font-family:Nunito,sans-serif;}',
    '.ap-ped-nombre-pendiente{color:var(--text,#0f172a);}.ap-ped-nombre-recibido{color:#15803d;}',
    '.ap-ped-sub{font-size:11px;font-weight:700;font-family:Nunito,sans-serif;margin-top:2px;}',
    '.ap-ped-sub-pendiente{color:var(--text-muted,#94a3b8);}.ap-ped-sub-recibido{color:#16a34a;}',
    '.ap-ped-badge{padding:4px 11px;border-radius:20px;font-size:11px;font-weight:900;font-family:Nunito,sans-serif;white-space:nowrap;}',
    '.ap-ped-badge-pendiente{background:#fef9c3;color:#854d0e;border:1px solid #fde68a;}',
    '.ap-ped-badge-recibido{background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;}',
    '.ap-btn-recibir{padding:8px 14px;border-radius:11px;font-size:12px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;border:1.5px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;transition:all .15s;white-space:nowrap;flex-shrink:0;}',
    '.ap-btn-recibir:hover{background:linear-gradient(135deg,#16a34a,#15803d);border-color:#15803d;color:#fff;box-shadow:0 3px 10px rgba(22,163,74,.3);transform:translateY(-1px);}',
    // PANEL PREVENTAS HOY
    '.ap-preventas{background:var(--surface2,#f8fafc);border:1.5px solid #ddd6fe;border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(124,58,237,.1);}',
    '.ap-preventas-hdr{display:flex;align-items:center;gap:11px;padding:15px 17px 14px;background:linear-gradient(135deg,#2e1065,#5b21b6);}',
    '.ap-preventas-ico{width:40px;height:40px;border-radius:13px;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}',
    '.ap-preventas-txt{flex:1;}',
    '.ap-preventas-title{font-size:15px;font-weight:900;color:#fff;font-family:Nunito,sans-serif;}',
    '.ap-preventas-sub{font-size:11px;font-weight:700;color:rgba(255,255,255,.55);font-family:Nunito,sans-serif;margin-top:2px;}',
    '.ap-prev-item{display:flex;align-items:center;gap:12px;padding:13px 14px;border-radius:14px;border:1.5px solid;transition:all .2s,transform .2s;}',
    '.ap-prev-ppend{background:#fff;border-color:#e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,.05);}',
    '.ap-prev-ppend:hover{border-color:#ddd6fe;}',
    '.ap-prev-phecho{background:#f5f3ff;border-color:#ddd6fe;}',
    '.ap-prev-av{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:#fff;font-family:Nunito,sans-serif;flex-shrink:0;text-transform:uppercase;}',
    '.ap-prev-av-ppend{background:linear-gradient(135deg,#7c3aed,#5b21b6);}',
    '.ap-prev-av-phecho{background:linear-gradient(135deg,#16a34a,#059669);}',
    '.ap-prev-nombre{font-size:14px;font-weight:900;font-family:Nunito,sans-serif;}',
    '.ap-prev-nombre-ppend{color:var(--text,#0f172a);}.ap-prev-nombre-phecho{color:#5b21b6;}',
    '.ap-prev-sub{font-size:11px;font-weight:700;font-family:Nunito,sans-serif;margin-top:2px;}',
    '.ap-prev-sub-ppend{color:var(--text-muted,#94a3b8);}.ap-prev-sub-phecho{color:#7c3aed;}',
    '.ap-prev-badge{padding:4px 11px;border-radius:20px;font-size:11px;font-weight:900;font-family:Nunito,sans-serif;white-space:nowrap;}',
    '.ap-prev-badge-ppend{background:#ede9fe;color:#5b21b6;border:1px solid #ddd6fe;}',
    '.ap-prev-badge-phecho{background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;}',
    '.ap-btn-pedido{padding:8px 14px;border-radius:11px;font-size:12px;font-weight:900;font-family:Nunito,sans-serif;cursor:pointer;border:1.5px solid #ddd6fe;background:#f5f3ff;color:#5b21b6;transition:all .15s;white-space:nowrap;flex-shrink:0;}',
    '.ap-btn-pedido:hover{background:linear-gradient(135deg,#7c3aed,#5b21b6);border-color:#5b21b6;color:#fff;box-shadow:0 3px 10px rgba(124,58,237,.3);transform:translateY(-1px);}',
  ].join('');
  document.head.appendChild(s);
}

// ── RENDER PRINCIPAL ──────────────────────────────────────────────────
function renderFinanzasMes(pgId) {
  pgId = pgId || 'pgFinanzasMes';
  var pg = document.getElementById(pgId);
  if (!pg) return;

  _apInyectarCSS();
  _apCargar();
  _apEditId=null; _apDiasPed=[]; _apDiasEnt=[];

  var diaHoy = _apHoy();
  var total  = _apLista.length;
  var hoySet = {};
  for (var i=0; i<_apLista.length; i++) {
    var p = _apLista[i];
    if ((p.pedido&&p.pedido.indexOf(diaHoy)>-1)||(p.entrega&&p.entrega.indexOf(diaHoy)>-1)) hoySet[p.id]=1;
  }
  var maxPed=0, maxEnt=0;
  for (var d=0; d<_AP_DIAS.length; d++) {
    var cp=0, ce=0;
    for (var j=0; j<_apLista.length; j++) {
      if (_apLista[j].pedido  && _apLista[j].pedido.indexOf(_AP_DIAS[d])  > -1) cp++;
      if (_apLista[j].entrega && _apLista[j].entrega.indexOf(_AP_DIAS[d]) > -1) ce++;
    }
    if (cp>maxPed) maxPed=cp;
    if (ce>maxEnt) maxEnt=ce;
  }
  var hoyAct = Object.keys(hoySet).length;

  var pedidosHoy = [];
  for (var k=0; k<_apLista.length; k++) {
    if (_apLista[k].entrega && _apLista[k].entrega.indexOf(diaHoy) > -1) pedidosHoy.push(_apLista[k]);
  }
  var rec = _apCargarRec();
  var recHoy = 0;
  for (var r=0; r<pedidosHoy.length; r++) { if (rec.indexOf(pedidosHoy[r].id)>-1) recHoy++; }

  var preventasHoy = [];
  for (var v=0; v<_apLista.length; v++) {
    if (_apLista[v].pedido && _apLista[v].pedido.indexOf(diaHoy) > -1) preventasHoy.push(_apLista[v]);
  }
  var pedh = _apCargarPedHechos();
  var pedhHoy = 0;
  for (var ph=0; ph<preventasHoy.length; ph++) { if (pedh.indexOf(preventasHoy[ph].id)>-1) pedhHoy++; }

  pg.innerHTML =
    '<div class="ap-hero"><div class="ap-hero-inner">' +
    '<div class="ap-eyebrow">Despensa Económica</div>' +
    '<div class="ap-hero-title">📦 Agenda de Proveedores</div>' +
    '<div class="ap-hero-sub">Días de pedido · días de entrega</div>' +
    '<div class="ap-stats">' +
    '<div class="ap-stat"><div class="ap-stat-lbl">Total</div><div class="ap-stat-num sv" id="apS1">'+total+'</div><div class="ap-stat-sub">Proveedores</div></div>' +
    '<div class="ap-stat"><div class="ap-stat-lbl">Hoy</div><div class="ap-stat-num sa" id="apS2">'+hoyAct+'</div><div class="ap-stat-sub">Activos</div></div>' +
    '<div class="ap-stat"><div class="ap-stat-lbl">Pico pedido</div><div class="ap-stat-num sn" id="apS3">'+maxPed+'</div><div class="ap-stat-sub">Max/día</div></div>' +
    '<div class="ap-stat"><div class="ap-stat-lbl">Pico entrega</div><div class="ap-stat-num sw" id="apS4">'+maxEnt+'</div><div class="ap-stat-sub">Max/día</div></div>' +
    '</div></div></div>' +
    '<div class="ap-body">' +
    // Banner hoy
    '<div id="apHoyWrap"></div>' +
    // Formulario
    '<div class="ap-panel" id="apFormPanel">' +
    '<div class="ap-panel-hdr ap-panel-hdr-toggle" onclick="_apTogglePanel(\'apFormBody\',\'apFormChev\')"><div class="ap-panel-ico ico-verde">🏭</div><div class="ap-panel-txt"><div class="ap-panel-title">Registrar / Editar Proveedor</div><div class="ap-panel-desc">Nombre · días de pedido · días de entrega</div></div><span class="ap-chevron" id="apFormChev">▾</span></div>' +
    '<div class="ap-panel-body ap-panel-body-hidden" id="apFormBody"><div id="apFormWrap"></div></div></div>' +
    // Tabla
    '<div class="ap-panel">' +
    '<div class="ap-panel-hdr ap-panel-hdr-toggle" onclick="_apTogglePanel(\'apTablaBody\',\'apTablaChev\')"><div class="ap-panel-ico ico-azul">📋</div><div class="ap-panel-txt"><div class="ap-panel-title">Proveedores Registrados</div><div class="ap-panel-desc">Pedido y entrega · Lunes a Domingo</div></div><span class="ap-badge" id="apBadge">'+total+'</span><span class="ap-chevron" id="apTablaChev">▾</span></div>' +
    '<div id="apTablaBody" class="ap-panel-body-hidden"><div id="apTablaWrap"></div></div></div>' +
    // Pedidos de hoy
    '<div class="ap-pedidos">' +
    '<div class="ap-pedidos-hdr"><div class="ap-pedidos-ico">🚚</div><div class="ap-pedidos-txt"><div class="ap-pedidos-title">Entregas de Hoy · '+diaHoy+'</div><div class="ap-pedidos-sub">Marca cada entrega al recibirla</div></div>' +
    '<div style="display:flex;flex-direction:column;align-items:center;gap:1px;" id="apPedCnt">' +
    '<span style="font-size:22px;font-weight:900;color:#fff;font-family:Nunito,sans-serif;line-height:1;">'+pedidosHoy.length+'</span>' +
    '<span style="font-size:9px;font-weight:900;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.8px;font-family:Nunito,sans-serif;">'+recHoy+'/'+pedidosHoy.length+' ✓</span>' +
    '</div></div>' +
    '<div id="apPedidosWrap"></div></div>' +
    // Preventas de hoy
    '<div class="ap-preventas">' +
    '<div class="ap-preventas-hdr"><div class="ap-preventas-ico">🛒</div><div class="ap-preventas-txt"><div class="ap-preventas-title">Preventas de Hoy · '+diaHoy+'</div><div class="ap-preventas-sub">Proveedores que pasan hoy · haz tu pedido</div></div>' +
    '<div style="display:flex;flex-direction:column;align-items:center;gap:1px;" id="apPrevCnt">' +
    '<span style="font-size:22px;font-weight:900;color:#fff;font-family:Nunito,sans-serif;line-height:1;">'+preventasHoy.length+'</span>' +
    '<span style="font-size:9px;font-weight:900;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.8px;font-family:Nunito,sans-serif;">'+pedhHoy+'/'+preventasHoy.length+' ✓</span>' +
    '</div></div>' +
    '<div id="apPreventasWrap"></div></div>' +
    '</div>';

  _apRefreshForm();
  _apRefreshTabla();
  _apRefreshHoy();
  _apRefreshPedidos();
  _apRefreshPreventas();
}
