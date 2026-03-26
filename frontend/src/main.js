// src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // 引入路由
// import './utils/rem'

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
    speak(`提醒：${body}`)
  }
})

// 语音播报函数
function speak(text) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.9 // 语速稍慢
    utterance.pitch = 1.0
    utterance.volume = 1
    window.speechSynthesis.speak(utterance)
  }
}


