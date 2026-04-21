import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    strictPort: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups', // 🌟 ของเดิม
      'X-Frame-Options': 'DENY', // ป้องกัน Clickjacking
      'X-Content-Type-Options': 'nosniff', // ป้องกัน MIME-type sniffing
      'Strict-Transport-Security': 'max-age=315360000; includeSubDomains', // บังคับใช้ HTTPS
      'Content-Security-Policy': "default-src 'self' http: https: ws: wss: data: blob: 'unsafe-inline' 'unsafe-eval';" // ป้องกัน XSS (อนุญาต ws/wss และ eval สำหรับ Vite HMR ตอน Dev)
    }
  },
  preview: {
    port: 3000,
    strictPort: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Strict-Transport-Security': 'max-age=315360000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self' http: https: data: blob: 'unsafe-inline';" 
    }
  }
})