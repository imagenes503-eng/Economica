// ===== SCANNER CÓDIGO DE BARRAS =====
// Motor único: ZXing.BrowserMultiFormatReader — puro JS, sin WASM.
// Funciona en Chrome, Firefox y Safari sin dual-engine ni dual-stream.
let _scannerRunning = false;
let _lastScanTs     = 0;
let _scannerModo    = 'venta';
let _zxingReader    = null;   // instancia BrowserMultiFormatReader activa

// ZXing-JS — versión 0.18.6: la más estable en UMD para uso en browser
// (0.19.x cambió el namespace de algunas clases internas en el bundle UMD)
const _ZXING_CDN = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.18.6/umd/index.min.js';

// Inyectar CSS de animación de línea de escaneo (una sola vez)
(function () {
  if (document.getElementById('_scanLineStyle')) return;
  const s = document.createElement('style');
  s.id = '_scanLineStyle';
  s.textContent = '@keyframes _scanAnim{0%{top:4%}50%{top:85%}100%{top:4%}}';
  document.head.appendChild(s);
})();

// Carga lazy de ZXing (solo cuando se abre el scanner)
function _loadZxing() {
  if (window.ZXing && window.ZXing.BrowserMultiFormatReader) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = _ZXING_CDN;
    s.onload = () => {
      // Verificar que la clase principal esté disponible
      if (window.ZXing && window.ZXing.BrowserMultiFormatReader) {
        resolve();
      } else {
        reject(new Error('ZXing cargó pero BrowserMultiFormatReader no está disponible'));
      }
    };
    s.onerror = () => reject(new Error('No se pudo cargar el decodificador de códigos'));
    document.head.appendChild(s);
  });
}

function setScannerStatus(txt) {
  const el = document.getElementById('scannerStatusTxt');
  if (el) el.textContent = txt;
}

function ocultarResultadoScanner() {
  const a = document.getElementById('scannerResultBox');
  const b = document.getElementById('scannerNoEncontrado');
  if (a) a.style.display = 'none';
  if (b) b.style.display = 'none';
}

async function abrirScannerVenta() {
  _scannerModo = 'venta';
  ocultarResultadoScanner();
  document.getElementById('modalScanner').style.display = 'flex';
  setScannerStatus('Iniciando cámara…');
  await iniciarScanner();
}

async function abrirScannerInventario() {
  _scannerModo = 'inventario';
  ocultarResultadoScanner();
  document.getElementById('modalScanner').style.display = 'flex';
  setScannerStatus('Iniciando cámara…');
  await iniciarScanner();
}

// Detiene todo: el loop de ZXing, el stream de cámara y limpia el DOM del scanner
async function _detenerScanInterno() {
  _scannerRunning = false;
  if (_zxingReader) {
    try { _zxingReader.reset(); } catch (_) {}
    _zxingReader = null;
  }
}

async function iniciarScanner() {
  await _detenerScanInterno();

  const region = document.getElementById('scannerRegion');
  if (!region) return;
  region.innerHTML = '';
  region.style.position = 'relative';

  // ── Video element (ZXing lo usará como destino del stream) ────────────
  const video = document.createElement('video');
  video.setAttribute('playsinline', '');
  video.setAttribute('autoplay', '');
  video.muted = true;
  video.style.cssText = [
    'width:100%',
    'height:260px',
    'object-fit:cover',
    'border-radius:12px',
    'display:block',
    'background:#000',
  ].join(';');
  region.appendChild(video);

  // ── Overlay: caja de escaneo + esquinas + línea animada ───────────────
  const overlay = document.createElement('div');
  overlay.style.cssText = [
    'position:absolute',
    'top:0',
    'left:0',
    'width:100%',
    'height:260px',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'pointer-events:none',
  ].join(';');
  overlay.innerHTML = `
    <div style="position:relative;width:280px;height:120px;
                border:2.5px solid #38bdf8;border-radius:10px;
                box-shadow:0 0 0 2000px rgba(0,0,0,0.45);">
      <div style="position:absolute;top:-3px;left:-3px;width:22px;height:22px;
                  border-top:4px solid #38bdf8;border-left:4px solid #38bdf8;
                  border-radius:5px 0 0 0;"></div>
      <div style="position:absolute;top:-3px;right:-3px;width:22px;height:22px;
                  border-top:4px solid #38bdf8;border-right:4px solid #38bdf8;
                  border-radius:0 5px 0 0;"></div>
      <div style="position:absolute;bottom:-3px;left:-3px;width:22px;height:22px;
                  border-bottom:4px solid #38bdf8;border-left:4px solid #38bdf8;
                  border-radius:0 0 0 5px;"></div>
      <div style="position:absolute;bottom:-3px;right:-3px;width:22px;height:22px;
                  border-bottom:4px solid #38bdf8;border-right:4px solid #38bdf8;
                  border-radius:0 0 5px 0;"></div>
      <div style="position:absolute;left:6px;right:6px;height:2.5px;
                  background:linear-gradient(90deg,transparent,#38bdf8,transparent);
                  animation:_scanAnim 1.8s ease-in-out infinite;"></div>
    </div>`;
  region.appendChild(overlay);

  // ── Cargar ZXing y arrancar el scan ───────────────────────────────────
  try {
    setScannerStatus('Cargando decodificador…');
    await _loadZxing();

    const hints = new Map();
    hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
      ZXing.BarcodeFormat.EAN_13,
      ZXing.BarcodeFormat.EAN_8,
      ZXing.BarcodeFormat.UPC_A,
      ZXing.BarcodeFormat.UPC_E,
      ZXing.BarcodeFormat.CODE_128,
      ZXing.BarcodeFormat.CODE_39,
      ZXing.BarcodeFormat.ITF,
      ZXing.BarcodeFormat.QR_CODE,
    ]);
    // TRY_HARDER: intenta múltiples orientaciones y binarizaciones por frame.
    // Imprescindible para leer EAN-8, códigos dañados o mal iluminados.
    hints.set(ZXing.DecodeHintType.TRY_HARDER, true);

    // 250ms entre intentos de decodificación (~4 fps de scan)
    // Suficiente para un POS; más frecuente no mejora la tasa de lectura.
    _zxingReader = new ZXing.BrowserMultiFormatReader(hints, 250);

    _scannerRunning = true;
    setScannerStatus('📷 Apunta al código de barras…');

    // decodeFromConstraints:
    //   - Llama getUserMedia con las constraints dadas
    //   - Asigna el stream al video element
    //   - Ejecuta el callback en cada intento de decodificación
    //   - NO hacer await: retorna una Promise que solo resuelve al parar el scan
    // El callback recibe (result, error):
    //   result = barcode decodificado (o null si no encontró nada en este frame)
    //   error  = NotFoundException cuando no hay código visible — COMPLETAMENTE NORMAL
    _zxingReader.decodeFromConstraints(
      {
        video: {
          facingMode: { ideal: 'environment' },
          width:      { ideal: 1280 },
          height:     { ideal: 720  },
        },
      },
      video,
      (result, _err) => {
        if (!_scannerRunning) return;
        if (result) onCodigoEscaneado(result.getText());
        // _err es NotFoundException en frames sin código → ignorar siempre
      }
    ).catch(err => {
      // Solo llega aquí si getUserMedia rechaza (permiso denegado / sin cámara)
      if (!_scannerRunning) return;
      _scannerRunning = false;
      const msg        = err ? (err.message || String(err)) : '';
      const esPermiso  = /NotAllowed|Permission|denied/i.test(msg);
      const esNoCamera = /NotFound|DevicesNotFound|Requested/i.test(msg);
      _mostrarErrorCamara(region, esPermiso, esNoCamera, msg);
      setScannerStatus(
        esPermiso  ? '⚠ Permiso de cámara denegado' :
        esNoCamera ? '⚠ No se encontró cámara'      :
                     '⚠ ' + msg.slice(0, 60)
      );
    });

  } catch (err) {
    // Error al cargar ZXing o al crear BrowserMultiFormatReader
    _scannerRunning = false;
    const msg = err ? (err.message || String(err)) : 'Error desconocido';
    _mostrarErrorCamara(region, false, false, msg);
    setScannerStatus('⚠ ' + msg.slice(0, 60));
  }
}

