<template>
  <div class="home">
    <button class="logout-btn" @click="handleLogout">🚪 退出登录</button>
    <h1 class="welcome">老友助手</h1>
    <div class="grid">
      <router-link to="/emergency" class="card emergency">🚨 紧急呼叫</router-link>
      <router-link to="/reminder" class="card reminder">💊 吃药提醒</router-link>
      <router-link to="/antifraud" class="card fraud">🛡️ 防诈骗</router-link>
      <router-link to="/weather" class="card weather">☀️ 天气</router-link>
      <router-link to="/voiceAssistant" class="card voice">🎤 语音助手</router-link>
      <router-link to="/healthRecords" class="card health">Health Records</router-link>
      
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const handleLogout = () => {
  // 清除本地存储的 token 和用户信息
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  // 可选：清除其他敏感数据，如推送订阅等（暂不涉及）
  // 提示用户
  alert('您已安全退出登录')
  // 跳转到老人登录页
  router.push('/elder/login')
}
</script>

<style scoped>
.home {
  position: relative; /* 让退出按钮可以绝对定位在角落 */
  padding: 1rem;
  min-height: 100vh; /* 设置最小高度为视口高度 */
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
.welcome {
  font-size: 2.5rem;
  text-align: center;
  margin-bottom: 2rem;
}
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}
.card {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f0f0;
  padding: 2rem;
  font-size: 1.8rem;
  text-decoration: none;
  color: #333;
  border-radius: 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  min-height: 150px;
}
.emergency { background-color: #ffebee; color: #c62828; }
.reminder { background-color: #e8f5e8; color: #2e7d32; }
.voice { background-color: #fff3e0; color: #ef6c00; }
.fraud { background-color: #ede7f6; color: #512da8; }
.weather { background-color: #e1f5fe; color: #0277bd; }
</style>