// =====================================================================
//  DESPENSA ECONÓMICA — Supabase Sync
//  Reemplaza la integración con Google Sheets.
//  Carga este archivo ANTES que app.js en index.html.
//  Mantiene los mismos nombres de función para compatibilidad total.
// =====================================================================

let _supabase = null;
let _autoSyncTimer = null;
const AUTO_SYNC_MS = 5 * 60 * 1000; // 5 minutos

// ── Inicializar cliente Supabase ──────────────────────────────────────
function getSupabase() {
  if (_supabase) return _supabase;
  const url = localStorage.getItem('vpos_supabaseUrl') || '';
  const key = localStorage.getItem('vpos_supabaseKey') || '';
  if (!url || !key) return null;
  try {
    _supabase = supabase.createClient(url, key);
  } catch(e) {
    console.error('[Supabase] Error al inicializar:', e);
    return null;
  }
  return _supabase;
}

// ── Envío compatible (acepta accion: VENTA / PRODUCTOS / VENTAS_DIARIAS) ─
async function sheetsEnviar(accion, datos) {
  const sb = getSupabase();
  if (!sb) return; // sin config → silencio total

  try {
    if (accion === 'VENTA') {
      const { error } = await sb.from('ventas').upsert({
        id:        datos.id,
        fecha_iso: datos.fecha || new Date().toISOString(),
        total:     parseFloat(datos.total)  || 0,
        pago:      parseFloat(datos.pago)   || 0,
        vuelto:    parseFloat(datos.vuelto) || 0,
        items:     datos.items || ''
      }, { onConflict: 'id' });
      if (error) console.warn('[Supabase VENTA]', error.message);
    }

    if (accion === 'PRODUCTOS') {
      // Recibe filas básicas [id, nom, cat, compra, venta, stock, min]
      const rows = (datos.filas || []).map(f => ({
        id:     String(f[0]),
        nom:    f[1] || '',
        cat:    f[2] || '',
        compra: parseFloat(f[3]) || 0,
        venta:  parseFloat(f[4]) || 0,
        stock:  parseInt(f[5])   || 0,
        min:    parseInt(f[6])   || 0
      }));
      if (rows.length) {
        await sb.from('productos').delete().neq('id', '__never__');
        for (let i = 0; i < rows.length; i += 100) {
          const { error } = await sb.from('productos').insert(rows.slice(i, i + 100));
          if (error) console.warn('[Supabase PRODUCTOS]', error.message);
        }
      }
    }

    if (accion === 'VENTAS_DIARIAS') {
      const rows = (datos.filas || []).map(f => ({
        fecha: String(f[0]),
        monto: parseFloat(f[1]) || 0,
        nota:  f[2] || ''
      }));
      if (rows.length) {
        const { error } = await sb.from('ventas_diarias').upsert(rows, { onConflict: 'fecha' });
        if (error) console.warn('[Supabase VD]', error.message);
      }
    }
  } catch(e) {
    console.warn('[Supabase sheetsEnviar]', e.message);
  }
}

