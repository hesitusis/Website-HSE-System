import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Warehouse, ListOrdered, Calendar, ShieldCheck, UserCheck, RefreshCw, Layers, CheckCircle2, AlertCircle, Search, ChevronDown, Pencil, Check, X, Printer, FileText } from 'lucide-react';
import { formatTanggalIndonesia } from '../utils.js';
import { InventoryItem, InventoryHistory } from '../types.js';
import { PageHeader, SiteBadge, SiteFilterSelect, SiteFormField } from './common/index.js';
import { SiteId, SiteFilter } from '../constants/sites.js';

const companyLogo = 'https://images.seeklogo.com/logo-png/36/1/pt-indotruck-utama-logo-png_seeklogo-363267.png';

interface ApdFormProps {
  kategori: 'APD' | 'Barang';
  userRealName: string;
  activeSite?: string;
  userRole?: 'admin' | 'operator';
  onBack: () => void;
}

export default function ApdForm({ kategori, userRealName, activeSite, userRole = 'admin', onBack }: ApdFormProps) {
  const [jenis, setJenis] = useState<'Barang Masuk' | 'Barang Keluar'>('Barang Keluar');
  const [namaBarang, setNamaBarang] = useState('');
  const [jumlah, setJumlah] = useState<number | ''>('');
  const [keterangan, setKeterangan] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [formSite, setFormSite] = useState<SiteId>(() => (activeSite && activeSite !== 'ALL' ? (activeSite as SiteId) : 'ITU-Admo'));
  const [siteFilter, setSiteFilter] = useState<SiteFilter>(() => (activeSite as SiteFilter) || 'ALL');

  useEffect(() => {
    if (activeSite && activeSite !== 'ALL') {
      setFormSite(activeSite as SiteId);
      setSiteFilter(activeSite as SiteFilter);
    }
  }, [activeSite]);
  
  const [karyawanList, setKaryawanList] = useState<string[]>([]);
  const [stockList, setStockList] = useState<InventoryItem[]>([]);
  const [historyList, setHistoryList] = useState<InventoryHistory[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [isKaryawanDropdownOpen, setIsKaryawanDropdownOpen] = useState(false);

  // For modal detail (list of employees receiving selected item)
  const [selectedInspectItem, setSelectedInspectItem] = useState<string | null>(null);
  const [inspectDetail, setInspectDetail] = useState<InventoryHistory[]>([]);

  // Date editing state
  const [editingModalItem, setEditingModalItem] = useState<InventoryHistory | null>(null);
  const [editingHistoryItem, setEditingHistoryItem] = useState<InventoryHistory | null>(null);
  const [editDateValue, setEditDateValue] = useState<string>('');
  const [isUpdatingDate, setIsUpdatingDate] = useState<boolean>(false);

  // Sorting & Date Filter state for transactions
  const [historySortOrder, setHistorySortOrder] = useState<'desc' | 'asc'>('desc');
  const [inspectSortOrder, setInspectSortOrder] = useState<'desc' | 'asc'>('desc');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [excludedInspectPrintKeys, setExcludedInspectPrintKeys] = useState<string[]>([]);

  // Print receipt state
  const [selectedPrintItem, setSelectedPrintItem] = useState<InventoryHistory | null>(null);
  const [selectedPrintBatch, setSelectedPrintBatch] = useState<{ itemBarang: string; items: InventoryHistory[] } | null>(null);

  const choicesApd = [
    "Helm Safety Putih",
    "Helm Safety Kuning",
    "Helm Safety Biru",
    "Helm Safety Hijau",
    "Tali Helm",
    "Kacamata",
    "Earplug",
    "Gembok Merah",
    "Gembok Kuning",
    "Safety Shoes No.5 / 38",
    "Safety Shoes No.6 / 40",
    "Safety Shoes No.7 / 41",
    "Safety Shoes No.8 / 42",
    "Safety Shoes No.9 / 43",
    "Safety Shoes No.10 / 45",
    "Safety Shoes No.11 / 46"
  ];

  const [apdList, setApdList] = useState<string[]>(choicesApd);
  const [isAddingNewApd, setIsAddingNewApd] = useState(false);
  const [newApdName, setNewApdName] = useState('');
  const [isSubmittingNewApd, setIsSubmittingNewApd] = useState(false);

  useEffect(() => {
    fetchKaryawanData();
    fetchInventoryData();
    if (kategori === 'APD') {
      fetchApdList();
    }
  }, [kategori]);

  const fetchApdList = async () => {
    try {
      const res = await fetch("/api/master-apd");
      const d = await res.json();
      if (d.success && Array.isArray(d.list) && d.list.length > 0) {
        setApdList(d.list);
      }
    } catch (e) {
      console.error("Gagal memuat daftar APD", e);
    }
  };

  const handleAddNewApd = async () => {
    if (!newApdName.trim()) {
      alert("Masukkan nama APD baru!");
      return;
    }
    setIsSubmittingNewApd(true);
    try {
      const res = await fetch("/api/master-apd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: newApdName.trim() }),
      });
      const d = await res.json();
      if (d.success) {
        alert(d.message || "APD baru berhasil ditambahkan!");
        setNewApdName('');
        setIsAddingNewApd(false);
        await fetchApdList();
      } else {
        alert(d.error || "Gagal menambahkan APD baru");
      }
    } catch (e) {
      console.error("Error adding new APD name", e);
      alert("Terjadi kesalahan jaringan atau server saat menambah APD.");
    } finally {
      setIsSubmittingNewApd(false);
    }
  };

  const fetchKaryawanData = async () => {
    try {
      const res = await fetch("/api/karyawan");
      const d = await res.json();
      if (d.success) setKaryawanList(d.karyawan);
    } catch (e) {
      console.error("Gagal memuat karyawan", e);
    }
  };

  const fetchInventoryData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/inventory");
      const d = await res.json();
      if (d.history) {
        // Filter history by category
        const filteredHistory = d.history.filter(
          (h: any) => h.kategori.toLowerCase() === kategori.toLowerCase()
        );
        setHistoryList(filteredHistory);
        
        // Map stock
        const filteredStock = d.stock.filter((s: any) => {
          // Check if at least one entry of this item is in this category
          const match = d.history.find((h: any) => h.barang === s.barang);
          return match ? match.kategori.toLowerCase() === kategori.toLowerCase() : false;
        });
        setStockList(filteredStock);
      }
    } catch (e) {
      console.error("Gagal memuat inventory", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaBarang) {
      alert(`Mohon pilih/input nama ${kategori === 'APD' ? 'APD' : 'Barang'}!`);
      return;
    }
    if (!jumlah || Number(jumlah) <= 0) {
      alert("Masukkan jumlah yang valid (lebih dari 0)!");
      return;
    }
    if (!keterangan) {
      alert("Pilih/isi penerima karyawan atau keterangan lokasi!");
      return;
    }

    if (!window.confirm(`Simpan transaksi ${jenis} sebanyak ${jumlah} pcs untuk ${namaBarang}?`)) {
      return;
    }

    setIsSubmitLoading(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/order/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jenis,
          kategori,
          barang: namaBarang,
          jumlah: Number(jumlah),
          keterangan,
          userName: userRealName,
          tanggal,
          site: formSite
        })
      });
      const d = await res.json();
      if (d.success) {
        setFeedback({ type: 'success', msg: d.message });
        setJumlah('');
        setKeterangan('');
        fetchInventoryData();
      } else {
        setFeedback({ type: 'error', msg: d.message || "Gagal menyimpan data." });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: "Kesalahan jaringan: " + err.message });
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const parseTimestampToMs = (ts: string): number => {
    if (!ts) return 0;
    const str = ts.trim();
    if (str.includes('/')) {
      const [datePart, timePart] = str.split(' ');
      const parts = datePart.split('/');
      if (parts.length === 3) {
        let [dd, mm, yyyy] = parts;
        if (dd.length === 4) {
          const temp = dd;
          dd = yyyy;
          yyyy = temp;
        }
        const isoStr = `${yyyy.padStart(4, '20')}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}${timePart ? 'T' + timePart : 'T00:00:00'}`;
        const ms = new Date(isoStr).getTime();
        if (!isNaN(ms)) return ms;
      }
    }
    if (str.includes('-')) {
      const datePart = str.split(' ')[0].split('T')[0];
      const parts = datePart.split('-');
      if (parts.length === 3) {
        let [yyyy, mm, dd] = parts;
        if (yyyy.length < 4 && dd.length === 4) {
          const temp = yyyy;
          yyyy = dd;
          dd = temp;
        }
        const timePart = str.includes(' ') ? str.split(' ')[1] : (str.includes('T') ? str.split('T')[1] : '00:00:00');
        const isoStr = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T${timePart}`;
        const ms = new Date(isoStr).getTime();
        if (!isNaN(ms)) return ms;
      }
    }
    const fallback = new Date(str).getTime();
    return isNaN(fallback) ? 0 : fallback;
  };

  const parseToIsoDate = (ts: string) => {
    let isoDate = new Date().toISOString().split('T')[0];
    if (!ts) return isoDate;

    // Case 1: YYYY-MM-DD or DD-MM-YYYY
    if (ts.includes('-')) {
      const datePart = ts.split(' ')[0].split('T')[0];
      const p = datePart.split('-');
      if (p.length === 3) {
        if (p[0].length === 4) return `${p[0]}-${p[1].padStart(2, '0')}-${p[2].padStart(2, '0')}`;
        if (p[2].length === 4) return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
      }
    }

    // Case 2: DD/MM/YYYY or MM/DD/YYYY
    if (ts.includes('/')) {
      const datePart = ts.split(' ')[0];
      const p = datePart.split('/');
      if (p.length === 3) {
        if (p[2].length === 4) {
          return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
        }
      }
    }

    // Case 3: JS Date parse
    const parsed = new Date(ts);
    if (!isNaN(parsed.getTime())) {
      const yyyy = parsed.getFullYear();
      const mm = String(parsed.getMonth() + 1).padStart(2, '0');
      const dd = String(parsed.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }

    return isoDate;
  };

  const sortedHistoryList = [...historyList].sort((a, b) => {
    const msA = parseTimestampToMs(a.timestamp);
    const msB = parseTimestampToMs(b.timestamp);
    return historySortOrder === 'desc' ? msB - msA : msA - msB;
  });

  const sortedInspectDetail = [...inspectDetail].sort((a, b) => {
    const msA = parseTimestampToMs(a.timestamp);
    const msB = parseTimestampToMs(b.timestamp);
    return inspectSortOrder === 'desc' ? msB - msA : msA - msB;
  });

  const filteredHistoryList = sortedHistoryList.filter(item => {
    // If operator, force restriction to their activeSite
    if (userRole === 'operator' && activeSite && activeSite !== 'ALL') {
      const itemSite = item.site || 'ITU-Admo';
      if (itemSite.toLowerCase() !== activeSite.toLowerCase()) return false;
    } else if (siteFilter !== 'ALL') {
      // Otherwise respect UI filter if not ALL
      const itemSite = item.site || 'ITU-Admo';
      if (itemSite.toLowerCase() !== siteFilter.toLowerCase()) return false;
    }
    
    if (!historyStartDate && !historyEndDate) return true;
    const isoDate = parseToIsoDate(item.timestamp);
    if (historyStartDate && isoDate < historyStartDate) return false;
    if (historyEndDate && isoDate > historyEndDate) return false;
    return true;
  });

  const filteredInspectDetail = sortedInspectDetail.filter(item => {
    // If operator, force restriction to their activeSite
    if (userRole === 'operator' && activeSite && activeSite !== 'ALL') {
      const itemSite = item.site || 'ITU-Admo';
      if (itemSite.toLowerCase() !== activeSite.toLowerCase()) return false;
    }
    
    if (!historyStartDate && !historyEndDate) return true;
    const isoDate = parseToIsoDate(item.timestamp);
    if (historyStartDate && isoDate < historyStartDate) return false;
    if (historyEndDate && isoDate > historyEndDate) return false;
    return true;
  });

  const getInspectItemKey = (item: InventoryHistory) => {
    return `${item.timestamp}__${item.barang}__${item.keterangan}__${item.jumlah}__${item.oleh}`;
  };

  const isInspectItemSelected = (item: InventoryHistory) => {
    return !excludedInspectPrintKeys.includes(getInspectItemKey(item));
  };

  const selectedForPrintItems = filteredInspectDetail.filter(isInspectItemSelected);

  const toggleItemPrintSelection = (item: InventoryHistory) => {
    const key = getInspectItemKey(item);
    setExcludedInspectPrintKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleSelectAllPrint = () => {
    if (selectedForPrintItems.length === filteredInspectDetail.length && filteredInspectDetail.length > 0) {
      // Uncheck / exclude all in current filtered view
      const keysToExclude = filteredInspectDetail.map(getInspectItemKey);
      setExcludedInspectPrintKeys(prev => Array.from(new Set([...prev, ...keysToExclude])));
    } else {
      // Check / include all in current filtered view
      const keysToRemove = new Set(filteredInspectDetail.map(getInspectItemKey));
      setExcludedInspectPrintKeys(prev => prev.filter(k => !keysToRemove.has(k)));
    }
  };

  const handleInspectItem = (barangName: string) => {
    // Collect list of transactions representing "Barang Keluar" for this item
    const distributions = historyList.filter(
      h => h.barang === barangName && h.jenis === "Barang Keluar"
    );
    setInspectDetail(distributions);
    setSelectedInspectItem(barangName);
    setEditingModalItem(null);
    setExcludedInspectPrintKeys([]);
  };

  const handleStartEditModalDate = (item: InventoryHistory) => {
    setEditingModalItem(item);
    setEditDateValue(parseToIsoDate(item.timestamp));
  };

  const handleStartEditHistoryDate = (item: InventoryHistory) => {
    setEditingHistoryItem(item);
    setEditDateValue(parseToIsoDate(item.timestamp));
  };

  const handleSaveEditDate = async (item: InventoryHistory, isFromModal: boolean) => {
    if (!editDateValue) {
      alert("Mohon pilih tanggal yang valid!");
      return;
    }
    setIsUpdatingDate(true);
    try {
      const res = await fetch("/api/order/update-date", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalTimestamp: item.timestamp,
          barang: item.barang || selectedInspectItem,
          keterangan: item.keterangan,
          jumlah: item.jumlah,
          oleh: item.oleh,
          newDate: editDateValue
        })
      });
      const d = await res.json();
      if (d.success) {
        setEditingModalItem(null);
        setEditingHistoryItem(null);
        
        // Refresh inventory data
        const resInv = await fetch("/api/inventory");
        const freshData = await resInv.json();
        if (freshData.history) {
          const filteredHistory = freshData.history.filter(
            (h: any) => !kategori || h.kategori.toLowerCase() === kategori.toLowerCase() || kategori.toLowerCase().includes(h.kategori.toLowerCase())
          );
          setHistoryList(filteredHistory);
          
          if (selectedInspectItem) {
            const freshDist = freshData.history.filter(
              (h: any) => h.barang === selectedInspectItem && h.jenis === "Barang Keluar"
            );
            setInspectDetail(freshDist);
          }
        }
      } else {
        alert(d.message || "Gagal mengupdate tanggal.");
      }
    } catch (err: any) {
      console.error("Error updating transaction date:", err);
      alert("Terjadi kesalahan koneksi saat mengupdate tanggal.");
    } finally {
      setIsUpdatingDate(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={kategori === 'APD' ? 'Form Transaksi APD' : 'Form Transaksi Barang'}
        subtitle={
          kategori === 'APD'
            ? 'Pencatatan keluar masuk Alat Pelindung Diri Karyawan.'
            : 'Pencatatan keluar masuk Barang Umum, ATK, dan Peralatan Kerja.'
        }
        onBack={onBack}
        icon={
          kategori === 'APD' ? (
            <ShieldCheck className="h-6 w-6" />
          ) : (
            <Warehouse className="h-6 w-6" />
          )
        }
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

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form: Form Entry */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <h3 className="text-md font-bold text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-500" /> Tambah Log Stok Baru
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                Jenis Transaksi
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setJenis('Barang Masuk')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                    jenis === 'Barang Masuk'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Barang Masuk (Restock)
                </button>
                <button
                  type="button"
                  onClick={() => setJenis('Barang Keluar')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                    jenis === 'Barang Keluar'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Barang Keluar (Distribusi)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Nama {kategori === 'APD' ? 'APD' : 'Barang'} <span className="text-rose-500">*</span>
              </label>
              {kategori === 'APD' ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <select
                      value={namaBarang}
                      onChange={(e) => setNamaBarang(e.target.value)}
                      className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none transition"
                      required
                    >
                      <option value="" disabled>-- Pilih Jenis APD --</option>
                      {apdList.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setIsAddingNewApd(!isAddingNewApd)}
                      className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-semibold transition flex items-center gap-1 border border-indigo-100"
                      title="Tambah Nama APD Baru"
                    >
                      <span className="text-base font-bold">+</span> APD Baru
                    </button>
                  </div>
                  
                  {isAddingNewApd && (
                    <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2 animate-none">
                      <div className="text-xs font-semibold text-indigo-900">Tambah Nama APD Baru</div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newApdName}
                          onChange={(e) => setNewApdName(e.target.value)}
                          placeholder="Contoh: Safety Shoes No. 12 / Uk. 47"
                          className="flex-1 px-3 py-1.5 rounded-lg border border-indigo-200 bg-white text-xs focus:border-indigo-500 focus:outline-none transition"
                        />
                        <button
                          type="button"
                          onClick={handleAddNewApd}
                          disabled={isSubmittingNewApd}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center min-w-[60px]"
                        >
                          {isSubmittingNewApd ? 'Saving...' : 'Simpan'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingNewApd(false);
                            setNewApdName('');
                          }}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  value={namaBarang}
                  onChange={(e) => setNamaBarang(e.target.value)}
                  placeholder="Contoh: Kertas A4 / Obeng / Sabun"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none transition"
                  required
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Jumlah <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={jumlah}
                  onChange={(e) => setJumlah(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Contoh: 15"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none transition"
                  required
                  min="1"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium">pcs</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Calendar className="h-4 w-4 text-indigo-500" /> Tanggal Transaksi <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <UserCheck className="h-4 w-4 text-indigo-500" /> Penerima / Keterangan Lokasi <span className="text-rose-500">*</span>
              </label>
              {karyawanList.length > 0 ? (
                <div className="relative">
                  <input
                    type="text"
                    value={keterangan}
                    onChange={(e) => {
                      setKeterangan(e.target.value);
                      setIsKaryawanDropdownOpen(true);
                    }}
                    onFocus={() => setIsKaryawanDropdownOpen(true)}
                    onBlur={() => {
                      setTimeout(() => setIsKaryawanDropdownOpen(false), 200);
                    }}
                    placeholder="Ketik nama karyawan atau lokasi..."
                    className="w-full px-3.5 py-2 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none transition"
                    required
                  />
                  <div className="absolute right-3 top-2.5 flex items-center gap-1 text-slate-400">
                    <Search className="h-4 w-4" />
                  </div>

                  {isKaryawanDropdownOpen && (
                    <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100">
                      {(() => {
                        const generalLocations = [
                          "Gedung Generator",
                          "Workshop Utama",
                          "Pos Satpam Depan",
                          "Kantor Utama Indotruck"
                        ];
                        const filteredKaryawanOptions = [
                          ...karyawanList.map(k => ({ value: k, label: k, isEmployee: true })),
                          ...generalLocations.map(loc => ({ value: loc, label: `${loc} (Lokasi Umum)`, isEmployee: false }))
                        ].filter(item => 
                          item.value.toLowerCase().includes(keterangan.toLowerCase())
                        );

                        if (filteredKaryawanOptions.length > 0) {
                          return filteredKaryawanOptions.map((item, index) => (
                            <button
                              key={index}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setKeterangan(item.value);
                                setIsKaryawanDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm text-slate-700 font-medium transition flex items-center justify-between"
                            >
                              <span>{item.label}</span>
                              {item.isEmployee ? (
                                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-semibold">Karyawan</span>
                              ) : (
                                <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded font-semibold">Lokasi</span>
                              )}
                            </button>
                          ));
                        } else {
                          return (
                            <div className="px-4 py-2.5 text-xs text-slate-400 italic">
                              Tekan atau ketik untuk mengisi nilai kustom "{keterangan}"
                            </div>
                          );
                        }
                      })()}
                    </div>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Nama karyawan atau lokasi penempatan"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none transition"
                  required
                />
              )}
            </div>

            {/* Site / Lokasi Proyek Transaksi */}
            {userRole === 'admin' ? (
              <SiteFormField
                value={formSite}
                onChange={setFormSite}
                label="Lokasi / Site Transaksi"
              />
            ) : (
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-widest">
                  Lokasi / Site Transaksi
                </label>
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between text-xs font-bold text-indigo-900">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse" />
                    <span>{formSite} (Otomatis dari Akun Operator)</span>
                  </div>
                  <span className="text-[10px] bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full font-semibold">Terkunci</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitLoading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl transition shadow-sm text-sm cursor-pointer disabled:bg-slate-400"
            >
              {isSubmitLoading ? 'Menyimpan...' : `Simpan Data Transaksi`}
            </button>
          </form>
        </div>

        {/* Right Section: Real-time Stock Card & Recent Tables */}
        <div className="lg:col-span-7 space-y-6">
          {/* Real-time Stock */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Warehouse className="h-4 w-4 text-indigo-500" />
                Stok Real-time ({kategori})
              </h4>
              <button
                type="button"
                onClick={fetchInventoryData}
                disabled={isLoading}
                className="text-slate-400 hover:text-slate-600 transition flex items-center gap-1 text-xs cursor-pointer"
                title="Refresh Table"
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
            <p className="text-xs text-slate-400">
              💡 Klik nama item di bawah untuk melacak daftar nama karyawan penerima (distribusi keluar).
            </p>

            <div className="overflow-x-auto">
              {isLoading ? (
                <div className="text-center py-6 text-slate-400 text-xs">Memuat data inventory...</div>
              ) : stockList.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">Belum ada item terdaftar.</div>
              ) : (
                <table className="w-full text-xs text-left text-slate-600 border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                      <th className="py-2.5 px-3">Nama {kategori}</th>
                      <th className="py-2.5 px-3">Stok Tersedia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockList.map((item, index) => (
                      <tr
                        key={index}
                        onClick={() => handleInspectItem(item.barang)}
                        className="border-b border-slate-100 hover:bg-indigo-50 cursor-pointer transition"
                      >
                        <td className="py-2.5 px-3 font-semibold text-indigo-600">
                          🔍 {item.barang}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          {(() => {
                            const itemSite = item.site || 'ITU-Admo';
                            const shouldHide = userRole === 'operator' && activeSite && activeSite !== 'ALL' && itemSite !== activeSite;
                            return shouldHide ? '-' : `${item.total} pcs`;
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Recently 10 Transactions */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <ListOrdered className="h-4 w-4 text-emerald-500" />
                  Log Transaksi Terbaru
                </h4>
              </div>

              {/* Date Filter Bar */}
              <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-xl text-xs">
                <div className="flex items-center gap-1 pl-1">
                  <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                  <span className="text-[11px] font-bold text-slate-500">Mulai:</span>
                  <input
                    type="date"
                    value={historyStartDate}
                    onChange={(e) => setHistoryStartDate(e.target.value)}
                    className="bg-white border border-slate-200 text-xs text-slate-700 font-semibold rounded-lg px-2 py-0.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <span className="text-slate-400 text-xs font-bold">s/d</span>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-slate-500">Sampai:</span>
                  <input
                    type="date"
                    value={historyEndDate}
                    onChange={(e) => setHistoryEndDate(e.target.value)}
                    className="bg-white border border-slate-200 text-xs text-slate-700 font-semibold rounded-lg px-2 py-0.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                {(historyStartDate || historyEndDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setHistoryStartDate('');
                      setHistoryEndDate('');
                    }}
                    className="px-2 py-0.5 bg-slate-200 hover:bg-rose-100 text-slate-600 hover:text-rose-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    title="Reset Filter"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-600 border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                    <th className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => setHistorySortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                        className="flex items-center gap-1.5 hover:text-indigo-600 transition font-bold cursor-pointer"
                        title="Klik untuk mengubah urutan tanggal"
                      >
                        <span>Tanggal</span>
                        {historySortOrder === 'desc' ? (
                          <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-semibold">
                            Terbaru ↓
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold">
                            Terlama ↑
                          </span>
                        )}
                      </button>
                    </th>
                    <th className="py-2.5 px-3">Site</th>
                    <th className="py-2.5 px-3">Jenis</th>
                    <th className="py-2.5 px-3">Nama Item</th>
                    <th className="py-2.5 px-3">Qty</th>
                    <th className="py-2.5 px-3">Keterangan</th>
                    <th className="py-2.5 px-3 text-center">Formulir</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistoryList.slice(0, 15).map((h, i) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 text-slate-500 min-w-[150px]">
                        {editingHistoryItem === h ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="date"
                              value={editDateValue}
                              onChange={(e) => setEditDateValue(e.target.value)}
                              className="px-2 py-1 text-xs border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                            />
                            <button
                              onClick={() => handleSaveEditDate(h, false)}
                              disabled={isUpdatingDate}
                              className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition text-xs font-semibold flex items-center gap-1 shadow-sm disabled:opacity-50 cursor-pointer"
                              title="Simpan Tanggal"
                            >
                              {isUpdatingDate ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              onClick={() => setEditingHistoryItem(null)}
                              disabled={isUpdatingDate}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition text-xs cursor-pointer"
                              title="Batal"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 group">
                            <span>{formatTanggalIndonesia(h.timestamp)}</span>
                            <button
                              onClick={() => handleStartEditHistoryDate(h)}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition cursor-pointer"
                              title="Edit Tanggal Transaksi"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <SiteBadge site={h.site || 'ITU-Admo'} size="xs" />
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            h.jenis === 'Barang Masuk'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {h.jenis === 'Barang Masuk' ? 'MASUK' : 'KELUAR'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{h.barang}</td>
                      <td className="py-2.5 px-3 font-bold">{h.jumlah} pcs</td>
                      <td className="py-2.5 px-3 text-slate-500 truncate max-w-[150px]" title={h.keterangan}>
                        {h.keterangan}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {h.jenis === 'Barang Keluar' ? (
                          <button
                            onClick={() => setSelectedPrintItem(h)}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition cursor-pointer inline-flex items-center gap-1 text-[11px] font-semibold border border-indigo-200"
                            title="Cetak Formulir Tanda Terima APD"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            <span>Print</span>
                          </button>
                        ) : (
                          <span className="text-slate-300 text-[10px]">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {sortedHistoryList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-400">
                        Belum ada riwayat transaksi.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Inspeksi Modal */}
      {selectedInspectItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                👥 Daftar Penerima Distribusi
              </h3>
              <button
                onClick={() => {
                  setSelectedInspectItem(null);
                  setEditingModalItem(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="bg-indigo-50 p-3 rounded-xl text-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border border-indigo-100">
              <div>
                <span className="font-bold text-indigo-900">Nama Item:</span> <span className="font-semibold text-slate-800">{selectedInspectItem}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-full font-bold">
                  {selectedForPrintItems.length} dari {filteredInspectDetail.length} Dipilih untuk Cetak
                </span>
                {filteredInspectDetail.length > 0 && (
                  <button
                    onClick={() => {
                      if (selectedForPrintItems.length === 0) {
                        alert("Pilih minimal 1 transaksi / karyawan untuk dicetak!");
                        return;
                      }
                      setSelectedPrintBatch({ itemBarang: selectedInspectItem, items: selectedForPrintItems });
                    }}
                    disabled={selectedForPrintItems.length === 0}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                    title="Cetak Rekap Tanda Terima Semua Penerima Terpilih"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Cetak Rekap ({selectedForPrintItems.length})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Date filter & Selection Actions in modal */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 pl-1">
                  <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                  <span className="text-[11px] font-bold text-slate-500">Mulai:</span>
                  <input
                    type="date"
                    value={historyStartDate}
                    onChange={(e) => setHistoryStartDate(e.target.value)}
                    className="bg-white border border-slate-200 text-xs text-slate-700 font-semibold rounded-lg px-2 py-0.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <span className="text-slate-400 text-xs font-bold">s/d</span>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-slate-500">Sampai:</span>
                  <input
                    type="date"
                    value={historyEndDate}
                    onChange={(e) => setHistoryEndDate(e.target.value)}
                    className="bg-white border border-slate-200 text-xs text-slate-700 font-semibold rounded-lg px-2 py-0.5 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                {(historyStartDate || historyEndDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setHistoryStartDate('');
                      setHistoryEndDate('');
                    }}
                    className="px-2 py-0.5 bg-slate-200 hover:bg-rose-100 text-slate-600 hover:text-rose-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    title="Reset Filter Tanggal"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {filteredInspectDetail.length > 0 && (
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={toggleSelectAllPrint}
                    className="px-2 py-1 bg-white hover:bg-indigo-50 border border-slate-200 text-indigo-700 rounded-lg text-[11px] font-bold transition cursor-pointer"
                  >
                    {selectedForPrintItems.length === filteredInspectDetail.length ? "Hapus Centang Semua" : "Centang Semua"}
                  </button>
                </div>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-xs text-left text-slate-600 border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 font-semibold text-slate-400 bg-slate-50/50">
                    <th className="py-2 px-2 text-center w-10">
                      <input
                        type="checkbox"
                        checked={filteredInspectDetail.length > 0 && selectedForPrintItems.length === filteredInspectDetail.length}
                        onChange={toggleSelectAllPrint}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-3.5 w-3.5"
                        title="Centang / Hapus Semua untuk Cetak Rekap"
                      />
                    </th>
                    <th className="py-2 px-2">
                      <button
                        type="button"
                        onClick={() => setInspectSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                        className="flex items-center gap-1.5 hover:text-indigo-600 transition font-bold cursor-pointer"
                        title="Klik untuk mengubah urutan tanggal"
                      >
                        <span>Tgl Terima</span>
                        {inspectSortOrder === 'desc' ? (
                          <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-semibold">
                            Terbaru ↓
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold">
                            Terlama ↑
                          </span>
                        )}
                      </button>
                    </th>
                    <th className="py-2 px-2">Qty</th>
                    <th className="py-2 px-2">Nama Karyawan</th>
                    <th className="py-2 px-2">Input Oleh</th>
                    <th className="py-2 px-2 text-center">Cetak</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInspectDetail.map((item, id) => {
                    const isSelected = isInspectItemSelected(item);
                    return (
                      <tr 
                        key={id} 
                        className={`border-b border-slate-100 transition ${
                          isSelected ? 'hover:bg-slate-50/80 bg-white' : 'bg-slate-50/40 text-slate-400 hover:bg-slate-50/60'
                        }`}
                      >
                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleItemPrintSelection(item)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-3.5 w-3.5"
                            title={isSelected ? "Termasuk dalam Cetak Rekap (Klik untuk kecualikan)" : "Dikecualikan dari Cetak Rekap (Klik untuk sertakan)"}
                          />
                        </td>
                        <td className="py-2.5 px-2 min-w-[150px]">
                          {editingModalItem === item ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="date"
                                value={editDateValue}
                                onChange={(e) => setEditDateValue(e.target.value)}
                                className="px-2 py-1 text-xs border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                              />
                              <button
                                onClick={() => handleSaveEditDate(item, true)}
                                disabled={isUpdatingDate}
                                className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition text-xs font-semibold flex items-center gap-1 shadow-sm disabled:opacity-50 cursor-pointer"
                                title="Simpan Tanggal Baru"
                              >
                                {isUpdatingDate ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                              </button>
                              <button
                                onClick={() => setEditingModalItem(null)}
                                disabled={isUpdatingDate}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition text-xs cursor-pointer"
                                title="Batal"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 group">
                              <span className={`font-medium ${isSelected ? 'text-slate-700' : 'text-slate-400'}`}>
                                {formatTanggalIndonesia(item.timestamp)}
                              </span>
                              <button
                                onClick={() => handleStartEditModalDate(item)}
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition cursor-pointer"
                                title="Edit Tanggal Terima"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className={`py-2.5 px-2 font-bold ${isSelected ? 'text-slate-800' : 'text-slate-400'}`}>
                          {item.jumlah} pcs
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-1.5">
                            <span className={`font-semibold ${isSelected ? 'text-indigo-700' : 'text-slate-400'}`}>
                              {item.keterangan}
                            </span>
                            {!isSelected && (
                              <span className="text-[9px] bg-slate-200/80 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                                Dilewati Cetak
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-slate-400">{item.oleh}</td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            onClick={() => setSelectedPrintItem(item)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer shadow-sm"
                            title="Cetak Formulir Tanda Terima APD untuk Karyawan Ini"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            <span>Print</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredInspectDetail.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-400">
                        Belum ada pendistribusian masuk ke karyawan pada rentang tanggal ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="text-right">
              <button
                onClick={() => {
                  setSelectedInspectItem(null);
                  setEditingModalItem(null);
                }}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Print Tanda Terima APD / Rekap PDF */}
      {(selectedPrintItem || selectedPrintBatch) && (
        <>
          {/* Global Print Styles for Portal */}
          <style>{`
            @media print {
              @page {
                size: A4 portrait;
                margin: 12mm;
              }
              body > *:not(#print-mount) {
                display: none !important;
              }
              #print-mount {
                display: block !important;
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #000000 !important;
              }
            }
            @media screen {
              #print-mount {
                display: none !important;
              }
            }
          `}</style>

          {/* Screen Modal Preview */}
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-sm flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full shadow-2xl overflow-hidden my-auto">
              
              {/* Control Bar */}
              <div className="bg-slate-900 text-white px-5 py-3.5 flex justify-between items-center border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-400" />
                  <span className="font-bold text-sm">
                    Pratinjau Formulir Tanda Terima {selectedPrintItem ? 'APD' : 'Rekap'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition cursor-pointer"
                  >
                    <Printer className="h-4 w-4" />
                    Cetak / Simpan PDF
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPrintItem(null);
                      setSelectedPrintBatch(null);
                    }}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
                    title="Tutup"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Printable Form Content (Screen Preview) */}
              <div className="p-8 space-y-6 text-slate-800 bg-white">
                
                {/* Header / Kop Surat */}
                <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <img
                      src={companyLogo}
                      alt="PT INDOTRUCK UTAMA"
                      className="h-10 w-auto object-contain max-w-[150px]"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h2 className="font-black text-slate-900 text-base tracking-wide uppercase">
                        DEPARTEMEN HSE
                      </h2>
                      <p className="text-xs text-slate-600 font-bold uppercase">
                        SISTEM MANAJEMEN DISTRIBUSI ALAT PELINDUNG DIRI
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Dokumen Verifikasi Penyerahan & Serah Terima APD Kerja
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-block bg-slate-100 border border-slate-300 rounded-lg px-3 py-1.5 text-right">
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">No. Registrasi</p>
                      <p className="text-xs font-mono font-bold text-slate-900">
                        {selectedPrintItem 
                          ? `TT-APD/${new Date(parseTimestampToMs(selectedPrintItem.timestamp)).getFullYear()}/${(new Date(parseTimestampToMs(selectedPrintItem.timestamp)).getMonth() + 1).toString().padStart(2, '0')}/${parseTimestampToMs(selectedPrintItem.timestamp).toString().slice(-4)}`
                          : `REKAP-APD/${new Date().getFullYear()}/${(new Date().getMonth() + 1).toString().padStart(2, '0')}/${Date.now().toString().slice(-4)}`
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Title Header */}
                <div className="text-center py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <h1 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                    {selectedPrintItem ? 'FORMULIR TANDA TERIMA APD KARYAWAN' : `REKAP PENYERAHAN APD: ${selectedPrintBatch?.itemBarang}`}
                  </h1>
                  <p className="text-[10px] text-slate-500">
                    Bukti Otentik Serah Terima Peralatan Keselamatan Kerja
                  </p>
                </div>

                {/* Individual Recipient Info */}
                {selectedPrintItem && (
                  <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                    <div className="space-y-1.5">
                      <div className="flex">
                        <span className="w-32 text-slate-500 font-medium">Nama Penerima</span>
                        <span className="font-bold text-indigo-950">: {selectedPrintItem.keterangan || '-'}</span>
                      </div>
                      <div className="flex">
                        <span className="w-32 text-slate-500 font-medium">Kategori / Dept</span>
                        <span className="font-semibold text-slate-800">: {selectedPrintItem.kategori || kategori || 'APD'}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex">
                        <span className="w-32 text-slate-500 font-medium">Tanggal Penyerahan</span>
                        <span className="font-bold text-slate-900">: {formatTanggalIndonesia(selectedPrintItem.timestamp)}</span>
                      </div>
                      <div className="flex">
                        <span className="w-32 text-slate-500 font-medium">Diserahkan Oleh</span>
                        <span className="font-semibold text-slate-800">: {selectedPrintItem.oleh || userRealName || '-'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Items Table */}
                <div>
                  <h3 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                    📋 Rincian APD Yang Diserahkan
                  </h3>
                  <table className="w-full text-xs text-left border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                        <th className="py-2 px-3 border-r border-slate-300 text-center w-10">No</th>
                        {selectedPrintBatch && <th className="py-2 px-3 border-r border-slate-300">Nama Penerima</th>}
                        <th className="py-2 px-3 border-r border-slate-300">Nama APD / Barang</th>
                        <th className="py-2 px-3 border-r border-slate-300 text-center w-20">Jumlah</th>
                        {selectedPrintBatch && <th className="py-2 px-3">Tanggal Terima</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPrintItem ? (
                        <tr className="border-b border-slate-300">
                          <td className="py-2.5 px-3 border-r border-slate-300 text-center font-medium">1</td>
                          <td className="py-2.5 px-3 border-r border-slate-300 font-bold text-slate-900">{selectedPrintItem.barang}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-indigo-900">{selectedPrintItem.jumlah} pcs</td>
                        </tr>
                      ) : (
                        selectedPrintBatch?.items.map((it, idx) => (
                          <tr key={idx} className="border-b border-slate-300">
                            <td className="py-2 px-3 border-r border-slate-300 text-center font-medium">{idx + 1}</td>
                            <td className="py-2 px-3 border-r border-slate-300 font-bold text-slate-900">{it.keterangan || '-'}</td>
                            <td className="py-2 px-3 border-r border-slate-300 font-semibold">{it.barang}</td>
                            <td className="py-2 px-3 border-r border-slate-300 text-center font-bold">{it.jumlah} pcs</td>
                            <td className="py-2 px-3 text-slate-700">{formatTanggalIndonesia(it.timestamp)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer text */}
                <div className="pt-3 text-center text-[10px] text-slate-400 border-t border-slate-200">
                  Dokumen ini dicetak otomatis dari Sistem HSE - PT. ITU pada {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>

              </div>
            </div>
          </div>

          {/* Portal rendered directly under <body> for actual Printing */}
          {createPortal(
            <div id="print-mount" className="p-8 space-y-6 text-black bg-white">
              {/* Header / Kop Surat */}
              <div className="border-b-2 border-black pb-4 flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <img
                    src={companyLogo}
                    alt="PT INDOTRUCK UTAMA"
                    className="h-10 w-auto object-contain max-w-[150px]"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h2 className="font-black text-black text-base tracking-wide uppercase">
                      DEPARTEMEN HSE
                    </h2>
                    <p className="text-xs text-slate-700 font-bold uppercase">
                      SISTEM MANAJEMEN DISTRIBUSI ALAT PELINDUNG DIRI
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Dokumen Verifikasi Penyerahan & Serah Terima APD Kerja
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="inline-block bg-slate-50 border border-black rounded-lg px-3 py-1.5 text-right">
                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">No. Registrasi</p>
                    <p className="text-xs font-mono font-bold text-black">
                      {selectedPrintItem 
                        ? `TT-APD/${new Date(parseTimestampToMs(selectedPrintItem.timestamp)).getFullYear()}/${(new Date(parseTimestampToMs(selectedPrintItem.timestamp)).getMonth() + 1).toString().padStart(2, '0')}/${parseTimestampToMs(selectedPrintItem.timestamp).toString().slice(-4)}`
                        : `REKAP-APD/${new Date().getFullYear()}/${(new Date().getMonth() + 1).toString().padStart(2, '0')}/${Date.now().toString().slice(-4)}`
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Title Header */}
              <div className="text-center py-2.5 bg-slate-50 border border-black rounded-xl">
                <h1 className="text-sm font-black text-black uppercase tracking-widest">
                  {selectedPrintItem ? 'FORMULIR TANDA TERIMA APD KARYAWAN' : `REKAP PENYERAHAN APD: ${selectedPrintBatch?.itemBarang}`}
                </h1>
                <p className="text-[10px] text-slate-600">
                  Bukti Otentik Serah Terima Peralatan Keselamatan Kerja
                </p>
              </div>

              {/* Individual Recipient Info */}
              {selectedPrintItem && (
                <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-black">
                  <div className="space-y-1.5">
                    <div className="flex">
                      <span className="w-32 text-slate-600 font-medium">Nama Penerima</span>
                      <span className="font-bold text-black">: {selectedPrintItem.keterangan || '-'}</span>
                    </div>
                    <div className="flex">
                      <span className="w-32 text-slate-600 font-medium">Kategori / Dept</span>
                      <span className="font-semibold text-black">: {selectedPrintItem.kategori || kategori || 'APD'}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex">
                      <span className="w-32 text-slate-600 font-medium">Tanggal Penyerahan</span>
                      <span className="font-bold text-black">: {formatTanggalIndonesia(selectedPrintItem.timestamp)}</span>
                    </div>
                    <div className="flex">
                      <span className="w-32 text-slate-600 font-medium">Diserahkan Oleh</span>
                      <span className="font-semibold text-black">: {selectedPrintItem.oleh || userRealName || '-'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Items Table */}
              <div>
                <h3 className="text-xs font-bold text-black mb-2 flex items-center gap-1.5">
                  📋 Rincian APD Yang Diserahkan
                </h3>
                <table className="w-full text-xs text-left border-collapse border border-black">
                  <thead>
                    <tr className="bg-slate-100 text-black font-bold border-b border-black">
                      <th className="py-2 px-3 border-r border-black text-center w-10">No</th>
                      {selectedPrintBatch && <th className="py-2 px-3 border-r border-black">Nama Penerima</th>}
                      <th className="py-2 px-3 border-r border-black">Nama APD / Barang</th>
                      <th className="py-2 px-3 border-r border-black text-center w-20">Jumlah</th>
                      {selectedPrintBatch && <th className="py-2 px-3">Tanggal Terima</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPrintItem ? (
                      <tr className="border-b border-black">
                        <td className="py-2.5 px-3 border-r border-black text-center font-medium">1</td>
                        <td className="py-2.5 px-3 border-r border-black font-bold text-black">{selectedPrintItem.barang}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-black">{selectedPrintItem.jumlah} pcs</td>
                      </tr>
                    ) : (
                      selectedPrintBatch?.items.map((it, idx) => (
                        <tr key={idx} className="border-b border-black">
                          <td className="py-2 px-3 border-r border-black text-center font-medium">{idx + 1}</td>
                          <td className="py-2 px-3 border-r border-black font-bold text-black">{it.keterangan || '-'}</td>
                          <td className="py-2 px-3 border-r border-black font-semibold">{it.barang}</td>
                          <td className="py-2 px-3 border-r border-black text-center font-bold">{it.jumlah} pcs</td>
                          <td className="py-2 px-3 text-black">{formatTanggalIndonesia(it.timestamp)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer text */}
              <div className="pt-3 text-center text-[10px] text-slate-500 border-t border-black">
                Dokumen ini dicetak otomatis dari Sistem HSE - PT. ITU pada {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  );
}
