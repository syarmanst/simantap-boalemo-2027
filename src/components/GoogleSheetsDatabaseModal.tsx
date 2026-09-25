import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  ExternalLink,
  RefreshCw,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Plus,
  Unlink,
  Radio,
  FileText,
  Clock,
  Sparkles,
  ShieldCheck,
  FolderOpen
} from 'lucide-react';
import { User } from 'firebase/auth';
import { VillagePlanRecord } from '../types';
import {
  GoogleSheetsConfig,
  SHEETS_CONFIG_KEY,
  createDatabaseSpreadsheet,
  fetchVillagesFromSheets,
  pushAllVillagesToSheets,
  listGoogleDriveSpreadsheets,
  getSpreadsheetMetadata,
  extractSpreadsheetId
} from '../services/googleSheetsDatabase';
import {
  googleSignIn,
  getAccessToken,
  logoutGoogle,
  getCurrentGoogleUser,
  AUTHORIZED_DATABASE_EMAIL
} from '../services/googleAuth';

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
  const [googleUser, setGoogleUser] = useState<User | null>(getCurrentGoogleUser());
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  // Status & Notifications
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processTitle, setProcessTitle] = useState('');

  // Mode: 'overview' | 'create_new' | 'pick_drive' | 'manual_id'
  const [activeTab, setActiveTab] = useState<'overview' | 'create_new' | 'pick_drive' | 'manual_id'>('overview');

  // Input states
  const [newTitle, setNewTitle] = useState('Database Perencanaan Desa Boalemo 2027');
  const [manualInput, setManualInput] = useState('');
  const [driveFiles, setDriveFiles] = useState<Array<{ id: string; name: string; modifiedTime: string }>>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);

  // User Confirmation Dialog state (MANDATORY per Workspace Integration skill for mutating actions)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionType: 'pull' | 'push' | 'unlink';
    confirmButtonText: string;
    confirmButtonColor: string;
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionType: 'pull',
    confirmButtonText: 'Lanjutkan',
    confirmButtonColor: 'bg-emerald-600',
  });

  // Check token availability
  const checkToken = async () => {
    const token = await getAccessToken();
    setHasToken(!!token);
    setGoogleUser(getCurrentGoogleUser());
  };

  useEffect(() => {
    if (isOpen) {
      checkToken();
      setStatusMessage(null);
    }
  }, [isOpen]);

  // Google Login Handler
  const handleGoogleLogin = async () => {
    setIsLoadingAuth(true);
    setStatusMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setHasToken(true);
        setStatusMessage({
          type: 'success',
          text: `Berhasil terhubung ke akun Google Workspace (${res.user.email})`,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Gagal masuk dengan Google Workspace',
      });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  // Google Logout Handler
  const handleGoogleLogout = async () => {
    await logoutGoogle();
    setGoogleUser(null);
    setHasToken(false);
    setStatusMessage({
      type: 'info',
      text: 'Telah keluar dari akun Google.',
    });
  };

  // Load drive spreadsheets
  const handleLoadDriveFiles = async () => {
    const token = await getAccessToken();
    if (!token) {
      setStatusMessage({ type: 'error', text: 'Silakan login Google terlebih dahulu' });
      return;
    }
    setIsLoadingDrive(true);
    try {
      const files = await listGoogleDriveSpreadsheets(token);
      setDriveFiles(files);
      if (files.length === 0) {
        setStatusMessage({ type: 'info', text: 'Tidak ada spreadsheet ditemukan di Google Drive akun ini' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Gagal memuat daftar Google Drive' });
    } finally {
      setIsLoadingDrive(false);
    }
  };

  // 1. Action: Create New Database Spreadsheet
  const handleCreateNewDatabase = async () => {
    const token = await getAccessToken();
    if (!token) {
      setStatusMessage({ type: 'error', text: 'Silakan login ke akun Google terlebih dahulu' });
      return;
    }

    setIsProcessing(true);
    setProcessTitle('Membuat spreadsheet baru di Google Drive...');
    try {
      const result = await createDatabaseSpreadsheet(token, villages, newTitle.trim() || undefined);
      const newConfig: GoogleSheetsConfig = {
        spreadsheetId: result.spreadsheetId,
        spreadsheetTitle: result.title,
        spreadsheetUrl: result.spreadsheetUrl,
        sheetName: result.sheetName,
        autoSync: true,
        lastSyncTime: new Date().toLocaleString('id-ID'),
        lastSyncAction: 'push',
        lastSyncStatus: 'success',
      };
      onUpdateConfig(newConfig);
      localStorage.setItem(SHEETS_CONFIG_KEY, JSON.stringify(newConfig));
      setStatusMessage({
        type: 'success',
        text: `Basis data spreadsheet "${result.title}" berhasil dibuat dan terhubung!`,
      });
      setActiveTab('overview');
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Gagal membuat Google Spreadsheet baru',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Action: Connect Existing Spreadsheet and Initialize Database immediately
  const handleConnectAndInitialize = async (inputStr: string) => {
    const token = await getAccessToken();
    if (!token) {
      setStatusMessage({ type: 'error', text: 'Silakan masuk dengan akun Google terlebih dahulu' });
      return;
    }

    const id = extractSpreadsheetId(inputStr);
    if (!id) {
      setStatusMessage({ type: 'error', text: 'ID atau URL Spreadsheet tidak valid. Contoh: https://docs.google.com/spreadsheets/d/.../edit' });
      return;
    }

    setIsProcessing(true);
    setProcessTitle('Menyiapkan tab DATA_DESA dan mengirim 82 data desa...');
    try {
      const meta = await getSpreadsheetMetadata(token, id);
      const actualSheet = await pushAllVillagesToSheets(token, id, 'DATA_DESA', villages);

      const newConfig: GoogleSheetsConfig = {
        spreadsheetId: id,
        spreadsheetTitle: meta.title,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${id}/edit`,
        sheetName: actualSheet,
        autoSync: true,
        lastSyncTime: new Date().toLocaleString('id-ID'),
        lastSyncAction: 'push',
        lastSyncStatus: 'success',
      };

      onUpdateConfig(newConfig);
      localStorage.setItem(SHEETS_CONFIG_KEY, JSON.stringify(newConfig));
      setStatusMessage({
        type: 'success',
        text: `Berhasil terhubung ke "${meta.title}"! Tab ${actualSheet} telah dibuat dan seluruh ${villages.length} data desa berhasil ditulis.`,
      });
      setActiveTab('overview');
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Gagal membuat database pada spreadsheet tersebut. Pastikan akun Google memiliki izin Edit.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Action: Connect Existing Spreadsheet (ReadOnly/Link mode)
  const handleConnectExisting = async (inputStr: string) => {
    const token = await getAccessToken();
    if (!token) {
      setStatusMessage({ type: 'error', text: 'Silakan login Google terlebih dahulu' });
      return;
    }

    const id = extractSpreadsheetId(inputStr);
    if (!id) {
      setStatusMessage({ type: 'error', text: 'ID atau URL Spreadsheet tidak valid' });
      return;
    }

    setIsProcessing(true);
    setProcessTitle('Memverifikasi akses ke spreadsheet...');
    try {
      const meta = await getSpreadsheetMetadata(token, id);
      const chosenSheet = meta.sheetNames.includes('DATA_DESA')
        ? 'DATA_DESA'
        : meta.sheetNames[0] || 'Sheet1';

      const newConfig: GoogleSheetsConfig = {
        spreadsheetId: id,
        spreadsheetTitle: meta.title,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${id}/edit`,
        sheetName: chosenSheet,
        autoSync: true,
        lastSyncTime: new Date().toLocaleString('id-ID'),
        lastSyncAction: 'pull',
        lastSyncStatus: 'success',
      };

      onUpdateConfig(newConfig);
      localStorage.setItem(SHEETS_CONFIG_KEY, JSON.stringify(newConfig));
      setStatusMessage({
        type: 'success',
        text: `Terhubung ke Google Spreadsheet: "${meta.title}" (Tab: ${chosenSheet})`,
      });
      setActiveTab('overview');
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Gagal mengakses spreadsheet tersebut. Pastikan ID benar dan akun memiliki hak akses.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. User Confirmation trigger for Pull (Overwrites app local data)
  const promptPullFromSheets = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Tarik Data dari Google Sheets?',
      description: `Data dari tab "${sheetsConfig?.sheetName}" pada Google Spreadsheet "${sheetsConfig?.spreadsheetTitle}" akan dibaca dan memperbarui 82 data desa di aplikasi ini. Perubahan lokal yang belum disimpan ke Sheets mungkin akan tertimpa.`,
      actionType: 'pull',
      confirmButtonText: 'Tarik & Sinkronkan Sekarang',
      confirmButtonColor: 'bg-emerald-600 hover:bg-emerald-700',
    });
  };

  // 4. User Confirmation trigger for Push (Overwrites spreadsheet data)
  const promptPushToSheets = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Kirim Seluruh Data ke Google Sheets?',
      description: `Sebanyak ${villages.length} data desa dari aplikasi akan disimpan dan menimpa baris data pada Google Spreadsheet "${sheetsConfig?.spreadsheetTitle}" (${sheetsConfig?.spreadsheetId}). Tindakan ini memutasi data pada Google Drive Anda.`,
      actionType: 'push',
      confirmButtonText: 'Simpan ke Google Sheets',
      confirmButtonColor: 'bg-emerald-600 hover:bg-emerald-700',
    });
  };

  // 5. User Confirmation trigger for Unlink
  const promptUnlink = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Putus Koneksi Google Sheets?',
      description: 'Aplikasi tidak lagi terhubung secara otomatis ke Google Spreadsheet ini. File di Google Drive tidak akan dihapus.',
      actionType: 'unlink',
      confirmButtonText: 'Putuskan Koneksi',
      confirmButtonColor: 'bg-rose-600 hover:bg-rose-700',
    });
  };

  // Execute confirmed action
  const handleExecuteConfirmedAction = async () => {
    const action = confirmModal.actionType;
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));

    if (action === 'unlink') {
      onUpdateConfig(null);
      localStorage.removeItem(SHEETS_CONFIG_KEY);
      setStatusMessage({ type: 'info', text: 'Koneksi Google Spreadsheet telah diputuskan.' });
      return;
    }

    const token = await getAccessToken();
    if (!token || !sheetsConfig) {
      setStatusMessage({ type: 'error', text: 'Sesi Google telah kedaluwarsa. Silakan login kembali.' });
      return;
    }

    if (action === 'pull') {
      setIsProcessing(true);
      setProcessTitle('Mengambil data dari Google Sheets...');
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
        localStorage.setItem(SHEETS_CONFIG_KEY, JSON.stringify(updatedConfig));
        setStatusMessage({
          type: 'success',
          text: `Berhasil menarik data! ${result.count} data desa telah diperbarui dari Google Sheets.`,
        });
      } catch (err: any) {
        setStatusMessage({
          type: 'error',
          text: err.message || 'Gagal menarik data dari Google Sheets',
        });
      } finally {
        setIsProcessing(false);
      }
    } else if (action === 'push') {
      setIsProcessing(true);
      setProcessTitle('Menyimpan seluruh data ke Google Sheets...');
      try {
        await pushAllVillagesToSheets(
          token,
          sheetsConfig.spreadsheetId,
          sheetsConfig.sheetName,
          villages
        );
        const updatedConfig: GoogleSheetsConfig = {
          ...sheetsConfig,
          lastSyncTime: new Date().toLocaleString('id-ID'),
          lastSyncAction: 'push',
          lastSyncStatus: 'success',
        };
        onUpdateConfig(updatedConfig);
        localStorage.setItem(SHEETS_CONFIG_KEY, JSON.stringify(updatedConfig));
        setStatusMessage({
          type: 'success',
          text: `Berhasil! Seluruh ${villages.length} desa telah tersimpan di Google Spreadsheet.`,
        });
      } catch (err: any) {
        setStatusMessage({
          type: 'error',
          text: err.message || 'Gagal menyimpan data ke Google Sheets',
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleToggleAutoSync = () => {
    if (!sheetsConfig) return;
    const updated: GoogleSheetsConfig = {
      ...sheetsConfig,
      autoSync: !sheetsConfig.autoSync,
    };
    onUpdateConfig(updated);
    localStorage.setItem(SHEETS_CONFIG_KEY, JSON.stringify(updated));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Basis Data Google Sheets
                <span className="text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                  Cloud Database
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Penyimpanan data real-time perencanaan desa menggunakan Google Sheets API
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
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
                <FileText className="w-4 h-4 shrink-0 text-sky-400 mt-0.5" />
              )}
              <span className="leading-relaxed">{statusMessage.text}</span>
            </div>
          )}

          {/* 1. Account Authentication Card */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {googleUser ? (
                <>
                  {googleUser.photoURL ? (
                    <img
                      src={googleUser.photoURL}
                      alt={googleUser.displayName || ''}
                      className="w-10 h-10 rounded-full border border-emerald-500/40 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-300 font-bold shrink-0">
                      {googleUser.email?.[0].toUpperCase() || 'U'}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">
                        {googleUser.displayName || 'Akun Google'}
                      </span>
                      {googleUser.email?.toLowerCase() === AUTHORIZED_DATABASE_EMAIL.toLowerCase() ? (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono font-semibold border border-emerald-500/40">
                          Akun Database Resmi
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                          Terhubung
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-slate-300 font-mono">{googleUser.email}</span>
                      {googleUser.email?.toLowerCase() !== AUTHORIZED_DATABASE_EMAIL.toLowerCase() && (
                        <span className="text-[10px] text-amber-400">
                          (Rekomendasi: {AUTHORIZED_DATABASE_EMAIL})
                        </span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-xs font-bold text-white">Sambungkan Akun Google Database</h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                      {AUTHORIZED_DATABASE_EMAIL}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Otorisasi akun Google resmi untuk membaca serta menulis database Google Sheets & Google Drive
                  </p>
                </div>
              )}
            </div>

            {/* Official Google Sign-in / Sign-out Button */}
            <div className="shrink-0">
              {googleUser && hasToken ? (
                <button
                  onClick={handleGoogleLogout}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors"
                >
                  Ganti Akun
                </button>
              ) : (
                <button
                  onClick={handleGoogleLogin}
                  disabled={isLoadingAuth}
                  className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs transition-all shadow-sm active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  {/* Official Google SVG Logo */}
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>{isLoadingAuth ? 'Menghubungkan...' : `Masuk (${AUTHORIZED_DATABASE_EMAIL})`}</span>
                </button>
              )}
            </div>
          </div>

          {/* 2. Active Connected Spreadsheet Status */}
          {sheetsConfig ? (
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/60 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-emerald-800/40">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-emerald-300">Spreadsheet Aktif:</span>
                    <span className="text-xs font-bold text-white tracking-wide">
                      {sheetsConfig.spreadsheetTitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                    <span>Tab Data: <strong className="text-slate-200">{sheetsConfig.sheetName}</strong></span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      Terakhir sinkron: {sheetsConfig.lastSyncTime || 'Belum pernah'}
                    </span>
                  </div>
                </div>

                <a
                  href={sheetsConfig.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-medium transition-colors self-start sm:self-auto"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka di Google Sheets</span>
                </a>
              </div>

              {/* Database Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Pull from Sheets */}
                <button
                  onClick={promptPullFromSheets}
                  disabled={isProcessing}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-white text-xs font-medium transition-colors group cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4 text-emerald-400 group-hover:-translate-y-0.5 transition-transform" />
                  <div className="text-left">
                    <div className="font-semibold text-slate-200">Tarik Data dari Sheets</div>
                    <div className="text-[10px] text-slate-400">Update aplikasi dengan data spreadsheet</div>
                  </div>
                </button>

                {/* Push to Sheets */}
                <button
                  onClick={promptPushToSheets}
                  disabled={isProcessing}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-white text-xs font-medium transition-colors group cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-4 h-4 text-emerald-400 group-hover:-translate-y-0.5 transition-transform" />
                  <div className="text-left">
                    <div className="font-semibold text-slate-200">Kirim Data ke Sheets</div>
                    <div className="text-[10px] text-slate-400">Simpan {villages.length} desa ke spreadsheet</div>
                  </div>
                </button>
              </div>

              {/* Auto Sync Toggle & Unlink */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={sheetsConfig.autoSync}
                    onChange={handleToggleAutoSync}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-700 bg-slate-800"
                  />
                  <span>Sinkronisasi otomatis saat menyimpan formulir desa</span>
                </label>

                <button
                  onClick={promptUnlink}
                  className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors self-end sm:self-auto"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Putuskan Koneksi</span>
                </button>
              </div>
            </div>
          ) : (
            /* 3. Not Connected - Setup Wizard Tabs */
            <div className="space-y-4">
              <div className="flex border-b border-slate-800">
                <button
                  onClick={() => setActiveTab('create_new')}
                  className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === 'create_new' || activeTab === 'overview'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Buat Spreadsheet Baru</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('pick_drive');
                    handleLoadDriveFiles();
                  }}
                  className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === 'pick_drive'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Pilih dari Drive</span>
                </button>
                <button
                  onClick={() => setActiveTab('manual_id')}
                  className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === 'manual_id'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Input Link / ID Manual</span>
                </button>
              </div>

              {/* Tab 1: Create New Spreadsheet Automatically */}
              {(activeTab === 'create_new' || activeTab === 'overview') && (
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">
                      Judul Dokumen Google Spreadsheet:
                    </label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Database Perencanaan Desa Boalemo 2027"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300/90 leading-relaxed">
                    Aplikasi akan membuat spreadsheet baru di Google Drive akun Anda, mengatur 106 kolom resmi, membekukan baris tajuk (*freeze rows*), dan memasukkan seluruh 82 data desa Kabupaten Boalemo secara lengkap.
                  </div>
                  <button
                    onClick={handleCreateNewDatabase}
                    disabled={isProcessing || !hasToken}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isProcessing ? processTitle : 'Buat & Hubungkan Database Spreadsheet'}</span>
                  </button>
                </div>
              )}

              {/* Tab 2: Pick from Google Drive */}
              {activeTab === 'pick_drive' && (
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300">
                      Spreadsheet di Google Drive Anda:
                    </span>
                    <button
                      onClick={handleLoadDriveFiles}
                      disabled={isLoadingDrive || !hasToken}
                      className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingDrive ? 'animate-spin' : ''}`} />
                      <span>Muat Ulang</span>
                    </button>
                  </div>

                  {isLoadingDrive ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Memuat daftar spreadsheet dari Google Drive...
                    </div>
                  ) : driveFiles.length > 0 ? (
                    <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                      {driveFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-700/70 hover:border-emerald-500/50 transition-colors"
                        >
                          <div className="truncate pr-2">
                            <div className="text-xs font-semibold text-white truncate">
                              {file.name}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Diubah: {new Date(file.modifiedTime).toLocaleString('id-ID')}
                            </div>
                          </div>
                          <button
                            onClick={() => handleConnectExisting(file.id)}
                            disabled={isProcessing}
                            className="shrink-0 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
                          >
                            Hubungkan
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-400">
                      {hasToken
                        ? 'Tidak ada file Google Spreadsheet yang ditemukan.'
                        : 'Silakan masuk dengan akun Google terlebih dahulu.'}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Manual Input */}
              {activeTab === 'manual_id' && (
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-200">
                      Link Alamat URL atau ID Google Spreadsheet:
                    </label>
                    <input
                      type="text"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-hidden font-mono"
                    />
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Tempelkan URL Google Spreadsheet Anda di atas. Pastikan akun Google yang Anda gunakan di aplikasi ini memiliki izin <em>Editor</em> pada file spreadsheet tersebut.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => handleConnectAndInitialize(manualInput)}
                      disabled={isProcessing || !manualInput.trim() || !hasToken}
                      className="flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{isProcessing ? processTitle : 'Hubungkan & Buat / Tulis Database'}</span>
                    </button>

                    <button
                      onClick={() => handleConnectExisting(manualInput)}
                      disabled={isProcessing || !manualInput.trim() || !hasToken}
                      className="flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-emerald-400" />
                      <span>Hubungkan & Baca Data yang Ada</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Google Workspace API v4 Integration</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Mandatory Explicit User Confirmation Dialog for Destructive / Mutating Operations */}
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
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleExecuteConfirmedAction}
                className={`px-4 py-2 rounded-lg text-white text-xs font-semibold shadow-md transition-colors ${confirmModal.confirmButtonColor}`}
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
