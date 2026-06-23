/// <reference lib="webworker" />

import { precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('push', (event) => {
  const data = (event as PushEvent).data?.json() as {
    title?: string
    body?: string
    url?: string
  } ?? {}
  ;(event as ExtendableEvent).waitUntil(
    self.registration.showNotification(data.title ?? 'Lodówka', {
      body: data.body ?? '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url ?? '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  const ne = event as NotificationEvent
  ne.notification.close()
  const url: string = ne.notification.data?.url ?? '/'
  ne.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((list) => {
      for (const client of list) {
        if (client.url === url && 'focus' in client) return (client as WindowClient).focus()
      }
      return self.clients.openWindow(url)
    }),
  )
})
