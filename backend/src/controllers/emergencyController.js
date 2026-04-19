const nodemailer = require('nodemailer') //发送邮件
const dotenv = require('dotenv')  //读环境变量
const { sendPushToChild } = require('../utils/webPush')  // 订阅推送
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
dotenv.config()  //加载.env文件里的配置

// 创建邮件传输器
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST, // SMTP服务器地址
    port: process.env.SMTP_PORT, // 端口
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER, // 邮箱账号
        pass: process.env.SMTP_PASS  // 邮箱授权码（不是登录密码）
    }
})

/**
 *
 * 问题：同步处理邮件和 Web Push 耗时较长（可能数秒），导致 Vite 代理超时（ECONNRESET），前端收到错误，影响用户体验。
 * 解决思路：将耗时操作从请求-响应周期中剥离，立即返回成功响应给前端。前端认为任务已完成，不再等待，从而避免代理超时。
 *
 * setImmediate：Node.js 的宏任务，会在当前事件循环结束后立即执行，但不阻塞响应。比 setTimeout(fn, 0) 更高效。
 * 若在 res.json 后继续 await，响应已发送，后续代码仍会执行，但 setImmediate 更清晰地将后台任务与请求上下文分离。
 * 优点：前端体验流畅，错误隔离（后台任务失败不影响已发送的响应）。
 *
 * Web Push 网络超时（但不影响功能）。
 * 语音播报已成功：说明核心功能已跑通，剩余错误属于优化范畴。
 */
const sendEmergencyMail = async (req, res, next) => {
    try {
        const { location, address, elderName, elderId } = req.body

        // 基础校验
        if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
            return res.status(400).json({ code: 400, msg: '缺少有效的位置信息' })
        }

        // 【优化】立即返回成功，后续处理放入异步任务，避免代理超时
        res.json({ code: 200, msg: '紧急通知请求已接收' })

        // 后台异步处理（不阻塞响应）
        setImmediate(async () => {
            try {
                const toEmails = process.env.EMERGENCY_EMAILS || 's789_2023@foxmail.com'
                const mapLink = address || `https://uri.amap.com/marker?position=${location.longitude},${location.latitude}&name=老人当前位置`

                // 1. 发送邮件
                const mailOptions = {
                    from: `"老友助手" <${process.env.SMTP_USER}>`,
                    to: toEmails,
                    subject: '【老友助手】老人紧急呼叫通知',
                    html: `
                        <h1>${elderName}老人紧急呼叫提醒</h1>
                        <p>您好，系统检测到老人触发了紧急呼叫功能，相关信息如下：</p>
                        <p>呼叫触发时间：${new Date().toLocaleString()}</p>
                        <p>定位信息：</p>
                        <ul>
                          <li>纬度：${location.latitude}</li>
                          <li>经度：${location.longitude}</li>
                        </ul>
                        <p>查看老人实时位置：<a href="${mapLink}">点击查看地图位置</a></p>
                        <p>请尽快联系老人并确认其安全状况。</p>
                        <p>]——老友助手 系统通知</p>
                          `
                }
                await transporter.sendMail(mailOptions)
                console.log(`[Emergency] 邮件已发送至 ${toEmails}`)

                // 2. 发送推送给子女
                if (elderId) {
                    const elder = await prisma.user.findUnique({
                        where: { id: parseInt(elderId) },
                        select: { parentId: true, fullName: true, username: true }
                    })
                    if (elder && elder.parentId) {
                        const displayName = elder.fullName || elder.username || '老人'
                        await sendPushToChild(elder.parentId, {
                            title: '🚨 紧急呼救',
                            body: `${displayName} 触发了紧急呼叫，请立即查看！`,
                            data: {
                                type: 'emergency',
                                url: '/emergency-logs',
                                elderId: elderId,
                                latitude: location.latitude,
                                longitude: location.longitude,
                                timestamp: new Date().toISOString()
                            }
                        })
                    }
                }
            } catch (bgError) {
                console.error('[Emergency] 后台处理失败:', bgError)
            }
        })

    } catch (error) {
        console.error('[Emergency] 处理紧急呼叫失败:', error)
        next(error)
    }
}



module.exports = {
    sendEmergencyMail
}