function _mostrarErrorCamara(region, esPermiso, esNoCamera, msg) {
  if (esPermiso) {
    region.innerHTML = `
      <div style="padding:24px;text-align:center;color:#fff;">
        <div style="font-size:42px;margin-bottom:12px;">📵</div>
        <div style="font-size:15px;font-weight:900;margin-bottom:10px;">
          Permiso de cámara denegado
        </div>
        <div style="font-size:12px;color:rgba(255,255,255,0.75);line-height:1.9;margin-bottom:16px;">
          Toca el 🔒 en la barra del navegador<br>
          → Permisos → Cámara → <strong>Permitir</strong><br>
          Luego recarga la página.
        </div>
        <button onclick="location.reload()"
          style="background:#16a34a;color:#fff;border:none;border-radius:10px;
                 padding:11px 24px;font-size:14px;font-weight:900;cursor:pointer;">
          🔄 Recargar página
        </button>
      </div>`;
  } else {
    region.innerHTML = `
      <div style="padding:24px;text-align:center;color:#fff;">
        <div style="font-size:38px;margin-bottom:10px;">⚠️</div>
        <div style="font-size:14px;font-weight:900;">
          ${esNoCamera ? 'No se encontró cámara' : 'Error al iniciar el escáner'}
        </div>
        <div style="font-size:11px;color:rgba(255,255,255,0.55);margin-top:8px;">
          ${msg.slice(0, 140)}
        </div>
      </div>`;
  }
}

async function cerrarScanner() {
  await _detenerScanInterno();
  const region = document.getElementById('scannerRegion');
  if (region) region.innerHTML = '';
  _scannerModo = 'venta';
  const modal = document.getElementById('modalScanner');
  if (modal) modal.style.display = 'none';
  ocultarResultadoScanner();
}

function onCodigoEscaneado(codigo) {
  if (!codigo) return;

  // Modo inventario: pegar código en el formulario, no en el carrito
  if (_scannerModo === 'inventario') {
    onCodigoInventario(codigo);
    return;
  }

  // Anti-rebote: ignorar lecturas repetidas en menos de 600ms
  const now = Date.now();
  if (now - _lastScanTs < 600) return;
  _lastScanTs = now;

  if (navigator.vibrate) navigator.vibrate([60, 30, 60]);

  const codLimpio = codigo.trim();
  setScannerStatus('Leído: ' + codLimpio);

  // Búsqueda exacta primero, luego flexible (ignora ceros a la izquierda)
  let prod = productos.find(p => (p.cod || '').trim() === codLimpio);
  if (!prod) {
    prod = productos.find(p => {
      const c = (p.cod || '').trim();
      return c && (
        c === codLimpio ||
        c.replace(/^0+/, '') === codLimpio.replace(/^0+/, '')
      );
    });
  }

  if (prod) {
    document.getElementById('scannerNoEncontrado').style.display = 'none';
    const box = document.getElementById('scannerResultBox');
    box.style.display = 'flex';
    document.getElementById('scannerResultNom').textContent  = prod.nom;
    document.getElementById('scannerResultMeta').textContent =
      '$' + fmtP(prod.venta || 0) +
      '  •  Stock: ' + (prod.stock || 0) +
      '  •  ' + codLimpio;

    cerrarScanner();
    if ((prod.stock || 0) <= 0) {
      toast('⚠ ' + prod.nom + ' — sin stock', true);
    } else {
      (prod.paquetes || []).length > 0
        ? abrirPickerPaquetes(prod)
        : addCarrito(prod);
    }

  } else {
    document.getElementById('scannerResultBox').style.display = 'none';
    const noEnc = document.getElementById('scannerNoEncontrado');
    noEnc.style.display = 'block';
    document.getElementById('scannerCodLeido').textContent = 'Código: ' + codLimpio;
    const inp = document.getElementById('busquedaVenta');
    if (inp) { inp.value = codLimpio; }
    setTimeout(() => { noEnc.style.display = 'none'; }, 3500);
  }
}

