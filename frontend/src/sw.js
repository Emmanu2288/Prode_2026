import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// SPA fallback
registerRoute(new NavigationRoute(new NetworkFirst({ networkTimeoutSeconds: 3 })));

// Cache logos de equipos
registerRoute(
  ({ url }) => url.hostname === "media.api-sports.io",
  new CacheFirst({
    cacheName: "team-logos-cache",
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 })],
  })
);

// Cache Google Fonts
registerRoute(
  ({ url }) => url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com",
  new CacheFirst({ cacheName: "google-fonts-cache" })
);

// ─── Push Notifications ───────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:  data.body,
      icon:  "/logo.png",
      badge: "/logo.png",
      data:  { url: data.url || "/" },
      vibrate: [200, 100, 200],
    })
  );
});

// Al clickear la notificación → abrir la app en la URL indicada
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// Activar inmediatamente sin esperar
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(clients.claim()));
