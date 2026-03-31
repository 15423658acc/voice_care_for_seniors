const getUsersByRole = async (req, res, next) => {
    try {
        const { role } = req.query
        // 只有子女可以调用
        if (req.user.role !== 'child') {
            return res.status(403).json({ code: 403, msg: '无权限' })
        }
        const users = await prisma.user.findMany({
            where: { role: role || undefined },
            select: { id: true, username: true, role: true }
        })
        res.json({ code: 200, data: users })
    } catch (error) {
        next(error)
    }
}