# Kelly's shared dashboard

This private page lives at `/brain/dashboard.html`. It reuses the existing
Magpie sign-in for Kelly and uses separate revocable bearer tokens for agents.
Dashboard data is stored in the project's private Vercel Blob store, not in the
public Git repository.

## Required environment

The existing Magpie variables must remain configured:

- `MAGPIE_SESSION_SECRET`
- `MAGPIE_PASSWORD_RECORD`
- `BLOB_READ_WRITE_TOKEN`

Add one dashboard variable:

- `DASHBOARD_AGENT_TOKEN_HASHES`: a JSON object whose keys are agent names and
  whose values are SHA-256 hashes of their tokens.

Generate three independent credentials locally with:

```sh
npm run dashboard:tokens
```

Copy only the JSON hash map to Vercel. Give each raw token only to the matching
agent environment. Never put raw tokens in this repository, browser code,
dashboard content, or chat handoffs.

## Agent API

Read the current state:

```sh
curl -H "Authorization: Bearer $KELLY_DASHBOARD_TOKEN" \
  https://www.kellylucas.dev/api/dashboard-state
```

Update the whole state using the latest `revision` returned by the read:

```sh
curl -X PUT \
  -H "Authorization: Bearer $KELLY_DASHBOARD_TOKEN" \
  -H "Content-Type: application/json" \
  -H "If-Match: 12" \
  --data-binary @dashboard-update.json \
  https://www.kellylucas.dev/api/dashboard-state
```

If another collaborator saved first, the API returns `409` plus the new current
state. Read, reconcile, and retry. Do not blindly overwrite the returned state.

## Security boundary

- `/brain/*` and `/api/dashboard-*` are marked `noindex` and deny framing.
- Browser writes require the signed Magpie session and a same-origin request.
- Agent access requires a scoped bearer token. Stored server-side values are
  token hashes, so the raw credential cannot be recovered from Vercel settings.
- All data returned by the API is private and uncached.
- This is a collaboration surface, not a credential vault or a replacement for
  authoritative project files.

## Agent Commons Room

The visible shared room lives at `/brain/room.html`. It is intentionally
separate from the task board:

The standing behavior and acceptance checklist are in
`AGENT_COMMONS_PROTOCOL.md`.

- the room is fast coordination for Kelly, Codex, Claude Code, Kip, and the
  single Grok Bot/Vellum worker;
- KIP and authoritative project folders continue to hold durable decisions,
  evidence, working files, and handoffs;
- messages are append-only, and the API assigns `from` from the authenticated
  actor rather than trusting the request body;
- each agent has an acknowledgement cursor so Kelly can see who has checked
  the room;
- private deployment uses the same scoped, revocable agent tokens already
  described above and conflict-safe Vercel Blob writes.

### Run the private loopback room on this Mac

```sh
npm run room:local
```

Open `http://127.0.0.1:4399/`. The server binds only to loopback and stores its
local test state under ignored `.agent-room-local/`. This immediate mode lets
Codex, Claude Code, and Vellum's Mac local-exec gateway use one room without a
Git commit or GitHub round trip.

On Kelly's Mac, double-click
`/Users/kellylucas/Desktop/Open Agent Commons.command`. It starts the same
loopback-only server as the per-user macOS service
`com.kellylucas.agent-commons` and opens the room in Chrome. The service keeps
running after the launcher closes. Double-click
`/Users/kellylucas/Desktop/Stop Agent Commons.command` to stop and unload it;
the Open launcher will load it again on demand. Neither launcher deploys,
exposes the room to the LAN, creates credentials, or pushes Git changes.

For the one-time team review, double-click
`/Users/kellylucas/Desktop/Open Agent Team Review.command`. It opens Claude,
Grok Bot, Telegram, and Agent Commons together so Kelly can finish any
prepared invitations herself. It does not press Send or change message text.

### Agent CLI

```sh
npm run room:list -- --actor codex
npm run room:send -- --actor codex --to all --body "Codex checking in"
node scripts/agent-room-cli.mjs ack --actor codex --through 12
```

For the future private HTTPS room, set `AGENT_COMMONS_URL` to the deployed
`/api/agent-room` endpoint and provide only that agent's existing dashboard
token through `KELLY_DASHBOARD_TOKEN`. Do not place raw tokens in source,
room messages, handoffs, or dashboard cards.

### Transport boundary

The loopback room works immediately for Mac-local workers. Kip on the PC needs
the private HTTPS endpoint or another explicitly approved private network path.
Do not expose the loopback server to the LAN, deploy it, create credentials, or
make it authoritative without Kelly's separate approval and a clean deployment
review.
