'use client';

/**
 * === CONTEXTUAL TOOLTIP ===
 *
 * Feature 2.1: Tooltipsy przy każdym parametrze i kontrolce
 * - HelpCircle ikona
 * - Smooth animations
 * - Mobile-friendly
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X } from 'lucide-react';

interface ContextualTooltipProps {
  title: string;
  description: string;
  children?: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

export default function ContextualTooltip({
  title,
  description,
  children,
  side = 'right',
  className = ''
}: ContextualTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const positionClasses: Record<string, string> = {
    top: 'bottom-full mb-2 -translate-x-1/2 left-1/2',
    right: 'left-full ml-2 top-0',
    bottom: 'top-full mt-2 -translate-x-1/2 left-1/2',
    left: 'right-full mr-2 top-0'
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Trigger - span zamiast button aby uniknąć button-in-button nesting */}
      <span
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className="p-1 rounded-full hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700 cursor-pointer inline-flex items-center justify-center"
        title={title}
      >
        <HelpCircle className="w-4 h-4" />
      </span>

      {/* Tooltip */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`absolute z-50 ${positionClasses[side]}`}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
          >
            <div className="bg-slate-900 text-white rounded-lg shadow-lg max-w-xs">
              {/* Arrow */}
              <div
                className={`absolute w-2 h-2 bg-slate-900 transform rotate-45 ${
                  side === 'right' ? '-left-1 top-3' : ''
                } ${side === 'left' ? '-right-1 top-3' : ''}
              ${side === 'top' ? '-bottom-1 left-1/2 -translate-x-1/2' : ''}
              ${side === 'bottom' ? '-top-1 left-1/2 -translate-x-1/2' : ''}`}
              />

              {/* Content */}
              <div className="p-3">
                <h4 className="text-sm font-semibold mb-1.5 flex items-center gap-2">
                  <span>ℹ️</span>
                  {title}
                </h4>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {description}
                </p>
                {children && (
                  <div className="text-xs text-slate-300 mt-2 pt-2 border-t border-slate-700">
                    {children}
                  </div>
                )}
              </div>

              {/* Close button (mobile) */}
              <span
                role="button"
                tabIndex={0}
                onClick={() => setIsOpen(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsOpen(false);
                  }
                }}
                className="absolute top-2 right-2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Preset tooltips for common parameters
export const TOOLTIPS = {
  regions: {
    title: 'Regiony',
    description:
      'Wybierz regiony geograficzne do analizy: EU, USA, NATO, Rosja, Azja. Analiza będzie fokusować na wpływ zdarzeń w wybranych regionach na Atlantis.'
  },
  countries: {
    title: 'Kraje',
    description:
      'Wybierz konkretne kraje do szczegółowej analizy. Wpływ bezpośredni (powiązania dyplomatyczne, handel) będzie wyżej wyceniany.'
  },
  sectors: {
    title: 'Sektory',
    description:
      'Fokus sektorowy: Gospodarka, Bezpieczeństwo, Energia, Zdrowie, Infrastruktura, Nauka. Analiza będzie priorytetyzować informacje z wybranych sektorów.'
  },
  weights: {
    title: 'Wagi',
    description:
      'Ustaw priorytet różnych aspektów analizy. Suma wag powinna wynosić 100%. Wyższe wagi = bardziej istotne dla scenariuszy.'
  },
  timeframe: {
    title: 'Horyzont czasowy',
    description:
      '12 miesięcy - krótkoterminowa prognoza (duża pewność, mniej zmienności). 36 miesięcy - średnioterminowa prognoza (mniejsza pewność, więcej scenariuszy).'
  },
  confidence: {
    title: 'Pewność analizy',
    description:
      'Procent pewności danego wniosku na podstawie liczby źródeł i ich wiarygodności. Wyższy procent = bardziej niezawodne wnioski.'
  },
  credibility: {
    title: 'Wiarygodność źródła',
    description:
      'HIGH: Ministerstwa, NATO, UE (oficjalne źródła). MEDIUM: Think tanki, agencje analityczne. LOW: Media niesprawdzone, blog. SUSPICIOUS: Potencjalnie manipulacyjne.'
  },
  chainOfThought: {
    title: 'Chain of Thought',
    description:
      'Pełny zapis rozumowania systemu - od dokumentów wejściowych, przez wnioski pośrednie, do ostatecznych rekomendacji. Możesz kliknąć w każdy krok aby zobaczyć szczegóły.'
  }
};

// Helper component to easily add tooltips to form fields
interface LabelWithTooltipProps {
  label: string;
  tooltip: { title: string; description: string };
  required?: boolean;
}

export function LabelWithTooltip({
  label,
  tooltip,
  required
}: LabelWithTooltipProps) {
  return (
    <div className="flex items-center gap-1.5">
      <label className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <ContextualTooltip
        title={tooltip.title}
        description={tooltip.description}
      />
    </div>
  );
}
