'use client';

/**
 * === ONBOARDING TOUR ===
 *
 * Feature 2.1: Interaktywny tour aplikacji z tooltipsami i example queries
 * - Pierwsze uruchomienie: 5-step tour
 * - Tooltips przy każdym parametrze
 * - Example scenarios do quick start
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ChevronRight,
  ChevronLeft,
  HelpCircle,
  Zap,
  BookOpen,
  CheckCircle,
  SkipForward
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  content: React.ReactNode;
  position: 'center' | 'bottom' | 'right';
  target?: string;
  icon: React.ElementType;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Witaj w SEDNO',
    description: 'Narzędzie do analizy scenariuszy geopolitycznych',
    content: (
      <div className="space-y-4">
        <p className="text-base text-slate-700">
          Analizujemy dane z ministerstw i think tanków aby przewidzieć scenariusze dla
          <strong className="block mt-1 text-blue-700">Państwa Atlantis</strong>
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-slate-600">
            📍 <strong>Populacja:</strong> 28 mln ludzi<br />
            🌊 <strong>Położenie:</strong> Nad Morzem Bałtyckim<br />
            🛡️ <strong>NATO:</strong> Członek od 2004 roku
          </p>
        </div>
      </div>
    ),
    position: 'center',
    icon: HelpCircle
  },
  {
    id: 'analyze',
    title: 'Zacznij od analizy',
    description: 'Wpisz pytanie lub wybierz gotowy scenariusz',
    content: (
      <div className="space-y-4">
        <p className="text-sm text-slate-700 mb-3">
          Możesz wpisać pytanie takie jak:
        </p>
        <div className="space-y-2">
          {[
            '🌐 "Jaki wpływ będzie mieć konflikt na eksport?"',
            '💰 "Jak zmieni się kurs EUR/PLN w roku?"',
            '⚔️ "Jakie są zagrożenia dla bezpieczeństwa?"'
          ].map((example, idx) => (
            <div
              key={idx}
              className="text-xs p-2 bg-slate-100 rounded cursor-pointer hover:bg-blue-100 transition-colors"
            >
              {example}
            </div>
          ))}
        </div>
      </div>
    ),
    position: 'right',
    target: 'prompt-input',
    icon: Zap
  },
  {
    id: 'parameters',
    title: 'Parametry analizy',
    description: 'Dostosuj regiony, sektory i wagi',
    content: (
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold text-slate-600 uppercase mb-2">
            Regiony
          </p>
          <p className="text-sm text-slate-700">
            Wybierz regiony do analizy (EU, USA, NATO, ROSJA, AZJA)
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-600 uppercase mb-2">
            Sektory
          </p>
          <p className="text-sm text-slate-700">
            Fokus na gospodarkę, bezpieczeństwo, energetykę, itp.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-600 uppercase mb-2">
            Wagi
          </p>
          <p className="text-sm text-slate-700">
            Priorytet różnych aspektów analizy (suma = 100%)
          </p>
        </div>
      </div>
    ),
    position: 'right',
    target: 'sidebar',
    icon: HelpCircle
  },
  {
    id: 'reasoning',
    title: 'Śledź rozumowanie',
    description: 'Widok Chain of Thought pokazuje każdy krok analizy',
    content: (
      <div className="space-y-3">
        <p className="text-sm text-slate-700">
          Każdy krok pokazuje:
        </p>
        <ul className="text-sm text-slate-700 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">→</span>
            <span>Jakie dokumenty były analizowane</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">→</span>
            <span>Jakie wnioski wyciągnął agent</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">→</span>
            <span>Jak pewny jest agent (%)
</span>
          </li>
        </ul>
        <p className="text-xs text-slate-600 mt-2">
          💡 Kliknij na krok aby zobaczyć pełny kontekst
        </p>
      </div>
    ),
    position: 'right',
    target: 'chain-of-thought',
    icon: BookOpen
  },
  {
    id: 'scenarios',
    title: 'Cztery scenariusze',
    description: '12m i 36m, pozytywny i negatywny',
    content: (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="text-xs p-2 bg-green-50 rounded border border-green-200">
            <strong className="text-green-800">12M +</strong>
            <p className="text-green-700 mt-1">Optymistyczny scenariusz na rok</p>
          </div>
          <div className="text-xs p-2 bg-red-50 rounded border border-red-200">
            <strong className="text-red-800">12M −</strong>
            <p className="text-red-700 mt-1">Pesymistyczny scenariusz na rok</p>
          </div>
          <div className="text-xs p-2 bg-blue-50 rounded border border-blue-200">
            <strong className="text-blue-800">36M +</strong>
            <p className="text-blue-700 mt-1">Optymistycznie na 3 lata</p>
          </div>
          <div className="text-xs p-2 bg-orange-50 rounded border border-orange-200">
            <strong className="text-orange-800">36M −</strong>
            <p className="text-orange-700 mt-1">Pesymistycznie na 3 lata</p>
          </div>
        </div>
        <p className="text-xs text-slate-600">
          Każdy scenariusz zawiera szczegółową analizę i zalecenia.
        </p>
      </div>
    ),
    position: 'right',
    target: 'report-panel',
    icon: Zap
  }
];

interface OnboardingTourProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSkip?: () => void;
}

export default function OnboardingTour({
  isOpen = true,
  onClose,
  onSkip
}: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showTooltip, setShowTooltip] = useState(true);
  // Zapobieganie hydration mismatch - renderuj dopiero po mount
  const [isMounted, setIsMounted] = useState(false);

  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  // Mount effect - uruchom po stronie klienta
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleClose = () => {
    localStorage.setItem('sedno_onboarding_completed', 'true');
    onClose?.();
  };

  const handleNext = () => {
    if (isLastStep) {
      handleClose();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onSkip?.();
    handleClose();
  };

  // Nie renderuj przed mount (zapobiega hydration mismatch)
  if (!isMounted || !isOpen) return null;

  const IconComponent = step.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/30 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`fixed z-50 ${
              step.position === 'center'
                ? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
                : 'right-8 bottom-8 max-w-sm'
            }`}
          >
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <IconComponent className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">
                      {step.title}
                    </h3>
                    <p className="text-white/80 text-sm">
                      {step.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="text-white/60 hover:text-white transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 min-h-[240px]">
                {step.content}
              </div>

              {/* Progress Dots */}
              <div className="px-6 py-3 flex justify-center gap-1.5 bg-slate-50">
                {ONBOARDING_STEPS.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentStep(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === currentStep
                        ? 'bg-blue-600 w-6'
                        : 'bg-slate-300 hover:bg-slate-400'
                    }`}
                  />
                ))}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-white flex items-center justify-between border-t border-slate-200">
                <button
                  onClick={handleSkip}
                  className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors"
                >
                  Pomiń tour
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrev}
                    disabled={currentStep === 0}
                    className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="text-xs text-slate-600 font-medium min-w-fit">
                    {currentStep + 1} / {ONBOARDING_STEPS.length}
                  </span>

                  <button
                    onClick={handleNext}
                    className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1"
                  >
                    {isLastStep ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm">Gotowe!</span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm">Dalej</span>
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Export helper function to check if onboarding should be shown
export function shouldShowOnboarding(): boolean {
  if (typeof window === 'undefined') return false;
  return !localStorage.getItem('sedno_onboarding_completed');
}
