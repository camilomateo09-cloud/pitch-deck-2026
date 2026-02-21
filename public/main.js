/*
  /public/main.js
  Elastic Design - Pitch Dech 2026
  Plain JS: personalization, slide enter animations, stepper, snap-assist, keyboard nav, cursor nav.
*/

/* ===============================
   Helpers
================================ */

function getQueryParam(key) {
  try {
    const url = new URL(window.location.href);
    const v = url.searchParams.get(key);
    return v ? String(v).trim() : null;
  } catch {
    return null;
  }
}

function safeText(v) {
  return typeof v === "string" ? v : "";
}

function shouldEnableCanvas() {
  const prefersReduced =
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  if (prefersReduced) return false;

  const dm = navigator.deviceMemory || 0;
  if (dm && dm <= 2) return false;

  const hc = navigator.hardwareConcurrency || 0;
  if (hc && hc <= 4) return false;

  const conn = navigator.connection;
  if (conn && (conn.saveData || /2g/.test(conn.effectiveType || ""))) return false;

  return true;
}

/* ===============================
   Slides enter animations
================================ */

function initSlides() {
  const slides = Array.from(document.querySelectorAll(".slide"));
  if (!slides.length) return;

  document.documentElement.classList.add("js");

  // ===== Director elements =====
  const canvas = document.getElementById("bg");
  const video = document.getElementById("bg-video");

  // Track last applied state to avoid redundant work
  let activeSlideId = "";
  let currentVideoSrc = "";

  const FADE_MS = 1000;   // debe match con tu CSS transition
  let pauseTimer = 0;

  const hideWebGL = () => {
    if (!canvas) return;
    canvas.style.opacity = "0";
  };

  const showWebGL = () => {
    if (!canvas) return;
    canvas.style.opacity = "1";
  };

  const hideVideo = () => {
    if (!video) return;
    video.style.opacity = "0";
  };

  const showVideo = () => {
    if (!video) return;
    video.style.opacity = "1";
  };

const pauseVideoAfterFade = () => {
  if (!video) return;
  clearTimeout(pauseTimer);
  pauseTimer = window.setTimeout(() => {
    try { video.pause(); } catch {}
  }, FADE_MS);
};

  const playVideo = async () => {
    if (!video) return;
    try {
      await video.play();
    } catch {
      // autoplay might be blocked in edge cases; muted+playsinline usually passes
    }
  };

  const setVideoSrcIfNeeded = (nextSrc) => {
    if (!video) return false;
    const src = String(nextSrc || "").trim();
    if (!src) return false;

    if (src === currentVideoSrc) return false;
    currentVideoSrc = src;

    video.preload = "auto";
    video.style.opacity = "0";

    video.src = src;
    try { video.load(); } catch {}

    return true;
  };


  //const setVideoSrcIfNeeded = (nextSrc) => {
    //if (!video) return false;
    //const src = String(nextSrc || "").trim();
    //if (!src) return false;

    //if (src === currentVideoSrc) return false; // no reload
    //currentVideoSrc = src;

    // Assign + force load to ensure frame is ready
    //video.src = src;
    //try {
      //video.load();
    //} catch {}
    //return true;
  //};

  const applyWebGLStateFromSlide = (slide) => {
    if (!slide) return;

    const id = slide.id;

    // 👉 Solo queremos WebGL en 4, 5 y 9
    const WEBGL_SLIDES = new Set(["slide-4", "slide-5", "slide-9"]);

    if (!WEBGL_SLIDES.has(id)) {
      // Si no es una de esas slides → no hacer nada
      return;
    }

    const nextState = {
      bgColor: "#0b0f14",   // fondo oscuro (puedes cambiar si quieres)
      fgColor: "#00598A",   // 🔷 color solicitado
      speed: 0.7,
      shape: "squares",     // 🔷 SOLO cuadrados
    };

    if (typeof window.updateWebGLState !== "function") {
      window.__pendingWebGLState = nextState;
      return;
    }

    window.updateWebGLState(nextState);
  };



  const onEnterSlideForBackground = (slide) => {
    if (!slide?.id) return;
    if (slide.id === activeSlideId) return; // no-op
    activeSlideId = slide.id;

    const bgType = (slide.dataset.bgType || "webgl").toLowerCase();

    if (bgType === "video") {
      clearTimeout(pauseTimer);
      // ===== VIDEO MODE =====

      // ✅ pausa WebGL (quita lag al cambiar)
      if (typeof window.setWebGLRunning === "function") {
        window.setWebGLRunning(false);
      }

      const nextSrc = slide.dataset.videoSrc;
      setVideoSrcIfNeeded(nextSrc);

      // Mantén WebGL visible mientras el video todavía no tiene 1er frame
      showWebGL();
      hideVideo(); // video empieza oculto

      const reveal = async () => {
        await playVideo();
        showVideo();
        hideWebGL();
      };


      // Si ya tiene frame, cambia ya. Si no, espera a loadeddata.
      if (video && video.readyState >= 2) {
        reveal();
      } else if (video) {
        video.addEventListener("loadeddata", reveal, { once: true });
        // intenta arrancar igual (por si el navegador permite)
        playVideo();
      }

      return;
    }


    // ===== WEBGL MODE =====
    hideVideo();
    pauseVideoAfterFade();

    // ✅ cuando vuelves a WebGL, lo reactivas
    if (typeof window.setWebGLRunning === "function") {
      window.setWebGLRunning(true);
    }

    showWebGL();
    applyWebGLStateFromSlide(slide);

    // ✅ opcional: vuelve a metadata para no descargar video si ya no está activo
    if (video) video.preload = "metadata";

  };

  // ===== Existing animations observer + NEW director logic =====
  const io = new IntersectionObserver(
    (entries) => {
      // Keep your existing per-entry animation logic
      for (const e of entries) {
        if (!e.isIntersecting) {
          e.target.classList.remove("is-active");
          continue;
        }

        e.target.classList.add("is-active");

        if (e.target.id === "slide-1") {
          const el = e.target.querySelector('[data-anim="blur-in"]');
          if (el && !el.dataset.animated) {
            el.dataset.animated = "true";
            el.classList.add("is-in");
          }
        }

        if (e.target.id === "slide-2" || e.target.id === "slide-5") {
          e.target.querySelectorAll('[data-anim="sky"]').forEach((el, i) => {
            if (!el.dataset.animated) {
              el.dataset.animated = "true";
              setTimeout(() => el.classList.add("is-in"), i * 120);
            }
          });
        }

        if (e.target.id === "slide-3") {
          const el = e.target.querySelector('[data-anim="focus"]');
          if (el && !el.dataset.animated) {
            el.dataset.animated = "true";
            el.classList.add("is-in");
          }
        }

        if (e.target.id === "slide-6") {
          const el = e.target.querySelector('[data-anim="ink"]');
          if (el && !el.dataset.animated) {
            el.dataset.animated = "true";
            el.classList.add("is-in");
          }
        }
      }

      // NEW: pick the most-visible slide to drive background state
      let best = null;
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
      }
      if (best?.target) onEnterSlideForBackground(best.target);
    },
    // Use multiple thresholds so "best" selection is stable
    { threshold: [0.55, 0.7, 0.85] }
  );

  slides.forEach((s) => io.observe(s));

  // ✅ Preload video slides when approaching them (makes WebGL<->Video switch instant)
  (function setupVideoPreload() {
    if (!video) return;

    const videoSlides = slides.filter(
      (s) => (s.dataset.bgType || "").toLowerCase() === "video" && s.dataset.videoSrc
    );
    if (!videoSlides.length) return;

    // ✅ Preloader separado (NO toca el bg-video visible)
    const preloader = document.createElement("video");
    preloader.muted = true;
    preloader.playsInline = true;
    preloader.preload = "auto";

    const preloaded = new Set();

    const vio = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;

          const src = (e.target.dataset.videoSrc || "").trim();
          if (!src) continue;
          if (preloaded.has(src)) continue;

          preloaded.add(src);
          preloader.src = src;
          try { preloader.load(); } catch {}
        }
      },
      { rootMargin: "800px 0px 800px 0px", threshold: 0.01 } // 👈 también baja el margen
    );

    videoSlides.forEach((s) => vio.observe(s));
  })();



  // Apply immediately on load
  onEnterSlideForBackground(slides[0]);

  window.addEventListener("webglbg:ready", () => {
    if (window.__pendingWebGLState && typeof window.updateWebGLState === "function") {
      window.updateWebGLState(window.__pendingWebGLState);
      window.__pendingWebGLState = null;
    }
  }, { once: true });

}
function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));
}
/* ===============================
   Highlights
================================ */

