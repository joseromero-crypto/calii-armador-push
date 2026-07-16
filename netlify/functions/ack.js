import { getStore } from '@netlify/blobs';

export const config = { path: '/api/ack' };

export default async (req) => {
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
  if (!id) return new Response('Missing id', { status: 400 });

  const store = getStore('alarm-state');
  const state = await store.get('current', { type: 'json' });
  if (state && state.id === id) {
    await store.setJSON('current', { ...state, acknowledged: true });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
