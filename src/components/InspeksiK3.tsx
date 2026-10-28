import React, { useState, useEffect } from 'react';
import { ClipboardCheck, MapPin, Tag, Box, Calendar, Camera, RefreshCw, CheckCircle2, AlertCircle, Plus, Edit, Trash2, Printer, FileText } from 'lucide-react';
import { formatTanggalIndonesia, kompresDanProsesFile } from '../utils.js';
import { InspeksiItem, MasterAsetItem } from '../types.js';
import { PageHeader } from './common/index.js';

interface InspeksiK3Props {
  userRealName: string;
  userRole?: 'admin' | 'operator';
  activeSite?: string;
  onBack: () => void;
}

export default function InspeksiK3({ userRealName, userRole, activeSite, onBack }: InspeksiK3Props) {
  const targetSite = activeSite && activeSite !== 'ALL' ? activeSite : 'ITU-Admo';
  const [posisiList, setPosisiList] = useState<string[]>([]);
  const [masterAset, setMasterAset] = useState<MasterAsetItem[]>([]);
  const [allMasterAset, setAllMasterAset] = useState<MasterAsetItem[]>([]);
  const [historyList, setHistoryList] = useState<InspeksiItem[]>([]);
  
  // Master Aset Admin Management Hooks
  const [mIdAlat, setMIdAlat] = useState('');
  const [mNamaBarang, setMNamaBarang] = useState('');
  const [mPosisi, setMPosisi] = useState('');
  const [editingItem, setEditingItem] = useState<MasterAsetItem | null>(null);
  const [isAdminSubmitting, setIsAdminSubmitting] = useState(false);

  // Form hooks
  const [posisi, setPosisi] = useState('');
  const [idAlat, setIdAlat] = useState('');
  const [namaBarang, setNamaBarang] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [kondisi, setKondisi] = useState<'Baik' | 'Rusak' | 'Hilang'>('Baik');
  const [temuan, setTemuan] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Edit inspection state
  const [editingInspeksi, setEditingInspeksi] = useState<InspeksiItem | null>(null);
  const [editTanggal, setEditTanggal] = useState('');
  const [editKondisi, setEditKondisi] = useState<'Baik' | 'Rusak' | 'Hilang'>('Baik');
  const [editTemuan, setEditTemuan] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    fetchMasterOptions();
    fetchInspeksiHistory();
  }, []);

  const fetchMasterOptions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/inspeksi/master-options");
      const d = await res.json();
      if (d.success) {
        setPosisiList(d.posisiList || []);
        setMasterAset(d.masterAset || []);
        setAllMasterAset(d.allMasterAset || []);
      }
    } catch (e) {
      console.error("Gagal memuat master aset", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mIdAlat.trim() || !mNamaBarang.trim() || !mPosisi.trim()) {
      alert("Harap isi seluruh field (ID Alat, Deskripsi, dan Posisi/Area Karyawan)!");
      return;
    }
    
    setIsAdminSubmitting(true);
    try {
      const payload = {
        item: {
          idAlat: mIdAlat.trim(),
          namaBarang: mNamaBarang.trim(),
          posisi: mPosisi.trim()
        },
        oldIdAlat: editingItem ? editingItem.idAlat : undefined
      };

      const res = await fetch("/api/inspeksi/master-item/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert(editingItem ? "Peralatan berhasil diperbarui!" : "Peralatan baru berhasil ditambahkan!");
        setMIdAlat('');
        setMNamaBarang('');
        setMPosisi('');
        setEditingItem(null);
        await fetchMasterOptions();
      } else {
        alert("Gagal menyimpan: " + data.message);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsAdminSubmitting(false);
    }
  };

  const handleAdminEditClick = (item: MasterAsetItem) => {
    setEditingItem(item);
    setMIdAlat(item.idAlat);
    setMNamaBarang(item.namaBarang);
    setMPosisi(item.posisi);
  };

  const handleAdminCancelEdit = () => {
    setEditingItem(null);
    setMIdAlat('');
    setMNamaBarang('');
    setMPosisi('');
  };

  const handleAdminDelete = async (idAlatToDelete: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus peralatan [${idAlatToDelete}] dari master data?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/inspeksi/master-item/delete/${encodeURIComponent(idAlatToDelete)}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        alert("Peralatan berhasil dihapus dari master!");
        await fetchMasterOptions();
      } else {
        alert("Gagal menghapus: " + data.message);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const fetchInspeksiHistory = async () => {
    try {
      const res = await fetch("/api/inspeksi/history");
      const d = await res.json();
      if (d.success && d.history) {
        setHistoryList(d.history);
      }
    } catch (e) {
      console.error("Gagal memuat riwayat inspeksi", e);
    }
  };

  const parseDateToInputVal = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split(/[\/\-]/);
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
    return dateStr;
  };

  const handleEditClick = (item: InspeksiItem) => {
    setEditingInspeksi(item);
    setEditTanggal(parseDateToInputVal(item.tanggal));
    setEditKondisi((item.kondisi as any) || 'Baik');
    setEditTemuan(item.temuan === '-' ? '' : item.temuan);
    setEditFile(null);
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInspeksi) return;

    setIsEditSubmitting(true);
    try {
      let fileDataPayload: { data: string; name: string } | null = null;
      if (editFile) {
        fileDataPayload = await kompresDanProsesFile(editFile);
      }

      const res = await fetch("/api/inspeksi/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idInspeksi: editingInspeksi.idInspeksi,
          updatedData: {
            idAlat: editingInspeksi.idAlat,
            tanggal: editTanggal,
            kondisi: editKondisi,
            temuan: editTemuan,
            linkFoto: editingInspeksi.linkFoto
          },
          fileData: fileDataPayload
        })
      });

      const d = await res.json();
      if (d.success) {
        alert("Laporan inspeksi berhasil diperbarui!");
        setEditingInspeksi(null);
        await fetchInspeksiHistory();
      } else {
        alert("Gagal memperbarui: " + d.message);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handlePosisiChange = (pos: string) => {
    setPosisi(pos);
    setIdAlat('');
    setNamaBarang('');
  };

  const handleIdAlatChange = (id: string) => {
    setIdAlat(id);
    const item = masterAset.find(a => a.posisi === posisi && a.idAlat === id);
    setNamaBarang(item ? item.namaBarang : '');
  };

  // Filter tools belonging to selected position
  const filteredTools = masterAset.filter(a => a.posisi === posisi);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!posisi || !idAlat || !namaBarang) {
      alert("Lengkapi area posisi dan ID alat!");
      return;
    }

    if (!window.confirm(`Simpan hasil inspeksi K3 bulanan untuk ${idAlat} (${namaBarang})?`)) {
      return;
    }

    setIsSubmitLoading(true);
    setFeedback(null);

    try {
      let fileDataPayload: { data: string; name: string } | null = null;
      if (selectedFile) {
        fileDataPayload = await kompresDanProsesFile(selectedFile);
      }

      const res = await fetch("/api/inspeksi/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataForm: {
            posisi,
            idAlat,
            namaBarang,
            tanggal,
            kondisi,
            temuan,
            pic: userRealName || "Pemeriksa HSE",
            site: targetSite
          },
          fileData: fileDataPayload
        })
      });

      const d = await res.json();
      if (d.success) {
        setFeedback({ type: 'success', msg: d.message });
        setPosisi('');
        setIdAlat('');
        setNamaBarang('');
        setKondisi('Baik');
        setTemuan('');
        setSelectedFile(null);
        const fEl = document.getElementById("inspFile") as HTMLInputElement;
        if (fEl) fEl.value = "";
        
        // Reload listings
        fetchMasterOptions();
        fetchInspeksiHistory();
      } else {
        setFeedback({ type: 'error', msg: d.message || "Gagal menyimpan hasil inspeksi." });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: "Kesalahan jaringan: " + err.message });
    } finally {
      setIsSubmitLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Inspeksi K3 (Bulanan)"
        subtitle="Realisasi inspeksi rutin bulanan terhadap alat pemadam (APAR), Kotak P3K, Eye Wash, dll."
        onBack={onBack}
        icon={<ClipboardCheck className="h-6 w-6 text-indigo-600" />}
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

      {/* Primary Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form checklists */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-2">
            Checklist Formulir Inspeksi K3 Berkala
          </h3>
          <p className="text-[10px] text-slate-400">
            📌 Opsi ID Alat di bawah otomatis menyeleksi peralatan yang BELUM dilakukan inspeksi pada bulan berjalan.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5 flex items-center gap-1">
                <MapPin className="h-4 w-4 text-indigo-500" /> 1. Pilih Posisi / Area Kerja
              </label>
              <select
                value={posisi}
                onChange={(e) => handlePosisiChange(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500 focus:bg-white"
                required
              >
                <option value="">-- Pilih Area / Posisi --</option>
                {posisiList.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5 flex items-center gap-1">
                <Tag className="h-4 w-4 text-indigo-500" /> 2. No ID Peralatan
              </label>
              <select
                value={idAlat}
                onChange={(e) => handleIdAlatChange(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500 focus:bg-white disabled:bg-slate-150 disabled:text-slate-400"
                required
                disabled={!posisi}
              >
                <option value="">-- Pilih ID Alat --</option>
                {filteredTools.map((t) => (
                  <option key={t.idAlat} value={t.idAlat}>{t.idAlat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5 flex items-center gap-1">
                <Box className="h-4 w-4 text-indigo-500" /> Deskripsi Alat
              </label>
              <input
                type="text"
                value={namaBarang}
                readOnly
                placeholder="Otomatis setelah ID Alat dipilih..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-150 text-sm text-slate-700 font-bold focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                  Tanggal Pemeriksaan
                </label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full px-3/5 py-1.5 border border-slate-200 bg-slate-50 rounded-xl focus:bg-white text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5 flex items-center gap-1">
                  <Camera className="h-4 w-4 text-indigo-500" /> Foto Bukti Kondisi
                </label>
                <input
                  id="inspFile"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full px-3 py-1 border border-slate-200 bg-slate-50 rounded-xl text-xs focus:bg-white cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                Kondisi Peralatan
              </label>
              <div className="flex gap-4 p-1 bg-slate-50 border border-slate-100 rounded-xl">
                <label className="flex-1 text-center py-1.5 rounded-lg text-xs font-bold border border-transparent hover:bg-white cursor-pointer select-none transition flex items-center justify-center gap-1">
                  <input
                    type="radio"
                    name="kondisi"
                    checked={kondisi === 'Baik'}
                    onChange={() => setKondisi('Baik')}
                    className="accent-emerald-600"
                  />
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">Baik</span>
                </label>
                <label className="flex-1 text-center py-1.5 rounded-lg text-xs font-bold border border-transparent hover:bg-white cursor-pointer select-none transition flex items-center justify-center gap-1">
                  <input
                    type="radio"
                    name="kondisi"
                    checked={kondisi === 'Rusak'}
                    onChange={() => setKondisi('Rusak')}
                    className="accent-rose-600"
                  />
                  <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded">Rusak</span>
                </label>
                <label className="flex-1 text-center py-1.5 rounded-lg text-xs font-bold border border-transparent hover:bg-white cursor-pointer select-none transition flex items-center justify-center gap-1">
                  <input
                    type="radio"
                    name="kondisi"
                    checked={kondisi === 'Hilang'}
                    onChange={() => setKondisi('Hilang')}
                    className="accent-slate-500"
                  />
                  <span className="text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded">Hilang</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                Deskripsi Temuan / Kerusakan detail
              </label>
              <textarea
                value={temuan}
                onChange={(e) => setTemuan(e.target.value)}
                placeholder="Deskripsikan kondisi kelayakan alat jika ada kerusakan..."
                rows={3}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={isSubmitLoading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl transition text-sm cursor-pointer disabled:bg-slate-400"
            >
              {isSubmitLoading ? 'Memetakan Upload Foto...' : 'Simpan Hasil Inspeksi K3'}
            </button>
          </form>
        </div>

        {/* Database log table view */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              📋 Riwayat Inspeksi & Temuan K3 Terbaru
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="bg-slate-900 hover:bg-slate-800 text-white transition flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm cursor-pointer"
              >
                <Printer className="h-3 w-3 text-emerald-400" /> Cetak PDF
              </button>
              <button
                type="button"
                onClick={fetchInspeksiHistory}
                className="text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-slate-200 transition flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" /> Segarkan
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[520px] overflow-y-auto border border-slate-200 rounded-xl pr-1">
            <table className="w-full text-xs text-left text-slate-600 border-collapse">
              <thead className="sticky top-0 bg-slate-900 text-white z-10 shadow-sm font-semibold select-none">
                <tr className="bg-slate-900 border-b border-slate-850">
                  <th className="py-3 px-3">Tanggal</th>
                  <th className="py-3 px-3">Area / Posisi</th>
                  <th className="py-3 px-3">ID Alat / Deskripsi</th>
                  <th className="py-3 px-3 text-center">Kondisi</th>
                  <th className="py-3 px-3">Temuan</th>
                  <th className="py-3 px-3 text-center">Foto Bukti</th>
                  <th className="py-3 px-3">Pemeriksa</th>
                  <th className="py-3 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filteredInspeksiHistory = historyList.filter(item => {
                    if (userRole === 'operator' && activeSite && activeSite !== 'ALL') {
                      const itemSite = item.site || 'ITU-Admo';
                      if (itemSite.toLowerCase() !== activeSite.toLowerCase()) return false;
                    }
                    return true;
                  });
                  if (filteredInspeksiHistory.length === 0) {
                    return (
                      <tr>
                        <td colSpan={8} className="text-center py-10 text-slate-400">
                          Belum ada laporan inspeksi K3 berkala untuk site ini.
                        </td>
                      </tr>
                    );
                  }
                  return filteredInspeksiHistory.map((item, id) => (
                  <tr key={id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-3 text-slate-500 truncate max-w-[100px]">{formatTanggalIndonesia(item.tanggal)}</td>
                    <td className="py-3 px-3 font-semibold text-slate-700 truncate max-w-[120px]" title={item.posisi}>
                      {item.posisi}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-mono text-indigo-700 font-bold">{item.idAlat}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{item.namaBarang}</div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.kondisi === 'Baik'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : item.kondisi === 'Rusak'
                            ? 'bg-rose-50 text-rose-700 border border-rose-100'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {item.kondisi.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 truncate max-w-[100px]" title={item.temuan}>
                      {item.temuan || "-"}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {item.linkFoto && item.linkFoto !== "-" ? (
                        <a
                          href={item.linkFoto}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-slate-900 text-white font-semibold py-1 px-2.5 hover:bg-slate-800 transition cursor-pointer text-[10px] rounded"
                        >
                          Lihat Foto
                        </a>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-400 truncate max-w-[100px] font-bold uppercase text-[9px]">
                      {item.pic}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleEditClick(item)}
                        className="text-slate-600 hover:text-indigo-600 font-bold inline-flex items-center gap-1 text-[10px] bg-slate-100 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-slate-200 transition cursor-pointer"
                      >
                        <Edit className="h-3 w-3 text-indigo-500" /> Edit
                      </button>
                    </td>
                  </tr>
                ));
              })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {userRole === 'admin' && (
        <div id="admin-panel" className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mt-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Panel Administrator: Kelola Master Peralatan K3</h3>
              <p className="text-xs text-slate-500">Gunakan panel ini untuk mengedit atau menambahkan ID peralatan, nama deskripsi alat, dan area posisi kerja.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Form Column */}
            <div className="md:col-span-4 bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-sm">
              <h4 className="text-xs font-extrabold text-slate-705 uppercase tracking-wider">
                {editingItem ? "📝 Edit Peralatan K3" : "➕ Tambah Peralatan K3 Baru"}
              </h4>
              
              <form onSubmit={handleAdminSave} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    No ID Peralatan
                  </label>
                  <input
                    type="text"
                    value={mIdAlat}
                    onChange={(e) => setMIdAlat(e.target.value)}
                    placeholder="Contoh: APAR-05"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:border-indigo-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Deskripsi Alat / Nama Barang
                  </label>
                  <input
                    type="text"
                    value={mNamaBarang}
                    onChange={(e) => setMNamaBarang(e.target.value)}
                    placeholder="Contoh: APAR Powder 6kg"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:border-indigo-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Posisi / Area Kerja
                  </label>
                  <input
                    type="text"
                    value={mPosisi}
                    onChange={(e) => setMPosisi(e.target.value)}
                    placeholder="Contoh: Kantor Utama Lantai 2"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:border-indigo-500 focus:outline-none"
                    required
                  />
                  <p className="text-[9px] text-slate-400 mt-0.5">Area kerja baru otomatis akan mendaftarkan pilihan posisi.</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isAdminSubmitting}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 p-3 rounded-lg text-xs transition cursor-pointer text-center disabled:bg-indigo-305"
                  >
                    {isAdminSubmitting ? "Menyimpan..." : editingItem ? "Simpan Perubahan" : "Tambah Alat"}
                  </button>
                  {editingItem && (
                    <button
                      type="button"
                      onClick={handleAdminCancelEdit}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-3 rounded-lg text-xs transition cursor-pointer"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* List Column */}
            <div className="md:col-span-8 bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  📂 Daftar Seluruh Master Peralatan K3 ({allMasterAset.length})
                </h4>
              </div>

              <div className="overflow-y-auto max-h-[300px] border border-slate-150 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-600 border-b border-slate-200">
                      <th className="p-2">ID Alat</th>
                      <th className="p-2">Deskripsi Alat</th>
                      <th className="p-2">Posisi / Area</th>
                      <th className="p-2 text-center" style={{ width: '120px' }}>Tindakan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allMasterAset.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-indigo-50/20 transition">
                        <td className="p-2 font-mono font-bold text-indigo-700">{item.idAlat}</td>
                        <td className="p-2 font-medium text-slate-700">{item.namaBarang}</td>
                        <td className="p-2 text-slate-500">{item.posisi}</td>
                        <td className="p-2 flex justify-center items-center gap-1.5">
                          <button
                            onClick={() => handleAdminEditClick(item)}
                            className="bg-slate-105 hover:bg-amber-100 hover:text-amber-700 text-slate-600 p-1.5 rounded transition cursor-pointer"
                            title="Edit"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleAdminDelete(item.idAlat)}
                            className="bg-slate-105 hover:bg-rose-100 hover:text-rose-700 text-slate-600 p-1.5 rounded transition cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {allMasterAset.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-6 text-slate-400">
                          Tidak ada master peralatan terdaftar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Inspeksi Modal Overlay */}
      {editingInspeksi && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-emerald-400" />
                  Edit Hasil Inspeksi K3
                </h3>
                <p className="text-[10px] text-slate-300 font-mono mt-0.5">ID: {editingInspeksi.idInspeksi}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingInspeksi(null)}
                className="text-slate-400 hover:text-white transition cursor-pointer text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleUpdateSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-left">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">ID Alat</span>
                  <span className="font-mono font-bold text-slate-700 text-xs">{editingInspeksi.idAlat}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Area / Posisi</span>
                  <span className="font-semibold text-slate-700 text-xs truncate block">{editingInspeksi.posisi}</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Deskripsi Alat</span>
                  <span className="font-bold text-indigo-700 text-xs">{editingInspeksi.namaBarang}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Tanggal Laporan
                </label>
                <input
                  type="date"
                  value={editTanggal}
                  onChange={(e) => setEditTanggal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                  Kondisi Kelayakan Peralatan
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-1.5 p-2 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs justify-center font-semibold">
                    <input
                      type="radio"
                      name="editKondisi"
                      checked={editKondisi === 'Baik'}
                      onChange={() => setEditKondisi('Baik')}
                      className="accent-emerald-600"
                    />
                    <span className="text-emerald-700">Baik</span>
                  </label>
                  <label className="flex items-center gap-1.5 p-2 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs justify-center font-semibold">
                    <input
                      type="radio"
                      name="editKondisi"
                      checked={editKondisi === 'Rusak'}
                      onChange={() => setEditKondisi('Rusak')}
                      className="accent-rose-600"
                    />
                    <span className="text-rose-700">Rusak</span>
                  </label>
                  <label className="flex items-center gap-1.5 p-2 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs justify-center font-semibold">
                    <input
                      type="radio"
                      name="editKondisi"
                      checked={editKondisi === 'Hilang'}
                      onChange={() => setEditKondisi('Hilang')}
                      className="accent-slate-500"
                    />
                    <span className="text-slate-600">Hilang</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                  Deskripsi Temuan / Kerusakan detail
                </label>
                <textarea
                  value={editTemuan}
                  onChange={(e) => setEditTemuan(e.target.value)}
                  placeholder="Deskripsikan kondisi kelayakan alat jika ada kerusakan..."
                  rows={2}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:border-indigo-500"
                ></textarea>
              </div>

              {/* Upload Foto Bukti Baru */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                  Upload / Ganti Foto Bukti Baru
                </label>
                <div className="border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl p-3.5 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition relative">
                  <Camera className="h-6 w-6 text-slate-400 mb-1" />
                  <span className="text-[10px] text-slate-500 font-medium">Klik untuk upload foto baru</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setEditFile(e.target.files[0]);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  {editFile && (
                    <span className="mt-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100 truncate max-w-full">
                      ✓ Selected: {editFile.name}
                    </span>
                  )}
                  {!editFile && editingInspeksi.linkFoto && editingInspeksi.linkFoto !== '-' && (
                    <span className="mt-1.5 text-[9px] text-indigo-600 truncate max-w-full italic text-center">
                      Foto saat ini tersedia<br />(Pilih file baru jika ingin mengganti)
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons inside Modal footer */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingInspeksi(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition text-xs cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl transition text-xs cursor-pointer disabled:bg-slate-400"
                >
                  {isEditSubmitting ? 'Mengunggah & Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= PRINT ONLY K3 REPORT ======================= */}
      <div className="hidden print:block w-[190mm] mx-auto bg-white text-black font-sans p-1" style={{ fontSize: '10px' }}>
        <div className="space-y-5">
          
          {/* Header Kop Surat */}
          <div className="border-2 border-slate-900 p-3 flex items-center justify-between">
            <img
              src="https://lh3.googleusercontent.com/d/1zE6dEUc98zDbaIVKBwfVDGX_s2abcmz_"
              alt="HSE Logo"
              className="h-10 object-contain"
              referrerPolicy="no-referrer"
            />
            <div className="text-center flex-1 mx-4">
              <h2 className="text-sm font-black tracking-wider uppercase text-slate-900">
                LAPORAN REKAPITULASI INSPEKSI K3LH
              </h2>
              <p className="text-[9px] font-bold text-slate-500 tracking-wide mt-0.5 font-mono">
                PT INDOTRUCK UTAMA - HEALTH SAFETY ENVIRONMENT MONITORING SYSTEM
              </p>
              <p className="text-[8px] text-slate-400 mt-0.5">
                Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <img
              src="https://lh3.googleusercontent.com/d/156hm6i1ksZjjLvYvivwgVPfcuo-CP1fy"
              alt="Company Logo"
              className="h-10 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Quick Stats Summary */}
          <div className="grid grid-cols-4 gap-2 bg-slate-50 border border-slate-200 p-3 rounded-lg">
            <div className="text-center p-1.5 border-r border-slate-200">
              <span className="block text-[8px] font-extrabold uppercase text-slate-500 tracking-wider">Total Inspeksi</span>
              <span className="text-sm font-black text-slate-800">{historyList.length} Items</span>
            </div>
            <div className="text-center p-1.5 border-r border-slate-200">
              <span className="block text-[8px] font-extrabold uppercase text-emerald-650 tracking-wider">Kondisi Baik</span>
              <span className="text-sm font-black text-emerald-700">{historyList.filter(item => item.kondisi === 'Baik').length} Items</span>
            </div>
            <div className="text-center p-1.5 border-r border-slate-200">
              <span className="block text-[8px] font-extrabold uppercase text-rose-650 tracking-wider">Kondisi Rusak</span>
              <span className="text-sm font-black text-rose-700">{historyList.filter(item => item.kondisi === 'Rusak').length} Items</span>
            </div>
            <div className="text-center p-1.5">
              <span className="block text-[8px] font-extrabold uppercase text-slate-550 tracking-wider">Kondisi Hilang</span>
              <span className="text-sm font-black text-slate-650">{historyList.filter(item => item.kondisi === 'Hilang').length} Items</span>
            </div>
          </div>

          {/* Table list */}
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-black uppercase tracking-wide text-slate-800 border-l-2 border-slate-900 pl-1.5">
              Daftar Riwayat Inspeksi & Temuan Alat K3 Berkala
            </h4>
            <table className="w-full text-[9px] text-left border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-750 font-bold border-b border-slate-300">
                  <th className="py-2 px-1.5 border-r border-slate-300 text-center w-[30px]">No</th>
                  <th className="py-2 px-2 border-r border-slate-300 w-[95px]">Tanggal</th>
                  <th className="py-2 px-2 border-r border-slate-300 w-[120px]">Area / Posisi</th>
                  <th className="py-2 px-2 border-r border-slate-300 w-[120px]">ID / Nama Alat</th>
                  <th className="py-2 px-2 border-r border-slate-300 text-center w-[75px]">Kondisi</th>
                  <th className="py-2 px-2 border-r border-slate-300">Detail Temuan & Tindakan</th>
                  <th className="py-2 px-2 text-slate-700 w-[90px]">PIC Pemeriksa</th>
                </tr>
              </thead>
              <tbody>
                {historyList.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                    <td className="py-1.5 px-1 w-[30px] border-r border-slate-300 text-center font-mono">{idx + 1}</td>
                    <td className="py-1.5 px-2 w-[95px] border-r border-slate-300 text-slate-600">{formatTanggalIndonesia(item.tanggal)}</td>
                    <td className="py-1.5 px-2 w-[120px] border-r border-slate-300 font-semibold text-slate-800">{item.posisi}</td>
                    <td className="py-1.5 px-2 w-[120px] border-r border-slate-300">
                      <div className="font-mono font-bold text-slate-900">{item.idAlat}</div>
                      <div className="text-[8px] text-slate-500 leading-tight">{item.namaBarang}</div>
                    </td>
                    <td className="py-1.5 px-2 w-[75px] border-r border-slate-300 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider block text-center border ${
                        item.kondisi === 'Baik'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : item.kondisi === 'Rusak'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {item.kondisi.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-300 text-slate-600 italic break-words">
                      {item.temuan && item.temuan !== '-' ? item.temuan : "Kondisi Baik & Siap Digunakan"}
                    </td>
                    <td className="py-1.5 px-2 text-slate-800 font-extrabold uppercase text-[8px] truncate">{item.pic}</td>
                  </tr>
                ))}
                {historyList.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-slate-400">
                      Belum ada temuan laporan atau riwayat inspeksi K3 berkala.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Signoff Container (Avoid page breakdown breaks) */}
          <div className="pt-6 grid grid-cols-2 gap-8 text-center" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <div></div> {/* spacer column for nice balance */}
            <div className="space-y-12">
              <div className="space-y-0.5">
                <p className="text-[8px] text-slate-400 uppercase tracking-wide">
                  Dibuat Dan Dilaporkan Tanggal {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-[9px] font-extrabold text-slate-800 uppercase">
                  PIC PETUGAS K3LH / OPERATOR
                </p>
              </div>
              
              <div className="inline-block border-b border-black w-48 h-8"></div>
              
              <div className="space-y-0.5">
                <p className="text-[9px] font-mono font-black text-indigo-900 uppercase">
                  {userRealName || "OPERATOR HSE"}
                </p>
                <p className="text-[8px] text-slate-500 font-medium">HSE Inspector Team</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
