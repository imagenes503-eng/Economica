// =====================================================================
//  DESPENSA ECONÓMICA — Scanner de Código de Barras v2
//  Motor: ZXing (mucho mejor rendimiento en móvil que html5-qrcode)
//  ✅ Cámara trasera automática en móvil
//  ✅ Vibración al leer
//  ✅ Modos: venta e inventario
//  ✅ Carga dinámica (solo cuando se abre el scanner)
// =====================================================================

(function () {
  'use strict';

  const ZXING_UMD = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.20.0/umd/index.min.js';

  let _modo      = null;   // 'venta' | 'inventario'
  let _reader    = null;
  let _cargando  = false;
  let _abierto   = false;
  let _ultimoCod = '';     // evita disparos dobles del mismo código
  let _ultimoTs  = 0;

  // ── Cargar ZXing UMD dinámicamente ──────────────────────────────────
  function _cargarZXing() {
    return new Promise((resolve, reject) => {
      if (window.ZXing) { resolve(); return; }
      if (document.querySelector('script[data-zxing]')) {
        // Ya en proceso de carga — esperar
        const poll = setInterval(() => {
          if (window.ZXing) { clearInterval(poll); resolve(); }
        }, 80);
        return;
      }
      const s = document.createElement('script');
      s.src = ZXING_UMD;
      s.dataset.zxing = '1';
      s.onload  = resolve;
      s.onerror = () => reject(new Error('No se pudo cargar ZXing. Verifica tu conexión.'));
      document.head.appendChild(s);
    });
  }

  // ── Abrir scanner (punto de entrada) ─────────────────────────────────
  async function _abrir(modo) {
    if (_abierto) return;
    _modo    = modo;
    _abierto = true;

    const modal = document.getElementById('modalScanner');
    if (!modal) { _abierto = false; return; }
    modal.style.display = 'flex';

    _limpiarUI();
    _setStatus('Cargando lector…');

    try {
      await _cargarZXing();
      _setStatus('Iniciando cámara…');
      await _iniciarEscaneo();
    } catch (err) {
      _setStatus('⚠ ' + (err.message || 'Error al iniciar'));
      console.error('[Scanner ZXing]', err);
    }
  }

  // ── Iniciar escaneo continuo ──────────────────────────────────────────
  async function _iniciarEscaneo() {
    await _detener();

    // Crear elemento <video>
    const region = document.getElementById('scannerRegion');
    if (!region) return;
    region.innerHTML = '';

    const video = document.createElement('video');
    video.style.cssText = [
      'width:100%',
      'max-height:300px',
      'object-fit:cover',
      'display:block',
      'background:#000',
      'border-radius:0',
    ].join(';');
    video.setAttribute('playsinline', '');
    video.setAttribute('muted', '');
    video.setAttribute('autoplay', '');
    region.appendChild(video);

    // Añadir línea de guía visual sobre el video
    const guia = document.createElement('div');
    guia.style.cssText = [
      'position:absolute',
      'left:10%',
      'right:10%',
      'top:50%',
      'transform:translateY(-50%)',
      'height:2px',
      'background:rgba(3,169,244,0.85)',
      'box-shadow:0 0 8px 2px rgba(3,169,244,0.5)',
      'border-radius:2px',
      'pointer-events:none',
    ].join(';');
    region.style.position = 'relative';
    region.appendChild(guia);

    // Configurar hints (formatos que importan en supermercado)
    const hints = new Map();
    const ZXing = window.ZXing;
    const BF    = ZXing.BarcodeFormat;
    hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [
      BF.EAN_13, BF.EAN_8,
      BF.UPC_A,  BF.UPC_E,
      BF.CODE_128, BF.CODE_39, BF.CODE_93,
      BF.ITF,
      BF.QR_CODE,
    ]);
    // Intentar más rápido en móvil
    hints.set(ZXing.DecodeHintType.TRY_HARDER, true);

    _reader = new ZXing.BrowserMultiFormatReader(hints, {
      delayBetweenScanAttempts: 150,   // ms entre intentos
      delayBetweenScanSuccess:  1500,  // ms antes de poder releer el mismo código
    });

    // Seleccionar cámara trasera si hay varias
    let deviceId;
    try {
      const devices = await ZXing.BrowserCodeReader.listVideoInputDevices();
      if (devices.length > 1) {
        const trasera = devices.find(d =>
          /back|rear|environment|trasera|posterior/i.test(d.label)
        );
        deviceId = (trasera ?? devices[devices.length - 1]).deviceId;
      }
    } catch (_) { /* sin permisos aún, ZXing pedirá permiso igual */ }

    _setStatus('📷 Apunta al código de barras');

    // Iniciar decodificación continua
    _reader.decodeFromVideoDevice(deviceId, video, (result, err) => {
      if (!_abierto) return;

      if (result) {
        const cod = (result.getText() || '').trim();
        if (!cod) return;

        // Anti-rebote: ignorar si es el mismo código en menos de 1.5 s
        const ahora = Date.now();
        if (cod === _ultimoCod && (ahora - _ultimoTs) < 1500) return;
        _ultimoCod = cod;
        _ultimoTs  = ahora;

        _onCodigoLeido(cod);
      }

      // Los errores de "NotFoundException" son normales (frame sin barcode)
      // Solo loguear errores reales
      if (err && !(err instanceof ZXing.NotFoundException)) {
        console.warn('[Scanner ZXing] err:', err);
      }
    });
  }

  // ── Código detectado ─────────────────────────────────────────────────
  function _onCodigoLeido(cod) {
    // Vibrar en móvil (feedback háptico)
    if (navigator.vibrate) navigator.vibrate([60]);

    const prod = _buscarProducto(cod);
    _mostrarResultado(cod, prod);

    if (_modo === 'venta') {
      if (prod) {
        if (typeof posProEscanearCodigo === 'function') posProEscanearCodigo(cod);
        setTimeout(cerrarScanner, 1000);
      }
      // Si no encontrado: seguir escaneando para que intente de nuevo
    } else if (_modo === 'inventario') {
      const inpCod = document.getElementById('inpCod');
      if (inpCod) {
        inpCod.value = cod;
        inpCod.dispatchEvent(new Event('input'));
        // Foco en el campo nombre si el código no existe
        if (!prod) {
          const inpNom = document.getElementById('inpNom') || document.querySelector('input[id*="nom" i]');
          if (inpNom) setTimeout(() => inpNom.focus(), 200);
        }
      }
      setTimeout(cerrarScanner, 1000);
    }
  }

  // ── Buscar producto en la BD local ───────────────────────────────────
  function _buscarProducto(cod) {
    if (typeof productos === 'undefined' || !Array.isArray(productos)) return null;
    const codL = cod.toLowerCase().trim();
    return productos.find(p =>
      (p.cod   && p.cod.toLowerCase().trim()   === codL) ||
      (p.abrev && p.abrev.toLowerCase().trim() === codL) ||
      String(p.id) === codL
    ) || null;
  }

  // ── UI: mostrar resultado ─────────────────────────────────────────────
  function _mostrarResultado(cod, prod) {
    const boxOk  = document.getElementById('scannerResultBox');
    const boxNo  = document.getElementById('scannerNoEncontrado');
    const nomEl  = document.getElementById('scannerResultNom');
    const metaEl = document.getElementById('scannerResultMeta');
    const codEl  = document.getElementById('scannerCodLeido');

    if (prod) {
      if (boxOk) boxOk.style.display = 'flex';
      if (boxNo) boxNo.style.display = 'none';
      if (nomEl)  nomEl.textContent  = prod.nom || '—';
      if (metaEl) metaEl.textContent =
        '$' + parseFloat(prod.precio || 0).toFixed(2) +
        ' · Stock: ' + (prod.stock !== undefined ? prod.stock : '—');
    } else {
      if (boxOk) boxOk.style.display = 'none';
      if (boxNo) boxNo.style.display = 'flex';
      if (codEl) codEl.textContent = 'Código leído: ' + cod;
    }
  }

  // ── Limpiar resultado ─────────────────────────────────────────────────
  function _limpiarUI() {
    const boxOk = document.getElementById('scannerResultBox');
    const boxNo = document.getElementById('scannerNoEncontrado');
    if (boxOk) boxOk.style.display = 'none';
    if (boxNo) boxNo.style.display = 'none';
    const region = document.getElementById('scannerRegion');
    if (region) region.innerHTML = '';
  }

  // ── Detener stream de cámara ─────────────────────────────────────────
  async function _detener() {
    if (_reader) {
      try { _reader.reset(); } catch (_) {}
      _reader = null;
    }
    // Detener tracks de MediaStream por si acaso
    try {
      const videos = document.querySelectorAll('#scannerRegion video');
      videos.forEach(v => {
        if (v.srcObject) {
          v.srcObject.getTracks().forEach(t => t.stop());
          v.srcObject = null;
        }
      });
    } catch (_) {}
  }

  // ── Actualizar texto de estado ────────────────────────────────────────
  function _setStatus(txt) {
    const el = document.getElementById('scannerStatusTxt');
    if (el) el.textContent = txt;
  }

  // ── API pública (las funciones que llama index.html) ─────────────────
  window.abrirScannerVenta = function () {
    _abrir('venta');
  };

  window.abrirScannerInventario = function () {
    _abrir('inventario');
  };

  window.cerrarScanner = async function () {
    _abierto   = false;
    _ultimoCod = '';
    await _detener();
    const modal = document.getElementById('modalScanner');
    if (modal) modal.style.display = 'none';
    _limpiarUI();
    _setStatus('Iniciando…');
  };

})();
