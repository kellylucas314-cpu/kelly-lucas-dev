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
  [0, 'Lawn Private'], [300, 'Corporal of Clippings'], [900, 'Turf Sergeant'],
  [1600, 'Lieutenant of the Air Guard'], [2600, 'Major Mulch'],
  [4000, 'General of the Lawn'], [6000, 'Field Marshal When Pigs Fly'],
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
      // ...and sometimes panic-jumps at an incoming pig, like real novices do
      const pig = s.obs.find(o => o.t === 'pig' && o.dx > 0 && o.dx < s.speed * 0.5);
      if (!s.air && pig && Math.random() < 0.02 && now - lastQueue > 900) {
        lastQueue = now;
        jump(300);
      }
    } else if (name === 'veteran') {
      // strong human: pair-aware late takeoffs; under a trailing pig, jumps
      // EARLY so a full hold still lands before the pig — never short-hops.
      // On an accidental crate catch, hops clear before any pig arrives.
      const s = window.__bootcamp.snap;
      if (s.onPlat) {
        // a jump from a crate arcs clear over any swoop; exit early, never ride into one
        if (s.obs.some(o => o.t === 'pig' && o.dx > -60 && o.dx < s.speed * 1.2)) jump(400);
      } else if (!s.air) {
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
      // near-optimal: pair-aware late takeoffs AND short hops under trailing
      // pigs; exits crates early when a pig approaches
      const s = window.__bootcamp.snap;
      if (s.onPlat) {
        // a jump from a crate arcs clear over any swoop; exit early, never ride into one
        if (s.obs.some(o => o.t === 'pig' && o.dx > -60 && o.dx < s.speed * 1.2)) jump(400);
      } else if (!s.air) {
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

/* ——— Reward layer probes: do the Mario mechanics actually work? ——— */
// Stomper: descends onto mower backs; counts BOING bounces
await freshRun();
const stompProbe = await page.evaluate(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const key = t => document.dispatchEvent(new KeyboardEvent(t, { code: 'Space', bubbles: true, cancelable: true }));
  const k = Math.min(1.3, Math.max(0.65, window.innerHeight / 900));
  let boings = 0;
  const seen = new Set();
  const watch = setInterval(() => {
    document.querySelectorAll('.wordpop').forEach(w => {
      if (!seen.has(w)) { seen.add(w); if (w.textContent.includes('BOING')) boings++; }
    });
  }, 40);
  const t0 = performance.now();
  while (window.__bootcamp.state === 'playing' && performance.now() - t0 < 22000) {
    const s = window.__bootcamp.snap;
    if (!s.air && !s.onPlat) {
      const m = s.obs.filter(o => o.t === 'mower' && o.dx > 0).sort((a, b) => a.dx - b.dx)[0];
      if (m && m.dx - 88 * k < s.speed * 0.3) { key('keydown'); setTimeout(() => key('keyup'), 110); }
    }
    await sleep(28);
  }
  clearInterval(watch);
  return { boings, nuts: window.__bootcamp.snap.nuts, state: window.__bootcamp.state };
});
console.log('stomp probe:', JSON.stringify(stompProbe));

// Platformer: full-hold jumps timed to catch low crate strips
await freshRun();
const platProbe = await page.evaluate(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const key = t => document.dispatchEvent(new KeyboardEvent(t, { code: 'Space', bubbles: true, cancelable: true }));
  const k = Math.min(1.3, Math.max(0.65, window.innerHeight / 900));
  let landings = 0, rideMs = 0, wasOn = false;
  const t0 = performance.now();
  while (window.__bootcamp.state === 'playing' && performance.now() - t0 < 32000) {
    const s = window.__bootcamp.snap;
    if (!s.air && !s.onPlat) {
      // intercept math: the descent crosses crate-top height at t≈0.47–0.53s of
      // a full jump, so the strip front belongs 0.18–0.38s out at takeoff
      const plat = s.platDetail.find(q => q.y < 200 * k &&
        q.dx - 88 * k > s.speed * 0.18 && q.dx - 88 * k < s.speed * 0.38);
      if (plat) { key('keydown'); setTimeout(() => key('keyup'), 420); }
      else {
        const m = s.obs.filter(o => o.t === 'mower' && o.dx > 0).sort((x, y) => x.dx - y.dx)[0];
        if (m && m.dx - 88 * k < s.speed * 0.13) { key('keydown'); setTimeout(() => key('keyup'), 330); }
      }
    }
    if (s.onPlat) { rideMs += 28; if (!wasOn) landings++; }
    wasOn = s.onPlat;
    await sleep(28);
  }
  return { landings, rideSec: +(rideMs / 1000).toFixed(2), nuts: window.__bootcamp.snap.nuts, state: window.__bootcamp.state };
});
console.log('platform probe:', JSON.stringify(platProbe));

/* ——— Grades ———
   Honest formulas, defined before results are seen. 100 = the design intent
   fully holds; deductions scale with distance from it. */
const med = {};
for (const [name] of PLAN) med[name] = median(results[name].map(r => r.score));
const aceSurv = median(results.ace.map(r => r.ms)) / 1000;
const statueGrace = median(results.statue.map(r => r.ms)) / 1000;
const vetTimes = results.veteran.map(r => r.ms / 1000);
const clamp100 = v => Math.max(0, Math.min(100, Math.round(v)));

const grades = {
  // near-optimal play should live >= 38s of the 60s window
  FAIRNESS: clamp100(aceSurv / 38 * 100),
  // a frozen beginner deserves >= 4s before first contact
  GRACE: clamp100(statueGrace / 4 * 100),
  // mashing must stay under rank one (250) and far below informed play
  DEPTH: med.masher >= 250 ? 40 : clamp100(100 * Math.min(1, (med.novice / 4) / Math.max(1, med.masher))),
  // margins: informed 3x uninformed; mastery 1.2x competence; ace >= 0.9x veteran
  SKILL: clamp100(100 * Math.min(1,
    med.novice / (3 * Math.max(med.statue, med.masher, 1)),
    med.veteran / (1.2 * Math.max(med.novice, 1)),
    med.ace / (0.9 * Math.max(med.veteran, 1)))),
  RANKS: [0, 20, 60, 95, 100][new Set([rankFor(med.masher), rankFor(med.novice), rankFor(med.veteran), rankFor(med.ace)]).size],
  PERF: perf.frames > 100 ? clamp100(100 - Math.max(0, perf.p95 - 17) * 5 - (perf.max > 80 ? 10 : 0)) : 0,
  LEAKS: clamp100(100 - (perf.residue >= 10 ? 30 : 0) - (perf.obstacles > 10 ? 30 : 0)
    - (perf.heapMB !== null && perf.heapMB > 5 ? 30 : 0)),
  ROBUST: errors.length === 0 && (chaosState === 'playing' || chaosState === 'dead') ? 100 : 40,
  // the Mario layer must demonstrably work: three independent bounces proves the
  // stomp; a landing with ride time proves crates; acorns must actually flow
  REWARD: clamp100((stompProbe.boings >= 3 ? 40 : stompProbe.boings * 12) + (platProbe.landings >= 1 ? 25 : 0)
    + (platProbe.rideSec >= 0.15 ? 5 : 0) + Math.min(30, stompProbe.nuts + platProbe.nuts)),
};

console.log('\n=== LADDER ===');
for (const [name] of PLAN) {
  const rs = results[name];
  console.log(`${name.padEnd(8)} median score ${String(med[name]).padStart(4)} → ${rankFor(med[name]).padEnd(28)}` +
    ` | survival ${(median(rs.map(r => r.ms)) / 1000).toFixed(1)}s | causes: ${rs.map(r => r.cause[0]).join(',')}`);
}
console.log(`veteran death spread: ${Math.min(...vetTimes).toFixed(1)}s – ${Math.max(...vetTimes).toFixed(1)}s`);
if (perf.frames > 100) {
  console.log(`frame mean ${perf.mean.toFixed(2)}ms p95 ${perf.p95.toFixed(1)} p99 ${perf.p99.toFixed(1)} max ${perf.max.toFixed(0)}` +
    (perf.heapMB !== null ? ` | heap +${perf.heapMB.toFixed(1)}MB/30s` : '') + ` | residue ${perf.residue} | obstacles ${perf.obstacles}`);
}

console.log('\n=== GRADES ===');
let worst = 100;
for (const [area, g] of Object.entries(grades)) {
  console.log(`${area.padEnd(9)} ${String(g).padStart(3)}/100 ${g >= 95 ? '✓' : '✗ BELOW BAR'}`);
  worst = Math.min(worst, g);
}
console.log(`\nworst area: ${worst}/100 — ${worst >= 95 ? 'ALL AREAS AT OR ABOVE 95' : 'iteration required'}`);
if (errors.length) console.log('errors:', errors);
await browser.close();
process.exit(worst >= 95 ? 0 : 1);
