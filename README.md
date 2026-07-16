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

## V3: full-tune alarm via a custom default ringtone

The web push payload itself can't specify a custom sound — iOS doesn't honor
that. But a notification that doesn't request its own sound falls back to
whatever you've set as your phone's **default alert sound**, and that default
*can* be a custom ringtone up to 30+ seconds long. Set a custom ringtone as
your default alert sound (Settings → Sounds & Haptics), and a single
`/api/notify` ping plays that ringtone in full — a real tune, no server-side
repeat needed.

`/api/alarm` + `/api/ack` (a background function that re-sent the push every
few seconds until dismissed) were built first, while chasing a "loud alarm"
before this simpler fix was found. They're still deployed and working, just
unused by the daily wiring — a fallback if the ringtone approach ever stops
being available (new phone, reset settings, etc.). See them in
`netlify/functions/alarm.js` / `ack.js` and the **Detener alarma** button in
the PWA if you ever need them.

### Test a ping

```
https://alarm6am.netlify.app/api/notify?token=JoS9t4NekJ4drs5eclMyJXwFLllnnM_5&title=Test&body=Funciona
```

Bad token (expect 401):
```
https://alarm6am.netlify.app/api/notify?token=wrong&title=X&body=Y
```

---

## Paste these into your three scheduled tasks (V3 wiring)

Add one `web_fetch` call at the **end** of each task run, pointed at
`/api/notify`. Both "all good" and "problem" runs trigger it.

### All good
```
https://alarm6am.netlify.app/api/notify?token=JoS9t4NekJ4drs5eclMyJXwFLllnnM_5&title=%E2%9C%85%20Todo%20bien&body=A%20dormir
```
Title: `✅ Todo bien` · Body: `A dormir`

### Problem (replace body with your URL-encoded failed-hub list)
```
https://alarm6am.netlify.app/api/notify?token=JoS9t4NekJ4drs5eclMyJXwFLllnnM_5&title=%E2%9A%A0%EF%B8%8F%20Revisar&body=MH%20Guadalupe%202%2F5%20(40%25)
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
