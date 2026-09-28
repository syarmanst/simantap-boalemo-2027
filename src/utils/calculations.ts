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

/**
 * Membersihkan format tanggal dan membuang time/timestamp (seperti T00:00:00.000Z).
 * Menghasilkan tanggal bersih dalam format dd/mm/yyyy.
 */
export const cleanDateString = (val: any): string => {
  if (val === null || val === undefined) return '';

  // Jika berupa JavaScript Date object
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const d = String(val.getDate()).padStart(2, '0');
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const y = val.getFullYear();
    return `${d}/${m}/${y}`;
  }

  let str = String(val).trim();
  if (!str || str === '-' || str === 'Column 1') return '';

  // 1. Format ISO: 2026-08-26T00:00:00.000Z atau 2026-08-26 00:00:00 atau 2026-08-26
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${day}/${month}/${year}`;
  }

  // 2. Format YYYY/MM/DD dengan atau tanpa jam
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[T\s].*)?$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${day}/${month}/${year}`;
  }

  // 3. Format DD/MM/YYYY atau DD-MM-YYYY atau DD/MM/YY (dengan atau tanpa jam / time)
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:[T\s,].*)?$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    let year = dmyMatch[3];
    if (year.length === 2) {
      year = `20${year}`;
    }
    return `${day}/${month}/${year}`;
  }

  // 4. Format DD NamaBulan YYYY (misal: "10 Juni 2026", "26 Juni 2026")
  const textMonthMatch = str.match(/^(\d{1,2})[\s\-]+([a-zA-Z]+)[\s\-]+(\d{2,4})(?:[T\s,].*)?$/);
  if (textMonthMatch) {
    const months: Record<string, string> = {
      jan: '01', januari: '01', january: '01',
      feb: '02', februari: '02', february: '02',
      mar: '03', maret: '03', march: '03',
      apr: '04', april: '04',
      mei: '05', may: '05',
      jun: '06', juni: '06', june: '06',
      jul: '07', juli: '07', july: '07',
      agu: '08', agt: '08', agustus: '08', aug: '08', august: '08',
      sep: '09', september: '09',
      okt: '10', oktober: '10', oct: '10', october: '10',
      nov: '11', november: '11',
      des: '12', desember: '12', dec: '12', december: '12',
    };
    const day = textMonthMatch[1].padStart(2, '0');
    const mStr = textMonthMatch[2].toLowerCase();
    let year = textMonthMatch[3];
    if (year.length === 2) {
      year = `20${year}`;
    }
    if (months[mStr]) {
      return `${day}/${months[mStr]}/${year}`;
    }
  }

  // 5. Jika terdapat pemisah T (ISO timestamp) pada teks tanggal lainnya
  if (str.includes('T') && str.match(/\d{4}/)) {
    str = str.split('T')[0].trim();
  }

  // 5. Buang keterangan jam di akhir string, seperti " 00:00:00" atau ", 00:00:00"
  str = str.replace(/[,\s]+\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/i, '').trim();

  // 6. Buang akhiran .000Z atau Z
  str = str.replace(/\.000Z$/i, '').replace(/Z$/i, '').trim();

  return str;
};

/**
 * Sanitasi seluruh kolom tanggal pada sebuah record desa agar bersih dari timestamp/keterangan jam
 */
export const sanitizeVillageDates = (village: VillagePlanRecord): VillagePlanRecord => {
  return {
    ...village,
    rpjmDesTgl: cleanDateString(village.rpjmDesTgl),
    pencermatanRpjmTgl: cleanDateString(village.pencermatanRpjmTgl),
    perdesRkpTgl: cleanDateString(village.perdesRkpTgl),
    rapbDesTgl: cleanDateString(village.rapbDesTgl),
    perdesApbTgl: cleanDateString(village.perdesApbTgl),
    perdesRkpPerubahanTgl: cleanDateString(village.perdesRkpPerubahanTgl),
    perdesApbPerubahanTgl: cleanDateString(village.perdesApbPerubahanTgl),
    musdesPersiapan: {
      ...village.musdesPersiapan,
      tanggal: cleanDateString(village.musdesPersiapan.tanggal),
    },
    musrenbangdes: {
      ...village.musrenbangdes,
      tanggal: cleanDateString(village.musrenbangdes.tanggal),
    },
    musdesPengesahan: {
      ...village.musdesPengesahan,
      tanggal: cleanDateString(village.musdesPengesahan.tanggal),
    },
    musdesusKdmp: {
      ...village.musdesusKdmp,
      tanggal: cleanDateString(village.musdesusKdmp.tanggal),
    },
  };
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
