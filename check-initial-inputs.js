import { createCdpClient } from './test-cdp-helper.js';

async function run() {
  const cdp = await createCdpClient();
  const page = await cdp.openPage('http://localhost:5173/calculators/masonry.brick-quantity');
  await page.wait(2000);

  const initialValues = await page.eval(`(() => {
    return Array.from(document.querySelectorAll('input')).map(i => ({ id: i.id, val: i.value }));
  })()`);
  console.log('INITIAL VALUES:', initialValues);

  await page.close();
  await cdp.close();
}

run().catch(console.error);
