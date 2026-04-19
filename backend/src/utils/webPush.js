const webpush = require('web-push')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// 配置 VAPID（需在 .env 中设置）
const vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY
}

webpush.setVapidDetails(
    // 服务器必须提供一个联系人邮箱，让浏览器厂商（Google/Mozilla）在推送服务出问题时能联系到开发者，仅仅是写在协议里的一个联系方式。。
    'mailto:938284226@qq.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
)

/**
 * 向指定用户（子女）发送推送通知
 * @param {number} childUserId - 子女用户ID
 * @param {object} payload - 推送内容 { title, body, data }
 */
async function sendPushToChild(childUserId, payload) {
    try {
        // 查询该子女的所有推送订阅（role = 'child'）
        const subscriptions = await prisma.pushSubscription.findMany({
            where: {
                userId: childUserId,
                role: 'child'
            }
        })

        if (subscriptions.length === 0) {
            console.log(`[WebPush] 子女 ${childUserId} 无可用推送订阅`)
            return
        }

        const pushPayload = JSON.stringify(payload)

        const sendPromises = subscriptions.map(sub => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            }
            return webpush.sendNotification(pushSubscription, pushPayload)
                .catch(err => {
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        // 订阅已失效，删除记录
                        return prisma.pushSubscription.delete({
                            where: { id: sub.id }
                        })
                    }
                    console.error('推送发送失败:', err)
                })
        })

        // 使用 allSettled 确保所有尝试完成，不因单个失败而中断
        await Promise.allSettled(sendPromises)
        console.log(`[WebPush]已向子女 ${childUserId} 发送紧急通知`)
    } catch (error) {
        console.error('[WebPush]发送子女推送失败:', error)
    }
}

module.exports = { sendPushToChild }