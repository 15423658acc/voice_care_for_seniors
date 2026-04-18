// src/composables/usePush.js
import { ref } from 'vue'
import api from '@/api'

export function usePush() {
  const isSubscribed = ref(false)
  const subscription = ref(null)

  // 公钥（从环境变量或直接写，建议从后端获取）
  const publicVapidKey = 'BEENlvIXIWbCBpd_dkJGAm39PnIgGlmJgU6p6ihUELqzQY9W_X45IRdRHuGvbWAuiuMiIjs1RCbOCYSEuCnP5_o'

  // 工具函数：base64 转 Uint8Array
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  // 订阅推送（用户主动点击时调用）
  async function subscribeUser() {
    try {
      const registration = await navigator.serviceWorker.ready
      let sub = await registration.pushManager.getSubscription()
      if (!sub) {
        const convertedKey = urlBase64ToUint8Array(publicVapidKey)
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey
        })
        console.log('新订阅创建成功', sub)
      } else {
        console.log('已有订阅，无需重复创建')
      }
      subscription.value = sub
      // 发送到后端保存
      await api.post('/push/subscribe', sub)
      isSubscribed.value = true
      console.log('订阅成功，后端保存完成')
    } catch (err) {
      console.error('订阅推送失败', err)
      throw err
    }
  }

  // 检查是否已有订阅（不重新创建）
  async function checkExistingSubscription() {
    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.getSubscription()
      if (sub) {
        subscription.value = sub
        isSubscribed.value = true
        return true
      }
      return false
    } catch (err) {
      console.error('检查订阅失败', err)
      return false
    }
  }

  // 初始化：注册 Service Worker，并检查已有订阅
  async function initPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('当前浏览器不支持推送')
      return false
    }
    // 注册 Service Worker（如果尚未注册）
    const registration = await navigator.serviceWorker.register('/sw.js')
    console.log('Service Worker 注册成功', registration)
    // 检查是否已有订阅
    const hasSub = await checkExistingSubscription()
    return hasSub
  }

  return { isSubscribed, subscribeUser, checkExistingSubscription, initPush }
}