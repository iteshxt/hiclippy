#!/usr/bin/env python3
"""Nagios plugin: share a clip through the HiClippy API, read it back, delete it.

This tests the whole path a real user takes (API, rate limiter, database)
rather than just whether the server answers. The clip is a short random
marker that expires after 1 minute, and the check deletes it straight away.

Exit codes follow the Nagios plugin rules:
  0 OK        everything worked within the warning time
  1 WARNING   worked but slowly, was rate limited, or the delete failed
  2 CRITICAL  the clip could not be saved or read back correctly, or too slow
  3 UNKNOWN   bad arguments or an unexpected error in the plugin itself

Uses only the Python standard library.
"""

import argparse
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

OK, WARNING, CRITICAL, UNKNOWN = 0, 1, 2, 3
STATE_NAMES = {OK: "OK", WARNING: "WARNING", CRITICAL: "CRITICAL", UNKNOWN: "UNKNOWN"}

# The API identifies a device by IP + User-Agent + Accept-Language, and only
# the device that saved a clip may delete it, so all three requests must
# send the same headers.
HEADERS = {
    "User-Agent": "hiclippy-nagios-check/1.0 (+https://github.com/iteshxt/hiclippy)",
    "Accept-Language": "en",
    "Accept": "application/json",
}


class CheckFailed(Exception):
    def __init__(self, state, message):
        super().__init__(message)
        self.state = state
        self.message = message


def request(method, url, timeout, data=None):
    """Return (status, parsed JSON or None, seconds taken)."""
    body = urllib.parse.urlencode(data).encode() if data is not None else None
    req = urllib.request.Request(url, data=body, method=method, headers=dict(HEADERS))
    if body is not None:
        req.add_header("Content-Type", "application/x-www-form-urlencoded")
    started = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            status, raw = resp.status, resp.read()
    except urllib.error.HTTPError as err:
        status, raw = err.code, err.read()
    except (urllib.error.URLError, TimeoutError, OSError) as err:
        raise CheckFailed(CRITICAL, f"{method} {url} failed: {getattr(err, 'reason', err)}")
    elapsed = time.monotonic() - started
    try:
        payload = json.loads(raw) if raw else None
    except ValueError:
        payload = None
    return status, payload, elapsed


def error_text(payload):
    if isinstance(payload, dict) and payload.get("error"):
        return f": {payload['error']}"
    return ""


def run(api, warn, crit, timeout):
    marker = f"nagios round-trip {uuid.uuid4()}"
    timings = {}
    warnings = []

    # 1. Share a text clip that expires in 1 minute.
    status, payload, timings["create"] = request(
        "POST", f"{api}/api/paste", timeout,
        {"content": marker, "contentType": "text", "duration": "1"},
    )
    if status == 429:
        raise CheckFailed(WARNING, f"rate limited when saving a clip (HTTP 429){error_text(payload)}")
    if status != 201 or not isinstance(payload, dict) or not payload.get("id"):
        raise CheckFailed(CRITICAL, f"could not save a clip: HTTP {status}{error_text(payload)}")
    code = str(payload["id"])

    # 2. Read it back with its 4-digit code and compare the content.
    status, payload, timings["read"] = request("GET", f"{api}/api/paste/{code}", timeout)
    if status != 200 or not isinstance(payload, dict):
        raise CheckFailed(CRITICAL, f"saved clip {code} but reading it back failed: HTTP {status}{error_text(payload)}")
    if payload.get("content") != marker:
        raise CheckFailed(CRITICAL, f"clip {code} came back with different content")

    # 3. Delete it. If this fails the clip still expires within a minute.
    status, payload, timings["delete"] = request("DELETE", f"{api}/api/paste/{code}", timeout)
    if status != 200:
        warnings.append(f"delete returned HTTP {status}{error_text(payload)}, clip expires in 1 min anyway")

    total = sum(timings.values())
    perfdata = " ".join(
        [f"total={total:.3f}s;{warn};{crit};0"] + [f"{k}={v:.3f}s" for k, v in timings.items()]
    )
    summary = f"saved, read back and deleted clip {code} in {total:.2f}s"

    if total >= crit:
        return CRITICAL, f"{summary}, over the {crit}s limit", perfdata
    if total >= warn:
        warnings.insert(0, f"slower than {warn}s")
    if warnings:
        return WARNING, f"{summary} ({'; '.join(warnings)})", perfdata
    return OK, summary, perfdata


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--api", required=True, help="API base URL, e.g. https://clippy-api.onrender.com")
    parser.add_argument("-w", "--warning", type=float, default=10, help="warn above this many seconds in total")
    parser.add_argument("-c", "--critical", type=float, default=30, help="critical above this many seconds in total")
    parser.add_argument("-t", "--timeout", type=float, default=60, help="timeout per request, in seconds")
    try:
        args = parser.parse_args()
    except SystemExit:
        sys.exit(UNKNOWN)
    if args.warning >= args.critical:
        print("UNKNOWN - warning must be lower than critical")
        sys.exit(UNKNOWN)

    api = args.api.rstrip("/")
    try:
        state, message, perfdata = run(api, args.warning, args.critical, args.timeout)
    except CheckFailed as failed:
        state, message, perfdata = failed.state, failed.message, ""
    except Exception as err:  # a bug here must not look like a site outage
        state, message, perfdata = UNKNOWN, f"plugin error: {err!r}", ""

    print(f"{STATE_NAMES[state]} - {message}" + (f" | {perfdata}" if perfdata else ""))
    sys.exit(state)


if __name__ == "__main__":
    main()