function initHighlights() {
  const nodes = Array.from(document.querySelectorAll(".hl"));
  if (!nodes.length) return;

  const prefersReduced =
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          if (prefersReduced) io.unobserve(e.target);
        } else if (!prefersReduced) {
          e.target.classList.remove("is-visible");
        }
      }
    },
    { threshold: 0.6, rootMargin: "0px 0px -10% 0px" }
  );

  nodes.forEach((n) => io.observe(n));
}

/* ===============================
   Personalization
================================ */

async function initPersonalization() {
  const slide2 = document.getElementById("slide2");
  const slide9 = document.getElementById("slide9");
  const idNote = document.getElementById("idNote");

  // si falta alguno, no sigas (evita errores)
  if (!slide2 || !slide9) return;

  const id = getQueryParam("id");

  // fallback = lo que ya está escrito en el HTML
  const fallback = {
    slide2: slide2.textContent?.trim() || "",
    slide9: slide9.textContent?.trim() || "",
  };

  try {
    const res = await fetch("./data/pitch.json", { cache: "no-store" });
    if (!res.ok) throw new Error("pitch.json not found");

    const db = await res.json();
    const rec = (id && db[id]) || null;

    const rawSlide2 = safeText(rec?.slide2 ?? fallback.slide2);
    const rawSlide9 = safeText(rec?.slide9 ?? fallback.slide9);

    // Slide 2: si viene con líneas, lo formateas como: título + lista
    const lines = rawSlide2.split("\n").map((s) => s.trim()).filter(Boolean);

    if (lines.length > 0) {
      const title = lines[0];
      const items = lines.slice(1);

      slide2.innerHTML =
        `<div class="text-body-1">${escapeHTML(title)}</div>` +
        (items.length
          ? `<ul class="why-list text-body-1">${items
              .map((line) => `<li>${escapeHTML(line)}</li>`)
              .join("")}</ul>`
          : "");
    } else {
      slide2.textContent = "";
    }

    // Slide 9: texto simple
    slide9.textContent = rawSlide9;
  } catch (err) {
    console.error("[initPersonalization] ERROR:", err);
    slide2.textContent = fallback.slide2;
    slide9.textContent = fallback.slide9;
  }


  if (idNote) {
    idNote.hidden = true;
    idNote.textContent = "";
  }
}



