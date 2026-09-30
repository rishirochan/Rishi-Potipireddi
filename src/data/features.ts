// Feature maps: what each experience neuron "detects". Clicking an experience
// opens its map, a grid of channels (tiles) like a CNN activation view.
//
// Tiles, in grid order (a diagram takes a 2×2 block, everything else 1×1):
//   diagram  how the system is built: nodes on a col/row grid, edges between them
//   number   one key figure; only facts that are already in profile.ts
//   image    a screenshot. Drop the file in public/features/<id>/ and set `src`
//            (e.g. src: '/features/qualcomm/1.png'); without it a placeholder shows.
// `a` is the channel's activation, 0–1: how strongly the tile is tinted.
// Leave it out and each tile gets a steady pseudo-random one.

export interface DiagramNode {
  id: string;
  label: string;
  /** Column, left → right, like the page's layers. */
  col: number;
  /** Row within the column; fractions are fine for centring. */
  row: number;
  /** Draw in the signal colour: the part this role owned. */
  hi?: boolean;
}

export type Tile = { a?: number } & (
  | {
      kind: 'diagram';
      caption: string;
      nodes: DiagramNode[];
      /** [from, to]. An edge that runs backwards (to an earlier column) draws as a dashed loop. */
      edges: [string, string][];
    }
  | { kind: 'number'; value: string; label: string }
  | { kind: 'image'; caption: string; src?: string; alt?: string }
);

export const features: Record<string, Tile[]> = {
  amazon: [
    {
      kind: 'diagram',
      caption: 'system sketch',
      a: 0.9,
      nodes: [
        { id: 'user', label: 'learners', col: 0, row: 1 },
        { id: 'web', label: 'web app', col: 1, row: 1 },
        { id: 'api', label: 'services', col: 2, row: 1, hi: true },
        { id: 'content', label: 'content', col: 3, row: 0.4 },
        { id: 'progress', label: 'progress', col: 3, row: 1.6 },
      ],
      edges: [
        ['user', 'web'],
        ['web', 'api'],
        ['api', 'content'],
        ['api', 'progress'],
      ],
    },
    { kind: 'number', value: 'aws', label: 'education platform', a: 0.7 },
    { kind: 'image', caption: 'screenshot' },
    { kind: 'image', caption: 'screenshot' },
    { kind: 'image', caption: 'screenshot' },
  ],

  qualcomm: [
    {
      kind: 'diagram',
      caption: 'agentic test loop',
      a: 0.85,
      nodes: [
        { id: 'spec', label: 'test spec', col: 0, row: 1 },
        { id: 'plan', label: 'planner', col: 1, row: 1, hi: true },
        { id: 'b1', label: 'browser', col: 2, row: 0 },
        { id: 'b2', label: 'browser', col: 2, row: 1 },
        { id: 'b3', label: 'browser', col: 2, row: 2 },
        { id: 'check', label: 'verifier', col: 3, row: 1, hi: true },
      ],
      edges: [
        ['spec', 'plan'],
        ['plan', 'b1'],
        ['plan', 'b2'],
        ['plan', 'b3'],
        ['b1', 'check'],
        ['b2', 'check'],
        ['b3', 'check'],
        ['check', 'plan'],
      ],
    },
    { kind: 'number', value: '96%', label: 'test latency cut', a: 1 },
    { kind: 'image', caption: 'screenshot' },
    { kind: 'image', caption: 'screenshot' },
    { kind: 'image', caption: 'screenshot' },
  ],

  mpower4: [
    {
      kind: 'diagram',
      caption: 'news pipeline',
      a: 0.8,
      nodes: [
        { id: 's1', label: 'src 01', col: 0, row: 0 },
        { id: 's2', label: 'src 02', col: 0, row: 1 },
        { id: 's3', label: 'src 35', col: 0, row: 2 },
        { id: 'a1', label: 'agent', col: 1, row: 0, hi: true },
        { id: 'a2', label: 'agent', col: 1, row: 1, hi: true },
        { id: 'a3', label: 'agent', col: 1, row: 2, hi: true },
        { id: 'merge', label: 'rank', col: 2, row: 1 },
        { id: 'p1', label: 'digest a', col: 3, row: 0.4 },
        { id: 'p2', label: 'digest b', col: 3, row: 1.6 },
      ],
      edges: [
        ['s1', 'a1'],
        ['s2', 'a2'],
        ['s3', 'a3'],
        ['a1', 'merge'],
        ['a2', 'merge'],
        ['a3', 'merge'],
        ['merge', 'p1'],
        ['merge', 'p2'],
      ],
    },
    { kind: 'number', value: '35+', label: 'news sources', a: 0.95 },
    { kind: 'image', caption: 'screenshot' },
    { kind: 'image', caption: 'screenshot' },
    { kind: 'image', caption: 'screenshot' },
  ],

  everest: [
    {
      kind: 'diagram',
      caption: 'self-evaluating research',
      a: 0.85,
      nodes: [
        { id: 'brief', label: 'brief', col: 0, row: 1 },
        { id: 'r1', label: 'research', col: 1, row: 0.4 },
        { id: 'r2', label: 'research', col: 1, row: 1.6 },
        { id: 'critic', label: 'critic', col: 2, row: 1, hi: true },
        { id: 'report', label: 'report', col: 3, row: 1 },
      ],
      edges: [
        ['brief', 'r1'],
        ['brief', 'r2'],
        ['r1', 'critic'],
        ['r2', 'critic'],
        ['critic', 'r1'],
        ['critic', 'report'],
      ],
    },
    { kind: 'number', value: '60%', label: 'faster turnaround', a: 1 },
    { kind: 'image', caption: 'screenshot' },
    { kind: 'image', caption: 'screenshot' },
    { kind: 'image', caption: 'screenshot' },
  ],
};
