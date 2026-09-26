import { createCdpClient } from './test-cdp-helper.js';

async function run() {
  const cdp = await createCdpClient();
  const page = await cdp.openPage('http://localhost:5173/calculators/masonry.brick-quantity');
  await page.wait(2000);

  // Fill 10 ft x 10 ft x 4 in
  await page.eval(`(() => {
    function setInput(id, val) {
      const el = document.getElementById(id);
      if (!el) return;
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    setInput('field-wallLength-ft', '10');
    setInput('field-wallLength-in', '0');
    setInput('field-wallHeight-ft', '10');
    setInput('field-wallHeight-in', '0');
    setInput('field-wallThickness', '4');

    const advBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Material') || b.innerText.includes('सामग्री'));
    if (advBtn) advBtn.click();
  })()`);

  await page.wait(500);

  await page.eval(`(() => {
    function setInput(id, val) {
      const el = document.getElementById(id);
      if (!el) return;
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    setInput('field-brickLength-ft', '0');
    setInput('field-brickLength-in', '9');
    setInput('field-brickWidth-ft', '0');
    setInput('field-brickWidth-in', '4');
    setInput('field-brickHeight-ft', '0');
    setInput('field-brickHeight-in', '3.5');
    setInput('field-mortarJointThickness', '1');
    setInput('field-wastagePercentage', '5');

    document.querySelector('button[type="submit"]').click();
  })()`);

  await page.wait(500);

  const errors = await page.eval(`(() => {
    return Array.from(document.querySelectorAll('[role="alert"], .text-rose-500')).map(e => e.innerText);
  })()`);
  console.log('VALIDATION ERRORS ON FORM:', errors);

  await page.close();
  await cdp.close();
}

run().catch(console.error);
