<template>
  <div class="not-found-container">
    <!-- 404 内容区域 -->
    <div class="content">
      <h1 class="title">404</h1>
      <p class="message">
        👻 哎呀，页面走丢了... <br />
        让幽灵带你回家吧 ~
      </p>
      <button class="home-btn" @click="goHome">返回首页</button>
    </div>

    <!-- 跟随鼠标/手指的幽灵 -->
    <div ref="ghostRef" class="ghost" :style="{ transform: `translate3d(${currentX}px, ${currentY}px, 0)` }">
      👻
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

// DOM 元素引用
const ghostRef = ref(null)

// 幽灵的宽高（固定，便于计算）
let ghostWidth = 70
let ghostHeight = 70

// 当前实际位置（用于缓动动画）
const currentX = ref(0)
const currentY = ref(0)

// 目标位置（鼠标/手指最新位置）
let targetX = 0
let targetY = 0

// 动画循环 ID
let rafId = null

// 边界边距（幽灵不超出视口）
const MARGIN = 12

// 缓动因子（平滑跟随）
const EASING = 0.12

// 更新边界并修正目标位置
function clampTargetPosition() {
  if (!ghostRef.value) return
  const maxX = window.innerWidth - ghostWidth - MARGIN
  const maxY = window.innerHeight - ghostHeight - MARGIN
  targetX = Math.min(Math.max(targetX, MARGIN), maxX)
  targetY = Math.min(Math.max(targetY, MARGIN), maxY)
}

// 根据鼠标/触摸点计算幽灵左上角的目标位置（使幽灵中心对准指针）
function computePositionFromClient(clientX, clientY) {
  let left = clientX - ghostWidth / 2
  let top = clientY - ghostHeight / 2
  // 边界限制
  const maxX = window.innerWidth - ghostWidth - MARGIN
  const maxY = window.innerHeight - ghostHeight - MARGIN
  left = Math.min(Math.max(left, MARGIN), maxX)
  top = Math.min(Math.max(top, MARGIN), maxY)
  return { x: left, y: top }
}

// 更新目标位置（鼠标或触摸点）
function updateTargetFromPoint(clientX, clientY) {
  const { x, y } = computePositionFromClient(clientX, clientY)
  targetX = x
  targetY = y
}

// 鼠标移动事件
function onMouseMove(e) {
  updateTargetFromPoint(e.clientX, e.clientY)
}

// 触摸事件（移动端）
function onTouchStart(e) {
  e.preventDefault()
  const touch = e.touches[0]
  if (touch) {
    updateTargetFromPoint(touch.clientX, touch.clientY)
  }
}

function onTouchMove(e) {
  e.preventDefault()
  const touch = e.touches[0]
  if (touch) {
    updateTargetFromPoint(touch.clientX, touch.clientY)
  }
}

// 窗口大小改变时，重新限制位置并修正当前幽灵位置
function onResize() {
  if (!ghostRef.value) return
  // 重新获取幽灵尺寸（防止缩放导致的尺寸变化）
  ghostWidth = ghostRef.value.offsetWidth
  ghostHeight = ghostRef.value.offsetHeight
  
  // 重新限制目标位置
  clampTargetPosition()
  
  // 修正当前实际位置，避免超出新边界
  const maxX = window.innerWidth - ghostWidth - MARGIN
  const maxY = window.innerHeight - ghostHeight - MARGIN
  let newX = Math.min(Math.max(currentX.value, MARGIN), maxX)
  let newY = Math.min(Math.max(currentY.value, MARGIN), maxY)
  currentX.value = newX
  targetX = newX
  targetY = newY
}

// 动画循环：缓动更新实际位置
function updateAnimation() {
  // 线性插值缓动
  let dx = targetX - currentX.value
  let dy = targetY - currentY.value
  let stepX = dx * EASING
  let stepY = dy * EASING
  
  // 当移动距离极小，直接到达目标（避免无限微小移动）
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
    currentX.value = targetX
    currentY.value = targetY
  } else {
    currentX.value += stepX
    currentY.value += stepY
  }
  
  rafId = requestAnimationFrame(updateAnimation)
}

