const yourDate = new Date("2023-05-30T10:30:05");
// Basenames of the files in music/. To add a song, drop XYZ.mp3 there and add "XYZ" here.
const music = ["CM", "HWM", "ILY3K", "PES", "PSILY", "PPWR", "PtgES", "TE", "UIFY", "WMYB"];

function pad2(n) {
      return String(n).padStart(2, "0");
}

// Whole days, then the hours:minutes:seconds elapsed within the current day.
function elapsed(now, start) {
      const total = Math.floor((now - start) / 1000);
      return {
            days: Math.floor(total / 86400),
            hrs: Math.floor(total / 3600) % 24,
            min: Math.floor(total / 60) % 60,
            sec: total % 60
      };
}

function formatDuration(seconds) {
      if (!isFinite(seconds) || seconds < 0) return "0:00";
      const s = Math.floor(seconds);
      return Math.floor(s / 60) + ":" + pad2(s % 60);
}

// Lets the counter math be checked with Node; in the browser only the second block runs.
if (typeof module === "object" && module.exports) {
      module.exports = { elapsed, pad2, formatDuration, START: yourDate };
}

if (typeof document !== "undefined") {
      document.addEventListener("DOMContentLoaded", init, false);
}

let root;

function init() {
      root = document.documentElement;
      root.setAttribute("data-ready", "");
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const reduceTransparency = window.matchMedia("(prefers-reduced-transparency: reduce)").matches;

      const counter = startCounter(reduceMotion);
      const player = startPlayer();
      startEntrance(player, counter);
      if (!reduceTransparency && supportsRefraction()) startLiquidGlass();
      if (window.matchMedia("(pointer: fine)").matches) followLight();
}

/* ---------- Counter ---------- */

function startCounter(reduceMotion) {
      const daysEl = document.querySelector("[data-days]");
      const clockEl = document.querySelector("[data-clock]");
      const anniEl = document.querySelector("[data-anni]");
      const tapback = document.querySelector("[data-tapback]");
      let countingUp = false;

      const day = [pad2(yourDate.getDate()), pad2(yourDate.getMonth() + 1), yourDate.getFullYear()].join("-");
      const hm = pad2(yourDate.getHours()) + ":" + pad2(yourDate.getMinutes());
      anniEl.textContent = `${day}, ${hm}`;
      anniEl.setAttribute("datetime", `${yourDate.getFullYear()}-${pad2(yourDate.getMonth() + 1)}-${pad2(yourDate.getDate())}T${hm}:${pad2(yourDate.getSeconds())}`);

      function tick() {
            const t = elapsed(new Date(), yourDate);
            if (!countingUp) daysEl.textContent = t.days;
            clockEl.textContent = `${pad2(t.hrs)}:${pad2(t.min)}:${pad2(t.sec)}`;
            if (!reduceMotion && tapback.animate) {
                  tapback.animate(
                        [{ transform: "scale(1)" }, { transform: "scale(1.22)", offset: .22 }, { transform: "scale(1)" }],
                        { duration: 700, easing: "cubic-bezier(.16, 1, .3, 1)" }
                  );
            }
            // Land each tick on the second boundary of the elapsed time.
            setTimeout(tick, 1000 - ((Date.now() - yourDate) % 1000) + 8);
      }
      tick();

      // Played once as the thread opens: the day count develops from zero.
      function countUp() {
            if (reduceMotion) return;
            const target = elapsed(new Date(), yourDate).days;
            const duration = 1500;
            const begin = performance.now();
            countingUp = true;
            function frame(now) {
                  const p = Math.min(1, Math.max(0, (now - begin) / duration));
                  const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
                  daysEl.textContent = Math.round(target * eased);
                  if (p < 1) requestAnimationFrame(frame);
                  else countingUp = false;
            }
            requestAnimationFrame(frame);
      }

      return { countUp };
}

/* ---------- Music player ---------- */

