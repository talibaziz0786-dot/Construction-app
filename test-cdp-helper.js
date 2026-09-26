// Helper runner for Chrome DevTools Protocol automation
export async function createCdpClient() {
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

  return {
    send,
    close: () => ws.close(),
    async openPage(url) {
      const target = await send('Target.createTarget', { url });
      const attached = await send('Target.attachToTarget', { targetId: target.result.targetId, flatten: true });
      const sessionId = attached.result.sessionId;
      await send('Page.enable', {}, sessionId);
      await send('Runtime.enable', {}, sessionId);
      await send('Network.enable', {}, sessionId);

      const errors = [];
      const logs = [];
      const network = [];

      const onMsg = (m) => {
        const d = JSON.parse(m.data);
        if (d.sessionId !== sessionId) return;
        if (d.method === 'Runtime.consoleAPICalled') {
          const line = d.params.args.map(a => a.value ?? a.description).join(' ');
          if (d.params.type === 'error') errors.push(line);
          else logs.push(`[${d.params.type}] ${line}`);
        }
        if (d.method === 'Network.responseReceived') {
          network.push({ url: d.params.response.url, status: d.params.response.status });
        }
      };
      ws.addEventListener('message', onMsg);

      return {
        sessionId,
        targetId: target.result.targetId,
        errors,
        logs,
        network,
        eval: async (expr) => {
          const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sessionId);
          if (res.result?.exceptionDetails) {
            console.error('Eval error:', res.result.exceptionDetails);
          }
          return res.result?.result?.value;
        },
        wait: (ms) => new Promise(r => setTimeout(r, ms)),
        close: async () => {
          await send('Target.closeTarget', { targetId: target.result.targetId });
        }
      };
    }
  };
}
