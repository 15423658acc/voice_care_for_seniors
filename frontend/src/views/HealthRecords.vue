<template>
  <div class="health-records">
    <h1 class="page-title">📋 健康记录</h1>
    <div class="actions">
      <button class="add-btn" @click="openAddModal">➕ 新增记录</button>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="loading">加载中...</div>
    <!-- 空状态 -->
    <div v-else-if="records.length === 0" class="empty">暂无记录，点击上方按钮添加</div>
    <!-- 记录列表 -->
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

    <!-- 新增/编辑模态框 -->
    <div v-if="showModal" class="modal" @click.self="closeModal">
      <div class="modal-content">
        <h2>{{ isEdit ? '编辑记录' : '新增记录' }}</h2>
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
const loading = ref(false)
const showModal = ref(false)
const showDetail = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const currentRecord = ref({})

// 表单数据
const form = ref({
  id: null,
  title: '',
  recordType: 'medicine',
  recordDate: '',
  content: ''
})

// 获取记录列表
const fetchRecords = async () => {
  loading.value = true
  try {
    const res = await api.get('/health')
    records.value = res.data
  } catch (error) {
    console.error('获取记录失败', error)
  } finally {
    loading.value = false
  }
}

// 查看详情
const viewDetail = (record) => {
  currentRecord.value = { ...record }
  showDetail.value = true
}

// 编辑记录（从详情打开）
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

// 提交表单（新增或编辑）
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
        content: form.value.content
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

// 删除记录
const deleteRecord = async (id) => {
  if (!confirm('确定要删除这条记录吗？')) return
  try {
    await api.delete(`/health/${id}`)
    await fetchRecords()
    if (showDetail.value) showDetail.value = false
  } catch (error) {
    console.error('删除失败', error)
  }
}

// 关闭模态框
const closeModal = () => {
  showModal.value = false
}

// 格式化日期
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

onMounted(() => {
  fetchRecords()
})
</script>

<style scoped>
/* 适老化大字体、大间距 */
.health-records {
  padding: 1rem;
  max-width: 600px;
  margin: 0 auto;
}
.page-title {
  font-size: 2rem;
  text-align: center;
  margin-bottom: 1rem;
}
.actions {
  text-align: right;
  margin-bottom: 1rem;
}
.add-btn {
  background-color: #4caf50;
  color: white;
  font-size: 1.4rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
}
.record-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.record-card {
  background-color: #f9f9f9;
  padding: 1rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s;
}
.record-card:hover {
  background-color: #e0e0e0;
}
.record-title {
  font-size: 1.6rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}
.record-date {
  font-size: 1.2rem;
  color: #666;
  margin-bottom: 0.5rem;
}
.record-type {
  display: inline-block;
  font-size: 1.2rem;
  padding: 0.2rem 0.5rem;
  border-radius: 0.3rem;
  background-color: #ddd;
}
.record-type.medicine {
  background-color: #ffebee;
  color: #c62828;
}
.record-type.checkup {
  background-color: #e0f2fe;
  color: #0277bd;
}
.record-content {
  font-size: 1.4rem;
  margin-top: 0.5rem;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background-color: white;
  padding: 2rem;
  border-radius: 1rem;
  width: 90%;
  max-width: 500px;
  max-height: 80%;
  overflow-y: auto;
}
.form-group {
  margin-bottom: 1rem;
}
.form-group label {
  display: block;
  font-size: 1.4rem;
  margin-bottom: 0.3rem;
}
.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.5rem;
  font-size: 1.4rem;
  border: 1px solid #ccc;
  border-radius: 0.3rem;
}
.form-buttons {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1rem;
}
.form-buttons button {
  padding: 0.5rem 1rem;
  font-size: 1.4rem;
  border: none;
  border-radius: 0.3rem;
  cursor: pointer;
}
.form-buttons button[type="submit"] {
  background-color: #4caf50;
  color: white;
}
.form-buttons button[type="button"] {
  background-color: #f44336;
  color: white;
}
.loading, .empty {
  text-align: center;
  font-size: 1.4rem;
  color: #666;
  margin-top: 2rem;
}
.detail-content {
  white-space: pre-wrap;
  font-size: 1.4rem;
  margin-top: 0.5rem;
  background: #f5f5f5;
  padding: 0.5rem;
  border-radius: 0.3rem;
}
</style>