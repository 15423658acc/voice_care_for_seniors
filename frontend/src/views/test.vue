<button id="speakBtn">点我朗读（iPhone 必响）</button>

<script>
const btn = document.getElementById('speakBtn');

// 必须放在【点击事件】里！！！
btn.addEventListener('click', () => {
  // 1. 创建语音内容
  const utterance = new SpeechSynthesisUtterance();
  
  // 2. 设置文字（支持中英文）
  utterance.text = "你好，我是iPhone Safari语音朗读，我可以正常发音";
  
  // 3. 音量、语速、语调（iPhone 完美支持）
  utterance.volume = 1;    // 音量
  utterance.rate = 1;      // 语速
  utterance.pitch = 1;     // 语调
  
  // 4. 播放（关键！必须在点击内执行）
  window.speechSynthesis.speak(utterance);
});
</script>