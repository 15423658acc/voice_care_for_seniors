const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const webpush = require('web-push');
require('dotenv').config();

// ---------- 配置 web-push ----------
// 设置 VAPID 密钥
webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);
const subscribe = async (req, res, next) => {
    try {
        // console.log('后端接收到的订阅数据：', req.body) // 新增日志：看接收到的数据
        const { endpoint, keys } = req.body
        if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
            // console.log('订阅数据不完整：', req.body) // 新增日志：标记不完整的数据
            return res.status(400).json({ code: 400, msg: '订阅信息不完整' })
        }
        // 保存到数据库（这里暂不关联用户）
        await prisma.pushSubscription.upsert({
            where: { endpoint },
            update: {
                p256dh: keys.p256dh,
                auth: keys.auth,
                // updatedAt: new Date()   // 如果模型中包含 updatedAt 字段
            },
            create: {
                endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth
                // userId: req.user?.id  // 如果有登录用户
            }
        })
        // console.log('订阅数据已保存到数据库') // 新增日志：确认保存成功
        res.json({ code: 200, msg: '订阅成功' })
    } catch (error) {
        // console.error('后端保存订阅数据失败：', error) // 新增日志：捕获保存错误
        next(error)
    }
}

const unsubscribe = async (req, res, next) => {
    try {
        const { endpoint } = req.body
        if (!endpoint) {
            return res.status(400).json({ code: 400, msg: '缺少 endpoint' });
        }
        await prisma.pushSubscription.deleteMany({ where: { endpoint } })
        res.json({ code: 200, msg: '取消订阅成功' })
    } catch (error) {
        next(error)
    }
}

module.exports = { subscribe, unsubscribe }