import { expect, test } from '@playwright/test';

// UI boundary tests; database ownership/validation are covered by actual SQL tests.
test('pending seller completes basic details and retries multiple photo uploads', async ({ page }, testInfo) => {
  const user = { id: '10000000-0000-4000-8000-000000000002', name: 'Seller Name', email: 'seller@test.invalid', city: 'Bengaluru', role: 'member', joined: 0, deals: 0, kyc: { status: 'pending', basicStatus: 'not_started' } };
  await page.route('**/api/session', route => route.fulfill({ json: { user } }));
  await page.route('**/api/listings/mine', route => route.fulfill({ json: { listings: [] } }));
  await page.route('**/api/orders/selling', route => route.fulfill({ json: { orders: [] } }));
  await page.route('**/api/kyc', async route => {
    expect(route.request().postDataJSON().pan).toBe('ABCPN1234E');
    user.kyc.basicStatus = 'checked';
    await route.fulfill({ json: { done: true } });
  });
  let uploads = 0;
  await page.route('**/api/uploads', async route => {
    uploads++;
    if (uploads === 2) return route.fulfill({ status: 503, json: { error: 'Temporary upload failure' } });
    await route.fulfill({ status: 201, json: { path: `${user.id}/${uploads === 1 ? 'aaa' : 'bbb'}.jpg` } });
  });
  let submitted = false;
  await page.route('**/api/listings', async route => {
    expect(route.request().postDataJSON().imagePaths).toEqual([`${user.id}/aaa.jpg`, `${user.id}/bbb.jpg`]);
    expect(route.request().postDataJSON().ageMonths).toBe('0');
    submitted = true;
    await route.fulfill({ status: 201, json: { listing: { id: 'test' } } });
  });
  await page.goto('/sell/verify');
  await expect(page.getByRole('heading', { name: 'Your seller details' })).toBeVisible();
  await page.getByLabel('Legal name', { exact: true }).fill('Seller Name');
  await page.getByLabel('PAN', { exact: true }).fill('abcpn1234e');
  await page.getByLabel('Bank account number', { exact: true }).fill('012345678901');
  await page.getByLabel('Confirm bank account number', { exact: true }).fill('012345678902');
  await page.getByLabel('IFSC', { exact: true }).fill('SBIN0001234');
  await page.getByLabel('Account holder name', { exact: true }).fill('Seller Name');
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'do not match' })).toBeVisible();
  await page.getByLabel('Confirm bank account number', { exact: true }).fill('012345678901');
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await expect(page).toHaveURL(/\/sell\/new$/);
  await page.getByLabel('Product photos (required)', { exact: true }).setInputFiles(['scripts/fixtures/catalog/gpu.jpg', 'scripts/fixtures/catalog/intel.jpg']);
  await expect(page.getByRole('status').filter({ hasText: '2 of 8' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('two-photo-picker.png'), fullPage: true });
  await page.getByLabel('Title', { exact: true }).fill('Graphics card test');
  await page.getByLabel('Brand', { exact: true }).fill('Test');
  await page.getByLabel('Age in months', { exact: true }).fill('0');
  await page.getByLabel('Description', { exact: true }).fill('A test graphics card with two product photos.');
  await page.getByLabel('Serial number', { exact: true }).fill('TEST-ONLY');
  await page.getByRole('spinbutton', { name: 'Asking price' }).fill('10000');
  await page.getByRole('button', { name: 'Submit for review' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Temporary upload failure' })).toBeVisible();
  await page.getByRole('button', { name: 'Submit for review' }).click();
  await expect(page).toHaveURL(/\/selling$/);
  expect(submitted).toBe(true);
  expect(uploads).toBe(3); // First photo was reused rather than uploaded again.
  await expect(page.getByText('ID verified', { exact: false })).toHaveCount(0);
});
