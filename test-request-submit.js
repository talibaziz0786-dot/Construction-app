import { createCdpClient } from './test-cdp-helper.js';

async function run() {
  const cdp = await createCdpClient();
  const page = await cdp.openPage('http://localhost:5173/calculators/masonry.brick-quantity');
  await page.wait(2000);

  const res = await page.eval(`(() => {
    const form = document.querySelector('form');
    let submitted = false;
    form.addEventListener('submit', (e) => {
      console.log('FORM SUBMITTED IN DOM!');
      submitted = true;
    });
    form.requestSubmit();
    return { submitted };
  })()`);

  console.log('Result of requestSubmit:', res);
  await page.wait(500);
  console.log('Page logs:', page.logs);

  await page.close();
  await cdp.close();
}

run().catch(console.error);
