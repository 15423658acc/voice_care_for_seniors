<template>
  <div class="home">
    <!-- 右上角跳转管理端按钮 -->
    <button class="admin-redirect-btn" @click="handleGoAdmin">🔧 跳转管理端</button>

    <!-- 紧急呼救超大按钮区域 -->
    <div class="emergency-section">
      <button
        ref="emergencyBtn"
        class="emergency-mega-btn"
        :class="{ shaking: isShaking }"
        @mousedown="startEmergency"
        @mouseup="cancelEmergencyByUser"
        @mouseleave="cancelEmergencyByUser"
        @touchstart="startEmergency"
        @touchend="cancelEmergencyByUser"
        @touchcancel="cancelEmergencyByUser"
      >
        🚨 紧急呼救
      </button>
      <p v-if="countdown > 0" class="countdown-text">
        将在 {{ countdown }} 秒后自动呼救
      </p>
      <button
        v-if="showCancelBtn"
        class="cancel-btn"
        @click="cancelEmergencyFinal"
      >
        ❌ 取消
      </button>
      <p v-if="statusText" class="status-text">{{ statusText }}</p>
    </div>

    <h1 class="welcome">老友助手</h1>
    <div class="grid">
      <router-link to="/reminder" class="card reminder">💊 吃药提醒</router-link>
      <router-link to="/antifraud" class="card fraud">🛡️ 防诈骗</router-link>
      <router-link to="/weather" class="card weather">☀️ 天气</router-link>
      <router-link to="/voiceAssistant" class="card voice">🎤 语音助手</router-link>
      <router-link to="/healthRecords" class="card health">📋 健康记录</router-link>
      <router-link to="/profile" class="card profile">👤 个人中心</router-link>
    </div>
    <button class="logout-btn" @click="handleLogout">🚪 退出登录</button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  updateLocationCacheSilently,
  getCachedLocation,
} from '@/utils/location';

const router = useRouter();

// ---------- 紧急呼救相关状态 ----------
const isShaking = ref(false);
const countdown = ref(0);
const statusText = ref('');
const showCancelBtn = ref(false);

let countdownTimer = null;
let beepTimer = null;
let beepAudio = null;

// 配置常量
const COUNTDOWN_SECONDS = 3;
const EMERGENCY_PHONE = '19707092146';   // 预设紧急号码
const MAX_RETRY = 2;                     // 后台发送重试次数（仅用于 fetch）

// ---------- 语音播报（适老化）----------
const speakText = (text) => {
  if (!('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';
  utterance.rate = 0.9;
  utterance.volume = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
};

// 获取老人姓名
const getElderName = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.fullName || user.username || '老人';
    }
  } catch (e) {}
  return '老人';
};

// ---------- 清理 UI 状态（倒计时结束后调用）----------
const clearEmergencyUI = () => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  if (beepAudio) {
    beepAudio.pause();
    beepAudio.currentTime = 0;
    beepAudio = null;
  }
  countdown.value = 0;
  showCancelBtn.value = false;
  isShaking.value = false;
  // 不清空 statusText，因为后续会设置新的状态文字
};

/* 
后台发送（加入 Token 认证）-向两个后端接口发送数据：邮件通知子女 + 记录日志。
使用 keepalive: true 确保页面关闭后请求仍能发出。位置信息来自缓存的经纬度。
*/
const sendEmergencyToBackend = (locationData) => {
  // 1. 获取 Token（与项目原有存储 key 保持一致，通常是 'token'）
  const token = localStorage.getItem('token');
  // 2. 构建地图链接
  const mapLink = `https://uri.amap.com/marker?position=${locationData.longitude},${locationData.latitude}&name=老人当前位置&coordinate=wgs84`;

  const emailBody = {
    location: { latitude: locationData.latitude, longitude: locationData.longitude},
    address: mapLink,
    elderName: getElderName(),
  };

  const logBody = { latitude: locationData.latitude, longitude: locationData.longitude,location: mapLink  };

  // 公共请求头
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;  // 根据后端实际要求调整格式（可能为 'token' 值）
  }

  // 发送邮件请求
  fetch('/api/emergency/send', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(emailBody),
    keepalive: true,
  }).catch(err => console.warn('邮件接口发送失败', err));

  // 发送日志请求
  fetch('/api/emergency-logs', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(logBody),
    keepalive: true,
  }).catch(err => console.warn('日志接口发送失败', err));
};

// 核心：执行紧急呼救（倒计时结束调用）--关键：第一行必须是同步拨号，不能有任何 await 或异步操作
const executeEmergency = () => {
  // 1. 立即清理 UI 状态（隐藏取消按钮、停止抖动、清零倒计时）
  clearEmergencyUI();
  // 2. 同步拨号（Safari 允许）
  window.location.href = `tel:${EMERGENCY_PHONE}`;

  // 3. 读取缓存位置
  const cached = getCachedLocation();
  if (!cached) {
    console.error('无位置缓存');
    statusText.value = '已拨号，但位置获取失败';
    speakText('已拨号，但位置获取失败');
    // 发送空位置数据（仍尝试通知子女）
    sendEmergencyToBackend({ latitude: 0, longitude: 0 });
    return;
  }

  // 4. 后台发送（使用 keepalive + token）
  sendEmergencyToBackend({
    latitude: cached.latitude,
    longitude: cached.longitude,
  });

  // 5. 更新状态文字（拨号后可能很快切后台，但保留）
  statusText.value = '已拨号并通知子女，请保持电话畅通';
  speakText('已拨号');
};

