'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface HeaderProps {
  isAnalyzing?: boolean;
  progress?: number;
}

export default function Header({ isAnalyzing = false, progress = 0 }: HeaderProps) {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      setTime(new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white text-[#192355] relative z-50 w-full shadow-sm">
      <div className="px-8 py-4 flex items-center justify-between">
        {/* Logo / Brand */}
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-[#192355] font-sans lowercase">
            sedno
          </h1>
          {isAnalyzing && (
            <div className="flex flex-col w-64 gap-1">
              <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <span>Analiza w toku</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-[#00d4ff]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "easeOut" }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Time */}
        <div className="text-sm font-medium font-mono text-gray-600 opacity-80">
          {time}
        </div>
      </div>
    </header>
  );
}
