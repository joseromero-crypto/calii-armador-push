import { getStore } from '@netlify/blobs';
import { createHash } from 'crypto';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' };
  }

  let sub;
  try {
    sub = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers: CORS, body: 'Invalid JSON' };
  }

  if (!sub?.endpoint) {
    return { statusCode: 400, headers: CORS, body: 'Missing endpoint' };
  }

  const key = createHash('sha256').update(sub.endpoint).digest('hex');
  const store = getStore('subscriptions');
  await store.set(key, JSON.stringify(sub));

  return {
    statusCode: 201,
    headers: { ...CORS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true }),
  };
};
