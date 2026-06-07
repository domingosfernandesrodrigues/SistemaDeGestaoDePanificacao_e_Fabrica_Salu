import { test, expect } from '@playwright/test';
import { execSync } from 'child_process';

test.describe('Ponto Eletrônico & Geofencing E2E', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear today's clock-in records for Moises to ensure tests start from a clean state
    try {
      execSync(`sqlcmd -S localhost -d SGPF_Db_Salu -Q "DELETE FROM RegistrosPonto WHERE FuncionarioId = (SELECT TOP 1 f.Id FROM Funcionarios f JOIN Usuarios u ON f.UsuarioId = u.Id WHERE u.Email = 'moises@gmail.com') AND CAST(DataHoraEntrada AS DATE) = CAST(GETDATE() AS DATE)"`);
    } catch (err) {
      console.error('Failed to clear today clock-in records:', err);
    }

    // Perform login before each test
    await page.goto('/');
    await page.click('button:has-text("Entrar")');
    await page.fill('#login-email', 'moises@gmail.com');
    await page.fill('#login-senha', 'Admin123!');
    await page.click('button:has-text("Entrar no Sistema")');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should allow clock-in/out when coordinates are inside geofencing boundary', async ({ page, context }) => {
    // Grant geolocation permissions and set coordinates to precisely the factory location
    await context.setGeolocation({ latitude: -8.776896, longitude: -63.798942, accuracy: 10 });
    await context.grantPermissions(['geolocation']);

    // Navigate to clock-in page AFTER geolocation is set
    await page.click('a:has-text("Controle de Ponto")');
    await expect(page).toHaveURL(/\/rh\/ponto/);

    const registrarEntrada = page.locator('button:has-text("Registrar Entrada")');
    const registrarSaida = page.locator('button:has-text("Registrar Saída")');

    await expect(registrarEntrada).toBeEnabled();
    await expect(registrarSaida).toBeDisabled();

    await registrarEntrada.click();

    // Assert that the buttons transition correctly (Entrada disabled, Saída enabled)
    await expect(registrarSaida).toBeEnabled();
    await expect(registrarEntrada).toBeDisabled();
  });

  test('should block clock-in when device location is outside geofencing area', async ({ page, context }) => {
    // Set coordinates far away from the factory (e.g. São Paulo)
    await context.setGeolocation({ latitude: -23.55052, longitude: -46.633308, accuracy: 10 });
    await context.grantPermissions(['geolocation']);

    // Navigate to clock-in page AFTER geolocation is set
    await page.click('a:has-text("Controle de Ponto")');
    await expect(page).toHaveURL(/\/rh\/ponto/);

    const registrarEntrada = page.locator('button:has-text("Registrar Entrada")');
    await expect(registrarEntrada).toBeVisible();

    // Set up dialog mock to intercept error alert from backend geofencing validation
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('fora do perímetro autorizado');
      await dialog.accept();
    });

    await registrarEntrada.click();
    await page.waitForTimeout(2000);
  });

  test('should block clock-in when geolocation permissions are denied', async ({ page, context }) => {
    // Revoke all browser permissions
    await context.clearPermissions();

    // Navigate to clock-in page AFTER geolocation permissions are denied
    await page.click('a:has-text("Controle de Ponto")');
    await expect(page).toHaveURL(/\/rh\/ponto/);

    const registrarEntrada = page.locator('button:has-text("Registrar Entrada")');
    await expect(registrarEntrada).toBeVisible();

    // Set up dialog mock to intercept permission error warning on frontend
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('permitir o acesso à sua localização');
      await dialog.accept();
    });

    await registrarEntrada.click();
    await page.waitForTimeout(2000);
  });

});

