const express = require('express')
const router = express.Router()
const emergencyLogController = require('../controllers/emergencyLogController')
const authMiddleware = require('../middleware/auth')

router.use(authMiddleware)

router.get('/', emergencyLogController.getLogs)
router.get('/:id', emergencyLogController.getLogById)
router.post('/', emergencyLogController.createLog) // 老人端调用

module.exports = router