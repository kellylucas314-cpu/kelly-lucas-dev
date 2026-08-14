/* kellylucas.dev · lab interactions
   Loaded by index.html and quotes.html, so every feature null-checks
   its targets. GSAP comes from CDN; the page must stay fully readable
   without it. */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;
const hasGsap = typeof window.gsap !== "undefined";

/* ---------- Footer year ---------- */
const yearEl = $("#year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ---------- Header border on scroll ---------- */
const header = $(".site-header");
const onScroll = () => header && header.classList.toggle("is-scrolled", window.scrollY > 8);
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

/* ---------- Time of day greeting ---------- */
const greeting = $("#greeting");
if (greeting) {
  const h = new Date().getHours();
  greeting.textContent =
    h < 5 ? "up late? same. welcome in." :
    h < 12 ? "good morning. you found the lab." :
    h < 18 ? "good afternoon. you found the lab." :
    "good evening. you found the lab.";
}

/* ---------- Lab clock in the footer ---------- */
const clockEl = $("#labClock");
if (clockEl) {
  const tick = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    clockEl.textContent = hh + ":" + mm + " at the lab";
  };
  tick();
  setInterval(tick, 30000);
}

/* ---------- Tab title easter egg ---------- */
const baseTitle = document.title;
document.addEventListener("visibilitychange", () => {
  document.title = document.hidden ? "the lab misses you" : baseTitle;
});

/* ---------- Toast ---------- */
const toastEl = $("#toast");
let toastTimer;
function toast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add("is-shown");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("is-shown"), 2600);
}

/* ---------- Confetti ---------- */
const confettiColors = ["#b1d8b3", "#e3e3ee", "#c9e6c9", "#f6f3e8", "#14201a"];

function makePiece(i) {
  const piece = document.createElement("div");
  piece.className = "confetti-piece";
  piece.style.background = confettiColors[i % confettiColors.length];
  document.body.appendChild(piece);
  return piece;
}

function burst(x, y, count = 26) {
  if (!hasGsap || reducedMotion) return;
  for (let i = 0; i < count; i++) {
    const piece = makePiece(i);
    const angle = Math.random() * Math.PI * 2;
    const dist = 90 + Math.random() * 170;
    gsap.set(piece, { x, y, rotation: Math.random() * 360, scale: 0.7 + Math.random() * 0.7 });
    gsap.to(piece, {
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist + 130,
      rotation: "+=" + (Math.random() * 260 - 130),
      opacity: 0,
      duration: 0.9 + Math.random() * 0.6,
      ease: "power2.out",
      onComplete: () => piece.remove(),
    });
  }
}

function confettiRain(count = 60) {
  if (!hasGsap || reducedMotion) return;
  const w = window.innerWidth;
  for (let i = 0; i < count; i++) {
    const piece = makePiece(i);
    gsap.set(piece, {
      x: Math.random() * w,
      y: -30 - Math.random() * 140,
      rotation: Math.random() * 360,
      scale: 0.7 + Math.random() * 0.8,
    });
    gsap.to(piece, {
      y: window.innerHeight + 40,
      x: "+=" + (Math.random() * 140 - 70),
      rotation: "+=" + (Math.random() * 420 - 210),
      duration: 1.6 + Math.random() * 1.5,
      ease: "power1.in",
      onComplete: () => piece.remove(),
    });
  }
}

function centerOf(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/* ---------- Easter egg: ship anyway ---------- */
const shipBtn = $("#shipBtn");
if (shipBtn) {
  shipBtn.addEventListener("click", () => {
    const c = centerOf(shipBtn);
    burst(c.x, c.y, 34);
    toast("shipped. that is the whole trick.");
  });
}

/* ---------- Easter egg: secret logo button ---------- */
const logoMark = $("#logoMark");
if (logoMark) {
  let clicks = 0;
  logoMark.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    clicks += 1;
    if (clicks >= 5) {
      clicks = 0;
      const c = centerOf(logoMark);
      burst(c.x, c.y, 40);
      toast("ok, that is the secret button");
    }
  });
}

