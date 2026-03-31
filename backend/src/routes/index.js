// src/routes/index.js
const express = require('express')
const router = express.Router()

// 引入各个模块的路由
const authRoutes = require('./authRoutes')
const weatherRoutes = require('./weatherRoutes')
const reminderRoutes = require('./reminderRoutes')
const emergencyRoutes = require('./emergencyRoutes')// 紧急呼叫
const pushRoutes = require('./pushRoutes')
const healthRoutes = require('./healthRoutes')



// 挂载子路由
router.use('/auth', authRoutes)        // 认证相关接口，如登录、注册
router.use('/weather', weatherRoutes)   // 天气相关接口
router.use('/reminders', reminderRoutes) // 提醒相关接口
router.use('/emergency', emergencyRoutes)  //到达app.js挂载后路径即为”http://localhost:3000/api/emergency/send“
router.use('/push', pushRoutes) // 所有 /push/* 路由交由 pushRoutes 处理
router.use('/health', healthRoutes)
// router.use('/users', userRoutes)

module.exports = router