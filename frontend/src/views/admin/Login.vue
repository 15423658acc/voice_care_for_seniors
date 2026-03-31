<template>
  <div class="login-container">
    <h1 class="title">子女后台登录</h1>
    <form @submit.prevent="handleLogin" class="login-form">
      <div class="form-group">
        <label for="username">用户名</label>
        <input
          id="username"
          v-model="form.username"
          type="text"
          required
          placeholder="请输入用户名"
        />
      </div>
      <div class="form-group">
        <label for="password">密码</label>
        <input
          id="password"
          v-model="form.password"
          type="password"
          required
          placeholder="请输入密码"
        />
      </div>
      <button type="submit" :disabled="loading" class="login-btn">
        {{ loading ? '登录中...' : '登录' }}
      </button>
      <p v-if="error" class="error">{{ error }}</p>
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
const error = ref('')

const handleLogin = async () => {
  if (!form.value.username || !form.value.password) {
    error.value = '请输入用户名和密码'
    return
  }
  loading.value = true
  error.value = ''
  try {
    const res = await api.post('/auth/login', form.value)
    // 假设返回格式：{ code:200, data: { token, user } }
    const { token, user } = res
    // 保存 token 和用户信息
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    // 跳转到后台首页
    router.push('/admin/dashboard')
  } catch (err) {
    console.error(err)
    error.value = err.response?.data?.msg || '登录失败，请检查网络'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  max-width: 400px;
  margin: 50px auto;
  padding: 2rem;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}
.title {
  text-align: center;
  font-size: 2rem;
  margin-bottom: 2rem;
}
.form-group {
  margin-bottom: 1.5rem;
}
label {
  display: block;
  font-size: 1.4rem;
  margin-bottom: 0.5rem;
}
input {
  width: 100%;
  padding: 1rem;
  font-size: 1.4rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.login-btn {
  width: 100%;
  padding: 1.2rem;
  font-size: 1.6rem;
  background-color: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.login-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
.error {
  color: red;
  margin-top: 1rem;
  text-align: center;
}
</style>