import React, { useState } from 'react';
import {
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Database,
  CloudCheck,
  Cloud
} from 'lucide-react';
import { GoogleSheetsConfig, fetchVillagesFromSheets } from '../services/googleSheetsDatabase';
import { getAccessToken } from '../services/googleAuth';
import { VillagePlanRecord } from '../types';

interface GoogleSheetsBarProps {
  sheetsConfig: GoogleSheetsConfig | null;
  onOpenModal: () => void;
  villages: VillagePlanRecord[];
  onApplyVillages: (newVillages: VillagePlanRecord[]) => void;
  onUpdateConfig: (config: GoogleSheetsConfig | null) => void;
}

export const GoogleSheetsBar: React.FC<GoogleSheetsBarProps> = ({
  sheetsConfig,
  onOpenModal,
  villages,
  onApplyVillages,
  onUpdateConfig,
}) => {
  const [isQuickSyncing, setIsQuickSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleQuickSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!sheetsConfig) {
      onOpenModal();
      return;
    }

    const token = await getAccessToken();
    if (!token) {
      onOpenModal();
      return;
    }

    setIsQuickSyncing(true);
    setSyncFeedback('Menyinkronkan...');
    try {
      const result = await fetchVillagesFromSheets(
        token,
        sheetsConfig.spreadsheetId,
        sheetsConfig.sheetName,
        villages
      );
      onApplyVillages(result.villages);
      const updatedConfig: GoogleSheetsConfig = {
        ...sheetsConfig,
        lastSyncTime: new Date().toLocaleString('id-ID'),
        lastSyncAction: 'pull',
        lastSyncStatus: 'success',
      };
      onUpdateConfig(updatedConfig);
      setSyncFeedback('Data tersinkron!');
      setTimeout(() => setSyncFeedback(null), 3000);
    } catch (err: any) {
      setSyncFeedback('Gagal sinkron');
      setTimeout(() => setSyncFeedback(null), 3000);
    } finally {
      setIsQuickSyncing(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border-b border-slate-800 text-xs text-slate-300 py-1.5 px-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        {/* Left: Connection info */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-medium">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Database:</span>
          </div>

          {sheetsConfig ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Google Sheets Terhubung
              </span>
              <span className="text-white font-medium truncate max-w-[200px] sm:max-w-[300px]" title={sheetsConfig.spreadsheetTitle}>
                {sheetsConfig.spreadsheetTitle}
              </span>
              {sheetsConfig.lastSyncTime && (
                <span className="text-[10px] text-slate-400 hidden md:inline">
                  (Sinkron: {sheetsConfig.lastSyncTime})
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[11px]">
                Lokal (Browser)
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Hubungkan dengan Google Sheets untuk sinkronisasi cloud real-time
              </span>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {syncFeedback && (
            <span className="text-[11px] text-emerald-400 animate-fade-in font-medium">
              {syncFeedback}
            </span>
          )}

          {sheetsConfig && (
            <>
              <button
                onClick={handleQuickSync}
                disabled={isQuickSyncing}
                title="Tarik data terbaru dari Google Sheets"
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-medium transition-colors"
              >
                <RefreshCw className={`w-3 h-3 text-emerald-400 ${isQuickSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Sinkron Data</span>
              </button>

              <a
                href={sheetsConfig.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Buka dokumen di tab baru Google Sheets"
                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-[11px] transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span className="hidden sm:inline">Buka Sheets</span>
              </a>
            </>
          )}

          <button
            onClick={onOpenModal}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
              sheetsConfig
                ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-xs'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{sheetsConfig ? 'Kelola Database' : 'Hubungkan Google Sheets'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
