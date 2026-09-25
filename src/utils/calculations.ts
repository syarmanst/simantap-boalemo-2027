import { ParticipantElements, ForumSession, KdmpSession, VillagePlanRecord } from '../types';

export const emptyUnsur = (): ParticipantElements => ({
  pemdes: null,
  bpd: null,
  rtRw: null,
  artm: null,
  pemuda: null,
  klpTani: null,
  klpNelayan: null,
  klpDifabel: null,
  klpMarginal: null,
  tokohAdat: null,
  tokohAgama: null,
  kaderDesa: null,
  peninjau: null,
  klpLainnya: null,
});

export const emptySession = (): ForumSession => ({
  tanggal: '',
  lk: null,
  pr: null,
  unsur: emptyUnsur(),
  keterangan: '',
});

export const emptyKdmpSession = (): KdmpSession => ({
  ...emptySession(),
  melaksanakan: null,
});

export const calcGenderTotal = (lk: number | null | undefined, pr: number | null | undefined): number => {
  const l = Number(lk) || 0;
  const p = Number(pr) || 0;
  return l + p;
};

export const calcUnsurTotal = (unsur: ParticipantElements | undefined): number => {
  if (!unsur) return 0;
  return (
    (Number(unsur.pemdes) || 0) +
    (Number(unsur.bpd) || 0) +
    (Number(unsur.rtRw) || 0) +
    (Number(unsur.artm) || 0) +
    (Number(unsur.pemuda) || 0) +
    (Number(unsur.klpTani) || 0) +
    (Number(unsur.klpNelayan) || 0) +
    (Number(unsur.klpDifabel) || 0) +
    (Number(unsur.klpMarginal) || 0) +
    (Number(unsur.tokohAdat) || 0) +
    (Number(unsur.tokohAgama) || 0) +
    (Number(unsur.kaderDesa) || 0) +
    (Number(unsur.peninjau) || 0) +
    (Number(unsur.klpLainnya) || 0)
  );
};

export const calcSelisih = (
  lk: number | null | undefined,
  pr: number | null | undefined,
  unsur: ParticipantElements | undefined
): { selisih: number; isValid: boolean; hasData: boolean } => {
  const totalGender = calcGenderTotal(lk, pr);
  const totalUnsur = calcUnsurTotal(unsur);
  const hasData = totalGender > 0 || totalUnsur > 0;
  const selisih = totalGender - totalUnsur;
  return {
    selisih,
    isValid: hasData ? selisih === 0 : true,
    hasData,
  };
};

export const formatRupiah = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(Number(val))) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(val));
};

export const parseRawNumber = (val: any): number | null => {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const cleaned = String(val).replace(/[^0-9.-]/g, '').trim();
  if (!cleaned || cleaned === '-' || cleaned === '') return null;
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
};

export const parseRawString = (val: any): string => {
  if (val === null || val === undefined) return '';
  const s = String(val).trim();
  if (s === '-' || s === 'Column 1') return '';
  return s;
};

export const calculateVillageProgress = (village: VillagePlanRecord): { percent: number; completedStages: number; totalStages: number } => {
  let completed = 0;
  const total = 7;

  // 1. RPJM
  if (village.rpjmDesTgl) completed++;
  // 2. Musdes Persiapan
  if (village.musdesPersiapan.tanggal) completed++;
  // 3. Pencermatan
  if (village.pencermatanRpjmTgl) completed++;
  // 4. Musrenbangdes
  if (village.musrenbangdes.tanggal) completed++;
  // 5. Musdes Pengesahan
  if (village.musdesPengesahan.tanggal) completed++;
  // 6. Perdes RKP / APB
  if (village.perdesRkpTgl || village.perdesApbTgl || village.perdesApbNomor) completed++;
  // 7. Musdesus KDMP
  if (village.musdesusKdmp.melaksanakan !== null || village.musdesusKdmp.tanggal) completed++;

  const percent = Math.round((completed / total) * 100);
  return { percent, completedStages: completed, totalStages: total };
};
