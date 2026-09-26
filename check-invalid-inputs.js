import { createCdpClient } from './test-cdp-helper.js';

async function run() {
  const cdp = await createCdpClient();
  const page = await cdp.openPage('http://localhost:5173/calculators/masonry.brick-quantity');
  await page.wait(2000);

  const invalids = await page.eval(`(() => {
    const form = document.querySelector('form');
    const elements = Array.from(form.elements);
    return elements.map(el => ({
      id: el.id,
      tag: el.tagName,
      type: el.type,
      valid: el.checkValidity ? el.checkValidity() : true,
      valMessage: el.validationMessage,
      min: el.min,
      max: el.max,
      step: el.step,
      value: el.value
    }));
  })()`);

  console.log('FORM ELEMENTS VALIDITY:');
  invalids.forEach(el => {
    if (!el.valid || el.valMessage) {
      console.log('INVALID:', el);
    } else {
      console.log('VALID:', el.id || el.type, 'value=', el.value, 'min=', el.min, 'max=', el.max);
    }
  });

  await page.close();
  await cdp.close();
}

run().catch(console.error);
