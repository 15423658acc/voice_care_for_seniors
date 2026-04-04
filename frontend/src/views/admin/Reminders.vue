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
      <thead>
        <tr><th>标题</th><th>药品</th><th>提醒时间</th><th>状态</th><th>操作</th></tr>
      </thead>
      <tbody>
        <tr v-for="r in reminders" :key="r.id">
          <td>{{ r.title }}</td>
          <td>{{ r.medicine }}</td>
          <td>{{ formatDateTime(r.remindAt) }}</td>
          <td>{{ r.taken ? '已吃' : '待提醒' }}</td>
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
  remindAt: ''
})

const fetchElders = async () => {
  try {
    const res = await api.get('/users?role=elder')
    elders.value = res
  //   if (elders.value.length) selectedUserId.value = elders.value[0].id
  // } catch (error) {
  //   console.error('获取老人列表失败', error)
  // }
  if (elders.value.length) {
      selectedUserId.value = elders.value[0].id
      await fetchReminders()   // 添加
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

const openAddModal = () => {
  isEdit.value = false
  form.value = { id: null, title: '', medicine: '', description: '', remindAt: '' }
  showModal.value = true
}

const editReminder = (reminder) => {
  isEdit.value = true
  form.value = {
    ...reminder,
    remindAt: reminder.remindAt ? reminder.remindAt.slice(0, 16) : '' // datetime-local 格式
  }
  showModal.value = true
}

const submitReminder = async () => {
  // console.log('提交的数据:', form.value);
  try {
    if (isEdit.value) {
      await api.put(`/reminders/${form.value.id}`, {
        title: form.value.title,
        medicine: form.value.medicine,
        description: form.value.description,
        remindAt: form.value.remindAt
      })
    } else {
      await api.post('/reminders', {
        title: form.value.title,
        medicine: form.value.medicine,
        description: form.value.description,
        remindAt: form.value.remindAt,
        userId: selectedUserId.value
      })
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
/* 样式可自行补充 */
</style>