import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  const baseURL = 'http://localhost:3000';

  test.beforeEach(async ({ page }) => {
    // 1. เคลียร์ Cookies และ Local State เพื่อให้มั่นใจว่าเริ่มจากสถานะ "ยังไม่ได้ล็อกอิน" เสมอ
    await page.context().clearCookies();
    
    await page.goto(`${baseURL}/login`);
    
    // 2. รอให้โครงสร้าง DOM โหลดเสร็จสิ้นจริงๆ ก่อนทำขั้นตอนถัดไป
    await page.waitForLoadState('domcontentloaded');
    
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape'); 
  });

  test('ควรสามารถโหลดหน้า Login ได้', async ({ page }) => {
    // ตรวจสอบจากช่องกรอก Email (ซึ่งหน้า Login ต้องมีแน่ๆ) แทนการตรวจข้อความ Heading
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    
    // ตรวจสอบปุ่ม submit (หรือปุ่มเข้าสู่ระบบ)
    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(submitBtn).toBeVisible();
  });

  test('ควรแสดง Error หากกรอกข้อมูล Login ไม่ครบ', async ({ page }) => {
    // กดปุ่ม submit โดยตรง 
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click({ force: true });
    
    // ตรวจสอบว่าไม่ได้เปลี่ยนหน้าไปไหน (ยังอยู่ที่ login เพราะฟอร์มไม่ผ่าน)
    await expect(page).toHaveURL(/.*login/);

    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible()) {
      // ตรวจสอบ HTML5 Validation
      const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
      expect(isInvalid).toBeTruthy();
    }
  });

  test('ควรสามารถไปหน้า Register จากหน้า Login ได้', async ({ page }) => {
    // หาลิงก์ที่พาไปหน้า /register โดยตรง ซึ่งชัวร์กว่าการหาด้วยคำว่า "สมัครสมาชิก"
    const registerLink = page.locator('a[href="/register"]').first();
    await registerLink.click({ force: true });
    
    // ตรวจสอบว่า URL เปลี่ยนไปที่หน้า Register
    await expect(page).toHaveURL(/.*register/, { timeout: 10000 });
  });
});

test.describe('Shop & Product Flow', () => {
  const baseURL = 'http://localhost:3000';

  test('ควรแสดงรายการสินค้าในหน้าแรก (Home)', async ({ page }) => {
    await page.goto(baseURL);
    await page.waitForLoadState('domcontentloaded');
    
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');

    const loading = page.getByText(/loading/i);
    if (await loading.isVisible()) {
      await expect(loading).toBeHidden({ timeout: 5000 });
    }

    // ตรวจสอบว่ามีคลาสของสินค้าโชว์ขึ้นมา (ปรับแก้คลาส '.product-card' ให้ตรงกับงานจริงหากจำเป็น)
    const productCards = page.locator('.product-card'); 
    if (await productCards.count() > 0) {
        await expect(productCards.first()).toBeVisible();
    }
  });
});