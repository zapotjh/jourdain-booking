import { expect, test } from '@playwright/test';

test.describe('Legal pages smoke', () => {
  test('terms renders', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.getByRole('heading', { name: '전체 이용약관', level: 1 })).toBeVisible();
    await expect(page.getByText(/개인정보 방침/)).toBeVisible();
    await expect(page.getByText(/법적 고지/)).toBeVisible();
  });

  test('privacy renders', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('heading', { name: /개인정보처리방침/, level: 1 })).toBeVisible();
    await expect(
      page
        .getByRole('heading', { level: 1 })
        .filter({ hasText: 'Privacy Policy' })
        .first(),
    ).toBeVisible();
  });

  test('legal renders', async ({ page }) => {
    await page.goto('/legal');
    await expect(page.getByRole('heading', { name: /법적 고지/, level: 1 })).toBeVisible();
    await expect(
      page
        .getByRole('heading', { level: 1 })
        .filter({ hasText: 'Legal Notice' })
        .first(),
    ).toBeVisible();
  });
});

