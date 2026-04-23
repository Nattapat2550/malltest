import { test, expect } from '@playwright/test';

test.describe('Protected Routes Security (การป้องกันหน้าเว็บ)', () => {
  const baseURL = 'http://localhost:3000';

  test.beforeEach(async ({ page }) => {
    // บังคับให้สถานะเป็น "ยังไม่ได้ล็อกอิน" แน่นอน
    await page.context().clearCookies();
  });

  test('ระบบต้องบล็อกไม่ให้ผู้ใช้ที่ไม่ได้ล็อกอิน เข้าถึงหน้า My Orders', async ({ page }) => {
    // พยายามเข้าหน้าประวัติการสั่งซื้อโดยตรง
    await page.goto(`${baseURL}/my-orders`);
    await page.waitForLoadState('domcontentloaded');

    // คาดหวังว่าระบบจะดีด (Redirect) กลับมาที่หน้า Login โดยอัตโนมัติ
    await expect(page).toHaveURL(/.*login/);
  });

  test('ระบบต้องบล็อกไม่ให้ผู้ใช้ที่ไม่ได้ล็อกอิน เข้าถึงหน้า Checkout', async ({ page }) => {
    // พยายามข้ามขั้นตอนไปหน้าชำระเงิน
    await page.goto(`${baseURL}/checkout`);
    await page.waitForLoadState('domcontentloaded');

    // คาดหวังว่าระบบจะดีดกลับมาที่หน้า Login
    await expect(page).toHaveURL(/.*login/);
  });

  test('ระบบต้องบล็อกไม่ให้คนทั่วไป เข้าถึงหน้า Admin Dashboard', async ({ page }) => {
    // พยายามเจาะเข้าหน้าแอดมิน
    await page.goto(`${baseURL}/admin`);
    await page.waitForLoadState('domcontentloaded');

    // ระบบที่ดีควรดีดกลับไปหน้า Login หรือหน้า Home 
    // (ปรับ /login หรือ / ตรงนี้ให้ตรงกับ Logic React Router ของคุณ)
    await expect(page).not.toHaveURL(/.*admin/);
  });
});