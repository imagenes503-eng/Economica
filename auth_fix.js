// =====================================================================
//  auth_fix.js — Parche definitivo para error JWT expired
//  Despensa Económica v9 — Fix de autenticación Supabase
//
//  INSTRUCCIONES: Agregar DESPUÉS de supabase_sync.js en index.html:
//  <script src="auth_fix.js"></script>
// =====================================================================

(function () {
  'use strict';

  // ── 1. UTILIDAD: Renovar token ahora mismo ─────────────────────────
  async function _refreshTokenNow() {
    const rt = _refreshToken || localStorage.getItem('vpos_refreshToken');
    if (!rt) return false;

    const url = _sbUrl(), key = _sbKey();
    if (!url || !key) return false;

    try {
      const r = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { 'apikey': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: rt })
      });
      const data = await r.json();

      if (data.access_token) {
        // ✅ Renovación exitosa
        _authToken    = data.access_token;
        _refreshToken = data.refresh_token || rt;
        localStorage.setItem('vpos_authToken',    _authToken);
        localStorage.setItem('vpos_refreshToken', _refreshToken);
        console.log('[AuthFix] ✅ Token renovado correctamente');
        return true;
      } else {
        // ❌ Refresh token también expiró → forzar re-login
        console.warn('[AuthFix] ⚠️ Refresh token expirado. Se requiere nuevo login.');
        _forzarReLogin('Tu sesión expiró. Por favor inicia sesión nuevamente.');
        return false;
      }
    } catch (e) {
      console.warn('[AuthFix] Error de red al renovar token:', e.message);
      return false; // Sin conexión — no forzar logout (puede ser offline)
    }
  }

  // ── 2. FORZAR RE-LOGIN con mensaje ────────────────────────────────
  function _forzarReLogin(mensaje) {
    // Limpiar estado de sesión
    _sesionActiva  = false;
    _tiendaId      = null;
    _usuarioActual = null;
    _authToken     = null;
    _refreshToken  = null;

    localStorage.removeItem('vpos_sesionActiva');
    localStorage.removeItem('vpos_authToken');
    localStorage.removeItem('vpos_refreshToken');
    localStorage.removeItem('vpos_usuarioData');

    clearInterval(_refreshInterval);

    // Mostrar toast de aviso y abrir login
    if (typeof toast === 'function') {
      toast('⚠️ ' + (mensaje || 'Sesión expirada. Inicia sesión de nuevo.'), true);
    }
    setTimeout(() => {
      if (typeof abrirLogin === 'function') abrirLogin();
    }, 800);
  }

  // ── 3. PARCHAR _iniciarRefreshToken ───────────────────────────────
  //    Reemplaza la versión original que ignora fallos silenciosos
  window._iniciarRefreshToken = function () {
    clearInterval(_refreshInterval);
    _refreshInterval = setInterval(async () => {
      const exito = await _refreshTokenNow();
      if (!exito && navigator.onLine) {
        // Solo forzar re-login si hay internet (evitar logout offline)
        console.warn('[AuthFix] Refresh programado falló con internet activo');
      }
    }, 45 * 60 * 1000); // 45 minutos (antes de que expire en 60)
  };

  // ── 4. PARCHAR restaurarSesion ───────────────────────────────────
  //    Reemplaza la versión original que no maneja refresh_token expirado
  const _restaurarSesionOriginal = window.restaurarSesion;

  window.restaurarSesion = async function () {
    if (localStorage.getItem('vpos_sesionActiva') !== '1') return;

    const savedToken   = localStorage.getItem('vpos_authToken');
    const savedRefresh = localStorage.getItem('vpos_refreshToken');
    const savedUser    = localStorage.getItem('vpos_usuarioData');
    const savedTienda  = localStorage.getItem('vpos_tiendaId');

    if (!savedToken || !savedUser) return;

    // Restaurar estado base
    _authToken    = savedToken;
    _refreshToken = savedRefresh || null;
    _tiendaId     = savedTienda;
    _sesionActiva = true;

    // Intentar renovar token ANTES de hacer cualquier request
    if (savedRefresh && navigator.onLine) {
      const url = _sbUrl(), key = _sbKey();
      if (url && key) {
        try {
          const r = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
            method: 'POST',
            headers: { 'apikey': key, 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: savedRefresh })
          });
          const data = await r.json();

          if (data.access_token) {
            // ✅ Token renovado
            _authToken    = data.access_token;
            _refreshToken = data.refresh_token || savedRefresh;
            localStorage.setItem('vpos_authToken',    _authToken);
            localStorage.setItem('vpos_refreshToken', _refreshToken);
            console.log('[AuthFix] ✅ Sesión restaurada con token renovado');
          } else {
            // ❌ refresh_token expirado → NO continuar con token viejo
            console.warn('[AuthFix] ❌ Refresh token inválido al restaurar:', data.error || data.message);
            _forzarReLogin('Tu sesión expiró. Inicia sesión nuevamente.');
            return;
          }
        } catch (e) {
          // Sin conexión: continuar offline con token cached
          console.warn('[AuthFix] Sin conexión al restaurar — modo offline');
        }
      }
    }

    // Continuar con el resto de restaurarSesion (cargar perfil, datos, etc.)
    try {
      const tempUser = JSON.parse(savedUser);
      const perfiles = await _sbGet('perfiles', {
        select: '*', id: 'eq.' + tempUser.id, activo: 'eq.true'
      });

      if (!perfiles || !perfiles.length) {
        _forzarReLogin('Tu cuenta fue desactivada.');
        return;
      }

      _usuarioActual = { ...perfiles[0], email: tempUser.email };
      localStorage.setItem('vpos_usuarioData', JSON.stringify(_usuarioActual));
    } catch (e) {
      // Offline o error de red — usar datos guardados
      try { _usuarioActual = JSON.parse(savedUser); } catch (e2) {}
    }

    if (!_usuarioActual) {
      _forzarReLogin('No se pudo recuperar tu perfil.');
      return;
    }

    // Actualizar UI
    if (typeof _actualizarBadgeLogin    === 'function') _actualizarBadgeLogin();
    if (typeof _aplicarRestriccionesPorRol === 'function') _aplicarRestriccionesPorRol();
    if (typeof _actualizarTabAdmin      === 'function') _actualizarTabAdmin();
    if (typeof _actualizarNombreTienda  === 'function') _actualizarNombreTienda();

    const ml = document.getElementById('modalLogin');
    if (ml) ml.style.display = 'none';

    // Iniciar renovación automática + sincronización
    if (typeof _iniciarRefreshToken === 'function') _iniciarRefreshToken();
    if (typeof _autoCargarDesdeSupa === 'function') _autoCargarDesdeSupa();
    if (typeof _iniciarPolling      === 'function') _iniciarPolling();
    if (typeof _autoFusionar        === 'function') setTimeout(_autoFusionar, 800);
  };

  // ── 5. INTERCEPTOR 401 para _sbGet / _sbPost / _sbPatch ──────────
  //    Envuelve los métodos originales para reintentar automáticamente
  //    tras renovar el token cuando reciben 401

  async function _fetchConRetry(fetchFn, ...args) {
    try {
      return await fetchFn(...args);
    } catch (e) {
      // Detectar error 401 JWT expired
      if (e.message && e.message.includes('401')) {
        console.warn('[AuthFix] 401 detectado. Intentando renovar token...');
        const renovado = await _refreshTokenNow();
        if (renovado) {
          // Reintentar la petición original con el token nuevo
          try {
            return await fetchFn(...args);
          } catch (e2) {
            throw e2;
          }
        }
      }
      throw e;
    }
  }

  // Guardar referencias originales
  const _sbGetOrig    = window._sbGet    || (typeof _sbGet    !== 'undefined' ? _sbGet    : null);
  const _sbPostOrig   = window._sbPost   || (typeof _sbPost   !== 'undefined' ? _sbPost   : null);
  const _sbPatchOrig  = window._sbPatch  || (typeof _sbPatch  !== 'undefined' ? _sbPatch  : null);
  const _sbRpcOrig    = window._sbRpc    || (typeof _sbRpc    !== 'undefined' ? _sbRpc    : null);

  // Nota: como son funciones internas (no en window), el parche de retry
  // se aplica a nivel de response en los helpers directamente:
  // Vamos a sobrescribir _headers para que siempre use el token más fresco

  const _headersOriginal = window._headers;

  // Forzar que _headers siempre tome el token actual (no snapshot viejo)
  // Esto ya debería funcionar porque usa _authToken que actualizamos,
  // pero lo dejamos explícito:
  window._headers = function (extra) {
    const key  = _sbKey();
    const token = _authToken || localStorage.getItem('vpos_authToken');
    const auth  = token ? ('Bearer ' + token) : ('Bearer ' + key);
    return Object.assign(
      { 'apikey': key, 'Authorization': auth, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      extra || {}
    );
  };

  // ── 6. PARCHAR _sbGet para reintentar en 401 ─────────────────────
  window._sbGet = async function (tabla, params) {
    const url = _sbUrl(), key = _sbKey();
    if (!url || !key) throw new Error('Sin configuración de Supabase');
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';

    let resp = await fetch(url + '/rest/v1/' + tabla + qs, { headers: _headers({ 'Prefer': '' }) });

    // Reintentar en 401
    if (resp.status === 401 && navigator.onLine) {
      console.warn('[AuthFix] _sbGet 401 en', tabla, '— renovando token...');
      const renovado = await _refreshTokenNow();
      if (renovado) {
        resp = await fetch(url + '/rest/v1/' + tabla + qs, { headers: _headers({ 'Prefer': '' }) });
      }
    }

    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error('HTTP ' + resp.status + ': ' + txt);
    }
    return resp.json();
  };

  // ── 7. PARCHAR _sbPost para reintentar en 401 ────────────────────
  window._sbPost = async function (tabla, body, upsert) {
    const url = _sbUrl(), key = _sbKey();
    if (!url || !key) throw new Error('Sin config');
    const h = _headers({ 'Prefer': upsert ? 'resolution=merge-duplicates,return=minimal' : 'return=minimal' });

    let resp = await fetch(url + '/rest/v1/' + tabla, {
      method: 'POST', headers: h, body: JSON.stringify(body)
    });

    if (resp.status === 401 && navigator.onLine) {
      console.warn('[AuthFix] _sbPost 401 en', tabla, '— renovando token...');
      const renovado = await _refreshTokenNow();
      if (renovado) {
        const h2 = _headers({ 'Prefer': upsert ? 'resolution=merge-duplicates,return=minimal' : 'return=minimal' });
        resp = await fetch(url + '/rest/v1/' + tabla, {
          method: 'POST', headers: h2, body: JSON.stringify(body)
        });
      }
    }

    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error('HTTP ' + resp.status + ': ' + txt);
    }
  };

  // ── 8. PARCHAR _sbPatch para reintentar en 401 ───────────────────
  window._sbPatch = async function (tabla, filtro, body) {
    const url = _sbUrl(), key = _sbKey();
    if (!url || !key) throw new Error('Sin config');
    const qs = '?' + new URLSearchParams(filtro).toString();

    let resp = await fetch(url + '/rest/v1/' + tabla + qs, {
      method: 'PATCH', headers: _headers({ 'Prefer': 'return=minimal' }), body: JSON.stringify(body)
    });

    if (resp.status === 401 && navigator.onLine) {
      console.warn('[AuthFix] _sbPatch 401 en', tabla, '— renovando token...');
      const renovado = await _refreshTokenNow();
      if (renovado) {
        resp = await fetch(url + '/rest/v1/' + tabla + qs, {
          method: 'PATCH', headers: _headers({ 'Prefer': 'return=minimal' }), body: JSON.stringify(body)
        });
      }
    }

    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error('HTTP ' + resp.status + ': ' + txt);
    }
  };

  // ── 9. PARCHAR _sbRpc para reintentar en 401 ─────────────────────
  window._sbRpc = async function (nombreFuncion, params) {
    const url = _sbUrl(), key = _sbKey();
    if (!url || !key) throw new Error('Sin configuración de Supabase');

    let resp = await fetch(url + '/rest/v1/rpc/' + nombreFuncion, {
      method: 'POST',
      headers: _headers({ 'Prefer': 'return=representation' }),
      body: JSON.stringify(params || {})
    });

    if (resp.status === 401 && navigator.onLine) {
      console.warn('[AuthFix] _sbRpc 401 en', nombreFuncion, '— renovando token...');
      const renovado = await _refreshTokenNow();
      if (renovado) {
        resp = await fetch(url + '/rest/v1/rpc/' + nombreFuncion, {
          method: 'POST',
          headers: _headers({ 'Prefer': 'return=representation' }),
          body: JSON.stringify(params || {})
        });
      }
    }

    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error('HTTP ' + resp.status + ': ' + txt);
    }
    return resp.json();
  };

  // ── 10. VERIFICACIÓN PROACTIVA al recuperar visibilidad ──────────
  //    Si el usuario deja la app en segundo plano, verificar token al volver
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && _sesionActiva) {
      const token = _authToken || localStorage.getItem('vpos_authToken');
      if (!token) return;

      // Decodificar payload del JWT para verificar expiración
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expMs   = payload.exp * 1000;
        const ahoraMs = Date.now();
        const minRestantes = (expMs - ahoraMs) / 60000;

        if (minRestantes < 10) {
          // Token expira en menos de 10 minutos → renovar ya
          console.log('[AuthFix] Token expira en', Math.round(minRestantes), 'min → renovando...');
          await _refreshTokenNow();
        }
      } catch (e) {
        // Si no se puede decodificar, intentar renovar de todas formas
        await _refreshTokenNow();
      }
    }
  });

  // ── 11. PARCHE PARA _sbDeleteFiltro ──────────────────────────────
  window._sbDeleteFiltro = async function (tabla, filtro) {
    const url = _sbUrl(), key = _sbKey();
    if (!url || !key) return;

    let resp = await fetch(url + '/rest/v1/' + tabla + '?' + new URLSearchParams(filtro).toString(), {
      method: 'DELETE', headers: _headers({ 'Prefer': 'return=minimal' })
    });

    if (resp.status === 401 && navigator.onLine) {
      console.warn('[AuthFix] _sbDeleteFiltro 401 en', tabla, '— renovando token...');
      const renovado = await _refreshTokenNow();
      if (renovado) {
        await fetch(url + '/rest/v1/' + tabla + '?' + new URLSearchParams(filtro).toString(), {
          method: 'DELETE', headers: _headers({ 'Prefer': 'return=minimal' })
        });
      }
    }
  };

  console.log('[AuthFix] ✅ Parche JWT cargado — renovación automática activa');

})(); // IIFE para no contaminar el scope global
