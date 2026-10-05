/* kellylucas.dev
   Shared by every page that uses style.css (home, magpie, design, playground,
   log, colophon, 404). Each feature null-checks its targets, and the pages
   read fine with no JavaScript at all. The playground rooms use lab.js. */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/* storage can be missing or blocked (private windows, previews); never let it break a page */
const store = {
  get(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } },
  set(key, value) { try { window.localStorage.setItem(key, value); } catch (e) { /* fine */ } },
};

/* ---------- Footer year ---------- */
$$("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });

/* ---------- Toast ---------- */
const toastEl = $("[data-toast]");
let toastTimer;
function toast(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add("is-shown");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("is-shown"), 2800);
}

/* ---------- Tab title, for when you wander off ---------- */
const baseTitle = document.title;
document.addEventListener("visibilitychange", () => {
  document.title = document.hidden ? "something shiny is waiting" : baseTitle;
});

/* ---------- Home: a different place each visit, Torres del Paine first ---------- */
const place = $("[data-place]");
if (place && $("[data-place-img]", place) && $("[data-place-name]", place)) {
  const ART = "/assets/art/";
  const pretzel = '<a href="https://pretzel.thetravelprotocol.com" target="_blank" rel="noopener noreferrer">the Pretzel Protocol</a>';
  const PLACES = [
    { src: "travel/torres-del-paine.webp", w: 1600, h: 1103, name: "Torres del Paine, Patagonia", alt: "A drawing of the three granite towers of Torres del Paine, pink in the morning light, above a glacial lake." },
    { src: "travel/santorini.webp", w: 1600, h: 1034, name: "Santorini, Greece", alt: "A drawing of white Santorini houses stepping down a cliff, a church with a navy dome, and coral bougainvillea." },
    { src: "travel/iceland.webp", w: 1600, h: 1021, name: "Kirkjufell, Iceland", alt: "A drawing of Kirkjufell, the cone-shaped mountain, above a stepped waterfall." },
    { src: "travel/florence.webp", w: 1464, h: 1188, name: "Florence, Italy", alt: "A drawing of Brunelleschi's coral dome beside Giotto's bell tower, above tiled roofs and a cypress." },
    { src: "pretzel-prague.webp", w: 1600, h: 990, name: "Prague, drawn for " + pretzel, alt: "A drawing of a stone arcade looking out over Prague's coral rooftops to the castle, with an olive tree and a suitcase." },
    { src: "travel/copenhagen.webp", w: 1600, h: 904, name: "Nyhavn, Copenhagen", alt: "A drawing of Nyhavn harbor: tall painted townhouses along the canal and a coral sailboat." },
    { src: "travel/rome.webp", w: 1523, h: 1100, name: "Rome, Italy", alt: "A drawing of the Colosseum beside a Roman umbrella pine." },
    { src: "travel/istanbul.webp", w: 1600, h: 1093, name: "Istanbul, Türkiye", alt: "A drawing of a mosque with teal domes and four minarets across the Bosphorus, with a small ferry." },
    { src: "pretzel-munich.webp", w: 1600, h: 1004, name: "Munich, drawn for " + pretzel, alt: "A drawing of Marienplatz and the Neues Rathaus seen through a stone archway, with flowers and a bread basket." },
    { src: "travel/athens.webp", w: 1600, h: 1010, name: "Athens, Greece", alt: "A drawing of the Parthenon on the Acropolis rock, with an olive tree in front." },
    { src: "travel/edinburgh.webp", w: 1600, h: 1036, name: "Edinburgh, Scotland", alt: "A drawing of Edinburgh Castle on its rock, with a small coral flag." },
    { src: "pretzel-berlin.webp", w: 1600, h: 874, name: "Berlin, drawn for " + pretzel, alt: "A drawing of the East Side Gallery wall and the Oberbaum Bridge over the Spree." },
    { src: "pretzel-amsterdam.webp", w: 1600, h: 876, name: "Amsterdam, drawn for " + pretzel, alt: "A drawing of Amsterdam canal houses, an arched bridge, a bicycle and a stroopwafel." },
  ];
  const img = $("[data-place-img]", place);
  const nameEl = $("[data-place-name]", place);
  const next = $("[data-place-next]", place);
  const KEY = "kl-place";

  const show = (i, animate) => {
    const p = PLACES[i];
    const apply = () => {
      img.src = ART + p.src;
      img.width = p.w;
      img.height = p.h;
      img.alt = p.alt;
      nameEl.innerHTML = p.name;
    };
    if (!animate || reducedMotion || !img.animate) { apply(); return; }
    img.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: "ease-out", fill: "forwards" }).finished.then(() => {
      apply();
      const fadeIn = () => img.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 520, easing: EASE, fill: "forwards" });
      img.complete ? fadeIn() : img.addEventListener("load", fadeIn, { once: true });
    });
  };

  // first visit shows Torres del Paine (already in the HTML); every visit after moves one place on
  const last = parseInt(store.get(KEY), 10);
  let current = Number.isInteger(last) && last >= 0 ? (last + 1) % PLACES.length : 0;
  if (current !== 0) show(current, false);
  store.set(KEY, String(current));

  if (next) {
    next.hidden = false;
    // warm the next drawing so the swap is instant
    const warm = (i) => { const im = new Image(); im.src = ART + PLACES[i].src; };
    ("requestIdleCallback" in window) ? requestIdleCallback(() => warm((current + 1) % PLACES.length)) : setTimeout(() => warm((current + 1) % PLACES.length), 1500);
    next.addEventListener("click", () => {
      current = (current + 1) % PLACES.length;
      store.set(KEY, String(current));
      show(current, true);
      warm((current + 1) % PLACES.length);
    });
  }
}

