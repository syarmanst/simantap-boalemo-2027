/**
 * EVIDENCE SERVICE (BUKTI FOTO & DOKUMEN PENDUKUNG HD)
 * 
 * Mengelola penyimpanan dan sinkronisasi otomatis bukti foto serta dokumen pendukung
 * langsung ke Google Spreadsheet pada sheet khusus: "BUKTI_DOKUMEN".
 * 
 * Fitur Utama:
 * 1. Format Bukti HD: Resolusi tinggi (HD / 2K) dengan target ukuran 1.2 - 2 MB.
 * 2. Link Download Langsung di Spreadsheet: Admin dapat langsung klik link di Google Sheets
 *    untuk mengunduh berkas HD secara instan tanpa hambatan akun Google.
 * 3. Sinkronisasi Lintas Perangkat: Dapat diakses otomatis dari browser, HP, laptop mana saja.
 */

import { EvidenceItem, ModuleKey, VillagePlanRecord } from '../types';
import { getAppsScriptUrl, DEFAULT_APPS_SCRIPT_URL } from './appsScriptDatabase';

export const EVIDENCE_SHEET_NAME = 'BUKTI_DOKUMEN';
export const EVIDENCE_STORAGE_KEY = 'boalemo_evidence_cache';

export const EVIDENCE_HEADERS = [
  'ID',
  'IdDesa',
  'Desa',
  'IdKec',
  'Kecamatan',
  'Modul',
  'NamaFile',
  'Tipe',
  'Ukuran',
  'FormatUkuran',
  'WaktuUpload',
  'Keterangan',
  'Link_Dokumen', // Kolom M: Link Download Langsung HD untuk Superadmin / Admin
  'Link_Lihat_Drive', // Kolom N: Link Preview / View Google Drive
  'Drive_File_ID', // Kolom O: File ID di Google Drive
  'DataUrl_Part1', // Kolom P: Data part 1 / thumbnail
  'DataUrl_Part2', // Kolom Q: Data part 2
  'UploadedBy', // Kolom R: Pengunggah
  'UpdatedAt', // Kolom S: Timestamp
];

/**
 * Format ukuran berkas ke satuan yang mudah dibaca (KB / MB)
 * Menampilkan penanda HD untuk ukuran dalam target 1.2 - 2 MB
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
  const str = val + ' ' + sizes[i];
  
  // Format HD jika berkas berada di kisaran 1.15 MB - 2.2 MB
  if (bytes >= 1.15 * 1024 * 1024 && bytes <= 2.2 * 1024 * 1024) {
    return `${str} (HD)`;
  }
  return str;
};

/**
 * Kompresi dan Optimasi Berkas Foto HD (Target Format: 1.2 - 2 MB)
 * Menyesuaikan foto kamera (12MP - 50MP) menjadi format High Definition (HD / 2K)
 * tajam dan jernih dengan ukuran teroptimasi 1.2 MB – 2.0 MB.
 * Menghasilkan:
 * - dataUrl: Full HD photo (~1.2 - 2.0 MB)
 * - thumbnailUrl: Lightweight thumbnail (~15-25 KB) untuk peramban cepat
 */
