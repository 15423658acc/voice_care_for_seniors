<template>
  <div class="parallax-page">
    <header>
      <a href="#" class="logo">404页面</a>
    </header>
    <section>
      <img src="/images/stars.png" id="stars" />
      <img src="/images/moon.png" id="moon" />
      <img src="/images/mountains_behind.png" id="mountains_behind" />
      <h2 id="text">404页面</h2>
      <a href="#sec" id="btn">返回主页</a>
      <img src="/images/mountains_front.png" id="mountains_front" />
    </section>
    <div class="sec" id="sec">
      <h2>老友助手——面向银发族的智能生活陪伴与安全守护软件
</h2>
      <p>
        老友助手是一款面向银发族的智能生活陪伴与安全守护 Web 应用，以 “极简、语音优先、一键守护” 为核心设计哲学，通过 PWA 技术让老年用户获得接近原生 App 的体验，无需安装、不惧复杂操作。项目旨在用科技的温度填补数字鸿沟，让银发族真正享受到智能化带来的安全与便利。
        <br />
        我们的核心理念是：用最轻的技术负担，给长者最重的安全承诺。
        <br />
        核心设计思想
        极简交互：超大字体、高对比色块、扁平化流程，符合老年人视觉与操作习惯。
        语音优先：基于 Web Speech API，实现全语音指令识别与反馈，降低打字与菜单学习成本。
        一键守护：长按红色按钮即可紧急呼叫+位置短信，将复杂操作压缩为一个动作。
        远程关怀：子女通过管理后台可远程配置提醒、更新联系人，实现“云端孝心”。
        <br />
        技术亮点
        纯前端语音闭环：利用 Web Speech API 同时实现语音识别（STT）与语音合成（TTS），无需云端语音服务即可完成交互。
        PWA 离线可用：注册 Service Worker，核心页面与静态资源可缓存，添加到主屏幕后接近原生体验，弱网/离线也能打开。
        长按紧急机制：通过 touchstart/touchend 计时器实现 3 秒长按判定，避免误触；结合 Geolocation API 获取 GPS 坐标，调用短信接口（腾讯云/阿里云）通知预设号码。
        子女远程配置：后端使用 Node.js + Express + 定时任务（node-schedule），存储用户配置；前端管理界面可随时修改提醒计划与紧急联系人，数据实时同步。
        防诈骗知识库：基于关键词匹配（正则/简单 NLP），覆盖常见骗局（保健品、冒充公检法等），语音问答即时反馈。
        <br />
        项目价值
        社会价值：响应国家智慧养老号召，用轻量级技术方案解决老年人“数字失能”痛点，降低意外风险。
        技术示范：展示 PWA + Web Speech API 在适老化场景中的完整应用路径，为同类公益项目提供可复用的架构。
        可推广性：纯 Web 技术栈，无需应用商店审核，扫码即用，成本低、覆盖广。
    </p>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // 确保 DOM 元素已经渲染
  const stars = document.getElementById('stars')
  const moon = document.getElementById('moon')
  const mountains_behind = document.getElementById('mountains_behind')
  const text = document.getElementById('text')
  const btn = document.getElementById('btn')
  const mountains_front = document.getElementById('mountains_front')
  const header = document.querySelector('header')

  window.addEventListener('scroll', function() {
    let value = window.scrollY
    if (stars) stars.style.left = value * 0.25 + 'px'
    if (moon) moon.style.top = value * 1.05 + 'px'
    if (mountains_behind) mountains_behind.style.top = value * 0.5 + 'px'
    if (mountains_front) mountains_front.style.top = value * 0 + 'px'
    if (text) {
      text.style.marginRight = value * 4 + 'px'
      text.style.marginTop = value * 1.5 + 'px'
    }
    if (btn) btn.style.marginTop = value * 1.5 + 'px'
    if (header) header.style.top = value * 0.5 + 'px'
  })
})
</script>

<style scoped>
/* 引入字体 */
@import url("https://fonts.googleapis.com/css?family=Poppins:300,400,500,600,700,800,900&display=swap");

/* 所有样式都限定在 .parallax-page 内部，提高特异性，隔离外部全局样式 */
.parallax-page * {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: "Poppins", sans-serif;
  scroll-behavior: smooth;
}

/* 原 body 样式迁移到根容器上 */
.parallax-page {
  min-height: 100vh;
  overflow-x: hidden;
  background: linear-gradient(#2b1055, #7597de);
}

.parallax-page header {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  padding: 30px 100px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 10000;
}

.parallax-page header .logo {
  color: #fff;
  font-weight: 700;
  text-decoration: none;
  font-size: 2em;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.parallax-page header ul {
  display: flex;
  justify-content: center;
  align-items: center;
}

.parallax-page header ul li {
  list-style: none;
  margin-left: 20px;
}

.parallax-page header ul li a {
  text-decoration: none;
  padding: 6px 15px;
  color: #fff;
  border-radius: 20px;
}

.parallax-page header ul li a:hover,
.parallax-page header ul li a.active {
  background: #fff;
  color: #2b1055;
}

.parallax-page section {
  position: relative;
  width: 100%;
  height: 100vh;
  padding: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.parallax-page section::before {
  content: "";
  position: absolute;
  bottom: 0;
  width: 100%;
  height: 100px;
  background: linear-gradient(to top, #1c0522, transparent);
  z-index: 1000;
}

.parallax-page section img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.parallax-page section img#moon {
  mix-blend-mode: screen;
}

.parallax-page section img#mountains_front {
  z-index: 10;
}

.parallax-page #text {
  position: absolute;
  right: -350px;
  color: #fff;
  white-space: nowrap;
  font-size: 7.5vw;
  z-index: 9;
}

.parallax-page #btn {
  text-decoration: none;
  display: inline-block;
  padding: 8px 30px;
  border-radius: 40px;
  background: #fff;
  color: #2b1055;
  font-size: 1.5em;
  z-index: 9;
  transform: translateY(100px);
}

.parallax-page .sec {
  position: relative;
  padding: 100px;
  background: #1c0522;
}

.parallax-page .sec h2 {
  font-size: 3.5em;
  margin-bottom: 10px;
  color: #fff;
}

.parallax-page .sec p {
  font-size: 1em;
  color: #fff;
}
</style>