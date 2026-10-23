import { expect, test } from '@playwright/test';

test('home page renders in Portuguese with a single h1', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
	await expect(page.locator('h1')).toHaveCount(1);
});
