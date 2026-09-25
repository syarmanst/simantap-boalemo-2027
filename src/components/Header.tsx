import React, { useState } from 'react';
import { Download, Upload, Shield, Eye, RefreshCw, Layers, LogIn, LogOut, PlusCircle, Building2, FileSpreadsheet } from 'lucide-react';
import { UserSession, VillagePlanRecord } from '../types';
import { exportToExcel } from '../utils/excelHandler';
import { GoogleSheetsConfig } from '../services/googleSheetsDatabase';

interface HeaderProps {
  session: UserSession;
  onOpenLogin: () => void;
  onLogout: () => void;
  villages: VillagePlanRecord[];
  onOpenImport: () => void;
  onOpenAddVillage: () => void;
  onResetData: () => void;
  activeView: string;
  setActiveView: (view: any) => void;
  sheetsConfig?: GoogleSheetsConfig | null;
  onOpenGoogleSheets: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  session,
  onOpenLogin,
  onLogout,
  villages,
  onOpenImport,
  onOpenAddVillage,
  onResetData,
  activeView,
  setActiveView,
  sheetsConfig,
  onOpenGoogleSheets,
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    if (session.role !== 'super_admin') return;
    setIsExporting(true);
    try {
      exportToExcel(villages);
    } finally {
      setTimeout(() => setIsExporting(false), 500);
    }
  };

  const isSuperAdmin = session.role === 'super_admin';
  const isAdminKecamatan = session.role === 'admin_kecamatan';
  const isViewer = session.role === 'viewer';

  return (
    <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Brand Zone */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-sm sm:text-base font-bold tracking-tight text-white line-clamp-1">
                  Pemantauan Perencanaan Desa 2027
                </span>
                <span className="hidden md:inline-block text-[10px] sm:text-xs px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800 font-mono">
                  Kab. Boalemo
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Sistem Pengawasan Perencanaan Pembangunan & RKP Desa
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setActiveView('dashboard')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeView === 'dashboard'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              Dashboard Statistik
            </button>
            <button
              onClick={() => setActiveView('input')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeView === 'input'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              Modul Input
            </button>
            <button
              onClick={() => setActiveView('table')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeView === 'table'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              Tabel Spreadsheet
            </button>
            <button
              onClick={() => setActiveView('district')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeView === 'district'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              Rekap Kecamatan
            </button>
          </nav>

          {/* Action & Role Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* CRUD Button: Tambah Desa (STRICTLY Super Admin Only) */}
            {isSuperAdmin && (
              <button
                onClick={onOpenAddVillage}
                title="Tambah data desa baru (CRUD)"
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tambah Desa</span>
              </button>
            )}

            {/* Import Button (STRICTLY Super Admin Only) */}
            {isSuperAdmin && (
              <button
                onClick={onOpenImport}
                title="Import data dari Excel (.xlsx / .csv)"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>Import Excel</span>
              </button>
            )}

            {/* Export Excel Button (STRICTLY Super Admin Only) */}
            {isSuperAdmin && (
              <button
                onClick={handleExport}
                disabled={isExporting}
                title="Ekspor seluruh data 82 desa ke format Excel resmi"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isExporting ? 'Mengekspor...' : 'Ekspor Excel'}</span>
                <span className="sm:hidden">Excel</span>
              </button>
            )}

            {/* Google Sheets Database Button (STRICTLY Super Admin Only) */}
            {isSuperAdmin && (
              <button
                onClick={onOpenGoogleSheets}
                title={
                  sheetsConfig
                    ? `Terhubung ke Google Sheets: ${sheetsConfig.spreadsheetTitle}`
                    : 'Hubungkan dengan Google Sheets Spreadsheet sebagai Database'
                }
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  sheetsConfig
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                }`}
              >
                <FileSpreadsheet className={`w-3.5 h-3.5 ${sheetsConfig ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span className="hidden md:inline">
                  {sheetsConfig ? 'Google Sheets' : 'Hubungkan Sheets'}
                </span>
                {sheetsConfig && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                )}
              </button>
            )}

            {/* Role Status Badge & Login Button */}
            {isViewer ? (
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 transition-all"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                <span>Login Petugas</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onOpenLogin}
                  title="Klik untuk ganti akun atau periksa hak akses"
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    isSuperAdmin
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                      : 'bg-sky-500/15 border-sky-500/40 text-sky-300 hover:bg-sky-500/25'
                  }`}
                >
                  {isSuperAdmin ? (
                    <>
                      <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="font-bold hidden sm:inline">Super Admin</span>
                      <span className="font-bold sm:hidden">Super</span>
                    </>
                  ) : (
                    <>
                      <Building2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="font-bold truncate max-w-[110px] sm:max-w-[140px]">
                        Kec. {session.kecamatanName}
                      </span>
                    </>
                  )}
                </button>

                <button
                  onClick={onLogout}
                  title="Keluar ke mode publik (Hanya Lihat)"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-slate-800 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Reset Data to Initial (Super Admin Only) */}
            {isSuperAdmin && (
              <button
                onClick={onResetData}
                title="Kembalikan ke data awal template (82 desa)"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-slate-800 transition-colors hidden md:flex"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
