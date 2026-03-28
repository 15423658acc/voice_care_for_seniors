const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const subscribe = async (req, res, next) => {
    // console.log('【后端】收到订阅请求，body:', req.body)
    try {
        const { endpoint, keys } = req.body
        if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
            return res.status(400).json({ code: 400, msg: '订阅信息不完整' })
        }

        // console.log(req.body)
        // 保存到数据库（这里暂不关联用户）
        const result = await prisma.pushSubscription.upsert({
            where: { endpoint },
            update: { p256dh: keys.p256dh, auth: keys.auth },
            create: {
                endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth
            },
        });

        // console.log('【后端】订阅保存成功', result);

        res.json({ code: 200, msg: '订阅成功' })
        // await fetchReminders()
    } catch (error) {
        console.error('【后端】Prisma 操作失败:', error);

        // 根据错误类型返回不同状态码
        if (error.code === 'P2002') {
            // 唯一约束冲突，实际上 upsert 应该处理，但如果出错可能是字段类型问题
            res.status(400).json({ code: 400, msg: '订阅已存在' });
        } else {
            res.status(500).json({ code: 500, msg: '服务器错误', error: error.message });
        // next(error)
    }}
}

const unsubscribe = async (req, res, next) => {
    try {
        const { endpoint } = req.body
        await prisma.pushSubscription.deleteMany({ where: { endpoint } })
        res.json({ code: 200, msg: '取消订阅成功' })
    } catch (error) {
        next(error)
    }
}

module.exports = { subscribe, unsubscribe }