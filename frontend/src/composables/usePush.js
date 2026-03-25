// src/composables/usePush.js
import { ref } from 'vue'
import api from '@/api'

export function usePush() {
  const isSubscribed = ref(false)
  // const subscription = ref(null)
  

  // 将公钥从后端获取
  const publicVapidKey = 'BH9I5lMTktu-rJpnG-A9hBScqFLuhADH5qmGQ7vq2QKrpwxbEChRYhZw9MJxLYB2MuLHoPBSplGUWe-geIhJ9yE'

  // 检查当前是否有有效的推送订阅
  const checkSubscription = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('浏览器不支持推送');
      return null;
    }
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    isSubscribed.value = !!subscription;
    return subscription;
  };



  // 订阅推送
  const subscribeUser = async () => {
    try {
      // 1. 确保公钥已获取
      if (!publicVapidKey) {
        await fetchPublicKey();
      }

      // 2. 请求通知权限
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('请允许通知权限，否则无法收到提醒');
        return false;
      }

      // 3. 获取 Service Worker 注册实例
      const registration = await navigator.serviceWorker.ready;

      // 4. 检查是否已订阅
      let subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        // 已订阅，直接返回
        isSubscribed.value = true;
        return true;
      }

      // 5. 将公钥转换为 Uint8Array（web-push 要求）
      const applicationServerKey = urlBase64ToUint8Array(publicVapidKey);

      // 6. 创建订阅
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,     // 必须为 true，表示推送始终对用户可见
        applicationServerKey
      });

      // 7. 将订阅信息发送到后端保存
      await api.post('/push/subscribe', subscription.toJSON());

      isSubscribed.value = true;
      return true;
    } catch (error) {
      console.error('订阅失败', error);
      return false;
    }
  };

  // 工具函数：将 base64 字符串转换为 Uint8Array
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  return {
    isSubscribed,
    checkSubscription,
    subscribeUser
  };
}


//   async function subscribeUser() {
//       try {
//       const registration = await navigator.serviceWorker.ready
//       // 检查是否已有订阅
//       let sub = await registration.pushManager.getSubscription()
//       console.log('当前已有订阅：', sub) // 新增日志：看是否已有订阅
//       if (!sub) {
//         // 转换公钥为Uint8Array
//         const convertedKey = urlBase64ToUint8Array(publicVapidKey)
//         sub = await registration.pushManager.subscribe({
//           userVisibleOnly: true,
//           applicationServerKey: convertedKey
//         })
//   console.log('新生成的订阅对象：', sub) // 新增日志：看是否生成订阅
//       }
//       subscription.value = sub
//       // 发送到后端保存
//           console.log('准备传给后端的订阅数据：', sub) // 新增日志：确认数据格式
//     await api.post('/push/subscribe', sub) // 传订阅数据给后端
//     console.log('订阅数据已发送到后端') // 新增日志：确认接口调用
//       isSubscribed.value = true
//     } catch (err) {
//       console.error('订阅推送失败', err)
//     }
//   }

//   // 工具函数：将base64字符串转换为Uint8Array（web-push要求）
//   function urlBase64ToUint8Array(base64String) {

//     console.log('进入urlBase64ToUint8Array函数，传入的公钥：', base64String) // 新增日志
//     if (!base64String) {
//     console.error('公钥为空！') // 直接标记问题
//     return new Uint8Array()
//   }

//     const padding = '='.repeat((4 - base64String.length % 4) % 4)
//     const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/')
//     const rawData = window.atob(base64)
//     const outputArray = new Uint8Array(rawData.length)
//     for (let i = 0; i < rawData.length; ++i) {
//       outputArray[i] = rawData.charCodeAt(i)
//     }
//     return outputArray
//   }
//   return { isSubscribed, subscribeUser }
// }




