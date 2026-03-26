// public/sw.js
self.addEventListener('push', event => {
  const data = event.data.json()
  // 尝试向所有客户端发送消息
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        if (clients.length > 0) {
          // 有打开的页面，直接发送消息让页面播报
          clients.forEach(client => client.postMessage({
            type: 'REMINDER',
            payload: data
          }))
        } else {
          // 无打开页面，显示通知
          self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/pwa-192x192.png',
            badge: '/badge.png',
            vibrate: [200, 100, 200],
            requireInteraction: true,
            data: data // 传递数据，点击时可使用
          })
        }
      })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const data = event.notification.data
  // 打开或聚焦客户端，并发送消息
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        if (clientList.length > 0) {
          clientList[0].focus()
          clientList[0].postMessage({
            type: 'REMINDER',
            payload: data
          })
        } else {
          self.clients.openWindow('/').then(client => {
            // 等待页面加载完成后发送消息（这里简化，可能需等待）
            client.postMessage({
              type: 'REMINDER',
              payload: data
            })
          })
        }
      })
  )
})