'use client';

/**
 * === PANEL CHAIN OF THOUGHT ===
 *
 * Wizualizacja rozumowania agentów AI w czasie rzeczywistym
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { 
  Brain, 
  Search, 
  Activity, 
  CheckCircle, 
  AlertCircle, 
  Target, 
  Globe, 
  PieChart, 
  Sparkles, 
  FileText, 
  X, 
  Maximize2,
  Clock,
  Cpu,
  Tag,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CredibilityScore, CredibilityLevel, InformationUnit } from '@/types/schemas';
import { SourceCredibilityPanel } from './SourceCredibilityPanel';

// Typy dla kroków myślenia
export interface ThoughtStep {
  id: string;
  agent: string;
  agentType: 'orchestrator' | 'regional' | 'country' | 'sector' | 'synthesis';
  status: 'thinking' | 'searching' | 'analyzing' | 'complete' | 'error';
  title: string;
  content: string;
  documents?: {
    title: string;
    relevance: number;
    source: string;
    url?: string | null;
    credibility?: CredibilityScore | null;
  }[];
  taggedInfo?: InformationUnit[]; // Nowe pole dla Feature 1.1
  children?: ThoughtStep[];
  timestamp: Date;

  // === NOWE: Rozbudowane Chain of Thought dla wyjaśnialności ===
  stepType?: 'thinking' | 'reasoning' | 'correlation' | 'hypothesis' | 'evidence' | 'inference';

  // Dla stepType = 'reasoning'
  stepTitle?: string;
  reasoning?: string;
  evidence?: { content: string; source: string; weight: number }[];
  stepNumber?: number;
  totalSteps?: number;

  // Dla stepType = 'correlation'
  factA?: string;
  factB?: string;
  correlationType?: 'positive' | 'negative' | 'causal' | 'temporal';
  correlationStrength?: number;
  explanation?: string;
  sources?: string[];

  // Dla stepType = 'hypothesis'
  hypothesis?: string;
  basis?: string;
  testablePredictions?: string[];

  // Dla stepType = 'evidence'
  hypothesisRef?: string;
  evidenceType?: 'supporting' | 'contradicting';
  impact?: string;
  weight?: number;

  // Dla stepType = 'inference' (KLUCZOWY dla wyjaśnialności)
  historicalFact?: string;
  historicalSource?: string;
  historicalDate?: string;
  prediction?: string;
  predictionTimeframe?: string;
  reasoningChain?: string[];
  keyAssumptions?: string[];
  confidence?: number;
}

interface ChainOfThoughtProps {
  steps: ThoughtStep[];
  isProcessing?: boolean;
}

// Kolory i ikony dla typów agentów
const AGENT_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.ElementType; label: string }> = {
  orchestrator: {
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: Target,
    label: 'Orkiestrator'
  },
  regional: {
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: Globe,
    label: 'Agent Regionalny'
  },
  country: {
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
    icon: Globe,
    label: 'Agent Krajowy'
  },
  sector: {
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: PieChart,
    label: 'Agent Sektorowy'
  },
  synthesis: {
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    icon: Sparkles,
    label: 'Synteza'
  },
};

// === NOWE: Konfiguracja dla typów kroków rozumowania ===
const STEP_TYPE_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.ElementType; label: string }> = {
  reasoning: {
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    icon: Brain,
    label: 'Krok Rozumowania'
  },
  correlation: {
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    icon: Activity,
    label: 'Korelacja'
  },
  hypothesis: {
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    icon: Sparkles,
    label: 'Hipoteza'
  },
  evidence: {
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    icon: FileText,
    label: 'Dowód'
  },
  inference: {
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    icon: ArrowRight,
    label: 'Wnioskowanie'
  },
};

const STATUS_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  thinking: { icon: Brain, label: 'Myślę...', color: 'text-slate-500' },
  searching: { icon: Search, label: 'Szukam...', color: 'text-blue-500' },
  analyzing: { icon: Activity, label: 'Analizuję...', color: 'text-indigo-500' },
  complete: { icon: CheckCircle, label: 'Zakończone', color: 'text-emerald-500' },
  error: { icon: AlertCircle, label: 'Błąd', color: 'text-red-500' },
};

export default function ChainOfThought({
  steps,
  isProcessing = false,
}: ChainOfThoughtProps) {
  const [selectedStep, setSelectedStep] = useState<ThoughtStep | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll do najnowszego kroku
  useEffect(() => {
    if (containerRef.current && steps.length > 0) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [steps]);

  // Handle closing modal with Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedStep(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const renderStepCard = (step: ThoughtStep, index: number) => {
    // Użyj STEP_TYPE_CONFIG dla nowych typów, fallback do AGENT_CONFIG
    const stepTypeConfig = step.stepType && STEP_TYPE_CONFIG[step.stepType];
    const config = stepTypeConfig || AGENT_CONFIG[step.agentType] || AGENT_CONFIG.orchestrator;
    const statusConfig = STATUS_CONFIG[step.status] || STATUS_CONFIG.thinking;
    const StepIcon = config.icon;
    const StatusIcon = statusConfig.icon;

    // Specjalne renderowanie dla inference (ścieżka rozumowania)
    const isInference = step.stepType === 'inference';
    const isCorrelation = step.stepType === 'correlation';

    return (
      <motion.div
        key={step.id}
        layoutId={`step-card-${step.id}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="relative group"
      >
        <div
          onClick={() => setSelectedStep(step)}
          className={cn(
            "relative p-4 rounded-xl border bg-white transition-all cursor-pointer shadow-sm hover:shadow-md",
            config.border,
            isInference && "border-l-4 border-l-rose-500",
            isCorrelation && "border-l-4 border-l-orange-500",
            "hover:-translate-y-0.5"
          )}
        >
          {/* Ozdobny pasek po lewej (tylko jeśli nie jest inference/correlation) */}
          {!isInference && !isCorrelation && (
            <div className={cn("absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl", config.bg.replace('50', '500'))} />
          )}

          <div className="flex items-start gap-3 pl-2">
            {/* Ikona */}
            <div className={cn("p-2 rounded-lg", config.bg)}>
              <StepIcon className={cn("w-5 h-5", config.color)} />
            </div>

            {/* Treść nagłówka */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider", config.color)}>
                    {config.label}
                  </span>
                  {step.stepNumber && step.totalSteps && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      [{step.stepNumber}/{step.totalSteps}]
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {step.timestamp.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>

              <h3 className="text-sm font-semibold text-slate-800 leading-tight mb-1 truncate pr-6">
                {step.title}
              </h3>

              {/* Specjalna sekcja dla inference - pokaż ścieżkę */}
              {isInference && step.reasoningChain && step.reasoningChain.length > 0 && (
                <div className="flex items-center gap-1 mt-1 text-[10px] text-rose-600 overflow-x-auto">
                  {step.reasoningChain.slice(0, 3).map((chain, i) => (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 && <ArrowRight className="w-3 h-3 text-rose-400" />}
                      <span className="bg-rose-50 px-1.5 py-0.5 rounded whitespace-nowrap">{chain}</span>
                    </span>
                  ))}
                  {step.reasoningChain.length > 3 && (
                    <span className="text-rose-400">+{step.reasoningChain.length - 3}</span>
                  )}
                </div>
              )}

              {/* Specjalna sekcja dla correlation */}
              {isCorrelation && step.factA && step.factB && (
                <div className="flex items-center gap-2 mt-1 text-[10px]">
                  <span className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                    {step.factA}
                  </span>
                  <Activity className="w-3 h-3 text-orange-500" />
                  <span className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                    {step.factB}
                  </span>
                  {step.correlationStrength && (
                    <span className="font-bold text-orange-600">
                      {Math.round(step.correlationStrength * 100)}%
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <div className={cn("flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100", statusConfig.color)}>
                  <StatusIcon className="w-3 h-3" />
                  {statusConfig.label}
                </div>
                {step.documents && step.documents.length > 0 && (
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                    <FileText className="w-3 h-3" />
                    {step.documents.length} dok.
                  </div>
                )}
                {step.confidence && (
                  <div className={cn(
                    "flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full",
                    step.confidence > 0.7 ? "bg-emerald-50 text-emerald-700" :
                    step.confidence > 0.4 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                  )}>
                    {Math.round(step.confidence * 100)}%
                  </div>
                )}
              </div>
            </div>

            {/* Ikona expand (widoczna na hover) */}
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <Maximize2 className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* Podgląd treści */}
          <div className="mt-3 pl-3 pr-2">
            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
              {step.content}
            </p>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <>
      {/* GŁÓWNY PANEL */}
      <Card className="flex flex-col h-full bg-slate-50/50 backdrop-blur border-l border-[var(--color-border)] shadow-none rounded-none">
        {/* Header Panelu */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white/80">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-700 tracking-wide uppercase">
              Proces Analizy
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {isProcessing && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-full animate-pulse border border-indigo-100">
                <Activity className="w-3 h-3" />
                PRZETWARZANIE
              </span>
            )}
            <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
              {steps.length} KROKÓW
            </span>
          </div>
        </div>

        {/* Lista Kart */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent"
        >
          {steps.length === 0 && !isProcessing ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 opacity-50">
              <Brain className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">
                Oczekiwanie na rozpoczęcie<br />procesu analitycznego...
              </p>
            </div>
          ) : steps.length === 0 && isProcessing ? (
            /* Skeleton loading gdy zaczyna się analiza */
            <SkeletonLoader count={3} />
          ) : (
            <>
              {steps.map((step, i) => renderStepCard(step, i))}
              {/* Skeleton podczas ładowania następnego kroku */}
              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <SkeletonCard />
                </motion.div>
              )}
            </>
          )}
          
          {/* Pusty element na dole, żeby był margines przy scrollu */}
          <div className="h-2" />
        </div>
      </Card>

      {/* MODAL DETALI */}
      <AnimatePresence>
        {selectedStep && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedStep(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            {/* Modal Window */}
            <motion.div
              layoutId={`step-card-${selectedStep.id}`}
              className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {/* Modal Header */}
              <div className={cn(
                "px-6 py-4 border-b flex items-start justify-between bg-gradient-to-r",
                AGENT_CONFIG[selectedStep.agentType]?.bg || 'bg-slate-50',
                "to-white"
              )}>
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "p-3 rounded-xl bg-white shadow-sm border",
                    AGENT_CONFIG[selectedStep.agentType]?.border
                  )}>
                    {(() => {
                      const Icon = AGENT_CONFIG[selectedStep.agentType]?.icon || Brain;
                      return <Icon className={cn("w-6 h-6", AGENT_CONFIG[selectedStep.agentType]?.color)} />;
                    })()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/50 border",
                        AGENT_CONFIG[selectedStep.agentType]?.color,
                        AGENT_CONFIG[selectedStep.agentType]?.border
                      )}>
                        {AGENT_CONFIG[selectedStep.agentType]?.label}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        ID: {selectedStep.agent}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 leading-snug">
                      {selectedStep.title}
                    </h2>
                  </div>
                </div>
                
                <button
                  onClick={() => setSelectedStep(null)}
                  className="p-2 hover:bg-black/5 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400 hover:text-slate-600" />
                </button>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 scrollbar-thin scrollbar-thumb-slate-200">
                {/* Meta info bar */}
                <div className="flex flex-wrap gap-4 mb-6 pb-6 border-b border-slate-100">
                   <div className="flex items-center gap-2 text-sm text-slate-600">
                      <StatusIconWrapper status={selectedStep.status} />
                      <span className="font-medium">
                        Status: {STATUS_CONFIG[selectedStep.status]?.label}
                      </span>
                   </div>
                   <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="font-mono">
                        {selectedStep.timestamp.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                   </div>
                </div>

                {/* Main Text Content */}
                <div className="prose prose-slate prose-sm max-w-none mb-8">
                  <p className="whitespace-pre-wrap leading-relaxed text-slate-700">
                    {selectedStep.content}
                  </p>
                </div>

                {/* Documents Section */}
                {selectedStep.documents && selectedStep.documents.length > 0 && (
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Search className="w-3 h-3" />
                      Analizowane źródła
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      {selectedStep.documents.map((doc, idx) => (
                        <div 
                          key={idx}
                          className="flex flex-col p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-300 transition-colors group"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <FileText className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-medium text-slate-700 truncate" title={doc.title}>
                                  {doc.title}
                                </span>
                                <span className="text-xs text-slate-500 truncate">
                                  {doc.source} {doc.url ? `• ${doc.url}` : ''}
                                </span>
                              </div>
                            </div>
                            <span className={cn(
                              "text-xs font-bold px-2 py-0.5 rounded",
                              doc.relevance > 0.8 ? "bg-emerald-100 text-emerald-700" : 
                              doc.relevance > 0.5 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                            )}>
                              {Math.round(doc.relevance * 100)}%
                            </span>
                          </div>
                          
                          {doc.credibility && (
                            <div className="mt-2">
                              <SourceCredibilityPanel credibility={doc.credibility} compact={true} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tagged Information Units Section (Feature 1.1) */}
                {selectedStep.taggedInfo && selectedStep.taggedInfo.length > 0 && (
                  <div className="mt-6 bg-indigo-50/50 rounded-xl p-5 border border-indigo-100">
                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Tag className="w-3 h-3" />
                      Zidentyfikowane Fakty i Dane
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      {selectedStep.taggedInfo.map((info, idx) => (
                        <div
                          key={info.id || idx}
                          className={cn(
                            "flex flex-col p-3 bg-white border rounded-lg shadow-sm transition-all",
                            info.priority === 1 ? "border-l-4 border-l-red-500 border-y-red-100 border-r-red-100" :
                            info.priority === 2 ? "border-l-4 border-l-amber-500 border-y-amber-100 border-r-amber-100" :
                            "border-l-4 border-l-blue-400 border-y-slate-100 border-r-slate-100"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={cn(
                                  "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded",
                                  info.fact_type === 'economic_indicator' ? "bg-emerald-100 text-emerald-700" :
                                  info.fact_type === 'political_event' ? "bg-purple-100 text-purple-700" :
                                  info.fact_type === 'statement' ? "bg-blue-100 text-blue-700" :
                                  "bg-slate-100 text-slate-600"
                                )}>
                                  {info.fact_type.replace('_', ' ')}
                                </span>
                                {info.timestamp && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {info.timestamp}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-800 leading-snug font-medium">
                                {info.content}
                              </p>

                              {info.entities && info.entities.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {info.entities.map((entity, eIdx) => (
                                    <span key={eIdx} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                                      #{entity}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col items-end gap-1">
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                info.priority === 1 ? "bg-red-100 text-red-700" :
                                info.priority === 2 ? "bg-amber-100 text-amber-700" :
                                "bg-blue-50 text-blue-600"
                              )}>
                                P{info.priority}
                              </span>
                              <span className="text-[10px] text-slate-400" title="Pewność">
                                {Math.round(info.confidence * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* === NOWE: Sekcja Inference - Ścieżka od faktu do przewidywania === */}
                {selectedStep.stepType === 'inference' && (
                  <div className="mt-6 bg-rose-50/50 rounded-xl p-5 border border-rose-200">
                    <h4 className="text-xs font-bold text-rose-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <ArrowRight className="w-3 h-3" />
                      Ścieżka Rozumowania: Fakt → Przewidywanie
                    </h4>

                    {/* Fakt historyczny (wejście) */}
                    {selectedStep.historicalFact && (
                      <div className="mb-4 p-3 bg-white border border-rose-100 rounded-lg">
                        <div className="text-[10px] font-bold text-rose-500 uppercase mb-1">Fakt Źródłowy</div>
                        <p className="text-sm text-slate-800 font-medium">{selectedStep.historicalFact}</p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                          {selectedStep.historicalSource && (
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {selectedStep.historicalSource}
                            </span>
                          )}
                          {selectedStep.historicalDate && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {selectedStep.historicalDate}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Łańcuch rozumowania */}
                    {selectedStep.reasoningChain && selectedStep.reasoningChain.length > 0 && (
                      <div className="mb-4">
                        <div className="text-[10px] font-bold text-rose-500 uppercase mb-2">Kroki Rozumowania</div>
                        <div className="space-y-2">
                          {selectedStep.reasoningChain.map((chain, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-rose-100 text-rose-600 text-[10px] font-bold flex items-center justify-center">
                                {idx + 1}
                              </div>
                              <div className="flex-1 p-2 bg-white border border-rose-100 rounded-lg text-sm text-slate-700">
                                {chain}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Przewidywanie (wyjście) */}
                    {selectedStep.prediction && (
                      <div className="p-3 bg-rose-100 border border-rose-200 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-[10px] font-bold text-rose-700 uppercase">Przewidywanie</div>
                          {selectedStep.predictionTimeframe && (
                            <span className="text-[10px] bg-rose-200 text-rose-700 px-2 py-0.5 rounded-full font-medium">
                              Horyzont: {selectedStep.predictionTimeframe}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-800 font-semibold">{selectedStep.prediction}</p>
                        {selectedStep.confidence && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-[10px] text-rose-600">Pewność:</span>
                            <div className="flex-1 h-2 bg-rose-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-rose-500 rounded-full"
                                style={{ width: `${selectedStep.confidence * 100}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-rose-700">
                              {Math.round(selectedStep.confidence * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Kluczowe założenia */}
                    {selectedStep.keyAssumptions && selectedStep.keyAssumptions.length > 0 && (
                      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="text-[10px] font-bold text-amber-600 uppercase mb-2">Kluczowe Założenia</div>
                        <ul className="space-y-1">
                          {selectedStep.keyAssumptions.map((assumption, idx) => (
                            <li key={idx} className="text-xs text-amber-800 flex items-start gap-2">
                              <span className="text-amber-500">•</span>
                              {assumption}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* === NOWE: Sekcja Correlation === */}
                {selectedStep.stepType === 'correlation' && (
                  <div className="mt-6 bg-orange-50/50 rounded-xl p-5 border border-orange-200">
                    <h4 className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Activity className="w-3 h-3" />
                      Zidentyfikowana Korelacja
                    </h4>

                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex-1 p-3 bg-white border border-orange-100 rounded-lg">
                        <div className="text-[10px] font-bold text-orange-500 uppercase mb-1">Fakt A</div>
                        <p className="text-sm text-slate-800">{selectedStep.factA}</p>
                      </div>
                      <div className="flex flex-col items-center">
                        <Activity className="w-6 h-6 text-orange-500" />
                        {selectedStep.correlationType && (
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full mt-1",
                            selectedStep.correlationType === 'positive' && "bg-emerald-100 text-emerald-700",
                            selectedStep.correlationType === 'negative' && "bg-red-100 text-red-700",
                            selectedStep.correlationType === 'causal' && "bg-purple-100 text-purple-700",
                            selectedStep.correlationType === 'temporal' && "bg-blue-100 text-blue-700"
                          )}>
                            {selectedStep.correlationType}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 p-3 bg-white border border-orange-100 rounded-lg">
                        <div className="text-[10px] font-bold text-orange-500 uppercase mb-1">Fakt B</div>
                        <p className="text-sm text-slate-800">{selectedStep.factB}</p>
                      </div>
                    </div>

                    {selectedStep.correlationStrength && (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] text-orange-600">Siła korelacji:</span>
                        <div className="flex-1 h-2 bg-orange-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-500 rounded-full"
                            style={{ width: `${selectedStep.correlationStrength * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-orange-700">
                          {Math.round(selectedStep.correlationStrength * 100)}%
                        </span>
                      </div>
                    )}

                    {selectedStep.explanation && (
                      <div className="p-3 bg-white border border-orange-100 rounded-lg">
                        <div className="text-[10px] font-bold text-orange-500 uppercase mb-1">Wyjaśnienie</div>
                        <p className="text-sm text-slate-700">{selectedStep.explanation}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* === NOWE: Sekcja Hypothesis === */}
                {selectedStep.stepType === 'hypothesis' && (
                  <div className="mt-6 bg-violet-50/50 rounded-xl p-5 border border-violet-200">
                    <h4 className="text-xs font-bold text-violet-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Sparkles className="w-3 h-3" />
                      Hipoteza
                    </h4>

                    <div className="p-3 bg-white border border-violet-100 rounded-lg mb-3">
                      <p className="text-sm text-slate-800 font-medium">{selectedStep.hypothesis}</p>
                    </div>

                    {selectedStep.basis && (
                      <div className="p-3 bg-violet-100/50 border border-violet-200 rounded-lg mb-3">
                        <div className="text-[10px] font-bold text-violet-600 uppercase mb-1">Podstawa</div>
                        <p className="text-sm text-slate-700">{selectedStep.basis}</p>
                      </div>
                    )}

                    {selectedStep.testablePredictions && selectedStep.testablePredictions.length > 0 && (
                      <div className="p-3 bg-white border border-violet-100 rounded-lg">
                        <div className="text-[10px] font-bold text-violet-600 uppercase mb-2">Testowalne Przewidywania</div>
                        <ul className="space-y-1">
                          {selectedStep.testablePredictions.map((pred, idx) => (
                            <li key={idx} className="text-xs text-slate-700 flex items-start gap-2">
                              <CheckCircle className="w-3 h-3 text-violet-500 mt-0.5" />
                              {pred}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer (Optional status bar) */}
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-400">
                 <span>System Analizy Geopolitycznej "Sedno"</span>
                 <span>v1.0.0</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// Helper component for status icons inside the modal
function StatusIconWrapper({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.thinking;
  const Icon = config.icon;
  return <Icon className={cn("w-4 h-4", config.color)} />;
}

// Skeleton loading dla karty
function SkeletonCard() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative p-4 rounded-xl border border-slate-200 bg-white"
    >
      {/* Pasek po lewej - pulsujący */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl bg-slate-200 animate-pulse" />

      <div className="flex items-start gap-3 pl-2">
        {/* Ikona skeleton */}
        <div className="p-2 rounded-lg bg-slate-100 animate-pulse">
          <div className="w-5 h-5 bg-slate-200 rounded" />
        </div>

        {/* Treść skeleton */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
            <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
          </div>
          <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse" />
          <div className="flex gap-2 mt-2">
            <div className="h-5 w-20 bg-slate-100 rounded-full animate-pulse" />
            <div className="h-5 w-16 bg-slate-100 rounded-full animate-pulse" />
          </div>
        </div>
      </div>

      {/* Podgląd treści skeleton */}
      <div className="mt-3 pl-3 pr-2 space-y-1.5">
        <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
        <div className="h-3 w-2/3 bg-slate-100 rounded animate-pulse" />
      </div>
    </motion.div>
  );
}

// Skeleton loading dla wielu kart
function SkeletonLoader({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <SkeletonCard />
        </motion.div>
      ))}
    </div>
  );
}
