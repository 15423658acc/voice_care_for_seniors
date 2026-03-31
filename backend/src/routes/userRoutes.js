const express = require('express')
const router = express.Router()
const userController = require('../controllers/userController')
const authMiddleware = require('../middleware/auth')

router.use(authMiddleware)
router.get('/', userController.getUsersByRole)

module.exports = router