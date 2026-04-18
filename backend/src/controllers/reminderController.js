/**
 * 吃药提醒功能 - 控制器
 * 核心功能：
 * 1. 吃药提醒的增删改查（CRUD）
 * 2. 支持一次性/每天/隔天/每周 重复提醒
 * 3. 自动计算下一次提醒时间
 * 4. Web 推送通知到前端
 * 5. 老人/子女权限控制
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const webpush = require('web-push')
const dotenv = require('dotenv')
dotenv.config()

// 设置VAPID--web推送
webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
)


// 将前端传来的本地时间字符串（如 "2026-04-04T09:50"）转换为正确的 UTC Date 对象
// 前端时间是中国时区（UTC+8），数据库统一存 UTC，避免时区混乱
function parseLocalToUTC(localDateTimeStr) {
    if (!localDateTimeStr) return null;
    // 方法：补上 +08:00 时区后缀，然后 new Date
    const dateWithTZ = new Date(localDateTimeStr + '+08:00');
    return dateWithTZ;
}

/**
 * 初始化所有提醒的「下次提醒时间」nextRemindAt
 * 用途：兼容旧数据（以前创建的提醒没有 nextRemindAt 字段），当没有设置循环提醒时，当下设置的时间就是提醒时间
 * 服务启动时执行一次即可
 */
async function initNextRemindAtForAll() {
    // 找出所有没有设置下次提醒时间的提醒
    const reminders = await prisma.reminder.findMany({
        where: { nextRemindAt: null }
    })

    // 把默认提醒时间 remindAt 赋值给 nextRemindAt
    for (const r of reminders) {
        await prisma.reminder.update({
            where: { id: r.id },
            data: { nextRemindAt: r.remindAt }
        })
    }
    console.log(`初始化了 ${reminders.length} 条提醒的 nextRemindAt`)
}


/**
 * 【定时任务】周期提醒刷新（每分钟执行）
 * 作用：找到已经过期、且已标记为已吃的周期提醒；自动计算下一次提醒时间；重置状态为未吃，等待下一轮推送
 * 改动思路：
 * 设置taken自动刷新和间断刷新的方法，当子女创建提醒时会有一个下拉框，
 * 下拉框里面的内容为”每日 1 次”、“隔日 1 次”、“每周一次（设置当日为第一次，之后每七日提醒一次）”，
 * 当老人不再需要吃药时，子女可以直接将提醒修改/删除。
 * 前端收取下拉框子女的选择传入后端；
 * 并且后端设置的taken自动刷新和间断刷新方法可以按照子女的设置实现自动刷新。
 */
const refreshPeriodicReminders = async () => {
    const now = new Date()

    // 查询条件：不是一次性提醒（repeatType != none）,已经标记吃过（taken = true）,下次提醒时间已过期
    const reminders = await prisma.reminder.findMany({
        where: {
            repeatType: { not: 'none' },
            taken: true,
            nextRemindAt: { lte: now }
        }
    })

    // 遍历每条需要刷新的周期提醒，计算下一次时间
    for (const reminder of reminders) {
        let nextDate = null
        // 基于上一次提醒时间计算，保证每天同一时间提醒
        const baseDate = reminder.nextRemindAt

        // 根据重复类型计算下一次日期
        switch (reminder.repeatType) {
            case 'daily':         // 每天
                nextDate = new Date(baseDate)
                nextDate.setDate(baseDate.getDate() + 1)
                break
            case 'every_other_day':// 隔天
                nextDate = new Date(baseDate)
                nextDate.setDate(baseDate.getDate() + 2)
                break
            case 'weekly':        // 每周
                nextDate = new Date(baseDate)
                nextDate.setDate(baseDate.getDate() + 7)
                break
            default:
                continue // 不支持的类型跳过
        }

        // 更新数据库：重置未吃状态 + 设置新的下次提醒时间，保持原提醒时间点（时、分、秒不变，因为间隔是天/周，时分会自动保留）
        await prisma.reminder.update({
            where: { id: reminder.id },
            data: {
                taken: false,                // 重置为未吃，等待下一次提醒
                nextRemindAt: nextDate,      // 更新下一次提醒时间
                // 同步更新时分秒展示字段（HH:MM）
                time: `${nextDate.getHours().toString().padStart(2,'0')}:${nextDate.getMinutes().toString().padStart(2,'0')}`
            }
        })
        console.log(`周期提醒 ${reminder.id} 已重置，下次提醒时间 ${nextDate}`)
    }
}
/**
 * 【定时任务】检查并发送吃药推送（每分钟执行）
 * 作用：查找当前时间需要提醒的记录、给所有浏览器订阅发送推送、标记为已提醒（taken=true）
 */
