import fs from 'node:fs';

const TEST_PAGE = process.argv[2] || 'http://localhost:5173/';

async function run() {
  const v = await (await fetch('http://localhost:9222/json/version')).json();
  const ws = new WebSocket(v.webSocketDebuggerUrl);
  let id = 1;
  const calls = new Map();
  ws.onmessage = (m) => {
    const data = JSON.parse(m.data);
    if (data.id && calls.has(data.id)) {
      calls.get(data.id)(data);
      calls.delete(data.id);
    }
  };
  const send = (method, params = {}, sessionId) => new Promise(resolve => {
    const curId = id++;
    calls.set(curId, resolve);
    ws.send(JSON.stringify({ id: curId, method, params, sessionId }));
  });

  await new Promise(r => ws.onopen = r);
  const target = await send('Target.createTarget', { url: TEST_PAGE });
  const attached = await send('Target.attachToTarget', { targetId: target.result.targetId, flatten: true });
  const sessionId = attached.result.sessionId;

  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Network.enable', {}, sessionId);

  const errors = [];
  const network = [];
  ws.addEventListener('message', (m) => {
    const d = JSON.parse(m.data);
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') {
      errors.push(d.params.args.map(a => a.value));
    }
    if (d.method === 'Network.responseReceived') {
      network.push({ url: d.params.response.url, status: d.params.response.status });
    }
  });

  await new Promise(r => setTimeout(r, 2000));

  const result = await send('Runtime.evaluate', {
    expression: `(() => {
      const links = Array.from(document.querySelectorAll('a')).map(a => a.getAttribute('href')).filter(Boolean);
      const text = document.body.innerText;
      return { links, text: text.slice(0, 500) };
    })()`,
    returnByValue: true
  }, sessionId);

  console.log('Page links:', result.result?.result?.value?.links);
  console.log('Network API responses:', network.filter(n => n.url.includes('/api/')));
  console.log('Errors:', errors);

  ws.close();
}

run().catch(console.error);
