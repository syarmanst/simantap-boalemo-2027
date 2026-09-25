import { VillagePlanRecord } from '../types';
import { calcGenderTotal, calcUnsurTotal, calcSelisih, parseRawNumber, parseRawString } from '../utils/calculations';

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  sheetName: string;
  autoSync: boolean;
  lastSyncTime?: string;
  lastSyncAction?: 'pull' | 'push' | 'auto';
  lastSyncStatus?: 'success' | 'error';
  lastError?: string;
}

export const SHEETS_CONFIG_KEY = 'boalemo_google_sheets_config';

// Permanent Official Google Spreadsheet Database for Boalemo
export const DESIGNATED_SPREADSHEET_ID = '1ETuI256p8T5x-4WFVHB-FKonUkY8di9DroLkpAndF1w';
export const DESIGNATED_SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${DESIGNATED_SPREADSHEET_ID}/edit`;
export const DESIGNATED_SHEET_NAME = 'DATA_DESA';
export const DESIGNATED_SPREADSHEET_TITLE = 'Database Perencanaan Desa Boalemo 2027';

export const getDefaultDatabaseConfig = (): GoogleSheetsConfig => ({
  spreadsheetId: DESIGNATED_SPREADSHEET_ID,
  spreadsheetTitle: DESIGNATED_SPREADSHEET_TITLE,
  spreadsheetUrl: DESIGNATED_SPREADSHEET_URL,
  sheetName: DESIGNATED_SHEET_NAME,
  autoSync: true,
  lastSyncStatus: 'success',
});

/**
 * Convert 1-indexed column number to Excel/Sheets column letters (1 -> A, 26 -> Z, 27 -> AA, 105 -> DA, 107 -> DC)
 */
export const getColumnLetter = (colIndex: number): string => {
  let temp = colIndex;
  let letter = '';
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - 1) / 26);
  }
  return letter || 'A';
};

/**
 * Extract clean Google Spreadsheet ID from any full URL or bare ID
 */
export const extractSpreadsheetId = (input: string): string => {
  if (!input) return '';
  let cleaned = input.trim();
  const match = cleaned.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // Remove protocol and host if pasted
  cleaned = cleaned.replace(/^https?:\/\/docs\.google\.com\/spreadsheets\/d\//, '');
  cleaned = cleaned.split('/')[0].split('?')[0].split('#')[0].trim();
  return cleaned;
};

/**
 * Ensure the target sheet exists and has sufficient row and column count before writing
 */
export const ensureDataDesaSheet = async (
  accessToken: string,
  spreadsheetId: string,
  targetSheetName = 'DATA_DESA',
  minRows = 120,
  minCols = 130
): Promise<{ sheetId: number; title: string }> => {
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets(properties(sheetId,title,gridProperties))`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!metaRes.ok) {
    const err = await metaRes.json().catch(() => ({}));
    throw new Error(
      err.error?.message ||
        `Gagal mengakses spreadsheet (${metaRes.status}). Pastikan akun Google Anda memiliki akses Editor pada spreadsheet tersebut.`
    );
  }

  const meta = await metaRes.json();
  const sheets: any[] = meta.sheets || [];
  let foundSheet = sheets.find(
    (s: any) => (s.properties?.title || '').trim().toLowerCase() === targetSheetName.toLowerCase()
  );

  // If targetSheetName does not exist, add it
  if (!foundSheet) {
    const addRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: targetSheetName,
                  gridProperties: {
                    rowCount: Math.max(minRows, 150),
                    columnCount: Math.max(minCols, 130),
                    frozenRowCount: 3,
                    frozenColumnCount: 9,
                  },
                },
              },
            },
          ],
        }),
      }
    );

    if (addRes.ok) {
      const addData = await addRes.json();
      const newSheetProps = addData.replies?.[0]?.addSheet?.properties;
      return {
        sheetId: newSheetProps?.sheetId ?? 0,
        title: newSheetProps?.title || targetSheetName,
      };
    } else {
      // If addSheet failed (e.g. permission or duplicate), fallback to the first sheet in spreadsheet
      foundSheet = sheets[0];
    }
  }

  if (foundSheet) {
    const sheetId = foundSheet.properties?.sheetId ?? 0;
    const currentTitle = foundSheet.properties?.title || targetSheetName;
    const currentCols = foundSheet.properties?.gridProperties?.columnCount || 0;
    const currentRows = foundSheet.properties?.gridProperties?.rowCount || 0;

    // Check if we need to expand columns or rows
    if (currentCols < minCols || currentRows < minRows) {
      const updateRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                updateSheetProperties: {
                  properties: {
                    sheetId,
                    gridProperties: {
                      rowCount: Math.max(currentRows, minRows),
                      columnCount: Math.max(currentCols, minCols),
                      frozenRowCount: 3,
                      frozenColumnCount: 9,
                    },
                  },
                  fields: 'gridProperties',
                },
              },
            ],
          }),
        }
      );

      if (!updateRes.ok) {
        const err = await updateRes.json().catch(() => ({}));
        console.warn('Grid update warning:', err);
      }
    }

    return {
      sheetId,
      title: currentTitle,
    };
  }

  return { sheetId: 0, title: targetSheetName };
};

