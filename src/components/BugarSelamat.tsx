import React, { useState, useEffect } from 'react';
import { 
  HeartPulse, 
  CheckSquare, 
  ShieldAlert, 
  Users, 
  RefreshCw, 
  UsersRound, 
  Clipboard, 
  Copy, 
  Check, 
  Info, 
  Settings, 
  Save, 
  Search, 
  Download, 
  Clock, 
  Calendar,
  Layers,
  Sparkles,
  AlertTriangle,
  ArrowUpDown
} from 'lucide-react';
import { BugarRecord } from '../types.js';
import { PageHeader, Button, Badge } from './common/index.js';

interface BugarSelamatProps {
  onBack: () => void;
}

export default function BugarSelamat({ onBack }: BugarSelamatProps) {
  const [activeTab, setActiveTab] = useState<'belum' | 'unfit'>('belum');
  const [columns, setColumns] = useState<string[]>([]);
  const [records, setRecords] = useState<any[][]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  // Custom sheet ID state & logic
  const [customSheetId, setCustomSheetId] = useState<string>(() => {
    return localStorage.getItem("custom_daily_sheet_id") || "";
  });
  const [inputSheetId, setInputSheetId] = useState(customSheetId);
  const [isCopied, setIsCopied] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Email of the service account configured
  const saEmail = "sinkronisasi-hse-system@constant-cubist-499606-g0.iam.gserviceaccount.com";

  useEffect(() => {
    fetchBugarData();
  }, [activeTab, customSheetId]);

  const fetchBugarData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      let endpoint = activeTab === 'belum' ? '/api/bugar/belum' : '/api/bugar/unfit';
      if (customSheetId.trim()) {
        endpoint += `?customSheetId=${encodeURIComponent(customSheetId.trim())}`;
      }
      const res = await fetch(endpoint);
      const d = await res.json();
      if (d.success) {
        setColumns(d.headers || []);
        setRecords(d.values || []);
        const now = new Date();
        setLastRefreshed(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + " WIB");
      } else {
        setErrorMsg(d.message || "Gagal memuat data monitoring harian dari Google Sheets.");
      }
    } catch (e: any) {
      setErrorMsg("Kesalahan koneksi ke server: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSheetId = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = inputSheetId.trim();
    setCustomSheetId(cleanId);
    if (cleanId) {
      localStorage.setItem("custom_daily_sheet_id", cleanId);
    } else {
      localStorage.removeItem("custom_daily_sheet_id");
    }
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setShowConfig(false);
    }, 1500);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(saEmail);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  // Helper selectors to highlight target text or format nicely
  const getCellClassName = (header: string, text: string) => {
    const norm = header.toLowerCase();
    const cleanText = (text || "").toLowerCase();
    
    if (norm.includes("nrp") || norm.includes("id") || norm.includes("nik")) {
      return "font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded";
    }
    if (norm.includes("nama") || norm.includes("karyawan")) {
      return "font-bold text-slate-900";
    }
    if (norm.includes("status") || norm.includes("keterangan")) {
      if (cleanText.includes("unfit") || cleanText.includes("sakit") || cleanText.includes("gejala")) {
        return "text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded border border-rose-100 inline-block";
      }
      return "text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded border border-emerald-150 inline-block";
    }
    return "";
  };

  // Simple client-side CSV Export utility
  const exportToCSV = () => {
    if (records.length === 0) return;
    
    // Prepare header content
    const csvHeaders = columns.length > 0 ? columns : ["No", "Tanggal", "NRP", "Nama", "Detail"];
    let csvRows = [csvHeaders.join(",")];
    
    records.forEach((row, i) => {
      const cleanRow = row.map(cell => {
        const val = String(cell || "").replace(/"/g, '""'); // Escape inner quotes
        return `"${val}"`;
      });
      csvRows.push(cleanRow.join(","));
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const filename = `monitoring_ftw_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter records based on user search query
  const filteredRecords = records.filter(row => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    return row.some(cell => String(cell || "").toLowerCase().includes(query));
  });

  return (
    <div className="space-y-6">
      {/* Upper Navigation & Stats Banner */}
      <PageHeader
        title="Monitoring Bugar Selamat"
        subtitle="Pantau real-time deklarasi harian Fit-To-Work (FTW) karyawan, kelola database eksternal terintegrasi."
        onBack={onBack}
        badge={<Badge variant="indigo">HSE Health Monitor</Badge>}
        icon={<HeartPulse className="h-6 w-6 text-indigo-600" />}
        actions={
          <Button
            variant="secondary"
            icon={<Settings className="h-4 w-4 text-indigo-500" />}
            onClick={() => setShowConfig(!showConfig)}
          >
            Spreadsheet Settings
          </Button>
        }
      />

      {/* Guide/Config Widget */}
      {(showConfig || !customSheetId) && (
        <div className="bg-slate-950 text-white rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-indigo-400" />
              <h4 className="font-bold text-sm tracking-tight text-slate-100">🔌 Petunjuk Integrasi Spreadsheet Pemilik Lain</h4>
            </div>
            {customSheetId && (
              <button 
                onClick={() => setShowConfig(false)}
                className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-1 rounded bg-slate-900 border border-slate-800"
              >
                Sembunyikan
              </button>
            )}
          </div>
          
          <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
            Aplikasi web ini menggunakan teknologi <b>Google Cloud Service Account</b>. Anda dapat menghubungkan spreadsheet lain yang dibagikan kepada Anda (misalnya spreadsheet harian dari tim pusat) agar tersinkronisasi langsung, tanpa perlu menyalin isinya secara manual.
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
            {/* Steps Column */}
            <div className="bg-slate-900/80 p-5 rounded-xl space-y-3 text-xs border border-slate-800 flex flex-col justify-between">
              <div>
                <h5 className="font-bold text-indigo-400 flex items-center gap-1.5 mb-2">
                  <span className="h-4 w-4 bg-indigo-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">1</span>
                  Beri Akses Email Service Account di Google Sheets
                </h5>
                <p className="text-slate-300 leading-normal mb-3">
                  Buka Spreadsheet target Anda, klik tombol biru <b>"Bagikan" (Share)</b> di kanan atas, lalu jadikan email di bawah ini sebagai <b>Pelihat (Viewer)</b> / <b>Editor</b>:
                </p>
              </div>
              
              <div className="flex items-center gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                <span className="font-mono text-[9px] select-all break-all text-indigo-300 flex-1">{saEmail}</span>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 rounded-md text-[10px] transition text-white flex items-center gap-1 shrink-0 font-bold"
                >
                  {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {isCopied ? "Tersalin" : "Salin Email"}
                </button>
              </div>
            </div>

            {/* Custom sheet ID Overrides Column */}
            <form onSubmit={handleSaveSheetId} className="bg-slate-900/80 p-5 rounded-xl space-y-3 text-xs border border-slate-800 flex flex-col justify-between">
              <div>
                <h5 className="font-bold text-indigo-400 flex items-center gap-1.5 mb-2">
                  <span className="h-4 w-4 bg-indigo-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">2</span>
                  Tempelkan Kode Spreadsheet ID
                </h5>
                <p className="text-slate-300 leading-normal mb-3">
                  Salin string ID panjanng dari URL browser Spreadsheet Anda (ID adalah kode di antara <code className="bg-slate-950 px-1 py-0.5 rounded text-indigo-300">/d/</code> dan <code className="bg-slate-950 px-1 py-0.5 rounded text-indigo-300">/edit</code>):
                </p>
                <input
                  type="text"
                  value={inputSheetId}
                  onChange={(e) => setInputSheetId(e.target.value)}
                  placeholder="Contoh: 19kUpCQRjaMzZo1KMtXklhlRI..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] text-slate-400 font-mono">
                  {customSheetId ? "🔒 Menggunakan Custom Sheet" : "📋 Menggunakan Default Daily ID"}
                </span>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-[10px] font-bold text-white transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-900/20"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saveSuccess ? "Berhasil Dihubungkan!" : "Hubungkan Sekarang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Segmented Selectors Cards & General Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Option Tab 1 */}
        <button
          onClick={() => setActiveTab('belum')}
          className={`relative overflow-hidden p-5 rounded-2xl border text-left transition duration-200 cursor-pointer select-none group flex flex-col justify-between h-32 ${
            activeTab === 'belum'
              ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-indigo-700 shadow-md ring-2 ring-indigo-600/20'
              : 'bg-white text-slate-805 hover:bg-slate-50/60 border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex justify-between items-start w-full">
            <div className={`p-2.5 rounded-xl ${activeTab === 'belum' ? 'bg-indigo-500/55' : 'bg-indigo-50'}`}>
              <Users className={`h-5 w-5 ${activeTab === 'belum' ? 'text-white' : 'text-indigo-600'}`} />
            </div>
            {activeTab === 'belum' && (
              <span className="text-[10px] bg-white/20 text-white font-bold tracking-wider px-2 py-0.5 rounded">AKTIFF</span>
            )}
          </div>
          <div>
            <div className={`text-[11px] font-bold tracking-widest uppercase ${activeTab === 'belum' ? 'text-indigo-200' : 'text-slate-400'}`}>
              Deklarasi FTW
            </div>
            <div className="text-sm font-black tracking-tight mt-0.5">Belum Mengisi Hari Ini</div>
            <p className={`text-[10px] font-normal leading-normal mt-1 ${activeTab === 'belum' ? 'text-indigo-100' : 'text-slate-550'}`}>
              Daftar karyawan yang belum mengirimkan form bugar/fit-to-work harian.
            </p>
          </div>
        </button>

        {/* Middle Option Tab 2 */}
        <button
          onClick={() => setActiveTab('unfit')}
          className={`relative overflow-hidden p-5 rounded-2xl border text-left transition duration-200 cursor-pointer select-none group flex flex-col justify-between h-32 ${
            activeTab === 'unfit'
              ? 'bg-gradient-to-br from-rose-600 to-rose-700 text-white border-rose-700 shadow-md ring-2 ring-rose-600/20'
              : 'bg-white text-slate-805 hover:bg-slate-50/60 border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex justify-between items-start w-full">
            <div className={`p-2.5 rounded-xl ${activeTab === 'unfit' ? 'bg-rose-500/55' : 'bg-rose-50'}`}>
              <ShieldAlert className={`h-5 w-5 ${activeTab === 'unfit' ? 'text-white' : 'text-rose-600'}`} />
            </div>
            {activeTab === 'unfit' && (
              <span className="text-[10px] bg-white/20 text-white font-bold tracking-wider px-2 py-0.5 rounded">AKTIFF</span>
            )}
          </div>
          <div>
            <div className={`text-[11px] font-bold tracking-widest uppercase ${activeTab === 'unfit' ? 'text-rose-200' : 'text-slate-400'}`}>
              Sakit / Gejala Penyakit
            </div>
            <div className="text-sm font-black tracking-tight mt-0.5">Daftar Karyawan UNFIT</div>
            <p className={`text-[10px] font-normal leading-normal mt-1 ${activeTab === 'unfit' ? 'text-rose-100' : 'text-slate-550'}`}>
              Daftar karyawan yang menyampaikan keluhan tidak sehat pada form harian.
            </p>
          </div>
        </button>

        {/* Right Info Card */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100/60 p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-32">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-500 tracking-wider flex items-center gap-1.5 uppercase">
              <Clock className="h-3 w-3 text-slate-400" />
              Status Sinkronisasi
            </span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="space-y-1.5">
            <div className="text-[10px] text-slate-600 flex items-center justify-between">
              <span>Spreadsheet ID:</span>
              <span className="font-mono bg-slate-200 text-slate-700 px-1 rounded text-[9px] truncate max-w-[120px]" title={customSheetId || "Using Default"}>
                {customSheetId ? customSheetId : "Daily System Default"}
              </span>
            </div>
            <div className="text-[10px] text-slate-600 flex items-center justify-between">
              <span>Terakhir Update:</span>
              <span className="font-bold text-slate-805">{lastRefreshed || "Belum memuat"}</span>
            </div>
            <div className="text-[10px] text-slate-600 flex items-center justify-between">
              <span>Jumlah Item Terdeteksi:</span>
              <span className="text-xs font-black text-indigo-600">{records.length} Karyawan</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Segment & Controls */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
        {/* Actions bar (Search + Export + Refresh) */}
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-450 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari karyawan, NRP, jabatan, atau kolom lainnya secara real-time..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:bg-white transition"
            />
          </div>
          
          <div className="flex items-center gap-2">
            {records.length > 0 && (
              <button
                onClick={exportToCSV}
                className="flex-1 sm:flex-initial px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="Ekspor ke format kompresi CSV untuk diakses di Excel"
              >
                <Download className="h-3.5 w-3.5 text-indigo-500" />
                Unduh CSV (Excel)
              </button>
            )}
            
            <button
              onClick={fetchBugarData}
              disabled={isLoading}
              className="flex-1 sm:flex-initial px-4 py-2 bg-indigo-50 hover:bg-indigo-100/80 active:bg-indigo-200 rounded-xl text-xs font-bold text-indigo-700 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-indigo-600 ${isLoading ? 'animate-spin' : ''}`} />
              Sinc Ulang
            </button>
          </div>
        </div>

        {/* Error Notification Block */}
        {errorMsg && (
          <div className="p-4 bg-rose-50 text-rose-800 border-l-4 border-rose-500 rounded-r-xl text-xs flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-500 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <div className="font-bold text-sm text-rose-900">Gagal Tersinkronisasi</div>
              <p className="text-slate-600 leading-normal">{errorMsg}</p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfig(true)}
                  className="text-xs text-rose-700 font-bold underline hover:text-rose-900"
                >
                  Buka petunjuk perbaikan koneksi &rsaquo;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Table Rendering */}
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          {isLoading ? (
            <div className="text-center py-20 bg-slate-50/50 rounded-xl space-y-3">
              <RefreshCw className="h-10 w-10 text-indigo-600 animate-spin mx-auto" />
              <div className="text-semibold text-slate-700 text-xs">Mengambil Realisasi Data Harian...</div>
              <p className="text-[10px] text-slate-400 max-w-sm mx-auto">Sistem sedang menghubungi API Google Sheets eksternal untuk melacak pendaftaran fit-to-work.</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-20 bg-slate-50/50 border border-dashed rounded-xl space-y-3 p-8">
              <div className="h-12 w-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckSquare className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Tabel Bersih & Prima</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {searchQuery 
                  ? `Tidak ada data karyawan yang cocok dengan pencarian kata kunci "${searchQuery}". Silakan coba kata kunci lain.` 
                  : activeTab === 'belum'
                    ? 'Luar biasa! Seluruh karyawan Indotruck Utama telah menyelesaikan pengisian form Fit-to-Work (FTW) hari ini.'
                    : 'Aman dan Kondusif! Tidak ada laporan gejala sakit (Unfit) yang terdeteksi pada hari ini.'
                }
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 rounded-lg text-[10px] font-bold text-slate-700 transition cursor-pointer"
                >
                  Bersihkan Pencarian
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-xs text-left text-slate-600 border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-550 border-b border-slate-205">
                  <th className="py-3 px-4 font-bold tracking-wider text-[10px] uppercase w-12 text-center">No</th>
                  {columns.length > 0 ? (
                    columns.map((col, cIdx) => (
                      <th key={cIdx} className="py-3 px-4 font-bold tracking-wider text-[10px] uppercase text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {col}
                          <ArrowUpDown className="h-2.5 w-2.5 text-slate-300 pointer-events-none" />
                        </div>
                      </th>
                    ))
                  ) : (
                    <>
                      <th className="py-3 px-4 font-bold tracking-wider text-[10px] uppercase text-slate-505">Log Waktu</th>
                      <th className="py-3 px-4 font-bold tracking-wider text-[10px] uppercase text-slate-505">NRP</th>
                      <th className="py-3 px-4 font-bold tracking-wider text-[10px] uppercase text-slate-505">Nama Lengkap</th>
                      <th className="py-3 px-4 font-bold tracking-wider text-[10px] uppercase text-slate-505">Jabatan / Peran</th>
                      <th className="py-3 px-4 font-bold tracking-wider text-[10px] uppercase text-slate-505">Atasan Langsung</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((row, index) => {
                  const isUnfitRow = activeTab === 'unfit';
                  return (
                    <tr
                      key={index}
                      className={`border-b border-slate-100 font-medium transition duration-150 ${
                        isUnfitRow ? 'bg-rose-50/20 hover:bg-rose-50/40' : 'hover:bg-slate-50/60'
                      }`}
                    >
                      <td className="py-3 px-4 text-center font-bold text-slate-400 bg-slate-50/30">
                        {index + 1}
                      </td>
                      
                      {columns.length > 0 ? (
                        row.map((cell, cIdx) => {
                          const header = columns[cIdx] || "";
                          return (
                            <td key={cIdx} className="py-3 px-4 whitespace-nowrap lg:whitespace-normal">
                              <span className={getCellClassName(header, String(cell))}>
                                {cell || "-"}
                              </span>
                            </td>
                          );
                        })
                      ) : (
                        <>
                          <td className="py-3 px-4 text-slate-450">{row[0] || "-"}</td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                              {row[1] || "-"}
                            </span>
                          </td>
                          <td className={`py-3 px-4 font-extrabold ${isUnfitRow ? 'text-rose-600' : 'text-indigo-600'}`}>
                            {row[2] || "-"}
                          </td>
                          <td className="py-3 px-4 text-slate-705 font-medium">{row[3] || "-"}</td>
                          <td className="py-3 px-4 text-slate-500 italic font-normal">{row[4] || "-"}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
