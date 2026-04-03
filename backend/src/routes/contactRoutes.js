//  紧急联系人接口src/routes/contactRoutes.js

const express = require('express')
const router = express.Router()
const contactController = require('../controllers/contactController')
const authMiddleware = require('../middleware/auth')

router.use(authMiddleware)

router.get('/', contactController.getContacts)   //查询所有联系人
router.get('/:id', contactController.getContactById)  //查询单个联系人
router.post('/', contactController.createContact)  //新增联系人
router.put('/:id', contactController.updateContact)  //修改联系人
router.delete('/:id', contactController.deleteContact)  //删除联系人

module.exports = router