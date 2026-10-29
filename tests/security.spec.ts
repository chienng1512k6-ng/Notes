import { expect, test } from '@playwright/test';

// Synthetic local fixtures only. Never open a production origin or user profile.
test('a stale window cannot overwrite or delete a newer saved note', async ({ page, context }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tạo mới', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tiêu đề ghi chú' }).fill('Synthetic conflict');
  await page.getByLabel('Nội dung ghi chú').fill('Initial fixture');
  await expect(page.locator('.save-status')).toHaveText('Đã lưu');
  const stale = await context.newPage();
  await stale.goto('/');
  await expect(stale.getByLabel('Nội dung ghi chú')).toHaveText('Initial fixture');
  await page.getByLabel('Nội dung ghi chú').fill('Newer saved fixture');
  await page.getByLabel('Nội dung ghi chú').press('Control+s');
  await expect(page.locator('.save-status')).toHaveText('Đã lưu');
  await stale.getByLabel('Nội dung ghi chú').fill('Unsaved stale fixture');
  await stale.getByLabel('Nội dung ghi chú').press('Control+s');
  await expect(stale.locator('.save-status')).toHaveText('Lỗi lưu');
  await expect(stale.locator('.storage-alert')).toContainText('cửa sổ khác');
  await expect(stale.getByLabel('Nội dung ghi chú')).toHaveText('Unsaved stale fixture');
  stale.once('dialog', dialog => dialog.accept());
  await stale.getByRole('button', { name: 'Xóa ghi chú', exact: true }).click();
  await expect(stale.locator('.storage-alert')).toContainText('chưa xóa dữ liệu');
  await page.reload();
  await expect(page.getByLabel('Nội dung ghi chú')).toHaveText('Newer saved fixture');
});

test('IndexedDB read failure is explicit and prevents creating replacement data', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(indexedDB, 'open', { value: () => { throw new DOMException('Synthetic blocked database', 'SecurityError'); } });
  });
  await page.goto('/');
  await expect(page.locator('.storage-alert')).toContainText('Không đọc được dữ liệu ghi chú');
  await expect(page.getByRole('button', { name: 'Tạo mới', exact: true })).toBeDisabled();
});

test('blocked preferences do not prevent IndexedDB save and reload', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('Synthetic blocked preferences', 'SecurityError'); };
    Storage.prototype.setItem = () => { throw new DOMException('Synthetic blocked preferences', 'SecurityError'); };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Tạo mới', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tiêu đề ghi chú' }).fill('Synthetic preferences');
  await page.getByLabel('Nội dung ghi chú').fill('Database still available');
  await expect(page.locator('.save-status')).toHaveText('Đã lưu');
  await page.reload();
  await expect(page.getByLabel('Nội dung ghi chú')).toHaveText('Database still available');
});

test('legacy plain text, duplicate IDs and Tiptap v2 JSON retain all notes', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('notes', JSON.stringify([
      { id: 'duplicate-fixture', title: 'Synthetic plain', content: 'First line\nSecond line' },
      { id: 'duplicate-fixture', title: 'Synthetic rich', content: { type: 'doc', content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Legacy bold', marks: [{ type: 'bold' }] }] },
        { type: 'codeBlock', attrs: { language: null }, content: [{ type: 'text', text: 'const x = "<tag> &";\n\tline();' }] },
        { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Legacy task' }] }] }] },
      ] } },
    ]));
  });
  await page.goto('/');
  await expect(page.locator('.note-card')).toHaveCount(2);
  await page.locator('.note-card').filter({ hasText: 'Synthetic rich' }).click();
  await expect(page.locator('.note-content strong')).toHaveText('Legacy bold');
  await expect(page.locator('.note-content input[type="checkbox"]')).toBeChecked();
  await expect.poll(() => page.locator('.code-block pre code').textContent()).toBe('const x = "<tag> &";\n\tline();');
  await page.getByRole('textbox', { name: 'Tiêu đề ghi chú' }).fill('Synthetic rich edited');
  await expect(page.locator('.save-status')).toHaveText('Đã lưu');
  await page.reload();
  await expect(page.locator('.note-card')).toHaveCount(2);
  await page.locator('.note-card').filter({ hasText: 'Synthetic plain' }).click();
  await expect(page.locator('.note-content p')).toHaveText(['First line', 'Second line']);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('notes')!).length)).toBe(2);
});

test('service worker preserves unrelated caches and serves restrictive headers', async ({ page, request }) => {
  await page.goto('/manifest.webmanifest');
  await page.evaluate(async () => {
    await caches.open('unrelated-local-fixture');
    await caches.open('mini-notes-shell-obsolete');
  });
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  const keys = await page.evaluate(() => caches.keys());
  expect(keys).toContain('unrelated-local-fixture');
  expect(keys).not.toContain('mini-notes-shell-obsolete');
  const response = await request.get('/');
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  expect(response.headers()['x-frame-options']).toBe('DENY');
  expect(response.headers()['x-powered-by']).toBeUndefined();
  const worker = await request.get('/sw.js');
  expect(worker.headers()['cache-control']).toContain('no-store');
});
