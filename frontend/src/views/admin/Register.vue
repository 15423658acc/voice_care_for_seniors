<!-- src/views/admin/Register.vue -->
<template>
  <div class="register-container">
    <h1 class="title">子女账号注册</h1>
    <form @submit.prevent="handleRegister" class="register-form">
      <!-- 用户名 -->
      <div class="form-group">
        <label>用户名 *</label>
        <input
          v-model="form.username"
          @blur="validateUsername"
          type="text"
          placeholder="请输入用户名"
          autocomplete="off"
        />
        <span class="error" v-if="errors.username">{{ errors.username }}</span>
      </div>

      <!-- 密码 -->
      <div class="form-group">
        <label>密码 *</label>
        <input
          type="password"
          v-model="form.password"
          @input="validatePassword"
          placeholder="请输入密码"
        />
        <span class="error" v-if="errors.password">{{ errors.password }}</span>
        <small>密码至少8位，包含大写字母、小写字母和数字</small>
      </div>

      <!-- 确认密码 -->
      <div class="form-group">
        <label>确认密码 *</label>
        <input
          type="password"
          v-model="form.confirmPassword"
          @input="validateConfirm"
          placeholder="请再次输入密码"
        />
        <span class="error" v-if="errors.confirmPassword">{{ errors.confirmPassword }}</span>
      </div>

      <!-- 邮箱（可选） -->
      <div class="form-group">
        <label>邮箱（可选）</label>
        <input
          v-model="form.email"
          @blur="validateEmail"
          type="email"
          placeholder="请输入邮箱"
        />
        <span class="error" v-if="errors.email">{{ errors.email }}</span>
      </div>

      <!-- 协议勾选 -->
      <div class="form-group checkbox">
        <label>
          <input type="checkbox" v-model="form.agreeTerms" />
          我已阅读并同意 <a href="#" @click.prevent="showAgreement">《用户协议》</a> 和
          <a href="#" @click.prevent="showPrivacy">《隐私政策》</a>
        </label>
        <span class="error" v-if="errors.agreeTerms">{{ errors.agreeTerms }}</span>
      </div>

      <button type="submit" :disabled="loading || !isFormValid" class="register-btn">
        {{ loading ? '注册中...' : '注册' }}
      </button>
      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
      <p class="login-link">
        已有账号？<router-link to="/admin/login">去登录</router-link>
      </p>
    </form>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api'

const router = useRouter()

// 表单数据
const form = ref({
  username: '',
  password: '',
  confirmPassword: '',
  email: '',
  agreeTerms: false
})

// 错误信息存储
const errors = ref({
  username: '',
  password: '',
  confirmPassword: '',
  email: '',
  agreeTerms: ''
})

const loading = ref(false)
const errorMsg = ref('')

// 实时校验函数
const validateUsername = () => {
  if (!form.value.username.trim()) {
    errors.value.username = '用户名不能为空'
  } else {
    errors.value.username = ''
  }
}

const validatePassword = () => {
  const pwd = form.value.password
  // 密码强度：至少8位，包含大写字母、小写字母和数字
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
  if (!pwd) {
    errors.value.password = '密码不能为空'
  } else if (!regex.test(pwd)) {
    errors.value.password = '密码至少8位，包含大写、小写和数字'
  } else {
    errors.value.password = ''
  }
  // 如果确认密码已填写，则同步校验确认密码一致性
  if (form.value.confirmPassword) {
    validateConfirm()
  }
}

const validateConfirm = () => {
  if (form.value.confirmPassword !== form.value.password) {
    errors.value.confirmPassword = '两次输入的密码不一致'
  } else {
    errors.value.confirmPassword = ''
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

// 表单整体有效性
const isFormValid = computed(() => {
  return (
    form.value.username.trim() &&
    form.value.password &&
    form.value.confirmPassword &&
    form.value.agreeTerms &&
    !errors.value.username &&
    !errors.value.password &&
    !errors.value.confirmPassword &&
    !errors.value.email
  )
})

// 提交处理
const handleRegister = async () => {
  // 1. 手动触发所有字段校验（确保最新状态）
  validateUsername()
  validatePassword()
  validateConfirm()
  validateEmail()

  // 2. 单独校验协议勾选
  if (!form.value.agreeTerms) {
    errors.value.agreeTerms = '请勾选用户协议和隐私政策'
    return
  } else {
    errors.value.agreeTerms = ''
  }

  // 3. 整体有效性判断
  if (!isFormValid.value) return

  loading.value = true
  errorMsg.value = ''

  try {
    // 调用后端注册接口（与原有接口保持一致）
    const res = await api.post('/auth/register', {
      username: form.value.username.trim(),
      password: form.value.password,
      confirmPassword: form.value.confirmPassword,
      email: form.value.email.trim() || null,
      agreeTerms: form.value.agreeTerms   // 显式传递 agreeTerms 字段
    })

    // 兼容不同的响应结构（优先取 res.data，若无则取 res）
    // const { token, user } = res.data
    const { token, user } = res

    // 存储登录信息
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))

    // 注册成功，跳转到子女端联系人页面
    router.push('/admin/contacts')
  } catch (err) {
    console.error('注册失败', err)
    errorMsg.value = err.response?.data?.msg || '注册失败，请重试'
  } finally {
    loading.value = false
  }
}

// 辅助弹窗
const showAgreement = () => {
  window.open('/public/user_agreement.html','_blank', 'width=800,height=600')
}
const showPrivacy = () => {
  window.open('/public/privacy_policy.html', '_blank', 'width=800,height=600')
}
</script>

<style scoped>
.register-container {
  max-width: 500px;
  margin: 50px auto;
  padding: 2rem;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}
.title {
  text-align: center;
  font-size: 2rem;
  margin-bottom: 2rem;
}
.form-group {
  margin-bottom: 1.5rem;
}
.form-group label {
  display: block;
  font-size: 1.4rem;
  margin-bottom: 0.5rem;
}
.form-group input {
  width: 100%;
  padding: 1rem;
  font-size: 1.4rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.checkbox label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.4rem;
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
  display: block;
  margin-top: 0.2rem;
}
.register-btn {
  width: 100%;
  padding: 1.2rem;
  font-size: 1.6rem;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.register-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
.error-msg {
  color: #f44336;
  margin-top: 1rem;
  text-align: center;
}
.login-link {
  text-align: center;
  margin-top: 1.5rem;
  font-size: 1.4rem;
}
.login-link a {
  color: #2196f3;
  text-decoration: none;
}
</style>