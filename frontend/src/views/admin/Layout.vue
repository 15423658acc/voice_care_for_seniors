<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <h2>子女后台</h2>
      <nav>
        <router-link to="/admin/contacts">紧急联系人</router-link>
        <router-link to="/admin/reminders">吃药提醒</router-link>
        <router-link to="/admin/emergency-logs">求助记录</router-link>
        <router-link to="/admin/health">健康记录</router-link>
        <button v-if="isLoggedIn" @click="logout" class="logout-btn">退出登录</button>
        <!-- <button  @click="logout" class="logout-btn">退出登录</button> -->
      </nav>
    </aside>
    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'    // 1.从 Vue 路由中导入路由工具
// import { ref, onMounted } from 'vue'
import { ref, watch } from 'vue'

// 2.创建路由实例（用来监听页面跳转）
const router = useRouter()

const logout = () => {
  localStorage.removeItem('token')
  router.push('/admin/login')
}

// 关于“退出登录”按钮的显示与隐藏：Vue Router 路由守卫 + 全局状态,使用一个全局的响应式状态（ref）来存储登录状态，并在 logout 和登录成功时更新。
// 3.创建响应式变量：记录用户是否登录  localStorage.getItem('token')从浏览器本地存储里拿 token,!!把值转成 布尔值
const isLoggedIn = ref(!!localStorage.getItem('token'))
// ref(...) 把 true/false 变成响应式变量,只要 isLoggedIn 变了，页面会自动更新

// 监听路由变化，重新检查 token,watch(..., () => { ... }, { immediate: true })监听路由变化，每次切换页面都重新检查登录。
// 4.创建响应式变量：记录用户是否登录
watch(() => router.currentRoute.value, () => {   // 监听当前页面路由,只要页面跳转，就触发监听
  isLoggedIn.value = !!localStorage.getItem('token')    // 并更新登录状态 isLoggedIn
}, { immediate: true })

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