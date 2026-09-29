/**
 * GOOGLE APPS SCRIPT WEB APP ENDPOINT & CLOUD SYNC
 * 
 * Skrip ini dipasang langsung pada Google Spreadsheet ID:
 * 1ETuI256p8T5x-4WFVHB-FKonUkY8di9DroLkpAndF1w
 * melalui menu Extensions > Apps Script pada Google Sheets.
 * 
 * Keuntungan menggunakan Apps Script Web App:
 * 1. Tidak membutuhkan Firebase sama sekali.
 * 2. Tidak memerlukan popup login Google di browser pengunjung/petugas.
 * 3. Siap 100% dideploy di Vercel secara serverless/statik.
 * 4. Mendukung sinkronisasi tarik data (read) dan simpan data (write/update).
 * 5. Mendukung sinkronisasi akun & password multi-perangkat via sheet KREDENSIAL_AKUN.
 */

import { VillagePlanRecord } from '../types';
import { DESIGNATED_SPREADSHEET_ID, villageToRowArray, parseRowsToVillages, getSpreadsheetHeaderRows } from './googleSheetsDatabase';

export const APPS_SCRIPT_CONFIG_KEY = 'boalemo_apps_script_url';

// Official Designated Google Apps Script Web App URL for Boalemo
export const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzCPHH2gxPdy2SXO1D3jSRbh8g7cjKFqCkx0XObXeqwWOlqmesXKp74jRNLVhlUgD_q/exec';

/**
 * Menyimpan URL Apps Script Web App ke penyimpanan lokal
 */
export const saveAppsScriptUrl = (url: string) => {
  localStorage.setItem(APPS_SCRIPT_CONFIG_KEY, (url || DEFAULT_APPS_SCRIPT_URL).trim());
};

/**
 * Mengambil URL Apps Script Web App yang tersimpan (selalu memiliki default resmi terbaru)
 */
export const getAppsScriptUrl = (): string => {
  const saved = localStorage.getItem(APPS_SCRIPT_CONFIG_KEY);
  if (saved && saved.trim() && !saved.includes('AKfycbxuCM2APOZxzNWo4Nq2cMRWy6qFR070Uu8TAisry3YuMUgkNOa7VPA1ZfgGmKm6tMrU')) {
    return saved.trim();
  }
  return DEFAULT_APPS_SCRIPT_URL;
};

/**
 * Tarik data 82 desa dari Google Spreadsheet melalui Apps Script
 */
export const fetchFromAppsScript = async (
  scriptUrl: string = DEFAULT_APPS_SCRIPT_URL,
  currentVillages: VillagePlanRecord[]
): Promise<{ villages: VillagePlanRecord[]; count: number }> => {
  const urlToUse = (scriptUrl || DEFAULT_APPS_SCRIPT_URL).trim();
  if (!urlToUse) {
    throw new Error('URL Google Apps Script belum dimasukkan.');
  }

  const endpoint = `${urlToUse}?action=getData&sheet=DATA_DESA&t=${Date.now()}`;
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Gagal menghubungi Apps Script (${response.status})`);
  }

  const data = await response.json();
  if (data.status === 'error') {
    throw new Error(data.message || 'Apps Script melaporkan error saat membaca spreadsheet.');
  }

  const rows: any[][] = data.values || [];
  if (!rows || rows.length === 0) {
    throw new Error('Tidak ada data yang ditemukan di sheet DATA_DESA.');
  }

  const { updatedVillages, matchedCount } = parseRowsToVillages(rows, currentVillages);
  return { villages: updatedVillages, count: matchedCount };
};

/**
 * Kirim seluruh 82 desa ke Google Spreadsheet melalui Apps Script
 */
export const pushAllToAppsScript = async (
  scriptUrl: string = DEFAULT_APPS_SCRIPT_URL,
  villages: VillagePlanRecord[]
): Promise<{ success: boolean; message: string }> => {
  const urlToUse = (scriptUrl || DEFAULT_APPS_SCRIPT_URL).trim();
  if (!urlToUse) {
    throw new Error('URL Google Apps Script belum dimasukkan.');
  }

  const headerRows = getSpreadsheetHeaderRows();
  const villageRows = villages.map(villageToRowArray);
  const allRows = [...headerRows, ...villageRows];

  const payload = {
    action: 'saveAll',
    sheetName: 'DATA_DESA',
    values: allRows,
  };

  // Google Apps Script requires text/plain body to avoid CORS preflight OPTION rejection
  const response = await fetch(urlToUse, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Gagal menyimpan ke Google Spreadsheet via Apps Script (${response.status})`);
  }

  const resJson = await response.json().catch(() => ({ status: 'success' }));
  if (resJson.status === 'error') {
    throw new Error(resJson.message || 'Gagal menyimpan ke spreadsheet.');
  }

  return { success: true, message: resJson.message || 'Data berhasil disimpan ke Google Spreadsheet' };
};

