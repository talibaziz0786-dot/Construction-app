import { createCdpClient } from './test-cdp-helper.js';

async function run() {
  const cdp = await createCdpClient();
  const page = await cdp.openPage('http://localhost:5173/calculators/masonry.brick-quantity');
  await page.wait(2000);

  const info = await page.eval(`(() => {
    return Array.from(document.querySelectorAll('input, button')).map(el => ({
      tag: el.tagName,
      id: el.id,
      type: el.type,
      name: el.name,
      text: el.innerText,
      aria: el.getAttribute('aria-label')
    }));
  })()`);
  console.log('INPUTS/BUTTONS:', JSON.stringify(info, null, 2));

  await page.close();
  await cdp.close();
}

run().catch(console.error);
