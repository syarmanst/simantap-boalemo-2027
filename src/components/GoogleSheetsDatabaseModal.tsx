import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  ExternalLink,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Code,
  Copy,
  Check,
  Globe,
  Zap,
} from 'lucide-react';
import { VillagePlanRecord } from '../types';
import {
  GoogleSheetsConfig,
  SHEETS_CONFIG_KEY,
  getDefaultDatabaseConfig,
  DESIGNATED_SPREADSHEET_ID,
  DESIGNATED_SPREADSHEET_URL,
  DESIGNATED_SHEET_NAME,
  DESIGNATED_SPREADSHEET_TITLE,
} from '../services/googleSheetsDatabase';
import {
  getAppsScriptUrl,
  saveAppsScriptUrl,
  fetchFromAppsScript,
  pushAllToAppsScript,
  APPS_SCRIPT_SAMPLE_CODE,
  DEFAULT_APPS_SCRIPT_URL,
} from '../services/appsScriptDatabase';

interface GoogleSheetsDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  villages: VillagePlanRecord[];
  onApplyVillages: (newVillages: VillagePlanRecord[]) => void;
  sheetsConfig: GoogleSheetsConfig | null;
  onUpdateConfig: (config: GoogleSheetsConfig | null) => void;
}

export const GoogleSheetsDatabaseModal: React.FC<GoogleSheetsDatabaseModalProps> = ({
  isOpen,
  onClose,
  villages,
  onApplyVillages,
  sheetsConfig,
  onUpdateConfig,
}) => {
  // Apps Script Web App URL state
  const [scriptUrl, setScriptUrl] = useState<string>(getAppsScriptUrl());
  const [inputUrl, setInputUrl] = useState<string>(getAppsScriptUrl());
  const [copiedCode, setCopiedCode] = useState(false);

  // Status & Notifications
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processTitle, setProcessTitle] = useState('');

  // Mode: 'overview' | 'apps_script_setup' | 'code_guide'
  const [activeTab, setActiveTab] = useState<'overview' | 'apps_script_setup' | 'code_guide'>('overview');

  // User Confirmation Dialog state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionType: 'pull_apps_script' | 'push_apps_script';
    confirmButtonText: string;
    confirmButtonColor: string;
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionType: 'pull_apps_script',
    confirmButtonText: 'Lanjutkan',
    confirmButtonColor: 'bg-emerald-600',
  });

  useEffect(() => {
    if (isOpen) {
      const saved = getAppsScriptUrl();
      setScriptUrl(saved);
      setInputUrl(saved);
      setStatusMessage(null);
    }
  }, [isOpen]);

  const activeConfig: GoogleSheetsConfig = sheetsConfig || getDefaultDatabaseConfig();

  // Save Apps Script URL
  const handleSaveScriptUrl = () => {
    const trimmed = inputUrl.trim();
    saveAppsScriptUrl(trimmed);
    setScriptUrl(trimmed);
    setStatusMessage({
      type: 'success',
      text: trimmed
        ? 'URL Google Apps Script Web App berhasil disimpan.'
        : 'URL Google Apps Script telah dikosongkan.',
    });
  };

  // Copy sample code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_SAMPLE_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // User Confirmation trigger for Pull from Apps Script
  const promptPullFromAppsScript = () => {
    if (!scriptUrl) {
      setActiveTab('apps_script_setup');
      setStatusMessage({
        type: 'info',
        text: 'Masukkan URL Web App Google Apps Script terlebih dahulu di bawah.',
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Tarik Data dari Spreadsheet via Apps Script?',
      description: `Data dari tab "${DESIGNATED_SHEET_NAME}" pada Google Spreadsheet (${DESIGNATED_SPREADSHEET_ID}) akan dibaca langsung tanpa login Firebase, dan memperbarui 82 data desa di aplikasi ini.`,
      actionType: 'pull_apps_script',
      confirmButtonText: 'Tarik Data Sekarang',
      confirmButtonColor: 'bg-emerald-600 hover:bg-emerald-700',
    });
  };

  // User Confirmation trigger for Push to Apps Script
  const promptPushToAppsScript = () => {
    if (!scriptUrl) {
      setActiveTab('apps_script_setup');
      setStatusMessage({
        type: 'info',
        text: 'Masukkan URL Web App Google Apps Script terlebih dahulu di bawah.',
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Kirim Seluruh Data ke Google Sheets?',
      description: `Sebanyak ${villages.length} data desa dari aplikasi ini akan dikirim via Google Apps Script dan menimpa baris data pada Google Spreadsheet resmi (${DESIGNATED_SPREADSHEET_ID}). Tindakan ini aman tanpa Firebase.`,
      actionType: 'push_apps_script',
      confirmButtonText: 'Kirim & Simpan ke Sheets',
      confirmButtonColor: 'bg-emerald-600 hover:bg-emerald-700',
    });
  };

  // Execute confirmed action
  const handleExecuteConfirmedAction = async () => {
    const action = confirmModal.actionType;
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));

    if (action === 'pull_apps_script') {
      setIsProcessing(true);
      setProcessTitle('Mengambil 82 data desa dari Google Apps Script...');
      try {
        const result = await fetchFromAppsScript(scriptUrl, villages);
        onApplyVillages(result.villages);
        const updatedConfig: GoogleSheetsConfig = {
          ...activeConfig,
          spreadsheetId: DESIGNATED_SPREADSHEET_ID,
          spreadsheetUrl: DESIGNATED_SPREADSHEET_URL,
          sheetName: DESIGNATED_SHEET_NAME,
          lastSyncTime: new Date().toLocaleString('id-ID'),
          lastSyncAction: 'pull',
          lastSyncStatus: 'success',
        };
        onUpdateConfig(updatedConfig);
        localStorage.setItem(SHEETS_CONFIG_KEY, JSON.stringify(updatedConfig));
        setStatusMessage({
          type: 'success',
          text: `Berhasil menarik data! ${result.count} data desa telah diperbarui langsung dari Google Spreadsheet via Apps Script.`,
        });
      } catch (err: any) {
        setStatusMessage({
          type: 'error',
          text: err.message || 'Gagal menarik data via Apps Script. Pastikan Web App disetel "Anyone" (Siapa saja).',
        });
      } finally {
        setIsProcessing(false);
      }
    } else if (action === 'push_apps_script') {
      setIsProcessing(true);
      setProcessTitle('Menyimpan seluruh 82 data desa via Google Apps Script...');
      try {
        await pushAllToAppsScript(scriptUrl, villages);
        const updatedConfig: GoogleSheetsConfig = {
          ...activeConfig,
          spreadsheetId: DESIGNATED_SPREADSHEET_ID,
          spreadsheetUrl: DESIGNATED_SPREADSHEET_URL,
          sheetName: DESIGNATED_SHEET_NAME,
          lastSyncTime: new Date().toLocaleString('id-ID'),
          lastSyncAction: 'push',
          lastSyncStatus: 'success',
        };
        onUpdateConfig(updatedConfig);
        localStorage.setItem(SHEETS_CONFIG_KEY, JSON.stringify(updatedConfig));
        setStatusMessage({
          type: 'success',
          text: `Berhasil! Seluruh ${villages.length} desa telah tersimpan ke Google Spreadsheet (${DESIGNATED_SPREADSHEET_ID}) via Google Apps Script.`,
        });
      } catch (err: any) {
        setStatusMessage({
          type: 'error',
          text: err.message || 'Gagal menyimpan data via Apps Script. Pastikan Web App disetel "Anyone" (Siapa saja).',
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleToggleAutoSync = () => {
    const updated: GoogleSheetsConfig = {
      ...activeConfig,
      autoSync: !activeConfig.autoSync,
    };
    onUpdateConfig(updated);
    localStorage.setItem(SHEETS_CONFIG_KEY, JSON.stringify(updated));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Basis Data Google Spreadsheet (Google Apps Script)
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-semibold border border-emerald-800">
                  Tanpa Firebase / Vercel Ready
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Terhubung langsung ke Spreadsheet Boalemo melalui Google Apps Script Web App
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-6 pt-3 border-b border-slate-800 bg-slate-950/40 flex items-center gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Kelola Data Spreadsheet</span>
          </button>

          <button
            onClick={() => setActiveTab('apps_script_setup')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'apps_script_setup'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Koneksi Apps Script Web App</span>
            {scriptUrl ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('code_guide')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'code_guide'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Kode Apps Script (Panduan Pasang)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Status Message Banner */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-sky-500/10 border-sky-500/30 text-sky-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : statusMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-sky-400 mt-0.5" />
              )}
              <span className="leading-relaxed">{statusMessage.text}</span>
            </div>
          )}

          {/* TAB 1: OVERVIEW & DATA ACTIONS */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Spreadsheet Card */}
              <div className="p-4 sm:p-5 rounded-xl bg-emerald-950/20 border border-emerald-800/60 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-emerald-800/40">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-emerald-300">Spreadsheet Database:</span>
                      <span className="text-xs sm:text-sm font-bold text-white tracking-wide">
                        {DESIGNATED_SPREADSHEET_TITLE}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-semibold border border-emerald-500/40">
                        Spreadsheet Resmi
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-300 font-mono flex-wrap">
                      <span className="text-slate-400 font-sans">ID Spreadsheet:</span>
                      <span className="bg-slate-900/90 px-2 py-0.5 rounded border border-slate-700 text-emerald-300 select-all font-semibold">
                        {DESIGNATED_SPREADSHEET_ID}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 pt-0.5 text-[11px] text-slate-400 flex-wrap">
                      <span>Tab Data: <strong className="text-slate-200">{DESIGNATED_SHEET_NAME}</strong></span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        Terakhir sinkron: <strong className="text-slate-200">{activeConfig.lastSyncTime || 'Belum pernah'}</strong>
                      </span>
                    </div>
                  </div>

                  <a
                    href={DESIGNATED_SPREADSHEET_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-colors self-start sm:self-auto shrink-0 shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Spreadsheet di Google</span>
                  </a>
                </div>

                {/* Connection Status Indicator */}
                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Jalur API Google Apps Script:</span>
                    <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Otomatis Terhubung Permanen</span>
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                    Live & Siap Pakai
                  </span>
                </div>

                {/* Database Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Push to Sheets */}
                  <button
                    onClick={promptPushToAppsScript}
                    disabled={isProcessing}
                    className="flex items-center justify-center gap-3 p-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-500/50 text-white text-xs font-medium transition-all group cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    <Upload className="w-5 h-5 text-emerald-400 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                    <div className="text-left">
                      <div className="font-bold text-slate-100 text-xs sm:text-sm">Kirim Seluruh Data ke Sheets</div>
                      <div className="text-[11px] text-slate-400">Simpan {villages.length} desa via Google Apps Script</div>
                    </div>
                  </button>

                  {/* Pull from Sheets */}
                  <button
                    onClick={promptPullFromAppsScript}
                    disabled={isProcessing}
                    className="flex items-center justify-center gap-3 p-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-500/50 text-white text-xs font-medium transition-all group cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    <Download className="w-5 h-5 text-emerald-400 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                    <div className="text-left">
                      <div className="font-bold text-slate-100 text-xs sm:text-sm">Tarik Data dari Sheets</div>
                      <div className="text-[11px] text-slate-400">Perbarui aplikasi dari tab DATA_DESA spreadsheet</div>
                    </div>
                  </button>
                </div>

                {/* Auto Sync Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-emerald-800/40">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={activeConfig.autoSync}
                      onChange={handleToggleAutoSync}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-700 bg-slate-800"
                    />
                    <span className="font-medium">Sinkronisasi otomatis saat menyimpan data desa</span>
                  </label>

                  <span className="text-[11px] text-emerald-400/90 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Bebas Firebase • Siap Deploy Vercel</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: APPS SCRIPT SETUP */}
          {activeTab === 'apps_script_setup' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    <span>URL Web App Google Apps Script (Telah Dikonfigurasi Otomatis)</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-semibold border border-emerald-800">
                    Aktif Permanen
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Web App URL telah terpasang permanen pada aplikasi. Setiap input data atau perubahan dari formulir langsung dikirim secara otomatis ke Google Spreadsheet.
                </p>

                <div className="space-y-1.5 pt-2">
                  <label className="block text-xs font-semibold text-slate-200">
                    Endpoint Web App Resmi Terpasang:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      readOnly
                      value={DEFAULT_APPS_SCRIPT_URL}
                      className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-emerald-800/60 text-emerald-300 text-xs font-mono select-all focus:outline-hidden"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(DEFAULT_APPS_SCRIPT_URL);
                        setStatusMessage({ type: 'success', text: 'URL Web App berhasil disalin ke clipboard!' });
                      }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition-colors cursor-pointer shrink-0"
                    >
                      Salin URL
                    </button>
                  </div>
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1.5 pt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Terhubung langsung ke Spreadsheet Boalemo (1ETuI256p8T5x-4WFVHB-FKonUkY8di9DroLkpAndF1w). Anda tidak perlu mengubah URL ini lagi.</span>
                  </p>
                </div>
              </div>

              {/* Status Box */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
                <div className="font-semibold text-slate-200">Keunggulan Arsitektur Google Apps Script ini:</div>
                <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                  <li><strong>Otomatis Simpan Real-time</strong>: Setiap perubahan pada formulir langsung tersimpan ke spreadsheet.</li>
                  <li><strong>Tidak memerlukan akun/project Firebase</strong> sama sekali.</li>
                  <li><strong>Tidak memerlukan login OAuth popup</strong> di setiap komputer yang membuka aplikasi.</li>
                  <li><strong>100% Siap di Vercel</strong>, Netlify, atau web hosting mana saja tanpa server tambahan.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: CODE GUIDE & COPY */}
          {activeTab === 'code_guide' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Kode Script untuk Google Spreadsheet</span>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Tersalin ke Clipboard!' : 'Salin Seluruh Kode'}</span>
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1.5">
                  <div className="font-bold">Langkah Memasang di Google Spreadsheet:</div>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-amber-200/90 leading-relaxed">
                    <li>Buka Spreadsheet Anda (<code className="text-white font-mono">1ETuI256p8T5x-4WFVHB-FKonUkY8di9DroLkpAndF1w</code>).</li>
                    <li>Klik menu <strong>Extensions (Ekstensi)</strong> &gt; <strong>Apps Script</strong>.</li>
                    <li>Hapus kode bawaan, lalu <strong>Paste (Tempel)</strong> kode di bawah ini.</li>
                    <li>Klik tombol <strong>Deploy</strong> (kanan atas) &gt; <strong>New deployment</strong>.</li>
                    <li>Pilih tipe <strong>Web app</strong>. Pada bagian <em>Who has access</em> pilih: <strong>Anyone (Siapa saja)</strong>.</li>
                    <li>Klik <strong>Deploy</strong> dan salin <strong>Web App URL</strong> yang dihasilkan ke tab "Koneksi Apps Script Web App".</li>
                  </ol>
                </div>

                <div className="relative">
                  <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono max-h-72 overflow-y-auto leading-relaxed">
                    {APPS_SCRIPT_SAMPLE_CODE}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Google Apps Script REST Engine • Tanpa Dependensi Firebase</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-base font-bold text-white">{confirmModal.title}</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {confirmModal.description}
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleExecuteConfirmedAction}
                className={`px-4 py-2 rounded-lg text-white text-xs font-semibold shadow-md transition-colors cursor-pointer ${confirmModal.confirmButtonColor}`}
              >
                {confirmModal.confirmButtonText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
