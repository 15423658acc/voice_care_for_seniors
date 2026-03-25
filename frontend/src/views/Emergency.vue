<!-- 紧急呼叫 -->

<template>
  <div class="emergency-container">
    <!-- 适老化：红色大按钮，长按触发 -->
    <button
      class="emergency-btn"
      @mousedown="startPress"
      @mouseup="cancelPress"
      @mouseleave="cancelPress"
      @touchstart="startPress"
      @touchend="cancelPress"
      @touchcancel="cancelPress"
    >
      🚨 紧急呼叫
    </button>
    <p v-if="countdown > 0" class="countdown">松手取消（{{ countdown }}秒）</p>
    <p v-if="status" class="status">{{ status }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import api from '@/api' // 导入封装好的axios实例

// 长按计时相关
const pressTimer = ref(null)
const countdown = ref(0)
const status = ref('')
const LONG_PRESS_TIME = 3000 // 长按3秒触发
const EMERGENCY_PHONE = '19707092146' // 紧急电话，从配置读取
const EMERGENCY_EMAIL = 's789_2023@foxmail.com' // 紧急邮箱，从后端获取

// 开始按压
const startPress = () => {
  // 适老化：震动反馈（如果支持）
  if (navigator.vibrate) navigator.vibrate(50)
  // 设置计时器，每100ms更新倒计时显示
  const startTime = Date.now()
  pressTimer.value = setInterval(() => {
    const elapsed = Date.now() - startTime
    const remaining = Math.max(0, (LONG_PRESS_TIME - elapsed) / 1000)
    countdown.value = remaining.toFixed(1)
    if (elapsed >= LONG_PRESS_TIME) {
      // 长按达到阈值，触发紧急呼叫
      clearInterval(pressTimer.value)
      pressTimer.value = null
      countdown.value = 0
      triggerEmergency()
    }
  }, 100)
}

// 取消按压（松手或离开按钮）
const cancelPress = () => {
  if (pressTimer.value) {
    clearInterval(pressTimer.value)
    pressTimer.value = null
    countdown.value = 0
  }
}

// 触发紧急呼叫
const triggerEmergency = async () => {
  status.value = '正在获取位置...'


  // 性能优化测试代码
//   try{
//     let position
//     try {
//       position = await getCurrentPosition()
//     } catch(locError) {
//       if (locError.code === locError.TIMEOUT) {
//         throw new Error('获取位置超时，请检查网络或开启定位权限')
//       } else if (locError.code === locError.PERMISSION_DENIED) {
//         throw new Error('您拒绝了定位权限，无法发送位置信息')
//       } else {
//         throw new Error(`获取位置失败：${locError.message}`)
//       }
//     }
//      const { latitude, longitude } = position.coords
//     const mapLink = `https://uri.amap.com/marker?position=${longitude},${latitude}&name=老人当前位置`
//     // 2. 调用后端接口（单独设置axios超时，并捕获接口超时）
//     status.value = '正在发送紧急邮件...'
//     try {
//       // 给接口请求单独设置超时（和定位超时区分）
//       await api.post('/emergency/send', {
//         location: { latitude, longitude },
//         address: mapLink
//       }, {
//         timeout: 15000 // 接口超时设为15s，和定位的10s区分
//       })
//     } catch (apiError) {
//       if (apiError.code === 'ECONNABORTED') {
//         throw new Error('发送邮件请求超时，后端响应过慢')
//       } else {
//         throw new Error(`发送邮件失败：${apiError.response?.data?.msg || apiError.message}`)
//       }
//     }
    
//     // 3. 触发拨号
//     window.location.href = `tel:${EMERGENCY_PHONE}`
//     status.value = '紧急呼叫已发出！'
//   } catch (error) {
//     console.error('紧急呼叫失败', error)
//     status.value = error.message // 显示具体的超时/错误原因
//   }
// }




// 原代码
  try {
    // 1. 获取地理位置
    const position = await getCurrentPosition()

    const { latitude, longitude } = position.coords
    // 生成地图链接（这里使用高德地图）
    const mapLink = `https://uri.amap.com/marker?position=${longitude},${latitude}&name=老人当前位置`
    
    // 2. 调用后端接口发送邮件
    await api.post('/emergency/send', {
      location: { latitude, longitude },
      address: `https://uri.amap.com/marker?position=${longitude},${latitude}`
    })
    
    // 3. 触发拨号
    window.location.href = `tel:${EMERGENCY_PHONE}`
    
    status.value = '紧急呼叫已发出！'
  } catch (error) {
    console.error('紧急呼叫失败', error)
    status.value = '呼叫失败，请检查网络或权限'
  }
}

// 封装获取位置的Promise
const getCurrentPosition = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('浏览器不支持地理位置'))
    } else {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        // timeout: 10000,
        timeout: 8000,
        maximumAge: 0
      })
    }
  })
}
</script>

<style scoped>
.emergency-container {
  text-align: center;
  padding: 3px;
}
.emergency-btn {
  background-color: #ff4444;
  color: white;
  font-size: 20px; /* 适老化：大字体 */
  padding: 5 5px; /* 适老化：大按钮 */
  border: none;
  border-radius: 2px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  cursor: pointer;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  transition: background-color 0.2s;
}
.emergency-btn:active {
  background-color: #cc0000;
  transform: scale(0.98);
}
.countdown {
  font-size: 10px;
  color: #ff4444;
  margin-top: 5px;
}
.status {
  font-size: 10px;
  margin-top: 3px;
}
</style>