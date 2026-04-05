const express = require('express')
const router = express.Router()
const userController = require('../controllers/userController')
const authMiddleware = require('../middleware/auth')

router.use(authMiddleware)
router.get('/', userController.getUsersByRole)

router.get('/elders', userController.getBoundElders)          // 子女获取绑定的老人列表
router.post('/elders', userController.addElderByChild)        // 子女添加老人账号

module.exports = router