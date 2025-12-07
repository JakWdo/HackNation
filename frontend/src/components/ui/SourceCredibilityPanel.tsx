import React from 'react';
import { CredibilityScore, CredibilityLevel } from '@/types/schemas';
import { Card, CardContent, CardHeader, CardTitle } from './card';

interface SourceCredibilityPanelProps {
  credibility: CredibilityScore;
  compact?: boolean;
}

export const SourceCredibilityPanel: React.FC<SourceCredibilityPanelProps> = ({ 
  credibility, 
  compact = false 
}) => {
  const getLevelColor = (level: CredibilityLevel) => {
    switch (level) {
      case CredibilityLevel.HIGH:
        return 'text-green-600 border-green-200 bg-green-50';
      case CredibilityLevel.MEDIUM:
        return 'text-yellow-600 border-yellow-200 bg-yellow-50';
      case CredibilityLevel.LOW:
        return 'text-orange-600 border-orange-200 bg-orange-50';
      case CredibilityLevel.SUSPICIOUS:
        return 'text-red-600 border-red-200 bg-red-50';
      default:
        return 'text-gray-600 border-gray-200 bg-gray-50';
    }
  };

  const getLevelLabel = (level: CredibilityLevel) => {
    switch (level) {
      case CredibilityLevel.HIGH:
        return 'Wysoka wiarygodność';
      case CredibilityLevel.MEDIUM:
        return 'Średnia wiarygodność';
      case CredibilityLevel.LOW:
        return 'Niska wiarygodność';
      case CredibilityLevel.SUSPICIOUS:
        return 'PODEJRZANE ŹRÓDŁO';
      default:
        return 'Nieznana wiarygodność';
    }
  };

  const colorClass = getLevelColor(credibility.level);

  if (compact) {
    return (
      <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${colorClass}`} title={credibility.reasoning}>
        {credibility.level === CredibilityLevel.SUSPICIOUS && (
          <span className="mr-1">⚠️</span>
        )}
        {getLevelLabel(credibility.level)} ({Math.round(credibility.score * 100)}%)
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-md border ${colorClass} mb-4`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold flex items-center">
          {credibility.level === CredibilityLevel.SUSPICIOUS && (
            <span className="mr-2 text-xl">⚠️</span>
          )}
          {getLevelLabel(credibility.level)}
        </h4>
        <span className="font-bold text-sm">{Math.round(credibility.score * 100)}%</span>
      </div>
      
      <p className="text-sm mb-2">{credibility.reasoning}</p>
      
      {credibility.flags.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-semibold uppercase opacity-75 mb-1">Ostrzeżenia:</p>
          <div className="flex flex-wrap gap-1">
            {credibility.flags.map((flag, idx) => (
              <span key={idx} className="text-xs px-1.5 py-0.5 bg-white/50 rounded border border-black/10">
                {flag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
