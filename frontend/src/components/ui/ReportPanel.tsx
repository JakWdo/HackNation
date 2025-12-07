/**
 * Panel wyświetlający 4 scenariusze:
 * - 12 miesięcy pozytywny/negatywny
 * - 36 miesięcy pozytywny/negatywny
 */
'use client';

import { useState, useMemo } from 'react';
import type { ScenarioReport } from '@/lib/sse';
import { ChartData } from '@/types/schemas';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

interface ReportPanelProps {
  scenarios: ScenarioReport[];
  onClose: () => void;
}

export default function ReportPanel({ scenarios, onClose }: ReportPanelProps) {
  const [activeTab, setActiveTab] = useState<'12m' | '36m'>('12m');
  const [activeVariant, setActiveVariant] = useState<'positive' | 'negative'>('positive');

  const currentScenario = scenarios.find(
    (s) => s.timeframe === activeTab && s.variant === activeVariant
  );

  // Statystyki
  const avgConfidence =
    scenarios.length > 0
      ? scenarios.reduce((sum, s) => sum + s.confidence, 0) / scenarios.length
      : 0;

  // Parsuj content na sekcje (bezpiecznie, bez innerHTML)
  const parsedContent = useMemo(() => {
    if (!currentScenario?.content) return [];
    return parseMarkdownSections(currentScenario.content);
  }, [currentScenario?.content]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--color-bg-primary)]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Scenariusze dla Atlantis
          </h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            {scenarios.length} scenariuszy | Śr. pewność: {Math.round(avgConfidence * 100)}%
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-lg hover:bg-white/5 transition-colors"
        >
          Powrót do mapy
        </button>
      </div>

      {/* Tabs - Timeframe */}
      <div className="flex border-b border-[var(--color-border)]">
        <button
          onClick={() => setActiveTab('12m')}
          className={`flex-1 py-3 text-center transition-colors ${
            activeTab === '12m'
              ? 'bg-[var(--color-cyan)]/10 text-[var(--color-cyan)] border-b-2 border-[var(--color-cyan)]'
              : 'text-[var(--color-text-muted)] hover:bg-white/5'
          }`}
        >
          12 miesięcy
        </button>
        <button
          onClick={() => setActiveTab('36m')}
          className={`flex-1 py-3 text-center transition-colors ${
            activeTab === '36m'
              ? 'bg-[var(--color-cyan)]/10 text-[var(--color-cyan)] border-b-2 border-[var(--color-cyan)]'
              : 'text-[var(--color-text-muted)] hover:bg-white/5'
          }`}
        >
          36 miesięcy
        </button>
      </div>

      {/* Tabs - Variant */}
      <div className="flex p-3 gap-3">
        <button
          onClick={() => setActiveVariant('positive')}
          className={`flex-1 py-2.5 px-4 rounded-lg transition-all ${
            activeVariant === 'positive'
              ? 'bg-green-500/20 text-green-400 border border-green-500/40 shadow-lg shadow-green-500/10'
              : 'bg-white/5 text-[var(--color-text-muted)] border border-transparent hover:bg-white/10'
          }`}
        >
          Pozytywny
        </button>
        <button
          onClick={() => setActiveVariant('negative')}
          className={`flex-1 py-2.5 px-4 rounded-lg transition-all ${
            activeVariant === 'negative'
              ? 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-lg shadow-red-500/10'
              : 'bg-white/5 text-[var(--color-text-muted)] border border-transparent hover:bg-white/10'
          }`}
        >
          Negatywny
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 report-content">
        
        {/* Print Header - Visible only in print */}
        <div className="print-header mb-8 hidden">
          <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-black uppercase tracking-wider mb-1">Sedno</h1>
              <p className="text-sm text-gray-600">System Analizy Geopolitycznej MSZ</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-mono text-gray-500">Data generowania:</p>
              <p className="text-lg font-bold">{new Date().toLocaleDateString('pl-PL')}</p>
            </div>
          </div>
        </div>

        {currentScenario ? (
          <article className="max-w-none">
            {/* Title */}
            <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-4 print:text-3xl print:mb-6">
              {currentScenario.title}
            </h1>

            {/* Confidence badge */}
            <div className="mb-6 flex items-center gap-3 no-print">
              <span className="text-sm text-[var(--color-text-muted)]">Pewność prognozy:</span>
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden max-w-xs">
                <div
                  className={`h-full transition-all duration-500 ${
                    currentScenario.confidence > 0.7
                      ? 'bg-green-500'
                      : currentScenario.confidence > 0.5
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${currentScenario.confidence * 100}%` }}
                />
              </div>
              <span className="text-sm font-mono text-[var(--color-text-primary)]">
                {Math.round(currentScenario.confidence * 100)}%
              </span>
            </div>
            
            {/* Confidence for Print */}
            <div className="hidden print:block mb-6 p-2 border border-gray-300 rounded bg-gray-50">
               <p className="text-sm font-bold">Pewność prognozy: {Math.round(currentScenario.confidence * 100)}%</p>
            </div>

            {/* Rendered content - bezpieczne komponenty React */}
            <div className="space-y-4">
              {parsedContent.map((section, idx) => (
                <MarkdownSection key={idx} section={section} />
              ))}
            </div>

            {/* Chart Section (Feature 1.3) */}
            {currentScenario.chartData && (
              <div className="mt-8 p-4 bg-white/5 rounded-xl border border-[var(--color-border)] print:bg-white print:border-gray-300 print:break-inside-avoid">
                <h3 className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-4 print:text-black">
                  Wizualizacja Danych: {currentScenario.chartData.title}
                </h3>
                <div className="h-64 w-full print:h-80">
                  <ChartRenderer data={currentScenario.chartData} />
                </div>
              </div>
            )}
          </article>
        ) : (
          <div className="text-center py-12 no-print">
            <div className="text-4xl mb-4">📭</div>
            <p className="text-[var(--color-text-muted)]">
              Brak scenariusza dla wybranych parametrów
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-2">
              Spróbuj wybrać inny horyzont czasowy lub wariant
            </p>
          </div>
        )}
      </div>

      {/* Footer - Export */}
      <div className="p-4 border-t border-[var(--color-border)] flex gap-3 no-print">
        <button
          onClick={() => {
            if (currentScenario) {
              navigator.clipboard.writeText(currentScenario.content);
            }
          }}
          className="flex-1 py-2.5 px-4 bg-white/5 text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-lg hover:bg-white/10 transition-colors"
        >
          Kopiuj do schowka
        </button>
        <button 
          onClick={() => window.print()}
          className="flex-1 py-2.5 px-4 bg-[var(--color-cyan)]/20 text-[var(--color-cyan)] border border-[var(--color-cyan)]/30 rounded-lg hover:bg-[var(--color-cyan)]/30 transition-colors"
        >
          Eksportuj PDF
        </button>
      </div>
    </div>
  );
}