const checkReminders = async () => {
    const now = new Date()
    // console.log('当前时间：', new Date())
    // 获取当前的小时，把数字转成字符串（方便补零），把字符串补足到 2 位长度，不足的话在前面补 0，同理获得分。
    // 时间范围：当前时间前后 1 分钟，防止任务延迟导致错过提醒
    // 查询条件：taken = false 且 nextRemindAt 在当前时间前后一分钟内（避免因延迟错过）
    const startTime = new Date(now.getTime() - 60 * 1000)
    const endTime = new Date(now.getTime() + 60 * 1000)
    // 查询条件：未提醒 + 时间在范围内
    const reminders = await prisma.reminder.findMany({
        where: {
            taken: false,
            nextRemindAt: {
                gte: startTime,
                lte: endTime
            }
        }
    })
    // 没有需要提醒的直接返回
    if (reminders.length === 0) return

    /*
    * PushSubscription的存储逻辑：
    * PushSubscription 表的每一条记录对应 一个浏览器/设备的一次推送授权。
    * 用户点击前端的 “开启推送提醒” 按钮（Reminder.vue 中的 enablePush）
    * ---前端调用浏览器的 Push API 获取订阅对象（包含 endpoint、keys.p256dh、keys.auth）
    * ---前端将订阅对象通过 API发送给后端---后端接收后存入 push_subscriptions 表。
    * 每次推送都会存新记录吗？	不会，只存订阅端点，推送历史不记录。
    */

    // 获取所有已订阅推送的前端客户端
    const subscriptions = await prisma.pushSubscription.findMany()

    // 遍历每条提醒，发送推送
    for (const reminder of reminders) {
        // 推送内容：标题 + 内容（药名）
        const payload = JSON.stringify({
            title: '吃药提醒',
            body: `到时间吃 ${reminder.medicine} 了`
        })

        // 给每个订阅者发推送
        for (const sub of subscriptions) {
            try {
                console.log('向订阅发送推送:', sub.endpoint)
                // webpush.sendNotification：官方推送方法，把 “到时间吃药了” 这条消息，发送到用户的浏览器 / 手机
                // 循环通讯录，按地址一个个发给用户设备，
                await webpush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: {
                        p256dh: sub.p256dh,
                        auth: sub.auth
                    }
                }, payload)
                console.log('推送发送成功')
            } catch (error) {
                console.error('推送失败', error)
                // 推送失效（410）说明用户已取消订阅，删除记录
                if (error.statusCode === 410) {
                    await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } })
                }
            }
        }

        // 标记这条提醒为已发送（已提醒），等待周期刷新任务去重置（如果是周期提醒）
        await prisma.reminder.update({
            where: { id: reminder.id },
            data: { taken: true }
        })
    }
}


// 获取单个提醒
// const getTodayReminders = async (req, res, next) => {
//     try {
//         if (req.user.role !== 'elder') {
//             return res.status(403).json({ code: 403, msg: '只有老人可以查看自己的提醒' })
//         }
//         const reminders = await prisma.reminder.findMany({
//             where: { userId: req.user.id },
//             orderBy: { nextRemindAt: 'asc' }
//         })
//         res.json({ code: 200, data: reminders })
//     } catch (error) {
//         next(error)
//     }
// }

/**
 *
 * 为什么创建时 remindAt 和 nextRemindAt 相同？
 * remindAt 是原始设定时间（用户期望的首次提醒时间），作为历史记录保留，便于将来查看“原本应该几点提醒”。
 * nextRemindAt 是动态字段，用于表示“下一次应该推送提醒的时间”。
 * 在提醒刚创建时，第一次提醒还没发生，所以 两者相等是合理的！！！
 */


