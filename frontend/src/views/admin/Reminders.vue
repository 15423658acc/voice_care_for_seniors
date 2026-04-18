<template>
  <div class="reminders">
    <h1>吃药提醒管理</h1>
    <div class="actions">
      <button @click="openAddModal">添加提醒</button>
      <select v-model="selectedUserId" @change="fetchReminders">
        <option v-for="elder in elders" :key="elder.id" :value="elder.id">{{ elder.username }}</option>
      </select>
    </div>

    <table v-if="reminders.length">
      <!-- 表头增加“重复”列 -->
      <thead>
        <tr><th>标题</th><th>药品</th><th>提醒时间</th><th>重复</th><th>状态</th><th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in reminders" :key="r.id">
          <td>{{ r.title }}</td>
          <td>{{ r.medicine }}</td>
          <!-- <td>{{ formatDateTime(r.remindAt) }}</td> -->
          <td class="time-cell">
            <div class="main-time" @click="quickEditTime(r)">
              {{ formatMainTime(r) }}
            </div>
            <div class="next-time"">
              下次提醒时间: {{ formatNextTime(r.nextRemindAt) }}
            </div>
          </td>
          <td>{{ repeatTypeText(r.repeatType) }}</td>
          <td>{{ r.taken ? '今日已吃' : '未吃' }}</td>
          <td>
            <button @click="editReminder(r)">编辑</button>
            <button @click="deleteReminder(r.id)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else>暂无提醒</p>

    <!-- 模态框 -->
    <div v-if="showModal" class="modal" @click.self="closeModal">
      <div class="modal-content">
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
          <div class="form-buttons">
            <button type="submit">保存</button>
            <button type="button" @click="closeModal">取消</button>
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
    repeatType: 'none'
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
/* ========== 子女端优化交互体验 ========== */
.time-cell {
  cursor: pointer;
  user-select: none;
}
.main-time {
  font-size: 1.2rem;
  font-weight: bold;
  color: #2c3e50;
  padding: 6px 0;
}
.main-time:active {
  background-color: #f0f0f0;
}
.next-time {
  font-size: 0.9rem;
  color: #666;
  padding: 4px 0;
}
.next-time:active {
  background-color: #f5f5f5;
}
/* 确保点击区域足够大，移动端友好 */
@media (max-width: 600px) {
  .main-time, .next-time {
    padding: 8px 0;
  }
}
</style>