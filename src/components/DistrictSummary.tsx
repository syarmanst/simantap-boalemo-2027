import React, { useState, useMemo, useEffect } from 'react';
import { VillagePlanRecord, UserSession } from '../types';
import { calcGenderTotal, calculateVillageProgress } from '../utils/calculations';
import { Building2, ChevronRight, CheckCircle2, Clock } from 'lucide-react';

interface DistrictSummaryProps {
  villages: VillagePlanRecord[];
  onSelectVillage: (idDesa: string) => void;
  session?: UserSession;
}

export const DistrictSummary: React.FC<DistrictSummaryProps> = ({
  villages,
  onSelectVillage,
  session,
}) => {
  const [selectedKec, setSelectedKec] = useState<string>(() => {
    if (session?.role === 'admin_kecamatan' && session.kecamatanName) {
      return session.kecamatanName;
    }
    return 'Paguyaman';
  });

  useEffect(() => {
    if (session?.role === 'admin_kecamatan' && session.kecamatanName) {
      setSelectedKec(session.kecamatanName);
    }
  }, [session?.role, session?.kecamatanName]);

  // Aggregated data per district
  const districts = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        villages: VillagePlanRecord[];
        rpjmCount: number;
        musdesPersiapanCount: number;
        musrenbangCount: number;
        musdesPengesahanCount: number;
        perdesApbCount: number;
        totalParticipants: number;
      }
    >();

    villages.forEach((v) => {
      const kec = v.kecamatan || 'Lainnya';
      if (!map.has(kec)) {
        map.set(kec, {
          name: kec,
          villages: [],
          rpjmCount: 0,
          musdesPersiapanCount: 0,
          musrenbangCount: 0,
          musdesPengesahanCount: 0,
          perdesApbCount: 0,
          totalParticipants: 0,
        });
      }
      const d = map.get(kec)!;
      d.villages.push(v);
      if (v.rpjmDesTgl) d.rpjmCount++;
      if (v.musdesPersiapan.tanggal) d.musdesPersiapanCount++;
      if (v.musrenbangdes.tanggal) d.musrenbangCount++;
      if (v.musdesPengesahan.tanggal) d.musdesPengesahanCount++;
      if (v.perdesApbNomor || v.perdesApbTgl) d.perdesApbCount++;

      d.totalParticipants +=
        calcGenderTotal(v.musdesPersiapan.lk, v.musdesPersiapan.pr) +
        calcGenderTotal(v.musrenbangdes.lk, v.musrenbangdes.pr) +
        calcGenderTotal(v.musdesPengesahan.lk, v.musdesPengesahan.pr);
    });

    return Array.from(map.values());
  }, [villages]);

  const activeDistrict = districts.find((d) => d.name === selectedKec) || districts[0];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Rekapitulasi Wilayah Kecamatan
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Monitoring perbandingan capaian tahapan perencanaan antar 7 kecamatan di Kabupaten Boalemo
        </p>
      </div>

      {/* District Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {districts.map((d) => {
          const isSelected = d.name === selectedKec;
          const total = d.villages.length;
          const percent = Math.round((d.musdesPersiapanCount / total) * 100);

          return (
            <button
              key={d.name}
              onClick={() => setSelectedKec(d.name)}
              className={`flex flex-col text-left p-3 rounded-xl border transition-all shrink-0 min-w-[150px] ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="text-xs font-bold truncate">{d.name}</span>
              <div className="flex items-baseline justify-between mt-1 text-[11px]">
                <span className={isSelected ? 'text-slate-300' : 'text-slate-500'}>
                  {total} Desa
                </span>
                <span
                  className={`font-mono font-bold ${
                    isSelected ? 'text-emerald-400' : 'text-emerald-600'
                  }`}
                >
                  {percent}%
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active District Detail View */}
      {activeDistrict && (
        <div className="space-y-5">
          {/* Summary Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-slate-500 text-[11px] block">Jumlah Desa</span>
              <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
                {activeDistrict.villages.length} Desa
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-slate-500 text-[11px] block">RPJMDes Terbit</span>
              <span className="text-xl font-bold font-mono text-emerald-600 mt-1 block">
                {activeDistrict.rpjmCount} Desa
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-slate-500 text-[11px] block">Musdes Persiapan</span>
              <span className="text-xl font-bold font-mono text-sky-600 mt-1 block">
                {activeDistrict.musdesPersiapanCount} Desa
              </span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-slate-500 text-[11px] block">Total Partisipan Tercatat</span>
              <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
                {activeDistrict.totalParticipants} Jiwa
              </span>
            </div>
          </div>

          {/* Villages Grid within Selected District */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Daftar Desa di Kecamatan {activeDistrict.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Klik pada nama desa untuk menginput atau meninjau data
                </p>
              </div>
              <span className="text-xs font-mono font-medium text-slate-500">
                {activeDistrict.villages.length} Desa
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {activeDistrict.villages.map((v) => {
                const prog = calculateVillageProgress(v);
                return (
                  <div
                    key={v.idDesa}
                    onClick={() => onSelectVillage(v.idDesa)}
                    className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-mono text-xs font-bold shrink-0 group-hover:bg-emerald-100 group-hover:text-emerald-800 transition-colors">
                        {v.no}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 group-hover:text-emerald-700 transition-colors">
                            Desa {v.desa}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {v.idDesa}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span>RPJM: {v.rpjmDesTgl || 'Belum'}</span>
                          <span className="text-slate-300">·</span>
                          <span>Musdes: {v.musdesPersiapan.tanggal || 'Belum'}</span>
                          <span className="text-slate-300">·</span>
                          <span>Musrenbang: {v.musrenbangdes.tanggal || 'Belum'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-auto w-full sm:w-auto">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-600 h-1.5 rounded-full"
                            style={{ width: `${prog.percent}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs font-semibold text-slate-700 tabular-nums">
                          {prog.percent}%
                        </span>
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
