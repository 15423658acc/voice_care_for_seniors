// src/app.js  项目 “总管家”
const express = require('express')
const cors = require('cors') // 跨域处理
const helmet = require('helmet') // 安全防护
const routes = require('./routes') // 路由总入口
const { errorHandler } = require('./middleware/errorHandler') // 自定义错误处理中间件

const app = express()

// 使用 helmet 设置各种 HTTP 头，增强安全性（例如防止 XSS 攻击）
app.use(helmet())

// 跨域配置：允许所有来源（开发环境可以这样，生产环境建议限制域名）
app.use(cors({
    origin: '*', // 允许的源，可以设置为具体的前端地址，如 'http://localhost:5173'
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // 允许的 HTTP 方法
    allowedHeaders: ['Content-Type', 'Authorization'] // 允许的请求头
}))

// 解析 JSON 请求体【中间件】：将请求体中的 JSON 数据解析为 JavaScript 对象
app.use(express.json())

// 解析 URL-encoded 请求体（一般用于表单提交）
app.use(express.urlencoded({ extended: true }))

// 挂载路由
app.use('/api', routes) // 所有 API 接口都加上 /api 前缀

// 健康检查接口（可选）
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is running' })
})

// 全局错误处理中间件
// app.use((err, req, res, next) => {
//     console.error('服务器错误:', err);
//     res.status(500).json({ code: 500, msg: '服务器内部错误' });
// });

// 404 处理：如果所有路由都不匹配，返回 404
app.use((req, res, next) => {
    res.status(404).json({ code: 404, msg: '接口不存在' })
})

// 全局错误处理中间件：捕获所有同步和异步错误
app.use(errorHandler)

module.exports = app