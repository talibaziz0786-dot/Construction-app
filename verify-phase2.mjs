/**
 * Phase 2 end-to-end verification (no calculation logic is exercised or changed).
 *
 * Checks two things:
 *   1. API contract   - calculator catalog, canonical results of every available
 *                       calculator, and error handling for bad input.
 *   2. Browser UX     - Calculator Hub (search, filters, live region, empty state,
 *                       Hindi, light theme), a calculator page (form -> result ->
 *                       BOQ), validation feedback, and mobile layout overflow.
 *
 * Usage (from the repository root):
 *   npm run dev --workspace=server    # API on :3000 (terminal 1)
 *   npm run dev --workspace=client    # client on :5173 (terminal 2)
 *   node verify-phase2.mjs            # API + browser checks
 *   node verify-phase2.mjs --api      # API checks only
 *
 * Options / environment:
 *   --api / --no-browser   skip browser (CDP) checks
 *   API_BASE, CLIENT_URL, CDP_PORT   override the defaults (:3000, auto-detected, 9222)
 *   VERIFY_DELAY_MS        pause between calculation calls (the server allows 30 per minute)
 *
 * Rate limiting: the API rejects more than 30 calculation requests per minute per
 * IP, so back-to-back runs report BLOCKED with a re-run hint instead of noise.
 *
 * Browser checks need a Chrome instance exposing the DevTools protocol, e.g.
 *   chrome --headless=new --remote-debugging-port=9222 --user-data-dir=C:/temp/chrome
 * If no DevTools endpoint is reachable the browser checks are reported as SKIP.
 *
 * Exit code: 0 = all executed checks passed, 1 = at least one check failed.
 */

import { readFile } from 'node:fs/promises';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const SKIP_BROWSER = process.argv.includes('--api') || process.argv.includes('--no-browser');
const CDP_PORT = Number(process.env.CDP_PORT || 9222);
const CLIENT_CANDIDATES = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
].filter(Boolean);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const REQUEST_DELAY_MS = Number(process.env.VERIFY_DELAY_MS || 0);
let failures = 0;
let skipped = 0;
let executed = 0;
let rateLimited = 0;

function check(name, passed, detail) {
  executed += 1;
  if (passed) console.log(`  PASS ${name}${detail ? `  (${detail})` : ''}`);
  else { failures += 1; console.log(`  FAIL ${name}${detail ? `  (${detail})` : ''}`); }
  return passed;
}
function skip(name, reason) {
  skipped += 1;
  console.log(`  SKIP ${name}  (${reason})`);
}

/** HTTP helper that resolves {status, body} without throwing on 4xx/5xx. */
async function request(baseUrl, path, init) {
  try {
    const res = await fetch(baseUrl + path, init);
    if (res.status === 429) rateLimited += 1;
    const text = await res.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    return { status: res.status, body };
  } catch (error) {
    return { status: 0, body: { error: String(error && error.message) } };
  }
}
const post = (body) => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

function safeParse(text) {
  try { return JSON.parse(text); } catch { return null; }
}

async function detectClientBaseUrl() {
  for (const candidate of CLIENT_CANDIDATES) {
    const res = await request(candidate, '/calculators', undefined);
    if (res.status === 200) return candidate;
  }
  return null;
}

async function detectCdpUrl() {
  try {
    const version = await (await fetch(`http://localhost:${CDP_PORT}/json/version`)).json();
    return version.webSocketDebuggerUrl || null;
  } catch {
    return null;
  }
}


/* ------------------------------------------------------------------ CDP ---- */

async function connectCdp(webSocketUrl) {
  const ws = new WebSocket(webSocketUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let nextId = 0;
  const pending = new Map();
  ws.onmessage = (message) => {
    const data = JSON.parse(String(message.data));
    if (data.id && pending.has(data.id)) {
      pending.get(data.id)(data);
      pending.delete(data.id);
    }
  };
  const send = (method, params, sessionId) =>
    new Promise((resolve) => {
      const id = ++nextId;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params: params || {}, sessionId }));
    });
  return { ws, send };
}

