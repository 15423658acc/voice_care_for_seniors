const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// 获取求助记录列表
const getLogs = async (req, res, next) => {
    try {
        let whereCondition = {}

        if (req.user.role === 'elder') {
            whereCondition.userId = req.user.id
        }
        else if (req.user.role === 'child') {
            const elderId = parseInt(req.query.userId)
            if (!elderId) {
                return res.status(400).json({ code: 400, msg: '请指定老人ID' })
            }
            // 验证该老人是否属于当前子女
            const elder = await prisma.user.findFirst({
                where: {
                    id: elderId,
                    role: 'elder',
                    parentId: req.user.id
                }
            })
            if (!elder) {
                return res.status(403).json({ code: 403, msg: '无权访问该老人的数据' })
            }
            whereCondition.userId = elderId
        }
        else {
            return res.status(403).json({ code: 403, msg: '无效角色' })
        }


        const logs = await prisma.emergencyLog.findMany({
            where:whereCondition,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { username: true } } }
        })
        res.json({ code: 200, data: logs })
    } catch (error) {
        next(error)
    }
}

// 获取单条记录
const getLogById = async (req, res, next) => {
    try {
        const { id } = req.params
        const log = await prisma.emergencyLog.findUnique({
            where: { id: parseInt(id) },
            include: { user: true }
        })
        if (!log) return res.status(404).json({ code: 404, msg: '记录不存在' })
        if (req.user.role !== 'child' && log.userId !== req.user.id) {
            return res.status(403).json({ code: 403, msg: '无权访问' })
        }
        res.json({ code: 200, data: log })
    } catch (error) {
        next(error)
    }
}

// 创建求助记录（老人端触发）
// 对于查看求助记录中的地图：在createLog方法将前端传来的location原样保存（一个完整的 URL）。同时修改老人端代码，在紧急呼叫时调用 createLog 接口。
const createLog = async (req, res, next) => {
    try {
        const { latitude, longitude, location } = req.body
        const newLog = await prisma.emergencyLog.create({
            data: {
                userId: req.user.id,
                latitude: latitude || null,
                longitude: longitude || null,
                location: location || ''
            }
        })
        res.status(201).json({ code: 200, data: newLog })
    } catch (error) {
        next(error)
    }
}

module.exports = {
    getLogs,
    getLogById,
    createLog
}