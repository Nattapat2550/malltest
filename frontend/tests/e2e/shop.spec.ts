import { test, expect } from '@playwright/test';

test.describe('E-Commerce Core Flow (Shop & Cart)', () => {
  const baseURL = 'http://localhost:3000';

  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto(baseURL);
    await page.waitForLoadState('domcontentloaded');

    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
  });

  test('ควรสามารถเปิดหน้าร้านค้าและคลิกดูรายละเอียดสินค้าได้', async ({ page }) => {
    await page.goto(`${baseURL}/shop`);
    await page.waitForLoadState('domcontentloaded');

    // ใช้ Selector แบบยืดหยุ่น หาจากลิงก์ที่พาไปหน้า product
    const productCard = page.locator('a[href^="/product/"]').first();
    
    // เช็คก่อนว่ามีสินค้าแสดงไหม
    const count = await productCard.count();
    if (count === 0) {
      test.skip(true, 'ข้ามเทสนี้เนื่องจากยังไม่มีสินค้าในฐานข้อมูล (ให้ไปเพิ่มสินค้าในหน้า Admin ก่อน)');
      return;
    }

    await expect(productCard).toBeVisible({ timeout: 10000 }); 
    await productCard.click({ force: true });

    await expect(page).toHaveURL(/.*product\/.+/);
    
    // ดักจับปุ่มเพิ่มลงตะกร้าแบบยืดหยุ่น (เผื่อใช้คำอื่น)
    const addToCartBtn = page.getByRole('button', { name: /ตะกร้า|Cart/i }).first();
    await expect(addToCartBtn).toBeVisible();
  });

  test('ควรสามารถเพิ่มสินค้าลงตะกร้าและตรวจสอบในหน้า Cart ได้', async ({ page }) => {
    await page.goto(`${baseURL}/shop`);
    await page.waitForLoadState('domcontentloaded');

    const productCard = page.locator('a[href^="/product/"]').first();
    
    if (await productCard.count() === 0) {
      test.skip(true, 'ข้ามเทสนี้เนื่องจากไม่มีสินค้าในฐานข้อมูล');
      return;
    }

    await expect(productCard).toBeVisible({ timeout: 10000 });
    await productCard.click({ force: true });

    const addToCartBtn = page.getByRole('button', { name: /ตะกร้า|Cart/i }).first();
    await expect(addToCartBtn).toBeVisible();
    await addToCartBtn.click({ force: true });

    await page.goto(`${baseURL}/cart`);
    await page.waitForLoadState('domcontentloaded');

    const checkoutBtn = page.getByRole('button', { name: /สั่งซื้อ|ชำระเงิน|Checkout/i }).first();
    await expect(checkoutBtn).toBeVisible();
  });
});