const express = require('express')
const router = express.Router()
const emergencyController = require('../controllers/emergencyController')
const authMiddleware = require('../middleware/auth')  // 加上登录验证


router.use(authMiddleware)


// 发送紧急邮件
router.post('/send', emergencyController.sendEmergencyMail)


module.exports = router