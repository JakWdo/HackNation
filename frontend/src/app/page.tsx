'use client';

/**
 * === SCENARIUSZE JUTRA - STRONA GŁÓWNA ===
 *
 * System Analizy Geopolitycznej z:
 * - Interaktywną mapą świata
 * - Panelem promptu ambasadora
 * - Chain of Thought (widoczne rozumowanie) - PRAWDZIWE SSE!
 * - Panel 4 scenariuszy
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/ui/Header';
import AnalysisSidebar from '@/components/sidebar/AnalysisSidebar';
import PromptPanel from '@/components/ui/PromptPanel';
import ChainOfThought from '@/components/ui/ChainOfThought';
import ReportPanel from '@/components/ui/ReportPanel';
import HistoryPanel from '@/components/ui/HistoryPanel';
import ReasoningPathViewer from '@/components/ui/ReasoningPathViewer';
import OnboardingTour, { shouldShowOnboarding } from '@/components/ui/OnboardingTour';
import ProgressBar, { createAnalysisPhases, AnalysisPhase } from '@/components/ui/ProgressBar';
import { useAnalysis } from '@/hooks/useAnalysis';
import { useAnalysisHistory, SavedAnalysis } from '@/hooks/useAnalysisHistory';
import type { AnalysisConfig } from '@/types/regions';

// Dynamiczny import mapy (bez SSR)
const WorldMap = dynamic(() => import('@/components/map/WorldMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[var(--color-ocean)]">
      <div className="text-center">
        <div className="animate-spin text-3xl mb-3">🌍</div>
        <p className="text-sm text-[var(--color-text-muted)]">Ładowanie mapy...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  // Konfiguracja analizy
  const [analysisConfig, setAnalysisConfig] = useState<AnalysisConfig>({
    regions: [],
    subregions: [],
    countries: [],
    organizations: [],
    sectors: [],
    weights: {},
  });

  // Stan UI
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [currentQuery, setCurrentQuery] = useState<string>('');
  const [selectedHistoryAnalysis, setSelectedHistoryAnalysis] = useState<SavedAnalysis | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(shouldShowOnboarding());
  const [analysisPhasesToShow, setAnalysisPhasesToShow] = useState<AnalysisPhase[]>(createAnalysisPhases());

  // 🆕 Hook do analizy z prawdziwym SSE
  const {
    isAnalyzing,
    thoughtSteps,
    scenarios,
    error,
    startAnalysis,
    stopAnalysis,
    clearResults,
    progress,
  } = useAnalysis();

  // 🆕 Hook do historii analiz
  const { history, saveAnalysis, deleteAnalysis, clearHistory } = useAnalysisHistory();

  // Ref do śledzenia czy analiza została już zapisana
  const analysisSavedRef = useRef(false);

  // 🆕 Automatyczne zapisywanie analizy i pokazanie raportu po zakończeniu
  useEffect(() => {
    // Gdy analiza się zakończy i są scenariusze
    if (!isAnalyzing && scenarios.length > 0 && currentQuery && !analysisSavedRef.current) {
      // Zapisz do historii
      saveAnalysis({
        query: currentQuery,
        config: analysisConfig,
        scenarios,
        thoughtSteps,
        status: 'completed',
      });
      analysisSavedRef.current = true;

      // Automatycznie pokaż raport
      setShowReport(true);
    }
  }, [isAnalyzing, scenarios, currentQuery, analysisConfig, thoughtSteps, saveAnalysis]);

  // Obsługa wyboru regionu z mapy
  const handleRegionSelect = useCallback((regionId: string) => {
    setAnalysisConfig((prev) => ({
      ...prev,
      regions: prev.regions.includes(regionId)
        ? prev.regions
        : [...prev.regions, regionId],
    }));
  }, []);

  // Obsługa wyboru kraju
  const handleCountrySelect = useCallback((countryCode: string) => {
    setSelectedCountries((prev) => {
      const isSelected = prev.includes(countryCode);
      return isSelected ? prev.filter((c) => c !== countryCode) : [...prev, countryCode];
    });

    setAnalysisConfig((prev) => ({
      ...prev,
      countries: prev.countries.includes(countryCode)
        ? prev.countries.filter((c) => c !== countryCode)
        : [...prev.countries, countryCode],
    }));
  }, []);

  // 🆕 Prawdziwa analiza przez SSE API
  const handlePromptSubmit = useCallback(
    async (prompt: string) => {
      setShowReport(false);
      setShowHistory(false);
      setShowRightPanel(true);
      clearResults();
      setCurrentQuery(prompt);
      analysisSavedRef.current = false; // Reset flagi przed nową analizą

      // Użyj prawdziwego API
      await startAnalysis(prompt, {
        ...analysisConfig,
        regions: analysisConfig.regions.length > 0 ? analysisConfig.regions : ['EU'],
        countries: analysisConfig.countries,
        sectors: analysisConfig.sectors.length > 0
          ? analysisConfig.sectors
          : ['POLITICS', 'ECONOMY', 'DEFENSE', 'SOCIETY'],
        weights: analysisConfig.weights,
      });
    },
    [startAnalysis, clearResults, analysisConfig]
  );

  // 🆕 Załaduj zapisaną analizę z historii
  const handleLoadFromHistory = useCallback((saved: SavedAnalysis) => {
    setShowHistory(false);
    setSelectedHistoryAnalysis(saved);
    setShowReport(true);
  }, []);


  // Pokaż raport gdy są scenariusze
  const handleShowReport = useCallback(() => {
    setShowReport(true);
  }, []);

  // Zatrzymaj analizę
  const handleStopAnalysis = useCallback(() => {
    stopAnalysis();
  }, [stopAnalysis]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--color-bg-primary)]">
      {/* Onboarding Tour */}
      <OnboardingTour
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onSkip={() => setShowOnboarding(false)}
      />

      {/* Nagłówek */}
      <Header isAnalyzing={isAnalyzing} progress={progress} />

      {/* Główna zawartość - 3 kolumny */}
      <main className="flex-1 flex overflow-hidden">
        {/* Lewa kolumna - Sidebar z parametrami */}
        <AnalysisSidebar
          config={analysisConfig}
          onConfigChange={setAnalysisConfig}
        />

        {/* Środkowa kolumna - Mapa, Historia lub Raport */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Przycisk toggle dla prawego panelu - widoczny zawsze w prawym górnym rogu środkowej kolumny */}
          <button
            onClick={() => setShowRightPanel(!showRightPanel)}
            className="absolute top-4 right-4 z-30 p-2 bg-white/80 backdrop-blur border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 text-slate-600 transition-colors"
            title={showRightPanel ? "Schowaj panel analizy" : "Pokaż panel analizy"}
          >
            {showRightPanel ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v18h-6M10 17l5-5-5-5M13.8 12H3"/></svg>
            )}
          </button>

          {showHistory ? (
            <HistoryPanel
              history={history}
              onSelect={handleLoadFromHistory}
              onDelete={deleteAnalysis}
              onClearAll={clearHistory}
              onClose={() => setShowHistory(false)}
            />
          ) : showReport && (scenarios.length > 0 || selectedHistoryAnalysis) ? (
            <ReportPanel
              scenarios={selectedHistoryAnalysis?.scenarios || scenarios}
              onClose={() => {
                setShowReport(false);
                if (selectedHistoryAnalysis) {
                  setShowHistory(true);
                }
                setSelectedHistoryAnalysis(null);
              }}
            />
          ) : (
            <>
              {/* Mapa świata */}
              <div className="flex-1 relative min-h-0">
                <WorldMap
                  onRegionSelect={handleRegionSelect}
                  onCountrySelect={handleCountrySelect}
                  selectedRegions={analysisConfig.regions}
                  selectedCountries={selectedCountries}
                />

                {/* Panel wybranych krajów */}
                {selectedCountries.length > 0 && (
                  <div className="absolute top-16 right-4 z-20 glass-card p-3 max-w-xs animate-slide-in">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-[var(--color-text-muted)]">
                        WYBRANE KRAJE
                      </span>
                      <span className="badge-cyan text-[10px]">{selectedCountries.length}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedCountries.slice(0, 10).map((code) => (
                        <button
                          key={code}
                          onClick={() => handleCountrySelect(code)}
                          className="badge-vintage hover:border-[var(--color-cyan)] hover:text-[var(--color-cyan)] transition-colors cursor-pointer group text-[10px]"
                        >
                          {code}
                          <span className="ml-1 opacity-50 group-hover:opacity-100">×</span>
                        </button>
                      ))}
                      {selectedCountries.length > 10 && (
                        <span className="text-[10px] text-[var(--color-text-muted)]">
                          +{selectedCountries.length - 10}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Panel promptu ambasadora */}
              <div className="p-4 border-t border-[var(--color-border)]">
                <PromptPanel
                  onSubmit={handlePromptSubmit}
                  isProcessing={isAnalyzing}
                  placeholder="Zadaj pytanie analityczne o wybrane regiony..."
                />
              </div>
            </>
          )}
        </div>

        {/* Prawa kolumna - Chain of Thought */}
        <div className="w-96 border-l border-[var(--color-border)] flex flex-col overflow-y-auto">
          {/* Progress Bar podczas analizy */}
          {isAnalyzing && (
            <div className="p-4 border-b border-[var(--color-border)] bg-blue-50/30">
              <ProgressBar
                phases={analysisPhasesToShow}
                overallProgress={progress}
                startTime={Date.now()}
                isAnalyzing={isAnalyzing}
              />
            </div>
          )}

          {/* Reasoning Path Viewer */}
          {thoughtSteps.length > 0 && (
            <div className="p-4 border-b border-[var(--color-border)] bg-white/50">
              <ReasoningPathViewer
                steps={thoughtSteps}
                onDocumentClick={(doc) => {
                  if (doc.url) {
                    window.open(doc.url, '_blank');
                  }
                }}
              />
            </div>
          )}

          {/* Chain of Thought */}
          <div className="flex-1 overflow-y-auto">
            <ChainOfThought steps={thoughtSteps} isProcessing={isAnalyzing} />
          </div>

          {/* Przycisk do zatrzymania */}
          {isAnalyzing && (
            <div className="p-4 border-t border-[var(--color-border)]">
              <button
                onClick={handleStopAnalysis}
                className="w-full py-2 px-4 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                ⏹ Zatrzymaj analizę
              </button>
            </div>
          )}

          {/* Przycisk do raportu */}
          {scenarios.length > 0 && !isAnalyzing && (
            <div className="p-4 border-t border-[var(--color-border)]">
              <button
                onClick={handleShowReport}
                className="w-full py-3 px-4 bg-[var(--color-cyan)]/20 text-[var(--color-cyan)] border border-[var(--color-cyan)]/30 rounded-lg hover:bg-[var(--color-cyan)]/30 transition-colors font-medium"
              >
                📊 Zobacz {scenarios.length} scenariusze
              </button>
            </div>
          )}

          {/* Przycisk historii */}
          {!isAnalyzing && (
            <div className="p-4 border-t border-[var(--color-border)]">
              <button
                onClick={() => setShowHistory(true)}
                className="w-full py-2 px-4 bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)] border border-[var(--color-border)] rounded-lg hover:border-[var(--color-cyan)]/50 hover:text-[var(--color-text-primary)] transition-colors text-sm"
              >
                📜 Historia analiz ({history.length})
              </button>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="p-4 bg-red-500/10 border-t border-red-500/20">
              <p className="text-red-400 text-sm">⚠️ {error}</p>
              <button
                onClick={clearResults}
                className="mt-2 text-xs text-red-300 hover:text-red-200"
              >
                Wyczyść i spróbuj ponownie
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
