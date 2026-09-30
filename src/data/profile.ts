// Site content, arranged as the layers of the network the page draws:
// input (you) → experience → projects → output (everything else).
// Keep each line short; the layout has room for about two lines per neuron.

export const person = {
  name: 'Rishi Potipireddi',
  school: 'CS @ UC Irvine',
  grad: "'27",
  line: 'I build AI agents that plan, act, and check their own work.',
};

export interface Experience {
  id: string;
  org: string;
  role: string;
  when: string;
  line: string;
}

export const experience: Experience[] = [
  {
    id: 'amazon',
    org: 'Amazon',
    role: 'SDE Intern',
    when: 'Fall 2026',
    line: 'AWS Education Platform.',
  },
  {
    id: 'qualcomm',
    org: 'Qualcomm',
    role: 'Agentic AI/ML Intern',
    when: 'Summer 2026',
    line: 'Agentic browser-testing platform. Cut test latency 96%.',
  },
  {
    id: 'mpower4',
    org: 'MPower4',
    role: 'AI Research Intern',
    when: 'Winter–Spring 2026',
    line: 'Parallel news agents over 35+ sources into per-portfolio digests.',
  },
  {
    id: 'everest',
    org: 'Everest AI Ventures',
    role: 'AI Software Engineer Intern',
    when: '2025',
    line: 'Self-evaluating multi-agent market research. 60% faster turnaround.',
  },
];

export interface Project {
  id: string;
  title: string;
  line: string;
  /** Repo or live site. Omit when there's nothing public to link. */
  href?: string;
}

export const projects: Project[] = [
  {
    id: 'adyou',
    title: 'ADYou',
    line: 'Source-cited ADU guidance with LangGraph RAG. 20+ beta users.',
    href: 'https://adyoualign.com',
  },
  {
    id: 'clarity',
    title: 'Clarity',
    line: 'Multimodal speaking coach built at LA Hacks 2026.',
    href: 'https://github.com/rishirochan/LAHack2026',
  },
  {
    id: 'myeditor',
    title: 'MyEditor',
    line: 'Self-hosted Overleaf. Live LaTeX preview on your own box.',
    href: 'https://github.com/rishirochan/MyEditor',
  },
  {
    id: 'kafka-mcp',
    title: 'Kafka MCP Server',
    line: 'Lets LLMs manage Kafka topics, messages and schemas.',
    href: 'https://github.com/rishirochan/kafka_mcp_server',
  },
  {
    id: 'boring-money',
    title: 'Boring Money',
    line: 'Local desktop app for spending, Plaid sync and questions over transactions.',
    href: 'https://github.com/rishirochan/BoringMoney',
  },
  {
    id: 'fin-copilot',
    title: 'Financial Copilot',
    line: 'Llama 3.1 8B fine-tuned into a tool-routing finance agent. 97% accuracy.',
  },
];

/**
 * Weights from experience to projects, 0–1. Pairs not listed get a faint
 * baseline weight so the layer still reads as fully connected.
 */
export const weights: Record<string, Record<string, number>> = {
  amazon: { myeditor: 0.7, 'kafka-mcp': 0.6 },
  qualcomm: { adyou: 0.7, 'kafka-mcp': 0.9, myeditor: 0.6, clarity: 0.5 },
  mpower4: { 'boring-money': 0.9, 'fin-copilot': 0.8, clarity: 0.4 },
  everest: { adyou: 1, 'fin-copilot': 0.7, 'boring-money': 0.5 },
};
export const BASE_WEIGHT = 0.12;

/** The output neuron: everything that didn't fit in the hidden layers. */
export const output = {
  education: 'B.S. Computer Science, UC Irvine · 2027 · 3.96 GPA',
  skills: ['Python', 'TypeScript', 'SQL', 'C++', 'Swift', 'Java', 'LangGraph', 'FastAPI', 'Next.js', 'Postgres', 'Redis', 'Docker', 'AWS'],
  certs: ['Anthropic: Advanced MCP Server', 'NVIDIA: LLMs with RAG', 'Databricks: Gen AI'],
  leadership: 'Corporate Director, Hack@UCI. Raised $20k+ for a 500-hacker event.',
  links: [
    { label: 'github', href: 'https://github.com/rishirochan' },
    { label: 'linkedin', href: 'https://www.linkedin.com/in/rishi-potipireddi' },
    { label: 'x', href: 'https://x.com/RishiRochan' },
    // Fill in to show:
    { label: 'résumé', href: '' },
  ],
  email: 'rishi.potipireddi@gmail.com',
};
