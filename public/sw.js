/* Vocab Deck push notification service worker. */
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let payload
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = {}
  }

  const title = payload.title || 'Vocab Deck'
  const body = payload.body || ''
  const url = payload.data && payload.data.url ? payload.data.url : '/'

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/logo-dark.png',
      badge: '/favicon.png',
      tag: 'daily-reminder',
      data: { url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.postMessage({ type: 'notification-click' })
            return client.focus()
          }
        }
        return self.clients.openWindow(url)
      }),
  )
})