// === KOMPONENT WYKRESU ===

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

function ChartRenderer({ data }: { data: ChartData }) {
  if (!data.data || data.data.length === 0) return null;

  switch (data.chart_type) {
    case 'line':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" opacity={0.3} />
            <XAxis dataKey="x" stroke="#888" fontSize={12} />
            <YAxis stroke="#888" fontSize={12} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              itemStyle={{ color: '#fff' }}
            />
            <Legend />
            <Line type="monotone" dataKey="y" stroke="#00d4ff" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      );
    
    case 'bar':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" opacity={0.3} />
            <XAxis dataKey="name" stroke="#888" fontSize={12} />
            <YAxis stroke="#888" fontSize={12} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              itemStyle={{ color: '#fff' }}
            />
            <Legend />
            <Bar dataKey="value" fill="#00d4ff" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );

    case 'pie':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {data.data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              itemStyle={{ color: '#fff' }}
            />
          </PieChart>
        </ResponsiveContainer>
      );

    case 'area':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" opacity={0.3} />
            <XAxis dataKey="x" stroke="#888" fontSize={12} />
            <YAxis stroke="#888" fontSize={12} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              itemStyle={{ color: '#fff' }}
            />
            <Area type="monotone" dataKey="y" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
      );

    default:
      return <div className="text-center text-gray-500 pt-10">Nieobsługiwany typ wykresu: {data.chart_type}</div>;
  }
}

// === Typy dla parsowanego markdown ===

type SectionType = 'h1' | 'h2' | 'h3' | 'paragraph' | 'list' | 'listItem';

interface ParsedSection {
  type: SectionType;
  content: string;
  items?: string[];
}

/**
 * Parsuje markdown na strukturę danych (bez HTML).
 */