/* ===============================
   Snap + scroll helpers
================================ */

let snapRaf = 0;
let snapTimer = 0;
let isSnapping = false;

function cancelSnap() {
  if (snapRaf) cancelAnimationFrame(snapRaf);
  snapRaf = 0;
  isSnapping = false;
}

function smoothScrollTo(targetY, duration = 1100) {
  const prefersReduced =
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  if (prefersReduced) {
    window.scrollTo(0, targetY);
    return;
  }

  cancelSnap();
  isSnapping = true;

  const startY = window.scrollY;
  const delta = targetY - startY;
  const start = performance.now();

  const ease = (t) =>
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    window.scrollTo(0, startY + delta * ease(t));
    if (t < 1) snapRaf = requestAnimationFrame(frame);
    else isSnapping = false;
  }

  snapRaf = requestAnimationFrame(frame);
}

function getNearestSlideIndex(slides) {
  const center = window.scrollY + window.innerHeight / 2;
  let best = 0;
  let dist = Infinity;

  slides.forEach((s, i) => {
    const r = s.getBoundingClientRect();
    const c = window.scrollY + r.top + r.height / 2;
    const d = Math.abs(c - center);
    if (d < dist) {
      dist = d;
      best = i;
    }
  });

  return best;
}

function scrollToSlideIndex(slides, index, duration = 1200) {
  const i = Math.max(0, Math.min(slides.length - 1, index));
  const r = slides[i].getBoundingClientRect();
  const y =
    window.scrollY + r.top + r.height / 2 - window.innerHeight / 2;
  smoothScrollTo(y, duration);
}

function initSnapAssist() {
  const slides = Array.from(document.querySelectorAll(".slide"));
  if (!slides.length) return;

  const cancelOnUserInput = () => isSnapping && cancelSnap();
  window.addEventListener("wheel", cancelOnUserInput, { passive: true });
  window.addEventListener("touchstart", cancelOnUserInput, { passive: true });

  window.addEventListener(
    "scroll",
    () => {
      clearTimeout(snapTimer);
      if (isSnapping) return;

      snapTimer = setTimeout(() => {
        const idx = getNearestSlideIndex(slides);
        scrollToSlideIndex(slides, idx, 1200);
      }, 200);
    },
    { passive: true }
  );
}

/* ===============================
   Stepper
================================ */

function initStepper() {
  const list = document.getElementById("stepperList");
  const slides = Array.from(document.querySelectorAll(".slide"));
  if (!list || slides.length === 0) return;

  list.innerHTML = "";

  slides.forEach((slide, idx) => {
    const li = document.createElement("li");
    li.className = "stepper__item";

    const btn = document.createElement("button");
    btn.className = "stepper__btn";
    btn.type = "button";
    btn.dataset.target = slide.id;
    btn.setAttribute("aria-label", `Ir a la slide ${idx + 1}`);

    btn.addEventListener("click", () => {
      scrollToSlideIndex(slides, idx, 1200);
    });

    li.appendChild(btn);
    list.appendChild(li);
  });

  const buttons = Array.from(list.querySelectorAll(".stepper__btn"));
  const setActive = (id) => {
    buttons.forEach((b) =>
      b.setAttribute("aria-current", b.dataset.target === id ? "true" : "false")
    );
  };

  const io = new IntersectionObserver(
    (entries) => {
      let best = null;
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
      }
      if (best?.target?.id) setActive(best.target.id);
    },
    { threshold: [0.55, 0.7, 0.85] }
  );

  slides.forEach((s) => io.observe(s));
  setActive(slides[0].id);
}

