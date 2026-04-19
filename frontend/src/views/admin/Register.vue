<!-- src/views/admin/Register.vue -->
<template>
  <div class="auth-page">
    <div class="auth-card auth-card--wide">
      <h1 class="auth-title">子女账号注册</h1>

      <form @submit.prevent="handleRegister" class="auth-form">
        <!-- 用户名 -->
        <div class="form-group">
          <label>用户名 <span class="required">*</span></label>
          <input
            v-model="form.username"
            @blur="validateUsername"
            type="text"
            placeholder="请输入用户名"
            autocomplete="off"
          />
          <span class="field-error" v-if="errors.username">{{ errors.username }}</span>
        </div>

        <!-- 密码 -->
        <div class="form-group">
          <label>密码 <span class="required">*</span></label>
          <input
            type="password"
            v-model="form.password"
            @input="validatePassword"
            placeholder="至少8位，含大小写字母和数字"
            autocomplete="new-password"
          />
          <span class="field-error" v-if="errors.password">{{ errors.password }}</span>
        </div>

        <!-- 确认密码 -->
        <div class="form-group">
          <label>确认密码 <span class="required">*</span></label>
          <input
            type="password"
            v-model="form.confirmPassword"
            @input="validateConfirm"
            placeholder="请再次输入密码"
            autocomplete="new-password"
          />
          <span class="field-error" v-if="errors.confirmPassword">{{ errors.confirmPassword }}</span>
        </div>

        <!-- 邮箱 -->
        <div class="form-group">
          <label>邮箱（可选）</label>
          <input
            v-model="form.email"
            @blur="validateEmail"
            type="email"
            placeholder="用于找回密码"
            autocomplete="email"
          />
          <span class="field-error" v-if="errors.email">{{ errors.email }}</span>
        </div>

        <!-- 协议勾选 -->
        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="form.agreeTerms" />
            <span>
              我已阅读并同意
              <a href="#" @click.prevent="showAgreement">《用户协议》</a>
              和
              <a href="#" @click.prevent="showPrivacy">《隐私政策》</a>
            </span>
          </label>
          <span class="field-error" v-if="errors.agreeTerms">{{ errors.agreeTerms }}</span>
        </div>

        <button type="submit" :disabled="loading || !isFormValid" class="btn btn-primary auth-submit">
          {{ loading ? '注册中...' : '注册' }}
        </button>

        <p v-if="errorMsg" class="auth-error">{{ errorMsg }}</p>

        <div class="auth-links">
          <router-link to="/admin/login">已有账号？去登录</router-link>
        </div>
      </form>
    </div>
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
@import '@/assets/admin.css';

.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-page);
  padding: var(--space-md);
}

.auth-card {
  background: var(--card-bg);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  border: 1px solid var(--border-light);
  padding: var(--space-xl) var(--space-lg);
  max-width: 520px;
  width: 100%;
}

.auth-card--wide {
  max-width: 560px;
}

.auth-title {
  text-align: center;
  font-size: 28px;
  font-weight: 450;
  color: var(--gray-900);
  margin-bottom: var(--space-lg);
  letter-spacing: -0.01em;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.required {
  color: #b85c5c;
  margin-left: 2px;
}

.field-error {
  color: #b85c5c;
  font-size: 13px;
  margin-top: 2px;
}

.checkbox-group {
  margin-top: 4px;
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-weight: 400;
  cursor: pointer;
}
.checkbox-label input {
  width: 18px;
  height: 18px;
  margin-top: 2px;
  accent-color: var(--primary);
}
.checkbox-label a {
  color: var(--primary);
  text-decoration: none;
}
.checkbox-label a:hover {
  text-decoration: underline;
}

.auth-submit {
  margin-top: var(--space-sm);
  padding: 14px 20px;
  font-size: 18px;
}

.auth-error {
  color: #b85c5c;
  font-size: 14px;
  text-align: center;
  margin: 0;
  background: #fce8e8;
  padding: 8px 12px;
  border-radius: var(--radius-input);
}

.auth-links {
  display: flex;
  justify-content: center;
  margin-top: var(--space-sm);
  font-size: 15px;
}
.auth-links a {
  color: var(--primary);
  text-decoration: none;
  border-bottom: 1px solid transparent;
}
.auth-links a:hover {
  border-bottom-color: var(--primary);
}

@media (max-width: 480px) {
  .auth-card {
    padding: var(--space-lg) var(--space-md);
  }
  .auth-title {
    font-size: 24px;
  }
}
</style>