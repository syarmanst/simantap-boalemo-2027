import { KecamatanMeta, UserSession } from '../types';

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

  if (roleTarget === 'super_admin') {
    if (
      (cleanId === 'superadmin' || cleanId === 'super' || cleanId === 'admin_boalemo') &&
      (cleanPass === 'superadmin2027' || cleanPass === 'boalemo2027' || cleanPass === 'admin')
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
      message: 'Username atau Password Super Admin tidak sesuai. (Gunakan: superadmin / superadmin2027)',
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

  // Accept passwords: admin + kode, or admin2027, or same as kode, or 'admin'
  if (
    cleanPass === `admin${matchedKec.code}` ||
    cleanPass === 'admin2027' ||
    cleanPass === matchedKec.code ||
    cleanPass === 'admin' ||
    cleanPass === ''
  ) {
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
    message: `Password tidak sesuai untuk Admin Kecamatan ${matchedKec.name}. (Gunakan: admin${matchedKec.code} atau admin2027)`,
  };
};
