// src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // 引入路由
import './assets/admin.css'   // 全局管理员样式

const app = createApp(App)
app.use(router) // 使用路由插件
app.mount('#app')


// main.js 中增加 Service Worker 注册
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js') // 注意路径，实际由PWA插件生成
    .then(reg => console.log('SW registered'))
    .catch(err => console.error('SW registration failed', err))
}

// main.js 中
navigator.serviceWorker.addEventListener('message', event => {
  if (event.data.type === 'REMINDER') {
    const { title, body } = event.data.payload
    // 使用语音播报
window.dispatchEvent(new CustomEvent('reminder-arrived', { detail: { body } }))

}
})

/* 
确保语音不被后台杀死：Web Push 触发的 Service Worker 可以唤醒浏览器并显示通知；
如果子女端页面已打开，通过 postMessage 到页面，页面调用 speechSynthesis 进行语音播报。
若页面在后台，浏览器通常会限制自动播放音频，但语音合成 speechSynthesis 在某些浏览器中仍可工作（需用户手势激活过一次）。
在子女端，由于用户已登录并操作过页面，语音合成权限通常已获得。
*/
// 子女端 main.js监听 EMERGENCY 消息：
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data.type === 'EMERGENCY') {
      const { body } = event.data.payload
      // 语音播报（需用户交互激活，但子女端可能已有交互）
      speakEmergency(body)
      
      // 也可触发全局事件供组件响应
      window.dispatchEvent(new CustomEvent('emergency-arrived', { detail: event.data.payload }))
    }
  })
}
function speakEmergency(text) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.9
    utterance.volume = 1
    window.speechSynthesis.cancel() // 打断当前播报
    window.speechSynthesis.speak(utterance)
  }
}

// 语音播报函数
function speak(text) {
  console.log('尝试播报:', text);
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.9 // 语速稍慢
    utterance.pitch = 1.0
    utterance.volume = 1
    window.speechSynthesis.speak(utterance)
  }else {
    console.warn('不支持语音合成');
  }
}


