import { getStore } from '@netlify/blobs';
import webpush from 'web-push';
import { safeEqual } from './lib/safe-equal.js';

// Background function: platform returns 202 immediately, this keeps running.
export const config = { path: '/api/alarm', background: true };

const RING_INTERVAL_MS = 8000;
const MAX_DURATION_MS = 5 * 60 * 1000; // safety stop if never acknowledged

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default async (req) => {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token') ?? '';
    const title = url.searchParams.get('title') || 'Armador';
    const body = url.searchParams.get('body') || '';

    if (!safeEqual(token, process.env.NOTIFY_TOKEN ?? '')) return;

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    const alarmStore = getStore('alarm-state');
    const subStore = getStore('subscriptions');

    // A fresh trigger supersedes any alarm already ringing — the old loop's
    // id check will stop it on its next iteration.
    const id = `${Date.now()}`;
    await alarmStore.setJSON('current', {
      id,
      acknowledged: false,
    });

    const payload = JSON.stringify({ title, body, alarmId: id });
    const startedAt = Date.now();

    while (Date.now() - startedAt < MAX_DURATION_MS) {
      const state = await alarmStore.get('current', { type: 'json' });
      if (!state || state.id !== id || state.acknowledged) break;

      const { blobs } = await subStore.list();
      if (blobs.length === 0) break; // nobody to ring

      await Promise.all(
        blobs.map(async ({ key }) => {
          const raw = await subStore.get(key);
          if (!raw) return;
          let sub;
          try { sub = JSON.parse(raw); } catch { return; }

          try {
            await webpush.sendNotification(sub, payload);
          } catch (err) {
            if (err.statusCode === 410 || err.statusCode === 404) {
              await subStore.delete(key);
            }
          }
        })
      );

      await sleep(RING_INTERVAL_MS);
    }
  } catch (err) {
    console.error('alarm function error', err);
  }
};
