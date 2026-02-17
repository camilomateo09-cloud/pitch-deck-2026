// /public/webgl-bg.js
// Bayer-dither background: triangles or squares + click burst
// Exposes window.updateWebGLState(config)

import * as THREE from "./vendor/three.module.min.js";

(() => {
  const canvas = document.getElementById("bg");
  

  if (!canvas) return;
  // Start hidden until first state is applied (prevents wrong default flash)
  canvas.style.opacity = "0";
  
  const prefersReduced =
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  const dpr = Math.min(1.5, window.devicePixelRatio || 1);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: true,
    powerPreference: "high-performance",
  });

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const geometry = new THREE.PlaneGeometry(2, 2);

  const vertexShader = /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `;

  const fragmentShader = /* glsl */ `
    precision highp float;

    varying vec2 vUv;

    uniform vec2  u_res;
    uniform float u_time;
    uniform vec2  u_click;
    uniform float u_clickTime;
    uniform float u_px;
    uniform float u_density;
    uniform float u_speed;
    uniform float u_burst;
    uniform vec3  u_bg;
    uniform vec3  u_fg;
    uniform float u_shape; // 0 triangles, 1 squares

    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 345.45));
      p += dot(p, p + 34.345);
      return fract(p.x * p.y);
    }

    float hash31(vec3 p) {
      p = fract(p * 0.1031);
      p += dot(p, p.yzx + 33.33);
      return fract((p.x + p.y) * p.z);
    }

    float bayer4(vec2 p) {
      int x = int(mod(p.x, 4.0));
      int y = int(mod(p.y, 4.0));
      int i = y * 4 + x;

      float v = 0.0;
      if(i==0) v=0.0;   else if(i==1) v=8.0;  else if(i==2) v=2.0;  else if(i==3) v=10.0;
      else if(i==4) v=12.0; else if(i==5) v=4.0; else if(i==6) v=14.0; else if(i==7) v=6.0;
      else if(i==8) v=3.0;  else if(i==9) v=11.0; else if(i==10) v=1.0; else if(i==11) v=9.0;
      else if(i==12) v=15.0; else if(i==13) v=7.0; else if(i==14) v=13.0; else v=5.0;

      return (v + 0.5) / 16.0;
    }

    float edgeFn(vec2 a, vec2 b, vec2 p) {
      return (p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x);
    }

    // Equilateral triangle in [0..1] cell. flip=0 up, flip=1 down.
    float triMask(vec2 uv, float flip) {
      vec2 p = uv;

      // flip == 1 -> triangle points down
      if (flip > 0.5) p.y = 1.0 - p.y;

      float s = 0.62;
      float h = 0.86602540378 * s; // sqrt(3)/2 * s
      float yTop = 0.5 - h * 0.5;

      vec2 v0 = vec2(0.5, yTop);
      vec2 v1 = vec2(0.5 - s*0.5, yTop + h);
      vec2 v2 = vec2(0.5 + s*0.5, yTop + h);

      float e0 = edgeFn(v0, v1, p);
      float e1 = edgeFn(v1, v2, p);
      float e2 = edgeFn(v2, v0, p);

      return step(0.0, min(e0, min(e1, e2)));
    }

    float squareMask(vec2 uv) {
      float s = 0.64;
      vec2 p = abs(uv - 0.5);
      return step(p.x, s * 0.5) * step(p.y, s * 0.5);
    }

    void main() {
      // pixel coords
      vec2 frag = vUv * u_res;

      // grid
      vec2 cell = floor(frag / u_px);
      vec2 local = fract(frag / u_px);

      // shape mask
      float flip = mod(cell.x + cell.y, 2.0);
      float mTri = triMask(local, flip);
      float mSq  = squareMask(local);
      float m = mix(mTri, mSq, step(0.5, u_shape));

      // idle flicker
      float n = hash21(cell);
      float wave = sin((u_time * u_speed) + n * 6.28318) * 0.5 + 0.5;
      float gate = step(1.0 - u_density, hash31(vec3(cell, 17.0)));
      float idle = gate * smoothstep(0.35, 0.95, wave);

      // click burst
      float burst = 0.0;
      if (u_clickTime >= 0.0) {
        float age = max(0.0, u_time - u_clickTime);
        float decay = exp(-age * 2.2);

        vec2 clickFrag = u_click * u_res;
        vec2 clickCell = floor(clickFrag / u_px);
        float distCells = length(cell - clickCell);

        float radius = 10.0;
        float inRange = smoothstep(radius, radius * 0.25, distCells);

        float r = hash31(vec3(cell, floor(u_clickTime * 60.0)));
        float pOn = clamp(u_burst * inRange * decay, 0.0, 1.0);

        float r2 = hash31(vec3(cell, floor(u_time * 12.0)));
        burst = step(r, pOn) * (0.6 + 0.4 * step(0.5, r2));
      }

      float brightness = clamp(idle + burst, 0.0, 1.0);

      float th = bayer4(frag);
      float on = step(th, brightness);

      vec3 col = mix(u_bg, u_fg, on * m);
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function getCssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
    return v || fallback;
  }

  const uniforms = {
    u_res: { value: new THREE.Vector2(1, 1) },
    u_time: { value: 0 },
    u_click: { value: new THREE.Vector2(-10, -10) },
    u_clickTime: { value: -1 },
    u_px: { value: 30.0 },
    u_density: { value: 0.22 },
    u_speed: { value: 0.6 },
    u_burst: { value: 0.85 },
    u_bg: { value: new THREE.Color("#18181B") },
    u_fg: { value: new THREE.Color("#00598A") },
    u_shape: { value: 1.0 },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  function resize() {
    const w = Math.max(1, Math.floor(window.innerWidth * dpr));
    const h = Math.max(1, Math.floor(window.innerHeight * dpr));
    renderer.setSize(w, h, false);
    uniforms.u_res.value.set(w, h);
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });

  function setClickFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const cx = "clientX" in e ? e.clientX : e.touches?.[0]?.clientX;
    const cy = "clientY" in e ? e.clientY : e.touches?.[0]?.clientY;
    if (typeof cx !== "number" || typeof cy !== "number") return;

    const x = (cx - rect.left) / rect.width;
    const y = (cy - rect.top) / rect.height;

    uniforms.u_click.value.set(x, 1.0 - y);
    uniforms.u_clickTime.value = uniforms.u_time.value;
  }

  window.addEventListener("pointerdown", setClickFromEvent, { passive: true });
  window.addEventListener("touchstart", setClickFromEvent, { passive: true });

  let raf = 0;
  const start = performance.now();
  let running = true;

  function render(now) {
    raf = requestAnimationFrame(render);
    const t = (now - start) * 0.001;
    uniforms.u_time.value = prefersReduced ? 0.0 : t;
    renderer.render(scene, camera);
  }

  function startRender() {
    if (raf) return; // ya está corriendo
    raf = requestAnimationFrame(render);
  }

  function stopRender() {
    if (!raf) return;
    cancelAnimationFrame(raf);
    raf = 0;
  }

  window.setWebGLRunning = function setWebGLRunning(v) {
    const next = !!v;
    if (next === running) return;
    running = next;

    if (running) startRender();
    else stopRender();
  };

  // iniciar WebGL
  startRender();
  window.addEventListener("pagehide", stopRender, { once: true });


  // ==========================
  // PUBLIC API
  // ==========================
  function clamp01(x) {
    return Math.min(1, Math.max(0, x));
  }

  function toNumber(x) {
    const n = typeof x === "string" ? parseFloat(x) : x;
    return Number.isFinite(n) ? n : null;
  }
  let didApplyFirstState = false;
  window.updateWebGLState = function updateWebGLState(config = {}) {
    if (typeof config.bgColor === "string" && uniforms.u_bg?.value) {
      uniforms.u_bg.value.set(config.bgColor);
    }
    if (typeof config.fgColor === "string" && uniforms.u_fg?.value) {
      uniforms.u_fg.value.set(config.fgColor);
    }

    const sp = toNumber(config.speed);
    if (sp !== null && uniforms.u_speed) uniforms.u_speed.value = Math.max(0, sp);

    const dens = toNumber(config.density);
    if (dens !== null && uniforms.u_density) uniforms.u_density.value = clamp01(dens);

    const px = toNumber(config.px);
    if (px !== null && uniforms.u_px) uniforms.u_px.value = Math.max(6, px);

    const burst = toNumber(config.burst);
    if (burst !== null && uniforms.u_burst) uniforms.u_burst.value = Math.max(0, burst);

    if (uniforms.u_shape) {
      const sh = String(config.shape || "").toLowerCase();
      if (sh === "squares" || sh === "square") uniforms.u_shape.value = 1.0;
      if (sh === "triangles" || sh === "triangle") uniforms.u_shape.value = 0.0;
    }
    // Reveal canvas once we have the intended initial state
    if (!didApplyFirstState) {
      didApplyFirstState = true;
      canvas.style.opacity = "1";
      // Notify main.js that WebGL is ready (optional but best)
      window.dispatchEvent(new Event("webglbg:ready"));
    }
    

  };
  // ✅ Apply pending state from main.js (fix: background missing on first load)
  if (window.__pendingWebGLState) {
    try {
      window.updateWebGLState(window.__pendingWebGLState);
    } catch {}
    window.__pendingWebGLState = null;
  } else {
    // Reveal even if main.js didn't send state yet
    try {
      window.updateWebGLState({});
    } catch {}
  }
})();
