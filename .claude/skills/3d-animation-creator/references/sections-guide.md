# Sections Guide — Detailed Implementation Reference

This document contains the exact implementation patterns for every section of the scroll-stop
website. Read the relevant section when building that part of the site.

## Table of Contents

1. [Starscape Background](#1-starscape-background)
2. [Loader](#2-loader)
3. [Scroll Progress Bar](#3-scroll-progress-bar)
4. [Navbar (Scroll-to-Pill)](#4-navbar)
5. [Hero Section](#5-hero-section)
6. [Scroll Animation (Frame Sequence)](#6-scroll-animation)
7. [Annotation Cards (Snap-Stop)](#7-annotation-cards)
8. [Specs Section (Count-Up)](#8-specs-section)
9. [Features Grid](#9-features-grid)
10. [CTA Section](#10-cta-section)
11. [Testimonials (Optional)](#11-testimonials)
12. [Card Scanner (Optional)](#12-card-scanner)
13. [Footer](#13-footer)

---

## 1. Starscape Background

A fixed canvas that sits behind all content, creating a subtle, living background of twinkling
stars that slowly drift.

### Structure

```html
<canvas id="starscape"></canvas>
```

### Styling

```css
#starscape {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
  opacity: 0.6;
}
```

### JavaScript

Generate ~180 stars, each with:
- Random x, y position
- Random radius (0.3–1.5px)
- Random base opacity (0.2–0.8)
- Random drift speed (x: -0.02 to 0.02, y: -0.01 to 0.01)
- Random twinkle speed and phase

Animation loop:
```javascript
function animateStars() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  stars.forEach(star => {
    star.x += star.driftX;
    star.y += star.driftY;
    // Wrap around edges
    if (star.x < 0) star.x = canvas.width;
    if (star.x > canvas.width) star.x = 0;
    if (star.y < 0) star.y = canvas.height;
    if (star.y > canvas.height) star.y = 0;
    // Twinkle
    const twinkle = Math.sin(Date.now() * star.twinkleSpeed + star.twinklePhase);
    const opacity = star.baseOpacity + twinkle * 0.3;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, opacity)})`;
    ctx.fill();
  });
  requestAnimationFrame(animateStars);
}
```

Scale canvas for devicePixelRatio on resize.

---

## 2. Loader

Full-screen overlay that shows while frames are preloading. Disappears with a fade-out once
all frames are loaded.

### Structure

```html
<div id="loader">
  <div class="loader-content">
    <div class="loader-logo"><!-- Brand logo here --></div>
    <p class="loader-text">Loading</p>
    <div class="loader-bar-track">
      <div class="loader-bar-fill" id="loaderBar"></div>
    </div>
  </div>
</div>
```

### Styling

- Full viewport, `position: fixed`, `z-index: 9999`
- Background: same as site background color
- Logo: centered, max-width ~120px
- "Loading" text: uppercase, letter-spacing 3px, muted color
- Progress bar track: 200px wide, 3px tall, rounded, muted background
- Progress bar fill: accent color, `transition: width 0.3s ease`

### Behavior

Update `loaderBar.style.width` as frames load:
```javascript
const pct = (loadedCount / totalFrames) * 100;
loaderBar.style.width = pct + '%';
```

When all frames loaded:
```javascript
loader.style.opacity = '0';
loader.style.transition = 'opacity 0.6s ease';
setTimeout(() => loader.style.display = 'none', 600);
```

---

## 3. Scroll Progress Bar

Thin bar at the very top of the viewport showing overall page scroll progress.

### Structure

```html
<div id="scrollProgress"></div>
```

### Styling

```css
#scrollProgress {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  width: 0%;
  background: linear-gradient(90deg, var(--accent), var(--accent-light, var(--accent)));
  z-index: 10000;
  transition: width 0.1s linear;
}
```

### JavaScript

```javascript
window.addEventListener('scroll', () => {
  const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
  scrollProgress.style.width = pct + '%';
}, { passive: true });
```

---

## 4. Navbar

Starts as a full-width bar, then on scroll transforms into a centered floating pill with
glass-morphism styling.

### Structure

```html
<nav id="navbar">
  <div class="nav-inner">
    <div class="nav-logo">
      <!-- Brand logo + name -->
    </div>
    <div class="nav-links">
      <a href="#features">Features</a>
      <a href="#specs">Specs</a>
      <a href="#cta" class="nav-cta">Get Started</a>
    </div>
  </div>
</nav>
```

### Styling

Default state:
```css
#navbar {
  position: fixed;
  top: 12px;
  left: 0;
  right: 0;
  z-index: 1000;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.nav-inner {
  max-width: 100%;
  margin: 0 auto;
  padding: 12px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
```

Scrolled (pill) state — applied via `.nav-scrolled` class:
```css
#navbar.nav-scrolled .nav-inner {
  max-width: 820px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 100px;
  padding: 10px 24px;
}
```

### JavaScript

```javascript
window.addEventListener('scroll', () => {
  navbar.classList.toggle('nav-scrolled', window.scrollY > 80);
}, { passive: true });
```

### Mobile

Hide `.nav-links` on screens < 768px. Show only logo in the pill.

---

## 5. Hero Section

The opening section with headline, subtitle, CTA buttons, and decorative elements.

### Structure

```html
<section id="hero">
  <div class="hero-bg">
    <div class="orb orb-1"></div>
    <div class="orb orb-2"></div>
    <div class="grid-overlay"></div>
  </div>
  <div class="hero-content">
    <h1 class="hero-title"><!-- From user content --></h1>
    <p class="hero-subtitle"><!-- From user content --></p>
    <div class="hero-buttons">
      <a href="#cta" class="btn-primary"><!-- CTA text --></a>
      <a href="#features" class="btn-secondary">Learn More</a>
    </div>
    <div class="scroll-hint">
      <span>Scroll to explore</span>
      <div class="scroll-arrow"></div>
    </div>
  </div>
</section>
```

### Decorative Elements

**Orbs**: Large blurred circles using the accent color at low opacity:
```css
.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.15;
}
.orb-1 {
  width: 500px; height: 500px;
  background: var(--accent);
  top: -200px; right: -100px;
}
.orb-2 {
  width: 400px; height: 400px;
  background: var(--accent);
  bottom: -150px; left: -100px;
  opacity: 0.1;
}
```

**Grid overlay**: Subtle CSS grid lines:
```css
.grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
}
```

**Scroll hint**: Animated bouncing arrow at the bottom of the hero.

### Buttons

```css
.btn-primary {
  background: var(--accent);
  color: #000;
  padding: 14px 32px;
  border-radius: 12px;
  font-weight: 600;
  text-decoration: none;
  box-shadow: 0 0 20px rgba(var(--accent-rgb), 0.3);
  transition: all 0.3s ease;
}
.btn-primary:hover {
  box-shadow: 0 0 30px rgba(var(--accent-rgb), 0.5);
  transform: translateY(-2px);
}
.btn-secondary {
  background: transparent;
  color: #fff;
  padding: 14px 32px;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.3s ease;
}
```

---

## 6. Scroll Animation

The core of the site — a sticky canvas that plays the video forward/backward based on scroll.

### Structure

```html
<section class="scroll-animation">
  <div class="scroll-sticky">
    <canvas id="frameCanvas"></canvas>
    <!-- Annotation cards go here (see section 7) -->
  </div>
</section>
```

### Styling

```css
.scroll-animation {
  height: 350vh; /* Controls scroll speed: more height = slower */
  position: relative;
}
.scroll-sticky {
  position: sticky;
  top: 0;
  height: 100vh;
  width: 100%;
  overflow: hidden;
}
#frameCanvas {
  position: absolute;
  top: 0;
  left: 0;
}
```

### Responsive heights

```css
@media (max-width: 1024px) { .scroll-animation { height: 300vh; } }
@media (max-width: 768px)  { .scroll-animation { height: 250vh; } }
```

### JavaScript — Frame preloading

```javascript
const frameCount = /* total extracted frames */;
const frames = [];
let loadedFrames = 0;

for (let i = 1; i <= frameCount; i++) {
  const img = new Image();
  img.src = `frames/frame_${String(i).padStart(4, '0')}.jpg`;
  img.onload = () => {
    loadedFrames++;
    updateLoader(loadedFrames / frameCount);
    if (loadedFrames === frameCount) onAllFramesLoaded();
  };
  frames.push(img);
}
```

### JavaScript — Scroll-to-frame mapping

```javascript
let currentFrame = -1;
let ticking = false;

window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      const section = document.querySelector('.scroll-animation');
      const rect = section.getBoundingClientRect();
      const scrollableHeight = section.offsetHeight - window.innerHeight;
      const progress = Math.min(1, Math.max(0, -rect.top / scrollableHeight));
      const frameIndex = Math.min(frameCount - 1, Math.floor(progress * frameCount));

      if (frameIndex !== currentFrame) {
        currentFrame = frameIndex;
        drawFrame(frameIndex);
      }
      ticking = false;
    });
    ticking = true;
  }
}, { passive: true });
```

### JavaScript — Drawing with cover-fit

```javascript
function drawFrame(index) {
  const img = frames[index];
  if (!img) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const cw = canvas.width;
  const ch = canvas.height;

  ctx.clearRect(0, 0, cw, ch);

  // Cover-fit calculation
  const imgRatio = img.width / img.height;
  const canvasRatio = cw / ch;
  let drawW, drawH, drawX, drawY;

  if (window.innerWidth > 768) {
    // Desktop: cover-fit (fills canvas, crops overflow)
    if (canvasRatio > imgRatio) {
      drawW = cw;
      drawH = cw / imgRatio;
    } else {
      drawH = ch;
      drawW = ch * imgRatio;
    }
    drawX = (cw - drawW) / 2;
    drawY = (ch - drawH) / 2;
  } else {
    // Mobile: zoomed contain-fit (centered, slightly zoomed)
    const zoom = 1.2;
    if (canvasRatio > imgRatio) {
      drawH = ch * zoom;
      drawW = drawH * imgRatio;
    } else {
      drawW = cw * zoom;
      drawH = drawW / imgRatio;
    }
    drawX = (cw - drawW) / 2;
    drawY = (ch - drawH) / 2;
  }

  ctx.drawImage(img, drawX, drawY, drawW, drawH);
}
```

### Canvas resize handler

```javascript
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  if (currentFrame >= 0) drawFrame(currentFrame);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
```

---

## 7. Annotation Cards

Cards that appear over the scroll animation at specific progress points. The scroll freezes
briefly at each card, creating a staccato "reveal" rhythm.

### Structure

```html
<div class="annotation-card" data-show="0.15" data-hide="0.35">
  <div class="card-number">01</div>
  <div class="card-body">
    <h3 class="card-title"><!-- Title --></h3>
    <p class="card-desc"><!-- Description --></p>
    <div class="card-stat">
      <span class="card-stat-number"><!-- e.g., 99.9% --></span>
      <span class="card-stat-label"><!-- e.g., Accuracy --></span>
    </div>
  </div>
</div>
```

Place these inside `.scroll-sticky`. Use `data-show` and `data-hide` to control when each
card appears based on scroll progress (0.0–1.0).

### Styling

```css
.annotation-card {
  position: absolute;
  bottom: 8vh;
  left: 5vw;
  max-width: 360px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 28px;
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.4s ease, transform 0.4s ease;
  pointer-events: none;
  z-index: 10;
}
.annotation-card.visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}
.card-number {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  color: var(--accent);
  margin-bottom: 8px;
}
.card-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.2rem;
  margin-bottom: 8px;
}
.card-desc {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 16px;
}
.card-stat-number {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--accent);
}
.card-stat-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  display: block;
}
```

### Mobile compact style

```css
@media (max-width: 768px) {
  .annotation-card {
    bottom: 1.5vh;
    left: 2vw;
    right: 2vw;
    max-width: none;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .card-desc, .card-stat { display: none; }
  .card-number { margin-bottom: 0; }
}
```

### JavaScript — Show/hide + snap-stop

```javascript
const SNAP_ZONES = []; // Populated from data-show attributes
const HOLD_DURATION = 600; // ms to freeze scroll at each snap point
let isSnapping = false;

const cards = document.querySelectorAll('.annotation-card');
cards.forEach(card => {
  SNAP_ZONES.push({
    show: parseFloat(card.dataset.show),
    hide: parseFloat(card.dataset.hide),
    snapped: false
  });
});

function updateCards(progress) {
  cards.forEach((card, i) => {
    const zone = SNAP_ZONES[i];
    const visible = progress >= zone.show && progress <= zone.hide;
    card.classList.toggle('visible', visible);

    // Snap-stop: freeze scroll briefly when entering a snap zone
    if (visible && !zone.snapped && !isSnapping) {
      zone.snapped = true;
      isSnapping = true;
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        document.body.style.overflow = '';
        isSnapping = false;
      }, HOLD_DURATION);
    }
    if (!visible) {
      zone.snapped = false;
    }
  });
}
```

Call `updateCards(progress)` from the scroll handler alongside frame drawing.

---

## 8. Specs Section

Four stat numbers that count up from 0 when scrolled into view.

### Structure

```html
<section id="specs">
  <div class="specs-grid">
    <div class="spec-item" data-target="99.9" data-suffix="%">
      <span class="spec-number">0</span>
      <span class="spec-label"><!-- Label --></span>
    </div>
    <!-- Repeat for each spec -->
  </div>
