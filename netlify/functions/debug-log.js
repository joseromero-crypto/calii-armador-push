import { safeEqual } from './lib/safe-equal.js';
import { listRecent } from './lib/audit-log.js';

// GET /api/debug-log?token=... — returns the last 30 real invocations of
// /api/notify (whether or not the token was valid), independent of
// Netlify's own dashboard log search.
export const config = { path: '/api/debug-log' };

export default async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get('token') ?? '';
  if (!safeEqual(token, process.env.NOTIFY_TOKEN ?? '')) {
    return new Response('Unauthorized', { status: 401 });
  }

  const entries = await listRecent(30);
  return new Response(JSON.stringify(entries, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
