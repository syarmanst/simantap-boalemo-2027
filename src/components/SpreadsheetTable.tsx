import React, { useState, useMemo, useEffect } from 'react';
import { VillagePlanRecord, ModuleKey, UserSession } from '../types';
import { KECAMATAN_LIST } from '../data/initialData';
import {
  calcGenderTotal,
  calcUnsurTotal,
  calcSelisih,
  formatRupiah,
} from '../utils/calculations';
import { Search, Download, ArrowUpDown, Edit3, Paperclip, Building2, Eye } from 'lucide-react';
import { exportToExcel } from '../utils/excelHandler';

interface SpreadsheetTableProps {
  villages: VillagePlanRecord[];
  onSelectVillageForEdit: (villageId: string, moduleKey?: ModuleKey) => void;
  session: UserSession;
  onDeleteVillage?: (villageId: string) => void;
}

export const SpreadsheetTable: React.FC<SpreadsheetTableProps> = ({
  villages,
  onSelectVillageForEdit,
  session,
  onDeleteVillage,
}) => {
  const isSuperAdmin = session.role === 'super_admin';
  const isAdminKecamatan = session.role === 'admin_kecamatan';
  const isViewer = session.role === 'viewer';

  // For Admin Kecamatan, scope only to their kecamatan
  const [selectedKec, setSelectedKec] = useState<string>(() => {
    if (isAdminKecamatan && session.kecamatanName) {
      return session.kecamatanName;
    }
    return 'Semua Kecamatan';
  });

  useEffect(() => {
    if (isAdminKecamatan && session.kecamatanName) {
      setSelectedKec(session.kecamatanName);
    }
  }, [isAdminKecamatan, session.kecamatanName]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'hasData' | 'hasSelisih'>('all');
  const [sortField, setSortField] = useState<'no' | 'desa' | 'kecamatan'>('no');
  const [sortAsc, setSortAsc] = useState(true);

  // Filter & Sort
  const filtered = useMemo(() => {
    return villages
      .filter((v) => {
        // If Admin Kecamatan, strictly restrict to their kecamatan
        if (isAdminKecamatan && session.kecamatanName) {
          if (v.kecamatan !== session.kecamatanName && v.idKec !== session.kecamatanCode) {
            return false;
          }
        }

        const matchesKec = selectedKec === 'Semua Kecamatan' || v.kecamatan === selectedKec;
        const matchesSearch =
          v.desa.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.idDesa.includes(searchTerm) ||
          v.kecamatan.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesKec || !matchesSearch) return false;

        if (statusFilter === 'hasData') {
          return Boolean(v.musdesPersiapan.tanggal || v.musrenbangdes.tanggal || v.rpjmDesTgl);
        }
        if (statusFilter === 'hasSelisih') {
          const s1 = calcSelisih(v.musdesPersiapan.lk, v.musdesPersiapan.pr, v.musdesPersiapan.unsur);
          const s2 = calcSelisih(v.musrenbangdes.lk, v.musrenbangdes.pr, v.musrenbangdes.unsur);
          const s3 = calcSelisih(v.musdesPengesahan.lk, v.musdesPengesahan.pr, v.musdesPengesahan.unsur);
          return (s1.hasData && !s1.isValid) || (s2.hasData && !s2.isValid) || (s3.hasData && !s3.isValid);
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [villages, searchTerm, selectedKec, statusFilter, sortField, sortAsc, isAdminKecamatan, session.kecamatanName, session.kecamatanCode]);

  const toggleSort = (field: 'no' | 'desa' | 'kecamatan') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="space-y-4">
      {/* Table Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari desa atau ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 w-44 sm:w-56"
            />
          </div>

          {/* Kecamatan Filter: Locked for Admin Kecamatan, Open for Super Admin / Viewer */}
          {isAdminKecamatan ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-sky-50 border border-sky-200 rounded-lg text-xs font-semibold text-sky-800">
              <Building2 className="w-3.5 h-3.5 text-sky-600" />
              <span>Wilayah: Kec. {session.kecamatanName}</span>
              <span className="font-mono text-[11px] text-sky-600">({session.kecamatanCode})</span>
            </div>
          ) : (
            <select
              value={selectedKec}
              onChange={(e) => setSelectedKec(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {KECAMATAN_LIST.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          )}

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({filtered.length})
            </button>
            <button
              onClick={() => setStatusFilter('hasData')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'hasData'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ada Data
            </button>
            <button
              onClick={() => setStatusFilter('hasSelisih')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'hasSelisih'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              Ada Selisih
            </button>
          </div>
        </div>

        {/* Count & Export (Super Admin Only) */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          <span className="text-xs font-mono text-slate-500">
            Menampilkan: <strong>{filtered.length}</strong> Desa
          </span>

          {/* STRICTLY Super Admin Only: Export Excel */}
          {isSuperAdmin && (
            <button
              onClick={() => exportToExcel(villages)}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Excel (105 Kolom)</span>
            </button>
          )}
        </div>
      </div>

      {/* Spreadsheet Container with Horizontal Scrolling */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[680px]">
          <table className="w-full text-left text-xs border-collapse font-sans">
            {/* Multi-tier Header */}
            <thead className="sticky top-0 z-20 bg-slate-900 text-white text-[11px] shadow-xs">
              {/* Group Row */}
              <tr className="border-b border-slate-800 text-slate-300">
                <th colSpan={4} className="py-2 px-3 bg-slate-900 sticky left-0 z-30 text-left border-r border-slate-800">
                  Identitas Wilayah Desa
                </th>
                <th colSpan={1} className="py-2 px-3 text-center bg-slate-800/80 border-r border-slate-700 text-emerald-300">
                  RPJMDes
                </th>
                <th colSpan={5} className="py-2 px-3 text-center bg-slate-800 border-r border-slate-700 text-sky-300">
                  Musdes Persiapan Tim RKP
                </th>
                <th colSpan={1} className="py-2 px-3 text-center bg-slate-800/80 border-r border-slate-700 text-purple-300">
                  Pencermatan
                </th>
                <th colSpan={5} className="py-2 px-3 text-center bg-slate-800 border-r border-slate-700 text-indigo-300">
                  Musrenbangdes RKP
                </th>
                <th colSpan={3} className="py-2 px-3 text-center bg-slate-800/80 border-r border-slate-700 text-amber-300">
                  Perdes RKP & APB
                </th>
                <th colSpan={3} className="py-2 px-3 text-center bg-slate-800 border-r border-slate-700 text-rose-300">
                  Musdesus KDMP
                </th>
                <th colSpan={1} className="py-2 px-3 text-center bg-slate-900">
                  Aksi
                </th>
              </tr>

              {/* Column Detail Row */}
              <tr className="bg-slate-800 text-slate-200 border-b border-slate-700 text-[10px]">
                {/* Fixed identity cols */}
                <th
                  onClick={() => toggleSort('no')}
                  className="py-2 px-2.5 sticky left-0 z-30 bg-slate-800 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>No</span>
                    <ArrowUpDown className="w-2.5 h-2.5" />
                  </div>
                </th>
                <th className="py-2 px-2.5 sticky left-8 z-30 bg-slate-800">Kode</th>
                <th
                  onClick={() => toggleSort('desa')}
                  className="py-2 px-3 sticky left-24 z-30 bg-slate-800 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Nama Desa</span>
                    <ArrowUpDown className="w-2.5 h-2.5" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('kecamatan')}
                  className="py-2 px-3 sticky left-56 z-30 bg-slate-800 border-r border-slate-700 cursor-pointer hover:text-white"
                >
                  <div className="flex items-center gap-1">
                    <span>Kecamatan</span>
                    <ArrowUpDown className="w-2.5 h-2.5" />
                  </div>
                </th>

                {/* Modul 1 */}
                <th className="py-2 px-2.5 border-r border-slate-700">Tgl Terbit RPJM</th>

                {/* Modul 2 */}
                <th className="py-2 px-2.5">Tgl Musdes</th>
                <th className="py-2 px-2 text-center">Lk</th>
                <th className="py-2 px-2 text-center">Pr</th>
                <th className="py-2 px-2 text-center">Jml</th>
                <th className="py-2 px-2.5 text-center border-r border-slate-700">Selisih</th>

                {/* Modul 3 */}
                <th className="py-2 px-2.5 border-r border-slate-700">Tgl Pencermatan</th>

                {/* Modul 4 */}
                <th className="py-2 px-2.5">Tgl Musrenbang</th>
                <th className="py-2 px-2 text-center">Lk</th>
                <th className="py-2 px-2 text-center">Pr</th>
                <th className="py-2 px-2 text-center">Jml</th>
                <th className="py-2 px-2.5 text-center border-r border-slate-700">Selisih</th>

                {/* Modul 6 */}
                <th className="py-2 px-2.5">Perdes RKP</th>
                <th className="py-2 px-2.5">Tgl APB</th>
                <th className="py-2 px-2.5 border-r border-slate-700">No Perdes APB</th>

                {/* Modul 7 */}
                <th className="py-2 px-2 text-center">Status</th>
                <th className="py-2 px-2.5">Tgl Musdesus</th>
                <th className="py-2 px-2.5 border-r border-slate-700">Nilai DD (Rp)</th>

                {/* Action */}
                <th className="py-2 px-3 text-center">Kelola</th>
              </tr>
            </thead>

            {/* Table Rows */}
            <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
              {filtered.map((v) => {
                const mpTotalGender = calcGenderTotal(v.musdesPersiapan.lk, v.musdesPersiapan.pr);
                const mpSel = calcSelisih(v.musdesPersiapan.lk, v.musdesPersiapan.pr, v.musdesPersiapan.unsur);

                const mbTotalGender = calcGenderTotal(v.musrenbangdes.lk, v.musrenbangdes.pr);
                const mbSel = calcSelisih(v.musrenbangdes.lk, v.musrenbangdes.pr, v.musrenbangdes.unsur);

                return (
                  <tr
                    key={v.idDesa}
                    className="hover:bg-emerald-50/40 transition-colors group cursor-pointer"
                    onClick={() => onSelectVillageForEdit(v.idDesa)}
                  >
                    {/* Fixed Identity Columns */}
                    <td className="py-2.5 px-2.5 sticky left-0 z-10 bg-white group-hover:bg-emerald-50/60 font-semibold text-slate-500 tabular-nums">
                      {v.no}
                    </td>
                    <td className="py-2.5 px-2.5 sticky left-8 z-10 bg-white group-hover:bg-emerald-50/60 text-[10px] text-slate-400">
                      {v.idDesa.slice(-4)}
                    </td>
                    <td className="py-2.5 px-3 sticky left-24 z-10 bg-white group-hover:bg-emerald-50/60 font-bold text-slate-900 max-w-[140px]">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate">{v.desa}</span>
                        {(() => {
                          const totalEv = v.evidence
                            ? Object.values(v.evidence).reduce((acc, arr) => acc + (arr?.length || 0), 0)
                            : 0;
                          if (totalEv === 0) return null;
                          return (
                            <span
                              title={`${totalEv} berkas bukti terlampir`}
                              className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-mono shrink-0"
                            >
                              <Paperclip className="w-2.5 h-2.5" />
                              <span>{totalEv}</span>
                            </span>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 sticky left-56 z-10 bg-white group-hover:bg-emerald-50/60 text-slate-600 border-r border-slate-200 truncate max-w-[110px]">
                      {v.kecamatan}
                    </td>

                    {/* Modul 1: RPJMDes */}
                    <td className="py-2.5 px-2.5 border-r border-slate-100 whitespace-nowrap">
                      {v.rpjmDesTgl ? (
                        <span className="text-emerald-700 font-medium">{v.rpjmDesTgl}</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Modul 2: Musdes Persiapan */}
                    <td className="py-2.5 px-2.5 whitespace-nowrap">
                      {v.musdesPersiapan.tanggal || <span className="text-slate-300">-</span>}
                    </td>
                    <td className="py-2.5 px-2 text-center tabular-nums text-slate-600">
                      {v.musdesPersiapan.lk ?? '-'}
                    </td>
                    <td className="py-2.5 px-2 text-center tabular-nums text-slate-600">
                      {v.musdesPersiapan.pr ?? '-'}
                    </td>
                    <td className="py-2.5 px-2 text-center tabular-nums font-bold text-slate-900">
                      {mpTotalGender > 0 ? mpTotalGender : '-'}
                    </td>
                    <td className="py-2.5 px-2.5 text-center border-r border-slate-100">
                      {mpSel.hasData ? (
                        mpSel.isValid ? (
                          <span className="text-emerald-600 font-bold">0</span>
                        ) : (
                          <span className="text-amber-600 font-bold">
                            {mpSel.selisih > 0 ? `+${mpSel.selisih}` : mpSel.selisih}
                          </span>
                        )
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Modul 3: Pencermatan */}
                    <td className="py-2.5 px-2.5 border-r border-slate-100 whitespace-nowrap">
                      {v.pencermatanRpjmTgl || <span className="text-slate-300">-</span>}
                    </td>

                    {/* Modul 4: Musrenbangdes */}
                    <td className="py-2.5 px-2.5 whitespace-nowrap">
                      {v.musrenbangdes.tanggal || <span className="text-slate-300">-</span>}
                    </td>
                    <td className="py-2.5 px-2 text-center tabular-nums text-slate-600">
                      {v.musrenbangdes.lk ?? '-'}
                    </td>
                    <td className="py-2.5 px-2 text-center tabular-nums text-slate-600">
                      {v.musrenbangdes.pr ?? '-'}
                    </td>
                    <td className="py-2.5 px-2 text-center tabular-nums font-bold text-slate-900">
                      {mbTotalGender > 0 ? mbTotalGender : '-'}
                    </td>
                    <td className="py-2.5 px-2.5 text-center border-r border-slate-100">
                      {mbSel.hasData ? (
                        mbSel.isValid ? (
                          <span className="text-emerald-600 font-bold">0</span>
                        ) : (
                          <span className="text-amber-600 font-bold">
                            {mbSel.selisih > 0 ? `+${mbSel.selisih}` : mbSel.selisih}
                          </span>
                        )
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Modul 6: Perdes RKP & APB */}
                    <td className="py-2.5 px-2.5 whitespace-nowrap text-slate-600">
                      {v.perdesRkpTgl || '-'}
                    </td>
                    <td className="py-2.5 px-2.5 whitespace-nowrap text-slate-600">
                      {v.perdesApbTgl || '-'}
                    </td>
                    <td className="py-2.5 px-2.5 border-r border-slate-100 whitespace-nowrap text-slate-600">
                      {v.perdesApbNomor || '-'}
                    </td>

                    {/* Modul 7: KDMP */}
                    <td className="py-2.5 px-2 text-center font-bold">
                      {v.musdesusKdmp.melaksanakan === 1 ? (
                        <span className="text-emerald-600">Ya (1)</span>
                      ) : v.musdesusKdmp.melaksanakan === 0 ? (
                        <span className="text-slate-400">Tidak (0)</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2.5 whitespace-nowrap text-slate-600">
                      {v.musdesusKdmp.tanggal || '-'}
                    </td>
                    <td className="py-2.5 px-2.5 border-r border-slate-100 whitespace-nowrap font-medium text-slate-800">
                      {v.nilaiDdKdmp ? formatRupiah(v.nilaiDdKdmp) : '-'}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectVillageForEdit(v.idDesa);
                        }}
                        className={`p-1 rounded transition-colors ${
                          isViewer
                            ? 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
                            : 'hover:bg-emerald-100 text-slate-500 hover:text-emerald-700'
                        }`}
                        title={isViewer ? 'Lihat rincian desa (Hanya Lihat)' : 'Edit data perencanaan desa'}
                      >
                        {isViewer ? <Eye className="w-3.5 h-3.5 text-slate-500" /> : <Edit3 className="w-3.5 h-3.5 text-emerald-600" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
