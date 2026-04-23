import { defineConfig, devices } from '@playwright/test';

/**
 * อ่านเพิ่มเติม: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* รันเทสแบบขนาน (Parallel) เพื่อให้เสร็จไวขึ้น */
  fullyParallel: true,
  /* หยุดเทสถ้ารันบน CI แล้วเผลอใส่ test.only() ทิ้งไว้ */
  forbidOnly: !!process.env.CI,
  /* จำนวนครั้งที่ให้รันใหม่ถ้าเทสพัง (ดีมากสำหรับการลดอาการ Flaky) */
  retries: process.env.CI ? 2 : 1,
  /* จำนวน Worker ที่ใช้รัน */
  workers: process.env.CI ? 1 : undefined,
  /* รูปแบบ Report ดูผลเทส (รัน npx playwright show-report เพื่อดู) */
  reporter: 'html',
  
  /* ตั้งค่าพื้นฐานสำหรับทุกเทส */
  use: {
    /* Base URL ทำให้เราพิมพ์แค่ /login หรือ /shop ในโค้ดเทสได้เลย */
    baseURL: 'http://localhost:3000',

    /* เก็บบันทึก Trace (ข้อมูลเบื้องลึก) เมื่อเทสต้องรันซ้ำ (มีประโยชน์ตอนหาบัค) */
    trace: 'on-first-retry',
    
    /* ถ่ายภาพ Screenshot ตอนเทสพังอัตโนมัติ */
    screenshot: 'only-on-failure',
    
    /* อัดวิดีโอเฉพาะเทสที่พัง */
    video: 'retain-on-failure',
  },

  /* คอนฟิกเบราว์เซอร์ที่จะใช้รัน (ทดสอบแค่ Chrome/Chromium ก็พอในเบื้องต้น) */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // สามารถเปิดคอมเมนต์เพื่อเทสบน Firefox หรือ Safari (WebKit) ได้
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* 🌟 [สำคัญ] สามารถตั้งค่าให้ Playwright สั่งรัน npm run dev ให้เราอัตโนมัติได้ */
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI, // ถ้ารันเซิร์ฟเวอร์ทิ้งไว้อยู่แล้ว ก็ใช้ของเดิม
  // },
});