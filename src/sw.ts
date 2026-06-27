/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
  widgets?: WidgetController;
};

interface WidgetController {
  getByTag(tag: string): Promise<WidgetInstance | undefined>;
  updateByTag(tag: string, payload: { template: string; data: string }): Promise<void>;
  removeByTag(tag: string): Promise<void>;
}

interface WidgetInstance {
  definition: { tag: string };
}

interface WidgetEvent extends ExtendableEvent {
  widget: WidgetInstance;
}

interface PeriodicSyncEvent extends ExtendableEvent {
  tag: string;
}

// Take over immediately when a new SW installs, then notify clients to reload
self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Runtime caching for Open-Meteo APIs
registerRoute(
  ({ url }) => url.href.startsWith('https://api.open-meteo.com/'),
  new NetworkFirst({
    cacheName: 'open-meteo-forecast',
    plugins: [
      new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 600 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

registerRoute(
  ({ url }) => url.href.startsWith('https://air-quality-api.open-meteo.com/'),
  new NetworkFirst({
    cacheName: 'open-meteo-air-quality',
    plugins: [
      new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 1800 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// Widget data cache — the app posts WIDGET_DATA_UPDATE messages to fill this
const WIDGET_CACHE = 'widget-data-v1';

// Intercept /widget-data.json so the widget template can fetch it
registerRoute(
  ({ url }) => url.pathname === '/widget-data.json',
  async () => {
    const cache = await caches.open(WIDGET_CACHE);
    const cached = await cache.match('/widget-data.json');
    if (cached) return cached;
    return new Response(JSON.stringify({ noData: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
  'GET',
);

async function renderWidget(tag: string) {
  if (!self.widgets) return;
  try {
    const [templateRes, cache] = await Promise.all([
      fetch('/widget-template.html'),
      caches.open(WIDGET_CACHE),
    ]);
    if (!templateRes.ok) return;
    const template = await templateRes.text();
    const dataRes = await cache.match('/widget-data.json');
    const data = dataRes ? await dataRes.text() : JSON.stringify({ noData: true });
    await self.widgets.updateByTag(tag, { template, data });
  } catch {
    // widget API not available or failed — ignore
  }
}

self.addEventListener('widgetinstall', (event) => {
  const e = event as unknown as WidgetEvent;
  e.waitUntil(renderWidget(e.widget.definition.tag));
});

self.addEventListener('widgetupdate', (event) => {
  const e = event as unknown as WidgetEvent;
  e.waitUntil(renderWidget(e.widget.definition.tag));
});

self.addEventListener('widgetresume', (event) => {
  const e = event as unknown as WidgetEvent;
  e.waitUntil(renderWidget(e.widget.definition.tag));
});

self.addEventListener('widgetuninstall', (_event) => {
  // nothing to clean up
});

// Periodic background sync — keeps the widget fresh even when the app is closed
self.addEventListener('periodicsync', (event) => {
  const e = event as unknown as PeriodicSyncEvent;
  if (e.tag === 'weather-widget-sync') {
    e.waitUntil(renderWidget('weather-current'));
  }
});

// Push notification handler (for future server-side push)
self.addEventListener('push', (event) => {
  const data = event.data?.json() as { title?: string; body?: string; tag?: string } | undefined;
  if (!data?.title) return;
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag ?? 'weather',
    }),
  );
});

// Open app when notification is tapped
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return (client as WindowClient).focus();
      }
      return self.clients.openWindow('/');
    }),
  );
});

// Message from app: update widget data then re-render
self.addEventListener('message', (event) => {
  const ev = event as unknown as { data: { type: string; payload: string } };
  if (ev.data?.type === 'WIDGET_DATA_UPDATE') {
    const payload = ev.data.payload;
    caches
      .open(WIDGET_CACHE)
      .then((cache) => {
        cache
          .put(
            '/widget-data.json',
            new Response(payload, { headers: { 'Content-Type': 'application/json' } }),
          )
          .then(() => renderWidget('weather-current'))
          .catch(() => {});
      })
      .catch(() => {});
  }
});
