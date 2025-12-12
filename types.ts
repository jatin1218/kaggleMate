export interface ColumnStats {
  histogram?: { name: string; value: number }[];
  topValues?: { name: string; value: number }[];
  min?: number;
  max?: number;
  mean?: number;
  quantiles?: {
    q1: number;
    median: number;
    q3: number;
  };
}

export interface ColumnInfo {
  name: string;
  type: 'numeric' | 'string' | 'date' | 'boolean' | 'unknown';
  missing: number;
  unique: number;
  example: string | number | null;
  stats?: ColumnStats;
}

export interface DatasetSummary {
  rowCount: number;
  columns: ColumnInfo[];
  preview: any[]; // Array of objects
  fileName: string;
  contextImages?: string[]; // Base64 strings of uploaded images
  contextDocuments?: { name: string; base64: string }[]; // PDF Documents
}

// New Types for Data Architect Features
export interface Relationship {
  sourceTable: string;
  targetTable: string;
  sourceColumn: string;
  targetColumn: string;
  type: 'One-to-One' | 'One-to-Many' | 'Many-to-Many';
  description: string;
}

export interface DomainConstraint {
  constraint: string;
  severity: 'Critical' | 'Warning';
  validationRule: string; // e.g., "age > 0"
}

export interface SchemaAnalysis {
  combinedSchemaDescription: string;
  relationships: Relationship[];
  generatedSQL: string; // SQL to join tables
  domainConstraints: DomainConstraint[];
  potentialIntegrityIssues: string[];
}

export interface KaggleStrategy {
  targetVariable: string;
  problemType: string;
  recommendedModels: string[];
  keyFeatures: string[];
  strategySteps: {
    title: string;
    description: string;
    priority: 'High' | 'Medium' | 'Low';
  }[];
  predictedScoreRange: string;
  winningTips: string[];
}

export interface LeaderboardEntry {
  rank: number;
  teamName: string;
  score: string;
  entries: number;
  lastSubmission: string;
}

export interface LeaderboardSimulation {
  metric: string;
  entries: LeaderboardEntry[];
}

export interface NotebookCell {
  type: 'code' | 'markdown';
  title?: string;
  content: string;
}

export interface CriticReview {
  approved: boolean;
  score: number; // 0-100 quality score
  critiquePoints: {
    severity: 'Critical' | 'Major' | 'Minor';
    category: 'Leakage' | 'Overfitting' | 'Performance' | 'Code Quality';
    message: string;
    suggestion: string;
  }[];
  overallSummary: string;
}

export interface IterationStat {
  iteration: number;
  score: number;
  modelUsed: string;
  changesMade: string; // Reasoning for changes
  critiqueSummary: string;
  timestamp: number;
}

export interface GeminiAnalysisResult {
  strategy: KaggleStrategy;
  notebookCode: string; // Aggregated code for validation/backward compatibility
  notebookCells?: NotebookCell[]; // Structured cells for .ipynb generation
  criticReview?: CriticReview; // Output from the Critic Agent
  iterationHistory: IterationStat[]; // History of self-improvements
  edaInsights: string;
  dataCleaningRecommendations: string[];
  leaderboardSimulation: LeaderboardSimulation;
  schemaAnalysis?: SchemaAnalysis;
  iterations?: number; // How many loops ran
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING_LOCAL = 'ANALYZING_LOCAL',
  ANALYZING_AI = 'ANALYZING_AI', // Used for the Agent Loop
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export type AgentStage = 'PLANNING' | 'ACTION' | 'VALIDATION' | 'REVISION' | 'COMPLETE';

export interface AgentLog {
  id: string;
  stage: AgentStage;
  agentName?: string; // "Planner", "Builder", "Critic"
  message: string;
  timestamp: number;
}

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  fixedCode: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  fileName: string;
  summary: DatasetSummary;
  analysis: GeminiAnalysisResult;
}

// Declaration for html-to-image if not present in environment types
declare module 'html-to-image' {
  export function toPng(node: HTMLElement, options?: any): Promise<string>;
  export function toJpeg(node: HTMLElement, options?: any): Promise<string>;
  export function toBlob(node: HTMLElement, options?: any): Promise<Blob | null>;
  export function toPixelData(node: HTMLElement, options?: any): Promise<Uint8ClampedArray>;
  export function toSvg(node: HTMLElement, options?: any): Promise<string>;
}