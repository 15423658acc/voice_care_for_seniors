const express = require('express')
const router = express.Router()
const healthController = require('../controllers/healthController')
const authMiddleware = require('../middleware/auth')

// 所有接口需要认证（JWT）
router.use(authMiddleware)

// 开发环境：模拟登录用户（仅用于测试）
// router.use((req, res, next) => {
//     // 模拟一个老人用户，ID 假设为 1（确保数据库中有对应 ID 的老人）
//     req.user = { id: 1, role: 'elderly' }  // 如果角色逻辑暂时用不到，可只保留 id
//     next()
// })





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