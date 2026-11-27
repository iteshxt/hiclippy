# HiClippy monitoring (Nagios)

Nagios Core 4.5.14 and the Nagios plugins 2.5, **compiled from source** in
a Docker image, watching the live HiClippy site. Phase 2 of
`docs/plan-ops.md`; the hosts and expected values match `ops/terraform`.

## Run it

```bash
cd ops/nagios
docker compose --env-file ../../.env.local up -d --build
```

Open **http://localhost:8080** and sign in with `NAGIOS_ADMIN_USER` and
`NAGIOS_ADMIN_PASSWORD` from the repo-root `.env.local`:

```
NAGIOS_ADMIN_USER=iteshxt          # letters, digits, . _ - (default: nagiosadmin)
NAGIOS_ADMIN_PASSWORD=...          # your own; never commit it
```

Both are applied on every container start (`docker compose ... up -d`),
including Nagios's own permission list in `cgi.cfg`, so changing them
in `.env.local` and restarting is all it takes. Sign out at http://localhost:8080/logout. The port is bound
to `127.0.0.1`, so only this laptop can reach it.

The stock Nagios setup uses the browser's HTTP Basic-auth popup, which
browsers now often refuse to show on plain `http://` (you just get "401
Unauthorized"). This image uses a normal login form instead (Apache
`mod_auth_form`, same password file) with an encrypted, HttpOnly session
cookie; its key is regenerated on every container start, which signs
everyone out.

Desktop notifications for alerts (optional, in a second terminal):

```bash
./watch-alerts.sh
```

Stop with `docker compose down`. Check history, comments and scheduled
downtime are kept in the `nagios_var` volume and survive restarts.

## The web interface

After signing in you land on the **HiClippy dashboard** (`/nagios/hiclippy/`),
with the classic Nagios menu on the left. Every Nagios screen is still there,
restyled in HiClippy's colours.

### HiClippy dashboard

A custom page built on Nagios's own JSON feeds (`statusjson.cgi`,
`objectjson.cgi`, `archivejson.cgi`), refreshed every 30 seconds:

- **Overall status:** *All systems operational*, *Degraded* (a warning, or a
  check that is failing but still retrying) or *Outage* (a hard critical).
  Acknowledged problems and checks in downtime don't count.
- **Summary:** hosts up, checks OK, open problems, and how many are
  acknowledged or in downtime. Each number opens the matching Nagios screen.
- **Checks grouped by what they protect** (Website, API, DNS, Certificates),
  each with its status, response time, certificate days left with a meter,
  the DNS answer, when it last ran and runs next, the attempt count
  (*Retrying 2/3 (soft)* while Nagios is confirming a failure), and
  *Acknowledged*, *In downtime* or *Flapping* badges.
- **Re-check** runs a check immediately. It uses Nagios's own command form
  (`cmd.cgi`) including its one-time `nagFormId` token, exactly like the
  Commit button in the classic screen.
- **Details** opens the classic service page, where you **acknowledge** a
  problem, **schedule downtime** or **add a comment**.
- **Alerts in the last 24 hours**, soft and hard, with a link to the full
  history.
- **Links to every Nagios screen** the project uses (below) and whether
  Nagios itself is running checks and sending notifications.

### Classic Nagios screens (all kept)

| Area | Screens |
| --- | --- |
| Live status | Tactical Overview, Services, Hosts, host/service groups (overview, summary, grid), Unhandled problems, Network map, Outages |
| Reports | Availability, Trends, Alert history, Alert summary, Alert histogram, Notifications, Event log |
| Operations | Comments, Scheduled downtime, Scheduling queue, Process info, Performance info, Configuration |
| Per check | Details page with Acknowledge, Schedule downtime, Add comment, Re-schedule check, Disable checks or notifications |

`web/ui/brand-ui.py` applies the look at build time: it maps Nagios's
status colours (documented at the top of its `common.css`) to HiClippy's
palette, appends `web/ui/theme.css` to every stylesheet, puts the HiClippy
brand, a Dashboard link and *Sign out* in the menu, and replaces the
splash page (an advert for the commercial edition) with the dashboard. It
checks each change applies and fails the build if a future Nagios release
changes its pages.

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
| `entrypoint.sh` | Sets the web login and session key, prepares folders, starts Apache and Nagios |
| `web/nagios-apache.conf` | Apache config: form login, session cookie, logout, `/` to the dashboard |
| `web/ui/brand-ui.py`, `web/ui/theme.css` | Restyle the classic screens and menu at build time |
| `web/dashboard/` | The HiClippy dashboard (HTML, CSS, JS on Nagios's JSON feeds) |
| `web/login.html` | The login page, using the site's logo and mascot (copied from `frontend/public` at build time) |
| `etc/hiclippy.cfg` | Hosts, services, commands, contacts, soft/hard thresholds |
| `plugins/check_hiclippy_roundtrip.py` | The custom share-and-retrieve check |
| `docker-compose.yml` | Runs the container on 127.0.0.1:8080 |
| `watch-alerts.sh` | Desktop notifications for new alerts |
