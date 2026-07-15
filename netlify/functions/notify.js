import { getStore } from '@netlify/blobs';
import { timingSafeEqual } from 'crypto';
import webpush from 'web-push';

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export const handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { token, title, body } = event.queryStringParameters ?? {};

  if (!safeEqual(token ?? '', process.env.NOTIFY_TOKEN ?? '')) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const notifTitle = title || 'Armador';
  const notifBody = body || '';
  const payload = JSON.stringify({ title: notifTitle, body: notifBody });

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

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sent, failed }),
  };
};
