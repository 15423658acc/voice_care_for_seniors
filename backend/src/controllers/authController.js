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


        let normalizedEmail = null;
        if (email && email.trim() !== '') {
            normalizedEmail = email.trim();
            // 简单格式校验（你已经做了）
            if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
                return res.status(400).json({ code: 400, msg: '邮箱格式不正确' });
            }
            // 检查邮箱是否已被占用
            const existingEmail = await prisma.user.findUnique({
                where: { email: normalizedEmail }
            });
            if (existingEmail) {
                return res.status(409).json({ code: 409, msg: '邮箱已被注册' });
            }
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
                email: normalizedEmail   // 新增
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


/**
 * 密码重置代码逻辑
 *   引入 Node.js 内置的 crypto 模块，用于生成随机令牌和计算哈希值。
 * 定义一个箭头函数 generateResetToken，用于生成密码重置令牌。函数返回包含原始令牌和哈希后的令牌的对象。
 */
const crypto = require('crypto')
const nodemailer = require('nodemailer') // 复用已有的邮件配置，用于发送邮件。

// 生成随机令牌（返回原始令牌和哈希）
const generateResetToken = () => {
    //  生成 32 字节的随机数据，再调用 .toString('hex') 将其转换为十六进制字符串，得到原始令牌 rawToken。
    const rawToken = crypto.randomBytes(32).toString('hex')
    // 使用 SHA-256 哈希算法对 rawToken 进行哈希处理：update(rawToken) 传入原始令牌，digest('hex') 输出十六进制字符串，得到哈希令牌 hashedToken。
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')
    // 返回一个对象，包含原始令牌和哈希后的令牌。
    return { rawToken, hashedToken }
}