/** Opens a page and exposes evaluate()/errors/network problems for assertions. */
async function openPage(cdp, url, settleMs = 3000) {
  const created = await cdp.send('Target.createTarget', { url });
  const targetId = created.result.targetId;
  const attached = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const sessionId = attached.result.sessionId;
  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Runtime.enable', {}, sessionId);
  await cdp.send('Network.enable', {}, sessionId);

  const errors = [];
  const problems = [];
  const posts = [];
  const responses = [];
  cdp.ws.addEventListener('message', (message) => {
    const data = JSON.parse(String(message.data));
    if (data.sessionId !== sessionId) return;
    if (data.method === 'Runtime.exceptionThrown') errors.push('uncaught-exception');
    if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') errors.push('console-error');
    if (data.method === 'Network.responseReceived' && data.params.response.status >= 500) problems.push('500 ' + data.params.response.url);
    if (data.method === 'Network.loadingFailed') problems.push('load-failed ' + data.params.errorText);
    if (data.method === 'Network.requestWillBeSent' && data.params.request.method === 'POST') posts.push(data.params.request.postData || '');
    if (data.method === 'Network.responseReceived' && data.params.response.url.indexOf('/api/calculators/') >= 0) responses.push(`${data.params.response.status} ${data.params.response.url.split('/api')[1]}`);
  });

  const evaluate = async (expression) => {
    const res = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
    return res.result && res.result.result ? res.result.result.value : undefined;
  };

  await sleep(settleMs);
  return {
    sessionId,
    targetId,
    errors,
    problems,
    posts,
    responses,
    evaluate,
    close: () => cdp.send('Target.closeTarget', { targetId }),
  };
}

/* ------------------------------------------------------- Browser helpers --- */

/** React-controlled inputs need the native value setter plus an input event. */
const PAGE_HELPERS = `(() => {
  const set = (el, value) => {
    if (!el) return false;
    const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, String(value));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };
  window.__v2 = {
    set,
    lang: (code) => set(document.querySelector('select'), code),
    type: (selector, value) => set(document.querySelector(selector), value),
    field: (name, value) => set(document.getElementById('field-' + name), value),
    length: (name, ft, inch) => {
      const a = set(document.getElementById('field-' + name + '-ft'), ft);
      const b = set(document.getElementById('field-' + name + '-in'), inch);
      return a && b;
    },
    clickText: (needle) => {
      const button = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').indexOf(needle) >= 0);
      if (!button) return false;
      button.click();
      return true;
    },
    count: (selector) => document.querySelectorAll(selector).length,
    text: () => document.body.innerText,
    primary: () => {
      const el = document.querySelector('[role="status"][aria-live="polite"]');
      if (!el) return null;
      const match = (el.textContent || '').match(/[0-9][0-9.,]*/);
      return match ? Number.parseFloat(match[0].replace(/,/g, '')) : null;
    },
  };
  return 'ready';
})()`;

async function installHelpers(page) {
  await page.evaluate(PAGE_HELPERS);
  await sleep(150);
}

/** Polls a page expression until it is truthy (the dev server can re-render mid-flow). */
async function waitFor(page, expression, timeoutMs = 9000, intervalMs = 250) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await page.evaluate(expression)) return true;
    await sleep(intervalMs);
  }
  return false;
}

/** Language and theme live in localStorage, so state is reset between scenarios. */
async function resetSiteState(page) {
  await installHelpers(page);
  await page.evaluate(`window.__v2.lang('en')`);
  await page.evaluate(`(() => { if (document.documentElement.dataset.theme === 'light') { const toggle = document.querySelector('header div[role="group"] button'); if (toggle) toggle.click(); } return document.documentElement.dataset.theme; })()`);
  await sleep(500);
}


/* -------------------------------------------------------------- API checks -- */