export const compressImageFile = async (
  file: File
): Promise<{ dataUrl: string; size: number; thumbnailUrl: string; isHd: boolean }> => {
  return new Promise((resolve) => {
    // Jika bukan gambar (misal PDF atau dokumen word), baca data langsung
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const raw = (e.target?.result as string) || '';
        resolve({ dataUrl: raw, size: file.size, thumbnailUrl: '', isHd: false });
      };
      reader.onerror = () => resolve({ dataUrl: '', size: 0, thumbnailUrl: '', isHd: false });
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Resolusi HD / 2K (max 2560px) agar teks berita acara, plang kegiatan, dan foto jernih
        const maxHdDim = 2560;
        if (width > maxHdDim || height > maxHdDim) {
          if (width > height) {
            height = Math.round((height * maxHdDim) / width);
            width = maxHdDim;
          } else {
            width = Math.round((width * maxHdDim) / height);
            height = maxHdDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const raw = (e.target?.result as string) || '';
          resolve({ dataUrl: raw, size: file.size, thumbnailUrl: raw, isHd: true });
          return;
        }

        // Gambar dengan filter kualitas tinggi
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Batas target ukuran 1.2 MB - 2.0 MB
        const MAX_BYTES = 2097152; // 2.0 MB
        const MIN_TARGET_BYTES = 1258291; // 1.2 MB

        // Mulai dengan kualitas HD 0.94
        let quality = 0.94;
        let hdDataUrl = canvas.toDataURL('image/jpeg', quality);
        let approxBytes = Math.round((hdDataUrl.length * 3) / 4);

        // Jika ukuran melebihi 2.0 MB, turunkan sedikit kualitas hingga <= 2.0 MB
        if (approxBytes > MAX_BYTES) {
          const qualitySteps = [0.91, 0.88, 0.85, 0.82, 0.78, 0.72];
          for (const q of qualitySteps) {
            hdDataUrl = canvas.toDataURL('image/jpeg', q);
            approxBytes = Math.round((hdDataUrl.length * 3) / 4);
            quality = q;
            if (approxBytes <= MAX_BYTES) break;
          }
        }

        // Jika resolusi tinggi namun ukuran masih di bawah 1.2 MB, naikkan ke 0.98 untuk detail maksimal
        if (approxBytes < MIN_TARGET_BYTES && (file.size > MIN_TARGET_BYTES || (img.width >= 1920 && img.height >= 1080))) {
          const maxQualityDataUrl = canvas.toDataURL('image/jpeg', 0.98);
          const maxQualityBytes = Math.round((maxQualityDataUrl.length * 3) / 4);
          if (maxQualityBytes <= MAX_BYTES) {
            hdDataUrl = maxQualityDataUrl;
            approxBytes = maxQualityBytes;
          }
        }

        // Buat Thumbnail ringan (360px) untuk kartu galeri dan pratinjau instan
        const thumbCanvas = document.createElement('canvas');
        const thumbMaxDim = 360;
        let thumbW = width;
        let thumbH = height;
        if (thumbW > thumbMaxDim || thumbH > thumbMaxDim) {
          if (thumbW > thumbH) {
            thumbH = Math.round((thumbH * thumbMaxDim) / thumbW);
            thumbW = thumbMaxDim;
          } else {
            thumbW = Math.round((thumbW * thumbMaxDim) / thumbH);
            thumbH = thumbMaxDim;
          }
        }
        thumbCanvas.width = thumbW;
        thumbCanvas.height = thumbH;
        const thumbCtx = thumbCanvas.getContext('2d');
        let thumbnailUrl = '';
        if (thumbCtx) {
          thumbCtx.imageSmoothingEnabled = true;
          thumbCtx.drawImage(img, 0, 0, thumbW, thumbH);
          thumbnailUrl = thumbCanvas.toDataURL('image/jpeg', 0.75);
        } else {
          thumbnailUrl = hdDataUrl;
        }

        resolve({
          dataUrl: hdDataUrl,
          size: approxBytes,
          thumbnailUrl,
          isHd: true,
        });
      };
      img.onerror = () => {
        resolve({ dataUrl: e.target?.result as string, size: file.size, thumbnailUrl: '', isHd: false });
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      resolve({ dataUrl: '', size: 0, thumbnailUrl: '', isHd: false });
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Memecah dataUrl menjadi dua bagian jika panjangnya melebihi 40.000 karakter
 * agar aman disimpan pada sel Google Spreadsheet (limit cell Google Sheets = 50.000 char).
 */
export const splitDataUrl = (dataUrl: string): { part1: string; part2: string } => {
  if (!dataUrl) return { part1: '', part2: '' };
  const CHUNK_SIZE = 40000;
  if (dataUrl.length <= CHUNK_SIZE) {
    return { part1: dataUrl, part2: '' };
  }
  return {
    part1: dataUrl.substring(0, CHUNK_SIZE),
    part2: dataUrl.substring(CHUNK_SIZE, CHUNK_SIZE * 2),
  };
};

/**
 * Konversi item bukti ke baris array Google Sheets
 */
export const evidenceToRow = (
  village: VillagePlanRecord,
  moduleKey: ModuleKey,
  item: EvidenceItem,
  uploadedBy = 'Petugas',
  scriptUrl: string = DEFAULT_APPS_SCRIPT_URL
): any[] => {
  const urlToUse = (scriptUrl || getAppsScriptUrl() || DEFAULT_APPS_SCRIPT_URL).trim();
  const driveId = item.driveFileId || '';
  const directDl = driveId
    ? `https://drive.usercontent.google.com/download?id=${driveId}&export=download`
    : (item.downloadUrl || `${urlToUse}?action=downloadEvidence&id=${item.id}`);
  const driveView = driveId
    ? `https://drive.google.com/file/d/${driveId}/view?usp=sharing`
    : (item.viewUrl || directDl);
  const { part1, part2 } = splitDataUrl(item.dataUrl);

  return [
    item.id,
    village.idDesa,
    village.desa,
    village.idKec,
    village.kecamatan,
    moduleKey,
    item.name,
    item.type,
    item.size,
    item.formattedSize || formatBytes(item.size),
    item.uploadedAt,
    item.caption || '',
    directDl, // Kolom M: Link Dokumen / Download Langsung HD untuk Superadmin & Admin
    driveView, // Kolom N: Link Lihat Drive
    driveId, // Kolom O: File ID di Google Drive
    part1,
    part2,
    uploadedBy,
    new Date().toISOString(),
  ];
};

/**
 * Konversi baris spreadsheet menjadi EvidenceItem
 * Kompatibel dengan format 16 kolom lama dan 19 kolom baru
 */
export const rowToEvidence = (row: any[]): { idDesa: string; moduleKey: ModuleKey; item: EvidenceItem } | null => {
  if (!row || row.length < 8) return null;
  const id = String(row[0] || '').trim();
  const idDesa = String(row[1] || '').trim();
  const moduleKey = String(row[5] || '').trim() as ModuleKey;
  const name = String(row[6] || '').trim();
  const type = (String(row[7] || 'document').toLowerCase() as 'image' | 'pdf' | 'document');
  const size = Number(row[8]) || 0;
  const formattedSize = String(row[9] || (size ? formatBytes(size) : '0 B')).trim();
  const uploadedAt = String(row[10] || '').trim();
  const caption = String(row[11] || '').trim();

  let downloadUrl = '';
  let viewUrl = '';
  let driveFileId = '';
  let dataUrl = '';

  const col12 = String(row[12] || '').trim();
  const col13 = String(row[13] || '').trim();
  const col14 = String(row[14] || '').trim();
  const col15 = String(row[15] || '').trim();
  const col16 = String(row[16] || '').trim();

  // Jika kolom 12 berisi Link Dokumen / Link Download (URL)
  if (col12.startsWith('http') || col12.startsWith('=HYPERLINK')) {
    downloadUrl = col12.startsWith('=HYPERLINK') ? (col12.match(/"([^"]+)"/)?.[1] || col12) : col12;
    viewUrl = col13.startsWith('=HYPERLINK') ? (col13.match(/"([^"]+)"/)?.[1] || col13) : col13;
    driveFileId = col14;

    // Jika driveFileId ada, pastikan downloadUrl mengarah ke direct download resmi Google Drive
    if (driveFileId && (!downloadUrl || downloadUrl.includes('action=downloadEvidence'))) {
      downloadUrl = `https://drive.usercontent.google.com/download?id=${driveFileId}&export=download`;
    }
    if (driveFileId && !viewUrl) {
      viewUrl = `https://drive.google.com/file/d/${driveFileId}/view?usp=sharing`;
    }

    if (col15.startsWith('data:') || col15.startsWith('http')) {
      dataUrl = col15 + col16;
    } else if (driveFileId && type === 'image') {
      dataUrl = `https://lh3.googleusercontent.com/d/${driveFileId}=s0`;
    } else {
      dataUrl = downloadUrl;
    }
  } else if (col12.startsWith('data:')) {
    // Format lama: kolom 12 berisi dataUrl langsung
    dataUrl = col12 + col13;
    downloadUrl = `${getAppsScriptUrl()}?action=downloadEvidence&id=${id}`;
    viewUrl = downloadUrl;
  } else {
    dataUrl = col15 ? col15 + col16 : col12;
    downloadUrl = `${getAppsScriptUrl()}?action=downloadEvidence&id=${id}`;
    viewUrl = downloadUrl;
  }

  if (!id || !idDesa || !moduleKey) return null;

  return {
    idDesa,
    moduleKey,
    item: {
      id,
      name: name || 'Berkas Bukti',
      type: type === 'image' || type === 'pdf' ? type : 'document',
      size,
      formattedSize,
      uploadedAt,
      caption,
      dataUrl,
      thumbnailUrl: dataUrl,
      downloadUrl: downloadUrl || `${getAppsScriptUrl()}?action=downloadEvidence&id=${id}`,
      viewUrl: viewUrl || downloadUrl,
      driveFileId,
    },
  };
};

/**
 * Tarik seluruh data bukti dari sheet BUKTI_DOKUMEN di Google Spreadsheet
 * Dapat diakses dari peramban atau perangkat manapun tanpa login Google
 */
export const fetchEvidenceFromCloud = async (
  scriptUrl: string = DEFAULT_APPS_SCRIPT_URL
): Promise<{ success: boolean; evidenceMap: Map<string, Partial<Record<ModuleKey, EvidenceItem[]>>>; totalCount: number }> => {
  const urlToUse = (scriptUrl || getAppsScriptUrl() || DEFAULT_APPS_SCRIPT_URL).trim();
  const evidenceMap = new Map<string, Partial<Record<ModuleKey, EvidenceItem[]>>>();

  try {
    const endpoint = `${urlToUse}?action=getData&sheet=${EVIDENCE_SHEET_NAME}&t=${Date.now()}`;
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      return { success: false, evidenceMap, totalCount: 0 };
    }

    const data = await res.json().catch(() => null);
    if (!data || data.status === 'error' || !Array.isArray(data.values) || data.values.length <= 1) {
      return { success: true, evidenceMap, totalCount: 0 };
    }

    let totalCount = 0;
    const rows: any[][] = data.values;
    // Baris pertama (index 0) adalah header
    for (let i = 1; i < rows.length; i++) {
      const parsed = rowToEvidence(rows[i]);
      if (parsed && !isDeletedEvidence(parsed.item.id)) {
        totalCount++;
        const currentVillageEv = evidenceMap.get(parsed.idDesa) || {};
        const modItems = currentVillageEv[parsed.moduleKey] || [];
        
        // Cek duplikasi berdasarkan ID
        if (!modItems.some((it) => it.id === parsed.item.id)) {
          modItems.push(parsed.item);
        }
        currentVillageEv[parsed.moduleKey] = modItems;
        evidenceMap.set(parsed.idDesa, currentVillageEv);
      }
    }

    return { success: true, evidenceMap, totalCount };
  } catch (err) {
    console.warn('Gagal menarik bukti dari cloud Google Spreadsheet:', err);
    return { success: false, evidenceMap, totalCount: 0 };
  }
};

/**
 * Simpan atau perbarui sebuah bukti ke sheet BUKTI_DOKUMEN di Google Spreadsheet secara otomatis
 * Menyediakan link download langsung dan integrasi format HD 1.2 - 2 MB
 */
export const saveEvidenceToCloud = async (
  village: VillagePlanRecord,
  moduleKey: ModuleKey,
  item: EvidenceItem,
  uploadedBy = 'Petugas',
  scriptUrl: string = DEFAULT_APPS_SCRIPT_URL
): Promise<boolean> => {
  const urlToUse = (scriptUrl || getAppsScriptUrl() || DEFAULT_APPS_SCRIPT_URL).trim();
  if (!urlToUse) return false;

  const { part1, part2 } = splitDataUrl(item.dataUrl);
  const directDl = item.driveFileId
    ? `https://drive.usercontent.google.com/download?id=${item.driveFileId}&export=download`
    : (item.downloadUrl || `${urlToUse}?action=downloadEvidence&id=${item.id}`);

  const payload = {
    action: 'saveEvidence',
    sheetName: EVIDENCE_SHEET_NAME,
    id: item.id,
    idDesa: village.idDesa,
    desa: village.desa,
    idKec: village.idKec,
    kecamatan: village.kecamatan,
    moduleKey,
    name: item.name,
    type: item.type,
    size: item.size,
    formattedSize: item.formattedSize || formatBytes(item.size),
    uploadedAt: item.uploadedAt,
    caption: item.caption || '',
    downloadUrl: directDl,
    viewUrl: item.viewUrl || directDl,
    driveFileId: item.driveFileId || '',
    dataUrl: item.dataUrl,
    thumbnailUrl: item.thumbnailUrl || '',
    dataUrl_part1: part1,
    dataUrl_part2: part2,
    uploadedBy,
    updatedAt: new Date().toISOString(),
  };

  // 1. Coba via POST
  try {
    const res = await fetch(urlToUse, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.downloadUrl) {
        item.downloadUrl = data.downloadUrl;
        if (data.viewUrl) item.viewUrl = data.viewUrl;
        if (data.driveFileId) item.driveFileId = data.driveFileId;
      }
      return true;
    }
  } catch (err) {
    console.warn('POST saveEvidence gagal, mencoba fallback GET:', err);
  }

  // 2. Fallback via GET parameter (jika browser memblokir POST)
  try {
    const fallbackUrl = `${urlToUse}?action=saveEvidence&id=${encodeURIComponent(item.id)}&idDesa=${encodeURIComponent(village.idDesa)}&desa=${encodeURIComponent(village.desa)}&idKec=${encodeURIComponent(village.idKec)}&kecamatan=${encodeURIComponent(village.kecamatan)}&moduleKey=${encodeURIComponent(moduleKey)}&name=${encodeURIComponent(item.name)}&type=${encodeURIComponent(item.type)}&size=${encodeURIComponent(item.size)}&uploadedAt=${encodeURIComponent(item.uploadedAt)}&caption=${encodeURIComponent(item.caption || '')}&uploadedBy=${encodeURIComponent(uploadedBy)}&downloadUrl=${encodeURIComponent(directDl)}&t=${Date.now()}`;
    const resGet = await fetch(fallbackUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    return resGet.ok;
  } catch (errGet) {
    console.warn('Fallback GET saveEvidence gagal:', errGet);
    return false;
  }
};

/**
 * Pelacak berkas yang telah dihapus agar tidak pernah bangkit kembali dari cache atau cloud
 */
export const DELETED_EVIDENCE_KEY = 'boalemo_deleted_evidence_ids';

export const getDeletedEvidenceIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_EVIDENCE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch (e) {}
  return new Set();
};

export const recordDeletedEvidenceId = (id: string) => {
  try {
    const set = getDeletedEvidenceIds();
    set.add(id);
    localStorage.setItem(DELETED_EVIDENCE_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {}
};

export const isDeletedEvidence = (id: string): boolean => {
  return getDeletedEvidenceIds().has(id);
};

export const removeEvidenceFromCache = (idDesa: string, moduleKey: ModuleKey, evidenceId: string) => {
  try {
    recordDeletedEvidenceId(evidenceId);
    const saved = localStorage.getItem(EVIDENCE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed[idDesa] && parsed[idDesa][moduleKey]) {
        parsed[idDesa][moduleKey] = parsed[idDesa][moduleKey].filter((it: EvidenceItem) => it.id !== evidenceId);
        localStorage.setItem(EVIDENCE_STORAGE_KEY, JSON.stringify(parsed));
      }
    }
  } catch (e) {
    console.warn('Gagal menghapus bukti dari cache localStorage:', e);
  }
};

/**
 * Hapus bukti dari sheet BUKTI_DOKUMEN di Google Spreadsheet dan Google Drive
 */
export const deleteEvidenceFromCloud = async (
  evidenceId: string,
  driveFileId?: string,
  scriptUrl: string = DEFAULT_APPS_SCRIPT_URL
): Promise<boolean> => {
  // Catat langsung ID berkas yang dihapus ke storage
  recordDeletedEvidenceId(evidenceId);
  const urlToUse = (scriptUrl || getAppsScriptUrl() || DEFAULT_APPS_SCRIPT_URL).trim();
  if (!urlToUse || !evidenceId) return false;

  const payload = {
    action: 'deleteEvidence',
    sheetName: EVIDENCE_SHEET_NAME,
    id: evidenceId,
    driveFileId: driveFileId || '',
  };

  try {
    const res = await fetch(urlToUse, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) return true;
  } catch (err) {
    console.warn('POST deleteEvidence gagal, mencoba GET fallback:', err);
  }

  // Fallback GET
  try {
    const fallbackUrl = `${urlToUse}?action=deleteEvidence&id=${encodeURIComponent(evidenceId)}&driveFileId=${encodeURIComponent(driveFileId || '')}&sheetName=${EVIDENCE_SHEET_NAME}&t=${Date.now()}`;
    const resGet = await fetch(fallbackUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    return resGet.ok;
  } catch (errGet) {
    return false;
  }
};

/**
 * Menyimpan cache data bukti ke localStorage secara aman tanpa melebihi kuota 5MB
 */
export const saveEvidenceCache = (
  evidenceMap: Map<string, Partial<Record<ModuleKey, EvidenceItem[]>>>
) => {
  try {
    const serialized: Record<string, Partial<Record<ModuleKey, EvidenceItem[]>>> = {};
    evidenceMap.forEach((modules, idDesa) => {
      serialized[idDesa] = {};
      Object.keys(modules).forEach((key) => {
        const modKey = key as ModuleKey;
        const items = modules[modKey] || [];
        // Hilangkan data base64 raksasa untuk penyimpanan lokal aman
        serialized[idDesa][modKey] = items.map((it) => ({
          ...it,
          dataUrl: it.dataUrl && it.dataUrl.length > 50000 ? (it.thumbnailUrl || it.downloadUrl || '') : it.dataUrl,
        }));
      });
    });
    localStorage.setItem(EVIDENCE_STORAGE_KEY, JSON.stringify(serialized));
  } catch (e) {
    console.warn('Gagal menyimpan cache bukti ke localStorage:', e);
  }
};

/**
 * Memuat cache data bukti dari localStorage
 */
export const loadEvidenceCache = (): Map<string, Partial<Record<ModuleKey, EvidenceItem[]>>> => {
  const map = new Map<string, Partial<Record<ModuleKey, EvidenceItem[]>>>();
  try {
    const saved = localStorage.getItem(EVIDENCE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        Object.keys(parsed).forEach((idDesa) => {
          const modObj: Partial<Record<ModuleKey, EvidenceItem[]>> = {};
          Object.keys(parsed[idDesa] || {}).forEach((mKey) => {
            const m = mKey as ModuleKey;
            modObj[m] = (parsed[idDesa][m] || []).filter((it: EvidenceItem) => !isDeletedEvidence(it.id));
          });
          map.set(idDesa, modObj);
        });
      }
    }
  } catch (e) {
    console.warn('Gagal memuat cache bukti dari localStorage:', e);
  }
  return map;
};

/**
 * Sanitasi daftar desa sebelum disimpan ke localStorage agar terbebas dari kuota limit 5MB
 */
export const sanitizeVillagesForStorage = (villages: VillagePlanRecord[]): VillagePlanRecord[] => {
  return villages.map((v) => {
    if (!v.evidence) return v;
    const cleanEvidence: Partial<Record<ModuleKey, EvidenceItem[]>> = {};
    Object.keys(v.evidence).forEach((key) => {
      const modKey = key as ModuleKey;
      const items = (v.evidence?.[modKey] || []).filter((it) => !isDeletedEvidence(it.id));
      cleanEvidence[modKey] = items.map((it) => {
        // Jika dataUrl adalah base64 raksasa (>50KB), ganti dengan cloud URL / thumbnail agar hemat kuota
        const isHugeBase64 = it.dataUrl && it.dataUrl.length > 50000;
        const safeUrl = isHugeBase64
          ? (it.thumbnailUrl || (it.driveFileId ? `https://lh3.googleusercontent.com/d/${it.driveFileId}=s0` : it.downloadUrl) || '')
          : it.dataUrl;

        return {
          ...it,
          dataUrl: safeUrl,
        };
      });
    });
    return {
      ...v,
      evidence: cleanEvidence,
    };
  });
};

/**
 * Gabungkan peta bukti dari cloud ke dalam daftar desa
 */
export const mergeEvidenceIntoVillages = (
  villages: VillagePlanRecord[],
  evidenceMap: Map<string, Partial<Record<ModuleKey, EvidenceItem[]>>>
): VillagePlanRecord[] => {
  if (evidenceMap.size === 0) return villages;

  return villages.map((v) => {
    const cloudEv = evidenceMap.get(v.idDesa);
    if (!cloudEv) return v;

    const mergedEv = { ...(v.evidence || {}) };
    Object.keys(cloudEv).forEach((key) => {
      const modKey = key as ModuleKey;
      const cloudItems = (cloudEv[modKey] || []).filter((it) => !isDeletedEvidence(it.id));
      const localItems = (mergedEv[modKey] || []).filter((it) => !isDeletedEvidence(it.id));

      // Gabungkan dan hindari duplikat ID
      const mapById = new Map<string, EvidenceItem>();
      localItems.forEach((it) => mapById.set(it.id, it));
      cloudItems.forEach((it) => mapById.set(it.id, it)); // Cloud diutamakan untuk multi-perangkat

      mergedEv[modKey] = Array.from(mapById.values());
    });

    return {
      ...v,
      evidence: mergedEv,
    };
  });
};