/**
 * Build 3 header rows for DATA_DESA tab in Google Sheets
 */
export const getSpreadsheetHeaderRows = (): string[][] => {
  const headerRow1 = [
    'No.', 'IdProv', 'Provinsi', 'IdKab', 'Kabupaten', 'IdKec', 'Kecamatan', 'IdDesa', 'Desa',
    'Perdes RPJM Desa terbit tgl',
    // Musdes Persiapan (11..31)
    'Musyawarah Desa (Persiapan dan Pembetukan Tim Penyusun RKPDes)', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    // Pencermatan (32)
    'Pencermatan Ulang RPJM Desa',
    // Musrenbangdes (33..53)
    'Musyawarah Perencanaan Pembangunan Desa Pembahasan Rancangan RKP Desa', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    // Musdes Pengesahan (54..74)
    'Musyawarah Desa Pembahasan dan Pengesahan RKP Desa dan DU RKP Desa', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    // Perdes RKP, RAPB, APB (75..79)
    'Perdes RKP Desa diterbitkan tgl',
    'Penyusunan RAPB Desa tgl',
    'Perdes APB Desa (tgl terbit dan no Perdes)', '', '',
    // Musdesus KDMP (80..101)
    'Musdesus untuk Persetujuan Dukungan Pengembalian Pinjaman KDMP', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    // Perubahan & Nilai DD (102..106)
    'Perdes RKP Desa Perubahan diterbitkan tgl',
    'Perdes APB Desa Perubahan (tgl terbit dan no Perdes)', '',
    'Nilai DD yang disetujui dalam BA Musdesus (Rp.)',
    'Keterangan Umum',
    'Terakhir Diperbarui'
  ];

  const headerRow2 = [
    '', '', '', '', '', '', '', '', '',
    'dd/mm/yyyy',
    // Musdes Persiapan
    'dd/mm/yyyy', 'Jumlah Partisipan', '', '', 'Unsur Partisipan', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Total Partisipan by unsur', 'Cek Selisih Gender - Unsur', 'Keterangan',
    // Pencermatan
    'dd/mm/yyyy',
    // Musrenbangdes
    'dd/mm/yyyy', 'Jumlah Partisipan', '', '', 'Unsur Partisipan', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Total Partisipan by unsur', 'Cek Selisih Gender - Unsur', 'Keterangan',
    // Musdes Pengesahan
    'dd/mm/yyyy', 'Jumlah Partisipan', '', '', 'Unsur Partisipan', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Total Partisipan by unsur', 'Cek Selisih Gender - Unsur', 'Keterangan',
    // Perdes RKP, RAPB, APB
    'dd/mm/yyyy',
    'dd/mm/yyyy',
    'dd/mm/yyyy', 'Nomor Peraturan Desa', 'Tahun Peraturan Desa',
    // Musdesus KDMP
    '1 = Ya, 0 = Tidak', 'dd/mm/yyyy', 'Jumlah Partisipan', '', '', 'Unsur Partisipan', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Total Partisipan by unsur', 'Cek Selisih Gender - Unsur', 'Keterangan',
    // Perubahan
    'dd/mm/yyyy',
    'dd/mm/yyyy', 'Nomor Peraturan Desa',
    'Rupiah',
    'Keterangan',
    'Timestamp'
  ];

  const headerRow3 = [
    'No.', 'IdProv', 'Provinsi', 'IdKab', 'Kabupaten', 'IdKec', 'Kecamatan', 'IdDesa', 'Desa',
    'RPJMDes Terbit',
    // Musdes Persiapan:
    'Tgl Musdes', 'Lk', 'Pr', 'Jml', 'Pemdes', 'BPD', 'RT/RW', 'A-RTM', 'Pemuda', 'Klp Tani', 'Klp Nelayan', 'Klp Difabel', 'Klp Marginal', 'Tokoh Adat', 'Tokoh Agama', 'Kader Desa', 'Peninjau', 'Klp Lainnya', 'Total Unsur', 'Selisih', 'Ket',
    // Pencermatan:
    'Tgl Pencermatan',
    // Musrenbangdes:
    'Tgl Musrenbangdes', 'Lk', 'Pr', 'Jml', 'Pemdes', 'BPD', 'RT/RW', 'A-RTM', 'Pemuda', 'Klp Tani', 'Klp Nelayan', 'Klp Difabel', 'Klp Marginal', 'Tokoh Adat', 'Tokoh Agama', 'Kader Desa', 'Peninjau', 'Klp Lainnya', 'Total Unsur', 'Selisih', 'Ket',
    // Musdes Pengesahan:
    'Tgl Pengesahan', 'Lk', 'Pr', 'Jml', 'Pemdes', 'BPD', 'RT/RW', 'A-RTM', 'Pemuda', 'Klp Tani', 'Klp Nelayan', 'Klp Difabel', 'Klp Marginal', 'Tokoh Adat', 'Tokoh Agama', 'Kader Desa', 'Peninjau', 'Klp Lainnya', 'Total Unsur', 'Selisih', 'Ket',
    // Perdes RKP & APB:
    'Tgl Perdes RKP', 'Tgl RAPBDes', 'Tgl Perdes APB', 'No Perdes APB', 'Tahun APB',
    // Musdesus KDMP:
    'Status (1/0)', 'Tgl Musdesus', 'Lk', 'Pr', 'Jml', 'Pemdes', 'BPD', 'RT/RW', 'A-RTM', 'Pemuda', 'Klp Tani', 'Klp Nelayan', 'Klp Difabel', 'Klp Marginal', 'Tokoh Masyarakat', 'Tokoh Agama', 'Kader Desa', 'Peninjau', 'Klp Lainnya', 'Total Unsur', 'Selisih', 'Ket',
    // Perubahan:
    'Tgl Perdes RKP Perubahan', 'Tgl Perdes APB Perubahan', 'No Perdes APB Perubahan', 'Nilai DD KDMP (Rp)', 'Keterangan Umum',
    'Waktu Simpan'
  ];

  return [headerRow1, headerRow2, headerRow3];
};

