import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

async function fresh(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Cases' })).toBeVisible();
}

const row = (page: Page, label: string) => page.getByRole('row').filter({ hasText: label });

test('demo cases load with expected whole-case results and coverage', async ({ page }) => {
  await fresh(page);
  await expect(row(page, 'FICT-BR-001')).toContainText('Within selected constraints');
  await expect(row(page, 'FICT-BR-001')).toContainText('8 of 8 required checks evaluable');
  await expect(row(page, 'FICT-BR-002')).toContainText('Exceeds selected constraints');
  await expect(row(page, 'FICT-HN-001')).toContainText('Insufficient data');
});

test('reference change updates calculations and statuses', async ({ page }) => {
  await fresh(page);
  await page.goto('/#/case/demo-br-001/evidence');
  // Deselect the HGG reference: required checks drop from 8 to 4 (Paradis only)
  await page.getByLabel(/^Use LeCompte/).uncheck();
  await expect(page.getByText('4 of 4 required checks evaluable').first()).toBeVisible();
  // Switch to H&N-002 dashboard: recovery-adjusted basis turns the Paradis cord-PRV check green
  await page.goto('/#/case/demo-hn-002/dashboard');
  const par = page.getByTestId('row-hn2-cordprv::paradis-2019-consult-appendixE2-spinal-cord-1');
  await expect(par).toContainText('Exceeds selected constraints');
  await expect(par).toContainText('51.62');
  await page.getByLabel('Status basis').selectOption('recovery-adjusted');
  await expect(par).toContainText('Within selected constraints');
  await expect(par).toContainText('recovery-adjusted');
});

test('proposed-plan edit recalculates immediately', async ({ page }) => {
  await fresh(page);
  await page.goto('/#/case/demo-br-001/proposed');
  const input = page.getByLabel('Brainstem Dmax proposed');
  await input.fill('49');
  // 52 + 49 = 101 > 100 Gy (HGG physical-sum limit)
  await expect(page.getByTestId('row-br1-bs::hgg-frac-reirt-2025-brainstem-1')).toContainText('Exceeds selected constraints');
  await expect(page.getByTestId('case-summary')).toContainText('Exceeds selected constraints');
});

test('create, edit, persist, duplicate and delete a case', async ({ page }) => {
  await fresh(page);
  await page.getByRole('button', { name: 'New case' }).click();
  await page.getByLabel('Fictional case identifier').fill('FICT-E2E-777');
  await page.getByLabel('Planned start date').fill('2025-01-15');
  await page.getByLabel('Proposed fractions').fill('10');
  await page.getByRole('link', { name: /Previous Courses/ }).click();
  await page.getByLabel('Phase end').fill('2023-01-10');
  await page.getByLabel('Fractions').first().fill('30');
  await expect(page.getByTestId('interval-0')).toContainText('736 days');
  await page.reload();
  await expect(page.getByTestId('interval-0')).toContainText('736 days');
  await page.getByRole('link', { name: 'Cases' }).click();
  await expect(row(page, 'FICT-E2E-777')).toBeVisible();
  await row(page, 'FICT-E2E-777').first().getByRole('button', { name: 'Duplicate' }).click();
  await page.getByRole('link', { name: 'Cases' }).click();
  await expect(row(page, 'FICT-E2E-777 (copy)')).toBeVisible();
  page.once('dialog', (d) => d.accept());
  await row(page, 'FICT-E2E-777 (copy)').getByRole('button', { name: 'Delete' }).click();
  await expect(row(page, 'FICT-E2E-777 (copy)')).toHaveCount(0);
});

test('export, reset and import round-trip', async ({ page }) => {
  await fresh(page);
  await page.goto('/#/case/demo-br-002/setup');
  await page.getByLabel('Fictional case identifier').fill('FICT-BR-002 edited');
  await page.getByRole('link', { name: 'Cases' }).click();
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export all (JSON)' }).click();
  const file = await (await dl).path();
  const json = JSON.parse(readFileSync(file!, 'utf8'));
  expect(json.format).toBe('rert-workbench-cases');
  expect(json.evidenceVersion).toBe('1.0.0');
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Reset to demo' }).click();
  await expect(row(page, 'FICT-BR-002 edited')).toHaveCount(0);
  await page.getByTestId('import-input').setInputFiles(file!);
  await expect(page.getByRole('status')).toContainText('Imported 5 case(s)');
  await expect(row(page, 'FICT-BR-002 edited')).toBeVisible();
  // Invalid file is rejected with a message
  await page.getByTestId('import-input').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"x":1}') });
  await expect(page.getByRole('status')).toContainText('Not a ReRT Workbench export');
});

test('report includes versions, assumptions and discussion questions', async ({ page }) => {
  await fresh(page);
  await page.goto('/#/case/demo-hn-003/report');
  await expect(page.locator('main').getByText(/ReRT Workbench v\d+\.\d+\.\d+ · Evidence dataset v1\.0\.0/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Calculation assumptions' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Questions for discussion' })).toBeVisible();
  await expect(page.getByText(/at most 1 prior course/).first()).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByRole('button', { name: 'Print / Save as PDF' })).toBeHidden();
});

