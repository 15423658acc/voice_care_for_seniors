<template>
  <div class="weather">
    <h1 class="page-title">☀️ 实时天气</h1>

    <!-- ========== 原有手动查询区域（完全保留） ========== -->
    <div class="city-selector">
      <label for="city">城市：</label>
      <input id="city" v-model="city" type="text" placeholder="输入城市名" class="city-input" />
      <button @click="fetchWeather" class="query-btn" :disabled="loading">查询</button>
    </div>
    <div class="common-cities">
      <button
        v-for="c in commonCities"
        :key="c"
        @click="selectCity(c)"
        class="city-btn"
        :disabled="loading"
      >
        {{ c }}
      </button>
    </div>

    <!-- 原有天气展示（今日天气） -->
    <div v-if="loading" class="weather-info loading">
      <p>加载中...</p>
    </div>
    <div v-else-if="weather" class="weather-info">
      <p class="city">{{ weather.city }}</p>
      <p class="temp">{{ weather.temperature }}°C</p>
      <p class="desc">{{ weather.description }}</p>
      <p class="humidity">相对湿度：{{ weather.humidity }}%</p>
    </div>

    <!-- 原有语音播报按钮 -->
    <button @click="speakWeather" class="speak-btn" :disabled="!weather || loading">
      语音播报（今日）
    </button>

    <!-- ========== 新增：自动定位查天气区域 ========== -->
    <div class="auto-location-section">
      <button
        @click="fetchWeatherByLocation"
        class="auto-location-btn"
        :disabled="locationLoading"
      >
        📍 自动定位查天气
      </button>
      <p v-if="locationError" class="error small">{{ locationError }}</p>
    </div>

    <!-- ========== 新增：3天预报 + 昨日历史展示 ========== -->
    <div v-if="extendedWeather" class="extended-weather">
      <!-- 3天预报 -->
      <div class="forecast-section">
        <h3>📅 未来3天天气</h3>
        <div class="forecast-list">
          <div v-for="day in extendedWeather.forecast" :key="day.date" class="forecast-card">
            <div class="date">{{ formatDate(day.date) }}</div>
            <div class="temp">{{ day.tempMax }}° / {{ day.tempMin }}°</div>
            <div class="desc">{{ day.textDay }}</div>
          </div>
        </div>
      </div>

      <!-- 昨日历史 -->
      <div class="yesterday-section" v-if="extendedWeather.yesterday">
        <h3>📆 昨日天气回顾</h3>
        <div class="yesterday-card">
          <div class="date">{{ formatDate(extendedWeather.yesterday.date) }}</div>
          <div class="temp">最高 {{ extendedWeather.yesterday.tempMax }}° / 最低 {{ extendedWeather.yesterday.tempMin }}°</div>
          <div class="desc">{{ extendedWeather.yesterday.textDay }}</div>
        </div>
      </div>

      <!-- 完整语音播报按钮 -->
      <button @click="speakFullWeather" class="speak-full-btn" v-if="extendedWeather">
        🔊 播报完整天气
      </button>
    </div>

    <!-- 错误信息展示 -->
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import api from '@/api'
import { getCachedLocation, updateLocationCacheSilently } from '@/utils/location'  // 导入定位工具

// ========== 原有数据 ==========
const city = ref('章丘')
const weather = ref(null)
const error = ref('')
const loading = ref(false)
const commonCities = ['济南', '上海','北京','广州', '深圳', '成都', '杭州']

// ========== 新增数据 ==========
const extendedWeather = ref(null)      // 存储扩展天气（预报+历史）
const locationLoading = ref(false)     // 定位查天气的加载状态
const locationError = ref('')          // 定位错误信息

// ========== 原有函数（未改动） ==========
const selectCity = (selectedCity) => {
  if (loading.value) return
  city.value = selectedCity
  fetchWeather()
}

const fetchWeather = async () => {
  if (!city.value) return
  error.value = ''
  loading.value = true
  extendedWeather.value = null // 清空旧预报

  try {
    const res = await api.get('/weather/current', {
      params: { city: city.value }
    })
    // console.log(res);
    weather.value = res

    // 2. 关键：再调用定位风格的接口，拿预报和昨日天气
    // 接口：/weather/location 但传 city，后端一般支持
    const extRes = await api.get('/weather/location', {
      params: { city: city.value }
    })

    // 把预报和历史赋值
    extendedWeather.value = {
      forecast: extRes.forecast,
      yesterday: extRes.yesterday
    }

    // 播报完整天气
    speakFullWeather()
    // speakWeather()
  } catch (err) {
    error.value = '获取天气失败，请重试'
    console.error(err)
    weather.value = null
  } finally {
    loading.value = false
  }
}


