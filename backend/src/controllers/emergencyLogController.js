const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// 获取求助记录列表
const getLogs = async (req, res, next) => {
    try {
        let where = {}
        if (req.user.role === 'child') {
            if (req.query.userId) {
                where.userId = parseInt(req.query.userId)
            }
        } else {
            where.userId = req.user.id
        }
        const logs = await prisma.emergencyLog.findMany({
            where,
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