import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* 🌟 [สำคัญ] ปลดคอมเมนต์ตรงนี้ เพื่อให้ GitHub Actions รันเว็บขึ้นมาก่อนเทส */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI, // ถ้าเครื่อง Local มีรันอยู่แล้วก็ใช้ของเดิม ถ้าใน CI ให้เปิดใหม่
    timeout: 120 * 1000, // ให้เวลา Boot เซิร์ฟเวอร์ 120 วินาที
  },
});