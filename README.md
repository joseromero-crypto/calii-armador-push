# Calii Armador Push — V2

iPhone lock-screen alerts for hub attendance. Web Push via Netlify, no App Store.

---

## Deploy (one-time, ~5 min)

### 1. Create the Netlify site

1. Push this repo to GitHub.
2. Go to [netlify.com](https://netlify.com) → **Add new site → Import from Git**.
3. Pick the repo. Build settings auto-load from `netlify.toml`.
4. **Site name:** set to `alarm6am` → site URL will be `https://alarm6am.netlify.app`.
5. Click **Deploy site**.

### 2. Set environment variables in Netlify

Go to **Site → Site configuration → Environment variables** and add all four:

| Key | Value |
|-----|-------|
| `VAPID_PUBLIC_KEY` | `BOu24otmA9iidMs1G2rJirP0lYRZApua4X0NEfLKPpvJxNvNdcRIb7HydFu6zVIkATKy_2ae7eyngFWYKWxa3Iw` |
| `VAPID_PRIVATE_KEY` | `r-uCql65uSdfa0VyRuligowTQaN9J8D0T41qBbH05fw` |
| `VAPID_SUBJECT` | `mailto:jose.romero@calii.com` |
| `NOTIFY_TOKEN` | `JoS9t4NekJ4drs5eclMyJXwFLllnnM_5` |

After adding variables, trigger a **redeploy** (Deploys → Trigger deploy).

### 3. Enable Netlify Blobs

Blobs are enabled automatically for all Netlify sites — no extra steps needed.

---

## One-time iPhone setup

1. On your iPhone, open **Safari** and go to `https://alarm6am.netlify.app`.
2. Tap the **Share** button → **Add to Home Screen** → **Add**.
3. Close Safari. Open the app from your **Home Screen** (not from Safari).
4. Tap **Activar notificaciones** and allow when iOS prompts.
5. Status should change to **Activado ✅**.

> If the button does nothing or shows an error, make sure you opened it from the Home Screen icon, not the Safari address bar. iOS only allows Web Push in standalone (Home Screen) mode.

---

## V3: the alarm (rings until dismissed)

iOS does not allow custom notification sounds for web push (or PWAs generally) —
only the system default sound. `/api/notify` (below) still exists and fires that
sound **once**. `/api/alarm` is the V3 endpoint: it's a **background function**
that keeps re-sending the push every 8 seconds (each one plays the default
sound + vibration again via `renotify`) for up to 5 minutes, or until you tap
the notification on your phone — whichever comes first. That's what makes it
feel like an alarm instead of a ping.

How it works: `/api/alarm` writes an alarm id to Netlify Blobs and loops,
checking that id before every ring. Tapping the notification runs the
service worker's `notificationclick` handler, which POSTs to `/api/ack` and
marks that id acknowledged — the loop sees this on its next check (≤8s) and
stops. Triggering a new alarm while one is ringing supersedes the old one
(its loop sees a different id and stops).

Both endpoints share the same `NOTIFY_TOKEN` and query-string params
(`token`, `title`, `body`) — no new secrets needed.

### Test the alarm

```
https://alarm6am.netlify.app/api/alarm?token=JoS9t4NekJ4drs5eclMyJXwFLllnnM_5&title=Test&body=Funciona
```

You'll get an immediate 202-style response with no visible content (it's a
background function), then repeated pings on your phone. Tap the notification
to stop it, or wait 5 minutes for the automatic cutoff.

### Test a single ping (no repeat)

```
https://alarm6am.netlify.app/api/notify?token=JoS9t4NekJ4drs5eclMyJXwFLllnnM_5&title=Test&body=Funciona
```

Bad token (expect 401, `/api/notify` only — `/api/alarm` always returns 202 by
platform design):
```
https://alarm6am.netlify.app/api/notify?token=wrong&title=X&body=Y
```

---

## Paste these into your three scheduled tasks (V3 wiring)

Add one `web_fetch` call at the **end** of each task run, pointed at
`/api/alarm` (not `/api/notify`) so it rings until dismissed. Both "all good"
and "problem" runs trigger it.

### All good
```
https://alarm6am.netlify.app/api/alarm?token=JoS9t4NekJ4drs5eclMyJXwFLllnnM_5&title=%E2%9C%85%20Todo%20bien&body=A%20dormir
```
Title: `✅ Todo bien` · Body: `A dormir`

### Problem (replace body with your URL-encoded failed-hub list)
```
https://alarm6am.netlify.app/api/alarm?token=JoS9t4NekJ4drs5eclMyJXwFLllnnM_5&title=%E2%9A%A0%EF%B8%8F%20Revisar&body=MH%20Guadalupe%202%2F5%20(40%25)
```
Title: `⚠️ Revisar` · Body: the failed-hub summary, URL-encoded

**URL-encode the body** before inserting. Quick reference for common characters:
- space → `%20`
- `/` → `%2F`
- `(` → `%28`, `)` → `%29`
- `%` → `%25`
- `,` → `%2C`

The V1 Slack self-DM post stays in place — V3 is additive.

---

## Rotating secrets (if ever needed)

```bash
# New VAPID pair
npx web-push generate-vapid-keys

# New notify token
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

After rotating: update Netlify env vars, update `VAPID_PUBLIC_KEY` in `public/index.html` (the `const` at the top of the script), and update the token in all three scheduled task URLs.

---

## Local dev

```bash
npm install
node scripts/make-icons.js    # generates public/icon-192.png and icon-512.png
cp .env.example .env          # fill in real secrets
npm run dev                   # starts netlify dev on http://localhost:8888
```

`netlify dev` proxies `/api/*` to the local functions automatically.
