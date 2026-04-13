<template>
  <div class="voice-assistant">
    <h1 class="page-title">🎤 语音助手</h1>
    
    <!-- 麦克风按钮（大号，适老化） -->
    <button
      ref="micButton"
      class="voice-btn"
      :class="{ listening: isListening }"
      @click="handleMicClick"
      :disabled="isProcessing"
    >
      <span class="mic-icon">{{ isListening ? '🎙️' : '🎤' }}</span>
      <span class="btn-text">{{ isListening ? '聆听中...' : '点击说话' }}</span>
    </button>
    
    <p class="hint">点击按钮后说话，说完自动停止</p>

    <!-- 识别结果显示区 -->
    <div v-if="recognizedText" class="result-box">
      <p class="label">您说：</p>
      <p class="recognized-text">{{ recognizedText }}</p>
    </div>

    <!-- 助手回复区 -->
    <div v-if="assistantReply" class="reply-box">
      <p class="label">助手回复：</p>
      <p class="reply-text">{{ assistantReply }}</p>
    </div>

    <!-- 反问选项（当匹配模糊时显示可点击选项） -->
    <div v-if="showOptions" class="options-panel">
      <p class="question">{{ clarifyQuestion }}</p>
      <div class="option-buttons">
        <button
          v-for="opt in currentOptions"
          :key="opt.action"
          @click="selectOption(opt.action)"
          class="option-btn"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- 手动输入区域（当麦克风权限被拒绝时显示） -->
    <div v-if="showManualInput" class="manual-input-area">
      <p class="manual-hint">您也可以直接打字告诉我：</p>
      <div class="input-group">
        <input
          v-model="manualText"
          @keyup.enter="submitManualText"
          placeholder="例如：查天气"
          class="manual-input"
        />
        <button @click="submitManualText" class="send-btn">发送</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api'                           // 我们的请求封装
import { levenshtein, calculateConfidence } from '@/utils/levenshtein'
import { generateWeatherAdvice } from '@/utils/weatherHelper'

const router = useRouter()

// ------------------- 响应式数据 -------------------
const isListening = ref(false)          // 是否正在录音
const isProcessing = ref(false)         // 状态锁，防止重复触发
const recognizedText = ref('')          // 识别到的文字
const assistantReply = ref('')          // 助手回复的文字
const showOptions = ref(false)          // 是否显示反问选项
const clarifyQuestion = ref('')         // 反问的问题
const currentOptions = ref([])          // 当前可选项 [{ label, action }]
const showManualInput = ref(false)      // 是否显示手动输入框（权限拒绝时）
const manualText = ref('')              // 手动输入的文本

// 语音识别实例
let recognition = null
// 防抖定时器
let debounceTimer = null
// 存储健康记录数据（用于体检指标查询，只使用前30条）
const healthRecords = ref([])

// ------------------- 关键词词典（扩展体检指标和整体健康） -------------------
const commandDictionary = [
  // 吃药提醒
  { 
    intent: 'medicine', 
    keywords: ['吃药', '药', '吃什么药', '今天吃什么药', '该吃什么药', '我的药'],
    action: 'medicine'
  },
  // 天气查询
  {
    intent: 'weather',
    keywords: ['天气', '温度', '冷不冷', '热不热', '下雨', '下雪', '多少度', '穿什么'],
    action: 'weather'
  },
  // 整体健康（反问）
  {
    intent: 'generalHealth',
    keywords: ['身体', '体检结果', '身体状况', '怎么样', '还好吗', '好不好', '健康'],
    action: 'generalHealth'
  },
  // 骨密度
  {
    intent: 'metric',
    keywords: ['骨密度'],
    metricKey: 'boneDensity'
  },
  // 身高体重
  {
    intent: 'metric',
    keywords: ['身高体重', '身高', '体重'],
    metricKey: 'heightWeight'
  },
  // 血糖
  {
    intent: 'metric',
    keywords: ['血糖', '糖'],
    metricKey: 'bloodSugar'
  },
  // 尿酸
  {
    intent: 'metric',
    keywords: ['尿酸'],
    metricKey: 'uricAcid'
  },
  // 血压
  {
    intent: 'metric',
    keywords: ['血压', '收缩压', '舒张压'],
    metricKey: 'bloodPressure'
  },
  // 总胆固醇
  {
    intent: 'metric',
    keywords: ['胆固醇', '总胆固醇','固醇'],
    metricKey: 'cholesterol'
  },
  // 正常心率
  {
    intent: 'metric',
    keywords: ['心率', '心跳','心脏','心'],
    metricKey: 'heartRate'
  }
]

