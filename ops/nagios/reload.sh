#!/bin/sh
# Validate the HiClippy Nagios config inside the running container, then
# reload Nagios without downtime. Run by `terraform apply` after it writes
# etc/hiclippy.cfg (ops/terraform/nagios.tf); safe to run by hand too.
set -eu
container="${1:-hiclippy-nagios}"

if ! docker inspect -f '{{.State.Running}}' "$container" 2>/dev/null | grep -q true; then
    echo "Nagios container '$container' is not running; the new config is used on its next start."
    exit 0
fi

echo "Validating the new config in $container..."
if ! docker exec "$container" /usr/local/nagios/bin/nagios -v /usr/local/nagios/etc/nagios.cfg >/tmp/nagios-verify.$$ 2>&1; then
    grep -E "Error|Warning" /tmp/nagios-verify.$$ >&2 || cat /tmp/nagios-verify.$$ >&2
    rm -f /tmp/nagios-verify.$$
    echo "Config is invalid; Nagios keeps running the previous config. Fix the template and apply again." >&2
    exit 1
fi
grep -E "Total (Warnings|Errors)" /tmp/nagios-verify.$$ || true
rm -f /tmp/nagios-verify.$$

# SIGHUP makes Nagios re-read its config; check history and state are kept.
docker exec "$container" kill -HUP 1
echo "Nagios reloaded with the new config."
