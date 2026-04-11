<template>
  <div class="home">
    <!-- 右上角跳转管理端按钮 -->
    <button class="admin-redirect-btn" @click="handleGoAdmin">🔧 跳转管理端</button>

    <!-- ————————========== 紧急呼救超大按钮区域 ==========—————————— -->
    <div class="emergency-section">
      <!-- 当isShaking为true时添加抖动动画（按下时抖动，松手停止） -->
       <!-- mousedown / touchstart → 按下开始倒计时 (startEmergency)  -->
        <!-- mouseup / touchend / mouseleave / touchcancel → 松手或移出按钮时调用cancelEmergencyByUser（只停止抖动动画，不取消倒计时） -->
      <button
        ref="emergencyBtn" 
        class="emergency-mega-btn"
        :class="{ shaking: isShaking }"
        @mousedown="startEmergency"
        @mouseup="cancelEmergencyByUser"
        @mouseleave="cancelEmergencyByUser"
        @touchstart="startEmergency"
        @touchend="cancelEmergencyByUser"
        @touchcancel="cancelEmergencyByUser"
      >
        🚨 紧急呼救
      </button>
      <!-- 倒计时显示 -->
      <p v-if="countdown > 0" class="countdown-text">
        将在 {{ countdown }} 秒后自动呼救
      </p>
      <!-- 取消按钮（仅倒计时过程中显示） -->
      <button
        v-if="showCancelBtn"
        class="cancel-btn"
        @click="cancelEmergencyFinal"
      >
        ❌ 取消
      </button>
      <!-- 状态提示文字 -->
      <p v-if="statusText" class="status-text">{{ statusText }}</p>
    </div>
      <!-- ————————========== 紧急呼救超大按钮区域 ==========—————————— -->

    <!-- 欢迎语 -->
    <h1 class="welcome">老友助手</h1>
    <!-- 其他功能卡片网格 -->
    <div class="grid">
      <!-- 注意：紧急呼叫卡片已移除，其他五个保留 -->
      <router-link to="/reminder" class="card reminder">💊 吃药提醒</router-link>
      <router-link to="/antifraud" class="card fraud">🛡️ 防诈骗</router-link>
      <router-link to="/weather" class="card weather">☀️ 天气</router-link>
      <router-link to="/voiceAssistant" class="card voice">🎤 语音助手</router-link>
      <router-link to="/healthRecords" class="card health">📋 健康记录</router-link>
      <router-link to="/profile" class="card profile">👤 个人中心</router-link>
    </div>
    <!-- 左下角退出登录按钮 -->
    <button class="logout-btn" @click="handleLogout">🚪 退出登录</button>
  </div>
</template>

<script setup>
import { ref, onUnmounted, computed } from 'vue'   //onUnmounted（组件卸载钩子)
import { useRouter } from 'vue-router'
import api from '@/api'
// onUnmounted = 组件销毁时的清理函数。用于清除定时器、事件监听等资源占用。专门在组件被卸载、销毁、从页面上移除时执行。

const router = useRouter()

// ---------- 紧急呼救相关状态 ----------
const emergencyBtn = ref(null)              // 按钮 DOM 引用
const isShaking = ref(false)                // 是否播放抖动动画
const countdown = ref(0)                    // 倒计时秒数（整数）
const statusText = ref('')                  // 状态提示文字
const showCancelBtn = ref(false)            // 是否显示取消按钮

// 把对象/引用类型初始化为 null，为了类型清晰、避免报错、方便判断、减少意外响应式问题。比undefined语义更强。
let countdownTimer = null    // 倒计时定时器
let beepTimer = null     // 蜂鸣音定时器
let beepAudio = null   // 音频对象

// 配置常量
const COUNTDOWN_SECONDS = 3                 // 倒计时3秒
const EMERGENCY_PHONE = '19707092146'       // 预设紧急电话，实际应从配置读取
const MAX_RETRY = 3                         // 最大重试次数

