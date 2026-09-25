import React from 'react';
import { MODULES_CONFIG } from '../data/initialData';
import { ModuleKey } from '../types';
import { ChevronLeft, ChevronRight, Paperclip } from 'lucide-react';

interface ModuleNavigationProps {
  currentModule: ModuleKey;
  onSelectModule: (key: ModuleKey) => void;
  villageCompletionStatus?: Record<ModuleKey, boolean>;
  evidenceCounts?: Partial<Record<ModuleKey, number>>;
}

export const ModuleNavigation: React.FC<ModuleNavigationProps> = ({
  currentModule,
  onSelectModule,
  villageCompletionStatus,
  evidenceCounts,
}) => {
  const currentIndex = MODULES_CONFIG.findIndex((m) => m.key === currentModule);

  const handlePrev = () => {
    if (currentIndex > 0) {
      onSelectModule(MODULES_CONFIG[currentIndex - 1].key as ModuleKey);
    }
  };

  const handleNext = () => {
    if (currentIndex < MODULES_CONFIG.length - 1) {
      onSelectModule(MODULES_CONFIG[currentIndex + 1].key as ModuleKey);
    }
  };

  return (
    <div className="bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Quick Prev Button */}
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            aria-label="Modul Sebelumnya"
            className={`p-2 rounded-lg border text-xs font-medium flex items-center transition-all shrink-0 ${
              currentIndex === 0
                ? 'opacity-40 cursor-not-allowed border-slate-200 text-slate-400'
                : 'border-slate-300 text-slate-700 hover:bg-slate-100 active:scale-95'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden md:inline ml-1">Sebelumnya</span>
          </button>

          {/* Module Buttons Bar (Scrollable on mobile) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-1 scroll-smooth">
            {MODULES_CONFIG.map((mod) => {
              const isActive = currentModule === mod.key;
              const isDone = villageCompletionStatus ? villageCompletionStatus[mod.key as ModuleKey] : false;
              const count = evidenceCounts ? evidenceCounts[mod.key as ModuleKey] || 0 : 0;

              return (
                <button
                  key={mod.key}
                  onClick={() => onSelectModule(mod.key as ModuleKey)}
                  className={`group relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap border shrink-0 ${
                    isActive
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-500/20'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <span
                    className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
                      isActive ? 'bg-emerald-800 text-emerald-200' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {mod.code}
                  </span>
                  <span className="font-semibold">{mod.shortTitle}</span>
                  {count > 0 && (
                    <span
                      title={`${count} berkas bukti terlampir`}
                      className={`flex items-center gap-0.5 text-[10px] font-mono px-1 rounded ${
                        isActive ? 'bg-emerald-900 text-emerald-200' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      <Paperclip className="w-2.5 h-2.5" />
                      <span>{count}</span>
                    </span>
                  )}
                  {isDone && (
                    <span
                      title="Data modul ini sudah terisi untuk desa yang dipilih"
                      className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-300' : 'bg-emerald-600'}`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Next Button */}
          <button
            onClick={handleNext}
            disabled={currentIndex === MODULES_CONFIG.length - 1}
            aria-label="Modul Selanjutnya"
            className={`p-2 rounded-lg border text-xs font-medium flex items-center transition-all shrink-0 ${
              currentIndex === MODULES_CONFIG.length - 1
                ? 'opacity-40 cursor-not-allowed border-slate-200 text-slate-400'
                : 'border-slate-300 text-slate-700 hover:bg-slate-100 active:scale-95'
            }`}
          >
            <span className="hidden md:inline mr-1">Selanjutnya</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
