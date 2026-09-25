import React from 'react';
import { LayoutDashboard, Edit, Table, MapPin, Download, LogIn, Building2, ShieldCheck } from 'lucide-react';
import { UserSession } from '../types';

interface MobileBottomNavProps {
  activeView: 'dashboard' | 'input' | 'table' | 'district';
  setActiveView: (view: 'dashboard' | 'input' | 'table' | 'district') => void;
  session: UserSession;
  onOpenLogin: () => void;
  onExportExcel: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeView,
  setActiveView,
  session,
  onOpenLogin,
  onExportExcel,
}) => {
  const isSuperAdmin = session.role === 'super_admin';
  const isAdminKecamatan = session.role === 'admin_kecamatan';
  const isViewer = session.role === 'viewer';

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 text-white shadow-lg pb-safe">
      <div className="grid grid-cols-5 h-14">
        <button
          onClick={() => setActiveView('dashboard')}
          className={`flex flex-col items-center justify-center transition-colors ${
            activeView === 'dashboard' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-[10px] mt-1 tracking-tight">Statistik</span>
        </button>

        <button
          onClick={() => setActiveView('input')}
          className={`flex flex-col items-center justify-center transition-colors ${
            activeView === 'input' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Edit className="w-4 h-4" />
          <span className="text-[10px] mt-1 tracking-tight">Input</span>
        </button>

        <button
          onClick={() => setActiveView('table')}
          className={`flex flex-col items-center justify-center transition-colors ${
            activeView === 'table' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Table className="w-4 h-4" />
          <span className="text-[10px] mt-1 tracking-tight">Tabel</span>
        </button>

        <button
          onClick={() => setActiveView('district')}
          className={`flex flex-col items-center justify-center transition-colors ${
            activeView === 'district' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span className="text-[10px] mt-1 tracking-tight">Kecamatan</span>
        </button>

        {/* 5th slot: strictly Super Admin gets Export Excel; others get Login / Account access */}
        {isSuperAdmin ? (
          <button
            onClick={onExportExcel}
            className="flex flex-col items-center justify-center text-slate-400 hover:text-emerald-300 transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] mt-1 tracking-tight">Excel</span>
          </button>
        ) : isAdminKecamatan ? (
          <button
            onClick={onOpenLogin}
            className="flex flex-col items-center justify-center text-sky-400 hover:text-sky-300 transition-colors"
          >
            <Building2 className="w-4 h-4" />
            <span className="text-[10px] mt-1 tracking-tight truncate max-w-[55px]">Kecamatan</span>
          </button>
        ) : (
          <button
            onClick={onOpenLogin}
            className="flex flex-col items-center justify-center text-slate-400 hover:text-emerald-400 transition-colors"
          >
            <LogIn className="w-4 h-4" />
            <span className="text-[10px] mt-1 tracking-tight">Login</span>
          </button>
        )}
      </div>
    </div>
  );
};
