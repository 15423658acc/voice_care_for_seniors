const nodemailer = require('nodemailer') //发送邮件
const dotenv = require('dotenv')  //读环境变量
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
 * 发送紧急邮件
 * @param {Object} req.body.location - { latitude, longitude }
 * @param {String} req.body.address - 可选的地图链接
 */
const sendEmergencyMail = async (req, res, next) => {
    try {
        const { location, address } = req.body  //前端定位数据
        if (!location || !location.latitude || !location.longitude) {
            return res.status(400).json({ code: 400, msg: '缺少位置信息' })
        }

        // 从环境变量读取紧急联系人邮箱（可配置多个）
        const toEmails = process.env.EMERGENCY_EMAILS || 's789_2023@foxmail.com'

        // 构建邮件内容
        const mapLink = address || `https://uri.amap.com/marker?position=${location.longitude},${location.latitude}&name=老人当前位置`

      //   避免邮件被标记的安全写法
        const mailOptions = {
            from: `"老友助手" <${process.env.SMTP_USER}>`,
            to: toEmails,
            // 优化：移除警示emoji，标题简洁规范，无夸张话术
            subject: '【老友助手】老人紧急呼叫通知',
            html: `
                <h1>老人紧急呼叫提醒</h1>
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



      //   const mailOptions = {
      //       from: `"老友助手" <${process.env.SMTP_USER}>`,
      //       to: toEmails,
      //       subject: '🚨 老人紧急呼叫！请立即联系',
      //       html: `
      //   <h1>老人触发紧急呼叫</h1>
      //   <p>时间：${new Date().toLocaleString()}</p>
      //   <p>定位信息：</p>
      //   <ul>
      //     <li>纬度：${location.latitude}</li>
      //     <li>经度：${location.longitude}</li>
      //   </ul>
      //   <p>查看地图：<a href="${mapLink}">点击查看老人位置</a></p>
      //   <p>请尽快确认老人安全！</p>
      // `
      //   }

        // 发送邮件
        await transporter.sendMail(mailOptions)

        res.json({ code: 200, msg: '邮件发送成功' })
    } catch (error) {
        next(error) // 交给全局错误处理器
    }
}

module.exports = {
    sendEmergencyMail
}