const express = require('express')
const router = express.Router()
const healthController = require('../controllers/healthController')
const authMiddleware = require('../middleware/auth')

// 所有接口需要认证（JWT）
router.use(authMiddleware)

// 获取当前用户的健康记录（子女可指定userId）
router.get('/', healthController.getRecords)

// 获取单条记录详情
router.get('/:id', healthController.getRecordById)

// 新增记录
router.post('/', healthController.createRecord)

// 更新记录
router.put('/:id', healthController.updateRecord)

// 删除记录
router.delete('/:id', healthController.deleteRecord)

module.exports = router