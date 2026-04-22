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
        <label>邮箱(可选)</label>
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
      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input type="checkbox" v-model="form.agreeTerms" />
          <span>我已阅读并同意 <a href="#" @click.prevent="showAgreement">《用户协议》</a> 和 <a href="#" @click.prevent="showPrivacy">《隐私政策》</a></span>
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
/* ==================== 老人端注册页 · 适老化专业设计 ==================== */

.register-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 32px 24px;
  background-color: #f7f6f2;      /* 柔和米白背景 */
  min-height: 100vh;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}

.title {
  font-size: 36px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 32px;
  color: #1a232b;
  letter-spacing: -0.01em;
}

.register-form {
  background-color: #ffffff;
  border: 3px solid #a0aab3;
  border-radius: 32px;
  padding: 36px 28px;
  box-shadow: 0 8px 16px rgba(0,0,0,0.04);
}

.form-group {
  margin-bottom: 28px;
}

.form-group label {
  display: block;
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 12px;
  color: #1a232b;
}

.required {
  color: #b85c5c;
  margin-left: 4px;
}

.form-group input {
  width: 100%;
  padding: 20px 20px;
  font-size: 24px;
  font-weight: 600;
  border: 4px solid #a0aab3;
  border-radius: 20px;
  background-color: #ffffff;
  color: #1a232b;
  outline: none;
  font-family: inherit;
  transition: border-color 0.15s;
}

.form-group input:focus {
  border-color: #1e4f6b;
  box-shadow: 0 0 0 6px rgba(30,79,107,0.1);
}

.form-group input::placeholder {
  color: #8a9aa5;
  font-weight: 500;
  opacity: 0.8;
}

/* 错误信息 */
.error {
  display: block;
  color: #b85c5c;
  font-size: 20px;
  font-weight: 600;
  margin-top: 8px;
  padding-left: 8px;
}

/* 协议勾选 */
.checkbox-group {
  margin-top: 32px;
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  font-size: 22px;
  font-weight: 600;
  color: #1a232b;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 32px;
  height: 32px;
  margin-top: 2px;
  accent-color: #1e4f6b;
  border: 3px solid #a0aab3;
  border-radius: 8px;
  flex-shrink: 0;
}

.checkbox-label a {
  color: #1e4f6b;
  text-decoration: none;
  border-bottom: 3px solid transparent;
  transition: border-color 0.15s;
}

.checkbox-label a:hover {
  border-bottom-color: #1e4f6b;
}

/* 注册按钮 */
button[type="submit"] {
  width: 100%;
  min-height: 76px;
  background-color: #1e4f6b;
  color: #ffffff;
  font-size: 30px;
  font-weight: 700;
  border: 4px solid #143a4b;
  border-radius: 24px;
  padding: 12px 20px;
  margin-top: 24px;
  cursor: pointer;
  transition: background-color 0.1s;
  touch-action: manipulation;
  box-shadow: 0 4px 8px rgba(0,0,0,0.05);
}

button[type="submit"]:active {
  background-color: #143a4b;
  transform: scale(0.99);
}

button[type="submit"]:disabled {
  opacity: 0.5;
  pointer-events: none;
  background-color: #5f6c7a;
}

/* 跳转登录链接 */
.link {
  text-align: center;
  margin-top: 32px;
  font-size: 24px;
  font-weight: 600;
}

.link a {
  color: #1e4f6b;
  text-decoration: none;
  border-bottom: 3px solid transparent;
  padding-bottom: 4px;
  transition: border-color 0.15s;
}

.link a:hover {
  border-bottom-color: #1e4f6b;
}

/* 移动端优化 */
@media (max-width: 480px) {
  .register-container {
    padding: 20px 16px;
  }
  .title {
    font-size: 32px;
  }
  .register-form {
    padding: 28px 20px;
  }
  .form-group label {
    font-size: 22px;
  }
  .form-group input {
    font-size: 22px;
    padding: 18px 16px;
  }
  .error {
    font-size: 18px;
  }
  .checkbox-label {
    font-size: 20px;
    gap: 12px;
  }
  .checkbox-label input[type="checkbox"] {
    width: 28px;
    height: 28px;
  }
  button[type="submit"] {
    font-size: 28px;
    min-height: 80px;
  }
  .link {
    font-size: 22px;
  }
}
</style>