// ---------- 辅助函数：语音播报，Web Speech API进行中文语音播报 ----------
const speakText = (text) => {
  if (!('speechSynthesis' in window)) return  // 浏览器不支持语音合成
  const utterance = new SpeechSynthesisUtterance(text)    // 创建语音播报对象
  utterance.lang = 'zh-CN'
  utterance.rate = 0.9
  utterance.volume = 1
  window.speechSynthesis.cancel() // 避免多个播报重叠
  window.speechSynthesis.speak(utterance) // 播报文本text
}

// ---------- 获取老人姓名（从本地存储的用户信息中取），为后端发送邮件内容使用----------
const getElderName = () => {
  try {
    const userStr = localStorage.getItem('user')   //从localStorage中取出用户对象，获取fullName或username
    if (userStr) {
      const user = JSON.parse(userStr)
      return user.fullName || user.username || '老人'
    }
  } catch (e) {}
  return '老人'
}

// --- 获取当前位置：封装浏览器原生定位API，变成Promise形式，async/await调用，类似于await getCurrentPosition()结构调用。 ----------
const getCurrentPosition = () => {
  return new Promise((resolve, reject) => {   // 1. 包装成 Promise，支持 async/await。
    if (!navigator.geolocation) {
      reject(new Error('浏览器不支持地理位置'))   // 2. 判断浏览器是否支持定位
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {   // 定位成功返回Promise是resolve，失败则reject
      enableHighAccuracy: true,  // 开启高精度
      timeout: 8000,   // 超时时间 8 秒
      maximumAge: 0   // 不使用缓存
    })
  })
}
// resolve/reject是Promise自带的两个回调函数，支撑async/await能工作，是new Promise(...)里面固定的两个参数。
// Promise 是基础机制（用来把异步任务包起来），async/await 是语法糖（让 Promise 写起来像同步代码，更好看），是上下级关系。
// Promise 靠 .then() .catch() 链式调用，步骤多了会变成 回调地狱（then 套 then 套 then），代码阅读不顺滑；
// async/await 把 Promise 包装成同步代码，写起来更清晰，代码更易读，底层还是调用 Promise，只是写法变好看。
// 它们的对应：resolve(数据)对应await 拿到结果，reject(错误)对应catch(err) 捕获错误。
// async/await：async 是修饰函数，await 是等待 Promise。
// async 只能写在函数前面，让这个函数变成异步函数，并且返回值自动包成 Promise，不负责调用，只是 “给函数打个标记”。
// await 只能用在 async 函数内部，等待一个 Promise 执行完，并拿到它 resolve 的结果，只负责 “等 Promise”。
// async给函数开权限：允许里面用 await；await等待 Promise：把异步代码写成同步样子。没有async不能用await，没有await→async没啥意义。

// -- 发送邮件并记录日志（支持重试）：传入位置数据 → 并行发邮件 + 记日志 → 失败自动重试最多 3 次 → 成功返回 true，失败抛错----------
const sendEmergencyRequest = async (locationData) => {   //// 定义异步函数：发送紧急请求（参数：位置数据）
  let lastError = null     // 保存最后一次失败的错误信息
  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    try {
      // 并行发送邮件和记录日志（不互相依赖）  核心：同时并行做两件事（不排队，一起执行，更快）  Promise.all = 让两个请求一起发，不等待一个完成再发另一个
      await Promise.all([
        api.post('/emergency/send', {   // 1. 发邮件/紧急请求
          location: { latitude: locationData.latitude, longitude: locationData.longitude },
          address: locationData.mapLink,     // 地图地址
          elderName: getElderName()   // 此处保持向后兼容
        }),
        api.post('/emergency-logs', {   // 2. 记录日志到后台（包含位置数据，方便后续分析和展示）
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          location: locationData.mapLink
        })
      ])
      return true // 成功
    } catch (error) {
      console.warn(`第${attempt}次发送失败`, error)
      lastError = error   // 保存错误
      if (attempt < MAX_RETRY) {          // 如果还没到最大重试次数
        // 等待1秒后重试：避免对服务器造成过大压力。new Promise(...)创建一个Promise 任务，await等待这个 Promise 执行完成，才继续往下走代码，1秒后setTimeout执行顺利且完成，resolve宣布“任务完成”
        await new Promise(resolve => setTimeout(resolve, 1000))
        statusText.value = `网络不佳，正在重试（${attempt}/${MAX_RETRY}）...`
        speakText(`网络不佳，正在重试`)
      }
    }
  }
  throw lastError    // 所有重试都失败，把最后一次错误抛出去
}

