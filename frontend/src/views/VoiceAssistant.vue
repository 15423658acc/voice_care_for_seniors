<template>
  <div class="voice-assistant">
    <h1 class="page-title">🎤 语音助手</h1>
    <!-- 鼠标/触屏 按下、松开、离开（终端） -->
    <button
      class="voice-btn"
      @mousedown="startListening"    
      @mouseup="stopListening"
      @mouseleave="stopListening"
      @touchstart="startListening"
      @touchend="stopListening"
      @touchcancel="stopListening"
      :disabled="isListening"
    >
      {{ isListening ? '聆听中...' : '按住说话' }}
    </button>
    <p class="hint">按住按钮，说出指令</p>
    <!-- 结果展示区 -->
    <div v-if="recognizedText" class="result">
      <p>您说：{{ recognizedText }}</p>
      <p>助手：{{ responseText }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// 预设指令库
const commands = [
  { keywords: ['打电话给孩子', '打电话给儿子', '打电话给女儿'], action: 'callChild' },
  { keywords: ['天气', '今天天气'], action: 'weather' },
  { keywords: ['提醒', '吃药'], action: 'reminder' },
  { keywords: ['紧急', '救命'], action: 'emergency' }
]

const isListening = ref(false)      // 是否正在语音识别
const recognizedText = ref('')       // 识别出的文字内容
const responseText = ref('')         // 助手回复文字

let recognition = null              // 语音识别实例（全局保存）
let finalTranscript = ''            // 最终识别完成的文本


// 1->2
// 初始化语音识别，Web Speech API（浏览器原生）
const initRecognition = () => {
// 2.1 兼容性检查并提示
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) {
    alert('您的浏览器不支持语音识别，请使用Chrome浏览器')
    return
  }
// 2.2 创建识别实例
  recognition = new SpeechRecognition()
// 2.3 配置识别参数
  recognition.lang = 'zh-CN'
  recognition.continuous = true // 连续识别，直到手动停止
  recognition.interimResults = true // 返回临时结果
  recognition.maxAlternatives = 1

// 2.4 识别用户语音结果，此时isListening=true
    recognition.onresult = (event) => {
    let interimTranscript = ''  // 临时文字
    // 遍历结果，拼接最终文本和临时文本
    for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        // 2.4.1 判断是否是最终结果
        if (event.results[i].isFinal) {
        finalTranscript += transcript  // 追加最终结果
        } else {
        interimTranscript += transcript  // 临时显示
        }
    }
    // 2.4.2 合并最终结果和临时结果（最中文字+临时文字）
    recognizedText.value = finalTranscript + interimTranscript
}

// 2.5 识别出错 （三个核心事件之一）
  recognition.onerror = (event) => {
    console.error('识别错误', event.error)
    responseText.value = '抱歉，我没听清，请再试一次'
    isListening.value = false
  }

// 2.6 识别停止(3结束后 )
  recognition.onend = () => {
    isListening.value = false
    // 如果有识别结果 → 处理指令
    if (finalTranscript) {
      processCommand(finalTranscript)
    }
    // 重置，准备下一次使用
    finalTranscript = '' 
  }
}


// 1.按住按钮：启动识别，触发事件@mousedown/@touchstart→执行 startListening()
// 开始识别
const startListening = () => {
// 1.1 如果还没有创建识别实例，就先初始化
  if (!recognition) initRecognition()
// 1.2 浏览器不支持识别，直接退出
  if (!recognition) return
// 1.3 清空上一次结果
  finalTranscript = ''
  recognizedText.value = ''
  responseText.value = ''

  try {
// 1.4 真正启动麦克风 + 语音识别
    recognition.start()  // 开启麦克风
    isListening.value = true  // 禁用按钮
  } catch (e) {
    console.warn('识别已启动', e)
  }
}

// 3.停止识别（mouseup / touchend / mouseleave → 执行 stopListening()）
const stopListening = () => {
    // 只有正在识别时才停止
  if (recognition && isListening.value) {
    recognition.stop() // 关闭麦克风
    isListening.value = false // 恢复按钮  -->自动执行 recognition.onend
  }
}

// 4.处理指令
const processCommand = (text) => {
  const lowerText = text.toLowerCase()  // 转小写
  let matchedAction = null
  // 遍历指令库，匹配关键词
  for (const cmd of commands) {
     // 只要包含任意一个关键词，就算匹配成功
    if (cmd.keywords.some(keyword => lowerText.includes(keyword))) {
      matchedAction = cmd.action  // 记录匹配的指令
      break
    }
  }

  // 4.1没匹配到
  if (!matchedAction) {
    responseText.value = '抱歉，我不明白您的指令'
    speak('抱歉，我不明白您的指令')
    return
  }

  // 4.2匹配成功 → 根据 action 执行对应逻辑
  switch (matchedAction) {
    case 'callChild':
      // 打电话给孩子（需预设号码）
      const childPhone = '19707092146' // 从配置读取
      window.location.href = `tel:${childPhone}`   //拨号
      responseText.value = '正在给您孩子打电话'
      speak('正在给您孩子打电话')
      break
    case 'weather':
      // 跳转到天气页面或直接播报（这里跳转）
      responseText.value = '正在查询天气'
      speak('正在查询天气')
      // 可以跳转或触发天气查询
    //   this.$router.push('/weather')
      break
    case 'reminder':
      responseText.value = '请说出提醒内容'
      speak('请说出提醒内容')
      // 这里可以进一步启动语音识别收集提醒内容，简化处理
      break
    case 'emergency':
      // 触发紧急呼叫（可调用之前的紧急呼叫逻辑）
      // 可以触发长按事件或直接调用函数
      responseText.value = '正在触发紧急呼叫'
      speak('正在触发紧急呼叫')
      // 调用紧急呼叫函数（需引入）
      break
    default:
      break
  }
}

// 5.语音反馈
const speak = (text) => {
  if ('speechSynthesis' in window) {
    // 浏览器语音合成 API
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.9
    utterance.pitch = 1.0
    window.speechSynthesis.speak(utterance)
  }
}
</script>

<style scoped>
.voice-assistant {
  text-align: center;
  padding: 1rem;
}
.voice-btn {
  background-color: #4caf50;
  color: white;
  font-size: 2rem;
  padding: 2rem;
  border: none;
  border-radius: 50%;
  width: 200px;
  height: 200px;
  margin: 2rem auto;
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  transition: background-color 0.2s;
}
.voice-btn:active {
  background-color: #45a049;
  transform: scale(0.95);
}
.voice-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
.hint {
  font-size: 1.4rem;
  color: #666;
}
.result {
  font-size: 1.6rem;
  margin-top: 2rem;
}
</style>