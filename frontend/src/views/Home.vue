<template>
  <div class="elder-home">
    <!-- 右上角跳转管理端按钮 -->
    <!-- <button class="admin-redirect-btn" @click="handleGoAdmin">🔧 跳转管理端</button> -->

    <!-- 紧急呼救超大按钮区域 -->
    <div class="emergency-area">
      <button
        ref="emergencyBtn"
        class="emergency-btn"
        :class="{ shaking: isShaking }"
        @mousedown="startEmergency"
        @mouseup="cancelEmergencyByUser"
        @mouseleave="cancelEmergencyByUser"
        @touchstart="startEmergency"
        @touchend="cancelEmergencyByUser"
        @touchcancel="cancelEmergencyByUser"
      >
        <span class="emergency-icon">📞</span>
        <span class="emergency-text">找家人</span>
      </button>
      <p v-if="countdown > 0" class="countdown-tip">
        将在 {{ countdown }} 秒后自动呼救
      </p>
      <button
        v-if="showCancelBtn"
        class="cancel-emergency-btn"
        @click="cancelEmergencyFinal"
      >
        ❌ 取消
      </button>
      <p v-if="statusText" class="status-message">{{ statusText }}</p>
    </div>

    <h2 class="greeting">老友助手</h2>

    <!-- 四格功能卡片 -->
    <div class="feature-grid">
      <router-link to="/reminder" class="feature-card">
        <span class="feature-icon">💊</span>
        <span class="feature-label">吃药提醒</span>
      </router-link>
      <router-link to="/voiceAssistant" class="feature-card">
        <span class="feature-icon">🎤</span>
        <span class="feature-label">语音助手</span>
      </router-link>
      <router-link to="/weather" class="feature-card">
        <span class="feature-icon">☀️</span>
        <span class="feature-label">查天气</span>
      </router-link>
      <router-link to="/healthRecords" class="feature-card">
        <span class="feature-icon">📋</span>
        <span class="feature-label">健康记录</span>
      </router-link>
    </div>

    <!-- 底部操作：管理端入口 + 退出登录，低调并排 -->
    <div class="footer-actions">
      <button @click="handleGoAdmin" class="footer-btn">🔧 管理端</button>
      <button @click="handleLogout" class="footer-btn">🚪 退出</button>
    </div>

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

  let elderId = null;
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      elderId = user.id;   // 确保后端接收到的字段名为 elderId
    }
  } catch (e) {
    console.warn('获取老人ID失败', e);
  }


  const emailBody = {
    location: { latitude: locationData.latitude, longitude: locationData.longitude},
    address: mapLink,
    elderName: getElderName(),
    elderId: elderId,   //从 localStorage 获取老人ID
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
@import '@/assets/elder.css';

.elder-home {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: var(--elder-space-md);
  max-width: 600px;
  margin: 0 auto;
}

/* 紧急区域 */
.emergency-area {
  text-align: center;
  margin: var(--elder-space-lg) 0;
}
.emergency-btn {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #fff1e0;
  border: 5px solid #b85c2c;
  border-radius: 80px;
  padding: var(--elder-space-xl) var(--elder-space-lg);
  box-shadow: var(--elder-shadow-md);
  cursor: pointer;
  touch-action: manipulation;
  transition: all 0.1s;
}
.emergency-btn:active {
  background: #ffe0c0;
  transform: scale(0.98);
}
.emergency-icon {
  font-size: 80px;
  line-height: 1;
  margin-bottom: var(--elder-space-sm);
}
.emergency-text {
  font-size: 56px;
  font-weight: 700;
  color: #7a3e1a;
  letter-spacing: 4px;
}
.shaking {
  animation: shake 0.1s infinite;
}
@keyframes shake {
  0% { transform: translate(1px, 1px) rotate(0deg); }
  25% { transform: translate(-2px, -2px) rotate(-1deg); }
  50% { transform: translate(-4px, 0px) rotate(1deg); }
  75% { transform: translate(4px, 2px) rotate(0deg); }
  100% { transform: translate(2px, -1px) rotate(1deg); }
}
.countdown-tip {
  font-size: var(--elder-fs-xl);
  font-weight: 600;
  color: #b85c2c;
  margin: var(--elder-space-sm) 0;
}
.cancel-emergency-btn {
  background: white;
  border: 4px solid #b85c2c;
  border-radius: 60px;
  font-size: var(--elder-fs-xl);
  font-weight: 700;
  padding: var(--elder-space-md) var(--elder-space-xl);
  color: #b85c2c;
  cursor: pointer;
  margin-top: var(--elder-space-sm);
  width: 100%;
  max-width: 300px;
}
.status-message {
  font-size: var(--elder-fs-large);
  color: var(--elder-text-secondary);
  margin-top: var(--elder-space-md);
}

/* 欢迎语 */
.greeting {
  font-size: var(--elder-fs-2xl);
  text-align: center;
  margin: var(--elder-space-md) 0;
  font-weight: 500;
}

/* 四格卡片 */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--elder-space-md);
  margin: var(--elder-space-lg) 0;
}
.feature-card {
  background: var(--elder-bg-card);
  border: 3px solid var(--elder-border-dark);
  border-radius: var(--elder-radius-lg);
  padding: var(--elder-space-lg) var(--elder-space-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: var(--elder-text-primary);
  box-shadow: var(--elder-shadow-sm);
  transition: all 0.1s;
  min-height: 160px;
}
.feature-card:active {
  background: var(--elder-primary-light);
  transform: scale(0.97);
}
.feature-icon {
  font-size: 64px;
  margin-bottom: var(--elder-space-sm);
}
.feature-label {
  font-size: var(--elder-fs-xl);
  font-weight: 600;
}

/* 底部操作按钮 */
.footer-actions {
  display: flex;
  gap: var(--elder-space-md);
  margin-top: auto;
  padding: var(--elder-space-lg) 0;
}
.footer-btn {
  flex: 1;
  background: transparent;
  border: 2px solid var(--elder-border-dark);
  border-radius: 40px;
  padding: var(--elder-space-sm);
  font-size: var(--elder-fs-large);
  font-weight: 500;
  color: var(--elder-text-secondary);
  cursor: pointer;
  min-height: 56px;
}
.footer-btn:active {
  background: var(--elder-border);
}
</style>