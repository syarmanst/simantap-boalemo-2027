import React, { useState, useRef } from 'react';
import { EvidenceItem, ModuleKey, UserRole } from '../types';
import {
  UploadCloud,
  Image as ImageIcon,
  FileText,
  File,
  Trash2,
  Eye,
  Download,
  X,
  Plus,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface EvidenceUploadProps {
  moduleKey: ModuleKey;
  moduleName: string;
  evidenceList: EvidenceItem[];
  onAddEvidence: (item: EvidenceItem) => void;
  onRemoveEvidence: (id: string) => void;
  onUpdateCaption: (id: string, caption: string) => void;
  role: UserRole;
}

export const EvidenceUpload: React.FC<EvidenceUploadProps> = ({
  moduleKey,
  moduleName,
  evidenceList = [],
  onAddEvidence,
  onRemoveEvidence,
  onUpdateCaption,
  role,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewItem, setPreviewItem] = useState<EvidenceItem | null>(null);
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [tempCaption, setTempCaption] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEdit = role !== 'viewer';

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0 || !canEdit) return;

    Array.from(files).forEach((file) => {
      const isImg = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
      const itemType: 'image' | 'pdf' | 'document' = isImg
        ? 'image'
        : isPdf
        ? 'pdf'
        : 'document';

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const newItem: EvidenceItem = {
          id: `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          name: file.name,
          type: itemType,
          size: file.size,
          formattedSize: formatFileSize(file.size),
          uploadedAt: new Date().toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          dataUrl,
          caption: isImg ? 'Dokumentasi Kegiatan' : 'Dokumen Berita Acara / Surat',
        };
        onAddEvidence(newItem);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDownload = (item: EvidenceItem) => {
    const link = document.createElement('a');
    link.href = item.dataUrl;
    link.download = item.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden mt-5">
      {/* Header */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <UploadCloud className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-900">
                Bukti Foto & Dokumen Pendukung
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-semibold">
                {evidenceList.length} Berkas
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Dokumentasi foto musdes, berita acara, daftar hadir, SK Tim, atau lembaran Perdes
            </p>
          </div>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Unggah Bukti Baru</span>
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
        />

        {/* Drag & Drop Zone if list is empty */}
        {canEdit && evidenceList.length === 0 && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-emerald-500 bg-emerald-50/60'
                : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
            }`}
          >
            <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">
              Tarik & Letakkan foto atau dokumen di sini, atau klik untuk memilih
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Mendukung: JPG, PNG, PDF, DOC, DOCX, XLS (Foto kegiatan musdes, scan berita acara, daftar hadir)
            </p>
          </div>
        )}

        {/* Viewer Empty State */}
        {role === 'viewer' && evidenceList.length === 0 && (
          <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200">
            <FileText className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
            <p className="text-xs font-medium text-slate-600">
              Belum ada bukti foto atau dokumen yang diunggah untuk modul ini.
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Hanya Administrator yang dapat mengunggah berkas bukti.
            </p>
          </div>
        )}

        {/* Gallery / List of Uploaded Evidence */}
        {evidenceList.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {evidenceList.map((item) => (
              <div
                key={item.id}
                className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 flex flex-col justify-between hover:shadow-xs hover:border-slate-300 transition-all group"
              >
                <div>
                  {/* Media Preview or Icon Header */}
                  {item.type === 'image' ? (
                    <div
                      onClick={() => setPreviewItem(item)}
                      className="w-full h-32 rounded-lg bg-slate-200 overflow-hidden relative mb-2.5 cursor-pointer group-hover:opacity-95"
                    >
                      <img
                        src={item.dataUrl}
                        alt={item.caption || item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                        <Eye className="w-5 h-5 drop-shadow-md" />
                      </div>
                      <span className="absolute bottom-1.5 left-1.5 text-[9px] bg-slate-900/70 backdrop-blur-xs text-white px-1.5 py-0.5 rounded font-mono">
                        Foto
                      </span>
                    </div>
                  ) : (
                    <div
                      onClick={() => setPreviewItem(item)}
                      className="w-full h-24 rounded-lg bg-slate-100 border border-slate-200 flex flex-col items-center justify-center mb-2.5 cursor-pointer hover:bg-slate-200/60 transition-colors"
                    >
                      {item.type === 'pdf' ? (
                        <FileText className="w-8 h-8 text-rose-600 mb-1" />
                      ) : (
                        <File className="w-8 h-8 text-blue-600 mb-1" />
                      )}
                      <span className="text-[10px] font-bold text-slate-700 uppercase font-mono">
                        {item.type}
                      </span>
                    </div>
                  )}

                  {/* Title & Caption */}
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-1">
                      <span
                        title={item.name}
                        className="text-xs font-bold text-slate-800 truncate block flex-1"
                      >
                        {item.name}
                      </span>
                    </div>

                    {/* Caption edit / view */}
                    {editingCaptionId === item.id ? (
                      <div className="flex items-center gap-1 mt-1">
                        <input
                          type="text"
                          value={tempCaption}
                          onChange={(e) => setTempCaption(e.target.value)}
                          placeholder="Beri keterangan..."
                          className="text-[11px] px-2 py-1 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              onUpdateCaption(item.id, tempCaption);
                              setEditingCaptionId(null);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateCaption(item.id, tempCaption);
                            setEditingCaptionId(null);
                          }}
                          className="text-[10px] px-2 py-1 bg-emerald-600 text-white rounded font-semibold shrink-0"
                        >
                          Simpan
                        </button>
                      </div>
                    ) : (
                      <p
                        onClick={() => {
                          if (canEdit) {
                            setEditingCaptionId(item.id);
                            setTempCaption(item.caption || '');
                          }
                        }}
                        className={`text-[11px] text-slate-600 truncate ${
                          canEdit
                            ? 'hover:text-emerald-700 hover:underline cursor-pointer'
                            : ''
                        }`}
                        title={canEdit ? 'Klik untuk mengedit keterangan' : ''}
                      >
                        {item.caption || (canEdit ? '+ Tambah keterangan' : '-')}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                      <span>{item.formattedSize}</span>
                      <span>·</span>
                      <span>{item.uploadedAt}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2.5 mt-2 border-t border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPreviewItem(item)}
                      title="Lihat Pratinjau"
                      className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-200 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload(item)}
                      title="Unduh Berkas"
                      className="p-1 text-slate-500 hover:text-emerald-700 rounded hover:bg-slate-200 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => onRemoveEvidence(item.id)}
                      title="Hapus Bukti"
                      className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox / Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2 truncate pr-2">
                {previewItem.type === 'image' ? (
                  <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                )}
                <span className="text-xs font-bold truncate">{previewItem.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(previewItem)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-200 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto flex flex-col items-center justify-center bg-slate-100/70 min-h-[250px]">
              {previewItem.type === 'image' ? (
                <div className="max-h-[60vh] flex items-center justify-center overflow-hidden rounded-lg shadow-sm bg-black/5">
                  <img
                    src={previewItem.dataUrl}
                    alt={previewItem.name}
                    className="max-h-[60vh] w-auto object-contain rounded-lg"
                  />
                </div>
              ) : previewItem.type === 'pdf' ? (
                <div className="w-full h-[60vh] rounded-lg overflow-hidden border border-slate-200 bg-white">
                  <iframe
                    src={previewItem.dataUrl}
                    title={previewItem.name}
                    className="w-full h-full"
                  />
                </div>
              ) : (
                <div className="text-center p-8 bg-white rounded-xl border border-slate-200 max-w-sm">
                  <File className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                  <h4 className="text-xs font-bold text-slate-800">{previewItem.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Berkas dokumen ({previewItem.formattedSize}). Klik tombol di bawah untuk mengunduh dan membukanya di komputer Anda.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleDownload(previewItem)}
                    className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 mx-auto"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh Berkas</span>
                  </button>
                </div>
              )}

              {/* Caption & Metadata Footer in Modal */}
              <div className="mt-3 w-full bg-white p-3 rounded-lg border border-slate-200 text-xs">
                <span className="font-semibold text-slate-800 block">
                  Keterangan: {previewItem.caption || '-'}
                </span>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 font-mono">
                  <span>Ukuran: {previewItem.formattedSize}</span>
                  <span>·</span>
                  <span>Diunggah: {previewItem.uploadedAt}</span>
                  <span>·</span>
                  <span>Modul: {moduleName}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