// -- 执行真正的紧急呼救（倒计时结束后调用）：倒计时结束后 → 正式执行紧急求助：获取定位 → 发邮件 / 上报日志 → 通知子女 → 自动拨号----------
const executeEmergency = async () => {
  // 清理倒计时相关状态，清理状态，重置界面
  clearTimers()  // 清理所有倒计时/定时器（防止重复触发）
  countdown.value = 0  // 倒计时归零
  showCancelBtn.value = false    // 隐藏取消按钮
  isShaking.value = false    // 停止手机震动

  statusText.value = '正在获取位置…'  //更新页面文字
  speakText('正在获取您的位置')

  try {
    // 1. 获取定位
    const position = await getCurrentPosition()
    const { latitude, longitude } = position.coords
    // const mapLink = `https://uri.amap.com/marker?position=${longitude},${latitude}&name=老人当前位置`
    // 指定坐标系为wgs84
    const mapLink = `https://uri.amap.com/marker?position=${longitude},${latitude}&name=老人当前位置&coordinate=wgs84`

    statusText.value = '紧急邮件发送中'
    speakText('正在发送紧急邮件')

    // 2. 发送请求（含重试）
    await sendEmergencyRequest({ latitude, longitude, mapLink })

    statusText.value = '已通知子女'
    speakText('已通知您的子女，请保持电话畅通')

    // 3. 触发拨号
    window.location.href = `tel:${EMERGENCY_PHONE}`
  } catch (error) {
    console.error('紧急呼叫失败', error)
    statusText.value = '呼叫失败，请检查网络或手动拨打电话'
    speakText('呼叫失败，请检查网络或手动拨打电话')
  }
}

// ---------- 开始倒计时（按下按钮时触发）----------
const startEmergency = () => {
  if (countdownTimer) return        // 防止重复启动

  if (navigator.vibrate) navigator.vibrate(50)      // 震动反馈，如果设备支持震动，就震动 50ms（提醒用户：按钮按中了）

  // 清空之前的状态
  statusText.value = ''
  isShaking.value = true
  showCancelBtn.value = true
  countdown.value = COUNTDOWN_SECONDS

  // 语音提示开始倒计时
  speakText(`紧急呼救将自动发出，若要取消请点击红色取消按钮`)

  // 播放蜂鸣音（循环，每1秒响一次）
  beepAudio = new Audio('/sounds/beep.mp3')
  beepAudio.loop = true
  beepAudio.play().catch(e => console.warn('音频播放失败（可能浏览器限制自动播放）', e))

  // 启动倒计时定时器，每 1 秒执行一次
  countdownTimer = setInterval(() => {
    countdown.value -= 1   // 每秒减 1
    // 倒计时结束
    if (countdown.value <= 0) {
      clearInterval(countdownTimer)   // 清除定时器
      countdownTimer = null
      // 停止蜂鸣音
      if (beepAudio) {
        beepAudio.pause()
        beepAudio.currentTime = 0
        beepAudio = null
      }
      // 执行紧急呼救
      executeEmergency()
    }
  }, 1000)
}

// ---------- 用户中途松手（但不取消，倒计时继续）----------
const cancelEmergencyByUser = () => {
  isShaking.value = false    // 松手不中断倒计时，但可以停止抖动动画（可选）
}

// ---------- 用户点击取消按钮，彻底终止呼救 ----------
const cancelEmergencyFinal = () => {
  clearTimers()
  // 停止蜂鸣音
  if (beepAudio) {
    beepAudio.pause()
    beepAudio.currentTime = 0
    beepAudio = null
  }
  countdown.value = 0
  showCancelBtn.value = false
  isShaking.value = false
  statusText.value = '已取消呼救'
  speakText('紧急呼救已取消')
}

// ---------- 清理所有定时器和音频 ----------
const clearTimers = () => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  if (beepTimer) {
    clearInterval(beepTimer)
    beepTimer = null
  }
}