// 初始化幽灵位置（屏幕中央）
function initGhostPosition() {
  if (!ghostRef.value) return
  ghostWidth = ghostRef.value.offsetWidth
  ghostHeight = ghostRef.value.offsetHeight
  
  const centerX = (window.innerWidth - ghostWidth) / 2
  const centerY = (window.innerHeight - ghostHeight) / 2
  // 边界限制
  const maxX = window.innerWidth - ghostWidth - MARGIN
  const maxY = window.innerHeight - ghostHeight - MARGIN
  const initX = Math.min(Math.max(centerX, MARGIN), maxX)
  const initY = Math.min(Math.max(centerY, MARGIN), maxY)
  
  currentX.value = initX
  currentY.value = initY
  targetX = initX
  targetY = initY
}

// 返回首页
const goHome = () => {
  window.location.href = '/'
}

// 挂载时绑定事件、启动动画
onMounted(async () => {
  await nextTick()
  initGhostPosition()
  
  // 启动动画循环
  rafId = requestAnimationFrame(updateAnimation)
  
  // 监听鼠标移动
  window.addEventListener('mousemove', onMouseMove)
  
  // 监听触摸事件（移动端），并使用 passive: false 以允许 preventDefault 阻止滚动
  window.addEventListener('touchstart', onTouchStart, { passive: false })
  window.addEventListener('touchmove', onTouchMove, { passive: false })
  
  // 监听窗口尺寸变化
  window.addEventListener('resize', onResize)
})

// 卸载时清理事件和动画
onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('touchstart', onTouchStart)
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('resize', onResize)
  if (rafId) {
    cancelAnimationFrame(rafId)
  }
})
</script>

<style scoped>
/* 重置与全局样式 —— 明亮简约风格 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  user-select: none; /* 避免拖动时选中文字/幽灵 */
}

.not-found-container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;            /* 禁止滚动，避免干扰触摸跟随 */
  background: linear-gradient(145deg, #f9faff 0%, #f0f3ff 100%);
  font-family: 'Segoe UI', 'Poppins', system-ui, -apple-system, 'Inter', sans-serif;
}

/* 居中内容区域 */
.content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 2;
  width: 90%;
  max-width: 600px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(12px);
  border-radius: 56px;
  padding: 2.5rem 2rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.04), 0 8px 16px rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.6);
}

.title {
  font-size: clamp(5rem, 15vw, 9rem);
  font-weight: 800;
  background: linear-gradient(135deg, #2b2d42, #4a4e69);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  letter-spacing: 0.08em;
  margin-bottom: 0.5rem;
  text-shadow: 0 2px 5px rgba(0, 0, 0, 0.02);
}

.message {
  font-size: 1.2rem;
  color: #4a4e69;
  margin: 1.2rem 0 2rem;
  line-height: 1.6;
  font-weight: 450;
}

.home-btn {
  background: #2d3142;
  border: none;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  padding: 0.8rem 2rem;
  border-radius: 48px;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
  letter-spacing: 0.3px;
}

.home-btn:hover {
  background: #1e2130;
  transform: scale(0.96);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.1);
}

.home-btn:active {
  transform: scale(0.94);
}

/* 幽灵样式 —— 平滑跟随，不干扰点击 */
.ghost {
  position: fixed;
  top: 0;
  left: 0;
  width: 70px;
  height: 70px;
  font-size: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;   /* 让点击穿透，不影响按钮 */
  z-index: 100;
  filter: drop-shadow(0 8px 20px rgba(0, 0, 0, 0.12));
  transition: filter 0.2s ease;
  will-change: transform;
}

/* 移动端适配：幽灵尺寸略小 */
@media (max-width: 640px) {
  .ghost {
    width: 60px;
    height: 60px;
    font-size: 48px;
  }
  .content {
    padding: 1.8rem 1.5rem;
    width: 85%;
  }
  .message {
    font-size: 1rem;
  }
}
</style>