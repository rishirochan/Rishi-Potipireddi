// Hero visual: a real MLP that learns a 4-arm spiral live in the browser.
//  - The background dot field is the network's decision surface, recomputed as
//    it trains, so boundaries visibly sharpen over the first few seconds.
//  - The pointer is the input vector. Each frame runs a forward pass on it;
//    hidden-unit activations and weighted edges are drawn on the diagram.
//  - The output layer is the site nav. Its softmax picks a section.
//  - Clicking perturbs the weights; the network recovers on its own.

import { MLP, mulberry32, spiral } from './mlp';

const PAPER = '250,250,250';
const SIGNAL = '44,87,99';

const HIDDEN = [10, 10];
const LR = 0.03;
const FIELD_STEP = 22; // css px between field dots
const CONVERGED = 0.03;

type Pt = { x: number; y: number };

export function mountHero(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('canvas[data-hero]')!;
  const ctx = canvas.getContext('2d')!;
  const text = root.querySelector<HTMLElement>('[data-text]')!;
  const outputs = [...root.querySelectorAll<HTMLElement>('[data-output]')];
  const glyphs = outputs.map((o) => o.querySelector<HTMLElement>('[data-glyph]')!);
  const probs = outputs.map((o) => o.querySelector<HTMLElement>('[data-prob]')!);
  const lossEl = root.querySelector<HTMLElement>('[data-loss]')!;
  const epochEl = root.querySelector<HTMLElement>('[data-epoch]')!;
  const reinitBtn = root.querySelector<HTMLButtonElement>('[data-reinit]')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const K = outputs.length;
  const data = spiral(K, 60, mulberry32(7), 1.0);
  let seed = 42;
  const net = new MLP([2, ...HIDDEN, K], mulberry32(seed));
  const rng = mulberry32(1);
  let steps = 0;
  let lossEma = Math.log(K);

  function train(n: number) {
    for (let s = 0; s < n; s++) {
      const d = data[(rng() * data.length) | 0];
      const l = net.step([d.x, d.y], d.label, LR);
      lossEma = lossEma * 0.995 + l * 0.005;
      steps++;
    }
  }

  // ---- geometry -----------------------------------------------------------
  let W = 0;
  let H = 0;
  let dpr = 1;
  let center: Pt = { x: 0, y: 0 };
  let unit = 1;
  let layers: Pt[][] = []; // node positions per layer (last = outputs)
  let showDiagram = true;
  let clears: { l: number; t: number; r: number; b: number }[] = [];
  const field = document.createElement('canvas');
  const fctx = field.getContext('2d')!;

  function layout() {
    const r = root.getBoundingClientRect();
    W = r.width;
    H = r.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const c of [canvas, field]) {
      c.width = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
    }
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;


    const rel = (el: Element) => {
      const b = el.getBoundingClientRect();
      return { l: b.left - r.left, t: b.top - r.top, r: b.right - r.left, b: b.bottom - r.top };
    };
    const outPts = glyphs.map((g) => {
      const b = rel(g);
      return { x: (b.l + b.r) / 2, y: (b.t + b.b) / 2 };
    });
    const top = Math.min(...outPts.map((p) => p.y)) - 36;
    const bottom = Math.max(...outPts.map((p) => p.y)) + 36;
    const outX = outPts[0].x;

    // Keep the diagram clear of the name block if they share vertical space.
    const t = rel(text);
    const overlaps = t.t < bottom && t.b > top;
    const leftLimit = overlaps ? t.r + 32 : 24;
    const gap = Math.min(110, (outX - leftLimit) / 3.2);
    showDiagram = gap >= 40;

    // Centre the decision surface in the open space left of the diagram.
    const firstX = outX - gap * (net.sizes.length - 1) - 14;
    center = showDiagram ? { x: (t.r + firstX) / 2, y: H * 0.5 } : { x: W * 0.5, y: H * 0.52 };
    unit = Math.min(W, H) * 0.42;
    // Region kept clear of field dots so the diagram and nav stay legible.
    const navRight = Math.max(...outputs.map((o) => rel(o).r));
    clears = [
      showDiagram
        ? { l: firstX - 24, t: top - 8, r: navRight + 16, b: bottom + 8 }
        : { l: Math.min(...outputs.map((o) => rel(o).l)) - 16, t: top + 12, r: navRight + 16, b: bottom - 12 },
      { l: t.l - 16, t: t.t - 8, r: t.r + 8, b: t.b + 8 },
    ];

    const midY = (top + bottom) / 2;
    const spread = (n: number, x: number) => {
      const s = Math.min(30, Math.max(14, (bottom - top) / n));
      return Array.from({ length: n }, (_, i) => ({ x, y: midY + (i - (n - 1) / 2) * s }));
    };
    const sizes = net.sizes.slice(0, -1);
    layers = sizes.map((n, l) => spread(n, outX - gap * (sizes.length - l) - 14));
    layers.push(outPts.map((p) => ({ x: p.x - 10, y: p.y })));
    fieldDirty = true;
  }

  // ---- input --------------------------------------------------------------
  let pointer: Pt | null = null;
  const cursor: Pt = { x: 0.3, y: -0.2 }; // in network space
  const toNet = (p: Pt): Pt => ({ x: (p.x - center.x) / unit, y: (p.y - center.y) / unit });
  const toScreen = (p: Pt): Pt => ({ x: center.x + p.x * unit, y: center.y + p.y * unit });

  root.addEventListener('pointermove', (e) => {
    const r = root.getBoundingClientRect();
    pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
    if (reduced) requestDraw();
  });
  root.addEventListener('pointerleave', () => (pointer = null));

  const ripples: { p: Pt; t0: number }[] = [];
  root.addEventListener('click', (e) => {
    if ((e.target as Element).closest('a,button')) return;
    const r = root.getBoundingClientRect();
    // A jolt of noise on every weight. Loss spikes, then gradient descent heals it.
    for (const w of net.weights) for (let i = 0; i < w.length; i++) w[i] += (rng() - 0.5) * 1.4;
    lossEma = Math.max(lossEma, 0.8);
    ripples.push({ p: { x: e.clientX - r.left, y: e.clientY - r.top }, t0: performance.now() });
    fieldDirty = true;
    if (reduced) {
      train(30000);
      requestDraw();
    }
  });
  reinitBtn.addEventListener('click', () => {
    net.init(mulberry32(++seed));
    steps = 0;
    lossEma = Math.log(K);
    fieldDirty = true;
    if (reduced) {
      train(30000);
      requestDraw();
    }
  });

  // ---- drawing ------------------------------------------------------------
  let fieldDirty = true;

  /** Class glyphs: filled/ring × paper/signal, so four classes fit three colours. */
  function glyph(c: CanvasRenderingContext2D, x: number, y: number, cls: number, r: number, a: number) {
    const rgb = cls % 2 === 0 ? PAPER : SIGNAL;
    const alpha = cls % 2 === 0 ? a : Math.min(1, a * 1.8);
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    if (cls < 2) {
      c.fillStyle = `rgba(${rgb},${alpha})`;
      c.fill();
    } else {
      c.strokeStyle = `rgba(${rgb},${alpha})`;
      c.lineWidth = 1;
      c.stroke();
    }
  }

  function renderField() {
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fctx.clearRect(0, 0, W, H);
    const input = [0, 0];
    const ox = (W % FIELD_STEP) / 2 + FIELD_STEP / 2;
    const oy = (H % FIELD_STEP) / 2 + FIELD_STEP / 2;
    for (let y = oy; y < H; y += FIELD_STEP) {
      for (let x = ox; x < W; x += FIELD_STEP) {
        input[0] = (x - center.x) / unit;
        input[1] = (y - center.y) / unit;
        const d = Math.hypot(input[0], input[1]);
        let fade = 1 - smooth(0.95, 1.7, d);
        for (const c of clears) {
          const dx = Math.max(c.l - x, 0, x - c.r);
          const dy = Math.max(c.t - y, 0, y - c.b);
          fade *= smooth(0, 44, Math.hypot(dx, dy));
        }
        if (fade <= 0) continue;
        const p = net.forward(input);
        let best = 0;
        for (let k = 1; k < K; k++) if (p[k] > p[best]) best = k;
        const conf = (p[best] - 1 / K) / (1 - 1 / K); // 0 at chance, 1 when certain
        const a = conf * conf * 0.42 * fade;
        if (a < 0.01) continue;
        glyph(fctx, x, y, best, best < 2 ? 1.3 : 1.9, a);
      }
    }
    // Training samples, very faint.
    fctx.fillStyle = `rgba(${PAPER},0.12)`;
    for (const s of data) {
      const p = toScreen(s);
      fctx.fillRect(p.x - 0.5, p.y - 0.5, 1, 1);
    }
    fieldDirty = false;
  }

  let frame = 0;
  function draw(now: number) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(field, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const out = net.forward([cursor.x, cursor.y]);
    const cs = toScreen(cursor);

    // Cursor crosshair, and a faint wire into the input layer.
    ctx.strokeStyle = `rgba(${PAPER},0.55)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cs.x, cs.y, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(${PAPER},0.35)`;
    ctx.font = '10px "Geist Mono Variable", ui-monospace, monospace';
    ctx.fillText(`${fmt(cursor.x)}, ${fmt(-cursor.y)}`, cs.x + 11, cs.y + 3);

    if (showDiagram) {
      ctx.strokeStyle = `rgba(${PAPER},0.07)`;
      for (const n of layers[0]) {
        ctx.beginPath();
        ctx.moveTo(cs.x, cs.y);
        ctx.bezierCurveTo((cs.x + n.x) / 2, cs.y, (cs.x + n.x) / 2, n.y, n.x, n.y);
        ctx.stroke();
      }
      drawNetwork(now);
      ctx.fillStyle = `rgba(${PAPER},0.35)`;
      ctx.fillText('x', layers[0][0].x - 16, layers[0][0].y + 3);
      ctx.fillText('y', layers[0][1].x - 16, layers[0][1].y + 3);
    }

    for (let i = ripples.length - 1; i >= 0; i--) {
      const k = (now - ripples[i].t0) / 900;
      if (k >= 1) {
        ripples.splice(i, 1);
        continue;
      }
      ctx.strokeStyle = `rgba(${SIGNAL},${1 - k})`;
      ctx.beginPath();
      ctx.arc(ripples[i].p.x, ripples[i].p.y, 8 + k * 120, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (frame % 3 === 0) updateDom(out);
    frame++;
  }

  function drawNetwork(now: number) {
    const flow = reduced ? 0 : -now * 0.02;
    for (let l = 0; l < layers.length - 1; l++) {
      const a = net.acts[l];
      const w = net.weights[l];
      const nin = net.sizes[l];
      const from = layers[l];
      const to = layers[l + 1];
      for (let j = 0; j < to.length; j++) {
        for (let i = 0; i < from.length; i++) {
          const wij = w[j * nin + i];
          const s = Math.abs(wij * a[i]);
          const alpha = 0.04 + Math.min(0.6, s * 0.45);
          ctx.strokeStyle = wij * a[i] > 0 ? `rgba(${SIGNAL},${Math.min(1, alpha * 1.8)})` : `rgba(${PAPER},${alpha * 0.6})`;
          ctx.lineWidth = s > 0.6 ? 1.2 : 0.7;
          if (s > 0.35) {
            ctx.setLineDash([2, 6]);
            ctx.lineDashOffset = flow;
          } else ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(from[i].x, from[i].y);
          ctx.lineTo(to[j].x, to[j].y);
          ctx.stroke();
        }
      }
    }
    ctx.setLineDash([]);

    // Neurons (input + hidden). Fill = activation, signal for +, paper for −.
    for (let l = 0; l < layers.length - 1; l++) {
      const a = net.acts[l];
      layers[l].forEach((p, i) => {
        const v = Math.max(-1, Math.min(1, a[i]));
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#060707';
        ctx.fill();
        ctx.fillStyle = v > 0 ? `rgba(${SIGNAL},${0.25 + v * 0.75})` : `rgba(${PAPER},${-v * 0.7})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${PAPER},0.28)`;
        ctx.lineWidth = 0.75;
        ctx.stroke();
      });
    }
  }

  let lastBest = -1;
  function updateDom(out: Float64Array) {
    let best = 0;
    for (let k = 1; k < K; k++) if (out[k] > out[best]) best = k;
    outputs.forEach((o, k) => {
      o.style.setProperty('--p', out[k].toFixed(3));
      probs[k].textContent = out[k].toFixed(2);
    });
    if (best !== lastBest) {
      outputs.forEach((o, k) => o.toggleAttribute('data-active', k === best));
      lastBest = best;
    }
    lossEl.textContent = lossEma.toFixed(3);
    epochEl.textContent = String(Math.floor(steps / data.length)).padStart(3, '0');
  }

  // ---- loop ---------------------------------------------------------------
  let visible = true;
  let raf = 0;

  function tick(now: number) {
    raf = 0;
    const converged = lossEma < CONVERGED;
    train(converged ? 1 : 40);
    if (!converged || frame % 12 === 0) fieldDirty = true;

    const target = pointer
      ? toNet(pointer)
      : { x: 0.62 * Math.sin(now * 0.00021), y: 0.55 * Math.sin(now * 0.00029 + 1.3) };
    cursor.x += (target.x - cursor.x) * 0.12;
    cursor.y += (target.y - cursor.y) * 0.12;

    if (fieldDirty && frame % 2 === 0) renderField();
    draw(now);
    if (visible && !document.hidden) raf = requestAnimationFrame(tick);
  }

  function requestDraw() {
    if (raf) return;
    raf = requestAnimationFrame((now) => {
      raf = 0;
      if (pointer) Object.assign(cursor, toNet(pointer));
      if (fieldDirty) renderField();
      frame = 0;
      draw(now);
    });
  }

  function start() {
    if (reduced) return requestDraw();
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(tick);
  }

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    start();
  }).observe(root);
  document.addEventListener('visibilitychange', start);
  new ResizeObserver(() => {
    layout();
    if (reduced) requestDraw();
  }).observe(root);

  if (reduced) train(30000);
  layout();
  document.fonts?.ready.then(() => {
    layout();
    requestDraw();
  });
  start();
}

function smooth(e0: number, e1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

function fmt(v: number) {
  return (v >= 0 ? ' ' : '−') + Math.abs(v).toFixed(2);
}
