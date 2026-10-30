import { expect, test, type Page } from '@playwright/test';

// Every test gets a fresh browser context. Only synthetic fixtures are entered;
// no production URL, profile, notes, screenshots, traces, or video are used.
async function addNote(page: Page, title: string, text?: string) {
  await page.getByRole('button', { name: 'Tạo mới', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tiêu đề ghi chú' }).fill(title);
  if (text) await page.getByLabel('Nội dung ghi chú').fill(text);
}

async function tool(page: Page, name: string) {
  const button = page.getByRole('button', { name, exact: true });
  if (!await button.isVisible()) await page.getByRole('button', { name: 'Công cụ khác', exact: true }).click();
  await button.click();
}

test('create, autosave, switch, edit, pin and delete notes', async ({ page }) => {
  await page.goto('/');
  await addNote(page, 'Synthetic A', 'First local fixture');
  await expect(page.locator('.save-status')).toHaveText('Đã lưu');
  await addNote(page, 'Synthetic B', 'Second local fixture');
  await page.locator('.note-card').filter({ hasText: 'Synthetic A' }).click();
  await expect(page.getByLabel('Nội dung ghi chú')).toHaveText('First local fixture');
  await page.getByLabel('Nội dung ghi chú').fill('Updated local fixture');
  await page.locator('.note-card').filter({ hasText: 'Synthetic B' }).click();
  await expect(page.getByLabel('Nội dung ghi chú')).toHaveText('Second local fixture');
  await expect(page.locator('.save-status')).toHaveText('Đã lưu');
  await page.reload();
  await expect(page.locator('.note-card')).toHaveCount(2);
  await page.locator('.note-card').filter({ hasText: 'Synthetic A' }).click();
  await expect(page.getByLabel('Nội dung ghi chú')).toHaveText('Updated local fixture');
  await page.getByRole('button', { name: 'Ghim ghi chú', exact: true }).click();
  await page.getByRole('button', { name: 'Ghim', exact: true }).click();
  await expect(page.locator('.note-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Tất cả', exact: true }).click();
  await page.locator('.note-card').filter({ hasText: 'Synthetic B' }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Xóa ghi chú', exact: true }).click();
  await expect(page.locator('.note-card')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.note-card')).toHaveCount(1);
});

test('code preserves whitespace and special characters through paste, copy and reload', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await addNote(page, 'Synthetic code');
  await page.getByLabel('Nội dung ghi chú').locator('p').first().click();
  await tool(page, 'Code Block');
  const sample = 'const sample = "<tag> & \\"quotes\\"";\n\tif (sample) {\n    console.log(sample);\n}\n\n';
  await page.getByLabel('Nội dung ghi chú').evaluate((element, text) => {
    const data = new DataTransfer();
    data.setData('text/plain', text);
    data.setData('text/html', '<b>ignored synthetic HTML</b>');
    element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  }, sample);
  const code = page.locator('.code-block pre code');
  await expect.poll(() => code.textContent()).toBe(sample);
  await page.getByRole('button', { name: 'Sao chép mã', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sao chép mã', exact: true })).toHaveText('Đã sao chép');
  // Windows clipboard uses CRLF; only normalize that platform newline encoding.
  // The editor DOM and persisted JSON are compared verbatim above and below.
  await expect.poll(() => page.evaluate(async () => (await navigator.clipboard.readText()).replace(/\r\n/g, '\n'))).toBe(sample);
  await expect(page.locator('.save-status')).toHaveText('Đã lưu');
  await page.reload();
  await expect.poll(() => page.locator('.code-block pre code').textContent()).toBe(sample);
  await expect(page.locator('.code-block pre code')).toHaveCSS('white-space', 'pre');
});

test('sidebar drag and keyboard bounds, editor width and overflow survive resize', async ({ page }) => {
  await page.goto('/');
  await addNote(page, 'Synthetic layout', 'Layout fixture');
  const handle = page.getByRole('separator', { name: 'Thay đổi chiều rộng sidebar' });
  const box = await handle.boundingBox();
  if (!box) throw new Error('Resize handle missing');
  await page.mouse.move(box.x + box.width / 2, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 300, box.y + 100);
  await page.mouse.up();
  await expect(handle).toHaveAttribute('aria-valuenow', '480');
  await handle.press('Home');
  await expect(handle).toHaveAttribute('aria-valuenow', '260');
  await expect.poll(() => page.locator('.note-content').evaluate(el => el.getBoundingClientRect().width)).toBeLessThanOrEqual(850);
  await page.getByRole('button', { name: 'Mở rộng vùng viết', exact: true }).click();
  await expect.poll(() => page.locator('.note-content').evaluate(el => el.getBoundingClientRect().width)).toBeGreaterThan(850);
  await expect(page.locator('.save-status')).toHaveText('Đã lưu');
  await page.reload();
  await expect(handle).toHaveAttribute('aria-valuenow', '260');
  await expect(page.getByRole('button', { name: 'Giới hạn chiều rộng 850 px', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.setViewportSize({ width: 800, height: 850 });
  await page.getByRole('button', { name: 'Công cụ khác', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Công cụ bổ sung' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Công cụ khác', exact: true })).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.note-card').first().click();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('production PWA shell opens offline and retains a saved note', async ({ page, context }) => {
  await page.goto('/');
  await addNote(page, 'Synthetic offline', 'Offline local fixture');
  await expect(page.locator('.save-status')).toHaveText('Đã lưu');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Tiêu đề ghi chú' })).toHaveValue('Synthetic offline');
  const manifest = await page.evaluate(async () => (await fetch('/manifest.webmanifest')).json());
  expect(manifest.display).toBe('standalone');
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Tiêu đề ghi chú' })).toHaveValue('Synthetic offline');
  await expect(page.getByLabel('Nội dung ghi chú')).toHaveText('Offline local fixture');
});

test('all note colors keep readable defaults in light and dark themes', async ({ page }) => {
  await page.goto('/');
  await addNote(page, 'Synthetic colors', 'Contrast fixture');
  for (const dark of [false, true]) {
    if (dark) await page.getByRole('button', { name: 'Chế độ tối', exact: true }).click();
    for (const name of ['Trắng', 'Vàng nhạt', 'Xanh dương nhạt', 'Xanh lá nhạt', 'Hồng nhạt', 'Tím nhạt']) {
      await page.getByRole('button', { name, exact: true }).click();
      await expect(page.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true');
      const ratios = await page.evaluate(() => {
        const panel = document.querySelector('.note-panel')!;
        const text = document.querySelector('.note-content')!;
        const luminance = (color: string) => {
          const values = color.match(/\d+/g)!.slice(0, 3).map(Number).map(value => {
            const channel = value / 255;
            return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
          });
          return values.reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
        };
        const background = luminance(getComputedStyle(panel).backgroundColor);
        const contrast = (foreground: string) => {
          const value = luminance(foreground);
          return (Math.max(value, background) + .05) / (Math.min(value, background) + .05);
        };
        const style = getComputedStyle(text);
        // Resolve the secondary foreground via a temporary, empty DOM element.
        const secondary = document.createElement('span');
        secondary.style.color = 'var(--muted)';
        panel.append(secondary);
        const muted = getComputedStyle(secondary).color;
        secondary.remove();
        return { body: contrast(style.color), secondary: contrast(muted) };
      });
      expect(ratios.body).toBeGreaterThanOrEqual(7);
      expect(ratios.secondary).toBeGreaterThanOrEqual(4.5);
    }
  }
});

test('sorting supports names and update time, preserves pins and preference', async ({ page }) => {
  await page.goto('/');
  await addNote(page, 'Beta');
  await addNote(page, 'Alpha');
  await addNote(page, 'Gamma');
  await expect(page.locator('.save-status')).toHaveText('Đã lưu');
  const titles = page.locator('.note-card strong');
  const sort = page.getByRole('button', { name: 'Sắp xếp ghi chú', exact: true });
  const chooseSort = async (label: string) => {
    await sort.click();
    await page.getByRole('menuitemradio', { name: label, exact: true }).click();
  };
  await expect(titles).toHaveText(['Gamma', 'Alpha', 'Beta']);
  await chooseSort('Cập nhật: cũ nhất');
  await expect(titles).toHaveText(['Beta', 'Alpha', 'Gamma']);
  await chooseSort('Tên: A → Z');
  await expect(titles).toHaveText(['Alpha', 'Beta', 'Gamma']);
  await chooseSort('Tên: Z → A');
  await expect(titles).toHaveText(['Gamma', 'Beta', 'Alpha']);
  await chooseSort('Tên: A → Z');
  await page.locator('.note-card').filter({ hasText: 'Beta' }).click();
  await page.getByRole('button', { name: 'Ghim ghi chú', exact: true }).click();
  await expect(titles).toHaveText(['Beta', 'Alpha', 'Gamma']);
  await expect(page.locator('.save-status')).toHaveText('Đã lưu');
  await page.reload();
  await sort.click();
  await expect(page.getByRole('menuitemradio', { name: 'Tên: A → Z', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Escape');
  await expect(sort).toBeFocused();
  await expect(page.getByLabel('Nội dung ghi chú')).toBeVisible();
  await expect(titles).toHaveText(['Beta', 'Alpha', 'Gamma']);
  await page.getByRole('button', { name: 'Ghim', exact: true }).click();
  await expect(titles).toHaveText(['Beta']);
});

test('blank sidebar deselects without losing pending edits; sort menu works in both themes', async ({ page }) => {
  await page.goto('/');
  await addNote(page, 'Synthetic deselection', 'Pending local fixture');
  const list = page.locator('.note-list');
  const box = await list.boundingBox();
  if (!box) throw new Error('Note list missing');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height - 12);
  await expect(page.locator('.note-panel')).toBeEmpty();
  await expect(page.locator('.note-card.selected')).toHaveCount(0);
  await page.locator('.note-card').first().click();
  await expect(page.getByLabel('Nội dung ghi chú')).toHaveText('Pending local fixture');
  await expect(page.locator('.save-status')).toHaveText('Đã lưu');
  await page.reload();
  await expect(page.getByLabel('Nội dung ghi chú')).toHaveText('Pending local fixture');
  const trigger = page.getByRole('button', { name: 'Sắp xếp ghi chú', exact: true });
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitemradio', { name: 'Cập nhật: mới nhất', exact: true })).toBeFocused();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(page.getByRole('menuitemradio', { name: 'Tên: Z → A', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Chế độ tối', exact: true }).click();
  await trigger.click();
  await expect(page.getByRole('menu', { name: 'Sắp xếp ghi chú' })).toHaveCSS('background-color', 'rgb(40, 37, 46)');
  await expect(page.getByLabel('Nội dung ghi chú')).toBeVisible();
  await page.getByRole('textbox', { name: 'Tiêu đề ghi chú' }).click();
  await expect(page.getByRole('menu', { name: 'Sắp xếp ghi chú' })).toHaveCount(0);
});

test('Ctrl+S prevents browser save and persists the latest note without stale overwrite', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    document.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        document.documentElement.dataset.savePrevented = String(event.defaultPrevented);
      }
    });
  });
  await addNote(page, 'Synthetic manual save', 'First version');
  await page.getByLabel('Nội dung ghi chú').press('Control+s');
  await expect(page.locator('html')).toHaveAttribute('data-save-prevented', 'true');
  await page.getByLabel('Nội dung ghi chú').fill('Latest version');
  await page.getByLabel('Nội dung ghi chú').press('Control+s');
  await expect(page.locator('.save-status')).toHaveText('Đã lưu');
  await addNote(page, 'Another synthetic note', 'Separate fixture');
  await page.getByRole('textbox', { name: 'Tiêu đề ghi chú' }).press('Control+s');
  await expect(page.locator('.save-status')).toHaveText('Đã lưu');
  await page.reload();
  await page.locator('.note-card').filter({ hasText: 'Synthetic manual save' }).click();
  await expect(page.getByLabel('Nội dung ghi chú')).toHaveText('Latest version');
  await page.locator('.note-card').filter({ hasText: 'Another synthetic note' }).click();
  await expect(page.getByLabel('Nội dung ghi chú')).toHaveText('Separate fixture');
});

test('blank areas outside the editor deselect while the entire editor panel keeps selection', async ({ page }) => {
  await page.goto('/');
  await addNote(page, 'Synthetic blank areas', 'Editable fixture');
  const reopen = async () => { await page.locator('.note-card').first().click(); };
  const blank = page.locator('.note-panel');
  await page.locator('.app-header').click({ position: { x: 650, y: 30 } });
  await expect(blank).toBeEmpty();
  await reopen();
  await page.locator('.editor-footer').click({ position: { x: 300, y: 15 } });
  await expect(page.getByLabel('Nội dung ghi chú')).toBeVisible();
  const content = page.locator('.note-content');
  const rect = await content.boundingBox();
  if (!rect) throw new Error('Editor missing');
  await content.click({ position: { x: 100, y: rect.height - 20 } });
  await expect(page.getByLabel('Nội dung ghi chú')).toBeVisible();
  await page.locator('.note-actions').click({ position: { x: 600, y: 15 } });
  await expect(page.getByLabel('Nội dung ghi chú')).toBeVisible();
  await page.mouse.click(10, 10);
  await expect(blank).toBeEmpty();
  await reopen();
  await page.getByLabel('Nội dung ghi chú').locator('p').first().click();
  await expect(page.getByLabel('Nội dung ghi chú')).toBeVisible();
  await page.getByRole('textbox', { name: 'Tiêu đề ghi chú' }).click();
  await expect(page.getByLabel('Nội dung ghi chú')).toBeVisible();
  await page.getByRole('button', { name: 'Sắp xếp ghi chú', exact: true }).click();
  await expect(page.getByRole('menu', { name: 'Sắp xếp ghi chú' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Nội dung ghi chú')).toBeVisible();
  await expect(page.locator('.save-status')).toHaveText('Đã lưu');
  await page.reload();
  await expect(page.getByLabel('Nội dung ghi chú')).toHaveText('Editable fixture');
});
