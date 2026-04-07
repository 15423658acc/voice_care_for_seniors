<template>
  <div class="reset-container">
    <h1>设置新密码</h1>
    <form @submit.prevent="handleReset">
      <div class="form-group">
        <label>新密码</label>
        <!-- 监听 input 事件实时调用 validatePassword 方法；input事件：用户在输入框里只要内容变化立刻触发 -->
         <!-- v-model：语法糖，打字时msg自动更新修改，修改msg时输入框内容自动变 -->
        <input type="password" v-model="newPassword" @input="validatePassword" required placeholder="密码至少8位，包含大写、小写和数字" />
        <span class="error" v-if="passwordError">{{ passwordError }}</span>
      </div>
      <div class="form-group">
        <label>确认新密码</label>
        <input type="password" v-model="confirmPassword" @input="validateConfirm" required />
        <!-- 如果存在 confirmError 则显示错误信息。 -->
        <span class="error" v-if="confirmError">{{ confirmError }}</span>
      </div>
      <!-- 禁用提交按钮：loading为true或isValid为 false -->
      <button type="submit" :disabled="loading || !isValid">重置密码</button>
      <!-- v-if控制p标签显示(true或false)，Vue 动态绑定class，错误时：class="message error"，成功时：class="message success" -->
      <p v-if="message" :class="['message', isError ? 'error' : 'success']">{{ message }}</p>
    </form>
    <p class="link"><router-link to="/elder/login">返回登录</router-link></p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'   //useRoute 获取路由参数，useRouter 实现跳转。
import api from '@/api'

const route = useRoute()   // 获取当前路由对象和路由器实例。
const router = useRouter()

const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const message = ref('')
const isError = ref(false)   // 是否为错误消息，一个记录的状态变量，很普通
const passwordError = ref('')
const confirmError = ref('')

// 从 URL 获取 token 和 userId
const token = ref('')
const userId = ref(null)

onMounted(() => {
  // 组件挂载时，从路由的 query 参数中读取 token 和 id，分别赋值。
  token.value = route.query.token
  userId.value = route.query.id
  // 如果缺少任一参数，设置错误消息并标记为错误状态。
  if (!token.value || !userId.value) {
    message.value = '无效的重置链接，请重新发起找回密码'
    isError.value = true
  }
})

const validatePassword = () => {
  const pwd = newPassword.value
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
  if (!pwd) {
    passwordError.value = '密码不能为空'
    //  test(pwd)检查 pwd 是否符合刚才的regex强密码正则，结果为true或false，取反表示单纯不符合，不涉及判定，只是代表取true的反
  } else if (!regex.test(pwd)) {
    passwordError.value = '密码必须至少8位，包含大写字母、小写字母和数字'
  } else {
    // 否则清空错误信息
    passwordError.value = ''
  }
  // 如果确认密码已有值，同时触发确认密码校验方法
  if (confirmPassword.value) validateConfirm()
}

const validateConfirm = () => {
  if (confirmPassword.value !== newPassword.value) {
    confirmError.value = '两次输入的密码不一致'
  } else {
    confirmError.value = ''
  }
}

// computed：computed 是计算属性；依赖响应式数据，自动计算；有缓存，依赖不变不重复计算
// 下面使用computed的好处：自动监听所有依赖，任意一个变了isValid 会自动重新计算；自带缓存；模板里面直接用isValid；
const isValid = computed(() => {
  // 计算属性：当所有条件满足时（新密码非空、确认密码非空、无密码错误、无确认错误、token 和 userId 存在），返回 true，否则 false。用于控制按钮启用状态。
  return newPassword.value && confirmPassword.value && !passwordError.value && !confirmError.value && token.value && userId.value
})

const handleReset = async () => {
  if (!isValid.value) return
  loading.value = true
  message.value = ''
  try {
    // 发送 POST 请求到 /auth/reset-password，携带 token、userId、newPassword。
    const res = await api.post('/auth/reset-password', {
      token: token.value,
      userId: userId.value,
      newPassword: newPassword.value
    })
    // message.value = res.data.msg
    // 成功时：提取 res.msg，赋值给 message，显示成功消息，设置 isError 为 false。
    message.value = res.msg
    isError.value = false
    // 3秒后跳转到登录页
    setTimeout(() => {
      router.push('/elder/login')
    }, 3000)
  } catch (error) {
    message.value = error.response?.data?.msg || '重置完成，请重新登陆'
    isError.value = true
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.reset-container {
  max-width: 400px;
  margin: 2rem auto;
  padding: 1rem;
}
h1 {
  font-size: 2rem;
  text-align: center;
}
.form-group {
  margin-bottom: 1.2rem;
}
label {
  font-size: 1.4rem;
  display: block;
}
input {
  width: 100%;
  padding: 0.8rem;
  font-size: 1.4rem;
}
.error {
  color: #f44336;
  font-size: 1.2rem;
}
small {
  font-size: 1.2rem;
  color: #666;
}
button {
  width: 100%;
  padding: 1rem;
  font-size: 1.6rem;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
}
.message {
  margin-top: 1rem;
  text-align: center;
  font-size: 1.4rem;
}
.success {
  color: #4caf50;
}
.error {
  color: #f44336;
}
.link {
  text-align: center;
  margin-top: 1rem;
}
</style>