const express = require('express')
const router = express.Router()
const reminderController = require('../controllers/reminderController')

// 路由只做“分发”，把请求交给controller的getTodayReminders处理
router.get('/today', reminderController.getTodayReminders)
// 其他CRUD接口（暂略，子女后台实现）

module.exports = router