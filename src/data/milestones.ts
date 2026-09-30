// The loss curve in the output layer: one checkpoint per career milestone,
// oldest first. Loss must strictly decrease; the chart draws a noisy training
// run between checkpoints, so the gaps between values set the curve's shape.
// Keep each story to one or two short sentences.

export interface Milestone {
  label: string;
  when: string;
  story: string;
  /** 0–1. Lower than the one before. */
  loss: number;
}

export const milestones: Milestone[] = [
  {
    label: 'First internship · Everest AI Ventures',
    when: '2025',
    story: 'AI software engineer intern. Built self-evaluating multi-agent market research with 60% faster turnaround.',
    loss: 0.62,
  },
  {
    label: 'MPower4',
    when: 'Winter 2026',
    story: 'AI research intern. Parallel news agents over 35+ sources, rolled up into per-portfolio digests.',
    loss: 0.41,
  },
  {
    label: 'Hackathon win · LA Hacks',
    when: '2026',
    story: 'Built Clarity, a multimodal speaking coach, at LA Hacks 2026.',
    loss: 0.3,
  },
  {
    label: 'Qualcomm',
    when: 'Summer 2026',
    story: 'Agentic AI/ML intern. Built an agentic browser-testing platform that cut test latency 96%.',
    loss: 0.19,
  },
  {
    label: 'Amazon',
    when: 'Fall 2026',
    story: 'SDE intern on the AWS Education Platform.',
    loss: 0.13,
  },
];
