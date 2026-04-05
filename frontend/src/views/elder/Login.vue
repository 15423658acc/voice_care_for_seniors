<template>
  <div class="login-container">
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
</style>