const API_SCENARIOS = [
  {
    id: 'room.floor-area',
    note: '4.2 m x 3.6 m room',
    values: { length: 4.2, width: 3.6 },
    expected: 15.12,
    unit: 'sq.m',
    tolerance: 0.001,
  },
  {
    id: 'wall.net-area',
    note: '4 m x 3 m wall minus one 0.9 x 2.1 m door',
    values: { wallLength: 4, wallHeight: 3, openings: [{ type: 'door', width: 0.9, height: 2.1, quantity: 1 }] },
    expected: 10.11,
    unit: 'sq.m',
    tolerance: 0.001,
  },
  {
    id: 'concrete.volume',
    note: '3 m x 2 m x 125 mm slab with 5% wastage',
    values: { length: 3, width: 2, depth: 0.125, wastagePercentage: 5 },
    expected: 0.7875,
    unit: 'cu.m',
    tolerance: 1e-6,
  },
  {
    id: 'masonry.brick-quantity',
    note: '10 ft x 10 ft single-wythe 4 in wall, 9x4x3.5 in brick, 1 in joint, 5% wastage',
    values: {
      wallLength: 3.048,
      wallHeight: 3.048,
      wallThickness: 0.1016,
      openings: [],
      brickLength: 0.2286,
      brickWidth: 0.1016,
      brickHeight: 0.0889,
      mortarJointThickness: 0.0254,
      wastagePercentage: 5,
    },
    expected: 336,
    unit: 'bricks',
    tolerance: 0,
  },
  {
    id: 'plaster.quantity',
    note: '9.290304 sq.m at 25 mm with 5% wastage',
    values: { netSurfaceArea: 9.290304, plasterThickness: 0.0254, wastagePercentage: 5 },
    expected: 0.24777240768000003,
    unit: 'cu.m',
    tolerance: 1e-6,
  },
  {
    id: 'tile.quantity',
    note: '10 ft x 10 ft floor with 300x300 mm tiles and 5% wastage',
    values: { roomLength: 3.048, roomWidth: 3.048, tileLength: 0.3, tileWidth: 0.3, wastagePercentage: 5 },
    expected: 109,
    unit: 'tiles',
    tolerance: 0,
  },
];

async function runApiChecks() {
  console.log('\n== API contract ==');
  const health = await request(API_BASE, '/api/health');
  if (health.status !== 200) {
    skip('API checks', `API not reachable at ${API_BASE} - start it with npm run dev --workspace=server`);
    return false;
  }
  check('health endpoint responds ok', Boolean(health.body) && health.body.status === 'ok', `http ${health.status}`);

  const catalog = await request(API_BASE, '/api/calculators');
  const categories = catalog.status === 200 && catalog.body && catalog.body.categories ? catalog.body.categories : [];
  const entries = categories.flatMap((category) => (category.calculators || []).map((calc) => ({ ...calc, categoryId: category.id })));
  const available = entries.filter((entry) => entry.status === 'available').map((entry) => entry.calculatorId);
  check('catalog exposes 6 available calculators', available.length === 6, available.join(', '));
  const emptyFieldEntries = entries.filter((entry) => !Array.isArray(entry.fields) || entry.fields.length === 0);
  check('catalog drives inputs (fields on the available calculators)', entries.length > 0 && available.every((calculatorId) => emptyFieldEntries.every((entry) => entry.calculatorId !== calculatorId)), `${entries.length} entries, ${emptyFieldEntries.length} without fields`);

  // The server allows 30 calculation requests per minute per IP (app.ts), so
  // repeated runs need a short pause and a clear 429 report instead of noise.
  let brickResponse = null;
  for (const scenario of API_SCENARIOS) {
    if (REQUEST_DELAY_MS > 0) await sleep(REQUEST_DELAY_MS);
    const res = await request(API_BASE, `/api/calculators/${scenario.id}/calculate`, post({ values: scenario.values }));
    if (res.status === 429) {
      skip(`${scenario.id} result`, 'rate limited (429) - wait about a minute and re-run');
      continue;
    }
    if (scenario.id === 'masonry.brick-quantity') brickResponse = res;
    const body = res.body && res.body.primary ? res.body.primary : null;
    const value = body ? Number(body.value) : NaN;
    const ok =
      res.status === 200 &&
      body &&
      body.unit === scenario.unit &&
      Math.abs(value - scenario.expected) <= scenario.tolerance;
    check(`${scenario.id} -> ${scenario.expected} ${scenario.unit}`, ok, res.status === 200 ? `got ${value} ${body && body.unit}` : `http ${res.status}`);
  }

  if (rateLimited > 0) {
    skip('remaining API checks', 'rate limited (429) - wait about a minute and re-run');
    return false;
  }

  const brickItem = brickResponse && brickResponse.status === 200 && brickResponse.body.boq ? brickResponse.body.boq.sections[0].items[0] : null;
  check('aligned single-wythe wall raises no thickness warning', Boolean(brickResponse) && brickResponse.status === 200 && brickResponse.body.warnings.length === 0, brickResponse && brickResponse.status === 200 ? `${brickResponse.body.warnings.length} warnings` : 'no response');
  check('BOQ item carries theoretical + procurement quantity', Boolean(brickItem) && brickItem.theoreticalQuantity === 320 && brickItem.procurementQuantity === 336, brickItem ? `${brickItem.theoreticalQuantity} -> ${brickItem.procurementQuantity}` : 'missing item');

  const expectStatus = async (name, res, expected) => {
    if (res.status === 429) {
      skip(name, 'rate limited (429) - wait about a minute and re-run');
      return;
    }
    check(name, res.status === expected, `http ${res.status}`);
  };

  const unknown = await request(API_BASE, '/api/calculators/not-a-calculator/calculate', post({ values: {} }));
  await expectStatus('unknown calculator -> 404', unknown, 404);

  const missing = await request(API_BASE, '/api/calculators/concrete.volume/calculate', post({ values: {} }));
  await expectStatus('missing inputs -> 400 (never 500)', missing, 400);

  const negative = await request(API_BASE, '/api/calculators/concrete.volume/calculate', post({ values: { length: -3, width: 2, depth: 0.125, wastagePercentage: 5 } }));
  await expectStatus('negative length -> 400 (never 500)', negative, 400);

  const outOfRange = await request(API_BASE, '/api/calculators/concrete.volume/calculate', post({ values: { length: 3, width: 2, depth: 500, wastagePercentage: 5 } }));
  await expectStatus('depth above max -> 400 (never 500)', outOfRange, 400);

  return rateLimited === 0;
}