// 指标名称与数据库 title 的映射表（用于模糊匹配）
const metricTitleMap = {
  boneDensity: ['骨密度'],
  heightWeight: ['身高体重', '身高', '体重'],
  bloodSugar: ['血糖'],
  uricAcid: ['尿酸'],
  bloodPressure: ['血压', '收缩压', '舒张压'],
  cholesterol: ['总胆固醇', '胆固醇'],
  heartRate: ['正常心率', '心率']
}

// ------------------- 防抖函数 -------------------
const debounce = (fn, delay = 300) => {
  return (...args) => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      fn(...args)
      debounceTimer = null
    }, delay)
  }
}

// ------------------- 语音合成（固定语速0.8） -------------------
const speak = (text) => {
  if (!('speechSynthesis' in window)) {
    console.warn('浏览器不支持语音合成')
    return
  }
  // 如果正在播报，先取消
  window.speechSynthesis.cancel()
  
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'zh-CN'
  utterance.rate = 0.8          // 固定慢速
  utterance.pitch = 1.0
  utterance.volume = 1.0
  window.speechSynthesis.speak(utterance)
}

// ------------------- 停止播报并开始识别 -------------------
const cancelSpeechAndStartRecognition = () => {
  window.speechSynthesis.cancel()
  startRecognition()
}

// ------------------- 麦克风按钮点击（带防抖和状态锁） -------------------
const handleMicClick = debounce(() => {
  if (isProcessing.value || isListening.value) return
  
  isProcessing.value = true
  
  if (window.speechSynthesis.speaking) {
    cancelSpeechAndStartRecognition()
    isProcessing.value = false
    return
  }
  
  startRecognition()
}, 300)

// ------------------- 开始语音识别 -------------------
const startRecognition = () => {
  if (!recognition) {
    initRecognition()
  }
  if (!recognition) {
    showManualInput.value = true
    isProcessing.value = false
    return
  }
  
  recognizedText.value = ''
  assistantReply.value = ''
  showOptions.value = false
  
  try {
    recognition.start()
    isListening.value = true
    isProcessing.value = false
  } catch (error) {
    console.error('启动识别失败', error)
    isProcessing.value = false
    isListening.value = false
    try {
      recognition.stop()
      recognition.start()
      isListening.value = true
    } catch (e) {
      showManualInput.value = true
    }
  }
}

// ------------------- 初始化语音识别 -------------------
const initRecognition = () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) {
    alert('您的浏览器不支持语音识别，请使用Chrome浏览器')
    return
  }
  
  recognition = new SpeechRecognition()
  recognition.lang = 'zh-CN'
  recognition.continuous = false
  recognition.interimResults = false
  recognition.maxAlternatives = 1

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript
    recognizedText.value = transcript
    processCommand(transcript)
  }

  recognition.onerror = (event) => {
    console.error('识别错误', event.error)
    isListening.value = false
    isProcessing.value = false
    
    if (event.error === 'not-allowed') {
      showManualInput.value = true
      assistantReply.value = '麦克风权限被拒绝，您可以通过下方输入框打字告诉我'
      speak(assistantReply.value)
    } else {
      assistantReply.value = '抱歉，我没听清，请再试一次'
      speak(assistantReply.value)
    }
  }

  recognition.onend = () => {
    isListening.value = false
    isProcessing.value = false
  }
}

