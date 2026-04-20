<template>
  <div class="elder-reminder">
    <h1 class="page-title">💊 吃药提醒</h1>

    <!-- 提醒列表 -->
    <div v-if="reminders.length === 0" class="empty">今日暂无提醒</div>
     <div v-else class="reminder-list">
      <div v-for="item in reminders" :key="item.id" class="reminder-item">
        <div class="item-time">{{ formatTime(item) }}</div>
        <div class="item-medicine">{{ item.medicine }}</div>
        <div class="item-meta">
          <span v-if="item.repeatType && item.repeatType !== 'none'" class="repeat-badge">
            {{ repeatTypeText(item.repeatType) }}
          </span>
          <span class="status-badge" :class="getStatusClass(item)">
            {{ getStatusText(item) }}
          </span>
        </div>
      </div>
     </div>

    <!-- == 自动开启推送：播报前自动开启播报，播报后重新调用后端接口 /reminders/today，获取最新的提醒数据。 ========== -->
    <!-- 1. 推送订阅按钮（高对比度绿色大按钮） -->
    <button v-if="!pushSubscribed" @click="enablePush" class="elder-btn elder-btn-success push-btn">
      🔔 点击打开推送提醒
    </button>

    <!-- 2. 语音激活按钮（放在推送按钮下方） -->
    <button v-if="!speechEnabled" @click="enableSpeech" class="elder-btn elder-btn-warning voice-btn">
      🔊 开启语音播报
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import api from '@/api'
import { usePush } from '@/composables/usePush'

const reminders = ref([])
const { isSubscribed, subscribeUser, checkExistingSubscription  } = usePush()
const pushSubscribed = ref(false)
const speechEnabled = ref(false)

// 恢复语音和推送状态
const restorePushAndSpeech = async () => {
  // 1. 检查是否已有有效的推送订阅
  const hasSub = await checkExistingSubscription()
  if (hasSub) {
    pushSubscribed.value = true
    // 自动激活语音（如果不曾激活）
    if (!speechEnabled.value) {
      enableSpeech()
    }
    console.log('已恢复推送订阅状态')
  } else {
    pushSubscribed.value = false
  }
}

// 重复类型转中文（用于标签）
const repeatTypeText = (type) => {
  const map = {
    daily: '每日',
    every_other_day: '隔日',
    weekly: '每周'
  }
  return map[type] || ''
}

// 格式化时间
const formatTime = (reminder) => {
  if (reminder.time && /^\d{2}:\d{2}$/.test(reminder.time)) {
    return reminder.time
  }
  if (reminder.remindAt) {
    const date = new Date(reminder.remindAt)
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }
  return ''
}

// ========== 数据获取 ==========
const fetchReminders = async () => {
  try {
    const res = await api.get('/reminders/today')
    console.log('原始返回顺序:', res.map(r => r.time))
    reminders.value = res
  } catch (error) {
    console.error('获取提醒失败', error)
  }
}

// ========== 推送订阅 ==========
const enablePush = async () => {
  if (!speechEnabled.value) {
    enableSpeech()
  }
  const user = JSON.parse(localStorage.getItem('user'))
  await subscribeUser(user.id, user.role)   // 传入用户ID和角色
  // await subscribeUser()
  pushSubscribed.value = true
  await fetchReminders()
}

// ========== 语音播报（支持循环多次）==========
const speak = (text, repeatCount = 3) => {
  if (!speechEnabled.value) {
    console.warn('语音未激活，无法播报')
    return
  }
  window.speechSynthesis.cancel()
  let count = 0
  function play() {
    if (count >= repeatCount) return
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'zh-CN'
    u.rate = 0.9
    u.pitch = 1.0
    u.volume = 1
    u.onend = () => {
      count++
      play()
    }
    window.speechSynthesis.speak(u)
  }
  play()
}

// 激活语音
const enableSpeech = () => {
  const utterance = new SpeechSynthesisUtterance(' ')
  utterance.volume = 0
  window.speechSynthesis.speak(utterance)
  speechEnabled.value = true
  console.log('语音权限已激活')
}

// ========== 处理推送消息 ==========
const handleReminderArrived = (event) => {
  // const { body } = event.detail
  // speak(`提醒：${body}`, 3)
  // fetchReminders()
  const { body, refresh } = event.detail || {}
  if (body) {
    speak(`提醒：${body}`, 3)
  }
  // 无论什么推送，都刷新列表（保证数据最新）
  fetchReminders()
}

