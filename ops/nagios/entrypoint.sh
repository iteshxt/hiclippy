#!/bin/sh
# Start the Nagios web interface (Apache) and Nagios itself.
set -eu

if [ -z "${NAGIOS_ADMIN_PASSWORD:-}" ]; then
    echo "NAGIOS_ADMIN_PASSWORD is not set. Add it to the repo-root .env.local." >&2
    exit 1
fi

# Login for the web interface (user: nagiosadmin), rebuilt on every start
# so the password always matches .env.local.
htpasswd -b -c /usr/local/nagios/etc/htpasswd.users nagiosadmin "$NAGIOS_ADMIN_PASSWORD" >/dev/null 2>&1

# Alerts are appended here; the folder is mounted from the host so a
# desktop notifier (watch-alerts.sh) can follow it.
mkdir -p /var/log/hiclippy-alerts
chown nagios:nagios /var/log/hiclippy-alerts
chmod 0775 /var/log/hiclippy-alerts

# The state folder is a Docker volume; make sure Nagios owns it and that
# the external command pipe folder exists for the web interface.
mkdir -p /usr/local/nagios/var/rw /usr/local/nagios/var/archives /usr/local/nagios/var/spool/checkresults
chown -R nagios:nagios /usr/local/nagios/var
chown nagios:nagios /usr/local/nagios/var/rw
chmod 2775 /usr/local/nagios/var/rw

# Key that encrypts the login cookie. New on every start, so restarting the
# container signs everyone out; nothing to store or leak.
NAGIOS_SESSION_SECRET="$(head -c 32 /dev/urandom | base64 | tr -d '\n')"
export NAGIOS_SESSION_SECRET

apachectl start

# Nagios runs in the foreground as PID 1, so `docker stop` stops it cleanly.
exec /usr/local/nagios/bin/nagios /usr/local/nagios/etc/nagios.cfg
