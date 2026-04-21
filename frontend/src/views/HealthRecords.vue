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
/* ==================== 全局适老化基础 ==================== */
.health-records {
  max-width: 600px;
  margin: 0 auto;
  padding: 24px 20px;
  background-color: #f7f6f2;      /* 柔和米白背景 */
  min-height: 100vh;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  font-weight: 600;                /* 全局粗体 */
  color: #1a232b;                  /* 高对比深灰 */
  -webkit-font-smoothing: antialiased;
}

/* 页面标题 */
.page-title {
  font-size: 36px;
  font-weight: 700;
  margin: 0 0 32px 0;
  text-align: center;
  color: #1a232b;
  letter-spacing: -0.01em;
}

/* ==================== 操作按钮 ==================== */
.actions {
  margin-bottom: 32px;
}

.add-btn {
  width: 100%;
  min-height: 64px;                /* 超大高度 */
  background-color: #1e4f6b;       /* 深蓝，沉稳 */
  color: #ffffff;
  font-size: 28px;
  font-weight: 700;
  border: 3px solid #143a4b;
  border-radius: 24px;
  padding: 12px 24px;
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0,0,0,0.05);
  transition: background-color 0.1s ease;
  touch-action: manipulation;
}
.add-btn:active {
  background-color: #143a4b;
  transform: scale(0.99);
}

/* ==================== 加载与空状态 ==================== */
.loading,
.empty {
  text-align: center;
  font-size: 28px;
  font-weight: 600;
  color: #4e5b66;
  padding: 48px 24px;
  background-color: #ffffff;
  border: 3px solid #cfd7de;
  border-radius: 24px;
  margin-top: 32px;
}

/* ==================== 卡片列表 ==================== */
.record-list {
  display: flex;
  flex-direction: column;
  gap: 24px;                       /* 卡片间距极大 */
}

.record-card {
  background-color: #ffffff;
  border: 4px solid #a0aab3;       /* 清晰粗边框，色盲友好 */
  border-radius: 28px;
  padding: 28px 24px;
  box-shadow: 0 6px 12px rgba(0,0,0,0.03);
  cursor: pointer;
  transition: background-color 0.1s;
  touch-action: manipulation;
}
.record-card:active {
  background-color: #e2ecf3;
}

/* 分类颜色（柔和高对比，不刺眼） */
.record-card:has(.record-type.medicine) {
  border-color: #0da6f3;
  background-color: #f9fcfe;
}
.record-card:has(.record-type.checkup) {
  border-color: #26d980;
  background-color: #f6fbf8;
}

/* 标题（药名）28px 加粗，最醒目 */
.record-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 16px 0;
  color: #1a232b;
  line-height: 1.3;
  word-break: break-word;
}

/* 时间标签：24px 加粗 + 浅底色块 */
.record-date {
  display: inline-block;
  font-size: 24px;
  font-weight: 700;
  background-color: #e6edf3;        /* 浅底色块 */
  padding: 8px 20px;
  border-radius: 40px;
  margin-bottom: 20px;
  color: #1e4f6b;
  border: 2px solid #a0aab3;
}

/* 类型标签 */
.record-type {
  display: inline-block;
  font-size: 24px;
  font-weight: 700;
  padding: 8px 24px;
  border-radius: 40px;
  margin-bottom: 16px;
  border: 3px solid;
}
.record-type.medicine {
  background-color: #e6f0fa;
  border-color: #2a5f7a;
  color: #1a3f52;
}
.record-type.checkup {
  background-color: #e8f0e6;
  border-color: #2c6b4b;
  color: #1f4a36;
}

/* 内容预览 */
.record-content {
  font-size: 22px;
  font-weight: 600;
  color: #4e5b66;
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

/* ==================== 模态框 ==================== */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal-content {
  background-color: #ffffff;
  border-radius: 36px;
  border: 4px solid #a0aab3;
  padding: 32px 24px;
  width: 100%;
  max-width: 560px;
  max-height: 80vh;                /* 占屏幕80%高度 */
  overflow-y: auto;
  box-shadow: 0 12px 24px rgba(0,0,0,0.1);
}

.modal-content h2 {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 28px 0;
  color: #1a232b;
}

/* 详情展示区（超大字体） */
.modal-content p {
  font-size: 24px;
  font-weight: 600;
  margin: 16px 0;
  line-height: 1.5;
}
.modal-content strong {
  font-weight: 700;
  color: #1a232b;
}
.detail-content {
  font-size: 24px;
  font-weight: 600;
  background-color: #f2f5f7;
  padding: 20px;
  border-radius: 20px;
  border: 3px solid #cfd7de;
  margin: 16px 0;
  word-break: break-word;
  line-height: 1.6;
}

/* ==================== 表单（编辑态） ==================== */
.form-group {
  margin-bottom: 28px;
}
.form-group label {
  display: block;
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 12px;
  color: #1a232b;
}
.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 18px 20px;
  font-size: 24px;
  font-weight: 600;
  border: 4px solid #a0aab3;
  border-radius: 20px;
  background-color: #ffffff;
  color: #1a232b;
  outline: none;
  font-family: inherit;
  -webkit-appearance: none;
  appearance: none;
}
.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: #1e4f6b;
  box-shadow: 0 0 0 6px rgba(30,79,107,0.15);
}
.form-group textarea {
  min-height: 140px;
  resize: vertical;
}

/* 表单按钮区域（底部固定操作栏风格） */
.form-buttons {
  display: flex;
  gap: 20px;
  margin-top: 32px;
  flex-wrap: wrap;
}
.form-buttons button {
  flex: 1 1 0;
  min-width: 140px;
  min-height: 64px;                /* 超大按钮 */
  font-size: 26px;
  font-weight: 700;
  border-radius: 24px;
  border: 4px solid #a0aab3;
  background-color: #ffffff;
  color: #1a232b;
  padding: 12px 20px;
  cursor: pointer;
  transition: all 0.1s;
  touch-action: manipulation;
}
.form-buttons button[type="submit"] {
  background-color: #1e4f6b;
  border-color: #143a4b;
  color: #ffffff;
}
.form-buttons button[type="submit"]:active {
  background-color: #143a4b;
}
.form-buttons button:active {
  background-color: #cfd7de;
  transform: scale(0.98);
}
.form-buttons button:disabled {
  opacity: 0.5;
  pointer-events: none;
}

/* 移动端进一步优化 */
@media (max-width: 480px) {
  .health-records {
    padding: 16px 12px;
  }
  .page-title {
    font-size: 32px;
  }
  .add-btn {
    font-size: 24px;
    min-height: 72px;
  }
  .record-title {
    font-size: 26px;
  }
  .record-date {
    font-size: 22px;
  }
  .record-type {
    font-size: 22px;
  }
  .record-content {
    font-size: 20px;
  }
  .modal-content {
    padding: 24px 18px;
  }
  .modal-content h2 {
    font-size: 28px;
  }
  .modal-content p,
  .detail-content {
    font-size: 22px;
  }
  .form-group label {
    font-size: 22px;
  }
  .form-group input,
  .form-group select,
  .form-group textarea {
    font-size: 22px;
    padding: 16px;
  }
  .form-buttons button {
    font-size: 24px;
    min-height: 72px;
  }
}
</style>