// src/controllers/authController.js
const bcrypt = require('bcrypt')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { generateToken } = require('../utils/jwt')

// 邮箱格式正则表达式
const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;

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

        console.log("从数据库查到的用户：", user);
        console.log("数据库密码：", user.password);

        if (!user) {
            return res.status(401).json({ code: 401, msg: '用户名或密码错误' })
        }

        // 对比密码（使用 bcrypt 比较）
        const passwordValid = await bcrypt.compare(password, user.password)
        if (!passwordValid) {
            return res.status(401).json({ code: 401, msg: '用户名或密码错误' })
        }

        // 生成 token，payload 中包含用户 id 和角色  （生成JWT）
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
 * 请求体：{ username, password, confirmPassword, email? }
 */
const register = async (req, res, next) => {
    try {
        const { username, password, confirmPassword, email } = req.body;

        // ========== 1. 参数基础校验 ==========
        // 用户名不能为空
        if (!username || !username.trim()) {
            return res.status(400).json({ code: 400, msg: '用户名不能为空' });
        }
        // 密码不能为空
        if (!password) {
            return res.status(400).json({ code: 400, msg: '密码不能为空' });
        }
        // 密码长度至少6位
        if (password.length < 6) {
            return res.status(400).json({ code: 400, msg: '密码长度至少6位' });
        }
        // 确认密码是否一致
        if (password !== confirmPassword) {
            return res.status(400).json({ code: 400, msg: '两次输入的密码不一致' });
        }
        // 邮箱校验（如果提供了邮箱）
        if (email && !emailRegex.test(email)) {
            return res.status(400).json({ code: 400, msg: '邮箱格式不正确' });
        }

        // ========== 2. 检查用户名是否已存在 ==========
        const existingUser = await prisma.user.findUnique({
            where: { username }
        });
        if (existingUser) {
            return res.status(409).json({ code: 409, msg: '用户名已存在' });
        }

        // 如果邮箱已存在（可选，但建议校验唯一性）
        if (email) {
            const existingEmail = await prisma.user.findUnique({
                where: { email }
            });
            if (existingEmail) {
                return res.status(409).json({ code: 409, msg: '邮箱已被注册' });
            }
        }

        // ========== 3. 密码加密 ==========
        // bcrypt.hash(明文, 盐轮数) 返回加密后的哈希值
        const hashedPassword = await bcrypt.hash(password, 10);

        // ========== 4. 创建用户 ==========
        const newUser = await prisma.user.create({
            data: {
                username: username.trim(),
                password: hashedPassword,
                email: email ? email.trim() : null, // 邮箱可选，如果没有则存 null
                role: 'child' // 固定为子女角色
            }
        });

        // ========== 5. 生成 JWT token ==========
        const token = generateToken({ id: newUser.id, role: newUser.role });

        // ========== 6. 返回成功响应（不返回密码） ==========
        const { password: _, ...userInfo } = newUser; // 解构排除密码字段
        res.status(201).json({
            code: 200,
            msg: '注册成功',
            data: {
                token,
                user: userInfo
            }
        });
    } catch (error) {
        // 将错误传递给全局错误处理中间件
        next(error);
    }
};





// const register = async (req, res, next) => {
//     try {
//         const { username, password, role = 'child' } = req.body // 默认角色为子女
//         console.log(req.body)
//
//         // 简单验证
//         if (!username || !password) {
//             return res.status(400).json({ code: 400, msg: '用户名和密码不能为空' })
//         }
//
//         // 检查用户名是否已存在
//         const existingUser = await prisma.user.findUnique({
//             where: { username }
//         })
//         if (existingUser) {
//             return res.status(409).json({ code: 409, msg: '用户名已存在' })
//         }
//
//         // 加密密码
//         const hashedPassword = await bcrypt.hash(password, 10) // 盐的轮数为 10
//
//         // 创建用户
//         const newUser = await prisma.user.create({
//             data: {
//                 username,
//                 password: hashedPassword,
//                 role
//             }
//         })
//
//         // 生成 token
//         const token = generateToken({ id: newUser.id, role: newUser.role })
//
//         // 返回
//         const { password: _, ...userInfo } = newUser
//         res.status(201).json({
//             code: 200,
//             msg: '注册成功',
//             data: {
//                 token,
//                 user: userInfo
//             }
//         })
//     } catch (error) {
//         next(error)
//     }
// }

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