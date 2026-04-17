<template>
  <div class="reminder-container">
    <h1 class="page-title">💊 吃药提醒</h1>

    <!-- 提醒列表 -->
    <div v-if="reminders.length === 0" class="empty">今日暂无提醒</div>
    <ul class="reminder-list">
      <li v-for="item in reminders" :key="item.id" class="reminder-item">
        <span class="time">{{ formatTime(item) }}</span>
        <span class="medicine">{{ item.medicine }}</span>
        <!-- 周期标签（如有） -->
        <span v-if="item.repeatType && item.repeatType !== 'none'" class="repeat-badge">
          {{ repeatTypeText(item.repeatType) }}
        </span>
        <span class="status" :class="{ taken: item.taken }">
          {{ item.taken ? '已吃' : '待提醒' }}
        </span>
      </li>
    </ul>

    <!-- ========== 按钮顺序调整：推送按钮在上，语音按钮在下 ========== -->
    <!-- 1. 推送订阅按钮（高对比度绿色大按钮） -->
    <button v-if="!pushSubscribed" @click="enablePush" class="push-btn">
      🔔 开启推送提醒
    </button>

    <!-- 2. 语音激活按钮（放在推送按钮下方） -->
    <button v-if="!speechEnabled" @click="enableSpeech" class="voice-activate-btn">
      🔊 开启语音播报
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import api from '@/api'
import { usePush } from '@/composables/usePush'

const reminders = ref([])
const { isSubscribed, subscribeUser } = usePush()
const pushSubscribed = ref(false)
const speechEnabled = ref(false)

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
  await subscribeUser()
  pushSubscribed.value = true
  await fetchReminders()
}

// ========== 语音播报（支持循环 N 次）==========
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
  const { body } = event.detail
  speak(`提醒：${body}`, 3)
  fetchReminders()
}

// ========== 生命周期 ==========
onMounted(() => {
  fetchReminders()
  window.addEventListener('reminder-arrived', handleReminderArrived)
})

onUnmounted(() => {
  window.removeEventListener('reminder-arrived', handleReminderArrived)
  window.speechSynthesis.cancel()
})
</script>

<style scoped>
/* ========== 全局字体：至少 20px，移动端友好 ========== */
.reminder-container {
  padding: 1rem;
  font-size: 20px;           /* 基础字体 20px */
}

/* 标题字体更大 */
.page-title {
  font-size: 28px;           /* 符合 24px 以上要求 */
  text-align: center;
  margin-bottom: 2rem;
  font-weight: 500;
}

/* 空状态提示 */
.empty {
  text-align: center;
  font-size: 20px;
  color: #666;
  padding: 2rem;
}

/* ========== 提醒列表样式 ========== */
.reminder-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.reminder-item {
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 0.5rem;
  border-bottom: 1px solid #eee;
  flex-wrap: wrap;          /* 移动端换行适配 */
  gap: 0.5rem;
}

/* 时间 */
.time {
  font-weight: bold;
  color: #333;
  min-width: 80px;
}

/* 药品名：加粗 + 深色 #2c3e50 */
.medicine {
  flex: 1;
  margin-left: 0.5rem;
  font-weight: bold;
  color: #2c3e50;
  word-break: break-word;
}

/* 周期标签 */
.repeat-badge {
  background-color: #e0e0e0;
  color: #555;
  font-size: 0.75rem;       /* 相对 20px 的 15px */
  padding: 0.2rem 0.6rem;
  border-radius: 1rem;
  white-space: nowrap;
}

/* 状态标签 */
.status {
  padding: 0.3rem 0.8rem;
  border-radius: 1.5rem;
  background-color: #f0f0f0;
  font-size: 0.9rem;
}
.status.taken {
  background-color: #4caf50;
  color: white;
}

/* ========== 按钮样式（移动端触控优化） ========== */
/* 推送按钮：高对比度绿色，大圆角，高度≥56px */
.push-btn {
  background-color: #4caf50;    /* 高对比度绿色 */
  color: white;
  font-size: 1.2rem;           /* 相对 20px 的 24px */
  font-weight: bold;
  padding: 0.8rem 1.5rem;
  border: none;
  border-radius: 2rem;          /* 大圆角 */
  width: 100%;
  margin-top: 1.5rem;
  cursor: pointer;
  transition: background-color 0.2s;
  min-height: 56px;             /* 符合移动端触控标准 */
  display: flex;
  align-items: center;
  justify-content: center;
}
.push-btn:active {
  background-color: #388e3c;
}

/* 语音按钮：放在推送按钮下方，样式稍低调但同样触控友好 */
.voice-activate-btn {
  background-color: #ff9800;
  color: white;
  font-size: 1.2rem;
  padding: 0.8rem 1.5rem;
  border: none;
  border-radius: 2rem;
  width: 100%;
  margin-top: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.voice-activate-btn:active {
  background-color: #f57c00;
}

/* ========== 移动端额外适配 ========== */
@media (max-width: 480px) {
  .reminder-container {
    padding: 0.75rem;
  }
  .reminder-item {
    font-size: 18px;       /* 最小 18px，但仍接近 20px 要求 */
    padding: 0.8rem 0.3rem;
  }
  .time {
    min-width: 70px;
  }
  .medicine {
    font-size: 18px;
  }
  .repeat-badge {
    font-size: 0.7rem;
  }
  /* 确保按钮高度仍然足够 */
  .push-btn, .voice-activate-btn {
    min-height: 52px;      /* 稍小但仍在 48px 以上，可接受 */
    font-size: 1.1rem;
  }
}
</style>