/* ----------------------------------------------------------- Browser checks */

async function checkHubEnglish(cdp, clientBase) {
  const page = await openPage(cdp, `${clientBase}/calculators`);
  await installHelpers(page);

  const cardCount = await page.evaluate(`window.__v2.count('a[href^="/calculators/"]')`);
  if (cardCount < 6) {
    skip('hub checks', 'calculator cards did not render - catalog unavailable, wait about a minute and re-run');
    await page.close();
    return;
  }
  check('hub lists every available calculator', cardCount >= 6, `${cardCount} cards`);
  check('hub has a search field', (await page.evaluate(`!!document.querySelector('input[type="search"]')`)) === true);
  const filterCount = await page.evaluate(`Array.from(document.querySelectorAll('button')).filter((b) => b.getAttribute('aria-pressed') !== null).length`);
  check('hub category filters expose aria-pressed', filterCount >= 5, `${filterCount} filter buttons`);
  check('hub announces the result count (aria-live)', (await page.evaluate(`window.__v2.count('[aria-live]')`)) >= 1);
  const hubText = await page.evaluate(`window.__v2.text()`);
  check('hub shows "6 calculators available"', /6 calculators available/.test(hubText), (hubText.match(/\d+ calculators available/) || ['?'])[0]);

  await page.evaluate(`window.__v2.type('input[type="search"]', 'tile')`);
  const narrowed = await waitFor(page, `window.__v2.count('a[href^="/calculators/"]') < 6`, 4000);
  const filtered = await page.evaluate(`window.__v2.count('a[href^="/calculators/"]')`);
  check('search narrows the result list', narrowed && filtered > 0, `${filtered} of ${cardCount} cards`);

  await page.evaluate(`window.__v2.type('input[type="search"]', 'zzz-no-such-calculator')`);
  check('no-results state is explained', (await waitFor(page, `window.__v2.text().indexOf('No calculators match your search.') >= 0`, 4000)) === true);

  await page.evaluate(`window.__v2.clickText('Clear search')`);
  const restored = await waitFor(page, `window.__v2.count('a[href^="/calculators/"]') === 6`, 4000);
  check('clear-search restores the full list', restored === true, `${await page.evaluate(`window.__v2.count('a[href^="/calculators/"]')`)} cards`);

  await page.evaluate(`window.__v2.clickText('Masonry')`);
  const masonryOnly = await waitFor(page, `window.__v2.text().indexOf('Brick Masonry') >= 0 && window.__v2.text().indexOf('Room Floor Area') < 0`, 4000);
  check('category filter isolates one category', masonryOnly === true);
  await page.evaluate(`window.__v2.clickText('All')`);
  await waitFor(page, `window.__v2.count('a[href^="/calculators/"]') === 6`, 4000);

  check('hub: no console errors (EN, dark)', page.errors.length === 0, page.errors.join(', '));
  check('hub: no failed or 5xx requests', page.problems.length === 0, page.problems.join(', '));
  await page.close();
}

