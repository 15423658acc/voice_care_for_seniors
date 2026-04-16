const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();
// console.log('HEFENG_HOST 实际值：', process.env.HEFENG_HOST);
// console.log('HEFENG_API_KEY 实际值：', process.env.HEFENG_API_KEY);


// 和风天气配置（请从环境变量读取）
const HEFENG_API_KEY = process.env.HEFENG_API_KEY;      // API Key
const HEFENG_HOST = process.env.HEFENG_HOST    // 专属 Host

/**
 * 获取实时天气（和风天气 V7）
 * GET /geo/v2/city/lookup  城市查询接口
 * GET /v7/weather/{days}   天气预报  3d\7d\10d
 * /v7/historical/weather   历史天气  location date(日期格式为yyyyMMdd，例如date=20260415)
 */
const getCurrentWeather = async (req, res, next) => {
    try {
        const { city } = req.query;
        console.log('[天气] 收到请求，城市：', city);

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

/**
 *
 *
 */


/**
 * 根据经纬度获取聚合天气数据（实时 + 3天预报 + 昨日历史）
 * GET /weather/location?lat=xx&lon=xx
 */
const getWeatherByLocation = async (req, res, next) => {
    try {
        const { lat, lon } = req.query;
        if (!lat || !lon) {
            return res.status(400).json({ code: 400, msg: '请提供经纬度参数 lat 和 lon' });
        }

        // 步骤1：通过经纬度查询城市信息，获取 location_id 和城市名
        const locationStr = `${lon},${lat}`;  // 注意和风格式：经度,纬度
        const searchUrl = `${HEFENG_HOST}/geo/v2/city/lookup`;
        const searchParams = {
            location: locationStr,
            key: HEFENG_API_KEY
        };
        console.log('[天气-定位] 查询城市，参数:', searchParams);

        const searchResp = await axios.get(searchUrl, { params: searchParams, timeout: 5000 });
        if (searchResp.data.code !== '200' || !searchResp.data.location || searchResp.data.location.length === 0) {
            console.error('[天气-定位] 城市查询失败', searchResp.data);
            return res.status(404).json({ code: 404, msg: '未找到该经纬度对应的城市' });
        }

        const locationInfo = searchResp.data.location[0];
        const locationId = locationInfo.id;
        const cityName = locationInfo.name;

        // 步骤2：并发请求实时天气、3天预报、昨日历史
        const nowUrl = `${HEFENG_HOST}/v7/weather/now`;
        const forecastUrl = `${HEFENG_HOST}/v7/weather/3d`;   // 3天预报（包含今天）
        // 昨日日期 yyyyMMdd
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr = yesterdayDate.toISOString().slice(0, 10).replace(/-/g, '');
        const historicalUrl = `${HEFENG_HOST}/v7/historical/weather`;

        const [nowResp, forecastResp, historicalResp] = await Promise.allSettled([
            axios.get(nowUrl, { params: { location: locationId, key: HEFENG_API_KEY }, timeout: 5000 }),
            axios.get(forecastUrl, { params: { location: locationId, key: HEFENG_API_KEY }, timeout: 5000 }),
            axios.get(historicalUrl, { params: { location: locationId, date: yesterdayStr, key: HEFENG_API_KEY }, timeout: 5000 })
        ]);

        // 处理实时天气
        let currentWeather = null;
        if (nowResp.status === 'fulfilled' && nowResp.value.data.code === '200') {
            const now = nowResp.value.data.now;
            currentWeather = {
                city: cityName,
                temperature: now.temp,
                description: now.text,
                humidity: now.humidity
            };
        } else {
            console.error('[天气-定位] 实时天气获取失败');
            return res.status(500).json({ code: 500, msg: '实时天气数据获取失败' });
        }

        // 处理3天预报
        let forecast = [];
        if (forecastResp.status === 'fulfilled' && forecastResp.value.data.code === '200') {
            const daily = forecastResp.value.data.daily;
            // daily 通常包含今天、明天、后天共3天
            forecast = daily.slice(0, 3).map(day => ({
                date: day.fxDate,
                textDay: day.textDay,
                tempMax: day.tempMax,
                tempMin: day.tempMin
            }));
        } else {
            console.warn('[天气-定位] 预报数据获取失败，返回空数组');
        }

        // 处理昨日历史（如果失败则返回 null）
        let yesterdayWeather = null;
        if (historicalResp.status === 'fulfilled' && historicalResp.value.data.code === '200') {
            const history = historicalResp.value.data.daily;
            if (history && history.length > 0) {
                const y = history[0];
                yesterdayWeather = {
                    date: y.date,
                    textDay: y.textDay,
                    tempMax: y.tempMax,
                    tempMin: y.tempMin
                };
            }
        } else {
            console.warn('[天气-定位] 历史天气获取失败（可能未订阅），忽略');
        }

        // 返回聚合数据
        res.json({
            code: 200,
            data: {
                current: currentWeather,
                forecast: forecast,
                yesterday: yesterdayWeather
            }
        });
    } catch (error) {
        console.error('[天气-定位] 请求失败：', error.message);
        if (error.response) {
            console.error('[天气-定位] 错误详情：', error.response.data);
        }
        res.status(500).json({ code: 500, msg: '天气服务暂时不可用，请稍后重试' });
    }
};

module.exports = {
    getCurrentWeather,
    getWeatherByLocation   // 导出新方法
};






// module.exports = {
//     getCurrentWeather
// };




