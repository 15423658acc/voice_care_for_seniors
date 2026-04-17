// src/server.js  项目 “总开关”，只启动服务器
const app = require('./app')
const dotenv = require('dotenv')

// 新增：引入定时任务相关依赖
const cron = require('node-cron')
const { checkReminders, refreshPeriodicReminders, initNextRemindAtForAll } = require('./controllers/reminderController')

// 加载环境变量
dotenv.config()

const PORT = process.env.PORT || 3000

// 定时任务代码要加在 “加载环境变量后，启动服务器前”, 相当于 “先把定时闹钟调好，再打开服务器总开关”,先加载环境变量，保证定时任务有配置可用
// 每分钟执行一次检查吃药提醒的任务

// 启动时初始化所有提醒的 nextRemindAt（只执行一次，兼容旧数据）
initNextRemindAtForAll().catch(console.error)

cron.schedule('* * * * *', () => {
    console.log('执行周期刷新任务...')
    // checkReminders().catch(console.error) // 捕获错误，避免任务崩溃
    refreshPeriodicReminders().catch(console.error)
})

// 每分钟执行推送检查任务
cron.schedule('* * * * *', () => {
    console.log('检查吃药提醒并发送推送...')
    checkReminders().catch(console.error)
})


// 启动服务器，监听端口
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`)
})