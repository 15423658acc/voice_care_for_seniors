






const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const HEFENG_API_KEY = process.env.HEFENG_API_KEY;

/**
 * 获取实时天气（和风天气 V7）
 * GET /api/weather/current?city=城市名
 */
const getCurrentWeather = async (req, res, next) => {
    try {
        const { city } = req.query;
        console.log('[天气] 收到请求，城市：', city);

        if (!city) {
            return res.status(400).json({ code: 400, msg: '请提供城市名' });
        }

        // 和风天气实时天气接口
        const url = 'https://devapi.qweather.com/v7/weather/now';
        const params = {
            location: city,   // 直接用中文城市名，和风支持（如“北京”）
            key: HEFENG_API_KEY
        };

        console.log('[天气] 请求和风天气，城市：', city);
        const response = await axios.get(url, { params, timeout: 5000 });

        // 和风返回 code 为 '200' 表示成功
        if (response.data.code !== '200') {
            console.error('[天气] 和风返回错误码：', response.data.code);
            return res.status(404).json({ code: 404, msg: '城市不存在或API错误' });
        }

        const now = response.data.now;
        const weatherInfo = {
            city: city,                       // 使用输入的城市名
            temperature: now.temp,            // 温度（摄氏度）
            description: now.text,            // 天气描述（如“晴”）
            humidity: now.humidity            // 湿度百分比
        };

        console.log('[天气] 获取成功，数据：', weatherInfo);
        res.json({ code: 200, data: weatherInfo });
    } catch (error) {
        console.error('[天气] 请求失败：', error.message);
        if (error.response) {
            // 服务器返回了错误状态码
            const status = error.response.status;
            if (status === 404) {
                return res.status(404).json({ code: 404, msg: '城市不存在' });
            } else if (status === 401) {
                return res.status(500).json({ code: 500, msg: '和风天气授权失败，请检查API Key' });
            } else {
                return res.status(500).json({ code: 500, msg: '天气服务异常' });
            }
        } else if (error.request) {
            // 请求发出但未收到响应（网络问题）
            return res.status(503).json({ code: 503, msg: '天气服务暂时不可用，请稍后重试' });
        } else {
            // 其他错误
            return res.status(500).json({ code: 500, msg: '服务器内部错误' });
        }
    }
};

module.exports = {
    getCurrentWeather
};






// const axios = require('axios')
// const dotenv = require('dotenv')
// dotenv.config()
//
// const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY
//
// const getCurrentWeather = async (req, res, next) =>{
//     try {
//         // console.log('=== 完整 query 对象 ===', req.query);
//         const { city } = req.query
//         // console.log('[天气] 收到请求，城市：', city);
//         if (!city) {
//             // console.error('[天气] 缺少城市参数');
//             return res.status(400).json({ code: 400, msg: '请提供城市名' })
//         }
//
//         // 调用 OpenWeatherMap API
//         const url = `https://api.openweathermap.org/data/2.5/weather`
//         const response = await axios.get(url, {
//             params: {
//                 q: city,
//                 appid: OPENWEATHER_API_KEY,
//                 units: 'metric',
//                 lang: 'zh_cn'
//             }
//
//         })
//
//         const data = response.data
//         const weatherInfo = {
//             city: data.name,
//             temperature: data.main.temp,
//             description: data.weather[0].description,
//             humidity: data.main.humidity
//         }
//
//         res.json({ code: 200, data: weatherInfo })
//     } catch (error) {
//         if (error.response && error.response.status === 404) {
//             return res.status(404).json({ code: 404, msg: '城市不存在' })
//         }
//         next(error)
//     }
// }
//
// module.exports = {
//     getCurrentWeather
// }