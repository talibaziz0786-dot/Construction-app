import { createCdpClient } from './test-cdp-helper.js';

async function run() {
  const cdp = await createCdpClient();

  console.log('--- STEP 3: Guest / auth / network smoke ---');

  // --- Home page as guest: full load captured from about:blank ---
  const home = await cdp.openPage('about:blank');
  await home.eval(`window.location.href = 'http://localhost:5173/';`);
  await home.wait(3000);

  const guestLoad = home.network.filter(n => n.url.includes('/api/auth/me'));
  console.log('auth/me requests during guest home load (expect 0):', guestLoad.length, JSON.stringify(guestLoad));

  const guestUi = await home.eval(`(() => {
    const text = document.body.innerText;
    return {
      showsStartFree: text.includes('Start Free'),
      hasLoginLink: Boolean(document.querySelector('a[href="/login"], a[href="/signup"]')),
    };
  })()`);
  console.log('Guest UI signals:', JSON.stringify(guestUi));
  console.log('Home console errors:', home.errors);

  // Direct probe: server must remain the authority and answer 401 for guests.
  const probe = await home.eval(`(async () => {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    let body = null;
    try { body = await res.json(); } catch { body = null; }
    return { status: res.status, body };
  })()`);
  console.log('Direct /api/auth/me probe as guest (expect 401):', JSON.stringify(probe));
  await home.close();

  // --- Calculator page: load, fill, submit, network status ---
  const calc = await cdp.openPage('about:blank');
  await calc.eval(`window.location.href = 'http://localhost:5173/calculators/masonry.brick-quantity';`);
  await calc.wait(3000);

  await calc.eval(`(() => {
    function setInput(id, val) {
      const el = document.getElementById(id);
      if (!el) return false;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    setInput('field-wallLength-ft', '10');
    setInput('field-wallLength-in', '0');
    setInput('field-wallHeight-ft', '10');
    setInput('field-wallHeight-in', '0');
    setInput('field-wallThickness', '4');
    const advBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Material') || b.innerText.includes('सामग्री'));
    if (advBtn) advBtn.click();
  })()`);
  await calc.wait(400);

  await calc.eval(`(() => {
    function setInput(id, val) {
      const el = document.getElementById(id);
      if (!el) return false;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
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
  await calc.wait(2500);

  const calcRequests = calc.network.filter(n => n.url.includes('/api/'));
  const calcFailures = calc.network.filter(n => n.status >= 400);
  const calculateCall = calcRequests.find(n => n.url.includes('/calculate'));
  console.log('Calc page API requests:', JSON.stringify(calcRequests, null, 2));
  console.log('Calculate POST status:', calculateCall ? calculateCall.status : 'NOT OBSERVED');
  console.log('HTTP >=400 during calc flow (expect none):', JSON.stringify(calcFailures));
  console.log('Calc page console errors (expect []):', calc.errors);

  const resultOk = await calc.eval(`(() => {
    const text = document.body.innerText;
    return { hasResult: text.includes('ESTIMATED REQUIREMENT'), has336or337: text.includes('336') || text.includes('337') };
  })()`);
  console.log('Calc result visible:', JSON.stringify(resultOk));

  await calc.close();
  await cdp.close();
}

run().catch(console.error);