/**
 * Format a single VillagePlanRecord into a row array for Google Sheets
 */
export const villageToRowArray = (v: VillagePlanRecord): any[] => {
  // Musdes Persiapan
  const mpL = v.musdesPersiapan.lk ?? '';
  const mpP = v.musdesPersiapan.pr ?? '';
  const mpJml = calcGenderTotal(v.musdesPersiapan.lk, v.musdesPersiapan.pr) || '';
  const mpTotalUnsur = calcUnsurTotal(v.musdesPersiapan.unsur) || '';
  const mpSelisih = calcSelisih(v.musdesPersiapan.lk, v.musdesPersiapan.pr, v.musdesPersiapan.unsur);
  const mpSelisihVal = mpSelisih.hasData ? (mpSelisih.selisih === 0 ? '-' : mpSelisih.selisih) : '';

  // Musrenbangdes
  const mbL = v.musrenbangdes.lk ?? '';
  const mbP = v.musrenbangdes.pr ?? '';
  const mbJml = calcGenderTotal(v.musrenbangdes.lk, v.musrenbangdes.pr) || '';
  const mbTotalUnsur = calcUnsurTotal(v.musrenbangdes.unsur) || '';
  const mbSelisih = calcSelisih(v.musrenbangdes.lk, v.musrenbangdes.pr, v.musrenbangdes.unsur);
  const mbSelisihVal = mbSelisih.hasData ? (mbSelisih.selisih === 0 ? '-' : mbSelisih.selisih) : '';

  // Musdes Pengesahan
  const mgL = v.musdesPengesahan.lk ?? '';
  const mgP = v.musdesPengesahan.pr ?? '';
  const mgJml = calcGenderTotal(v.musdesPengesahan.lk, v.musdesPengesahan.pr) || '';
  const mgTotalUnsur = calcUnsurTotal(v.musdesPengesahan.unsur) || '';
  const mgSelisih = calcSelisih(v.musdesPengesahan.lk, v.musdesPengesahan.pr, v.musdesPengesahan.unsur);
  const mgSelisihVal = mgSelisih.hasData ? (mgSelisih.selisih === 0 ? '-' : mgSelisih.selisih) : '';

  // Musdesus KDMP
  const kdMel = v.musdesusKdmp.melaksanakan !== null ? v.musdesusKdmp.melaksanakan : '';
  const kdL = v.musdesusKdmp.lk ?? '';
  const kdP = v.musdesusKdmp.pr ?? '';
  const kdJml = calcGenderTotal(v.musdesusKdmp.lk, v.musdesusKdmp.pr) || '';
  const kdTotalUnsur = calcUnsurTotal(v.musdesusKdmp.unsur) || '';
  const kdSelisih = calcSelisih(v.musdesusKdmp.lk, v.musdesusKdmp.pr, v.musdesusKdmp.unsur);
  const kdSelisihVal = kdSelisih.hasData ? (kdSelisih.selisih === 0 ? '-' : kdSelisih.selisih) : '';

  return [
    v.no,
    v.idProv,
    v.provinsi,
    v.idKab,
    v.kabupaten,
    v.idKec,
    v.kecamatan,
    v.idDesa,
    v.desa,
    v.rpjmDesTgl,
    // Musdes Persiapan
    v.musdesPersiapan.tanggal,
    mpL,
    mpP,
    mpJml,
    v.musdesPersiapan.unsur.pemdes ?? '',
    v.musdesPersiapan.unsur.bpd ?? '',
    v.musdesPersiapan.unsur.rtRw ?? '',
    v.musdesPersiapan.unsur.artm ?? '',
    v.musdesPersiapan.unsur.pemuda ?? '',
    v.musdesPersiapan.unsur.klpTani ?? '',
    v.musdesPersiapan.unsur.klpNelayan ?? '',
    v.musdesPersiapan.unsur.klpDifabel ?? '',
    v.musdesPersiapan.unsur.klpMarginal ?? '',
    v.musdesPersiapan.unsur.tokohAdat ?? '',
    v.musdesPersiapan.unsur.tokohAgama ?? '',
    v.musdesPersiapan.unsur.kaderDesa ?? '',
    v.musdesPersiapan.unsur.peninjau ?? '',
    v.musdesPersiapan.unsur.klpLainnya ?? '',
    mpTotalUnsur,
    mpSelisihVal,
    v.musdesPersiapan.keterangan,
    // Pencermatan
    v.pencermatanRpjmTgl,
    // Musrenbangdes
    v.musrenbangdes.tanggal,
    mbL,
    mbP,
    mbJml,
    v.musrenbangdes.unsur.pemdes ?? '',
    v.musrenbangdes.unsur.bpd ?? '',
    v.musrenbangdes.unsur.rtRw ?? '',
    v.musrenbangdes.unsur.artm ?? '',
    v.musrenbangdes.unsur.pemuda ?? '',
    v.musrenbangdes.unsur.klpTani ?? '',
    v.musrenbangdes.unsur.klpNelayan ?? '',
    v.musrenbangdes.unsur.klpDifabel ?? '',
    v.musrenbangdes.unsur.klpMarginal ?? '',
    v.musrenbangdes.unsur.tokohAdat ?? '',
    v.musrenbangdes.unsur.tokohAgama ?? '',
    v.musrenbangdes.unsur.kaderDesa ?? '',
    v.musrenbangdes.unsur.peninjau ?? '',
    v.musrenbangdes.unsur.klpLainnya ?? '',
    mbTotalUnsur,
    mbSelisihVal,
    v.musrenbangdes.keterangan,
    // Musdes Pengesahan
    v.musdesPengesahan.tanggal,
    mgL,
    mgP,
    mgJml,
    v.musdesPengesahan.unsur.pemdes ?? '',
    v.musdesPengesahan.unsur.bpd ?? '',
    v.musdesPengesahan.unsur.rtRw ?? '',
    v.musdesPengesahan.unsur.artm ?? '',
    v.musdesPengesahan.unsur.pemuda ?? '',
    v.musdesPengesahan.unsur.klpTani ?? '',
    v.musdesPengesahan.unsur.klpNelayan ?? '',
    v.musdesPengesahan.unsur.klpDifabel ?? '',
    v.musdesPengesahan.unsur.klpMarginal ?? '',
    v.musdesPengesahan.unsur.tokohAdat ?? '',
    v.musdesPengesahan.unsur.tokohAgama ?? '',
    v.musdesPengesahan.unsur.kaderDesa ?? '',
    v.musdesPengesahan.unsur.peninjau ?? '',
    v.musdesPengesahan.unsur.klpLainnya ?? '',
    mgTotalUnsur,
    mgSelisihVal,
    v.musdesPengesahan.keterangan,
    // Perdes RKP, RAPB, APB
    v.perdesRkpTgl,
    v.rapbDesTgl,
    v.perdesApbTgl,
    v.perdesApbNomor,
    v.perdesApbTahun,
    // Musdesus KDMP
    kdMel,
    v.musdesusKdmp.tanggal,
    kdL,
    kdP,
    kdJml,
    v.musdesusKdmp.unsur.pemdes ?? '',
    v.musdesusKdmp.unsur.bpd ?? '',
    v.musdesusKdmp.unsur.rtRw ?? '',
    v.musdesusKdmp.unsur.artm ?? '',
    v.musdesusKdmp.unsur.pemuda ?? '',
    v.musdesusKdmp.unsur.klpTani ?? '',
    v.musdesusKdmp.unsur.klpNelayan ?? '',
    v.musdesusKdmp.unsur.klpDifabel ?? '',
    v.musdesusKdmp.unsur.klpMarginal ?? '',
    v.musdesusKdmp.unsur.tokohAdat ?? '',
    v.musdesusKdmp.unsur.tokohAgama ?? '',
    v.musdesusKdmp.unsur.kaderDesa ?? '',
    v.musdesusKdmp.unsur.peninjau ?? '',
    v.musdesusKdmp.unsur.klpLainnya ?? '',
    kdTotalUnsur,
    kdSelisihVal,
    v.musdesusKdmp.keterangan,
    // Perubahan & Nilai DD
    v.perdesRkpPerubahanTgl,
    v.perdesApbPerubahanTgl,
    v.perdesApbPerubahanNomor,
    v.nilaiDdKdmp ?? '',
    v.keteranganUmum,
    v.updatedAt || new Date().toISOString(),
  ];
};

