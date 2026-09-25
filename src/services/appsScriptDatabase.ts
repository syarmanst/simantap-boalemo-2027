/**
 * GOOGLE APPS SCRIPT WEB APP ENDPOINT
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
 */

import { VillagePlanRecord } from '../types';
import { DESIGNATED_SPREADSHEET_ID, villageToRowArray, parseRowsToVillages, getSpreadsheetHeaderRows } from './googleSheetsDatabase';

export const APPS_SCRIPT_CONFIG_KEY = 'boalemo_apps_script_url';

// Default / fallback URL jika pengguna sudah deploy Web App di Apps Script
export const DEFAULT_APPS_SCRIPT_URL = '';

/**
 * Menyimpan URL Apps Script Web App ke penyimpanan lokal
 */
export const saveAppsScriptUrl = (url: string) => {
  localStorage.setItem(APPS_SCRIPT_CONFIG_KEY, url.trim());
};

/**
 * Mengambil URL Apps Script Web App yang tersimpan
 */
export const getAppsScriptUrl = (): string => {
  return localStorage.getItem(APPS_SCRIPT_CONFIG_KEY) || DEFAULT_APPS_SCRIPT_URL;
};

/**
 * Tarik data 82 desa dari Google Spreadsheet melalui Apps Script
 */
export const fetchFromAppsScript = async (
  scriptUrl: string,
  currentVillages: VillagePlanRecord[]
): Promise<{ villages: VillagePlanRecord[]; count: number }> => {
  if (!scriptUrl) {
    throw new Error('URL Google Apps Script belum dimasukkan. Silakan pasang Web App URL terlebih dahulu.');
  }

  const endpoint = `${scriptUrl}?action=getData&sheet=DATA_DESA&t=${Date.now()}`;
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
  scriptUrl: string,
  villages: VillagePlanRecord[]
): Promise<{ success: boolean; message: string }> => {
  if (!scriptUrl) {
    throw new Error('URL Google Apps Script belum dimasukkan. Silakan pasang Web App URL terlebih dahulu.');
  }

  const headerRows = getSpreadsheetHeaderRows();
  const villageRows = villages.map(villageToRowArray);
  const allRows = [...headerRows, ...villageRows];

  const payload = {
    action: 'saveAll',
    sheetName: 'DATA_DESA',
    values: allRows,
  };

  const response = await fetch(scriptUrl, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Gagal menyimpan ke Google Spreadsheet via Apps Script (${response.status})`);
  }

  const resJson = await response.json();
  if (resJson.status === 'error') {
    throw new Error(resJson.message || 'Gagal menyimpan ke spreadsheet.');
  }

  return { success: true, message: resJson.message || 'Data berhasil disimpan ke Google Spreadsheet' };
};

/**
 * Update 1 Desa otomatis ke Google Spreadsheet via Apps Script
 */
export const updateVillageViaAppsScript = async (
  scriptUrl: string,
  village: VillagePlanRecord
): Promise<boolean> => {
  if (!scriptUrl) return false;

  try {
    const rowValues = villageToRowArray(village);
    const payload = {
      action: 'updateVillage',
      sheetName: 'DATA_DESA',
      idDesa: village.idDesa,
      rowValues,
    };

    const res = await fetch(scriptUrl, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return res.ok;
  } catch (e) {
    console.warn('Apps Script updateVillage error:', e);
    return false;
  }
};

/**
 * Template Kode Google Apps Script siap copy-paste
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
    var sheetName = data.sheetName || 'DATA_DESA';
    var ss = SpreadsheetApp.getActiveSpreadsheet();
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
      
      // Pastikan dimensi kolom & baris mencukupi
      if (sheet.getMaxRows() < numRows) {
        sheet.insertRowsAfter(sheet.getMaxRows(), numRows - sheet.getMaxRows() + 10);
      }
      if (sheet.getMaxColumns() < numCols) {
        sheet.insertColumnsAfter(sheet.getMaxColumns(), numCols - sheet.getMaxColumns() + 10);
      }
      
      var range = sheet.getRange(1, 1, numRows, numCols);
      range.setValues(rows);
      
      // Update metadata sheet INFO_DATABASE jika ada
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
    
    if (action === 'updateVillage') {
      var idDesa = data.idDesa;
      var rowValues = data.rowValues;
      
      // Cari kolom H (kolom ke-8: IdDesa)
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
