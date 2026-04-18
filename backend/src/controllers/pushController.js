const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * 订阅推送（支持老人和子女）
 * 请求体：{ endpoint, keys, userId, role }
 */
const subscribe = async (req, res, next) => {
    // console.log('【后端】收到订阅请求，body:', req.body)
    try {
        // 新增接收 userId 和 role
        const { endpoint, keys, userId, role } = req.body
        if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
            return res.status(400).json({ code: 400, msg: '订阅信息不完整' })
        }
        // console.log(req.body)

        // 如果提供了 userId 和 role，一并保存；否则仅存储匿名订阅（兼容旧逻辑）
        // --把用户浏览器的推送订阅信息整理成一个可以存到数据库里的对象，并且兼容两种用户：登录用户 + 匿名用户。
        // 登录用户：给指定用户发推送，一个用户多台设备登录时统一管理，存入角色可以按角色分组推送
        // 匿名用户：没登陆的用户
        const data = {
            endpoint,
            p256dh: keys.p256dh,
            auth: keys.auth,
        }
        if (userId) {
            data.userId = parseInt(userId)
        }
        if (role) {
            data.role = role
        }

        // 保存到数据库（:新增关联用户，并且使用 upsert，按 endpoint + userId 组合唯一
        const result = await prisma.pushSubscription.upsert({
            // where: { endpoint },
            // 复合唯一键无法直接在 where 中用对象字面量，需要改用 findFirst + update/create
            // 但 Prisma 支持 @@unique 后，可这样改成：
            where: {
                endpoint_userId: {
                    endpoint: endpoint,
                    userId: userId || null
                }
            },
            update: { p256dh: keys.p256dh, auth: keys.auth,  role: role || undefined },
            create: data
        });

        // console.log('【后端】订阅保存成功', result);

        res.json({ code: 200, msg: '订阅成功',data: result })
        // await fetchReminders()
    } catch (error) {
        console.error('【后端】Prisma 操作失败:订阅推送失败,', error);
        next(error)
        // // 根据错误类型返回不同状态码
        // if (error.code === 'P2002') {
        //     // 唯一约束冲突，实际上 upsert 应该处理，但如果出错可能是字段类型问题
        //     res.status(400).json({ code: 400, msg: '订阅已存在' });
        // } else {
        //     res.status(500).json({ code: 500, msg: '服务器错误', error: error.message });
        // // next(error)
        // }
    }
}

/**
 * 取消订阅（按 endpoint 删除）
 */
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