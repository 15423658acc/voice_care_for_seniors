// src/controllers/contactController.js

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// 获取联系人列表（子女可传 userId）
const getContacts = async (req, res, next) => {
    try {
        let userId = req.user.id
        if (req.user.role === 'child' && req.query.userId) {
            userId = parseInt(req.query.userId)
        }
        const contacts = await prisma.emergencyContact.findMany({
            where: { userId },
            orderBy: { name: 'asc' }
        })
        res.json({ code: 200, data: contacts })
    } catch (error) {
        next(error)
    }
}

// 获取单个联系人
const getContactById = async (req, res, next) => {
    try {
        const { id } = req.params
        const contact = await prisma.emergencyContact.findUnique({
            where: { id: parseInt(id) }
        })
        if (!contact) return res.status(404).json({ code: 404, msg: '联系人不存在' })
        if (req.user.role !== 'child' && contact.userId !== req.user.id) {
            return res.status(403).json({ code: 403, msg: '无权访问' })
        }
        res.json({ code: 200, data: contact })
    } catch (error) {
        next(error)
    }
}

// 创建联系人
const createContact = async (req, res, next) => {
    try {
        const { name, phone, email, userId } = req.body
        let targetUserId = req.user.id
        if (req.user.role === 'child' && userId) {
            targetUserId = parseInt(userId)
        }
        if (!name || !phone) {
            return res.status(400).json({ code: 400, msg: '姓名和电话不能为空' })
        }
        const newContact = await prisma.emergencyContact.create({
            data: {
                name,
                phone,
                email: email || null,
                userId: targetUserId
            }
        })
        res.status(201).json({ code: 200, data: newContact })
    } catch (error) {
        next(error)
    }
}

// 更新联系人
const updateContact = async (req, res, next) => {
    try {
        const { id } = req.params
        const { name, phone, email } = req.body
        const contact = await prisma.emergencyContact.findUnique({
            where: { id: parseInt(id) }
        })
        if (!contact) return res.status(404).json({ code: 404, msg: '联系人不存在' })
        if (req.user.role !== 'child' && contact.userId !== req.user.id) {
            return res.status(403).json({ code: 403, msg: '无权操作' })
        }
        const updated = await prisma.emergencyContact.update({
            where: { id: parseInt(id) },
            data: { name, phone, email: email || null }
        })
        res.json({ code: 200, data: updated })
    } catch (error) {
        next(error)
    }
}

// 删除联系人
const deleteContact = async (req, res, next) => {
    try {
        const { id } = req.params
        const contact = await prisma.emergencyContact.findUnique({
            where: { id: parseInt(id) }
        })
        if (!contact) return res.status(404).json({ code: 404, msg: '联系人不存在' })
        if (req.user.role !== 'child' && contact.userId !== req.user.id) {
            return res.status(403).json({ code: 403, msg: '无权操作' })
        }
        await prisma.emergencyContact.delete({ where: { id: parseInt(id) } })
        res.json({ code: 200, msg: '删除成功' })
    } catch (error) {
        next(error)
    }
}

module.exports = {
    getContacts,
    getContactById,
    createContact,
    updateContact,
    deleteContact
}