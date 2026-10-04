// Scroll-driven forward pass.
//
// Scrolling moves a "signal front" f through the layers. For each layer l:
//   f ∈ [l, l+AXON]              the layer's axons fill (soma → terminal)
//   f ∈ [l+AXON, l+AXON+EDGES]   pulses travel the edges to layer l+1,
//                                strong weights leading, weak ones trailing
// A neuron's activation is the weighted share of its incoming edges that have
// delivered. The camera follows the same scroll, but holds still on each layer
// for a moment so there's time to read.
//
// The output layer is a set of choices. Hovering (or tapping) one gives it the
// network's vote: the edges into it strengthen in proportion to their weight
// (strong contributors go bold, weak ones barely move), the others fade, and
// the softmax shown next to each choice swings towards it.

const AXON = 0.3;
const EDGES = 0.6;
const LEAD = 0.3; // how far the signal runs ahead of the camera
const PAPER = '250,250,250';
const SIGNAL_HI = '91,143,156';
const PICK_LOGIT = 3.2; // how hard a hovered choice wins the softmax

type Pt = { x: number; y: number };
interface NeuronRef {
  el: HTMLElement;
  id: string;
  layer: number;
  inPt: Pt; // world coords of the soma
  outPt: Pt | null; // world coords of the terminal
  a: number;
  fired: boolean;
  h: number; // hover emphasis, eased towards hTarget
  hTarget: number;
}
interface Edge {
  src: NeuronRef;
  dst: NeuronRef;
  w: number;
  t: number;
  phase: number; // dash offset of the resting trickle
}