</section>
```

### Styling

```css
.specs-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 40px;
  max-width: 1000px;
  margin: 0 auto;
  padding: 120px 32px;
  text-align: center;
}
.spec-number {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 3.5rem;
  font-weight: 700;
  display: block;
  transition: text-shadow 0.3s ease;
}
.spec-number.counting {
  text-shadow: 0 0 20px rgba(var(--accent-rgb), 0.5);
}
.spec-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-top: 8px;
  display: block;
}

@media (max-width: 768px) {
  .specs-grid { grid-template-columns: repeat(2, 1fr); gap: 32px; }
  .spec-number { font-size: 2.5rem; }
}
```

### JavaScript — Count-up with easeOutExpo

```javascript
function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function countUp(el, target, suffix = '', duration = 2000) {
  const start = performance.now();
  el.classList.add('counting');

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeOutExpo(progress);
    const current = eased * target;

    // Format: integers stay integer, decimals keep one decimal
    el.textContent = (target % 1 === 0 ? Math.floor(current) : current.toFixed(1)) + suffix;

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      el.textContent = target + suffix;
      el.classList.remove('counting');
    }
  }
  requestAnimationFrame(update);
}

// Trigger with IntersectionObserver
const specObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const items = entry.target.querySelectorAll('.spec-item');
      items.forEach((item, i) => {
        setTimeout(() => {
          const numEl = item.querySelector('.spec-number');
          const target = parseFloat(item.dataset.target);
          const suffix = item.dataset.suffix || '';
          countUp(numEl, target, suffix);
        }, i * 200); // Staggered
      });
      specObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.3 });

