const express = require('express')
const router = express.Router()
const emergencyController = require('../controllers/emergencyController')


// 发送紧急邮件
router.post('/send', emergencyController.sendEmergencyMail)

module.exports = router