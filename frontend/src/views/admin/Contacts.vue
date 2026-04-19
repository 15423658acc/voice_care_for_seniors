<template>
  <div class="contacts-page">
    <div class="page-header">
      <h1>紧急联系人</h1>
    </div>
    <div class="action-bar">
      <button class="btn btn-primary" @click="openAddModal">添加联系人</button>
      <select v-model="selectedUserId" @change="fetchContacts" class="select-elder">
        <option v-for="elder in elders" :key="elder.id" :value="elder.id">{{ elder.username }}</option>
      </select>
    </div>

    <div v-if="contacts.length" class="table-wrapper">
      <table>
        <thead>
          <tr><th>姓名</th><th>电话</th><th>邮箱</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="c in contacts" :key="c.id">
            <td>{{ c.name }}</td>
            <td>{{ c.phone }}</td>
            <td>{{ c.email || '—' }}</td>
            <td>
              <div class="row-actions">
                <button class="btn btn-outline btn-sm" @click="editContact(c)">编辑</button>
                <button class="btn btn-outline btn-sm" @click="deleteContact(c.id)">删除</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-else class="empty-state">暂无联系人，点击上方添加</p>

     <!-- 模态框（可复用全局modal样式） -->
    <div v-if="showModal" class="modal-mask" @click.self="closeModal">
      <div class="modal-container">
        <h2>{{ isEdit ? '编辑联系人' : '添加联系人' }}</h2>
        <form @submit.prevent="submitContact">
          <div class="form-group">
            <label>姓名 *</label>
            <input v-model="form.name" required placeholder="例如：李医生" />
          </div>
          <div class="form-group">
            <label>电话 *</label>
            <input v-model="form.phone" required placeholder="手机号码" />
          </div>
          <div class="form-group">
            <label>邮箱</label>
            <input v-model="form.email" type="email" placeholder="选填" />
          </div>
          <div class="form-buttons" style="display: flex; gap: 12px; margin-top: 24px;">
            <button type="submit" class="btn btn-primary">保存</button>
            <button type="button" class="btn" @click="closeModal">取消</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'

const contacts = ref([])
const elders = ref([])
const selectedUserId = ref(null)
const showModal = ref(false)
const isEdit = ref(false)
const form = ref({ id: null, name: '', phone: '', email: '' })

const fetchElders = async () => {
  try {
    // const res = await api.get('/users?role=elder')
    const res = await api.get('/users/elders')  // 修改为获取当前子女绑定的老人列表
    // console.log('fetchElders 返回的 res:', res)
    elders.value = res
    // console.log('赋值后的 elders.value:', elders.value)
    
  if (elders.value.length) {
        selectedUserId.value = elders.value[0].id
        // console.log('设置 selectedUserId:', selectedUserId.value)
        await fetchContacts()   // 刷新后调用
      } else {
        console.warn('老人列表为空')
      }
    } catch (error) {
      console.error('获取老人列表失败', error)
    }
}

// const fetchContacts = async () => {
//   if (!selectedUserId.value) return
//   try {
//     const res = await api.get('/contacts', { params: { userId: selectedUserId.value } })
//     contacts.value = res

    
//   } catch (error) {
//     console.error('获取联系人失败', error)
//   }
// }

const fetchContacts = async () => {
  if (!selectedUserId.value) {
    // console.warn('selectedUserId 为空，不请求联系人')
    return
  }
  try {
    const res = await api.get('/contacts', { params: { userId: selectedUserId.value } })
    // console.log('fetchContacts 返回的 res:', res)
    contacts.value = res
    // console.log('赋值后的 contacts.value:', contacts.value)
  } catch (error) {
    console.error('获取联系人失败', error)
  }
}

const openAddModal = () => {
  isEdit.value = false
  form.value = { id: null, name: '', phone: '', email: '' }
  showModal.value = true
}

const editContact = (contact) => {
  isEdit.value = true
  form.value = { ...contact }
  showModal.value = true
}

const submitContact = async () => {
  try {
    if (isEdit.value) {
      await api.put(`/contacts/${form.value.id}`, {
        name: form.value.name,
        phone: form.value.phone,
        email: form.value.email
      })
    } else {
      await api.post('/contacts', {
        name: form.value.name,
        phone: form.value.phone,
        email: form.value.email,
        userId: selectedUserId.value
      })
    }
    closeModal()
    fetchContacts()
  } catch (error) {
    console.error('保存失败', error)
  }
}

const deleteContact = async (id) => {
  if (!confirm('确定删除吗？')) return
  try {
    await api.delete(`/contacts/${id}`)
    fetchContacts()
  } catch (error) {
    console.error('删除失败', error)
  }
}

const closeModal = () => {
  showModal.value = false
}

onMounted(() => {
  fetchElders()
})
</script>

<style scoped>
/* 页面特有微调，大部分依赖全局 admin.css */
.page-header {
  margin-bottom: var(--space-lg);
}
.empty-state {
  text-align: center;
  padding: var(--space-xl);
  color: var(--text-muted);
  background: var(--gray-50);
  border-radius: var(--radius-card);
}
.row-actions {
  display: flex;
  gap: 8px;
}
.btn-sm {
  padding: 6px 14px;
  font-size: 14px;
}


</style>