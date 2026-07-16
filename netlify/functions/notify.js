import { getStore } from '@netlify/blobs';
import webpush from 'web-push';
import { safeEqual } from './lib/safe-equal.js';

export const config = { path: '/api/notify' };

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
