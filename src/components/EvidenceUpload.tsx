import React, { useState, useRef } from 'react';
import { EvidenceItem, ModuleKey, UserRole } from '../types';
import { compressImageFile } from '../services/evidenceService';
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
  Cloud,
  Loader2,
  Sparkles,
  ExternalLink,
  Link as LinkIcon,
  Check,
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
  const [isUploading, setIsUploading] = useState(false);
  const [previewItem, setPreviewItem] = useState<EvidenceItem | null>(null);
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [tempCaption, setTempCaption] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEdit = role !== 'viewer';

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const val = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
    const str = val + ' ' + sizes[i];
    if (bytes >= 1.15 * 1024 * 1024 && bytes <= 2.2 * 1024 * 1024) {
      return `${str} (HD)`;
    }
    return str;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !canEdit) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const isImg = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
        const itemType: 'image' | 'pdf' | 'document' = isImg
          ? 'image'
          : isPdf
          ? 'pdf'
          : 'document';

        let finalDataUrl = '';
        let finalThumbnailUrl = '';
        let finalSize = file.size;

        if (isImg) {
          // Kompresi dan optimasi foto resolusi tinggi ke format HD (1.2 - 2 MB)
          const compressed = await compressImageFile(file);
          finalDataUrl = compressed.dataUrl;
          finalThumbnailUrl = compressed.thumbnailUrl;
          finalSize = compressed.size;
        } else {
          finalDataUrl = await new Promise<string>((res) => {
            const reader = new FileReader();
            reader.onload = (e) => res((e.target?.result as string) || '');
            reader.onerror = () => res('');
            reader.readAsDataURL(file);
          });
        }

        if (!finalDataUrl) continue;

        const newItem: EvidenceItem = {
          id: `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          name: file.name,
          type: itemType,
          size: finalSize,
          formattedSize: formatFileSize(finalSize),
          uploadedAt: new Date().toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          dataUrl: finalDataUrl,
          thumbnailUrl: finalThumbnailUrl || finalDataUrl,
          caption: isImg ? 'Dokumentasi Kegiatan (HD)' : 'Dokumen Berita Acara / Surat',
        };
        onAddEvidence(newItem);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = (item: EvidenceItem) => {
    // 1. Jika dataUrl lokal (Base64) tersedia, unduh langsung via Blob (kecepatan instan & 100% HD asli)
    if (item.dataUrl && item.dataUrl.startsWith('data:')) {
      try {
        const parts = item.dataUrl.split(';base64,');
        const contentType = parts[0].replace('data:', '') || 'application/octet-stream';
        const byteCharacters = atob(parts[1]);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += 512) {
          const slice = byteCharacters.slice(offset, offset + 512);
          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }
          byteArrays.push(new Uint8Array(byteNumbers));
        }
        const blob = new Blob(byteArrays, { type: contentType });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = item.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
        return;
      } catch (errBlob) {
        console.warn('Gagal unduh via blob lokal:', errBlob);
      }
    }

    // 2. Jika driveFileId ada, unduh langsung via direct download resmi Google Drive
    if (item.driveFileId) {
      window.open(`https://drive.usercontent.google.com/download?id=${item.driveFileId}&export=download`, '_blank');
      return;
    }

    // 3. Fallback jika ada downloadUrl
    if (item.downloadUrl && (item.downloadUrl.startsWith('http://') || item.downloadUrl.startsWith('https://'))) {
      window.open(item.downloadUrl, '_blank');
      return;
    }

    if (item.dataUrl) {
      const link = document.createElement('a');
      link.href = item.dataUrl;
      link.download = item.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleCopyLink = (item: EvidenceItem) => {
    const linkToCopy = item.downloadUrl || item.viewUrl || item.dataUrl;
    if (linkToCopy) {
      navigator.clipboard.writeText(linkToCopy);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (canEdit) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (canEdit) handleFiles(e.dataTransfer.files);
      }}
      className={`bg-white rounded-xl border transition-all shadow-xs overflow-hidden mt-5 ${
        isDragging ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20' : 'border-slate-200'
      }`}
    >
      {/* Header */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <UploadCloud className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-bold text-slate-900">
                Bukti Foto & Dokumen Pendukung
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-semibold">
                {evidenceList.length} Berkas
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/80 flex items-center gap-1 font-semibold">
                <Sparkles className="w-3 h-3 text-purple-600" />
                <span>Format HD 1.2 - 2 MB</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center gap-1 font-medium">
                <Cloud className="w-3 h-3 text-blue-600" />
                <span>Google Sheets: BUKTI_DOKUMEN</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Daftar nama berkas terunggah (klik nama untuk melihat pratinjau). Tersimpan otomatis di Google Spreadsheet dengan link download langsung HD.
            </p>
          </div>
        </div>

        {canEdit && (
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs self-start sm:self-auto cursor-pointer"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menyimpan ke Cloud...</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Unggah Bukti HD</span>
              </>
            )}
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
              Tarik & Letakkan foto kegiatan atau dokumen di sini, atau klik untuk memilih
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Format Otomatis: <strong className="text-purple-700 font-semibold">HD Kualitas Tinggi (1.2 - 2 MB)</strong> • Link download otomatis tersedia untuk admin di Spreadsheet
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
              Mendukung: JPG, PNG, WEBP, PDF, DOC, DOCX, XLS
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

        {/* Daftar Nama Berkas Dokumen Terunggah (Clean Document List without photo display) */}
        {evidenceList.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1 pb-1">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>Daftar Nama Berkas Terunggah ({evidenceList.length})</span>
              </span>
              <span className="text-[11px] text-slate-400 italic">
                Klik nama file untuk pratinjau di aplikasi
              </span>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white overflow-hidden shadow-xs">
              {evidenceList.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors group"
                >
                  {/* Left: File Icon & Clickable Name */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="flex items-center justify-center shrink-0 mt-0.5">
                      {item.type === 'image' ? (
                        <div
                          onClick={() => setPreviewItem(item)}
                          className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-700 flex items-center justify-center cursor-pointer hover:bg-emerald-100 transition-colors"
                          title="Klik untuk pratinjau foto HD"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </div>
                      ) : item.type === 'pdf' ? (
                        <div
                          onClick={() => setPreviewItem(item)}
                          className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-200/80 text-rose-700 flex items-center justify-center cursor-pointer hover:bg-rose-100 transition-colors"
                          title="Klik untuk pratinjau dokumen PDF"
                        >
                          <FileText className="w-4 h-4" />
                        </div>
                      ) : (
                        <div
                          onClick={() => setPreviewItem(item)}
                          className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-700 flex items-center justify-center cursor-pointer hover:bg-blue-100 transition-colors"
                          title="Klik untuk pratinjau dokumen"
                        >
                          <File className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      {/* Clickable File Name */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono text-slate-400 font-medium">
                          #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPreviewItem(item)}
                          className="text-left font-bold text-xs text-slate-800 hover:text-emerald-700 hover:underline flex items-center gap-1.5 cursor-pointer group/name"
                          title="Klik nama berkas untuk melihat pratinjau di aplikasi"
                        >
                          <span className="truncate max-w-[240px] sm:max-w-md md:max-w-lg lg:max-w-xl">
                            {item.name}
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded font-medium border border-emerald-200/60 opacity-90 group-hover/name:opacity-100 shrink-0">
                            <Eye className="w-3 h-3" />
                            <span>Preview</span>
                          </span>
                        </button>
                      </div>

                      {/* Caption editor / display */}
                      {editingCaptionId === item.id ? (
                        <div className="flex items-center gap-1 pt-0.5 max-w-md">
                          <input
                            type="text"
                            value={tempCaption}
                            onChange={(e) => setTempCaption(e.target.value)}
                            placeholder="Tulis keterangan dokumen..."
                            className="text-[11px] px-2 py-1 bg-white border border-slate-300 rounded focus:outline-hidden focus:ring-1 focus:ring-emerald-500 w-full"
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
                            className="text-[10px] px-2.5 py-1 bg-emerald-600 text-white rounded font-semibold shrink-0 cursor-pointer"
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
                          className={`text-[11px] text-slate-600 truncate max-w-xl ${
                            canEdit
                              ? 'hover:text-emerald-700 hover:underline cursor-pointer'
                              : ''
                          }`}
                          title={canEdit ? 'Klik untuk mengedit keterangan berkas' : ''}
                        >
                          {item.caption || (canEdit ? '+ Tambah keterangan berkas...' : '-')}
                        </p>
                      )}

                      {/* Metadata Badges */}
                      <div className="flex items-center gap-2 text-[10px] flex-wrap pt-0.5">
                        <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-mono font-semibold border border-purple-200/60">
                          {item.formattedSize || 'HD'}
                        </span>
                        <span className="text-slate-400 font-mono">
                          {item.uploadedAt}
                        </span>
                        {item.downloadUrl && (
                          <span className="inline-flex items-center gap-1 text-slate-500 font-mono">
                            <span>•</span>
                            <span className="text-emerald-700 font-medium">Tersimpan di Cloud</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Action Buttons */}
                  <div className="flex items-center gap-1 self-end sm:self-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => setPreviewItem(item)}
                      title="Lihat Pratinjau Berkas"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Preview</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownload(item)}
                      title="Unduh Dokumen HD Langsung"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Unduh</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyLink(item)}
                      title="Salin Tautan Cloud Spreadsheet"
                      className="p-1.5 text-slate-500 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <LinkIcon className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => onRemoveEvidence(item.id)}
                        title="Hapus Berkas Ini"
                        className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Upload More Button below the list */}
            {canEdit && (
              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-semibold py-1 px-2 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Berkas Bukti Lainnya</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox / Preview Modal HD */}
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
                <span className="text-[10px] px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded font-mono font-semibold border border-purple-500/30 shrink-0">
                  HD 1.2-2MB
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(previewItem)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh HD</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
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
                    Berkas dokumen resmi ({previewItem.formattedSize}). Klik tombol di bawah untuk mengunduh berkas langsung.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleDownload(previewItem)}
                    className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 mx-auto cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh Berkas Sekarang</span>
                  </button>
                </div>
              )}

              {/* Caption & Metadata Footer in Modal */}
              <div className="mt-3 w-full bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">
                    Keterangan: {previewItem.caption || '-'}
                  </span>
                  {previewItem.downloadUrl && (
                    <a
                      href={previewItem.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Link Google Spreadsheet</span>
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono flex-wrap pt-0.5">
                  <span className="font-bold text-emerald-700">Format HD: {previewItem.formattedSize}</span>
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