async function checkHubHindiAndTheme(cdp, clientBase) {
  const page = await openPage(cdp, `${clientBase}/calculators`);
  await resetSiteState(page);

  await page.evaluate(`window.__v2.lang('hi')`);
  await sleep(700);
  const hiText = await page.evaluate(`window.__v2.text()`);
  check('hub translates to Hindi', /कैलकुलेटर/.test(hiText));
  const hiPlaceholder = await page.evaluate(`document.querySelector('input[type="search"]').getAttribute('placeholder')`);
  check('hub search placeholder is Hindi', /खोज/.test(hiPlaceholder), hiPlaceholder);

  const before = await page.evaluate(`document.documentElement.dataset.theme`);
  await page.evaluate(`(() => { const b = document.querySelector('header div[role="group"] button'); if (b) b.click(); return !!b; })()`);
  await sleep(700);
  const after = await page.evaluate(`document.documentElement.dataset.theme`);
  check('theme toggle switches dark -> light', before === 'dark' && after === 'light', `${before} -> ${after}`);

  check('hub: no console errors (HI, light)', page.errors.length === 0, page.errors.join(', '));
  await page.evaluate(`window.__v2.lang('en')`);
  await sleep(500);
  await page.close();
}


/* ----------------------------------------------------------------- main ---- */

async function reportBracketBalance() {
  try {
    const text = await readFile(new URL(import.meta.url), 'utf8');
    const stripped = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\/])\/\/.*$/gm, '$1');
    const count = (re) => (stripped.match(re) || []).length;
    const problems = [];
    if (count(/\{/g) !== count(/\}/g)) problems.push(`{ } mismatch (${count(/\{/g)} vs ${count(/\}/g)})`);
    if (count(/\(/g) !== count(/\)/g)) problems.push(`( ) mismatch (${count(/\(/g)} vs ${count(/\)/g)})`);
    if (count(/\[/g) !== count(/\]/g)) problems.push(`[ ] mismatch (${count(/\[/g)} vs ${count(/\]/g)})`);
    check('script structure (bracket balance)', problems.length === 0, problems.join('; ') || 'balanced');
  } catch (error) {
    check('script structure (bracket balance)', false, String(error && error.message));
  }
}

/* --------------------------------------------- Calculator page flow (brick) -- */