/**
 * Parse rows returned from Google Sheets back into VillagePlanRecord array
 */
export const parseRowsToVillages = (
  rawRows: any[][],
  currentVillages: VillagePlanRecord[]
): { updatedVillages: VillagePlanRecord[]; matchedCount: number } => {
  if (!rawRows || rawRows.length < 4) {
    return { updatedVillages: currentVillages, matchedCount: 0 };
  }

  // Detect header rows. Data usually starts at index 3 (Row 4 in Sheets)
  let dataStartIndex = 3;
  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;
    const firstCol = String(row[0] || '').trim();
    const idDesaCol = String(row[7] || '').trim();
    if (firstCol === '1' && (idDesaCol.startsWith('75') || row.length >= 8)) {
      dataStartIndex = i;
      break;
    }
  }

  const villageMap = new Map<string, VillagePlanRecord>();
  currentVillages.forEach((v) => {
    villageMap.set(v.idDesa, JSON.parse(JSON.stringify(v)));
    villageMap.set(v.desa.trim().toLowerCase(), JSON.parse(JSON.stringify(v)));
  });

  let matchedCount = 0;

  for (let r = dataStartIndex; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length < 8) continue;

    const idDesa = parseRawString(row[7]);
    const desaName = parseRawString(row[8]).toLowerCase();

    let target = villageMap.get(idDesa) || villageMap.get(desaName);
    if (target) {
      matchedCount++;
      if (row[9] !== undefined) target.rpjmDesTgl = parseRawString(row[9]);

      // Musdes Persiapan
      if (row[10] !== undefined) target.musdesPersiapan.tanggal = parseRawString(row[10]);
      if (row[11] !== undefined) target.musdesPersiapan.lk = parseRawNumber(row[11]);
      if (row[12] !== undefined) target.musdesPersiapan.pr = parseRawNumber(row[12]);
      if (row[14] !== undefined) target.musdesPersiapan.unsur.pemdes = parseRawNumber(row[14]);
      if (row[15] !== undefined) target.musdesPersiapan.unsur.bpd = parseRawNumber(row[15]);
      if (row[16] !== undefined) target.musdesPersiapan.unsur.rtRw = parseRawNumber(row[16]);
      if (row[17] !== undefined) target.musdesPersiapan.unsur.artm = parseRawNumber(row[17]);
      if (row[18] !== undefined) target.musdesPersiapan.unsur.pemuda = parseRawNumber(row[18]);
      if (row[19] !== undefined) target.musdesPersiapan.unsur.klpTani = parseRawNumber(row[19]);
      if (row[20] !== undefined) target.musdesPersiapan.unsur.klpNelayan = parseRawNumber(row[20]);
      if (row[21] !== undefined) target.musdesPersiapan.unsur.klpDifabel = parseRawNumber(row[21]);
      if (row[22] !== undefined) target.musdesPersiapan.unsur.klpMarginal = parseRawNumber(row[22]);
      if (row[23] !== undefined) target.musdesPersiapan.unsur.tokohAdat = parseRawNumber(row[23]);
      if (row[24] !== undefined) target.musdesPersiapan.unsur.tokohAgama = parseRawNumber(row[24]);
      if (row[25] !== undefined) target.musdesPersiapan.unsur.kaderDesa = parseRawNumber(row[25]);
      if (row[26] !== undefined) target.musdesPersiapan.unsur.peninjau = parseRawNumber(row[26]);
      if (row[27] !== undefined) target.musdesPersiapan.unsur.klpLainnya = parseRawNumber(row[27]);
      if (row[30] !== undefined) target.musdesPersiapan.keterangan = parseRawString(row[30]);

      // Pencermatan
      if (row[31] !== undefined) target.pencermatanRpjmTgl = parseRawString(row[31]);

      // Musrenbangdes
      if (row[32] !== undefined) target.musrenbangdes.tanggal = parseRawString(row[32]);
      if (row[33] !== undefined) target.musrenbangdes.lk = parseRawNumber(row[33]);
      if (row[34] !== undefined) target.musrenbangdes.pr = parseRawNumber(row[34]);
      if (row[36] !== undefined) target.musrenbangdes.unsur.pemdes = parseRawNumber(row[36]);
      if (row[37] !== undefined) target.musrenbangdes.unsur.bpd = parseRawNumber(row[37]);
      if (row[38] !== undefined) target.musrenbangdes.unsur.rtRw = parseRawNumber(row[38]);
      if (row[39] !== undefined) target.musrenbangdes.unsur.artm = parseRawNumber(row[39]);
      if (row[40] !== undefined) target.musrenbangdes.unsur.pemuda = parseRawNumber(row[40]);
      if (row[41] !== undefined) target.musrenbangdes.unsur.klpTani = parseRawNumber(row[41]);
      if (row[42] !== undefined) target.musrenbangdes.unsur.klpNelayan = parseRawNumber(row[42]);
      if (row[43] !== undefined) target.musrenbangdes.unsur.klpDifabel = parseRawNumber(row[43]);
      if (row[44] !== undefined) target.musrenbangdes.unsur.klpMarginal = parseRawNumber(row[44]);
      if (row[45] !== undefined) target.musrenbangdes.unsur.tokohAdat = parseRawNumber(row[45]);
      if (row[46] !== undefined) target.musrenbangdes.unsur.tokohAgama = parseRawNumber(row[46]);
      if (row[47] !== undefined) target.musrenbangdes.unsur.kaderDesa = parseRawNumber(row[47]);
      if (row[48] !== undefined) target.musrenbangdes.unsur.peninjau = parseRawNumber(row[48]);
      if (row[49] !== undefined) target.musrenbangdes.unsur.klpLainnya = parseRawNumber(row[49]);
      if (row[52] !== undefined) target.musrenbangdes.keterangan = parseRawString(row[52]);

      // Musdes Pengesahan
      if (row[53] !== undefined) target.musdesPengesahan.tanggal = parseRawString(row[53]);
      if (row[54] !== undefined) target.musdesPengesahan.lk = parseRawNumber(row[54]);
      if (row[55] !== undefined) target.musdesPengesahan.pr = parseRawNumber(row[55]);
      if (row[57] !== undefined) target.musdesPengesahan.unsur.pemdes = parseRawNumber(row[57]);
      if (row[58] !== undefined) target.musdesPengesahan.unsur.bpd = parseRawNumber(row[58]);
      if (row[59] !== undefined) target.musdesPengesahan.unsur.rtRw = parseRawNumber(row[59]);
      if (row[60] !== undefined) target.musdesPengesahan.unsur.artm = parseRawNumber(row[60]);
      if (row[61] !== undefined) target.musdesPengesahan.unsur.pemuda = parseRawNumber(row[61]);
      if (row[62] !== undefined) target.musdesPengesahan.unsur.klpTani = parseRawNumber(row[62]);
      if (row[63] !== undefined) target.musdesPengesahan.unsur.klpNelayan = parseRawNumber(row[63]);
      if (row[64] !== undefined) target.musdesPengesahan.unsur.klpDifabel = parseRawNumber(row[64]);
      if (row[65] !== undefined) target.musdesPengesahan.unsur.klpMarginal = parseRawNumber(row[65]);
      if (row[66] !== undefined) target.musdesPengesahan.unsur.tokohAdat = parseRawNumber(row[66]);
      if (row[67] !== undefined) target.musdesPengesahan.unsur.tokohAgama = parseRawNumber(row[67]);
      if (row[68] !== undefined) target.musdesPengesahan.unsur.kaderDesa = parseRawNumber(row[68]);
      if (row[69] !== undefined) target.musdesPengesahan.unsur.peninjau = parseRawNumber(row[69]);
      if (row[70] !== undefined) target.musdesPengesahan.unsur.klpLainnya = parseRawNumber(row[70]);
      if (row[73] !== undefined) target.musdesPengesahan.keterangan = parseRawString(row[73]);

      // Perdes RKP, RAPB, APB
      if (row[74] !== undefined) target.perdesRkpTgl = parseRawString(row[74]);
      if (row[75] !== undefined) target.rapbDesTgl = parseRawString(row[75]);
      if (row[76] !== undefined) target.perdesApbTgl = parseRawString(row[76]);
      if (row[77] !== undefined) target.perdesApbNomor = parseRawString(row[77]);
      if (row[78] !== undefined) target.perdesApbTahun = parseRawString(row[78]);

      // Musdesus KDMP
      if (row[79] !== undefined) target.musdesusKdmp.melaksanakan = parseRawNumber(row[79]);
      if (row[80] !== undefined) target.musdesusKdmp.tanggal = parseRawString(row[80]);
      if (row[81] !== undefined) target.musdesusKdmp.lk = parseRawNumber(row[81]);
      if (row[82] !== undefined) target.musdesusKdmp.pr = parseRawNumber(row[82]);
      if (row[84] !== undefined) target.musdesusKdmp.unsur.pemdes = parseRawNumber(row[84]);
      if (row[85] !== undefined) target.musdesusKdmp.unsur.bpd = parseRawNumber(row[85]);
      if (row[86] !== undefined) target.musdesusKdmp.unsur.rtRw = parseRawNumber(row[86]);
      if (row[87] !== undefined) target.musdesusKdmp.unsur.artm = parseRawNumber(row[87]);
      if (row[88] !== undefined) target.musdesusKdmp.unsur.pemuda = parseRawNumber(row[88]);
      if (row[89] !== undefined) target.musdesusKdmp.unsur.klpTani = parseRawNumber(row[89]);
      if (row[90] !== undefined) target.musdesusKdmp.unsur.klpNelayan = parseRawNumber(row[90]);
      if (row[91] !== undefined) target.musdesusKdmp.unsur.klpDifabel = parseRawNumber(row[91]);
      if (row[92] !== undefined) target.musdesusKdmp.unsur.klpMarginal = parseRawNumber(row[92]);
      if (row[93] !== undefined) target.musdesusKdmp.unsur.tokohAdat = parseRawNumber(row[93]);
      if (row[94] !== undefined) target.musdesusKdmp.unsur.tokohAgama = parseRawNumber(row[94]);
      if (row[95] !== undefined) target.musdesusKdmp.unsur.kaderDesa = parseRawNumber(row[95]);
      if (row[96] !== undefined) target.musdesusKdmp.unsur.peninjau = parseRawNumber(row[96]);
      if (row[97] !== undefined) target.musdesusKdmp.unsur.klpLainnya = parseRawNumber(row[97]);
      if (row[100] !== undefined) target.musdesusKdmp.keterangan = parseRawString(row[100]);

      // Perubahan
      if (row[101] !== undefined) target.perdesRkpPerubahanTgl = parseRawString(row[101]);
      if (row[102] !== undefined) target.perdesApbPerubahanTgl = parseRawString(row[102]);
      if (row[103] !== undefined) target.perdesApbPerubahanNomor = parseRawString(row[103]);
      if (row[104] !== undefined) target.nilaiDdKdmp = parseRawNumber(row[104]);
      if (row[105] !== undefined) target.keteranganUmum = parseRawString(row[105]);

      target.updatedAt = new Date().toISOString();
      target.updatedBy = 'Sinkron Google Sheets';
    }
  }

  const finalVillages = currentVillages.map((v) => villageMap.get(v.idDesa) || v);
  return { updatedVillages: finalVillages, matchedCount };
};

