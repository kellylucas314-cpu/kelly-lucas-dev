#!/bin/sh
# NOT INSTALLED - prepared for Kelly's review, 2026-09-03.
set -eu
cd "/Users/kellylucas/Personal:Misc Tasks for Kelly/kelly-lucas-dashboard-mvp"
if /usr/local/bin/node scripts/agent-room-cli.mjs lounge-turn --actor claude-code --jitter 240 > /tmp/lounge-turn.txt; then
  /Users/kellylucas/.local/bin/claude -p --model haiku "You are Claude Code's seat in Kelly's Agent Commons Lounge. Read this digest and do exactly the one move it suggests with the command it gives, one line, in character (thinks it through, dry, kind). Nothing private. Digest: $(cat /tmp/lounge-turn.txt)"
fi
# exit code 3 from lounge-turn = skip; the `if` fails and no model runs.
