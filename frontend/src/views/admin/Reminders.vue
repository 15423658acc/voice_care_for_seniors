<template>
  <div class="reminders">
    <div class="page-header">
      <h1>吃药提醒管理</h1>
    </div>

    <div class="action-bar">
      <button @click="openAddModal" class="btn btn-primary"> 添加提醒</button>
      <select v-model="selectedUserId" @change="fetchReminders" class="select-elder">
        <option v-for="elder in elders" :key="elder.id" :value="elder.id">
          {{ elder.username }}
        </option>
      </select>
    </div>

    <div v-if="reminders.length" class="table-wrapper">
      <table>
        <thead>
          <tr><th>标题</th><th>药品</th><th>提醒时间</th><th>重复</th><th>状态</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in reminders" :key="r.id">
            <td>{{ r.title }}</td>
            <td>{{ r.medicine || '—' }}</td>
            <td class="time-cell">
              <div class="main-time" @click="quickEditTime(r)">
                {{ formatMainTime(r) }}
              </div>
              <div class="next-time">
                下次: {{ formatNextTime(r.nextRemindAt) }}
              </div>
            </td>
            <td>{{ repeatTypeText(r.repeatType) }}</td>
            <td>
              <span :class="r.taken ? 'status-taken' : 'status-pending'">
                {{ r.taken ? '已吃' : '未吃' }}
              </span>
            </td>
            <td>
              <div class="row-actions">
                <button @click="editReminder(r)" class="btn btn-outline btn-sm">编辑</button>
                <button @click="deleteReminder(r.id)" class="btn btn-outline btn-sm">删除</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-else class="empty-state">暂无提醒，点击上方添加</p>

 <!-- 模态框 -->
    <div v-if="showModal" class="modal-mask" @click.self="closeModal">
      <div class="modal-container">
        <h2>{{ isEdit ? '编辑提醒' : '添加提醒' }}</h2>
        <form @submit.prevent="submitReminder">
          <div class="form-group">
            <label>标题 *</label>
            <input v-model="form.title" required />
          </div>
          <div class="form-group">
            <label>药品名</label>
            <input v-model="form.medicine" />
          </div>
          <div class="form-group">
            <label>描述</label>
            <textarea v-model="form.description"></textarea>
          </div>
          <div class="form-group">
            <label>提醒时间 *</label>
            <input type="datetime-local" v-model="form.remindAt" required />
          </div>
          <!-- 新增：重复类型下拉框 -->
          <div class="form-group">
            <label>重复规则</label>
            <select v-model="form.repeatType">
              <option value="none">不重复（单次）</option>
              <option value="daily">每天一次</option>
              <option value="every_other_day">隔天一次</option>
              <option value="weekly">每周一次</option>
            </select>
          </div>
          <div class="form-buttons" style="display: flex; gap: 12px; margin-top: 24px;">
            <button type="submit" class="btn btn-primary">保存</button>
            <button type="button" @click="closeModal" class="btn">取消</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'

const reminders = ref([])
const elders = ref([])
const selectedUserId = ref(null)
const showModal = ref(false)
const isEdit = ref(false)
const form = ref({
  id: null,
  title: '',
  medicine: '',
  description: '',
  remindAt: '',
  repeatType: 'none'     // 新增字段，默认不重复
})

// 辅助函数：重复类型转中文
const repeatTypeText = (type) => {
  const map = {
    none: '单次',
    daily: '每日',
    every_other_day: '隔日',
    weekly: '每周'
  }
  return map[type] || '单次'
}

const fetchElders = async () => {
  try {
    const res = await api.get('/users/elders')
    elders.value = res
    if (elders.value.length) {
      selectedUserId.value = elders.value[0].id
      await fetchReminders()
    }
  } catch (error) {
    console.error('获取老人列表失败', error)
  }
}

const fetchReminders = async () => {
  if (!selectedUserId.value) return
  try {
    const res = await api.get('/reminders', { params: { userId: selectedUserId.value } })
    reminders.value = res
  } catch (error) {
    console.error('获取提醒失败', error)
  }
}


// 新增：子女端优化交互体验====================
// 格式化主行：周期类型 + 时间（HH:MM）
const formatMainTime = (reminder) => {
  const time = reminder.time || (reminder.remindAt ? new Date(reminder.remindAt).toLocaleTimeString('zh-CN', { hour12: false }).slice(0,5) : '')
  const repeatMap = { none: '单次', daily: '每日', every_other_day: '隔日', weekly: '每周' }
  const repeatText = repeatMap[reminder.repeatType] || ''
  return `${repeatText} ${time}`.trim()
}
// 格式化副行：下次提醒时间（MM/DD HH:MM）
const formatNextTime = (nextRemindAt) => {
  if (!nextRemindAt) return '暂无'
  const d = new Date(nextRemindAt)
  const month = (d.getMonth() + 1).toString().padStart(2,'0')
  const day = d.getDate().toString().padStart(2,'0')
  const hours = d.getHours().toString().padStart(2,'0')
  const mins = d.getMinutes().toString().padStart(2,'0')
  return `${month}/${day} ${hours}:${mins}`
}
// 快速编辑（点击主行）
const quickEditTime = (reminder) => {
  // 复用已有的 editReminder 方法，它会打开模态框并填充数据
  editReminder(reminder)
}
// 新增结束================================


const openAddModal = () => {
  isEdit.value = false
  form.value = {
    id: null,
    title: '',
    medicine: '',
    description: '',
    remindAt: '',
    repeatType: ''
  }
  showModal.value = true
}

const editReminder = (reminder) => {
  isEdit.value = true
  form.value = {
    ...reminder,
    remindAt: reminder.remindAt ? reminder.remindAt.slice(0, 16) : '',
    repeatType: reminder.repeatType || 'none'
  }
  showModal.value = true
}

const submitReminder = async () => {
  try {
    const payload = {
      title: form.value.title,
      medicine: form.value.medicine,
      description: form.value.description,
      remindAt: form.value.remindAt,
      repeatType: form.value.repeatType   // 新增
    }
    if (isEdit.value) {
      await api.put(`/reminders/${form.value.id}`, payload)
    } else {
      payload.userId = selectedUserId.value
      await api.post('/reminders', payload)
    }
    closeModal()
    fetchReminders()
  } catch (error) {
    console.error('保存失败', error)
  }
}

const deleteReminder = async (id) => {
  if (!confirm('确定删除吗？')) return
  try {
    await api.delete(`/reminders/${id}`)
    fetchReminders()
  } catch (error) {
    console.error('删除失败', error)
  }
}

const closeModal = () => {
  showModal.value = false
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString()
}

onMounted(() => {
  fetchElders()
})
</script>

<style scoped>

.page-header {
  margin-bottom: var(--space-lg);
}
.status-taken {
  color: var(--primary-dark);
  background: var(--primary-light);
  padding: 4px 10px;
  border-radius: 30px;
  font-size: 13px;
}
.status-pending {
  color: #b85c5c;
  background: #fce8e8;
  padding: 4px 10px;
  border-radius: 30px;
  font-size: 13px;
}
.row-actions {
  display: flex;
  gap: 8px;
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