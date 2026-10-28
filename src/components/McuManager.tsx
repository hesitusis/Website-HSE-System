import React, { useState, useEffect } from 'react';
import { Activity, UserCheck, Calendar, Search, RefreshCw, Trash2, Edit, CheckCircle2, AlertCircle } from 'lucide-react';
import { MCURecord } from '../types.js';
import { PageHeader } from './common/index.js';

interface McuManagerProps {
  userRealName: string;
  activeSite?: string;
  userRole?: 'admin' | 'operator';
  onBack: () => void;
}

export default function McuManager({ userRealName, activeSite, userRole = 'admin', onBack }: McuManagerProps) {
  const targetSite = activeSite && activeSite !== 'ALL' ? activeSite : 'ITU-Admo';
  // Form fields
  const [rowId, setRowId] = useState<number | ''>('');
  const [nrp, setNrp] = useState('');
  const [nama, setNama] = useState('');
  const [tglMcu, setTglMcu] = useState('');
  const [jenisMcu, setJenisMcu] = useState('');
  const [hasilMcu, setHasilMcu] = useState('');
  const [statusMcu, setStatusMcu] = useState<'Lulus' | 'Tidak Lulus' | 'Perlu Tindak Lanjut' | string>('');
  const [tglExpiredMcu, setTglExpiredMcu] = useState('');
  const [catatanMcu, setCatatanMcu] = useState('');

  const [karyawanList, setKaryawanList] = useState<string[]>([]);
  const [mcuList, setMcuList] = useState<MCURecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [isKaryawanDropdownOpen, setIsKaryawanDropdownOpen] = useState(false);

  // Deletion tracking
  const [mcuToDelete, setMcuToDelete] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    fetchKaryawanList();
    fetchMcuList();
  }, []);

  const fetchKaryawanList = async () => {
    try {
      const res = await fetch("/api/karyawan");
      const d = await res.json();
      if (d.success) setKaryawanList(d.karyawan);
    } catch (e) {
      console.error("Gagal memuat karyawan", e);
    }
  };

  const fetchMcuList = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/mcu");
      const d = await res.json();
      if (d.data) {
        setMcuList(d.data);
      }
    } catch (e) {
      console.error("Gagal memuat MCU list", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKaryawanSelection = (selectedVal: string) => {
    if (!selectedVal) {
      setNrp('');
      setNama('');
      return;
    }

    if (selectedVal.includes(" - ")) {
      const parts = selectedVal.split(" - ");
      setNrp(parts[0]);
      setNama(parts[1]);
    } else {
      setNrp('');
      setNama(selectedVal);
    }
  };

  const resetForm = () => {
    setRowId('');
    setNrp('');
    setNama('');
    setTglMcu('');
    setJenisMcu('');
    setHasilMcu('');
    setStatusMcu('');
    setTglExpiredMcu('');
    setCatatanMcu('');
    
    // Clear select element
    const el = document.getElementById("mcuKaryawanSelect") as HTMLSelectElement;
    if (el) el.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nrp || !nama) {
      alert("Mohon pilih karyawan!");
      return;
    }
    if (!statusMcu) {
      alert("Mohon tentukan status kelulusan!");
      return;
    }

    if (!window.confirm(`${rowId ? 'Perbarui' : 'Simpan'} rekap data MCU berkala untuk ${nama}?`)) {
      return;
    }

    setIsSubmitLoading(true);
    setFeedback(null);

    try {
      const formattedMcu = tglMcu.split('-').reverse().join('/');
      const formattedExpired = tglExpiredMcu ? tglExpiredMcu.split('-').reverse().join('/') : "-";

      const res = await fetch("/api/mcu/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nrp,
          nama,
          tglMcu: formattedMcu,
          jenisMcu,
          hasilMcu,
          statusMcu,
          tglExpiredMcu: formattedExpired,
          catatanMcu,
          rowId: rowId ? rowId.toString() : "",
          userName: userRealName,
          site: targetSite
        })
      });

      const d = await res.json();
      if (d.success) {
        setFeedback({ type: 'success', msg: d.message });
        resetForm();
        fetchMcuList();
      } else {
        setFeedback({ type: 'error', msg: d.message || "Gagal menyimpan rincian MCU." });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: "Kesalahan jaringan: " + err.message });
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const startEdit = (item: MCURecord) => {
    setRowId(item.rowId);
    setNrp(item.nrp);
    setNama(item.nama);
    setJenisMcu(item.jenisMcu);
    setHasilMcu(item.hasilMcu);
    setStatusMcu(item.statusMcu);
    setCatatanMcu(item.catatanMcu);

    if (item.tglMcu && item.tglMcu.includes("/")) {
      setTglMcu(item.tglMcu.split('/').reverse().join('-'));
    }
    if (item.tglExpiredMcu && item.tglExpiredMcu.includes("/") && item.tglExpiredMcu !== "-") {
      setTglExpiredMcu(item.tglExpiredMcu.split('/').reverse().join('-'));
    } else {
      setTglExpiredMcu('');
    }

    // Set select element value
    const el = document.getElementById("mcuKaryawanSelect") as HTMLSelectElement;
    if (el) {
      // Find matching value
      const match = karyawanList.find(k => k.startsWith(item.nrp));
      if (match) el.value = match;
    }

    // Scroll to form target
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startDelete = (id: number, name: string) => {
    setMcuToDelete({ id, name });
  };

  const executeDelete = async () => {
    if (!mcuToDelete) return;
    try {
      const res = await fetch(`/api/mcu/${mcuToDelete.id}`, {
        method: "DELETE"
      });
      const d = await res.json();
      if (d.success) {
        setFeedback({ type: 'success', msg: d.message });
        setMcuToDelete(null);
        fetchMcuList();
      } else {
        setFeedback({ type: 'error', msg: d.message || "Gagal melakukan penghapusan." });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: "Gagal memproses penghapusan: " + err.message });
    }
  };

  // Searching filter
  const filteredList = mcuList.filter((item) => {
    if (userRole === 'operator' && activeSite && activeSite !== 'ALL') {
      const itemSite = item.site || 'ITU-Admo';
      if (itemSite.toLowerCase() !== activeSite.toLowerCase()) return false;
    }
    const k = searchTerm.toLowerCase();
    return (
      item.nama.toLowerCase().includes(k) ||
      item.nrp.toLowerCase().includes(k) ||
      item.jenisMcu.toLowerCase().includes(k) ||
      item.statusMcu.toLowerCase().includes(k) ||
      item.hasilMcu.toLowerCase().includes(k)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Manajemen Riwayat MCU"
        subtitle="Pencatatan rekapitulasi riwayat kesehatan, kepatuhan, serta kelayakan medis Medical Check-Up Karyawan."
        onBack={onBack}
        icon={<Activity className="h-6 w-6 text-rose-500" />}
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

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Container */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-2">
            {rowId ? '📝 Edit Riwayat MCU' : '➕ Tambah Riwayat MCU'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                Karyawan <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => {
                    setNama(e.target.value);
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
                      const query = nama.toLowerCase();
                      const filtered = karyawanList.filter(k => 
                        k.toLowerCase().includes(query)
                      );

                      if (filtered.length > 0) {
                        return filtered.map((k, index) => {
                          let nameOnly = k;
                          let nrpOnly = '';
                          if (k.includes(" - ")) {
                            const parts = k.split(" - ");
                            nrpOnly = parts[0];
                            nameOnly = parts[1];
                          }
                          return (
                            <button
                              key={index}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleKaryawanSelection(k);
                                setIsKaryawanDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm text-slate-700 font-medium transition flex items-center justify-between"
                            >
                              <div>
                                <div className="font-semibold text-slate-800">{nameOnly}</div>
                                {nrpOnly && (
                                  <div className="text-xs text-slate-400 font-mono">NRP: {nrpOnly}</div>
                                )}
                              </div>
                              <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-semibold font-mono">Pilih</span>
                            </button>
                          );
                        });
                      } else {
                        return (
                          <div className="px-4 py-2.5 text-xs text-slate-400 italic">
                            Tidak ditemukan hasil untuk "{nama}"
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
                  ID / NRP
                </label>
                <input
                  type="text"
                  value={nrp}
                  readOnly
                  placeholder="ID"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-150 text-sm font-mono text-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                  Tanggal MCU <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={tglMcu}
                  onChange={(e) => setTglMcu(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                  Jenis MCU <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={jenisMcu}
                  onChange={(e) => setJenisMcu(e.target.value)}
                  placeholder="Tahunan / Khusus"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                  Hasil Klinis <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={hasilMcu}
                  onChange={(e) => setHasilMcu(e.target.value)}
                  placeholder="Fit / Fit dengan catatan"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                  Status Kelulusan <span className="text-rose-500">*</span>
                </label>
                <select
                  value={statusMcu}
                  onChange={(e) => setStatusMcu(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500"
                  required
                >
                  <option value="">-- Pilih Status --</option>
                  <option value="Lulus">Lulus ✅</option>
                  <option value="Tidak Lulus">Tidak Lulus ❌</option>
                  <option value="Perlu Tindak Lanjut">Perlu Tindak Lanjut</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                  Masa Berlaku MCU
                </label>
                <input
                  type="date"
                  value={tglExpiredMcu}
                  onChange={(e) => setTglExpiredMcu(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                Catatan Dokter / Keterangan
              </label>
              <textarea
                value={catatanMcu}
                onChange={(e) => setCatatanMcu(e.target.value)}
                placeholder="Tulis diagnosa, resep pantangan, atau instruksi tindak lanjut medis..."
                rows={3}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500 focus:bg-white"
              ></textarea>
            </div>

            <div className="flex gap-2 justify-end">
              {rowId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-slate-250 hover:bg-slate-50 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Batal
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitLoading}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 px-5 rounded-xl transition text-xs cursor-pointer disabled:bg-slate-450"
              >
                {isSubmitLoading ? 'Memproses...' : rowId ? 'Perbarui MCU' : 'Simpan MCU'}
              </button>
            </div>
          </form>
        </div>

        {/* Database log view with search filter */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              📚 Log Histori Medis MCU Karyawan
            </h3>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari nama, NRP atau hasil..."
                  className="pl-8 pr-3 py-1.5 border border-slate-200 bg-slate-50 focus:bg-white rounded-lg text-xs outline-none w-full sm:w-56"
                />
              </div>
              <button
                onClick={fetchMcuList}
                disabled={isLoading}
                className="p-2 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer shrink-0"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="text-center py-12 text-slate-400 text-xs">Memetakan rekam medis harian...</div>
            ) : filteredList.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">Tidak ada riwayat medis MCU yang sesuai.</div>
            ) : (
              <table className="w-full text-xs text-left text-slate-600 border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-150">
                    <th className="py-2.5 px-2">No</th>
                    <th className="py-2.5 px-2">NRP</th>
                    <th className="py-2.5 px-2">Nama Karyawan</th>
                    <th className="py-2.5 px-2">Tgl MCU</th>
                    <th className="py-2.5 px-2">Jenis</th>
                    <th className="py-2.5 px-2">Hasil</th>
                    <th className="py-2.5 px-2 text-center">Status</th>
                    <th className="py-2.5 px-2">Berlaku</th>
                    <th className="py-2.5 px-2 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((item, id) => (
                    <tr key={id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2.5 px-2 text-slate-400 font-bold">{id + 1}</td>
                      <td className="py-2.5 px-2 font-mono text-slate-500">{item.nrp}</td>
                      <td className="py-2.5 px-2 font-bold text-slate-850">{item.nama}</td>
                      <td className="py-2.5 px-2 text-slate-550">{item.tglMcu}</td>
                      <td className="py-2.5 px-2">{item.jenisMcu}</td>
                      <td className="py-2.5 px-2" title={item.catatanMcu}>
                        <div className="font-semibold text-slate-800">{item.hasilMcu}</div>
                        <div className="text-[10px] text-slate-450 truncate max-w-[120px]">{item.catatanMcu}</div>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.statusMcu === 'Lulus'
                              ? 'bg-emerald-50 text-emerald-700'
                              : item.statusMcu === 'Tidak Lulus'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-750'
                          }`}
                        >
                          {item.statusMcu}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 font-semibold text-slate-700">{item.tglExpiredMcu || "-"}</td>
                      <td className="py-2.5 px-2 text-center">
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={() => startEdit(item)}
                            className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition cursor-pointer"
                            title="Edit Record"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => startDelete(item.rowId, item.nama)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                            title="Delete Record"
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

      {/* Delete Confirmation Dialog Modal */}
      {mcuToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-930/60 backdrop-blur-sm flex justify-center items-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4 text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto text-xl">
              ⚠️
            </div>
            <div>
              <h4 className="text-md font-bold text-slate-800">Batalkan Riwayat MCU</h4>
              <p className="text-xs text-slate-400 mt-1">
                Apakah Anda benar-benar yakin ingin menghapus data MCU untuk <b>{mcuToDelete.name}</b> secara permanen?
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => setMcuToDelete(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer select-none"
              >
                Batal
              </button>
              <button
                onClick={executeDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer select-none"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
