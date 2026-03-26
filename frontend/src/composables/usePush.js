// src/composables/usePush.js
import { ref } from 'vue'
import api from '@/api'

export function usePush() {
  const isSubscribed = ref(false)
  const subscription = ref(null)

  // 将公钥从后端获取
  const publicVapidKey = 'BH9I5lMTktu-rJpnG-A9hBScqFLuhADH5qmGQ7vq2QKrpwxbEChRYhZw9MJxLYB2MuLHoPBSplGUWe-geIhJ9yE'

  async function subscribeUser() {
    // console.log('【前端】开始订阅...')
    try {
      const registration = await navigator.serviceWorker.ready
      // console.log('【前端】sw 已就绪', registration)
      // console.log('【前端】pushManager 存在？', registration.pushManager);
      
      // 检查 pushManager 是否存在
      // if (!registration.pushManager) {
      //   console.error('【前端】pushManager 不存在！')
      //   return
      // }
      
      // 检查是否已有订阅
      let sub = await registration.pushManager.getSubscription()
      console.log('【前端】已有订阅？', sub)
      if (!sub) {
        // 转换公钥为Uint8Array
        console.log('开始转换公钥')
        const convertedKey = urlBase64ToUint8Array(publicVapidKey)
        console.log('转换完成，开始 subscribe')

        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey
        })

              clearTimeout(timeout)
      console.log('subscribe 成功', sub)
      }


      subscription.value = sub

        // 新增：检查 api 对象
  // console.log('【前端】api 对象：', api)
  // console.log('【前端】api.post 方法：', api.post)

      // 发送到后端保存
      console.log('【前端】准备发送到后端...')
      
      await api.post('/push/subscribe', sub)
      // const response = await fetch('http://localhost:3000/api/push/subscribe', {
      // method: 'POST',
      // headers: { 'Content-Type': 'application/json' },
      // body: JSON.stringify(sub)
      // })
      // console.log('【前端】fetch 响应：', response)
      // if (response.ok) {
      //   const data = await response.json()
      //   console.log('【前端】后端保存成功', data)
      // } else {
      //   console.error('【前端】后端返回错误', response.status)
      // }

      console.log('【前端】后端保存成功')
      isSubscribed.value = true

    } catch (err) {
      console.error('订阅推送失败', err)
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