// ===== SCANNER INVENTARIO — onCodigoInventario =====
function onCodigoInventario(codigo) {
  const now = Date.now();
  if (now - _lastScanTs < 600) return;
  _lastScanTs = now;
  if (navigator.vibrate) navigator.vibrate([60, 30, 60]);
  const codLimpio = codigo.trim();
  const existe = productos.find(p => (p.cod || '').trim() === codLimpio);
  setTimeout(async () => {
    await cerrarScanner();
    const titulo = document.querySelector('#modalScanner [style*="font-size:16px"]');
    if (titulo) titulo.textContent = '▦ Lector de Código de Barras';
    _scannerModo = 'venta';
    const inp = document.getElementById('inpCod');
    if (inp) {
      inp.value = codLimpio;
      inp.focus();
      inp.style.borderColor = 'var(--green)';
      inp.style.background = '#f0fdf4';
      setTimeout(() => { inp.style.borderColor = ''; inp.style.background = ''; }, 2000);
    }
    if (existe) {
      toast('⚠ Código ya existe: ' + existe.nom, true);
    } else {
      toast('✓ Código escaneado: ' + codLimpio);
    }
  }, 400);
}

// ===== SYNC P2P =====
let _syncCamStream = null;
let _syncScanLoop = null;
let _syncDatosServidor = null; // guardamos los datos empaquetados

