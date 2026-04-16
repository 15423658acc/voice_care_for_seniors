<template>
  <div class="voice-assistant">
    <h1 class="page-title">🎤 语音助手</h1>
    
    <!-- 麦克风按钮（大号，适老化） -->
     <!-- 对于ref：给这个 DOM 元素起个名字，方便在 JS 里直接访问它（类似 document.getElementById）。 -->
    <!-- 对象语法动态绑定类:让HTML的class类名，跟着JS变量的值自动变。变量为true自动加上这个class,变量为false自动去掉这个class。
     不用手动写JS去操作DOM添加删除类名，Vue全自动处理,(类名: 布尔变量) -->
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

    <!-- 助手回复区：v-if只有当 recognizedText 变量有内容（非空字符串）时，才显示这个区域。 -->
    <div v-if="assistantReply" class="reply-box">
      <p class="label">助手回复：</p>
      <p class="reply-text">{{ assistantReply }}</p>
    </div>

    <!-- 反问选项（当匹配模糊时显示可点击选项） -->
    <div v-if="showOptions" class="options-panel">
      <p class="question">{{ clarifyQuestion }}</p>
      <div class="option-buttons">
        <!-- 循环遍历 currentOptions 数组，为每个选项生成一个按钮。key是Vue渲染列表时需要的唯一标识 -->
        <button
          v-for="opt in currentOptions"
          :key="opt.action"
          @click="selectOption(opt.action)"
          class="option-btn"
        >
        <!-- @click="selectOption(opt.action)"：点击按钮时，把该选项的 action 传给 selectOption 函数。 -->
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- 手动输入区域（当麦克风权限被拒绝时显示） -->
    <div v-if="showManualInput" class="manual-input-area">
      <p class="manual-hint">您也可以直接打字告诉我：</p>
      <div class="input-group">
        <!-- v-model="manualText"：双向绑定，输入框的内容会同步到 manualText 变量，改变 manualText 也会改变输入框。在输入框里按回车键，执行 submitManualText。         -->
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
import api from '@/api'
import { levenshtein, calculateConfidence } from '@/utils/levenshtein'   // 模糊匹配
import { generateWeatherAdvice } from '@/utils/weatherHelper'
import { getCachedLocation, updateLocationCacheSilently } from '@/utils/location'  // 导入定位工具
import { commonCities } from '@/utils/cityList'


const router = useRouter()      //ref(初始值) 返回一个对象，通过 .value 访问/修改其值。V3直接用变量名就可以了
// -- 响应式数据 需要在页面上显示 / 控制 UI 样式--Vue 只有把它们变成响应式变量，才能在变量变化时自动更新页面。---------------------
const isListening = ref(false)          // 是否正在录音
const isProcessing = ref(false)         // 状态锁，防止重复触发
const recognizedText = ref('')          // 识别到的文字
const assistantReply = ref('')          // 助手回复的文字
const showOptions = ref(false)          // 是否显示反问选项
const clarifyQuestion = ref('')         // 反问的问题
const currentOptions = ref([])          // 当前可选项 [{ label, action }]
const showManualInput = ref(false)      // 是否显示手动输入框（权限拒绝时）
const manualText = ref('')              // 手动输入的文本
let recognition = null        // 语音识别实例
let debounceTimer = null       // 防抖定时器
const healthRecords = ref([])   // 存储健康记录数据（用于体检指标查询，只使用前30条）

