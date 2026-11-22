// Paints the About page's watercolor pieces with the film's own brushes.
//   node scripts/paint-about.cjs /path/to/f1-watercolor/source/scene.html
// The film's scene.html (in the project files, not in this repo) carries the
// brushes: wash(), cloud(), conifer(), paintMountains(), paintDuck() and the
// helmet. This loads it in headless Chromium, paints each piece on a canvas
// and writes WebPs with alpha into assets/art/about/. Needs playwright.
// Everything is seeded, so a rerun paints the same pictures.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const scene = process.argv[2];
if (!scene || !fs.existsSync(scene)) {
  console.error('usage: node scripts/paint-about.cjs <scene.html>');
  process.exit(1);
}
const OUT = path.join(__dirname, '..', 'assets', 'art', 'about');

/* runs in the page, next to the film's brushes */
function paint() {
  const out = {};
  const save = (name, c, w, q = 0.8) => {
    const h = Math.round(c.height * w / c.width);
    const t = document.createElement('canvas'); t.width = w; t.height = h;
    const x = t.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, w, h);
    out[name] = t.toDataURL('image/webp', q);
  };
  const cv = (w, h) => mk(w, h, 1);
  const rgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  // paper tooth: the film's grain, only where there is paint
  const tooth = (c, amt = 0.6) => {
    const t = document.createElement('canvas'); t.width = c.width; t.height = c.height;
    const tx = t.getContext('2d'); tx.fillStyle = tx.createPattern(grain, 'repeat'); tx.fillRect(0, 0, t.width, t.height);
    tx.globalCompositeOperation = 'destination-in'; tx.drawImage(c, 0, 0);
    const x = c.getContext('2d'); x.save(); x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = 'soft-light'; x.globalAlpha = amt; x.drawImage(t, 0, 0); x.restore();
  };
  // pigment settling unevenly, only where there is paint
  const mottle = (c, x, seed, deep, w, h, a = 0.55) => {
    x.save(); x.globalCompositeOperation = 'source-atop'; x.globalAlpha = a;
    x.drawImage(cloud(seed, rgb(deep), 0.3), 0, 0, w, h);
    x.drawImage(cloud(seed + 1, [255, 250, 240], 0.3), 0, 0, w, h);
    x.restore();
  };

  // ---- a soft wash: a wobbly pool of colour with a second pigment dropped in wet and pale blooms
  function blob(w, h, cols, seed, o = {}) {
    const [c, x] = cv(w, h); const r = R(seed);
    wash(x, o.shape || circ(w / 2, h / 2, w * 0.33, h * 0.3, 11), { colors: cols, seed, layers: o.layers || 24, alpha: o.alpha || 0.05, k: o.k || 0.3, seg: Math.max(40, w / 8), base: 3, extra: 2 });
    x.globalCompositeOperation = 'source-atop';
    if (o.drop) for (let i = 0; i < 4; i++) { const cx = w * (0.25 + r() * 0.5), cy = h * (0.3 + r() * 0.4), rr = w * (0.07 + r() * 0.1); wash(x, circ(cx, cy, rr * 1.5, rr), { colors: o.drop, seed: seed + 20 + i, layers: 10, alpha: 0.045, k: 0.35, seg: 40 }); }
    for (let i = 0; i < 4; i++) { const cx = w * (0.2 + r() * 0.6), cy = h * (0.25 + r() * 0.5), rr = w * (0.05 + r() * 0.09); wash(x, circ(cx, cy, rr * 1.6, rr * 0.8), { color: '#fffaf0', seed: seed + 40 + i, layers: 9, alpha: 0.04, k: 0.35, seg: 40 }); }
    x.globalCompositeOperation = 'source-over';
    mottle(c, x, seed + 7, o.deep || cols[0], w, h);
    tooth(c); return c;
  }
  save('wash-sky', blob(900, 700, ['#4b8cc6', '#63a2d6', '#7db4dc'], 311, { drop: ['#9db0d2', '#a9a3d0'], deep: '#3d6fa8' }), 760, 0.72);
  save('wash-lilac', blob(900, 700, ['#a9a3d0', '#b9bfe0', '#9db0d2'], 322, { drop: ['#f6cfae', '#d9a8c8'], deep: '#7f86b8' }), 760, 0.72);
  save('wash-honey', blob(900, 700, ['#f1bd45', '#f6d04a', '#f6b851'], 333, { drop: ['#e88524', '#f2a13a'], deep: '#c9772e' }), 760, 0.72);
  save('wash-coral', blob(900, 700, ['#e88a7c', '#f3bfa0', '#dc5f55'], 344, { drop: ['#f6cfae', '#e89a2a'], deep: '#b2433f' }), 760, 0.72);
  save('wash-teal', blob(900, 700, ['#7fd0d8', '#62bfc8', '#9fe0dc'], 355, { drop: ['#49a6d6', '#3b8fd0'], deep: '#2a7f8a' }), 760, 0.72);

  // ---- the sky across the top of the page: the film's sky, with no picture under it
  { const W2 = 2000, H2 = 560, [c, x] = cv(W2, H2), r = R(11);
    for (let i = 0; i < 15; i++) { const y = r() * 250 - 30, x0 = -250 + r() * W2, w = 420 + r() * 900, h = 40 + r() * 90;
      wash(x, [[x0, y], [x0 + w * 0.5, y - h * 0.3], [x0 + w, y + h * 0.2], [x0 + w * 0.6, y + h], [x0 + w * 0.1, y + h * 0.8]], { colors: ['#4b8cc6', '#63a2d6', '#7db4dc'], seed: 100 + i, layers: 14, alpha: 0.04, k: 0.3 }); }
    for (let i = 0; i < 9; i++) { const cx = r() * W2, cy = 250 + r() * 170, rr = 80 + r() * 140;
      wash(x, circ(cx, cy, rr * 1.9, rr * 0.5), { colors: ['#fbe9bd', '#f8d6b4', '#fff4d8'], seed: 200 + i, layers: 10, alpha: 0.045, k: 0.3 }); }
    for (let i = 0; i < 6; i++) { const cx = r() * W2, cy = 40 + r() * 150, rr = 50 + r() * 80;
      wash(x, circ(cx, cy, rr * 1.6, rr * 0.6), { color: '#eaf3f4', seed: 300 + i, layers: 9, alpha: 0.04, k: 0.35 }); }
    x.globalCompositeOperation = 'destination-out'; const g = x.createLinearGradient(0, 330, 0, H2); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)'); x.fillStyle = g; x.fillRect(0, 330, W2, H2 - 330);
    x.globalCompositeOperation = 'source-over'; mottle(c, x, 411, '#3d6fa8', W2, H2, 0.35);   // no tooth here: the page's own paper shows through
    save('sky', c, 1600, 0.55); }

  // ---- the lake across the foot of the page: the ducks get their water back
  { const W2 = 2000, H2 = 640, Y = 84, [c, x] = cv(W2, H2), r = R(83);
    wash(x, [[-80, Y], [420, Y - 8], [980, Y + 6], [1520, Y - 6], [W2 + 80, Y], [W2 + 80, H2 + 80], [-80, H2 + 80]], { colors: ['#a2e0e2', '#7fd0d8', '#62bfe4', '#9fe0dc'], seed: 801, layers: 26, alpha: 0.07, k: 0.045, seg: 70, base: 2, extra: 2 });
    x.globalCompositeOperation = 'source-atop';
    const g = x.createLinearGradient(0, Y, 0, H2); g.addColorStop(0, 'rgba(228,245,238,0.5)'); g.addColorStop(0.3, 'rgba(98,191,228,0.0)'); g.addColorStop(1, 'rgba(58,127,208,0.5)'); x.fillStyle = g; x.fillRect(0, 0, W2, H2);
    for (let i = 0; i < 18; i++) { const cx = r() * W2, cy = Y + 60 + r() * (H2 - Y - 60), rw = 140 + r() * 280, rh = 34 + r() * 76; wash(x, circ(cx, cy, rw, rh), { colors: ['#7fd0d8', '#49a6d6', '#3a7fd0', '#9fe0dc'], seed: 900 + i, layers: 9, alpha: 0.05, k: 0.3, seg: 50 }); }
    // the trees on the far shore, let down into the water
    const refl = [PAL.orange.c, PAL.green.c, PAL.purple.c, PAL.amber.c, PAL.orange.c];
    for (let i = 0; i < 18; i++) { const cx = r() * W2, l = 90 + r() * 170, ww = 16 + r() * 34, cols = refl[(r() * refl.length) | 0];
      wash(x, [[cx - ww, Y - 4], [cx + ww, Y - 4], [cx + ww * 0.7, Y + l], [cx - ww * 0.6, Y + l * 0.9]], { colors: [cols[0], cols[1]], seed: 1100 + i, layers: 8, alpha: 0.026, k: 0.3, seg: 30 }); }
    for (let i = 0; i < 54; i++) { const cx = r() * W2, y0 = Y + 6 + r() * 160, l = 70 + r() * 220, ww = 6 + r() * 20;
      wash(x, [[cx - ww, y0], [cx + ww, y0], [cx + ww * 0.5, y0 + l], [cx - ww * 0.4, y0 + l * 0.9]], { colors: ['#2f6fc4', '#2a58b0', '#3b8fd0'], seed: 1200 + i, layers: 7, alpha: 0.028, k: 0.24, seg: 26 }); }
    // ripples: short pale strokes, longer toward the front
    x.lineCap = 'round'; x.strokeStyle = '#f4fbfa';
    for (let i = 0; i < 300; i++) { const y = Y + 30 + Math.pow(r(), 0.8) * (H2 - Y - 40), xx = r() * W2, l = 18 + r() * 90 * (0.5 + (y - Y) / (H2 - Y));
      x.globalAlpha = 0.16 + r() * 0.3; x.lineWidth = 1 + r() * 1.6; x.beginPath(); x.moveTo(xx, y); x.quadraticCurveTo(xx + l / 2, y + (r() - 0.5) * 5, xx + l, y + (r() - 0.5) * 2); x.stroke(); }
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; mottle(c, x, 421, '#2a58b0', W2, H2, 0.4); tooth(c);
    save('lake', c, 1800, 0.74); }

  // ---- a sun, for the day job that reads light
  { const [c, x] = cv(640, 640), r = R(71);
    for (let i = 0; i < 14; i++) { if (i === 3 || i === 9) continue; const a = i / 14 * 6.2832 + (r() - 0.5) * 0.12, r0 = 168 + r() * 16, r1 = 232 + r() * 54, w0 = 15 + r() * 7, w1 = 5 + r() * 5;
      const p = (rad, off) => [320 + Math.cos(a) * rad - Math.sin(a) * off, 320 + Math.sin(a) * rad + Math.cos(a) * off];
      wash(x, [p(r0, -w0), p(r1, -w1), p(r1 + 8, 0), p(r1, w1), p(r0, w0)], { colors: ['#f6b851', '#f1bd45', '#f2a13a'], seed: 720 + i, layers: 12, alpha: 0.085, k: 0.14, seg: 26, base: 2, extra: 2 }); }
    wash(x, circ(320, 320, 128, 126, 14), { colors: ['#f1bd45', '#f6d04a', '#f6b851'], seed: 701, layers: 26, alpha: 0.075, k: 0.12, seg: 40, base: 2, extra: 2 });
    x.globalCompositeOperation = 'source-atop';
    wash(x, circ(362, 368, 84, 66, 10), { colors: ['#e88524', '#f2a13a'], seed: 702, layers: 12, alpha: 0.05, k: 0.3, seg: 30 });
    wash(x, circ(282, 268, 56, 40, 10), { color: '#fff6d8', seed: 703, layers: 10, alpha: 0.06, k: 0.35, seg: 30 });
    x.globalCompositeOperation = 'source-over'; mottle(c, x, 431, '#96541a', 640, 640, 0.6); tooth(c);
    save('sun', c, 520, 0.8); }

  // ---- a place: mountains, autumn trees and a strip of lake, inside one loose pool of paint
  { const W2 = 1200, H2 = 640, [c, x] = cv(W2, H2), r = R(57);
    { const [s, sx] = cv(W2, H2); const g = sx.createLinearGradient(0, 0, 0, 470); g.addColorStop(0, '#5b9bd0'); g.addColorStop(0.3, '#8fc0e0'); g.addColorStop(0.6, '#d6e3dc'); g.addColorStop(0.85, '#f5e8c6'); g.addColorStop(1, '#f4dcc2');
      sx.globalAlpha = 0.9; sx.fillStyle = g; sx.fillRect(0, 0, W2, 480); sx.globalAlpha = 1;
      for (let i = 0; i < 8; i++) { const y = r() * 170, x0 = -150 + r() * W2, w = 300 + r() * 600, h = 30 + r() * 60; wash(sx, [[x0, y], [x0 + w * 0.5, y - h * 0.3], [x0 + w, y + h * 0.2], [x0 + w * 0.6, y + h], [x0 + w * 0.1, y + h * 0.8]], { colors: ['#4b8cc6', '#63a2d6', '#7db4dc'], seed: 500 + i, layers: 14, alpha: 0.035, k: 0.3 }); }
      x.drawImage(s, 0, 0); }
    const layer = (fn) => { const [l, lx] = cv(W2, H2); fn(lx); x.drawImage(l, 0, 0); };
    layer((lx) => paintMountains(lx, W2, { seed: 21, baseY: 430, rough: 12, fade: 120, colors: ['#aab6d6', '#b9bfe0', '#a9a3d0', '#9db0d2'], shadow: '#7f86b8', peaks: [{ x: 210, w: 300, h: 190 }, { x: 610, w: 390, h: 270 }, { x: 1000, w: 300, h: 200 }] }));
    layer((lx) => paintMountains(lx, W2, { seed: 25, baseY: 446, rough: 11, fade: 100, colors: ['#7384ad', '#7d78ac', '#6a7aa6', '#8a8fbb'], shadow: '#4d5486', peaks: [{ x: 90, w: 340, h: 130 }, { x: 440, w: 300, h: 104 }, { x: 830, w: 430, h: 160 }, { x: 1180, w: 300, h: 110 }] }));
    layer((lx) => { // water under the trees
      wash(lx, [[-40, 462], [W2 + 40, 462], [W2 + 40, H2 + 40], [-40, H2 + 40]], { colors: ['#a2e0e2', '#62bfe4', '#49a6d6'], seed: 561, layers: 22, alpha: 0.075, k: 0.03, seg: 60, base: 2, extra: 2 });
      lx.globalCompositeOperation = 'source-atop';
      for (let i = 0; i < 26; i++) { const cx = r() * W2, l = 50 + r() * 110, ww = 6 + r() * 16, cols = [PAL.orange.c, PAL.green.c, PAL.purple.c, PAL.orange.c][(r() * 4) | 0];
        wash(lx, [[cx - ww, 462], [cx + ww, 462], [cx + ww * 0.6, 462 + l], [cx - ww * 0.5, 462 + l * 0.9]], { colors: [cols[0], cols[1]], seed: 570 + i, layers: 8, alpha: 0.06, k: 0.18, seg: 22 }); }
      lx.globalCompositeOperation = 'source-over'; });
    layer((lx) => { let xx = 70; const tr = R(41); const trees = [];
      while (xx < W2 - 60) { if (tr() < 0.14) { xx += 70 + tr() * 120; continue; } trees.push({ x: xx, h: 90 + tr() * 130, by: 462 + tr() * 6 }); xx += 34 + tr() * 62; }
      trees.sort((a, b) => a.by - b.by || b.h - a.h); for (const t of trees) conifer(lx, t.x, t.by, t.h, pickPal(tr), tr); });
    // keep only a loose pool of it, the way a small painting sits on a big sheet
    { const [m, mx] = cv(W2, H2); wash(mx, circ(W2 / 2, H2 / 2 + 10, W2 * 0.455, H2 * 0.43, 12), { color: '#000000', seed: 591, layers: 30, alpha: 0.13, k: 0.2, seg: 90, base: 3, extra: 2 });
      x.globalCompositeOperation = 'destination-in'; x.drawImage(m, 0, 0); x.globalCompositeOperation = 'source-over'; }
    mottle(c, x, 441, '#3c2a54', W2, H2, 0.3); tooth(c);
    save('place', c, 1100, 0.8); }

  // ---- the driver's helmet and the honey car, straight from the film
  save('helmet', HERO.helmHi, 520, 0.84);
  save('car', HERO.hi, 900, 0.84);

  // ---- two ducks, their reflections and a few rings of ripple
  { const [c, x] = cv(1000, 460); const d1 = paintDuck(800, 11), d2 = paintDuck(817, 9);
    const put = (d, cx, cy, s, flip) => {
      const w = d.width * s, h = d.height * s;
      x.save(); x.translate(cx, cy); if (flip) x.scale(-1, 1);
      x.save(); x.globalAlpha = 0.2; x.scale(1, -0.55); x.drawImage(d, -w / 2, -h * 0.66 - h * 0.1, w, h); x.restore();   // reflection, squashed
      x.drawImage(d, -w / 2, -h * 0.66, w, h);
      x.strokeStyle = '#f4fbfa'; x.lineCap = 'round';
      for (const [rx, ry, a, lw] of [[w * 0.36, h * 0.07, 0.75, 3], [w * 0.5, h * 0.12, 0.5, 2.4], [w * 0.66, h * 0.18, 0.3, 2]]) { x.globalAlpha = a; x.lineWidth = lw; x.beginPath(); x.ellipse(-w * 0.04, h * 0.04, rx, ry, 0, 0.12, 3.02); x.stroke(); }
      x.restore(); };
    put(d1, 330, 250, 0.82, false); put(d2, 730, 300, 0.7, false);
    save('ducks', c, 760, 0.84); }

  // ---- the paint inside the big title: deep pigments, so the letters stay readable on paper
  { const W2 = 1400, H2 = 420, [c, x] = cv(W2, H2), r = R(97);
    const g = x.createLinearGradient(0, 0, W2, 0); g.addColorStop(0, '#1d6f7a'); g.addColorStop(0.3, '#2c5fa8'); g.addColorStop(0.55, '#4b4690'); g.addColorStop(0.78, '#8a3f6c'); g.addColorStop(1, '#b2433f');
    x.fillStyle = g; x.fillRect(0, 0, W2, H2);
    const cols = [['#1d7a7e', '#23795a'], ['#2f6fc4', '#2a58b0'], ['#3a4f9a', '#4a3a63'], ['#6a4a86', '#8a3f6c'], ['#b2433f', '#b5622a']];
    for (let i = 0; i < 22; i++) { const u = r(), cx = u * W2, cy = r() * H2, rr = 70 + r() * 120, pc = cols[Math.min(4, Math.max(0, Math.round(u * 4 + (r() - 0.5) * 1.6)))];
      wash(x, circ(cx, cy, rr * 1.5, rr), { colors: pc, seed: 970 + i, layers: 12, alpha: 0.06, k: 0.3, seg: 40 }); }
    x.globalAlpha = 0.5; x.drawImage(cloud(451, [20, 22, 60], 0.3), 0, 0, W2, H2); x.drawImage(cloud(452, [255, 240, 220], 0.22), 0, 0, W2, H2); x.globalAlpha = 1;
    tooth(c, 0.5);
    save('title-paint', c, 1200, 0.78); }

  return out;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1300, height: 740 } });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto('file://' + path.resolve(scene));
  await page.waitForFunction('window.ready === true', null, { timeout: 180000 });
  const pieces = await page.evaluate(paint);
  fs.mkdirSync(OUT, { recursive: true });
  for (const [name, data] of Object.entries(pieces)) {
    const buf = Buffer.from(data.split(',')[1], 'base64');
    fs.writeFileSync(path.join(OUT, name + '.webp'), buf);
    console.log(name + '.webp', (buf.length / 1024).toFixed(0) + ' KB');
  }
  await browser.close();
})();
