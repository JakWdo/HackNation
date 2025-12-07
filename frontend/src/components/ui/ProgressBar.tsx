'use client';

/**
 * === ENHANCED PROGRESS BAR ===
 *
 * Feature 2.5: Zaawansowany progress bar z etapami analizy
 * - Pokazuje 4 etapy: Wyszukiwanie → Analiza → Synteza → Scenariusze
 * - ETA (estimated time remaining)
 * - Real-time updates z SSE
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Brain,
  Lightbulb,
  Sparkles,
  Clock,
  TrendingUp
} from 'lucide-react';

export interface AnalysisPhase {
  id: 'search' | 'analysis' | 'synthesis' | 'scenarios';
  label: string;
  description: string;
  progress: number; // 0-100
  status: 'pending' | 'active' | 'complete' | 'error';
  icon: React.ElementType;
  estimatedTime?: number; // seconds
  actualTime?: number; // seconds
}

interface ProgressBarProps {
  phases: AnalysisPhase[];
  overallProgress: number; // 0-100
  startTime?: number; // timestamp
  isAnalyzing?: boolean;
}

export default function ProgressBar({
  phases,
  overallProgress,
  startTime,
  isAnalyzing
}: ProgressBarProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0);

  // Oblicz czas i ETA
  useEffect(() => {
    if (!startTime || !isAnalyzing) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedTime(elapsed);

      // Estymuj czas pozostały na podstawie postępu
      if (overallProgress > 0 && overallProgress < 100) {
        const estimatedTotal = (elapsed / overallProgress) * 100;
        const remaining = Math.max(0, Math.ceil(estimatedTotal - elapsed));
        setEstimatedTimeRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, isAnalyzing, overallProgress]);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const activePhase = phases.find((p) => p.status === 'active');
  const completedPhases = phases.filter((p) => p.status === 'complete').length;

  return (
    <div className="w-full space-y-4">
      {/* Main Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Analiza w toku
          </h3>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTime(elapsedTime)}</span>
            </div>
            {estimatedTimeRemaining > 0 && (
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>~{formatTime(estimatedTimeRemaining)} pozostało</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            transition={{
              type: 'spring',
              stiffness: 30,
              damping: 20,
              duration: 0.5
            }}
          />

          {/* Shine effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{
              x: ['−100%', '100%']
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        </div>

        {/* Percentage */}
        <div className="text-right text-xs font-medium text-slate-600">
          {Math.round(overallProgress)}%
        </div>
      </div>

      {/* Phases Grid */}
      <div className="grid grid-cols-4 gap-2">
        {phases.map((phase, idx) => {
          const Icon = phase.icon;
          const isActive = phase.status === 'active';
          const isComplete = phase.status === 'complete';
          const isError = phase.status === 'error';

          return (
            <motion.div
              key={phase.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`relative p-3 rounded-lg border-2 transition-all ${
                isActive
                  ? 'bg-blue-50/50 border-blue-500 shadow-lg shadow-blue-500/20'
                  : isComplete
                  ? 'bg-green-50/50 border-green-500'
                  : isError
                  ? 'bg-red-50/50 border-red-500'
                  : 'bg-slate-50/50 border-slate-200'
              }`}
            >
              {/* Icon */}
              <div
                className={`flex items-center justify-center p-2 rounded-lg mb-2 ${
                  isActive
                    ? 'bg-blue-500 text-white'
                    : isComplete
                    ? 'bg-green-500 text-white'
                    : isError
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-300 text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              {/* Label */}
              <h4
                className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                  isActive
                    ? 'text-blue-900'
                    : isComplete
                    ? 'text-green-900'
                    : isError
                    ? 'text-red-900'
                    : 'text-slate-700'
                }`}
              >
                {phase.label}
              </h4>

              {/* Description */}
              <p className="text-xs text-slate-600 mb-2 line-clamp-2">
                {phase.description}
              </p>

              {/* Progress */}
              <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-400 to-cyan-400'
                      : isComplete
                      ? 'bg-green-400'
                      : isError
                      ? 'bg-red-400'
                      : 'bg-slate-300'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${phase.progress}%` }}
                  transition={{
                    type: 'spring',
                    stiffness: 50,
                    damping: 20
                  }}
                />
              </div>

              {/* Status indicator */}
              {isActive && (
                <motion.div
                  className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Current Activity */}
      {activePhase && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="p-3 bg-blue-50/50 border border-blue-200/50 rounded-lg"
        >
          <p className="text-xs text-blue-900 font-medium">
            🔄 <strong>Aktualnie:</strong> {activePhase.description}
          </p>
        </motion.div>
      )}

      {/* Completion Summary */}
      {!isAnalyzing && overallProgress === 100 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-3 bg-green-50/50 border border-green-200/50 rounded-lg flex items-center gap-2"
        >
          <span className="text-lg">✨</span>
          <div>
            <p className="text-xs font-semibold text-green-900">
              Analiza ukończona!
            </p>
            <p className="text-xs text-green-700">
              Czas całkowity: {formatTime(elapsedTime)}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Helper function to create phases with defaults
export function createAnalysisPhases(): AnalysisPhase[] {
  return [
    {
      id: 'search',
      label: 'Wyszukiwanie',
      description: 'Przeszukiwanie dokumentów',
      progress: 0,
      status: 'pending',
      icon: Search
    },
    {
      id: 'analysis',
      label: 'Analiza',
      description: 'Analiza regionów i krajów',
      progress: 0,
      status: 'pending',
      icon: Brain
    },
    {
      id: 'synthesis',
      label: 'Synteza',
      description: 'Synteza wniosków',
      progress: 0,
      status: 'pending',
      icon: Lightbulb
    },
    {
      id: 'scenarios',
      label: 'Scenariusze',
      description: 'Generowanie scenariuszy',
      progress: 0,
      status: 'pending',
      icon: Sparkles
    }
  ];
}