specObserver.observe(document.getElementById('specs'));
```

---

## 9. Features Grid

Glass-morphism cards in a responsive grid.

### Structure

```html
<section id="features">
  <h2 class="section-title"><!-- e.g., "Features" --></h2>
  <div class="features-grid">
    <div class="feature-card">
      <div class="feature-icon"><!-- Icon or emoji --></div>
      <h3><!-- Feature title --></h3>
      <p><!-- Feature description --></p>
    </div>
    <!-- Repeat -->
  </div>
</section>
```

### Styling

```css
.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  max-width: 1100px;
  margin: 0 auto;
  padding: 80px 32px;
}
.feature-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 32px;
  transition: transform 0.3s ease, border-color 0.3s ease;
}
.feature-card:hover {
  transform: translateY(-4px);
  border-color: rgba(var(--accent-rgb), 0.2);
}
.feature-icon {
  font-size: 2rem;
  margin-bottom: 16px;
}

@media (max-width: 768px) {
  .features-grid { grid-template-columns: 1fr; }
}
```

---

## 10. CTA Section

A focused call-to-action section.

### Structure

```html
<section id="cta">
  <div class="cta-content">
    <h2><!-- CTA headline --></h2>
    <p><!-- Supporting text --></p>
    <a href="#" class="btn-primary btn-large"><!-- CTA button text --></a>
  </div>
