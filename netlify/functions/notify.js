import webpush from 'web-push';
import { safeEqual } from './lib/safe-equal.js';
import { fanOutPush } from './lib/send-push.js';
import { recordInvocation } from './lib/audit-log.js';

export const config = { path: '/api/notify' };

export default async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get('token') ?? '';
  const title = url.searchParams.get('title') || 'Armador';
  const body = url.searchParams.get('body') || '';
  const tokenValid = safeEqual(token, process.env.NOTIFY_TOKEN ?? '');

  // Recorded unconditionally, before the auth check — so even a call with a
  // malformed/wrong token still leaves a trace instead of vanishing.
  await recordInvocation({
    source: 'notify',
    title,
    body,
    extra: {
      tokenValid,
      userAgent: req.headers.get('user-agent') || '',
      rawQuery: url.search,
    },
  });

  if (!tokenValid) {
    return new Response('Unauthorized', { status: 401 });
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const { sent, failed } = await fanOutPush({ title, body });

  return new Response(JSON.stringify({ sent, failed }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
