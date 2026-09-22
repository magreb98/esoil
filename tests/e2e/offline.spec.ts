/**
 * Test réel hors ligne (§ Étape 4, priorité haute) : sert la version de production
 * (`vite preview`, exactement les fichiers de `dist/` — précache PWA compris), charge en
 * ligne pour laisser le service worker s'installer, puis bascule `context.setOffline(true)`
 * et rejoue tout le parcours : projet → site → profil à deux horizons → évaluation de deux
 * cultures → détail du calcul → export → fermeture/réouverture. Émulation mobile Android
 * (device Pixel 7, voir playwright.config.ts).
 */
import { test, expect, type Page } from '@playwright/test';

async function waitForServiceWorkerControl(page: Page) {
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      // Le SW qui vient de s'installer ne contrôle pas encore cette page : un rechargement est nécessaire.
      throw new Error('not-controlled-yet');
    }
    return reg;
  }).catch(() => undefined);
}

test.describe('eSoil — parcours complet hors ligne (Android, offline réel)', () => {
  test('projet → site → profil → évaluation de 2 cultures → export, entièrement hors ligne', async ({ page, context }) => {
    const failedRequests: string[] = [];
    page.on('requestfailed', (req) => failedRequests.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText}`));
    page.on('pageerror', (err) => console.log('[pageerror]', err.message, err.stack));
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log('[console.error]', msg.text());
    });

    // 1) Chargement EN LIGNE pour laisser le service worker s'installer et précacher.
    // (Le titre "eSoil" existe deux fois dans le DOM — barre latérale desktop masquée en
    // mobile, et en-tête mobile visible — on cible l'en-tête mobile, seul visible ici.)
    await page.goto('/');
    await expect(page.locator('header').getByText('eSoil', { exact: true })).toBeVisible();
    await page.waitForFunction(() => 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null, { timeout: 30_000 }).catch(async () => {
      // Premier enregistrement : le SW ne contrôle la page qu'après un rechargement.
      await page.reload();
      await page.waitForFunction(() => navigator.serviceWorker.controller !== null, { timeout: 30_000 });
    });
    await waitForServiceWorkerControl(page);

    // 2) Bascule hors ligne — tout le reste du test se déroule sans réseau.
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('header').getByText('eSoil', { exact: true })).toBeVisible();

    // 3) Projet
    const projectName = `Test E2E ${Date.now()}`;
    await page.getByPlaceholder('Nouveau projet').fill(projectName);
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await expect(page).toHaveURL(/#\/site/);

    // 4) Site
    const siteName = 'Site E2E';
    await page.getByPlaceholder('Nom du site').fill(siteName);
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await expect(page.locator('select').first()).toContainText(siteName);

    await page.locator('label:has-text("Latitude") ~ input').fill('4.5');
    await page.locator('label:has-text("Longitude") ~ input').fill('9.7');

    // Climat : 12 mois de précipitation et températures minimales pour que l'évaluation soit calculable.
    const pRow = page.locator('tr', { has: page.locator('td', { hasText: 'P (mm)' }) }).locator('input');
    const tMeanRow = page.locator('tr', { has: page.locator('td', { hasText: 'T moy (°C)' }) }).locator('input');
    const tMaxRow = page.locator('tr', { has: page.locator('td', { hasText: 'T max (°C)' }) }).locator('input');
    const tMinRow = page.locator('tr', { has: page.locator('td', { hasText: 'T min (°C)' }) }).locator('input');
    const precip = [40, 60, 120, 180, 220, 260, 180, 150, 220, 260, 150, 51];
    for (let i = 0; i < 12; i++) {
      await pRow.nth(i).fill(String(precip[i]));
      await tMeanRow.nth(i).fill('25');
      await tMaxRow.nth(i).fill('30');
      await tMinRow.nth(i).fill('19');
    }
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();

    // 5) Profil à deux horizons
    await page.getByRole('link', { name: /Profils/ }).click();
    await expect(page).toHaveURL(/#\/profils/);
    await page.getByPlaceholder('Unité de sol').fill('Unité E2E');
    await page.getByRole('button', { name: 'Nouveau profil' }).click();
    await expect(page.locator('select').first()).toContainText('Unité E2E');

    await expect(page.getByText(/^H1 /)).toBeVisible();
    await page.getByRole('button', { name: 'Nouvel horizon' }).click();
    await expect(page.getByText(/^H2 /)).toBeVisible();

    // 6) Évaluation — palmier à huile, puis bananier plantain (les deux ont des critères réels).
    // "Évaluation d'une culture" n'est pas dans la barre du bas (mobile, 4 items + "Plus") :
    // ouvrir le tiroir "Plus" d'abord.
    await page.getByRole('button', { name: 'Plus' }).click();
    await page.getByRole('link', { name: /Évaluation d'une culture/ }).click();
    await expect(page).toHaveURL(/#\/evaluation/);
    await expect(page.getByText('Notation finale')).toBeVisible();

    // Détail du calcul (traçabilité complète)
    await page.getByText('Traçabilité complète').click();
    await expect(page.getByText('Climat', { exact: true }).first()).toBeVisible();

    await page.locator('select').first().selectOption({ label: 'Bananier plantain' });
    await expect(page.getByText('Notation finale')).toBeVisible();

    // 7) Export JSON complet ("rapport" hors ligne)
    await page.getByRole('button', { name: 'Plus' }).click();
    await page.getByRole('link', { name: /^Exports$/ }).click();
    await expect(page).toHaveURL(/#\/exports/);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exporter', exact: true }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.esoil\.json$/);

    // 7b) Rapports Excel / Word / PDF (§5) — chargés par import dynamique : vérifie que ces
    // chunks sont bien précachés par le service worker (sinon échec réseau, puisque hors ligne).
    for (const [buttonName, extension] of [
      ['Excel (.xlsx)', /\.xlsx$/],
      ['Word (.docx)', /\.docx$/],
      ['PDF', /\.pdf$/],
    ] as const) {
      const exportDownload = page.waitForEvent('download');
      await page.getByRole('button', { name: buttonName, exact: true }).click();
      const file = await exportDownload;
      expect(file.suggestedFilename()).toMatch(extension);
    }

    // 8) Fermeture / réouverture : les données persistent (IndexedDB) et restent accessibles hors ligne.
    await page.reload();
    await page.getByRole('link', { name: /Projets/ }).click();
    await expect(page.getByText(projectName)).toBeVisible();

    // 9) Aucune requête réseau n'a échoué pendant toute la phase hors ligne (polices, icônes, config —
    // tout est servi par le service worker depuis le précache).
    expect(failedRequests, `Requêtes réseau échouées hors ligne :\n${failedRequests.join('\n')}`).toEqual([]);
  });
});
