// src/composables/usePush.js
import { ref } from 'vue'
import api from '@/api'

export function usePush() {
  const isSubscribed = ref(false)
  const subscription = ref(null)

  // 将公钥从后端获取
  const publicVapidKey = 'BH9I5lMTktu-rJpnG-A9hBScqFLuhADH5qmGQ7vq2QKrpwxbEChRYhZw9MJxLYB2MuLHoPBSplGUWe-geIhJ9yE'

  async function subscribeUser() {
    try {
      const registration = await navigator.serviceWorker.ready
      
      // 检查是否已有订阅
      let sub = await registration.pushManager.getSubscription()
      if (!sub) {
        // 转换公钥为Uint8Array
        const convertedKey = urlBase64ToUint8Array(publicVapidKey)

        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey
        })

              clearTimeout(timeout)
      console.log('subscribe 成功', sub)
      }


      subscription.value = sub

      // 发送到后端保存
      
      await api.post('/push/subscribe', sub)

      isSubscribed.value = true
      console.log('订阅成功，后端保存完成');
    } catch (err) {
      console.error('订阅推送失败', err)
      throw err; // 重新抛出，让 enablePush 捕获
    }
  }

  // 工具函数：将base64字符串转换为Uint8Array（web-push要求）
/**
 * 将Base64编码的URL安全字符串转换为Uint8Array数组
 * @param {string} base64String - Base64编码的URL安全字符串
 * @returns {Uint8Array} 转换后的Uint8Array数组
 */
  function urlBase64ToUint8Array(base64String) {
  // 计算并添加Base64所需的填充字符
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
  // 将URL安全的Base64字符转换为标准Base64字符
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
  // 使用window.atob解码Base64字符串
    const rawData = window.atob(base64)
  // 创建与解码后数据长度相同的Uint8Array
    const outputArray = new Uint8Array(rawData.length)
  // 将解码后的字符代码存入Uint8Array
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  return { isSubscribed, subscribeUser }
}