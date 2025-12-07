'use client';

/**
 * === REASONING PATH VIEWER ===
 *
 * Interaktywna wizualizacja ścieżki rozumowania (Features 1.1 + 1.2):
 * - Flowchart z dokumentami → wnioski → rekomendacje
 * - Tagging jednostek informacji z wag i wiarygodności
 * - Pełne metadane źródeł (URL, data, snippet, credibility)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Tag,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Info,
  Lightbulb
} from 'lucide-react';
import { ThoughtStep } from './ChainOfThought';
import { CredibilityLevel } from '@/types/schemas';

interface DocumentInfo {
  title: string;
  url?: string | null;
  source: string;
  credibility?: {
    score: number;
    level: CredibilityLevel;
  };
  snippet?: string;
  publishedDate?: string;
}

interface ReasoningPathViewerProps {
  steps: ThoughtStep[];
  onDocumentClick?: (doc: DocumentInfo) => void;
}

export default function ReasoningPathViewer({
  steps,
  onDocumentClick
}: ReasoningPathViewerProps) {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Zbierz wszystkie dokumenty i jednostki informacji
  const allDocuments: DocumentInfo[] = [];
  const allInfoUnits: Array<{
    id: string;
    content: string;
    source: string;
    confidence: number;
    priority: number;
  }> = [];

  steps.forEach(step => {
    if (step.documents) {
      step.documents.forEach(doc => {
        allDocuments.push({
          title: doc.title,
          url: doc.url,
          source: doc.source,
          credibility: doc.credibility ? {
            score: doc.credibility.score,
            level: doc.credibility.level
          } : undefined
        });
      });
    }
    if (step.taggedInfo) {
      step.taggedInfo.forEach(info => {
        allInfoUnits.push({
          id: info.id,
          content: info.content,
          source: info.source_doc_ids?.[0] || info.source_doc_ids?.[0] || 'unknown',
          confidence: info.confidence || 0.7,
          priority: info.priority || 5
        });
      });
    }
  });

  const credibilityColor = (level?: CredibilityLevel) => {
    switch (level) {
      case CredibilityLevel.HIGH:
        return 'text-green-500 bg-green-500/10';
      case CredibilityLevel.MEDIUM:
        return 'text-amber-500 bg-amber-500/10';
      case CredibilityLevel.LOW:
        return 'text-orange-500 bg-orange-500/10';
      case CredibilityLevel.SUSPICIOUS:
        return 'text-red-500 bg-red-500/10';
      default:
        return 'text-slate-500 bg-slate-500/10';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-200/30">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-blue-600" />
              Ścieżka rozumowania
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Od dokumentów → przez wnioski → do rekomendacji
            </p>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs px-3 py-1.5 bg-blue-500/20 text-blue-700 rounded-md hover:bg-blue-500/30 transition-colors"
          >
            {showDetails ? 'Ukryj szczegóły' : 'Pokaż szczegóły'}
          </button>
        </div>
      </div>

      {/* Flow Diagram */}
      <div className="space-y-3">
        {steps.map((step, stepIndex) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: stepIndex * 0.1 }}
            className="space-y-2"
          >
            {/* Step Container */}
            <button
              onClick={() =>
                setExpandedStep(expandedStep === step.id ? null : step.id)
              }
              className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {step.status === 'complete' && (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    )}
                    {step.status === 'error' && (
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    )}
                    {!['complete', 'error'].includes(step.status) && (
                      <Info className="w-4 h-4 text-blue-600" />
                    )}
                    <h4 className="text-sm font-medium text-slate-900">
                      {step.title}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-1">
                    {step.content}
                  </p>
                </div>

                {/* Chevron */}
                <div className="text-slate-400 group-hover:text-slate-600">
                  {expandedStep === step.id ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </div>
            </button>

            {/* Expanded Content */}
            <AnimatePresence>
              {expandedStep === step.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pl-8 border-l-2 border-blue-300 space-y-3 py-2"
                >
                  {/* Full content */}
                  <p className="text-sm text-slate-700 p-3 bg-slate-50/50 rounded-lg">
                    {step.content}
                  </p>

                  {/* Dokumenty źródłowe */}
                  {step.documents && step.documents.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        Źródła ({step.documents.length})
                      </p>
                      <div className="space-y-2 pl-4">
                        {step.documents.map((doc, docIdx) => (
                          <div
                            key={docIdx}
                            className="text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer transition-all group"
                            onClick={() => onDocumentClick?.({
                              ...doc,
                              credibility: doc.credibility || undefined
                            })}
                          >
                            <div className="flex items-start gap-2">
                              <FileText className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="font-medium text-slate-900 group-hover:text-blue-700">
                                  {doc.title}
                                </p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className="text-xs text-slate-600">
                                    Źródło: {doc.source}
                                  </span>
                                  {doc.credibility && (
                                    <span
                                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${credibilityColor(
                                        doc.credibility.level
                                      )}`}
                                    >
                                      {doc.credibility.level} ({Math.round(doc.credibility.score * 100)}%)
                                    </span>
                                  )}
                                </div>
                                {showDetails && doc.url && (
                                  <a
                                    href={doc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-2"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    Otwórz źródło
                                  </a>
                                )}
                              </div>
                              <span className="text-xs text-amber-600 font-medium">
                                {Math.round(doc.relevance * 100) || 75}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tagged Information Units */}
                  {step.taggedInfo && step.taggedInfo.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5" />
                        Jednostki informacji ({step.taggedInfo.length})
                      </p>
                      <div className="space-y-2 pl-4">
                        {step.taggedInfo.map((info) => (
                          <div
                            key={info.id}
                            className="text-xs p-2.5 bg-gradient-to-r from-purple-50/50 to-blue-50/50 rounded-lg border border-purple-200/50 hover:border-purple-300 transition-all"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <p className="font-medium text-slate-900">
                                  {info.content}
                                </p>
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                  <span className="text-xs text-slate-600">
                                    Pewność: <strong>{Math.round(info.confidence * 100)}%</strong>
                                  </span>
                                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-700 rounded-full text-xs font-medium flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" />
                                    Priorytet {info.priority}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Arrow between steps */}
            {stepIndex < steps.length - 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center py-1"
              >
                <ArrowRight className="w-4 h-4 text-blue-400 rotate-90" />
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Summary Card */}
      {(allDocuments.length > 0 || allInfoUnits.length > 0) && (
        <div className="p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/50">
          <p className="text-xs text-green-800 font-medium">
            ✓ Analiza zawiera{' '}
            <strong>{allDocuments.length} dokumentów</strong> i{' '}
            <strong>{allInfoUnits.length} jednostek informacji</strong>
          </p>
        </div>
      )}
    </div>
  );
}