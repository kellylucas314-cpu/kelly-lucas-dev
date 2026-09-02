/**
 * Browser-level QA for the Agent Commons room using the synthetic fixture.
 *
 *   node scripts/agent-room-browser-qa.mjs [--shots docs/agent-commons/screenshots/after]
 *
 * Starts a throwaway loopback server on a random port with the "full"
 * fixture (never the live room), drives the page with the locally installed
 * playwright-cli, and asserts the Kelly-facing workflow:
 *
 *   1. the first viewport shows the Needs Kelly count and queue;
 *   2. the queue item links to its thread and explains why it is there;
 *   3. Kelly posts a decision in the thread and the thread becomes resolved;
 *   4. the queue count drops without rewriting history;
 *   5. no horizontal page overflow at 390, 768, or 1440.
 *
 * Requires playwright-cli on PATH; exits 0 with a notice when it is absent so
 * the Node test suites stay dependency-free.
 */
import { execFile, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildFixture } from "./agent-room-fixture.mjs";
import { createLocalRoomServer } from "./agent-room-local.mjs";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SESSION = `agent-commons-qa-${process.pid}`;

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (!argv[index].startsWith("--")) continue;
    options[argv[index].slice(2)] = argv[index + 1];
    index += 1;
  }
  return options;
}

function cli(args, { cwd } = {}) {
  // The fixture server lives in this process, so every CLI call must be
  // asynchronous or the page could never load while we wait for it.
  return new Promise((resolve, reject) => {
    execFile("playwright-cli", [`-s=${SESSION}`, ...args], { cwd, encoding: "utf8", timeout: 60_000 }, (error, stdout, stderr) => {
      if (error && error.code !== 1) return reject(error);
      resolve(`${stdout}${stderr}`);
    });
  });
}

async function evaluate(expression, cwd) {
  const output = await cli(["eval", expression, "--raw"], { cwd });
  const text = output.trim();
  const lines = text.split("\n");
  for (let start = 0; start < lines.length; start += 1) {
    for (let end = lines.length; end > start; end -= 1) {
      const candidate = lines.slice(start, end).join("\n").trim();
      try {
        return JSON.parse(candidate);
      } catch {
        // playwright-cli may surround a multiline JSON value with diagnostics.
      }
    }
  }
  return text;
}

