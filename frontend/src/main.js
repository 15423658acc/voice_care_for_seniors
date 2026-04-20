// src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // 引入路由
import './assets/admin.css'   // 全局管理员样式
import './assets/elder.css'

const app = createApp(App)
app.use(router) // 使用路由插件
app.mount('#app')


// main.js 中增加 Service Worker 注册
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js') // 注意路径，实际由PWA插件生成
    .then(reg => console.log('[Main] SW registered'))
    .catch(err => console.error('[Main] SW registration failed', err))
}

// 3.0中： 存在重复注册监听器的问题，且 speakEmergency 函数缺少用户交互激活的兜底。
/* 
修复：
统一消息监听：将 EMERGENCY 和 REMINDER 的监听合并到一个 addEventListener 中，避免重复注册。
语音函数分离：紧急播报会 cancel() 清空队列，确保立即播放；普通提醒也支持。
首次交互激活：通过全局点击事件（一次）调用静默语音，确保后续自动播报不被浏览器阻止。
  这对子女端尤为有用，因为子女端可能在收到推送前未主动点击过“开启推送”以外的按钮（但点击订阅按钮本身已经算交互，这里双重保险）。

*/

/**
 * 播放紧急语音                                 3.0
 * @param {string} text - 播报文本
 */
function speakEmergency(text) {
  if (!('speechSynthesis' in window)) {
    console.warn('[Voice] 浏览器不支持语音合成')
    return
  }

  // 尝试激活语音权限（部分浏览器需要在用户手势后首次调用）
  // 这里调用 cancel 清空队列，然后播报
  try {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.9
    utterance.volume = 1
    window.speechSynthesis.cancel() // 打断当前播报，确保紧急消息优先
    window.speechSynthesis.speak(utterance)
    console.log('[Voice] 紧急语音播报已触发:', text)
  } catch (e) {
    console.error('[Voice] 语音播报异常:', e)
  }
}
/**
 * 普通提醒语音（吃药提醒）                    3.0
 */
function speakReminder(text) {
  if (!('speechSynthesis' in window)) return
  try {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.9
    utterance.pitch = 1.0
    utterance.volume = 1
    window.speechSynthesis.cancel() // 为了不打断紧急播报，可考虑不取消
    window.speechSynthesis.speak(utterance)
    console.log('[Voice] 提醒播报:', text)
  } catch (e) {
    console.error('[Voice] 提醒播报失败:', e)
  }
}



/* // main.js 中   3.0
navigator.serviceWorker.addEventListener('message', event => {
  if (event.data.type === 'REMINDER') {
    const { title, body } = event.data.payload
    // 使用语音播报
window.dispatchEvent(new CustomEvent('reminder-arrived', { detail: { body } }))
}
}) */


navigator.serviceWorker.addEventListener('message', event => {
  console.log('[Main] 收到 SW 消息:', event.data)
  if (!event.data) return
  const { type, payload } = event.data

  if (type === 'EMERGENCY') {
    // 紧急呼叫：语音播报 + 全局事件
    speakEmergency(payload.body)
    window.dispatchEvent(new CustomEvent('emergency-arrived', { detail: payload }))
  }
  else if (type === 'REMINDER') {
  // 吃药提醒：语音播报 + 全局事件
    speakReminder(payload.body)
    window.dispatchEvent(new CustomEvent('reminder-arrived', { detail: payload }))
  }
})

// -------------------- 用户手势激活语音--------------------
// 在任意用户点击事件中调用一次静默语音，以激活后续自动播报权限
document.addEventListener('click', function activateVoiceOnce() {
  const utterance = new SpeechSynthesisUtterance('')
  utterance.volume = 0
  speechSynthesis.speak(utterance)
  document.removeEventListener('click', activateVoiceOnce)
  console.log('[Voice] 语音权限已激活')
}, { once: true })


/* 
确保语音不被后台杀死：Web Push 触发的 Service Worker 可以唤醒浏览器并显示通知；
如果子女端页面已打开，通过 postMessage 到页面，页面调用 speechSynthesis 进行语音播报。
若页面在后台，浏览器通常会限制自动播放音频，但语音合成 speechSynthesis 在某些浏览器中仍可工作（需用户手势激活过一次）。
在子女端，由于用户已登录并操作过页面，语音合成权限通常已获得。
*/


/* // 子女端 main.js监听 EMERGENCY 消息：
if ('serviceWorker' in navigator) {    3.0
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data.type === 'EMERGENCY') {
      const { body } = event.data.payload
      // 语音播报（需用户交互激活，但子女端可能已有交互）
      speakEmergency(body)
      
      // 也可触发全局事件供组件响应
      window.dispatchEvent(new CustomEvent('emergency-arrived', { detail: event.data.payload }))
    }
  })
} */
/* function speakEmergency(text) {   3.0
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.9
    utterance.volume = 1
    window.speechSynthesis.cancel() // 打断当前播报
    window.speechSynthesis.speak(utterance)
  }
} */

// 语音播报函数   普通语音播报
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


