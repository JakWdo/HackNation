/**
 * SSE Client - odbiera eventy z backendu w czasie rzeczywistym.
 *
 * Używa EventSource API do połączenia z /api/stream/{session_id}
 */

import { 
  AnalyzeRequest, 
  AnalyzeResponse, 
  StreamEvent, 
  ReportSectionType,
  RegionCode,
  SourceCode,
  ChartData
} from '@/types/schemas';
import { AnalysisConfig as RegionAnalysisConfig } from '@/types/regions';

// === TYPY ===

// Re-export StreamEvent as SSEEvent for compatibility if needed, 
// but better to use StreamEvent everywhere.
export type SSEEvent = StreamEvent;

// Helper interfaces for specific event contents if needed, 
// though StreamEvent handles most via optional fields.

export interface ScenarioReport {
  timeframe: '12m' | '36m';
  variant: 'positive' | 'negative';
  title: string;
  content: string;
  confidence: number;
  chartData?: ChartData | null;
}

export type SSECallback = (event: StreamEvent) => void;
export type ErrorCallback = (error: Error) => void;

// === KLIENT SSE ===

export class AnalysisSSEClient {
  private eventSource: EventSource | null = null;
  private sessionId: string | null = null;
  private apiUrl: string;

  constructor(apiUrl?: string) {
    this.apiUrl = apiUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  }

  /**
   * Rozpoczyna analizę i nasłuchuje na eventy.
   *
   * @param query - Zapytanie analityczne
   * @param config - Konfiguracja analizy (regiony, kraje, sektory, wagi)
   * @param onEvent - Callback wywoływany dla każdego eventu
   * @param onError - Callback dla błędów (opcjonalny)
   * @returns Promise z session_id
   */
  async startAnalysis(
    query: string,
    config: RegionAnalysisConfig,
    onEvent: SSECallback,
    onError?: ErrorCallback
  ): Promise<string> {
    // Zamknij poprzednie połączenie
    this.close();

    // Map RegionAnalysisConfig to AnalyzeRequest
    // Note: config.regions etc. are strings, AnalyzeRequest expects Enums or compatible strings.
    // Ideally we should validate/cast but backend handles string matching.
    
    const requestBody: AnalyzeRequest = {
      query,
      regions: config.regions as unknown as RegionCode[], // Cast assuming valid codes
      countries: config.countries,
      sectors: config.sectors as unknown as ReportSectionType[],
      weights: config.weights,
      timeframes: ["12m", "36m"], // Default or from config if added
      include_synthesis: true
    };

    // 1. Wyślij request POST /api/analyze
    const response = await fetch(`${this.apiUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Błąd analizy: ${response.status} - ${errorText}`);
    }

    const data: AnalyzeResponse = await response.json();
    const sessionId = data.session_id;
    this.sessionId = sessionId;

    // 2. Połącz z SSE stream
    this.connectToStream(sessionId, onEvent, onError);

    return sessionId;
  }

  /**
   * Łączy się z istniejącą sesją SSE.
   */
  connectToStream(
    sessionId: string,
    onEvent: SSECallback,
    onError?: ErrorCallback
  ): void {
    this.sessionId = sessionId;
    this.eventSource = new EventSource(`${this.apiUrl}/api/stream/${sessionId}`);

    this.eventSource.onmessage = (event) => {
      try {
        const data: StreamEvent = JSON.parse(event.data);

        // Ignoruj heartbeaty w UI
        if (data.type === 'heartbeat') {
          console.debug('[SSE] Heartbeat received');
          return;
        }

        // Wywołaj callback
        onEvent(data);

        // Zamknij połączenie po done/error
        if (data.type === 'done' || data.type === 'error') {
          this.close();
        }
      } catch (e) {
        console.error('[SSE] Parse error:', e, event.data);
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('[SSE] Connection error:', error);
      onError?.(new Error('Utracono połączenie z serwerem'));
      this.close();
    };

    this.eventSource.onopen = () => {
      console.log('[SSE] Connected to session:', sessionId);
    };
  }

  /**
   * Zamyka połączenie SSE.
   */
  close(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      console.log('[SSE] Connection closed');
    }
  }

  /**
   * Sprawdza czy połączenie jest aktywne.
   */
  isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
  }

  /**
   * Zwraca ID aktualnej sesji.
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Pobiera status sesji z API.
   */
  async getSessionStatus(sessionId?: string): Promise<{
    session_id: string;
    status: string;
    created_at: string;
    query: string;
  }> {
    const id = sessionId || this.sessionId;
    if (!id) throw new Error('Brak session_id');

    const response = await fetch(`${this.apiUrl}/api/session/${id}`);
    if (!response.ok) {
      throw new Error(`Błąd pobierania statusu: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Pobiera wynik zakończonej analizy.
   */
  async getResult(sessionId?: string): Promise<Record<string, unknown>> {
    const id = sessionId || this.sessionId;
    if (!id) throw new Error('Brak session_id');

    const response = await fetch(`${this.apiUrl}/api/session/${id}/result`);
    if (!response.ok) {
      throw new Error(`Błąd pobierania wyniku: ${response.status}`);
    }
    return response.json();
  }
}

// Singleton instance dla globalnego użycia
export const sseClient = new AnalysisSSEClient();

// === HELPER: mapowanie agentów na typy UI ===

export function getAgentType(agent?: string | null): 'orchestrator' | 'regional' | 'country' | 'sector' | 'synthesis' {
  if (!agent) return 'orchestrator';
  if (agent.startsWith('region')) return 'regional';
  if (agent.startsWith('country')) return 'country';
  if (agent.startsWith('sector')) return 'sector';
  if (agent.startsWith('scenario')) return 'synthesis';
  if (agent === 'synthesis') return 'synthesis';
  return 'orchestrator';
}

export function getAgentDisplayName(agent?: string | null): string {
  if (!agent) return 'System';

  const mapping: Record<string, string> = {
    system: 'System',
    supervisor: 'Supervisor',
    meta_supervisor: 'Meta Supervisor',
    synthesis: 'Synteza',
  };

  if (mapping[agent]) return mapping[agent];

  // Parsuj nazwy typu "region_EU" -> "Region: EU"
  if (agent.startsWith('region_')) return `Region: ${agent.replace('region_', '')}`;
  if (agent.startsWith('country_')) return `Kraj: ${agent.replace('country_', '')}`;
  if (agent.startsWith('sector_')) return `Sektor: ${agent.replace('sector_', '')}`;

  return agent;
}