// src/utils/jwt.js
const jwt = require('jsonwebtoken')

// 从环境变量读取 JWT 密钥和过期时间，如果没有则使用默认值
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key' // 建议在生产环境中设置复杂的密钥
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '21d' // token 过期时间，7天

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
    return jwt.verify(token, JWT_SECRET)
}

module.exports = {
    generateToken,
    verifyToken
}