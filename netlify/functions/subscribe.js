import { getStore } from '@netlify/blobs';
import { createHash } from 'crypto';

export const config = { path: '/api/subscribe' };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS });
  }

  let sub;
  try {
    sub = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: CORS });
  }

  if (!sub?.endpoint) {
    return new Response('Missing endpoint', { status: 400, headers: CORS });
  }

  const key = createHash('sha256').update(sub.endpoint).digest('hex');
  const store = getStore('subscriptions');
  await store.set(key, JSON.stringify(sub));

  return new Response(JSON.stringify({ ok: true }), {
    status: 201,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
};
