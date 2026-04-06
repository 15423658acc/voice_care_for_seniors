<template>
  <div class="login-container">
    <button class="logout-btn" @click="handleJumpAdmin">🚪 子女端</button>
    <h1 class="title">老友助手 · 老人登录</h1>
    <form @submit.prevent="handleLogin" class="login-form">
      <div class="form-group">
        <label>用户名</label>
        <input type="text" v-model="form.username" required placeholder="请输入用户名" />
      </div>
      <div class="form-group">
        <label>密码</label>
        <input type="password" v-model="form.password" required placeholder="请输入密码" />
      </div>
      <button type="submit" :disabled="loading">登录</button>
      <p class="link">还没有账号？<router-link to="/elder/register">立即注册</router-link></p>
      <p class="forgot-password"><router-link to="/forgot-password">忘记密码？</router-link></p>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api'

const router = useRouter()
const form = ref({ username: '', password: '' })
const loading = ref(false)

// 跳转管理端逻辑
const handleJumpAdmin = () => {
  router.push('/admin/login')
}

const handleLogin = async () => {
  loading.value = true
  try {
    const res = await api.post('/auth/elder/login', form.value)
    const { token, user } = res
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    // 跳转到老人端主页
    router.push('/')
  } catch (error) {
    alert(error.response?.data?.msg || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* 样式可参考子女登录页，大字体、大间距，适老化 */
.login-container {
  max-width: 400px;
  margin: 0 auto;
  padding: 2rem;
  position: relative; /* 让跳转按钮可以绝对定位在角落 */
}
.title {
  font-size: 2rem;
  text-align: center;
  margin-bottom: 2rem;
}
.login-form .form-group {
  margin-bottom: 1.5rem;
}
.login-form label {
  display: block;
  font-size: 1.4rem;
  margin-bottom: 0.5rem;
}
.login-form input {
  width: 100%;
  padding: 1rem;
  font-size: 1.4rem;
  border: 1px solid #ccc;
  border-radius: 0.5rem;
}
.login-form button {
  width: 100%;
  padding: 1rem;
  font-size: 1.6rem;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
}
.link {
  text-align: center;
  margin-top: 1rem;
  font-size: 1.4rem;
}
.forgot-password {
  text-align: center;
  margin-top: 1rem;
}
.forgot-password a {
  color: #2196f3;
  text-decoration: none;
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