<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1 class="auth-title">找回密码</h1>
    <!-- @submit.prevent 阻止默认提交行为，并绑定 handleSubmit 方法 -->
      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="form-group">
          <label for="email">注册邮箱</label>
          <input
            id="email"
            type="email"
            v-model="email"
            required
            placeholder="请输入您的注册邮箱"
            autocomplete="email"
          />
        </div>
      <!-- disabled属性绑定loading代表发送请求时禁用，按钮文字根据loading切换显示“发送中...”或“发送重置链接” -->
        <button type="submit" :disabled="loading" class="btn btn-primary auth-submit">
          {{ loading ? '发送中...' : '发送重置链接' }}
        </button>

        <p v-if="message" class="auth-message" :class="{ 'auth-error': isError }">
          {{ message }}
        </p>
      <!-- a与router-link：浏览器原生整页刷新跳转和vue专用单页跳转。“简单跳转”与“支持路由守卫、懒加载、路由参数” -->

        <div class="auth-links">
          <router-link to="/elder/login">← 返回登录</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
// 关于setup：自动暴露变量和方法给模板，自动导入组件、更简洁的Composition API写法（响应式ref、方法、计算属性、生命周期onMounted）
import { ref } from 'vue'
import api from '@/api'

// 定义响应式变量并设置初始值
const email = ref('')
const loading = ref(false)
const message = ref('')

const handleSubmit = async () => {
  if (!email.value) return   // 直接返回（不发送请求）
  loading.value = true  // 页面会显示“发送中...”
  message.value = ''   // 清空旧消息
  try {
    const res = await api.post('/auth/forgot-password', { email: email.value })  // 发送POST请求，带邮箱数据
    // 执行后会包含响应的数据，api.post(...) 返回一个 Promise，await 会等待该 Promise 完成（即等待服务器响应）。
    // 当服务器返回响应后，这个 Promise 会 resolve，并将响应数据赋值给变量 res
    // res 变量存储的是服务器返回的响应数据（而不是请求本身）。通过 res.msg 就可以读取到后端返回的提示消息。
    // message.value = res.data.msg
    message.value = res.msg
  } catch (error) {
    message.value = error.response?.data?.msg || '如果该邮箱已注册，我们将发送重置链接'
  } finally {
    loading.value = false    // 无论出不出错，最后一定会执行，将loading状态设为false，按钮文字切换为“发送重置链接”
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

.auth-submit {
  padding: 14px 20px;
  font-size: 18px;
}

.auth-message {
  text-align: center;
  font-size: 14px;
  padding: 10px 12px;
  border-radius: var(--radius-input);
  background: var(--primary-light);
  color: var(--primary-dark);
  margin: 0;
}
.auth-message.auth-error {
  background: #fce8e8;
  color: #b85c5c;
}

.auth-links {
  display: flex;
  justify-content: center;
  margin-top: var(--space-sm);
}
.auth-links a {
  color: var(--primary);
  text-decoration: none;
  font-size: 15px;
}
.auth-links a:hover {
  text-decoration: underline;
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