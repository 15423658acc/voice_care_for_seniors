<template>
  <div class="home">
    <h1 class="welcome">老友助手</h1>
    <div class="grid">
      <router-link to="/emergency" class="card emergency">🚨 紧急呼叫</router-link>
      <router-link to="/reminder" class="card reminder">💊 吃药提醒</router-link>
      <router-link to="/antifraud" class="card fraud">🛡️ 防诈骗</router-link>
      <router-link to="/weather" class="card weather">☀️ 天气</router-link>
      <router-link to="/voiceAssistant" class="card voice">🎤 语音助手</router-link>
      <router-link to="/healthRecords" class="card health">Health Records</router-link>
      
    </div>
  </div>
</template>

<style scoped>
.home {
  padding: 1rem;
}
.welcome {
  font-size: 2.5rem;
  text-align: center;
  margin-bottom: 2rem;
}
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}
.card {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f0f0;
  padding: 2rem;
  font-size: 1.8rem;
  text-decoration: none;
  color: #333;
  border-radius: 1rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  min-height: 150px;
}
.emergency { background-color: #ffebee; color: #c62828; }
.reminder { background-color: #e8f5e8; color: #2e7d32; }
.voice { background-color: #fff3e0; color: #ef6c00; }
.fraud { background-color: #ede7f6; color: #512da8; }
.weather { background-color: #e1f5fe; color: #0277bd; }
</style>