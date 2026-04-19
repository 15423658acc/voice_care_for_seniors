<template>
  <div class="emergency-logs">
    <div class="page-header">
      <h1>紧急求助记录</h1>
    </div>

    <div class="action-bar">
      <select v-model="selectedUserId" @change="fetchLogs" class="select-elder">
        <option value="">所有老人</option>
        <option v-for="elder in elders" :key="elder.id" :value="elder.id">
          {{ elder.username }}
        </option>
      </select>

      <div class="notification-control">
        <button v-if="!pushEnabled" @click="enableEmergencyPush" class="btn btn-primary">
          🔔 开启紧急通知推送
        </button>
        <span v-else class="push-status">✅ 紧急通知已开启</span>
      </div>
    </div>

    <div v-if="logs.length" class="table-wrapper">
      <table>
        <thead>
          <tr><th>老人</th><th>时间</th><th>位置</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="log in logs" :key="log.id">
            <td>{{ log.user?.username || '未知' }}</td>
            <td>{{ formatDateTime(log.createdAt) }}</td>
            <td>
              <a v-if="log.location" :href="log.location" target="_blank" class="link">查看地图</a>
              <span v-else>无位置</span>
            </td>
            <td>
              <button @click="viewDetail(log)" class="btn btn-outline btn-sm">详情</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-else class="empty-state">暂无求助记录</p>

    <!-- 详情模态框 -->
    <div v-if="showDetail" class="modal-mask" @click.self="showDetail = false">
      <div class="modal-container">
        <h2>求助详情</h2>
        <div class="detail-content">
          <p><strong>老人：</strong>{{ currentLog.user?.username }}</p>
          <p><strong>时间：</strong>{{ formatDateTime(currentLog.createdAt) }}</p>
          <p><strong>纬度：</strong>{{ currentLog.latitude }}</p>
          <p><strong>经度：</strong>{{ currentLog.longitude }}</p>
          <p><strong>位置：</strong>{{ currentLog.location || '未提供' }}</p>
        </div>
        <div class="modal-actions">
          <button @click="showDetail = false" class="btn">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>


<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'
import { usePush } from '@/composables/usePush'

const logs = ref([])
const elders = ref([])
const selectedUserId = ref('')
const showDetail = ref(false)
const currentLog = ref({})


// 推送通知状态
const pushEnabled = ref(false)
const { subscribeUser, checkExistingSubscription, initPush } = usePush()
// 获取当前登录子女信息
const getUserInfo = () => {
  try {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  } catch {
    return null
  }
}
// 开启紧急通知推送
const enableEmergencyPush = async () => {
  const user = getUserInfo()
  if (!user) {
    alert('请先登录')
    return
  }
  try {
const permission = await Notification.requestPermission()
    console.log('用户选择权限：', permission)

    if (permission !== 'granted') {
      alert('请允许通知权限，否则无法接收紧急提醒')
      return
    }


    await subscribeUser(user.id, 'child')
    pushEnabled.value = true
    alert('紧急通知已开启，您将收到老人的紧急呼叫提醒。')
  } catch (err) {
    console.error('订阅失败', err)
    alert('订阅失败，请检查浏览器通知权限')
  }
}



const fetchElders = async () => {
  try {
    // const res = await api.get('/users?role=elder')
    const res = await api.get('/users/elders')
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

// 页面加载：同时执行原有方法 + 推送初始化
/* onMounted(() => {
  fetchElders()
  fetchLogs()
}) */
onMounted(async () => {
  fetchElders()
  fetchLogs()

  // 初始化推送订阅状态
  await initPush()
  const hasSub = await checkExistingSubscription()
  if (hasSub) {
    const user = getUserInfo()
    if (user) {
      await subscribeUser(user.id, 'child')
    }
    pushEnabled.value = true
  }
})
</script>

<style scoped>
/* 局部微调 */
.page-header {
  margin-bottom: var(--space-lg);
}
.push-status {
  font-weight: 500;
  color: var(--primary-dark);
  background: var(--primary-light);
  padding: 6px 14px;
  border-radius: 30px;
  font-size: var(--fs-small);
}
.link {
  color: var(--primary);
  text-decoration: none;
}
.link:hover {
  text-decoration: underline;
}
.detail-content p {
  margin: 12px 0;
}
.modal-actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}
.btn-sm {
  padding: 6px 14px;
  font-size: 14px;
}
.empty-state {
  text-align: center;
  padding: var(--space-xl);
  color: var(--text-muted);
  background: var(--gray-50);
  border-radius: var(--radius-card);
}
</style>