// =====================================================================
//  DESPENSA ECONÓMICA — Supabase Sync (REST API directa, sin SDK)
// =====================================================================

let _autoSyncTimer = null;
const AUTO_SYNC_MS = 5 * 60 * 1000;

function _sbUrl() { return (localStorage.getItem('vpos_supabaseUrl') || '').replace(/\/$/, ''); }
function _sbKey() { return localStorage.getItem('vpos_supabaseKey') || ''; }

function _sbHeaders(extra) {
  const key = _sbKey();
  return Object.assign({ 'apikey': key, 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, extra || {});
}

async function _sbGet(tabla, params) {
  const url = _sbUrl(); const key = _sbKey();
  if (!url || !key) throw new Error('Sin configuración de Supabase');
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const resp = await fetch(url + '/rest/v1/' + tabla + qs, { headers: { 'apikey': key, 'Authorization': 'Bearer ' + key } });
  if (!resp.ok) { const txt = await resp.text(); throw new Error('HTTP ' + resp.status + ': ' + txt); }
  return resp.json();
}

async function _sbPost(tabla, body, upsert) {
  const url = _sbUrl(); const key = _sbKey();
  if (!url || !key) throw new Error('Sin configuración de Supabase');
  const pref = upsert ? 'resolution=merge-duplicates,return=minimal' : 'return=minimal';
  const resp = await fetch(url + '/rest/v1/' + tabla, {
    method: 'POST',
    headers: { 'apikey': key, 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'Prefer': pref },
    body: JSON.stringify(body)
  });
  if (!resp.ok) { const txt = await resp.text(); throw new Error('HTTP ' + resp.status + ': ' + txt); }
}

async function _sbDelete(tabla) {
  const url = _sbUrl(); const key = _sbKey();
  if (!url || !key) throw new Error('Sin configuración de Supabase');
  const resp = await fetch(url + '/rest/v1/' + tabla + '?id=neq.null', {
    method: 'DELETE',
    headers: { 'apikey': key, 'Authorization': 'Bearer ' + key, 'Prefer': 'return=minimal' }
  });
  if (!resp.ok) { const txt = await resp.text(); throw new Error('HTTP ' + resp.status + ': ' + txt); }
}

async function sheetsEnviar(accion, datos) {
  if (!_sbUrl() || !_sbKey()) return;
  try {
    if (accion === 'VENTA') {
      await _sbPost('ventas', { id: datos.id, fecha_iso: datos.fecha || new Date().toISOString(),
        total: parseFloat(datos.total)||0, pago: parseFloat(datos.pago)||0, vuelto: parseFloat(datos.vuelto)||0, items: datos.items||'' }, true);
    }
    if (accion === 'PRODUCTOS') {
      const rows = (datos.filas||[]).map(f => ({ id: String(f[0]), nom: f[1]||'', cat: f[2]||'', compra: parseFloat(f[3])||0, venta: parseFloat(f[4])||0, stock: parseInt(f[5])||0, min: parseInt(f[6])||0 }));
      if (rows.length) { await _sbDelete('productos'); for (let i=0;i<rows.length;i+=100) await _sbPost('productos', rows.slice(i,i+100), false); }
    }
    if (accion === 'VENTAS_DIARIAS') {
      const rows = (datos.filas||[]).map(f => ({ fecha: String(f[0]), monto: parseFloat(f[1])||0, nota: f[2]||'' }));
      if (rows.length) await _sbPost('ventas_diarias', rows, true);
    }
  } catch(e) { console.warn('[Supabase]', e.message); }
}

async function sheetsImportar() {
  if (!_sbUrl() || !_sbKey()) { toast('Primero configura Supabase ⚙️', true); return; }
  toast('⏳ Importando desde Supabase…');
  try {
    const [dataProd, dataVentas, dataVD] = await Promise.all([
      _sbGet('productos', { select: '*' }),
      _sbGet('ventas', { select: '*', order: 'fecha_iso.desc', limit: 1000 }),
      _sbGet('ventas_diarias', { select: '*' })
    ]);
    let cambios = 0;
    if (dataProd && dataProd.length) {
      productos = dataProd.map(r => ({ id: Number(r.id)||Date.now(), nom: r.nom||'', cat: r.cat||'', compra: parseFloat(r.compra)||0, venta: parseFloat(r.venta)||0, stock: parseInt(r.stock)||0, min: parseInt(r.min)||0, cod: r.cod||'', abrev: r.abrev||'', img: r.img||null, paquetes: Array.isArray(r.paquetes)?r.paquetes:[], lotes: Array.isArray(r.lotes)?r.lotes:[] }));
      cambios++;
    }
    if (dataVD && dataVD.length) {
      const mr = {}; dataVD.forEach(r => { if (r.fecha) mr[r.fecha] = { fecha: r.fecha, monto: parseFloat(r.monto)||0, nota: r.nota||'' }; });
      const ml = {}; ventasDiarias.forEach(v => { ml[v.fecha] = v; });
      Object.keys(mr).forEach(f => { if (!ml[f]) ml[f] = mr[f]; });
      ventasDiarias = Object.values(ml).sort((a,b) => a.fecha.localeCompare(b.fecha));
      cambios++;
    }
    if (dataVentas && dataVentas.length) {
      const ids = new Set(historial.map(h => String(h.id))); let nuevas = 0;
      dataVentas.forEach(r => { const id = String(r.id||''); if (id && !ids.has(id)) { historial.push({ id, fechaISO: r.fecha_iso||'', fechaStr: r.fecha_iso ? new Date(r.fecha_iso).toLocaleString('es-SV') : '', total: parseFloat(r.total)||0, pago: parseFloat(r.pago)||0, vuelto: parseFloat(r.vuelto)||0, items: r.items||'' }); nuevas++; } });
      if (nuevas) cambios++;
    }
    if (cambios) {
      await idbSetMany([['vpos_productos',productos],['vpos_ventasDiarias',ventasDiarias],['vpos_historial',historial]]);
      actualizarTodo(); toast('✅ Sincronizado desde Supabase');
    } else { toast('✓ Sin cambios nuevos'); }
    localStorage.setItem('vpos_ultimoSync', new Date().toISOString());
    _actualizarBadgeSync();
  } catch(e) { console.error('[Supabase import]', e); toast('⚠️ Error: ' + e.message, true); }
}

function iniciarAutoSync() {
  const activo = localStorage.getItem('vpos_autoSync') === '1';
  if (_autoSyncTimer) { clearInterval(_autoSyncTimer); _autoSyncTimer = null; }
  if (activo) { _autoSyncTimer = setInterval(() => sheetsImportar(), AUTO_SYNC_MS); }
}

function abrirConfigSheets() {
  document.getElementById('sbUrlInput').value = _sbUrl();
  document.getElementById('sbKeyInput').value = _sbKey();
  const chk = document.getElementById('chkAutoSync');
  if (chk) chk.checked = localStorage.getItem('vpos_autoSync') === '1';
  _actualizarBadgeSync();
  abrirModal('modalSheetsConfig');
}

function guardarConfigSheets() {
  const url = document.getElementById('sbUrlInput').value.trim();
  const key = document.getElementById('sbKeyInput').value.trim();
  if (url && !url.startsWith('https://')) { toast('⚠️ La URL debe empezar con https://', true); return; }
  localStorage.setItem('vpos_supabaseUrl', url);
  localStorage.setItem('vpos_supabaseKey', key);
  const chk = document.getElementById('chkAutoSync');
  if (chk) localStorage.setItem('vpos_autoSync', chk.checked ? '1' : '0');
  actualizarBadgeSheets(); iniciarAutoSync();
  cerrarModal('modalSheetsConfig');
  toast(url ? '✓ Supabase conectado' : 'Supabase desconectado');
}

function desconectarSupabase() {
  localStorage.removeItem('vpos_supabaseUrl'); localStorage.removeItem('vpos_supabaseKey');
  actualizarBadgeSheets(); cerrarModal('modalSheetsConfig'); toast('Supabase desconectado');
}

function actualizarBadgeSheets() {
  const url = _sbUrl();
  document.querySelectorAll('.sheets-status').forEach(el => { el.textContent = url ? '🟢 Sync ON' : '⚙️ Sync'; el.style.color = url ? '#16a34a' : '#6b7280'; });
}

function _actualizarBadgeSync() {
  const ts = localStorage.getItem('vpos_ultimoSync');
  const el = document.getElementById('ultimoSyncLabel');
  if (!el) return;
  el.textContent = ts ? 'Último sync: ' + new Date(ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : 'Nunca sincronizado';
}

async function sheetsExportarProductos() {
  if (!_sbUrl()) { toast('Primero configura Supabase ⚙️', true); return; }
  toast('Exportando inventario…');
  try {
    await _sbDelete('productos');
    const rows = productos.map(p => ({ id: String(p.id), nom: p.nom||'', cat: p.cat||'', compra: p.compra||0, venta: p.venta||0, stock: p.stock||0, min: p.min||0, cod: p.cod||'', abrev: p.abrev||'', img: p.img||null, paquetes: p.paquetes||[], lotes: p.lotes||[] }));
    for (let i=0;i<rows.length;i+=100) await _sbPost('productos', rows.slice(i,i+100), false);
    toast('✓ Inventario enviado (' + productos.length + ' productos)');
  } catch(e) { toast('⚠ ' + e.message, true); }
}

async function sheetsExportarVentasDiarias() {
  if (!_sbUrl()) { toast('Primero configura Supabase ⚙️', true); return; }
  const filas = ventasDiarias.map(v => [v.fecha, v.monto, v.nota||'']);
  await sheetsEnviar('VENTAS_DIARIAS', { filas }); toast('✓ Ventas diarias enviadas');
}

async function sheetsExportarTodo() {
  if (!_sbUrl()) { toast('Primero configura Supabase ⚙️', true); return; }
  toast('⏳ Exportando todo…');
  await sheetsExportarProductos();
  const filasVD = ventasDiarias.map(v => [v.fecha, v.monto, v.nota||'']);
  await sheetsEnviar('VENTAS_DIARIAS', { filas: filasVD });
  localStorage.setItem('vpos_ultimoSync', new Date().toISOString());
  _actualizarBadgeSync(); toast('✅ Todo exportado a Supabase');
}

async function testConexionSupabase() {
  const url = (document.getElementById('sbUrlInput')?.value || '').trim().replace(/\/$/, '');
  const key = (document.getElementById('sbKeyInput')?.value || '').trim();
  const btn = document.getElementById('btnTestConexion');
  if (!url || !key) { toast('Ingresa la URL y la Key primero', true); return; }
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Probando…'; }
  try {
    const resp = await fetch(url + '/rest/v1/productos?select=id&limit=1', {
      headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
    });
    if (!resp.ok) { const txt = await resp.text(); throw new Error('HTTP ' + resp.status + ' — ' + txt); }
    toast('✅ Conexión exitosa a Supabase');
  } catch(e) {
    toast('⚠ ' + e.message, true);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🔌 Probar conexión'; }
  }
}
