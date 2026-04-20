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
 *
 * 这是给子女手机发 “紧急推送” 的工具类，专门解决推送超时、失效、卡顿问题，稳定、可靠、企业级写法！
 * 作用：加载推送工具，加载数据库（查子女的推送订阅），配置安全密钥（防止别人伪造推送）
 *
 * Promise.race 赛跑机制：
 * 就像打电话，一个人不接不能一直等，同时打两个人的电话谁先接了谁先过来，不接的直接挂电话，防止网络差、推送慢，把整个系统卡住！
 * +++
 * Promise.allSettled:
 * 同时给 3 个人打电话，不管打通没打通，都要全部打完，不要中途断掉。
 * 等待所有任务全部结束（不管成功 / 失败），再继续！
 * ===
 * 给每个子女发推送，个推送内部用 race 赛跑（5 秒超时，不卡住），所有推送用 allSettled 等待全部发完
 * Promise.race = 单个推送防止卡死，5 秒不回就放弃
 * Promise.allSettled = 多个设备互不影响，一个烂不影响全部
 *
 */
async function sendNotificationWithTimeout(subscription, payload, timeoutMs = 5000) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
        // web-push 库不支持直接传入 AbortSignal，我们需要包装
        // 方法：使用 Promise.race 与自定义超时 Promise-------- Promise.race 赛跑机制
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

/*
 * 改之前：等邮件 + 推送全部发完，才告诉前端 “成功了”（慢、容易超时报错），await 等待执行，最后才res.json
 * 等待太久 → Vite 代理超时 → 前端报错 ECONNRESET
 * 你点菜 → 厨师洗菜→切菜→炒菜→全部做好 → 才告诉你：菜上齐了
 *
 * 改之后：先立刻告诉前端 “成功了”，后台偷偷慢慢发邮件 + 推送（快、不卡顿、不报错）
 * 不等任何耗时操作，先立刻告诉前端：成功。async +setImmediate慢慢执行，即【请求响应快速返回，耗时任务后台异步化】企业级优雅写法
 * 你下单 → 商家立刻告诉你：订单已收到 → 然后厨师慢慢做菜、配送
 * 这是为了不让用户看到错误，是后端常见的快速响应策略。
 *
 * 未来：
 * 但是：既不超时，又不假成功？
 * 方案A：前端不需要实时知道发没发，只要后台记录成功 / 失败即可：
 *       返回前端之前立刻创建一条紧急求助日志（状态：处理中），返回前端后执行后台，成功则更新日志 status为成功，失败同理。
 * 方案B：前端轮询 / 长连接查状态（实时知道）
 *
 * 改成先返回，不是为了造假，而是为了不让前端超时崩溃。
 * 真正的 “是否发送成功”，应该靠日志记录来保证，而不是靠接口等待。
 *
 */




/**
 * 向指定用户（子女）发送推送通知
 * @param {number} childUserId - 子女用户ID
 * @param {object} payload - 推送内容 { title, body, data }
 * 新增：（优化超时处理），安全、稳定、不卡顿、自动清理、带超时的专业推送工具
 */
async function sendPushToChild(childUserId, payload) {
    try {
        // 查询该子女的所有推送订阅（role = 'child'）。1. 查数据库：找到这个子女的推送订阅
        const subscriptions = await prisma.pushSubscription.findMany({
            where: {
                userId: childUserId,
                role: 'child'
            }
        })

        // 2. 没有订阅就跳过
        if (subscriptions.length === 0) {
            console.log(`[WebPush] 子女 ${childUserId} 无可用推送订阅`)
            return
        }

        const pushPayload = JSON.stringify(payload)

        // 3. 给这个子女的所有设备发推送
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

        // 使用 allSettled 确保所有尝试完成，不因单个失败而中断，等待所有推送发送完成（无论成功失败）
        await Promise.allSettled(sendPromises)
        console.log(`[WebPush]已向子女 ${childUserId} 发送紧急通知`)
    } catch (error) {
        console.error('[WebPush]发送子女推送失败:', error)
    }
}

module.exports = { sendPushToChild }