/**
 * Check and get metadata of a Google Spreadsheet
 */
export const getSpreadsheetMetadata = async (
  accessToken: string,
  spreadsheetId: string
): Promise<{ title: string; sheetNames: string[] }> => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=properties.title,sheets.properties.title`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gagal mengakses spreadsheet (${res.status})`);
  }

  const data = await res.json();
  const sheetNames = (data.sheets || []).map((s: any) => s.properties?.title || '');
  return {
    title: data.properties?.title || 'Untitled Spreadsheet',
    sheetNames,
  };
};

/**
 * Create a new Google Spreadsheet database in user's Google Drive
 */
export const createDatabaseSpreadsheet = async (
  accessToken: string,
  villages: VillagePlanRecord[],
  title = 'Database Perencanaan Desa Boalemo 2027'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; title: string; sheetName: string }> => {
  const sheetName = 'DATA_DESA';
  const headerRows = getSpreadsheetHeaderRows();
  const villageRows = villages.map(villageToRowArray);
  const allRows = [...headerRows, ...villageRows];

  const maxCols = Math.max(...allRows.map((r) => r.length));
  const lastCol = getColumnLetter(maxCols);

  // 1. Create Spreadsheet
  const createUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  const requestBody = {
    properties: {
      title,
    },
    sheets: [
      {
        properties: {
          title: sheetName,
          gridProperties: {
            frozenRowCount: 3,
            frozenColumnCount: 9,
            rowCount: Math.max(120, allRows.length + 20),
            columnCount: Math.max(125, maxCols + 10),
          },
        },
      },
      {
        properties: {
          title: 'INFO_DATABASE',
          gridProperties: {
            rowCount: 20,
            columnCount: 5,
          },
        },
      },
    ],
  };

  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Gagal membuat Google Spreadsheet baru di Google Drive');
  }

  const createdData = await createRes.json();
  const spreadsheetId = createdData.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Populate DATA_DESA values (range dynamically computed to avoid column truncation)
  const range = `'${sheetName}'!A1:${lastCol}${allRows.length}`;
  const populateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

  const popRes = await fetch(populateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values: allRows,
    }),
  });

  if (!popRes.ok) {
    const err = await popRes.json().catch(() => ({}));
    console.warn('Failed to populate rows on creation:', err);
  }

  // 3. Populate INFO_DATABASE
  const infoRange = `'INFO_DATABASE'!A1:B6`;
  const infoUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(infoRange)}?valueInputOption=USER_ENTERED`;
  await fetch(infoUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range: infoRange,
      majorDimension: 'ROWS',
      values: [
        ['Parameter', 'Keterangan'],
        ['Nama Database', title],
        ['Waktu Pembuatan', new Date().toLocaleString('id-ID')],
        ['Total Desa', villages.length],
        ['Kabupaten', 'Boalemo (Gorontalo)'],
        ['Status Sinkronisasi', 'Aktif sebagai Basis Data Aplikasi'],
      ],
    }),
  }).catch(() => {});

  return {
    spreadsheetId,
    spreadsheetUrl,
    title,
    sheetName,
  };
};

/**
 * Fetch all villages data from Google Sheets
 */
export const fetchVillagesFromSheets = async (
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  currentVillages: VillagePlanRecord[]
): Promise<{ villages: VillagePlanRecord[]; count: number }> => {
  // Fetch up to DZ (column 130) to ensure all columns (including 105..107 DA, DB, DC) are captured
  const range = `'${sheetName}'!A1:DZ150`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?majorDimension=ROWS`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Gagal membaca data dari Google Spreadsheet');
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];

  const { updatedVillages, matchedCount } = parseRowsToVillages(rows, currentVillages);
  return { villages: updatedVillages, count: matchedCount };
};

