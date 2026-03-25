const express = require('express')
const router = express.Router()
const weatherController = require('../controllers/weatherController')

// 获取天气信息
router.get('/current', weatherController.getCurrentWeather)

module.exports = router