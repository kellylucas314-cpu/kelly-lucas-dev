/* kellylucas.dev
   Shared by every page that uses style.css (home, magpie, design, playground,
   log, colophon, 404). Each feature null-checks its targets, and the pages
   read fine with no JavaScript at all. The playground rooms use lab.js. */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

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

/* ---------- Home: the poster. Torres del Paine every time, another place on click ---------- */
const poster = $("[data-place]");
if (poster && $("[data-place-img]", poster) && $("[data-place-name]", poster)) {
  const ART = "/assets/art/";
  const pretzel = '<a href="https://pretzel.thetravelprotocol.com" target="_blank" rel="noopener noreferrer">the Pretzel Protocol<span class="sr-only"> (opens in a new tab)</span></a>';
  // the sun stays strong: honey, coral or teal, never a pastel
  const SUNS = ["var(--honey)", "var(--coral)", "var(--teal)"];
  const PLACES = [
    { src: "travel/torres-del-paine.webp", w: 1600, h: 1103, name: "Torres del Paine, Patagonia", alt: "A drawing of the three granite towers of Torres del Paine, pink in the morning light, above a glacial lake." },
    { src: "travel/santorini.webp", w: 1600, h: 1034, name: "Santorini, Greece", alt: "A drawing of white Santorini houses stepping down a cliff, a church with a navy dome, and coral bougainvillea." },
    { src: "travel/iceland.webp", w: 1600, h: 1021, name: "Kirkjufell, Iceland", alt: "A drawing of Kirkjufell, the cone-shaped mountain, above a stepped waterfall." },
    { src: "travel/florence.webp", w: 1464, h: 1188, name: "Florence, Italy", alt: "A drawing of Brunelleschi’s coral dome beside Giotto’s bell tower, above tiled roofs and a cypress." },
    { src: "pretzel-prague.webp", w: 1600, h: 990, name: "Prague, redrawn from " + pretzel, alt: "A drawing of a stone arcade looking out over Prague’s coral rooftops to the castle, with an olive tree and a suitcase." },
    { src: "travel/copenhagen.webp", w: 1600, h: 904, name: "Nyhavn, Copenhagen", alt: "A drawing of Nyhavn harbor: tall painted townhouses along the canal and a coral sailboat." },
    { src: "travel/rome.webp", w: 1523, h: 1100, name: "Rome, Italy", alt: "A drawing of the Colosseum beside a Roman umbrella pine." },
    { src: "travel/istanbul.webp", w: 1600, h: 1093, name: "Istanbul, Türkiye", alt: "A drawing of a mosque with teal domes and four minarets across the Bosphorus, with a small ferry." },
    { src: "pretzel-munich.webp", w: 1600, h: 1004, name: "Munich, redrawn from " + pretzel, alt: "A drawing of Marienplatz and the Neues Rathaus seen through a stone archway, with flowers and a bread basket." },
    { src: "travel/athens.webp", w: 1600, h: 1010, name: "Athens, Greece", alt: "A drawing of the Parthenon on the Acropolis rock, with an olive tree in front." },
    { src: "travel/edinburgh.webp", w: 1600, h: 1036, name: "Edinburgh, Scotland", alt: "A drawing of Edinburgh Castle on its rock, with a small coral flag." },
    { src: "pretzel-berlin.webp", w: 1600, h: 874, name: "Berlin, redrawn from " + pretzel, alt: "A drawing of the East Side Gallery wall and the Oberbaum Bridge over the Spree." },
    { src: "pretzel-amsterdam.webp", w: 1600, h: 876, name: "Amsterdam, redrawn from " + pretzel, alt: "A drawing of Amsterdam canal houses, an arched bridge, a bicycle and a stroopwafel." },
  ];
  const img = $("[data-place-img]", poster);
  const nameEl = $("[data-place-name]", poster);
  const next = $("[data-place-next]", poster);

  const show = (i, animate) => {
    const p = PLACES[i];
    const apply = () => {
      img.src = ART + p.src;
      img.width = p.w;
      img.height = p.h;
      img.alt = p.alt;
      nameEl.innerHTML = p.name;
      poster.style.setProperty("--poster-c", SUNS[i % SUNS.length]);
    };
    if (!animate || reducedMotion || !img.animate) { apply(); return; }
    const out = img.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: "ease-out", fill: "forwards" });
    out.finished.then(() => {
      apply();
      // fade back in when the new drawing loads, or fails: the sun is never left empty
      const fadeIn = () => {
        out.cancel();
        img.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 460, easing: EASE });
      };
      if (img.complete) { fadeIn(); return; }
      img.addEventListener("load", fadeIn, { once: true });
      img.addEventListener("error", fadeIn, { once: true });
    });
  };

  let current = 0;
  if (next) {
    next.hidden = false;
    const warmed = new Set();
    const warm = (i) => { if (warmed.has(i)) return; warmed.add(i); const im = new Image(); im.src = ART + PLACES[i].src; };
    const warmNext = () => warm((current + 1) % PLACES.length);
    next.addEventListener("pointerenter", warmNext);
    next.addEventListener("focus", warmNext);
    next.addEventListener("click", () => {
      current = (current + 1) % PLACES.length;
      show(current, true);
      warmNext();
    });
  }
}

