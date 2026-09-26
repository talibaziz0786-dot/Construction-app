import { createCdpClient } from './test-cdp-helper.js';

async function run() {
  const cdp = await createCdpClient();
  const page = await cdp.openPage('http://localhost:5173/');
  await page.wait(2000);

  // 1. Theme check
  const themeInit = await page.eval(`(() => {
    const htmlCls = document.documentElement.className;
    const btn = document.querySelector('button[title*="dark"], button[title*="light"], button[aria-label*="dark"], button[aria-label*="light"]');
    const hasMoon = Boolean(btn?.querySelector('.lucide-moon'));
    const hasSun = Boolean(btn?.querySelector('.lucide-sun'));
    return { htmlCls, label: btn?.getAttribute('aria-label') || btn?.getAttribute('title'), hasMoon, hasSun };
  })()`);
  console.log('1. INITIAL THEME:', themeInit);

  // Toggle to Dark
  await page.eval(`document.querySelector('button[title*="dark"], button[title*="light"], button[aria-label*="dark"], button[aria-label*="light"]').click()`);
  await page.wait(400);

  const themeDark = await page.eval(`(() => {
    const htmlCls = document.documentElement.className;
    const btn = document.querySelector('button[title*="dark"], button[title*="light"], button[aria-label*="dark"], button[aria-label*="light"]');
    const hasMoon = Boolean(btn?.querySelector('.lucide-moon'));
    const hasSun = Boolean(btn?.querySelector('.lucide-sun'));
    return { htmlCls, label: btn?.getAttribute('aria-label') || btn?.getAttribute('title'), hasMoon, hasSun };
  })()`);
  console.log('2. TOGGLED (DARK) THEME:', themeDark);

  // Toggle back to Light
  await page.eval(`document.querySelector('button[title*="dark"], button[title*="light"], button[aria-label*="dark"], button[aria-label*="light"]').click()`);
  await page.wait(400);

  const themeLightAgain = await page.eval(`(() => {
    const htmlCls = document.documentElement.className;
    const btn = document.querySelector('button[title*="dark"], button[title*="light"], button[aria-label*="dark"], button[aria-label*="light"]');
    const hasMoon = Boolean(btn?.querySelector('.lucide-moon'));
    const hasSun = Boolean(btn?.querySelector('.lucide-sun'));
    return { htmlCls, label: btn?.getAttribute('aria-label') || btn?.getAttribute('title'), hasMoon, hasSun };
  })()`);
  console.log('3. RESTORED (LIGHT) THEME:', themeLightAgain);

  // 2. Language check (English -> Hindi -> English)
  const navEn = await page.eval(`Array.from(document.querySelectorAll('nav a')).map(a => a.innerText)`);
  console.log('4. EN NAV LINKS:', navEn);

  await page.eval(`(() => {
    const select = document.querySelector('select[aria-label*="Language"], select[aria-label*="भाषा"]');
    if (select) {
      select.value = 'hi';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  })()`);
  await page.wait(400);

  const navHi = await page.eval(`Array.from(document.querySelectorAll('nav a')).map(a => a.innerText)`);
  console.log('5. HI NAV LINKS:', navHi);

  // Switch back
  await page.eval(`(() => {
    const select = document.querySelector('select[aria-label*="Language"], select[aria-label*="भाषा"]');
    if (select) {
      select.value = 'en';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  })()`);
  await page.wait(400);

  console.log('Errors:', page.errors);
  await page.close();
  await cdp.close();
}

run().catch(console.error);
