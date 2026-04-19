<template>
  <div class="auth-page">
    <div class="auth-card">
      <!-- 跳转老人端按钮，安静置于右上角 -->
      <button class="auth-switch-btn" @click="handleJumpElder">👤 老人端</button>

      <h1 class="auth-title">子女后台登录</h1>

      <form @submit.prevent="handleLogin" class="auth-form">
        <div class="form-group">
          <label for="username">用户名</label>
          <input
            id="username"
            v-model="form.username"
            type="text"
            required
            placeholder="请输入用户名"
            autocomplete="username"
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
            autocomplete="current-password"
          />
        </div>

        <button type="submit" :disabled="loading" class="btn btn-primary auth-submit">
          {{ loading ? '登录中...' : '登录' }}
        </button>

        <p v-if="error" class="auth-error">{{ error }}</p>

        <div class="auth-links">
          <router-link to="/admin/register">还没有账号？立即注册</router-link>
          <router-link to="/forgot-password">忘记密码？</router-link>
        </div>
      </form>
    </div>
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

// 跳转管理端逻辑
const handleJumpElder = () => {
  router.push('/elder/login')
}

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
    router.push('/admin/contacts')
  } catch (err) {
    console.error(err)
    error.value = err.response?.data?.msg || '登录失败，请检查网络'
  } finally {
    loading.value = false
  }
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
  max-width: 440px;
  width: 100%;
  position: relative;
}

.auth-switch-btn {
  position: absolute;
  top: var(--space-md);
  right: var(--space-md);
  background: none;
  border: 1px solid var(--gray-300);
  padding: 6px 14px;
  border-radius: 30px;
  color: var(--gray-700);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.1s;
}
.auth-switch-btn:hover {
  background: var(--gray-100);
  border-color: var(--gray-400);
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
  justify-content: space-between;
  margin-top: var(--space-sm);
  font-size: 14px;
}
.auth-links a {
  color: var(--primary);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.1s;
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
  .auth-links {
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
}
</style>