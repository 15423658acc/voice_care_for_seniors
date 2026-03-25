// public/sw.js

// 监听推送事件
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    data = event.data.json(); // 期望后端发送 JSON 字符串
  }
  const { title = '吃药提醒', body = '到时间吃药了' } = data;

  // 尝试向所有已打开的客户端页面发送消息（用于即时语音播报）
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        if (clients && clients.length > 0) {
          // 有打开的页面，通过 postMessage 发送提醒，让页面立即播报
          clients.forEach(client => {
            client.postMessage({
              type: 'REMINDER',
              payload: { title, body }
            });
          });
        } else {
          // 没有打开的页面，显示系统通知
          return self.registration.showNotification(title, {
            body,
            icon: '/pwa-192x192.png',
            badge: '/badge.png',
            vibrate: [200, 100, 200],
            requireInteraction: true, // 重要提醒，需要用户手动关闭
            data: { title, body }     // 保存数据，供点击事件使用
          });
        }
      })
  );
});

// 监听通知点击事件
self.addEventListener('notificationclick', (event) => {
  event.notification.close(); // 关闭通知

  const { title, body } = event.notification.data;
  // 打开或聚焦客户端，并发送消息让页面播报
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        if (clientList.length > 0) {
          // 已存在窗口，聚焦并发送消息
          clientList[0].focus();
          clientList[0].postMessage({
            type: 'REMINDER',
            payload: { title, body }
          });
        } else {
          // 没有窗口，打开新窗口并发送消息
          self.clients.openWindow('/').then(client => {
            // 注意：新打开的页面加载完成前可能无法立即接收消息，可延迟或监听 load 事件
            if (client) {
              client.postMessage({
                type: 'REMINDER',
                payload: { title, body }
              });
            }
          });
        }
      })
  );
});

// 可选：监听 Service Worker 安装事件，避免重复安装时的冲突
self.addEventListener('install', (event) => {
  // 跳过等待，立即激活，确保新的 SW 接管控制
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // 清理旧的缓存等，立即接管所有客户端
  event.waitUntil(clients.claim());
});