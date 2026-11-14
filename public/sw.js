// ==============================================================================
// Service Worker para Sandalias y Pantuflas HC (HC Venta PWA)
// Gestiona el ciclo de vida de la aplicación, caché y actualización de versiones.
// ==============================================================================

const CACHE_NAME = 'hc-pwa-cache-v1';

// 1. Instalación del Service Worker
self.addEventListener('install', (event) => {
  // Permite que un nuevo Service Worker tome el control rápidamente cuando sea requerido
  self.skipWaiting();
});

// 2. Activación: reclamar clientes inmediatamente y limpiar versiones previas de caché
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Manejo de mensajes desde la aplicación cliente (ej. botón de actualización)
self.addEventListener('message', (event) => {
  if (event.data) {
    if (event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
    if (event.data.type === 'CLEAR_CACHE') {
      event.waitUntil(
        caches.keys().then((names) => {
          return Promise.all(names.map((name) => caches.delete(name)));
        })
      );
    }
  }
});

// 4. Estrategia de Fetch: Network-First con fallback a caché para navegación y estáticos
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // No interceptar peticiones de API, server actions de Next.js ni métodos que no sean GET
  if (
    request.url.includes('/api/') ||
    request.method !== 'GET' ||
    request.headers.get('next-action')
  ) {
    return;
  }

  // Network-First para páginas HTML y recursos de la app
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // Cachear únicamente respuestas exitosas para recursos estáticos específicos
        if (
          networkResponse.status === 200 &&
          (request.url.includes('/_next/static/') ||
           request.url.includes('/images/') ||
           request.url.includes('/icons/') ||
           request.url.endsWith('.png') ||
           request.url.endsWith('.svg') ||
           request.url.endsWith('.ico'))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // En caso de estar offline o sin red, responder desde caché si existe
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // Si es navegación HTML y falló la red sin caché, devolver respuesta informativa de offline
        if (request.mode === 'navigate') {
          return new Response(
            '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Sin Conexión - HC Venta</title><style>body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0f172a;color:#f8fafc;padding:1rem;text-align:center}div{max-width:400px;background:#1e293b;padding:2rem;border-radius:1rem;border:1px solid #334155}h1{font-size:1.5rem;margin-bottom:0.5rem;color:#facc15}p{color:#94a3b8;margin-bottom:1.5rem}button{background:#eab308;color:#0f172a;border:none;padding:0.75rem 1.5rem;font-weight:600;border-radius:0.5rem;cursor:pointer}button:hover{background:#facc15}</style></head><body><div><h1>Sin Conexión</h1><p>No se pudo conectar al servidor. Revisa tu conexión a internet o intenta nuevamente.</p><button onclick="window.location.reload()">Reintentar</button></div></body></html>',
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            }
          );
        }

        // Para otros recursos que no están en caché, responder con un Response válido en lugar de undefined
        return new Response(null, {
          status: 504,
          statusText: 'Gateway Timeout',
        });
      })
  );
});
