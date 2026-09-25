import React, { useMemo, useState } from 'react';
import { VillagePlanRecord } from '../types';
import { calcGenderTotal, calcUnsurTotal, formatRupiah } from '../utils/calculations';
import { KECAMATAN_LIST } from '../data/initialData';
import { CheckCircle2, AlertCircle, Users, FileText, ChevronRight, TrendingUp, Building2, UserCheck } from 'lucide-react';

interface DashboardStatsProps {
  villages: VillagePlanRecord[];
  onSelectVillage: (villageId: string) => void;
  onNavigateToModule: (moduleKey: any) => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  villages,
  onSelectVillage,
  onNavigateToModule,
}) => {
  const [selectedKecamatan, setSelectedKecamatan] = useState<string>('Semua Kecamatan');

  // Filtered dataset
  const filteredVillages = useMemo(() => {
    if (selectedKecamatan === 'Semua Kecamatan') return villages;
    return villages.filter((v) => v.kecamatan === selectedKecamatan);
  }, [villages, selectedKecamatan]);

  // Real-time statistics aggregation
  const stats = useMemo(() => {
    const totalDesa = filteredVillages.length;
    let rpjmCount = 0;
    let musdesPersiapanCount = 0;
    let pencermatanCount = 0;
    let musrenbangdesCount = 0;
    let musdesPengesahanCount = 0;
    let perdesRkpCount = 0;
    let perdesApbCount = 0;
    let kdmpCount = 0;
    let totalDdKdmp = 0;

    // Participants aggregate
    let totalLk = 0;
    let totalPr = 0;
    let totalArtm = 0;
    let totalDifabel = 0;
    let totalMarginal = 0;
    let totalTani = 0;
    let totalNelayan = 0;
    let totalPemuda = 0;
    let totalKader = 0;

    let balanceDiscrepancies = 0;

    filteredVillages.forEach((v) => {
      if (v.rpjmDesTgl) rpjmCount++;
      if (v.musdesPersiapan.tanggal) musdesPersiapanCount++;
      if (v.pencermatanRpjmTgl) pencermatanCount++;
      if (v.musrenbangdes.tanggal) musrenbangdesCount++;
      if (v.musdesPengesahan.tanggal) musdesPengesahanCount++;
      if (v.perdesRkpTgl) perdesRkpCount++;
      if (v.perdesApbTgl || v.perdesApbNomor) perdesApbCount++;

      if (v.musdesusKdmp.melaksanakan === 1 || v.musdesusKdmp.tanggal) kdmpCount++;
      if (v.nilaiDdKdmp) totalDdKdmp += v.nilaiDdKdmp;

      // Accumulate participants from all sessions
      const sessions = [v.musdesPersiapan, v.musrenbangdes, v.musdesPengesahan, v.musdesusKdmp];
      sessions.forEach((s) => {
        const lk = s.lk || 0;
        const pr = s.pr || 0;
        totalLk += lk;
        totalPr += pr;

        totalArtm += s.unsur.artm || 0;
        totalDifabel += s.unsur.klpDifabel || 0;
        totalMarginal += s.unsur.klpMarginal || 0;
        totalTani += s.unsur.klpTani || 0;
        totalNelayan += s.unsur.klpNelayan || 0;
        totalPemuda += s.unsur.pemuda || 0;
        totalKader += s.unsur.kaderDesa || 0;

        const totalGender = calcGenderTotal(s.lk, s.pr);
        const totalUnsur = calcUnsurTotal(s.unsur);
        if ((totalGender > 0 || totalUnsur > 0) && totalGender !== totalUnsur) {
          balanceDiscrepancies++;
        }
      });
    });

    const totalParticipants = totalLk + totalPr;
    const femalePercentage = totalParticipants > 0 ? Math.round((totalPr / totalParticipants) * 100) : 0;
    const malePercentage = totalParticipants > 0 ? 100 - femalePercentage : 0;

    return {
      totalDesa,
      rpjmCount,
      rpjmPercent: totalDesa ? Math.round((rpjmCount / totalDesa) * 100) : 0,
      musdesPersiapanCount,
      musdesPersiapanPercent: totalDesa ? Math.round((musdesPersiapanCount / totalDesa) * 100) : 0,
      pencermatanCount,
      pencermatanPercent: totalDesa ? Math.round((pencermatanCount / totalDesa) * 100) : 0,
      musrenbangdesCount,
      musrenbangdesPercent: totalDesa ? Math.round((musrenbangdesCount / totalDesa) * 100) : 0,
      musdesPengesahanCount,
      musdesPengesahanPercent: totalDesa ? Math.round((musdesPengesahanCount / totalDesa) * 100) : 0,
      perdesRkpCount,
      perdesRkpPercent: totalDesa ? Math.round((perdesRkpCount / totalDesa) * 100) : 0,
      perdesApbCount,
      perdesApbPercent: totalDesa ? Math.round((perdesApbCount / totalDesa) * 100) : 0,
      kdmpCount,
      kdmpPercent: totalDesa ? Math.round((kdmpCount / totalDesa) * 100) : 0,
      totalDdKdmp,
      totalParticipants,
      totalLk,
      totalPr,
      femalePercentage,
      malePercentage,
      totalArtm,
      totalDifabel,
      totalMarginal,
      totalTani,
      totalNelayan,
      totalPemuda,
      totalKader,
      balanceDiscrepancies,
    };
  }, [filteredVillages]);

  // Breakdown per Kecamatan
  const kecamatanData = useMemo(() => {
    const map = new Map<string, { total: number; rkp: number; apb: number; participants: number }>();
    villages.forEach((v) => {
      const kec = v.kecamatan || 'Lainnya';
      if (!map.has(kec)) {
        map.set(kec, { total: 0, rkp: 0, apb: 0, participants: 0 });
      }
      const data = map.get(kec)!;
      data.total++;
      if (v.musdesPersiapan.tanggal) data.rkp++;
      if (v.perdesApbTgl || v.perdesApbNomor) data.apb++;
      data.participants +=
        calcGenderTotal(v.musdesPersiapan.lk, v.musdesPersiapan.pr) +
        calcGenderTotal(v.musrenbangdes.lk, v.musrenbangdes.pr);
    });
    return Array.from(map.entries()).map(([kecamatan, d]) => ({
      kecamatan,
      ...d,
      progressPercent: d.total ? Math.round((d.rkp / d.total) * 100) : 0,
    }));
  }, [villages]);

  return (
    <div className="space-y-6">
      {/* Top Filter & Kicker Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Statistik Real-Time Perencanaan Desa 2027
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoring kumulatif 82 Desa di 7 Kecamatan, Kabupaten Boalemo
          </p>
        </div>

        {/* Kecamatan Filter Segmented Control */}
        <div className="flex items-center gap-2">
          <label htmlFor="kec-filter" className="text-xs font-medium text-slate-600 whitespace-nowrap">
            Kecamatan:
          </label>
          <select
            id="kec-filter"
            value={selectedKecamatan}
            onChange={(e) => setSelectedKecamatan(e.target.value)}
            className="text-xs font-medium bg-white border border-slate-300 text-slate-800 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
          >
            {KECAMATAN_LIST.map((kec) => (
              <option key={kec} value={kec}>
                {kec}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Desa */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Cakupan Desa</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-900">
              {stats.totalDesa}
            </span>
            <span className="text-xs text-slate-500">Desa</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>7 Kecamatan</span>
            <span className="font-mono tabular-nums text-emerald-600 font-medium">100% Terdaftar</span>
          </div>
        </div>

        {/* RPJM Desa Terbit */}
        <div
          onClick={() => onNavigateToModule('modul1_rpjm')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Perdes RPJM Desa</span>
            <FileText className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-900">
              {stats.rpjmCount}
            </span>
            <span className="text-xs text-slate-500">/ {stats.totalDesa} Desa</span>
          </div>
          <div className="mt-2">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${stats.rpjmPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 mt-1">
              <span>Dasar Perencanaan</span>
              <span className="font-mono tabular-nums font-semibold text-emerald-600">
                {stats.rpjmPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Musdes Persiapan */}
        <div
          onClick={() => onNavigateToModule('modul2_musdes_persiapan')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Musdes Persiapan RKP</span>
            <Users className="w-4 h-4 text-sky-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-900">
              {stats.musdesPersiapanCount}
            </span>
            <span className="text-xs text-slate-500">/ {stats.totalDesa} Desa</span>
          </div>
          <div className="mt-2">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-sky-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${stats.musdesPersiapanPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 mt-1">
              <span>Pembentukan Tim</span>
              <span className="font-mono tabular-nums font-semibold text-sky-600">
                {stats.musdesPersiapanPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Musrenbangdes RKP */}
        <div
          onClick={() => onNavigateToModule('modul4_musrenbangdes')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Musrenbangdes RKP</span>
            <TrendingUp className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-900">
              {stats.musrenbangdesCount}
            </span>
            <span className="text-xs text-slate-500">/ {stats.totalDesa} Desa</span>
          </div>
          <div className="mt-2">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${stats.musrenbangdesPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 mt-1">
              <span>Pembahasan Rancangan</span>
              <span className="font-mono tabular-nums font-semibold text-indigo-600">
                {stats.musrenbangdesPercent}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Second Row: Detail Progress Stages */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Stages Checklist Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs md:col-span-2">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
            <span>Tahapan Siklus Perencanaan Desa 2027</span>
            <span className="text-xs font-normal text-slate-500 font-mono">Boalemo</span>
          </h3>

          <div className="space-y-3">
            {/* Step 1: Musdes Persiapan */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-mono text-[10px] text-slate-600 font-bold">
                  1
                </span>
                <span className="font-medium text-slate-800">Musdes Persiapan & Pembentukan Tim</span>
              </div>
              <div className="flex items-center gap-2 font-mono tabular-nums">
                <span className="text-slate-600">
                  {stats.musdesPersiapanCount} / {stats.totalDesa}
                </span>
                <span className="text-slate-400">·</span>
                <span className="font-semibold text-slate-900">{stats.musdesPersiapanPercent}%</span>
              </div>
            </div>

            {/* Step 2: Pencermatan */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-mono text-[10px] text-slate-600 font-bold">
                  2
                </span>
                <span className="font-medium text-slate-800">Pencermatan Ulang RPJM Desa</span>
              </div>
              <div className="flex items-center gap-2 font-mono tabular-nums">
                <span className="text-slate-600">
                  {stats.pencermatanCount} / {stats.totalDesa}
                </span>
                <span className="text-slate-400">·</span>
                <span className="font-semibold text-slate-900">{stats.pencermatanPercent}%</span>
              </div>
            </div>

            {/* Step 3: Musrenbangdes */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-mono text-[10px] text-slate-600 font-bold">
                  3
                </span>
                <span className="font-medium text-slate-800">Musrenbangdes Pembahasan RKP</span>
              </div>
              <div className="flex items-center gap-2 font-mono tabular-nums">
                <span className="text-slate-600">
                  {stats.musrenbangdesCount} / {stats.totalDesa}
                </span>
                <span className="text-slate-400">·</span>
                <span className="font-semibold text-slate-900">{stats.musrenbangdesPercent}%</span>
              </div>
            </div>

            {/* Step 4: Musdes Pengesahan */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-mono text-[10px] text-slate-600 font-bold">
                  4
                </span>
                <span className="font-medium text-slate-800">Musdes Pengesahan RKP & DU RKP</span>
              </div>
              <div className="flex items-center gap-2 font-mono tabular-nums">
                <span className="text-slate-600">
                  {stats.musdesPengesahanCount} / {stats.totalDesa}
                </span>
                <span className="text-slate-400">·</span>
                <span className="font-semibold text-slate-900">{stats.musdesPengesahanPercent}%</span>
              </div>
            </div>

            {/* Step 5: Penetapan Perdes RKP & APB */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-mono text-[10px] text-slate-600 font-bold">
                  5
                </span>
                <span className="font-medium text-slate-800">Perdes RKP Desa & Perdes APB Desa</span>
              </div>
              <div className="flex items-center gap-2 font-mono tabular-nums">
                <span className="text-slate-600">
                  {stats.perdesRkpCount} / {stats.totalDesa}
                </span>
                <span className="text-slate-400">·</span>
                <span className="font-semibold text-slate-900">{stats.perdesRkpPercent}%</span>
              </div>
            </div>

            {/* Step 6: Musdesus KDMP */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center font-mono text-[10px] text-amber-800 font-bold">
                  *
                </span>
                <span className="font-medium text-slate-800">Musdesus Pengembalian Pinjaman KDMP</span>
              </div>
              <div className="flex items-center gap-2 font-mono tabular-nums">
                <span className="text-slate-600">
                  {stats.kdmpCount} Desa ({stats.kdmpPercent}%)
                </span>
                <span className="text-slate-400">·</span>
                <span className="font-semibold text-amber-700">{formatRupiah(stats.totalDdKdmp)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quality and Discrepancy Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2">Validasi Data Partisipan</h3>
            <p className="text-xs text-slate-500 mb-4">
              Pemeriksaan kesesuaian jumlah partisipan gender (Lk + Pr) dengan rekap 14 unsur masyarakat.
            </p>

            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-600">Musyawarah Tercatat</span>
                  <span className="font-mono font-bold text-slate-900">
                    {stats.musdesPersiapanCount + stats.musrenbangdesCount + stats.musdesPengesahanCount} Sesi
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Selisih Gender vs Unsur</span>
                  <span
                    className={`font-mono font-bold ${
                      stats.balanceDiscrepancies === 0 ? 'text-emerald-600' : 'text-amber-600'
                    }`}
                  >
                    {stats.balanceDiscrepancies === 0 ? '0 (Valid 100%)' : `${stats.balanceDiscrepancies} perlu cek`}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-500 leading-relaxed">
                {stats.balanceDiscrepancies === 0 ? (
                  <div className="flex items-start gap-2 text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Semua data kehadiran pada modul input konsisten dan seimbang.</span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Terdapat {stats.balanceDiscrepancies} entri di mana total laki-laki & perempuan berbeda dengan rincian unsur.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Koreksi data dapat dilakukan langsung di menu Modul Input oleh Admin.
          </div>
        </div>
      </div>

      {/* Third Row: Demographic & Inclusivity Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gender Breakdown Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Demografi Partisipasi Gender</span>
            </h3>
            <span className="text-xs font-mono text-slate-500">
              Total: {stats.totalParticipants} Jiwa
            </span>
          </div>

          {/* Gender Ratio Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-blue-700 font-semibold">
                Laki-laki: {stats.totalLk} ({stats.malePercentage}%)
              </span>
              <span className="text-rose-700 font-semibold">
                Perempuan: {stats.totalPr} ({stats.femalePercentage}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 flex overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-500"
                style={{ width: `${stats.malePercentage}%` }}
                title={`Laki-laki: ${stats.totalLk}`}
              />
              <div
                className="bg-rose-500 h-full transition-all duration-500"
                style={{ width: `${stats.femalePercentage}%` }}
                title={`Perempuan: ${stats.totalPr}`}
              />
            </div>
            <p className="text-[11px] text-slate-500 pt-1">
              Keterwakilan perempuan di forum perencanaan Boalemo tercatat{' '}
              <strong className="text-slate-800">{stats.femalePercentage}%</strong> (target minimal afirmasi UU Desa 30%).
            </p>
          </div>
        </div>

        {/* Vulnerable Groups & Inclusivity */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center justify-between">
            <span>Partisipasi Kelompok Inklusif & Rentan</span>
            <span className="text-xs font-mono text-emerald-600 font-semibold">Pemberdayaan</span>
          </h3>

          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
              <div className="text-[11px] text-slate-500">A-RTM (Miskin)</div>
              <div className="text-lg font-bold font-mono text-slate-900 mt-1">
                {stats.totalArtm}
              </div>
              <div className="text-[10px] text-slate-400">partisipan</div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
              <div className="text-[11px] text-slate-500">Klp. Difabel</div>
              <div className="text-lg font-bold font-mono text-slate-900 mt-1">
                {stats.totalDifabel}
              </div>
              <div className="text-[10px] text-slate-400">partisipan</div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
              <div className="text-[11px] text-slate-500">Klp. Marginal</div>
              <div className="text-lg font-bold font-mono text-slate-900 mt-1">
                {stats.totalMarginal}
              </div>
              <div className="text-[10px] text-slate-400">partisipan</div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
              <div className="text-[11px] text-slate-500">Klp. Tani & Nelayan</div>
              <div className="text-lg font-bold font-mono text-slate-900 mt-1">
                {stats.totalTani + stats.totalNelayan}
              </div>
              <div className="text-[10px] text-slate-400">partisipan</div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
              <div className="text-[11px] text-slate-500">Pemuda Desa</div>
              <div className="text-lg font-bold font-mono text-slate-900 mt-1">
                {stats.totalPemuda}
              </div>
              <div className="text-[10px] text-slate-400">partisipan</div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center">
              <div className="text-[11px] text-slate-500">Kader Desa</div>
              <div className="text-lg font-bold font-mono text-slate-900 mt-1">
                {stats.totalKader}
              </div>
              <div className="text-[10px] text-slate-400">partisipan</div>
            </div>
          </div>
        </div>
      </div>

      {/* Fourth Row: Progres per Kecamatan Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Progres Kecamatan se-Kabupaten Boalemo
            </h3>
            <p className="text-xs text-slate-500">
              Perbandingan pelaksanaan Musdes dan partisipasi warga di 7 kecamatan
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">82 Desa</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Kecamatan</th>
                <th className="py-2.5 px-4 text-center">Jumlah Desa</th>
                <th className="py-2.5 px-4">Progres Musdes Persiapan</th>
                <th className="py-2.5 px-4 text-center">Tingkat Capaian</th>
                <th className="py-2.5 px-4 text-right">Total Kehadiran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {kecamatanData.map((kd) => (
                <tr key={kd.kecamatan} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900 flex items-center gap-1.5">
                    <span>{kd.kecamatan}</span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono tabular-nums text-slate-700">
                    {kd.total} Desa
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-28 sm:w-40 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${kd.progressPercent}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-slate-600 tabular-nums">
                        {kd.rkp}/{kd.total}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`font-mono text-xs font-bold ${
                        kd.progressPercent >= 80
                          ? 'text-emerald-700'
                          : kd.progressPercent >= 40
                          ? 'text-amber-700'
                          : 'text-slate-600'
                      }`}
                    >
                      {kd.progressPercent}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-800">
                    {kd.participants} jiwa
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
