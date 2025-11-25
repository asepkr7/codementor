export enum DifficultyLevel {
  BEGINNER = 'Pemula',
  INTERMEDIATE = 'Menengah',
  ADVANCED = 'Lanjutan'
}

export enum AppMode {
  EXPLAIN = 'explain',
  FLOWCHART = 'flowchart',
  DEBUG = 'debug',
  RUN = 'run'
}

export type SupportedLanguage = 'javascript' | 'python' | 'java' | 'php' | 'html';

export interface LineExplanation {
  lineNumber: number;
  code: string;
  explanation: string;
  stateChanges?: string; // Optional: track variable changes
}

export interface BugReport {
  bugLocation: string;
  description: string;
  argument: string; // The "argumentative" part explaining WHY it is wrong
  fix: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
}

export interface FlowchartData {
  mermaidCode: string;
  summary: string;
}

export interface ExecutionResponse {
  output: string;
  isError: boolean;
}

// API Response Wrappers
export interface ExplanationResponse {
  lines: LineExplanation[];
  summary: string;
}

export interface DebugResponse {
  bugs: BugReport[];
  generalAdvice: string;
}