// ------------------- 处理语音指令（核心逻辑） -------------------
const processCommand = (text) => {
  const lowerText = text.toLowerCase().trim()
  
  // 第一步：模糊匹配意图，计算置信度
  let bestMatch = null
  let maxConfidence = 0
  
  for (const cmd of commandDictionary) {
    for (const kw of cmd.keywords) {
      if (lowerText.includes(kw)) {
        const conf = calculateConfidence(lowerText, kw)
        if (conf > maxConfidence) {
          maxConfidence = conf
          bestMatch = cmd
        }
      }
    }
  }
  
  // 如果没有直接包含关键词，计算编辑距离
  if (!bestMatch) {
    let minDistance = Infinity
    for (const cmd of commandDictionary) {
      for (const kw of cmd.keywords) {
        const distance = levenshtein(lowerText, kw)
        if (distance < minDistance) {
          minDistance = distance
          bestMatch = cmd
        }
      }
    }
    if (minDistance > 5) {
      bestMatch = null
    }
  }
  
  // 置信度过低或未匹配，触发反问
  if (!bestMatch || maxConfidence < 0.3) {
    triggerClarification()
    return
  }
  
  // 根据意图执行操作
  if (bestMatch.intent === 'metric') {
    handleHealthMetric(bestMatch.metricKey, text)
  } else if (bestMatch.intent === 'generalHealth') {
    handleGeneralHealth()
  } else {
    executeIntent(bestMatch.action, text)
  }
}

// ------------------- 触发反问机制 -------------------
const triggerClarification = () => {
  const options = [
    { label: '查天气', action: 'weather' },
    { label: '今天吃什么药', action: 'medicine' },
    { label: '查体检结果', action: 'generalHealth' }
  ]
  
  clarifyQuestion.value = '你是想查天气，还是想知道今天吃什么药，还是查体检结果？'
  currentOptions.value = options
  showOptions.value = true
  
  assistantReply.value = clarifyQuestion.value
  speak(clarifyQuestion.value)
}

// ------------------- 执行原有意图（天气、吃药） -------------------
const executeIntent = async (action, originalText) => {
  showOptions.value = false
  
  switch (action) {
    case 'medicine':
      await handleMedicine()
      break
    case 'weather':
      await handleWeather(originalText)
      break
    default:
      assistantReply.value = '我暂时还听不懂这个指令哦'
      speak(assistantReply.value)
  }
}

// ------------------- 1. 吃药提醒指令（保持原样） -------------------
const handleMedicine = async () => {
  try {
    const res = await api.get('/reminders/today')
    const reminders = res || []
    const notTaken = reminders.filter(r => !r.taken)
    
    if (notTaken.length === 0) {
      assistantReply.value = '今天没有需要吃的药了，真棒！'
      speak(assistantReply.value)
      return
    }
    
    notTaken.sort((a, b) => a.remindAt.localeCompare(b.remindAt))
    const nextMedicine = notTaken[0]
    const medicineName = nextMedicine.medicine || '药品'
    assistantReply.value = `你今天还没吃${medicineName}，不要提前吃哦，到时间系统会自动提醒你。`
    speak(assistantReply.value)
  } catch (error) {
    assistantReply.value = '暂时无法获取用药信息，请稍后再试'
    speak(assistantReply.value)
  }
}

// ------------------- 2. 天气查询指令（保持原样） -------------------
const handleWeather = async (text) => {
  try {
    let city = '北京'
    const cityMatch = text.match(/([\u4e00-\u9fa5]{2,}市?)/)
    if (cityMatch) {
      city = cityMatch[1].replace('市', '')
    }
    
    const res = await api.get('/weather/current', { params: { city } })
    // const weatherData = res.data
    const weatherData = res
    
    const advice = generateWeatherAdvice(
      weatherData.city,
      weatherData.description,
      weatherData.temperature
    )
    
    assistantReply.value = advice
    speak(assistantReply.value)
  } catch (error) {
    assistantReply.value = '天气信息获取失败，请稍后再试'
    speak(assistantReply.value)
  }
}

// ------------------- 3. 单指标健康查询（新） -------------------
const handleHealthMetric = (metricKey, originalText) => {
  showOptions.value = false
  
  // 获取该指标对应的所有可能标题关键词
  const possibleTitles = metricTitleMap[metricKey] || []
  
  // 只检索前30条记录
  const recordsToSearch = healthRecords.value.slice(0, 30)
  
  // 查找匹配的记录：title 包含任一关键词
  const matchedRecord = recordsToSearch.find(record => {
    return possibleTitles.some(keyword => record.title.includes(keyword))
  })
  
  if (matchedRecord) {
    // 找到记录，播报 content
    assistantReply.value = matchedRecord.content || '没有记录具体数值'
  } else {
    // 未找到记录
    assistantReply.value = '上次体检没有检查这项指标'
  }
  speak(assistantReply.value)
}

