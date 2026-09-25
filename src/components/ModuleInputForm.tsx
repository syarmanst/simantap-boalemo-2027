import React, { useState, useEffect, useMemo } from 'react';
import { VillagePlanRecord, ModuleKey, UserRole, ForumSession, KdmpSession, EvidenceItem, UserSession } from '../types';
import { MODULES_CONFIG, KECAMATAN_LIST } from '../data/initialData';
import { EvidenceUpload } from './EvidenceUpload';
import {
  calcGenderTotal,
  calcUnsurTotal,
  calcSelisih,
  calculateVillageProgress,
  formatRupiah,
} from '../utils/calculations';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Save,
  Lock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Calendar,
  Users,
  Building2,
  Info,
} from 'lucide-react';

interface ModuleInputFormProps {
  villages: VillagePlanRecord[];
  currentVillageId: string;
  onSelectVillage: (villageId: string) => void;
  currentModule: ModuleKey;
  onSelectModule: (moduleKey: ModuleKey) => void;
  onSaveVillage: (updatedVillage: VillagePlanRecord) => void;
  session: UserSession;
  onDeleteVillage?: (villageId: string) => void;
  role?: UserRole;
}

export const ModuleInputForm: React.FC<ModuleInputFormProps> = ({
  villages,
  currentVillageId,
  onSelectVillage,
  currentModule,
  onSelectModule,
  onSaveVillage,
  session,
  onDeleteVillage,
}) => {
  const role = session.role;
  const isSuperAdmin = role === 'super_admin';
  const isAdminKecamatan = role === 'admin_kecamatan';
  const isViewer = role === 'viewer';
  const canEdit = isSuperAdmin || isAdminKecamatan;

  // Filter Kecamatan: fixed if admin_kecamatan
  const [filterKec, setFilterKec] = useState<string>(() => {
    if (isAdminKecamatan && session.kecamatanName) {
      return session.kecamatanName;
    }
    return 'Semua Kecamatan';
  });

  useEffect(() => {
    if (isAdminKecamatan && session.kecamatanName) {
      setFilterKec(session.kecamatanName);
    }
  }, [isAdminKecamatan, session.kecamatanName]);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [saveToast, setSaveToast] = useState(false);

  // Filter village options based on kecamatan and search
  const filteredVillages = useMemo(() => {
    return villages.filter((v) => {
      // If Admin Kecamatan, strictly restrict to their kecamatan
      if (isAdminKecamatan && session.kecamatanName) {
        if (v.kecamatan !== session.kecamatanName && v.idKec !== session.kecamatanCode) {
          return false;
        }
      }

      const matchesKec = filterKec === 'Semua Kecamatan' || v.kecamatan === filterKec;
      const matchesSearch =
        v.desa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.idDesa.includes(searchTerm);
      return matchesKec && matchesSearch;
    });
  }, [villages, filterKec, searchTerm, isAdminKecamatan, session.kecamatanName, session.kecamatanCode]);

  // Ensure currentVillage is valid within filtered scope for Admin Kecamatan
  useEffect(() => {
    if (isAdminKecamatan && filteredVillages.length > 0) {
      const isCurrentInKec = filteredVillages.some((v) => v.idDesa === currentVillageId);
      if (!isCurrentInKec) {
        onSelectVillage(filteredVillages[0].idDesa);
      }
    }
  }, [isAdminKecamatan, filteredVillages, currentVillageId, onSelectVillage]);

  const currentVillage = villages.find((v) => v.idDesa === currentVillageId) || filteredVillages[0] || villages[0];
  const currentFilteredIndex = filteredVillages.findIndex((v) => v.idDesa === currentVillage?.idDesa);

  // Evidence handlers
  const handleAddEvidence = (modKey: ModuleKey, item: EvidenceItem) => {
    updateVillage((prev) => {
      const prevEvidence = prev.evidence || {};
      const modItems = prevEvidence[modKey] || [];
      return {
        ...prev,
        evidence: {
          ...prevEvidence,
          [modKey]: [item, ...modItems],
        },
      };
    });
  };

  const handleRemoveEvidence = (modKey: ModuleKey, id: string) => {
    updateVillage((prev) => {
      const prevEvidence = prev.evidence || {};
      const modItems = prevEvidence[modKey] || [];
      return {
        ...prev,
        evidence: {
          ...prevEvidence,
          [modKey]: modItems.filter((it) => it.id !== id),
        },
      };
    });
  };

  const handleUpdateCaption = (modKey: ModuleKey, id: string, caption: string) => {
    updateVillage((prev) => {
      const prevEvidence = prev.evidence || {};
      const modItems = prevEvidence[modKey] || [];
      return {
        ...prev,
        evidence: {
          ...prevEvidence,
          [modKey]: modItems.map((it) => (it.id === id ? { ...it, caption } : it)),
        },
      };
    });
  };

  const progress = calculateVillageProgress(currentVillage);

  const handlePrevVillage = () => {
    if (currentFilteredIndex > 0) {
      onSelectVillage(filteredVillages[currentFilteredIndex - 1].idDesa);
    }
  };

  const handleNextVillage = () => {
    if (currentFilteredIndex < filteredVillages.length - 1) {
      onSelectVillage(filteredVillages[currentFilteredIndex + 1].idDesa);
    }
  };

  const updateVillage = (updater: (prev: VillagePlanRecord) => VillagePlanRecord) => {
    if (!canEdit) return;
    const updated = updater({ ...currentVillage });
    updated.updatedAt = new Date().toISOString();
    updated.updatedBy = session.displayName;
    onSaveVillage(updated);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  // Helper for updating session fields
  const handleSessionFieldChange = (
    moduleTarget: 'musdesPersiapan' | 'musrenbangdes' | 'musdesPengesahan' | 'musdesusKdmp',
    field: keyof ForumSession | 'melaksanakan',
    value: any
  ) => {
    updateVillage((prev) => {
      const copy = { ...prev };
      const session = { ...copy[moduleTarget] } as any;
      session[field] = value;
      copy[moduleTarget] = session;
      return copy;
    });
  };

  // Helper for updating unsur elements
  const handleUnsurChange = (
    moduleTarget: 'musdesPersiapan' | 'musrenbangdes' | 'musdesPengesahan' | 'musdesusKdmp',
    element: string,
    value: string
  ) => {
    const num = value === '' ? null : Math.max(0, parseInt(value, 10) || 0);
    updateVillage((prev) => {
      const copy = { ...prev };
      const session = { ...copy[moduleTarget] } as any;
      session.unsur = {
        ...session.unsur,
        [element]: num,
      };
      copy[moduleTarget] = session;
      return copy;
    });
  };

  // Quick auto-balance helper
  const handleAutoBalance = (
    moduleTarget: 'musdesPersiapan' | 'musrenbangdes' | 'musdesPengesahan' | 'musdesusKdmp'
  ) => {
    if (role === 'viewer') return;
    const session = currentVillage[moduleTarget];
    const totalGender = calcGenderTotal(session.lk, session.pr);
    const totalUnsur = calcUnsurTotal(session.unsur);
    const diff = totalGender - totalUnsur;

    if (diff !== 0) {
      const currentLainnya = session.unsur.klpLainnya || 0;
      const newLainnya = Math.max(0, currentLainnya + diff);
      handleUnsurChange(moduleTarget, 'klpLainnya', String(newLainnya));
    }
  };

  // Render a forum session (Musdes, Musrenbangdes, Pengesahan, KDMP)
  const renderForumSessionInput = (
    sessionKey: 'musdesPersiapan' | 'musrenbangdes' | 'musdesPengesahan' | 'musdesusKdmp',
    title: string,
    badgeText: string,
    isKdmp = false
  ) => {
    const session = currentVillage[sessionKey] as KdmpSession;
    const totalGender = calcGenderTotal(session.lk, session.pr);
    const totalUnsur = calcUnsurTotal(session.unsur);
    const validation = calcSelisih(session.lk, session.pr, session.unsur);

    return (
      <div className="space-y-6">
        {/* Module Header Info */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                {badgeText}
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">{title}</h3>
            </div>
            {validation.hasData && (
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border ${
                  validation.isValid
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                {validation.isValid ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Balance (Gender = Unsur: {totalGender})</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>
                      Selisih: {validation.selisih > 0 ? `+${validation.selisih}` : validation.selisih} orang
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* KDMP Toggle if applicable */}
          {isKdmp && (
            <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-800">Status Pelaksanaan Musdesus:</span>
                <p className="text-[11px] text-slate-500">
                  (Diisi 1 = Melaksanakan, 0 = Tidak Melaksanakan)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={role === 'viewer'}
                  onClick={() =>
                    handleSessionFieldChange(
                      'musdesusKdmp',
                      'melaksanakan',
                      session.melaksanakan === 1 ? null : 1
                    )
                  }
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    session.melaksanakan === 1
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  1 = Melaksanakan
                </button>
                <button
                  type="button"
                  disabled={role === 'viewer'}
                  onClick={() =>
                    handleSessionFieldChange(
                      'musdesusKdmp',
                      'melaksanakan',
                      session.melaksanakan === 0 ? null : 0
                    )
                  }
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    session.melaksanakan === 0
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  0 = Tidak Melaksanakan
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Form Grid 1: Tanggal & Gender */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Tanggal Pelaksanaan</span>
            </label>
            <input
              type="text"
              disabled={role === 'viewer'}
              placeholder="dd/mm/yyyy atau nama bulan"
              value={session.tanggal || ''}
              onChange={(e) => handleSessionFieldChange(sessionKey, 'tanggal', e.target.value)}
              className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Format: dd/mm/yyyy</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Partisipan Laki-laki (Lk)
            </label>
            <input
              type="number"
              min="0"
              disabled={role === 'viewer'}
              placeholder="0"
              value={session.lk ?? ''}
              onChange={(e) =>
                handleSessionFieldChange(
                  sessionKey,
                  'lk',
                  e.target.value === '' ? null : parseInt(e.target.value, 10) || 0
                )
              }
              className="w-full text-xs font-mono tabular-nums px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Partisipan Perempuan (Pr)
            </label>
            <input
              type="number"
              min="0"
              disabled={role === 'viewer'}
              placeholder="0"
              value={session.pr ?? ''}
              onChange={(e) =>
                handleSessionFieldChange(
                  sessionKey,
                  'pr',
                  e.target.value === '' ? null : parseInt(e.target.value, 10) || 0
                )
              }
              className="w-full text-xs font-mono tabular-nums px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>
        </div>

        {/* Gender Auto-Sum Display */}
        <div className="p-3 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-600" />
            <span className="text-xs font-semibold text-slate-700">Total Partisipan Gender (Lk + Pr):</span>
          </div>
          <span className="text-sm font-bold font-mono tabular-nums text-slate-900">
            {totalGender} Jiwa
          </span>
        </div>

        {/* Section 2: 14 Unsur Partisipan */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-xs font-bold text-slate-900">Rincian 14 Unsur Partisipan</h4>
              <p className="text-[11px] text-slate-500">
                Input jumlah kehadiran per unsur masyarakat desa
              </p>
            </div>
            {canEdit && validation.hasData && !validation.isValid && (
              <button
                type="button"
                onClick={() => handleAutoBalance(sessionKey)}
                title="Sesuaikan selisih otomatis ke kolom Kelompok Lainnya"
                className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-300 transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                <span>Auto Balance ke Klp Lainnya</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {[
              { key: 'pemdes', label: '1. Pemdes (Aparat)' },
              { key: 'bpd', label: '2. BPD' },
              { key: 'rtRw', label: '3. RT / RW' },
              { key: 'artm', label: '4. A-RTM (Miskin)' },
              { key: 'pemuda', label: '5. Pemuda' },
              { key: 'klpTani', label: '6. Klp. Tani' },
              { key: 'klpNelayan', label: '7. Klp. Nelayan' },
              { key: 'klpDifabel', label: '8. Klp. Difabel' },
              { key: 'klpMarginal', label: '9. Klp. Marginal' },
              { key: 'tokohAdat', label: isKdmp ? '10. Tokoh Masy.' : '10. Tokoh Adat' },
              { key: 'tokohAgama', label: '11. Tokoh Agama' },
              { key: 'kaderDesa', label: '12. Kader Desa' },
              { key: 'peninjau', label: '13. Peninjau (Luar)' },
              { key: 'klpLainnya', label: '14. Klp. Lainnya' },
            ].map((item) => (
              <div key={item.key} className="bg-white p-2 rounded-lg border border-slate-200">
                <label className="block text-[11px] font-medium text-slate-600 truncate mb-1">
                  {item.label}
                </label>
                <input
                  type="number"
                  min="0"
                  disabled={role === 'viewer'}
                  placeholder="0"
                  value={(session.unsur as any)[item.key] ?? ''}
                  onChange={(e) => handleUnsurChange(sessionKey, item.key, e.target.value)}
                  className="w-full text-xs font-mono tabular-nums px-2 py-1.5 bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Validation Bar */}
        <div className="p-3.5 rounded-xl border bg-slate-50 border-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block">Total Unsur Partisipan:</span>
              <span className="text-base font-bold font-mono text-slate-900">
                {totalUnsur} Jiwa
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Total Gender (Lk + Pr):</span>
              <span className="text-base font-bold font-mono text-slate-900">
                {totalGender} Jiwa
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Status Selisih Data:</span>
              <span
                className={`text-sm font-bold font-mono ${
                  validation.isValid ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {validation.isValid ? 'Balance (0)' : `Selisih: ${validation.selisih}`}
              </span>
            </div>
          </div>
        </div>

        {/* Keterangan */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Keterangan Tambahan / Catatan Forum
          </label>
          <input
            type="text"
            disabled={role === 'viewer'}
            placeholder="Catatan pelaksanaan, kendala, atau verifikasi..."
            value={session.keterangan || ''}
            onChange={(e) => handleSessionFieldChange(sessionKey, 'keterangan', e.target.value)}
            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
          />
        </div>

        {/* Upload Bukti Foto & Dokumen Pendukung */}
        {(() => {
          const sessionToModKey: Record<string, ModuleKey> = {
            musdesPersiapan: 'modul2_musdes_persiapan',
            musrenbangdes: 'modul4_musrenbangdes',
            musdesPengesahan: 'modul5_musdes_pengesahan',
            musdesusKdmp: 'modul7_kdmp',
          };
          const modKey = sessionToModKey[sessionKey];
          return (
            <EvidenceUpload
              moduleKey={modKey}
              moduleName={title}
              evidenceList={currentVillage.evidence?.[modKey] || []}
              onAddEvidence={(item) => handleAddEvidence(modKey, item)}
              onRemoveEvidence={(id) => handleRemoveEvidence(modKey, id)}
              onUpdateCaption={(id, caption) => handleUpdateCaption(modKey, id, caption)}
              role={role}
            />
          );
        })()}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Role Alert Banner if Viewer */}
      {role === 'viewer' && (
        <div className="bg-sky-50 border border-sky-200 p-3 rounded-xl flex items-center justify-between text-xs text-sky-800">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-sky-600 shrink-0" />
            <span>
              <strong>Mode Tamu (Hanya Lihat):</strong> Formulir terkunci untuk mode pembacaan. Beralih ke Mode Admin untuk mengubah atau menginput data.
            </span>
          </div>
        </div>
      )}

      {/* Viewer Notice Banner */}
      {isViewer && (
        <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-between gap-2 text-xs text-sky-900 animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-600 shrink-0" />
            <span>
              <strong>Mode Pengunjung Publik (Hanya Lihat):</strong> Anda dapat meninjau seluruh data perencanaan desa dan mengunduh berkas bukti. Formulir input dalam status terkunci (*read-only*).
            </span>
          </div>
        </div>
      )}

      {/* Village Selector & Navigation Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Village Quick Stepper */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevVillage}
              disabled={currentFilteredIndex <= 0}
              title="Desa Sebelumnya"
              className="p-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium flex items-center"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Desa Sebelumnya</span>
            </button>

            <div className="flex-1 min-w-[200px] sm:min-w-[280px]">
              <select
                value={currentVillage.idDesa}
                onChange={(e) => onSelectVillage(e.target.value)}
                className="w-full text-xs sm:text-sm font-bold bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {filteredVillages.map((v) => (
                  <option key={v.idDesa} value={v.idDesa}>
                    {v.no}. Desa {v.desa} ({v.kecamatan})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleNextVillage}
              disabled={currentFilteredIndex >= filteredVillages.length - 1}
              title="Desa Selanjutnya"
              className="p-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium flex items-center"
            >
              <span className="hidden sm:inline mr-1">Desa Selanjutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Kecamatan Filter & Search within village dropdown */}
          <div className="flex items-center gap-2">
            {isAdminKecamatan ? (
              <div className="flex items-center gap-1.5 px-2.5 py-2 bg-sky-50 border border-sky-200 rounded-lg text-xs font-semibold text-sky-800">
                <Building2 className="w-3.5 h-3.5 text-sky-600" />
                <span>Kec. {session.kecamatanName}</span>
              </div>
            ) : (
              <select
                value={filterKec}
                onChange={(e) => setFilterKec(e.target.value)}
                className="text-xs bg-white border border-slate-300 text-slate-700 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {KECAMATAN_LIST.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            )}

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari desa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-xs pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 w-32 sm:w-40"
              />
            </div>
          </div>
        </div>

        {/* Selected Village Meta Header */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <span className="text-slate-400">Kode Desa:</span>{' '}
              <span className="font-mono font-semibold text-slate-700">{currentVillage.idDesa}</span>
            </div>
            <span className="text-slate-300">·</span>
            <div>
              <span className="text-slate-400">Kecamatan:</span>{' '}
              <span className="font-semibold text-slate-700">{currentVillage.kecamatan}</span>
            </div>
            <span className="text-slate-300">·</span>
            <div>
              <span className="text-slate-400">Kabupaten:</span>{' '}
              <span className="font-semibold text-slate-700">Boalemo</span>
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {/* Progress Indicator */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-[11px]">Kelengkapan:</span>
              <div className="w-20 sm:w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <span className="font-mono font-bold text-slate-800 text-[11px]">
                {progress.percent}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Module Content Cards */}
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-xs">
        {/* MODUL 0: OVERVIEW */}
        {currentModule === 'overview' && (
          <div className="space-y-5">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Ringkasan Profil & Status Perencanaan Desa {currentVillage.desa}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Identitas administratif desa dan ringkasan progres seluruh modul tahapan RKPDes 2027
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <h4 className="font-bold text-slate-800 text-sm mb-2">Identitas Wilayah</h4>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Provinsi:</span>
                  <span className="font-semibold text-slate-800">{currentVillage.provinsi} (ID: {currentVillage.idProv})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Kabupaten:</span>
                  <span className="font-semibold text-slate-800">{currentVillage.kabupaten} (ID: {currentVillage.idKab})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Kecamatan:</span>
                  <span className="font-semibold text-slate-800">{currentVillage.kecamatan} (ID: {currentVillage.idKec})</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Nama Desa:</span>
                  <span className="font-semibold text-slate-800">{currentVillage.desa} (ID: {currentVillage.idDesa})</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Nomor Urut:</span>
                  <span className="font-mono font-semibold text-slate-800">{currentVillage.no} dari 82</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <h4 className="font-bold text-slate-800 text-sm mb-2">Status Rangkuman Tahapan</h4>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">RPJM Desa Terbit:</span>
                  <span className="font-semibold text-slate-800">{currentVillage.rpjmDesTgl || 'Belum terisi'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Musdes Persiapan:</span>
                  <span className="font-semibold text-slate-800">{currentVillage.musdesPersiapan.tanggal || 'Belum terisi'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Pencermatan RPJM:</span>
                  <span className="font-semibold text-slate-800">{currentVillage.pencermatanRpjmTgl || 'Belum terisi'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Musrenbangdes:</span>
                  <span className="font-semibold text-slate-800">{currentVillage.musrenbangdes.tanggal || 'Belum terisi'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Pengesahan RKP:</span>
                  <span className="font-semibold text-slate-800">{currentVillage.musdesPengesahan.tanggal || 'Belum terisi'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Perdes APB Desa:</span>
                  <span className="font-semibold text-slate-800">{currentVillage.perdesApbNomor || currentVillage.perdesApbTgl || 'Belum terisi'}</span>
                </div>
              </div>
            </div>

            {/* Quick Action Navigation Grid */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 mb-2">Lompat ke Modul Input Spesifik:</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {MODULES_CONFIG.filter((m) => m.key !== 'overview').map((m) => {
                  const evCount = currentVillage.evidence?.[m.key as ModuleKey]?.length || 0;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => onSelectModule(m.key as ModuleKey)}
                      className="p-2.5 rounded-lg border border-slate-200 text-left hover:bg-slate-50 hover:border-emerald-500 transition-colors relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-emerald-700 font-bold block">{m.code}</span>
                        {evCount > 0 && (
                          <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full">
                            {evCount} Bukti
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-slate-800 block mt-0.5">{m.shortTitle}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rekapitulasi Bukti Foto & Dokumen Seluruh Modul */}
            {(() => {
              const allEvidence: { modKey: ModuleKey; modTitle: string; item: EvidenceItem }[] = [];
              MODULES_CONFIG.forEach((m) => {
                if (m.key !== 'overview') {
                  const items = currentVillage.evidence?.[m.key as ModuleKey] || [];
                  items.forEach((it) => {
                    allEvidence.push({
                      modKey: m.key as ModuleKey,
                      modTitle: m.shortTitle,
                      item: it,
                    });
                  });
                }
              });

              return (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        Total Bukti Foto & Dokumen Terlampir ({allEvidence.length} Berkas)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Seluruh lampiran foto dan dokumen pendukung perencanaan Desa {currentVillage.desa}
                      </p>
                    </div>
                  </div>

                  {allEvidence.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">
                      Belum ada berkas bukti foto/dokumen yang diunggah. Buka modul 1 s/d 8 untuk mengunggah bukti.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                      {allEvidence.map(({ modKey, modTitle, item }) => (
                        <div
                          key={item.id}
                          onClick={() => onSelectModule(modKey)}
                          className="bg-white p-2.5 rounded-lg border border-slate-200 hover:border-emerald-500 cursor-pointer flex items-center gap-2.5 transition-colors"
                        >
                          {item.type === 'image' ? (
                            <img
                              src={item.dataUrl}
                              alt={item.name}
                              className="w-10 h-10 object-cover rounded shrink-0 bg-slate-100"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-rose-600 font-bold text-[10px] uppercase shrink-0 font-mono">
                              {item.type}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-semibold text-slate-800 truncate block">
                              {item.name}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                              <span className="font-semibold text-emerald-700">{modTitle}</span>
                              <span>·</span>
                              <span>{item.formattedSize}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* MODUL 1: DASAR RPJM DESA */}
        {currentModule === 'modul1_rpjm' && (
          <div className="space-y-5">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                MODUL 1
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">Dasar Hukum RPJM Desa</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pencatatan tanggal terbitnya Peraturan Desa tentang Rencana Pembangunan Jangka Menengah Desa (RPJMDes)
              </p>
            </div>

            <div className="max-w-md">
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Perdes RPJM Desa terbit tgl:</span>
              </label>
              <input
                type="text"
                disabled={role === 'viewer'}
                placeholder="dd/mm/yyyy (contoh: 28/8/2024)"
                value={currentVillage.rpjmDesTgl}
                onChange={(e) =>
                  updateVillage((prev) => ({ ...prev, rpjmDesTgl: e.target.value }))
                }
                className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Format resmi: dd/mm/yyyy. Pastikan format tanggal sudah sesuai dengan lembaran Berita Daerah / Dokumen Perdes.
              </span>
            </div>

            {/* Upload Bukti Foto & Dokumen Modul 1 */}
            <EvidenceUpload
              moduleKey="modul1_rpjm"
              moduleName="Dasar Hukum RPJM Desa"
              evidenceList={currentVillage.evidence?.['modul1_rpjm'] || []}
              onAddEvidence={(item) => handleAddEvidence('modul1_rpjm', item)}
              onRemoveEvidence={(id) => handleRemoveEvidence('modul1_rpjm', id)}
              onUpdateCaption={(id, caption) => handleUpdateCaption('modul1_rpjm', id, caption)}
              role={role}
            />
          </div>
        )}

        {/* MODUL 2: MUSDES PERSIAPAN */}
        {currentModule === 'modul2_musdes_persiapan' &&
          renderForumSessionInput(
            'musdesPersiapan',
            'Musyawarah Desa (Persiapan dan Pembentukan Tim Penyusun RKPDes)',
            'MODUL 2'
          )}

        {/* MODUL 3: PENCERMATAN ULANG RPJM DESA */}
        {currentModule === 'modul3_pencermatan' && (
          <div className="space-y-5">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                MODUL 3
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">Pencermatan Ulang Dokumen RPJM Desa</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pencatatan tanggal pelaksanaan pencermatan ulang RPJM Desa tahun berkenaan oleh tim penyusun
              </p>
            </div>

            <div className="max-w-md">
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Tanggal Pencermatan Ulang RPJM Desa:</span>
              </label>
              <input
                type="text"
                disabled={role === 'viewer'}
                placeholder="dd/mm/yyyy (contoh: 15 Juni 2026)"
                value={currentVillage.pencermatanRpjmTgl}
                onChange={(e) =>
                  updateVillage((prev) => ({ ...prev, pencermatanRpjmTgl: e.target.value }))
                }
                className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Format: dd/mm/yyyy atau nama bulan tanggal pelaksanaan berita acara pencermatan.
              </span>
            </div>

            {/* Upload Bukti Foto & Dokumen Modul 3 */}
            <EvidenceUpload
              moduleKey="modul3_pencermatan"
              moduleName="Pencermatan Ulang Dokumen RPJM Desa"
              evidenceList={currentVillage.evidence?.['modul3_pencermatan'] || []}
              onAddEvidence={(item) => handleAddEvidence('modul3_pencermatan', item)}
              onRemoveEvidence={(id) => handleRemoveEvidence('modul3_pencermatan', id)}
              onUpdateCaption={(id, caption) => handleUpdateCaption('modul3_pencermatan', id, caption)}
              role={role}
            />
          </div>
        )}

        {/* MODUL 4: MUSRENBANGDES */}
        {currentModule === 'modul4_musrenbangdes' &&
          renderForumSessionInput(
            'musrenbangdes',
            'Musyawarah Perencanaan Pembangunan Desa Pembahasan Rancangan RKP Desa',
            'MODUL 4'
          )}

        {/* MODUL 5: MUSDES PENGESAHAN RKP DESA */}
        {currentModule === 'modul5_musdes_pengesahan' &&
          renderForumSessionInput(
            'musdesPengesahan',
            'Musyawarah Desa Pembahasan dan Pengesahan RKP Desa dan DU RKP Desa',
            'MODUL 5'
          )}

        {/* MODUL 6: PERDES RKP DESA & RAPB / APB DESA */}
        {currentModule === 'modul6_perdes_apb' && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                MODUL 6
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                Penetapan Perdes RKP Desa & APB Desa 2027
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Penerbitan Peraturan Desa RKP Desa, penyusunan Rancangan APB Desa, dan Perdes APB Desa
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Perdes RKP Desa diterbitkan tgl:
                </label>
                <input
                  type="text"
                  disabled={role === 'viewer'}
                  placeholder="dd/mm/yyyy"
                  value={currentVillage.perdesRkpTgl}
                  onChange={(e) =>
                    updateVillage((prev) => ({ ...prev, perdesRkpTgl: e.target.value }))
                  }
                  className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Penyusunan RAPB Desa tgl:
                </label>
                <input
                  type="text"
                  disabled={role === 'viewer'}
                  placeholder="dd/mm/yyyy"
                  value={currentVillage.rapbDesTgl}
                  onChange={(e) =>
                    updateVillage((prev) => ({ ...prev, rapbDesTgl: e.target.value }))
                  }
                  className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-900 mb-3">
                Dokumen Peraturan Desa tentang APB Desa
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Tanggal Terbit Perdes APB:
                  </label>
                  <input
                    type="text"
                    disabled={role === 'viewer'}
                    placeholder="dd/mm/yyyy"
                    value={currentVillage.perdesApbTgl}
                    onChange={(e) =>
                      updateVillage((prev) => ({ ...prev, perdesApbTgl: e.target.value }))
                    }
                    className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Nomor Peraturan Desa:
                  </label>
                  <input
                    type="text"
                    disabled={role === 'viewer'}
                    placeholder="Contoh: 04 Tahun 2026"
                    value={currentVillage.perdesApbNomor}
                    onChange={(e) =>
                      updateVillage((prev) => ({ ...prev, perdesApbNomor: e.target.value }))
                    }
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Tahun Peraturan Desa:
                  </label>
                  <input
                    type="text"
                    disabled={role === 'viewer'}
                    placeholder="2027"
                    value={currentVillage.perdesApbTahun}
                    onChange={(e) =>
                      updateVillage((prev) => ({ ...prev, perdesApbTahun: e.target.value }))
                    }
                    className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
              </div>
            </div>

            {/* Upload Bukti Foto & Dokumen Modul 6 */}
            <EvidenceUpload
              moduleKey="modul6_perdes_apb"
              moduleName="Penetapan Perdes RKP Desa & APB Desa 2027"
              evidenceList={currentVillage.evidence?.['modul6_perdes_apb'] || []}
              onAddEvidence={(item) => handleAddEvidence('modul6_perdes_apb', item)}
              onRemoveEvidence={(id) => handleRemoveEvidence('modul6_perdes_apb', id)}
              onUpdateCaption={(id, caption) => handleUpdateCaption('modul6_perdes_apb', id, caption)}
              role={role}
            />
          </div>
        )}

        {/* MODUL 7: MUSDESUS KDMP */}
        {currentModule === 'modul7_kdmp' &&
          renderForumSessionInput(
            'musdesusKdmp',
            'Musdesus untuk Persetujuan Dukungan Pengembalian Pinjaman KDMP',
            'MODUL 7',
            true
          )}

        {/* MODUL 8: PERUBAHAN & ANGGARAN DANA DESA */}
        {currentModule === 'modul8_perubahan' && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                MODUL 8
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                Perubahan Perencanaan & Alokasi Dana Desa (DD)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Perdes RKP Desa Perubahan, Perdes APB Desa Perubahan, dan Nilai DD disetujui dalam BA Musdesus
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Perdes RKP Desa Perubahan diterbitkan tgl:
                </label>
                <input
                  type="text"
                  disabled={role === 'viewer'}
                  placeholder="dd/mm/yyyy"
                  value={currentVillage.perdesRkpPerubahanTgl}
                  onChange={(e) =>
                    updateVillage((prev) => ({
                      ...prev,
                      perdesRkpPerubahanTgl: e.target.value,
                    }))
                  }
                  className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Perdes APB Desa Perubahan tgl:
                </label>
                <input
                  type="text"
                  disabled={role === 'viewer'}
                  placeholder="dd/mm/yyyy"
                  value={currentVillage.perdesApbPerubahanTgl}
                  onChange={(e) =>
                    updateVillage((prev) => ({
                      ...prev,
                      perdesApbPerubahanTgl: e.target.value,
                    }))
                  }
                  className="w-full text-xs font-mono px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Perdes APB Desa Perubahan:
                </label>
                <input
                  type="text"
                  disabled={role === 'viewer'}
                  placeholder="Nomor Perdes APBDes Perubahan"
                  value={currentVillage.perdesApbPerubahanNomor}
                  onChange={(e) =>
                    updateVillage((prev) => ({
                      ...prev,
                      perdesApbPerubahanNomor: e.target.value,
                    }))
                  }
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nilai DD yang disetujui dalam BA Musdesus (Rp.):
                </label>
                <input
                  type="number"
                  min="0"
                  disabled={role === 'viewer'}
                  placeholder="0"
                  value={currentVillage.nilaiDdKdmp ?? ''}
                  onChange={(e) =>
                    updateVillage((prev) => ({
                      ...prev,
                      nilaiDdKdmp: e.target.value === '' ? null : parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full text-xs font-mono tabular-nums px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                />
                <span className="text-[11px] font-mono text-emerald-700 mt-1 block font-semibold">
                  Terformat: {formatRupiah(currentVillage.nilaiDdKdmp)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Keterangan Umum / Catatan Akhir:
              </label>
              <textarea
                rows={3}
                disabled={role === 'viewer'}
                placeholder="Catatan umum mengenai perencanaan desa tahun 2027..."
                value={currentVillage.keteranganUmum}
                onChange={(e) =>
                  updateVillage((prev) => ({
                    ...prev,
                    keteranganUmum: e.target.value,
                  }))
                }
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            {/* Upload Bukti Foto & Dokumen Modul 8 */}
            <EvidenceUpload
              moduleKey="modul8_perubahan"
              moduleName="Perubahan Perencanaan & Alokasi Dana Desa (DD)"
              evidenceList={currentVillage.evidence?.['modul8_perubahan'] || []}
              onAddEvidence={(item) => handleAddEvidence('modul8_perubahan', item)}
              onRemoveEvidence={(id) => handleRemoveEvidence('modul8_perubahan', id)}
              onUpdateCaption={(id, caption) => handleUpdateCaption('modul8_perubahan', id, caption)}
              role={role}
            />
          </div>
        )}

        {/* Save Status Banner */}
        {canEdit && (
          <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Save className="w-3.5 h-3.5 text-emerald-600" />
              <span>Data tersimpan otomatis & tersinkron real-time ke Google Spreadsheet</span>
            </div>
            {saveToast && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 animate-fade-in flex items-center gap-1.5 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Tersimpan Otomatis ke Spreadsheet!
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
