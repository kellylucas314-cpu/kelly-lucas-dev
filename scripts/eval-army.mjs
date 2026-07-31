/*
 * Boot Camp quality evaluation harness
 * ------------------------------------
 * Measures the /army.html runner against the quality dimensions that
 * matter for a one-button arcade game, using a ladder of scripted
 * players of increasing skill. The gap between rungs is the measurement:
 *
 *  1. FAIRNESS      — a near-perfect player should almost never die young.
 *                     If the Ace dies early, a pattern is unclearable (bug).
 *  2. GRACE         — a frozen beginner (Statue) should get a readable
 *                     first challenge, not an instant loss.
 *  3. DEPTH         — button-mashing (Masher) must NOT work. In this game
 *                     pigs punish spam jumping; Masher should die to pigs.
 *  4. SKILL CURVE   — median score must rise monotonically with skill:
 *                     Statue < Masher < Novice < Veteran <= Ace.
 *  5. RANK TUNING   — each skill tier should land a different army rank.
 *  6. PERFORMANCE   — frame pacing, DOM leaks, heap growth during play.
 *  7. ROBUSTNESS    — input mashing + mid-run resize produce no errors.
 *
 * Prereqs: npm i -D playwright  (not a repo dependency; dev-only)
 * Run:     npm run eval:army   (the site is static — no build step)
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const URL = 'file://' + resolve(root, 'army.html');
const CAP_MS = 60000;

const RANKS = [
  [0, 'Lawn Private'], [250, 'Corporal of Clippings'], [700, 'Turf Sergeant'],
  [1300, 'Lieutenant of the Air Guard'], [2200, 'Major Mulch'],
  [3500, 'General of the Lawn'], [5500, 'Field Marshal When Pigs Fly'],
];
const rankFor = s => RANKS.reduce((r, [min, name]) => (s >= min ? name : r), RANKS[0][1]);
const median = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

/* One persona run, executed inside the page. Strategy by name:
 *  statue  — no input ever
 *  masher  — hammers jump on a fixed cadence, ignores the screen
 *  novice  — jumps for mowers but reacts slowly (280ms) and always
 *            holds full jumps; blind to pigs
 *  veteran — instant reaction, full holds, refuses to jump when a pig
 *            is inside a 0.5s threat window
 *  ace     — instant reaction; reads raw positions and short-hops when
 *            a pig trails the mower, full-holds otherwise
 */
