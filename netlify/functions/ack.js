import { getStore } from '@netlify/blobs';
import { safeEqual } from './lib/safe-equal.js';

export const config = { path: '/api/ack' };

export default async (req) => {
  const store = getStore('alarm-state');

  // Manual safety valve: GET with the token silences whatever alarm is
  // currently ringing, no matter its id. Useful if a tap-to-dismiss ever
  // fails to reach the SW (e.g. the platform quirk that motivated this file).
  if (req.method === 'GET') {
    const token = new URL(req.url).searchParams.get('token') ?? '';
    if (!safeEqual(token, process.env.NOTIFY_TOKEN ?? '')) {
      return new Response('Unauthorized', { status: 401 });
    }

    const state = await store.get('current', { type: 'json' });
    if (state) await store.setJSON('current', { ...state, acknowledged: true });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const id = payload?.id;
  const force = payload?.force === true;
  if (!id && !force) return new Response('Missing id', { status: 400 });

  const state = await store.get('current', { type: 'json' });
  if (state && (force || state.id === id)) {
    await store.setJSON('current', { ...state, acknowledged: true });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
