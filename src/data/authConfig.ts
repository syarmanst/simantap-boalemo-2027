import { KecamatanMeta, UserSession } from '../types';
import { fetchCloudPasswords, saveCloudPassword } from '../services/appsScriptDatabase';

export const KECAMATAN_LIST_META: KecamatanMeta[] = [
  { code: '750201', name: 'Paguyaman', defaultVillageId: '7502012004' },
  { code: '750202', name: 'Wonosari', defaultVillageId: '7502022001' },
  { code: '750203', name: 'Dulupi', defaultVillageId: '7502032001' },
  { code: '750204', name: 'Tilamuta', defaultVillageId: '7502042001' },
  { code: '750205', name: 'Mananggu', defaultVillageId: '7502052001' },
  { code: '750206', name: 'Botumoita', defaultVillageId: '7502062001' },
  { code: '750207', name: 'Paguyaman Pantai', defaultVillageId: '7502072001' },
];

export const DEFAULT_SUPERADMIN = {
  username: 'superadmin',
  password: 'superadmin2027',
  displayName: 'Super Administrator Kabupaten',
};

export const CUSTOM_PASSWORDS_KEY = 'boalemo_custom_passwords';

export const getCustomPasswords = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(CUSTOM_PASSWORDS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};

/**
 * Simpan password lokal dan kirimkan ke Google Spreadsheet via Apps Script
 * agar seluruh perangkat lain langsung tersinkronisasi.
 */
export const saveCustomPassword = (accountKey: string, newPass: string): void => {
  const current = getCustomPasswords();
  current[accountKey] = newPass;
  localStorage.setItem(CUSTOM_PASSWORDS_KEY, JSON.stringify(current));

  // Sync to Cloud Apps Script in background
  saveCloudPassword(accountKey, newPass).catch((err) => {
    console.warn('Sync password to cloud failed:', err);
  });
};

/**
 * Sinkronisasi password dari Cloud Google Spreadsheet ke penyimpanan lokal
 */
