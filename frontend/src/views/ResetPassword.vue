<template>
  <div class="reset-container">
    <h1>设置新密码</h1>
    <form @submit.prevent="handleReset">
      <div class="form-group">
        <label>新密码</label>
        <input type="password" v-model="newPassword" @input="validatePassword" required />
        <span class="error" v-if="passwordError">{{ passwordError }}</span>
        <small>密码至少8位，包含大写、小写和数字</small>
      </div>
      <div class="form-group">
        <label>确认新密码</label>
        <input type="password" v-model="confirmPassword" @input="validateConfirm" required />
        <span class="error" v-if="confirmError">{{ confirmError }}</span>
      </div>
      <button type="submit" :disabled="loading || !isValid">重置密码</button>
      <p v-if="message" :class="['message', isError ? 'error' : 'success']">{{ message }}</p>
    </form>
    <p class="link"><router-link to="/elder/login">返回登录</router-link></p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api'

const route = useRoute()
const router = useRouter()

const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const message = ref('')
const isError = ref(false)
const passwordError = ref('')
const confirmError = ref('')

// 从 URL 获取 token 和 userId
const token = ref('')
const userId = ref(null)

onMounted(() => {
  token.value = route.query.token
  userId.value = route.query.id
  if (!token.value || !userId.value) {
    message.value = '无效的重置链接，请重新发起找回密码'
    isError.value = true
  }
})

const validatePassword = () => {
  const pwd = newPassword.value
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
  if (!pwd) {
    passwordError.value = '密码不能为空'
  } else if (!regex.test(pwd)) {
    passwordError.value = '密码必须至少8位，包含大写字母、小写字母和数字'
  } else {
    passwordError.value = ''
  }
  if (confirmPassword.value) validateConfirm()
}

const validateConfirm = () => {
  if (confirmPassword.value !== newPassword.value) {
    confirmError.value = '两次输入的密码不一致'
  } else {
    confirmError.value = ''
  }
}

const isValid = computed(() => {
  return newPassword.value && confirmPassword.value && !passwordError.value && !confirmError.value && token.value && userId.value
})

const handleReset = async () => {
  if (!isValid.value) return
  loading.value = true
  message.value = ''
  try {
    const res = await api.post('/auth/reset-password', {
      token: token.value,
      userId: userId.value,
      newPassword: newPassword.value
    })
    // message.value = res.data.msg
    message.value = res.msg
    isError.value = false
    // 3秒后跳转到登录页
    setTimeout(() => {
      router.push('/elder/login')
    }, 3000)
  } catch (error) {
    message.value = error.response?.data?.msg || '重置完成，请重新登陆'
    isError.value = true
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.reset-container {
  max-width: 400px;
  margin: 2rem auto;
  padding: 1rem;
}
h1 {
  font-size: 2rem;
  text-align: center;
}
.form-group {
  margin-bottom: 1.2rem;
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
.error {
  color: #f44336;
  font-size: 1.2rem;
}
small {
  font-size: 1.2rem;
  color: #666;
}
button {
  width: 100%;
  padding: 1rem;
  font-size: 1.6rem;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
}
.message {
  margin-top: 1rem;
  text-align: center;
  font-size: 1.4rem;
}
.success {
  color: #4caf50;
}
.error {
  color: #f44336;
}
.link {
  text-align: center;
  margin-top: 1rem;
}
</style>