// src/utils/jwt.js
const jwt = require('jsonwebtoken')

// 从环境变量读取 JWT 密钥和过期时间，如果没有则使用默认值
// const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key' // 建议在生产环境中设置复杂的密钥
const JWT_SECRET = process.env.JWT_SECRET || 'BEENlvIXIWbCBpd_dkJGAm39PnIgGlmJgU6p6ihUELqzQY9W_X45IRdRHuGvbWAuiuMiIjs1RCbOCYSEuCnP5_o' // 建议在生产环境中设置复杂的密钥
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d' // token 过期时间，7天

if (!JWT_SECRET) {
    throw new Error('请配置 JWT_SECRET 环境变量')
}

/**
 * 生成 JWT token
 * @param {Object} payload - 要包含在 token 中的数据，例如用户 id、角色等
 * @returns {String} token
 */
const generateToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

/**
 * 验证 JWT token
 * @param {String} token
 * @returns {Object} - 解码后的 payload，如果验证失败则抛出错误
 */
const verifyToken = (token) => {
    // return jwt.verify(token, JWT_SECRET)
    try {
        return jwt.verify(token, JWT_SECRET)
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            throw new Error('登录已过期，请重新登录')
        }
        throw new Error('无效的登录凭证')
    }
}


module.exports = {
    generateToken,
    verifyToken
}