const speakWeather = () => {
  if (!weather.value) return
  const text = `${weather.value.city}，当前温度${weather.value.temperature}度，${weather.value.description}，湿度${weather.value.humidity}%`
  speak(text)
}

// ========== 新增函数 ==========
/**
 * 自动定位查天气
 * 1. 从 sessionStorage 读取缓存的经纬度
 * 2. 若缓存不存在则重新获取
 * 3. 调用后端新接口获取聚合数据
 * 4. 展示扩展天气并自动完整播报
 */
const fetchWeatherByLocation = async () => {
  locationError.value = ''
  locationLoading.value = true
  extendedWeather.value = null   // 清空旧扩展数据

  try {
    // 获取缓存的经纬度
    let cached = getCachedLocation()
    if (!cached) {
      // 缓存不存在，尝试重新获取（静默，不覆盖原缓存逻辑）
      await updateLocationCacheSilently()
      cached = getCachedLocation()
      if (!cached) {
        throw new Error('无法获取您的位置，请检查定位权限或手动输入城市')
      }

    }

    const { latitude, longitude } = cached
    // 调用后端新接口
    const res = await api.get('/weather/location', {
      params: { lat: latitude, lon: longitude }
    })
    // console.log(res);
    // res 结构: { code, data: { current, forecast, yesterday } }
    // if (res.code !== 200) {
    //   throw new Error(res.msg)
    // }
    

    // 将实时天气赋值给原有的 weathe
    weather.value = res.current
    // 存储扩展数据（预报+历史）
    extendedWeather.value = {
      forecast: res.forecast,
      yesterday: res.yesterday
    }
    // 自动进行完整语音播报
    speakFullWeather()
  } catch (err) {
    locationError.value = err.message || '定位获取天气失败，请手动查询'
    console.error(err)
  } finally {
    locationLoading.value = false
  }
}

/**
 * 完整语音播报（今日 + 3天预报 + 昨日历史）
 */
const speakFullWeather = () => {
  if (!weather.value || !extendedWeather.value) return
  
  let text = `今日天气：${weather.value.city}，${weather.value.description}，温度${weather.value.temperature}度，湿度${weather.value.humidity}%。`
  
  // 未来3天预报
  const forecast = extendedWeather.value.forecast
  if (forecast && forecast.length) {
    text += `未来三天天气预报：`
    forecast.forEach(day => {
      text += `${formatDate(day.date)}，${day.textDay}，最高${day.tempMax}度，最低${day.tempMin}度。`
    })
  }

  // 昨日历史
  const yesterday = extendedWeather.value.yesterday
  if (yesterday) {
    text += `昨日天气回顾：${formatDate(yesterday.date)}，${yesterday.textDay}，最高${yesterday.tempMax}度，最低${yesterday.tempMin}度。`
  }

  speak(text)
}

/**
 * 语音合成（复用原有 speak，增加语速调节）
 */
const speak = (text) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.9
    window.speechSynthesis.speak(utterance)
  }
}

/**
 * 格式化日期 (yyyy-MM-dd 或 mm/dd)
 */
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  // 假设后端返回格式 "2025-04-15"
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return `${parts[1]}月${parts[2]}日`
  }
  return dateStr
}

// 组件挂载后自动查询默认城市（保留原逻辑）
fetchWeather()
</script>

<style scoped>
/* 保留原有样式，新增突出自动定位按钮样式 */
.auto-location-section {
  margin: 20px 0;
  text-align: center;
}
.auto-location-btn {
  background: #4caf50;
  color: white;
  font-size: 1.2rem;
  padding: 12px 24px;
  border: none;
  border-radius: 40px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  transition: transform 0.1s;
}
.auto-location-btn:hover {
  transform: scale(1.02);
  background: #45a049;
}
.auto-location-btn:disabled {
  background: #9e9e9e;
  cursor: not-allowed;
}
.extended-weather {
  margin-top: 24px;
  border-top: 1px solid #ddd;
  padding-top: 16px;
}
.forecast-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: space-between;
}
.forecast-card, .yesterday-card {
  background: #f5f5f5;
  border-radius: 12px;
  padding: 12px;
  flex: 1;
  min-width: 100px;
  text-align: center;
}
.speak-full-btn {
  margin-top: 16px;
  background: #ff9800;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
}
.error.small {
  font-size: 0.8rem;
  color: #f44336;
}
</style>