/**
 * Push all villages data to Google Sheets (Full Database Sync)
 */
export const pushAllVillagesToSheets = async (
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  villages: VillagePlanRecord[]
): Promise<string> => {
  const headerRows = getSpreadsheetHeaderRows();
  const villageRows = villages.map(villageToRowArray);
  const allRows = [...headerRows, ...villageRows];
  const maxCols = Math.max(...allRows.map((r) => r.length));
  const lastCol = getColumnLetter(maxCols);

  // Guarantee target sheet exists with sufficient rows and columns (minimum 130 cols)
  const targetSheet = await ensureDataDesaSheet(
    accessToken,
    spreadsheetId,
    sheetName || 'DATA_DESA',
    allRows.length + 20,
    maxCols + 10
  );
  const actualSheetName = targetSheet.title;

  const range = `'${actualSheetName}'!A1:${lastCol}${allRows.length}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values: allRows,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err.error?.message ||
        `Gagal menyimpan data ke Google Spreadsheet (${res.status}). Pastikan spreadsheet memiliki izin Edit.`
    );
  }

  // Update INFO_DATABASE timestamp if accessible
  try {
    const infoRange = `'INFO_DATABASE'!A1:B3`;
    const infoUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(infoRange)}?valueInputOption=USER_ENTERED`;
    await fetch(infoUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: infoRange,
        majorDimension: 'ROWS',
        values: [
          ['Database Perencanaan Desa Boalemo 2027', 'Aktif'],
          ['Total Desa Terdata', villages.length],
          ['Waktu Sinkronisasi Terakhir', new Date().toLocaleString('id-ID')],
        ],
      }),
    });
  } catch (_) {
    // Non-critical if INFO_DATABASE sheet does not exist
  }

  return actualSheetName;
};