export const syncPasswordsFromCloud = async (): Promise<Record<string, string>> => {
  try {
    const cloudPasswords = await fetchCloudPasswords();
    if (cloudPasswords && Object.keys(cloudPasswords).length > 0) {
      const current = getCustomPasswords();
      const merged = { ...current, ...cloudPasswords };
      localStorage.setItem(CUSTOM_PASSWORDS_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn('Gagal sinkron password dari cloud:', err);
  }
  return getCustomPasswords();
};

export const resetPasswordToDefault = (accountKey: string): void => {
  const current = getCustomPasswords();
  delete current[accountKey];
  localStorage.setItem(CUSTOM_PASSWORDS_KEY, JSON.stringify(current));

  // Also remove or set to default on cloud
  const defaultPass = accountKey === 'superadmin' ? DEFAULT_SUPERADMIN.password : `admin${accountKey.replace('kec_', '')}`;
  saveCloudPassword(accountKey, defaultPass).catch(() => {});
};

export const changeAccountPassword = (
  roleTarget: 'super_admin' | 'admin_kecamatan',
  identifier: string,
  currentPass: string,
  newPass: string
): { success: boolean; message: string } => {
  const cleanPass = currentPass.trim();
  const cleanNewPass = newPass.trim();

  if (!cleanNewPass || cleanNewPass.length < 5) {
    return { success: false, message: 'Password baru minimal harus 5 karakter.' };
  }

  const customPasswords = getCustomPasswords();

  if (roleTarget === 'super_admin') {
    const savedPass = customPasswords['superadmin'];
    const isOldValid = savedPass
      ? cleanPass === savedPass
      : (cleanPass === DEFAULT_SUPERADMIN.password || cleanPass === 'boalemo2027' || cleanPass === 'admin');

    if (!isOldValid) {
      return { success: false, message: 'Password saat ini salah untuk akun Super Admin.' };
    }

    saveCustomPassword('superadmin', cleanNewPass);
    return { success: true, message: 'Password Super Admin berhasil diubah dan tersinkron ke semua perangkat!' };
  }

  // Admin Kecamatan
  const cleanId = identifier.trim().toLowerCase();
  const matchedKec = KECAMATAN_LIST_META.find(
    (k) =>
      k.code === cleanId ||
      k.name.toLowerCase() === cleanId ||
      `admin_${k.code}` === cleanId
  );

  if (!matchedKec) {
    return { success: false, message: 'Kecamatan tidak ditemukan.' };
  }

  const accountKey = `kec_${matchedKec.code}`;
  const savedKecPass = customPasswords[accountKey];
  const isKecOldValid = savedKecPass
    ? cleanPass === savedKecPass
    : (cleanPass === `admin${matchedKec.code}` || cleanPass === 'admin2027' || cleanPass === matchedKec.code || cleanPass === 'admin');

  if (!isKecOldValid) {
    return { success: false, message: `Password saat ini salah untuk Admin Kec. ${matchedKec.name}.` };
  }

  saveCustomPassword(accountKey, cleanNewPass);
  return { success: true, message: `Password Admin Kecamatan ${matchedKec.name} berhasil diubah dan tersinkron ke semua perangkat!` };
};

export const DEFAULT_VIEWER_SESSION: UserSession = {
  role: 'viewer',
  username: 'guest',
  displayName: 'Pengunjung Publik (Tamu)',
};

export const authenticateUser = (
  roleTarget: 'super_admin' | 'admin_kecamatan',
  identifier: string,
  pass: string
): { success: boolean; session?: UserSession; message?: string } => {
  const cleanId = identifier.trim().toLowerCase();
  const cleanPass = pass.trim();
  const customPasswords = getCustomPasswords();

  if (roleTarget === 'super_admin') {
    const customSuperPass = customPasswords['superadmin'];
    const isSuperPassValid = customSuperPass
      ? cleanPass === customSuperPass
      : (cleanPass === DEFAULT_SUPERADMIN.password || cleanPass === 'boalemo2027' || cleanPass === 'admin');

    if (
      (cleanId === 'superadmin' || cleanId === 'super' || cleanId === 'admin_boalemo') &&
      isSuperPassValid
    ) {
      return {
        success: true,
        session: {
          role: 'super_admin',
          username: 'superadmin',
          displayName: 'Super Admin (Kabupaten Boalemo)',
        },
      };
    }
    return {
      success: false,
      message: 'Username atau Password Super Admin tidak sesuai.',
    };
  }

  // Admin Kecamatan: Identifier can be either the 6-digit kecamatan code or kecamatan name
  const matchedKec = KECAMATAN_LIST_META.find(
    (k) =>
      k.code === cleanId ||
      k.name.toLowerCase() === cleanId ||
      `admin_${k.code}` === cleanId ||
      `admin_${k.name.toLowerCase()}` === cleanId
  );

  if (!matchedKec) {
    return {
      success: false,
      message:
        'Kode Kecamatan tidak ditemukan. Masukkan kode 6 digit wilayah Boalemo (misal: 750201 untuk Paguyaman).',
    };
  }

  const customKecPass = customPasswords[`kec_${matchedKec.code}`];
  const isKecPassValid = customKecPass
    ? cleanPass === customKecPass
    : (cleanPass === `admin${matchedKec.code}` ||
       cleanPass === 'admin2027' ||
       cleanPass === matchedKec.code ||
       cleanPass === 'admin');

  if (isKecPassValid) {
    return {
      success: true,
      session: {
        role: 'admin_kecamatan',
        username: matchedKec.code,
        displayName: `Admin Kec. ${matchedKec.name}`,
        kecamatanCode: matchedKec.code,
        kecamatanName: matchedKec.name,
      },
    };
  }

  return {
    success: false,
    message: `Password tidak sesuai untuk Admin Kecamatan ${matchedKec.name}.`,
  };
};
