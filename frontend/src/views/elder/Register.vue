<template>
  <div class="register-container">
    <h1 class="title">老友助手 · 老人注册</h1>
    <form @submit.prevent="handleRegister" class="register-form">
      <!-- 用户名 -->
      <div class="form-group">
        <label>用户名 *</label>
        <input v-model="form.username" @blur="validateUsername" />
        <span class="error" v-if="errors.username">{{ errors.username }}</span>
      </div>

      <!-- 密码 -->
      <div class="form-group">
        <label>密码 *</label>
        <input type="password" v-model="form.password" @input="validatePassword" />
        <span class="error" v-if="errors.password">{{ errors.password }}</span>
        <small>密码至少8位，包含大写字母、小写字母和数字</small>
      </div>

      <!-- 确认密码（可选，为了用户体验） -->
      <div class="form-group">
        <label>确认密码 *</label>
        <input type="password" v-model="form.confirmPassword" @input="validateConfirm" />
        <span class="error" v-if="errors.confirmPassword">{{ errors.confirmPassword }}</span>
      </div>

      <!-- 真实姓名 -->
      <div class="form-group">
        <label>真实姓名</label>
        <input v-model="form.fullName" />
      </div>

      <!-- 手机号 -->
      <div class="form-group">
        <label>手机号</label>
        <input v-model="form.phone" @blur="validatePhone" />
        <span class="error" v-if="errors.phone">{{ errors.phone }}</span>
      </div>

      <!-- 邮箱 -->
      <div class="form-group">
        <label>邮箱</label>
        <input v-model="form.email" @blur="validateEmail" />
        <span class="error" v-if="errors.email">{{ errors.email }}</span>
      </div>

      <!-- 年龄 -->
      <div class="form-group">
        <label>年龄</label>
        <input type="number" v-model="form.age" />
      </div>

      <!-- 子女账号 -->
      <div class="form-group">
        <label>子女账号（用户名）*</label>
        <input v-model="form.childUsername" required />
      </div>

      <!-- 协议勾选 -->
      <div class="form-group checkbox">
        <label>
          <input type="checkbox" v-model="form.agreeTerms" />
          我已阅读并同意 <a href="#" @click.prevent="showAgreement">《用户协议》</a> 和 <a href="#" @click.prevent="showPrivacy">《隐私政策》</a>
        </label>
        <span class="error" v-if="errors.agreeTerms">{{ errors.agreeTerms }}</span>
      </div>

      <button type="submit" :disabled="loading || !isFormValid">注册</button>
      <p class="link">已有账号？<router-link to="/elder/login">去登录</router-link></p>
    </form>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api'

const router = useRouter()
const form = ref({
  username: '',
  password: '',
  confirmPassword: '',
  fullName: '',
  phone: '',
  email: '',
  age: '',
  childUsername: '',
  agreeTerms: false
})

const errors = ref({
  username: '',
  password: '',
  confirmPassword: '',
  phone: '',
  email: '',
  agreeTerms: ''
})

const loading = ref(false)

// 验证函数
const validateUsername = () => {
  if (!form.value.username) {
    errors.value.username = '用户名不能为空'
  } else {
    errors.value.username = ''
  }
}

const validatePassword = () => {
  const pwd = form.value.password
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
  if (!pwd) {
    errors.value.password = '密码不能为空'
  } else if (!regex.test(pwd)) {
    errors.value.password = '密码至少8位，包含大写、小写和数字'
  } else {
    errors.value.password = ''
  }
  // 密码改变时重新校验确认密码
  if (form.value.confirmPassword) validateConfirm()
}

const validateConfirm = () => {
  if (form.value.confirmPassword !== form.value.password) {
    errors.value.confirmPassword = '两次输入的密码不一致'
  } else {
    errors.value.confirmPassword = ''
  }
}

const validatePhone = () => {
  const phone = form.value.phone
  if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
    errors.value.phone = '手机号必须为11位数字，以1开头'
  } else {
    errors.value.phone = ''
  }
}

const validateEmail = () => {
  const email = form.value.email
  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    errors.value.email = '邮箱格式不正确，例如 name@example.com'
  } else {
    errors.value.email = ''
  }
}

// 计算表单整体是否有效
const isFormValid = computed(() => {
  return form.value.username &&
         form.value.password &&
         form.value.confirmPassword &&
         form.value.childUsername &&
         form.value.agreeTerms &&
         !errors.value.username &&
         !errors.value.password &&
         !errors.value.confirmPassword &&
         !errors.value.phone &&
         !errors.value.email
})

const handleRegister = async () => {
  // 手动触发所有校验
  validateUsername()
  validatePassword()
  validateConfirm()
  validatePhone()
  validateEmail()
  if (!form.value.agreeTerms) {
    errors.value.agreeTerms = '请勾选用户协议和隐私政策'
    return
  } else {
    errors.value.agreeTerms = ''
  }
  if (!isFormValid.value) return

  loading.value = true
  try {
    const res = await api.post('/auth/elder/register', {
      ...form.value,
      age: form.value.age ? Number(form.value.age) : undefined
    })
    // const { token, user } = res.data
    const { token, user } = res
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    alert('注册成功，已自动登录')
    router.push('/')
  } catch (error) {
    alert(error.response?.data?.msg || '注册失败')
  } finally {
    loading.value = false
  }
}

// const showAgreement = () => alert('这里是用户协议内容')
const showAgreement = () => {
  window.open('/public/user_agreement.html','_blank', 'width=800,height=600')
}
// const showPrivacy = () => alert('这里是隐私政策内容')
const showPrivacy = () => {
  window.open('/public/privacy_policy.html', '_blank', 'width=800,height=600')
}
</script>

<style scoped>
/* 保持适老化大字体 */
.register-container {
  max-width: 500px;
  margin: 0 auto;
  padding: 1rem;
}
.title {
  font-size: 2rem;
  text-align: center;
}
.form-group {
  margin-bottom: 1.2rem;
}
.form-group label {
  display: block;
  font-size: 1.4rem;
  margin-bottom: 0.3rem;
}
.form-group input, .form-group select {
  width: 100%;
  padding: 0.8rem;
  font-size: 1.4rem;
  border: 1px solid #ccc;
  border-radius: 0.5rem;
}
.checkbox label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.checkbox input {
  width: auto;
}
.error {
  color: #f44336;
  font-size: 1.2rem;
  margin-top: 0.2rem;
  display: block;
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
button:disabled {
  background-color: #ccc;
}
.link {
  text-align: center;
  margin-top: 1rem;
  font-size: 1.4rem;
}
</style>