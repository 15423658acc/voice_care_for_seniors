// src/controllers/authController.js
const bcrypt = require('bcrypt')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { generateToken } = require('../utils/jwt')

/**
 * 用户登录
 * 请求体：{ username, password }
 */
const login = async (req, res, next) => {
    try {
        const { username, password } = req.body

        // 验证用户名和密码是否提供
        if (!username || !password) {
            return res.status(400).json({ code: 400, msg: '用户名和密码不能为空' })
        }

        // 根据用户名查找用户
        const user = await prisma.user.findUnique({
            where: { username }
        })

        if (!user) {
            return res.status(401).json({ code: 401, msg: '用户名或密码错误' })
        }

        // 对比密码（使用 bcrypt 比较）
        const passwordValid = await bcrypt.compare(password, user.password)
        if (!passwordValid) {
            return res.status(401).json({ code: 401, msg: '用户名或密码错误' })
        }

        // 生成 token，payload 中包含用户 id 和角色
        const token = generateToken({ id: user.id, role: user.role })

        // 返回 token 和用户信息（密码除外）
        const { password: _, ...userInfo } = user // 使用解构排除密码字段
        res.json({
            code: 200,
            msg: '登录成功',
            data: {
                token,
                user: userInfo
            }
        })
    } catch (error) {
        next(error) // 将错误传递给全局错误处理中间件
    }
}

/**
 * 用户注册（子女注册）
 */
const register = async (req, res, next) => {
    try {
        const { username, password, role = 'child' } = req.body // 默认角色为子女
        console.log(req.body)

        // 简单验证
        if (!username || !password) {
            return res.status(400).json({ code: 400, msg: '用户名和密码不能为空' })
        }

        // 检查用户名是否已存在
        const existingUser = await prisma.user.findUnique({
            where: { username }
        })
        if (existingUser) {
            return res.status(409).json({ code: 409, msg: '用户名已存在' })
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10) // 盐的轮数为 10

        // 创建用户
        const newUser = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                role
            }
        })

        // 生成 token
        const token = generateToken({ id: newUser.id, role: newUser.role })

        // 返回
        const { password: _, ...userInfo } = newUser
        res.status(201).json({
            code: 200,
            msg: '注册成功',
            data: {
                token,
                user: userInfo
            }
        })
    } catch (error) {
        next(error)
    }
}

/**
 * 获取当前用户信息（需要认证）
 */
const getMe = async (req, res, next) => {
    try {
        // req.user 由 authMiddleware 提供，包含 id 和 role
        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        })
        if (!user) {
            return res.status(404).json({ code: 404, msg: '用户不存在' })
        }
        const { password: _, ...userInfo } = user
        res.json({
            code: 200,
            data: userInfo
        })
    } catch (error) {
        next(error)
    }
}

module.exports = {
    login,
    register,
    getMe
}