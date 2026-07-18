import { getStore } from '@netlify/blobs';
import { safeEqual } from './lib/safe-equal.js';
import { listRecent } from './lib/audit-log.js';

// GET /api/debug-log?token=... — returns the last 30 real invocations of
// /api/notify (whether or not the token was valid), independent of
// Netlify's own dashboard log search.
// GET .../api/debug-log?token=...&selftest=1 — does a live write+readback
// against the audit-log Blobs store in this same request and reports the
// raw error inline, so failures are visible without needing function logs.
export const config = { path: '/api/debug-log' };

export default async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get('token') ?? '';
  if (!safeEqual(token, process.env.NOTIFY_TOKEN ?? '')) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (url.searchParams.get('selftest') === '1') {
    const result = { step: 'start' };
    try {
      result.step = 'getStore';
      const store = getStore('audit-log');
      result.step = 'setJSON';
      const key = `selftest-${Date.now()}`;
      await store.setJSON(key, { hello: 'world', ts: new Date().toISOString() });
      result.step = 'get';
      const readBack = await store.get(key, { type: 'json' });
      result.step = 'list';
      const { blobs } = await store.list();
      result.ok = true;
      result.readBack = readBack;
      result.totalKeysInStore = blobs.length;
    } catch (err) {
      result.ok = false;
      result.error = { message: err?.message, name: err?.name, stack: err?.stack };
    }
    return new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const entries = await listRecent(30);
  return new Response(JSON.stringify(entries, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
