<template>
  <div class="login-container">
    <button class="logout-btn" @click="handleJumpAdmin">🚪 子女端</button>
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
      <p class="forgot-password"><router-link to="/forgot-password">忘记密码？</router-link></p>
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

// 跳转管理端逻辑
const handleJumpAdmin = () => {
  router.push('/admin/login')
}

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


/* 设计原则：柔和米白背景、粗边框、超大字体、高对比、触控优先 */

.login-container {
  max-width: 520px;
  margin: 0 auto;
  padding: 32px 24px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background-color: #f7f6f2;      /* 柔和米白，不刺眼 */
  position: relative;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}

.title {
  font-size: 36px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 40px;
  color: #1a232b;                /* 高对比深灰 */
  letter-spacing: -0.01em;
}

/* 表单 */
.login-form {
  background-color: #ffffff;
  border: 3px solid #a0aab3;     /* 清晰粗边框，色盲友好 */
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

/* 登录按钮：超大、粗边框、沉稳深蓝 */
button[type="submit"] {
  width: 100%;
  min-height: 72px;
  background-color: #1e4f6b;
  color: #ffffff;
  font-size: 30px;
  font-weight: 700;
  border: 4px solid #143a4b;
  border-radius: 24px;
  padding: 12px 20px;
  margin-top: 16px;
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
}

/* 辅助链接：大字号、清晰可点 */
.link,
.forgot-password {
  text-align: center;
  margin-top: 28px;
  font-size: 22px;
  font-weight: 600;
}

.link a,
.forgot-password a {
  color: #1e4f6b;
  text-decoration: none;
  border-bottom: 3px solid transparent;
  padding-bottom: 4px;
  transition: border-color 0.15s;
}

.link a:hover,
.forgot-password a:hover {
  border-bottom-color: #1e4f6b;
}

/* 子女端跳转按钮：低调置于左下角 */
.logout-btn {
  position: fixed;
  bottom: 24px;
  left: 24px;
  background-color: #ffffff;
  color: #4e5b66;
  font-size: 22px;
  font-weight: 600;
  padding: 16px 28px;
  border: 3px solid #a0aab3;
  border-radius: 48px;
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0,0,0,0.05);
  touch-action: manipulation;
  z-index: 100;
  transition: all 0.1s;
}

.logout-btn:active {
  background-color: #e2e8ed;
  transform: scale(0.98);
}

/* 移动端优化 */
@media (max-width: 480px) {
  .login-container {
    padding: 20px 16px;
  }
  .title {
    font-size: 32px;
  }
  .login-form {
    padding: 28px 20px;
  }
  .form-group label {
    font-size: 22px;
  }
  .form-group input {
    font-size: 22px;
    padding: 18px 16px;
  }
  button[type="submit"] {
    font-size: 28px;
    min-height: 76px;
  }
  .link,
  .forgot-password {
    font-size: 20px;
  }
  .logout-btn {
    font-size: 20px;
    padding: 14px 24px;
    bottom: 16px;
    left: 16px;
  }
}
</style>