// ---- 关键词词典：intent：意图分类。keywords：触发该意图的关键词列表。action 或 metricKey：匹配后要执行的操作标识。
const commandDictionary = [
   // 吃药提醒
  { intent: 'medicine', keywords: ['吃药', '药', '吃什么药', '今天吃什么药', '该吃什么药', '我的药', '该吃药了吗', '吃药时间到了吗', '药吃了吗', '今天吃啥药', '记得吃药', '提醒我吃药', '药在哪', '药怎么吃', '吃哪个药', '药量', '几片药', '饭前还是饭后'],
    action: 'medicine' },    
  // 天气查询
  { intent: 'weather', keywords: ['天气', '温度', '冷不冷', '热不热', '下雨', '下雪', '多少度', '穿什么', '怎么样', '出门', '出行', '带伞', '今天天气咋样', '明天天气', '后天天气', '外面冷不冷', '外面下雨吗', '要不要带伞', '出门穿啥', '温度高不高', '天气好吗', '刮风吗', '雾大吗', '晴天阴天'],
    action: 'weather'},
  // 整体健康（反问）
  { intent: 'generalHealth', keywords: ['身体', '体检结果', '身体状况', '怎么样', '还好吗', '好不好', '健康', '身体好吗', '身体怎么样', '最近身体怎么样', '我这身体还行吗', '我健康吗', '感觉如何', '身体舒服吗', '有没有毛病', '正常不正常', '血压高不高', '血糖正常吗'],
    action: 'generalHealth' },
  // 骨密度/身高体重/血糖/尿酸/血压/总胆固醇/正常心率七项常用体检指标
  { intent: 'metric', keywords: ['骨密度'],metricKey: 'boneDensity'},
  { intent: 'metric', keywords: ['身高体重', '身高', '体重'], metricKey: 'heightWeight'},
  { intent: 'metric', keywords: ['血糖', '糖'], metricKey: 'bloodSugar' },
  { intent: 'metric', keywords: ['尿酸'], metricKey: 'uricAcid' },
  { intent: 'metric', keywords: ['血压', '收缩压', '舒张压'], metricKey: 'bloodPressure'},
  { intent: 'metric', keywords: ['胆固醇', '总胆固醇','固醇'], metricKey: 'cholesterol'},
  { intent: 'metric', keywords: ['心率', '心跳','心脏','心'], metricKey: 'heartRate' }
]
// 指标名称与数据库 title 的映射表（用于模糊匹配）:将用户说的指标（如“血压”）映射到数据库里的字段名。
const metricTitleMap = {
  boneDensity: ['骨密度'], heightWeight: ['身高体重', '身高', '体重'],
  bloodSugar: ['血糖'], uricAcid: ['尿酸'], bloodPressure: ['血压', '收缩压', '舒张压'],
  cholesterol: ['总胆固醇', '胆固醇'], heartRate: ['正常心率', '心率']
}

// ------ 防抖函数：短时间内多次调用同一个函数，只执行最后一次。“生成一个可被多次触发的工具，造一个带防抖效果的新版本函数” --
// 希望多次的三秒后说话会有很多定时器，用 return 包一层，形成一个 “闭包”，保存定时器多次调用，并且每次调用都能清掉上一次！
// return 出来的这个函数，就是实际使用的 “防抖版函数”！
const debounce = (fn, delay = 300) => {    // delay 300ms 是延迟时间
  // 返回一个新的“包装过的函数”，接收所有参数,return function(...args) {...}，把所有参数传给原函数，...args：ES6剩余参数，把所有传入的参数收集成数组。
  return (...args) => {       
    if (debounceTimer) clearTimeout(debounceTimer)   // 1. 如果之前有定时器，先清掉
    debounceTimer = setTimeout(() => {   // 2. 重新开一个新定时器
      fn(...args)        // 3. 延迟时间到了，真正执行函数，并且这里把参数传给原函数
      debounceTimer = null       // 4. 执行完清空标记
    }, delay)
  }
}

