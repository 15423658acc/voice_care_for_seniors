// src/controllers/authController.js
const bcrypt = require('bcrypt')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { generateToken } = require('../utils/jwt')
const { isValidPhone,isValidPassword } = require('../utils/validator')

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
        const { username, password, confirmPassword, email ,agreeTerms } = req.body;

        // ========== 1. 参数基础校验 ==========
        // 用户名不能为空
        if (!agreeTerms) {
            return res.status(400).json({ code: 400, msg: '请阅读并同意用户协议和隐私政策' })
        }

        if (!username || !username.trim()) {
            return res.status(400).json({ code: 400, msg: '用户名不能为空' });
        }
        // 密码不能为空
        if (!password) {
            return res.status(400).json({ code: 400, msg: '密码不能为空' });
        }
        // 密码强度校验
        if (!isValidPassword(password)) {
            return res.status(400).json({ code: 400, msg: '密码必须至少8位，且包含大写字母、小写字母和数字' })
        }
        // 密码长度至少6位
        // if (password.length < 6) {
        //     return res.status(400).json({ code: 400, msg: '密码长度至少6位' });
        // }
        // 确认密码是否一致
        if (password !== confirmPassword) {
            return res.status(400).json({ code: 400, msg: '两次输入的密码不一致' });
        }
        // 邮箱校验（如果提供了邮箱）
        if (email && !emailRegex.test(email)) {
            return res.status(400).json({ code: 400, msg: '邮箱格式不正确' });
        }

        // // 手机号校验（如果提供了手机号）
        // if (phone && !isValidPhone(phone)) {
        //     return res.status(400).json({ code: 400, msg: '手机号格式不正确，应为11位数字' })
        // }

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


/**
 * 老人登录
 * 请求体：{ username, password }
 */
const elderLogin = async (req, res, next) => {
    try {
        const { username, password } = req.body
        if (!username || !password) {
            return res.status(400).json({ code: 400, msg: '用户名和密码不能为空' })
        }

        // 查找老人账号（角色为 elder）  （满足条件的第一条记录）
        const user = await prisma.user.findFirst({
            where: {
                username,
                role: 'elder'
            }
        })

        if (!user) {
            // 不要暴露“用户不存在”，避免被恶意试探。
            return res.status(401).json({ code: 401, msg: '用户名或密码错误' })
        }

        // 验证密码
        const isValid = await bcrypt.compare(password, user.password)
        if (!isValid) {
            return res.status(401).json({ code: 401, msg: '用户名或密码错误' })
        }

        // 生成 token，携带 parentId 方便前端判断归属
        const token = generateToken({
            id: user.id,
            role: user.role,
            parentId: user.parentId  //// 带上 parentId，方便前端知道这个老人归属于哪个子女
        })

        const { password: _, ...userInfo } = user
        res.json({
            code: 200,
            msg: '登录成功',
            data: {
                token,
                user: userInfo
            }
        })
    } catch (error) {
        next(error)
    }
}

// 登录注册逻辑：老人表里有一个 parentId 字段，存的是子女的 id。
// 老人注册时必须提供一个已经存在的子女用户名，系统找到子女，把子女的 id 写入老人的 parentId。
// 	用 role 字段区分子女和老人，这样同一张表可以存储两种用户，登录时也只查对应角色。


/**
 * 老人注册
 * 请求体：{ username, password, fullName, phone, age, childUsername }
 * 说明：childUsername 是子女的用户名，用于自动绑定。如果子女不存在，注册失败。
 */
const elderRegister = async (req, res, next) => {
    // req：前端发来的请求，包含表单数据； res：服务器返回给前端的响应； next：报错时自动跳到错误处理函数（交给错误处理中间件）
    try {
        const { username, password, fullName, phone, age, childUsername,agreeTerms,email } = req.body

        // 1. 基础校验
        if (!agreeTerms) {
            return res.status(400).json({ code: 400, msg: '请阅读并同意用户协议和隐私政策' })
        }

        if (!username || !password) {
            return res.status(400).json({ code: 400, msg: '用户名和密码不能为空' })
        }

        // 密码强度校验
        if (!isValidPassword(password)) {
            return res.status(400).json({ code: 400, msg: '密码必须至少8位，且包含大写字母、小写字母和数字' })
        }
        // 手机号校验（如果提供了手机号）
        if (phone && !isValidPhone(phone)) {
            return res.status(400).json({ code: 400, msg: '手机号格式不正确，应为11位数字' })
        }
        // 邮箱校验（简单格式）
        if (email && !/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({ code: 400, msg: '邮箱格式不正确/邮箱已存在' })
        }

        if (!childUsername) {
            return res.status(400).json({ code: 400, msg: '请提供子女账号的用户名' })
        }

        // 2. 检查用户名是否已被占用
        const existingUser = await prisma.user.findUnique({
            // prisma.user.findUnique：去数据库的 users 表里，找有没有相同 username 的记录
            where: { username }
        })
        if (existingUser) {
            return res.status(409).json({ code: 409, msg: '用户名已存在' })
        }

        // 3. 查找子女用户（角色必须为 child）
        const childUser = await prisma.user.findFirst({
            where: {
                username: childUsername,
                role: 'child'
            }
        })
        if (!childUser) {
            return res.status(404).json({ code: 404, msg: '子女账号不存在，请核对后重新输入' })
        }

        // 4. 加密密码，用 bcrypt 这个加密库，把原始密码变成一串乱码（哈希值），参数10表示加密强度（越高越安全，但稍慢）。
        const hashedPassword = await bcrypt.hash(password, 10)

        // 5. 创建老人账号，同时绑定子女（parentId）
        const newElder = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                role: 'elder',
                parentId: childUser.id,
                fullName: fullName || null,
                phone: phone || null,
                age: age ? parseInt(age) : null,
                email: email || null,   // 新增
            }
        })

        // 6. 生成 JWT token（老人登录用）
        // generateToken是一个封装好的函数。它把一个包含用户信息的对象加密成一个字符串（token）。
        const token = generateToken({ id: newElder.id, role: newElder.role, parentId: newElder.parentId })

        // 7. 返回（不返回密码）
        const { password: _, ...userInfo } = newElder
        res.status(201).json({
            code: 200,
            msg: '注册成功，已自动绑定子女',
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
    getMe,
    elderLogin,
    elderRegister
}