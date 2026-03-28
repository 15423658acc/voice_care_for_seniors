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
        <span class="time">{{ item.time }}</span>
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
const speechEnabled = ref(false)   // 语音是否已激活

// ========== 数据获取 ==========
const fetchReminders = async () => {
  try {
    // 注意：这里路径改为 /reminders/today（假设 api 实例 baseURL 已包含 /api）
    const res = await api.get('/reminders/today')
    reminders.value = res
  } catch (error) {
    console.error('获取提醒失败', error)
  }
}

// ========== 推送订阅 ==========
const enablePush = async () => {
  await subscribeUser()
  pushSubscribed.value = true
  // 订阅成功后立即刷新列表
  await fetchReminders()
}

// ========== 语音播报 ==========
const speak = (text) => {
  if (!speechEnabled.value) {
    console.warn('语音未激活，无法播报')
    return
  }
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.9
    utterance.pitch = 1.0
    utterance.volume = 1
    window.speechSynthesis.speak(utterance)
  } else {
    console.warn('不支持语音合成')
  }
}

// 激活语音权限（需要用户手势）
const enableSpeech = () => {
  // 播放一段空语音，激活浏览器权限
  const utterance = new SpeechSynthesisUtterance(' ')
  utterance.volume = 0
  window.speechSynthesis.speak(utterance)
  speechEnabled.value = true
  console.log('语音权限已激活')
}

// ========== 处理推送消息 ==========
const handleReminderArrived = (event) => {
  const { body } = event.detail
  speak(`提醒：${body}`)    // 播报语音
  fetchReminders()          // 刷新列表
}

// ========== 生命周期 ==========
onMounted(() => {
  fetchReminders()
  // 监听来自 main.js 的推送消息事件
  window.addEventListener('reminder-arrived', handleReminderArrived)
})

onUnmounted(() => {
  window.removeEventListener('reminder-arrived', handleReminderArrived)
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