// ── Helpers UI ──
function syncSetStatus(id, msg, color) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
}
function syncLog(msg) {
  const el = document.getElementById('syncC_log');
  if (!el) return;
  el.style.display = 'block';
  const d = document.createElement('div');
  d.textContent = msg;
  el.appendChild(d);
  el.scrollTop = el.scrollHeight;
}
function syncMostrarResultado(ok, titulo, desc) {
  ['syncPaso0','syncPasoServidor','syncPasoCliente'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  document.getElementById('syncPasoResultado').style.display = 'block';
  document.getElementById('syncR_icon').textContent = ok ? '✅' : '❌';
  document.getElementById('syncR_titulo').textContent = titulo;
  document.getElementById('syncR_titulo').style.color = ok ? 'var(--green-dark)' : 'var(--red)';
  document.getElementById('syncR_desc').textContent = desc;
}

// ── Elegir rol ──
function syncElegirRol(rol) {
  document.getElementById('syncPaso0').style.display = 'none';
  if (rol === 'servidor') {
    document.getElementById('syncPasoServidor').style.display = 'block';
    syncPrepararServidor();
  } else {
    document.getElementById('syncPasoCliente').style.display = 'block';
    // Verificar si llegamos con datos en la URL
    const params = new URLSearchParams(window.location.search);
    const d = params.get('syncdata');
    if (d) {
      syncLog('📦 Datos detectados en la URL — importando…');
      syncProcesarDatos(d);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }
}

function syncReset() {
  syncCerrarCamara();
  _syncDatosServidor = null;
  document.getElementById('syncPaso0').style.display = 'block';
  ['syncPasoServidor','syncPasoCliente','syncPasoResultado'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  // Limpiar log
  const log = document.getElementById('syncC_log');
  if (log) { log.innerHTML = ''; log.style.display = 'none'; }
  const inp = document.getElementById('syncC_urlInput');
  if (inp) inp.value = '';
}

// ── SERVIDOR: empaquetar datos y mostrar QR ──
async function syncPrepararServidor() {
  const statusEl = document.getElementById('syncS_status');
  statusEl.textContent = '⏳ Empaquetando datos…';
  statusEl.style.background = '#eef2ff';
  statusEl.style.color = '#4f46e5';

  try {
    const datos = {
      v: 1,
      ts: new Date().toISOString(),
      productos: productos,
      historial: historial,
      ventasDiarias: ventasDiarias || []
    };

    _syncDatosServidor = datos;
    const json = JSON.stringify(datos);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    const kb = Math.round(b64.length / 1024);

    const nP = datos.productos.length;
    const nV = datos.historial.length;

    statusEl.textContent = `✅ ${nP} productos · ${nV} ventas · ${kb} KB`;
    statusEl.style.background = '#dcfce7';
    statusEl.style.color = '#15803d';

    if (b64.length <= 2500) {
      // QR directo: caben en un QR
      const baseURL = window.location.href.split('?')[0];
      const fullURL = baseURL + '?syncdata=' + b64;
      syncMostrarQR(fullURL, kb, fullURL);
    } else {
      // Muy grande para QR → solo archivo
      document.getElementById('syncS_archivoSection').style.display = 'block';
      document.getElementById('syncS_qrSection').style.display = 'none';
      statusEl.textContent = `📁 Datos: ${kb} KB — usa el botón para descargar`;
      statusEl.style.background = '#fef3c7';
      statusEl.style.color = '#92400e';
    }
  } catch(err) {
    statusEl.textContent = '❌ Error: ' + err.message;
    statusEl.style.background = '#fee2e2';
    statusEl.style.color = '#dc2626';
  }
}

function syncMostrarQR(urlConDatos, kb, linkText) {
  document.getElementById('syncS_qrSection').style.display = 'block';
  document.getElementById('syncS_qrInfo').textContent = kb + ' KB de datos en el QR';

  // Intentar cargar QR con imagen (necesita internet brevemente)
  const img = document.getElementById('syncS_qrImg');
  const canvas = document.getElementById('syncS_qrCanvas');
  const qrAPIurl = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent(urlConDatos) + '&format=png&margin=4';

  img.style.display = 'block';
  canvas.style.display = 'none';
  img.src = qrAPIurl;
  img.onerror = () => {
    // Sin internet: mostrar QR de texto generado manualmente
    img.style.display = 'none';
    canvas.style.display = 'block';
    syncQRTextoFallback(canvas, urlConDatos);
  };

  // Mostrar caja de enlace para copiar/enviar
  document.getElementById('syncS_linkBox').style.display = 'block';
  document.getElementById('syncS_linkText').textContent = linkText.length > 100
    ? linkText.substring(0, 100) + '…'
    : linkText;

  // Guardar enlace para copiar
  document.getElementById('syncS_linkBox').dataset.fullLink = linkText;
}

function syncQRTextoFallback(canvas, texto) {
  // QR manual simple con texto
  const ctx = canvas.getContext('2d');
  const sz = 220;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, sz, sz);
  ctx.fillStyle = '#4f46e5';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('⚠ Sin internet para QR', sz/2, 20);
  ctx.fillText('Usa el enlace de abajo ↓', sz/2, 38);
  ctx.font = '9px monospace';
  ctx.fillStyle = '#374151';
  const words = texto.match(/.{1,26}/g) || [];
  words.slice(0, 12).forEach((w, i) => ctx.fillText(w, sz/2, 58 + i * 13));
}

function syncCopiarLink() {
  const link = document.getElementById('syncS_linkBox').dataset.fullLink || '';
  if (!link) return;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(link).then(() => toast('✓ Enlace copiado'));
  } else {
    const ta = document.createElement('textarea');
    ta.value = link;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    toast('✓ Enlace copiado');
  }
}

async function syncDescargarJSON() {
  if (!_syncDatosServidor) return;
  const json = JSON.stringify(_syncDatosServidor, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sync_despensa_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('✓ Archivo descargado');
}

// ── CLIENTE: cámara ──
async function syncAbrirCamara() {
  const btn = document.getElementById('syncC_btnCamara');
  const wrap = document.getElementById('syncC_videoWrap');
  const video = document.getElementById('syncC_video');

  btn.textContent = '⏳ Abriendo cámara…';
  btn.disabled = true;

  // Cargar jsQR primero para no tener doble await después de getUserMedia
  await new Promise((resolve) => {
    if (typeof jsQR !== 'undefined') { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsqr/1.4.0/jsQR.min.js';
    s.onload = resolve;
    s.onerror = () => { syncLog('⚠ Sin internet para cargar escáner. Usa pegar enlace o archivo.'); resolve(); };
    document.head.appendChild(s);
  });

  // Intentar cámara trasera → delantera → cualquiera
  const constraints = [
    { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } } },
    { video: { facingMode: 'user' } },
    { video: true }
  ];

  let stream = null;
  for (const c of constraints) {
    try { stream = await navigator.mediaDevices.getUserMedia(c); break; } catch(_) {}
  }

  if (!stream) {
    btn.textContent = '📷 Abrir cámara y escanear QR';
    btn.disabled = false;
    syncLog('❌ No se pudo acceder a la cámara. Verifica los permisos del navegador.');
    toast('No se pudo acceder a la cámara', true);
    return;
  }

  _syncCamStream = stream;
  video.srcObject = stream;
  try { await video.play(); } catch(_) {}
  wrap.style.display = 'block';
  btn.style.display = 'none';

  if (typeof jsQR !== 'undefined') {
    syncIniciarScanLoop();
  } else {
    syncLog('⚠ Escáner no disponible. Usa pegar enlace o archivo.');
  }
}

function syncIniciarScanLoop() {
  const video = document.getElementById('syncC_video');
  const canvas = document.getElementById('syncC_canvas');
  const ctx = canvas.getContext('2d');

  syncLog('📷 Cámara lista — apunta al QR del Teléfono #1');

  _syncScanLoop = setInterval(() => {
    if (video.readyState < video.HAVE_ENOUGH_DATA) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    try {
      const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
      if (code && code.data) {
        clearInterval(_syncScanLoop); _syncScanLoop = null;
        if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
        syncLog('✅ QR detectado');
        syncCerrarCamara();
        syncProcesarTextoQR(code.data);
      }
    } catch(e) {}
  }, 300);
}

function syncCerrarCamara() {
  if (_syncCamStream) { _syncCamStream.getTracks().forEach(t => t.stop()); _syncCamStream = null; }
  if (_syncScanLoop) { clearInterval(_syncScanLoop); _syncScanLoop = null; }
  const wrap = document.getElementById('syncC_videoWrap');
  const btn = document.getElementById('syncC_btnCamara');
  if (wrap) wrap.style.display = 'none';
  if (btn) { btn.style.display = 'flex'; btn.disabled = false; btn.textContent = '📷 Abrir cámara y escanear QR'; }
}

function syncProcesarTextoQR(texto) {
  syncLog('🔍 Procesando QR…');
  try {
    const url = new URL(texto);
    const d = url.searchParams.get('syncdata');
    if (d) { syncProcesarDatos(d); return; }
    document.getElementById('syncC_urlInput').value = texto;
    syncLog('🔗 URL detectada — presiona Importar');
  } catch(e) {
    // Intentar como JSON directo
    try {
      const obj = JSON.parse(texto);
      syncAplicarDatos(obj);
    } catch(e2) {
      document.getElementById('syncC_urlInput').value = texto;
      syncLog('⚠ No se reconoció el formato. Intenta pegar el enlace manualmente.');
    }
  }
}

function syncProcesarURL() {
  const val = document.getElementById('syncC_urlInput').value.trim();
  if (!val) { toast('Pega el enlace primero', true); return; }
  syncLog('🔗 Procesando enlace…');
  syncProcesarTextoQR(val);
}

function syncProcesarDatos(b64) {
  try {
    const json = decodeURIComponent(escape(atob(b64)));
    const obj = JSON.parse(json);
    syncAplicarDatos(obj);
  } catch(err) {
    syncLog('❌ Error al leer datos: ' + err.message);
    toast('Error al leer los datos del QR', true);
  }
}

function syncAbrirArchivo() {
  document.getElementById('syncC_fileInput').click();
}

async function syncLeerArchivo(e) {
  const file = e.target.files[0];
  if (!file) return;
  syncLog('📂 Leyendo archivo: ' + file.name);
  try {
    const txt = await file.text();
    const obj = JSON.parse(txt);
    syncAplicarDatos(obj);
  } catch(err) {
    syncLog('❌ Error al leer archivo: ' + err.message);
    toast('Archivo inválido', true);
  }
  e.target.value = '';
}

async function syncAplicarDatos(datos) {
  if (!datos || !datos.productos) {
    syncLog('❌ Archivo inválido — no contiene productos');
    toast('Datos inválidos', true);
    return;
  }

  const nP = datos.productos.length;
  const nV = (datos.historial || []).length;
  syncLog(`📦 Recibido: ${nP} productos · ${nV} ventas`);
  syncLog('💾 Guardando en base de datos…');

  try {
    productos = datos.productos;
    historial = datos.historial || [];
    if (Array.isArray(datos.ventasDiarias)) ventasDiarias = datos.ventasDiarias;

    await idbSetMany([
      ['vpos_productos',     productos],
      ['vpos_historial',     historial],
      ['vpos_ventasDiarias', ventasDiarias],
    ]);

    renderInv();
    renderHistorial();
    actualizarStats();

    syncLog('✅ ¡Sincronización completada!');
    setTimeout(() => {
      syncMostrarResultado(true,
        '¡Sincronización exitosa!',
        nP + ' productos y ' + nV + ' ventas importadas correctamente desde el Teléfono #1.'
      );
    }, 800);
  } catch(err) {
    syncLog('❌ Error al guardar: ' + err.message);
    syncMostrarResultado(false, 'Error al guardar', err.message);
  }
}

// Auto-detectar syncdata en URL al cargar
(function() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('syncdata')) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        navTo('pgSync');
        syncElegirRol('cliente');
      }, 1800);
    });
  }
})();

