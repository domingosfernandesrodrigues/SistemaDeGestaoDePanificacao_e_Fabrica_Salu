import { test, expect } from '@playwright/test';

test.describe('Ordens de Produção Flow E2E', () => {

  test.beforeEach(async ({ page }) => {
    // Perform login
    await page.goto('/');
    await page.click('button:has-text("Entrar")');
    await page.fill('#login-email', 'moises@gmail.com');
    await page.fill('#login-senha', 'Admin123!');
    await page.click('button:has-text("Entrar no Sistema")');
    await expect(page).toHaveURL(/\/dashboard/);

    // Navigate to OPs page
    await page.click('a:has-text("Ordens de Produção")');
    await expect(page).toHaveURL(/\/ordens-producao/);
  });

  test('should create, start, and finish a production order successfully', async ({ page }) => {
    // 1. Open the modal for a new production order
    await page.click('button:has-text("Nova Ordem")');
    await expect(page.locator('h3:has-text("Abrir Ordem de Produção")')).toBeVisible();

    // 2. Select product "Biscoito de polvilho 500g"
    await page.click('button:has-text("Pesquise o produto...")');
    await page.fill('input[placeholder="Pesquisar..."]', 'Biscoito de polvilho 500g');
    
    // Click on the option matching the search
    const option = page.locator('button:has-text("Biscoito de polvilho 500g")');
    await option.first().click();

    // 3. Fill quantity
    await page.fill('input[name="quantidadePlanejada"]', '15');

    // 4. Submit form to create OP
    await page.click('button:has-text("Abrir OP")');

    // Wait for modal to close
    await expect(page.locator('h3:has-text("Abrir Ordem de Produção")')).not.toBeVisible();

    // 5. Find the newly created OP card (should be marked as "Planejada")
    const card = page.locator('div.bg-white').filter({ hasText: 'Biscoito de polvilho 500g' }).filter({ hasText: 'Meta: 15 Und' }).first();
    await expect(card.locator('text=Planejada')).toBeVisible();

    // 6. Start production
    const startBtn = card.locator('button:has-text("Iniciar Produção")');
    await startBtn.click();

    // 7. Verify status has transitioned to "Em Execução"
    await expect(card.locator('text=Em Execução')).toBeVisible();

    // 8. Finish production
    const finishBtn = card.locator('button:has-text("Apontar Finalização")');
    await finishBtn.click();

    // 9. Verify the card was removed from the active list (the "Apontar Finalização" button disappears)
    // Using extended timeout to allow React Query to re-fetch and re-render the list without the finished OP
    await expect(finishBtn).not.toBeVisible({ timeout: 15000 });
  });

});