// ---------- 倒计时逻辑 ----------
const startEmergency = () => {
  if (countdownTimer) return; // 防止重复启动

  if (navigator.vibrate) navigator.vibrate(50);

  statusText.value = '';
  isShaking.value = true;
  showCancelBtn.value = true;
  countdown.value = COUNTDOWN_SECONDS;

  speakText(`呼救将发出，取消请点击红色取消按钮`);

  // 蜂鸣音
  beepAudio = new Audio('/sounds/beep.mp3');
  beepAudio.loop = true;
  beepAudio.play().catch(() => {});

  // 启动倒计时定时器
  countdownTimer = setInterval(() => {
    countdown.value -= 1;
    if (countdown.value <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      if (beepAudio) {
        beepAudio.pause();
        beepAudio.currentTime = 0;
        beepAudio = null;
      }
      // 倒计时结束，执行紧急呼救
      executeEmergency();
    }
  }, 1000);
};

// 用户松手或移出按钮（仅停止抖动，倒计时继续）
const cancelEmergencyByUser = () => {
  isShaking.value = false;
};

// 用户主动点击取消按钮
const cancelEmergencyFinal = () => {
  clearEmergencyUI();  // 复用清理函数
  statusText.value = '已取消呼救';
  speakText('呼救已取消');
};

// 清理定时器
const clearTimers = () => {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  if (beepTimer) {
    clearInterval(beepTimer);
    beepTimer = null;
  }
};

// ---------- 位置预缓存逻辑 ----------
let locationUpdateInterval = null;

onMounted(async () => {
  // 1. 进入页面立即静默获取位置并缓存
  await updateLocationCacheSilently();
  // 2. 每 30 分钟更新一次缓存
  locationUpdateInterval = setInterval(() => {
    updateLocationCacheSilently();
  }, 30 * 60 * 1000);
});

onUnmounted(() => {
  clearTimers();
  if (beepAudio) {
    beepAudio.pause();
    beepAudio = null;
  }
  window.speechSynthesis.cancel();
  // 清除位置更新定时器
  if (locationUpdateInterval) {
    clearInterval(locationUpdateInterval);
    locationUpdateInterval = null;
  }
});

// ---------- 退出登录与跳转管理端 ----------
const handleLogout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  alert('您已安全退出登录');
  router.push('/elder/login');
};

const handleGoAdmin = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  alert('已退出老人端，正在跳转管理端登录页...');
  router.push('/admin/login');
};
</script>



<style scoped>
/* 样式与原来保持一致，仅作微调确保适老化 */
.home {
  position: relative;
  padding: 1rem;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.emergency-section {
  text-align: center;
  margin-bottom: 1.5rem;
}
.emergency-mega-btn {
  width: 90%;
  max-width: 400px;
  height: 140px;
  background-color: #FF2B2B;
  color: white;
  font-size: 38px;
  font-weight: bold;
  border: none;
  border-radius: 70px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition: transform 0.1s;
  user-select: none;
  touch-action: manipulation;
  margin: 0 auto;
  display: block;
}
.shaking {
  animation: shake 0.1s infinite;
}
@keyframes shake {
  0% { transform: translate(1px, 1px) rotate(0deg); }
  25% { transform: translate(-1px, -2px) rotate(-1deg); }
  50% { transform: translate(-3px, 0px) rotate(1deg); }
  75% { transform: translate(3px, 2px) rotate(0deg); }
  100% { transform: translate(1px, -1px) rotate(1deg); }
}
.countdown-text {
  font-size: 22px;
  color: #d32f2f;
  margin: 10px 0 5px;
  font-weight: bold;
}
.cancel-btn {
  background-color: #ffffff;
  color: #FF2B2B;
  border: 3px solid #FF2B2B;
  border-radius: 50px;
  font-size: 28px;
  padding: 10px 30px;
  margin-top: 10px;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}
.cancel-btn:active {
  background-color: #FF2B2B;
  color: white;
}
.status-text {
  font-size: 22px;
  color: #333;
  margin-top: 15px;
  font-weight: 500;
}
.welcome {
  font-size: 2.2rem;
  text-align: center;
  margin: 1rem 0 1.5rem;
}
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  flex: 1;
}
.card {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f0f0;
  padding: 1.8rem 0.5rem;
  font-size: 1.8rem;
  text-decoration: none;
  color: #333;
  border-radius: 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  min-height: 130px;
  text-align: center;
}
.reminder { background-color: #e8f5e8; color: #2e7d32; }
.voice { background-color: #fff3e0; color: #ef6c00; }
.fraud { background-color: #ede7f6; color: #512da8; }
.weather { background-color: #e1f5fe; color: #0277bd; }
.health { background-color: #fce4ec; color: #c2185b; }
.admin-redirect-btn {
  position: fixed;
  top: 1rem;
  right: 1rem;
  background-color: #2196f3;
  color: white;
  font-size: 1.4rem;
  padding: 0.8rem 1.2rem;
  border: none;
  border-radius: 2rem;
  cursor: pointer;
  z-index: 100;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}
.logout-btn {
  position: fixed;
  bottom: 1rem;
  left: 1rem;
  background-color: #f44336;
  color: white;
  font-size: 1.4rem;
  padding: 0.8rem 1.2rem;
  border: none;
  border-radius: 2rem;
  cursor: pointer;
  z-index: 100;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}
</style>