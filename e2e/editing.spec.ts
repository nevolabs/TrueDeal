import { expect, test } from '@playwright/test';

const user = { id: '10000000-0000-4000-8000-000000000002', name: 'Seller Name', email: 'seller@test.invalid', city: 'Bengaluru', role: 'member', joined: 0, deals: 0, kyc: { status: 'pending', basicStatus: 'checked', legalName: 'Seller Name', panLast4: '234E', bankLast4: '8901', ifsc: 'SBIN0001234' } };

test('seller can reopen masked bank details and submit a validated update', async ({ page }) => {
  await page.route('**/api/session', route => route.fulfill({ json: { user } }));
  await page.route('**/api/listings/mine', route => route.fulfill({ json: { listings: [] } }));
  await page.route('**/api/orders/selling', route => route.fulfill({ json: { orders: [] } }));
  let saved = false;
  await page.route('**/api/kyc', route => {
    expect(route.request().postDataJSON().accountNumber).toBe('012345679012');
    saved = true;
    return route.fulfill({ json: { done: true } });
  });
  await page.goto('/sell/verify');
  await expect(page.getByText('Ending in 8901', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Update details', exact: true }).click();
  await expect(page.getByLabel('Legal name', { exact: true })).toHaveValue('Seller Name');
  await expect(page.getByLabel('PAN', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Bank account number', { exact: true })).toHaveValue('');
  await page.getByLabel('PAN', { exact: true }).fill('ABCPN1234E');
  await page.getByLabel('Bank account number', { exact: true }).fill('012345679012');
  await page.getByLabel('Confirm bank account number', { exact: true }).fill('012345679012');
  await page.getByRole('button', { name: 'Save updated details' }).click();
  await expect(page).toHaveURL(/\/selling$/);
  expect(saved).toBe(true);
});

test('editing preserves hosted photos and sends changed fields and revision', async ({ page }, testInfo) => {
  const response = await page.request.get('/api/listings');
  const original = (await response.json()).listings[0];
  const listing = { ...original, sellerId: user.id, status: 'live', mode: 'order', revision: 3, serial: 'TEST-ONLY', imagePaths: [`${user.id}/aaa.jpg`], images: [original.img] };
  await page.route('**/api/session', route => route.fulfill({ json: { user } }));
  await page.route('**/api/listings/mine', route => route.fulfill({ json: { listings: [] } }));
  await page.route('**/api/orders/selling', route => route.fulfill({ json: { orders: [] } }));
  let saves = 0;
  await page.route(`**/api/listings/${listing.id}`, route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { listing } });
    const body = route.request().postDataJSON();
    expect(body.revision).toBe(3);
    expect(body.title).toBe('Edited hardware');
    expect(body.imagePaths).toEqual([`${user.id}/aaa.jpg`, `${user.id}/bbb.jpg`]);
    saves++;
    return route.fulfill({ json: { listing: { ...listing, ...body, status: 'pending' } } });
  });
  let uploads = 0;
  await page.route('**/api/uploads', route => {
    uploads++;
    return route.fulfill({ status: 201, json: { path: `${user.id}/bbb.jpg` } });
  });
  await page.goto(`/sell/edit/${listing.id}`);
  await expect(page.getByRole('heading', { name: 'Edit listing', exact: true })).toBeVisible();
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue(listing.title);
  await expect(page.getByRole('status').filter({ hasText: '1 of 8' })).toBeVisible();
  await page.getByLabel('Product photos (required)', { exact: true }).setInputFiles('scripts/fixtures/catalog/intel.jpg');
  await page.getByLabel('Title', { exact: true }).fill('Edited hardware');
  for (const image of await page.locator('form img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate(e => (e as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('edit-listing.png'), fullPage: true });
  await page.getByRole('button', { name: 'Save and resubmit for review', exact: true }).click();
  await expect(page).toHaveURL(/\/selling$/);
  expect(saves).toBe(1);
  expect(uploads).toBe(1);
});
