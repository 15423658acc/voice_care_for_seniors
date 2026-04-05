// src/routes/authRoutes.js
const express = require('express')
const router = express.Router()
const authController = require('../controllers/authController')

// 登录接口
router.post('/login', authController.login)

// 注册接口
router.post('/register', authController.register)


// 添加老人注册和登录路由
router.post('/elder/register', authController.elderRegister)
router.post('/elder/login', authController.elderLogin)

// 获取当前用户信息（需要认证）
const authMiddleware = require('../middleware/auth')
router.get('/me', authMiddleware, authController.getMe)

module.exports = router