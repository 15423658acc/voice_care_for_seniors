const express = require('express')
const router = express.Router()
const reminderController = require('../controllers/reminderController')
const authMiddleware = require('../middleware/auth')  // 加上登录验证

// 所有提醒接口必须登录才能访问（和你联系人接口保持一致）
router.use(authMiddleware)

// 路由只做“分发”，把请求交给controller的getTodayReminders处理
router.get('/today', reminderController.getTodayReminders)
// 其他CRUD接口（暂略，子女后台实现）


// ===================== 新增 CRUD 接口 =====================
router.get('/', reminderController.getReminders)          // 获取所有提醒
router.get('/:id', reminderController.getReminderById)    // 获取单个提醒
router.post('/', reminderController.createReminder)       // 创建提醒
router.put('/:id', reminderController.updateReminder)     // 修改提醒
router.delete('/:id', reminderController.deleteReminder) // 删除提醒



module.exports = router