/* ---------- Easter egg: font roulette ---------- */
const fontEgg = $("#fontEgg");
if (fontEgg) {
  const auditioned = ["Heliora", "Solo Sans", "Surgena", "After"];
  let spinning = false;
  fontEgg.addEventListener("click", () => {
    const target = $("h1.display");
    if (!target || spinning) return;
    spinning = true;
    let i = 0;
    const spin = setInterval(() => {
      target.style.fontFamily = '"' + auditioned[i % auditioned.length] + '", sans-serif';
      i += 1;
      if (i > 9) {
        clearInterval(spin);
        target.style.fontFamily = "";
        spinning = false;
        toast("97 auditioned. protage took the crown.");
      }
    }, 140);
  });
}

/* ---------- Experiment 03 status cycler ---------- */
const expStatus = $("#expStatus");
if (expStatus) {
  const states = [
    "ran out of weekend",
    "blocked on a good idea",
    "v0.1 exists, it is shy",
    "still cooking",
  ];
  let i = 0;
  expStatus.addEventListener("click", () => {
    expStatus.textContent = states[i % states.length];
    i += 1;
    if (hasGsap && !reducedMotion) {
      gsap.fromTo(expStatus, { rotation: -4 }, { rotation: 0, duration: 0.5, ease: "elastic.out(1, 0.4)" });
    }
  });
}

/* ---------- Changelog popover ---------- */
const changelogBtn = $("#changelogBtn");
const changelogPop = $("#changelogPop");
if (changelogBtn && changelogPop) {
  changelogBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const opening = changelogPop.hidden;
    changelogPop.hidden = !opening;
    changelogBtn.setAttribute("aria-expanded", String(opening));
  });
  document.addEventListener("click", (e) => {
    if (!changelogPop.hidden && !changelogPop.contains(e.target)) {
      changelogPop.hidden = true;
      changelogBtn.setAttribute("aria-expanded", "false");
    }
  });
}

/* ---------- Easter egg: konami code ---------- */
const konami = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
let kIndex = 0;
document.addEventListener("keydown", (e) => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (key === konami[kIndex]) {
    kIndex += 1;
  } else {
    kIndex = key === konami[0] ? 1 : 0;
  }
  if (kIndex === konami.length) {
    kIndex = 0;
    confettiRain();
    toast("achievement unlocked: true lab member");
  }
});

/* ---------- Word splitter (GSAP-free, shared) ----------
   mask: true wraps each word in an overflow-hidden span for the
   rise-from-below effect. Padding offsets keep descenders unclipped. */
function splitWords(el, mask) {
  const words = [];
  const walk = (node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(" "));
            return;
          }
          const word = document.createElement("span");
          word.className = "word";
          word.textContent = part;
          if (mask) {
            const wrap = document.createElement("span");
            wrap.className = "word-mask";
            wrap.appendChild(word);
            frag.appendChild(wrap);
          } else {
            frag.appendChild(word);
          }
          words.push(word);
        });
        node.replaceChild(frag, child);
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== "BR") {
        walk(child);
      }
    });
  };
  walk(el);
  return words;
}

