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
 */
export const saveCloudPassword = async (
  accountKey: string,
  newPass: string,
  scriptUrl: string = DEFAULT_APPS_SCRIPT_URL
): Promise<boolean> => {
  const urlToUse = (scriptUrl || DEFAULT_APPS_SCRIPT_URL).trim();
  if (!urlToUse) return false;

  try {
    const payload = {
      action: 'savePassword',
      sheetName: 'KREDENSIAL_AKUN',
      accountKey,
      newPass,
    };

    const res = await fetch(urlToUse, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    return res.ok;
  } catch (err) {
    console.warn('Gagal menyimpan password ke cloud Apps Script:', err);
    return false;
  }
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

  // 2. Ambil data Desa (DATA_DESA)
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
    
    return createJsonResponse({ status: 'error', message: 'Aksi tidak dikenal: ' + action });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
