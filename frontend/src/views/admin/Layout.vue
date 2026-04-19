<template>
  <div class="admin-layout">
    <!-- 顶部导航栏：干净、稳重 -->
    <header class="top-bar">
      <div class="top-bar__inner">
        <div class="logo-area">
          <span class="logo-icon">📋</span>
          <span class="logo-text">家庭助手 · 子女端</span>
        </div>
        <nav class="nav-links">
          <router-link to="/admin/contacts" class="nav-link">紧急联系人</router-link>
          <router-link to="/admin/reminders" class="nav-link">吃药提醒</router-link>
          <router-link to="/admin/emergency-logs" class="nav-link">求助记录</router-link>
          <router-link to="/admin/health" class="nav-link">健康记录</router-link>
        </nav>
        <div class="user-actions">
          <span v-if="userName" class="user-name">{{ userName }}</span>
          <button v-if="isLoggedIn" @click="logout" class="btn btn-outline logout-btn">退出</button>
        </div>
      </div>
    </header>

    <!-- 主内容区域：卡片式背景 -->
    <main class="main-content">
      <div class="content-card">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isLoggedIn = ref(!!localStorage.getItem('token'))

// 读取用户名
const userName = computed(() => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    return user.username || ''
  } catch { return '' }
})

const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  isLoggedIn.value = false
  router.push('/admin/login')
}

watch(() => router.currentRoute.value, () => {
  isLoggedIn.value = !!localStorage.getItem('token')
}, { immediate: true })
</script>

<style scoped>
/* 引入全局变量，也可在main.js全局引入admin.css，此处仅布局样式 */
@import '@/assets/admin.css';

.admin-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-page);
}

.top-bar {
  background: var(--card-bg);
  border-bottom: 1px solid var(--border-light);
  box-shadow: var(--shadow-sm);
  padding: 0 var(--space-lg);
}
.top-bar__inner {
  max-width: 1440px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 68px;
}
.logo-area {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 20px;
  font-weight: 450;
  color: var(--primary-dark);
}
.logo-icon { font-size: 28px; }
.nav-links {
  display: flex;
  gap: var(--space-md);
  margin: 0 var(--space-lg);
}
.nav-link {
  padding: 8px 16px;
  border-radius: 30px;
  color: var(--gray-800);
  text-decoration: none;
  font-weight: 450;
  transition: all 0.1s;
  border: 1px solid transparent;
}
.nav-link:hover {
  background: var(--primary-light);
  color: var(--primary-dark);
}
.nav-link.router-link-active {
  background: var(--primary-light);
  color: var(--primary-dark);
  border-color: var(--primary);
  font-weight: 500;
}
.user-actions {
  display: flex;
  align-items: center;
  gap: var(--space-md);                      
}
.user-name {
  color: var(--gray-800);
  font-weight: 450;
}
.logout-btn {
  padding: 6px 16px;
  font-size: 15px;
  min-width: auto;
}

.main-content {
  flex: 1;
  padding: var(--space-lg);
  max-width: 1440px;
  margin: 0 auto;
  width: 100%;
}
.content-card {
  background: var(--card-bg);
  border-radius: var(--radius-card);
  padding: var(--space-lg);
  box-shadow: var(--shadow-card);
  border: 1px solid var(--border-light);
}

/* 移动端适配：导航转为垂直（简洁处理） */
@media (max-width: 780px) {
  .top-bar__inner {
    flex-wrap: wrap;
    height: auto;
    padding: var(--space-sm) 0;
  }
  .nav-links {
    order: 3;
    width: 100%;
    justify-content: space-around;
    margin: var(--space-xs) 0;
  }
  .main-content { padding: var(--space-sm); }
  .content-card { padding: var(--space-md); }
}
</style>