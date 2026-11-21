import { expect, test } from '@playwright/test';

for (const width of [1905, 1024, 375]) {
  test(`homepage layout and original branding at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);

    const logo = page.getByRole('img', { name: 'TrueDeal', exact: true });
    await expect(logo).toHaveCSS('filter', 'none');
    await expect(logo.locator('..')).toHaveCSS('background-color', 'rgb(247, 247, 244)');
    await expect.poll(() => logo.evaluate(e => (e as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);

    const facts = page.locator('.hero-facts');
    const providers = page.locator('.provider-grid');
    const columns = width < 768 ? 2 : 4;
    for (const grid of [facts, providers]) {
      await expect(grid).toHaveCSS('display', 'grid');
      await expect.poll(() => grid.evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length)).toBe(columns);
      const boxes = await grid.locator(':scope > li').evaluateAll(elements => elements.map(e => {
        const { x, y, width, height } = e.getBoundingClientRect();
        return { x, y, width, height };
      }));
      // The first row must align, with distinct horizontal cells and usable height.
      for (let i = 0; i < columns; i++) {
        expect(boxes[i].y).toBeCloseTo(boxes[0].y, 0);
        expect(boxes[i].height).toBeGreaterThanOrEqual(64);
        if (i > 0) expect(boxes[i].x).toBeGreaterThanOrEqual(boxes[i - 1].x + boxes[i - 1].width - 1);
      }
    }
    await expect(page.locator('.hero-actions')).toHaveCSS('display', 'flex');
    await expect(page.locator('.hero-actions')).toHaveCSS('gap', '12px');
    await expect(page.locator('.hero-actions')).toHaveCSS('margin-top', '34px');
    await expect(providers.locator('li')).toHaveCount(8);
    // Scroll lazy-loaded catalogue photos into view before taking a full-page image.
    for (const image of await page.locator('main img').all()) {
      await image.scrollIntoViewIfNeeded();
      await expect.poll(() => image.evaluate(e => (e as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (width < 1024) {
      const menu = page.getByRole('button', { name: 'Navigation menu' });
      await menu.click();
      await expect(menu).toHaveAttribute('aria-expanded', 'true');
      await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(menu).toBeFocused();
      await expect(menu).toHaveAttribute('aria-expanded', 'false');
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath(`home-${width}.png`), fullPage: true });
  });

  test(`sell layout and payout control at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/sell');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole('img', { name: 'TrueDeal', exact: true })).toHaveCSS('filter', 'none');
    const price = page.getByRole('spinbutton', { name: 'Sale price' });
    await price.fill('');
    await expect(price).toHaveValue('');
    await price.pressSequentially('15000');
    await expect(price).toHaveValue('15000');
    await expect(page.locator('dl').getByText('₹14,250', { exact: true })).toBeVisible();
    await page.getByRole('heading', { level: 1 }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`sell-${width}.png`), fullPage: true });
  });
}
