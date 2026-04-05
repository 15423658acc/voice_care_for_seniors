const express = require('express')
const router = express.Router()
const authController = require('../controllers/authController')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const getUsersByRole = async (req, res, next) => {
    try {
        const { role } = req.query
        // 只有子女可以调用
        if (req.user.role !== 'child') {
            return res.status(403).json({ code: 403, msg: '无权限' })
        }
        const users = await prisma.user.findMany({
            where: { role: role || undefined },
            select: { id: true, username: true, role: true }
        })
        res.json({ code: 200, data: users })
    } catch (error) {
        next(error)
    }
}

/**
 * 获取当前子女绑定的所有老人列表
 * 需要认证，且角色为 child
 */
const getBoundElders = async (req, res, next) => {
    try {
        // 当前登录用户必须为子女
        if (req.user.role !== 'child') {
            return res.status(403).json({ code: 403, msg: '只有子女可以查看绑定的老人列表' })
        }

        const elders = await prisma.user.findMany({
            where: {
                role: 'elder',
                parentId: req.user.id  // 当前子女的 ID
            },
            select: {
                id: true,
                username: true,
                fullName: true,
                phone: true,
                age: true
            },
            orderBy: { createdAt: 'asc' }
        })

        res.json({ code: 200, data: elders })
    } catch (error) {
        next(error)
    }
}


/**
 * 子女为老人创建账号（直接绑定）
 * 请求体：{ username, password, fullName, phone, age }
 */
const addElderByChild = async (req, res, next) => {
    try {
        if (req.user.role !== 'child') {
            return res.status(403).json({ code: 403, msg: '无权限' })
        }

        const { username, password, fullName, phone, age } = req.body
        if (!username || !password) {
            return res.status(400).json({ code: 400, msg: '用户名和密码不能为空' })
        }

        // 检查用户名是否已存在
        const existing = await prisma.user.findUnique({ where: { username } })
        if (existing) {
            return res.status(409).json({ code: 409, msg: '用户名已存在' })
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        const newElder = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                role: 'elder',
                parentId: req.user.id,   // 直接绑定当前子女
                fullName: fullName || null,
                phone: phone || null,
                age: age ? parseInt(age) : null
            }
        })

        const { password: _, ...elderInfo } = newElder
        res.status(201).json({ code: 200, data: elderInfo })
    } catch (error) {
        next(error)
    }
}


module.exports = {
    getUsersByRole,
    getBoundElders,
    addElderByChild
}