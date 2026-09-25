import * as XLSX from 'xlsx';
import { VillagePlanRecord } from '../types';
import { calcGenderTotal, calcUnsurTotal, calcSelisih, parseRawNumber, parseRawString } from './calculations';

export const exportToExcel = (villages: VillagePlanRecord[], filename = 'Pemantauan_Perencanaan_Desa_2027_Kab_Boalemo.xlsx') => {
  // Build header rows mimicking the official Google Spreadsheet template
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
    'Tgl Perdes RKP Perubahan', 'Tgl Perdes APB Perubahan', 'No Perdes APB Perubahan', 'Nilai DD KDMP (Rp)', 'Keterangan Umum'
  ];

  const dataRows = villages.map((v) => {
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
    ];
  });

  const fullSheetData = [headerRow1, headerRow2, headerRow3, ...dataRows];
  const worksheet = XLSX.utils.aoa_to_sheet(fullSheetData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 6 },  // No
    { wch: 8 },  // IdProv
    { wch: 12 }, // Provinsi
    { wch: 8 },  // IdKab
    { wch: 12 }, // Kabupaten
    { wch: 10 }, // IdKec
    { wch: 16 }, // Kecamatan
    { wch: 14 }, // IdDesa
    { wch: 18 }, // Desa
    { wch: 14 }, // RPJMDes
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pemantauan Perencanaan 2027');
  XLSX.writeFile(workbook, filename);
};

