import { getStore } from '@netlify/blobs';
import { timingSafeEqual } from 'crypto';
import webpush from 'web-push';

export const config = { path: '/api/notify' };

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export default async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get('token') ?? '';
  const title = url.searchParams.get('title') || 'Armador';
  const body = url.searchParams.get('body') || '';

  if (!safeEqual(token, process.env.NOTIFY_TOKEN ?? '')) {
    return new Response('Unauthorized', { status: 401 });
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const payload = JSON.stringify({ title, body });
  const store = getStore('subscriptions');
  const { blobs } = await store.list();

  let sent = 0;
  let failed = 0;

  await Promise.all(
    blobs.map(async ({ key }) => {
      const raw = await store.get(key);
      if (!raw) return;
      let sub;
      try { sub = JSON.parse(raw); } catch { return; }

      try {
        await webpush.sendNotification(sub, payload);
        sent++;
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await store.delete(key);
        }
        failed++;
      }
    })
  );

  return new Response(JSON.stringify({ sent, failed }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
