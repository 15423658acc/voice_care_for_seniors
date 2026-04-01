<template>
  <div class="weather">
    <h1 class="page-title">☀️ 实时天气</h1>

    <!-- 城市输入与快捷按钮区 -->
    <div class="city-selector">
      <label for="city">城市：</label>
      <input id="city" v-model="city" type="text" placeholder="输入城市名" class="city-input" />
      <button @click="fetchWeather" class="query-btn" :disabled="loading">查询</button>
    </div>

    <!-- 常用城市快捷按钮，方便老人点击 -->
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

    <!-- 天气信息展示区，包含加载状态 -->
    <div v-if="loading" class="weather-info loading">
      <p>加载中...</p>
    </div>
    <div v-else-if="weather" class="weather-info">
      <p class="city">{{ weather.city }}</p>
      <p class="temp">{{ weather.temperature }}°C</p>
      <p class="desc">{{ weather.description }}</p>
      <p class="humidity">相对湿度：{{ weather.humidity }}%</p>
    </div>

    <!-- 语音播报按钮，仅在天气存在时启用 -->
    <button @click="speakWeather" class="speak-btn" :disabled="!weather || loading">
      语音播报
    </button>

    <!-- 错误信息展示 -->
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import api from '@/api'

// 响应式数据
const city = ref('北京')          // 当前输入/选择的城市
const weather = ref(null)         // 存储天气数据
const error = ref('')             // 错误信息
const loading = ref(false)        // 加载状态（请求中为 true）

// 常用城市列表（可根据需要增删）
const commonCities = ['北京', '上海', '广州', '深圳', '成都', '杭州']

/**
 * 选择常用城市
 * @param {string} selectedCity 城市名
 */
const selectCity = (selectedCity) => {
  if (loading.value) return       // 如果正在请求中，忽略点击
  city.value = selectedCity
  fetchWeather()                  // 立即查询
}

/**
 * 获取天气数据
 * 调用后端接口 /api/weather/current?city=xxx
 */
const fetchWeather = async () => {
  if (!city.value) return
  error.value = ''                // 清空旧错误
  loading.value = true            // 开始加载

  try {
    // 发送 GET 请求，参数通过 params 传递
    const res = await api.get('/weather/current', {
      params: { city: city.value }
    })
    // 响应拦截器已返回 res.data（即天气对象），直接赋值
    weather.value = res

    // 查询成功后自动语音播报（在用户交互后调用，浏览器允许）
    speakWeather()
  } catch (err) {
    error.value = '获取天气失败，请重试'
    console.error(err)
    weather.value = null          // 清空旧数据
  } finally {
    loading.value = false         // 请求结束（无论成功或失败）
  }
}

/**
 * 语音播报当前天气
 */
const speakWeather = () => {
  if (!weather.value) return
  const text = `${weather.value.city}，当前温度${weather.value.temperature}度，${weather.value.description}，湿度${weather.value.humidity}%`
  speak(text)
}

/**
 * 语音合成函数
 * @param {string} text 要播报的文字
 */
const speak = (text) => {
  if ('speechSynthesis' in window) {
    // 如果已有未完成的播报，先取消，避免重叠（可选）
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'      // 中文
    utterance.rate = 0.9          // 语速稍慢，适合老人
    window.speechSynthesis.speak(utterance)
  }
}

// 组件挂载后自动查询默认城市（北京）
fetchWeather()
</script>

<style scoped>
.weather {
  padding: 1rem;
}
.city-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-size: 1.6rem;
}
.city-input {
  flex: 1;
  padding: 1rem;
  font-size: 1.6rem;
  border: 1px solid #ccc;
  border-radius: 0.5rem;
}
.query-btn {
  background-color: #2196f3;
  color: white;
  padding: 1rem 2rem;
  font-size: 1.6rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
}
.query-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
.common-cities {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  margin-bottom: 2rem;
}
.city-btn {
  background-color: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 2rem;
  padding: 0.8rem 1.5rem;
  font-size: 1.4rem;
  cursor: pointer;
  transition: all 0.2s;
}
.city-btn:hover {
  background-color: #e0e0e0;
}
.city-btn:disabled {
  background-color: #f9f9f9;
  cursor: not-allowed;
  opacity: 0.6;
}
.weather-info {
  text-align: center;
  background-color: #e3f2fd;
  padding: 2rem;
  border-radius: 1rem;
  margin-bottom: 2rem;
}
.weather-info.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 150px;
  font-size: 1.8rem;
  color: #666;
}
.city {
  font-size: 2rem;
  font-weight: bold;
}
.temp {
  font-size: 4rem;
  font-weight: bold;
  color: #ff5722;
}
.desc {
  font-size: 2rem;
  color: #333;
}
.humidity {
  font-size: 1.6rem;
  color: #666;
}
.speak-btn {
  background-color: #4caf50;
  color: white;
  font-size: 2rem;
  padding: 1.5rem;
  border: none;
  border-radius: 1rem;
  width: 100%;
  cursor: pointer;
}
.speak-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
.error {
  color: red;
  font-size: 1.4rem;
  margin-top: 1rem;
}
</style>