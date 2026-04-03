<template>
  <div class="health-records-admin">
    <h1>健康记录管理</h1>
    <div class="actions">
      <button @click="openAddModal">添加记录</button>
      <select v-model="selectedUserId" @change="fetchRecords">
        <option v-for="elder in elders" :key="elder.id" :value="elder.id">{{ elder.username }}</option>
      </select>
    </div>

    <!-- 记录列表（复用老人端的卡片样式） -->
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="records.length === 0" class="empty">暂无记录</div>
    <div v-else class="record-list">
      <div v-for="item in records" :key="item.id" class="record-card" @click="viewDetail(item)">
        <h3 class="record-title">{{ item.title }}</h3>
        <p class="record-date">{{ formatDate(item.recordDate) }}</p>
        <p class="record-type" :class="item.recordType">
          {{ item.recordType === 'medicine' ? '药品' : '体检' }}
        </p>
        <p class="record-content">{{ item.content }}</p>
      </div>
    </div>

    <!-- 新增/编辑模态框（同老人端） -->
    <div v-if="showModal" class="modal" @click.self="closeModal">
      <div class="modal-content">
        <h2>{{ isEdit ? '编辑记录' : '添加记录' }}</h2>
        <form @submit.prevent="submitRecord">
          <div class="form-group">
            <label>标题 *</label>
            <input v-model="form.title" required />
          </div>
          <div class="form-group">
            <label>类型 *</label>
            <select v-model="form.recordType" required>
              <option value="medicine">药品</option>
              <option value="checkup">体检</option>
            </select>
          </div>
          <div class="form-group">
            <label>记录日期</label>
            <input type="date" v-model="form.recordDate" />
          </div>
          <div class="form-group">
            <label>详细内容</label>
            <textarea v-model="form.content" rows="4"></textarea>
          </div>
          <div class="form-buttons">
            <button type="submit" :disabled="submitting">保存</button>
            <button type="button" @click="closeModal">取消</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 详情模态框 -->
    <div v-if="showDetail" class="modal" @click.self="showDetail = false">
      <div class="modal-content">
        <h2>{{ currentRecord.title }}</h2>
        <p><strong>类型：</strong>{{ currentRecord.recordType === 'medicine' ? '药品' : '体检' }}</p>
        <p><strong>日期：</strong>{{ formatDate(currentRecord.recordDate) }}</p>
        <p><strong>内容：</strong></p>
        <p class="detail-content">{{ currentRecord.content }}</p>
        <div class="form-buttons">
          <button @click="editRecord(currentRecord)">编辑</button>
          <button @click="deleteRecord(currentRecord.id)">删除</button>
          <button @click="showDetail = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'

const records = ref([])
const elders = ref([])
const selectedUserId = ref(null)
const loading = ref(false)
const showModal = ref(false)
const showDetail = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const currentRecord = ref({})
const form = ref({
  id: null,
  title: '',
  recordType: 'medicine',
  recordDate: '',
  content: ''
})

// 获取所有老人
const fetchElders = async () => {
  try {
    const res = await api.get('/users?role=elder')
    elders.value = res

    // 添加内容：默认选中第一个老人后获取记录
    if (elders.value.length) {
      selectedUserId.value = elders.value[0].id
      await fetchRecords()   // 添加这一行
    }
  } catch (error) {
    console.error('获取老人列表失败', error)
  }
}

// 获取健康记录
const fetchRecords = async () => {
  if (!selectedUserId.value) return
  loading.value = true
  try {
    const res = await api.get('/health', { params: { userId: selectedUserId.value } })
    records.value = res

  } catch (error) {
    console.error('获取记录失败', error)
  } finally {
    loading.value = false
  }
}

// 打开新增模态框
const openAddModal = () => {
  form.value = {
    id: null,
    title: '',
    recordType: 'medicine',
    recordDate: '',
    content: ''
  }
  isEdit.value = false
  showModal.value = true
}

// 编辑记录
const editRecord = (record) => {
  showDetail.value = false
  form.value = {
    id: record.id,
    title: record.title,
    recordType: record.recordType,
    recordDate: record.recordDate ? record.recordDate.split('T')[0] : '',
    content: record.content || ''
  }
  isEdit.value = true
  showModal.value = true
}

// 提交
const submitRecord = async () => {
  submitting.value = true
  try {
    if (isEdit.value) {
      await api.put(`/health/${form.value.id}`, {
        title: form.value.title,
        recordType: form.value.recordType,
        recordDate: form.value.recordDate,
        content: form.value.content
      })
    } else {
      await api.post('/health', {
        title: form.value.title,
        recordType: form.value.recordType,
        recordDate: form.value.recordDate,
        content: form.value.content,
        userId: selectedUserId.value
      })
    }
    await fetchRecords()
    closeModal()
  } catch (error) {
    console.error('保存失败', error)
  } finally {
    submitting.value = false
  }
}

// 删除
const deleteRecord = async (id) => {
  if (!confirm('确定删除吗？')) return
  try {
    await api.delete(`/health/${id}`)
    await fetchRecords()
    if (showDetail.value) showDetail.value = false
  } catch (error) {
    console.error('删除失败', error)
  }
}

const viewDetail = (record) => {
  currentRecord.value = { ...record }
  showDetail.value = true
}

const closeModal = () => {
  showModal.value = false
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

onMounted(() => {
  fetchElders()
})
</script>

<style scoped>
/* 样式可复用老人端健康记录的样式 */
</style>