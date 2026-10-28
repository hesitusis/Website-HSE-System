import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Calendar,
  MapPin,
  User,
  AlertCircle,
  Clock,
  CheckCircle,
  FileText,
  Camera,
  RefreshCw,
  FolderOpen,
  Send,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Search,
  CheckSquare
} from 'lucide-react';
import { TemuanMioRecord } from '../types.js';
import { PageHeader, Button, Badge } from './common/index.js';

interface TemuanMioProps {
  userRealName: string;
  onBack: () => void;
}

export default function TemuanMio({ userRealName, onBack }: TemuanMioProps) {
  const [records, setRecords] = useState<TemuanMioRecord[]>([]);
  const [isFetchLoading, setIsFetchLoading] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter and selection states
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Form input states
  const [tanggalPerbaikan, setTanggalPerbaikan] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [keteranganPerbaikan, setKeteranganPerbaikan] = useState('');
  const [uploadedFile, setUploadedFile] = useState<{ name: string; data: string } | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Slideshow state for "Sebelum" images
  const [activeImageIdx, setActiveImageIdx] = useState<Record<number, number>>({});

  useEffect(() => {
    fetchMioData();
  }, []);

  const fetchMioData = async () => {
    setIsFetchLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/mio/list');
      const data = await res.json();
      if (data.success) {
        setRecords(data.list || []);
      } else {
        setErrorMsg(data.message || 'Gagal memuat rincian database Temuan MIO.');
      }
    } catch (err: any) {
      setErrorMsg('Koneksi terputus. Silakan coba klik Sinkron ulang.');
    } finally {
      setIsFetchLoading(false);
    }
  };

  // 1. Filter data to Status === OPEN
  const openRecords = records.filter(r => r.status === 'OPEN');

  // 2. Extract unique Dates from OPEN status data
  const uniqueDates = Array.from(new Set(openRecords.map(r => r.tanggal))).sort((a: string, b: string) => {
    // Basic formatting sort fallback or string chronological sort
    return b.localeCompare(a);
  });

  // Automatically select first date if none is selected
  useEffect(() => {
    if (uniqueDates.length > 0 && !selectedDate) {
      setSelectedDate(uniqueDates[0]);
    }
  }, [uniqueDates, selectedDate]);

  // 3. Get findings for the selected date
  const selectedDateRecords = openRecords.filter(r => r.tanggal === selectedDate);

  // Automatically select the first record of the selected date
  useEffect(() => {
    if (selectedDateRecords.length > 0) {
      // If currently selected record is not in this date, select the first one
      const exists = selectedDateRecords.some(r => r.rowId === selectedRecordId);
      if (!exists) {
        setSelectedRecordId(selectedDateRecords[0].rowId);
      }
    } else {
      setSelectedRecordId(null);
    }
  }, [selectedDate, selectedDateRecords, selectedRecordId]);

  // Find the currently active chosen record
  const activeRecord = records.find(r => r.rowId === selectedRecordId);

  // Helper to normalize Google Drive web links to direct embedding links
  const normalizeImageUrl = (url: string): string => {
    if (!url) return '';
    // Check if it's a google drive URL
    if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
      let fileId = '';
      
      // Look for /file/d/{ID}/
      const fdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (fdMatch && fdMatch[1]) {
        fileId = fdMatch[1];
      } else {
        // Look for ?id={ID} or &id={ID}
        const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (idMatch && idMatch[1]) {
          fileId = idMatch[1];
        }
      }
      
      if (fileId) {
        return `/api/drive-proxy?id=${fileId}`;
      }
    }
    return url;
  };

  // Parse safety photos helper
  const getImagesArray = (sebelumText: string): string[] => {
    if (!sebelumText || sebelumText.trim() === '-') return [];
    return sebelumText
      .split(/[\s,;\n]+/)
      .map(url => url.trim())
      .filter(url => url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.length > 5)
      .map(url => normalizeImageUrl(url));
  };

  const activePhotos = activeRecord ? getImagesArray(activeRecord.sebelum) : [];

  // Drag and drop photo upload handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Hanya diperbolehkan mengunduh berkas gambar/foto bukti fisik.');
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setUploadedFile({
        name: file.name,
        data: reader.result as string
      });
      setFilePreview(reader.result as string);
    };
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleSaveClosing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecordId) {
      setErrorMsg('Pilih salah satu temuan MIO yang akan diselesaikan.');
      return;
    }
    if (!tanggalPerbaikan) {
      setErrorMsg('Silakan pilih Tanggal Perbaikan tindak lanjut.');
      return;
    }
    if (!uploadedFile) {
      setErrorMsg('Wajib mengunggah foto bukti tindak lanjut fisik perbaikan.');
      return;
    }

    setIsSubmitLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/mio/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rowId: selectedRecordId,
          tanggalPerbaikan,
          fileData: uploadedFile,
          keterangan: keteranganPerbaikan
        })
      });

      const result = await res.json();
      if (result.success) {
        setSuccessMsg(result.message || 'Selesai! Temuan MIO berhasil ditutup dan dilog.');
        setKeteranganPerbaikan('');
        setUploadedFile(null);
        setFilePreview(null);
        // Refresh the database status
        await fetchMioData();
      } else {
        setErrorMsg(result.message || 'Gagal menyimpan perubahan status.');
      }
    } catch (err) {
      setErrorMsg('Gagal terhubung dengan server API.');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <PageHeader
        title="Closing Temuan MIO"
        subtitle="Manajemen tindak lanjut temuan lapangan Management Inspection & Observation (MIO) yang berstatus OPEN."
        onBack={onBack}
        badge={<Badge variant="indigo">HSE AUDIT INTEGRATION</Badge>}
        icon={<ShieldAlert className="h-6 w-6 text-indigo-600" />}
        actions={
          <Button
            variant="secondary"
            icon={<RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isFetchLoading ? 'animate-spin' : ''}`} />}
            disabled={isFetchLoading}
            onClick={fetchMioData}
          >
            Sinkron Data
          </Button>
        }
      />

      {errorMsg && (
        <div className="p-4 bg-rose-50 text-rose-800 border-l-4 border-rose-500 rounded-r-xl text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-800 border-l-4 border-emerald-500 rounded-r-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {openRecords.length === 0 && !isFetchLoading ? (
        <div className="text-center py-20 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 max-w-lg mx-auto space-y-3">
          <div className="h-12 w-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckSquare className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Semua Temuan MIO Selesai (NOL Open)</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Tidak ada temuan lapangan yang berstatus <b>OPEN</b> saat ini pada Google Sheets terpilih. Seluruh penyimpangan telah ditutup dan diperbaiki secara tuntas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT SIDE: Filter & Target Selection Column */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Filter Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="text-xs font-black tracking-wider text-slate-405 uppercase flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-indigo-500" />
                Langkah 1: Filter Pengelompokan Tanggal Temuan
              </h3>
              
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-650">Pilih Tanggal Temuan MIO (Masih OPEN)</label>
                <select
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setUploadedFile(null);
                    setFilePreview(null);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-400 focus:bg-white font-mono"
                >
                  {uniqueDates.length === 0 ? (
                    <option value="">(Tidak ada tanggal dengan status OPEN)</option>
                  ) : (
                    uniqueDates.map((date, idx) => (
                      <option key={idx} value={date}>
                        📅 {date} — ({openRecords.filter(r => r.tanggal === date).length} Temuan Aktif)
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Finding Selection List */}
              <div className="space-y-2 pt-2">
                <label className="text-[11px] font-bold text-slate-650 block">
                  Pilih Temuan Terperinci Pada Tanggal Terpilih:
                </label>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {selectedDateRecords.map((item) => {
                    const isSelected = selectedRecordId === item.rowId;
                    return (
                      <div
                        key={item.rowId}
                        onClick={() => {
                          setSelectedRecordId(item.rowId);
                          setUploadedFile(null);
                          setFilePreview(null);
                        }}
                        className={`p-3.5 rounded-xl border text-left transition duration-200 cursor-pointer select-none space-y-1.5 ${
                          isSelected
                            ? 'bg-gradient-to-r from-indigo-50 to-white border-indigo-400 ring-1 ring-indigo-300'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                        }`}
                      >
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-mono bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                            Baris #{item.rowId}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            item.priority.toLowerCase().includes('high')
                              ? 'bg-rose-50 text-rose-700 border border-rose-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            ⚡ {item.priority || "MEDIUM"}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 line-clamp-2">
                          {item.penyimpangan}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                          <MapPin className="h-3 w-3 text-slate-400 inline shrink-0" />
                          <span className="truncate">{item.lokasi}</span>
                          <span className="text-slate-300">&bull;</span>
                          <span className="truncate font-semibold text-slate-600">{item.section}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quick Summary Dashboard Widget */}
            <div className="bg-slate-950 text-white p-5 rounded-2xl border border-slate-800/80 shadow-md">
              <h4 className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" />
                Informasi Departemen Safety
              </h4>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                MIO (Management Inspection & Observation) wajib diperiksa dan diselesaikan sebelum tenggat berakhir. Operator penanggung jawab penutupan: <b>{userRealName || "HSE Officer"}</b>.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-4 text-center border-t border-slate-800 mt-4">
                <div>
                  <div className="text-xs text-slate-400 font-semibold">Total Terdeteksi</div>
                  <div className="text-2xl font-black text-indigo-300 mt-1">{records.length}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-semibold">Daftar Aktif (OPEN)</div>
                  <div className="text-2xl font-black text-rose-400 mt-1">{openRecords.length}</div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Current selected Finding Details & Closing Submission */}
          <div className="lg:col-span-7 space-y-6">
            
            {activeRecord ? (
              <div className="space-y-6">
                
                {/* 1. Details Bento Box */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 className="text-xs font-black tracking-wider text-slate-405 uppercase flex items-center gap-2">
                      <FileText className="h-4.5 w-4.5 text-indigo-500" />
                      Detail Penyimpangan Temuan Lapangan
                    </h3>
                    <span className="text-xs text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full font-bold">
                      {activeRecord.kategoriTemuan || "Investigasi K3"}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Deskripsi Penyimpangan</span>
                      <p className="text-xs font-extrabold text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 mt-1">
                        {activeRecord.penyimpangan}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-[10px] text-zinc-400 font-bold block">LOKASI UTAMA</span>
                        <span className="text-xs font-bold text-slate-700">{activeRecord.lokasi || "-"}</span>
                      </div>
                      <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-[10px] text-zinc-400 font-bold block">DETAIL AREA</span>
                        <span className="text-xs font-bold text-slate-705">{activeRecord.detailLokasi || "-"}</span>
                      </div>
                      <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-[10px] text-zinc-400 font-bold block">PIC PENANGGUNG JAWAB</span>
                        <span className="text-xs font-bold text-slate-705 flex items-center gap-1">
                          <User className="h-3 w-3 text-slate-400 inline" />
                          {activeRecord.pic || "-"} ({activeRecord.section || "-"})
                        </span>
                      </div>
                      <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-1">
                        <span className="text-[10px] text-zinc-400 font-bold block">BATAS WAKTU (DEADLINE)</span>
                        <span className="text-xs font-black text-rose-600 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-rose-500" />
                          {activeRecord.batasWaktu || "Mendesak"}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Rencana Tindakan Perbaikan</span>
                      <p className="text-xs font-medium text-slate-650 italic mt-1 leading-normal">
                        &quot;{activeRecord.tindakanPerbaikan}&quot;
                      </p>
                    </div>
                  </div>

                  {/* 2. Original Photos Gallery System */}
                  <div className="border-t border-slate-100 pt-4 space-y-2">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold flex items-center gap-1">
                      <Camera className="h-3.5 w-3.5 text-indigo-500" />
                      Bukti Foto/Visual Temuan Awal (Sebelum)
                    </span>

                    {activePhotos.length === 0 ? (
                      <div className="bg-slate-50 p-6 rounded-xl text-center text-slate-400 text-xs flex items-center justify-center gap-1">
                        <ImageIcon className="h-4 w-4" /> Tidak ada foto temuan awal lampiran.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Slide Show frame */}
                        <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-video group">
                          {/* Selected image with error check */}
                          {(() => {
                            const curIdx = activeImageIdx[activeRecord.rowId] || 0;
                            const activeUrl = activePhotos[curIdx] || '';
                            const hasFailed = imageErrors[activeUrl];

                            if (hasFailed) {
                              return (
                                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-100 overflow-y-auto w-full h-full">
                                  <AlertCircle className="h-9 w-9 text-amber-500 mb-2 animate-pulse shrink-0" />
                                  <h4 className="text-sm font-black text-amber-400 tracking-tight">Gagal Memuat Gambar</h4>
                                  <p className="text-[11px] text-slate-300 max-w-sm mt-1.5 leading-relaxed">
                                    Akses file dibatasi atau Google Drive API belum aktif pada Project GCP Anda.
                                  </p>
                                  <div className="mt-4 space-y-3 w-full max-w-xs text-left">
                                    <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg">
                                      <p className="text-[10px] font-bold text-indigo-400">📝 Langkah Utama (Paling Sering Terjadi):</p>
                                      <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                                        Pastikan link Google Drive disetel ke <b>&quot;Siapa saja yang memiliki link&quot; (Anyone with the link - Viewer/Pelihat)</b> agar gambar dapat diakses secara publik.
                                      </p>
                                    </div>
                                    <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg">
                                      <p className="text-[10px] font-bold text-amber-400">⚙️ Pengaturan Developer/Admin:</p>
                                      <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                                        Jika link sudah dibagikan publik namun tetap gagal, Anda perlu mengaktifkan Google Drive API terlebih dahulu pada konsol developer Project:
                                      </p>
                                      <a 
                                        href="https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=993861810704" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="mt-2 block w-full bg-indigo-600 hover:bg-indigo-500 hover:shadow-md text-white font-bold py-1.5 px-2 rounded-lg text-[10px] transition duration-200 text-center"
                                      >
                                        Aktifkan Google Drive API ↗
                                      </a>
                                    </div>
                                    <p className="text-[10px] text-slate-500 text-center leading-normal">
                                      Setelah melakukan perubahan, harap lakukan <b>&quot;Sinkron Data&quot;</b> ulang pada tombol di atas dashboard.
                                    </p>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <img
                                src={activeUrl}
                                alt={`Visual Temuan Awal ${curIdx}`}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-contain"
                                onError={() => {
                                  setImageErrors(prev => ({ ...prev, [activeUrl]: true }));
                                }}
                              />
                            );
                          })()}
                          
                          {/* Navigation buttons inside gallery */}
                          {activePhotos.length > 1 && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  const currentIdx = activeImageIdx[activeRecord.rowId] || 0;
                                  const nextIdx = currentIdx === 0 ? activePhotos.length - 1 : currentIdx - 1;
                                  setActiveImageIdx({ ...activeImageIdx, [activeRecord.rowId]: nextIdx });
                                }}
                                className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-black/60 hover:bg-black/85 text-white rounded-full flex items-center justify-center transition cursor-pointer"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const currentIdx = activeImageIdx[activeRecord.rowId] || 0;
                                  const nextIdx = currentIdx === activePhotos.length - 1 ? 0 : currentIdx + 1;
                                  setActiveImageIdx({ ...activeImageIdx, [activeRecord.rowId]: nextIdx });
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-black/60 hover:bg-black/85 text-white rounded-full flex items-center justify-center transition cursor-pointer"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                              <div className="absolute bottom-2 left-1/2 -translate-y-1/2 -translate-x-1/2 text-[9px] font-bold bg-black/70 px-2 py-0.5 rounded text-white font-mono">
                                {(activeImageIdx[activeRecord.rowId] || 0) + 1} / {activePhotos.length}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Pagination thumbnails */}
                        {activePhotos.length > 1 && (
                          <div className="flex gap-2 overflow-x-auto py-1">
                            {activePhotos.map((img, thumbIdx) => {
                              const isThumbFailed = imageErrors[img];
                              return (
                                <button
                                  key={thumbIdx}
                                  type="button"
                                  onClick={() => setActiveImageIdx({ ...activeImageIdx, [activeRecord.rowId]: thumbIdx })}
                                  className={`h-12 w-16 rounded-lg overflow-hidden shrink-0 border-2 transition ${
                                    (activeImageIdx[activeRecord.rowId] || 0) === thumbIdx
                                      ? 'border-indigo-500 scale-95'
                                      : 'border-transparent opacity-60 hover:opacity-100'
                                  }`}
                                >
                                  {isThumbFailed ? (
                                    <div className="h-full w-full bg-slate-900 flex items-center justify-center text-[10px] text-rose-400 font-bold font-mono">
                                      ERR
                                    </div>
                                  ) : (
                                    <img 
                                      src={img} 
                                      referrerPolicy="no-referrer" 
                                      className="h-full w-full object-cover"
                                      onError={() => {
                                        setImageErrors(prev => ({ ...prev, [img]: true }));
                                      }}
                                    />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Closing Form Inputs */}
                <form onSubmit={handleSaveClosing} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="border-b border-slate-100 pb-2.5">
                    <h3 className="text-xs font-black tracking-wider text-slate-405 uppercase flex items-center gap-1.5">
                      <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
                      Langkah 2: Submit Closing &amp; Tindak Lanjut
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Tanggal Perbaikan picker */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-650 block">Tanggal Perbaikan Realisasi</label>
                      <input
                        type="date"
                        value={tanggalPerbaikan}
                        onChange={(e) => setTanggalPerbaikan(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-400 focus:bg-white focus:ring-1 focus:ring-indigo-400"
                        required
                      />
                    </div>

                    {/* Optional Keterangan */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-650 block">Keterangan Perbaikan (Optional)</label>
                      <input
                        type="text"
                        value={keteranganPerbaikan}
                        onChange={(e) => setKeteranganPerbaikan(e.target.value)}
                        placeholder="Contoh: Kabel diganti tipe heavy-duty NYA..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-indigo-400 focus:bg-white focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>
                  </div>

                  {/* Drag and Drop File Upload */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-650 block">Upload Bukti Tindak Lanjut (Foto Sesudah Perbaikan)</label>
                    
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`relative border-2 border-dashed rounded-xl p-6 text-center transition duration-200 flex flex-col items-center justify-center gap-2 ${
                        dragActive
                          ? 'border-indigo-500 bg-indigo-50/55'
                          : 'border-slate-250 bg-slate-50/40 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        id="proof-photo-picker"
                        type="file"
                        accept="image/*"
                        onChange={handleFileInput}
                        className="hidden"
                      />

                      {filePreview ? (
                        <div className="relative w-full max-w-[240px] aspect-video rounded-lg overflow-hidden shadow border border-slate-200 bg-slate-900">
                          <img src={filePreview} className="w-full h-full object-contain" />
                          <button
                            type="button"
                            onClick={() => {
                              setUploadedFile(null);
                              setFilePreview(null);
                            }}
                            className="absolute top-1 right-1 bg-black/75 hover:bg-black text-[9px] font-bold text-white px-2 py-0.5 rounded cursor-pointer"
                          >
                            Hapus
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="h-10 w-10 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center">
                            <Camera className="h-5 w-5" />
                          </div>
                          <div>
                            <label htmlFor="proof-photo-picker" className="text-xs font-bold text-indigo-650 hover:underline cursor-pointer">
                              Klik untuk pilih foto
                            </label>
                            <span className="text-slate-400 text-xs"> atau drag-and-drop berkas gambar di sini</span>
                          </div>
                          <span className="text-[10px] text-slate-400 select-none">Mendukung format PNG, JPG, JPEG</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitLoading}
                      className="w-full md:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 hover:shadow shadow-md active:bg-indigo-700 text-white rounded-xl text-xs font-black tracking-wider uppercase transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Sedang Menyimpan...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Simpan Closing Temuan
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-slate-50/50 p-16 rounded-2xl border border-dashed text-center text-slate-400 text-xs space-y-2">
                <FolderOpen className="h-8 w-8 text-slate-300 mx-auto" />
                <p>Klik salah satu baris temuan MIO di sebelah kiri untuk meninjau rincian penutupan terperinci.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