export function mountForward(track: HTMLElement) {
  const stage = track.querySelector<HTMLElement>('[data-stage]')!;
  const world = stage.querySelector<HTMLElement>('[data-world]')!;
  const canvas = stage.querySelector<HTMLCanvasElement>('[data-edges]')!;
  const ctx = canvas.getContext('2d')!;
  const layerIndex = stage.querySelector<HTMLElement>('[data-layer-index]')!;
  const layerName = stage.querySelector<HTMLElement>('[data-layer-name]')!;
  const mm = [...stage.querySelectorAll<SVGGElement>('[data-mm]')];
  const island = stage.querySelector<HTMLElement>('[data-island]')!;
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
    h: 0,
    hTarget: 0,
  }));
  const L = layerEls.length;
  const byLayer = Array.from({ length: L }, (_, l) => neurons.filter((n) => n.layer === l));
  const edges: Edge[] = [];
  for (let l = 0; l < L - 1; l++)
    for (const src of byLayer[l])
      for (const dst of byLayer[l + 1]) edges.push({ src, dst, w: weights[`${src.id}>${dst.id}`] ?? 0.5, t: 0, phase: 0 });

  // ---- output choices -----------------------------------------------------
  const choiceBox = world.querySelector<HTMLElement>('[data-choices]');
  const choices = byLayer[L - 1];
  const probEls = choices.map((n) => n.el.querySelector<HTMLElement>('[data-p]'));
  let hovered: NeuronRef | null = null;
  function pick(n: NeuronRef | null) {
    if (n === hovered) return;
    hovered = n;
    for (const c of choices) {
      c.hTarget = c === n ? 1 : 0;
      c.el.toggleAttribute('data-hover', c === n);
    }
    choiceBox?.toggleAttribute('data-hovering', !!n);
  }
  // Each edge's share of the strongest weight into the same choice.
  const rel = new Map<Edge, number>();
  for (const n of choices) {
    const into = edges.filter((e) => e.dst === n);
    const max = Math.max(...into.map((e) => e.w));
    for (const e of into) rel.set(e, e.w / max);
  }
  for (const n of choices) {
    n.el.addEventListener('pointerenter', () => pick(n));
    // A tap has no hover to leave, so a touch pick sticks until the next tap.
    n.el.addEventListener('pointerleave', (e) => e.pointerType !== 'touch' && hovered === n && pick(null));
  }
  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' && !(e.target as Element).closest('.choice')) pick(null);
  });

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
  let dragging = false; // a trackpad is moving the page directly
  let lin = 0; // 0 = camera dwells on layers, 1 = camera tracks scroll 1:1

  function update(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    readScroll();
    const intro = reduced ? LEAD : Math.min(LEAD, ((now - t0) / 1600) * LEAD);
    lin += ((dragging ? 1 : 0) - lin) * (1 - Math.exp(-dt / 0.2));
    const camTarget = dwell(s) + (s - dwell(s)) * lin;
    const fTarget = s >= L - 1 - 1e-3 ? L - 1 + LEAD : Math.min(s + LEAD, L - 1 + LEAD);
    const fGoal = s < 0.01 ? intro : fTarget;
    if (reduced) {
      cam = camTarget;
      f = fGoal;
    } else {
      // Frame-rate independent exponential smoothing; slow and heavy on purpose.
      cam += (camTarget - cam) * (1 - Math.exp(-dt / (0.32 - 0.2 * lin)));
      f += (fGoal - f) * (1 - Math.exp(-dt / 0.42));
    }
    stage.style.setProperty('--cam', cam.toFixed(4));
    // Only the layer the camera is on shows its text; it fades in on arrival.
    layerEls.forEach((el, i) => {
      const vis = clamp01(1 - (Math.abs(cam - i) - 0.1) / 0.4);
      el.style.setProperty('--vis', vis.toFixed(3));
      el.toggleAttribute('data-away', vis < 0.01);
    });

    // The island gives way to the output layer, which carries the links itself.
    const iv = clamp01((L - 1 - cam) / 0.4);
    island.style.setProperty('--vis', iv.toFixed(3));
    island.toggleAttribute('data-away', iv < 0.01);

    // Hover emphasis and the output softmax.
    const kh = reduced ? 1 : 1 - Math.exp(-dt / 0.14);
    let z = 0;
    for (const c of choices) {
      c.h += (c.hTarget - c.h) * kh;
      z += Math.exp(c.h * PICK_LOGIT);
    }
    choices.forEach((c, i) => {
      const el = probEls[i];
      if (el) el.textContent = (Math.exp(c.h * PICK_LOGIT) / z).toFixed(2);
    });

    // Edge progress, strong weights first.
    for (const e of edges) {
      const phase = (f - e.src.layer - AXON) / EDGES;
      const delay = (1 - e.w) * 0.35;
      e.t = clamp01((phase - delay) / 0.65);
      e.phase -= dt * 12 * (0.6 + e.w) * (1 + e.dst.h * e.w * 2.5);
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
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const ox = -cam * spacing;
    let pull = 0; // how much any choice is being hovered
    for (const c of choices) pull = Math.max(pull, c.h);

    for (const e of edges) {
      if (!e.src.outPt) continue;
      const p0 = { x: e.src.outPt.x + ox, y: e.src.outPt.y };
      const p3 = { x: e.dst.inPt.x + ox, y: e.dst.inPt.y };
      if (Math.max(p0.x, p3.x) < -20 || Math.min(p0.x, p3.x) > W + 20) continue;
      const dx = (p3.x - p0.x) * 0.5;
      const c = [p0, { x: p0.x + dx, y: p0.y }, { x: p3.x - dx, y: p3.y }, p3] as const;

      // Hover: edges into the picked choice strengthen, the rest fade.
      const boost = e.dst.h * (rel.get(e) ?? 0) ** 2;
      const fade = 1 - 0.75 * Math.max(0, pull - e.dst.h);
      const thick = 1 + boost * 2.2;

      // The track: always visible, faint.
      ctx.setLineDash([]);
      ctx.lineWidth = (0.6 + e.w * 0.4) * thick;
      ctx.strokeStyle = `rgba(${PAPER},${(0.035 + e.w * 0.05 + boost * 0.12) * fade})`;
      bezier(ctx, c);

      if (e.t <= 0) continue;
      // The lit part of the track, from the source up to the pulse.
      const lit = e.t >= 1 ? c : split(c, e.t);
      ctx.lineWidth = (0.6 + e.w * 0.9) * thick;
      ctx.strokeStyle = `rgba(${SIGNAL_HI},${Math.min(1, (0.12 + e.w * 0.6) * fade + boost * 0.5)})`;
      if (boost > 0.01) {
        ctx.shadowColor = `rgba(${SIGNAL_HI},${boost})`;
        ctx.shadowBlur = 10 * boost;
      }
      bezier(ctx, lit);
      ctx.shadowBlur = 0;

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
        ctx.lineDashOffset = e.phase;
        ctx.lineWidth = 1.2 + boost * 0.8;
        ctx.strokeStyle = `rgba(${PAPER},${Math.min(1, 0.35 * e.w * fade + boost * 0.5)})`;
        bezier(ctx, c);
      }
    }
    ctx.setLineDash([]);
  }

  // ---- loop ---------------------------------------------------------------
  function frame(now: number) {
    update(now);
    draw();
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
  // Panels opened over the network (e.g. the feature map) keep their own
  // scrolling and keys.
  const root = document.documentElement;
  const inPanel = (e: Event) =>
    root.hasAttribute('data-panel-open') || (e.target instanceof Element && !!e.target.closest('[data-panel]'));

  // Scrolling and swiping, in either direction, step one layer at a time:
  // down/right = next layer, up/left = previous. The gesture only picks the
  // direction, then the page animates the whole way there. A trackpad held
  // down and moved slowly is different: the page follows the fingers (back
  // and forth, at their speed), and on release snaps to the nearer layer.
  const TRIGGER = 30; // px of swipe before it counts
  let pending: number | null = null; // layer we're animating to
  let pendingTimer = 0;
  function settle(to: number) {
    pending = to;
    goTo(to);
    clearTimeout(pendingTimer);
    pendingTimer = window.setTimeout(() => {
      pending = null;
      if (!dragging) root.removeAttribute('data-dragging');
    }, 900);
  }
  function step(dir: 1 | -1) {
    readScroll();
    const from = pending ?? Math.round(s);
    const to = Math.max(0, Math.min(L - 1, from + dir));
    if (to === from) return;
    settle(to);
  }

  // Trackpads send one stream of wheel events whether the fingers are down or
  // the page is coasting after they lift, so the page follows the stream from
  // the first event and the gesture is judged by how it ends:
  //   - a flick leaves momentum behind (deltas decaying smoothly from speed):
  //     that's a swipe, so animate on to the next layer in that direction;
  //   - no momentum (fingers slowed and lifted, or just stopped): snap to
  //     whichever layer is closer.
  // A mouse wheel notch (one big delta) still steps one layer.
  const NOTCH = 50; // px in a single event: a wheel notch, not a trackpad
  const IDLE_MS = 140; // no events this long = the gesture is over
  const FLICK_V = 0.6; // px/ms at the start of a decay that counts as a flick
  const DECAY_N = 5; // consecutive shrinking deltas that make a momentum tail
  let gesture: {
    from: number | null; // layer an earlier step was still animating to
    last: number; // time of the previous event
    trail: { d: number; v: number }[]; // recent deltas and speeds, newest last
    done: boolean; // stepped; ignore the rest of this gesture
  } | null = null;
  let wheelIdle = 0;
  function endGesture() {
    const g = gesture;
    gesture = null;
    dragging = false;
    if (!g || g.done) return;
    // Released without a flick: snap (animated) to whichever layer is closer.
    readScroll();
    settle(Math.max(0, Math.min(L - 1, Math.round(s))));
  }
  function flick(g: NonNullable<typeof gesture>, dir: 1 | -1) {
    g.done = true;
    dragging = false;
    readScroll();
    // On from where the page is (or from a step still in flight, the same way),
    // to the next layer boundary ahead.
    let to = dir > 0 ? Math.floor(s + 0.02) + 1 : Math.ceil(s - 0.02) - 1;
    if (g.from !== null && Math.sign(g.from - s) === dir) to = g.from + dir;
    settle(Math.max(0, Math.min(L - 1, to)));
  }
  window.addEventListener(
    'wheel',
    (e) => {
      if (e.ctrlKey || inPanel(e)) return; // pinch-zoom, or a panel scrolling
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      const d = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * unit;
      const now = performance.now();
      clearTimeout(wheelIdle);
      wheelIdle = window.setTimeout(endGesture, IDLE_MS);
      if (!gesture) {
        gesture = { from: pending, last: now - 16, trail: [], done: false };
        if (Math.abs(d) >= NOTCH) {
          gesture.done = true;
          step(d > 0 ? 1 : -1);
          return;
        }
      }
      const g = gesture;
      if (g.done || d === 0) return;
      const v = Math.abs(d) / Math.max(4, now - g.last);
      g.last = now;
      g.trail.push({ d, v });
      if (g.trail.length > DECAY_N + 1) g.trail.shift();

      // Momentum: the last DECAY_N deltas all one way, each smaller than the
      // one before, falling from flick speed.
      const t = g.trail;
      if (t.length === DECAY_N + 1 && t[0].v >= FLICK_V) {
        const dir = Math.sign(t[0].d);
        let decaying = t[t.length - 1].v < t[0].v * 0.97;
        for (let i = 1; i < t.length && decaying; i++)
          decaying = Math.sign(t[i].d) === dir && Math.abs(t[i].d) < Math.abs(t[i - 1].d);
        if (decaying) return flick(g, dir as 1 | -1);
      }

      // Fingers down: the page follows 1:1-ish. About 450px of finger travel
      // per layer, a bit further per px when moving quickly.
      const gain = (seg / 450) * (1 + Math.min(0.8, v * 0.4));
      dragging = true;
      pending = null;
      clearTimeout(pendingTimer);
      root.setAttribute('data-dragging', '');
      window.scrollTo({ top: window.scrollY + d * gain, behavior: 'instant' });
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
      if (!touch || e.touches.length > 1 || inPanel(e)) return;
      const t = e.touches[0];
      const dx = t.clientX - touch.x0;
      const dy = t.clientY - touch.y0;
      if (!touch.axis && Math.hypot(dx, dy) > 8) touch.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (!touch.axis) return;
      e.preventDefault();
      const d = touch.axis === 'x' ? dx : dy;
      if (!touch.used && Math.abs(d) >= TRIGGER) {
        touch.used = true;
        step(d < 0 ? 1 : -1); // finger moves left/up = next layer
      }
    },
    { passive: false },
  );
  const endTouch = () => (touch = null);
  window.addEventListener('touchend', endTouch);
  window.addEventListener('touchcancel', endTouch);

  const KEYS: Record<string, 1 | -1> = {
    ArrowRight: 1, ArrowDown: 1, PageDown: 1, ' ': 1,
    ArrowLeft: -1, ArrowUp: -1, PageUp: -1,
  };
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey || inPanel(e)) return;
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      goTo(e.key === 'Home' ? 0 : L - 1);
      return;
    }
    const dir = KEYS[e.key];
    if (!dir || (e.key === ' ' && e.target instanceof Element && e.target.closest('button, a'))) return;
    e.preventDefault();
    step(e.key === ' ' && e.shiftKey ? -1 : dir);
  });

  // Tabbing to a link in another layer brings that layer into view.
  world.addEventListener('focusin', (e) => {
    const l = layerEls.indexOf((e.target as Element).closest<HTMLElement>('.layer')!);
    if (l >= 0 && l !== Math.round(s)) goTo(l);
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