// 处理来自 Service Worker 的消息（专门处理刷新列表）
const handleServiceWorkerMessage = (event) => {
  if (event.data.type === 'REFRESH_LIST') {
    console.log('收到刷新列表信号，重新获取提醒')
    fetchReminders()
  }
}

// 将已过期但未成功推送的提醒标记为“提醒失败”并显示红色
// 获取状态文本
const getStatusText = (item) => {
  if (item.taken) return '已吃'
  if (isReminderFailed(item)) return '提醒失败'
  return '待提醒'
}
// 获取状态样式类
const getStatusClass = (item) => {
  if (item.taken) return 'taken'
  if (isReminderFailed(item)) return 'failure'
  return ''
}
// 判断是否为提醒失败（未吃且提醒时间已过）
const isReminderFailed = (item) => {
  if (item.taken) return false
  const remindTime = new Date(item.nextRemindAt)
  const now = new Date()
  return remindTime < now
}



// ========== 生命周期 ==========
// onMounted(() => {
//   fetchReminders()
//   window.addEventListener('reminder-arrived', handleReminderArrived)
// })
// 把回调函数声明为异步函数,await等待一个Promise（异步任务） 完成后再往下走：一个函数里可以写无数个 await，它们会按顺序排队执行，一个做完再做下一个，只有异步函数（async）内部才能用 await
onMounted(async () => {
  // 让后面的异步任务执行完，再执行下一行代码。
  await restorePushAndSpeech()   // 执行恢复状态，等待它完成
  await fetchReminders()         // 上一步完成后，才执行获取提醒，再等待它完成
    // 监听 Service Worker 消息（用于刷新列表）
  if (navigator.serviceWorker) {
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)
  }
  // 最后才执行监听事件:推送提醒
  window.addEventListener('reminder-arrived', handleReminderArrived)
  
})

onUnmounted(() => {
  if (navigator.serviceWorker) {
    navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage)
  }
  window.removeEventListener('reminder-arrived', handleReminderArrived)
  window.speechSynthesis.cancel()
})
</script>

<style scoped>
@import '@/assets/elder.css';

.elder-reminder {
  max-width: 600px;
  margin: 0 auto;
  padding: var(--elder-space-md);
}
.page-heading {
  font-size: var(--elder-fs-3xl);
  font-weight: 700;
  margin-bottom: var(--elder-space-lg);
  text-align: center;
}

.reminder-list {
  display: flex;
  flex-direction: column;
  gap: var(--elder-space-md);
}
.reminder-item {
  background: var(--elder-bg-card);
  border: 3px solid var(--elder-border-dark);
  border-radius: var(--elder-radius-lg);
  padding: var(--elder-space-md);
}
.item-time {
  font-size: var(--elder-fs-2xl);
  font-weight: 700;
  color: var(--elder-primary);
  margin-bottom: var(--elder-space-xs);
}
.item-medicine {
  font-size: var(--elder-fs-3xl);
  font-weight: 700;
  margin-bottom: var(--elder-space-sm);
}
.item-meta {
  display: flex;
  align-items: center;
  gap: var(--elder-space-sm);
}
.repeat-badge {
  font-size: var(--elder-fs-base);
  background: var(--elder-border);
  padding: 6px 18px;
  border-radius: 30px;
  font-weight: 600;
}
.status-badge {
  font-size: var(--elder-fs-large);
  font-weight: 700;
  padding: 6px 24px;
  border-radius: 30px;
  border: 2px solid;
}
.status-badge.taken {
  background: var(--elder-success-bg);
  border-color: #2c6b4b;
  color: #1f4a36;
}
.status-badge.failure {
  background: var(--elder-error-bg);
  border-color: #b85c5c;
  color: #a83a3a;
}
.status-badge:not(.taken):not(.failure) {
  background: var(--elder-warning-bg);
  border-color: #b87c2c;
  color: #7a521e;
}

.push-btn, .voice-btn {
  width: 100%;
  margin-top: var(--elder-space-lg);
}
.empty {
  text-align: center;
  font-size: var(--elder-fs-xl);
  padding: var(--elder-space-xl);
  color: var(--elder-text-muted);
}
</style>
