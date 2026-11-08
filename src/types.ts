import type { Edge, Node, Viewport } from '@xyflow/react';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type Status = 'todo' | 'in-progress' | 'done';

export type ComponentType =
  | 'client' | 'mobile' | 'dns' | 'cdn' | 'lb' | 'gateway' | 'service' | 'worker'
  | 'cache' | 'sql' | 'nosql' | 'blob' | 'queue' | 'pubsub' | 'search' | 'warehouse'
  | 'coordinator' | 'external' | 'note';

export interface ComponentNodeData extends Record<string, unknown> {
  kind: ComponentType;
  label: string;
}

export type DesignNode = Node<ComponentNodeData, 'component'>;

export interface DiagramData {
  nodes: DesignNode[];
  edges: Edge[];
  viewport?: Viewport;
}

export interface RubricItem {
  id: string;
  text: string;
  weight?: number; // default 1
}

export interface RubricSection {
  section: string;
  items: RubricItem[];
}

export interface Problem {
  id: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  summary: string;
  statement: string; // markdown
  clarifyingQuestions: string[];
  hints: string[];
  rubric: RubricSection[];
  reference: {
    markdown: string;
    diagram: DiagramData;
  };
}

export const NOTE_SECTIONS = [
  { key: 'requirements', label: 'Requirements', placeholder: 'Functional requirements\n- ...\n\nNon-functional requirements\n- Availability, latency, consistency, scale...' },
  { key: 'estimates', label: 'Estimates', placeholder: 'DAU, QPS (read/write), storage per year, bandwidth...' },
  { key: 'api', label: 'API', placeholder: 'POST /v1/...\nGET /v1/...' },
  { key: 'dataModel', label: 'Data model', placeholder: 'Tables / collections, keys, indexes, partition key...' },
  { key: 'architecture', label: 'High-level design', placeholder: 'Walk through the request flow of your diagram...' },
  { key: 'deepDives', label: 'Deep dives', placeholder: 'Scaling bottlenecks, caching, sharding, failure handling...' },
  { key: 'tradeoffs', label: 'Trade-offs', placeholder: 'What did you choose and why? What would you revisit?' },
] as const;

export type NoteKey = (typeof NOTE_SECTIONS)[number]['key'];
export type Notes = Partial<Record<NoteKey, string>>;

export interface Attempt {
  diagram: DiagramData;
  notes: Notes;
  rubricChecked: string[];
  hintsRevealed: number;
  referenceRevealed: boolean;
  status: Status;
  timeSpentSec: number;
  updatedAt: number;
}

// ---------- Fix-the-design challenges ----------

/** Matches a node if its id is listed OR its kind is listed. */
export interface Sel {
  kinds?: ComponentType[];
  ids?: string[];
}

export type DesignCheck =
  | { type: 'exists'; sel: Sel; min?: number; label: string }
  | { type: 'link'; a: Sel; b: Sel; label: string }
  | { type: 'noLink'; a: Sel; b: Sel; label: string }
  | { type: 'fanout'; from: Sel; to: Sel; min: number; label: string }
  | { type: 'via'; a: Sel; via: Sel; b: Sel; label: string }
  | { type: 'reach'; a: Sel; b: Sel; label: string }
  /** a can reach b, but not once the `via` nodes are removed (everything flows through via) */
  | { type: 'through'; a: Sel; via: Sel; b: Sel; label: string };

export interface FixChallenge {
  id: string;
  title: string;
  difficulty: Difficulty;
  topic: string;
  summary: string;
  scenario: string; // markdown: the system + symptoms
  goal: string; // one sentence describing what a fixed design must achieve
  start: DiagramData;
  checks: DesignCheck[];
  hints: string[];
  explanation: string; // markdown
  solution: DiagramData;
  /** Nodes (by id in `start`) that are failing, with a short status shown on them while broken. */
  hotspots: Record<string, string>;
  /** Live metrics shown on the canvas: value while broken vs after the fix. */
  metrics: { label: string; broken: string; healthy: string }[];
}

export interface FixAttempt {
  diagram: DiagramData | null; // null = untouched starting design
  solved: boolean;
  checkRuns: number;
  hintsRevealed: number;
  solutionRevealed: boolean;
  updatedAt: number;
}

// ---------- Topic quizzes ----------

export interface QuizQuestion {
  id: string;
  question: string; // markdown
  options: string[];
  answer: number; // index into options
  explanation: string; // markdown
  diagram?: DiagramData; // optional "spot the flaw" diagram
  /** For diagram questions: nodes that light up red once the question is answered. */
  hotspots?: Record<string, string>;
}

export interface QuizTopic {
  id: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
}

export interface QuizProgress {
  answers: Record<string, number>; // question id -> chosen option (current run)
  bestScore: number; // best correct count
  runs: number;
}
