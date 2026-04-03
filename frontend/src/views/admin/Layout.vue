<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <h2>子女后台</h2>
      <nav>
        <router-link to="/admin/contacts">紧急联系人</router-link>
        <router-link to="/admin/reminders">吃药提醒</router-link>
        <router-link to="/admin/emergency-logs">求助记录</router-link>
        <router-link to="/admin/health">健康记录</router-link>
        <button @click="logout" class="logout-btn">退出登录</button>
      </nav>
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
  router.push('/admin/login')
}
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
}
.sidebar {
  width: 250px;
  background-color: #2c3e50;
  color: white;
  padding: 1rem;
}
.sidebar h2 {
  font-size: 1.5rem;
  text-align: center;
  margin-bottom: 1rem;
}
.sidebar nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.sidebar a {
  color: white;
  text-decoration: none;
  padding: 0.5rem;
  border-radius: 0.25rem;
}
.sidebar a.router-link-active {
  background-color: #1abc9c;
}
.logout-btn {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  margin-top: 1rem;
  border-radius: 0.25rem;
}
.content {
  flex: 1;
  padding: 1rem;
  background-color: #ecf0f1;
}
</style>