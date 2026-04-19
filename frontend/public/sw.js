/* // public/sw.js
self.addEventListener('push', event => {
  const data = event.data.json()
  // 尝试向所有客户端发送消息
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        console.log('找到的客户端数量:', clients.length);
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
}) */

// 普通提醒 + 紧急呼救（强化版、高优先级），专门为紧急呼叫做强化处理，
self.addEventListener('push', event => {
  let data
  try {
    data = event.data.json()
  } catch (e) {
    data = { title: '新通知', body: event.data.text() }
  }

  // 判断是否为紧急呼叫（可根据 data 中自定义字段）
  const isEmergency = data.data && data.data.type === 'emergency'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        if (clients.length > 0) {
          // 有打开的页面，发送消息让页面处理（包括语音播报）
          clients.forEach(client => {
            client.postMessage({
              type: isEmergency ? 'EMERGENCY' : 'REMINDER',
              payload: data
            })
          })
          // 如果是紧急呼叫，额外显示一条系统通知（保证后台时也能收到），页面打开时仍然强制弹出系统通知
          if (isEmergency) {
            return self.registration.showNotification(data.title, {
              body: data.body,
              icon: '/pwa-192x192.png',
              // 紧急通知震动更强
              vibrate: [200, 100, 200, 100, 200],
              requireInteraction: true,
              // 紧急通知只会显示最新一条，不会刷屏
              tag: 'emergency-call',
              data: data.data
            })
          }
        } else {
          // 无打开页面，显示通知
          return self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/pwa-192x192.png',
            badge: '/badge.png',
            vibrate: [200, 100, 200],
            requireInteraction: isEmergency,  // 紧急通知需要用户手动关闭
            data: data.data
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