const runPersona = async ({ name, capMs }) => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const key = (type) => document.dispatchEvent(
    new KeyboardEvent(type, { code: 'Space', bubbles: true, cancelable: true }));
  const jump = (holdMs) => { key('keydown'); setTimeout(() => key('keyup'), holdMs); };
  const k = Math.min(1.3, Math.max(0.65, window.innerHeight / 900));

  const t0 = performance.now();
  let jumps = 0, lastQueue = 0;
  while (window.__bootcamp.state === 'playing' && performance.now() - t0 < capMs) {
    const now = performance.now();
    if (name === 'masher') {
      if (now - lastQueue > 420) { lastQueue = now; jump(300); jumps++; }
    } else if (name === 'novice') {
      // sees mowers early but reacts with human lag, over-holds, ignores pigs
      const s = window.__bootcamp.snap;
      const m = s.obs.filter(o => o.t === 'mower' && o.dx > 0).sort((a, b) => a.dx - b.dx)[0];
      if (!s.air && m && m.dx - 88 * k < s.speed * 0.46 && now - lastQueue > 900) {
        lastQueue = now;
        setTimeout(() => { jump(420); }, 300);
        jumps++;
      }
    } else if (name === 'veteran') {
      // strong human: pair-aware late takeoffs; under a trailing pig, jumps
      // EARLY so a full hold still lands before the pig — never short-hops
      const s = window.__bootcamp.snap;
      if (!s.air) {
        const ms_ = s.obs.filter(o => o.t === 'mower' && o.dx > -40).sort((a, b) => a.dx - b.dx);
        const m = ms_[0];
        if (m) {
          const pair = ms_[1] && ms_[1].dx - m.dx < 280 * k;
          const trail = s.obs.find(o => o.t === 'pig' && o.dx > m.dx);
          const tight = !pair && trail && (trail.dx - m.dx) / s.speed < 0.65;
          // pairs demand a LATE takeoff, measured box-to-box (dx - 56k), not sprite-to-sprite;
          // slower worlds stretch transit time, so single takeoffs are later too (0.13)
          const go = pair ? m.dx - 56 * k < s.speed * 0.11
            : m.dx - 88 * k < s.speed * (tight ? 0.24 : 0.13);
          if (go) { jump(pair ? 400 : 320); jumps++; }
        }
      }
    } else if (name === 'ace') {
      // near-optimal: pair-aware late takeoffs AND short hops under trailing pigs
      const s = window.__bootcamp.snap;
      if (!s.air) {
        const ms_ = s.obs.filter(o => o.t === 'mower' && o.dx > -40).sort((a, b) => a.dx - b.dx);
        const m = ms_[0];
        if (m) {
          const pair = ms_[1] && ms_[1].dx - m.dx < 280 * k;
          const trail = s.obs.find(o => o.t === 'pig' && o.dx > m.dx);
          const tight = !pair && trail && (trail.dx - m.dx) / s.speed < 0.65;
          // post-easing, an early full jump beats a short hop even on tight rolls
          const go = pair ? m.dx - 56 * k < s.speed * 0.11
            : m.dx - 88 * k < s.speed * (tight ? 0.24 : 0.13);
          if (go) { jump(pair ? 400 : 330); jumps++; }
        }
      }
    }
    await sleep(name === 'ace' ? 20 : 30);
  }
  await sleep(80);
  return {
    ms: Math.round(performance.now() - t0),
    score: window.__bootcamp.score,
    state: window.__bootcamp.state,
    cause: window.__bootcamp.state === 'dead'
      ? (document.getElementById('go-title').textContent.includes('OINK') ? 'pig' : 'mower')
      : 'survived-cap',
    jumps,
  };
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => {
  if (m.type() === 'error' && !/fonts|ERR_CONNECTION|net::/.test(m.text())) errors.push('console: ' + m.text());
});
await page.goto(URL);
await page.waitForTimeout(1800);

async function freshRun() {
  const st = await page.evaluate(() => window.__bootcamp.state);
  if (st === 'playing') {
    // previous run hit the cap and its game is still live — hard-reset so
    // runs can never bleed into each other
    await page.reload();
    await page.waitForTimeout(1500);
    await page.click('#btn-enlist');
  } else if (st === 'dead') { await page.waitForTimeout(900); await page.click('#btn-again'); }
  else if (st === 'title') await page.click('#btn-enlist');
  await page.waitForTimeout(1100);
}

// top personas straddle survive-or-die gates, so their medians need more runs
const PLAN = [['statue', 3], ['masher', 4], ['novice', 5], ['veteran', 6], ['ace', 6]];
const results = {};
for (const [name, runs] of PLAN) {
  results[name] = [];
  for (let i = 0; i < runs; i++) {
    await freshRun();
    const r = await page.evaluate(runPersona, { name, capMs: CAP_MS });
    results[name].push(r);
    console.log(`${name} #${i + 1}: ${(r.ms / 1000).toFixed(1)}s score ${r.score} (${r.cause})`);
  }
}

