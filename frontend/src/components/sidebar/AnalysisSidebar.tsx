'use client';

import { useState, useMemo, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { REGIONS, ORGANIZATIONS, SECTORS, getSectorsByCategory } from '@/data/regions';
import type { AnalysisConfig, Sector } from '@/types/regions';
import { ChevronDown, Check, Activity, Globe, Building2, PieChart } from 'lucide-react';
// Activity używany w sekcji Wagi
import { cn } from '@/lib/utils';
import { AtlantisContextPanel } from './AtlantisContextPanel';
import ContextualTooltip, { TOOLTIPS, LabelWithTooltip } from '@/components/ui/ContextualTooltip';

// === COMPONENTS ===

const Checkbox = memo(function Checkbox({
  checked,
  onChange,
  label,
  sublabel,
  color,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  sublabel?: string;
  color?: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
      <div className="relative mt-0.5 flex-shrink-0">
        <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
        <div
          className={cn(
            "w-4 h-4 rounded border transition-all flex items-center justify-center",
            checked
              ? "bg-blue-500 border-blue-500"
              : "bg-transparent border-white/30 group-hover:border-white/50"
          )}
        >
          {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </div>
        {color && (
          <div
            className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-0.5 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn("text-sm font-medium transition-colors", checked ? "text-white" : "text-blue-100")}>
          {label}
        </div>
        {sublabel && (
          <div className="text-xs text-blue-300/70 truncate">{sublabel}</div>
        )}
      </div>
    </label>
  );
});

const SectionHeader = memo(function SectionHeader({
  title,
  count,
  isExpanded,
  onClick,
  icon: Icon,
  tooltip
}: {
  title: string;
  count?: number;
  isExpanded: boolean;
  onClick: () => void;
  icon?: React.ElementType;
  tooltip?: { title: string; description: string };
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 group"
    >
      <div className="flex items-center gap-3">
        {Icon && <Icon className="w-4 h-4 text-blue-300" />}
        <span className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
          {title}
          {tooltip && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <ContextualTooltip
                title={tooltip.title}
                description={tooltip.description}
                side="right"
              />
            </div>
          )}
        </span>
        {count !== undefined && count > 0 && (
          <span className="bg-blue-500/20 text-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
            {count}
          </span>
        )}
      </div>
      <ChevronDown 
        className={cn("w-4 h-4 text-blue-300 transition-transform duration-200", isExpanded && "rotate-180")} 
      />
    </button>
  );
});

const WeightSlider = memo(function WeightSlider({
  sector,
  weight,
  onWeightChange,
}: {
  sector: Sector;
  weight: number;
  onWeightChange: (weight: number) => void;
}) {
  return (
    <div className="py-3 px-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm flex items-center gap-2 text-blue-100">
          <span>{sector.name}</span>
        </span>
        <span className="text-xs font-mono font-medium text-blue-300 bg-white/10 px-1.5 py-0.5 rounded">
          {weight}%
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={weight}
        onChange={(e) => onWeightChange(parseInt(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer bg-white/20 accent-blue-400"
      />
    </div>
  );
});

// === MAIN COMPONENT ===

interface AnalysisSidebarProps {
  config: AnalysisConfig;
  onConfigChange: (config: AnalysisConfig) => void;
}

export default function AnalysisSidebar({
  config,
  onConfigChange,
}: AnalysisSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    regions: true,
    organizations: false,
    sectors: true,
    weights: false,
  });

  const economicSectors = useMemo(() => getSectorsByCategory('economic'), []);
  const politicalSectors = useMemo(() => getSectorsByCategory('political'), []);
  const socialSectors = useMemo(() => getSectorsByCategory('social'), []);

  const toggleSection = useCallback((id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleRegion = useCallback((regionId: string) => {
    onConfigChange({
      ...config,
      regions: config.regions.includes(regionId)
        ? config.regions.filter(r => r !== regionId)
        : [...config.regions, regionId],
    });
  }, [config, onConfigChange]);

  const toggleOrganization = useCallback((orgId: string) => {
    onConfigChange({
      ...config,
      organizations: config.organizations.includes(orgId)
        ? config.organizations.filter(o => o !== orgId)
        : [...config.organizations, orgId],
    });
  }, [config, onConfigChange]);

  const toggleSector = useCallback((sectorId: string) => {
    onConfigChange({
      ...config,
      sectors: config.sectors.includes(sectorId)
        ? config.sectors.filter(s => s !== sectorId)
        : [...config.sectors, sectorId],
    });
  }, [config, onConfigChange]);

  const updateWeight = useCallback((sectorId: string, weight: number) => {
    onConfigChange({
      ...config,
      weights: { ...config.weights, [sectorId]: weight },
    });
  }, [config, onConfigChange]);

  const selectedCount = {
    regions: config.regions.length,
    organizations: config.organizations.length,
    sectors: config.sectors.length,
    countries: config.countries.length,
  };

  return (
    <aside className="w-80 h-full bg-[#192355] rounded-r-3xl flex flex-col shadow-lg z-40 text-white font-sans overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-2">
        <h2 className="text-xl font-bold tracking-tight text-white lowercase">
          parametry
        </h2>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent px-2">
        {/* Feature 2.2: Atlantis Context Panel */}
        <div className="px-2 pt-2">
          <AtlantisContextPanel />
        </div>

        {/* Regions */}
        <div>
          <SectionHeader
            title="Regiony"
            count={selectedCount.regions}
            isExpanded={expandedSections.regions}
            onClick={() => toggleSection('regions')}
            icon={Globe}
            tooltip={TOOLTIPS.regions}
          />
          <AnimatePresence initial={false}>
            {expandedSections.regions && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-2 space-y-0.5">
                  {REGIONS.map(region => (
                    <Checkbox
                      key={region.id}
                      checked={config.regions.includes(region.id)}
                      onChange={() => toggleRegion(region.id)}
                      label={region.name}
                      sublabel={`${region.subregions.length} subregionów`}
                      color={region.color}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Organizations */}
        <div>
          <SectionHeader
            title="Organizacje"
            count={selectedCount.organizations}
            isExpanded={expandedSections.organizations}
            onClick={() => toggleSection('organizations')}
            icon={Building2}
            tooltip={TOOLTIPS.countries}
          />
          <AnimatePresence initial={false}>
            {expandedSections.organizations && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-2 space-y-0.5">
                  {ORGANIZATIONS.map(org => (
                    <Checkbox
                      key={org.id}
                      checked={config.organizations.includes(org.id)}
                      onChange={() => toggleOrganization(org.id)}
                      label={org.abbreviation}
                      sublabel={`${org.members.length} członków`}
                      color={org.color}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sectors */}
        <div>
          <SectionHeader
            title="Sektory"
            count={selectedCount.sectors}
            isExpanded={expandedSections.sectors}
            onClick={() => toggleSection('sectors')}
            icon={PieChart}
            tooltip={TOOLTIPS.sectors}
          />
          <AnimatePresence initial={false}>
            {expandedSections.sectors && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-2 space-y-4">
                  {/* Ekonomiczne */}
                  <div>
                    <div className="text-[10px] font-bold text-blue-400/80 uppercase tracking-widest mb-2 px-3">
                      Ekonomiczne
                    </div>
                    {economicSectors.map(sector => (
                      <Checkbox
                        key={sector.id}
                        checked={config.sectors.includes(sector.id)}
                        onChange={() => toggleSector(sector.id)}
                        label={sector.name} // removed icon
                      />
                    ))}
                  </div>
                  {/* Polityczne */}
                  <div>
                    <div className="text-[10px] font-bold text-blue-400/80 uppercase tracking-widest mb-2 px-3">
                      Polityczne
                    </div>
                    {politicalSectors.map(sector => (
                      <Checkbox
                        key={sector.id}
                        checked={config.sectors.includes(sector.id)}
                        onChange={() => toggleSector(sector.id)}
                        label={sector.name} // removed icon
                      />
                    ))}
                  </div>
                  {/* Społeczne */}
                  <div>
                    <div className="text-[10px] font-bold text-blue-400/80 uppercase tracking-widest mb-2 px-3">
                      Społeczne
                    </div>
                    {socialSectors.map(sector => (
                      <Checkbox
                        key={sector.id}
                        checked={config.sectors.includes(sector.id)}
                        onChange={() => toggleSector(sector.id)}
                        label={sector.name} // removed icon
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Weights */}
        <div>
          <SectionHeader
            title="Wagi"
            isExpanded={expandedSections.weights}
            onClick={() => toggleSection('weights')}
            icon={Activity}
            tooltip={TOOLTIPS.weights}
          />
          <AnimatePresence initial={false}>
            {expandedSections.weights && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-2">
                  {config.sectors.length === 0 ? (
                    <p className="text-xs text-blue-300 italic p-3 text-center">
                      Wybierz sektory, aby ustawić wagi
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {config.sectors.map(sectorId => {
                        const sector = SECTORS.find(s => s.id === sectorId);
                        if (!sector) return null;
                        return (
                          <WeightSlider
                            key={sectorId}
                            sector={sector}
                            weight={config.weights[sectorId] || 50}
                            onWeightChange={(w) => updateWeight(sectorId, w)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

    </aside>
  );
}