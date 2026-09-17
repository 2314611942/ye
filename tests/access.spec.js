import { test, expect } from '@playwright/test';

const password = page => page.getByLabel('访问密码', { exact: true });
const unlock = async page => {
  await password(page).fill('yanan');
  await password(page).press('Enter');
  await expect(page.locator('.access-gate')).toHaveCount(0);
};

test('密码验证先于展厅挂载，错误密码不能进入，正确密码和会话记忆有效', async ({ page }) => {
  const exhibitionRequests = [];
  page.on('request', request => { if (/\/(data|audio|images\/archive)\//.test(new URL(request.url()).pathname)) exhibitionRequests.push(request.url()); });
  await page.goto('/');
  await expect(password(page)).toBeFocused();
  await expect(page.locator('.exhibit')).toHaveCount(0);
  await expect(page.locator('.epic-entrance')).toHaveCount(0);
  await expect(page.locator('.access-footer .red-star')).toBeVisible();
  await page.locator('.access-footer .red-star').evaluate(image => image.decode());
  await page.getByRole('button', {name:'验证并进入'}).click();
  await expect(page.getByRole('alert')).toHaveText('请输入访问密码。');
  await password(page).fill('Yanan'); await password(page).press('Enter');
  await expect(page.getByRole('alert')).toHaveText('密码不正确，请重试。');
  await expect(password(page)).toBeFocused();
  await expect(page.locator('.exhibit')).toHaveCount(0);
  expect(exhibitionRequests).toEqual([]);
  await unlock(page);
  await expect(page.locator('.cover-enter')).toBeFocused();
  await expect(page.locator('.epic-entrance')).toBeVisible();
  await page.getByRole('button', {name:'静音进入',exact:true}).click();
  await page.reload();
  await expect(page.locator('.exhibit.entered')).toBeVisible();
  await expect(page.locator('.access-gate')).toHaveCount(0);
  const saved=await page.evaluate(()=>({...sessionStorage}));
  expect(Object.values(saved)).not.toContain('yanan');
  await page.evaluate(()=>sessionStorage.removeItem('yeting-access-v1'));
  await page.reload();
  await expect(password(page)).toBeVisible();
  expect(page.url()).not.toContain('yanan');
});

test('分享链接和旧入场记忆不能绕过密码，验证后仍打开原事件，新标签页需要重新验证', async ({page,context}) => {
  await page.addInitScript(()=>sessionStorage.setItem('yeting-entered','yes'));
  await page.goto('/?cover=1&event=prison');
  await expect(password(page)).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await unlock(page);
  await expect(page.locator('#dialog-title')).toContainText('《囚歌》');
  await expect(page).toHaveURL(/event=prison/);
  const another=await context.newPage();
  await another.goto('/?event=rejoin');
  await expect(password(another)).toBeVisible();
  await another.close();
});

test('浏览器禁用会话存储时，正确密码仍可进入，刷新后重新验证', async ({page}) => {
  await page.addInitScript(()=>{
    Storage.prototype.getItem=function(){throw new DOMException('Storage unavailable','SecurityError');};
    Storage.prototype.setItem=function(){throw new DOMException('Storage unavailable','SecurityError');};
  });
  await page.goto('/'); await unlock(page);
  await expect(page.locator('.epic-entrance')).toBeVisible();
  await page.reload(); await expect(password(page)).toBeVisible();
});

for(const width of [320,390]) test(`${width}px密码页无横向溢出，显示隐藏密码与键盘提交正常`, async ({page}) => {
  await page.setViewportSize({width,height:740}); await page.goto('/');
  await expect(password(page)).toHaveAttribute('type','password');
  await password(page).fill('yanan');
  await page.getByRole('button',{name:'显示密码'}).click();
  await expect(password(page)).toHaveAttribute('type','text');
  await page.getByRole('button',{name:'隐藏密码'}).click();
  await expect(password(page)).toHaveAttribute('type','password');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const selector of ['#access-password','.access-submit','.access-visibility']) {
    const bounds=await page.locator(selector).boundingBox(); expect(bounds.height).toBeGreaterThanOrEqual(44);
    await expect(page.locator(selector)).toBeInViewport();
  }
  await password(page).press('Enter');
  await expect(page.locator('.epic-entrance')).toBeVisible();
});
