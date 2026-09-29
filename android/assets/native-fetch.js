(() => {
  'use strict';
  const originalFetch = window.fetch.bind(window);
  const pending = new Map();
  let nextId = 1;
  window.__kstockReply = (id, encoded) => {
    const item = pending.get(id);
    if (!item) return;
    pending.delete(id);
    clearTimeout(item.timer);
    const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    const reply = JSON.parse(new TextDecoder().decode(bytes));
    item.resolve(new Response([204, 205, 304].includes(reply.code) ? null : reply.body, { status: reply.code, headers: { 'Content-Type': reply.type, 'Cache-Control': 'no-store' } }));
  };
  window.fetch = async (input, init) => {
    const request = new Request(new URL(typeof input === 'string' ? input : input.url, location.href), init || (input instanceof Request ? input : undefined));
    const url = new URL(request.url);
    if (url.origin !== location.origin || !(url.pathname === '/api' || url.pathname.startsWith('/api/'))) return originalFetch(input, init);
    const body = ['GET', 'HEAD'].includes(request.method) ? null : await request.text();
    return new Promise((resolve, reject) => {
      const id = nextId++;
      const timer = setTimeout(() => { pending.delete(id); reject(new TypeError('서버 응답 시간 초과')); }, 30000);
      pending.set(id, { resolve, reject, timer });
      window.KStockNative.request(id, url.pathname + url.search, request.method, body);
    });
  };
})();
