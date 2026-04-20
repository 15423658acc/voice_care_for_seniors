<template>
  <div class="weather">
    <h1 class="page-title">天气</h1>

    <!-- 查询区域：输入框 + 按钮横排 -->
    <div class="search-row">
      <input id="city" v-model="city" type="text" placeholder="输入城市名" class="elder-input search-input" />
      <button @click="fetchWeather" class="elder-btn elder-btn-primary search-btn" :disabled="loading">查询</button>
    </div>

    <!-- 自动定位按钮 -->
    <button
      @click="fetchWeatherByLocation"
      class="elder-btn elder-btn-success auto-locate-btn"
      :disabled="locationLoading"
    >
      📍 自动定位查天气
    </button>
    <p v-if="locationError" class="error-msg">{{ locationError }}</p>

    <div class="city-chips">
      <button
        v-for="c in commonCities"
        :key="c"
        @click="selectCity(c)"
        class="city-chip"
        :disabled="loading"
      >
        {{ c }}
      </button>
    </div>

    <!-- 原有天气展示（今日天气） -->
    <div v-if="loading" class="loading-state">加载中...</div>
    <div v-else-if="weather" class="current-weather">
      <div class="city-name">{{ weather.city }}</div>
      <div class="temperature">{{ weather.temperature }}°</div>
      <div class="weather-desc">{{ weather.description }}</div>
      <div class="humidity">相对湿度 {{ weather.humidity }}%</div>
    </div>

    <!-- ========== 新增：3天预报 + 昨日历史展示 ========== -->
    <div v-if="extendedWeather" class="forecast-section">
      <!-- 3天预报 -->
       <h3>未来三天</h3>
        <div class="forecast-list-vertical">
        <div v-for="day in extendedWeather.forecast" :key="day.date" class="forecast-item">
          <span class="forecast-date">{{ formatDate(day.date) }}</span>
          <span class="forecast-icon">{{ getWeatherIcon(day.textDay) }}</span>
          <span class="forecast-temp">{{ day.tempMax }}° / {{ day.tempMin }}°</span>
          <span class="forecast-text">{{ day.textDay }}</span>
        </div>
      </div>

      <!-- 昨日回顾 -->
      <div v-if="extendedWeather.yesterday" class="yesterday-item">
        <h3>昨日</h3>
        <div class="forecast-item">
          <span class="forecast-date">{{ formatDate(extendedWeather.yesterday.date) }}</span>
          <span class="forecast-icon">{{ getWeatherIcon(extendedWeather.yesterday.textDay) }}</span>
          <span class="forecast-temp">{{ extendedWeather.yesterday.tempMax }}° / {{ extendedWeather.yesterday.tempMin }}°</span>
          <span class="forecast-text">{{ extendedWeather.yesterday.textDay }}</span>
        </div>
      </div>

      <!-- 完整语音播报按钮 -->
      <button @click="speakFullWeather" class="elder-btn elder-btn-warning speak-btn" v-if="extendedWeather">
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

// 图标映射
const getWeatherIcon = (text) => {
  if (text.includes('晴')) return '☀️'
  if (text.includes('云')) return '☁️'
  if (text.includes('雨')) return '🌧️'
  if (text.includes('雪')) return '❄️'
  return '🌤️'
}

// ========== 原有函数 ==========
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
@import '@/assets/elder.css';

.elder-weather {
  max-width: 600px;
  margin: 0 auto;
  padding: var(--elder-space-md);
}
.page-heading {
  font-size: var(--elder-fs-3xl);
  font-weight: 700;
  margin-bottom: var(--elder-space-lg);
  text-align: center;
}

/* 搜索行 */
.search-row {
  display: flex;
  gap: var(--elder-space-sm);
  margin-bottom: var(--elder-space-md);
}
.search-input {
  flex: 1;
}
.search-btn {
  min-width: 100px;
}

/* 自动定位按钮 */
.auto-locate-btn {
  width: 100%;
  margin-bottom: var(--elder-space-md);
}

/* 城市芯片 */
.city-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--elder-space-sm);
  margin-bottom: var(--elder-space-lg);
}
.city-chip {
  background: var(--elder-bg-card);
  border: 2px solid var(--elder-border-dark);
  border-radius: 40px;
  padding: 12px 24px;
  font-size: var(--elder-fs-large);
  font-weight: 600;
  color: var(--elder-text-primary);
  cursor: pointer;
  flex: 0 1 auto;
}
.city-chip:active {
  background: var(--elder-border);
}

/* 当前天气 */
.current-weather {
  text-align: center;
  padding: var(--elder-space-lg) 0;
}
.city-name {
  font-size: var(--elder-fs-2xl);
  font-weight: 600;
  margin-bottom: var(--elder-space-xs);
}
.temperature {
  font-size: 96px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--elder-primary);
}
.weather-desc {
  font-size: var(--elder-fs-xl);
  font-weight: 500;
  margin: var(--elder-space-sm) 0;
}
.humidity {
  font-size: var(--elder-fs-large);
  color: var(--elder-text-secondary);
}

/* 预报区域 */
.forecast-section {
  margin-top: var(--elder-space-xl);
}
.forecast-section h3 {
  font-size: var(--elder-fs-xl);
  margin-bottom: var(--elder-space-md);
}
.forecast-list-vertical {
  display: flex;
  flex-direction: column;
  gap: var(--elder-space-sm);
}
.forecast-item, .yesterday-item .forecast-item {
  display: flex;
  align-items: center;
  gap: var(--elder-space-sm);
  background: var(--elder-bg-card);
  border: 2px solid var(--elder-border);
  border-radius: var(--elder-radius-md);
  padding: var(--elder-space-sm) var(--elder-space-md);
}
.forecast-date {
  font-size: var(--elder-fs-large);
  font-weight: 600;
  min-width: 80px;
}
.forecast-icon {
  font-size: 40px;
  width: 60px;
  text-align: center;
}
.forecast-temp {
  font-size: var(--elder-fs-large);
  font-weight: 700;
  flex: 1;
}
.forecast-text {
  font-size: var(--elder-fs-base);
  color: var(--elder-text-secondary);
}

/* 语音播报按钮 */
.speak-btn {
  width: 100%;
  margin-top: var(--elder-space-lg);
}

.error-msg {
  color: #b85c5c;
  font-size: var(--elder-fs-base);
  margin: var(--elder-space-sm) 0;
}
.loading-state {
  text-align: center;
  font-size: var(--elder-fs-xl);
  padding: var(--elder-space-xl);
}
</style>