// 发送重置邮件（使用已配置的 transporter）
// 定义一个异步函数 sendResetEmail，接收收件人邮箱 email、原始令牌 rawToken 和用户 ID userId，用于发送密码重置邮件。
const sendResetEmail = async (email, rawToken, userId) => {
    // 构造重置密码的 URL，其中 FRONTEND_URL 从环境变量读取，URL 中包含原始令牌和用户 ID 作为查询参数。
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}&id=${userId}`
    // 定义邮件选项对象
    const mailOptions = {
        from: `"老友助手" <${process.env.SMTP_USER}>`,
        to: email,   //收件人邮箱
        subject: '重置您的老友助手账号密码',
        html: `
      <h1>密码重置请求</h1>
      <p>您好，您请求重置老友助手账号的密码。</p>
      <p>请将以下链接在地址栏中打开以设置新密码（链接有效期为1小时）：</p>
      <a href="${resetUrl}" target="_blank">${resetUrl}</a>
      <p>如果您没有请求重置密码，请忽略此邮件。</p>
      <p>感谢使用老友助手！</p>
    `
    }
    // 使用 nodemailer.createTransport 创建一个邮件传输器 transporter
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,   // SMTP 服务器主机地址
        port: process.env.SMTP_PORT,   //SMTP 服务器端口
        secure: process.env.SMTP_SECURE === 'true',  //是否使用 SSL/TLS 安全连接
        auth: {
            user: process.env.SMTP_USER,   //SMTP 认证信息
            pass: process.env.SMTP_PASS
        }
    })
    // 使用 transporter.sendMail 发送邮件，await 等待发送完成（异步操作）。
    await transporter.sendMail(mailOptions)
}

/**
 * 忘记密码 - 发送重置邮件
 * 请求体：{ email }
 */
// 定义异步函数 forgotPassword，作为处理忘记密码请求的控制器函数，接收 Express 的 req、res、next 参数。
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body
        if (!email) {
            return res.status(400).json({ code: 400, msg: '请提供邮箱地址' })
        }
        // 使用 Prisma 客户端查询数据库，查找用户（不区分角色，老人或子女都可以）
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) {
            // 为了安全，不明确提示邮箱不存在，返回通用成功
            return res.json({ code: 200, msg: '如果该邮箱已注册，我们将发送重置链接' })
        }

        // 生成令牌（原始令牌给前端，哈希存数据库），调用 generateResetToken 生成原始令牌和哈希令牌
        const { rawToken, hashedToken } = generateResetToken()
        // 计算过期时间：当前时间戳加上 1 小时（60*60*1000 毫秒），得到 Date 对象。
        const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1小时过期
        console.log()
        // 将前端传来的本地时间字符串（如 "2026-04-04T09:50"）转换为正确的 UTC Date 对象
        // 前端时间是中国时区（UTC+8）
//         function parseLocalToUTC(localDateTimeStr) {
//             if (!localDateTimeStr) return null;
//             // 方法：补上 +08:00 时区后缀，然后 new Date
//             const dateWithTZ = new Date(localDateTimeStr + '+08:00');
//             return dateWithTZ;
//         }

        // 存储哈希和过期时间
        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken: hashedToken,
                resetTokenExpiry: expiry
            }
        // 使用 Prisma 更新用户记录，将哈希令牌存入 resetToken 字段，过期时间存入 resetTokenExpiry 字段。
        })

        // 发送邮件，传入用户邮箱、原始令牌和用户 ID。
        await sendResetEmail(email, rawToken, user.id)

        res.json({ code: 200, msg: '重置链接已发送至您的邮箱，请查收' })
    } catch (error) {
        next(error)   // 将错误传递给 Express 的 next 函数，由全局错误处理中间件处理。
    }
}

/**
 * 重置密码 - 验证令牌并更新密码
 * 请求体：{ token, userId, newPassword }
 */
// 定义异步函数 resetPassword，处理密码重置请求，接收 Express 的 req、res、next。
const resetPassword = async (req, res, next) => {
    try {
        // 从请求体解构出 token（原始令牌）、userId、newPassword。
        const { token, userId, newPassword } = req.body
        if (!token || !userId || !newPassword) {
            return res.status(400).json({ code: 400, msg: '参数不完整' })
        }

        // 密码强度校验
        const isValid = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword)
        if (!isValid) {
            return res.status(400).json({ code: 400, msg: '密码必须至少8位，且包含大写字母、小写字母和数字' })
        }

        // 查找用户
        const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } })
        if (!user) {
            // 根据 userId 查询用户，userId 可能是字符串，使用 parseInt 转为整数。
            return res.status(404).json({ code: 404, msg: '用户不存在' })
        }

        // 关于为什么既要原始令牌又要哈希：
        // 避免数据库被攻击者拿到（SQL注入、备份泄露等），攻击者可以直接读取所有人的原始令牌，然后冒充用户重置密码。
        // 在数据库里只存令牌的哈希值（Hash），不存原始值，攻击者看到的是不可逆的字符串，无法伪造重置链接。

        // 验证令牌哈希：对请求中提供的原始令牌 token 进行 SHA-256 哈希，得到 hashedToken，用于与数据库中存储的哈希比较。
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
        if (user.resetToken !== hashedToken || user.resetTokenExpiry < new Date()) {  //数据库中存储的 resetToken 是否与计算出的哈希一致，以及过期时间是否小于当前时间
            return res.status(400).json({ code: 400, msg: '重置链接无效或已过期' })
        }

        // 前后端交互流程：用户要求重置密码，后端生成原始token和哈希，将哈希和过期时间存入数据库，把原始token和userId放在链接里发给用户；
        // 用户点击链接打开页面，前端从URL提取token和id，用户在页面上填写新密码，点击提交，前端把 {token,userId,newPassword}发送到后端/reset-password。
        // 后端验证令牌：收到原始令牌token后，生成一个新哈希，然后与数据库里存储的resetToken（哈希）比较，
        // 哈希算法相同，相同的原始令牌一定会生成相同的哈希值，匹配就说明用户提交的原始令牌是之前生成的；否则无效。

        // 为什么哈希算法选 SHA-256？安全性高；固定输出长度：不管原始令牌多长，哈希结果都是 64 个十六进制字符，便于数据库存储。速度快：对于这种场景性能足够。


        // 加密新密码
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        // 更新密码，并清除重置令牌
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null
            }
        })

        res.json({ code: 200, msg: '密码重置成功，请使用新密码登录' })
    } catch (error) {
        next(error)
    }
}

module.exports = {
    login,
    register,
    getMe,
    elderLogin,
    elderRegister,
    forgotPassword,  //导出方法，不导出内部辅助函数
    resetPassword
}