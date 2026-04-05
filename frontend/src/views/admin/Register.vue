<!-- Register.vue -->


<template>
  <div class="register-container">
    <h1 class="title">子女账号注册</h1>
    <form @submit.prevent="handleRegister" class="register-form">
      <!-- 用户名 -->
      <div class="form-group">
        <label for="username">用户名 *</label>
        <input
          id="username"
          v-model="form.username"
          type="text"
          required
          placeholder="请输入用户名"
          autocomplete="off"
        />
      </div>

      <!-- 密码 -->
      <div class="form-group">
        <label for="password">密码 * (至少6位)</label>
        <input
          id="password"
          v-model="form.password"
          type="password"
          required
          placeholder="请输入密码"
        />
      </div>

      <!-- 确认密码 -->
      <div class="form-group">
        <label for="confirmPassword">确认密码 *</label>
        <input
          id="confirmPassword"
          v-model="form.confirmPassword"
          type="password"
          required
          placeholder="请再次输入密码"
        />
      </div>

      <!-- 邮箱（可选） -->
      <div class="form-group">
        <label for="email">邮箱（可选）</label>
        <input
          id="email"
          v-model="form.email"
          type="email"
          placeholder="请输入邮箱"
        />
      </div>

      <!-- 按钮区域 -->
      <button type="submit" :disabled="loading" class="register-btn">
        {{ loading ? '注册中...' : '注册' }}
      </button>
      <p v-if="error" class="error">{{ error }}</p>
      <p class="login-link">
        已有账号？<router-link to="/admin/login">去登录</router-link>
      </p>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/api';

const router = useRouter();
const form = ref({
  username: '',
  password: '',
  confirmPassword: '',
  email: ''
});
const loading = ref(false);
const error = ref('');

// 邮箱格式正则
const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;

const handleRegister = async () => {
  // 1. 前端基础校验
  if (!form.value.username.trim()) {
    error.value = '用户名不能为空';
    return;
  }
  if (!form.value.password) {
    error.value = '密码不能为空';
    return;
  }
  if (form.value.password.length < 6) {
    error.value = '密码长度至少6位';
    return;
  }
  if (form.value.password !== form.value.confirmPassword) {
    error.value = '两次输入的密码不一致';
    return;
  }
  if (form.value.email && !emailRegex.test(form.value.email)) {
    error.value = '邮箱格式不正确';
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    // 2. 调用后端注册接口
    const res = await api.post('/auth/register', {
      username: form.value.username.trim(),
      password: form.value.password,
      confirmPassword: form.value.confirmPassword,
      email: form.value.email.trim() || null // 如果为空则传 null
    });

    // 假设返回格式 { code:200, data: { token, user } }
    // const { token, user } = res.data;
    const { token, user } = res;
    
    
    
    
    // 3. 存储 token 和用户信息
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    // 4. 跳转到后台首页
    router.push('/admin/contacts');
  } catch (err) {
    console.error('注册失败', err);
    // 从后端返回的错误信息中提取 msg
    error.value = err.response?.data?.msg || '注册失败，请重试';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.register-container {
  max-width: 400px;
  margin: 50px auto;
  padding: 2rem;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}
.title {
  text-align: center;
  font-size: 2rem;
  margin-bottom: 2rem;
}
.form-group {
  margin-bottom: 1.5rem;
}
label {
  display: block;
  font-size: 1.4rem;
  margin-bottom: 0.5rem;
}
input {
  width: 100%;
  padding: 1rem;
  font-size: 1.4rem;
  border: 1px solid #ccc;
  border-radius: 4px;
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
.error {
  color: red;
  margin-top: 1rem;
  text-align: center;
}
.login-link {
  text-align: center;
  margin-top: 1.5rem;
}
.login-link a {
  color: #2196f3;
  text-decoration: none;
}
</style>