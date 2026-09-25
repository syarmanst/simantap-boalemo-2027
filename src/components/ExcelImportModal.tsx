import React, { useState, useRef } from 'react';
import { VillagePlanRecord, UserRole } from '../types';
import { parseUploadedExcel } from '../utils/excelHandler';
import { X, UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, ShieldAlert } from 'lucide-react';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVillages: VillagePlanRecord[];
  onApplyImport: (updatedVillages: VillagePlanRecord[]) => void;
  role: UserRole;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  currentVillages,
  onApplyImport,
  role,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    updatedVillages: VillagePlanRecord[];
    matchedCount: number;
    errors: string[];
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsProcessing(true);
    try {
      const res = await parseUploadedExcel(selectedFile, currentVillages);
      setResult(res);
    } catch (err: any) {
      setResult({
        updatedVillages: currentVillages,
        matchedCount: 0,
        errors: [err.message || 'Gagal memproses file'],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (result && result.matchedCount > 0) {
      onApplyImport(result.updatedVillages);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Import Laporan Excel Perencanaan Desa
              </h3>
              <p className="text-[11px] text-slate-500">
                Format resmi spreadsheet monitoring Kab. Boalemo (.xlsx / .csv)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {role !== 'super_admin' ? (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Akses Terbatas: Khusus Super Administrator</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Fitur impor berkas Excel konfigurasi khusus hanya dapat dilakukan oleh <strong>Super Administrator</strong> Kabupaten. Admin Kecamatan dan Pengunjung Publik tidak memiliki akses import/ekspor data massal.
              </p>
            </div>
          ) : (
            <>
              {/* Drag and drop upload zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileChange(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50/50'
                    : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">
                  {file ? file.name : 'Pilih atau seret berkas Excel di sini'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Mendukung .xlsx, .xls, dan .csv format template 105 kolom
                </p>
              </div>

              {/* Processing Loader */}
              {isProcessing && (
                <div className="flex items-center justify-center gap-2 p-4 text-xs font-medium text-slate-600">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>Memeriksa dan membaca data excel...</span>
                </div>
              )}

              {/* Result Preview */}
              {result && !isProcessing && (
                <div className="space-y-3">
                  {result.matchedCount > 0 ? (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                      <div className="flex items-center gap-2 font-bold mb-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Berhasil Mencocokkan {result.matchedCount} Desa</span>
                      </div>
                      <p className="text-[11px] text-emerald-700 leading-relaxed">
                        Data kolom terverifikasi (RPJMDes, Musdes Persiapan, Musrenbangdes, Pengesahan, APBDes, KDMP). Klik tombol "Terapkan Pembaruan" untuk menyimpan ke aplikasi.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                      <div className="flex items-center gap-2 font-bold mb-1">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Tidak Ada Baris Desa yang Cocok</span>
                      </div>
                      <p className="text-[11px] text-amber-700">
                        Pastikan berkas yang diunggah menggunakan template Pemantauan Perencanaan Desa Boalemo dengan kode desa atau nama desa yang sesuai.
                      </p>
                    </div>
                  )}

                  {result.errors.length > 0 && (
                    <div className="text-[11px] text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                      {result.errors.join(', ')}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Tutup
          </button>
          {role === 'super_admin' && (
            <button
              onClick={handleConfirm}
              disabled={!result || result.matchedCount === 0}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold text-white transition-colors shadow-xs"
            >
              Terapkan Pembaruan ({result?.matchedCount || 0} Desa)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
