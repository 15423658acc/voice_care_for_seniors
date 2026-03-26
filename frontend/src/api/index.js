// src/api/index.js
// 封装 axios（前端发请求的工具），
// 给所有接口请求加 “统一规则”—— 请求前自动带 token、响应后自动处理成功 / 失败逻辑，
// 最后对外提供简单的 get/post 等请求方法，让页面调接口时不用重复写这些规则。



import axios from 'axios'

// 创建 axios 实例
const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api', // 所有接口都以/api开头
  timeout: 10000 // 请求超时时间 10 秒判定超时
})

// 请求拦截器【拦截器】：在发送请求前做一些处理
service.interceptors.request.use(
  config => {
    // 从 localStorage 获取 token
    const token = localStorage.getItem('token')
    // 如果 token 存在，则在请求头中添加 Authorization 字段
    if (token) {
      // Bearer 是 JWT 的常见前缀，后端会根据这个格式解析
      config.headers['Authorization'] = `Bearer ${token}`
    }
    // 可以在这里添加其他公共请求头，如语言、版本等
    return config
  },
  error => {
    // 请求错误处理
    console.error('请求错误：', error)
    return Promise.reject(error)
  }
)

// 响应拦截器：处理返回的数据和错误
service.interceptors.response.use(
  response => {
    // 如果返回的状态码是 200，说明请求成功，直接返回数据
    // 这里可以根据后端返回的数据结构进行调整，比如后端可能返回 { code: 200, data: ... }
    const res = response.data
    // 假设后端统一返回格式为 { code: 200, msg: 'success', data: ... }
    if (res.code === 200) {
      return res.data
    } else {
      // 业务错误（如 token 过期、权限不足等）统一处理
      // 可以在这里弹窗提示错误信息
      console.error('业务错误：', res.msg)
      // 如果 token 无效或过期，可以跳转到登录页
      if (res.code === 401) {
        // 清除本地 token
        localStorage.removeItem('token')
        // 跳转到登录页，并传递当前页面路径，以便登录后跳回
        window.location.href = `/admin/login?redirect=${encodeURIComponent(window.location.href)}`
      }
      return Promise.reject(new Error(res.msg || 'Error'))
    }
  },
  error => {
    // HTTP 状态码错误（如网络错误、404、500 等）
    console.error('网络错误：', error.message)
    // 可以根据错误状态码进行不同提示
    // 例如 500 显示服务器内部错误
    return Promise.reject(error)
  }
)

// 封装常用的请求方法
export default {
  get(url, params, config) {
    return service.get(url, { params, ...config })
  },
  post(url, data, config) {
    return service.post(url, data, config)
  },
  put(url, data, config) {
    return service.put(url, data, config)
  },
  delete(url, params, config) {
    return service.delete(url, { params, ...config })
  }
}