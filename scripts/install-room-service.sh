#!/bin/sh
# Keep the Agent Commons loopback service running at login on the Mac, so
# Codex, Vellum, and Kelly's local page can always reach the room.
#
#   sh scripts/install-room-service.sh            # install or update
#   sh scripts/install-room-service.sh --uninstall
#
# Loopback only (127.0.0.1:4399). Reads the same private upstream config
# the CLI uses; nothing here touches tokens. Logs go to
# ~/Library/Logs/agent-commons-room.log.
set -eu
LABEL="dev.kellylucas.agent-commons-room"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
TARGET="gui/$(id -u)"

if [ "${1:-}" = "--uninstall" ]; then
  launchctl bootout "$TARGET/$LABEL" 2>/dev/null || true
  rm -f "$PLIST"
  echo "Removed $LABEL."
  exit 0
fi

NODE="$(command -v node || true)"
if [ -z "$NODE" ]; then
  echo "node is not on PATH; install Node first." >&2
  exit 1
fi
mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
sed -e "s|__NODE__|$NODE|g" -e "s|__REPO__|$REPO|g" -e "s|__HOME__|$HOME|g" \
  "$REPO/launchd/$LABEL.plist" > "$PLIST"
launchctl bootout "$TARGET/$LABEL" 2>/dev/null || true
launchctl bootstrap "$TARGET" "$PLIST"
launchctl kickstart -k "$TARGET/$LABEL"
sleep 2
if curl -sf -H "X-Agent: kelly" "http://127.0.0.1:4399/api/agent-room?after=0&limit=1" >/dev/null; then
  echo "Agent Commons room is running at http://127.0.0.1:4399/brain/room.html and will restart at login."
else
  echo "Installed, but the room did not answer yet. Check ~/Library/Logs/agent-commons-room.log" >&2
  exit 1
fi