// ===== ANÁLISIS DE INVENTARIO Y VENTAS POR CATEGORÍA =====

let _invAnTabActual = 'stock';
let _invAnCatDetalle = null;

function invAnTab(tab) {
  _invAnTabActual = tab;
  document.getElementById('invAnPanelStock').style.display  = tab === 'stock'  ? '' : 'none';
  document.getElementById('invAnPanelVentas').style.display = tab === 'ventas' ? '' : 'none';
  document.getElementById('invTabStock').className  = tab === 'stock'  ? 'btn btn-green'  : 'btn btn-ghost';
  document.getElementById('invTabVentas').className = tab === 'ventas' ? 'btn btn-green'  : 'btn btn-ghost';
  document.getElementById('invTabStock').style.padding  = '8px 16px';
  document.getElementById('invTabVentas').style.padding = '8px 16px';
  document.getElementById('invTabStock').style.fontSize  = '13px';
  document.getElementById('invTabVentas').style.fontSize = '13px';
  renderInvAnalisis();
}

function invAnSetRango(dias) {
  const hoy = new Date();
  const hasta = hoy.toISOString().split('T')[0];
  document.getElementById('invAnHasta').value = hasta;
  if (dias === 0) {
    document.getElementById('invAnDesde').value = '';
  } else {
    const desde = new Date(hoy.getTime() - (dias - 1) * 86400000);
    document.getElementById('invAnDesde').value = desde.toISOString().split('T')[0];
  }
  renderInvAnalisis();
}

function poblarInvAnCat() {
  const sel = document.getElementById('invAnCat'); if (!sel) return;
  const cats = [...new Set(productos.map(p => p.cat || 'SIN CATEGORÍA'))].sort();
  const actual = sel.value;
  sel.innerHTML = '<option value="todas">📦 Todas las categorías</option>' +
    cats.map(c => `<option value="${c}"${c === actual ? ' selected' : ''}>${c}</option>`).join('');
}

