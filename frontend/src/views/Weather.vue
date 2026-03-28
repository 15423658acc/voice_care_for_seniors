<template>
  <div class="weather">
    <h1 class="page-title">☀️ 实时天气</h1>
    <div class="city-selector">
      <label for="city">城市：</label>
      <input id="city" v-model="city" type="text" placeholder="输入城市名" class="city-input" />
      <button @click="fetchWeather" class="query-btn">查询</button>
    </div>
    <div v-if="weather" class="weather-info">
      <p class="city">{{ weather.city }}</p>
      <p class="temp">{{ weather.temperature }}°C</p>
      <p class="desc">{{ weather.description }}</p>
      <p class="humidity">湿度：{{ weather.humidity }}%</p>
    </div>
    <button @click="speakWeather" class="speak-btn" :disabled="!weather">
      语音播报
    </button>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import api from '@/api'

const city = ref('北京') // 默认城市
const weather = ref(null)
const error = ref('')

const fetchWeather = async () => {
  if (!city.value) return
  error.value = ''
  try {
    const res = await api.get('/weather/current',{params: { city: city.value } })
    weather.value = res.data
  } catch (err) {
    error.value = '获取天气失败，请重试'
    console.error(err)
  }
}

const speakWeather = () => {
  if (!weather.value) return
  const text = `${weather.value.city}，当前温度${weather.value.temperature}度，${weather.value.description}，湿度${weather.value.humidity}%`
  speak(text)
}

const speak = (text) => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.9
    window.speechSynthesis.speak(utterance)
  }
}

// 组件挂载时自动查询默认城市
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
  margin-bottom: 2rem;
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
.weather-info {
  text-align: center;
  background-color: #e3f2fd;
  padding: 2rem;
  border-radius: 1rem;
  margin-bottom: 2rem;
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
.error {
  color: red;
  font-size: 1.4rem;
  margin-top: 1rem;
}
</style>