// ── Importar TODO desde Supabase (sync bidireccional) ─────────────────
async function sheetsImportar() {
  const sb = getSupabase();
  if (!sb) { toast('Primero configura Supabase ⚙️', true); return; }

  toast('⏳ Importando desde Supabase…');
  try {
    const [resProd, resVentas, resVD] = await Promise.all([
      sb.from('productos').select('*'),
      sb.from('ventas').select('*').order('fecha_iso', { ascending: false }).limit(1000),
      sb.from('ventas_diarias').select('*')
    ]);

    if (resProd.error)   throw new Error('Productos: ' + resProd.error.message);
    if (resVentas.error) throw new Error('Ventas: '    + resVentas.error.message);
    if (resVD.error)     throw new Error('VD: '        + resVD.error.message);

    let cambios = 0;

    // ── Productos ─────────────────────────────────────────────────────
    if (resProd.data && resProd.data.length) {
      productos = resProd.data.map(r => ({
        id:       Number(r.id)            || Date.now(),
        nom:      r.nom                   || '',
        cat:      r.cat                   || '',
        compra:   parseFloat(r.compra)    || 0,
        venta:    parseFloat(r.venta)     || 0,
        stock:    parseInt(r.stock)       || 0,
        min:      parseInt(r.min)         || 0,
        cod:      r.cod                   || '',
        abrev:    r.abrev                 || '',
        img:      r.img                   || null,
        paquetes: Array.isArray(r.paquetes) ? r.paquetes : [],
        lotes:    Array.isArray(r.lotes)    ? r.lotes    : []
      }));
      cambios++;
    }

    // ── Ventas diarias (fusión: no borra entradas locales) ─────────────
    if (resVD.data && resVD.data.length) {
      const mapaRemoto = {};
      resVD.data.forEach(r => {
        if (r.fecha) mapaRemoto[r.fecha] = {
          fecha: r.fecha,
          monto: parseFloat(r.monto) || 0,
          nota:  r.nota || ''
        };
      });
      const mapaLocal = {};
      ventasDiarias.forEach(v => { mapaLocal[v.fecha] = v; });
      Object.keys(mapaRemoto).forEach(f => {
        if (!mapaLocal[f]) mapaLocal[f] = mapaRemoto[f];
      });
      ventasDiarias = Object.values(mapaLocal).sort((a, b) => a.fecha.localeCompare(b.fecha));
      cambios++;
    }

    // ── Historial (solo agrega registros nuevos) ───────────────────────
    if (resVentas.data && resVentas.data.length) {
      const idsLocales = new Set(historial.map(h => String(h.id)));
      let nuevas = 0;
      resVentas.data.forEach(r => {
        const id = String(r.id || '');
        if (id && !idsLocales.has(id)) {
          const fechaStr = r.fecha_iso
            ? new Date(r.fecha_iso).toLocaleString('es-SV')
            : '';
          historial.push({
            id,
            fechaISO: r.fecha_iso || '',
            fechaStr,
            total:  parseFloat(r.total)  || 0,
            pago:   parseFloat(r.pago)   || 0,
            vuelto: parseFloat(r.vuelto) || 0,
            items:  r.items || ''
          });
          nuevas++;
        }
      });
      if (nuevas) cambios++;
    }

    if (cambios) {
      await idbSetMany([
        ['vpos_productos',     productos],
        ['vpos_ventasDiarias', ventasDiarias],
        ['vpos_historial',     historial]
      ]);
      actualizarTodo();
      toast('✅ Sincronizado desde Supabase');
    } else {
      toast('✓ Sin cambios nuevos');
    }

    localStorage.setItem('vpos_ultimoSync', new Date().toISOString());
    _actualizarBadgeSync();

  } catch(e) {
    console.error('[Supabase import]', e);
    toast('⚠️ Error al importar: ' + e.message, true);
  }
}

// ── Auto-sync periódico ───────────────────────────────────────────────
function iniciarAutoSync() {
  const activo = localStorage.getItem('vpos_autoSync') === '1';
  if (_autoSyncTimer) { clearInterval(_autoSyncTimer); _autoSyncTimer = null; }
  if (activo) {
    _autoSyncTimer = setInterval(() => sheetsImportar(), AUTO_SYNC_MS);
    console.log('[Supabase] Auto-sync cada 5 min activado');
  }
}

// ── Config modal ──────────────────────────────────────────────────────
function abrirConfigSheets() {
  const url = localStorage.getItem('vpos_supabaseUrl') || '';
  const key = localStorage.getItem('vpos_supabaseKey') || '';
  document.getElementById('sbUrlInput').value = url;
  document.getElementById('sbKeyInput').value = key;
  const chk = document.getElementById('chkAutoSync');
  if (chk) chk.checked = localStorage.getItem('vpos_autoSync') === '1';
  _actualizarBadgeSync();
  abrirModal('modalSheetsConfig');
}

function guardarConfigSheets() {
  const url = document.getElementById('sbUrlInput').value.trim();
  const key = document.getElementById('sbKeyInput').value.trim();
  if (url && !url.startsWith('https://')) {
    toast('⚠️ La URL debe empezar con https://', true); return;
  }
  localStorage.setItem('vpos_supabaseUrl', url);
  localStorage.setItem('vpos_supabaseKey', key);
  _supabase = null; // reiniciar cliente con nuevas credenciales
  const chk = document.getElementById('chkAutoSync');
  if (chk) localStorage.setItem('vpos_autoSync', chk.checked ? '1' : '0');
  actualizarBadgeSheets();
  iniciarAutoSync();
  cerrarModal('modalSheetsConfig');
  toast(url ? '✓ Supabase conectado' : 'Supabase desconectado');
}

