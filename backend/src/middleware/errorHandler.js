// src/middleware/errorHandler.js
/**
 * 全局错误处理中间件
 * 捕获所有未被处理的错误，并返回统一的错误响应
 */
const errorHandler = (err, req, res, next) => {
    console.error('服务器错误：', err.stack) // 打印错误堆栈，便于调试

    // 区分不同类型的错误，可以设置不同的状态码
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({ code: 401, msg: '未授权' })
    }

    // 默认返回 500 服务器内部错误
    res.status(500).json({ code: 500, msg: '服务器内部错误' })
}

module.exports = { errorHandler }