/* ===============================
   Keyboard navigation
================================ */

function initKeyboardNav() {
  const slides = Array.from(document.querySelectorAll(".slide"));
  if (!slides.length) return;

  window.addEventListener("keydown", (e) => {
    const idx = getNearestSlideIndex(slides);

    if (["ArrowUp", "ArrowLeft", "PageUp"].includes(e.key)) {
      e.preventDefault();
      scrollToSlideIndex(slides, idx - 1);
    }

    if (["ArrowDown", "ArrowRight", "PageDown", " "].includes(e.key)) {
      e.preventDefault();
      scrollToSlideIndex(slides, idx + 1);
    }
  });
}

/* ===============================
   Cursor navigation (FIXED)
================================ */

function initCursorNavigator() {
  const cursor = document.getElementById("cursorNav");
  const icon = document.getElementById("cursorNavIcon");
  const slides = Array.from(document.querySelectorAll(".slide"));
  if (!cursor || !icon || !slides.length) return;

  const isDesktop =
    window.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches ?? true;
  if (!isDesktop) return;

  // ✅ NEW: interactive elements should win over cursor-nav gestures
  const INTERACTIVE_SELECTOR =
    'a, button, [role="button"], .stepper, .stepper *, .logo, .logo *';

  function isOverInteractiveElement(evt) {
    return evt?.target?.closest?.(INTERACTIVE_SELECTOR);
  }

  const zone = 0.28;
  let dir = "none";

  let tx = window.innerWidth / 2;
  let ty = window.innerHeight / 2;
  let x = tx;
  let y = ty;

  const lerp = (a, b, n) => a + (b - a) * n;

  function setDir(next) {
    if (dir === next) return;
    dir = next;

    if (dir === "up") {
      icon.src = "./assets/up.svg";
      cursor.classList.add("is-visible");
      document.body.classList.add("cursor-nav-active");
    } else if (dir === "down") {
      icon.src = "./assets/down.svg";
      cursor.classList.add("is-visible");
      document.body.classList.add("cursor-nav-active");
    } else {
      cursor.classList.remove("is-visible");
      document.body.classList.remove("cursor-nav-active");
    }
  }

  function updateDirByY(clientY) {
    const h = window.innerHeight;
    const idx = getNearestSlideIndex(slides);

    if (idx === 0) {
      if (clientY >= h * (1 - zone)) setDir("down");
      else setDir("none");
      return;
    }

    if (idx === slides.length - 1) {
      if (clientY <= h * zone) setDir("up");
      else setDir("none");
      return;
    }

    if (clientY <= h * zone) setDir("up");
    else if (clientY >= h * (1 - zone)) setDir("down");
    else setDir("none");
  }

  function tick() {
    x = lerp(x, tx, 0.18);
    y = lerp(y, ty, 0.18);
    cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  window.addEventListener("mousemove", (e) => {
    tx = e.clientX;
    ty = e.clientY;

    // ✅ NEW: if hovering an interactive element, disable cursor-nav
    if (isOverInteractiveElement(e)) {
      setDir("none");
      return;
    }

    updateDirByY(e.clientY);
  });

  window.addEventListener(
    "pointerdown",
    (e) => {
      // ✅ NEW: let interactive elements receive the click
      if (isOverInteractiveElement(e)) return;

      if (dir === "none") return;

      e.preventDefault();
      e.stopImmediatePropagation();

      const idx = getNearestSlideIndex(slides);
      if (dir === "up") scrollToSlideIndex(slides, idx - 1, 1200);
      if (dir === "down") scrollToSlideIndex(slides, idx + 1, 1200);
    },
    { capture: true }
  );
}

/* ===============================
   Canvas gate (WebGL elsewhere)
================================ */

function initCanvasBackground() {
  const canvas = document.getElementById("bg");
  if (!canvas) return;

  if (!shouldEnableCanvas()) {
    document.body.classList.add("no-canvas");
  }
}

/* ===============================
   Init
================================ */

function init() {
  initSlides();
  initHighlights();
  initPersonalization();
  initStepper();
  initSnapAssist();
  initKeyboardNav();
  initCursorNavigator();
  initCanvasBackground();
}

document.readyState === "loading"
  ? document.addEventListener("DOMContentLoaded", init, { once: true })
  : init();