function renderInvAnalisis() {
  poblarInvAnCat();
  const catFiltro = document.getElementById('invAnCat')?.value || 'todas';
  const desde     = document.getElementById('invAnDesde')?.value || '';
  const hasta     = document.getElementById('invAnHasta')?.value || '';

  // ── Filtrar productos ──────────────────────────────────────────────────
  const prods = catFiltro === 'todas' ? productos : productos.filter(p => (p.cat || 'SIN CATEGORÍA') === catFiltro);

  // ── Valor inventario actual agrupado por categoría ─────────────────────
  const invPorCat = {};
  prods.forEach(p => {
    const cat = p.cat || 'SIN CATEGORÍA';
    invPorCat[cat] ??= { cat, numProds: 0, stockTotal: 0, valorCompra: 0, valorVenta: 0 };
    invPorCat[cat].numProds++;
    invPorCat[cat].stockTotal  += (p.stock || 0);
    invPorCat[cat].valorCompra += (p.compra || 0) * (p.stock || 0);
    invPorCat[cat].valorVenta  += (p.venta  || 0) * (p.stock || 0);
  });
  const invRows = Object.values(invPorCat).sort((a, b) => b.valorVenta - a.valorVenta);
  const invTotProds     = invRows.reduce((s, r) => s + r.numProds, 0);
  const invTotStock     = invRows.reduce((s, r) => s + r.stockTotal, 0);
  const invTotCompra    = invRows.reduce((s, r) => s + r.valorCompra, 0);
  const invTotVenta     = invRows.reduce((s, r) => s + r.valorVenta, 0);
  const invTotGanancia  = invTotVenta - invTotCompra;

  // ── Ventas del período agrupadas por categoría ─────────────────────────
  const desdeTs = desde ? Date.parse(desde + 'T00:00:00') : 0;
  const hastaTs = hasta ? Date.parse(hasta + 'T23:59:59') : Date.now();

  const ventasPorCat = {};
  historial.forEach(v => {
    const ts = v.ts || (v.fechaISO ? Date.parse(v.fechaISO) : 0);
    if (!ts || ts < desdeTs || ts > hastaTs) return;
    (v.items || []).forEach(it => {
      const catItem = it.cat || (() => {
        const prod = productos.find(p => String(p.id) === String(it.id));
        return prod ? (prod.cat || 'SIN CATEGORÍA') : 'SIN CATEGORÍA';
      })();
      if (catFiltro !== 'todas' && catItem !== catFiltro) return;
      ventasPorCat[catItem] ??= { cat: catItem, prodsSet: new Set(), unidades: 0, total: 0, detalle: {} };
      ventasPorCat[catItem].prodsSet.add(it.nom || '');
      ventasPorCat[catItem].unidades += Number(it.cant || 0);
      ventasPorCat[catItem].total    += Number(it.cant || 0) * Number(it.precio || 0);
      const nomKey = it.nom || '?';
      ventasPorCat[catItem].detalle[nomKey] ??= { nom: nomKey, cant: 0, total: 0 };
      ventasPorCat[catItem].detalle[nomKey].cant  += Number(it.cant || 0);
      ventasPorCat[catItem].detalle[nomKey].total += Number(it.cant || 0) * Number(it.precio || 0);
    });
  });
  const ventRows = Object.values(ventasPorCat).sort((a, b) => b.total - a.total);
  const ventTotUnd   = ventRows.reduce((s, r) => s + r.unidades, 0);
  const ventTotTotal = ventRows.reduce((s, r) => s + r.total, 0);

  // ── Resumen rápido ─────────────────────────────────────────────────────
  const resumen = document.getElementById('invAnResumen');
  if (resumen) resumen.innerHTML = `
    <div class="stat-box"><div class="s-lbl">📦 Productos Activos</div><div class="s-val" style="font-size:20px;">${invTotProds}</div></div>
    <div class="stat-box"><div class="s-lbl">🔢 Unidades en Stock</div><div class="s-val" style="font-size:20px;">${invTotStock}</div></div>
    <div class="stat-box" style="border-color:#f59e0b;"><div class="s-lbl" style="color:#d97706;">💰 Valor Inventario</div><div class="s-val" style="color:#d97706;font-size:18px;">$${invTotVenta.toFixed(2)}</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">precio venta</div></div>
    <div class="stat-box" style="border-color:var(--green);background:var(--green-light);"><div class="s-lbl" style="color:var(--green-dark);">🛒 Vendido en Período</div><div class="s-val" style="font-size:18px;">$${ventTotTotal.toFixed(2)}</div><div style="font-size:10px;color:var(--text-muted);margin-top:2px;">${ventTotUnd} unidades</div></div>
  `;

  // ── Tabla inventario ───────────────────────────────────────────────────
  const tbodyStock = document.getElementById('tbodyInvAnStock');
  if (tbodyStock) {
    tbodyStock.innerHTML = invRows.length ? invRows.map(r => {
      const ganancia = r.valorVenta - r.valorCompra;
      return `<tr>
        <td class="td-bold">${r.cat}</td>
        <td style="text-align:center;" class="mono">${r.numProds}</td>
        <td style="text-align:right;" class="mono">${r.stockTotal}</td>
        <td style="text-align:right;" class="mono" style="color:var(--text-muted);">$${r.valorCompra.toFixed(2)}</td>
        <td style="text-align:right;" class="mono td-green">$${r.valorVenta.toFixed(2)}</td>
        <td style="text-align:right;" class="mono" style="color:var(--green);">$${ganancia.toFixed(2)}</td>
      </tr>`;
    }).join('') : `<tr><td colspan="6"><div class="empty"><span class="empty-icon">📦</span>Sin productos</div></td></tr>`;
    const tfootStock = document.getElementById('tfootInvAnStock');
    if (tfootStock && invRows.length) tfootStock.innerHTML = `<tr style="background:var(--green-light);border-top:2px solid var(--border-mid);">
      <td class="td-bold" style="font-size:13px;padding:10px 12px;">TOTAL</td>
      <td class="mono" style="text-align:center;padding:10px 12px;">${invTotProds}</td>
      <td class="mono" style="text-align:right;padding:10px 12px;">${invTotStock}</td>
      <td class="mono" style="text-align:right;padding:10px 12px;color:var(--text-muted);">$${invTotCompra.toFixed(2)}</td>
      <td class="mono td-green" style="text-align:right;font-weight:900;padding:10px 12px;font-size:14px;">$${invTotVenta.toFixed(2)}</td>
      <td class="mono" style="text-align:right;font-weight:900;padding:10px 12px;color:var(--green);">$${invTotGanancia.toFixed(2)}</td>
    </tr>`;
  }

  // ── Tabla ventas del período ───────────────────────────────────────────
  const periodoStr = desde && hasta ? `del ${desde} al ${hasta}` : desde ? `desde ${desde}` : hasta ? `hasta ${hasta}` : 'todo el historial';
  const infoEl = document.getElementById('invAnVentasInfo');
  if (infoEl) infoEl.textContent = `📆 Ventas ${periodoStr}${catFiltro !== 'todas' ? ' · ' + catFiltro : ''}`;

  const tbodyVentas = document.getElementById('tbodyInvAnVentas');
  if (tbodyVentas) {
    tbodyVentas.innerHTML = ventRows.length ? ventRows.map(r => `<tr style="cursor:pointer;" onclick="invAnVerDetalle('${r.cat.replace(/'/g,"\\'")}')" title="Clic para ver detalle">
      <td class="td-bold">${r.cat} <span style="font-size:11px;color:var(--text-muted);font-weight:700;">▸ ver detalle</span></td>
      <td style="text-align:center;" class="mono">${r.prodsSet.size}</td>
      <td style="text-align:center;" class="mono">${r.unidades}</td>
      <td style="text-align:right;" class="mono td-green">$${r.total.toFixed(2)}</td>
    </tr>`).join('') : `<tr><td colspan="4"><div class="empty"><span class="empty-icon">📊</span>Sin ventas en este período</div></td></tr>`;

    const tfootVentas = document.getElementById('tfootInvAnVentas');
    if (tfootVentas && ventRows.length) tfootVentas.innerHTML = `<tr style="background:var(--green-light);border-top:2px solid var(--border-mid);">
      <td class="td-bold" style="font-size:13px;padding:10px 12px;">TOTAL</td>
      <td class="mono" style="text-align:center;padding:10px 12px;">${ventRows.reduce((s,r)=>s+r.prodsSet.size,0)}</td>
      <td class="mono" style="text-align:center;padding:10px 12px;">${ventTotUnd}</td>
      <td class="mono td-green" style="text-align:right;font-weight:900;padding:10px 12px;font-size:14px;">$${ventTotTotal.toFixed(2)}</td>
    </tr>`;
  }

  // Ocultar detalle al cambiar filtros
  _invAnCatDetalle = null;
  const det = document.getElementById('invAnDetalle');
  if (det) det.style.display = 'none';

  // Guardar ventasPorCat en variable temporal para usarla en ver detalle
  window._invAnVentasPorCat = ventasPorCat;
}