/**
 * Update 1 Desa otomatis ke Google Spreadsheet via Apps Script secara real-time
 */
export const updateVillageViaAppsScript = async (
  scriptUrl: string = DEFAULT_APPS_SCRIPT_URL,
  village: VillagePlanRecord
): Promise<boolean> => {
  const urlToUse = (scriptUrl || DEFAULT_APPS_SCRIPT_URL).trim();
  if (!urlToUse) return false;

  try {
    const rowValues = villageToRowArray(village);
    const payload = {
      action: 'updateVillage',
      sheetName: 'DATA_DESA',
      idDesa: village.idDesa,
      rowValues,
    };

    // Google Apps Script accepts text/plain smoothly across browsers and origins without CORS preflight failures
    const res = await fetch(urlToUse, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    return res.ok;
  } catch (e) {
    console.warn('Apps Script updateVillage auto-sync error:', e);
    return false;
  }
};

/**
 * Tarik seluruh password tersimpan dari Google Spreadsheet (Sheet: KREDENSIAL_AKUN)
 * Memungkinkan login multi-perangkat menggunakan password yang telah diubah
 */
export const fetchCloudPasswords = async (
  scriptUrl: string = DEFAULT_APPS_SCRIPT_URL
): Promise<Record<string, string>> => {
  const urlToUse = (scriptUrl || DEFAULT_APPS_SCRIPT_URL).trim();
  if (!urlToUse) return {};

  try {
    const endpoint = `${urlToUse}?action=getPasswords&sheet=KREDENSIAL_AKUN&t=${Date.now()}`;
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) return {};
    const json = await res.json().catch(() => null);
    if (!json || json.status === 'error') return {};

    // Expecting json.passwords as { "superadmin": "...", "kec_750201": "..." }
    // Or if returning rows: [[key, pass], ...]
    if (json.passwords && typeof json.passwords === 'object') {
      return json.passwords;
    }

    if (Array.isArray(json.values)) {
      const passMap: Record<string, string> = {};
      for (const row of json.values) {
        if (Array.isArray(row) && row.length >= 2) {
          const k = String(row[0]).trim();
          const p = String(row[1]).trim();
          if (k && p && k !== 'account_key' && k !== 'AccountKey') {
            passMap[k] = p;
          }
        }
      }
      return passMap;
    }

    return {};
  } catch (err) {
    console.warn('Gagal memuat kredensial dari cloud:', err);
    return {};
  }
};

/**
 * Simpan password yang baru diubah ke Google Spreadsheet (Sheet: KREDENSIAL_AKUN)
 * Multi-perangkat: dapat diakses langsung oleh browser lain
 */
export const saveCloudPassword = async (
  accountKey: string,
  newPass: string,
  scriptUrl: string = getAppsScriptUrl()
): Promise<boolean> => {
  const urlToUse = (scriptUrl || getAppsScriptUrl() || DEFAULT_APPS_SCRIPT_URL).trim();
  if (!urlToUse) return false;

  const payload = {
    action: 'savePassword',
    sheetName: 'KREDENSIAL_AKUN',
    accountKey,
    newPass,
  };

  // 1. Coba via POST terlebih dahulu (standar Apps Script)
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
      if (data && data.status === 'success') {
        return true;
      }
      return true;
    }
  } catch (err) {
    console.warn('Apps Script POST savePassword attempt failed, trying GET fallback:', err);
  }

  // 2. Fallback via GET parameter (handal jika browser membatasi POST CORS)
  try {
    const fallbackEndpoint = `${urlToUse}?action=savePassword&accountKey=${encodeURIComponent(accountKey)}&newPass=${encodeURIComponent(newPass)}&sheetName=KREDENSIAL_AKUN&t=${Date.now()}`;
    const resGet = await fetch(fallbackEndpoint, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (resGet.ok) {
      return true;
    }
  } catch (errGet) {
    console.warn('Apps Script GET fallback savePassword failed:', errGet);
  }

  return false;
};

