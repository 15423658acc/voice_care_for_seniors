const express = require('express')
const router = express.Router()
const weatherController = require('../controllers/weatherController')

// 获取天气信息
router.get('/current', weatherController.getCurrentWeather)

// 新增路由：根据经纬度获取聚合天气
router.get('/location', weatherController.getWeatherByLocation)


module.exports = router