// ---------- 组件卸载时清理资源，当组件被销毁（如路由跳转离开首页）时，清理所有定时器、音频、语音合成，避免内存泄漏或后台继续运行。
onUnmounted(() => {
  clearTimers()
  if (beepAudio) {
    beepAudio.pause()
    beepAudio = null
  }
  window.speechSynthesis.cancel()
})

// ---------- 退出登录逻辑 ----------
const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  alert('您已安全退出登录')
  router.push('/elder/login')
}

// ---------- 跳转管理端逻辑 ----------
const handleGoAdmin = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  alert('已退出老人端，正在跳转管理端登录页...')
  router.push('/admin/login')
}
</script>

<style scoped>
.home {
  position: relative;
  padding: 1rem;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ----- 紧急呼救区域（顶部） ----- */
.emergency-section {
  text-align: center;
  margin-bottom: 1.5rem;
}

.emergency-mega-btn {
  width: 90%;                 /* 超过屏幕一半 */
  max-width: 400px;           /* 最大宽度限制，但依然很宽 */
  height: 140px;              /* 高度≥120px */
  background-color: #FF2B2B;  /* 高饱和正红 */
  color: white;
  font-size: 38px;            /* ≥32px */
  font-weight: bold;
  border: none;
  border-radius: 70px;        /* 圆角大按钮 */
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition: transform 0.1s;
  user-select: none;
  touch-action: manipulation;
  margin: 0 auto;
  display: block;
}

/* 抖动动画（按下时） */
.shaking {
  animation: shake 0.1s infinite;
} 

@keyframes shake {
  0% { transform: translate(1px, 1px) rotate(0deg); }
  25% { transform: translate(-1px, -2px) rotate(-1deg); }
  50% { transform: translate(-3px, 0px) rotate(1deg); }
  75% { transform: translate(3px, 2px) rotate(0deg); }
  100% { transform: translate(1px, -1px) rotate(1deg); }
}

/* 倒计时文字 */
.countdown-text {
  font-size: 22px;
  color: #d32f2f;
  margin: 10px 0 5px;
  font-weight: bold;
}

/* 取消按钮 */
.cancel-btn {
  background-color: #ffffff;
  color: #FF2B2B;
  border: 3px solid #FF2B2B;
  border-radius: 50px;
  font-size: 28px;
  padding: 10px 30px;
  margin-top: 10px;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  transition: 0.1s;
}
.cancel-btn:active {
  background-color: #FF2B2B;
  color: white;
}

/* 状态文字 */
.status-text {
  font-size: 22px;
  color: #333;
  margin-top: 15px;
  font-weight: 500;
}

/* ----- 欢迎语 ----- */
.welcome {
  font-size: 2.2rem;
  text-align: center;
  margin: 1rem 0 1.5rem;
}

/* ----- 功能卡片网格 ----- */
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  flex: 1;
}

.card {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f0f0;
  padding: 1.8rem 0.5rem;
  font-size: 1.8rem;
  text-decoration: none;
  color: #333;
  border-radius: 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  min-height: 130px;
  text-align: center;
}

.reminder { background-color: #e8f5e8; color: #2e7d32; }
.voice { background-color: #fff3e0; color: #ef6c00; }
.fraud { background-color: #ede7f6; color: #512da8; }
.weather { background-color: #e1f5fe; color: #0277bd; }
.health { background-color: #fce4ec; color: #c2185b; }

/* ----- 固定按钮（右上角管理端、左下角退出）----- */
.admin-redirect-btn {
  position: fixed;
  top: 1rem;
  right: 1rem;
  background-color: #2196f3;
  color: white;
  font-size: 1.4rem;
  padding: 0.8rem 1.2rem;
  border: none;
  border-radius: 2rem;
  cursor: pointer;
  z-index: 100;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}
.admin-redirect-btn:hover {
  background-color: #0b7dda;
}

.logout-btn {
  position: fixed;
  bottom: 1rem;
  left: 1rem;
  background-color: #f44336;
  color: white;
  font-size: 1.4rem;
  padding: 0.8rem 1.2rem;
  border: none;
  border-radius: 2rem;
  cursor: pointer;
  z-index: 100;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}
.logout-btn:hover {
  background-color: #d32f2f;
}
</style>