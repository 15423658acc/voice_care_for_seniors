<template>
   <div class="elder-health">
    <h1 class="page-heading">健康记录</h1>

    <button @click="openAddModal" class="elder-btn elder-btn-primary add-btn">
      ➕ 新增记录
    </button>

    <!-- 加载中 -->
    <div v-if="loading" class="loading">加载中...</div>
    <!-- 空状态 -->
    <div v-else-if="records.length === 0" class="empty">暂无记录，点击上方按钮添加</div>
    <!-- 记录列表 -->
    <div v-else class="record-list">
      <div v-for="item in records" :key="item.id" class="record-card" @click="viewDetail(item)">
        <div class="card-header">
          <span class="record-type-badge" :class="item.recordType">
            {{ item.recordType === 'medicine' ? '💊 药品' : '🩺 体检' }}
          </span>
          <span class="record-date">{{ formatDate(item.recordDate) }}</span>
        </div>
        <h3 class="record-title">{{ item.title }}</h3>
        <p class="record-content">{{ item.content }}</p>
      </div>
    </div>
  </div>

    <!-- 新增/编辑模态框 -->
    <div v-if="showModal" class="modal-mask" @click.self="closeModal">
      <div class="modal-container">
        <h2 class="modal-title">{{ isEdit ? '编辑记录' : '新增记录' }}</h2>
        <form @submit.prevent="submitRecord">
          <div class="form-group">
            <label class="form-label">标题 <span class="required">*</span></label>
            <input v-model="form.title" required class="elder-input" placeholder="例如：血压测量"  />
          </div>

          <div class="form-group">
            <label class="form-label">类型 <span class="required">*</span></label>
            <select v-model="form.recordType" required class="elder-select">
              <option value="medicine">💊 药品</option>
              <option value="checkup">🩺 体检</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">记录日期</label>
            <input type="date" v-model="form.recordDate" class="elder-input" />
          </div>

           <div class="form-group">
            <label class="form-label">详细内容</label>
            <textarea
              v-model="form.content"
              rows="4"
              class="elder-input"
              placeholder="请输入详细内容"
            ></textarea>
          </div>

          <div class="modal-actions">
            <button type="submit" :disabled="submitting" class="elder-btn elder-btn-primary">
              {{ submitting ? '保存中...' : '保存' }}
            </button>
            <button type="button" @click="closeModal" class="elder-btn">取消</button>
          </div>
          
        </form>
      </div>
    </div>

    <!-- 详情模态框 -->
<!--     <div v-if="showDetail" class="modal" @click.self="showDetail = false">
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
    </div> -->
            <div class="detail-field">
          <span class="field-label">日期</span>
          <span class="field-value">{{ formatDate(currentRecord.recordDate) }}</span>
        </div>

        <div class="detail-field">
          <span class="field-label">详细内容</span>
          <div class="field-content-box">{{ currentRecord.content }}</div>
        </div>

        <!-- 底部操作按钮（大、明显） -->
        <div class="modal-actions">
          <button @click="editRecord(currentRecord)" class="elder-btn">✏️ 编辑</button>
          <button @click="deleteRecord(currentRecord.id)" class="elder-btn elder-btn-warning">🗑️ 删除</button>
          <button @click="showDetail = false" class="elder-btn elder-btn-primary">关闭</button>
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
    records.value = res
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
@import '@/assets/elder.css';

.elder-health {
  max-width: 600px;
  margin: 0 auto;
  padding: var(--elder-space-md);
}
.page-heading {
  font-size: var(--elder-fs-3xl);
  font-weight: 700;
  margin-bottom: var(--elder-space-lg);
  text-align: center;
}
.add-btn {
  width: 100%;
  margin-bottom: var(--elder-space-lg);
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: var(--elder-space-md);
}
.record-card {
  background: var(--elder-bg-card);
  border: 3px solid var(--elder-border-dark);
  border-radius: var(--elder-radius-lg);
  padding: var(--elder-space-md);
  box-shadow: var(--elder-shadow-sm);
  cursor: pointer;
  transition: all 0.1s;
}
.record-card:active {
  background: var(--elder-primary-light);
  transform: scale(0.99);
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--elder-space-sm);
}
.record-type-badge {
  font-size: var(--elder-fs-large);
  font-weight: 700;
  padding: 6px 18px;
  border-radius: 40px;
  border: 2px solid;
}
.record-type-badge.medicine {
  background: #e6f0fa;
  border-color: #2a5f7a;
  color: #1a3f52;
}
.record-type-badge.checkup {
  background: #e8f0e6;
  border-color: #2c6b4b;
  color: #1f4a36;
}
.record-date {
  font-size: var(--elder-fs-large);
  font-weight: 600;
  background: var(--elder-border);
  padding: 6px 16px;
  border-radius: 30px;
  color: var(--elder-text-primary);
}
.record-title {
  font-size: var(--elder-fs-2xl);
  font-weight: 700;
  margin: var(--elder-space-sm) 0;
}
.record-content {
  font-size: var(--elder-fs-large);
  color: var(--elder-text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.loading, .empty {
  text-align: center;
  font-size: var(--elder-fs-xl);
  padding: var(--elder-space-xl);
  color: var(--elder-text-muted);
}
</style>