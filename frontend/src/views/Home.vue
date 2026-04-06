<template>
  <div class="home">
    <button class="logout-btn" @click="handleLogout">🚪 退出登录</button>
        <!-- 跳转管理端按钮（右上角） -->
    <button class="admin-redirect-btn" @click="handleGoAdmin">🔧 跳转管理端</button>
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
  // 提示用户
  alert('您已安全退出登录')
  // 跳转到老人登录页
  router.push('/elder/login')
}

// 跳转管理端逻辑
const handleGoAdmin = () => {
    // 1. 清除老人端本地存储的用户信息（自动执行退出登录）
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  
  // 2. 提示用户（可选，增强体验）
  alert('已退出老人端，正在跳转管理端登录页...')
  
  // 3. 跳转到管理端登录页
  router.push('/admin/login')
}
</script>

<style scoped>
.home {
  position: relative; /* 让退出按钮可以绝对定位在角落 */
  padding: 1rem;
  min-height: 100vh; /* 设置最小高度为视口高度 */
}
/* 退出登录按钮（左下角） */
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

/* 新增跳转管理端按钮（右上角） */
.admin-redirect-btn {
  position: fixed;
  top: 1rem;
  right: 1rem;
  background-color: #2196f3;   /* 蓝色主题，与退出按钮风格一致但颜色不同 */
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
</style>