test('Arabic glossary is right-to-left', async ({ page }) => {
  await page.goto('/#/glossary');
  const root = page.locator('[dir="rtl"][lang="ar"]');
  await expect(root).toBeVisible();
  await expect(root).toContainText('الجرعة الفعّالة بيولوجيًا');
  await expect(root).toContainText('تتطلب مراجعة');
});

test('disclaimer banner can be hidden and stays hidden after reload', async ({ page }) => {
  await fresh(page);
  const banner = page.getByRole('note').filter({ hasText: 'Not a medical device' });
  await expect(banner).toBeVisible();
  await page.getByRole('button', { name: 'Hide this notice' }).click();
  await expect(banner).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Cases' })).toBeVisible();
  await expect(banner).toHaveCount(0);
  await expect(page.locator('footer')).toContainText('not validated for clinical use');
});

test('Proposed Plan shows previous doses read-only next to the new-plan inputs', async ({ page }) => {
  await fresh(page);
  await page.goto('/#/case/demo-br-001/proposed');
  await expect(page.getByText('step 3 (OAR Data) holds the previous courses only', { exact: false })).toBeVisible();
  await expect(page.locator('th', { hasText: 'Previous: Course 1' }).first()).toBeVisible();
  await expect(page.locator('td', { hasText: /^52$/ }).first()).toBeVisible();
  await expect(page.getByLabel('Brainstem Dmax proposed')).toHaveValue('18');
  // Calculated headroom hint next to the input (LeCompte 2025: 100 − 52 = 48 Gy physical)
  await expect(page.getByTestId('ceiling-br1-bs-Dmax')).toContainText('48.00 Gy');
});

test('explains when no maximum can be shown because the metric differs from the references', async ({ page }) => {
  await fresh(page);
  await page.goto('/#/case/demo-hn-001/proposed');
  // HN-001 cord PRV was entered as D0.03cc; Nash uses Dmax and Paradis uses D0.1cc
  await expect(page.getByTestId('nomax-hn1-cordprv')).toContainText('set limits on D0.1cc or Dmax');
  await expect(page.getByTestId('nomax-hn1-cordprv')).toContainText('D0.03cc');
  // Typing in a new-plan box keeps focus (cards are not re-mounted)
  const box = page.getByLabel('Spinal cord PRV D0.03cc proposed');
  await box.fill('');
  await box.pressSequentially('15');
  await expect(box).toHaveValue('15');
  await page.goto('/#/case/demo-hn-001/oars');
  await expect(page.getByTestId('needs-hn1-cordprv')).toContainText('D0.1cc, Dmax');
});

test('OAR Data: a metric row can be removed, and reference metrics appear as empty rows', async ({ page }) => {
  await fresh(page);
  await page.goto('/#/case/demo-hn-001/oars');
  // Reference-needed rows are offered even though only D0.03cc was entered
  await expect(page.getByLabel(/^Spinal cord PRV Dmax Course 1/).first()).toBeVisible();
  await expect(page.getByLabel(/^Spinal cord PRV D0.1cc Course 1/).first()).toBeVisible();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Remove D0.03cc row for Spinal cord PRV' }).click();
  await expect(page.getByLabel(/^Spinal cord PRV D0.03cc Course 1/)).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel(/^Spinal cord PRV D0.03cc Course 1/)).toHaveCount(0);
});

test('Evidence step suggests references and can apply them', async ({ page }) => {
  await fresh(page);
  await page.goto('/#/case/demo-hn-002/evidence');
  const panel = page.getByTestId('suggestions');
  await expect(panel.getByTestId('suggest-nash-2025-cord-brainstem-audit')).toContainText('matches case');
  await expect(panel.getByTestId('suggest-ho-2020-npc-sbrt-hyperarc')).toContainText('different population');
  await expect(panel.getByTestId('suggest-ho-2020-npc-sbrt-hyperarc')).toContainText('not suggested');
  await panel.getByRole('button', { name: /Use suggested references/ }).click();
  await expect(panel.getByTestId('suggest-nash-2025-cord-brainstem-audit')).toContainText('✓');
});

test('Evidence step: select all and clear all references', async ({ page }) => {
  await fresh(page);
  await page.goto('/#/case/demo-br-001/evidence');
  await page.getByRole('button', { name: /^Select all/ }).click();
  const boxes = page.getByRole('checkbox', { name: /^Use / });
  const n = await boxes.count();
  for (let i = 0; i < n; i++) await expect(boxes.nth(i)).toBeChecked();
  await page.getByRole('button', { name: 'Clear all' }).click();
  for (let i = 0; i < n; i++) await expect(boxes.nth(i)).not.toBeChecked();
});
