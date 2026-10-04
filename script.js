/* kellylucas.dev · the collection
   Shared by every collection page (index, magpie, playground, log,
   colophon, design, 404). Each feature null-checks its targets, and the
   pages read fine with no JavaScript at all. The toy rooms use lab.js. */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

/* ---------- Footer year ---------- */
$$("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });

/* ---------- Header rule once the page scrolls ---------- */
const header = $(".site-header");
if (header) {
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

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

/* ---------- The index: hover or focus a row, the plate viewer follows ---------- */
const viewer = $("[data-viewer]");
const entries = $$(".entry");
if (viewer && entries.length) {
  const field = $("[data-v-field]", viewer);
  const img = $("[data-v-img]", viewer);
  const parts = {
    plate: $("[data-v-plate]", viewer),
    acc: $("[data-v-acc]", viewer),
    title: $("[data-v-title]", viewer),
    what: $("[data-v-what]", viewer),
    medium: $("[data-v-medium]", viewer),
    status: $("[data-v-status]", viewer),
  };
  let current = null;
  let swapTimer;

  const show = (entry) => {
    if (!entry || entry === current) return;
    current = entry;
    entries.forEach((e) => e.classList.toggle("is-active", e === entry));
    const d = entry.dataset;
    const apply = () => {
      field.className = "plate__field tint-" + d.tint;
      img.src = d.plate;
      img.alt = d.alt || "";
      parts.plate.textContent = "Plate " + d.no;
      parts.acc.textContent = "KL 2026." + d.no;
      parts.title.textContent = d.title;
      parts.what.textContent = d.what;
      parts.medium.textContent = d.medium;
      parts.status.textContent = d.status;
      parts.status.className = "status" + (d.statusKind === "live" ? "" : " status--" + d.statusKind);
      viewer.classList.remove("is-swapping");
    };
    clearTimeout(swapTimer);
    if (reducedMotion) { apply(); return; }
    viewer.classList.add("is-swapping");
    swapTimer = setTimeout(apply, 160);
  };

  entries.forEach((entry) => {
    entry.addEventListener("mouseenter", () => show(entry));
    entry.addEventListener("focus", () => show(entry));
  });
  current = entries.find((e) => e.hasAttribute("data-default")) || entries[0];
  current.classList.add("is-active");

  // warm the plate images once the page is idle, so swaps are instant
  const warm = () => entries.forEach((e) => { const i = new Image(); i.src = e.dataset.plate; });
  ("requestIdleCallback" in window) ? requestIdleCallback(warm) : setTimeout(warm, 1500);
}

/* ---------- The index: filters ---------- */
const filters = $$("[data-filter]");
const entryList = $("[data-entries]");
const countEl = $("[data-count]");
if (filters.length && entryList) {
  filters.forEach((btn) => {
    btn.addEventListener("click", () => {
      const group = btn.dataset.filter;
      filters.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      let shown = 0;
      $$("li", entryList).forEach((li) => {
        const match = group === "all" || li.dataset.group === group;
        li.hidden = !match;
        if (match) shown++;
      });
      if (countEl) countEl.textContent = shown + (shown === 1 ? " object" : " objects");
    });
  });
}

/* ---------- Plate 01: the Magpie popup actually clips (a picture of) a page ---------- */
const scene = $("[data-clip-scene]");
if (scene) {
  const wall = $(".mp-wall", scene);
  const source = $("[data-clip-source]", scene);
  const button = $("[data-clip-button]", scene);
  const queue = [
    { img: "assets/collection/clips/refero.webp", title: "Refero: UI and UX inspiration", domain: "refero.design" },
    { img: "assets/collection/clips/linear.webp", title: "Linear", domain: "linear.app" },
    { img: "assets/collection/clips/savee.webp", title: "Savee", domain: "savee.com" },
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
    button.classList.remove("is-done");
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
      button.classList.add("is-done");
      button.innerHTML = check + "Clipped";
      if (announce) toast("Clipped. Filed under shiny things.");
      step++;
      resetTimer = setTimeout(reset, 1600);
    };

    const from = $(".mp-card__img", source).getBoundingClientRect();
    const before = new Map($$(".mp-card", wall).map((c) => [c, c.getBoundingClientRect()]));
    wall.prepend(card);
    const extra = $$(".mp-card", wall).slice(6);
    extra.forEach((c) => c.remove());

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

  // one authored moment: the first clip plays by itself when the plate is seen
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