/* ---------- Home: the project preview follows the row you point at ---------- */
const list = $("[data-list]");
const pvImg = $("[data-pv-img]");
if (list && pvImg) {
  const n = $("[data-pv-n]");
  const meta = $("[data-pv-meta]");
  const what = $("[data-pv-what]");
  const btn = $("[data-pv-btn]");
  const items = $$("li", list);
  const show = (li) => {
    items.forEach((i) => i.classList.toggle("is-on", i === li));
    const a = $("a", li);
    const t = $(".row__t", li).firstChild.textContent.trim();
    const num = $(".row__n > span", li).textContent;
    pvImg.src = "/assets/collection/" + li.dataset.img + ".webp";
    pvImg.alt = li.dataset.alt || "A screenshot of " + t + ".";
    if (n) n.textContent = num + " / " + t;
    if (meta) meta.textContent = li.dataset.kind + " / " + li.dataset.status;
    if (what) what.textContent = $(".row__w", li).textContent;
    if (btn && a) {
      btn.href = a.href;
      btn.textContent = "Open " + t;
      if (a.target) {
        btn.target = a.target;
        btn.rel = a.rel;
        const sr = document.createElement("span");
        sr.className = "sr-only";
        sr.textContent = " (opens in a new tab)";
        btn.append(sr);
      } else {
        btn.removeAttribute("target");
        btn.removeAttribute("rel");
      }
    }
  };
  items.forEach((li) => {
    li.addEventListener("mouseenter", () => show(li));
    li.addEventListener("focusin", () => show(li));
  });
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
  // pages waiting to be clipped; a card that falls off the wall joins the back of the line
  const queue = [
    { img: "/assets/collection/clips/refero.webp", title: "Refero: UI and UX inspiration", domain: "refero.design" },
    { img: "/assets/collection/clips/linear.webp", title: "Linear", domain: "linear.app" },
    { img: "/assets/collection/clips/savee.webp", title: "Savee", domain: "savee.com" },
  ];
  const cardItem = (card) => ({
    img: $("img", card).getAttribute("src"),
    title: $(".mp-card__t", card).textContent,
    domain: $(".mp-card__d", card).textContent,
  });
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
    setPreview(queue[0]);
    button.textContent = "Clip it";
    busy = false;
  };

  const clip = (announce) => {
    if (!wall || !source || !button || flying) return;
    // a click during the "Clipped" pause moves straight on to the next page
    if (busy) reset();
    busy = true;
    flying = true;
    const item = queue.shift();
    const card = makeCard(item);
    $$(".mp-card.is-new", wall).forEach((c) => c.classList.remove("is-new"));

    const finish = () => {
      flying = false;
      button.innerHTML = check + "Clipped";
      if (announce) toast("Clipped. Filed under shiny things.");
      resetTimer = setTimeout(reset, 1600);
    };

    const from = $(".mp-card__img", source).getBoundingClientRect();
    const before = new Map($$(".mp-card", wall).map((c) => [c, c.getBoundingClientRect()]));
    wall.prepend(card);
    $$(".mp-card", wall).slice(6).forEach((c) => { queue.push(cardItem(c)); c.remove(); });

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

  if (button) { button.hidden = false; button.addEventListener("click", () => clip(true)); }
  $$("[data-clip-hint]").forEach((el) => { el.hidden = false; });

  // the page's one authored moment: the first clip plays by itself when the scene is seen
  if (!reducedMotion && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((seen) => {
      if (seen.some((s) => s.isIntersecting)) {
        io.disconnect();
        setTimeout(() => { if (!busy && !flying) clip(false); }, 900);
      }
    }, { threshold: 0.6 });
    io.observe(scene);
  }
}
