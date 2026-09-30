// Work section as one dense layer: skills are inputs, roles/projects are
// neurons. Hovering either side propagates activation across the edges.

const NS = 'http://www.w3.org/2000/svg';

export function mountGraph(root: HTMLElement) {
  const svg = root.querySelector<SVGSVGElement>('svg[data-edges]')!;
  const skills = [...root.querySelectorAll<HTMLElement>('[data-skill]')];
  const nodes = [...root.querySelectorAll<HTMLElement>('[data-node]')];
  const edges: { skill: string; node: string; path: SVGPathElement }[] = [];

  function layout() {
    svg.replaceChildren();
    edges.length = 0;
    const r = root.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
    // Edges are only drawn when the two columns sit side by side.
    if (getComputedStyle(svg).display === 'none') return;
    const anchor = (el: HTMLElement, side: 'l' | 'r') => {
      const dot = el.querySelector<HTMLElement>('[data-dot]') ?? el;
      const b = dot.getBoundingClientRect();
      return { x: (side === 'r' ? b.right : b.left) - r.left, y: b.top + b.height / 2 - r.top };
    };
    for (const n of nodes) {
      const uses = n.dataset.uses!.split(' ');
      const b = anchor(n, 'l');
      for (const s of skills) {
        if (!uses.includes(s.dataset.skill!)) continue;
        const a = anchor(s, 'r');
        const mx = (a.x + b.x) / 2;
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', `M${a.x},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`);
        path.setAttribute('pathLength', '1');
        path.style.setProperty('--d', `${edges.length * 18}ms`);
        svg.append(path);
        edges.push({ skill: s.dataset.skill!, node: n.dataset.node!, path });
      }
    }
    // Opening a node resizes the graph and rebuilds the edges; keep the highlight.
    activate(state.kind, state.id);
  }

  const state: { kind: 'skill' | 'node' | null; id?: string } = { kind: null };

  function activate(kind: 'skill' | 'node' | null, id?: string) {
    state.kind = kind;
    state.id = id;
    root.toggleAttribute('data-focus', kind !== null);
    const hotSkills = new Set<string>();
    const hotNodes = new Set<string>();
    for (const e of edges) {
      const on = kind !== null && e[kind] === id;
      e.path.toggleAttribute('data-on', on);
      if (on) {
        hotSkills.add(e.skill);
        hotNodes.add(e.node);
      }
    }
    // Keep propagation working even when edges are hidden (narrow screens).
    if (kind === 'node') {
      hotNodes.add(id!);
      nodes.find((n) => n.dataset.node === id)?.dataset.uses!.split(' ').forEach((s) => hotSkills.add(s));
    } else if (kind === 'skill') {
      hotSkills.add(id!);
      nodes.filter((n) => n.dataset.uses!.split(' ').includes(id!)).forEach((n) => hotNodes.add(n.dataset.node!));
    }
    skills.forEach((s) => s.toggleAttribute('data-on', hotSkills.has(s.dataset.skill!)));
    nodes.forEach((n) => {
      const open = kind === 'node' && n.dataset.node === id;
      n.toggleAttribute('data-on', hotNodes.has(n.dataset.node!));
      n.toggleAttribute('data-open', open);
      n.querySelector('[data-toggle]')?.setAttribute('aria-expanded', String(open));
    });
  }

  let pinned: string | null = null;
  for (const s of skills) {
    const id = s.dataset.skill!;
    s.addEventListener('pointerenter', () => activate('skill', id));
    s.addEventListener('focus', () => activate('skill', id));
  }
  for (const n of nodes) {
    const id = n.dataset.node!;
    n.addEventListener('pointerenter', () => activate('node', id));
    n.querySelector('[data-toggle]')!.addEventListener('click', () => {
      pinned = pinned === id ? null : id;
      pinned ? activate('node', id) : activate(null);
    });
  }
  root.addEventListener('pointerleave', () => (pinned ? activate('node', pinned) : activate(null)));
  root.addEventListener('focusout', (e) => {
    if (!root.contains(e.relatedTarget as Node)) pinned ? activate('node', pinned) : activate(null);
  });

  new ResizeObserver(layout).observe(root);
  document.fonts?.ready.then(layout);
  new IntersectionObserver(
    ([e], io) => {
      if (!e.isIntersecting) return;
      root.setAttribute('data-seen', '');
      io.disconnect();
    },
    { threshold: 0.25 },
  ).observe(root);
}

/** Section-heading neurons fire once when their section scrolls into view. */
export function mountNeurons() {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.setAttribute('data-fired', '');
        io.unobserve(e.target);
      }
    },
    { threshold: 0.6 },
  );
  document.querySelectorAll('[data-neuron]').forEach((n) => io.observe(n));
}
