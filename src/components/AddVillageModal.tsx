import React, { useState } from 'react';
import { VillagePlanRecord, UserSession } from '../types';
import { KECAMATAN_LIST_META } from '../data/authConfig';
import { emptySession, emptyKdmpSession } from '../utils/calculations';
import { PlusCircle, X, Building2, MapPin } from 'lucide-react';

interface AddVillageModalProps {
  isOpen: boolean;
  onClose: () => void;
  userSession: UserSession;
  existingVillages: VillagePlanRecord[];
  onAddVillage: (newVillage: VillagePlanRecord) => void;
}

export const AddVillageModal: React.FC<AddVillageModalProps> = ({
  isOpen,
  onClose,
  userSession,
  existingVillages,
  onAddVillage,
}) => {
  // If user is admin_kecamatan, lock to their kecamatan
  const defaultKecCode =
    userSession.role === 'admin_kecamatan' && userSession.kecamatanCode
      ? userSession.kecamatanCode
      : '750201';

  const [idKec, setIdKec] = useState(defaultKecCode);
  const [desaName, setDesaName] = useState('');
  const [idDesa, setIdDesa] = useState('');
  const [rpjmDesTgl, setRpjmDesTgl] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedKecMeta = KECAMATAN_LIST_META.find((k) => k.code === idKec) || KECAMATAN_LIST_META[0];

  const handleKecChange = (newKecCode: string) => {
    setIdKec(newKecCode);
    // Suggest idDesa based on kecCode
    const countInKec = existingVillages.filter((v) => v.idKec === newKecCode).length;
    const nextSuffix = (2000 + countInKec + 1).toString();
    setIdDesa(`${newKecCode}${nextSuffix}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desaName.trim()) {
      setError('Nama desa wajib diisi.');
      return;
    }

    const generatedId = idDesa.trim() || `${idKec}${Date.now().toString().slice(-4)}`;

    // Check duplicate
    if (existingVillages.some((v) => v.idDesa === generatedId)) {
      setError('ID Desa sudah terdaftar. Silakan gunakan ID Desa yang unik.');
      return;
    }

    const nextNo = Math.max(...existingVillages.map((v) => v.no), 0) + 1;

    const newRecord: VillagePlanRecord = {
      no: nextNo,
      idProv: '75',
      provinsi: 'Gorontalo',
      idKab: '7502',
      kabupaten: 'Boalemo',
      idKec: selectedKecMeta.code,
      kecamatan: selectedKecMeta.name,
      idDesa: generatedId,
      desa: desaName.trim(),
      rpjmDesTgl: rpjmDesTgl.trim(),
      musdesPersiapan: emptySession(),
      pencermatanRpjmTgl: '',
      musrenbangdes: emptySession(),
      musdesPengesahan: emptySession(),
      perdesRkpTgl: '',
      rapbDesTgl: '',
      perdesApbTgl: '',
      perdesApbNomor: '',
      perdesApbTahun: '2027',
      musdesusKdmp: emptyKdmpSession(),
      perdesRkpPerubahanTgl: '',
      perdesApbPerubahanTgl: '',
      perdesApbPerubahanNomor: '',
      nilaiDdKdmp: null,
      keteranganUmum: '',
      evidence: {},
      updatedAt: new Date().toISOString(),
      updatedBy: userSession.displayName,
    };

    onAddVillage(newRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Tambah Data Desa Baru</h3>
              <p className="text-[11px] text-slate-300">
                {userSession.role === 'admin_kecamatan'
                  ? `Kecamatan: ${userSession.kecamatanName}`
                  : 'Kabupaten Boalemo'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="text-xs p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Kecamatan selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kecamatan
            </label>
            {userSession.role === 'admin_kecamatan' ? (
              <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-sky-600" />
                <span>{userSession.kecamatanName}</span>
                <span className="font-mono text-slate-400 text-[11px]">({userSession.kecamatanCode})</span>
              </div>
            ) : (
              <select
                value={idKec}
                onChange={(e) => handleKecChange(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-semibold"
              >
                {KECAMATAN_LIST_META.map((k) => (
                  <option key={k.code} value={k.code}>
                    Kec. {k.name} ({k.code})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Nama Desa */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Desa *
            </label>
            <input
              type="text"
              required
              value={desaName}
              onChange={(e) => setDesaName(e.target.value)}
              placeholder="Contoh: Desa Makmur"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-900"
            />
          </div>

          {/* Kode / ID Desa */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kode Wilayah / ID Desa (10 Digit)
            </label>
            <input
              type="text"
              value={idDesa}
              onChange={(e) => setIdDesa(e.target.value)}
              placeholder={`Contoh: ${idKec}20...`}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Kosongkan untuk pembuatan otomatis berdasarkan kode kecamatan
            </span>
          </div>

          {/* RPJMDes date initial */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tanggal Terbit Perdes RPJM Desa (Opsional)
            </label>
            <input
              type="text"
              value={rpjmDesTgl}
              onChange={(e) => setRpjmDesTgl(e.target.value)}
              placeholder="dd/mm/yyyy"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors"
            >
              Simpan Desa Baru
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