/**
 * Update a single village row in Google Sheets
 */
export const updateSingleVillageInSheets = async (
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  village: VillagePlanRecord
): Promise<boolean> => {
  try {
    const targetSheet = await ensureDataDesaSheet(
      accessToken,
      spreadsheetId,
      sheetName || 'DATA_DESA',
      120,
      120
    );
    const actualSheetName = targetSheet.title;

    // 1. Fetch column H (IdDesa) to find the exact row number
    const idColRange = `'${actualSheetName}'!H1:H150`;
    const idColUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(idColRange)}?majorDimension=COLUMNS`;

    const colRes = await fetch(idColUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    let rowIndex = -1;
    if (colRes.ok) {
      const colData = await colRes.json();
      const idList: string[] = (colData.values && colData.values[0]) || [];

      for (let i = 0; i < idList.length; i++) {
        if (String(idList[i] || '').trim() === village.idDesa) {
          rowIndex = i + 1; // 1-indexed row number in Sheets
          break;
        }
      }
    }

    if (rowIndex === -1) {
      // If not found by ID, default to header offset + village no
      rowIndex = village.no + 3;
    }

    const singleRowValues = [villageToRowArray(village)];
    const maxCols = singleRowValues[0].length;
    const lastCol = getColumnLetter(maxCols);

    const rowRange = `'${actualSheetName}'!A${rowIndex}:${lastCol}${rowIndex}`;
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rowRange)}?valueInputOption=USER_ENTERED`;

    const res = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: rowRange,
        majorDimension: 'ROWS',
        values: singleRowValues,
      }),
    });

    return res.ok;
  } catch (e) {
    console.warn('updateSingleVillageInSheets error:', e);
    return false;
  }
};

/**
 * List user's spreadsheets from Google Drive using Drive API v3
 */
export const listGoogleDriveSpreadsheets = async (
  accessToken: string
): Promise<Array<{ id: string; name: string; modifiedTime: string }>> => {
  const q = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const fields = encodeURIComponent('files(id, name, modifiedTime, webViewLink)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=modifiedTime%20desc&pageSize=15`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    modifiedTime: f.modifiedTime,
  }));
};
