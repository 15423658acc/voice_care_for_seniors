<template>
  <div class="anti-fraud">
    <h1 class="page-title">🛡️ 防诈骗问答</h1>
    <button
      class="voice-btn"
      @mousedown="startListening"
      @mouseup="stopListening"
      @mouseleave="stopListening"
      @touchstart="startListening"
      @touchend="stopListening"
      :disabled="isListening"
    >
      {{ isListening ? '聆听中...' : '按住提问' }}
    </button>
    <p class="hint">按住按钮，说出您的疑问</p>
    <div v-if="userQuestion" class="qa-result">
      <p class="question">您问：{{ userQuestion }}</p>
      <p class="answer">答案：{{ answer }}</p>
    </div>
    <!-- <button v-if="answer" @click="speak(answer)" class="replay-btn">🔊 重播答案</button> -->
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import faqData from '@/assets/faq.json'
import Fuse from 'fuse.js' // 需要安装 fuse.js: npm install fuse.js

const isListening = ref(false)
const userQuestion = ref('')
const answer = ref('')
let recognition = null
let finalTranscript = ''

// 初始化 Fuse 模糊搜索
const fuseOptions = {
  includeScore: true,
  threshold: 0.4, // 匹配阈值，越低越严格
  keys: ['question']
}
let fuse = null

// 页面挂载时初始化 Fuse 搜索实例，用 question 字段做模糊匹配
onMounted(() => {
  fuse = new Fuse(faqData, fuseOptions)
})

// 2. 语音识别初始化（同语音助手）
const initRecognition = () => {
    // 2.1 获取浏览器原生语音识别API（兼容Chrome）
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) {
    alert('您的浏览器不支持语音识别')
    return
  }
    // 2.2 创建语音识别实例
  recognition = new SpeechRecognition()

  recognition.lang = 'zh-CN'
  recognition.continuous = true
  recognition.interimResults = true

//   2.3 听到声音
  recognition.onresult = (event) => {
    let interimTranscript = ''
    // 以下对象中调用来源于window.SpeechRecognition
    // event.results是数组，本次识别到的所有 “语音片段列表”
    // event.resultIndex“从这里开始是新说的话”，是本次新产生的结果从第几段开始，避免重复遍历旧结果
    // event.results[i][0].transcript 是当前语音片段的文本内容
    // event.results[i]是第 i 段识别结果
    // event.results[i][0]是置信度最高的那一句识别文字
    // event.results[i].isFinal 是‘是否是最终识别结果’
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript
      if (event.results[i].isFinal) {
        finalTranscript += transcript
      } else {
        interimTranscript += transcript
      }
    }
    userQuestion.value = finalTranscript + interimTranscript
  }

//   2.4 识别错误
  recognition.onerror = () => {
    answer.value = '抱歉，我没听清，请再试一次'
    speak(answer.value)
    isListening.value = false
  }

//   2.5 识别结束
  recognition.onend = () => {
    isListening.value = false
    if (finalTranscript) {
      searchAnswer(finalTranscript)
    }
    finalTranscript = ''
  }
}

// 1.触发按钮，启动识别
const startListening = () => {
    // 1.1 未初始化 → 先创建语音识别实例
    if (!userHasInteracted) return // 确保用户已与页面交互，已激活语音权限  
  if (!recognition) initRecognition()
  if (!recognition) return

  userQuestion.value = ''
  answer.value = ''
  finalTranscript = ''

  try {
    // 1.2 启动麦克风 + 开启识别
    recognition.start()
    // 1.3 禁用按钮，显示聆听状态
    isListening.value = true
  } catch (e) {}
}

const stopListening = () => {
  if (recognition && isListening.value) {
    recognition.stop()
    isListening.value = false
  }
}

// 4.搜索答案
const searchAnswer = (text) => {
  if (!fuse) {
    // 知识库没加载 → 提示
    answer.value = '知识库未加载'
    speak(answer.value)
    return
  }
  // 使用 fuse.js 进行【模糊搜索】匹配问题
  const results = fuse.search(text)

  // 找到答案 → 返回最佳匹配
  if (results.length > 0) {
    const bestMatch = results[0].item  // 分数最高的答案
    answer.value = bestMatch.answer    // 显示答案
    speak(bestMatch.answer)            // 语音播报答案
  } else {
    answer.value = '没有找到相关答案，您可以咨询子女或拨打反诈专线96110'
    speak(answer.value)
  }
}

const speak = (text) => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.9
    window.speechSynthesis.speak(utterance)
  }
}
</script>

<style scoped>
.anti-fraud {
  text-align: center;
  padding: 1rem;
}
.voice-btn {
  background-color: #ff9800;
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
}
.voice-btn:active {
  background-color: #f57c00;
  transform: scale(0.95);
}
.hint {
  font-size: 1.4rem;
  color: #666;
}
.qa-result {
  font-size: 1.6rem;
  margin-top: 2rem;
  text-align: left;
  background-color: #f5f5f5;
  padding: 1.5rem;
  border-radius: 1rem;
}
.question {
  font-weight: bold;
  margin-bottom: 1rem;
}
.answer {
  color: #333;
}
</style>   