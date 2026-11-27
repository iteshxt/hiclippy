# HiClippy monitoring (Nagios)

Nagios Core 4.5.14 and the Nagios plugins 2.5, **compiled from source** in
a Docker image, watching the live HiClippy site. Phase 2 of
`docs/plan-ops.md`; the hosts and expected values match `ops/terraform`.

## Run it

```bash
cd ops/nagios
docker compose --env-file ../../.env.local up -d --build
```

Open **http://localhost:8080/nagios** and log in as `nagiosadmin` with
the `NAGIOS_ADMIN_PASSWORD` from the repo-root `.env.local`. The port is
bound to `127.0.0.1`, so only this laptop can reach it.

Desktop notifications for alerts (optional, in a second terminal):

```bash
./watch-alerts.sh
```

Stop with `docker compose down`. Check history, comments and scheduled
downtime are kept in the `nagios_var` volume and survive restarts.

## What it checks

| Host | Check | Every | Passes when |
| --- | --- | --- | --- |
| www.hiclippy.online | Homepage | 5 min | HTTPS 200 with `<title>HiClippy`; WARNING over 2 s, CRITICAL over 5 s |
| | Share page | 5 min | `/share` loads with `HiClippy` |
| | HTTPS certificate | 6 h | more than 30 days left (CRITICAL under 7) |
| | DNS www CNAME to Vercel | 30 min | `www` still points at Vercel |
| hiclippy.online | Redirect to www | 5 min | 308 with `Location: https://www.hiclippy.online/` |
| | DNS A record to Vercel | 30 min | still `216.198.79.1` |
| clippy-api.onrender.com | API health | 5 min | `/health` says `"status":"healthy"`; WARNING over 3 s, CRITICAL over 15 s |
| | HTTPS certificate | 6 h | more than 30 days left |
| | **Share and retrieve a clip** | 15 min | custom plugin, below |

Checking the API every 5 minutes keeps Render's free instance from going
to sleep (it sleeps after 15 idle minutes). That uses about 730 of the 750
free instance hours a month, which is fine because HiClippy is the only
service on the account.

### The custom plugin

`plugins/check_hiclippy_roundtrip.py` does what a user does: it saves a
text clip that expires in 1 minute, reads it back with its 4-digit code,
checks the content matches, and deletes it. That tests the API, the rate
limiter and the database together, not just whether a server answers.

- 4 clips an hour, far under the API's limit of 20 per device.
- Sends the same headers on every request, because the API only lets the
  device that saved a clip delete it.
- Standard Nagios exit codes, with timings as performance data:

```
OK - saved, read back and deleted clip 6256 in 2.23s | total=2.227s;10.0;30.0;0 create=0.978s read=0.587s delete=0.661s
```

### Known issue it found (2026-11-27)

On its first run this check reported **WARNING: delete returned HTTP 404**.
Saving and reading work; deleting does not. The API only lets the device
that saved a clip delete it, identified by IP + User-Agent + language,
and it takes the IP from `X-Forwarded-For` trusting one proxy hop
(`TRUST_PROXY=1`). The API sits behind Cloudflare *and* Render's proxy
(`server: cloudflare`, `x-render-origin-server: Render`), so that hop is
most likely a Cloudflare edge address, which changes between connections.
The same cause makes the per-device rate limits group visitors by
Cloudflare edge instead of by person.

The site has no delete button, so users don't see it, but it is a real
backend bug. The check stays WARNING until the backend is fixed;
acknowledge it in the web interface meanwhile.

## Soft and hard states

A check that fails once is **SOFT**: it might be a blip (a slow Render
response, a network hiccup). Nagios retries it every minute, and only
after **3 failures in a row** does it become **HARD** and send an alert.
Recoveries alert too. The current attempt shows in the web interface as
*Attempt 1/3*, *2/3* and so on.

## Alerts

Alerts are appended to `alerts/alerts.log` (gitignored), one line each:

```
Thu Nov 27 18:40:00 IST 2026 | API health on clippy-api.onrender.com is CRITICAL (PROBLEM) | ...
```

`watch-alerts.sh` turns each new line into a desktop notification with
`notify-send`. Email would need a mail server in the container.

## Things to try in the web interface

- **Scheduled downtime:** a service's page > *Schedule downtime*.
  Alerts are held during the window, e.g. while redeploying.
- **Acknowledge a problem:** stops repeat alerts while you fix it.
- **Comments:** notes on a host or service, kept across restarts.
- **Re-schedule a check now:** runs a check immediately.

## Files

| File | Purpose |
| --- | --- |
| `Dockerfile` | Downloads, verifies (SHA-256) and compiles Nagios and the plugins |
| `entrypoint.sh` | Sets the web login, prepares folders, starts Apache and Nagios |
| `etc/hiclippy.cfg` | Hosts, services, commands, contacts, soft/hard thresholds |
| `plugins/check_hiclippy_roundtrip.py` | The custom share-and-retrieve check |
| `docker-compose.yml` | Runs the container on 127.0.0.1:8080 |
| `watch-alerts.sh` | Desktop notifications for new alerts |