function desconectarSupabase() {
  localStorage.removeItem('vpos_supabaseUrl');
  localStorage.removeItem('vpos_supabaseKey');
  _supabase = null;
  actualizarBadgeSheets();
  cerrarModal('modalSheetsConfig');
  toast('Supabase desconectado');
}

function actualizarBadgeSheets() {
  const url = localStorage.getItem('vpos_supabaseUrl') || '';
  document.querySelectorAll('.sheets-status').forEach(el => {
    el.textContent = url ? '🟢 Sync ON' : '⚙️ Sync';
    el.style.color  = url ? '#16a34a' : '#6b7280';
  });
}

function _actualizarBadgeSync() {
  const ts = localStorage.getItem('vpos_ultimoSync');
  const el = document.getElementById('ultimoSyncLabel');
  if (!el) return;
  if (ts) {
    const d = new Date(ts);
    el.textContent = 'Último sync: ' + d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  } else {
    el.textContent = 'Nunca sincronizado';
  }
}

// ── Exportar inventario completo (con imágenes, paquetes, etc.) ────────
async function sheetsExportarProductos() {
  const sb = getSupabase();
  if (!sb) { toast('Primero configura Supabase ⚙️', true); return; }
  toast('Exportando inventario a Supabase…');
  try {
    const { error: errDel } = await sb.from('productos').delete().neq('id', '__never__');
    if (errDel) throw new Error(errDel.message);
    if (productos.length) {
      const rows = productos.map(p => ({
        id:       String(p.id),
        nom:      p.nom    || '',
        cat:      p.cat    || '',
        compra:   p.compra || 0,
        venta:    p.venta  || 0,
        stock:    p.stock  || 0,
        min:      p.min    || 0,
        cod:      p.cod    || '',
        abrev:    p.abrev  || '',
        img:      p.img    || null,
        paquetes: p.paquetes || [],
        lotes:    p.lotes    || []
      }));
      for (let i = 0; i < rows.length; i += 100) {
        const { error } = await sb.from('productos').insert(rows.slice(i, i + 100));
        if (error) throw new Error(error.message);
      }
    }
    toast('✓ Inventario enviado a Supabase (' + productos.length + ' productos)');
  } catch(e) {
    toast('⚠ ' + e.message, true);
  }
}

// ── Exportar ventas diarias ───────────────────────────────────────────
async function sheetsExportarVentasDiarias() {
  const sb = getSupabase();
  if (!sb) { toast('Primero configura Supabase ⚙️', true); return; }
  toast('Exportando ventas diarias…');
  const filas = ventasDiarias.map(v => [v.fecha, v.monto, v.nota || '']);
  await sheetsEnviar('VENTAS_DIARIAS', { filas });
  toast('✓ Ventas diarias enviadas a Supabase');
}

// ── Exportar TODO de una vez ──────────────────────────────────────────
async function sheetsExportarTodo() {
  const sb = getSupabase();
  if (!sb) { toast('Primero configura Supabase ⚙️', true); return; }
  toast('⏳ Exportando todo a Supabase…');
  await sheetsExportarProductos();
  const filasVD = ventasDiarias.map(v => [v.fecha, v.monto, v.nota || '']);
  await sheetsEnviar('VENTAS_DIARIAS', { filas: filasVD });
  localStorage.setItem('vpos_ultimoSync', new Date().toISOString());
  _actualizarBadgeSync();
  toast('✅ Todo exportado a Supabase');
}

// ── Ping / test de conexión ───────────────────────────────────────────
async function testConexionSupabase() {
  // Leer directamente de los inputs (no requiere haber guardado antes)
  const url = (document.getElementById('sbUrlInput')?.value || '').trim();
  const key = (document.getElementById('sbKeyInput')?.value || '').trim();
  const btn = document.getElementById('btnTestConexion');

  if (!url || !key) { toast('Ingresa la URL y la Key primero', true); return; }
  if (!url.startsWith('https://')) { toast('⚠️ La URL debe empezar con https://', true); return; }

  if (btn) { btn.disabled = true; btn.textContent = '⏳ Probando…'; }
  try {
    const clienteTest = supabase.createClient(url, key);
    const { error } = await clienteTest.from('productos').select('id').limit(1);
    if (error) throw new Error(error.message);
    toast('✅ Conexión exitosa a Supabase');
  } catch(e) {
    toast('⚠ Error: ' + e.message, true);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🔌 Probar conexión'; }
  }
}
