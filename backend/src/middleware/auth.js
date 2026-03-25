// src/middleware/auth.js
const { verifyToken } = require('../utils/jwt')

/**
 * JWT 验证中间件
 * 从请求头中获取 token，验证通过后将用户信息附加到 req.user 上，然后放行；否则返回 401
 */
const authMiddleware = async (req, res, next) => {
    // 获取 Authorization 请求头
    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.status(401).json({ code: 401, msg: '未提供认证令牌' })
    }

    // 请求头格式通常为 "Bearer <token>"，所以我们按空格分割
    const token = authHeader.split(' ')[1]
    if (!token) {
        return res.status(401).json({ code: 401, msg: '无效的认证格式' })
    }

    try {
        // 验证 token
        const decoded = verifyToken(token)
        // 将解码后的用户信息挂载到 req.user 上，后续的控制器可以通过 req.user 获取
        req.user = decoded
        next() // 继续执行下一个中间件或路由处理函数
    } catch (error) {
        // token 过期或无效
        return res.status(401).json({ code: 401, msg: '认证失败：' + error.message })
    }
}

module.exports = authMiddleware