// 获取当天需要提醒且未吃的提醒（老人专用）
const getTodayReminders = async (req, res, next) => {
    try {
        // 权限校验：仅老人可查看自己的今日提醒
        if (req.user.role !== 'elder') {
            return res.status(403).json({ code: 403, msg: '只有老人可以查看自己的提醒' })
        }

        // 获取当前北京时间（正确获取 YYYY-MM-DD 格式）
        const now = new Date();
        const beijingTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));

        const year = beijingTime.getFullYear();
        const month = String(beijingTime.getMonth() + 1).padStart(2, '0');
        const day = String(beijingTime.getDate()).padStart(2, '0');
        const beijingDateStr = `${year}-${month}-${day}`; // 正确格式：2025-12-19

        // 构造北京时间当天起止时间
        const startBeijing = new Date(beijingDateStr + 'T00:00:00+08:00');
        const endBeijing = new Date(beijingDateStr + 'T23:59:59.999+08:00');

        //  数据库查询（逻辑正确，只修复了日期）
        const reminders = await prisma.reminder.findMany({
            where: {
                userId: req.user.id,
                taken: false,
                nextRemindAt: {
                    gte: startBeijing,
                    lte: endBeijing
                }
            },
            orderBy: { nextRemindAt: 'asc' }
        });

        res.json({ code: 200, data: reminders });
    } catch (error) {
        next(error);
    }
}

// ===================++++++++++++++===========================
// ================= 新增：增删改查  =============================

// 获取提醒列表，增加返回 repeatType 和 nextRemindAt
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
            orderBy: { nextRemindAt: 'asc' }
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

// 创建提醒，新增支持 repeatType
const createReminder = async (req, res, next) => {
    try {
        const { title, description, remindAt, medicine, userId, repeatType } = req.body
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

        // 同时提取 time 字段（HH:MM），用于定时任务，toLocaleTimeString转字符串，截取字符串前 5 个字符。
        const timeStr = utcRemindAt.toLocaleTimeString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' }).slice(0,5);
        // 代码释义：把一个 UTC 时间，转换成北京时间（东八区）的 24 小时制时间字符串，并且只保留 HH:mm（时：分）格式。2025-02-07T09:00:00.000Z变成"17:00:00"变成"17:00"

        // 处理周期类型，默认为 'none'：合法就用传入的重复类型，不合法就默认设为 none，repeatType 有值、不为空、不是 undefined，
        const repeat = (repeatType && ['daily', 'every_other_day', 'weekly'].includes(repeatType)) ? repeatType : 'none'

        const newReminder = await prisma.reminder.create({
            data: {
                title,
                description: description || '',
                remindAt: utcRemindAt,
                medicine: medicine || '',
                userId: targetUserId,
                taken: false,
                time: timeStr,     // 或者从请求中单独获取
                repeatType: repeat,
                nextRemindAt: utcRemindAt   // 第一次提醒时间就是用户设置的时间
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
        const { title, description, remindAt, medicine, taken,repeatType  } = req.body

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

        let updateData = {
            title: title !== undefined ? title : reminder.title,
            description: description !== undefined ? description : reminder.description,
            medicine: medicine !== undefined ? medicine : reminder.medicine,
        }

        let isRemindAtChanged = false         // 标记是否修改了提醒时间
        let isRepeatTypeChanged = false

        // 处理时间修改
        if (remindAt) {
            const utcRemindAt = parseLocalToUTC(remindAt)
            if (!utcRemindAt || isNaN(utcRemindAt.getTime())) {
                return res.status(400).json({ code: 400, msg: '提醒时间格式无效' })
            }
            if (reminder.remindAt.getTime() !== utcRemindAt.getTime()) {
                isRemindAtChanged = true
            }
            updateData.remindAt = utcRemindAt
            updateData.time = remindAt.slice(11, 16)
            // 如果时间变了，nextRemindAt 也要同步更新
            updateData.nextRemindAt = utcRemindAt
        }

        // 处理周期类型修改
        if (repeatType !== undefined && repeatType !== reminder.repeatType) {
            isRepeatTypeChanged = true
            updateData.repeatType = repeatType
            // 如果改成周期类型，确保 nextRemindAt 有值
            if (repeatType !== 'none' && !updateData.nextRemindAt) {
                updateData.nextRemindAt = updateData.remindAt || reminder.remindAt
            }
        }


        // 如果时间或周期类型被修改，强制重置 taken = false（相当于重新开始提醒）
        if (isRemindAtChanged || isRepeatTypeChanged) {
            updateData.taken = false
        } else {
            if (taken !== undefined) {
                updateData.taken = taken
            }
        }

        console.log("更新后：",updateData)
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
    refreshPeriodicReminders,   // 新增导出
    initNextRemindAtForAll,     // 导出初始化函数
    getReminders,
    getReminderById,
    createReminder,
    updateReminder,
    deleteReminder,
    markTaken
}