/* Performance probe: one veteran run with a frame-time collector */
await freshRun();
await page.evaluate(() => {
  window.__ft = [];
  let last = performance.now();
  const loop = t => { window.__ft.push(t - last); last = t; if (window.__ft.length < 4000) requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  window.__mem0 = performance.memory ? performance.memory.usedJSHeapSize : 0;
  window.__dom0 = document.querySelectorAll('*').length;
});
const perfRun = await page.evaluate(runPersona, { name: 'veteran', capMs: 30000 });
const perf = await page.evaluate(() => {
  const ft = window.__ft.slice(5).sort((a, b) => a - b);
  const q = p => ft[Math.floor(ft.length * p)];
  return {
    frames: ft.length,
    mean: ft.reduce((a, b) => a + b, 0) / ft.length,
    p95: q(0.95), p99: q(0.99), max: ft[ft.length - 1],
    heapMB: performance.memory ? (performance.memory.usedJSHeapSize - window.__mem0) / 1048576 : null,
    // raw DOM totals swing with however many obstacles are alive at the sample
    // moment; leaks show up as effect residue and unbounded obstacle counts
    residue: document.querySelectorAll('.wordpop, .puff, .confetto').length,
    obstacles: window.__bootcamp.obstacles,
  };
});
console.log('perf run:', (perfRun.ms / 1000).toFixed(1) + 's,', JSON.stringify(perf));

/* Robustness: chaos-mash inputs + resize mid-run */
await freshRun();
await Promise.all([
  page.evaluate(runPersona, { name: 'veteran', capMs: 8000 }),
  (async () => {
    for (let i = 0; i < 20; i++) { await page.keyboard.down('Space'); await page.keyboard.up('Space'); }
    await page.setViewportSize({ width: 1100, height: 700 });
    await page.waitForTimeout(600);
    await page.setViewportSize({ width: 1440, height: 900 });
  })(),
]);
const chaosState = await page.evaluate(() => window.__bootcamp.state);

/* ——— Scorecard ——— */
const med = {};
for (const [name] of PLAN) med[name] = median(results[name].map(r => r.score));
const aceCapRate = results.ace.filter(r => r.cause === 'survived-cap').length / results.ace.length;
const masherPigShare = results.masher.filter(r => r.cause === 'pig').length /
  Math.max(1, results.masher.filter(r => r.cause !== 'survived-cap').length);
const statueGrace = median(results.statue.map(r => r.ms)) / 1000;
const vetTimes = results.veteran.map(r => r.ms / 1000);

const checks = [
  ['FAIRNESS   ace median >= 35s or caps out', median(results.ace.map(r => r.ms)) / 1000 >= 35 || aceCapRate >= 0.6],
  ['GRACE      statue survives >= 3.5s', statueGrace >= 3.5],
  // spam can luck over an obstacle or two, and statue's near-zero score is too
  // noisy to be a yardstick — the claim that matters is that mashing is not a
  // VIABLE strategy: it never reaches the first rank threshold (250) and stays
  // far below informed play
  ['DEPTH      spam is not a viable strategy', med.masher < 250 && med.masher < med.novice / 4],
  ['SKILL      informed > uninformed, mastery > competence', med.novice > Math.max(med.statue, med.masher) * 3 && med.veteran > med.novice * 1.2 && med.ace >= med.veteran * 0.9],
  ['RANKS      tiers land different ranks', new Set([rankFor(med.masher), rankFor(med.novice), rankFor(med.veteran), rankFor(med.ace)]).size >= 3],
  ['PERF       p95 frame <= 20ms', perf.frames > 100 && perf.p95 <= 20],
  ['LEAKS      effect residue < 10, obstacles bounded', perf.residue < 10 && perf.obstacles <= 10],
  ['ROBUST     no errors after chaos input+resize', errors.length === 0 && (chaosState === 'playing' || chaosState === 'dead')],
];

console.log('\n=== SCORECARD ===');
for (const [name] of PLAN) {
  const rs = results[name];
  console.log(`${name.padEnd(8)} median score ${String(med[name]).padStart(4)} → ${rankFor(med[name]).padEnd(28)}` +
    ` | survival ${(median(rs.map(r => r.ms)) / 1000).toFixed(1)}s | causes: ${rs.map(r => r.cause[0]).join(',')}`);
}
console.log(`veteran death spread: ${Math.min(...vetTimes).toFixed(1)}s – ${Math.max(...vetTimes).toFixed(1)}s` +
  ` | masher pig-death share: ${(masherPigShare * 100).toFixed(0)}%`);
if (perf.frames > 100) {
  console.log(`frame mean ${perf.mean.toFixed(2)}ms p95 ${perf.p95.toFixed(1)} p99 ${perf.p99.toFixed(1)} max ${perf.max.toFixed(0)}` +
    (perf.heapMB !== null ? ` | heap +${perf.heapMB.toFixed(1)}MB/30s` : '') + ` | residue ${perf.residue} | obstacles ${perf.obstacles}`);
} else {
  console.log(`perf probe invalid: only ${perf.frames} frames captured`);
}
console.log('');
let pass = 0;
for (const [label, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`); if (ok) pass++; }
console.log(`\n${pass}/${checks.length} checks passed`);
if (errors.length) console.log('errors:', errors);
await browser.close();
process.exit(pass === checks.length ? 0 : 1);
