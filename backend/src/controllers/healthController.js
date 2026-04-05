const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * 获取记录列表
 * - 子女可传入 userId 查询指定老人的记录，且必须验证归属
 * - 老人只能查看自己的记录
 */
const getRecords = async (req, res, next) => {
    try {
        let whereCondition = {}
        // console.log('当前登录用户:', req.user)
        // console.log('请求参数 userId:', req.query.userId)

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



        const records = await prisma.healthRecord.findMany({
            where: whereCondition,
            orderBy: { recordDate: 'desc' }  // 按日期倒序
        })
        res.json({ code: 200, data: records })
    } catch (error) {
        next(error)
    }
}

/**
 * 获取单条记录
 */
const getRecordById = async (req, res, next) => {
    try {
        const { id } = req.params
        const record = await prisma.healthRecord.findUnique({
            where: { id: parseInt(id) }
        })
        if (!record) {
            return res.status(404).json({ code: 404, msg: '记录不存在' })
        }
        // 权限检查：只有本人或子女可查看
        if (req.user.role !== 'child' && record.userId !== req.user.id) {
            return res.status(403).json({ code: 403, msg: '无权访问' })
        }
        res.json({ code: 200, data: record })
    } catch (error) {
        next(error)
    }
}

/**
 * 创建记录
 */
const createRecord = async (req, res, next) => {
    try {
        const { title, content, recordType, recordDate, userId } = req.body
        let targetUserId = req.user.id
        if (req.user.role === 'child' && userId) {
            targetUserId = parseInt(userId)
        }
        // 简单校验
        if (!title || !recordType) {
            return res.status(400).json({ code: 400, msg: '标题和类型不能为空' })
        }

        const newRecord = await prisma.healthRecord.create({
            data: {
                title,
                content: content || '',
                recordType,
                recordDate: recordDate ? new Date(recordDate) : new Date(),
                userId: targetUserId
            }
        })
        res.status(201).json({ code: 200, data: newRecord })
    } catch (error) {
        next(error)
    }
}

/**
 * 更新记录
 */
const updateRecord = async (req, res, next) => {
    try {
        const { id } = req.params
        const { title, content, recordType, recordDate } = req.body

        const record = await prisma.healthRecord.findUnique({
            where: { id: parseInt(id) }
        })
        if (!record) {
            return res.status(404).json({ code: 404, msg: '记录不存在' })
        }
        if (req.user.role !== 'child' && record.userId !== req.user.id) {
            return res.status(403).json({ code: 403, msg: '无权操作' })
        }

        const updated = await prisma.healthRecord.update({
            where: { id: parseInt(id) },
            data: {
                title: title || record.title,
                content: content !== undefined ? content : record.content,
                recordType: recordType || record.recordType,
                recordDate: recordDate ? new Date(recordDate) : record.recordDate
            }
        })
        res.json({ code: 200, data: updated })
    } catch (error) {
        next(error)
    }
}

/**
 * 删除记录
 */
const deleteRecord = async (req, res, next) => {
    try {
        const { id } = req.params
        const record = await prisma.healthRecord.findUnique({
            where: { id: parseInt(id) }
        })
        if (!record) {
            return res.status(404).json({ code: 404, msg: '记录不存在' })
        }
        if (req.user.role !== 'child' && record.userId !== req.user.id) {
            return res.status(403).json({ code: 403, msg: '无权操作' })
        }

        await prisma.healthRecord.delete({
            where: { id: parseInt(id) }
        })
        res.json({ code: 200, msg: '删除成功' })
    } catch (error) {
        next(error)
    }
}

module.exports = {
    getRecords,
    getRecordById,
    createRecord,
    updateRecord,
    deleteRecord
}