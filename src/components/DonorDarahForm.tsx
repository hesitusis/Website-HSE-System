import React, { useState, useEffect, useMemo } from 'react';
import { HeartPulse, UserCheck, Calendar, MapPin, ClipboardList, RefreshCw, CheckCircle2, AlertCircle, Search, ChevronDown } from 'lucide-react';
import { formatTanggalIndonesia } from '../utils.js';
import { DonorDarahRecord } from '../types.js';
import { PageHeader } from './common/index.js';

interface DonorDarahFormProps {
  userRealName: string;
  activeSite?: string;
  userRole?: 'admin' | 'operator';
  onBack: () => void;
}

export default function DonorDarahForm({ userRealName, activeSite, userRole = 'admin', onBack }: DonorDarahFormProps) {
  const targetSite = activeSite && activeSite !== 'ALL' ? activeSite : 'ITU-Admo';
  const [namaKaryawan, setNamaKaryawan] = useState('');
  const [nrp, setNrp] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [lokasi, setLokasi] = useState('');

  const [karyawanList, setKaryawanList] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<DonorDarahRecord[]>([]);

  const [tensi, setTensi] = useState('');
  const [hasil, setHasil] = useState<string>('Lolos (Berhasil Donor)');

  const filteredHistory = useMemo(() => {
    return historyList.filter(item => {
      if (userRole === 'operator' && activeSite && activeSite !== 'ALL') {
        const itemSite = item.site || 'ITU-Admo';
        if (itemSite.toLowerCase() !== activeSite.toLowerCase()) return false;
      }
      return true;
    });
  }, [historyList, userRole, activeSite]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [isKaryawanDropdownOpen, setIsKaryawanDropdownOpen] = useState(false);

  useEffect(() => {
    fetchKaryawanList();
    fetchDonorHistory();
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

  const fetchDonorHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/donor/history");
      const d = await res.json();
      if (d.history) {
        setHistoryList(d.history);
      }
    } catch (e) {
      console.error("Gagal memuat history donor", e);
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
      alert("Mohon pilih nama karyawan!");
      return;
    }
    if (!tanggal) {
      alert("Mohon tentukan tanggal donor!");
      return;
    }
    if (!lokasi) {
      alert("Mohon tentukan lokasi / penyelenggara donor!");
      return;
    }
    if (!tensi) {
      alert("Mohon isi tekanan darah (tensi)!");
      return;
    }

    if (!window.confirm(`Simpan Laporan Donor Darah untuk ${namaKaryawan}?`)) {
      return;
    }

    setIsSubmitLoading(true);
    setFeedback(null);

    try {
      const formattedTgl = tanggal ? tanggal.split('-').reverse().join('/') : "";

      const res = await fetch("/api/donor/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: namaKaryawan,
          nrp,
          jabatan,
          tanggalDonor: formattedTgl,
          lokasi,
          tensi,
          hasilSkrining: hasil,
          userName: userRealName,
          site: targetSite
        })
      });
      
      const d = await res.json();
      if (d.success) {
        setFeedback({ type: 'success', msg: d.message });
        setJabatan('');
        setTanggal('');
        setLokasi('');
        setTensi('');
        fetchDonorHistory();
      } else {
        setFeedback({ type: 'error', msg: d.message || "Gagal menyimpan laporan." });
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
        title="Form Laporan Donor Darah"
        subtitle="Pencatatan partisipasi donor darah & skrining tekanan darah karyawan."
        onBack={onBack}
        icon={<HeartPulse className="h-6 w-6 text-rose-600" />}
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

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form panel */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-2">
            Input Partisipasi Donor Darah
          </h3>
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
                      const filtered = karyawanList.filter(k => 
                        (k.nama || "").toLowerCase().includes(namaKaryawan.toLowerCase()) ||
                        (k.nik || "").toLowerCase().includes(namaKaryawan.toLowerCase())
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
                            <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded font-semibold font-mono">Pilih</span>
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
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-150 text-sm outline-none font-mono text-slate-500"
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
                  placeholder="Operator / Admin"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500 focus:bg-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                Tanggal Donor <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:border-indigo-500 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5 flex items-center gap-1">
                <MapPin className="h-4 w-4 text-rose-500" /> Lokasi PMI / Penyelenggara <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={lokasi}
                onChange={(e) => setLokasi(e.target.value)}
                placeholder="Contoh: Kantor PMI Balikpapan"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                Tekanan Darah (Tensi) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={tensi}
                onChange={(e) => setTensi(e.target.value)}
                placeholder="Contoh: 120/80"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                Hasil Skrining Calon Donor
              </label>
              <select
                value={hasil}
                onChange={(e) => setHasil(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500 focus:bg-white"
                required
              >
                <option value="Lolos (Berhasil Donor)">Lolos (Berhasil Donor) 🩸</option>
                <option value="Gagal (Hb Rendah/Tinggi)">Gagal (Hb Rendah/Tinggi)</option>
                <option value="Gagal (Tensi Tidak Memenuhi)">Gagal (Tensi Tidak Memenuhi)</option>
                <option value="Gagal (Kondisi Medis Lain)">Gagal (Kondisi Medis Lain)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitLoading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl transition shadow-sm text-sm cursor-pointer disabled:bg-slate-400"
            >
              {isSubmitLoading ? 'Menyimpan...' : 'Simpan Laporan Donor'}
            </button>
          </form>
        </div>

        {/* Database log view */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4 text-rose-600" /> 10 Pemeriksaan Donor Darah Terakhir
            </h3>
            <button
              onClick={fetchDonorHistory}
              disabled={isLoading}
              className="text-slate-400 hover:text-slate-600 transition flex items-center gap-1 text-xs cursor-pointer"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} /> Muat Ulang
            </button>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="text-center py-8 text-slate-400 text-xs">Menyelaraskan database...</div>
            ) : renderTable(historyList, userRole, activeSite)}
          </div>
        </div>
      </div>
    </div>
  );
}

function renderTable(historyList: DonorDarahRecord[], userRole: string | undefined, activeSite: string | undefined) {
              const filteredHistory = historyList.filter(item => {
                if (userRole === 'operator' && activeSite && activeSite !== 'ALL') {
                  const itemSite = item.site || 'ITU-Admo';
                  if (itemSite.toLowerCase() !== activeSite.toLowerCase()) return false;
                }
                return true;
              });
              if (filteredHistory.length === 0) {
                return <div className="text-center py-8 text-slate-400 text-xs">Belum ada riwayat donor darah tercatat untuk site ini.</div>;
              }
              return (
              <table className="w-full text-xs text-left text-slate-600 border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-150">
                    <th className="py-2.5 px-3">Tgl Donor</th>
                    <th className="py-2.5 px-3">Karyawan Name</th>
                    <th className="py-2.5 px-3">Lokasi / PMI</th>
                    <th className="py-2.5 px-3">Tensi</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Status Skrining</th>
                    <th className="py-2.5 px-3">Input Oleh</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((item, id) => (
                    <tr key={id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-600">
                        {formatTanggalIndonesia(item.tglDonor)}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-850">{item.nama}</div>
                        <div className="text-[10px] text-slate-400">{item.jabatan} (NRP: {item.nrp})</div>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">{item.lokasi}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{item.tensi}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                            item.hasil.includes("Lolos")
                              ? 'bg-rose-550 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.hasil.includes("Lolos") ? "LOLOS DONOR 🩸" : "GAGAL CALON"}
                        </span>
                        <div className="text-[9px] text-slate-400 mt-1">{item.hasil}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[9px]">
                        {item.oleh || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
}
