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


// 将前端传来的本地时间字符串（如 "2026-04-04T09:50"）转换为正确的 UTC Date 对象
// 前端时间是中国时区（UTC+8）
function parseLocalToUTC(localDateTimeStr) {
    if (!localDateTimeStr) return null;
    // 方法：补上 +08:00 时区后缀，然后 new Date
    const dateWithTZ = new Date(localDateTimeStr + '+08:00');
    return dateWithTZ;
}

// 获取今日提醒（简化：假设所有提醒都属于某个默认用户，实际需关联老人用户）
const getTodayReminders = async (req, res, next) => {
    try {
        if (req.user.role !== 'elder') {
            return res.status(403).json({ code: 403, msg: '只有老人可以查看自己的提醒' })
        }
        console.log('当前登录用户:', req.user)
        console.log('请求参数 userId:', req.query.userId)
        const reminders = await prisma.reminder.findMany({
            // where: { userId: 1 } // 假设老人用户ID=1
            where: { userId: req.user.id },
            orderBy: { remindAt: 'asc' }   //是 Prisma 查询中的排序参数，意思是：按照 remindAt 字段的值，从小到大（升序）排列结果。
            // asc 是 ascending（升序）的缩写。
        })
        res.json({ code: 200, data: reminders })
    } catch (error) {
        next(error)
    }
}