// ------------------- 语音合成（固定语速0.8） -------------------
const speak = (text) => {
  if (!('speechSynthesis' in window)) {
    console.warn('浏览器不支持语音合成')
    return
  }
  window.speechSynthesis.cancel()    // 如果正在播报，先取消
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'zh-CN'
  utterance.rate = 0.8          // 固定慢速
  utterance.pitch = 1.0
  utterance.volume = 1.0
  window.speechSynthesis.speak(utterance)    // 开始朗读
}
// ------------------- 停止播报并开始识别 -------------------
const cancelSpeechAndStartRecognition = () => {
  window.speechSynthesis.cancel()
  startRecognition()     // 先停止朗读，然后开始录音。
}
// ------------------- 控制麦克风按钮点击（带防抖和状态锁） -------------------
const handleMicClick = debounce(() => {
  // 状态锁：防止用户手快/防抖没生效前，重复点麦克风、重复启动录音！
  //如果正在控制锁或正在录音 直接退出，什么都不做！(2满1即可)，
  if (isProcessing.value || isListening.value) return   
  isProcessing.value = true   //否则立刻上锁，告诉全世界：我正在忙！此时按钮被禁用，用户点击无效。
  if (window.speechSynthesis.speaking) {  //正在说话，先停止朗读，再开始录音
    cancelSpeechAndStartRecognition()
    isProcessing.value = false   // 解锁：这个if判断就是一种情况可能，不代表控制什么
    return
  }
  startRecognition()  // 没有正在说话，直接开始录音
}, 300)   // 300ms 防抖时间
// 用户点击启动录音（需要时间）的启动过程中又点一下，此时这时候防抖已经过了300ms，就会启动两次录音 导致 直接报错崩溃
// isProcessing 就是为了：不管用户怎么点，只要系统没处理完，NO。防抖：防300ms 内疯狂点;状态锁：防异步过程中重复点

// ------------------- 开始语音识别 -------------------
const startRecognition = () => {
  if (!recognition) {   // 如果识别实例不存在，先初始化
    initRecognition()
  }
  if (!recognition) {   // 如果初始化失败（浏览器不支持），显示手动输入框。
    showManualInput.value = true
    isProcessing.value = false
    return
  }
  // 每次开始识别前，重置状态和界面
  recognizedText.value = ''
  assistantReply.value = ''
  showOptions.value = false
  try {
    recognition.start()    // 开始录音
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
    alert('您的浏览器不支持语音识别，请升级浏览器')
    return
  }
  recognition = new SpeechRecognition()  // 创建一个语音识别实例，把null变成真正能用的识别对象
  recognition.lang = 'zh-CN'
  recognition.continuous = false     // 不是一直听，说完一句话就结束。
  recognition.interimResults = false   //不返回中间半成品
  recognition.maxAlternatives = 1  //只返回一个最准的结果

  // onresult 是它自带的一个事件，当识别出结果时，执行后面这个函数
  recognition.onresult = (event) => {    // event装着识别出来的文字数据，是浏览器自动传的对象  
    const transcript = event.results[0][0].transcript  // 固定写法，拿到识别出来的【最终文字】
    recognizedText.value = transcript     // 把识别到的文字存到响应式变量显示在页面上
    processCommand(transcript)    // 把文字传给核心处理函数
  }

  recognition.onerror = (event) => {
    console.error('识别错误', event.error)
    isListening.value = false
    isProcessing.value = false
    
    if (event.error === 'not-allowed') {
      showManualInput.value = true  // 显示手动输入框
      assistantReply.value = '麦克风权限被拒绝，您可以通过下方输入框打字告诉我'
      speak(assistantReply.value)
    } else {
      assistantReply.value = '抱歉，我没听清，请再试一次'
      speak(assistantReply.value)
    }
  }
  //  识别结束（不管成功失败，都会走这里），识别停止了，把按钮状态恢复、解锁
  recognition.onend = () => {
    isListening.value = false
    isProcessing.value = false
  }
}

