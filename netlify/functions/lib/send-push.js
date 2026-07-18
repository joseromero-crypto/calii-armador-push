import { getStore } from '@netlify/blobs';
import webpush from 'web-push';

// Shared fan-out used by notify.js (single ping) and brain.js (V4 cron brain).
// Caller is responsible for webpush.setVapidDetails(...) beforehand.
export async function fanOutPush({ title, body }) {
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

  return { sent, failed };
}