</section>
```

### Styling

```css
#cta {
  text-align: center;
  padding: 120px 32px;
  position: relative;
}
.btn-large {
  font-size: 1.1rem;
  padding: 18px 48px;
}
```

Add an orb behind the CTA for visual emphasis.

---

## 11. Testimonials (Optional)

Only include if the user opted in during the interview. Horizontal drag-to-scroll cards.

### Structure

```html
<section id="testimonials">
  <h2 class="section-title">What People Say</h2>
  <div class="testimonials-track">
    <div class="testimonial-card">
      <p class="testimonial-text">"<!-- Quote -->"</p>
      <div class="testimonial-author">
        <span class="author-name"><!-- Name --></span>
        <span class="author-role"><!-- Role/Company --></span>
      </div>
    </div>
    <!-- Repeat -->
  </div>
</section>
```

### Styling

```css
.testimonials-track {
  display: flex;
  gap: 24px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding: 40px 32px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.testimonials-track::-webkit-scrollbar { display: none; }
.testimonial-card {
  min-width: 350px;
  scroll-snap-align: start;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 32px;
  flex-shrink: 0;
}
```

### JavaScript — Drag-to-scroll

```javascript
const track = document.querySelector('.testimonials-track');
let isDown = false, startX, scrollLeft;

track.addEventListener('mousedown', (e) => {
  isDown = true;
  startX = e.pageX - track.offsetLeft;
  scrollLeft = track.scrollLeft;
});
track.addEventListener('mouseleave', () => isDown = false);
track.addEventListener('mouseup', () => isDown = false);
track.addEventListener('mousemove', (e) => {
  if (!isDown) return;
  e.preventDefault();
  const x = e.pageX - track.offsetLeft;
  track.scrollLeft = scrollLeft - (x - startX);
});
```

---

## 12. Card Scanner (Optional)

Only include if the user opted in. A Three.js-based particle effect that shows an object
(card, device, etc.) composed of streaming particles.

### Dependencies

Include Three.js from CDN:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
```

### Structure

```html
<section id="card-scanner">
  <div class="scanner-content">
    <h2 class="section-title"><!-- Title --></h2>
    <canvas id="scannerCanvas"></canvas>
  </div>
</section>
```

### Implementation Notes

This is a complex section. The particle system creates a grid of points that form the shape
of the object. Particles stream in from random positions and settle into their target positions
when the section scrolls into view.

Key parameters:
- Particle count: 2000–5000
- Particle size: 2–4px
- Color: accent color
- Animation: particles fly in from random positions, settle into grid formation
- Trigger: IntersectionObserver when section is 30% visible

This section is entirely optional and adds significant complexity. Only build it if the user
specifically requests it.

---

## 13. Footer

Simple footer with brand name and optional links.

### Structure

```html
<footer>
  <div class="footer-inner">
    <div class="footer-brand">
      <!-- Logo + brand name -->
    </div>
    <div class="footer-links">
      <a href="#">Privacy</a>
      <a href="#">Terms</a>
    </div>
    <p class="footer-copy">&copy; 2026 <!-- Brand Name -->. All rights reserved.</p>
  </div>
</footer>
```

### Styling

```css
footer {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding: 60px 32px 40px;
  text-align: center;
}
.footer-brand {
  margin-bottom: 24px;
}
.footer-links {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 24px;
}
.footer-links a {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.9rem;
}
.footer-copy {
  color: var(--text-secondary);
  font-size: 0.8rem;
}
```
