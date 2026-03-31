const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();
// console.log('HEFENG_HOST 实际值：', process.env.HEFENG_HOST);
// console.log('HEFENG_API_KEY 实际值：', process.env.HEFENG_API_KEY);


// 和风天气配置（请从环境变量读取）
const HEFENG_API_KEY = process.env.HEFENG_API_KEY;      // 你的 API Key
const HEFENG_HOST = process.env.HEFENG_HOST    // 你的专属 Host，请务必在 .env 中配置

/**
 * 获取实时天气（和风天气 V7）
 * GET /api/weather/current?city=城市名（支持中英文）
 */
const getCurrentWeather = async (req, res, next) => {
    try {
        const { city } = req.query;
        // console.log('[天气] 收到请求，城市：', city);

        if (!city) {
            return res.status(400).json({ code: 400, msg: '请提供城市名' });
        }

        // ---------- 步骤1：通过城市名获取 location_id ----------
        const searchUrl = `${HEFENG_HOST}/geo/v2/city/lookup`;
        const searchParams = {
            location: city,      // 支持中文或英文
            key: HEFENG_API_KEY
        };
        console.log('[天气] 搜索城市，URL:', searchUrl, '参数:', searchParams);

        const searchResp = await axios.get(searchUrl, { params: searchParams, timeout: 5000 });

        // 检查搜索响应
        if (searchResp.data.code !== '200') {
            console.error('[天气] 城市搜索失败，响应码：', searchResp.data.code);
            return res.status(404).json({ code: 404, msg: '城市不存在，请检查输入' });
        }

        const locations = searchResp.data.location;
        if (!locations || locations.length === 0) {
            console.error('[天气] 未找到匹配的城市');
            return res.status(404).json({ code: 404, msg: '城市不存在，请检查输入' });
        }

        // 取第一个匹配结果（最相关）
        const locationId = locations[0].id;
        const cityName = locations[0].name;      // 使用 API 返回的标准城市名
        console.log('[天气] 匹配到城市：', cityName, 'ID:', locationId);

        // ---------- 步骤2：获取实时天气 ----------
        const weatherUrl = `${HEFENG_HOST}/v7/weather/now`;
        const weatherParams = {
            location: locationId,
            key: HEFENG_API_KEY
        };
        console.log('[天气] 请求实时天气，URL:', weatherUrl, '参数:', weatherParams);

        const weatherResp = await axios.get(weatherUrl, { params: weatherParams, timeout: 5000 });

        if (weatherResp.data.code !== '200') {
            console.error('[天气] 天气数据获取失败，响应码：', weatherResp.data.code);
            return res.status(500).json({ code: 500, msg: '天气数据获取失败，请稍后重试' });
        }

        const now = weatherResp.data.now;
        const weatherInfo = {
            city: cityName,                     // 使用 API 返回的标准城市名
            temperature: now.temp,              // 温度（摄氏度）
            description: now.text,              // 天气描述（如“晴”）
            humidity: now.humidity              // 湿度百分比
        };

        // console.log('[天气] 获取成功：', weatherInfo);
        res.json({ code: 200, data: weatherInfo });
    } catch (error) {
        console.error('[天气] 请求失败：', error.message);
        // 详细打印错误响应（如果有）
        if (error.response) {
            console.error('[天气] 错误响应数据：', error.response.data);
            console.error('[天气] 错误状态码：', error.response.status);
        }
        // 返回友好提示
        res.status(500).json({ code: 500, msg: '天气服务暂时不可用，请稍后重试' });
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