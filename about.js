/* kellylucas.dev/about
   The watercolor page keeps its own small script (the site's script.js is not
   loaded here). Everything null-checks its targets; with no JavaScript the
   still stands in for the film and the page reads the same. */

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Footer year ---------- */
document.querySelectorAll("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });

/* ---------- The film. Fetched when you get near it, played once (muted) while it is in view; the still stands in until then ---------- */
const film = document.querySelector("[data-film]");
const video = film ? film.querySelector("[data-film-video]") : null;
const ctrls = film ? film.querySelector("[data-film-ctrls]") : null;
if (video && ctrls && video.canPlayType && video.canPlayType("video/mp4")) {
  const playBtn = ctrls.querySelector("[data-film-play]");
  const soundBtn = ctrls.querySelector("[data-film-sound]");
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const auto = !reducedMotion && !saveData && "IntersectionObserver" in window;
  let inView = false;
  let userPaused = false;
  const load = () => {
    if (video.src) return;
    const small = window.matchMedia("(max-width: 760px)").matches;
    video.src = (small && video.dataset.srcSm) || video.dataset.src;
    video.hidden = false;
  };
  const play = () => {
    load();
    if (video.ended) video.currentTime = 0;
    const started = video.play();
    if (started && started.catch) started.catch(() => {});
  };
  const label = () => {
    playBtn.textContent = video.ended ? "Play again" : video.paused ? "Play" : "Pause";
    soundBtn.textContent = video.muted ? "Turn sound on" : "Turn sound off";
  };
  ctrls.hidden = false;
  label();
  ["play", "pause", "ended", "volumechange"].forEach((type) => video.addEventListener(type, label));
  video.addEventListener("playing", () => video.classList.add("is-on"), { once: true });
  playBtn.addEventListener("click", () => {
    if (video.paused || video.ended) { userPaused = false; play(); }
    else { userPaused = true; video.pause(); }
  });
  soundBtn.addEventListener("click", () => { video.muted = !video.muted; label(); });
  if (auto) {
    // start fetching a little before it scrolls in, so the first frame is ready
    const near = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      load();
      video.preload = "auto";
      near.disconnect();
    }, { rootMargin: "400px 0px" });
    near.observe(film);
    const update = () => {
      const live = inView && !document.hidden;
      if (!live) { if (!video.paused) video.pause(); return; }
      if (!userPaused && !video.ended) play();
    };
    new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; update(); }, { threshold: 0.5 }).observe(video.parentElement);
    document.addEventListener("visibilitychange", update);
  }
}
