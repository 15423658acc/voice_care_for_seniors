<template>
  <div class="function-wrapper">
    <!-- 核心：功能按钮 -->
    <button 
      class="action-btn"
      :disabled="loading" 
      @click="handleAction"
    >
      <!-- 根据加载状态切换按钮文字 -->
      <span v-if="!loading">点击执行功能</span>
      <span v-else>执行中...</span>
    </button>

    <!-- 提示文字区域：根据状态显示不同内容 -->
    <div class="tip-text" :class="tipStatus">
      {{ tipMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// 状态管理
const loading = ref(false) // 加载状态
const tipMessage = ref('') // 提示文字
const tipStatus = ref('') // 提示样式状态（默认/成功/失败）

// 模拟后端请求的核心方法
const handleAction = async () => {
  // 1. 开始执行：重置状态 + 显示加载
  loading.value = true
  tipMessage.value = '正在处理请求，请稍候...'
  tipStatus.value = 'loading'

  try {
    // 2. 模拟后端请求（延时1.5秒，假装调用接口）
    await new Promise((resolve, reject) => {
      // 这里可以模拟成功/失败，80%概率成功，20%失败
      setTimeout(() => {
        const random = Math.random()
        if (random > 0.2) resolve()
        else reject(new Error('模拟后端执行失败'))
      }, 1500)
    })

    // 3. 请求成功
    tipMessage.value = '✅ 功能执行成功！操作已完成'
    tipStatus.value = 'success'
  } catch (err) {
    // 4. 请求失败
    tipMessage.value = `❌ 功能执行失败：${err.message}`
    tipStatus.value = 'error'
  } finally {
    // 5. 无论成功失败，关闭加载状态
    loading.value = false
  }
}
</script>

<style scoped>
/* 整体包装容器 */
.function-wrapper {
  width: 300px;
  margin: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 按钮样式 */
.action-btn {
  padding: 10px 20px;
  background-color: #409eff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.action-btn:disabled {
  background-color: #a0cfff;
  cursor: not-allowed;
}

.action-btn:hover:not(:disabled) {
  background-color: #66b1ff;
}

/* 提示文字基础样式 */
.tip-text {
  font-size: 13px;
  min-height: 20px;
  padding: 4px 8px;
  border-radius: 4px;
}

/* 不同状态的提示样式 */
.tip-text.loading {
  color: #666;
  background-color: #f5f7fa;
}

.tip-text.success {
  color: #00b42a;
  background-color: #e6ffed;
}

.tip-text.error {
  color: #f53f3f;
  background-color: #fee1e0;
}
</style>