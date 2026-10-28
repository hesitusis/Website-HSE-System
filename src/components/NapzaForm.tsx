import React, { useState, useEffect } from 'react';
import {
  Pill,
  UserCheck,
  Calendar,
  FileText,
  UploadCloud,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Search,
  ChevronDown,
  FileCheck,
  X,
  Pencil,
  Trash2,
  ExternalLink,
  Cloud
} from 'lucide-react';
import { formatTanggalIndonesia, kompresDanProsesFile } from '../utils.js';
import { NapzaRecord } from '../types.js';
import { PageHeader, Modal, ConfirmModal, Button } from './common/index.js';
import AppsScriptModal from './AppsScriptModal.js';

interface NapzaFormProps {
  userRealName: string;
  activeSite?: string;
  userRole?: 'admin' | 'operator';
  onBack: () => void;
}

export default function NapzaForm({ userRealName, activeSite, userRole = 'admin', onBack }: NapzaFormProps) {
  const targetSite = activeSite && activeSite !== 'ALL' ? activeSite : 'ITU-Admo';
  const [namaKaryawan, setNamaKaryawan] = useState('');
  const [nrp, setNrp] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [periode, setPeriode] = useState('');
  const [hasil, setHasil] = useState<'Negatif' | 'Positif' | 'Invalid'>('Negatif');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [karyawanList, setKaryawanList] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<NapzaRecord[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [submitStep, setSubmitStep] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [isKaryawanDropdownOpen, setIsKaryawanDropdownOpen] = useState(false);
  const [isAppsScriptModalOpen, setIsAppsScriptModalOpen] = useState(false);

  // Edit & Delete states
  const [deleteItem, setDeleteItem] = useState<NapzaRecord | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  const [editItem, setEditItem] = useState<NapzaRecord | null>(null);
  const [editNama, setEditNama] = useState('');
  const [editNrp, setEditNrp] = useState('');
  const [editJabatan, setEditJabatan] = useState('');
  const [editPeriode, setEditPeriode] = useState('');
  const [editHasil, setEditHasil] = useState<'Negatif' | 'Positif' | 'Invalid'>('Negatif');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [isEditKaryawanDropdownOpen, setIsEditKaryawanDropdownOpen] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [editStep, setEditStep] = useState('');

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchKaryawanList();
    fetchNapzaHistory();
  }, []);

  const fetchKaryawanList = async () => {
    try {
      const res = await fetch("/api/karyawan");
      const d = await res.json();
      if (d.success) setKaryawanList(d.karyawanDetail || []);
    } catch (e) {
      console.error("Gagal memuat karyawan", e);
    }
  };

  const fetchNapzaHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/napza/history");
      const d = await res.json();
      if (d.history) {
        setHistoryList(d.history);
      }
    } catch (e) {
      console.error("Gagal memuat history NAPZA", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKaryawanChange = (selectedVal: string) => {
    setNamaKaryawan(selectedVal);
    const emp = karyawanList.find((k) => k.nama === selectedVal);
    if (emp) {
      setNrp(emp.nik || '');
      setJabatan(emp.jabatan || emp.dept || '');
    } else {
      setNrp('');
      setJabatan('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaKaryawan) {
      setFeedback({ type: 'error', msg: 'Mohon pilih nama karyawan!' });
      return;
    }
    if (!periode) {
      setFeedback({ type: 'error', msg: 'Mohon pilih periode pemeriksaan!' });
      return;
    }

    setIsSubmitLoading(true);
    setSubmitStep('Memproses data...');
    setFeedback(null);

    try {
      let webViewLink = "-";

      // 1. Jika ada file dipilih, unggah ke Google Drive via endpoint /api/napza/upload dengan FormData
      if (selectedFile) {
        setSubmitStep('Mengunggah dokumen ke Google Drive...');
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("nrp", nrp || "NAPZA");
        formData.append("nama", namaKaryawan);
        formData.append("folderId", "1AUXCZGF69iKK5ttWyGYugus57ht49Yiy");

        const uploadRes = await fetch("/api/napza/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();
        // 1. Tangkap fileUrl (link Google Drive) dari response JSON backend
        const fileUrl = uploadData.fileUrl || uploadData.webViewLink;
        if (uploadData.success && fileUrl) {
          webViewLink = fileUrl;
        } else {
          throw new Error(uploadData.message || "Gagal mengunggah lampiran ke Google Drive.");
        }
      }

      setSubmitStep('Menyimpan laporan ke database...');

      // Convert period to indonesian monthly label (e.g. "2026-06" to "JUNI 2026")
      let periodLabel = periode;
      if (periode.includes("-")) {
        const parts = periode.split("-");
        const listBulan = [
          "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
          "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"
        ];
        const monthIndex = parseInt(parts[1], 10) - 1;
        if (monthIndex >= 0 && monthIndex < 12) {
          periodLabel = `${listBulan[monthIndex]} ${parts[0]}`;
        }
      }

      // 2. Masukkan link Google Drive (fileUrl / webViewLink) ke dalam payload data yang akan di-submit ke database
      const res = await fetch("/api/napza/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: namaKaryawan,
          nrp,
          jabatan,
          periode: periodLabel,
          hasil,
          userName: userRealName,
          fileUrl: webViewLink,
          webViewLink: webViewLink,
          dokumen: webViewLink,
          fileData: webViewLink,
          site: targetSite
        })
      });
      
      const d = await res.json();
      if (d.success) {
        setFeedback({ type: 'success', msg: d.message || "Laporan NAPZA berhasil disimpan!" });
        setNamaKaryawan('');
        setNrp('');
        setJabatan('');
        setPeriode('');
        setSelectedFile(null);
        // Clear file input DOM element
        const fileInput = document.getElementById("napzaFile") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
        
        fetchNapzaHistory();
      } else {
        setFeedback({ type: 'error', msg: d.message || "Gagal menyimpan laporan." });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: "Kesalahan: " + err.message });
    } finally {
      setIsSubmitLoading(false);
      setSubmitStep('');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item: NapzaRecord) => {
    setEditItem(item);
    setEditNama(item.nama);
    setEditNrp(item.nrp);
    setEditJabatan(item.jabatan);
    setEditPeriode(item.periode);
    setEditHasil((['Negatif', 'Positif', 'Invalid'].includes(item.hasil) ? item.hasil : 'Negatif') as 'Negatif' | 'Positif' | 'Invalid');
    setEditFile(null);
    setEditStep('');
    setIsEditKaryawanDropdownOpen(false);
  };

  const handleEditKaryawanSelect = (selectedVal: string) => {
    setEditNama(selectedVal);
    const emp = karyawanList.find((k) => k.nama === selectedVal);
    if (emp) {
      setEditNrp(emp.nik || '');
      setEditJabatan(emp.jabatan || emp.dept || '');
    }
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    if (!editNama.trim()) {
      setFeedback({ type: 'error', msg: 'Nama karyawan tidak boleh kosong!' });
      return;
    }

    setIsEditLoading(true);
    setEditStep('Menyiapkan pembaruan...');

    try {
      let webViewLink = editItem.dokumen;

      // If user provided a replacement file
      if (editFile) {
        setEditStep('Mengunggah dokumen pengganti ke Google Drive...');
        const formData = new FormData();
        formData.append("file", editFile);
        formData.append("nrp", editNrp || "NAPZA");
        formData.append("nama", editNama);
        formData.append("folderId", "1AUXCZGF69iKK5ttWyGYugus57ht49Yiy");

        const uploadRes = await fetch("/api/napza/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();
        const fileUrl = uploadData.fileUrl || uploadData.webViewLink;
        if (uploadData.success && fileUrl) {
          webViewLink = fileUrl;
        } else {
          throw new Error(uploadData.message || "Gagal mengunggah dokumen baru ke Google Drive.");
        }
      }

      setEditStep('Menyimpan perubahan ke database...');

      let periodLabel = editPeriode;
      if (editPeriode.includes("-")) {
        const parts = editPeriode.split("-");
        const listBulan = [
          "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
          "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"
        ];
        const monthIndex = parseInt(parts[1], 10) - 1;
        if (monthIndex >= 0 && monthIndex < 12) {
          periodLabel = `${listBulan[monthIndex]} ${parts[0]}`;
        }
      }

      const res = await fetch("/api/napza/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rowId: editItem.rowId,
          oldTimestamp: editItem.timestamp,
          oldNrp: editItem.nrp,
          nama: editNama,
          nrp: editNrp,
          jabatan: editJabatan,
          periode: periodLabel,
          hasil: editHasil,
          fileUrl: webViewLink,
          webViewLink: webViewLink,
          dokumen: webViewLink,
          fileData: webViewLink,
          userName: userRealName
        })
      });

      const d = await res.json();
      if (d.success) {
        setFeedback({ type: 'success', msg: d.message || "Laporan NAPZA berhasil diperbarui!" });
        setEditItem(null);
        fetchNapzaHistory();
      } else {
        setFeedback({ type: 'error', msg: d.message || "Gagal memperbarui laporan." });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: "Kesalahan: " + err.message });
    } finally {
      setIsEditLoading(false);
      setEditStep('');
    }
  };

  // Delete Confirm
  const handleDeleteConfirm = async () => {
    if (!deleteItem) return;
    setIsDeleteLoading(true);

    try {
      const res = await fetch("/api/napza/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rowId: deleteItem.rowId,
          timestamp: deleteItem.timestamp,
          nrp: deleteItem.nrp,
          nama: deleteItem.nama
        })
      });

      const d = await res.json();
      if (d.success) {
        setFeedback({ type: 'success', msg: d.message || "Laporan NAPZA berhasil dihapus!" });
        setDeleteItem(null);
        fetchNapzaHistory();
      } else {
        setFeedback({ type: 'error', msg: d.message || "Gagal menghapus laporan." });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: "Kesalahan jaringan: " + err.message });
    } finally {
      setIsDeleteLoading(false);
    }
  };

  // Filtered history list
  const filteredHistory = historyList.filter(item => {
    if (userRole === 'operator' && activeSite && activeSite !== 'ALL') {
      const itemSite = item.site || 'ITU-Admo';
      if (itemSite.toLowerCase() !== activeSite.toLowerCase()) return false;
    }
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.nama.toLowerCase().includes(term) ||
      item.nrp.toLowerCase().includes(term) ||
      item.jabatan.toLowerCase().includes(term) ||
      item.periode.toLowerCase().includes(term) ||
      item.hasil.toLowerCase().includes(term) ||
      (item.oleh && item.oleh.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Form Laporan NAPZA"
        subtitle="Skrining pemeriksaan Narkotika, Psikotropika, dan Zat Adiktif Karyawan."
        onBack={onBack}
        icon={<Pill className="h-6 w-6 text-purple-600" />}
      />

      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 border shadow-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span className="text-sm font-medium">{feedback.msg}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form container */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-705">
              Input Pemeriksaan Medis
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
              Site: {targetSite}
            </span>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                Karyawan <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={namaKaryawan}
                  onChange={(e) => {
                    setNamaKaryawan(e.target.value);
                    setIsKaryawanDropdownOpen(true);
                  }}
                  onFocus={() => setIsKaryawanDropdownOpen(true)}
                  onBlur={() => {
                    setTimeout(() => setIsKaryawanDropdownOpen(false), 200);
                  }}
                  placeholder="Ketik nama karyawan..."
                  className="w-full px-3.5 py-2 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none transition"
                  required
                />
                <div className="absolute right-3 top-2.5 flex items-center gap-1 text-slate-400">
                  <Search className="h-4 w-4" />
                </div>

                {isKaryawanDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100">
                    {(() => {
                      const query = namaKaryawan.toLowerCase();
                      const filtered = karyawanList.filter(k => 
                        (k.nama || "").toLowerCase().includes(query) ||
                        (k.nik || "").toLowerCase().includes(query)
                      );

                      if (filtered.length > 0) {
                        return filtered.map((k, index) => (
                          <button
                            key={index}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleKaryawanChange(k.nama);
                              setIsKaryawanDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm text-slate-700 font-medium transition flex items-center justify-between"
                          >
                            <div>
                              <div className="font-semibold text-slate-800">{k.nama}</div>
                              <div className="text-xs text-slate-500 font-mono">
                                NRP: {k.nik || '-'} • Jabatan: <span className="font-semibold text-slate-700">{k.jabatan || '-'}</span> <span className="text-slate-400 font-normal">({k.dept || '-'})</span>
                              </div>
                            </div>
                            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-semibold font-mono">Pilih</span>
                          </button>
                        ));
                      } else {
                        return (
                          <div className="px-4 py-2.5 text-xs text-slate-400 italic">
                            Tidak ditemukan hasil untuk "{namaKaryawan}"
                          </div>
                        );
                      }
                    })()}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                  NRP / ID
                </label>
                <input
                  type="text"
                  value={nrp}
                  readOnly
                  placeholder="ID Karyawan"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-150 text-sm outline-none font-mono text-slate-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                  Jabatan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={jabatan}
                  onChange={(e) => setJabatan(e.target.value)}
                  placeholder="Mekanik / Supv"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500 focus:bg-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                Periode Bulan <span className="text-rose-500">*</span>
              </label>
              <input
                type="month"
                value={periode}
                onChange={(e) => setPeriode(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:border-indigo-500 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                Hasil Pemeriksaan
              </label>
              <select
                value={hasil}
                onChange={(e) => setHasil(e.target.value as any)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500 focus:bg-white"
              >
                <option value="Negatif">Negatif (Bebas Narkoba) ✅</option>
                <option value="Positif">Positif ⚠️</option>
                <option value="Invalid">Invalid / Perlu Tes Ulang</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-600 uppercase">
                  Lampiran Laporan / Dokumen
                </label>
                <button
                  type="button"
                  onClick={() => setIsAppsScriptModalOpen(true)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 hover:underline cursor-pointer"
                  title="Konfigurasi integrasi Google Drive jika kuota Service Account terbatas"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Setup Drive (Bypass Quota)</span>
                </button>
              </div>

              {selectedFile ? (
                <div className="mt-1 p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700">
                      <FileCheck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate" title={selectedFile.name}>
                        {selectedFile.name}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB &bull; Siap diunggah ke Drive
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      const fileInput = document.getElementById("napzaFile") as HTMLInputElement;
                      if (fileInput) fileInput.value = "";
                    }}
                    className="p-1 rounded-lg hover:bg-emerald-200/60 text-slate-400 hover:text-slate-700 transition"
                    title="Hapus file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => document.getElementById("napzaFile")?.click()}
                  className="mt-1 flex justify-center px-4 py-4 border-2 border-slate-300 border-dashed rounded-xl hover:border-indigo-400 hover:bg-slate-50 transition relative cursor-pointer"
                >
                  <div className="space-y-1 text-center pointer-events-none">
                    <UploadCloud className="mx-auto h-8 w-8 text-slate-400" />
                    <div className="flex text-xs text-slate-600 justify-center">
                      <span className="font-semibold text-indigo-600">Pilih Dokumen</span>
                    </div>
                    <p className="text-[10px] text-slate-400">PDF, JPG, PNG up to 25MB &bull; Tersimpan di Google Drive</p>
                  </div>
                </div>
              )}

              <input
                id="napzaFile"
                type="file"
                className="sr-only"
                accept=".pdf,image/*"
                onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitLoading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl transition shadow-sm text-sm cursor-pointer disabled:bg-slate-400 flex items-center justify-center gap-2"
            >
              {isSubmitLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
              <span>{isSubmitLoading ? (submitStep || 'Menyimpan...') : 'Simpan Laporan NAPZA'}</span>
            </button>
          </form>
        </div>

        {/* View list history */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-purple-600" /> Riwayat Laporan Pemeriksaan NAPZA
              </h3>
              <p className="text-[11px] text-slate-400">
                Menampilkan {filteredHistory.length} dari {historyList.length} data pemeriksaan
              </p>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari karyawan / hasil..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-400 transition"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <button
                onClick={fetchNapzaHistory}
                disabled={isLoading}
                className="text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 py-1.5 px-2.5 rounded-lg transition flex items-center gap-1 text-xs cursor-pointer shrink-0 font-medium"
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} /> Muat Ulang
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="text-center py-8 text-slate-400 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-purple-500" />
                <span>Menyelaraskan data...</span>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                {searchTerm ? `Tidak ditemukan riwayat yang cocok dengan "${searchTerm}".` : "Belum ada riwayat tercatat."}
              </div>
            ) : (
              <table className="w-full text-xs text-left text-slate-600 border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-150">
                    <th className="py-2.5 px-3">Karyawan</th>
                    <th className="py-2.5 px-3">Periode</th>
                    <th className="py-2.5 px-3">Hasil Tes</th>
                    <th className="py-2.5 px-3 text-center">Dokumen</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((item, id) => (
                    <tr key={item.id || id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-850">{item.nama}</div>
                        <div className="text-[10px] text-slate-400">{item.jabatan} (NRP: {item.nrp})</div>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700 whitespace-nowrap">{item.periode}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.hasil === 'Negatif'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.hasil === 'Positif'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-750 border border-amber-200'
                          }`}
                        >
                          {item.hasil.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {item.dokumen && item.dokumen !== "-" ? (
                          <a
                            href={item.dokumen.startsWith("http") ? item.dokumen : `${window.location.origin}${item.dokumen}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-slate-800 hover:bg-slate-900 text-white font-semibold py-1 px-2.5 rounded text-[10px] transition cursor-pointer inline-flex items-center gap-1"
                          >
                            <span>Lihat Dokumen</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border border-indigo-200 transition cursor-pointer"
                            title="Edit Laporan NAPZA"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteItem(item)}
                            className="p-1.5 rounded-lg text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
                            title="Hapus Laporan NAPZA"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal Edit Laporan NAPZA */}
      <Modal
        isOpen={!!editItem}
        onClose={() => {
          if (!isEditLoading) setEditItem(null);
        }}
        title="Edit Laporan NAPZA"
        subtitle="Perbarui data hasil tes pemeriksaan NAPZA dan lampiran dokumen"
        maxWidth="lg"
      >
        {editItem && (
          <form onSubmit={handleSaveEdit} className="space-y-4 p-1">
            {/* Karyawan field */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Nama Karyawan <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={editNama}
                  onChange={(e) => {
                    setEditNama(e.target.value);
                    setIsEditKaryawanDropdownOpen(true);
                  }}
                  onFocus={() => setIsEditKaryawanDropdownOpen(true)}
                  placeholder="Ketik nama karyawan..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
                  required
                />
                {isEditKaryawanDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100">
                    {karyawanList
                      .filter(k => 
                        (k.nama || "").toLowerCase().includes(editNama.toLowerCase()) ||
                        (k.nik || "").toLowerCase().includes(editNama.toLowerCase())
                      )
                      .slice(0, 8)
                      .map((k, index) => (
                        <button
                          key={index}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleEditKaryawanSelect(k.nama);
                            setIsEditKaryawanDropdownOpen(false);
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-xs text-slate-700 flex items-center justify-between cursor-pointer"
                        >
                          <div>
                            <span className="font-semibold text-slate-800">{k.nama}</span>
                            <span className="text-slate-500 ml-2 font-mono text-[11px]">{k.nik || '-'} • {k.jabatan || '-'} ({k.dept || '-'})</span>
                          </div>
                          <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-semibold">Pilih</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Grid NRP & Jabatan */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  NRP / NIK
                </label>
                <input
                  type="text"
                  value={editNrp}
                  onChange={(e) => setEditNrp(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none font-mono"
                  placeholder="NRP"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Jabatan / Dept
                </label>
                <input
                  type="text"
                  value={editJabatan}
                  onChange={(e) => setEditJabatan(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
                  placeholder="Jabatan"
                />
              </div>
            </div>

            {/* Periode & Hasil */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Periode Bulan
                </label>
                <input
                  type="text"
                  value={editPeriode}
                  onChange={(e) => setEditPeriode(e.target.value)}
                  placeholder="Contoh: JUNI 2026 atau 2026-06"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Hasil Pemeriksaan
                </label>
                <select
                  value={editHasil}
                  onChange={(e) => setEditHasil(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
                >
                  <option value="Negatif">Negatif (Bebas Narkoba)</option>
                  <option value="Positif">Positif (Terindikasi)</option>
                  <option value="Invalid">Invalid (Perlu Tes Ulang)</option>
                </select>
              </div>
            </div>

            {/* Dokumen lampiran */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                Dokumen Lampiran
              </label>

              {/* Existing doc if any */}
              {editItem.dokumen && editItem.dokumen !== "-" && (
                <div className="mb-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-xs text-slate-600 truncate">Dokumen Tersimpan Saat Ini</span>
                  </div>
                  <a
                    href={editItem.dokumen}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 shrink-0"
                  >
                    Lihat Dokumen <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* New file upload option */}
              {editFile ? (
                <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700">
                      <FileCheck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate" title={editFile.name}>
                        {editFile.name}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {(editFile.size / (1024 * 1024)).toFixed(2)} MB &bull; File baru siap diunggah ke Google Drive
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditFile(null);
                      const fileInput = document.getElementById("editNapzaFile") as HTMLInputElement;
                      if (fileInput) fileInput.value = "";
                    }}
                    className="p-1 rounded-lg hover:bg-emerald-200/60 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                    title="Batalkan file baru"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => document.getElementById("editNapzaFile")?.click()}
                  className="flex justify-center px-4 py-3 border-2 border-slate-300 border-dashed rounded-xl hover:border-indigo-400 hover:bg-slate-50 transition cursor-pointer text-center"
                >
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <UploadCloud className="h-4 w-4 text-slate-400" />
                    <span className="font-semibold text-indigo-600">
                      {editItem.dokumen && editItem.dokumen !== "-" ? "Ganti Dokumen (Opsional)" : "Unggah Dokumen Lampiran"}
                    </span>
                    <span className="text-[10px] text-slate-400">&bull; PDF/JPG up to 25MB</span>
                  </div>
                </div>
              )}

              <input
                id="editNapzaFile"
                type="file"
                className="sr-only"
                accept=".pdf,image/*"
                onChange={(e) => setEditFile(e.target.files ? e.target.files[0] : null)}
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditItem(null)}
                disabled={isEditLoading}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isEditLoading}
                className="bg-slate-900 hover:bg-slate-800"
              >
                {isEditLoading ? (editStep || 'Menyimpan...') : 'Simpan Perubahan'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Confirm Modal Delete */}
      <ConfirmModal
        isOpen={!!deleteItem}
        onClose={() => {
          if (!isDeleteLoading) setDeleteItem(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Hapus Laporan NAPZA"
        message={deleteItem ? `Apakah Anda yakin ingin menghapus data Laporan NAPZA untuk ${deleteItem.nama} (NRP: ${deleteItem.nrp}, Periode: ${deleteItem.periode})? Data akan dihapus dari Google Sheets dan sistem.` : ''}
        confirmLabel="Ya, Hapus Laporan"
        cancelLabel="Batal"
        variant="danger"
        isLoading={isDeleteLoading}
      />

      {/* Google Apps Script Modal */}
      <AppsScriptModal
        isOpen={isAppsScriptModalOpen}
        onClose={() => setIsAppsScriptModalOpen(false)}
      />
    </div>
  );
}
