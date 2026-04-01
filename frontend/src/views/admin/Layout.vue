<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <h2 class="sidebar-title">老友助手管理</h2>
      <nav class="nav">
        <router-link to="/admin/dashboard" class="nav-item" active-class="active">仪表盘</router-link>
        <router-link to="/admin/emergency-contacts" class="nav-item" active-class="active">紧急联系人</router-link>
        <router-link to="/admin/reminders" class="nav-item" active-class="active">吃药提醒</router-link>
        <router-link to="/admin/emergency-logs" class="nav-item" active-class="active">求助记录</router-link>
      </nav>
      <button @click="logout" class="logout-btn">退出登录</button>
    </aside>
    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/admin/login')
}
</script>

<style scoped>
.admin-layout {
  display: flex;
  height: 100vh;
}
.sidebar {
  width: 250px;
  background-color: #82909f;
  color: white;
  display: flex;
  flex-direction: column;
  padding: 1rem;
}
.sidebar-title {
  font-size: 1.8rem;
  text-align: center;
  margin-bottom: 2rem;
}
.nav {
  flex: 1;
}
.nav-item {
  display: block;
  padding: 1rem;
  color: #ecf0f1;
  text-decoration: none;
  font-size: 1.6rem;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}
.nav-item:hover,
.active {
  background-color: #34495e;
}
.logout-btn {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 1rem;
  font-size: 1.6rem;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 1rem;
}
.content {
  flex: 1;
  padding: 2rem;
  background-color: #f5f5f5;
  overflow-y: auto;
}
</style>