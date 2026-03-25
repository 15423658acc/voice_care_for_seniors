const express = require('express')
const router = express.Router()
const pushController = require('../controllers/pushController')

// 核心接口：前端订阅推送后，提交订阅信息给后端存储
// 请求路径：/api/push/subscribe（POST）
router.post('/subscribe', pushController.subscribe)
// // 扩展接口：前端取消订阅时调用
router.delete('/unsubscribe', pushController.unsubscribe)


module.exports = router