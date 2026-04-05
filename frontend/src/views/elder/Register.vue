<template>
  <div class="register-container">
    <h1 class="title">老友助手 · 老人注册</h1>
    <form @submit.prevent="handleRegister" class="register-form">
      <div class="form-group">
        <label>用户名 *</label>
        <input v-model="form.username" required />
      </div>
      <div class="form-group">
        <label>密码 *</label>
        <input type="password" v-model="form.password" required />
      </div>
      <div class="form-group">
        <label>真实姓名</label>
        <input v-model="form.fullName" />
      </div>
      <div class="form-group">
        <label>联系电话</label>
        <input v-model="form.phone" />
      </div>
      <div class="form-group">
        <label>年龄</label>
        <input type="number" v-model="form.age" />
      </div>
      <div class="form-group">
        <label>子女账号（用户名）*</label>
        <input v-model="form.childUsername" required placeholder="请输入您子女的老友助手账号" />
        <small>请向您的子女索要用户名，注册后将自动绑定</small>
      </div>
      <button type="submit" :disabled="loading">注册</button>
      <p class="link">已有账号？<router-link to="/elder/login">去登录</router-link></p>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api'

const router = useRouter()
const form = ref({
  username: '',
  password: '',
  fullName: '',
  phone: '',
  age: '',
  childUsername: ''
})
const loading = ref(false)

const handleRegister = async () => {
  loading.value = true
  try {
    const res = await api.post('/auth/elder/register', form.value)
    // const { token, user } = res.data
    const { token, user } = res
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    alert('注册成功，已自动登录')
    router.push('/')
  } catch (error) {
    alert(error.response?.data?.msg || '注册失败，请检查子女账号是否正确')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* 与登录页类似，略 */
</style>