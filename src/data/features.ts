// Feature maps: what each experience neuron "detects". Clicking an experience
// opens its map, a grid of channels (tiles) like a CNN activation view.
//
// Tiles, in grid order (a diagram takes a 2×2 block, everything else 1×1):
//   diagram  how the system is built: nodes on a col/row grid, edges between them
//   number   one key figure, straight from the résumé
//   status   a full-width "still training" card for a role that's in progress
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
  | { kind: 'status'; title: string; text: string }
  | { kind: 'image'; caption: string; src?: string; alt?: string }
);

export const features: Record<string, Tile[]> = {
  amazon: [
    {
      kind: 'status',
      title: 'Still training.',
      text: 'This layer is learning right now on AWS Skill Builder. Weights converge in Dec 2026; check back for the feature map.',
      a: 0.9,
    },
  ],

  qualcomm: [
    { kind: 'number', value: '96%', label: 'test latency cut', a: 1 },
    { kind: 'number', value: '10+', label: 'parallel agent runs', a: 0.8 },
    { kind: 'number', value: '100+', label: 'playwright tests maintained', a: 0.7 },
    { kind: 'number', value: '30%', label: 'storage cost cut', a: 0.85 },
    { kind: 'number', value: '100+', label: 'attendees at ai connect', a: 0.6 },
    { kind: 'image', caption: 'screenshot' },
    { kind: 'image', caption: 'screenshot' },
    { kind: 'image', caption: 'screenshot' },
  ],

  mpower4: [
    { kind: 'number', value: '35+', label: 'news sources', a: 0.95 },
    { kind: 'number', value: '7', label: 'parallel category agents', a: 0.9 },
    { kind: 'number', value: '4–5s', label: 'latency saved', a: 0.75 },
    { kind: 'number', value: '30%', label: 'token usage cut', a: 0.85 },
    { kind: 'number', value: 'OWASP', label: 'llm input & output guards', a: 0.6 },
    { kind: 'image', caption: 'screenshot' },
    { kind: 'image', caption: 'screenshot' },
    { kind: 'image', caption: 'screenshot' },
  ],

  everest: [
    { kind: 'number', value: '60%', label: 'faster turnaround', a: 1 },
    { kind: 'number', value: '30%', label: 'more investor follow-ups', a: 0.8 },
    { kind: 'number', value: '40%', label: 'fewer parsing errors', a: 0.85 },
    { kind: 'number', value: 'GPT-4o', label: 'langgraph multi-agent', a: 0.6 },
    { kind: 'image', caption: 'screenshot' },
    { kind: 'image', caption: 'screenshot' },
    { kind: 'image', caption: 'screenshot' },
    { kind: 'image', caption: 'screenshot' },
  ],
};