export const parseUploadedExcel = async (
  file: File,
  currentVillages: VillagePlanRecord[]
): Promise<{ updatedVillages: VillagePlanRecord[]; matchedCount: number; errors: string[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

        if (rawRows.length < 2) {
          return resolve({ updatedVillages: currentVillages, matchedCount: 0, errors: ['File kosong atau format tidak valid'] });
        }

        // Detect start row of data
        // Search for a row where column 0 or 1 is "1" or contains known subdistrict/village names
        let startRowIndex = 0;
        for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
          const row = rawRows[i];
          if (!row || row.length === 0) continue;
          const firstVal = String(row[0] || '').trim();
          const secondVal = String(row[1] || '').trim();
          const seventhVal = String(row[6] || '').trim();
          const eighthVal = String(row[8] || '').trim();

          if (
            (firstVal === '1' && (secondVal === '75' || seventhVal.toLowerCase().includes('paguyaman'))) ||
            firstVal === '7502012004' ||
            eighthVal.toLowerCase().includes('bongo')
          ) {
            startRowIndex = i;
            break;
          }
          // If row starts with number 1 and has at least 8 elements
          if (firstVal === '1' && row.length >= 9) {
            startRowIndex = i;
            break;
          }
        }

        const villageMap = new Map<string, VillagePlanRecord>();
        currentVillages.forEach((v) => {
          villageMap.set(v.idDesa, { ...v });
          villageMap.set(v.desa.trim().toLowerCase(), { ...v });
        });

        let matchedCount = 0;
        const errors: string[] = [];

        for (let r = startRowIndex; r < rawRows.length; r++) {
          const row = rawRows[r];
          if (!row || row.length < 9) continue;

          // Attempt to find village
          const idDesa = parseRawString(row[7]);
          const desaName = parseRawString(row[8]).toLowerCase();

          let targetRecord: VillagePlanRecord | undefined;
          if (idDesa && villageMap.has(idDesa)) {
            targetRecord = villageMap.get(idDesa);
          } else if (desaName && villageMap.has(desaName)) {
            targetRecord = villageMap.get(desaName);
          }

          if (targetRecord) {
            matchedCount++;
            // Update fields from row
            if (row[9] !== undefined) targetRecord.rpjmDesTgl = parseRawString(row[9]);

            // Musdes Persiapan (10..30)
            if (row[10] !== undefined) targetRecord.musdesPersiapan.tanggal = parseRawString(row[10]);
            if (row[11] !== undefined) targetRecord.musdesPersiapan.lk = parseRawNumber(row[11]);
            if (row[12] !== undefined) targetRecord.musdesPersiapan.pr = parseRawNumber(row[12]);
            if (row[14] !== undefined) targetRecord.musdesPersiapan.unsur.pemdes = parseRawNumber(row[14]);
            if (row[15] !== undefined) targetRecord.musdesPersiapan.unsur.bpd = parseRawNumber(row[15]);
            if (row[16] !== undefined) targetRecord.musdesPersiapan.unsur.rtRw = parseRawNumber(row[16]);
            if (row[17] !== undefined) targetRecord.musdesPersiapan.unsur.artm = parseRawNumber(row[17]);
            if (row[18] !== undefined) targetRecord.musdesPersiapan.unsur.pemuda = parseRawNumber(row[18]);
            if (row[19] !== undefined) targetRecord.musdesPersiapan.unsur.klpTani = parseRawNumber(row[19]);
            if (row[20] !== undefined) targetRecord.musdesPersiapan.unsur.klpNelayan = parseRawNumber(row[20]);
            if (row[21] !== undefined) targetRecord.musdesPersiapan.unsur.klpDifabel = parseRawNumber(row[21]);
            if (row[22] !== undefined) targetRecord.musdesPersiapan.unsur.klpMarginal = parseRawNumber(row[22]);
            if (row[23] !== undefined) targetRecord.musdesPersiapan.unsur.tokohAdat = parseRawNumber(row[23]);
            if (row[24] !== undefined) targetRecord.musdesPersiapan.unsur.tokohAgama = parseRawNumber(row[24]);
            if (row[25] !== undefined) targetRecord.musdesPersiapan.unsur.kaderDesa = parseRawNumber(row[25]);
            if (row[26] !== undefined) targetRecord.musdesPersiapan.unsur.peninjau = parseRawNumber(row[26]);
            if (row[27] !== undefined) targetRecord.musdesPersiapan.unsur.klpLainnya = parseRawNumber(row[27]);
            if (row[30] !== undefined) targetRecord.musdesPersiapan.keterangan = parseRawString(row[30]);

            // Pencermatan (31)
            if (row[31] !== undefined) targetRecord.pencermatanRpjmTgl = parseRawString(row[31]);

            // Musrenbangdes (32..52)
            if (row[32] !== undefined) targetRecord.musrenbangdes.tanggal = parseRawString(row[32]);
            if (row[33] !== undefined) targetRecord.musrenbangdes.lk = parseRawNumber(row[33]);
            if (row[34] !== undefined) targetRecord.musrenbangdes.pr = parseRawNumber(row[34]);
            if (row[36] !== undefined) targetRecord.musrenbangdes.unsur.pemdes = parseRawNumber(row[36]);
            if (row[37] !== undefined) targetRecord.musrenbangdes.unsur.bpd = parseRawNumber(row[37]);
            if (row[38] !== undefined) targetRecord.musrenbangdes.unsur.rtRw = parseRawNumber(row[38]);
            if (row[39] !== undefined) targetRecord.musrenbangdes.unsur.artm = parseRawNumber(row[39]);
            if (row[40] !== undefined) targetRecord.musrenbangdes.unsur.pemuda = parseRawNumber(row[40]);
            if (row[41] !== undefined) targetRecord.musrenbangdes.unsur.klpTani = parseRawNumber(row[41]);
            if (row[42] !== undefined) targetRecord.musrenbangdes.unsur.klpNelayan = parseRawNumber(row[42]);
            if (row[43] !== undefined) targetRecord.musrenbangdes.unsur.klpDifabel = parseRawNumber(row[43]);
            if (row[44] !== undefined) targetRecord.musrenbangdes.unsur.klpMarginal = parseRawNumber(row[44]);
            if (row[45] !== undefined) targetRecord.musrenbangdes.unsur.tokohAdat = parseRawNumber(row[45]);
            if (row[46] !== undefined) targetRecord.musrenbangdes.unsur.tokohAgama = parseRawNumber(row[46]);
            if (row[47] !== undefined) targetRecord.musrenbangdes.unsur.kaderDesa = parseRawNumber(row[47]);
            if (row[48] !== undefined) targetRecord.musrenbangdes.unsur.peninjau = parseRawNumber(row[48]);
            if (row[49] !== undefined) targetRecord.musrenbangdes.unsur.klpLainnya = parseRawNumber(row[49]);
            if (row[52] !== undefined) targetRecord.musrenbangdes.keterangan = parseRawString(row[52]);

            // Musdes Pengesahan (53..73)
            if (row[53] !== undefined) targetRecord.musdesPengesahan.tanggal = parseRawString(row[53]);
            if (row[54] !== undefined) targetRecord.musdesPengesahan.lk = parseRawNumber(row[54]);
            if (row[55] !== undefined) targetRecord.musdesPengesahan.pr = parseRawNumber(row[55]);
            if (row[57] !== undefined) targetRecord.musdesPengesahan.unsur.pemdes = parseRawNumber(row[57]);
            if (row[58] !== undefined) targetRecord.musdesPengesahan.unsur.bpd = parseRawNumber(row[58]);
            if (row[59] !== undefined) targetRecord.musdesPengesahan.unsur.rtRw = parseRawNumber(row[59]);
            if (row[60] !== undefined) targetRecord.musdesPengesahan.unsur.artm = parseRawNumber(row[60]);
            if (row[61] !== undefined) targetRecord.musdesPengesahan.unsur.pemuda = parseRawNumber(row[61]);
            if (row[62] !== undefined) targetRecord.musdesPengesahan.unsur.klpTani = parseRawNumber(row[62]);
            if (row[63] !== undefined) targetRecord.musdesPengesahan.unsur.klpNelayan = parseRawNumber(row[63]);
            if (row[64] !== undefined) targetRecord.musdesPengesahan.unsur.klpDifabel = parseRawNumber(row[64]);
            if (row[65] !== undefined) targetRecord.musdesPengesahan.unsur.klpMarginal = parseRawNumber(row[65]);
            if (row[66] !== undefined) targetRecord.musdesPengesahan.unsur.tokohAdat = parseRawNumber(row[66]);
            if (row[67] !== undefined) targetRecord.musdesPengesahan.unsur.tokohAgama = parseRawNumber(row[67]);
            if (row[68] !== undefined) targetRecord.musdesPengesahan.unsur.kaderDesa = parseRawNumber(row[68]);
            if (row[69] !== undefined) targetRecord.musdesPengesahan.unsur.peninjau = parseRawNumber(row[69]);
            if (row[70] !== undefined) targetRecord.musdesPengesahan.unsur.klpLainnya = parseRawNumber(row[70]);
            if (row[73] !== undefined) targetRecord.musdesPengesahan.keterangan = parseRawString(row[73]);

            // Perdes RKP, RAPB, APB (74..78)
            if (row[74] !== undefined) targetRecord.perdesRkpTgl = parseRawString(row[74]);
            if (row[75] !== undefined) targetRecord.rapbDesTgl = parseRawString(row[75]);
            if (row[76] !== undefined) targetRecord.perdesApbTgl = parseRawString(row[76]);
            if (row[77] !== undefined) targetRecord.perdesApbNomor = parseRawString(row[77]);
            if (row[78] !== undefined) targetRecord.perdesApbTahun = parseRawString(row[78]);

            // Musdesus KDMP (79..100)
            if (row[79] !== undefined) targetRecord.musdesusKdmp.melaksanakan = parseRawNumber(row[79]);
            if (row[80] !== undefined) targetRecord.musdesusKdmp.tanggal = parseRawString(row[80]);
            if (row[81] !== undefined) targetRecord.musdesusKdmp.lk = parseRawNumber(row[81]);
            if (row[82] !== undefined) targetRecord.musdesusKdmp.pr = parseRawNumber(row[82]);
            if (row[84] !== undefined) targetRecord.musdesusKdmp.unsur.pemdes = parseRawNumber(row[84]);
            if (row[85] !== undefined) targetRecord.musdesusKdmp.unsur.bpd = parseRawNumber(row[85]);
            if (row[86] !== undefined) targetRecord.musdesusKdmp.unsur.rtRw = parseRawNumber(row[86]);
            if (row[87] !== undefined) targetRecord.musdesusKdmp.unsur.artm = parseRawNumber(row[87]);
            if (row[88] !== undefined) targetRecord.musdesusKdmp.unsur.pemuda = parseRawNumber(row[88]);
            if (row[89] !== undefined) targetRecord.musdesusKdmp.unsur.klpTani = parseRawNumber(row[89]);
            if (row[90] !== undefined) targetRecord.musdesusKdmp.unsur.klpNelayan = parseRawNumber(row[90]);
            if (row[91] !== undefined) targetRecord.musdesusKdmp.unsur.klpDifabel = parseRawNumber(row[91]);
            if (row[92] !== undefined) targetRecord.musdesusKdmp.unsur.klpMarginal = parseRawNumber(row[92]);
            if (row[93] !== undefined) targetRecord.musdesusKdmp.unsur.tokohAdat = parseRawNumber(row[93]);
            if (row[94] !== undefined) targetRecord.musdesusKdmp.unsur.tokohAgama = parseRawNumber(row[94]);
            if (row[95] !== undefined) targetRecord.musdesusKdmp.unsur.kaderDesa = parseRawNumber(row[95]);
            if (row[96] !== undefined) targetRecord.musdesusKdmp.unsur.peninjau = parseRawNumber(row[96]);
            if (row[97] !== undefined) targetRecord.musdesusKdmp.unsur.klpLainnya = parseRawNumber(row[97]);
            if (row[100] !== undefined) targetRecord.musdesusKdmp.keterangan = parseRawString(row[100]);

            // Perubahan (101..105)
            if (row[101] !== undefined) targetRecord.perdesRkpPerubahanTgl = parseRawString(row[101]);
            if (row[102] !== undefined) targetRecord.perdesApbPerubahanTgl = parseRawString(row[102]);
            if (row[103] !== undefined) targetRecord.perdesApbPerubahanNomor = parseRawString(row[103]);
            if (row[104] !== undefined) targetRecord.nilaiDdKdmp = parseRawNumber(row[104]);
            if (row[105] !== undefined) targetRecord.keteranganUmum = parseRawString(row[105]);

            targetRecord.updatedAt = new Date().toISOString();
            targetRecord.updatedBy = 'Admin (Import Excel)';
          }
        }

        const finalResult = currentVillages.map((v) => villageMap.get(v.idDesa) || v);
        resolve({ updatedVillages: finalResult, matchedCount, errors });
      } catch (err: any) {
        resolve({ updatedVillages: currentVillages, matchedCount: 0, errors: [err.message || 'Gagal memproses file Excel'] });
      }
    };

    reader.onerror = () => {
      resolve({ updatedVillages: currentVillages, matchedCount: 0, errors: ['Gagal membaca file'] });
    };

    reader.readAsBinaryString(file);
  });
};