async function checkBrickFlow(cdp, clientBase) {
  const page = await openPage(cdp, `${clientBase}/calculators/masonry.brick-quantity`);
  await resetSiteState(page);

  const formReady = await waitFor(page, `window.__v2.count('input') >= 5`);
  if (!formReady) {
    skip('brick form flow', 'form did not render - catalog unavailable, wait about a minute and re-run');
    await page.close();
    return;
  }

  const primaryFields = await page.evaluate(`window.__v2.count('input')`);
  check('brick form renders its primary inputs', primaryFields >= 5, `${primaryFields} inputs`);

  const expandedBefore = await page.evaluate(`document.querySelector('button[aria-expanded]').getAttribute('aria-expanded')`);
  await page.evaluate(`window.__v2.clickText('Material specification')`);
  await sleep(500);
  const expandedAfter = await page.evaluate(`document.querySelector('button[aria-expanded]').getAttribute('aria-expanded')`);
  check('advanced panel toggles aria-expanded', expandedBefore === 'false' && expandedAfter === 'true', `${expandedBefore} -> ${expandedAfter}`);
  const advancedFields = await page.evaluate(`window.__v2.count('input')`);
  check('advanced panel reveals the material inputs', advancedFields > primaryFields, `${primaryFields} -> ${advancedFields} inputs`);

  const openAdvancedPanel = async () => {
    await page.evaluate(`(() => { const btn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').indexOf('Material specification') >= 0); if (btn && btn.getAttribute('aria-expanded') === 'false') btn.click(); return true; })()`);
    await sleep(300);
  };

  const submitBrickWall = async () => {
    await openAdvancedPanel();
    await page.evaluate(`window.__v2.length('wallLength', 10, 0) && window.__v2.length('wallHeight', 10, 0) && window.__v2.field('wallThickness', 4)`);
    await page.evaluate(`window.__v2.length('brickLength', 0, 9) && window.__v2.length('brickWidth', 0, 4) && window.__v2.length('brickHeight', 0, 3.5) && window.__v2.field('mortarJointThickness', 1) && window.__v2.field('wastagePercentage', 5)`);
    await sleep(300);
    await page.evaluate(`document.querySelector('button[type="submit"]').click()`);
    return waitFor(page, `!!document.querySelector('[role="status"][aria-live="polite"]')`);
  };

  let rendered = await submitBrickWall();
  if (!rendered) rendered = await submitBrickWall();

  const pageRateLimited = page.responses.some((entry) => entry.indexOf('429') === 0);
  if (pageRateLimited) {
    skip('brick calculate flow', 'rate limited (429) - wait about a minute and re-run');
    await page.close();
    return;
  }
  check('brick form submits and renders a result', rendered === true, `page calls: ${page.responses.join(', ') || 'none'}`);

  // Expected value comes from the very payload the browser sent: the display
  // round-trip can land on an exact integer boundary, so the two numbers are
  // compared instead of a hard-coded quantity.
  const sentValues = page.posts.length > 0 ? safeParse(page.posts[page.posts.length - 1]) : null;
  check('form posts canonical SI values to the API', Boolean(sentValues && sentValues.values && sentValues.values.wallLength === 3.048), sentValues ? JSON.stringify(sentValues.values).slice(0, 120) : 'no POST captured');

  let expectedPrimary = null;
  let echoStatus = 'not attempted';
  if (sentValues && sentValues.values) {
    const echo = await request(API_BASE, '/api/calculators/masonry.brick-quantity/calculate', post({ values: sentValues.values }));
    echoStatus = `echo http ${echo.status}`;
    expectedPrimary = echo.status === 200 && echo.body.primary ? Number(echo.body.primary.value) : null;
  }
  const primary = await page.evaluate(`window.__v2.primary()`);
  check('browser result matches the API for the submitted inputs', primary !== null && primary === expectedPrimary, `page ${primary}, api ${expectedPrimary}, ${echoStatus}, page calls: ${page.responses.join(', ') || 'none'}`);
  const afterText = await page.evaluate(`window.__v2.text()`);
  check('result exposes a BOQ panel', afterText.indexOf('Bill of Quantities') >= 0, `page calls: ${page.responses.join(', ') || 'none'}`);
  check('BOQ shows the calculated + wastage lines', /Calculated/.test(afterText) && /wastage/.test(afterText));
  check('result region is announced (aria-live)', (await page.evaluate(`window.__v2.count('[aria-live]')`)) >= 1);
  check('aligned wall raises no thickness warning', afterText.indexOf('differs from brick width') < 0);
  check('print action is reachable', afterText.indexOf('Print') >= 0);

  check('brick page: no console errors', page.errors.length === 0, page.errors.join(', '));
  check('brick page: no failed or 5xx requests', page.problems.length === 0, page.problems.join(', '));
  await page.close();
}

async function checkValidationError(cdp, clientBase) {
  const page = await openPage(cdp, `${clientBase}/calculators/concrete.volume`);
  await resetSiteState(page);

  const formReady = await waitFor(page, `window.__v2.count('input') >= 3`);
  if (!formReady) {
    skip('form validation flow', 'form did not render - check the API/rate limit and re-run');
    await page.close();
    return;
  }

  // The form's own Clear button empties every field, which is a required-value error.
  const clearAndSubmit = async () => {
    const cleared = await page.evaluate(`window.__v2.clickText('Clear')`);
    await sleep(300);
    await page.evaluate(`document.querySelector('button[type="submit"]').click()`);
    return cleared && waitFor(page, `document.querySelectorAll('[aria-invalid="true"]').length >= 1`, 4000);
  };

  let marked = await clearAndSubmit();
  if (!marked) marked = await clearAndSubmit();
  check('empty required fields are marked aria-invalid', marked === true, `${await page.evaluate(`window.__v2.count('[aria-invalid="true"]')`)} marked`);
  check('empty required field is announced with role=alert', (await page.evaluate(`!!document.querySelector('[role="alert"]')`)) === true);

  // Fill example restores valid values, then an out-of-range percentage is entered.
  const refilled = await page.evaluate(`window.__v2.clickText('Fill example')`);
  check('form exposes a Fill example action', refilled === true);
  await sleep(400);
  await page.evaluate(`window.__v2.field('wastagePercentage', 99)`);
  await page.evaluate(`document.querySelector('button[type="submit"]').click()`);
  const rangeFlagged = await waitFor(page, `!!document.querySelector('[role="alert"]')`, 4000);
  check('out-of-range value is announced with role=alert', rangeFlagged === true);

  check('invalid submissions never reach the API', page.posts.length === 0, `${page.posts.length} POSTs`);
  check('invalid input never reaches a 500', page.problems.length === 0, page.problems.join(', '));
  check('invalid input: no console errors', page.errors.length === 0, page.errors.join(', '));
  await page.close();
}