/* ---------- GSAP choreography ---------- */
if (hasGsap) {
  if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  if (window.Draggable) gsap.registerPlugin(Draggable);

  const mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: no-preference)", () => {
    /* Load: headline rises word by word */
    const title = $("h1.display");
    if (title && !title.dataset.split) {
      title.dataset.split = "1";
      const words = splitWords(title, true);
      gsap.from(words, {
        yPercent: 120,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.07,
        delay: 0.1,
      });
    }

    /* Load: stickers pop in, arrow draws itself */
    const stickers = $$(".sticker");
    if (stickers.length) {
      gsap.from(stickers, { scale: 0, duration: 0.7, ease: "back.out(1.8)", stagger: 0.09, delay: 0.7 });
    }
    const arrow = $(".scribble-arrow path");
    if (arrow) {
      const len = arrow.getTotalLength();
      gsap.fromTo(
        arrow,
        { strokeDasharray: len, strokeDashoffset: len },
        { strokeDashoffset: 0, duration: 0.8, delay: 1.2, ease: "power2.out" }
      );
    }

    if (window.ScrollTrigger) {
      /* Generic block reveals */
      $$("main .block").forEach((blk) => {
        if (blk.classList.contains("hero") || blk.classList.contains("spark-hero") || blk.classList.contains("statement")) return;
        gsap.from(blk, {
          y: 36,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: { trigger: blk, start: "top 86%", once: true },
        });
      });

      /* Motto lines stagger */
      const mottoLines = $$(".motto-line");
      if (mottoLines.length) {
        gsap.from(mottoLines, {
          y: 48,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.14,
          scrollTrigger: { trigger: ".statement", start: "top 75%", once: true },
        });
      }

      /* Instrument panel stagger (panel.html) */
      const instruments = $$(".instrument");
      if (instruments.length) {
        gsap.from(instruments, {
          y: 36,
          opacity: 0,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.1,
          scrollTrigger: { trigger: ".panel-grid", start: "top 85%", once: true },
        });
      }

      /* Experiment cards stagger */
      const cards = $$(".card");
      if (cards.length) {
        gsap.from(cards, {
          y: 40,
          opacity: 0,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.12,
          scrollTrigger: { trigger: ".card-grid", start: "top 82%", once: true },
        });
      }

      /* Experiment 03 progress bar grows to its stall point */
      const bar = $("#expProgress");
      if (bar) {
        gsap.from(bar, {
          scaleX: 0,
          duration: 1.2,
          ease: "power2.inOut",
          scrollTrigger: { trigger: bar, start: "top 92%", once: true },
        });
      }

      /* Quote brightens word by word as you scroll through it */
      const quoteText = $("#quoteText");
      if (quoteText && !quoteText.dataset.split) {
        quoteText.dataset.split = "1";
        const qWords = splitWords(quoteText, false);
        gsap.from(qWords, {
          opacity: 0.14,
          stagger: 0.03,
          ease: "none",
          scrollTrigger: { trigger: ".quote", start: "top 75%", end: "top 30%", scrub: 0.6 },
        });
      }

      /* Footer mail */
      const mail = $(".footer-mail");
      if (mail) {
        gsap.from(mail, {
          y: 30,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: { trigger: ".site-footer", start: "top 85%", once: true },
        });
      }
    }
  });

  /* Desktop only: sticker shelf drifts on scroll */
  mm.add("(prefers-reduced-motion: no-preference) and (min-width: 900px)", () => {
    const shelf = $("#stickerShelf");
    if (shelf && window.ScrollTrigger) {
      gsap.to(shelf, {
        y: 70,
        ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
      });
    }
  });

  /* Draggable stickers with a hand-rolled toss (no paid plugins) */
  if (window.Draggable) {
    const stickers = $$(".sticker");
    if (stickers.length) {
      let vx = 0;
      let vy = 0;
      Draggable.create(stickers, {
        type: "x,y",
        bounds: ".hero",
        edgeResistance: 0.8,
        zIndexBoost: true,
        onPress() {
          vx = 0;
          vy = 0;
        },
        onDrag() {
          vx = this.deltaX;
          vy = this.deltaY;
        },
        onRelease() {
          if (reducedMotion) return;
          const d = this;
          gsap.to(d.target, {
            x: gsap.utils.clamp(d.minX, d.maxX, d.x + vx * 9),
            y: gsap.utils.clamp(d.minY, d.maxY, d.y + vy * 9),
            duration: 0.55,
            ease: "power2.out",
          });
        },
      });
    }
  }

  /* Cursor follower ring (fine pointers, motion allowed) */
  if (finePointer && !reducedMotion) {
    const dot = $("#cursorDot");
    if (dot) {
      gsap.set(dot, { xPercent: -50, yPercent: -50 });
      const xTo = gsap.quickTo(dot, "x", { duration: 0.35, ease: "power3" });
      const yTo = gsap.quickTo(dot, "y", { duration: 0.35, ease: "power3" });
      let shown = false;
      window.addEventListener("mousemove", (e) => {
        if (!shown) {
          shown = true;
          gsap.to(dot, { opacity: 0.55, duration: 0.3 });
        }
        xTo(e.clientX);
        yTo(e.clientY);
      });
      const grow = () => gsap.to(dot, { scale: 1.8, duration: 0.25, overwrite: "auto" });
      const shrink = () => gsap.to(dot, { scale: 1, duration: 0.25, overwrite: "auto" });
      $$("a, button, .sticker, .spark-card").forEach((el) => {
        el.addEventListener("mouseenter", grow);
        el.addEventListener("mouseleave", shrink);
      });
    }
  }
}