// 定时任务：每分钟检查并发送提醒  （先改模型，后期修改永久提醒）
const checkReminders = async () => {
    const now = new Date()
    // console.log('当前时间：', new Date())
    const currentTime = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`

    // console.log('当前时间:', currentTime);
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
                console.log('向订阅发送推送:', sub.endpoint);
                await webpush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth
                    }
                }, payload)
                console.log('推送发送成功');
            } catch (error) {
                console.error('推送失败', error)
                // 如果订阅过期，删除它
                if (error.statusCode === 410) {
                    await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } })
                }
            }
        }

        // 标记为已提醒
        await prisma.reminder.update({
            where: { id: reminder.id },
            data: { taken: true }
        })
    }
}

// ===================++++++++++++++===========================
// ================= 新增：增删改查  =============================

// 获取提醒列表
const getReminders = async (req, res, next) => {
    try {
        // 声明查询条件对象
        let whereCondition = {}

        if (req.user.role === 'elder') {
            // 老人只能看自己的提醒
            whereCondition.userId = req.user.id
        }
        else if (req.user.role === 'child') {
            // 子女必须指定 userId（老人ID），且要验证该老人是否属于自己
            const elderId = parseInt(req.query.userId)
            if (!elderId) {
                return res.status(400).json({ code: 400, msg: '请指定老人ID' })
            }
            // 验证该老人是否属于当前子女（通过 parentId 字段）
            const elder = await prisma.user.findFirst({
                where: {
                    id: elderId,
                    role: 'elder',
                    parentId: req.user.id   // 当前子女的 id
                }
            })
            if (!elder) {
                return res.status(403).json({ code: 403, msg: '无权访问该老人的数据' })
            }
            // 找到后设置查询条件
            whereCondition.userId = elderId
        }
        else {
            return res.status(403).json({ code: 403, msg: '无效角色' })
        }

        const reminders = await prisma.reminder.findMany({
            where:  whereCondition ,  //使用构建好的条件
            orderBy: { remindAt: 'asc' }
        })
        res.json({ code: 200, data: reminders })
    } catch (error) {
        next(error)
    }
}

// 获取单个提醒
const getReminderById = async (req, res, next) => {
    try {
        const { id } = req.params
        const reminder = await prisma.reminder.findUnique({
            where: { id: parseInt(id) }
        })
        if (!reminder) return res.status(404).json({ code: 404, msg: '提醒不存在' })
        if (req.user.role !== 'child' && reminder.userId !== req.user.id) {
            return res.status(403).json({ code: 403, msg: '无权访问' })
        }
        res.json({ code: 200, data: reminder })
    } catch (error) {
        next(error)
    }
}

// 创建提醒
const createReminder = async (req, res, next) => {
    try {
        const { title, description, remindAt, medicine, userId } = req.body
        let targetUserId = req.user.id

        // 新增验证子女权限
        if (req.user.role === 'child' && userId) {
            targetUserId = parseInt(userId)
            const elder = await prisma.user.findFirst({
                where: {id: targetUserId, role: 'elder', parentId: req.user.id}
            })
            if (!elder) {
                return res.status(403).json({code: 403, msg: '无权为该老人创建记录'})
            }
        }


        if (!title || !remindAt) {
            return res.status(400).json({ code: 400, msg: '标题和提醒时间不能为空' })
        }

        // 将本地时间转为 UTC Date
        const utcRemindAt = parseLocalToUTC(remindAt);
        if (!utcRemindAt || isNaN(utcRemindAt.getTime())) {
            return res.status(400).json({ code: 400, msg: '提醒时间格式无效' });
        }

        // 同时提取 time 字段（HH:MM），用于定时任务
        const timeStr = utcRemindAt.toLocaleTimeString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' }).slice(0,5);

        const newReminder = await prisma.reminder.create({
            data: {
                title,
                description: description || '',
                remindAt: utcRemindAt,
                medicine: medicine || '',
                userId: targetUserId,
                taken: false,
                time: timeStr     // 或者从请求中单独获取
            }
        })
        res.status(201).json({ code: 200, data: newReminder })
    } catch (error) {
        next(error)
    }
}

// 更新提醒
const updateReminder = async (req, res, next) => {
    try {
        const { id } = req.params
        const { title, description, remindAt, medicine, taken } = req.body

        // console.log('=== 更新提醒 ===');
        // console.log('id:', id);
        // console.log('接收到的body:', req.body);

        const reminder = await prisma.reminder.findUnique({
            where: { id: parseInt(id) }
        })
        // console.log('收到更新请求, id:', id, 'body:', req.body, 'user:', req.user)
        if (!reminder) {
            // console.log('提醒不存在');
            return res.status(404).json({code: 404, msg: '提醒不存在'})
        }
        console.log('数据库原记录:', reminder);
        if (req.user.role !== 'child' && reminder.userId !== req.user.id) {
            // console.log('权限不足');
            return res.status(403).json({ code: 403, msg: '无权操作' })
        }


        // 2. 权限检查（子女或本人）
        if (req.user.role !== 'child' && reminder.userId !== req.user.id) {
            return res.status(403).json({ code: 403, msg: '无权操作' })
        }

        // 准备更新数据
        let updateData = {
            title: title !== undefined ? title : reminder.title,
            description: description !== undefined ? description : reminder.description,
            medicine: medicine !== undefined ? medicine : reminder.medicine,
            // 更新后处理 remindAt（如果传入且与原值不同，则重置 taken = false）

            // taken: taken !== undefined ? taken : reminder.taken
        };

        // 标记是否修改了提醒时间
        let isRemindAtChanged = false


        if (remindAt) {
            const utcRemindAt = parseLocalToUTC(remindAt);
            if (!utcRemindAt || isNaN(utcRemindAt.getTime())) {
                return res.status(400).json({ code: 400, msg: '提醒时间格式无效' });
            }

            // 比较新时间与原时间是否相同（精确到分钟，忽略秒/毫秒）
            const oldTime = reminder.remindAt;
            const newTime = utcRemindAt;
            if (oldTime.getTime() !== newTime.getTime()) {
                isRemindAtChanged = true;
            }


            updateData.remindAt = utcRemindAt;
            updateData.time = remindAt.slice(11, 16);  // 直接取 HH:MM
        }

        // 如果提醒时间被修改，则强制重置 taken 为 false
        if (isRemindAtChanged) {
            updateData.taken = false;
        } else {
            // 否则，如果前端显式传了 taken，则使用前端值；否则保持原值
            if (taken !== undefined) {
                updateData.taken = taken;
            }
        }


        const updated = await prisma.reminder.update({
            where: { id: parseInt(id) },
            data: updateData
        })
        res.json({ code: 200, data: updated })
    } catch (error) {
        next(error)
    }
}


// 删除提醒
const deleteReminder = async (req, res, next) => {
    try {
        const { id } = req.params
        const reminder = await prisma.reminder.findUnique({
            where: { id: parseInt(id) }
        })
        if (!reminder) return res.status(404).json({ code: 404, msg: '提醒不存在' })
        if (req.user.role !== 'child' && reminder.userId !== req.user.id) {
            return res.status(403).json({ code: 403, msg: '无权操作' })
        }
        await prisma.reminder.delete({ where: { id: parseInt(id) } })
        res.json({ code: 200, msg: '删除成功' })
    } catch (error) {
        next(error)
    }
}

// 标记已吃（老人端用）
const markTaken = async (req, res, next) => {
    try {
        const { id } = req.params
        const reminder = await prisma.reminder.findUnique({
            where: { id: parseInt(id) }
        })
        if (!reminder) return res.status(404).json({ code: 404, msg: '提醒不存在' })
        if (reminder.userId !== req.user.id) {
            return res.status(403).json({ code: 403, msg: '无权操作' })
        }
        const updated = await prisma.reminder.update({
            where: { id: parseInt(id) },
            data: { taken: true }
        })
        res.json({ code: 200, data: updated })
    } catch (error) {
        next(error)
    }
}




// module.exports = {
//     getTodayReminders,
//     checkReminders
// }

module.exports = {
    getTodayReminders,
    checkReminders,
    getReminders,
    getReminderById,
    createReminder,
    updateReminder,
    deleteReminder,
    markTaken
}