function startPlayer() {
      const el = document.querySelector("[data-player]");
      const audio = el.querySelector("audio");
      const toggle = el.querySelector("[data-toggle]");
      const next = el.querySelector("[data-next]");
      const timeEl = el.querySelector("[data-time]");
      const progressEl = el.querySelector("[data-progress]");
      let current = null;

      function pick(except) {
            const choices = music.length > 1 ? music.filter(name => name !== except) : music;
            return choices[Math.floor(Math.random() * choices.length)];
      }

      function load(name) {
            current = name;
            el.classList.remove("has-error");
            timeEl.textContent = "0:00";
            audio.setAttribute("src", `music/${name}.mp3`);
            if ("mediaSession" in navigator && window.MediaMetadata) {
                  navigator.mediaSession.metadata = new MediaMetadata({
                        title: "RyChi BeenTogether",
                        artwork: [{ src: "img/favicon.png", sizes: "128x128", type: "image/png" }]
                  });
            }
      }

      // play() rejects when the browser blocks sound or a skip interrupts loading; both are fine to ignore.
      function tryPlay() {
            audio.play().catch(() => {});
      }

      function skip() {
            load(pick(current));
            tryPlay();
      }

      toggle.addEventListener("click", () => {
            if (audio.paused) tryPlay();
            else audio.pause();
      });
      next.addEventListener("click", skip);

      audio.addEventListener("play", () => {
            el.classList.add("is-playing");
            toggle.setAttribute("aria-label", "Tạm dừng");
      });
      audio.addEventListener("pause", () => {
            el.classList.remove("is-playing");
            toggle.setAttribute("aria-label", "Phát nhạc");
      });
      audio.addEventListener("waiting", () => el.classList.add("is-loading"));
      audio.addEventListener("playing", () => el.classList.remove("is-loading"));
      audio.addEventListener("canplay", () => el.classList.remove("is-loading"));
      audio.addEventListener("timeupdate", () => {
            const d = audio.duration;
            timeEl.textContent = isFinite(d) ? `${formatDuration(audio.currentTime)} / ${formatDuration(d)}` : formatDuration(audio.currentTime);
            progressEl.style.setProperty("--progress", isFinite(d) && d > 0 ? audio.currentTime / d : 0);
      });
      audio.addEventListener("error", () => {
            el.classList.remove("is-loading", "is-playing");
            el.classList.add("has-error");
            timeEl.textContent = "Không mở được bài này";
      });

      if ("mediaSession" in navigator) {
            navigator.mediaSession.setActionHandler("play", tryPlay);
            navigator.mediaSession.setActionHandler("pause", () => audio.pause());
            try {
                  navigator.mediaSession.setActionHandler("nexttrack", skip);
            } catch (e) {}
      }

      load(pick(null));
      return { audio, tryPlay, toggle };
}

/* ---------- Entrance: "1 tin nhắn mới" ---------- */

function startEntrance(player, counter) {
      const lock = document.getElementById("lock");
      const hidden = [document.querySelector(".app"), document.querySelector(".player")];
      const timeEl = lock.querySelector("[data-lock-time]");
      const dateEl = lock.querySelector("[data-lock-date]");
      const timeFmt = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
      const dateFmt = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "numeric", month: "long" });

      function paintClock() {
            const now = new Date();
            timeEl.textContent = timeFmt.format(now);
            dateEl.textContent = dateFmt.format(now);
      }
      paintClock();
      const clockTimer = setInterval(paintClock, 1000);

      // Chat apps open on the newest message.
      function toLatest() {
            window.scrollTo(0, document.documentElement.scrollHeight);
      }
      // While locked, the blurred thread and player are out of reach for Tab and screen readers.
      hidden.forEach(el => el.inert = true);
      toLatest();
      window.addEventListener("load", () => {
            if (root.classList.contains("is-locked")) toLatest();
      });

      function unlock() {
            if (!root.classList.contains("is-locked")) return;
            player.tryPlay();
            clearInterval(clockTimer);
            hidden.forEach(el => el.inert = false);
            root.classList.add("is-opening");
            root.classList.remove("is-locked");
            toLatest();
            counter.countUp();
            player.toggle.focus({ preventScroll: true });
            setTimeout(() => root.classList.remove("is-opening"), 1000);
      }

      lock.addEventListener("click", unlock);

      // Where the browser allows sound without a tap, skip the lock and just play.
      player.audio.play().then(unlock).catch(() => {});
}

/* ---------- Liquid glass ---------- */