/* ---------- Magpie's shortcut, which only works in my browser ---------- */
const reflex = $("[data-reflex]");
if (reflex) {
  let reflexTimer;
  document.addEventListener("keydown", (e) => {
    if (e.altKey && e.shiftKey && (e.code === "KeyM" || (e.key || "").toLowerCase() === "m")) {
      e.preventDefault();
      reflex.textContent = "Nice reflexes. That shortcut only works in my browser.";
      clearTimeout(reflexTimer);
      reflexTimer = setTimeout(() => { reflex.textContent = ""; }, 4200);
    }
  });
}

/* ---------- Magpie page: the popup actually clips (a picture of) a page ---------- */
const scene = $("[data-clip-scene]");
if (scene) {
  const wall = $(".mp-wall", scene);
  const source = $("[data-clip-source]", scene);
  const button = $("[data-clip-button]", scene);
  const queue = [
    { img: "/assets/collection/clips/refero.webp", title: "Refero: UI and UX inspiration", domain: "refero.design" },
    { img: "/assets/collection/clips/linear.webp", title: "Linear", domain: "linear.app" },
    { img: "/assets/collection/clips/savee.webp", title: "Savee", domain: "savee.com" },
  ];
  let step = 0;
  let busy = false;
  let flying = false;
  let resetTimer;
  const check = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const makeCard = (item) => {
    const card = document.createElement("div");
    card.className = "mp-card is-new";
    card.innerHTML =
      '<div class="mp-card__img"><img alt="" width="400" height="250"></div>' +
      '<div class="mp-card__meta"><div class="mp-card__t"></div><div class="mp-card__d"></div></div>';
    $("img", card).src = item.img;
    $(".mp-card__t", card).textContent = item.title;
    $(".mp-card__d", card).textContent = item.domain;
    return card;
  };

  const setPreview = (item) => {
    $("img", source).src = item.img;
    $(".mp-pop__pt", source).textContent = item.title;
    $(".mp-pop__pd", source).textContent = item.domain;
  };

  const reset = () => {
    clearTimeout(resetTimer);
    setPreview(queue[step % queue.length]);
    button.textContent = "Clip it";
    busy = false;
  };

  const clip = (announce) => {
    if (!wall || !source || !button || flying) return;
    // a click during the "Clipped" pause moves straight on to the next page
    if (busy) reset();
    busy = true;
    flying = true;
    const item = queue[step % queue.length];
    const card = makeCard(item);
    $$(".mp-card.is-new", wall).forEach((c) => c.classList.remove("is-new"));

    const finish = () => {
      flying = false;
      button.innerHTML = check + "Clipped";
      if (announce) toast("Clipped. Filed under shiny things.");
      step++;
      resetTimer = setTimeout(reset, 1600);
    };

    const from = $(".mp-card__img", source).getBoundingClientRect();
    const before = new Map($$(".mp-card", wall).map((c) => [c, c.getBoundingClientRect()]));
    wall.prepend(card);
    $$(".mp-card", wall).slice(6).forEach((c) => c.remove());

    // the older clips slide over to make room
    if (!reducedMotion && card.animate) {
      before.forEach((rect, c) => {
        if (!c.isConnected) return;
        const now = c.getBoundingClientRect();
        const x = rect.left - now.left;
        const y = rect.top - now.top;
        if (x || y) c.animate([{ transform: `translate(${x}px, ${y}px)` }, { transform: "none" }], { duration: 640, easing: EASE });
      });
    }

    if (reducedMotion || !card.animate) { finish(); return; }

    const to = $(".mp-card__img", card).getBoundingClientRect();
    const box = scene.getBoundingClientRect();
    const flyer = document.createElement("div");
    flyer.className = "mp-flyer";
    flyer.innerHTML = '<img alt="">';
    $("img", flyer).src = item.img;
    Object.assign(flyer.style, {
      left: from.left - box.left + "px",
      top: from.top - box.top + "px",
      width: from.width + "px",
      height: from.height + "px",
    });
    scene.appendChild(flyer);
    card.style.opacity = "0";
    const dx = to.left - from.left;
    const dy = to.top - from.top;
    const sx = to.width / from.width;
    const sy = to.height / from.height;
    flyer.animate(
      [
        { transform: "translate(0, 0) scale(1)", transformOrigin: "0 0" },
        { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 30}px) scale(${(1 + sx) / 2}, ${(1 + sy) / 2})`, transformOrigin: "0 0", offset: 0.55 },
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, transformOrigin: "0 0" },
      ],
      { duration: 820, easing: EASE, fill: "forwards" }
    ).finished.then(() => {
      card.style.opacity = "";
      flyer.remove();
      finish();
    });
  };

  if (button) button.addEventListener("click", () => clip(true));

  // the page's one authored moment: the first clip plays by itself when the scene is seen
  if (!reducedMotion && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((seen) => {
      if (seen.some((s) => s.isIntersecting)) {
        io.disconnect();
        setTimeout(() => clip(false), 900);
      }
    }, { threshold: 0.6 });
    io.observe(scene);
  }
}
