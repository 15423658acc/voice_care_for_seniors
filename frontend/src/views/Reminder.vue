<template>
  <div class="reminder-container">
    <h1 class="page-title">💊 吃药提醒</h1>

    <!-- 语音激活按钮（未激活时显示） -->
    <button v-if="!speechEnabled" @click="enableSpeech" class="voice-activate-btn">
      🔊 开启语音播报
    </button>

    <!-- 提醒列表 -->
    <div v-if="reminders.length === 0" class="empty">今日暂无提醒</div>
    <ul class="reminder-list">
      <li v-for="item in reminders" :key="item.id" class="reminder-item">
        <span class="time">{{ formatTime(item) }}</span>
        <span class="medicine">{{ item.medicine }}</span>
        <span class="status" :class="{ taken: item.taken }">
          {{ item.taken ? '已吃' : '待提醒' }}
        </span>
      </li>
    </ul>

    <!-- 推送订阅按钮 -->
    <button v-if="!pushSubscribed" @click="enablePush" class="push-btn">
      开启推送提醒
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

// ========== ✅ 修复：语音播报（支持循环 N 次）==========
const speak = (text, repeatCount = 3) => {
  if (!speechEnabled.value) {
    console.warn('语音未激活，无法播报')
    return
  }

  // 先停止之前的播报，防止重叠
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
  // ✅ 这里播报 3 次（你可以改成 5 / 10 / Infinity 无限循环）
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
.reminder-container {
  padding: 1rem;
}
.page-title {
  font-size: 2rem;
  text-align: center;
  margin-bottom: 2rem;
}
.voice-activate-btn {
  background-color: #ff9800;
  color: white;
  font-size: 1.4rem;
  padding: 0.8rem 1.5rem;
  border: none;
  border-radius: 2rem;
  margin-bottom: 1rem;
  cursor: pointer;
  display: block;
  margin-left: auto;
  margin-right: auto;
}
.reminder-list {
  list-style: none;
  padding: 0;
}
.reminder-item {
  font-size: 1.6rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #ccc;
}
.time {
  font-weight: bold;
  color: #333;
}
.medicine {
  flex: 1;
  margin-left: 1rem;
}
.status {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  background-color: #f0f0f0;
}
.status.taken {
  background-color: #4caf50;
  color: white;
}
.push-btn {
  background-color: #2196f3;
  color: white;
  font-size: 1.6rem;
  padding: 1.5rem;
  border: none;
  border-radius: 1rem;
  width: 100%;
  margin-top: 2rem;
  cursor: pointer;
}
.empty {
  text-align: center;
  font-size: 1.6rem;
  color: #666;
  padding: 2rem;
}
</style>