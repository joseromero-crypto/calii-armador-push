import { getStore } from '@netlify/blobs';

// Independent forensic trail for /api/notify calls — bypasses Netlify's own
// (unreliable/confusing) dashboard log search entirely. Every call is
// recorded here regardless of token validity, so we can see attempts that
// never even authenticated, not just successful sends.
export async function recordInvocation({ source, title, body, extra }) {
  try {
    const store = getStore('audit-log');
    const ts = new Date().toISOString();
    const key = `${ts}-${Math.random().toString(36).slice(2, 8)}`;
    await store.setJSON(key, { ts, source, title, body, ...extra });
  } catch (err) {
    console.error('audit-log: failed to record', err);
  }
}

export async function listRecent(limit = 30) {
  const store = getStore('audit-log');
  const { blobs } = await store.list();
  const sortedKeys = blobs.map((b) => b.key).sort().reverse().slice(0, limit);
  const entries = await Promise.all(sortedKeys.map((key) => store.get(key, { type: 'json' })));
  return entries.filter(Boolean);
}
