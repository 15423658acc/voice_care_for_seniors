// src/controllers/contactController.js

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// 获取联系人列表（子女可传 userId）
const getContacts = async (req, res, next) => {
    // 原代码
    // try {
    //     let userId = req.user.id
    //     if (req.user.role === 'child' && req.query.userId) {
    //         userId = parseInt(req.query.userId)
    //     }


    // 适配原有接口添加的新代码
    try {
        let whereCondition = {}

        if (req.user.role === 'elder') {
            // 老人只能看自己的联系人
            whereCondition.userId = req.user.id
        } else if (req.user.role === 'child') {
            // 子女必须指定 userId（老人ID），且要验证该老人是否属于自己
            const elderId = parseInt(req.query.userId)
            if (!elderId) {
                return res.status(400).json({ code: 400, msg: '请指定老人ID' })
            }
            // 验证该老人是否属于当前子女
            const elder = await prisma.user.findFirst({
                where: {
                    id: elderId,
                    role: 'elder',
                    parentId: req.user.id
                }
            })
            if (!elder) {
                return res.status(403).json({ code: 403, msg: '无权访问该老人的数据' })
            }
            whereCondition.userId = elderId
        } else {
            return res.status(403).json({ code: 403, msg: '无效角色' })
        }


        const contacts = await prisma.emergencyContact.findMany({
            where: whereCondition,
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

        // 验证该老人是否属于当前子女
        const elder = await prisma.user.findFirst({
            where: { id: targetUserId, role: 'elder', parentId: req.user.id }
        })
        if (!elder) {
            return res.status(403).json({ code: 403, msg: '无权为该老人添加联系人' })
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

        // 在 updateContact 中，找到 contact 后增加：
        if (req.user.role === 'child') {
            const elder = await prisma.user.findFirst({
                where: { id: contact.userId, role: 'elder', parentId: req.user.id }
            })
            if (!elder) {
                return res.status(403).json({ code: 403, msg: '无权操作该联系人的数据' })
            }
        }

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