// ---- 处理语音指令（核心逻辑）定义一个处理语音命令的函数，text 就是语音识别出来的文字 ----
const processCommand = (text) => {
  const lowerText = text.toLowerCase().trim()   //转成全小写，去掉首尾空格
  
  // 第一步：模糊匹配意图，计算置信度
  let bestMatch = null   // 存最匹配的命令
  let maxConfidence = 0   // 存最匹配的置信度
  for (const cmd of commandDictionary) {          // 循环遍历命令字典
    for (const kw of cmd.keywords) {            // 遍历这个命令里的所有关键词
      if (lowerText.includes(kw)) {           // 判断用户说的话里，是否包含这个关键词
        const conf = calculateConfidence(lowerText, kw)   // 计算匹配置信度（越像分数越高）
        if (conf > maxConfidence) {         // 如果这次匹配度更高
          maxConfidence = conf            // 就更新最高分
          bestMatch = cmd               // 并把这个命令设为最佳匹配
        }
      }
    }
  }
  // 如果没有直接包含关键词，计算编辑距离（允许拼写错误）
  if (!bestMatch) {
    let minDistance = Infinity    // 最小差异度，一开始设为无限大
    for (const cmd of commandDictionary) {
      for (const kw of cmd.keywords) {
        const distance = levenshtein(lowerText, kw)   // 计算用户说的话 和 关键词 有多像
        if (distance < minDistance) {
          minDistance = distance
          bestMatch = cmd      // 找到最像的那个命令
        }
      }
    }
    if (minDistance > 5) {
      bestMatch = null        // 如果差异太大（>5），就判定不匹配
    }
  }
  // 置信度过低或未匹配，触发反问
  if (!bestMatch || maxConfidence < 0.3) {
    triggerClarification()
    return
  }
  // 根据意图执行操作
  if (bestMatch.intent === 'metric') {         // 如果是查询健康指标
    handleHealthMetric(bestMatch.metricKey, text)
  } else if (bestMatch.intent === 'generalHealth') {   // 如果是通用健康问题
    handleGeneralHealth()
  } else {
    executeIntent(bestMatch.action, text)    // 其他指令直接执行
  }
}

// ------------------- 触发反问机制 -------------------
const triggerClarification = () => {
  // 用户问得不清楚，助手给出选项，让用户选
  const options = [
    { label: '查天气', action: 'weather' },
    { label: '今天吃什么药', action: 'medicine' },
    { label: '查体检结果', action: 'generalHealth' }
  ]
  clarifyQuestion.value = '你是想查天气，还是想知道今天吃什么药，还是查体检结果？'
  currentOptions.value = options    // 把选项存起来，让界面显示按钮
  showOptions.value = true
  
  assistantReply.value = clarifyQuestion.value    // assistantReply把文字显示在页面上
  speak(clarifyQuestion.value)   // 读选择指令的问题
}
// ---- 根据用户的选择，执行意图（天气、吃药） ----
const executeIntent = async (action, originalText) => {
  showOptions.value = false   // 先把选项隐藏掉
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
    const notTaken = reminders.filter(r => !r.taken)   // 过滤没有吃药的选项
    
    if (notTaken.length === 0) {
      assistantReply.value = '今天没有需要吃的药了！'
      speak(assistantReply.value)
      return
    }
    // 按时间排序：localeCompare是字符串字母/时间顺序排序的方法，a 和 b 是 sort 自动拿出来比较的两个药
    notTaken.sort((a, b) => a.remindAt.localeCompare(b.remindAt))   
    const nextMedicine = notTaken[0]    // nextMedicine最早要吃的那一个药
    const medicineName = nextMedicine.medicine || '药品'   // 如果没有药品名称，就用默认值'药品'
    assistantReply.value = `你今天还没吃${medicineName}，不要提前吃哦，到时间系统会自动提醒你。`
    speak(assistantReply.value)
  } catch (error) {
    assistantReply.value = '暂时无法获取用药信息，请稍后再试'
    speak(assistantReply.value)
  }
}
// ------------------- 2. 天气查询指令 ------------------
const handleWeather = async (text) => {
  try {
    // 1. 解析用户输入中的城市名（至少两个汉字，可选“市”结尾）
    const cityMatch = text.match(/([\u4e00-\u9fa5]{2,}市?)/);
    let city = '';
    // \u4e00 是汉字“一”的 Unicode 码，\u9fa5 是汉字“龥”的码，这个区间覆盖了所有常用汉字,{2,}至少两个汉字，这是更标准、更可靠的 Unicode 写法，确保在所有环境下都能正确识别汉字。
    // if (cityMatch) {
    //   // 匹配至少两个汉字，后面可能跟一个“市”字，并把这一整段捕获下来
    //   // 如果匹配成功：返回一个数组，否则null。[0] 是完整匹配的内容，[1] 是第一个捕获组的内容（即城市名，可能带“市”）。
    //   // replace 默认只替换第一个匹配。因为正则捕获的城市名可能带有市，调用天气API通常传入不带市的城市名，so需要把末尾的市字去掉。
    //   city = cityMatch[1].replace('市', ''); // 去掉末尾的“市”字
    // }
     // 匹配所有连续的汉字（长度为2~4，覆盖绝大多数中国城市名）
    const chineseWords = text.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
    for (const word of chineseWords) {
      // 去掉末尾可能的“市”字，再检查是否在城市列表中
      const candidate = word.replace(/市$/, '');
      if (commonCities.has(candidate)) {
        city = candidate;
        break; // 只取第一个匹配到的城市名
      }
    }
    // ---------- 第二步：判断是否为天气相关查询（用于无城市名时触发定位） ----------
    // 扩展正则，覆盖老人常见问法
    const isWeatherQuery = /天气|温度|冷不冷|热不热|下雨|下雪|多少度|穿什么|出门|带伞|刮风|雾/.test(text);
    // 如果没有提取到城市名，且用户问的不是天气相关，则视为无效（理论上不会发生，因为意图匹配已确保是 weather）
    if (!city && !isWeatherQuery) {
      throw new Error('未能识别城市名，且问题与天气无关');
    }


    let weatherData = null; // 统一存储天气数据

    
    // 2. 根据是否有城市名，调用不同接口
    if (city) {
      // 用户明确说出了城市名 -> 调用城市查询接口
      const res = await api.get('/weather/current', { params: { city } });
      // { current: { city, description, temperature, humidity }, forecast: [...], yesterday: {...} }
      weatherData = res;
    } else {
      // 用户未提供城市 -> 使用当前定位
      // 获取缓存的经纬度
      let cached = getCachedLocation();
      if (!cached) {
        // 缓存不存在，尝试静默重新获取
        await updateLocationCacheSilently();
        cached = getCachedLocation();
        if (!cached) {
          throw new Error('无法获取您的位置，请检查定位权限或手动输入城市');
        }
      }
      const { latitude, longitude } = cached;
      const res = await api.get('/weather/location', {
        params: { lat: latitude, lon: longitude }
      });
      weatherData = res; // 同样假设返回结构一致
    }

    // 3. 生成建议文案
    const advice = generateWeatherAdvice(weatherData);
    assistantReply.value = advice;
    speak(assistantReply.value);
  } catch (error) {
    console.error('天气查询失败:', error);
    assistantReply.value = '天气信息获取失败，请稍后再试';
    speak(assistantReply.value);
  }
};

