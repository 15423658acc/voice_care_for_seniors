// src/sw-register.js
// 单例模式确保全局只注册一次
let registrationPromise = null

export async function registerServiceWorker() {
  // 1. 检查浏览器是否支持 Service Worker
  if (!('serviceWorker' in navigator)) {
    console.warn('当前浏览器不支持 Service Worker')
    return null
  }

  // 2. 如果已经有注册过的 Promise，直接返回（防止重复调用）
  if (registrationPromise) {
    return registrationPromise
  }

  // 3. 注册 Service Worker
  registrationPromise = navigator.serviceWorker.register('/sw.js')
    .then(registration => {
      console.log('Service Worker 注册成功:', registration)

      // 4. 监听更新事件，提示用户刷新页面
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        console.log('发现新版本 Service Worker')
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // 有新版本可用，且当前已激活旧版本，提示用户刷新
            // 这里可以弹出一个 Toast 或对话框
            console.log('新版本 Service Worker 已安装，请刷新页面获取最新功能')
          }
        })
      })

      return registration
    })
    .catch(error => {
      console.error('Service Worker 注册失败:', error)
      registrationPromise = null // 重置，允许重试
      throw error
    })

  return registrationPromise
}

// 在 main.js 中调用一次即可
// registerServiceWorker()