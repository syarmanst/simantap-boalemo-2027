export interface ParticipantElements {
  pemdes: number | null;
  bpd: number | null;
  rtRw: number | null;
  artm: number | null; // Anggota Rumah Tangga Miskin
  pemuda: number | null;
  klpTani: number | null;
  klpNelayan: number | null;
  klpDifabel: number | null;
  klpMarginal: number | null;
  tokohAdat: number | null; // or tokohMasyarakat in KDMP
  tokohAgama: number | null;
  kaderDesa: number | null;
  peninjau: number | null;
  klpLainnya: number | null;
}

export interface ForumSession {
  tanggal: string; // dd/mm/yyyy or formatted
  lk: number | null;
  pr: number | null;
  unsur: ParticipantElements;
  keterangan: string;
}

export interface KdmpSession extends ForumSession {
  melaksanakan: number | null; // 1 = melaksanakan, 0 = tidak melaksanakan
}

export interface EvidenceItem {
  id: string;
  name: string;
  type: 'image' | 'pdf' | 'document';
  size: number; // bytes
  formattedSize: string;
  uploadedAt: string;
  dataUrl: string; // base64 string
  caption?: string;
}

export interface VillagePlanRecord {
  no: number;
  idProv: string;
  provinsi: string;
  idKab: string;
  kabupaten: string;
  idKec: string;
  kecamatan: string;
  idDesa: string;
  desa: string;

  // Modul 1: Dasar RPJM Desa
  rpjmDesTgl: string;

  // Modul 2: Musdes Persiapan & Tim RKPDes
  musdesPersiapan: ForumSession;

  // Modul 3: Pencermatan Ulang RPJM Desa
  pencermatanRpjmTgl: string;

  // Modul 4: Musrenbangdes Pembahasan Rancangan RKP Desa
  musrenbangdes: ForumSession;

  // Modul 5: Musdes Pengesahan RKP Desa & DU RKP
  musdesPengesahan: ForumSession;

  // Modul 6: Penetapan Perdes RKP Desa & RAPB/APB Desa
  perdesRkpTgl: string;
  rapbDesTgl: string;
  perdesApbTgl: string;
  perdesApbNomor: string;
  perdesApbTahun: string;

  // Modul 7: Musdesus KDMP
  musdesusKdmp: KdmpSession;

  // Modul 8: Perubahan & Nilai DD
  perdesRkpPerubahanTgl: string;
  perdesApbPerubahanTgl: string;
  perdesApbPerubahanNomor: string;
  nilaiDdKdmp: number | null;
  keteranganUmum: string;

  // Bukti Dukung / Lampiran Dokumen & Foto per Modul (Modul 1 - 8)
  evidence?: Partial<Record<ModuleKey, EvidenceItem[]>>;

  updatedAt?: string;
  updatedBy?: string;
}

export type ModuleKey =
  | 'overview'
  | 'modul1_rpjm'
  | 'modul2_musdes_persiapan'
  | 'modul3_pencermatan'
  | 'modul4_musrenbangdes'
  | 'modul5_musdes_pengesahan'
  | 'modul6_perdes_apb'
  | 'modul7_kdmp'
  | 'modul8_perubahan';

export interface ModuleConfig {
  key: ModuleKey;
  code: string;
  title: string;
  shortTitle: string;
  description: string;
  badge: string;
}

export type UserRole = 'super_admin' | 'admin_kecamatan' | 'viewer';

export interface KecamatanMeta {
  code: string;
  name: string;
  defaultVillageId: string;
}

export interface UserSession {
  role: UserRole;
  username: string;
  displayName: string;
  kecamatanCode?: string; // Kode kecamatan e.g. "750201"
  kecamatanName?: string; // Nama kecamatan e.g. "Paguyaman"
}