// ------------------- 3. 单指标健康查询 metricKey匹配查询指标   -----------
// possibleTitles 要找的关键词列表 recordsToSearch 要搜索的记录列表  matchedRecord 最终找到的那条记录
const handleHealthMetric = (metricKey, originalText) => {
  showOptions.value = false
  // 获取该指标对应的所有可能标题关键词，拿到这个指标的 “关键词列表”
  const possibleTitles = metricTitleMap[metricKey] || []
  // 只检索前30条记录
  const recordsToSearch = healthRecords.value.slice(0, 30)   // .slice(0,30) = 只拿前 30 条
  // 查找匹配的记录：title 包含任一关键词，即在记录里找一条，它的标题包含任意一个关键词
  const matchedRecord = recordsToSearch.find(record => {
    return possibleTitles.some(keyword => record.title.includes(keyword))   // some：检查数组中是否有至少一个元素满足条件。
  })    
  if (matchedRecord) {
    assistantReply.value = matchedRecord.content || '这个指标子女没有记录'     // 找到记录，播报 content
  } else {
    assistantReply.value = '上次体检没有检查这项指标'     // 未找到记录
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
  // 这里可以提供常用选项供点击，但是避免老人端操作复杂化不写了
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
  const welcomeMsg = '欢迎使用语音助手。您可以问我今天需要吃什么药？或者上次体检的血糖多少？点击麦克风按钮就能说话啦。'
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