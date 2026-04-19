const webpush = require('web-push')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// 配置 VAPID（需在 .env 中设置）
const vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY
}

// 服务器必须提供一个联系人邮箱，让浏览器厂商（Google/Mozilla）在推送服务出问题时能联系到开发者，仅仅是写在协议里的一个联系方式。。
if (!vapidKeys) {
    console.warn('[WebPush] VAPID 密钥未配置')
} else {
    webpush.setVapidDetails(
        'mailto:938284226@qq.com',
        vapidKeys.publicKey,
        vapidKeys.privateKey
    )
}


/**
 * 带超时控制的推送发送函数:后端服务器网络环境无法直接访问 Google 服务（GFW 阻断），导致对 FCM 端点的 TCP 连接超时。
 * 改进说明：
 * 为每个推送请求设置 5 秒超时，超时后不再等待，直接记录警告并继续。
 * 超时错误不再输出冗长的堆栈，只输出简洁警告。
 * 保留对失效订阅（410/404）的清理逻辑。
 */
async function sendNotificationWithTimeout(subscription, payload, timeoutMs = 5000) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
        // web-push 库不支持直接传入 AbortSignal，我们需要包装
        // 方法：使用 Promise.race 与自定义超时 Promise
        const pushPromise = webpush.sendNotification(subscription, payload)

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error('ETIMEDOUT'))
            }, timeoutMs)
        })

        await Promise.race([pushPromise, timeoutPromise])
        clearTimeout(timeoutId)
        return { success: true }
    } catch (error) {
        clearTimeout(timeoutId)
        if (error.message === 'ETIMEDOUT') {
            return { success: false, reason: 'timeout' }
        }
        throw error // 其他错误重新抛出
    }
}




/**
 * 向指定用户（子女）发送推送通知
 * @param {number} childUserId - 子女用户ID
 * @param {object} payload - 推送内容 { title, body, data }
 * 新增：（优化超时处理）
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

        const sendPromises = subscriptions.map(async (sub) => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            }
            try {
                // await webpush.sendNotification(pushSubscription, pushPayload)
                // 使用带超时的发送，超时时间 5 秒
                const result = await sendNotificationWithTimeout(pushSubscription, pushPayload, 5000)
                if (result.success) {
                    console.log(`[WebPush] 推送成功: ${sub.endpoint.substring(0, 40)}...`)
                } else {
                    console.warn(`[WebPush] 推送超时 (可能因网络问题): ${sub.endpoint.substring(0, 40)}...`)
                }
            } catch (err) {
                // 处理永久性失败（如 410 Gone）
                if (err.statusCode === 410 || err.statusCode === 404) {
                    console.log(`[WebPush] 订阅失效，删除: ${sub.endpoint}`)
                    await prisma.pushSubscription.delete({where: {id: sub.id}})

                } else {
                    console.error(`[WebPush] 推送失败 (${err.statusCode || err.message}): ${sub.endpoint}`)
                }
            }
        })

        // 使用 allSettled 确保所有尝试完成，不因单个失败而中断
        await Promise.allSettled(sendPromises)
        console.log(`[WebPush]已向子女 ${childUserId} 发送紧急通知`)
    } catch (error) {
        console.error('[WebPush]发送子女推送失败:', error)
    }
}

module.exports = { sendPushToChild }