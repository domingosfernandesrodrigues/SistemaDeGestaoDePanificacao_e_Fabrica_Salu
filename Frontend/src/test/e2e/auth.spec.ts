import { test, expect } from '@playwright/test';

test.describe('Auth Flow', () => {
  test('should login successfully as Admin and navigate to Dashboard, then logout', async ({ page }) => {
    // 1. Visit the home / landing page
    await page.goto('/');
    
    // 2. Click on "Entrar" to open login modal
    await page.click('button:has-text("Entrar")');
    
    // 3. Fill the email and password fields
    await page.fill('#login-email', 'moises@gmail.com');
    await page.fill('#login-senha', 'Admin123!');
    
    // 4. Click the submit button inside modal
    await page.click('button:has-text("Entrar no Sistema")');
    
    // 5. Verify redirect to /dashboard and correct title / greeting
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Verify that user name "Moisés" is rendered in layout/header
    await expect(page.locator('text=Moisés').first()).toBeVisible();

    // 6. Navigate to Users page via link / navigation
    await page.click('a:has-text("Usuários do Sistema")');
    await expect(page).toHaveURL(/\/usuarios/);
    await expect(page.locator('h2:has-text("Controle de Usuários")').first()).toBeVisible();

    // 7. Click logout "Sair" button in Sidebar
    await page.click('a:has-text("Sair")');
    
    // 8. Verify redirect back to Landing Page / Home
    await expect(page).toHaveURL('/');
  });
});
