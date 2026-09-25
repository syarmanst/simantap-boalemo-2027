import React from 'react';
import { UserRole } from '../types';

interface RoleSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole?: UserRole;
  onRoleChange?: (newRole: UserRole) => void;
}

/**
 * @deprecated Use LoginModal instead for role switching and authentication.
 */
export const RoleSwitchModal: React.FC<RoleSwitchModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 text-center">
        <h3 className="text-sm font-bold text-slate-900 mb-2">Autentikasi Pengguna</h3>
        <p className="text-xs text-slate-500 mb-4">
          Silakan gunakan dialog Login Petugas untuk beralih antara Super Admin, Admin Kecamatan, dan Pengunjung Publik.
        </p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg"
        >
          Tutup
        </button>
      </div>
    </div>
  );
};
