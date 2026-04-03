<template>
  <div class="emergency-logs">
    <h1>紧急求助记录</h1>
    <div class="actions">
      <select v-model="selectedUserId" @change="fetchLogs">
        <option value="">所有老人</option>
        <option v-for="elder in elders" :key="elder.id" :value="elder.id">{{ elder.username }}</option>
      </select>
    </div>

    <table v-if="logs.length">
      <thead>
        <tr><th>老人</th><th>时间</th><th>位置</th><th>操作</th></tr>
      </thead>
      <tbody>
        <tr v-for="log in logs" :key="log.id">
          <td>{{ log.user?.username || '未知' }}</td>
          <td>{{ formatDateTime(log.createdAt) }}</td>
          <td>
            <a v-if="log.location" :href="log.location" target="_blank">查看地图</a>
            <span v-else>无位置</span>
          </td>
          <td>
            <button @click="viewDetail(log)">详情</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else>暂无求助记录</p>

    <!-- 详情模态框 -->
    <div v-if="showDetail" class="modal" @click.self="showDetail = false">
      <div class="modal-content">
        <h2>求助详情</h2>
        <p><strong>老人：</strong>{{ currentLog.user?.username }}</p>
        <p><strong>时间：</strong>{{ formatDateTime(currentLog.createdAt) }}</p>
        <p><strong>纬度：</strong>{{ currentLog.latitude }}</p>
        <p><strong>经度：</strong>{{ currentLog.longitude }}</p>
        <p><strong>位置：</strong>{{ currentLog.location }}</p>
        <div class="form-buttons">
          <button @click="showDetail = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'

const logs = ref([])
const elders = ref([])
const selectedUserId = ref('')
const showDetail = ref(false)
const currentLog = ref({})

const fetchElders = async () => {
  try {
    const res = await api.get('/users?role=elder')
    elders.value = res

    // 添加内容：默认选中第一个老人
    if (elders.value.length) {
      selectedUserId.value = elders.value[0].id
      await fetchLogs()   // 手动调用
    }

  } catch (error) {
    console.error('获取老人列表失败', error)
  }
}

const fetchLogs = async () => {
  try {
    const params = selectedUserId.value ? { userId: selectedUserId.value } : {}
    const res = await api.get('/emergency-logs', { params })
    logs.value = res
    // console.log(res);
    // console.log(res.data);
  } catch (error) {
    console.error('获取求助记录失败', error)
  }
}

const viewDetail = (log) => {
  currentLog.value = log
  showDetail.value = true
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString()
}

onMounted(() => {
  fetchElders()
  fetchLogs()
})
</script>

<style scoped>
/* 样式略 */
</style>