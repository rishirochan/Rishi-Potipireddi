// Scroll-driven forward pass.
//
// Scrolling moves a "signal front" f through the layers. For each layer l:
//   f ∈ [l, l+AXON]              the layer's axons fill (soma → terminal)
//   f ∈ [l+AXON, l+AXON+EDGES]   pulses travel the edges to layer l+1,
//                                strong weights leading, weak ones trailing
// A neuron's activation is the weighted share of its incoming edges that have
// delivered. The camera follows the same scroll, but holds still on each layer
// for a moment so there's time to read.

const AXON = 0.3;
const EDGES = 0.6;
const LEAD = 0.3; // how far the signal runs ahead of the camera
const PAPER = '250,250,250';
const SIGNAL_HI = '91,143,156';

type Pt = { x: number; y: number };
interface NeuronRef {
  el: HTMLElement;
  id: string;
  layer: number;
  inPt: Pt; // world coords of the soma
  outPt: Pt | null; // world coords of the terminal
  a: number;
  fired: boolean;
}
interface Edge {
  src: NeuronRef;
  dst: NeuronRef;
  w: number;
  t: number;
}

export function mountForward(track: HTMLElement) {
  const stage = track.querySelector<HTMLElement>('[data-stage]')!;
  const world = stage.querySelector<HTMLElement>('[data-world]')!;
  const canvas = stage.querySelector<HTMLCanvasElement>('[data-edges]')!;
  const ctx = canvas.getContext('2d')!;
  const layerIndex = stage.querySelector<HTMLElement>('[data-layer-index]')!;
  const layerName = stage.querySelector<HTMLElement>('[data-layer-name]')!;
  const mm = [...stage.querySelectorAll<SVGGElement>('[data-mm]')];
  const layerEls = [...world.querySelectorAll<HTMLElement>('.layer')];
  const names = layerEls.map((l) => (l.getAttribute('aria-label') === 'About' ? 'input' : l.getAttribute('aria-label')!.toLowerCase()));
  names[names.length - 1] = 'output';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const weights: Record<string, number> = JSON.parse(stage.dataset.weights!);

  const neurons: NeuronRef[] = [...world.querySelectorAll<HTMLElement>('[data-neuron]')].map((el) => ({
    el,
    id: el.dataset.neuron!,
    layer: Number(el.dataset.layer),
    inPt: { x: 0, y: 0 },
    outPt: null,
    a: 0,
    fired: false,
  }));
  const L = layerEls.length;
  const byLayer = Array.from({ length: L }, (_, l) => neurons.filter((n) => n.layer === l));
  const edges: Edge[] = [];
  for (let l = 0; l < L - 1; l++)
    for (const src of byLayer[l])
      for (const dst of byLayer[l + 1]) edges.push({ src, dst, w: weights[`${src.id}>${dst.id}`] ?? 0.5, t: 0 });

  // ---- measurement --------------------------------------------------------
  let W = 0;
  let H = 0;
  let dpr = 1;
  let spacing = 1;
  let seg = 1;

  function measure() {
    const r = stage.getBoundingClientRect();
    W = r.width;
    H = r.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    spacing = layerEls[1].offsetLeft + layerEls[1].offsetWidth / 2 - (layerEls[0].offsetLeft + layerEls[0].offsetWidth / 2);
    seg = (track.offsetHeight - window.innerHeight) / (L - 1);

    // World coordinates = screen position minus the world's current translate.
    const wr = world.getBoundingClientRect();
    const center = (el: Element): Pt => {
      const b = el.getBoundingClientRect();
      return { x: b.left + b.width / 2 - wr.left, y: b.top + b.height / 2 - wr.top };
    };
    for (const n of neurons) {
      n.inPt = center(n.el.querySelector('[data-in]')!);
      const out = n.el.querySelector('[data-out]');
      n.outPt = out ? center(out) : null;
    }
  }

  // ---- scroll → progress --------------------------------------------------
  let s = 0; // raw scroll, in layers
  function readScroll() {
    const top = -track.getBoundingClientRect().top;
    s = Math.max(0, Math.min(L - 1, top / seg));
  }
  /** Camera holds on each layer, then eases to the next. */
  function dwell(x: number) {
    const i = Math.floor(x);
    if (i >= L - 1) return L - 1;
    const k = Math.max(0, Math.min(1, (x - i - 0.18) / 0.64));
    return i + easeInOut(k);
  }

  // ---- state --------------------------------------------------------------
  let cam = 0;
  let f = 0;
  const t0 = performance.now();
  let last = t0;
  let current = -1;

  function update(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    readScroll();
    const intro = reduced ? LEAD : Math.min(LEAD, ((now - t0) / 1600) * LEAD);
    const camTarget = dwell(s);
    const fTarget = s >= L - 1 - 1e-3 ? L - 1 + LEAD : Math.min(s + LEAD, L - 1 + LEAD);
    const fGoal = s < 0.01 ? intro : fTarget;
    if (reduced) {
      cam = camTarget;
      f = fGoal;
    } else {
      // Frame-rate independent exponential smoothing; slow and heavy on purpose.
      cam += (camTarget - cam) * (1 - Math.exp(-dt / 0.32));
      f += (fGoal - f) * (1 - Math.exp(-dt / 0.42));
    }
    stage.style.setProperty('--cam', cam.toFixed(4));

    // Edge progress, strong weights first.
    for (const e of edges) {
      const phase = (f - e.src.layer - AXON) / EDGES;
      const delay = (1 - e.w) * 0.35;
      e.t = clamp01((phase - delay) / 0.65);
    }
    // Activations.
    for (const n of neurons) {
      let a: number;
      if (n.layer === 0) a = clamp01(f / 0.08);
      else {
        let num = 0;
        let den = 0;
        for (const e of edges)
          if (e.dst === n) {
            num += e.t * e.w;
            den += e.w;
          }
        a = den ? num / den : 0;
      }
      n.a = a;
      n.el.style.setProperty('--a', a.toFixed(3));
      n.el.style.setProperty('--axon', (a > 0.98 ? clamp01((f - n.layer) / AXON) : 0).toFixed(3));
      if (a > 0.98 && !n.fired) {
        n.fired = true;
        n.el.removeAttribute('data-fired');
        void n.el.offsetWidth; // restart the animation
        n.el.setAttribute('data-fired', '');
      } else if (a < 0.5 && n.fired) {
        n.fired = false;
        n.el.removeAttribute('data-fired');
      }
    }

    const idx = Math.round(cam);
    if (idx !== current) {
      current = idx;
      layerIndex.textContent = String(idx);
      layerName.textContent = names[idx];
      mm.forEach((g, i) => g.toggleAttribute('data-on', i === idx));
    }
  }

  // ---- drawing ------------------------------------------------------------
  function draw(now: number) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const ox = -cam * spacing;
    const drift = reduced ? 0 : -now * 0.012;

    for (const e of edges) {
      if (!e.src.outPt) continue;
      const p0 = { x: e.src.outPt.x + ox, y: e.src.outPt.y };
      const p3 = { x: e.dst.inPt.x + ox, y: e.dst.inPt.y };
      if (Math.max(p0.x, p3.x) < -20 || Math.min(p0.x, p3.x) > W + 20) continue;
      const dx = (p3.x - p0.x) * 0.5;
      const c = [p0, { x: p0.x + dx, y: p0.y }, { x: p3.x - dx, y: p3.y }, p3] as const;

      // The track: always visible, faint.
      ctx.setLineDash([]);
      ctx.lineWidth = 0.6 + e.w * 0.4;
      ctx.strokeStyle = `rgba(${PAPER},${0.035 + e.w * 0.05})`;
      bezier(ctx, c);

      if (e.t <= 0) continue;
      // The lit part of the track, from the source up to the pulse.
      const lit = e.t >= 1 ? c : split(c, e.t);
      ctx.lineWidth = 0.6 + e.w * 0.9;
      ctx.strokeStyle = `rgba(${SIGNAL_HI},${0.12 + e.w * 0.6})`;
      bezier(ctx, lit);

      if (e.t < 1) {
        // Pulse head.
        const h = lit[3];
        const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, 10);
        g.addColorStop(0, `rgba(${PAPER},${0.5 * e.w + 0.2})`);
        g.addColorStop(1, `rgba(${PAPER},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(h.x - 10, h.y - 10, 20, 20);
        ctx.fillStyle = `rgba(${PAPER},0.95)`;
        ctx.beginPath();
        ctx.arc(h.x, h.y, 1.4 + e.w * 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else if (!reduced && e.w > 0.3) {
        // Once delivered, strong connections keep a slow trickle of signal.
        ctx.setLineDash([1.5, 14]);
        ctx.lineDashOffset = drift * (0.6 + e.w);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = `rgba(${PAPER},${0.35 * e.w})`;
        bezier(ctx, c);
      }
    }
    ctx.setLineDash([]);
  }

  // ---- loop ---------------------------------------------------------------
  function frame(now: number) {
    update(now);
    draw(now);
    requestAnimationFrame(frame);
  }

  // ---- navigation ---------------------------------------------------------
  const goTo = (l: number) => {
    const top = track.offsetTop + Math.max(0, Math.min(L - 1, l)) * seg;
    window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
  };
  stage.querySelectorAll<HTMLButtonElement>('[data-jump]').forEach((b) =>
    b.addEventListener('click', () => goTo(Number(b.dataset.jump))),
  );
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(Math.floor(s + 0.5) + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goTo(Math.ceil(s - 0.5) - 1);
    }
  });
  // Horizontal gestures (trackpad swipes, shift+wheel, touch drags) don't drag
  // the page; each one is a single step: right/left = next/previous layer. The
  // swipe only picks the direction, then the page animates the whole way there,
  // so it can never come to rest between two layers.
  const TRIGGER = 30; // px of swipe before it counts
  let pending: number | null = null; // layer we're animating to
  let pendingTimer = 0;
  function step(dir: 1 | -1) {
    readScroll();
    const from = pending ?? Math.round(s);
    const to = Math.max(0, Math.min(L - 1, from + dir));
    if (to === from) return;
    pending = to;
    goTo(to);
    clearTimeout(pendingTimer);
    pendingTimer = window.setTimeout(() => (pending = null), 900);
  }

  // One wheel gesture (including a trackpad's momentum tail) = one step.
  let wheelAcc = 0;
  let wheelUsed = false;
  let wheelIdle = 0;
  window.addEventListener(
    'wheel',
    (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      clearTimeout(wheelIdle);
      wheelIdle = window.setTimeout(() => {
        wheelAcc = 0;
        wheelUsed = false;
      }, 150);
      if (wheelUsed) return;
      wheelAcc += e.deltaX;
      if (Math.abs(wheelAcc) >= TRIGGER) {
        wheelUsed = true;
        step(wheelAcc > 0 ? 1 : -1);
      }
    },
    { passive: false },
  );

  let touch: { x0: number; y0: number; axis: 'x' | 'y' | null; used: boolean } | null = null;
  window.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    touch = { x0: t.clientX, y0: t.clientY, axis: null, used: false };
  });
  window.addEventListener(
    'touchmove',
    (e) => {
      if (!touch || e.touches.length > 1) return;
      const t = e.touches[0];
      const dx = t.clientX - touch.x0;
      const dy = t.clientY - touch.y0;
      if (!touch.axis && Math.hypot(dx, dy) > 8) touch.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (touch.axis !== 'x') return;
      e.preventDefault();
      if (!touch.used && Math.abs(dx) >= TRIGGER) {
        touch.used = true;
        step(dx < 0 ? 1 : -1); // finger moves left = go right, like a carousel
      }
    },
    { passive: false },
  );
  const endTouch = () => (touch = null);
  window.addEventListener('touchend', endTouch);
  window.addEventListener('touchcancel', endTouch);

  // Tabbing to a link in another layer brings that layer into view.
  world.addEventListener('focusin', (e) => {
    const n = (e.target as Element).closest<HTMLElement>('[data-neuron]');
    if (n && Number(n.dataset.layer) !== Math.round(s)) goTo(Number(n.dataset.layer));
  });

  new ResizeObserver(measure).observe(stage);
  document.fonts?.ready.then(measure);
  measure();
  requestAnimationFrame(frame);
}

// ---- helpers --------------------------------------------------------------

function clamp01(x: number) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

type Cubic = readonly [Pt, Pt, Pt, Pt];

function bezier(ctx: CanvasRenderingContext2D, [a, b, c, d]: Cubic) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.bezierCurveTo(b.x, b.y, c.x, c.y, d.x, d.y);
  ctx.stroke();
}

/** First part of a cubic Bézier, up to parameter t (de Casteljau). */
function split([p0, p1, p2, p3]: Cubic, t: number): Cubic {
  const lerp = (a: Pt, b: Pt) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  const a = lerp(p0, p1);
  const b = lerp(p1, p2);
  const c = lerp(p2, p3);
  const d = lerp(a, b);
  const e = lerp(b, c);
  return [p0, a, d, lerp(d, e)];
}
