import React, { useState, useEffect } from 'react';
import { UserSession } from '../types';
import {
  KECAMATAN_LIST_META,
  authenticateUser,
  changeAccountPassword,
  resetPasswordToDefault,
  syncPasswordsFromCloud,
  getCustomPasswords,
} from '../data/authConfig';
import {
  ShieldCheck,
  Building2,
  Eye,
  EyeOff,
  Lock,
  User,
  Key,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  LogOut,
  ArrowRight,
  RotateCcw,
  CloudCheck,
  RefreshCw,
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
  const [activeTab, setActiveTab] = useState<'super_admin' | 'admin_kecamatan' | 'change_password' | 'user_public'>('super_admin');

  // Super Admin form state (start empty or with saved custom password)
  const [superUser, setSuperUser] = useState('superadmin');
  const [superPass, setSuperPass] = useState('');
  const [showSuperPass, setShowSuperPass] = useState(false);

  // Admin Kecamatan form state
  const [selectedKecCode, setSelectedKecCode] = useState('750201');
  const [kecPass, setKecPass] = useState('');
  const [showKecPass, setShowKecPass] = useState(false);

  // Change Password form state
  const [changeRole, setChangeRole] = useState<'super_admin' | 'admin_kecamatan'>('super_admin');
  const [changeKecCode, setChangeKecCode] = useState('750201');
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [changeStatus, setChangeStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [cloudSynced, setCloudSynced] = useState(false);

  // When modal opens, sync latest passwords from Cloud Spreadsheet
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setChangeStatus(null);
      setIsSyncingCloud(true);
      syncPasswordsFromCloud().then((passwords) => {
        setIsSyncingCloud(false);
        setCloudSynced(true);
        // Pre-fill active custom password if user hasn't typed
        if (!superPass) {
          setSuperPass(passwords['superadmin'] || 'superadmin2027');
        }
        if (!kecPass) {
          setKecPass(passwords[`kec_${selectedKecCode}`] || `admin${selectedKecCode}`);
        }
      }).catch(() => {
        setIsSyncingCloud(false);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSuperAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Ensure we verify against latest cloud password
    let res = authenticateUser('super_admin', superUser, superPass);
    if (!res.success) {
      // Try quick resync with cloud in case password was changed on another device
      try {
        const cloudPasswords = await syncPasswordsFromCloud();
        const customSuper = cloudPasswords['superadmin'];
        if (customSuper && superPass.trim() === customSuper.trim()) {
          res = {
            success: true,
            session: {
              role: 'super_admin',
              username: 'superadmin',
              displayName: 'Super Admin (Kabupaten Boalemo)',
            },
          };
        }
      } catch (_) {}
    }

    if (res.success && res.session) {
      onLoginSuccess(res.session);
      onClose();
    } else {
      setErrorMessage(res.message || 'Login gagal. Periksa kembali username dan password.');
    }
  };

  const handleKecamatanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    let res = authenticateUser('admin_kecamatan', selectedKecCode, kecPass);
    if (!res.success) {
      try {
        const cloudPasswords = await syncPasswordsFromCloud();
        const customKec = cloudPasswords[`kec_${selectedKecCode}`];
        if (customKec && kecPass.trim() === customKec.trim()) {
          const kecMeta = KECAMATAN_LIST_META.find((k) => k.code === selectedKecCode);
          res = {
            success: true,
            session: {
              role: 'admin_kecamatan',
              username: selectedKecCode,
              displayName: `Admin Kec. ${kecMeta?.name || selectedKecCode}`,
              kecamatanCode: selectedKecCode,
              kecamatanName: kecMeta?.name || selectedKecCode,
            },
          };
        }
      } catch (_) {}
    }

    if (res.success && res.session) {
      onLoginSuccess(res.session);
      onClose();
    } else {
      setErrorMessage(res.message || 'Login kecamatan gagal. Periksa kembali password.');
    }
  };

  const handleQuickKecamatanSelect = (code: string) => {
    setSelectedKecCode(code);
    const passwords = getCustomPasswords();
    setKecPass(passwords[`kec_${code}`] || `admin${code}`);
    setErrorMessage(null);
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setChangeStatus(null);

    if (!oldPass) {
      setChangeStatus({ type: 'error', text: 'Password saat ini harus diisi.' });
      return;
    }
    if (!newPass || newPass.length < 5) {
      setChangeStatus({ type: 'error', text: 'Password baru minimal harus 5 karakter.' });
      return;
    }
    if (newPass !== confirmPass) {
      setChangeStatus({ type: 'error', text: 'Konfirmasi password baru tidak sesuai.' });
      return;
    }

    const targetId = changeRole === 'super_admin' ? 'superadmin' : changeKecCode;
    const res = changeAccountPassword(changeRole, targetId, oldPass, newPass);

    if (res.success) {
      setChangeStatus({ type: 'success', text: res.message });
      setOldPass('');
      setNewPass('');
      setConfirmPass('');
      if (changeRole === 'super_admin') {
        setSuperPass(newPass);
      } else if (changeKecCode === selectedKecCode) {
        setKecPass(newPass);
      }
    } else {
      setChangeStatus({ type: 'error', text: res.message });
    }
  };

  const handleResetPassword = () => {
    const targetKey = changeRole === 'super_admin' ? 'superadmin' : `kec_${changeKecCode}`;
    const accountName =
      changeRole === 'super_admin'
        ? 'Super Admin'
        : `Admin Kec. ${KECAMATAN_LIST_META.find((k) => k.code === changeKecCode)?.name || changeKecCode}`;
    resetPasswordToDefault(targetKey);
    setChangeStatus({
      type: 'success',
      text: `Password untuk ${accountName} berhasil dikembalikan ke bawaan sistem.`,
    });
    if (changeRole === 'super_admin') {
      setSuperPass('superadmin2027');
    } else if (changeKecCode === selectedKecCode) {
      setKecPass(`admin${changeKecCode}`);
    }
  };

  const handleManualSync = () => {
    setIsSyncingCloud(true);
    syncPasswordsFromCloud().then((passwords) => {
      setIsSyncingCloud(false);
      setCloudSynced(true);
      if (activeTab === 'super_admin') {
        setSuperPass(passwords['superadmin'] || 'superadmin2027');
      } else if (activeTab === 'admin_kecamatan') {
        setKecPass(passwords[`kec_${selectedKecCode}`] || `admin${selectedKecCode}`);
      }
    }).catch(() => {
      setIsSyncingCloud(false);
    });
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
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Autentikasi & Hak Akses Pengguna
                </h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-semibold border border-emerald-800 hidden sm:inline">
                  Multi-Perangkat
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Pemantauan Perencanaan Desa 2027 Kab. Boalemo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
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
              className="flex items-center gap-1 text-[11px] font-semibold text-rose-700 hover:text-rose-800 bg-rose-100 hover:bg-rose-200 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              <span>Keluar (Logout)</span>
            </button>
          </div>
        )}

        {/* Cloud Sync Status Banner */}
        <div className="bg-slate-100 px-5 py-2 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5">
            <CloudCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Kredensial tersinkron otomatis via Google Spreadsheet</span>
          </div>
          <button
            onClick={handleManualSync}
            disabled={isSyncingCloud}
            className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer disabled:opacity-50"
            title="Tarik pembaruan password dari perangkat lain"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncingCloud ? 'animate-spin' : ''}`} />
            <span>{isSyncingCloud ? 'Menyinkronkan...' : 'Cek Password Terbaru'}</span>
          </button>
        </div>

        {/* Tab Navigation (4 Tabs) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            onClick={() => {
              setActiveTab('super_admin');
              setErrorMessage(null);
            }}
            className={`py-2.5 sm:py-3 px-2 flex items-center justify-center gap-1.5 transition-all border-b-2 cursor-pointer ${
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
            className={`py-2.5 sm:py-3 px-2 flex items-center justify-center gap-1.5 transition-all border-b-2 cursor-pointer ${
              activeTab === 'admin_kecamatan'
                ? 'bg-white text-emerald-700 border-emerald-600 font-bold shadow-xs'
                : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4 text-sky-600 shrink-0" />
            <span className="truncate">Admin Kec.</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('change_password');
              setErrorMessage(null);
              setChangeStatus(null);
            }}
            className={`py-2.5 sm:py-3 px-2 flex items-center justify-center gap-1.5 transition-all border-b-2 cursor-pointer ${
              activeTab === 'change_password'
                ? 'bg-white text-amber-700 border-amber-500 font-bold shadow-xs'
                : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <KeyRound className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="truncate">Ubah Password</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('user_public');
              setErrorMessage(null);
            }}
            className={`py-2.5 sm:py-3 px-2 flex items-center justify-center gap-1.5 transition-all border-b-2 cursor-pointer ${
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
                  <li>Dapat login di semua perangkat dengan password yang telah diubah sebelumnya.</li>
                </ul>
              </div>

              <form onSubmit={handleSuperAdminSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
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
                  <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Key className="w-3.5 h-3.5 text-slate-400" />
                      <span>Password Akun</span>
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type={showSuperPass ? 'text' : 'password'}
                      value={superPass}
                      onChange={(e) => setSuperPass(e.target.value)}
                      required
                      className="w-full text-xs px-3 py-2 pr-9 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                      placeholder="Masukkan password Anda"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSuperPass(!showSuperPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 cursor-pointer"
                      title={showSuperPass ? 'Sembunyikan password' : 'Lihat password'}
                    >
                      {showSuperPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400">
                    Bisa login di HP/Laptop mana saja dengan password terbaru Anda.
                  </span>

                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
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
                  <li>Hak <strong>input & pemantauan</strong> berlaku untuk desa-desa di kecamatannya.</li>
                  <li>Password yang telah diubah dapat digunakan di perangkat mana pun.</li>
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
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
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
                    <div className="relative">
                      <input
                        type={showKecPass ? 'text' : 'password'}
                        value={kecPass}
                        onChange={(e) => setKecPass(e.target.value)}
                        required
                        placeholder="Masukkan password kecamatan"
                        className="w-full text-xs px-3 py-2 pr-9 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKecPass(!showKecPass)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 cursor-pointer"
                        title={showKecPass ? 'Sembunyikan password' : 'Lihat password'}
                      >
                        {showKecPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400">
                    Format: kode 6 digit (contoh: 750201)
                  </span>

                  <button
                    type="submit"
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Masuk Admin Kecamatan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: UBAH PASSWORD */}
          {activeTab === 'change_password' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-950">
                <div className="flex items-center gap-2 font-bold text-amber-900 mb-1">
                  <KeyRound className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Fitur Ubah Password Akun Petugas (Tersinkron Multi-Perangkat)</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Password yang diubah di sini otomatis tersimpan di Cloud Google Spreadsheet. Anda dan rekan kerja dapat login di semua perangkat, laptop, atau ponsel menggunakan password baru tersebut.
                </p>
              </div>

              {changeStatus && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    changeStatus.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {changeStatus.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{changeStatus.text}</span>
                </div>
              )}

              <form onSubmit={handleChangePasswordSubmit} className="space-y-3.5">
                {/* Target Akun */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pilih Jenis Akun yang Ingin Diubah Passwordnya:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setChangeRole('super_admin');
                        setChangeStatus(null);
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        changeRole === 'super_admin'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>Super Admin</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setChangeRole('admin_kecamatan');
                        setChangeStatus(null);
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        changeRole === 'admin_kecamatan'
                          ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Building2 className="w-4 h-4 shrink-0" />
                      <span>Admin Kecamatan</span>
                    </button>
                  </div>
                </div>

                {/* If Admin Kecamatan selected, choose which district */}
                {changeRole === 'admin_kecamatan' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pilih Kecamatan:
                    </label>
                    <select
                      value={changeKecCode}
                      onChange={(e) => {
                        setChangeKecCode(e.target.value);
                        setChangeStatus(null);
                      }}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                    >
                      {KECAMATAN_LIST_META.map((kec) => (
                        <option key={kec.code} value={kec.code}>
                          Kec. {kec.name} ({kec.code})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Password Saat Ini / Lama */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password Saat Ini / Lama:
                  </label>
                  <div className="relative">
                    <input
                      type={showOldPass ? 'text' : 'password'}
                      value={oldPass}
                      onChange={(e) => setOldPass(e.target.value)}
                      required
                      placeholder="Masukkan password saat ini"
                      className="w-full text-xs px-3 py-2 pr-9 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPass(!showOldPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 cursor-pointer"
                      title={showOldPass ? 'Sembunyikan password' : 'Lihat password'}
                    >
                      {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Baru */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Password Baru (min. 5 karakter):
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        required
                        placeholder="Password baru"
                        className="w-full text-xs px-3 py-2 pr-9 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 cursor-pointer"
                        title={showNewPass ? 'Sembunyikan password' : 'Lihat password'}
                      >
                        {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ulangi Password Baru:
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPass ? 'text' : 'password'}
                        value={confirmPass}
                        onChange={(e) => setConfirmPass(e.target.value)}
                        required
                        placeholder="Konfirmasi password baru"
                        className="w-full text-xs px-3 py-2 pr-9 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 cursor-pointer"
                        title={showConfirmPass ? 'Sembunyikan password' : 'Lihat password'}
                      >
                        {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Kembalikan kata sandi akun ini ke pengaturan pabrik/default"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Kembalikan ke Password Bawaan</span>
                  </button>

                  <button
                    type="submit"
                    className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Simpan Password Baru</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: USER / PUBLIK */}
          {activeTab === 'user_public' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Eye className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Akses Pengunjung Publik (Tanpa Login)</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Secara default, seluruh pengunjung publik, aparatur desa, dan pimpinan daerah dapat langsung meninjau seluruh data rekapitulasi, dashboard statistik, dan tabel perencanaan 82 desa di 7 kecamatan tanpa memerlukan password.
                </p>
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg text-[11px] text-emerald-900">
                  Fitur edit formulir dan input data hanya dapat dilakukan jika Anda masuk sebagai Super Admin atau Admin Kecamatan.
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Gunakan Mode Peninjau (Viewer)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sistem Keamanan Akun Terintegrasi Cloud</span>
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
