/**
 * Schematy API - odpowiedniki modeli Pydantic z backendu (@schemas/schemas.py).
 */

// === ENUMS ===

export enum RegionCode {
  EU = "EU",
  USA = "USA",
  NATO = "NATO",
  RUSSIA = "RUSSIA",
  ASIA = "ASIA"
}

export enum SourceCode {
  NATO = "NATO",
  EU_COMMISSION = "EU_COMMISSION",
  US_STATE = "US_STATE",
  UK_FCDO = "UK_FCDO",
  CSIS = "CSIS"
}

export enum ReportSectionType {
  POLITICS = "POLITYKA",
  ECONOMY = "GOSPODARKA",
  DEFENSE = "OBRONNOŚĆ",
  SOCIETY = "SPOŁECZEŃSTWO"
}

export enum CredibilityLevel {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
  SUSPICIOUS = "suspicious"
}

export interface CredibilityScore {
  score: number; // 0.0 to 1.0
  level: CredibilityLevel;
  reasoning: string;
  verified: boolean;
  flags: string[];
}

// === WYNIKI ANALIZY ===

export interface RegionAnalysis {
  region: string;
  summary: string;
  key_findings: string[];
}

export interface CountryAnalysis {
  country?: string | null;
  source: string;
  official_position: string;
  key_statements: string[];
  confidence: number; // default 0.8
}

export interface ExpertAnalysis {
  agent_name: string;
  agent_type: string;
  content: string;
  confidence: number; // default 0.8
}

// === RAPORT ===

export interface ReportSection {
  title: string;
  content: string;
  key_points: string[];
}

export interface FullReport {
  title: string;
  executive_summary: string;
  sections: Record<string, string>;
  generated_at: string; // ISO format
  confidence_score: number; // default 0.0
}

// === API REQUEST/RESPONSE ===

export interface AnalyzeRequest {
  query: string;
  regions?: RegionCode[]; // default [RegionCode.EU]
  countries?: string[]; // ISO codes
  sectors?: ReportSectionType[];
  sources?: SourceCode[];
  weights?: Record<string, number>;
  timeframes?: string[]; // default ["12m", "36m"]
  include_synthesis?: boolean; // default true
}

export interface AnalyzeResponse {
  session_id: string;
  status: string; // default "processing"
  message: string;
}

export interface SessionStatusResponse {
  session_id: string;
  status: string;
  created_at: string;
  query: string;
}

export interface StreamEvent {
  type: string;
  agent?: string | null;
  content: string;
  timestamp?: string | null;

  // Dodatkowe pola dla różnych typów zdarzeń
  query?: string | null;
  docs?: Array<Record<string, any>> | null;
  progress?: number | null;
  section?: string | null;
  timeframe?: string | null;
  variant?: string | null;
  title?: string | null;
  confidence?: number | null;
  session_id?: string | null;
  result?: Record<string, any> | null;

  // NOWE dla features 1.1-1.3
  tagged_info?: Array<Record<string, any>> | null;  // Lista InformationUnit
  reasoning_step?: Record<string, any> | null;       // ReasoningStep
  chart_data?: Record<string, any> | null;           // ChartData

  // === NOWE: Rozbudowany Chain of Thought dla wyjaśnialności ===
  // Typ: reasoning
  step_title?: string | null;
  reasoning?: string | null;
  evidence?: Array<Record<string, any>> | null;
  step_number?: number | null;
  total_steps?: number | null;

  // Typ: correlation
  fact_a?: string | null;
  fact_b?: string | null;
  correlation_type?: 'positive' | 'negative' | 'causal' | 'temporal' | null;
  strength?: number | null;
  explanation?: string | null;
  sources?: string[] | null;

  // Typ: hypothesis
  hypothesis?: string | null;
  basis?: string | null;
  testable_predictions?: string[] | null;

  // Typ: evidence
  hypothesis_ref?: string | null;
  evidence_type?: 'supporting' | 'contradicting' | null;
  impact?: string | null;
  weight?: number | null;
  source?: string | null;

  // Typ: inference (KLUCZOWY dla wyjaśnialności)
  historical_fact?: string | null;
  historical_source?: string | null;
  historical_date?: string | null;
  prediction?: string | null;
  prediction_timeframe?: string | null;
  reasoning_chain?: string[] | null;
  key_assumptions?: string[] | null;
}

// === DOKUMENTY ===

export interface DocumentMetadata {
  // Podstawowe pola
  source: string;
  date?: string | null;
  region?: string | null;
  country?: string | null;
  url?: string | null;
  credibility?: CredibilityScore | null;

  // NOWE dla feature 1.2 - Ścieżka rozumowania z linkami
  title: string;
  snippet?: string | null;  // Fragment z highlighted terms
  author?: string | null;
  published_date?: string | null;  // ISO format
  document_type?: string | null;
  relevance_score: number;

  // NOWE dla feature 1.1 - powiązania z tagami
  related_tags: string[];  // IDs tagów
}

export interface SearchResult {
  content: string;
  metadata: DocumentMetadata;
  relevance_score: number; // default 0.0
}


// === FEATURE 1.1: TAGOWANIE JEDNOSTEK INFORMACJI ===

export interface InformationUnit {
  id: string;
  content: string;
  fact_type: 'economic_indicator' | 'political_event' | 'statement' | 'statistic' | 'other';
  source_doc_ids: string[];
  confidence: number;
  priority: 1 | 2 | 3;  // 1=high, 2=medium, 3=low
  timestamp?: string | null;

  impacts: string[];  // IDs wniosków

  region?: string | null;
  sector?: string | null;
  entities: string[];
}


// === FEATURE 1.2: ŚCIEŻKA ROZUMOWANIA ===

export interface ReasoningStep {
  id: string;
  agent: string;
  agent_type: 'orchestrator' | 'regional' | 'country' | 'sector' | 'synthesis';
  status: 'thinking' | 'searching' | 'analyzing' | 'complete' | 'error';
  content: string;

  // NOWE dla 1.2
  source_docs: DocumentMetadata[];  // Pełne dokumenty
  source_tags: string[];  // IDs tagów
  leads_to: string[];  // IDs następnych kroków

  timestamp: string;
}


// === FEATURE 1.3: WIZUALIZACJA DANYCH ===

export interface ChartDataPoint {
  x?: string | number;
  y?: number;
  name?: string;
  value?: number;
  label?: string;
  [key: string]: any;  // Elastyczność
}

export interface ChartData {
  chart_type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  data: ChartDataPoint[];
  x_axis_label?: string | null;
  y_axis_label?: string | null;
  unit?: string | null;
}