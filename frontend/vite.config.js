import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'pages/app.html'),
        callback: resolve(__dirname, 'pages/callback.html'),
        logout: resolve(__dirname, 'pages/logout.html'),
        privacy: resolve(__dirname, 'pages/privacy.html'),
        userDashboard: resolve(__dirname, 'pages/userDashboard.html')
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
})