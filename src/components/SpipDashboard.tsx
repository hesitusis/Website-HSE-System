import React, { useState, useEffect, useMemo } from "react";
import { 
  FileSpreadsheet, ExternalLink, Activity, ArrowLeft, Plus, Edit2, Trash2, 
  Search, Filter, Download, FileText, CheckCircle, AlertTriangle, Eye, 
  Upload, Calendar, Clock, Sparkles, X, User, MapPin, ChevronRight, 
  CheckSquare, ListTodo, SlidersHorizontal, Image, ChevronDown, Check, Info, FileUp
} from "lucide-react";

interface SpipDashboardProps {
  userRealName: string;
  userRole: string;
  onBack: () => void;
}

export default function SpipDashboard({ userRealName, userRole, onBack }: SpipDashboardProps) {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [sheetCache, setSheetCache] = useState<Record<string, any[]>>({});
  const [loadingSheets, setLoadingSheets] = useState<Record<string, boolean>>({});
  const [isDashboardLoading, setIsDashboardLoading] = useState<boolean>(true);

  // Search and filters for each sheet
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("Semua");
  const [categoryFilter, setCategoryFilter] = useState<string>("Semua");
  const [sortField, setSortField] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Form Modals
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [currentEditItem, setCurrentEditItem] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState<any | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Form Fields State (Generic JSON)
  const [formData, setFormData] = useState<Record<string, string>>({});

  // Image zoom preview modal
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Calendar current month index
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  // Active spreadsheet ID
  const activeSpreadsheetId = "1xCY6lXcwWpsZy_Wm2qNrwtDB0iw7Wp0RvB4H_kuG_TA";

  // Load a single sheet
  const loadSheet = async (sheetName: string, force = false): Promise<any[]> => {
    if (sheetCache[sheetName] && !force) return sheetCache[sheetName];
    setLoadingSheets(prev => ({ ...prev, [sheetName]: true }));
    try {
      const res = await fetch(`/api/spip/sheets/${encodeURIComponent(sheetName)}`);
      const json = await res.json();
      if (json.success) {
        setSheetCache(prev => ({ ...prev, [sheetName]: json.data }));
        return json.data;
      }
    } catch (err) {
      console.error(`Gagal memuat data sheet ${sheetName}:`, err);
    } finally {
      setLoadingSheets(prev => ({ ...prev, [sheetName]: false }));
    }
    return [];
  };

  // Load all dashboard data
  const loadDashboardData = async () => {
    setIsDashboardLoading(true);
    try {
      await Promise.all([
        loadSheet("Data SPIP"),
        loadSheet("Data Unit HD"),
        loadSheet("kalibrasi"),
        loadSheet("Isuue KO"),
        loadSheet("Daftar Masa SPIP"),
        loadSheet("resume Servis"),
        loadSheet("data sarana"),
        loadSheet("foto stiker HD"),
        loadSheet("plan 26"),
        loadSheet("list"),
        loadSheet("list bang"),
        loadSheet("Data SPIP update")
      ]);
    } catch (err) {
      console.error("Gagal memuat data dashboard:", err);
    } finally {
      setIsDashboardLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // When changing tabs, clear filters and search
  useEffect(() => {
    setSearchTerm("");
    setStatusFilter("Semua");
    setCategoryFilter("Semua");
    setSortField("");
    setSortDirection("asc");
  }, [activeTab]);

  // Master Lists / Config definitions
  const sheetsList = [
    { id: "dashboard", label: "Dashboard Utama", icon: Activity, cat: "Overview" },
    { id: "Data SPIP", label: "Data SPIP", icon: FileText, cat: "Master Data" },
    { id: "data sarana", label: "Data Sarana", icon: SlidersHorizontal, cat: "Master Data" },
    { id: "Data Unit HD", label: "Data Unit Heavy Duty", icon: CheckSquare, cat: "Master Data" },
    { id: "resume Servis", label: "Resume Servis (Timeline)", icon: Clock, cat: "Riwayat" },
    { id: "kalibrasi", label: "Sertifikasi Kalibrasi", icon: Sparkles, cat: "Master Data" },
    { id: "Daftar Masa SPIP", label: "Monitoring Masa Berlaku", icon: Calendar, cat: "Monitoring" },
    { id: "Isuue KO", label: "Issue Keselamatan (KO)", icon: AlertTriangle, cat: "Ticketing" },
    { id: "foto stiker HD", label: "Gallery Stiker HD", icon: Image, cat: "Gallery" },
    { id: "plan 26", label: "Planning Kerja 2026", icon: Calendar, cat: "Calendar" },
    { id: "list", label: "Master Referensi", icon: ListTodo, cat: "Konfigurasi" },
    { id: "list bang", label: "Checklist Bangunan", icon: CheckCircle, cat: "Konfigurasi" },
    { id: "Data SPIP update", label: "Update History", icon: Clock, cat: "Audit Log" },
  ];

  // Helper date parsing
  const isDateExpired = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const exp = new Date(dateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    return exp < today;
  };

  const getSisaHari = (dateStr: string): number => {
    if (!dateStr) return 0;
    const exp = new Date(dateStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diffTime = exp.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Safe fetch sheets helper
  const getSheetData = (name: string): any[] => sheetCache[name] || [];

  // Metrics calculation
  const metrics = useMemo(() => {
    const dataSpip = getSheetData("Data SPIP");
    const dataUnitHd = getSheetData("Data Unit HD");
    const kalibrasi = getSheetData("kalibrasi");
    const issueKo = getSheetData("Isuue KO");
    const daftarMasaSpip = getSheetData("Daftar Masa SPIP");

    const totalSpip = dataSpip.length;
    const totalUnitHd = dataUnitHd.length;
    const totalKalibrasi = kalibrasi.length;
    const totalIssueKo = issueKo.length;

    let expiredCount = 0;
    let akanExpiredCount = 0;
    let komisioningTahunIni = 0;
    let unitAmanCount = 0;

    const currentYear = new Date().getFullYear();

    daftarMasaSpip.forEach(item => {
      const sisa = getSisaHari(item.expired);
      const isExpired = isDateExpired(item.expired);
      
      if (isExpired) {
        expiredCount++;
      } else if (sisa < 30) {
        akanExpiredCount++;
      } else if (sisa > 90) {
        unitAmanCount++;
      }

      // Komisioning tahun ini
      if (item.komisioning) {
        const commDate = new Date(item.komisioning);
        if (commDate.getFullYear() === currentYear) {
          komisioningTahunIni++;
        }
      }
    });

    return {
      totalSpip,
      totalUnitHd,
      totalKalibrasi,
      totalIssueKo,
      expiredCount,
      akanExpiredCount,
      komisioningTahunIni,
      unitAmanCount
    };
  }, [sheetCache]);

  // Chart data: Commissioning per month (Daftar Masa SPIP based on komisioning date)
  const chartMonthlyData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    const counts = Array(12).fill(0);

    const data = getSheetData("Daftar Masa SPIP");
    data.forEach(item => {
      if (item.komisioning) {
        const d = new Date(item.komisioning);
        const m = d.getMonth();
        if (m >= 0 && m < 12) {
          counts[m]++;
        }
      }
    });

    return months.map((m, idx) => ({ month: m, count: counts[idx] }));
  }, [sheetCache]);

  // Pie chart data: Status Masa Berlaku (Daftar Masa SPIP)
  const pieChartData = useMemo(() => {
    let hijau = 0; // > 90 hari
    let kuning = 0; // 30-90 hari
    let merah = 0; // < 30 hari

    const data = getSheetData("Daftar Masa SPIP");
    data.forEach(item => {
      const sisa = getSisaHari(item.expired);
      if (sisa > 90) {
        hijau++;
      } else if (sisa >= 30 && sisa <= 90) {
        kuning++;
      } else {
        merah++;
      }
    });

    const total = hijau + kuning + merah || 1;
    return {
      hijau: { count: hijau, pct: Math.round((hijau / total) * 100) },
      kuning: { count: kuning, pct: Math.round((kuning / total) * 100) },
      merah: { count: merah, pct: Math.round((merah / total) * 100) },
      total: hijau + kuning + merah
    };
  }, [sheetCache]);

  // Combined timeline of updates
  const recentActivities = useMemo(() => {
    const list: any[] = [];
    
    // 1. Resume Servis
    const services = getSheetData("resume Servis");
    services.forEach(item => {
      list.push({
        date: item.tanggal || "2026-01-01",
        title: `Service Unit ${item.noLambung}`,
        desc: `${item.jenisServis} - Mekanik: ${item.mekanik || "Unknown"}`,
        cat: "Service",
        icon: "🛠️",
        color: "indigo"
      });
    });

    // 2. Kalibrasi
    const calibrations = getSheetData("kalibrasi");
    calibrations.forEach(item => {
      list.push({
        date: item.tanggalKalibrasi || "2026-01-01",
        title: `Kalibrasi Alat: ${item.namaAlat}`,
        desc: `No Sertifikat: ${item.noSertifikat || "-"}`,
        cat: "Calibration",
        icon: "📐",
        color: "purple"
      });
    });

    // 3. Issue KO
    const issues = getSheetData("Isuue KO");
    issues.forEach(item => {
      list.push({
        date: item.tanggal || "2026-01-01",
        title: `Isu Keselamatan ${item.noIssue}`,
        desc: `Unit ${item.unit} (${item.status}) - ${item.keterangan || ""}`,
        cat: "Issue",
        icon: "⚠️",
        color: "rose"
      });
    });

    // 4. Data SPIP update
    const updates = getSheetData("Data SPIP update");
    updates.forEach(item => {
      list.push({
        date: item.tanggal || "2026-01-01",
        title: `Sistem Update: ${item.tipe}`,
        desc: `Oleh ${item.user} - ${item.perubahan}`,
        cat: "System",
        icon: "💾",
        color: "blue"
      });
    });

    // Sort descending by date
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
  }, [sheetCache]);

  // Data SPIP items akan expired (Top 10)
  const itemsAkanExpired = useMemo(() => {
    const data = getSheetData("Daftar Masa SPIP");
    return data
      .map(item => ({
        ...item,
        sisa: getSisaHari(item.expired),
        isExpired: isDateExpired(item.expired)
      }))
      .sort((a, b) => a.sisa - b.sisa)
      .slice(0, 10);
  }, [sheetCache]);

  // Issue KO terbaru list
  const recentIssues = useMemo(() => {
    const data = getSheetData("Isuue KO");
    return [...data]
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
      .slice(0, 10);
  }, [sheetCache]);

  // Save / Sync function to backend
  const saveSheetData = async (sheetName: string, updatedList: any[]) => {
    try {
      const res = await fetch(`/api/spip/sheets/${encodeURIComponent(sheetName)}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedList)
      });
      const json = await res.json();
      if (json.success) {
        setSheetCache(prev => ({ ...prev, [sheetName]: updatedList }));
        return true;
      }
    } catch (err) {
      console.error(`Gagal mensinkronisasikan sheet ${sheetName}:`, err);
    }
    return false;
  };

  // Audit logger request
  const logAudit = async (type: string, change: string) => {
    try {
      await fetch("/api/spip/audit/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: userRealName, type, change })
      });
      // Force reload audit log sheet
      loadSheet("Data SPIP update", true);
    } catch (err) {
      console.error("Gagal mengirim log audit:", err);
    }
  };

  // Base64 file uploader
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      const fileName = `${Date.now()}_${file.name}`;
      try {
        const res = await fetch("/api/spip/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName, fileData: base64Data })
        });
        const json = await res.json();
        if (json.success) {
          setFormData(prev => ({ ...prev, [fieldName]: json.url }));
        }
      } catch (err) {
        console.error("Gagal mengunggah file:", err);
        alert("Gagal mengunggah file ke server. Pastikan ukuran file tidak terlalu besar.");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Delete Action handler
  const handleDeleteItem = async (sheetName: string, id: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus data ini secara permanen dari database harian?")) return;

    const currentList = getSheetData(sheetName);
    const deletedItem = currentList.find(i => i.id === id);
    const updatedList = currentList.filter(i => i.id !== id);

    const success = await saveSheetData(sheetName, updatedList);
    if (success) {
      const logMsg = deletedItem ? `Menghapus item dengan ID ${id} (${deletedItem.nama || deletedItem.noLambung || deletedItem.namaAlat || "Tanpa Nama"})` : `Menghapus item ID ${id}`;
      logAudit(`Hapus ${sheetName}`, logMsg);
    }
  };

  // Open Form modal for Add or Edit
  const openForm = (sheetName: string, item: any | null = null) => {
    setCurrentEditItem(item);
    
    // Set default headers/keys based on sheetName
    const emptyForm: Record<string, string> = {};
    const headers = {
      "Data SPIP": ["golongan", "item", "subItem", "jumlah", "pemeriksaan", "perawatan", "komisioning", "keterangan", "dokumenUrl", "fotoUrl"],
      "data sarana": ["noLambung", "jenisSarana", "merek", "model", "tahun", "status", "lokasi"],
      "Data Unit HD": ["noLambung", "jenis", "status", "lokasi", "komisioning", "expired", "fotoUrl"],
      "resume Servis": ["tanggal", "noLambung", "jenisServis", "deskripsi", "mekanik", "status"],
      "kalibrasi": ["namaAlat", "noSertifikat", "tanggalKalibrasi", "expired", "status", "sertifikatUrl", "reminder"],
      "Daftar Masa SPIP": ["nama", "noLambung", "komisioning", "expired", "status", "pic", "planning"],
      "Isuue KO": ["tanggal", "noIssue", "unit", "pic", "status", "dueDate", "keterangan", "fotoUrl", "komentar", "riwayat"],
      "foto stiker HD": ["noLambung", "fotoUrl", "deskripsi", "tanggalAmbil"],
      "plan 26": ["tanggal", "kegiatan", "unit", "pic", "status"]
    }[sheetName] || [];

    headers.forEach(h => {
      emptyForm[h] = item ? String(item[h] || "") : "";
    });

    setFormData(emptyForm);
    setIsFormOpen(true);
  };

  // Save Form Handler
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const sheetName = activeTab;
    const currentList = [...getSheetData(sheetName)];

    if (currentEditItem) {
      // Edit mode
      const idx = currentList.findIndex(i => i.id === currentEditItem.id);
      if (idx !== -1) {
        const oldVal = currentList[idx];
        const updatedItem = { ...oldVal, ...formData };
        currentList[idx] = updatedItem;
        
        const success = await saveSheetData(sheetName, currentList);
        if (success) {
          logAudit(`Edit ${sheetName}`, `Mengubah data ID ${currentEditItem.id} (${updatedItem.nama || updatedItem.noLambung || "Data Utama"})`);
        }
      }
    } else {
      // Add mode
      const newItem = {
        id: String(Date.now()),
        ...formData
      };
      // Auto assign sequential number if field 'no' exists
      if (formData.no === undefined && formData.no !== null && newItem.hasOwnProperty('no')) {
        newItem.no = String(currentList.length + 1);
      }
      currentList.push(newItem);

      const success = await saveSheetData(sheetName, currentList);
      if (success) {
        logAudit(`Tambah ${sheetName}`, `Menambahkan data baru dengan ID ${newItem.id} (${newItem.nama || newItem.noLambung || "Data Utama"})`);
      }
    }

    setIsFormOpen(false);
    setCurrentEditItem(null);
  };

  // Export CSV handler (opens natively in Excel)
  const handleExportCSV = (sheetName: string) => {
    const list = getSheetData(sheetName);
    if (list.length === 0) return;

    const headers = Object.keys(list[0]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...list.map(row => headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `HSE_ITU_${sheetName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Simple sorting logic
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Master view filters and parsing
  const parsedData = useMemo(() => {
    if (activeTab === "dashboard") return [];
    const list = getSheetData(activeTab);

    return list.filter(item => {
      // General full text search
      const fieldsStr = Object.values(item).join(" ").toLowerCase();
      const matchesSearch = fieldsStr.includes(searchTerm.toLowerCase());

      // Dropdown filters depending on sheet type
      let matchesStatus = true;
      if (statusFilter !== "Semua") {
        matchesStatus = String(item.status || '').toLowerCase() === statusFilter.toLowerCase() ||
                        String(item.status || '').toLowerCase() === statusFilter.toLowerCase();
      }

      let matchesCategory = true;
      if (categoryFilter !== "Semua") {
        const catVal = item.golongan || item.kategori;
        if (catVal) {
          matchesCategory = String(catVal).toLowerCase() === categoryFilter.toLowerCase();
        } else {
          matchesCategory = false;
        }
      }

      return matchesSearch && matchesStatus && matchesCategory;
    }).sort((a, b) => {
      if (!sortField) return 0;
      const valA = String(a[sortField] || '').toLowerCase();
      const valB = String(b[sortField] || '').toLowerCase();
      
      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [activeTab, sheetCache, searchTerm, statusFilter, categoryFilter, sortField, sortDirection]);

  // Dropdown list categories based on active sheet
  const dropdownCategories = useMemo(() => {
    const list = getSheetData(activeTab);
    const cats = new Set<string>();
    list.forEach(i => {
      const catVal = i.golongan || i.kategori;
      if (catVal) cats.add(String(catVal));
    });
    return Array.from(cats);
  }, [activeTab, sheetCache]);

  return (
    <div className="w-full flex flex-col xl:flex-row gap-6">
      {/* Sidebar Navigation */}
      <aside className="w-full xl:w-72 shrink-0 bg-slate-50 border border-slate-200 p-4 rounded-2xl">
        <div className="mb-4 px-2 hidden xl:block">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sistem Navigasi SPIP</p>
        </div>
        
        {/* On Mobile: Horizontal Scrollable List */}
        <div className="xl:hidden overflow-x-auto pb-2 scrollbar-none">
          <nav className="flex flex-row gap-1.5 whitespace-nowrap">
            {sheetsList.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (item.id !== "dashboard") {
                      loadSheet(item.id);
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition cursor-pointer shrink-0 ${
                    isActive 
                      ? "bg-blue-600 text-white shadow-xs" 
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* On Desktop: Beautiful Category Grouped Stack */}
        <nav className="hidden xl:flex flex-col gap-4">
          {[
            "Overview",
            "Master Data",
            "Monitoring",
            "Riwayat",
            "Ticketing",
            "Gallery",
            "Calendar",
            "Konfigurasi",
            "Audit Log"
          ].map(cat => {
            const items = sheetsList.filter(s => s.cat === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} className="space-y-1">
                <div className="px-2.5 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  {cat}
                </div>
                <div className="space-y-0.5">
                  {items.map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          if (item.id !== "dashboard") {
                            loadSheet(item.id);
                          }
                        }}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition w-full text-left cursor-pointer ${
                          isActive 
                            ? "bg-blue-600 text-white shadow-xs" 
                            : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Main Panel Content Area */}
      <div className="flex-1 min-w-0">
        {/* Active Tab: Dashboard Main Overview */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {isDashboardLoading ? (
              // Loading Skeleton
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-slate-50 h-28 rounded-2xl animate-pulse border border-slate-200"></div>
                  ))}
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-slate-50 h-24 rounded-2xl animate-pulse border border-slate-200"></div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Baris Pertama: 4 KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total SPIP */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Total SPIP</p>
                      <h4 className="text-2xl font-black text-slate-800 mt-1">{metrics.totalSpip}</h4>
                      <p className="text-[10px] text-slate-500 font-normal mt-0.5">Sistem Pengendalian</p>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 text-xl shadow-xs">
                      🏭
                    </div>
                  </div>

                  {/* Total Unit HD */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Total Unit HD</p>
                      <h4 className="text-2xl font-black text-slate-800 mt-1">{metrics.totalUnitHd}</h4>
                      <p className="text-[10px] text-slate-500 font-normal mt-0.5">Dump Truck Utama</p>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 text-xl shadow-xs">
                      🚜
                    </div>
                  </div>

                  {/* Total Peralatan Kalibrasi */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Alat Kalibrasi</p>
                      <h4 className="text-2xl font-black text-slate-800 mt-1">{metrics.totalKalibrasi}</h4>
                      <p className="text-[10px] text-slate-500 font-normal mt-0.5">Instalasi & Safety</p>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 text-xl shadow-xs">
                      🛠️
                    </div>
                  </div>

                  {/* Total Issue KO */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Total Isu KO</p>
                      <h4 className="text-2xl font-black text-slate-800 mt-1">{metrics.totalIssueKo}</h4>
                      <p className="text-[10px] text-slate-500 font-normal mt-0.5">Pending Tickets</p>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 text-xl shadow-xs animate-pulse">
                      ⚠️
                    </div>
                  </div>
                </div>

                {/* Baris Kedua: 4 KPI Cards Masa Berlaku */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Sudah Expired */}
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 shadow-xs hover:shadow flex items-center gap-4">
                    <div className="h-11 w-11 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold shrink-0 shadow-sm">
                      !
                    </div>
                    <div>
                      <p className="text-[11px] font-extrabold text-rose-800/80 uppercase tracking-wider">Sudah Expired</p>
                      <h4 className="text-xl font-extrabold text-rose-900 mt-0.5">{metrics.expiredCount} Item</h4>
                      <p className="text-[10px] text-rose-700 font-medium mt-0.5 leading-none">Harus segera diperbarui</p>
                    </div>
                  </div>

                  {/* Akan Expired (<30 Hari) */}
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-xs hover:shadow flex items-center gap-4">
                    <div className="h-11 w-11 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0 shadow-sm">
                      ⏰
                    </div>
                    <div>
                      <p className="text-[11px] font-extrabold text-amber-800/80 uppercase tracking-wider">Akan Expired (&lt;30 Hari)</p>
                      <h4 className="text-xl font-extrabold text-amber-900 mt-0.5">{metrics.akanExpiredCount} Item</h4>
                      <p className="text-[10px] text-amber-700 font-medium mt-0.5 leading-none">Dalam masa peringatan</p>
                    </div>
                  </div>

                  {/* Komisioning Tahun Ini */}
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 shadow-xs hover:shadow flex items-center gap-4">
                    <div className="h-11 w-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0 shadow-sm">
                      ✓
                    </div>
                    <div>
                      <p className="text-[11px] font-extrabold text-blue-800/80 uppercase tracking-wider">Komisioning Tahun Ini</p>
                      <h4 className="text-xl font-extrabold text-blue-900 mt-0.5">{metrics.komisioningTahunIni} Unit</h4>
                      <p className="text-[10px] text-blue-700 font-medium mt-0.5 leading-none">Tahun Berjalan 2026</p>
                    </div>
                  </div>

                  {/* Unit Aman */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-xs hover:shadow flex items-center gap-4">
                    <div className="h-11 w-11 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0 shadow-sm">
                      🛡️
                    </div>
                    <div>
                      <p className="text-[11px] font-extrabold text-emerald-800/80 uppercase tracking-wider">Kondisi Aman (&gt;90 Hari)</p>
                      <h4 className="text-xl font-extrabold text-emerald-900 mt-0.5">{metrics.unitAmanCount} Unit</h4>
                      <p className="text-[10px] text-emerald-700 font-medium mt-0.5 leading-none">Masa berlaku masih panjang</p>
                    </div>
                  </div>
                </div>

                {/* Baris Ketiga: Grafik Batang & Pie Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Grafik Batang (Komisioning per Bulan) */}
                  <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-800">Komisioning per Bulan</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Visualisasi jumlah unit diuji berdasar tanggal Komisioning</p>
                    </div>
                    {/* SVG Bar Chart */}
                    <div className="mt-6 h-60 w-full flex items-end gap-1.5 sm:gap-3.5 pb-2 border-b border-slate-200/80 relative">
                      {chartMonthlyData.map((data, idx) => {
                        const maxVal = Math.max(...chartMonthlyData.map(d => d.count)) || 1;
                        const heightPct = Math.max(10, Math.round((data.count / maxVal) * 90));
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center group relative cursor-pointer">
                            {/* Bar tooltip */}
                            <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition duration-150 bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded-md pointer-events-none whitespace-nowrap z-10 font-bold shadow-sm">
                              {data.count} Unit
                            </div>
                            {/* Bar segment */}
                            <div 
                              style={{ height: `${heightPct}%` }}
                              className="w-full bg-blue-500 group-hover:bg-blue-600 rounded-t-md transition-all duration-350 shadow-xs relative"
                            >
                              {data.count > 0 && (
                                <span className="absolute inset-x-0 top-1 text-center text-[10px] text-white font-extrabold">
                                  {data.count}
                                </span>
                              )}
                            </div>
                            {/* Label */}
                            <span className="text-[10px] text-slate-500 font-semibold mt-2 shrink-0">{data.month}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pie Chart (Status Masa Berlaku) */}
                  <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-800">Status Masa Berlaku</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Kategori sisa masa kelaikan operasi</p>
                    </div>
                    {/* Custom Donut Chart Visualization */}
                    <div className="flex flex-col items-center py-4">
                      <div className="relative h-32 w-32 flex items-center justify-center">
                        {/* Circular Donut via SVG */}
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#F1F5F9" strokeWidth="3" />
                          
                          {/* Segment Red */}
                          <circle 
                            cx="18" cy="18" r="15.915" fill="none" stroke="#EF4444" strokeWidth="3.5" 
                            strokeDasharray={`${pieChartData.merah.pct} ${100 - pieChartData.merah.pct}`} 
                            strokeDashoffset="0"
                          />
                          {/* Segment Yellow */}
                          <circle 
                            cx="18" cy="18" r="15.915" fill="none" stroke="#F59E0B" strokeWidth="3.5" 
                            strokeDasharray={`${pieChartData.kuning.pct} ${100 - pieChartData.kuning.pct}`} 
                            strokeDashoffset={`-${pieChartData.merah.pct}`}
                          />
                          {/* Segment Green */}
                          <circle 
                            cx="18" cy="18" r="15.915" fill="none" stroke="#22C55E" strokeWidth="3.5" 
                            strokeDasharray={`${pieChartData.hijau.pct} ${100 - pieChartData.hijau.pct}`} 
                            strokeDashoffset={`-${pieChartData.merah.pct + pieChartData.kuning.pct}`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-xs text-slate-400 font-extrabold">TOTAL UNIT</span>
                          <span className="text-lg font-black text-slate-800 leading-none">{pieChartData.total}</span>
                        </div>
                      </div>

                      {/* Legend List */}
                      <div className="w-full space-y-2 mt-4">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-slate-700">
                            <span className="h-2.5 w-2.5 bg-emerald-500 rounded-full"></span>
                            <span>Aman (&gt;90 Hari)</span>
                          </div>
                          <span className="text-slate-500 font-extrabold">{pieChartData.hijau.count} ({pieChartData.hijau.pct}%)</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-slate-700">
                            <span className="h-2.5 w-2.5 bg-amber-500 rounded-full"></span>
                            <span>Masa Peringatan (30-90)</span>
                          </div>
                          <span className="text-slate-500 font-extrabold">{pieChartData.kuning.count} ({pieChartData.kuning.pct}%)</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 font-bold text-slate-700">
                            <span className="h-2.5 w-2.5 bg-rose-500 rounded-full"></span>
                            <span>Bahaya / Expired (&lt;30)</span>
                          </div>
                          <span className="text-slate-500 font-extrabold">{pieChartData.merah.count} ({pieChartData.merah.pct}%)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Baris Keempat: Tabel & Timeline */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Left Column: 10 Data Akan Expired */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 bg-amber-500 rounded-full animate-ping"></span>
                        10 Data Terdekat Expired
                      </h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Daftar item masa kelaikan terkecil</p>
                    </div>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-[11px] text-left text-slate-700">
                        <thead className="bg-slate-50 text-slate-400 font-extrabold text-[9px] uppercase tracking-wider border-b border-slate-100">
                          <tr>
                            <th className="py-2 px-2">Unit / Lambung</th>
                            <th className="py-2 px-2">Tanggal Expired</th>
                            <th className="py-2 px-2 text-right">Sisa Hari</th>
                            <th className="py-2 px-2 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-bold text-slate-850">
                          {itemsAkanExpired.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2 px-2">
                                <div className="text-slate-800">{item.nama}</div>
                                <span className="text-[9px] text-slate-400 font-normal">{item.noLambung}</span>
                              </td>
                              <td className="py-2 px-2 font-mono text-slate-500">{item.expired || "-"}</td>
                              <td className={`py-2 px-2 text-right font-mono font-extrabold ${item.isExpired ? "text-rose-600" : item.sisa < 30 ? "text-amber-600" : "text-emerald-600"}`}>
                                {item.sisa} Hari
                              </td>
                              <td className="py-2 px-2 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                                  item.isExpired 
                                    ? "bg-rose-50 text-rose-600 border border-rose-100" 
                                    : item.sisa < 30 
                                      ? "bg-amber-50 text-amber-600 border border-amber-100" 
                                      : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                }`}>
                                  {item.isExpired ? "EXPIRED" : "AMAN"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Middle Column: Issue KO Terbaru */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-800">Isu KO & Tiket Terbaru</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Histori temuan penyimpangan operasional lapangan</p>
                    </div>
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-[11px] text-left text-slate-700">
                        <thead className="bg-slate-50 text-slate-400 font-extrabold text-[9px] uppercase tracking-wider border-b border-slate-100">
                          <tr>
                            <th className="py-2 px-2">No / Unit</th>
                            <th className="py-2 px-2">PIC</th>
                            <th className="py-2 px-2">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-bold text-slate-850">
                          {recentIssues.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-2">
                                <div className="text-slate-800">{item.noIssue}</div>
                                <span className="text-[9px] text-slate-400 font-normal">{item.unit} | {item.tanggal}</span>
                              </td>
                              <td className="py-2.5 px-2 text-slate-600 font-semibold">{item.pic || "-"}</td>
                              <td className="py-2.5 px-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                                  item.status === 'Open' 
                                    ? "bg-rose-50 text-rose-600 border border-rose-100 animate-pulse" 
                                    : item.status === 'Progress' 
                                      ? "bg-amber-50 text-amber-600 border border-amber-100" 
                                      : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                }`}>
                                  {item.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Column: Aktivitas Terbaru Timeline */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-800">Aktivitas & Log Terbaru</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Gabungan update sistem, kalibrasi, servis & KO</p>
                    </div>
                    <div className="mt-4 space-y-4 max-h-80 overflow-y-auto scrollbar-none pr-1">
                      {recentActivities.map((act, idx) => (
                        <div key={idx} className="flex gap-3 items-start relative group">
                          {idx !== recentActivities.length - 1 && (
                            <span className="absolute left-4 top-8 bottom-0 w-0.5 bg-slate-100 group-hover:bg-slate-200 transition-colors"></span>
                          )}
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border text-sm font-bold shadow-xs bg-${act.color}-50 text-${act.color}-600 border-${act.color}-100`}>
                            {act.icon}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-[11px] font-extrabold text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">
                              {act.title}
                            </h4>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{act.desc}</p>
                            <span className="text-[9px] text-slate-400 font-mono block mt-1">{act.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Master Data Grid Tables Views */}
        {activeTab !== "dashboard" && (
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-5">
            {/* Header Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Master Data - {sheetsList.find(s => s.id === activeTab)?.label}
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Manajemen database terintegrasi secara harian.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <button
                  onClick={() => openForm(activeTab)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Tambah Data
                </button>
                <button
                  onClick={() => handleExportCSV(activeTab)}
                  className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Download className="h-4 w-4 text-slate-400" /> Export Excel
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <FileText className="h-4 w-4 text-slate-400" /> Cetak PDF
                </button>
              </div>
            </div>

            {/* Filters and Search toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-200/50">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari semua data, PIC, nomor lambung..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-blue-500 font-bold text-slate-800 placeholder-slate-400 outline-none transition"
                />
              </div>

              <div className="flex items-center gap-2">
                {/* Status Filter for specific tabs */}
                {(activeTab === "data sarana" || activeTab === "Data Unit HD" || activeTab === "kalibrasi" || activeTab === "Isuue KO" || activeTab === "plan 26") && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-bold">Status:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="py-1.5 px-3 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-700 outline-none"
                    >
                      <option value="Semua">Semua</option>
                      {activeTab === "data sarana" && (
                        <>
                          <option value="Siap Operasi">Siap Operasi</option>
                          <option value="Perbaikan">Perbaikan</option>
                        </>
                      )}
                      {activeTab === "Data Unit HD" && (
                        <>
                          <option value="Ready">Ready</option>
                          <option value="Breakdown">Breakdown</option>
                          <option value="Standby">Standby</option>
                        </>
                      )}
                      {activeTab === "kalibrasi" && (
                        <>
                          <option value="Aman">Aman</option>
                          <option value="Akan Expired">Akan Expired</option>
                          <option value="Expired">Expired</option>
                        </>
                      )}
                      {activeTab === "Isuue KO" && (
                        <>
                          <option value="Open">Open</option>
                          <option value="Progress">Progress</option>
                          <option value="Close">Close</option>
                        </>
                      )}
                      {activeTab === "plan 26" && (
                        <>
                          <option value="Planned">Planned</option>
                          <option value="Selesai">Selesai</option>
                          <option value="Batal">Batal</option>
                        </>
                      )}
                    </select>
                  </div>
                )}

                {/* Categories Filter for Data SPIP */}
                {activeTab === "Data SPIP" && dropdownCategories.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-bold">Kategori:</span>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="py-1.5 px-3 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-700 outline-none"
                    >
                      <option value="Semua">Semua</option>
                      {dropdownCategories.map((cat, idx) => (
                        <option key={idx} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Conditional Sub-Module: Calendar View for plan 26 */}
            {activeTab === "plan 26" && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <div>
                      <h4 className="text-xs font-black text-blue-900 uppercase">Navigasi Kalender Kerja 2026</h4>
                      <p className="text-[10px] text-blue-700 leading-normal font-semibold">Tampilkan agenda harian/bulanan kelaikan komisioning unit.</p>
                    </div>
                  </div>
                </div>

                {/* Simulated Responsive Calendar Widget */}
                <div className="border border-slate-200 rounded-2xl p-4 grid grid-cols-7 gap-2 text-center bg-white">
                  {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((day, dIdx) => (
                    <div key={dIdx} className="text-[10px] font-extrabold text-slate-400 py-1 uppercase">{day}</div>
                  ))}
                  {[...Array(31)].map((_, dayIdx) => {
                    const dayNum = dayIdx + 1;
                    const dateStr = `2026-07-${dayNum < 10 ? '0' + dayNum : dayNum}`;
                    const items = getSheetData("plan 26").filter(p => p.tanggal === dateStr);
                    return (
                      <div key={dayIdx} className="border border-slate-100 rounded-lg p-1.5 text-left min-h-16 hover:bg-slate-50 flex flex-col justify-between">
                        <span className="text-[10px] font-black text-slate-400">{dayNum}</span>
                        {items.map((it, itIdx) => (
                          <div key={itIdx} className={`text-[9px] p-0.5 rounded leading-none truncate font-bold ${
                            it.status === 'Selesai' 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : "bg-blue-50 text-blue-700 border border-blue-100 animate-pulse"
                          }`}>
                            {it.kegiatan}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Conditional Sub-Module: Photo Gallery View for foto stiker HD */}
            {activeTab === "foto stiker HD" && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {parsedData.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md transition flex flex-col group relative">
                    <div className="h-44 w-full overflow-hidden relative bg-slate-200">
                      {item.fotoUrl ? (
                        <img 
                          src={item.fotoUrl} 
                          alt={item.noLambung} 
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover group-hover:scale-105 transition duration-300" 
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-400">
                          <Image className="h-8 w-8" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button
                          onClick={() => setZoomedImage(item.fotoUrl)}
                          className="h-7 w-7 rounded-lg bg-black/55 hover:bg-black text-white flex items-center justify-center cursor-pointer transition shadow"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="p-3.5 flex-1 flex flex-col justify-between gap-1">
                      <div>
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[9px] font-extrabold uppercase">
                          {item.noLambung}
                        </span>
                        <p className="text-[11px] font-bold text-slate-700 mt-2 line-clamp-2 leading-relaxed">
                          {item.deskripsi || "Tanpa Deskripsi"}
                        </p>
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono mt-2 block">{item.tanggalAmbil}</span>
                    </div>
                    {/* Hover tools footer */}
                    <div className="px-3.5 py-2 border-t border-slate-100 bg-slate-50 flex justify-end gap-1.5">
                      <button
                        onClick={() => openForm("foto stiker HD", item)}
                        className="p-1 text-slate-400 hover:text-blue-600 transition cursor-pointer"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem("foto stiker HD", item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Default Master DataTable */}
            {activeTab !== "foto stiker HD" && (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-xs text-left text-slate-700">
                  <thead className="bg-slate-50 text-slate-400 font-extrabold text-[10px] uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      {/* Dynamic Columns headers */}
                      {(() => {
                        const firstItem = parsedData[0] || {};
                        const headers = Object.keys(firstItem).filter(k => k !== "id" && k !== "fotoUrl" && k !== "dokumenUrl" && k !== "sertifikatUrl");
                        if (headers.length === 0) {
                          return <th className="py-3.5 px-4 text-center">Menunggu Sinkronisasi Data...</th>;
                        }
                        return (
                          <>
                            {headers.map((h, i) => (
                              <th 
                                key={i} 
                                onClick={() => handleSort(h)}
                                className="py-3.5 px-4 cursor-pointer hover:bg-slate-100/50 hover:text-slate-700 transition"
                              >
                                <div className="flex items-center gap-1">
                                  {h.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                  {sortField === h && (
                                    <span className="text-[8px]">{sortDirection === "asc" ? "▲" : "▼"}</span>
                                  )}
                                </div>
                              </th>
                            ))}
                            <th className="py-3.5 px-4 text-right">Aksi</th>
                          </>
                        );
                      })()}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-slate-800">
                    {loadingSheets[activeTab] ? (
                      [...Array(5)].map((_, rIdx) => (
                        <tr key={rIdx} className="animate-pulse">
                          <td colSpan={10} className="py-4 px-4 bg-slate-50/20 h-10"></td>
                        </tr>
                      ))
                    ) : parsedData.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 px-4 text-center text-slate-400 font-semibold">
                          Tidak ditemukan data harian yang cocok dengan penyaringan atau pencarian Anda.
                        </td>
                      </tr>
                    ) : (
                      parsedData.map((item, idx) => {
                        const fields = Object.keys(item).filter(k => k !== "id" && k !== "fotoUrl" && k !== "dokumenUrl" && k !== "sertifikatUrl");
                        return (
                          <tr key={idx} className="hover:bg-slate-50/40">
                            {fields.map((f, fIdx) => {
                              const val = item[f];
                              const isExpField = f === 'expired' && isDateExpired(val);
                              return (
                                <td key={fIdx} className="py-3 px-4 font-bold">
                                  {f === 'status' ? (
                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                                      val === 'Aktif' || val === 'Ready' || val === 'Siap Operasi' || val === 'Aman' || val === 'Selesai' || val === 'Close'
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                        : val === 'Akan Expired' || val === 'Progress' || val === 'Planned' || val === 'Kuning'
                                          ? "bg-amber-50 text-amber-600 border-amber-100"
                                          : "bg-rose-50 text-rose-600 border-rose-100"
                                    }`}>
                                      {val || "-"}
                                    </span>
                                  ) : isExpField ? (
                                    <span className="text-rose-600 flex items-center gap-1 font-extrabold font-mono">
                                      <AlertTriangle className="h-3.5 w-3.5" />
                                      {val} (EXPIRED)
                                    </span>
                                  ) : f === 'dokumenUrl' || f === 'sertifikatUrl' || f === 'fotoUrl' ? (
                                    val ? (
                                      <a 
                                        href={val} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        className="text-blue-600 hover:underline flex items-center gap-1"
                                      >
                                        <Eye className="h-3 w-3" /> Lihat File
                                      </a>
                                    ) : "-"
                                  ) : (
                                    String(val || "-")
                                  )}
                                </td>
                              );
                            })}
                            
                            {/* Actions Column */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {item.fotoUrl && (
                                  <button
                                    onClick={() => setZoomedImage(item.fotoUrl)}
                                    className="p-1 text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                                    title="Lihat Foto"
                                  >
                                    <Image className="h-4 w-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => openForm(activeTab, item)}
                                  className="p-1 text-slate-400 hover:text-blue-600 transition cursor-pointer"
                                  title="Edit"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(activeTab, item.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                  title="Hapus"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CRUD Side-Drawer/Modal Form */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-end p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg h-full max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl border border-slate-200 flex flex-col justify-between animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-800">
                  {currentEditItem ? "Edit Data Harian" : "Tambah Data Baru"}
                </h3>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="h-8 w-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveForm} className="mt-5 space-y-4">
                {Object.keys(formData).map((fieldName, fIdx) => {
                  const isFileField = fieldName.toLowerCase().includes("url") || fieldName.toLowerCase().includes("sertifikat");
                  const isDateField = fieldName.toLowerCase().includes("tanggal") || fieldName.toLowerCase().includes("expired") || fieldName.toLowerCase().includes("due");
                  const isTextArea = fieldName.toLowerCase().includes("keterangan") || fieldName.toLowerCase().includes("deskripsi") || fieldName.toLowerCase().includes("planning") || fieldName.toLowerCase().includes("komentar");
                  const isStatusField = fieldName.toLowerCase() === 'status';

                  return (
                    <div key={fIdx} className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                        {fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </label>

                      {isStatusField ? (
                        <select
                          value={formData[fieldName]}
                          onChange={(e) => setFormData(prev => ({ ...prev, [fieldName]: e.target.value }))}
                          className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {activeTab === "data sarana" && (
                            <>
                              <option value="Siap Operasi">Siap Operasi</option>
                              <option value="Perbaikan">Perbaikan</option>
                            </>
                          )}
                          {activeTab === "Data Unit HD" && (
                            <>
                              <option value="Ready">Ready</option>
                              <option value="Breakdown">Breakdown</option>
                              <option value="Standby">Standby</option>
                            </>
                          )}
                          {activeTab === "kalibrasi" && (
                            <>
                              <option value="Aman">Aman</option>
                              <option value="Akan Expired">Akan Expired</option>
                              <option value="Expired">Expired</option>
                            </>
                          )}
                          {activeTab === "Isuue KO" && (
                            <>
                              <option value="Open">Open</option>
                              <option value="Progress">Progress</option>
                              <option value="Close">Close</option>
                            </>
                          )}
                          {activeTab === "plan 26" && (
                            <>
                              <option value="Planned">Planned</option>
                              <option value="Selesai">Selesai</option>
                              <option value="Batal">Batal</option>
                            </>
                          )}
                        </select>
                      ) : isFileField ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="URL Dokumen / File"
                            value={formData[fieldName]}
                            onChange={(e) => setFormData(prev => ({ ...prev, [fieldName]: e.target.value }))}
                            className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <div className="flex items-center gap-2">
                            <label className="flex-1 border border-dashed border-slate-200 rounded-xl py-2 px-3 flex items-center justify-center gap-1 text-slate-400 hover:text-slate-600 hover:border-blue-300 transition cursor-pointer text-xs font-bold">
                              <FileUp className="h-4 w-4" />
                              <span>{isUploading ? "Mengunggah..." : "Unggah Berkas Baru"}</span>
                              <input 
                                type="file" 
                                className="hidden" 
                                disabled={isUploading}
                                onChange={(e) => handleFileUpload(e, fieldName)} 
                              />
                            </label>
                          </div>
                        </div>
                      ) : isDateField ? (
                        <input
                          type="date"
                          value={formData[fieldName]}
                          onChange={(e) => setFormData(prev => ({ ...prev, [fieldName]: e.target.value }))}
                          className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-850 outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : isTextArea ? (
                        <textarea
                          rows={3}
                          value={formData[fieldName]}
                          onChange={(e) => setFormData(prev => ({ ...prev, [fieldName]: e.target.value }))}
                          placeholder={`Tulis ${fieldName}...`}
                          className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-850 placeholder-slate-400 outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <input
                          type="text"
                          value={formData[fieldName]}
                          onChange={(e) => setFormData(prev => ({ ...prev, [fieldName]: e.target.value }))}
                          placeholder={`Tulis ${fieldName}...`}
                          className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-850 placeholder-slate-400 outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      )}
                    </div>
                  );
                })}

                <div className="pt-4 flex gap-2 border-t border-slate-100">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                  >
                    Simpan Perubahan
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Large Image Preview Zoom Dialog */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-3xl w-full flex flex-col items-center">
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute -top-10 right-0 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <img 
              src={zoomedImage} 
              alt="Zoomed Preview" 
              referrerPolicy="no-referrer"
              className="max-h-[80vh] w-auto object-contain rounded-2xl border border-white/10 shadow-2xl" 
            />
          </div>
        </div>
      )}
    </div>
  );
}
