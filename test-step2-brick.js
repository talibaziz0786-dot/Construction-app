import { createCdpClient } from './test-cdp-helper.js';

async function run() {
  const cdp = await createCdpClient();
  const page = await cdp.openPage('http://localhost:5173/calculators/masonry.brick-quantity');
  await page.wait(2000);

  console.log('--- Step 6: Testing Brick Calculator Form & Calculation ---');

  const fillResult = await page.eval(`(() => {
    function setInput(id, val) {
      const el = document.getElementById(id);
      if (!el) return false;
      // Use the native value setter so React's value tracker sees a real change.
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }

    // Wall dimensions: 10 ft length, 10 ft height, 4 in thickness
    setInput('field-wallLength-ft', '10');
    setInput('field-wallLength-in', '0');
    setInput('field-wallHeight-ft', '10');
    setInput('field-wallHeight-in', '0');
    setInput('field-wallThickness', '4');

    // Open advanced fields for brick dimensions
    const advBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Material') || b.innerText.includes('सामग्री'));
    if (advBtn) advBtn.click();

    return true;
  })()`);

  await page.wait(500);

  // Brick: Length 9 in (0 ft 9 in), Width 4 in (0 ft 4 in), Height 3.5 in (0 ft 3.5 in), Mortar joint 1 in, Wastage 5%
  const advFillResult = await page.eval(`(() => {
    function setInput(id, val) {
      const el = document.getElementById(id);
      if (!el) return false;
      // Use the native value setter so React's value tracker sees a real change.
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }

    const bL_ft = setInput('field-brickLength-ft', '0');
    const bL_in = setInput('field-brickLength-in', '9');
    const bW_ft = setInput('field-brickWidth-ft', '0');
    const bW_in = setInput('field-brickWidth-in', '4');
    const bH_ft = setInput('field-brickHeight-ft', '0');
    const bH_in = setInput('field-brickHeight-in', '3.5');
    const mj = setInput('field-mortarJointThickness', '1');
    const wst = setInput('field-wastagePercentage', '5');

    return { bL_in, bW_in, bH_in, mj, wst };
  })()`);
  console.log('Filled brick dimensions:', advFillResult);
  await page.wait(400);

  // Submit calculation
  await page.eval(`(() => {
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.click();
  })()`);

  await page.wait(2000);

  // Read calculation result view
  const calcOutput = await page.eval(`(() => {
    const primary = document.querySelector('.text-3xl, .text-4xl, [class*="font-bold text-"]')?.innerText;
    const allText = document.body.innerText;
    const rows = Array.from(document.querySelectorAll('table tr, [class*="grid-cols"]')).map(el => el.innerText.replace(/\\s+/g, ' '));
    const warnings = Array.from(document.querySelectorAll('[role="alert"]')).map(w => w.innerText);
    return { primary, rows: rows.slice(0, 25), warnings, fullText: allText };
  })()`);

  console.log('\n--- BRICK RESULT DETAILS ---');
  console.log('PRIMARY DISPLAY:', calcOutput.primary);
  console.log('MATCHED ROWS:');
  calcOutput.rows.filter(r => r.includes('brick') || r.includes('Bricks') || r.includes('Wastage') || r.includes('volume') || r.includes('area') || r.includes('Mortar')).forEach(r => console.log('  *', r));
  console.log('WARNINGS on 4" wall (expect NONE):', calcOutput.warnings);
  const warningPhrase = calcOutput.fullText.includes('differs from brick width') || calcOutput.fullText.includes('wythe');
  console.log('Thickness-alignment warning in result text (expect false):', warningPhrase);

  // Check whether 336 or 337 bricks is displayed
  const shows336or337 = calcOutput.fullText.includes('336') || calcOutput.fullText.includes('337');
  console.log('Shows expected quantity (~336-337 bricks):', shows336or337);

  // Step 7: Change wall thickness to 9" (does not align with 4" brick width)
  console.log('\n--- Step 7: Testing Brick Warning (9" wall with 4" brick width) ---');
  await page.eval(`(() => {
    const tInput = document.getElementById('field-wallThickness');
    if (tInput) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(tInput, '9');
      tInput.dispatchEvent(new Event('input', { bubbles: true }));
      tInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.click();
  })()`);

  await page.wait(1500);

  const warningCheck = await page.eval(`(() => {
    const text = document.body.innerText;
    const hasAlignmentWarning = text.includes('differs from brick width') || text.includes('wythe') || text.includes('Wall thickness');
    return { hasAlignmentWarning, snippet: text.slice(text.indexOf('Wall thickness'), text.indexOf('Wall thickness') + 200) };
  })()`);

  console.log('THICKNESS ALIGNMENT WARNING PRESENT:', warningCheck.hasAlignmentWarning);
  console.log('WARNING TEXT:', warningCheck.snippet);

  console.log('Errors logged:', page.errors);
  await page.close();
  await cdp.close();
}

run().catch(console.error);
