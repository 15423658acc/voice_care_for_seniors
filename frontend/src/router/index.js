// src/router/index.js
// 1. 导入依赖：从vue-router拿创建路由器的工具
import { createRouter, createWebHistory } from 'vue-router'

// // 2. 定义路由表：列出所有页面的跳转规则
const routes = [
  {
    path:'/elder/login',
    component:() => import('../views/elder/Login.vue'),
    meta:{title:'老人登录', requiresAuth:false}
  },
  {
    path:'/elder/register',
    component:() => import('../views/elder/Register.vue'),
    meta:{title:'老人注册', requiresAuth:false}
  },
  {
    path: '/',
    name: 'home',
    component: () => import('../views/Home.vue'), // 老人端主页
    meta: { title: '首页', requiresAuth: false } // meta 元信息，用于页面标题和权限判断
  },
  {
    path: '/emergency',
    name: 'emergency',
    component: () => import('../views/Emergency.vue'), 
    meta: { title: '紧急呼叫', requiresAuth: false } 
  },
  {
    path: '/weather',
    name: 'weather',
    component: () => import('../views/Weather.vue'),
    meta: { title: '天气', requiresAuth: false }
  },
  {
    path: '/reminder',
    name: 'reminder',
    component: () => import('../views/Reminder.vue'),
    meta: { title: '提醒', requiresAuth: false }
  },
  {
    path: '/voiceAssistant',
    name: 'voiceAssistant',
    component: () => import('../views/VoiceAssistant.vue'),
    meta: { title: '语音助手', requiresAuth: false }
  },
  {
    path: '/antifraud',
    name: 'antifraud',
    component: () => import('../views/AntiFraud.vue'),
    meta: { title: '反诈骗', requiresAuth: false }
  },
  {
    path: '/healthRecords',
    name: 'healthRecords',
    component: () => import('../views/HealthRecords.vue'),
    meta: { title: '健康记录', requiresAuth: false }
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../views/Profile.vue'),
    meta: { title: '个人设置', requiresAuth: false }
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('../views/ForgotPassword.vue'),
    meta: { title: '忘记密码', requiresAuth: false }
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('../views/ResetPassword.vue'),
    meta: { title: '重置密码', requiresAuth: false }
  },
  // 子女后台路由
  {
    path: '/admin',
    name: 'admin',
    component: () => import('../views/admin/Layout.vue'), // 后台布局组件
    meta: { title: '后台管理', requiresAuth: true }, // 需要登录才能访问
    children: [
      {
        path: 'login', // 注意这里没有斜杠，是相对路径，实际路径为 /admin/login
        name: 'admin-login',
        component: () => import('../views/admin/Login.vue'),
        meta: { title: '登录', requiresAuth: false } // 登录页本身不需要登录
      },
      {
        path: 'register', // 注意这里没有斜杠，是相对路径，实际路径为 /admin/register
        name: 'admin-register',
        component: () => import('../views/admin/Register.vue'),
        meta: { title: '注册', requiresAuth: false } // 登录页本身不需要登录
      },
      {
        path: 'reminders',
        name: 'admin-reminders',
        component: () => import('../views/admin/Reminders.vue'),
        meta: { title: '提醒管理', requiresAuth: true }
      },
      {
        path: 'contacts',
        name: 'admin-contacts',
        component: () => import('../views/admin/Contacts.vue'),
        meta: { title: '联系人管理', requiresAuth: true }
      },
      {
        path: 'emergency-logs',
        name: 'admin-emergencylogs',
        component: () => import('../views/admin/EmergencyLogs.vue'),
        meta: { title: '紧急呼叫记录', requiresAuth: true }
      },
            {
        path: 'health',
        name: 'admin-healthlogs',
        component: () => import('../views/admin/HealthRecord.vue'),
        meta: { title: '健康记录', requiresAuth: true }
      },
    ]
  },
  // 404 页面
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFound.vue'),
    meta: { title: '页面不存在' }
  }
]

// 3. 创建路由器实例：把规则传给工具，生成能用的路由器
const router = createRouter({
  history: createWebHistory(), // 使用 HTML5 历史模式，没有 # 号
  routes
})

// 4. 全局路由守卫beforeEach：跳转前做检查
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title ? `老友助手 - ${to.meta.title}` : '老友助手'



    // 2. 获取本地存储的 token 和用户信息
  const token = localStorage.getItem('token')
  let user = null
  try {
    const userStr = localStorage.getItem('user')
    if (userStr) user = JSON.parse(userStr)
  } catch (e) {
    user = null
  }

  // ===== 子女后台路由认证 =====
  if (to.meta.requiresAuth === true) {
    // 需要登录
    if (!token) {
      // 未登录，跳转到子女登录页，并记录要返回的地址
      next({ name: 'admin-login', query: { redirect: to.fullPath } })
      return
    }
    // 已登录，检查角色是否为 child
    if (user && user.role === 'child') {
      next() // 允许访问
    } else {
      // 角色不是 child，跳转到子女登录页
      next({ name: 'admin-login', query: { redirect: to.fullPath } })
    }
    return
  }
  

  // // ===== 老人端路由认证 =====
  // // 判断是否为老人端需要认证的页面
  // const isElderAuthPage = to.path === '/elder/login' || to.path === '/elder/register'
  // // 非 admin 开头的页面 + 不是老人登录注册页 = 老人端受保护页面
  // const isElderProtectedPage = !to.path.startsWith('/admin') && !isElderAuthPage


  // ===== 老人端路由认证 =====
  // 定义老人端公开页面（无需登录即可访问）
  const elderPublicPages = ['/elder/login', '/elder/register', '/forgot-password', '/reset-password']
  // 判断当前页面是否为公开页面
  const isElderPublicPage = elderPublicPages.includes(to.path)
  // 老人端受保护页面：非 admin 开头 且 不是公开页面
  const isElderProtectedPage = !to.path.startsWith('/admin') && !isElderPublicPage


  if (isElderProtectedPage) {
    if (!token) {
      // 未登录，跳转到老人登录页
      next('/elder/login')
      return
    }
    // 已登录，检查角色是否为 elder
    if (user && user.role === 'elder') {
      next() // 允许访问
    } else {
      // 角色不是 elder，跳转到老人登录页
      next('/elder/login')
    }
    return
  }

  // ===== 其他页面（登录、注册、404等）直接放行 =====
  next()
})




//   // 判断是否需要登录
//   if (to.meta.requiresAuth) {
//     // 检查本地存储中是否有 token（假设登录后把 token 存在 localStorage 中）
//     const token = localStorage.getItem('token')
//     if (token) {
//       // 有 token，允许进入
//       next()
//     } else {
//       // 没有 token，跳转到后台登录页，并携带当前要访问的路径作为 redirect 参数
//       next({ name: 'admin-login', query: { redirect: to.fullPath } })
//     }
    
//   } else {
//     // 不需要登录，直接放行
//     next()
//   }
// })

// 5. 导出路由器：让项目其他地方能使用
export default router