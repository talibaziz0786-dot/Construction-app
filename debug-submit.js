import { createCdpClient } from './test-cdp-helper.js';

async function run() {
  const cdp = await createCdpClient();
  const page = await cdp.openPage('http://localhost:5173/calculators/masonry.brick-quantity');
  await page.wait(2000);

  const debugSubmit = await page.eval(`(() => {
    const form = document.querySelector('form');
    form.addEventListener('submit', (e) => {
      console.log('FORM SUBMIT EVENT FIRED!');
    });
    const btn = document.querySelector('button[type="submit"]');
    console.log('Submit button text:', btn?.innerText);
    btn?.click();
    return 'Clicked submit button';
  })()`);

  console.log('Eval result:', debugSubmit);
  await page.wait(1000);
  console.log('PAGE LOGS:', page.logs);

  await page.close();
  await cdp.close();
}

run().catch(console.error);