function parseMarkdownSections(content: string): ParsedSection[] {
  const lines = content.split('\n');
  const sections: ParsedSection[] = [];
  let currentList: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Pusta linia - zakończ listę jeśli jest
    if (!trimmed) {
      if (currentList.length > 0) {
        sections.push({ type: 'list', content: '', items: currentList });
        currentList = [];
      }
      continue;
    }

    // Header H1
    if (trimmed.startsWith('# ')) {
      if (currentList.length > 0) {
        sections.push({ type: 'list', content: '', items: currentList });
        currentList = [];
      }
      sections.push({ type: 'h1', content: trimmed.slice(2) });
      continue;
    }

    // Header H2
    if (trimmed.startsWith('## ')) {
      if (currentList.length > 0) {
        sections.push({ type: 'list', content: '', items: currentList });
        currentList = [];
      }
      sections.push({ type: 'h2', content: trimmed.slice(3) });
      continue;
    }

    // Header H3
    if (trimmed.startsWith('### ')) {
      if (currentList.length > 0) {
        sections.push({ type: 'list', content: '', items: currentList });
        currentList = [];
      }
      sections.push({ type: 'h3', content: trimmed.slice(4) });
      continue;
    }

    // List item
    if (trimmed.startsWith('- ') || trimmed.match(/^\d+\. /)) {
      const itemContent = trimmed.startsWith('- ')
        ? trimmed.slice(2)
        : trimmed.replace(/^\d+\. /, '');
      currentList.push(itemContent);
      continue;
    }

    // Paragraph
    if (currentList.length > 0) {
      sections.push({ type: 'list', content: '', items: currentList });
      currentList = [];
    }
    sections.push({ type: 'paragraph', content: trimmed });
  }

  // Zakończ ostatnią listę
  if (currentList.length > 0) {
    sections.push({ type: 'list', content: '', items: currentList });
  }

  return sections;
}

/**
 * Komponent renderujący sekcję markdown.
 */
function MarkdownSection({ section }: { section: ParsedSection }) {
  switch (section.type) {
    case 'h1':
      return (
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mt-6 mb-3">
          {formatInlineText(section.content)}
        </h1>
      );
    case 'h2':
      return (
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mt-5 mb-2 border-b border-[var(--color-border)] pb-2">
          {formatInlineText(section.content)}
        </h2>
      );
    case 'h3':
      return (
        <h3 className="text-base font-medium text-[var(--color-text-primary)] mt-4 mb-2">
          {formatInlineText(section.content)}
        </h3>
      );
    case 'list':
      return (
        <ul className="list-disc list-inside space-y-1 text-[var(--color-text-secondary)]">
          {section.items?.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {formatInlineText(item)}
            </li>
          ))}
        </ul>
      );
    case 'paragraph':
    default:
      return (
        <p className="text-[var(--color-text-secondary)] leading-relaxed">
          {formatInlineText(section.content)}
        </p>
      );
  }
}

/**
 * Formatuje inline text (bold, italic, code) jako React elementy.
 */
function formatInlineText(text: string): React.ReactNode {
  // Prosty regex dla **bold**, *italic*, `code`
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) {
        parts.push(remaining.slice(0, boldMatch.index));
      }
      parts.push(
        <strong key={key++} className="text-[var(--color-cyan)] font-semibold">
          {boldMatch[1]}
        </strong>
      );
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
      continue;
    }

    // Code
    const codeMatch = remaining.match(/`(.+?)`/);
    if (codeMatch && codeMatch.index !== undefined) {
      if (codeMatch.index > 0) {
        parts.push(remaining.slice(0, codeMatch.index));
      }
      parts.push(
        <code key={key++} className="text-[var(--color-gold)] bg-white/5 px-1 rounded text-sm">
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch.index + codeMatch[0].length);
      continue;
    }

    // Italic (single *)
    const italicMatch = remaining.match(/\*(.+?)\*/);
    if (italicMatch && italicMatch.index !== undefined) {
      if (italicMatch.index > 0) {
        parts.push(remaining.slice(0, italicMatch.index));
      }
      parts.push(
        <em key={key++} className="italic">
          {italicMatch[1]}
        </em>
      );
      remaining = remaining.slice(italicMatch.index + italicMatch[0].length);
      continue;
    }

    // No more matches
    parts.push(remaining);
    break;
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
