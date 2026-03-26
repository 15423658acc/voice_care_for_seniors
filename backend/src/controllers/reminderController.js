const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const webpush = require('web-push')
const dotenv = require('dotenv')
dotenv.config()

// 设置VAPID
webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
)

// 获取今日提醒（简化：假设所有提醒都属于某个默认用户，实际需关联老人用户）
const getTodayReminders = async (req, res, next) => {
    try {
        const reminders = await prisma.reminder.findMany({
            where: { userId: 1 } // 假设老人用户ID=1
        })
        res.json({ code: 200, data: reminders })
    } catch (error) {
        next(error)
    }
}

// 定时任务：每分钟检查并发送提醒  （先改模型，后期修改永久提醒）
const checkReminders = async () => {
    const now = new Date()
    console.log('当前时间：', new Date())
    const currentTime = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`

    const reminders = await prisma.reminder.findMany({
        where: {
            time: currentTime,
            taken: false
        }
    })

    if (reminders.length === 0) return

    // 获取所有推送订阅
    const subscriptions = await prisma.pushSubscription.findMany()

    for (const reminder of reminders) {
        const payload = JSON.stringify({
            title: '吃药提醒',
            body: `到时间吃 ${reminder.medicine} 了`
        })

        for (const sub of subscriptions) {
            try {
                await webpush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth
                    }
                }, payload)
            } catch (error) {
                console.error('推送失败', error)
                // 如果订阅过期，删除它
                if (error.statusCode === 410) {
                    await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } })
                }
            }
        }

        // 标记为已提醒（可选）
        await prisma.reminder.update({
            where: { id: reminder.id },
            data: { taken: true }
        })
    }
}

module.exports = {
    getTodayReminders,
    checkReminders
}