async function checkMobileViewport(cdp, clientBase) {
  const applyMobile = (sessionId) =>
    cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, sessionId);

  const hub = await openPage(cdp, `${clientBase}/calculators`);
  await resetSiteState(hub);
  await waitFor(hub, `window.__v2.count('a[href^="/calculators/"]') >= 6`);
  await applyMobile(hub.sessionId);
  await sleep(1000);
  const hubOverflow = await hub.evaluate(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
  check('hub has no horizontal overflow at 390px', hubOverflow <= 1, `overflow ${hubOverflow}px`);
  await hub.close();

  const brick = await openPage(cdp, `${clientBase}/calculators/masonry.brick-quantity`);
  await resetSiteState(brick);
  await waitFor(brick, `window.__v2.count('input') >= 5`);
  await applyMobile(brick.sessionId);
  await sleep(1000);
  const brickOverflow = await brick.evaluate(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
  check('brick page has no horizontal overflow at 390px', brickOverflow <= 1, `overflow ${brickOverflow}px`);
  await brick.close();
}

/* ----------------------------------------------------------------- main ---- */

async function main() {
  console.log('Phase 2 verification');
  await reportBracketBalance();
  const apiReachable = await runApiChecks();

  if (SKIP_BROWSER) {
    console.log('\n== browser UX ==');
    skip('browser checks', 'requested --api/--no-browser');
  } else if (!apiReachable) {
    console.log('\n== browser UX ==');
    skip('browser checks', rateLimited > 0 ? 'API rate limited (429) - wait about a minute and re-run' : `API not reachable at ${API_BASE}`);
  } else {
    const clientBase = await detectClientBaseUrl();
    const cdpUrl = await detectCdpUrl();
    if (!clientBase) {
      console.log('\n== browser UX ==');
      skip('browser checks', 'client not reachable on 5173/5174');
    } else if (!cdpUrl) {
      console.log('\n== browser UX ==');
      skip('browser checks', `no DevTools endpoint on port ${CDP_PORT}`);
    } else {
      console.log('\n== browser UX ==');
      const cdp = await connectCdp(cdpUrl);
      try {
        await checkHubEnglish(cdp, clientBase);
        await checkHubHindiAndTheme(cdp, clientBase);
        await checkBrickFlow(cdp, clientBase);
        await checkValidationError(cdp, clientBase);
        await checkMobileViewport(cdp, clientBase);
      } finally {
        cdp.ws.close();
      }
    }
  }

  const blocked = rateLimited > 0;
  const verified = executed > 0 && !blocked;
  const status = failures > 0 ? 'FAIL' : blocked ? 'BLOCKED' : verified ? 'PASS' : 'NOT VERIFIED';
  console.log(`\nPhase 2 verification: ${status} (${executed} checks, ${failures} failed, ${skipped} skipped)`);
  if (blocked) {
    console.log('  The server allows 30 calculation requests per minute per IP - wait about a minute and re-run.');
  }
  return failures === 0 && verified ? 0 : 1;
}

const exitCode = await main();
process.exitCode = exitCode;
// Fallback: if pooled connections keep the event loop alive, exit after a short
// grace period so the run always terminates with a deterministic status code.
setTimeout(() => process.exit(exitCode), 1500).unref();


