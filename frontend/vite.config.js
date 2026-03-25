// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    vue(),
    // PWA 插件配置
    VitePWA({
      // 核心：自定义 Service Worker 逻辑
      // srcDir: 'src',
      // filename: 'sw.js', // 你的自定义 SW 入口文件
      // strategies: 'injectManifest', // 关键：不使用默认的 generateSW，而是注入自定义逻辑
      registerType: 'autoUpdate', // 注册类型，autoUpdate 表示新版本 Service Worker 会自动更新并接管
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'], // 需要缓存的静态资源
      manifest: {
        name: '老友助手', // 应用名称
        short_name: '老友助手', // 短名称
        description: '面向银发族的语音智能助手', // 描述
        theme_color: '#ffffff', // 主题色
        icons: [
          {
            src: 'pwa-192x192.png', // 图标路径，请将图标放在 public 目录下
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // 可遮罩图标，适配不同设备
          }
        ]
      },
      workbox: {
        // Workbox 配置，用于生成 Service Worker
        // 确保 sw.js 生成在根目录（默认 public 下的不会被覆盖）
        // 我们使用自定义的 public/sw.js，所以需要排除默认生成
        // 如果使用默认生成，可以配置 runtimeCaching；但为了完全自定义，我们关闭生成
        // 注意：如果不想使用插件生成，可以直接不配置 PWA 插件，手动注册即可。
        // 但这里我们保留插件，但通过 globPatterns 排除所有文件，避免生成无用的缓存策略。
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'], // 要缓存的静态文件类型
        runtimeCaching: [
          {
            // 运行时缓存策略：例如对 API 请求使用 NetworkFirst
            urlPattern: /^https:\/\/api\.example\.com\/.*/, // 这里替换为你的后端 API 地址模式
            handler: 'NetworkFirst', // 网络优先，如果网络失败则使用缓存
            options: {
              cacheName: 'api-cache', // 缓存名称
              expiration: {
                maxEntries: 50, // 最大缓存条目数
                maxAgeSeconds: 60 * 60 * 24 // 缓存有效期 1 天
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 5173, // 开发服务器端口
    open: true, // 自动打开浏览器
    proxy: {
      // 匹配所有以 /api 开头的请求
      '/api': {
        target: 'http://localhost:3000', // 后端真实地址
        changeOrigin: true, // 关键：让后端认为请求来自 3000 端口（解决跨域）
      }
    }
  },
  resolve: {
    // 配置路径别名
    alias: {
      '@': path.resolve(__dirname, 'src') // 关键：把 @ 指向 src 目录
    }
  }
})