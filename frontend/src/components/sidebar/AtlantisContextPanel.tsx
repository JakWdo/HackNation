import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Anchor, Users, TrendingUp, Shield, MapPin, 
  ChevronDown, Building2, Globe, AlertTriangle, 
  History, Coins, Cpu 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ContextualTooltip from '@/components/ui/ContextualTooltip';

// Tab button component
const TabButton = ({ 
  active, 
  onClick, 
  icon: Icon, 
  label 
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ElementType; 
  label: string;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
      active 
        ? "bg-blue-500/20 text-blue-200 border border-blue-500/30" 
        : "text-blue-300/70 hover:text-blue-200 hover:bg-white/5"
    )}
  >
    <Icon className="w-3.5 h-3.5" />
    {label}
  </button>
);

// Info row component
const InfoRow = ({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ElementType }) => (
  <div className="flex items-start gap-2 text-xs py-1">
    {Icon && <Icon className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />}
    <div className="flex flex-col">
      <span className="text-blue-300/70 text-[10px] uppercase tracking-wider font-bold">{label}</span>
      <span className="text-blue-50 font-medium leading-relaxed">{value}</span>
    </div>
  </div>
);

export const AtlantisContextPanel = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'economy' | 'security'>('general');

  return (
    <div className="border-b border-white/5">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <Anchor className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
            Profil Atlantis
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">
               <ContextualTooltip 
                 title="Profil Państwa" 
                 description="Szczegółowe dane o państwie Atlantis: demografia, gospodarka, polityka i bezpieczeństwo."
                 side="right"
               />
            </span>
          </span>
          <span className="bg-cyan-500/20 text-cyan-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-cyan-500/30">
            NATO/UE
          </span>
        </div>
        <ChevronDown 
          className={cn("w-4 h-4 text-blue-300 transition-transform duration-200", isExpanded && "rotate-180")} 
        />
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-[#121a40]/50"
          >
            <div className="p-3">
              {/* Tabs */}
              <div className="flex items-center gap-1 mb-3 pb-2 border-b border-white/5 overflow-x-auto scrollbar-none">
                <TabButton 
                  active={activeTab === 'general'} 
                  onClick={() => setActiveTab('general')} 
                  icon={Globe} 
                  label="Ogólne" 
                />
                <TabButton 
                  active={activeTab === 'economy'} 
                  onClick={() => setActiveTab('economy')} 
                  icon={TrendingUp} 
                  label="Gospodarka" 
                />
                <TabButton 
                  active={activeTab === 'security'} 
                  onClick={() => setActiveTab('security')} 
                  icon={Shield} 
                  label="Bezpiecz." 
                />
              </div>

              {/* Content */}
              <div className="space-y-3 min-h-[200px]">
                {activeTab === 'general' && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    className="space-y-3"
                  >
                    <InfoRow icon={MapPin} label="Lokalizacja" value="Europa Środkowa, dostęp do Bałtyku" />
                    <InfoRow icon={Users} label="Populacja" value="28 mln" />
                    <InfoRow icon={Building2} label="Ustrój" value="Demokracja parlamentarna (od 130 lat)" />
                    <InfoRow icon={History} label="Członkostwo" value="UE i NATO od 1997 roku" />
                    <div className="p-2 bg-blue-500/10 rounded border border-blue-500/20 text-xs text-blue-100">
                      <span className="text-blue-300 font-bold block mb-1">Kontekst:</span>
                      Klimat umiarkowany. Ograniczone zasoby wody pitnej.
                    </div>
                  </motion.div>
                )}

                {activeTab === 'economy' && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    className="space-y-3"
                  >
                    <InfoRow icon={TrendingUp} label="Pozycja" value="25. gospodarka świata (2020)" />
                    <InfoRow icon={Coins} label="Waluta" value="Własna (inna niż Euro)" />
                    <InfoRow icon={Building2} label="Kluczowe Sektory" value="Przemysł ciężki, motoryzacyjny, spożywczy, chemiczny, ICT." />
                    <InfoRow icon={Cpu} label="Ambicje" value="Hub AI, OZE, surowce krytyczne, komputery kwantowe." />
                  </motion.div>
                )}

                {activeTab === 'security' && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    className="space-y-3"
                  >
                    <InfoRow icon={Shield} label="Siły Zbrojne" value="150 tys. żołnierzy zawodowych" />
                    <InfoRow icon={Users} label="Sojusznicy" value="Niemcy, Francja, Finlandia, Ukraina, USA, Japonia" />
                    
                    <div className="mt-2 space-y-2">
                      <div className="flex items-start gap-2 p-2 bg-red-500/10 rounded border border-red-500/20">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                        <div className="text-xs">
                          <span className="text-red-300 font-bold block">Zagrożenia:</span>
                          <span className="text-red-100/80 leading-tight block mt-1">
                            • Ataki hybrydowe sąsiada<br/>
                            • Niestabilność UE<br/>
                            • Zakłócenia dostaw paliw<br/>
                            • Embargo na procesory
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

