import React, { useState, useEffect, useCallback, useRef } from 'react';
import { uploadProof, getProofs, deleteProof, type ProofUpload } from '../../app/hambaft-api';
import { Camera, ImagePlus, X, Check, Trash2, Upload, FileText, Play, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ProofUploader({ entityType, entityId }: { entityType: string; entityId: string }) {
  const [proofs, setProofs] = useState<ProofUpload[]>([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ base64: string; name: string; type: 'photo' | 'video' } | null>(null);
  const [caption, setCaption] = useState('');
  const [reflection, setReflection] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const fetchProofs = useCallback(async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const res = await getProofs(entityType, entityId);
      setProofs(res?.data?.proofs || []);
    } catch (err) {
      console.error('[hambaft] fetch proofs failed', err);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => { fetchProofs(); }, [fetchProofs]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, mediaType: 'photo' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size
    const maxSize = mediaType === 'video' ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(mediaType === 'video' ? 'حجم ویدیو نباید بیشتر از ۱۰۰ مگابایت باشد.' : 'حجم عکس نباید بیشتر از ۱۰ مگابایت باشد.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setSelectedFile({ base64, name: file.name, type: mediaType });
      if (mediaType === 'photo') {
        setPreviewUrl(base64);
      } else {
        setPreviewUrl(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile && !reflection.trim()) return;
    setSaving(true);
    setUploadProgress(30);
    try {
      const payload: any = {
        entity_type: entityType,
        entity: entityId,
        caption: caption || undefined,
        reflection: reflection || undefined,
        visibility: 'اشتراکی',
      };

      if (selectedFile) {
        payload.media_type = selectedFile.type;
        payload.filedata = selectedFile.base64;
        payload.filename = selectedFile.name;
      } else {
        payload.media_type = 'text';
      }

      setUploadProgress(60);
      await uploadProof(payload);
      setUploadProgress(100);
      setUploadModalOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setCaption('');
      setReflection('');
      setUploadProgress(0);
      await fetchProofs();
    } catch (err) {
      console.error('[hambaft] upload proof failed', err);
      setUploadProgress(0);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (proofId: string) => {
    if (!confirm('آیا مطمئنید؟ اثبات حذف می‌شود.')) return;
    try {
      await deleteProof(proofId);
      await fetchProofs();
    } catch (err) {
      console.error('[hambaft] delete proof failed', err);
    }
  };

  const closeModal = () => {
    setUploadModalOpen(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption('');
    setReflection('');
    setUploadProgress(0);
  };

  const hasProofs = proofs.length > 0;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h5 className="text-[10px] font-black text-[#9B6B61] dark:text-[#C59B93] flex items-center gap-1">
          <Camera className="w-3 h-3" />
          <span>اثبات پیشرفت</span>
          {hasProofs && (
            <span className="text-[8px] bg-[#9B6B61]/10 px-1.5 py-0.5 rounded-full">{proofs.length}</span>
          )}
        </h5>
        <button onClick={() => setUploadModalOpen(true)}
          className="text-[8px] font-black text-[#9B6B61] cursor-pointer hover:opacity-80 flex items-center gap-1">
          <Upload className="w-3 h-3" />بارگذاری
        </button>
      </div>

      {/* Proofs list */}
      {hasProofs && (
        <div>
          <button onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between text-[8px] font-bold text-[#8D7F72]">
            <span>{proofs.length} اثبات ثبت شده</span>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <AnimatePresence>
            {expanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="grid grid-cols-3 gap-1.5 mt-2">
                  {proofs.map(p => (
                    <div key={p.id} className="group relative rounded-lg overflow-hidden border border-[#E6DFD3]/30 bg-white dark:bg-[#20241A] aspect-square">
                      {p.media_type === 'photo' && p.file_url ? (
                        <img src={p.file_url} alt={p.caption || ''} className="w-full h-full object-cover" />
                      ) : p.media_type === 'video' && p.file_url ? (
                        <div className="w-full h-full flex items-center justify-center bg-[#E8ECE0] dark:bg-[#252A1F]">
                          <Play className="w-5 h-5 text-[#7C8363]" />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#F9F1D8] dark:bg-[#3D3D25] p-2">
                          <p className="text-[7px] text-[#5A5A40] text-center line-clamp-4">{p.reflection || p.caption || 'تأمل'}</p>
                        </div>
                      )}
                      {p.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-1">
                          <p className="text-[6px] text-white truncate">{p.caption}</p>
                        </div>
                      )}
                      {p.is_mine && (
                        <button onClick={() => handleDelete(p.id)}
                          className="absolute top-1 right-1 p-0.5 bg-black/50 rounded text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {!hasProofs && !loading && (
        <p className="text-[8px] text-[#8D7F72]">هنوز اثباتی ثبت نشده. <button onClick={() => setUploadModalOpen(true)} className="text-[#9B6B61] font-black cursor-pointer hover:underline">بارگذاری کنید</button></p>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {uploadModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#FDFBF7] dark:bg-[#1B1D16] border border-[#E6DFD3] dark:border-[#3D4133]/50 rounded-2xl p-5 max-w-sm w-full text-right space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                <h4 className="text-[11px] font-black text-[#2D3025] dark:text-[#E8ECE0] flex items-center gap-1.5"><Camera className="w-3.5 h-3.5 text-[#9B6B61]" />بارگذاری اثبات</h4>
                <button onClick={closeModal} className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 cursor-pointer"><X className="w-3.5 h-3.5 text-[#8D7F72]" /></button>
              </div>

              {/* Preview */}
              {previewUrl && (
                <div className="relative rounded-xl overflow-hidden border border-[#E6DFD3]/30 max-h-40">
                  <img src={previewUrl} alt="preview" className="w-full h-40 object-cover" />
                  <button onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white cursor-pointer"><X className="w-3 h-3" /></button>
                </div>
              )}
              {selectedFile?.type === 'video' && !previewUrl && (
                <div className="flex items-center gap-2 p-3 bg-[#E8ECE0] dark:bg-[#252A1F] rounded-xl">
                  <Play className="w-4 h-4 text-[#7C8363]" />
                  <span className="text-[9px] font-bold text-[#7C8363]">{selectedFile.name}</span>
                  <button onClick={() => setSelectedFile(null)} className="mr-auto p-1 text-[#8D7F72] cursor-pointer"><X className="w-3 h-3" /></button>
                </div>
              )}

              {/* File select buttons */}
              {!selectedFile && (
                <div className="flex gap-2">
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="hidden" onChange={e => handleFileSelect(e, 'photo')} />
                  <input ref={videoInputRef} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={e => handleFileSelect(e, 'video')} />
                  <button onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-3 bg-[#E8ECE0] dark:bg-[#252A1F] border border-[#DDE2D5]/50 rounded-xl cursor-pointer hover:opacity-90 flex flex-col items-center gap-1">
                    <ImagePlus className="w-5 h-5 text-[#7C8363]" />
                    <span className="text-[8px] font-black text-[#7C8363]">انتخاب عکس</span>
                  </button>
                  <button onClick={() => videoInputRef.current?.click()}
                    className="flex-1 py-3 bg-[#F4E9E4] dark:bg-[#2D2019] border border-[#EDDDD7]/50 rounded-xl cursor-pointer hover:opacity-90 flex flex-col items-center gap-1">
                    <Camera className="w-5 h-5 text-[#9B6B61]" />
                    <span className="text-[8px] font-black text-[#9B6B61]">انتخاب ویدیو</span>
                  </button>
                  <button onClick={() => { setSelectedFile({ base64: '', name: 'text_proof', type: 'photo' }); }}
                    className="flex-1 py-3 bg-[#F9F1D8] dark:bg-[#3D3D25] border border-[#EBE3C8]/50 rounded-xl cursor-pointer hover:opacity-90 flex flex-col items-center gap-1">
                    <FileText className="w-5 h-5 text-[#5A5A40]" />
                    <span className="text-[8px] font-black text-[#5A5A40]">فقط متن</span>
                  </button>
                </div>
              )}

              {/* Caption */}
              <div>
                <label className="text-[9px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">کپشن (اختیاری)</label>
                <input type="text" value={caption} onChange={e => setCaption(e.target.value)} placeholder="مثلاً: تمرین امروز رو کامل انجام دادم 💪"
                  className="w-full text-[10px] font-bold p-2.5 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A]" />
              </div>

              {/* Reflection */}
              <div>
                <label className="text-[9px] font-black text-[#8D7F72] dark:text-[#9D978B] block mb-1">تأمل (اختیاری)</label>
                <textarea value={reflection} onChange={e => setReflection(e.target.value)} rows={2} placeholder="چه کاری انجام دادی؟ حالت چطور بود؟"
                  className="w-full text-[10px] font-bold p-2.5 rounded-xl border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A] resize-none" />
              </div>

              {/* Upload progress */}
              {saving && uploadProgress > 0 && (
                <div className="w-full bg-[#E6DFD3] dark:bg-[#3D4133] rounded-full h-1.5">
                  <div className="bg-[#9B6B61] h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}

              {/* Submit */}
              <button onClick={handleUpload} disabled={saving || (!selectedFile && !reflection.trim())}
                className="w-full py-2.5 bg-[#9B6B61] dark:bg-[#C59B93] text-white dark:text-[#1B1D16] text-[10px] font-black rounded-xl cursor-pointer hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-1.5">
                <Check className="w-3.5 h-3.5" />{saving ? 'در حال بارگذاری...' : 'ثبت اثبات'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