function invAnVerDetalle(cat) {
  _invAnCatDetalle = cat;
  const data = (window._invAnVentasPorCat || {})[cat];
  const det  = document.getElementById('invAnDetalle');
  const tit  = document.getElementById('invAnDetalleTitulo');
  const tbody = document.getElementById('tbodyInvAnDetalle');
  if (!det || !tit || !tbody) return;
  if (!data) { det.style.display = 'none'; return; }

  const items = Object.values(data.detalle).sort((a, b) => b.total - a.total);
  tit.textContent = `📦 Detalle de "${cat}" — ${items.length} productos`;
  tbody.innerHTML = items.map(it => `<tr>
    <td class="td-bold">${it.nom}</td>
    <td style="text-align:center;" class="mono">${it.cant}</td>
    <td style="text-align:right;" class="mono td-green">$${it.total.toFixed(2)}</td>
  </tr>`).join('');
  det.style.display = '';
  det.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function generarPDFInventario() {
  if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') {
    toast('PDF no disponible aún, espera un momento', true); return;
  }
  const { jsPDF } = window.jspdf || window;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const catFiltro = document.getElementById('invAnCat')?.value || 'todas';
  const desde     = document.getElementById('invAnDesde')?.value || '';
  const hasta     = document.getElementById('invAnHasta')?.value || '';

  // Colores corporativos
  const VERDE = [22, 163, 74], VERDE_LIGHT = [240, 253, 244], VERDE_DARK = [21, 128, 61];
  const AZUL  = [29, 78, 216], GRIS = [100, 116, 139], NEGRO = [15, 23, 42];

  // ── Encabezado ────────────────────────────────────────────────────────
  doc.setFillColor(...VERDE);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(255, 255, 255);
  doc.text('Despensa Económica — Reporte de Inventario', 14, 11);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  const catLabel  = catFiltro === 'todas' ? 'Todas las categorías' : catFiltro;
  const rangoLabel = desde && hasta ? `${desde} al ${hasta}` : desde ? `Desde ${desde}` : hasta ? `Hasta ${hasta}` : 'Todo el historial';
  doc.text(`Categoría: ${catLabel}   |   Período de ventas: ${rangoLabel}`, 14, 19);
  doc.text(`Generado: ${new Date().toLocaleString('es-SV')}`, 14, 25);

  let y = 34;

  // ── Sección 1: Inventario actual ──────────────────────────────────────
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...VERDE_DARK);
  doc.text('INVENTARIO ACTUAL POR CATEGORÍA', 14, y); y += 6;

  const prods = catFiltro === 'todas' ? productos : productos.filter(p => (p.cat || 'SIN CATEGORÍA') === catFiltro);
  const invPorCat = {};
  prods.forEach(p => {
    const cat = p.cat || 'SIN CATEGORÍA';
    invPorCat[cat] ??= { cat, numProds: 0, stockTotal: 0, valorCompra: 0, valorVenta: 0 };
    invPorCat[cat].numProds++;
    invPorCat[cat].stockTotal  += (p.stock || 0);
    invPorCat[cat].valorCompra += (p.compra || 0) * (p.stock || 0);
    invPorCat[cat].valorVenta  += (p.venta  || 0) * (p.stock || 0);
  });
  const invRows = Object.values(invPorCat).sort((a, b) => b.valorVenta - a.valorVenta);
  const invTotCompra = invRows.reduce((s, r) => s + r.valorCompra, 0);
  const invTotVenta  = invRows.reduce((s, r) => s + r.valorVenta, 0);

  doc.autoTable({
    head: [['Categoría', 'Productos', 'Stock', 'Valor Compra', 'Valor Venta', 'Ganancia Est.']],
    body: invRows.map(r => [r.cat, r.numProds, r.stockTotal, `$${r.valorCompra.toFixed(2)}`, `$${r.valorVenta.toFixed(2)}`, `$${(r.valorVenta - r.valorCompra).toFixed(2)}`]),
    foot: [['TOTAL', invRows.reduce((s,r)=>s+r.numProds,0), invRows.reduce((s,r)=>s+r.stockTotal,0), `$${invTotCompra.toFixed(2)}`, `$${invTotVenta.toFixed(2)}`, `$${(invTotVenta-invTotCompra).toFixed(2)}`]],
    startY: y,
    styles: { fontSize: 9, textColor: NEGRO },
    headStyles: { fillColor: VERDE_LIGHT, textColor: VERDE_DARK, fontSize: 9 },
    footStyles: { fillColor: VERDE_LIGHT, textColor: VERDE_DARK, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [249, 255, 249] },
    columnStyles: { 1:{halign:'center'}, 2:{halign:'center'}, 3:{halign:'right'}, 4:{halign:'right'}, 5:{halign:'right',fontStyle:'bold',textColor:VERDE} },
  });
  y = doc.lastAutoTable.finalY + 10;

  // ── Sección 2: Ventas del período ─────────────────────────────────────
  if (y > 240) { doc.addPage(); y = 18; }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...VERDE_DARK);
  doc.text(`VENTAS DEL PERÍODO: ${rangoLabel}`, 14, y); y += 6;

  const desdeTs = desde ? Date.parse(desde + 'T00:00:00') : 0;
  const hastaTs = hasta ? Date.parse(hasta + 'T23:59:59') : Date.now();
  const ventasPorCat = {};
  historial.forEach(v => {
    const ts = v.ts || (v.fechaISO ? Date.parse(v.fechaISO) : 0);
    if (!ts || ts < desdeTs || ts > hastaTs) return;
    (v.items || []).forEach(it => {
      const catItem = it.cat || (() => { const prod = productos.find(p => String(p.id) === String(it.id)); return prod ? (prod.cat || 'SIN CATEGORÍA') : 'SIN CATEGORÍA'; })();
      if (catFiltro !== 'todas' && catItem !== catFiltro) return;
      ventasPorCat[catItem] ??= { cat: catItem, prodsSet: new Set(), unidades: 0, total: 0, detalle: {} };
      ventasPorCat[catItem].prodsSet.add(it.nom || '');
      ventasPorCat[catItem].unidades += Number(it.cant || 0);
      ventasPorCat[catItem].total    += Number(it.cant || 0) * Number(it.precio || 0);
      const nomKey = it.nom || '?';
      ventasPorCat[catItem].detalle[nomKey] ??= { nom: nomKey, cant: 0, total: 0 };
      ventasPorCat[catItem].detalle[nomKey].cant  += Number(it.cant || 0);
      ventasPorCat[catItem].detalle[nomKey].total += Number(it.cant || 0) * Number(it.precio || 0);
    });
  });
  const ventRows = Object.values(ventasPorCat).sort((a, b) => b.total - a.total);
  const ventTotUnd   = ventRows.reduce((s, r) => s + r.unidades, 0);
  const ventTotTotal = ventRows.reduce((s, r) => s + r.total, 0);

  if (!ventRows.length) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...GRIS);
    doc.text('Sin ventas registradas en este período.', 14, y); y += 8;
  } else {
    doc.autoTable({
      head: [['Categoría', 'Prods. Distintos', 'Unidades', 'Total Vendido']],
      body: ventRows.map(r => [r.cat, r.prodsSet.size, r.unidades, `$${r.total.toFixed(2)}`]),
      foot: [['TOTAL', ventRows.reduce((s,r)=>s+r.prodsSet.size,0), ventTotUnd, `$${ventTotTotal.toFixed(2)}`]],
      startY: y,
      styles: { fontSize: 9, textColor: NEGRO },
      headStyles: { fillColor: [219, 234, 254], textColor: AZUL, fontSize: 9 },
      footStyles: { fillColor: [219, 234, 254], textColor: AZUL, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      columnStyles: { 1:{halign:'center'}, 2:{halign:'center'}, 3:{halign:'right',fontStyle:'bold',textColor:VERDE} },
    });
    y = doc.lastAutoTable.finalY + 10;

    // Detalle por categoría
    ventRows.forEach(r => {
      if (y > 250) { doc.addPage(); y = 18; }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...VERDE_DARK);
      doc.text(`▸ ${r.cat}  —  $${r.total.toFixed(2)} · ${r.unidades} uds`, 14, y); y += 4;
      const items = Object.values(r.detalle).sort((a, b) => b.total - a.total);
      doc.autoTable({
        head: [['Producto', 'Unidades', 'Total']],
        body: items.map(it => [it.nom, it.cant, `$${it.total.toFixed(2)}`]),
        startY: y,
        styles: { fontSize: 8, textColor: NEGRO },
        headStyles: { fillColor: VERDE_LIGHT, textColor: VERDE_DARK, fontSize: 8 },
        columnStyles: { 1:{halign:'center'}, 2:{halign:'right',fontStyle:'bold'} },
        margin: { left: 18, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 7;
    });
  }

  const nombreArchivo = `Inventario_${catFiltro !== 'todas' ? catFiltro + '_' : ''}${desde || 'inicio'}_${hasta || 'hoy'}.pdf`;
  doc.save(nombreArchivo);
  toast(`✓ PDF de inventario generado`);
}

// El análisis de inventario se inicializa en renderPagina()