/**
 * Template Kode Google Apps Script siap copy-paste (Mendukung Data Desa + Kredensial Akun Multi-Perangkat)
 */
export const APPS_SCRIPT_SAMPLE_CODE = `// ===============================================================
// KODE GOOGLE APPS SCRIPT DATABASE PERENCANAAN DESA BOALEMO 2027
// Pasang kode ini di Google Spreadsheet ID: ${DESIGNATED_SPREADSHEET_ID}
// Menu: Extensions (Ekstensi) > Apps Script
// ===============================================================

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'getData';
  var sheetName = (e && e.parameter && e.parameter.sheet) || 'DATA_DESA';
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Ambil data Kredensial / Password multi-perangkat
  if (action === 'getPasswords') {
    var credSheet = ss.getSheetByName('KREDENSIAL_AKUN');
    if (!credSheet) {
      return createJsonResponse({
        status: 'success',
        passwords: {}
      });
    }
    var credValues = credSheet.getDataRange().getValues();
    var passwords = {};
    for (var i = 1; i < credValues.length; i++) {
      var row = credValues[i];
      if (row[0] && row[1]) {
        passwords[String(row[0]).trim()] = String(row[1]).trim();
      }
    }
    return createJsonResponse({
      status: 'success',
      passwords: passwords
    });
  }

  // 1b. Simpan Password via GET parameter (Dukungan penuh untuk semua browser tanpa kendala CORS)
  if (action === 'savePassword') {
    var accountKey = String((e && e.parameter && e.parameter.accountKey) || '').trim();
    var newPass = String((e && e.parameter && e.parameter.newPass) || '').trim();
    if (accountKey && newPass) {
      var credSheet = ss.getSheetByName('KREDENSIAL_AKUN');
      if (!credSheet) {
        credSheet = ss.insertSheet('KREDENSIAL_AKUN');
        credSheet.getRange(1, 1, 1, 3).setValues([['account_key', 'password', 'updated_at']]);
      }
      var credData = credSheet.getDataRange().getValues();
      var foundRow = -1;
      for (var c = 1; c < credData.length; c++) {
        if (String(credData[c][0]).trim() === accountKey) {
          foundRow = c + 1;
          break;
        }
      }
      var nowStr = new Date().toLocaleString('id-ID');
      if (foundRow > 0) {
        credSheet.getRange(foundRow, 2, 1, 2).setValues([[newPass, nowStr]]);
      } else {
        credSheet.appendRow([accountKey, newPass, nowStr]);
      }
      return createJsonResponse({
        status: 'success',
        message: 'Password akun ' + accountKey + ' berhasil disimpan di Cloud Spreadsheet.'
      });
    }
  }

  // 1c. Akses / Unduh Bukti Dokumen Langsung (Admin Spreadsheet & Multi-Perangkat)
  if (action === 'downloadEvidence' || action === 'download' || action === 'viewEvidence') {
    var p = e && e.parameter ? e.parameter : {};
    var evId = String(p.id || '').trim();
    if (!evId) {
      return HtmlService.createHtmlOutput('<h3>ID Berkas tidak ditemukan.</h3>');
    }
    var evSheet = ss.getSheetByName('BUKTI_DOKUMEN');
    if (!evSheet) {
      return HtmlService.createHtmlOutput('<h3>Sheet BUKTI_DOKUMEN belum dibuat di Spreadsheet ini.</h3>');
    }
    var allData = evSheet.getDataRange().getValues();
    var target = null;
    var targetRowIndex = -1;
    for (var i = 1; i < allData.length; i++) {
      if (String(allData[i][0]).trim() === evId) {
        target = allData[i];
        targetRowIndex = i + 1;
        break;
      }
    }
    if (!target) {
      return HtmlService.createHtmlOutput('<h3>Berkas bukti ID ' + evId + ' tidak ditemukan di sheet BUKTI_DOKUMEN.</h3>');
    }

    var fileName = String(target[6] || 'berkas_bukti');
    var fileType = String(target[7] || 'document');
    var formatSize = String(target[9] || '');
    var driveDlUrl = String(target[12] || '');
    var driveId = String(target[14] || '');
    var base64Data = String(target[15] || target[12] || '') + String(target[16] || target[13] || '');

    // Cek otomatis ke Google Drive jika driveId belum tercatat di baris
    if (!driveId && typeof DriveApp !== 'undefined') {
      try {
        var folderName = 'BUKTI_DOKUMEN_BOALEMO';
        var folders = DriveApp.getFoldersByName(folderName);
        if (folders.hasNext()) {
          var folder = folders.next();
          var files = folder.getFilesByName(fileName);
          if (files.hasNext()) {
            var foundFile = files.next();
            driveId = foundFile.getId();
            var newDl = 'https://drive.usercontent.google.com/download?id=' + driveId + '&export=download';
            var newView = 'https://drive.google.com/file/d/' + driveId + '/view?usp=sharing';
            evSheet.getRange(targetRowIndex, 13).setValue(newDl);
            evSheet.getRange(targetRowIndex, 14).setValue(newView);
            evSheet.getRange(targetRowIndex, 15).setValue(driveId);
          }
        }
      } catch (eFindDrive) {}
    }

    // Jika tersimpan di Google Drive, direct download berkas HD secara instan tanpa hambatan sandboxed iframe
    if (driveId) {
      var directDownloadUrl = 'https://drive.usercontent.google.com/download?id=' + driveId + '&export=download';
      var directDriveViewUrl = 'https://drive.google.com/file/d/' + driveId + '/view?usp=sharing';
      var fullHdImagePreview = 'https://lh3.googleusercontent.com/d/' + driveId + '=s0';

      var redirectHtml = '<!DOCTYPE html><html><head><meta charset="utf-8">' +
        '<base target="_top">' +
        '<title>Unduh ' + fileName + ' (HD)</title>' +
        '<script>' +
        'try { window.top.location.href = "' + directDownloadUrl + '"; } catch(e) { window.location.href = "' + directDownloadUrl + '"; }' +
        '</script>' +
        '</head><body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#0f172a;color:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:90vh;box-sizing:border-box;">' +
        '<div style="max-width:540px;width:100%;margin:0 auto;background:#1e293b;padding:32px;border-radius:16px;border:1px solid #334155;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);text-align:center;">' +
        '<div style="width:56px;height:56px;margin:0 auto 16px;background:rgba(5,150,105,0.2);color:#34d399;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:26px;border:1px solid rgba(52,211,153,0.3);">📥</div>' +
        '<h2 style="color:#34d399;margin:0 0 6px 0;font-size:20px;font-weight:700;">Mengunduh Berkas HD</h2>' +
        '<p style="color:#f1f5f9;font-size:15px;font-weight:600;margin:0 0 16px 0;word-break:break-all;">' + fileName + '</p>' +
        '<div style="background:#0f172a;border-radius:10px;padding:12px;margin:0 0 20px 0;font-size:13px;color:#cbd5e1;text-align:left;border:1px solid #1e293b;">' +
        '<div style="margin-bottom:4px;">💎 <strong>Format:</strong> <span style="color:#34d399;font-weight:bold;">' + (formatSize || 'Resolusi HD (1.2 - 2 MB)') + '</span></div>' +
        '<div style="margin-bottom:4px;">🏛️ <strong>Desa:</strong> ' + target[2] + ' (' + target[4] + ')</div>' +
        '<div>📁 <strong>Modul:</strong> ' + target[5] + '</div>' +
        '</div>' +
        (fileType === 'image' ? '<div style="margin-bottom:20px;"><img src="' + fullHdImagePreview + '" style="max-width:100%;max-height:260px;border-radius:8px;border:1px solid #334155;" alt="' + fileName + '"></div>' : '') +
        '<div style="display:flex;flex-direction:column;gap:10px;">' +
        '<a href="' + directDownloadUrl + '" target="_top" style="display:block;padding:13px 20px;background:#059669;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">⬇️ Unduh Langsung Berkas HD (' + (formatSize || '1.5 MB') + ')</a>' +
        '<a href="' + directDriveViewUrl + '" target="_blank" style="display:block;padding:11px 20px;background:#334155;color:#e2e8f0;text-decoration:none;border-radius:10px;font-weight:600;font-size:13px;">👁️ Buka di Google Drive</a>' +
        '</div>' +
        '<p style="margin:16px 0 0 0;font-size:12px;color:#94a3b8;">Unduhan otomatis dimulai. Jika belum terunduh, klik tombol hijau di atas.</p>' +
        '</div></body></html>';
      return HtmlService.createHtmlOutput(redirectHtml);
    }

    // Jika disimpan via dataUrl / base64
    var downloadHtml = '<!DOCTYPE html><html><head><meta charset="utf-8">' +
      '<base target="_top">' +
      '<title>Unduh ' + fileName + '</title>' +
      '</head><body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;min-height:90vh;box-sizing:border-box;">' +
      '<div style="max-width:620px;width:100%;margin:0 auto;background:#1e293b;padding:32px;border-radius:16px;border:1px solid #334155;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);text-align:center;">' +
      '<h2 style="color:#34d399;margin-bottom:8px;">Unduh Bukti Dokumen HD</h2>' +
      '<p style="color:#e2e8f0;font-size:16px;font-weight:bold;">' + fileName + '</p>' +
      '<p style="color:#94a3b8;font-size:13px;">Format: ' + formatSize + ' • Desa: ' + target[2] + ' (' + target[4] + ')</p>' +
      (fileType === 'image' && base64Data ? '<div style="margin:20px 0;"><img src="' + base64Data + '" style="max-width:100%;max-height:360px;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.6);" alt="' + fileName + '"></div>' : '') +
      '<p style="margin-top:24px;"><a id="dlAction" href="' + base64Data + '" download="' + fileName + '" target="_blank" style="display:inline-block;padding:12px 28px;background:#059669;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;">📥 Unduh Berkas Langsung</a></p>' +
      '</div>' +
      '<script>' +
      'try {' +
      '  var btn = document.getElementById("dlAction");' +
      '  if (btn && btn.href && btn.href.startsWith("data:")) {' +
      '    var parts = btn.href.split(";base64,");' +
      '    var contentType = parts[0].replace("data:", "");' +
      '    var raw = atob(parts[1]);' +
      '    var rawLength = raw.length;' +
      '    var uInt8Array = new Uint8Array(rawLength);' +
      '    for (var i = 0; i < rawLength; ++i) { uInt8Array[i] = raw.charCodeAt(i); }' +
      '    var blob = new Blob([uInt8Array], { type: contentType });' +
      '    var blobUrl = URL.createObjectURL(blob);' +
      '    btn.href = blobUrl;' +
      '  }' +
      '} catch(e) {}' +
      '</script>' +
      '</body></html>';
    return HtmlService.createHtmlOutput(downloadHtml);
  }

  // 1d. Simpan Bukti Dokumen via GET parameter (Fallback jika POST dibatasi peramban)
  if (action === 'saveEvidence') {
    var evSheet = ss.getSheetByName('BUKTI_DOKUMEN');
    var headers = [
      'ID', 'IdDesa', 'Desa', 'IdKec', 'Kecamatan', 'Modul', 'NamaFile', 'Tipe',
      'Ukuran', 'FormatUkuran', 'WaktuUpload', 'Keterangan',
      'Link_Dokumen', 'Link_Lihat_Drive', 'Drive_File_ID',
      'DataUrl_Part1', 'DataUrl_Part2', 'UploadedBy', 'UpdatedAt'
    ];
    if (!evSheet) {
      evSheet = ss.insertSheet('BUKTI_DOKUMEN');
      evSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      evSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e2e8f0');
      evSheet.setFrozenRows(1);
    }
    var p = e && e.parameter ? e.parameter : {};
    var evId = String(p.id || '').trim();
    if (evId) {
      var allIds = evSheet.getRange('A:A').getValues();
      var targetRow = -1;
      for (var r = 1; r < allIds.length; r++) {
        if (String(allIds[r][0]).trim() === evId) {
          targetRow = r + 1;
          break;
        }
      }
      var nowStr = new Date().toISOString();
      var appUrl = ScriptApp && ScriptApp.getService ? ScriptApp.getService().getUrl() : '';
      var directDl = String(p.downloadUrl || (appUrl ? (appUrl + '?action=downloadEvidence&id=' + evId) : ''));
      var evRow = [
        evId,
        String(p.idDesa || ''),
        String(p.desa || ''),
        String(p.idKec || ''),
        String(p.kecamatan || ''),
        String(p.moduleKey || ''),
        String(p.name || ''),
        String(p.type || 'document'),
        Number(p.size) || 0,
        String(p.formattedSize || ''),
        String(p.uploadedAt || ''),
        String(p.caption || ''),
        directDl,
        directDl,
        '',
        String(p.dataUrl_part1 || ''),
        String(p.dataUrl_part2 || ''),
        String(p.uploadedBy || 'Petugas'),
        nowStr
      ];
      if (targetRow > 0) {
        evSheet.getRange(targetRow, 1, 1, headers.length).setValues([evRow]);
      } else {
        evSheet.appendRow(evRow);
      }
      return createJsonResponse({
        status: 'success',
        message: 'Bukti berhasil disimpan di BUKTI_DOKUMEN',
        downloadUrl: directDl
      });
    }
  }

  // 1e. Hapus Bukti Dokumen via GET parameter (Spreadsheet & Google Drive)
  if (action === 'deleteEvidence') {
    var evSheet = ss.getSheetByName('BUKTI_DOKUMEN');
    var delId = String((e && e.parameter && e.parameter.id) || '').trim();
    var driveFileId = String((e && e.parameter && e.parameter.driveFileId) || '').trim();
    var driveTrashed = false;

    if (evSheet && delId) {
      var allData = evSheet.getDataRange().getValues();
      for (var r = 1; r < allData.length; r++) {
        if (String(allData[r][0]).trim() === delId) {
          if (!driveFileId) {
            driveFileId = String(allData[r][14] || '').trim();
          }
          evSheet.deleteRow(r + 1);
          break;
        }
      }
    }

    // Hapus juga berkas fisik di Google Drive
    if (driveFileId && typeof DriveApp !== 'undefined') {
      try {
        var fileToTrash = DriveApp.getFileById(driveFileId);
        if (fileToTrash) {
          fileToTrash.setTrashed(true);
          driveTrashed = true;
        }
      } catch (errTrash) {
        Logger.log('Drive delete error: ' + errTrash.toString());
      }
    }

    return createJsonResponse({
      status: 'success',
      message: 'Bukti berhasil dihapus dari Spreadsheet' + (driveTrashed ? ' dan Google Drive' : ''),
      driveTrashed: driveTrashed
    });
  }

  // 2. Ambil data Desa (DATA_DESA) atau sheet lain seperti BUKTI_DOKUMEN
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    return createJsonResponse({
      status: 'error',
      message: 'Sheet ' + sheetName + ' tidak ditemukan di Spreadsheet ini.'
    });
  }
  
  var values = sheet.getDataRange().getValues();
  return createJsonResponse({
    status: 'success',
    sheet: sheetName,
    rowCount: values.length,
    values: values
  });
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Simpan Password Akun (Multi-Perangkat)
    if (action === 'savePassword') {
      var accountKey = String(data.accountKey || '').trim();
      var newPass = String(data.newPass || '').trim();
      if (!accountKey || !newPass) {
        return createJsonResponse({ status: 'error', message: 'Data akun tidak lengkap.' });
      }

      var credSheet = ss.getSheetByName('KREDENSIAL_AKUN');
      if (!credSheet) {
        credSheet = ss.insertSheet('KREDENSIAL_AKUN');
        credSheet.getRange(1, 1, 1, 3).setValues([['account_key', 'password', 'updated_at']]);
      }

      var credData = credSheet.getDataRange().getValues();
      var foundRow = -1;
      for (var c = 1; c < credData.length; c++) {
        if (String(credData[c][0]).trim() === accountKey) {
          foundRow = c + 1;
          break;
        }
      }

      var nowStr = new Date().toLocaleString('id-ID');
      if (foundRow > 0) {
        credSheet.getRange(foundRow, 2, 1, 2).setValues([[newPass, nowStr]]);
      } else {
        credSheet.appendRow([accountKey, newPass, nowStr]);
      }

      return createJsonResponse({
        status: 'success',
        message: 'Password akun ' + accountKey + ' berhasil disimpan di Cloud Spreadsheet.'
      });
    }

    // 2. Simpan Seluruh Desa (DATA_DESA)
    var sheetName = data.sheetName || 'DATA_DESA';
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    if (action === 'saveAll') {
      var rows = data.values;
      if (!rows || rows.length === 0) {
        return createJsonResponse({ status: 'error', message: 'Data baris kosong.' });
      }
      
      sheet.clearContents();
      var numRows = rows.length;
      var numCols = rows[0].length;
      
      if (sheet.getMaxRows() < numRows) {
        sheet.insertRowsAfter(sheet.getMaxRows(), numRows - sheet.getMaxRows() + 10);
      }
      if (sheet.getMaxColumns() < numCols) {
        sheet.insertColumnsAfter(sheet.getMaxColumns(), numCols - sheet.getMaxColumns() + 10);
      }
      
      var range = sheet.getRange(1, 1, numRows, numCols);
      range.setValues(rows);
      
      try {
        var infoSheet = ss.getSheetByName('INFO_DATABASE') || ss.insertSheet('INFO_DATABASE');
        infoSheet.getRange(1, 1, 3, 2).setValues([
          ['Database Perencanaan Desa Boalemo', 'Aktif via Google Apps Script'],
          ['Total Desa', (numRows - 3).toString()],
          ['Waktu Sinkronisasi Terakhir', new Date().toLocaleString('id-ID')]
        ]);
      } catch (err) {}
      
      return createJsonResponse({
        status: 'success',
        message: 'Berhasil menyimpan seluruh ' + (numRows - 3) + ' desa ke spreadsheet.'
      });
    }
    
    // 3. Update 1 Desa Real-time
    if (action === 'updateVillage') {
      var idDesa = data.idDesa;
      var rowValues = data.rowValues;
      
      var idColValues = sheet.getRange("H:H").getValues();
      var targetRow = -1;
      
      for (var i = 0; i < idColValues.length; i++) {
        if (String(idColValues[i][0]).trim() === String(idDesa).trim()) {
          targetRow = i + 1;
          break;
        }
      }
      
      if (targetRow > 0) {
        var range = sheet.getRange(targetRow, 1, 1, rowValues.length);
        range.setValues([rowValues]);
        return createJsonResponse({
          status: 'success',
          message: 'Desa ' + idDesa + ' berhasil diperbarui di baris ' + targetRow
        });
      } else {
        sheet.appendRow(rowValues);
        return createJsonResponse({
          status: 'success',
          message: 'Desa ' + idDesa + ' berhasil ditambahkan di akhir baris.'
        });
      }
    }

    // 4. Simpan Bukti Foto & Dokumen (Sheet: BUKTI_DOKUMEN)
    if (action === 'saveEvidence') {
      var evSheet = ss.getSheetByName('BUKTI_DOKUMEN');
      var headers = [
        'ID', 'IdDesa', 'Desa', 'IdKec', 'Kecamatan', 'Modul', 'NamaFile', 'Tipe',
        'Ukuran', 'FormatUkuran', 'WaktuUpload', 'Keterangan',
        'Link_Dokumen', 'Link_Lihat_Drive', 'Drive_File_ID',
        'DataUrl_Part1', 'DataUrl_Part2', 'UploadedBy', 'UpdatedAt'
      ];
      if (!evSheet) {
        evSheet = ss.insertSheet('BUKTI_DOKUMEN');
        evSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        evSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#e2e8f0');
        evSheet.setFrozenRows(1);
      } else {
        // Pastikan baris header terbaru terpasang
        evSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      }

      var evId = String(data.id || '').trim();
      var nowStr = new Date().toISOString();
      var driveFileId = '';
      var driveDownloadUrl = '';
      var driveViewUrl = '';
      var fullBase64 = String(data.dataUrl || data.dataUrl_part1 || '');

      // Simpan langsung ke Google Drive jika DriveApp aktif
      try {
        if (fullBase64 && typeof DriveApp !== 'undefined') {
          var folderName = 'BUKTI_DOKUMEN_BOALEMO';
          var folders = DriveApp.getFoldersByName(folderName);
          var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
          try {
            folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          } catch(eShare) {}

          var cleanBase64 = fullBase64.indexOf('base64,') > -1 ? fullBase64.split('base64,')[1] : fullBase64;
          var mimeType = 'application/octet-stream';
          if (data.type === 'image') mimeType = 'image/jpeg';
          else if (data.type === 'pdf') mimeType = 'application/pdf';

          var decoded = Utilities.base64Decode(cleanBase64);
          var blob = Utilities.newBlob(decoded, mimeType, String(data.name || 'berkas_bukti'));
          var file = folder.createFile(blob);
          try {
            file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          } catch(eFShare) {}

          driveFileId = file.getId();
          // Link direct download resmi Google Drive yang langsung memicu download di peramban
          driveDownloadUrl = 'https://drive.usercontent.google.com/download?id=' + driveFileId + '&export=download';
          driveViewUrl = 'https://drive.google.com/file/d/' + driveFileId + '/view?usp=sharing';
        }
      } catch (errDrive) {
        Logger.log('DriveApp creation: ' + errDrive.toString());
      }

      var appUrl = ScriptApp && ScriptApp.getService ? ScriptApp.getService().getUrl() : '';
      var finalDl = driveDownloadUrl || (appUrl ? (appUrl + '?action=downloadEvidence&id=' + evId) : String(data.downloadUrl || ''));
      var finalView = driveViewUrl || finalDl;

      var evRow = [
        evId,
        String(data.idDesa || ''),
        String(data.desa || ''),
        String(data.idKec || ''),
        String(data.kecamatan || ''),
        String(data.moduleKey || ''),
        String(data.name || ''),
        String(data.type || 'document'),
        Number(data.size) || 0,
        String(data.formattedSize || ''),
        String(data.uploadedAt || ''),
        String(data.caption || ''),
        finalDl,     // Kolom M: Link_Dokumen (Langsung Download Berkas HD untuk Superadmin)
        finalView,   // Kolom N: Link Lihat Drive
        driveFileId, // Kolom O: Google Drive File ID
        String(data.thumbnailUrl || data.dataUrl_part1 || '').substring(0, 35000), // Thumbnail ringan untuk kartu galeri
        '',
        String(data.uploadedBy || 'Petugas'),
        nowStr
      ];

      var allIds = evSheet.getRange('A:A').getValues();
      var targetRow = -1;
      for (var i = 1; i < allIds.length; i++) {
        if (String(allIds[i][0]).trim() === evId) {
          targetRow = i + 1;
          break;
        }
      }

      if (targetRow > 0) {
        evSheet.getRange(targetRow, 1, 1, headers.length).setValues([evRow]);
      } else {
        evSheet.appendRow(evRow);
      }

      return createJsonResponse({
        status: 'success',
        message: 'Bukti ' + data.name + ' berhasil disimpan di sheet BUKTI_DOKUMEN',
        downloadUrl: finalDl,
        viewUrl: finalView,
        driveFileId: driveFileId
      });
    }

    // 5. Hapus Bukti Foto & Dokumen (Spreadsheet & Google Drive)
    if (action === 'deleteEvidence') {
      var evSheet = ss.getSheetByName('BUKTI_DOKUMEN');
      var evId = String(data.id || '').trim();
      var driveFileId = String(data.driveFileId || '').trim();
      var driveTrashed = false;

      if (evSheet && evId) {
        var allData = evSheet.getDataRange().getValues();
        for (var i = 1; i < allData.length; i++) {
          if (String(allData[i][0]).trim() === evId) {
            if (!driveFileId) {
              driveFileId = String(allData[i][14] || '').trim();
            }
            evSheet.deleteRow(i + 1);
            break;
          }
        }
      }

      // Hapus berkas fisik di Google Drive
      if (driveFileId && typeof DriveApp !== 'undefined') {
        try {
          var fileToTrash = DriveApp.getFileById(driveFileId);
          if (fileToTrash) {
            fileToTrash.setTrashed(true);
            driveTrashed = true;
          }
        } catch (errTrash) {
          Logger.log('Drive delete error: ' + errTrash.toString());
        }
      }

      return createJsonResponse({
        status: 'success',
        message: 'Bukti berhasil dihapus dari sheet BUKTI_DOKUMEN' + (driveTrashed ? ' dan Google Drive.' : '.'),
        driveTrashed: driveTrashed
      });
    }
    
    return createJsonResponse({ status: 'error', message: 'Aksi tidak dikenal: ' + action });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===============================================================
// FUNGSI AKTIVASI IZIN GOOGLE DRIVE (SUPERADMIN / ADMIN)
// ===============================================================
// Jalankan fungsi "otorisasiGoogleDrive" ini di Apps Script Editor
// (Pilih fungsi di menu atas > Klik 'Run / Jalankan').
// Google akan menampilkan pop-up "Authorization required" (Otorisasi Diperlukan):
// 1. Klik "Review permissions" (Tinjau Izin)
// 2. Pilih akun Google Anda (syarmanst@gmail.com)
// 3. Klik "Advanced" (Lanjutan) di kiri bawah
// 4. Klik "Go to project (unsafe)" / Buka project
// 5. Klik "Allow" (Izinkan)
function otorisasiGoogleDrive() {
  var folderName = 'BUKTI_DOKUMEN_BOALEMO';
  var folders = DriveApp.getFoldersByName(folderName);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
  folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  Logger.log('SUKSES! Izin Google Drive telah aktif.');
  Logger.log('Folder Penyimpanan: ' + folder.getName() + ' (ID: ' + folder.getId() + ')');
  return 'Otorisasi Google Drive Berhasil & Aktif!';
}

// Fungsi bantu pengecekan status Google Drive
function testDriveAccess() {
  try {
    return otorisasiGoogleDrive();
  } catch (err) {
    Logger.log('Error testDriveAccess: ' + err.toString());
    return 'Belum diotorisasi: ' + err.toString();
  }
}
`;
