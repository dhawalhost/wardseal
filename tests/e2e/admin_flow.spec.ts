import { test, expect } from '@playwright/test';

test('Complete Admin Flow: Workspace Setup & User Provisioning', async ({ page }) => {
  test.setTimeout(120000);
  const randomSuffix = Math.floor(Math.random() * 100000);
  const adminEmail = `admin_${randomSuffix}@example.com`;
  const adminPassword = 'AdminPassword123!';
  const companyName = `AdminCorp_${randomSuffix}`;

  await page.goto('http://id.wardseal.local/signup');
  await expect(page.getByText('Create your account')).toBeVisible();

  await page.fill('#companyName', companyName);
  await page.fill('#email', adminEmail);
  await page.fill('#password', adminPassword);
  await page.click('button[type="submit"]');

  await page.waitForURL('**/portal', { timeout: 30000 });

  await page.goto('http://manage.wardseal.local/');
  await page.waitForURL(/manage\.wardseal\.local/, { timeout: 30000 });
  expect(page.url()).not.toContain('id.wardseal.local');

  await expect(
    page.getByRole('heading', { name: /Dashboard|Overview|Home/i }).first()
  ).toBeVisible({ timeout: 30000 });

  // Directory users page reachable with session
  await page.goto('http://manage.wardseal.local/users');
  await expect(page.getByText(/Users|Directory|Add user/i).first()).toBeVisible({
    timeout: 20000,
  });
});
