// src/routes/authRoutes.js
const express = require('express')
const router = express.Router()
const authController = require('../controllers/authController')

// 登录接口
router.post('/login', authController.login)

// 注册接口（可选，如果子女需要注册）
router.post('/register', authController.register)

// 获取当前用户信息（需要认证）
const authMiddleware = require('../middleware/auth')
router.get('/me', authMiddleware, authController.getMe)

module.exports = router