#!/bin/sh
# Show a desktop notification for every HiClippy alert Nagios writes.
# Run from ops/nagios while the container is up:  ./watch-alerts.sh
set -eu
log="$(dirname "$0")/alerts/alerts.log"
mkdir -p "$(dirname "$log")"
touch "$log"
echo "Watching $log (Ctrl+C to stop)"
tail -n 0 -F "$log" | while IFS= read -r line; do
    echo "$line"
    case "$line" in
        *" is OK "* | *" is UP "*) urgency=normal ;;
        *) urgency=critical ;;
    esac
    command -v notify-send >/dev/null 2>&1 && notify-send -u "$urgency" "HiClippy monitoring" "$line" || true
done
