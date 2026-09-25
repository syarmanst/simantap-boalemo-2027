import React, { useState } from 'react';
import { UserSession } from '../types';
import { KECAMATAN_LIST_META, authenticateUser } from '../data/authConfig';
import {
  ShieldCheck,
  Building2,
  Eye,
  Lock,
  User,
  Key,
  CheckCircle2,
  AlertCircle,
  X,
  LogOut,
  Sparkles,
  ArrowRight,
  Shield,
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSession: UserSession;
  onLoginSuccess: (session: UserSession) => void;
  onLogout: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  currentSession,
  onLoginSuccess,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'super_admin' | 'admin_kecamatan' | 'user_public'>('super_admin');

  // Super Admin form state
  const [superUser, setSuperUser] = useState('superadmin');
  const [superPass, setSuperPass] = useState('superadmin2027');

  // Admin Kecamatan form state
  const [selectedKecCode, setSelectedKecCode] = useState('750201');
  const [kecPass, setKecPass] = useState('admin750201');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSuperAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const res = authenticateUser('super_admin', superUser, superPass);
    if (res.success && res.session) {
      onLoginSuccess(res.session);
      onClose();
    } else {
      setErrorMessage(res.message || 'Login gagal.');
    }
  };

  const handleKecamatanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const res = authenticateUser('admin_kecamatan', selectedKecCode, kecPass);
    if (res.success && res.session) {
      onLoginSuccess(res.session);
      onClose();
    } else {
      setErrorMessage(res.message || 'Login kecamatan gagal.');
    }
  };

  const handleQuickKecamatanSelect = (code: string) => {
    setSelectedKecCode(code);
    setKecPass(`admin${code}`);
    setErrorMessage(null);
  };

  const handleDirectUserMode = () => {
    onLogout();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Autentikasi & Hak Akses Pengguna
              </h3>
              <p className="text-[11px] text-slate-300">
                Pemantauan Perencanaan Desa 2027 Kab. Boalemo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Status Strip if Logged in */}
        {currentSession.role !== 'viewer' && (
          <div className="bg-emerald-50 border-b border-emerald-200 p-3 px-5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="text-slate-600">Sedang aktif sebagai: </span>
                <strong className="text-emerald-900 font-semibold">{currentSession.displayName}</strong>
                {currentSession.kecamatanName && (
                  <span className="ml-1 text-[11px] bg-emerald-200/70 text-emerald-800 px-1.5 py-0.5 rounded font-mono">
                    Kode: {currentSession.kecamatanCode}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="flex items-center gap-1 text-[11px] font-semibold text-rose-700 hover:text-rose-800 bg-rose-100 hover:bg-rose-200 px-2.5 py-1 rounded-md transition-colors"
            >
              <LogOut className="w-3 h-3" />
              <span>Keluar (Logout)</span>
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            onClick={() => {
              setActiveTab('super_admin');
              setErrorMessage(null);
            }}
            className={`py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all border-b-2 ${
              activeTab === 'super_admin'
                ? 'bg-white text-emerald-700 border-emerald-600 font-bold shadow-xs'
                : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">Super Admin</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('admin_kecamatan');
              setErrorMessage(null);
            }}
            className={`py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all border-b-2 ${
              activeTab === 'admin_kecamatan'
                ? 'bg-white text-emerald-700 border-emerald-600 font-bold shadow-xs'
                : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4 text-sky-600 shrink-0" />
            <span className="truncate">Admin Kecamatan</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('user_public');
              setErrorMessage(null);
            }}
            className={`py-3 px-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 transition-all border-b-2 ${
              activeTab === 'user_public'
                ? 'bg-white text-emerald-700 border-emerald-600 font-bold shadow-xs'
                : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <Eye className="w-4 h-4 text-slate-600 shrink-0" />
            <span className="truncate">User / Publik</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: SUPER ADMIN */}
          {activeTab === 'super_admin' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-950">
                <div className="flex items-center gap-2 font-bold text-amber-900 mb-1">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Kewenangan Super Admin (Kabupaten)</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
                  <li>Hak penuh <strong>CRUD</strong> seluruh 82 Desa di 7 Kecamatan se-Kabupaten Boalemo.</li>
                  <li>Dapat menggunakan fitur <strong>Import Excel</strong> dan <strong>Export Excel</strong> resmi.</li>
                  <li>Dapat mengunggah, mengubah, dan menghapus dokumen/foto bukti pendukung.</li>
                </ul>
              </div>

              <form onSubmit={handleSuperAdminSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Username Super Admin</span>
                  </label>
                  <input
                    type="text"
                    value={superUser}
                    onChange={(e) => setSuperUser(e.target.value)}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    placeholder="superadmin"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-slate-400" />
                    <span>Password</span>
                  </label>
                  <input
                    type="password"
                    value={superPass}
                    onChange={(e) => setSuperPass(e.target.value)}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    placeholder="••••••••"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSuperUser('superadmin');
                      setSuperPass('superadmin2027');
                      setErrorMessage(null);
                    }}
                    className="text-[11px] text-slate-500 hover:text-emerald-700 underline cursor-pointer"
                  >
                    Gunakan Akun Bawaan (superadmin)
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <span>Masuk Super Admin</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: ADMIN KECAMATAN */}
          {activeTab === 'admin_kecamatan' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-950">
                <div className="flex items-center gap-2 font-bold text-sky-900 mb-1">
                  <Building2 className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>Kewenangan Admin Kecamatan (7 Wilayah)</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-sky-800">
                  <li>Login menggunakan <strong>Kode Kecamatan</strong> resmi (6 digit wilayah).</li>
                  <li>Hak <strong>CRUD</strong> hanya berlaku untuk desa-desa di kecamatannya sendiri.</li>
                  <li><strong>Tidak memiliki</strong> akses fitur Import dan Export Excel (khusus Super Admin).</li>
                </ul>
              </div>

              {/* Quick Select 7 Kecamatan Grid */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Pilih Wilayah Kecamatan Anda:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {KECAMATAN_LIST_META.map((kec) => {
                    const isSelected = selectedKecCode === kec.code;
                    return (
                      <button
                        key={kec.code}
                        type="button"
                        onClick={() => handleQuickKecamatanSelect(kec.code)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-sky-600 text-white border-sky-600 shadow-sm ring-2 ring-sky-300'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <span className="block text-xs font-bold truncate">{kec.name}</span>
                        <span
                          className={`block font-mono text-[10px] mt-0.5 ${
                            isSelected ? 'text-sky-100' : 'text-slate-400'
                          }`}
                        >
                          Kode: {kec.code}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={handleKecamatanSubmit} className="space-y-3 pt-1 border-t border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      User Kode Kecamatan
                    </label>
                    <input
                      type="text"
                      value={selectedKecCode}
                      onChange={(e) => setSelectedKecCode(e.target.value)}
                      required
                      placeholder="Contoh: 750201"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Password Kecamatan
                    </label>
                    <input
                      type="password"
                      value={kecPass}
                      onChange={(e) => setKecPass(e.target.value)}
                      required
                      placeholder="admin + kode"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400">
                    Format: kode 6 digit (contoh: 750201 / admin750201)
                  </span>

                  <button
                    type="submit"
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                  >
                    <span>Masuk Admin Kecamatan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: USER / PUBLIK */}
          {activeTab === 'user_public' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Eye className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Akses Pengunjung Publik (Tanpa Login)</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Sesuai ketentuan, <strong>User publik dapat langsung melihat seluruh data pemantauan perencanaan desa tanpa harus login</strong>.
                </p>
                <div className="space-y-1 text-[11px] text-slate-500 pt-1">
                  <p>✓ Meninjau Dashboard Statistik Real-time 82 Desa Boalemo.</p>
                  <p>✓ Menelusuri seluruh tahapan siklus per desa (Modul 1 s/d 8).</p>
                  <p>✓ Membuka dan mengunduh foto dokumentasi dan berkas bukti.</p>
                  <p>✗ Seluruh formulir input terkunci aman (*read-only*).</p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleDirectUserMode}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-2"
                >
                  <Eye className="w-4 h-4 text-emerald-400" />
                  <span>Lanjutkan Sebagai Pengunjung Publik</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span className="text-[11px]">Sistem Pemantauan Perencanaan Desa Kab. Boalemo</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 font-medium"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
