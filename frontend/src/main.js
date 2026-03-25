// src/main.js
import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import api from './api'


// 注册 Service Worker 并避免重复注册
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('浏览器不支持 Service Worker');
    return;
  }

  try {
    // 检查是否已经注册，避免重复注册（但通常 register 方法本身不会重复）
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      console.log('Service Worker 已注册，无需重复注册');
      return;
    }

    // 注册新的 Service Worker
    const reg = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker 注册成功', reg);

    // 监听来自 Service Worker 的消息（用于语音播报）
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'REMINDER') {
        const { body } = event.data.payload;
        speak(`提醒：${body}`); // 调用语音播报函数
      }
    });
  } catch (error) {
    console.error('Service Worker 注册失败', error);
  }
}

// 语音播报函数（适老化：语速慢、音量高）
function speak(text) {
  if (!('speechSynthesis' in window)) {
    console.warn('浏览器不支持语音合成');
    return;
  }
  // 取消任何正在进行的语音，避免重叠
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.rate = 0.9;   // 语速稍慢
  utterance.pitch = 1.0;
  utterance.volume = 1;   // 最大音量
  window.speechSynthesis.speak(utterance);
}

// 在应用启动前注册 SW
registerServiceWorker();

// 创建 Vue 应用
const app = createApp(App);
app.use(router);
app.config.globalProperties.$api = api;
app.mount('#app');



// const app = createApp(App)

// if ('serviceWorker' in navigator) {
//   window.addEventListener('load', async () => {
//     try {
//       // 先检查是否已有激活的SW实例
//       const existingRegistrations = await navigator.serviceWorker.getRegistrations()
//       // 注销所有旧实例（避免冲突）
//       for (const reg of existingRegistrations) {
//         await reg.unregister()
//         console.log('注销旧的SW实例：', reg)
//       }

//       // 只注册一次新的SW实例
//       const reg = await navigator.serviceWorker.register('/sw.js', {
//         scope: '/' // 明确指定根作用域，避免作用域冲突
//       })
//       console.log('SW仅注册一次，实例：', reg)

//       // 监听SW激活状态，确保激活后再绑定消息监听
//       reg.addEventListener('activate', () => {
//         console.log('SW已激活（无冲突）')
//         // 绑定消息监听+语音播报（核心逻辑不变）
//         navigator.serviceWorker.addEventListener('message', event => {
//           if (event.data.type === 'REMINDER') {
//             const { title, body } = event.data.payload
//             speak(`提醒：${body}`)
//           }
//         })

//         function speak(text) {
//           if ('speechSynthesis' in window) {
//             const utterance = new SpeechSynthesisUtterance(text)
//             utterance.lang = 'zh-CN'
//             utterance.rate = 0.9
//             utterance.volume = 1
//             window.speechSynthesis.speak(utterance)
//           }
//         }
//       })
//     } catch (err) {
//       console.error('SW注册失败：', err)
//     }
//   })
// }


// app.use(router) 
// app.mount('#app')