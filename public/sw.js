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
      .catch(() => {
        // En caso de estar offline o sin red, responder desde caché si existe
        return caches.match(request);
      })
  );
});
