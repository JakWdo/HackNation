/**
 * Hook do zarządzania analizą z SSE streaming.
 *
 * Użycie:
 * ```tsx
 * const { isAnalyzing, thoughtSteps, scenarios, startAnalysis } = useAnalysis();
 *
 * await startAnalysis("Analiza wpływu...", { regions: ["EU"], ... });
 * ```
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  sseClient,
  SSEEvent,
  ScenarioReport,
  getAgentType,
  getAgentDisplayName,
} from '@/lib/sse';
import { AnalysisConfig } from '@/types/regions';
import type { ThoughtStep } from '@/components/ui/ChainOfThought';
import { InformationUnit, ChartData } from '@/types/schemas';

interface UseAnalysisReturn {
  // Stan
  isAnalyzing: boolean;
  thoughtSteps: ThoughtStep[];
  scenarios: ScenarioReport[];
  error: string | null;
  sessionId: string | null;
  progress: number;

  // Akcje
  startAnalysis: (query: string, config: AnalysisConfig) => Promise<void>;
  stopAnalysis: () => void;
  clearResults: () => void;
}

export function useAnalysis(): UseAnalysisReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [thoughtSteps, setThoughtSteps] = useState<ThoughtStep[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioReport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const stepIdCounter = useRef(0);

  // Cleanup przy unmount
  useEffect(() => {
    return () => {
      sseClient.close();
    };
  }, []);

  /**
   * Mapuje event SSE na ThoughtStep dla ChainOfThought.
   */
  const mapEventToStep = useCallback((event: SSEEvent): ThoughtStep | null => {
    const baseStep = {
      id: String(++stepIdCounter.current),
      timestamp: new Date(event.timestamp || Date.now()),
      taggedInfo: event.tagged_info ? (event.tagged_info as unknown as InformationUnit[]) : undefined,
    };

    switch (event.type) {
      case 'thinking':
        return {
          ...baseStep,
          agent: event.agent || 'unknown',
          agentType: getAgentType(event.agent),
          status: 'thinking' as const,
          stepType: 'thinking',
          title: getAgentDisplayName(event.agent),
          content: event.content || '',
        };

      case 'document':
        return {
          ...baseStep,
          agent: event.agent || 'search',
          agentType: 'orchestrator',
          status: 'complete' as const,
          title: `Znaleziono dokumenty`,
          content: event.content || `Pobrano ${event.docs?.length || 0} dokumentów`,
          documents: event.docs?.map((d) => ({
            title: d.title,
            relevance: d.relevance,
            source: d.source || 'unknown',
            url: d.url,
            credibility: d.credibility,
          })),
        };

      case 'progress':
        return {
          ...baseStep,
          agent: event.agent || 'system',
          agentType: getAgentType(event.agent),
          status: 'analyzing' as const,
          title: getAgentDisplayName(event.agent),
          content: event.content || 'Przetwarzanie...',
        };

      case 'report':
        return {
          ...baseStep,
          agent: 'synthesis',
          agentType: 'synthesis',
          status: 'complete' as const,
          title: `Raport: ${event.section || 'Sekcja'}`,
          content: event.content?.substring(0, 200) + '...' || '',
        };

      // === NOWE: Rozbudowane typy dla Chain of Thought ===

      case 'reasoning':
        return {
          ...baseStep,
          agent: event.agent || 'system',
          agentType: getAgentType(event.agent),
          status: 'analyzing' as const,
          stepType: 'reasoning',
          title: event.step_title || 'Krok rozumowania',
          content: event.reasoning || event.content || '',
          stepNumber: event.step_number || undefined,
          totalSteps: event.total_steps || undefined,
          confidence: event.confidence || undefined,
          evidence: event.evidence?.map((e: Record<string, unknown>) => ({
            content: String(e.content || ''),
            source: String(e.source || ''),
            weight: Number(e.weight || 0.5),
          })),
        };

      case 'correlation':
        return {
          ...baseStep,
          agent: event.agent || 'system',
          agentType: getAgentType(event.agent),
          status: 'complete' as const,
          stepType: 'correlation',
          title: 'Zidentyfikowana korelacja',
          content: event.explanation || '',
          factA: event.fact_a || undefined,
          factB: event.fact_b || undefined,
          correlationType: event.correlation_type || undefined,
          correlationStrength: event.strength || undefined,
          sources: event.sources || undefined,
        };

      case 'hypothesis':
        return {
          ...baseStep,
          agent: event.agent || 'system',
          agentType: getAgentType(event.agent),
          status: 'analyzing' as const,
          stepType: 'hypothesis',
          title: 'Hipoteza',
          content: event.hypothesis || event.content || '',
          hypothesis: event.hypothesis || undefined,
          basis: event.basis || undefined,
          testablePredictions: event.testable_predictions || undefined,
          confidence: event.confidence || undefined,
        };

      case 'evidence':
        return {
          ...baseStep,
          agent: event.agent || 'system',
          agentType: getAgentType(event.agent),
          status: 'complete' as const,
          stepType: 'evidence',
          title: event.evidence_type === 'supporting' ? 'Dowód wspierający' : 'Dowód podważający',
          content: event.content || '',
          hypothesisRef: event.hypothesis_ref || undefined,
          evidenceType: event.evidence_type || undefined,
          impact: event.impact || undefined,
          weight: event.weight || undefined,
        };

      case 'inference':
        // KLUCZOWY typ dla wyjaśnialności - ścieżka od faktu do przewidywania
        return {
          ...baseStep,
          agent: event.agent || 'system',
          agentType: getAgentType(event.agent),
          status: 'complete' as const,
          stepType: 'inference',
          title: 'Wnioskowanie: Fakt → Przewidywanie',
          content: event.prediction || event.content || '',
          historicalFact: event.historical_fact || undefined,
          historicalSource: event.historical_source || undefined,
          historicalDate: event.historical_date || undefined,
          prediction: event.prediction || undefined,
          predictionTimeframe: event.prediction_timeframe || undefined,
          reasoningChain: event.reasoning_chain || undefined,
          keyAssumptions: event.key_assumptions || undefined,
          confidence: event.confidence || undefined,
        };

      case 'error':
        return {
          ...baseStep,
          agent: event.agent || 'system',
          agentType: 'orchestrator',
          status: 'error' as const,
          title: 'Błąd',
          content: event.content || 'Wystąpił błąd',
        };

      case 'done':
        return {
          ...baseStep,
          agent: 'system',
          agentType: 'orchestrator',
          status: 'complete' as const,
          title: 'Analiza zakończona',
          content: 'Wszystkie scenariusze zostały wygenerowane.',
        };

      default:
        return null;
    }
  }, []);

  /**
   * Obsługuje event SSE.
   */
  const handleEvent = useCallback(
    (event: SSEEvent) => {
      console.log('[useAnalysis] Event:', event.type, event.agent);

      // Aktualizacja postępu
      if (event.type === 'progress' && typeof event.progress === 'number') {
        setProgress(event.progress);
      }
      // Force progress 100% on done
      if (event.type === 'done') {
        setProgress(100);
      }

      // Scenariusze idą do osobnego stanu
      if (event.type === 'scenario') {
        const timeframe = (event.timeframe || '12m') as '12m' | '36m';
        const variant = (event.variant || 'positive') as 'positive' | 'negative';
        
        const scenario: ScenarioReport = {
          timeframe,
          variant,
          title: event.title || 'Scenariusz',
          content: event.content || '',
          confidence: event.confidence || 0.5,
          chartData: event.chart_data ? (event.chart_data as unknown as ChartData) : null,
        };
        setScenarios((prev) => [...prev, scenario]);
        return;
      }

      // Mapuj na ThoughtStep
      const step = mapEventToStep(event);
      if (step) {
        setThoughtSteps((prev) => {
          // Zaktualizuj poprzedni step tego samego agenta na 'complete'
          const updated = prev.map((s) =>
            s.agent === step.agent && (s.status === 'thinking' || s.status === 'analyzing' || s.status === 'searching')
              ? { ...s, status: 'complete' as const }
              : s
          );
          return [...updated, step];
        });
      }

      // Zakończ analizę
      if (event.type === 'done') {
        setIsAnalyzing(false);
      }
    },
    [mapEventToStep]
  );

  /**
   * Rozpoczyna analizę.
   */
  const startAnalysis = useCallback(
    async (query: string, config: AnalysisConfig) => {
      // Reset stanu
      setIsAnalyzing(true);
      setProgress(0);
      setError(null);
      setThoughtSteps([]);
      setScenarios([]);
      stepIdCounter.current = 0;

      try {
        const id = await sseClient.startAnalysis(
          query,
          config,
          // onEvent callback
          handleEvent,
          // onError callback
          (err) => {
            setError(err.message);
            setIsAnalyzing(false);
          }
        );

        setSessionId(id);
        console.log('[useAnalysis] Started analysis, session:', id);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Nieznany błąd';
        setError(message);
        setIsAnalyzing(false);
        console.error('[useAnalysis] Error starting analysis:', err);
      }
    },
    [handleEvent]
  );

  /**
   * Zatrzymuje analizę.
   */
  const stopAnalysis = useCallback(() => {
    sseClient.close();
    setIsAnalyzing(false);
    console.log('[useAnalysis] Analysis stopped');
  }, []);

  /**
   * Czyści wyniki.
   */
  const clearResults = useCallback(() => {
    setThoughtSteps([]);
    setScenarios([]);
    setError(null);
    setSessionId(null);
    setProgress(0);
    stepIdCounter.current = 0;
  }, []);

  return {
    isAnalyzing,
    thoughtSteps,
    scenarios,
    error,
    sessionId,
    progress,
    startAnalysis,
    stopAnalysis,
    clearResults,
  };
}