// Refraction needs SVG filters inside backdrop-filter, which only Chromium renders.
function supportsRefraction() {
      const brands = navigator.userAgentData && navigator.userAgentData.brands;
      if (brands) return brands.some(b => /Chromium/.test(b.brand));
      const ua = navigator.userAgent;
      return /\bChrome\/\d+/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

// A displacement map for a rounded rectangle: neutral in the middle,
// pulling the backdrop inward in a curved band along the rim, like a thick lens.
// Red/green carry the x/y displacement; blue marks the rim band for the filter's clear-edge mask.
function lensMap(w, h, radius, band) {
      const scale = .5;
      const cw = Math.max(1, Math.round(w * scale));
      const ch = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      const img = ctx.createImageData(cw, ch);
      const hw = w / 2, hh = h / 2;
      const r = Math.min(radius, hw, hh);

      for (let y = 0; y < ch; y++) {
            for (let x = 0; x < cw; x++) {
                  const px = (x + .5) / scale - hw;
                  const py = (y + .5) / scale - hh;
                  const qx = Math.abs(px) - (hw - r);
                  const qy = Math.abs(py) - (hh - r);
                  let nx, ny, dist;
                  if (qx > 0 && qy > 0) {
                        const len = Math.hypot(qx, qy) || 1;
                        nx = qx / len;
                        ny = qy / len;
                        dist = r - len;
                  } else if (qx > qy) {
                        nx = 1; ny = 0; dist = r - qx;
                  } else {
                        nx = 0; ny = 1; dist = r - qy;
                  }
                  const t = dist <= 0 ? 1 : Math.max(0, 1 - dist / band);
                  const m = t * t;
                  const i = (y * cw + x) * 4;
                  img.data[i] = 128 - Math.sign(px) * nx * m * 127;
                  img.data[i + 1] = 128 - Math.sign(py) * ny * m * 127;
                  img.data[i + 2] = Math.min(1, t * 1.6) * 255;
                  img.data[i + 3] = 255;
            }
      }
      ctx.putImageData(img, 0, 0);
      return canvas.toDataURL();
}

function startLiquidGlass() {
      const SVG = "http://www.w3.org/2000/svg";
      const defs = document.getElementById("glass-filters");
      const lenses = [...document.querySelectorAll('[data-glass="lens"]')];
      const sizes = new Map();
      let version = 0;

      function node(name, attrs) {
            const n = document.createElementNS(SVG, name);
            for (const k in attrs) n.setAttribute(k, attrs[k]);
            return n;
      }

      function build(el, i) {
            const w = el.offsetWidth, h = el.offsetHeight;
            if (!w || !h) return;
            const key = w + "x" + h;
            if (sizes.get(el) === key) return;
            sizes.set(el, key);

            // A fresh id per rebuild, so Chromium re-resolves the filter instead of caching the old one.
            const id = `lens-${i}-${++version}`;
            const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
            const band = Math.min(44, Math.min(w, h) * .36);
            const scale = Math.min(96, band * 3);
            const frost = el.dataset.lensBlur || 8;
            const old = el.dataset.lensId && document.getElementById(el.dataset.lensId);
            if (old) old.remove();
            el.dataset.lensId = id;

            const filter = node("filter", {
                  id, x: 0, y: 0, width: w, height: h,
                  filterUnits: "userSpaceOnUse", primitiveUnits: "userSpaceOnUse",
                  "color-interpolation-filters": "sRGB"
            });
            // Each color channel bends a little more than the last, splitting light at the rim like thick glass.
            const only = [
                  "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0",
                  "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0",
                  "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
            ];
            const channel = (c, k) => [
                  node("feDisplacementMap", { in: "sharp", in2: "map", scale: scale * k, xChannelSelector: "R", yChannelSelector: "G", result: "d" + c }),
                  node("feColorMatrix", { in: "d" + c, type: "matrix", values: only[c], result: "c" + c })
            ];
            const add = (a, b, result) => node("feComposite", { in: a, in2: b, operator: "arithmetic", k1: 0, k2: 1, k3: 1, k4: 0, result });
            filter.append(
                  node("feGaussianBlur", { in: "SourceGraphic", stdDeviation: .6, result: "sharp" }),
                  node("feImage", { href: lensMap(w, h, radius, band), x: 0, y: 0, width: w, height: h, preserveAspectRatio: "none", result: "map" }),
                  ...channel(0, 1), ...channel(1, 1.06), ...channel(2, 1.12),
                  add("c0", "c1", "rg"),
                  add("rg", "c2", "bent"),
                  // Clear, bent glass along the rim; soft frost across the middle, where the text sits.
                  node("feColorMatrix", { in: "map", type: "matrix", values: "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 1 0 0", result: "rimMask" }),
                  node("feComposite", { in: "bent", in2: "rimMask", operator: "in", result: "rim" }),
                  node("feGaussianBlur", { in: "SourceGraphic", stdDeviation: frost, result: "soft" }),
                  node("feComposite", { in: "rim", in2: "soft", operator: "over", result: "glass" }),
                  node("feColorMatrix", { in: "glass", type: "saturate", values: 1.6 })
            );
            defs.append(filter);
            el.style.backdropFilter = `url(#${id})`;
      }

      let queued = false;
      function rebuild() {
            if (queued) return;
            queued = true;
            requestAnimationFrame(() => {
                  queued = false;
                  lenses.forEach(build);
            });
      }

      lenses.forEach(build);
      const ro = new ResizeObserver(rebuild);
      lenses.forEach(el => ro.observe(el));
}

// The specular rim brightens on the side facing the pointer.
function followLight() {
      const glass = [...document.querySelectorAll(".glass")];
      let x = 0, y = 0, queued = false;

      function paint() {
            queued = false;
            for (const el of glass) {
                  const r = el.getBoundingClientRect();
                  if (!r.width || r.bottom < 0 || r.top > window.innerHeight) continue;
                  el.style.setProperty("--lx", ((x - r.left) / r.width * 100).toFixed(1) + "%");
                  el.style.setProperty("--ly", ((y - r.top) / r.height * 100).toFixed(1) + "%");
            }
      }

      window.addEventListener("pointermove", e => {
            x = e.clientX;
            y = e.clientY;
            if (!queued) {
                  queued = true;
                  requestAnimationFrame(paint);
            }
      }, { passive: true });
}
