// Single source of truth for site content. Keep entries short: the site shows
// one line per item and reveals detail on interaction.

export const profile = {
  name: 'Rishi Potipireddi',
  tagline: 'building agentic systems',
  school: 'CS @ UC Irvine',
  grad: '2027',
  about:
    'I build agents that plan, act, and check their own work — from browser-testing platforms at Qualcomm to research pipelines for investors.',
  links: {
    email: 'rishi.potipireddi@gmail.com',
    github: 'https://github.com/rishirochan',
    linkedin: 'https://www.linkedin.com/in/rishi-potipireddi',
  },
} as const;

/** Input layer of the work graph. Ids are referenced by `uses` below. */
export const skills = [
  { id: 'python', label: 'Python' },
  { id: 'ts', label: 'TypeScript' },
  { id: 'agents', label: 'Agents' },
  { id: 'langgraph', label: 'LangGraph' },
  { id: 'rag', label: 'RAG' },
  { id: 'finetune', label: 'Fine-tuning' },
  { id: 'fastapi', label: 'FastAPI' },
  { id: 'playwright', label: 'Playwright' },
  { id: 'sql', label: 'SQL' },
  { id: 'redis', label: 'Redis' },
  { id: 'cloud', label: 'AWS / GCP' },
  { id: 'k8s', label: 'Kubernetes' },
] as const;

export type SkillId = (typeof skills)[number]['id'];

export interface Node {
  id: string;
  kind: 'role' | 'project';
  title: string;
  org: string;
  when: string;
  /** One line, always visible when the node is active. */
  line: string;
  /** Headline number shown as the node's "activation". */
  metric?: { value: string; label: string };
  uses: SkillId[];
  href?: string;
}

export const nodes: Node[] = [
  {
    id: 'amazon',
    kind: 'role',
    title: 'SDE Intern',
    org: 'Amazon',
    when: 'Fall 2026',
    line: 'AWS Education Platform.',
    uses: ['cloud', 'ts'],
  },
  {
    id: 'qualcomm',
    kind: 'role',
    title: 'Agentic AI/ML Intern',
    org: 'Qualcomm',
    when: 'Summer 2026',
    line: 'Agentic browser-test platform with human-in-the-loop executor/evaluator agents; presented to 100+ incl. SVP.',
    metric: { value: '−96%', label: 'test latency' },
    uses: ['agents', 'python', 'ts', 'playwright', 'k8s', 'sql', 'cloud'],
  },
  {
    id: 'mpower4',
    kind: 'role',
    title: 'AI Research Intern',
    org: 'MPower4',
    when: 'Winter–Spring 2026',
    line: 'Multi-threaded news pipeline fanning 7 agents over 35+ sources into per-portfolio digests.',
    metric: { value: '−30%', label: 'tokens' },
    uses: ['agents', 'python'],
  },
  {
    id: 'everest',
    kind: 'role',
    title: 'AI Software Engineer Intern',
    org: 'Everest AI Ventures',
    when: '2025',
    line: 'Self-evaluating multi-agent market-research system for investors.',
    metric: { value: '−60%', label: 'turnaround' },
    uses: ['agents', 'langgraph', 'fastapi', 'python'],
  },
  {
    id: 'adyou',
    kind: 'project',
    title: 'ADYou',
    org: 'Project',
    when: '2026 —',
    line: 'Source-cited ADU guidance via LangGraph RAG. Hackathon idea → 20+ beta users, 25+ contractors.',
    metric: { value: '7s → <1s', label: 'reports' },
    uses: ['langgraph', 'rag', 'fastapi', 'redis', 'sql', 'cloud', 'python'],
  },
  {
    id: 'fincopilot',
    kind: 'project',
    title: 'Financial Copilot',
    org: 'Project',
    when: '2025–26',
    line: 'Llama 3.1 8B fine-tuned (QLoRA) into a tool-routing agent over 32 finance functions.',
    metric: { value: '97%', label: 'accuracy' },
    uses: ['finetune', 'agents', 'python'],
  },
];

export const extras = [
  { label: 'Corporate Director, Hack@UCI', detail: '$20k+ raised · 500+ hackers' },
  { label: 'Certs', detail: 'Anthropic MCP · NVIDIA RAG · Databricks GenAI' },
];
