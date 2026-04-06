<template>
  <div class="forgot-container">
    <h1>找回密码</h1>
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>注册邮箱</label>
        <input type="email" v-model="email" required placeholder="请输入您的注册邮箱" />
      </div>
      <button type="submit" :disabled="loading">{{ loading ? '发送中...' : '发送重置链接' }}</button>
      <p class="link"><router-link to="/elder/login">返回登录</router-link></p>
      <p v-if="message" class="message">{{ message }}</p>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import api from '@/api'

const email = ref('')
const loading = ref(false)
const message = ref('')

const handleSubmit = async () => {
  if (!email.value) return
  loading.value = true
  message.value = ''
  try {
    const res = await api.post('/auth/forgot-password', { email: email.value })
    // message.value = res.data.msg
    message.value = res.msg
  } catch (error) {
    message.value = error.response?.data?.msg || '如果该邮箱已注册，我们将发送重置链接'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.forgot-container {
  max-width: 400px;
  margin: 2rem auto;
  padding: 1rem;
}
h1 {
  font-size: 2rem;
  text-align: center;
}
.form-group {
  margin-bottom: 1.5rem;
}
label {
  font-size: 1.4rem;
  display: block;
}
input {
  width: 100%;
  padding: 0.8rem;
  font-size: 1.4rem;
}
button {
  width: 100%;
  padding: 1rem;
  font-size: 1.6rem;
  background-color: #2196f3;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
}
.message {
  margin-top: 1rem;
  text-align: center;
  font-size: 1.4rem;
  color: #4caf50;
}
.link {
  text-align: center;
  margin-top: 1rem;
}
</style>