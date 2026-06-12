/* Service Worker for Web Push notifications */

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

self.addEventListener('push', event => {
  const data = (() => {
    try { return event.data?.json() ?? {} }
    catch { return { title: '미션 알림', body: event.data?.text() ?? '' } }
  })()
  const title = data.title || '미션 알림'
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/mission' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/mission'
  event.waitUntil(self.clients.openWindow(url))
})