function assert(condition, message, failures) {
  if (condition) process.stdout.write(`  ok   ${message}\n`);
  else {
    process.stdout.write(`  FAIL ${message}\n`);
    failures.push(message);
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const probe = spawnSync("playwright-cli", ["--version"], { encoding: "utf8" });
  if (probe.error) {
    process.stdout.write("playwright-cli is not installed; browser QA skipped (model and CLI tests still cover the workflow).\n");
    return;
  }

  const directory = await mkdtemp(path.join(tmpdir(), "agent-room-browser-qa-"));
  const stateFile = path.join(directory, "state.json");
  await writeFile(stateFile, `${JSON.stringify(buildFixture("full"), null, 2)}\n`, { mode: 0o600 });
  const server = createLocalRoomServer({ stateFile, upstreamConfigFile: path.join(directory, "no-upstream.json") });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const shots = options.shots ? path.resolve(options.shots) : "";
  if (shots) await mkdir(shots, { recursive: true });
  const cwd = shots || directory;
  const failures = [];
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  try {
    await cli(["open", `${origin}/brain/room.html`], { cwd });
    await cli(["resize", "1440", "900"], { cwd });
    await wait(1500);

    process.stdout.write("First-visit guide\n");
    const guideFirst = await evaluate("!!document.querySelector('.desk-guide')", cwd);
    assert(guideFirst === true, "A first visit opens with How this desk works", failures);
    await cli(["eval", "document.querySelector('[data-close-guide]').click()"], { cwd });
    await wait(400);
    const guideGone = await evaluate("({ gone: !document.querySelector('.desk-guide'), stored: localStorage.getItem('acGuideDismissed') })", cwd);
    assert(guideGone && guideGone.gone === true && guideGone.stored === "true", `Got it dismisses the guide and remembers (${JSON.stringify(guideGone)})`, failures);
    await cli(["eval", "document.getElementById('guideLink').click()"], { cwd });
    await wait(400);
    const guideBack = await evaluate("!!document.querySelector('.desk-guide')", cwd);
    assert(guideBack === true, "The rail link reopens the guide on demand", failures);
    await cli(["eval", "document.querySelector('[data-close-guide]').click()"], { cwd });
    await wait(300);

    process.stdout.write("First viewport at 1440\n");
    const needs = await evaluate("document.getElementById('needsKellyCount').textContent", cwd);
    assert(String(needs) === "2", `Needs Kelly count is 2 (got ${needs})`, failures);
    const queue = await evaluate("(() => [...document.querySelectorAll('.queue-item:not(.quiet)')].map((item) => item.querySelector('.reason-tag').textContent + '|' + item.querySelector('.queue-top strong').textContent))()", cwd);
    assert(Array.isArray(queue) && queue.length === 2 && queue.every((entry) => entry.startsWith("waiting on you|")), `Queue shows two items with a reason (${JSON.stringify(queue)})`, failures);
    const queueVisible = await evaluate("(() => { const r = document.querySelector('.queue-item').getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight; })()", cwd);
    assert(queueVisible === true, "First Needs Kelly item is inside the first viewport", failures);
    const threadsVisible = await evaluate("(() => { const h = [...document.querySelectorAll('.desk-section h2')].find((n) => /^(Active|Conversations)/.test(n.textContent)); const r = h.getBoundingClientRect(); return r.bottom <= window.innerHeight; })()", cwd);
    assert(threadsVisible === true, "Conversations section heading is inside the first viewport", failures);
    const presence = await evaluate("document.getElementById('connectionState').textContent", cwd);
    assert(["room live", "live", "connected"].includes(presence), `Connection pill says the room is connected (got ${presence})`, failures);
    const checkins = await evaluate("document.getElementById('checkinCount').textContent", cwd);
    assert(checkins === "4 of 4 checked in", `Authenticated posts count as current presence (got ${checkins})`, failures);
    if (shots) await cli(["screenshot", "--filename=desktop-1440.png"], { cwd });

    process.stdout.write("Open the thread from the queue\n");
    await cli(["eval", "document.querySelector('.queue-item [data-open-thread]').click()"], { cwd });
    await wait(600);
    const heading = await evaluate("document.getElementById('viewHeading').textContent", cwd);
    assert(heading === "Lantern demo deck", `Thread view opened with a readable title (got ${heading})`, failures);
    const pill = await evaluate("document.querySelector('.thread-head .status-pill').textContent", cwd);
    assert(["waiting on Kelly", "waiting on you", "needs you"].includes(pill), `Thread header shows the conversation needs Kelly (got ${pill})`, failures);
    const composerOpen = await evaluate("!document.getElementById('composerPanel').hidden && document.getElementById('threadSelect').value", cwd);
    assert(composerOpen === "lantern-demo-deck", `Composer is open and set to the thread (got ${composerOpen})`, failures);
    if (shots) await cli(["screenshot", "--filename=desktop-thread.png"], { cwd });

    process.stdout.write("Inbox reasons for an agent\n");
    const kipInboxBefore = await fetch(`${origin}/api/agent-room`, { headers: { "X-Agent": "kip" } }).then((response) => response.json());
    assert(kipInboxBefore.inbox.some((item) => item.seq === 12 && item.reason === "addressed-to-you"), "Kip's inbox contains the handoff with its reason", failures);

    process.stdout.write("Kelly replies with a resolving decision\n");
    await cli(["eval", "(() => { document.querySelector('[data-reply=\"message-fixture-13\"]').click(); const k = document.getElementById('kindSelect'); k.value = 'decision'; k.dispatchEvent(new Event('change')); document.getElementById('messageInput').value = 'PDF is fine for the investor copy. Resolved.'; document.getElementById('sendButton').click(); return 'posted'; })()"], { cwd });
    await wait(1800);
    const resolvedPill = await evaluate("document.querySelector('.thread-head .status-pill').textContent", cwd);
    assert(["resolved by Kelly", "resolved by you", "done", "wrapped up"].includes(resolvedPill), `Thread is now wrapped up (got ${resolvedPill})`, failures);
    const needsAfter = await evaluate("document.getElementById('needsKellyCount').textContent", cwd);
    assert(String(needsAfter) === "1", `Needs Kelly count dropped to 1 (got ${needsAfter})`, failures);
    const history = await evaluate("document.querySelectorAll('.message-item').length", cwd);
    assert(history === 5, `Thread history keeps all five messages (got ${history})`, failures);
    const answered = await evaluate("(() => [...document.querySelectorAll('#message-13 .waiting-pill')].map((n) => n.textContent).join(','))()", cwd);
    assert(["Kelly answered", "you answered"].includes(answered), `Receipt 13 shows Kelly answered (got ${answered})`, failures);
    const storedFirst = await fetch(`${origin}/api/agent-room`, { headers: { "X-Agent": "codex" } }).then((response) => response.json());
    assert(storedFirst.messages[0].waitingOn.join(",") === "claude-code,kip,vellum", "Oldest message keeps its original waiting field", failures);
    if (shots) await cli(["screenshot", "--filename=desktop-thread-resolved.png"], { cwd });

    const kipInboxAfter = await fetch(`${origin}/api/agent-room`, { headers: { "X-Agent": "kip" } }).then((response) => response.json());
    assert(!kipInboxAfter.inbox.some((item) => item.threadId === "lantern-demo-deck"), "Resolved thread leaves Kip's inbox", failures);

    process.stdout.write("The standup\n");
    await cli(["goto", `${origin}/brain/room.html#view=overview`], { cwd });
    await wait(1200);
    const standup = await evaluate("(() => { const seats = [...document.querySelectorAll('.standup-seat')]; return { seats: seats.map((node) => node.dataset.agent), inSeats: seats.filter((node) => node.dataset.in === 'true').map((node) => node.dataset.agent), codex: seats.find((node) => node.dataset.agent === 'codex')?.querySelector('.standup-line')?.textContent || '', vellum: seats.find((node) => node.dataset.agent === 'vellum')?.querySelector('.standup-line')?.textContent || '' }; })()", cwd);
    assert(standup && standup.seats.join(",") === "kelly,codex,claude-code,kip,vellum" && standup.inSeats.join(",") === "codex,claude-code,kip" && /Export retry is solid/.test(standup.codex) && /No line that day|Not in yet/.test(standup.vellum), `The standup block shows every seat, who is in, and their line (${JSON.stringify(standup)})`, failures);
    const standupCard = await evaluate("(() => [...document.querySelectorAll('.thread-title, .board-card-title, .scrum-card-title')].some((node) => node.textContent.trim() === 'Standup'))()", cwd);
    assert(standupCard === false, "The standup thread is never a card or a conversation row", failures);

    process.stdout.write("The scrum lanes\n");
    await cli(["goto", `${origin}/brain/room.html#view=board&lanes=scrum`], { cwd });
    await wait(1200);
    const lanes = await evaluate("(() => [...document.querySelectorAll('.scrum-lane')].map((lane) => lane.dataset.lane))()", cwd);
    assert(Array.isArray(lanes) && lanes.join(",") === "backlog,doing,waiting-on-kelly,done", `Board opens on four scrum lanes in order (${JSON.stringify(lanes)})`, failures);
    const laneOf = (title) => evaluate(`(() => { const card = [...document.querySelectorAll('.scrum-card-title')].find((node) => node.textContent === ${JSON.stringify(title)}); return card ? card.closest('.scrum-lane').dataset.lane : 'missing'; })()`, cwd);
    assert((await laneOf("Lantern demo deck")) === "done", "A conversation Kelly wrapped up sits in Done", failures);
    assert((await laneOf("Export retry logic")) === "waiting-on-kelly", "An agent's wrap-up waits for Kelly's Done instead of counting as done", failures);
    const readyCard = await evaluate("(() => { const card = [...document.querySelectorAll('.scrum-card')].find((node) => node.querySelector('.scrum-card-title')?.textContent === 'Export retry logic'); return card ? { ready: card.dataset.ready, pill: card.querySelector('.state-pill')?.textContent || '' } : null; })()", cwd);
    assert(readyCard && readyCard.ready === "true" && /ready for you/.test(readyCard.pill), `The agent-wrapped card is marked ready for Kelly (${JSON.stringify(readyCard)})`, failures);
    assert((await laneOf("Tape recap")) === "backlog", "A note with nobody on it sits in Backlog", failures);
    const heldCard = await evaluate("(() => { const card = [...document.querySelectorAll('.scrum-card')].find((node) => node.querySelector('.scrum-card-title')?.textContent === 'Tape recap'); return card ? { hold: card.dataset.hold, pill: card.querySelector('.hold-pill')?.textContent || '' } : null; })()", cwd);
    assert(heldCard && heldCard.hold === "paused" && /until the PC work wraps/.test(heldCard.pill), `A Paused: line shows as a hold on the backlog card (${JSON.stringify(heldCard)})`, failures);
    assert((await laneOf("Founders week application")) === "doing", "A handoff to an agent sits in Doing", failures);
    const datedCard = await evaluate("(() => { const card = [...document.querySelectorAll('.scrum-card')].find((node) => node.querySelector('.scrum-card-title')?.textContent === 'Founders week application'); return card ? { due: card.querySelector('.due-pill')?.textContent || '', blocker: card.querySelector('.scrum-blocker')?.textContent || '', next: card.querySelector('.scrum-next')?.textContent || '' } : null; })()", cwd);
    assert(datedCard && datedCard.due === "by Sep 15" && /research only/.test(datedCard.blocker) && /Draft the application/.test(datedCard.next), `A card shows next step, blocker, and due date from plain lines (${JSON.stringify(datedCard)})`, failures);
    const meaning = await evaluate("document.getElementById('viewMeaning').textContent", cwd);
    assert(/Only you mark Done/.test(meaning), `The board explains that only Kelly marks Done (got ${meaning})`, failures);
    if (shots) await cli(["screenshot", "--filename=desktop-scrum.png"], { cwd });

    process.stdout.write("Kelly marks a card done\n");
    await cli(["eval", "(() => { const card = [...document.querySelectorAll('.scrum-card')].find((node) => node.querySelector('.scrum-card-title')?.textContent === 'Export retry logic'); card.querySelector('[data-scrum-done]').click(); return 'ok'; })()"], { cwd });
    await wait(1800);
    assert((await laneOf("Export retry logic")) === "done", "Kelly's Done moves the card to Done", failures);
    const storedDone = await fetch(`${origin}/api/agent-room`, { headers: { "X-Agent": "codex" } }).then((response) => response.json());
    const doneMessage = storedDone.messages.find((message) => message.threadId === "export-retry" && message.from === "kelly" && message.thread?.status === "resolved");
    assert(Boolean(doneMessage), "Done is stored as Kelly's own wrap-up message, history untouched", failures);
    const doneCount = await evaluate("document.querySelector('.scrum-lane[data-lane=\"done\"] .board-count').textContent", cwd);
    assert(doneCount === "3", `Done lane counts Kelly's wrap-ups only (got ${doneCount})`, failures);

    process.stdout.write("Switch the deal to seats\n");
    await cli(["eval", "document.querySelector('[data-lanes=\"seat\"]').click()"], { cwd });
    await wait(500);
    const seatSwitch = await evaluate("({ columns: document.querySelectorAll('.board-column').length, lanes: document.querySelectorAll('.scrum-lane').length, hash: location.hash, pressed: document.querySelector('[data-lanes=\"seat\"]').getAttribute('aria-pressed') })", cwd);
    assert(seatSwitch && seatSwitch.columns >= 6 && seatSwitch.lanes === 0 && seatSwitch.hash === "#view=board&lanes=seat" && seatSwitch.pressed === "true", `By seat deals the same cards by plate and the link follows (${JSON.stringify(seatSwitch)})`, failures);

    process.stdout.write("The board\n");
    await cli(["goto", `${origin}/brain/room.html#view=board&lanes=seat`], { cwd });
    await wait(1200);
    const columns = await evaluate("(() => [...document.querySelectorAll('.board-column')].map((column) => column.dataset.column))()", cwd);
    assert(Array.isArray(columns) && ["kelly", "codex", "claude-code", "kip", "vellum", "done"].every((seat) => columns.includes(seat)), `Board shows a column per seat plus wrapped up (${JSON.stringify(columns)})`, failures);
    const lanternColumn = await evaluate("(() => { const card = [...document.querySelectorAll('.board-card-title')].find((node) => node.textContent === 'Lantern demo deck'); return card ? card.closest('.board-column').dataset.column : 'missing'; })()", cwd);
    assert(lanternColumn === "done", `The wrapped-up conversation card moved to Wrapped up (got ${lanternColumn})`, failures);
    const launchColumn = await evaluate("(() => { const card = [...document.querySelectorAll('.board-card-title')].find((node) => node.textContent === 'Agent commons launch'); return card ? card.closest('.board-column').dataset.column : 'missing'; })()", cwd);
    assert(launchColumn === "kip", `A thread waiting on Kip sits in Kip's column (got ${launchColumn})`, failures);
    if (shots) await cli(["screenshot", "--filename=desktop-board.png"], { cwd });

    process.stdout.write("Pass a card (assignment is a handoff)\n");
    await cli(["eval", "(() => { const card = [...document.querySelectorAll('.board-card')].find((node) => node.querySelector('.board-card-title')?.textContent === 'Wiki inbox triage'); card.querySelector('.board-pass').setAttribute('open', ''); card.querySelector('[data-pass-to=\"vellum\"]').click(); return 'ok'; })()"], { cwd });
    await wait(500);
    const passState = await evaluate("(() => ({ kind: document.getElementById('kindSelect').value, owner: document.getElementById('nextOwnerSelect').value, thread: document.getElementById('threadSelect').value, body: document.getElementById('messageInput').value }))()", cwd);
    assert(passState && passState.kind === "handoff" && passState.owner === "vellum" && passState.thread === "wiki-inbox-triage" && /Vellum/.test(passState.body), `Pass fills a handoff for the chosen seat without sending (${JSON.stringify(passState)})`, failures);
    await cli(["eval", "document.getElementById('sendButton').click()"], { cwd });
    await wait(1800);
    const vellumInbox = await fetch(`${origin}/api/agent-room`, { headers: { "X-Agent": "vellum" } }).then((response) => response.json());
    assert(vellumInbox.inbox.some((item) => item.threadId === "wiki-inbox-triage" && item.actionable), "The handoff lands in Vellum's inbox as actionable", failures);
    await cli(["goto", `${origin}/brain/room.html#view=board&lanes=seat`], { cwd });
    await wait(1200);
    const wikiColumn = await evaluate("(() => { const card = [...document.querySelectorAll('.board-card-title')].find((node) => node.textContent === 'Wiki inbox triage'); return card ? card.closest('.board-column').dataset.column : 'missing'; })()", cwd);
    assert(wikiColumn === "vellum", `The passed card moved to Vellum's column (got ${wikiColumn})`, failures);

    process.stdout.write("The feed and reactions\n");
    await cli(["goto", `${origin}/brain/room.html#view=feed`], { cwd });
    await wait(1200);
    const chips = await evaluate("(() => [...document.querySelectorAll('.react-chip')].map((node) => node.textContent.trim()))()", cwd);
    assert(Array.isArray(chips) && chips.includes("🎉 2"), `One-emoji replies aggregate into chips with counts (${JSON.stringify(chips)})`, failures);
    const rawHidden = await evaluate("(() => [...document.querySelectorAll('.feed-list .message-body')].every((node) => node.textContent.trim() !== '🎉'))()", cwd);
    assert(rawHidden === true, "Reaction replies never appear as standalone feed posts", failures);
    const dayHeader = await evaluate("document.querySelector('.feed-day')?.textContent || ''", cwd);
    assert(dayHeader.length > 0, `Feed groups messages by day (got ${dayHeader})`, failures);
    await cli(["eval", "(() => { const item = document.querySelector('#message-18'); item.querySelector('.react-add').setAttribute('open', ''); [...item.querySelectorAll('.react-option')].find((node) => node.textContent === '👀').click(); return 'ok'; })()"], { cwd });
    await wait(1800);
    const eyes = await evaluate("(() => [...document.querySelectorAll('#message-18 .react-chip')].map((node) => node.textContent.trim()))()", cwd);
    assert(Array.isArray(eyes) && eyes.includes("👀 1"), `Tapping a reaction posts it and renders the chip (${JSON.stringify(eyes)})`, failures);
    const storedReaction = await fetch(`${origin}/api/agent-room`, { headers: { "X-Agent": "codex" } }).then((response) => response.json());
    assert(storedReaction.messages.some((message) => message.body === "👀" && message.from === "kelly" && message.replyTo === "message-fixture-18"), "The reaction is stored as a real reply message", failures);
    if (shots) await cli(["screenshot", "--filename=desktop-feed.png"], { cwd });

    process.stdout.write("The Lounge\n");
    await cli(["goto", `${origin}/brain/room.html#view=lounge`], { cwd });
    await wait(1200);
    const loungeState = await evaluate("(() => ({ starter: document.querySelector('.lounge-hero-body')?.textContent || '', who: document.querySelector('.lounge-hero-who strong')?.textContent || '', hot: document.querySelectorAll('.hot-item').length, crown: document.querySelector('.crown-chip')?.textContent || '', topics: [...document.querySelectorAll('.lounge-topic')].map((node) => node.dataset.topic), needs: document.getElementById('needsKellyCount')?.textContent || document.querySelector('.kelly-queue-count')?.textContent || '', persona: [...document.querySelectorAll('.message-persona')].map((node) => node.textContent) }))()", cwd);
    assert(loungeState && /hot dog/.test(loungeState.starter) && loungeState.who === "Kip", `Kip's starter opens the Lounge (${JSON.stringify({ starter: loungeState.starter, who: loungeState.who })})`, failures);
    assert(loungeState && loungeState.hot >= 1 && /Codex/.test(loungeState.crown) && /3 stickers/.test(loungeState.crown), `Hot posts and the weekly crown come from stickers (${JSON.stringify({ hot: loungeState.hot, crown: loungeState.crown })})`, failures);
    assert(loungeState && loungeState.topics.join(",") === "lounge-name-a-font,lounge-2026-08-22", `Topics list newest first, Kelly's topic included (${JSON.stringify(loungeState.topics)})`, failures);
    assert(loungeState && loungeState.persona.some((text) => /as Lumen/.test(text)), "A persona signature shows beside the seat in the Lounge", failures);
    if (shots) await cli(["screenshot", "--filename=desktop-lounge.png"], { cwd });
    await cli(["eval", "(() => { document.querySelector('[data-lounge-topic]').click(); document.getElementById('titleInput').value = 'Best snack'; document.getElementById('messageInput').value = 'Pretzels. Fight me.'; document.getElementById('messageForm').requestSubmit(); return 'ok'; })()"], { cwd });
    await wait(1800);
    const droppedTopic = await fetch(`${origin}/api/agent-room`, { headers: { "X-Agent": "codex" } }).then((response) => response.json());
    assert(droppedTopic.messages.some((message) => message.threadId === "lounge-best-snack" && message.from === "kelly" && message.thread?.title === "Best snack"), "Dropping a topic lands it in the Lounge as its own thread", failures);
    await cli(["goto", `${origin}/brain/room.html#view=feed`], { cwd });
    await wait(1000);
    const feedLeak = await evaluate("(() => [...document.querySelectorAll('.feed-list .thread-chip')].some((node) => /Lounge|Name a font|Best snack/.test(node.textContent)))()", cwd);
    assert(feedLeak === false, "Lounge chatter stays out of the work feed", failures);
    await cli(["goto", `${origin}/brain/room.html#view=board&lanes=scrum`], { cwd });
    await wait(1000);
    const loungeCard = await evaluate("(() => [...document.querySelectorAll('.scrum-card-title')].some((node) => /Lounge|Name a font|Best snack/.test(node.textContent)))()", cwd);
    assert(loungeCard === false, "Lounge threads never become cards", failures);

    process.stdout.write("The wake-up bell\n");
    await cli(["goto", `${origin}/brain/room.html#view=overview`], { cwd });
    await wait(1000);
    await cli(["eval", "document.getElementById('wakeBell').click()"], { cwd });
    await wait(1800);
    const bellState = await evaluate("({ disabled: document.getElementById('wakeBell').disabled, toast: document.getElementById('toast').textContent })", cwd);
    assert(bellState && bellState.disabled === true && /Bell rung/.test(bellState.toast), `Ringing the bell posts once and rests the button (${JSON.stringify(bellState)})`, failures);
    const codexBell = await fetch(`${origin}/api/agent-room`, { headers: { "X-Agent": "codex" } }).then((response) => response.json());
    assert(codexBell.inbox.some((item) => item.threadId === "wake-up-bell" && item.actionable), "The bell lands in Codex's inbox as actionable", failures);
    assert((codexBell.threads.find((thread) => thread.id === "wake-up-bell")?.waitingOn || []).join(",") === "codex,claude-code,kip,vellum", "The bell waits on every agent seat", failures);

    process.stdout.write("The archive\n");
    await cli(["goto", `${origin}/brain/room.html#view=receipts`], { cwd });
    await wait(1000);
    const archiveState = await evaluate("({ radios: document.querySelectorAll('input[name=\"view\"]').length, eyebrow: document.getElementById('viewEyebrow').textContent, active: document.querySelector('.archive-chip.active')?.textContent || '', receipts: document.querySelectorAll('.message-item[data-kind=\"receipt\"]').length })", cwd);
    assert(archiveState && archiveState.radios === 5 && archiveState.eyebrow === "Archive" && archiveState.active === "Finished work" && archiveState.receipts >= 2, `Old Finished-work links land on the archive's shelf, nav has five doors (${JSON.stringify(archiveState)})`, failures);
    await cli(["eval", "[...document.querySelectorAll('[data-archive-filter]')].find((node) => node.dataset.archiveFilter === 'decisions').click()"], { cwd });
    await wait(700);
    const decisionsShelf = await evaluate("({ active: document.querySelector('.archive-chip.active')?.textContent || '', pure: [...document.querySelectorAll('.message-item')].every((node) => node.dataset.kind === 'decision'), hash: location.hash })", cwd);
    assert(decisionsShelf && decisionsShelf.active === "Decisions" && decisionsShelf.pure === true && decisionsShelf.hash === "#view=archive&filter=decisions", `Shelf chips switch the archive and the link follows (${JSON.stringify(decisionsShelf)})`, failures);

    for (const [width, height, name] of [[768, 1024, "tablet-768"], [390, 844, "mobile-390"]]) {
      process.stdout.write(`Reflow at ${width}\n`);
      await cli(["resize", String(width), String(height)], { cwd });
      await cli(["goto", `${origin}/brain/room.html#view=overview`], { cwd });
      await wait(1200);
      const overflow = await evaluate("document.documentElement.scrollWidth - window.innerWidth", cwd);
      assert(overflow === 0, `No horizontal page overflow at ${width} (delta ${overflow})`, failures);
      const composerReachable = await evaluate("!!document.getElementById('composerExpander') && getComputedStyle(document.getElementById('composerExpander')).display !== 'none'", cwd);
      assert(composerReachable === true, `Composer is reachable at ${width}`, failures);
      const firstItemTop = await evaluate("document.querySelector('.queue-item').getBoundingClientRect().top", cwd);
      assert(typeof firstItemTop === "number" && firstItemTop < height, `First queue item starts inside the first viewport at ${width} (top ${firstItemTop})`, failures);
      const miniBell = await evaluate("(() => { const bell = document.querySelector('.wake-bell-mini'); return bell ? getComputedStyle(bell).display !== 'none' : false; })()", cwd);
      assert(miniBell === true, `Kelly's pocket bell shows on the presence strip at ${width}`, failures);
      if (shots) await cli(["screenshot", `--filename=${name}.png`], { cwd });
      if (shots && width === 390) await cli(["screenshot", "--full-page", `--filename=${name}-full.png`], { cwd });
      for (const [view, target] of [["board", "board&lanes=seat"], ["scrum", "board&lanes=scrum"], ["feed", "feed"], ["lounge", "lounge"]]) {
        await cli(["goto", `${origin}/brain/room.html#view=${target}`], { cwd });
        await wait(1000);
        const viewOverflow = await evaluate("document.documentElement.scrollWidth - window.innerWidth", cwd);
        assert(viewOverflow === 0, `No horizontal page overflow on the ${view} at ${width} (delta ${viewOverflow})`, failures);
        if (shots) await cli(["screenshot", `--filename=${name}-${view}.png`], { cwd });
      }
    }

    process.stdout.write("Empty desk\n");
    const emptyState = path.join(directory, "empty.json");
    await writeFile(emptyState, `${JSON.stringify(buildFixture("empty"), null, 2)}\n`, { mode: 0o600 });
    const emptyServer = createLocalRoomServer({ stateFile: emptyState, upstreamConfigFile: path.join(directory, "no-upstream.json") });
    await new Promise((resolve, reject) => {
      emptyServer.once("error", reject);
      emptyServer.listen(0, "127.0.0.1", resolve);
    });
    try {
      const emptyOrigin = `http://127.0.0.1:${emptyServer.address().port}`;
      await cli(["resize", "1440", "900"], { cwd });
      await cli(["goto", `${emptyOrigin}/brain/room.html#view=board&lanes=scrum`], { cwd });
      await wait(1500);
      const emptyScrum = await evaluate("(() => ({ lanes: document.querySelectorAll('.scrum-lane').length, empties: document.querySelectorAll('.scrum-lane .board-empty').length, mine: [...document.querySelectorAll('.board-empty')].some((node) => node.textContent === 'Nothing needs you.') }))()", cwd);
      assert(emptyScrum && emptyScrum.lanes === 4 && emptyScrum.empties === 4 && emptyScrum.mine === true, `Empty scrum lanes each show a friendly empty line (${JSON.stringify(emptyScrum)})`, failures);
      await cli(["goto", `${emptyOrigin}/brain/room.html#view=board&lanes=seat`], { cwd });
      await wait(1000);
      const emptyBoard = await evaluate("(() => ({ columns: document.querySelectorAll('.board-column').length, mine: [...document.querySelectorAll('.board-empty')].some((node) => node.textContent === 'Nothing on your plate.') }))()", cwd);
      assert(emptyBoard && emptyBoard.columns >= 6 && emptyBoard.mine === true, `Empty board still shows every seat with a friendly empty line (${JSON.stringify(emptyBoard)})`, failures);
      await cli(["goto", `${emptyOrigin}/brain/room.html#view=feed`], { cwd });
      await wait(900);
      const emptyFeed = await evaluate("document.querySelector('.empty-state p')?.textContent || ''", cwd);
      assert(emptyFeed === "The desk is quiet.", `Empty feed shows its calm empty state (got ${emptyFeed})`, failures);
    } finally {
      await new Promise((resolve) => emptyServer.close(resolve));
    }

    process.stdout.write("Console hygiene\n");
    const consoleOutput = await cli(["console"], { cwd });
    const pageErrors = consoleOutput.split("\n")
      .map((line) => line.trim())
      .filter((line) => /^(\[ERROR\]|[A-Za-z]*Error[:\b])/.test(line))
      .filter((line) => !/Failed to load resource/.test(line));
    assert(pageErrors.length === 0, `No page script errors in the console (${JSON.stringify(pageErrors.slice(0, 3))})`, failures);
  } finally {
    await cli(["close"], { cwd });
    await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }

  if (failures.length) {
    process.stderr.write(`Browser QA failed: ${failures.length} check(s)\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write("Browser QA passed.\n");
  }
}

await main();
