// The loss curve in the output layer: one checkpoint per experience and
// project. `date` places each one on the time axis (experiences at their start,
// projects around when they were built); the chart sorts by it. Loss must
// strictly decrease in date order, and the chart draws a noisy training run
// between checkpoints. Keep each story to one or two short sentences.

export interface Milestone {
  label: string;
  kind: 'experience' | 'project';
  /** Shown on the card. */
  when: string;
  /** YYYY-MM-DD: where the checkpoint sits on the time axis. */
  date: string;
  story: string;
  /** 0–1. Lower than the one before. */
  loss: number;
}

export const milestones: Milestone[] = [
  {
    label: 'First internship · Everest AI Ventures',
    kind: 'experience',
    when: 'Jun–Dec 2025',
    date: '2025-06-01',
    story: 'AI software engineer intern. Built self-evaluating multi-agent market research with 60% faster turnaround.',
    loss: 0.66,
  },
  {
    label: 'Financial Copilot',
    kind: 'project',
    when: '2025–26',
    date: '2025-12-01',
    story: 'Fine-tuned Llama 3.1 8B into a tool-routing finance agent. 97% accuracy.',
    loss: 0.55,
  },
  {
    label: 'MPower4',
    kind: 'experience',
    when: 'Jan–Jun 2026',
    date: '2026-01-05',
    story: 'AI research intern. Parallel news agents over 35+ sources, rolled up into per-portfolio digests.',
    loss: 0.47,
  },
  {
    label: 'ADYou',
    kind: 'project',
    when: '2026',
    date: '2026-02-01',
    story: 'Source-cited ADU guidance with LangGraph RAG. 20+ beta users.',
    loss: 0.41,
  },
  {
    label: 'Kafka MCP Server',
    kind: 'project',
    when: 'Mar–Apr 2026',
    date: '2026-04-01',
    story: 'An MCP server that lets LLMs manage Kafka topics, messages and schemas.',
    loss: 0.35,
  },
  {
    label: 'Hackathon win · LA Hacks',
    kind: 'project',
    when: 'Spring 2026',
    date: '2026-04-25',
    story: 'Built Clarity, a multimodal speaking coach, at LA Hacks 2026.',
    loss: 0.3,
  },
  {
    label: 'Qualcomm',
    kind: 'experience',
    when: 'Jun–Sep 2026',
    date: '2026-06-15',
    story: 'Agentic AI/ML intern. Built an agentic browser-testing platform that cut test latency 96%.',
    loss: 0.24,
  },
  {
    label: 'MyEditor',
    kind: 'project',
    when: 'Summer 2026',
    date: '2026-08-01',
    story: 'A self-hosted Overleaf with live LaTeX preview on your own box.',
    loss: 0.19,
  },
  {
    label: 'Amazon',
    kind: 'experience',
    when: 'Sep–Dec 2026',
    date: '2026-09-08',
    story: 'SDE intern on the AWS T&C Non-metered Billing Service for the Skill Builder platform.',
    loss: 0.15,
  },
  {
    label: 'Boring Money',
    kind: 'project',
    when: 'Sep–Oct 2026',
    date: '2026-10-01',
    story: 'Local desktop app for spending, Plaid sync and questions over transactions.',
    loss: 0.12,
  },
];
