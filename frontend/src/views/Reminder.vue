<!-- Reminder.vue -->
<template>
  <div class="reminder-container">
    <h1 class="page-title">💊 吃药提醒</h1>
    <div v-if="reminders.length === 0" class="empty">今日暂无提醒</div>
    <ul class="reminder-list">
    <!-- 显示今天的吃药细则 -->
      <li v-for="item in reminders" :key="item.id" class="reminder-item">
        <span class="time">{{ item.time }}</span>
        <span class="medicine">{{ item.medicine }}</span>
        <span class="status" :class="{ taken: item.taken }">
          {{ item.taken ? '已吃' : '待提醒' }}
        </span>
      </li>
    </ul>
    <button v-if="!pushSubscribed" @click="enablePush" class="push-btn">
      开启推送提醒
    </button>
  </div>
</template>


<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'
import { usePush } from '@/composables/usePush'

const reminders = ref([])
const { isSubscribed, subscribeUser } = usePush()
const pushSubscribed = ref(false)

// 获取今日提醒
const fetchReminders = async () => {
  try {
    const res = await api.get('/reminders/today')   //去后端拿今天的吃药列表,显示在页面上
    reminders.value = res // 假设返回数组
  } catch (error) {
    console.error('获取提醒失败', error)
  }
}

// 开启推送
const enablePush = async () => {
  // console.log('按钮被点击11')
  await subscribeUser()   // 1. 去注册推送权限
  pushSubscribed.value = true  // 2. 标记：已开启推送
  // console.log('按钮被点击22')
}

onMounted(() => {
  fetchReminders()  // ① 先调用：获取今天的吃药提醒
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
</style>