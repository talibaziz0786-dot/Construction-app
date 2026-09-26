import { createCdpClient } from './test-cdp-helper.js';

async function run() {
  const cdp = await createCdpClient();
  const page = await cdp.openPage('http://localhost:5173/calculators/masonry.brick-quantity');
  await page.wait(2000);

  // Click Material specification & wastage
  const clickResult = await page.eval(`(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Material') || b.innerText.includes('सामग्री'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  })()`);
  console.log('Clicked Material specification button:', clickResult);
  await page.wait(500);

  const inputs = await page.eval(`(() => {
    return Array.from(document.querySelectorAll('input')).map(i => ({ id: i.id, aria: i.getAttribute('aria-label') }));
  })()`);
  console.log('ALL INPUTS:', JSON.stringify(inputs, null, 2));

  await page.close();
  await cdp.close();
}

run().catch(console.error);
