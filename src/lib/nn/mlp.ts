// A tiny multilayer perceptron with tanh hidden layers, softmax output and
// plain SGD. Small enough to train in the browser every animation frame.

export type Rng = () => number;

/** Deterministic PRNG so every visitor sees the same initial weights. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class MLP {
  readonly sizes: number[];
  /** weights[l][j * in + i]: from neuron i in layer l to neuron j in layer l+1 */
  weights: Float64Array[] = [];
  biases: Float64Array[] = [];
  /** Activations from the most recent `forward` call, one array per layer. */
  acts: Float64Array[];
  private deltas: Float64Array[];

  constructor(sizes: number[], rng: Rng) {
    this.sizes = sizes;
    this.acts = sizes.map((n) => new Float64Array(n));
    this.deltas = sizes.map((n) => new Float64Array(n));
    this.init(rng);
  }

  init(rng: Rng) {
    this.weights = [];
    this.biases = [];
    for (let l = 0; l < this.sizes.length - 1; l++) {
      const nin = this.sizes[l];
      const nout = this.sizes[l + 1];
      const scale = Math.sqrt(1 / nin); // Xavier-ish for tanh
      const w = new Float64Array(nin * nout);
      for (let k = 0; k < w.length; k++) w[k] = (rng() * 2 - 1) * scale * 1.7;
      this.weights.push(w);
      this.biases.push(new Float64Array(nout));
    }
  }

  /** Runs a forward pass and returns the output probabilities (a view into `acts`). */
  forward(input: ArrayLike<number>): Float64Array {
    const L = this.sizes.length;
    this.acts[0].set(input as ArrayLike<number>);
    for (let l = 0; l < L - 1; l++) {
      const a = this.acts[l];
      const z = this.acts[l + 1];
      const w = this.weights[l];
      const b = this.biases[l];
      const nin = this.sizes[l];
      for (let j = 0; j < z.length; j++) {
        let s = b[j];
        const off = j * nin;
        for (let i = 0; i < nin; i++) s += w[off + i] * a[i];
        z[j] = s;
      }
      if (l < L - 2) for (let j = 0; j < z.length; j++) z[j] = Math.tanh(z[j]);
    }
    softmaxInPlace(this.acts[L - 1]);
    return this.acts[L - 1];
  }

  /** One SGD step on a single example. Returns the cross-entropy loss. */
  step(input: ArrayLike<number>, label: number, lr: number): number {
    const out = this.forward(input);
    const L = this.sizes.length;
    const loss = -Math.log(Math.max(out[label], 1e-12));

    // Output delta for softmax + cross-entropy.
    const dOut = this.deltas[L - 1];
    for (let j = 0; j < out.length; j++) dOut[j] = out[j] - (j === label ? 1 : 0);

    for (let l = L - 2; l >= 0; l--) {
      const a = this.acts[l];
      const d = this.deltas[l + 1];
      const w = this.weights[l];
      const b = this.biases[l];
      const nin = this.sizes[l];
      const dPrev = this.deltas[l];
      if (l > 0) {
        dPrev.fill(0);
        for (let j = 0; j < d.length; j++) {
          const off = j * nin;
          for (let i = 0; i < nin; i++) dPrev[i] += w[off + i] * d[j];
        }
        for (let i = 0; i < nin; i++) dPrev[i] *= 1 - a[i] * a[i]; // tanh'
      }
      for (let j = 0; j < d.length; j++) {
        const off = j * nin;
        const g = d[j] * lr;
        for (let i = 0; i < nin; i++) w[off + i] -= g * a[i];
        b[j] -= g;
      }
    }
    return loss;
  }
}

function softmaxInPlace(v: Float64Array) {
  let max = -Infinity;
  for (let i = 0; i < v.length; i++) if (v[i] > max) max = v[i];
  let sum = 0;
  for (let i = 0; i < v.length; i++) {
    v[i] = Math.exp(v[i] - max);
    sum += v[i];
  }
  for (let i = 0; i < v.length; i++) v[i] /= sum;
}

export interface Sample {
  x: number;
  y: number;
  label: number;
}

/**
 * A k-armed spiral in [-1, 1]². Not linearly separable, so the network has to
 * learn curved decision boundaries, which is what makes the field interesting.
 */
export function spiral(k: number, perClass: number, rng: Rng, turns = 0.75): Sample[] {
  const data: Sample[] = [];
  for (let c = 0; c < k; c++) {
    for (let n = 0; n < perClass; n++) {
      const r = 0.12 + (n / perClass) * 0.85;
      const t = (c / k) * Math.PI * 2 + r * turns * Math.PI * 2 + (rng() - 0.5) * 0.35;
      data.push({ x: r * Math.cos(t), y: r * Math.sin(t), label: c });
    }
  }
  return data;
}