// ------------------- 4. 整体健康提问（反问） -------------------
const handleGeneralHealth = () => {
  showOptions.value = false
  // 反问老人具体想查哪一项
  const question = '你想知道血糖还是血压体检结果啊？'
  assistantReply.value = question
  speak(question)
  
  // 可提供常用选项供点击（但不强制）
  // 这里我们也可以显示两个按钮“血糖”和“血压”，但不是必须的，为了简洁就不显示额外选项了。
}

// ------------------- 用户点击反问选项 -------------------
const selectOption = (action) => {
  if (action === 'generalHealth') {
    handleGeneralHealth()
  } else {
    executeIntent(action, '')
  }
}

// ------------------- 手动输入提交 -------------------
const submitManualText = () => {
  if (!manualText.value.trim()) return
  recognizedText.value = manualText.value
  processCommand(manualText.value)
  manualText.value = ''
}

// ------------------- 页面加载时自动引导 -------------------
onMounted(() => {
  const welcomeMsg = '欢迎使用语音助手。你可以对我说：查天气、今天吃什么药、或者询问体检指标，比如血压多少、血糖怎么样。点击下方麦克风按钮开始说话。'
  speak(welcomeMsg)
  assistantReply.value = welcomeMsg
  
  // 预加载健康记录数据（仅体检类型记录，便于后续查询）
  api.get('/health').then(res => {
    // 存储所有健康记录，后续只取前30条使用
    healthRecords.value = (res || []).filter(r => r.recordType === 'checkup' || r.recordType === '体检')
  }).catch(console.warn)
})

</script>

<style scoped>
.voice-assistant {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem 1rem;
  text-align: center;
}
.page-title {
  font-size: 2.5rem;
  margin-bottom: 2rem;
  color: #2c3e50;
}
.voice-btn {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: #4caf50;
  border: none;
  box-shadow: 0 6px 12px rgba(0,0,0,0.15);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  transition: all 0.2s;
}
.voice-btn.listening {
  background: #f44336;
  animation: pulse 1.5s infinite;
}
.voice-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.mic-icon {
  font-size: 4rem;
  margin-bottom: 0.5rem;
}
.btn-text {
  font-size: 1.4rem;
  color: white;
  font-weight: bold;
}
.hint {
  font-size: 1.4rem;
  color: #666;
  margin-bottom: 2rem;
}
.result-box, .reply-box {
  background: #f5f5f5;
  padding: 1.5rem;
  border-radius: 1rem;
  margin-bottom: 1rem;
  text-align: left;
}
.label {
  font-size: 1.2rem;
  color: #888;
  margin-bottom: 0.5rem;
}
.recognized-text, .reply-text {
  font-size: 1.8rem;
  font-weight: 500;
  color: #333;
  word-break: break-word;
}
.options-panel {
  background: #fff9c4;
  padding: 1.5rem;
  border-radius: 1rem;
  margin-top: 1rem;
}
.question {
  font-size: 1.6rem;
  margin-bottom: 1rem;
}
.option-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: center;
}
.option-btn {
  background: #2196f3;
  color: white;
  border: none;
  padding: 1rem 1.5rem;
  font-size: 1.4rem;
  border-radius: 2rem;
  cursor: pointer;
  min-width: 100px;
}
.manual-input-area {
  margin-top: 2rem;
  padding: 1rem;
  background: #e0e0e0;
  border-radius: 1rem;
}
.manual-hint {
  font-size: 1.4rem;
  margin-bottom: 0.5rem;
}
.input-group {
  display: flex;
  gap: 0.5rem;
}
.manual-input {
  flex: 1;
  padding: 1rem;
  font-size: 1.6rem;
  border: 1px solid #ccc;
  border-radius: 0.5rem;
}
.send-btn {
  background: #4caf50;
  color: white;
  border: none;
  padding: 1rem 2rem;
  font-size: 1.4rem;
  border-radius: 0.5rem;
  cursor: pointer;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}
</style>