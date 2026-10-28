import React, { useState, useEffect } from "react";
import {
  Building2,
  TrendingUp,
  Award,
  AlertTriangle,
  CheckCircle2,
  Search,
  Plus,
  Edit2,
  Trash2,
  FileText,
  Upload,
  Download,
  Filter,
  Sliders,
  Sparkles,
  Shield,
  HelpCircle,
  Calendar,
  Users,
  ChevronRight,
  Printer,
  X,
  Mail,
  UserCheck,
  Lock
} from "lucide-react";

// Types
export interface Vendor {
  kode: string;
  nama: string;
  kategori: string;
  alamat: string;
  pic: string;
  telepon: string;
  email: string;
  noKontrak: string;
  masaBerlaku: string;
  status: "Aktif" | "Non Aktif";
  dokumenUrl?: string;
  createdAt?: string;
  penilaiUser?: string;
  penilaiHse?: string;
  penilaiGa?: string;
}

export interface Evaluation {
  id: string; // eval_timestamp
  vendorKode: string;
  vendorNama: string;
  periode: string; // e.g. "Juni 2026"
  status: "Draft" | "Review" | "Approved" | "Closed";
  buktiUrl?: string;
  catatan?: string;
  
  // Scores (1-5)
  // User Dept: Price, Quality, Quantity, Delivery
  userPrice: number;
  userQuality: number;
  userQuantity: number;
  userDelivery: number;

  // HSE Dept: Kepatuhan K3, Kelengkapan APD, Safety Procedure, Temuan Safety, Dokumentasi, Lingkungan
  hseK3: number;
  hseApd: number;
  hseProcedure: number;
  hseTemuan: number;
  hseDokumentasi: number;
  hseLingkungan: number;

  // GA Dept: Administrasi, Respons, Pelayanan, Ketepatan, Kontrak, Operasional
  gaAdministrasi: number;
  gaRespons: number;
  gaPelayanan: number;
  gaKetepatan: number;
  gaKontrak: number;
  gaOperasional: number;

  createdAt: string;
  updatedAt: string;
  evaluatorUser?: string;
  evaluatorHse?: string;
  evaluatorGa?: string;
}

interface VendorPenilaianProps {
  userRealName: string;
  userRole: "admin" | "operator";
  username?: string;
  onBack: () => void;
}

export default function VendorPenilaian({ userRealName, userRole, username, onBack }: VendorPenilaianProps) {
  // Navigation Menu tabs
  const [activeTab, setActiveTab] = useState<"dashboard" | "vendors" | "evaluations" | "eval_form" | "reports">("dashboard");

  // Core Data State
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [weights, setWeights] = useState({ user: 40, hse: 30, ga: 30 });
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [karyawanList, setKaryawanList] = useState<{ nama: string; jabatan?: string; dept?: string; nik?: string }[]>([]);
  const [signerName, setSignerName] = useState<string>(userRealName || "");
  const [signerJabatan, setSignerJabatan] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [notif, setNotif] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Active Simulated Department for scoring (Administrator can switch; Operators are locked)
  const [activeEvaluatorDept, setActiveEvaluatorDept] = useState<"user" | "hse" | "ga">("user");

  // Evaluation assigned evaluator states
  const [evaluatorUser, setEvaluatorUser] = useState<string>("");
  const [evaluatorHse, setEvaluatorHse] = useState<string>("");
  const [evaluatorGa, setEvaluatorGa] = useState<string>("");

  // Filter & Search Parameters
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");

  // CRUD Dialog states
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);

  // Vendor Form Fields
  const [vendorKode, setVendorKode] = useState("");
  const [vendorNama, setVendorNama] = useState("");
  const [vendorKat, setVendorKat] = useState("Supplier APD");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");

  const staticCategories = [
    "Supplier APD",
    "Supplier Alat Berat",
    "Kontraktor Sipil",
    "Jasa Inspeksi Teknis",
    "Vendor Logistik",
    "Penyedia Konsumsi",
    "Penyediaan Rental Sarana"
  ];

  const uniqueVendorKats = Array.from(new Set((vendors || []).map(v => v?.kategori).filter(Boolean)));
  const allCategories = Array.from(new Set([...staticCategories, ...uniqueVendorKats])).filter(Boolean);

  const [vendorAlamat, setVendorAlamat] = useState("");
  const [vendorPic, setVendorPic] = useState("");
  const [vendorTel, setVendorTel] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [vendorNoKontrak, setVendorNoKontrak] = useState("");
  const [vendorMasaBerlaku, setVendorMasaBerlaku] = useState("");
  const [vendorStatus, setVendorStatus] = useState<"Aktif" | "Non Aktif">("Aktif");
  const [vendorDocBase64, setVendorDocBase64] = useState<{ base64: string; fileName: string } | null>(null);

  // Evaluation Form Fields
  const [evalVendorKode, setEvalVendorKode] = useState("");
  const [evalPeriode, setEvalPeriode] = useState("Juni 2026");
  const [evalStatus, setEvalStatus] = useState<"Draft" | "Review" | "Approved" | "Closed">("Draft");
  const [evalCatatan, setEvalCatatan] = useState("");
  const [evalProofBase64, setEvalProofBase64] = useState<{ base64: string; fileName: string } | null>(null);

  // Interactive dynamic scores
  const [userPrice, setUserPrice] = useState(4);
  const [userQuality, setUserQuality] = useState(4);
  const [userQuantity, setUserQuantity] = useState(4);
  const [userDelivery, setUserDelivery] = useState(4);

  const [hseK3, setHseK3] = useState(4);
  const [hseApd, setHseApd] = useState(4);
  const [hseProcedure, setHseProcedure] = useState(4);
  const [hseTemuan, setHseTemuan] = useState(4);
  const [hseDokumentasi, setHseDokumentasi] = useState(4);
  const [hseLingkungan, setHseLingkungan] = useState(4);

  const [gaAdministrasi, setGaAdministrasi] = useState(4);
  const [gaRespons, setGaRespons] = useState(4);
  const [gaPelayanan, setGaPelayanan] = useState(4);
  const [gaKetepatan, setGaKetepatan] = useState(4);
  const [gaKontrak, setGaKontrak] = useState(4);
  const [gaOperasional, setGaOperasional] = useState(4);

  // Initialize data on mount
  useEffect(() => {
    fetchVendors();
    fetchEvaluations();
    fetchWeights();
    fetchSystemUsers();
    fetchKaryawanList();
  }, []);

  const fetchKaryawanList = async () => {
    try {
      const res = await fetch("/api/karyawan");
      const data = await res.json();
      if (data && data.success && Array.isArray(data.karyawanDetail)) {
        setKaryawanList(data.karyawanDetail);
        // Find matching employee for current user to auto-set default jabatan
        const current = data.karyawanDetail.find((k: any) => 
          k.nama?.toLowerCase().trim() === (userRealName || "").toLowerCase().trim()
        );
        if (current) {
          setSignerJabatan(prev => prev || current.jabatan || current.dept || "HSE OFFICER");
        } else {
          setSignerJabatan(prev => prev || "HSE OFFICER");
        }
      }
    } catch (e) {
      console.error("Gagal mengambil data karyawan:", e);
    }
  };

  const handleSelectSigner = (nama: string) => {
    setSignerName(nama);
    const found = karyawanList.find(k => k.nama === nama);
    if (found) {
      setSignerJabatan(found.jabatan || found.dept || "STAFF");
    }
  };

  // Auto-populate department evaluators when a vendor is selected for a new report
  useEffect(() => {
    if (evalVendorKode && !selectedEvaluation) {
      const vendor = vendors.find(v => v.kode === evalVendorKode);
      if (vendor) {
        if (vendor.penilaiUser) setEvaluatorUser(vendor.penilaiUser);
        if (vendor.penilaiHse) setEvaluatorHse(vendor.penilaiHse);
        if (vendor.penilaiGa) setEvaluatorGa(vendor.penilaiGa);
      }
    }
  }, [evalVendorKode, vendors, selectedEvaluation]);

  // Alert dismiss
  const showNotif = (text: string, type: "success" | "error" = "success") => {
    setNotif({ text, type });
    setTimeout(() => setNotif(null), 5000);
  };

  const fetchSystemUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data && data.success && Array.isArray(data.list)) {
        setSystemUsers(data.list);
      }
    } catch (e) {
      console.error("Gagal mengambil data user:", e);
    }
  };

  // Fetch Logic
  const fetchVendors = async () => {
    try {
      const r = await fetch("/api/vendors");
      const d = await r.json();
      if (d.success) setVendors(d.list || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEvaluations = async () => {
    try {
      const r = await fetch("/api/vendor-evaluations");
      const d = await r.json();
      if (d.success) setEvaluations(d.list || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchWeights = async () => {
    try {
      const r = await fetch("/api/vendor-weights");
      const d = await r.json();
      if (d.success && d.weights) setWeights(d.weights);
    } catch (e) {
      console.error(e);
    }
  };

  // Helper calculation formulas
  const calcUserScore = (item: Partial<Evaluation>) => {
    const price = item.userPrice ?? 4;
    const quality = item.userQuality ?? 4;
    const qty = item.userQuantity ?? 4;
    const deliv = item.userDelivery ?? 4;
    return (price + quality + qty + deliv) / 4;
  };

  const calcHseScore = (item: Partial<Evaluation>) => {
    const k3 = item.hseK3 ?? 4;
    const apd = item.hseApd ?? 4;
    const procedures = item.hseProcedure ?? 4;
    const temuan = item.hseTemuan ?? 4;
    const doc = item.hseDokumentasi ?? 4;
    const env = item.hseLingkungan ?? 4;
    return (k3 + apd + procedures + temuan + doc + env) / 6;
  };

  const calcGaScore = (item: Partial<Evaluation>) => {
    const admin = item.gaAdministrasi ?? 4;
    const resp = item.gaRespons ?? 4;
    const service = item.gaPelayanan ?? 4;
    const precision = item.gaKetepatan ?? 4;
    const contract = item.gaKontrak ?? 4;
    const ops = item.gaOperasional ?? 4;
    return (admin + resp + service + precision + contract + ops) / 6;
  };

  const calcFinalScore = (item: Partial<Evaluation>) => {
    const uS = calcUserScore(item);
    const hS = calcHseScore(item);
    const gS = calcGaScore(item);
    const result = (uS * weights.user + hS * weights.hse + gS * weights.ga) / 100;
    return parseFloat(result.toFixed(2));
  };

  const isSectionEditable = (dept: "user" | "hse" | "ga") => {
    if (userRole === "admin") return true;

    // Admin designated someone specific?
    const assignedUser = dept === "user" ? evaluatorUser : dept === "hse" ? evaluatorHse : evaluatorGa;
    
    if (assignedUser && typeof assignedUser === 'string' && assignedUser.trim()) {
      const cleanAssigned = assignedUser.toLowerCase().trim();
      const currentUsername = (username || "").toLowerCase().trim();
      const currentUserRealName = (userRealName || "").toLowerCase().trim();

      // Find the designated user in systemUsers by username or full name
      const sysUser = systemUsers.find(u => 
        u && (
          (u.username && typeof u.username === 'string' && u.username.toLowerCase().trim() === cleanAssigned) ||
          (u.nama && typeof u.nama === 'string' && u.nama.toLowerCase().trim() === cleanAssigned)
        )
      );

      const assignedUsername = sysUser && typeof sysUser.username === 'string' ? sysUser.username.toLowerCase().trim() : "";
      const assignedRealName = sysUser && typeof sysUser.nama === 'string' ? sysUser.nama.toLowerCase().trim() : "";

      const isMatch = 
        cleanAssigned === currentUsername ||
        cleanAssigned === currentUserRealName ||
        (assignedUsername && assignedUsername === currentUsername) ||
        (assignedRealName && assignedRealName === currentUserRealName);

      if (isMatch) return true;
      
      // If someone else is specifically designated, don't allow editing
      return false;
    }

    // Default: If no one has been explicitly assigned, match active simulator department
    return activeEvaluatorDept === dept;
  };

  const canSeeSectionScore = (ev: Evaluation | Partial<Evaluation>, dept: "user" | "hse" | "ga") => {
    if (userRole === "admin") return true;
    if (ev && ev.status && (ev.status === "Closed" || ev.status === "Approved")) return true;

    // Check if designated as evaluator
    const assignedUser = ev ? (dept === "user" ? ev.evaluatorUser : dept === "hse" ? ev.evaluatorHse : ev.evaluatorGa) : null;
    if (assignedUser && typeof assignedUser === 'string' && assignedUser.trim()) {
      const cleanAssigned = assignedUser.toLowerCase().trim();
      const currentUsername = (username || "").toLowerCase().trim();
      const currentUserRealName = (userRealName || "").toLowerCase().trim();

      // Find in system users
      const sysUser = systemUsers.find(u => 
        u && (
          (u.username && typeof u.username === 'string' && u.username.toLowerCase().trim() === cleanAssigned) ||
          (u.nama && typeof u.nama === 'string' && u.nama.toLowerCase().trim() === cleanAssigned)
        )
      );

      const assignedUsername = sysUser && typeof sysUser.username === 'string' ? sysUser.username.toLowerCase().trim() : "";
      const assignedRealName = sysUser && typeof sysUser.nama === 'string' ? sysUser.nama.toLowerCase().trim() : "";

      const isMatch = 
        cleanAssigned === currentUsername ||
        cleanAssigned === currentUserRealName ||
        (assignedUsername && assignedUsername === currentUsername) ||
        (assignedRealName && assignedRealName === currentUserRealName);

      if (isMatch) return true;
    } else {
      // If no designated evaluator, match active department
      if (activeEvaluatorDept === dept) return true;
    }

    return false;
  };

  const getCategoryClassAndLabel = (score: number) => {
    if (score >= 4.5) return { label: "Sangat Memuaskan", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    if (score >= 4.0) return { label: "Memuaskan", color: "text-indigo-700 bg-indigo-50 border-indigo-200" };
    if (score >= 3.0) return { label: "Cukup", color: "text-amber-700 bg-amber-50 border-amber-200" };
    return { label: "Perlu Perbaikan", color: "text-rose-700 bg-rose-50 border-rose-200" };
  };

  const triggerMockEmail = async (evalObj: Evaluation, mode: "dibuat" | "direview" | "disetujui") => {
    // Local console notice mock
    console.log(`📧 Simulated Email triggered for evaluation: ${evalObj.id} [${mode.toUpperCase()}]`);
  };

  // Save Vendor
  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorKode || !vendorNama) {
      showNotif("Kode dan Nama Vendor wajib diisi!", "error");
      return;
    }

    const finalCategory = isCustomCategory ? customCategoryName.trim() : vendorKat;
    if (isCustomCategory && !customCategoryName.trim()) {
      showNotif("Nama kategori baru tidak boleh kosong!", "error");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        vendorData: {
          kode: vendorKode,
          nama: vendorNama,
          kategori: finalCategory,
          alamat: vendorAlamat,
          pic: vendorPic,
          telepon: vendorTel,
          email: vendorEmail,
          noKontrak: vendorNoKontrak,
          masaBerlaku: vendorMasaBerlaku,
          status: vendorStatus
        },
        fileData: vendorDocBase64
      };

      const res = await fetch("/api/vendors/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const d = await res.json();
      if (d.success) {
        setVendors(d.list);
        setIsVendorModalOpen(false);
        resetVendorForm();
        showNotif("Berhasil menyimpan data vendor.");
      } else {
        showNotif(d.message || "Gagal menyimpan vendor.", "error");
      }
    } catch (e) {
      showNotif("Gagal mengirim data vendor ke server.", "error");
    } finally {
      setLoading(false);
    }
  };

  const resetVendorForm = () => {
    setVendorKode("");
    setVendorNama("");
    setVendorKat("Supplier APD");
    setIsCustomCategory(false);
    setCustomCategoryName("");
    setVendorAlamat("");
    setVendorPic("");
    setVendorTel("");
    setVendorEmail("");
    setVendorNoKontrak("");
    setVendorMasaBerlaku("");
    setVendorStatus("Aktif");
    setSelectedVendor(null);
    setVendorDocBase64(null);
  };

  const handleEditVendorClick = (v: Vendor) => {
    setSelectedVendor(v);
    setVendorKode(v.kode);
    setVendorNama(v.nama);
    setVendorKat(v.kategori);
    setIsCustomCategory(false);
    setCustomCategoryName("");
    setVendorAlamat(v.alamat);
    setVendorPic(v.pic);
    setVendorTel(v.telepon);
    setVendorEmail(v.email);
    setVendorNoKontrak(v.noKontrak);
    setVendorMasaBerlaku(v.masaBerlaku);
    setVendorStatus(v.status);
    setIsVendorModalOpen(true);
  };

  const handleDeleteVendor = async (kode: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus vendor "${kode}"? Semua histori evaluasi vendor ini akan dipertahankan.`)) return;
    try {
      const res = await fetch(`/api/vendors/delete/${kode}`, { method: "DELETE" });
      const d = await res.json();
      if (d.success) {
        setVendors(d.list);
        showNotif("Vendor berhasil dihapus.");
      }
    } catch (e) {
      showNotif("Gagal menghapus.", "error");
    }
  };

  // Convert File to Base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "vendor" | "eval") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (type === "vendor") {
        setVendorDocBase64({ base64, fileName: file.name });
      } else {
        setEvalProofBase64({ base64, fileName: file.name });
      }
      showNotif(`Lampiran terdeteksi: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  // Save/Update Evaluation
  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evalVendorKode) {
      showNotif("Harap pilih Vendor terlebih dahulu!", "error");
      return;
    }

    setLoading(true);
    try {
      const targetVend = vendors.find(v => v.kode === evalVendorKode);
      const evalId = selectedEvaluation?.id || `eval_${Date.now()}`;

      const payload = {
        evalData: {
          id: evalId,
          vendorKode: evalVendorKode,
          vendorNama: targetVend ? targetVend.nama : evalVendorKode,
          periode: evalPeriode,
          status: evalStatus,
          catatan: evalCatatan,
          userPrice,
          userQuality,
          userQuantity,
          userDelivery,
          hseK3,
          hseApd,
          hseProcedure,
          hseTemuan,
          hseDokumentasi,
          hseLingkungan,
          gaAdministrasi,
          gaRespons,
          gaPelayanan,
          gaKetepatan,
          gaKontrak,
          gaOperasional,
          evaluatorUser,
          evaluatorHse,
          evaluatorGa,
          createdAt: selectedEvaluation?.createdAt || new Date().toISOString()
        },
        fileData: evalProofBase64
      };

      const res = await fetch("/api/vendor-evaluations/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const d = await res.json();
      if (d.success) {
        setEvaluations(d.list);
        setIsEvalModalOpen(false);
        setActiveTab("evaluations");
        triggerMockEmail(payload.evalData as any, evalStatus === "Draft" ? "dibuat" : evalStatus === "Closed" ? "disetujui" : "direview");
        resetEvalForm();
        showNotif("Evaluasi disimpan dengan sukses!");
      }
    } catch (err) {
      showNotif("Gagal merekam evaluasi.", "error");
    } finally {
      setLoading(false);
    }
  };

  const resetEvalForm = () => {
    setSelectedEvaluation(null);
    setEvalVendorKode("");
    setEvalPeriode("Juni 2026");
    setEvalStatus("Draft");
    setEvalCatatan("");
    setEvaluatorUser("");
    setEvaluatorHse("");
    setEvaluatorGa("");
    setEvalProofBase64(null);
    setUserPrice(4);
    setUserQuality(4);
    setUserQuantity(4);
    setUserDelivery(4);
    setHseK3(4);
    setHseApd(4);
    setHseProcedure(4);
    setHseTemuan(4);
    setHseDokumentasi(4);
    setHseLingkungan(4);
    setGaAdministrasi(4);
    setGaRespons(4);
    setGaPelayanan(4);
    setGaKetepatan(4);
    setGaKontrak(4);
    setGaOperasional(4);
  };

  const handleEditEvalClick = (ev: Evaluation) => {
    const parseScore = (val: any): number => {
      if (typeof val === 'number' && !isNaN(val)) return val;
      const parsed = parseInt(val);
      return isNaN(parsed) ? 4 : parsed;
    };

    setSelectedEvaluation(ev);
    setEvalVendorKode(ev.vendorKode);
    setEvalPeriode(ev.periode);
    setEvalStatus(ev.status);
    setEvalCatatan(ev.catatan || "");
    setEvaluatorUser(ev.evaluatorUser || "");
    setEvaluatorHse(ev.evaluatorHse || "");
    setEvaluatorGa(ev.evaluatorGa || "");
    setUserPrice(parseScore(ev.userPrice));
    setUserQuality(parseScore(ev.userQuality));
    setUserQuantity(parseScore(ev.userQuantity));
    setUserDelivery(parseScore(ev.userDelivery));
    setHseK3(parseScore(ev.hseK3));
    setHseApd(parseScore(ev.hseApd));
    setHseProcedure(parseScore(ev.hseProcedure));
    setHseTemuan(parseScore(ev.hseTemuan));
    setHseDokumentasi(parseScore(ev.hseDokumentasi));
    setHseLingkungan(parseScore(ev.hseLingkungan));
    setGaAdministrasi(parseScore(ev.gaAdministrasi));
    setGaRespons(parseScore(ev.gaRespons));
    setGaPelayanan(parseScore(ev.gaPelayanan));
    setGaKetepatan(parseScore(ev.gaKetepatan));
    setGaKontrak(parseScore(ev.gaKontrak));
    setGaOperasional(parseScore(ev.gaOperasional));
    setActiveTab("eval_form");
  };

  const handleDeleteEval = async (id: string) => {
    if (!confirm("Hapus evaluasi ini secara permanen dari sistem?")) return;
    try {
      const res = await fetch(`/api/vendor-evaluations/delete/${id}`, { method: "DELETE" });
      const d = await res.json();
      if (d.success) {
        setEvaluations(d.list);
        showNotif("Evaluasi berhasil dihapus.");
      }
    } catch (e) {
      showNotif("Gagal menghapus.", "error");
    }
  };

  // Save Weights Settings
  const handleSaveWeights = async (e: React.FormEvent) => {
    e.preventDefault();
    if (weights.user + weights.hse + weights.ga !== 100) {
      showNotif("Total Bobot Penilaian wajib bernilai tepat 100%!", "error");
      return;
    }
    try {
      const res = await fetch("/api/vendor-weights/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weights })
      });
      const d = await res.json();
      if (d.success) {
        setWeights(d.weights);
        setIsWeightModalOpen(false);
        showNotif("Bobot Penilaian Departemen berhasil dikonfigurasi.");
      }
    } catch (err) {
      showNotif("Koneksi gagal saat menyimpan bobot.", "error");
    }
  };

  // Export & Print utilities
  const handleExportCSV = () => {
    const headers = "Kode,Vendor,Kategori,Status,User_Score,HSE_Score,GA_Score,Nilai_Akhir,Hasil\n";
    const rows = filteredVendorsWithScore.map(v => {
      const score = getVendorLatestScoreInfo(v.kode);
      return `"${v.kode}","${v.nama}","${v.kategori}","${v.status}",${score.user.toFixed(2)},${score.hse.toFixed(2)},${score.ga.toFixed(2)},${score.final.toFixed(2)},"${score.label}"`;
    }).join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Laporan_Rekap_Vendor_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotif("Berhasil mengekspor 100% data riwayat ke berkas CSV.");
  };

  // Analytics helper calculators for the Dashboard Bento cards
  const activeVendors = vendors.filter(v => v.status === "Aktif");
  const inactiveVendors = vendors.filter(v => v.status === "Non Aktif");
  
  // Get latest score profile for a specific vendor
  const getVendorLatestScoreInfo = (kode: string) => {
    const list = evaluations.filter(e => e.vendorKode === kode);
    if (list.length === 0) {
      return { user: 0, hse: 0, ga: 0, final: 0, label: "Belum Dievaluasi", color: "text-slate-400 bg-slate-150 border-slate-200", raw: [], empty: true };
    }
    // sort by date descending
    const sorted = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const latest = sorted[0];
    const userS = calcUserScore(latest);
    const hseS = calcHseScore(latest);
    const gaS = calcGaScore(latest);
    const finalS = calcFinalScore(latest);
    return {
      user: userS,
      hse: hseS,
      ga: gaS,
      final: finalS,
      ...getCategoryClassAndLabel(finalS),
      raw: sorted,
      empty: false
    };
  };

  const vendorsWithScores = vendors.map(v => {
    const scr = getVendorLatestScoreInfo(v.kode);
    return {
      ...v,
      score: scr.final,
      userS: scr.user,
      hseS: scr.hse,
      gaS: scr.ga,
      label: scr.label,
      empty: scr.empty
    };
  });

  const top10Best = [...vendorsWithScores]
    .filter(v => !v.empty)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const top10Worst = [...vendorsWithScores]
    .filter(v => !v.empty)
    .sort((a, b) => a.score - b.score)
    .slice(0, 10);

  const notEvaluatedCount = vendors.filter(v => {
    return !evaluations.some(e => e.vendorKode === v.kode);
  }).length;

  const countByCategory = (label: string) => {
    return vendorsWithScores.filter(v => !v.empty && v.label === label).length;
  };

  // Departments PENILAI counter list
  const userReviewsCount = evaluations.filter(e => e.userPrice > 0).length;
  const hseReviewsCount = evaluations.filter(e => e.hseK3 > 0).length;
  const gaReviewsCount = evaluations.filter(e => e.gaAdministrasi > 0).length;

  // Radar Calculation Averages across all evaluated entries
  const getGlobalKpiAverages = () => {
    if (evaluations.length === 0) return { price: 3, quality: 3, quantity: 3, delivery: 3, hse: 3, ga: 3 };
    let price = 0, quality = 0, quantity = 0, delivery = 0, hse = 0, ga = 0;
    evaluations.forEach(e => {
      price += e.userPrice;
      quality += e.userQuality;
      quantity += e.userQuantity;
      delivery += e.userDelivery;
      hse += calcHseScore(e);
      ga += calcGaScore(e);
    });
    const len = evaluations.length;
    return {
      price: price / len,
      quality: quality / len,
      quantity: quantity / len,
      delivery: delivery / len,
      hse: hse / len,
      ga: ga / len
    };
  };

  const kpiAvg = getGlobalKpiAverages();

  // Draw RADAR SVG coordinates for 5 axis points
  // Dimensions map to angles:
  // Price (top): 0 deg (or -90deg starting position)
  // Quality: 72 deg
  // Quantity: 144 deg
  // Delivery: 216 deg
  // HSE / General: 288 deg
  const cx = 110;
  const cy = 110;
  const rLimit = 85;

  const getAxisXY = (score: number, angleDegrees: number) => {
    const r = (score / 5.0) * rLimit;
    const rad = ((angleDegrees - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad)
    };
  };

  const ptPrice = getAxisXY(kpiAvg.price, 0);
  const ptQuality = getAxisXY(kpiAvg.quality, 72);
  const ptQuantity = getAxisXY(kpiAvg.quantity, 144);
  const ptDelivery = getAxisXY(kpiAvg.delivery, 216);
  const ptHSE = getAxisXY(kpiAvg.hse, 288);

  const radarPointsString = `${ptPrice.x},${ptPrice.y} ${ptQuality.x},${ptQuality.y} ${ptQuantity.x},${ptQuantity.y} ${ptDelivery.x},${ptDelivery.y} ${ptHSE.x},${ptHSE.y}`;

  // Filtering for table views
  const filteredVendorsWithScore = (vendorsWithScores || []).filter(v => {
    if (!v) return false;
    const sTerm = (searchTerm || "").toLowerCase().trim();
    const matchesSearch = sTerm === "" ||
                          (v.nama || "").toLowerCase().includes(sTerm) || 
                          (v.kode || "").toLowerCase().includes(sTerm) ||
                          (v.pic || "").toLowerCase().includes(sTerm);
    const matchesCategory = categoryFilter ? v.kategori === categoryFilter : true;
    const matchesStatus = statusFilter ? v.status === statusFilter : true;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const filteredEvaluations = (evaluations || []).filter(e => {
    if (!e) return false;
    const sTerm = (searchTerm || "").toLowerCase().trim();
    const matchesVendor = sTerm === "" ||
                          (e.vendorNama || "").toLowerCase().includes(sTerm) ||
                          (e.vendorKode || "").toLowerCase().includes(sTerm);
    const matchesPeriod = periodFilter ? e.periode === periodFilter : true;
    return matchesVendor && matchesPeriod;
  });

  return (
    <div className="space-y-6 font-sans text-slate-900 drop-shadow-sm">
      
      {/* Dynamic Notifications Banner */}
      {notif && (
        <div className={`p-4 rounded-2xl border text-sm flex items-center justify-between shadow-md transition-all animate-bounce ${
          notif.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"
        }`}>
          <div className="flex items-center gap-2">
            {notif.type === "success" ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 text-rose-600" />}
            <span className="font-semibold">{notif.text}</span>
          </div>
          <button onClick={() => setNotif(null)} className="text-slate-400 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Corporate Header Nav Bar inside Module */}
      <div className="print:hidden bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-805 text-white flex items-center justify-center font-black shadow-inner">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-slate-800">Manajemen Penilaian Vendor</h2>
            <p className="text-xs text-slate-500 mt-0.5">Sistem Pengukuran Kepatuhan, Mutu, Safety, dan Mutu Layanan Rekan Operasional Digital</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Active simulated department badge with customizable selector */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1.5 rounded-xl text-xs font-semibold">
            <span className="text-slate-500 pl-1">Masuk Sebagai:</span>
            <select
              value={activeEvaluatorDept}
              onChange={(e) => setActiveEvaluatorDept(e.target.value as any)}
              className="bg-white border border-slate-250 p-1 rounded-lg text-[11px] font-black uppercase text-indigo-700 outline-none"
            >
              <option value="user">User Dept</option>
              <option value="hse">HSE Dept</option>
              <option value="ga">General Affair</option>
            </select>
          </div>

          {userRole === "admin" && (
            <button
              onClick={() => setIsWeightModalOpen(true)}
              className="px-3 py-2 border border-slate-250 hover:bg-slate-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer text-slate-700"
            >
              <Sliders className="h-3.5 w-3.5" /> Bobot ({weights.user}:{weights.hse}:{weights.ga})
            </button>
          )}

          <button
            onClick={onBack}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs transition uppercase tracking-wider cursor-pointer select-none"
          >
            Tutup Portal
          </button>
        </div>
      </div>

      {/* Sub menu tabs */}
      <div className="print:hidden flex border-b border-slate-200 gap-1 overflow-x-auto pb-px">
        {[
          { id: "dashboard", label: "Dashboard Ringkasan", icon: TrendingUp },
          { id: "vendors", label: "Daftar Vendor Mitra", icon: Building2 },
          { id: "evaluations", label: "Daftar Penilaian", icon: Award },
          { id: "eval_form", label: "Formulir Evaluasi Kerja", icon: FileText },
          { id: "reports", label: "Laporan & Rekapitulasi", icon: Printer }
        ].map((t) => {
          const ActiveIcon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id as any);
                if (t.id === "eval_form" && !selectedEvaluation) {
                  resetEvalForm();
                }
              }}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition duration-150 border-b-2 whitespace-nowrap cursor-pointer ${
                isActive
                  ? "border-indigo-600 text-indigo-600 bg-indigo-50/40 rounded-t-xl"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              <ActiveIcon className="h-4 w-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Area Work Router */}
      
      {/* 1. DASHBOARD OVERVIEW PANEL */}
      {activeTab === "dashboard" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Key Summary Bento Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="block text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Total Terdaftar</span>
              <span className="block text-2xl font-black text-slate-800 mt-1">{vendors.length}</span>
              <span className="text-[10px] font-bold text-slate-500">Seluruh Mitra</span>
            </div>
            
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="block text-[10px] uppercase tracking-wider font-extrabold text-emerald-600">Kontrak Aktif</span>
              <span className="block text-2xl font-black text-emerald-700 mt-1">{activeVendors.length}</span>
              <span className="text-[10px] text-emerald-600 font-bold">● Mitra Berjalan</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="block text-[10px] uppercase tracking-wider font-extrabold text-blue-600">Sangat Memuaskan</span>
              <span className="block text-2xl font-black text-blue-700 mt-1">{countByCategory("Sangat Memuaskan")}</span>
              <span className="text-[10px] text-slate-400">A-Grade (Nilai ≥ 4.5)</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="block text-[10px] uppercase tracking-wider font-extrabold text-indigo-600">Memuaskan</span>
              <span className="block text-2xl font-black text-indigo-700 mt-1">{countByCategory("Memuaskan")}</span>
              <span className="text-[10px] text-slate-400">B-Grade (Nilai 4.0-4.49)</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="block text-[10px] uppercase tracking-wider font-extrabold text-amber-600">Perlu Perbaikan</span>
              <span className="block text-2xl font-black text-amber-700 mt-1">{countByCategory("Perlu Perbaikan")}</span>
              <span className="text-[10px] text-rose-500 font-extrabold">D-Grade (Nilai &lt; 3.0)</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm bg-indigo-50/20">
              <span className="block text-[10px] uppercase tracking-wider font-extrabold text-indigo-700">Belum Dievaluasi</span>
              <span className="block text-2xl font-black text-indigo-800 mt-1">{notEvaluatedCount}</span>
              <span className="text-[9px] text-slate-500 italic">Butuh tindakan segera</span>
            </div>
          </div>

          {/* Graphics Row: SVG Radar Chart and Departmental Review logs */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* SVG Radar KPI Performance */}
            <div className="lg:col-span-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between items-center text-center">
              <div className="w-full text-left">
                <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">KPI Radar Performance</h3>
                <h4 className="text-sm font-black text-slate-800">Rerata Dimensi Evaluasi Vendor</h4>
              </div>

              {evaluations.length === 0 ? (
                <div className="py-12 text-slate-400 text-xs italic">
                  Belum ada data evaluasi. Grafik akan terisi secara otomatis setelah peninjauan pertama dilakukan.
                </div>
              ) : (
                <div className="relative my-4 w-[220px] h-[220px]">
                  <svg width="220" height="220" viewBox="0 0 220 220" className="mx-auto transform rotate-0">
                    {/* Concentric Reference Rings */}
                    {[1, 2, 3, 4, 5].map((lvl) => {
                      // draw concentric pentagons
                      const pt1 = getAxisXY(lvl, 0);
                      const pt2 = getAxisXY(lvl, 72);
                      const pt3 = getAxisXY(lvl, 144);
                      const pt4 = getAxisXY(lvl, 216);
                      const pt5 = getAxisXY(lvl, 288);
                      const points = `${pt1.x},${pt1.y} ${pt2.x},${pt2.y} ${pt3.x},${pt3.y} ${pt4.x},${pt4.y} ${pt5.x},${pt5.y}`;
                      return (
                        <polygon
                          key={lvl}
                          points={points}
                          fill="none"
                          stroke="#e2e8f0"
                          strokeWidth="1"
                          strokeDasharray="2"
                        />
                      );
                    })}

                    {/* Concentric grid circle lines for beautiful visuals */}
                    <circle cx={cx} cy={cy} r={rLimit} fill="none" stroke="#cbd5e1" strokeWidth="0.5" />
                    <circle cx={cx} cy={cy} r={rLimit * 0.6} fill="none" stroke="#cbd5e1" strokeWidth="0.5" />

                    {/* Grid Axes Rays */}
                    {[0, 72, 144, 216, 288].map((angle, i) => {
                      const pt = getAxisXY(5.0, angle);
                      return (
                        <line
                          key={i}
                          x1={cx}
                          y1={cy}
                          x2={pt.x}
                          y2={pt.y}
                          stroke="#cbd5e1"
                          strokeWidth="1.5"
                        />
                      );
                    })}

                    {/* Actual KPI Averaged Area Polygon */}
                    <polygon
                      points={radarPointsString}
                      fill="rgba(99, 102, 241, 0.25)"
                      stroke="#4f46e5"
                      strokeWidth="2.5"
                    />

                    {/* Points nodes */}
                    {[ptPrice, ptQuality, ptQuantity, ptDelivery, ptHSE].map((pt, idx) => (
                      <circle key={idx} cx={pt.x} cy={pt.y} r="4.5" fill="#4f46e5" stroke="white" strokeWidth="1.5" />
                    ))}

                    {/* Text Labels annotations */}
                    <text x={cx} y={cy - rLimit - 6} textAnchor="middle" className="text-[9px] font-black fill-slate-600">Price ({kpiAvg.price.toFixed(1)})</text>
                    <text x={getAxisXY(5, 72).x + 4} y={getAxisXY(5, 72).y} textAnchor="start" className="text-[9px] font-black fill-slate-600">Quality</text>
                    <text x={getAxisXY(5, 144).x} y={getAxisXY(5, 144).y + 10} textAnchor="start" className="text-[9px] font-black fill-slate-600">Qty</text>
                    <text x={getAxisXY(5, 216).x} y={getAxisXY(5, 216).y + 10} textAnchor="end" className="text-[9px] font-black fill-slate-600">Deliv</text>
                    <text x={getAxisXY(5, 288).x - 4} y={getAxisXY(5, 288).y} textAnchor="end" className="text-[9px] font-black fill-slate-600">HSE</text>
                  </svg>
                </div>
              )}

              <div className="text-[10px] text-slate-400 italic bg-slate-50 px-3 py-1.5 rounded-xl border w-full">
                Sistem menarik metrik agregat di atas berdasarkan seluruh log evaluasi yang telah disetujui (Approved / Closed)
              </div>
            </div>

            {/* Department Penilai statistics */}
            <div className="lg:col-span-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Activity Stats</h3>
                <h4 className="text-sm font-black text-slate-800 mb-4">Statistik Penilai berdasarkan Departemen</h4>
                
                <div className="space-y-4">
                  {/* User Dept */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-slate-700">A. User Department</span>
                      <span className="font-bold text-slate-505">{userReviewsCount} Formulir</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-purple-600 h-full rounded-full" style={{ width: `${Math.min(100, (userReviewsCount / 10) * 100)}%` }}></div>
                    </div>
                    <span className="text-[10px] text-slate-400 block">Bobot Evaluasi Kontrak: {weights.user}%</span>
                  </div>

                  {/* HSE Dept */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-slate-700">B. HSE Department</span>
                      <span className="font-bold text-slate-505">{hseReviewsCount} Formulir</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${Math.min(100, (hseReviewsCount / 10) * 100)}%` }}></div>
                    </div>
                    <span className="text-[10px] text-slate-400 block">Bobot Pemantauan K3 & APD: {weights.hse}%</span>
                  </div>

                  {/* GA Dept */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-slate-700">C. General Affair Department</span>
                      <span className="font-bold text-slate-505">{gaReviewsCount} Formulir</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${Math.min(100, (gaReviewsCount / 10) * 100)}%` }}></div>
                    </div>
                    <span className="text-[10px] text-slate-400 block">Bobot Administrasi, Respons, Operasional: {weights.ga}%</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400">
                Pencatatan dilakukan secara realtime yang ditarik dari basis data inkremental internal kami.
              </div>
            </div>

            {/* Monthly Trend simulated mockup path */}
            <div className="lg:col-span-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Monthly Core Trend</h3>
                <h4 className="text-sm font-black text-slate-800 mb-0.5">Grafik Tren Score Vendor per Bulan</h4>
                <p className="text-[10px] text-slate-400">Rata-rata kinerja komparatif 2026</p>

                <div className="mt-6 mb-3">
                  <svg viewBox="0 0 300 120" className="w-full h-24 stroke-indigo-600">
                    {/* Gridlines horizontal */}
                    <line x1="0" y1="20" x2="300" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="0" y1="50" x2="300" y2="50" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="0" y1="80" x2="300" y2="80" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="0" y1="110" x2="300" y2="110" stroke="#f1f5f9" strokeWidth="1" />

                    {/* Polyline line curve representing general scores */}
                    <path
                      d="M 10,85 Q 50,45 100,55 T 200,35 T 290,25"
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth="3"
                    />

                    {/* Nodes */}
                    <circle cx="10" cy="85" r="4" fill="#4f46e5" />
                    <circle cx="68" cy="48" r="4" fill="#4f46e5" />
                    <circle cx="120" cy="55" r="4" fill="#4f46e5" />
                    <circle cx="200" cy="35" r="4" fill="#4f46e5" />
                    <circle cx="290" cy="25" r="4" fill="#e11d48" />

                    {/* Tooltip mockup info for the latest node */}
                    <rect x="220" y="2" width="65" height="15" rx="3" fill="#1e293b" />
                    <text x="252" y="12" fill="white" textAnchor="middle" className="text-[8px] font-bold">Juni: 4.62 ⭐</text>
                  </svg>
                  <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase mt-1 tracking-wider px-1">
                    <span>Februari</span>
                    <span>Maret</span>
                    <span>April</span>
                    <span>Mei</span>
                    <span>Juni 2026</span>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 font-extrabold flex items-center gap-1 bg-amber-50 border border-amber-205 p-2 rounded-xl text-amber-700">
                <Sparkles className="h-3 w-3 shrink-0" /> Trend umum naik +12% dibanding Q1 karena perbanyakan pengawasan K3 di site.
              </div>
            </div>

          </div>

          {/* Ranking tables Bento Grid: Top 10 Vendor and Bottom 10 Vendor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* TOP 10 BEST */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b pb-2 border-slate-100">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Top 10 Vendor Terbaik</h4>
                <span className="text-[10px] font-bold text-emerald-600 px-2 py-0.5 bg-emerald-50 rounded-lg">Skor Tertinggi</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {top10Best.map((v, i) => (
                  <div key={v.kode} className="flex items-center justify-between py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-black text-slate-400 bg-slate-100 h-5 w-5 rounded-full flex items-center justify-center shrink-0">{i+1}</span>
                      <div>
                        <p className="font-bold text-slate-800 leading-tight">{v.nama}</p>
                        <p className="text-[10px] text-slate-400 font-mono">ID: {v.kode} &bull; {v.kategori}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="block font-black text-indigo-700 text-sm leading-none">{v.score.toFixed(2)}</span>
                      <span className="text-[8px] font-extrabold text-slate-400">TERTINGGI</span>
                    </div>
                  </div>
                ))}
                {top10Best.length === 0 && (
                  <p className="text-center text-slate-400 text-xs py-10 italic">Belum ada vendor dengan nilai evaluasi.</p>
                )}
              </div>
            </div>

            {/* BOTTOM 10 LOWEST */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex justify-between items-center border-b pb-2 border-slate-100">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Top 10 Rapor Nilai Terendah</h4>
                <span className="text-[10px] font-bold text-rose-600 px-2 py-0.5 bg-rose-50 rounded-lg">Perlu Perbaikan</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto font-sans">
                {top10Worst.map((v, i) => (
                  <div key={v.kode} className="flex items-center justify-between py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-black text-slate-400 bg-slate-100 h-5 w-5 rounded-full flex items-center justify-center shrink-0">{i+1}</span>
                      <div>
                        <p className="font-bold text-slate-800 leading-tight">{v.nama}</p>
                        <p className="text-[10px] text-slate-400 font-mono">ID: {v.kode} &bull; {v.kategori}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="block font-black text-rose-650 text-sm leading-none">{v.score.toFixed(2)}</span>
                      <span className="text-[8px] font-extrabold text-rose-500 uppercase">Perbaikan</span>
                    </div>
                  </div>
                ))}
                {top10Worst.length === 0 && (
                  <p className="text-center text-slate-400 text-xs py-10 italic">Belum ada vendor dengan nilai evaluasi.</p>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* 2. DAFTAR VENDOR TAB PANEL */}
      {activeTab === "vendors" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Controls & Filter Panel */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari Kode, Nama, PIC Vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 focus:bg-white border rounded-xl outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-50 border p-1 rounded-lg text-xs font-semibold text-slate-655"
              >
                <option value="">Semua Kategori</option>
                {allCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border p-1 rounded-lg text-xs font-semibold text-slate-655"
              >
                <option value="">Semua Status</option>
                <option value="Aktif">Status Aktif</option>
                <option value="Non Aktif">Status Non Aktif</option>
              </select>

              {userRole === "admin" && (
                <button
                  onClick={() => {
                    resetVendorForm();
                    setIsVendorModalOpen(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-705 text-white text-xs font-bold py-1.5 px-3.5 rounded-xl transition cursor-pointer select-none flex items-center gap-1 ml-auto md:ml-0"
                >
                  <Plus className="h-4 w-4" /> Masukkan Vendor Baru
                </button>
              )}
            </div>
          </div>

          {/* Vendors data Table Representation */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-505 font-extrabold uppercase text-[10px]">
                    <th className="py-2.5 px-4">No</th>
                    <th className="py-2.5 px-3">Kode / Nama Vendor</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3">PIC / Kontak Utama</th>
                    <th className="py-2.5 px-3">Nomor Kontrak Kerja</th>
                    <th className="py-2.5 px-3 text-center">Masa Berlaku</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Skor Terkini</th>
                    <th className="py-2.5 px-3">Dokumen</th>
                    {userRole === "admin" && <th className="py-2.5 px-3 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredVendorsWithScore.map((v, i) => {
                    const scoreObj = getVendorLatestScoreInfo(v.kode);
                    return (
                      <tr key={v.kode} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono text-slate-400">{i + 1}</td>
                        <td className="py-3 px-3">
                          <div className="font-extrabold text-slate-900">{v.nama}</div>
                          <div className="text-[10px] font-mono text-slate-400">{v.kode}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full !text-[9.5px] bg-slate-100 font-bold text-slate-700">{v.kategori}</span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">{v.pic}</div>
                          <div className="text-[10px] text-slate-400">{v.telepon} &bull; {v.email}</div>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600">{v.noKontrak || "-"}</td>
                        <td className="py-3 px-3 text-center font-mono">
                          {(() => {
                            if (!v.masaBerlaku || v.masaBerlaku.trim() === "" || v.masaBerlaku.trim() === "-") {
                              return "-";
                            }
                            const parsedDate = new Date(v.masaBerlaku);
                            if (isNaN(parsedDate.getTime())) {
                              return v.masaBerlaku;
                            }
                            return parsedDate.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
                          })()}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full inline-block font-black text-[9.5px] border ${
                            v.status === "Aktif" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-slate-105 text-slate-600 border-slate-200"
                          }`}>
                            {v.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {scoreObj.empty ? (
                            <span className="text-[10px] text-slate-400 italic font-medium">Belum dievaluasi</span>
                          ) : (
                            <div className="inline-block text-center pr-1.5">
                              <span className="font-black text-indigo-700 block text-xs">{scoreObj.final}</span>
                              <span className={`text-[8px] font-black px-1 py-px rounded block ${scoreObj.color}`}>{scoreObj.label}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 font-sans">
                          {v.dokumenUrl ? (
                            <a
                              href={v.dokumenUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-110 text-indigo-700 font-bold rounded text-[10px] border border-indigo-200 inline-flex items-center gap-1 cursor-pointer select-none"
                            >
                              <Download className="h-3 w-3" /> Unduh Dokumen
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">No document uploaded</span>
                          )}
                        </td>
                        {userRole === "admin" && (
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleEditVendorClick(v)}
                                className="h-7 w-7 bg-slate-50 text-slate-600 hover:text-slate-900 border hover:bg-slate-100 rounded-lg flex items-center justify-center transition cursor-pointer"
                                title="Edit data vendor"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteVendor(v.kode)}
                                className="h-7 w-7 bg-rose-50 text-rose-650 hover:text-rose-800 hover:bg-rose-100 border rounded-lg flex items-center justify-center transition cursor-pointer"
                                title="Hapus vendor"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {filteredVendorsWithScore.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center py-10 text-slate-400 italic">
                        Belum ada data vendor yang terdaftar. Ketuk "Masukkan Vendor Baru" bila Anda adalah Administrator.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* 3. DAFTAR EVALUATIONS TAB */}
      {activeTab === "evaluations" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari Vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 focus:bg-white border rounded-xl outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="bg-slate-50 border p-1 rounded-lg text-xs font-semibold text-slate-655"
              >
                <option value="">Semua Periode</option>
                <option value="Mei 2026">Mei 2026</option>
                <option value="Juni 2026">Juni 2026</option>
                <option value="Juli 2026">Juli 2026</option>
                <option value="Agustus 2026">Agustus 2026</option>
              </select>

              <button
                onClick={() => {
                  resetEvalForm();
                  setActiveTab("eval_form");
                }}
                className="bg-indigo-600 hover:bg-indigo-705 text-white text-xs font-bold py-1.5 px-3.5 rounded-xl transition cursor-pointer flex items-center gap-1 ml-auto md:ml-0"
              >
                <Plus className="h-4 w-4" /> Evaluasi Vendor Baru
              </button>
            </div>
          </div>

          {/* Evaluations list index */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-505 font-extrabold uppercase text-[10px]">
                    <th className="py-2.5 px-4">ID</th>
                    <th className="py-2.5 px-3">Nama Vendor Rekanan</th>
                    <th className="py-2.5 px-3">Periode</th>
                    <th className="py-2.5 px-3 text-center">User Dept Avg</th>
                    <th className="py-2.5 px-3 text-center">HSE Dept Avg</th>
                    <th className="py-2.5 px-3 text-center">GA Dept Avg</th>
                    <th className="py-2.5 px-3 text-center">Nilai Akhir</th>
                    <th className="py-2.5 px-3 text-center">Kategori Hasil</th>
                    <th className="py-2.5 px-3 text-center">Workflow Status</th>
                    <th className="py-2.5 px-3 text-center">Aksi Kerja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredEvaluations.map((ev) => {
                    const uf = calcUserScore(ev);
                    const hf = calcHseScore(ev);
                    const gf = calcGaScore(ev);
                    const fs = calcFinalScore(ev);
                    const cat = getCategoryClassAndLabel(fs);

                    const showUserScore = canSeeSectionScore(ev, "user");
                    const showHseScore = canSeeSectionScore(ev, "hse");
                    const showGaScore = canSeeSectionScore(ev, "ga");
                    const showFinalScore = showUserScore && showHseScore && showGaScore;

                    return (
                      <tr key={ev.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono text-[10px] text-slate-400">{ev.id.substring(5, 12)}</td>
                        <td className="py-3 px-3">
                          <div className="font-extrabold text-slate-900">{ev.vendorNama}</div>
                          <div className="text-[9px] font-mono text-slate-400">Kode: {ev.vendorKode}</div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700">{ev.periode}</td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-705 bg-slate-50/50">
                          {showUserScore ? uf.toFixed(2) : "🔒 Rahasia"}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-705">
                          {showHseScore ? hf.toFixed(2) : "🔒 Rahasia"}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-705 bg-slate-50/50">
                          {showGaScore ? gf.toFixed(2) : "🔒 Rahasia"}
                        </td>
                        <td className="py-3 px-3 text-center bg-indigo-50/25">
                          <span className="text-sm font-black text-indigo-805 font-mono">
                            {showFinalScore ? fs.toFixed(2) : "🔒"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {showFinalScore ? (
                            <span className={`px-2 py-0.5 rounded-full inline-block font-black text-[9.5px] border ${cat.color}`}>
                              {cat.label}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full inline-block font-black text-[9.5px] border border-dashed border-slate-300 bg-slate-100 text-slate-550">
                              🔒 CONFIDENTIAL
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full inline-block font-extrabold text-[9px] uppercase font-mono border ${
                            ev.status === "Closed"
                              ? "bg-slate-100 text-slate-750 border-slate-300"
                              : ev.status === "Approved"
                              ? "bg-indigo-600 text-white border-indigo-700"
                              : ev.status === "Review"
                              ? "bg-amber-500 text-white border-amber-600"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}>
                            {ev.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEditEvalClick(ev)}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold rounded text-[10px] border border-indigo-200 flex items-center gap-1 transition cursor-pointer"
                            >
                              <Edit2 className="h-3 w-3" /> Edit / Proses
                            </button>
                            {userRole === "admin" && (
                              <button
                                onClick={() => handleDeleteEval(ev.id)}
                                className="p-1 text-rose-650 hover:text-rose-800 hover:bg-rose-50 rounded"
                                title="Hapus evaluasi ini"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredEvaluations.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center py-10 text-slate-401 italic">
                        Belum ada evaluasi perolehan untuk kriteria yang dicari.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* 4. FORMULIR PENILAIAN DUA KOLOM - DENGAN SCORE CARD PREVIEW */}
      {activeTab === "eval_form" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
          
          {/* Main Scoring Sliders Input Area */}
          <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="border-b pb-3 flex justify-between items-center">
              <div>
                <h3 className="text-base font-black text-slate-805">
                  {selectedEvaluation ? "Proses Evaluasi Terdaftar" : "Buat Formulir Evaluasi Baru"}
                </h3>
                <p className="text-xs text-slate-400">Pengisian parameter nilai 1 s/d 5. Evaluator non-admin hanya dapat menyimpan parameter dilingkup depertemennya.</p>
              </div>
              <button
                onClick={() => {
                  resetEvalForm();
                  setActiveTab("evaluations");
                }}
                className="px-3 py-1.5 border border-slate-250 text-slate-500 text-xs font-semibold rounded-lg hover:bg-slate-50"
              >
                Kembali ke Daftar
              </button>
            </div>

            <form onSubmit={handleSaveEvaluation} className="space-y-6 font-sans">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-500 block">Nama Vendor</label>
                  <select
                    value={evalVendorKode}
                    onChange={(e) => setEvalVendorKode(e.target.value)}
                    required
                    disabled={!!selectedEvaluation}
                    className="w-full border p-2 bg-slate-50 font-bold rounded-xl text-xs outline-none focus:bg-white"
                  >
                    <option value="">-- Pilih Vendor Rekanan --</option>
                    {vendors.map(v => (
                      <option key={v.kode} value={v.kode}>{v.nama} [{v.kode}]</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black uppercase text-slate-500 block">Periode Evaluasi</label>
                  <select
                    value={evalPeriode}
                    onChange={(e) => setEvalPeriode(e.target.value)}
                    className="w-full border p-2 bg-slate-50 font-bold rounded-xl text-xs outline-none focus:bg-white"
                  >
                    <option value="Mei 2026">Mei 2026</option>
                    <option value="Juni 2026">Juni 2026</option>
                    <option value="Juli 2026">Juli 2026</option>
                    <option value="Agustus 2026">Agustus 2026</option>
                  </select>
                </div>

                <div className="space-y-1 font-mono">
                  <label className="text-[11px] font-black uppercase text-slate-500 block">Status Dokumen</label>
                  <select
                    value={evalStatus}
                    onChange={(e) => setEvalStatus(e.target.value as any)}
                    className="w-full border p-2 bg-slate-50 font-bold rounded-xl text-xs text-indigo-700 outline-none focus:bg-white"
                  >
                    <option value="Draft">Draft (Simpan Sementara)</option>
                    <option value="Review">Review (Tinjauan Staff)</option>
                    {userRole === "admin" && <option value="Approved">Approved (Disetujui Admo)</option>}
                    {userRole === "admin" && <option value="Closed">Closed (Rapor Dikunci)</option>}
                  </select>
                </div>
              </div>

              {/* Evaluators Hak Akses Section */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-205">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-1.5 font-sans">
                  <Users className="h-4 w-4 text-indigo-600" />
                  Hak Akses Penilai Kategori Departemen (Ditentukan Admin)
                </h4>

                {userRole === "admin" && (
                  <div className="mb-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-[11px] leading-relaxed font-sans font-semibold shadow-xs">
                    <span className="text-sm">⚠️</span>
                    <div>
                      <span className="text-amber-900 font-black block">INFORMASI PENTING UNTUK ADMIN:</span>
                      Setelah memilih Penilai/PIC di bawah ini, <strong>Anda wajib menekan tombol "Simpan Laporan Evaluasi"</strong> di bagian paling bawah halaman agar data penunjukan penilai berhasil tersimpan secara permanen ke database sistem dan tidak tereset saat keluar/log out.
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-purple-700 block">
                      Penilai User Dept Section
                    </label>
                    <select
                      value={(() => {
                        const clean = (evaluatorUser || "").trim().toLowerCase();
                        const found = systemUsers.find(u => 
                          (u.username && u.username.toLowerCase().trim() === clean) ||
                          (u.nama && u.nama.toLowerCase().trim() === clean)
                        );
                        return found ? found.username : evaluatorUser;
                      })()}
                      onChange={(e) => setEvaluatorUser(e.target.value)}
                      disabled={userRole !== "admin"}
                      className="w-full border p-2 bg-white font-bold rounded-xl text-xs outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">-- Semua Operator (Default) --</option>
                      {systemUsers.map(u => (
                        <option key={u.username} value={u.username}>{u.nama} ({u.role})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-emerald-700 block">
                      Penilai HSE Section
                    </label>
                    <select
                      value={(() => {
                        const clean = (evaluatorHse || "").trim().toLowerCase();
                        const found = systemUsers.find(u => 
                          (u.username && u.username.toLowerCase().trim() === clean) ||
                          (u.nama && u.nama.toLowerCase().trim() === clean)
                        );
                        return found ? found.username : evaluatorHse;
                      })()}
                      onChange={(e) => setEvaluatorHse(e.target.value)}
                      disabled={userRole !== "admin"}
                      className="w-full border p-2 bg-white font-bold rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">-- Semua Operator (Default) --</option>
                      {systemUsers.map(u => (
                        <option key={u.username} value={u.username}>{u.nama} ({u.role})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-indigo-700 block">
                      Penilai General Affair Section
                    </label>
                    <select
                      value={(() => {
                        const clean = (evaluatorGa || "").trim().toLowerCase();
                        const found = systemUsers.find(u => 
                          (u.username && u.username.toLowerCase().trim() === clean) ||
                          (u.nama && u.nama.toLowerCase().trim() === clean)
                        );
                        return found ? found.username : evaluatorGa;
                      })()}
                      onChange={(e) => setEvaluatorGa(e.target.value)}
                      disabled={userRole !== "admin"}
                      className="w-full border p-2 bg-white font-bold rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- Semua Operator (Default) --</option>
                      {systemUsers.map(u => (
                        <option key={u.username} value={u.username}>{u.nama} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                </div>
                {userRole !== "admin" && (
                  <p className="text-[10px] text-slate-500 mt-2 italic font-sans">
                    * Hanya administrator yang dapat mendelegasikan penilai untuk masing-masing departemen.
                  </p>
                )}
              </div>

              {/* A. USER DEPARTMENT CARD */}
              <div className="border border-slate-205 rounded-2xl overflow-hidden shadow-inner font-sans bg-slate-50/50">
                <div className="bg-purple-600 text-white px-4 py-2 flex justify-between items-center bg-purple-600">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wide">A. User Department Section</span>
                    {evaluatorUser ? (
                      <span className="text-[10px] font-bold bg-white/20 text-white border border-white/10 px-1.5 py-0.5 rounded-lg flex items-center gap-1">
                        Penilai: {(() => {
                          const clean = (evaluatorUser || "").toString().trim().toLowerCase();
                          const found = systemUsers.find(u => 
                            u && (
                              (u.username && typeof u.username === 'string' && u.username.toLowerCase().trim() === clean) ||
                              (u.nama && typeof u.nama === 'string' && u.nama.toLowerCase().trim() === clean)
                            )
                          );
                          return found ? found.nama : evaluatorUser;
                        })()}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-white/10 text-purple-100 px-1.5 py-0.5 rounded-lg">
                        Penilai: Terbuka untuk semua
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-white/20 rounded font-black">Weight: {weights.user}%</span>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {!canSeeSectionScore({ status: evalStatus, evaluatorUser, evaluatorHse, evaluatorGa }, "user") ? (
                    <div className="col-span-full py-8 flex flex-col items-center justify-center text-center space-y-2 bg-white/70 rounded-2xl border border-dashed border-purple-200">
                      <Lock className="h-8 w-8 text-purple-500 animate-pulse" />
                      <div>
                        <h5 className="text-[11px] font-black text-purple-900 uppercase tracking-widest">Penilaian Bersifat Confidential</h5>
                        <p className="text-[9.5px] text-purple-550 max-w-md mt-1 mx-auto leading-relaxed">
                          Anda tidak memiliki otorisasi untuk melihat atau mengubah penilaian departemen ini. Skor hanya akan diakumulasikan ke nilai akhir setelah laporan ini di-Close oleh Admin.
                        </p>
                      </div>
                    </div>
                  ) : (
                    [
                      { label: "1. Harga Kompetitif (Price)", score: userPrice, set: setUserPrice },
                      { label: "2. Kualitas Barang (Quality)", score: userQuality, set: setUserQuality },
                      { label: "3. Kuantitas Keselarasan (Quantity)", score: userQuantity, set: setUserQuantity },
                      { label: "4. Ketepatan Pengiriman (Delivery)", score: userDelivery, set: setUserDelivery }
                    ].map((sld, idx) => (
                      <div key={idx} className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-100">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-extrabold text-slate-700">{sld.label}</span>
                          <span className="text-xs font-black text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">{sld.score} ⭐</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          value={sld.score}
                          disabled={!isSectionEditable("user")}
                          onChange={(e) => sld.set(parseInt(e.target.value))}
                          className="w-full h-1.5 focus:outline-none accent-purple-600 cursor-pointer disabled:opacity-40"
                        />
                        <div className="flex justify-between text-[8px] text-slate-400">
                          <span>Sangat Buruk (1)</span>
                          <span>Sangat Baik (5)</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* B. HSE DEPARTMENT CARD */}
              <div className="border border-slate-205 rounded-2xl overflow-hidden shadow-inner font-sans bg-slate-50/50">
                <div className="bg-emerald-650 text-white px-4 py-2 flex justify-between items-center bg-emerald-700">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wide">B. HSE Department (Keselamatan & K3)</span>
                    {evaluatorHse ? (
                      <span className="text-[10px] font-bold bg-white/20 text-white border border-white/10 px-1.5 py-0.5 rounded-lg flex items-center gap-1">
                        Penilai: {(() => {
                          const clean = (evaluatorHse || "").toString().trim().toLowerCase();
                          const found = systemUsers.find(u => 
                            u && (
                              (u.username && typeof u.username === 'string' && u.username.toLowerCase().trim() === clean) ||
                              (u.nama && typeof u.nama === 'string' && u.nama.toLowerCase().trim() === clean)
                            )
                          );
                          return found ? found.nama : evaluatorHse;
                        })()}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-white/10 text-emerald-100 px-1.5 py-0.5 rounded-lg">
                        Penilai: Terbuka untuk semua
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-white/20 rounded font-black">Weight: {weights.hse}%</span>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {!canSeeSectionScore({ status: evalStatus, evaluatorUser, evaluatorHse, evaluatorGa }, "hse") ? (
                    <div className="col-span-full py-8 flex flex-col items-center justify-center text-center space-y-2 bg-white/70 rounded-2xl border border-dashed border-emerald-200">
                      <Lock className="h-8 w-8 text-emerald-500 animate-pulse" />
                      <div>
                        <h5 className="text-[11px] font-black text-emerald-900 uppercase tracking-widest">Penilaian Bersifat Confidential</h5>
                        <p className="text-[9.5px] text-emerald-555 max-w-md mt-1 mx-auto leading-relaxed">
                          Anda tidak memiliki otorisasi untuk melihat atau mengubah penilaian departemen ini. Skor hanya akan diakumulasikan ke nilai akhir setelah laporan ini di-Close oleh Admin.
                        </p>
                      </div>
                    </div>
                  ) : (
                    [
                      { label: "1. Kepatuhan Standar K3 (K3)", score: hseK3, set: setHseK3 },
                      { label: "2. Kelengkapan APD Layanan", score: hseApd, set: setHseApd },
                      { label: "3. Kepatuhan Safety Procedures", score: hseProcedure, set: setHseProcedure },
                      { label: "4. Nihil Temuan Safety (Audit)", score: hseTemuan, set: setHseTemuan },
                      { label: "5. Dokumentasi Form K3", score: hseDokumentasi, set: setHseDokumentasi },
                      { label: "6. Kepatuhan Lingkungan Organik", score: hseLingkungan, set: setHseLingkungan }
                    ].map((sld, idx) => (
                      <div key={idx} className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-100">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-extrabold text-slate-700">{sld.label}</span>
                          <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">{sld.score} ⭐</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          value={sld.score}
                          disabled={!isSectionEditable("hse")}
                          onChange={(e) => sld.set(parseInt(e.target.value))}
                          className="w-full h-1.5 focus:outline-none accent-emerald-600 cursor-pointer disabled:opacity-40"
                        />
                        <div className="flex justify-between text-[8px] text-slate-400">
                          <span>Sangat Buruk (1)</span>
                          <span>Sangat Baik (5)</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* C. GENERAL AFFAIR DEPARTMENT */}
              <div className="border border-slate-205 rounded-2xl overflow-hidden shadow-inner font-sans bg-slate-50/50">
                <div className="bg-indigo-600 text-white px-4 py-2 flex justify-between items-center bg-indigo-600">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wide">C. General Affair & Adm Department</span>
                    {evaluatorGa ? (
                      <span className="text-[10px] font-bold bg-white/20 text-white border border-white/10 px-1.5 py-0.5 rounded-lg flex items-center gap-1">
                        Penilai: {(() => {
                          const clean = (evaluatorGa || "").toString().trim().toLowerCase();
                          const found = systemUsers.find(u => 
                            u && (
                              (u.username && typeof u.username === 'string' && u.username.toLowerCase().trim() === clean) ||
                              (u.nama && typeof u.nama === 'string' && u.nama.toLowerCase().trim() === clean)
                            )
                          );
                          return found ? found.nama : evaluatorGa;
                        })()}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-white/10 text-indigo-100 px-1.5 py-0.5 rounded-lg">
                        Penilai: Terbuka untuk semua
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-white/20 rounded font-black">Weight: {weights.ga}%</span>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {!canSeeSectionScore({ status: evalStatus, evaluatorUser, evaluatorHse, evaluatorGa }, "ga") ? (
                    <div className="col-span-full py-8 flex flex-col items-center justify-center text-center space-y-2 bg-white/70 rounded-2xl border border-dashed border-indigo-200">
                      <Lock className="h-8 w-8 text-indigo-500 animate-pulse" />
                      <div>
                        <h5 className="text-[11px] font-black text-indigo-900 uppercase tracking-widest">Penilaian Bersifat Confidential</h5>
                        <p className="text-[9.5px] text-indigo-555 max-w-md mt-1 mx-auto leading-relaxed">
                          Anda tidak memiliki otorisasi untuk melihat atau mengubah penilaian departemen ini. Skor hanya akan diakumulasikan ke nilai akhir setelah laporan ini di-Close oleh Admin.
                        </p>
                      </div>
                    </div>
                  ) : (
                    [
                      { label: "1. Administrasi Kelengkapan Dokumen", score: gaAdministrasi, set: setGaAdministrasi },
                      { label: "2. Respons Kecepatan Komunikasi", score: gaRespons, set: setGaRespons },
                      { label: "3. Mutu Keramahan Pelayanan", score: gaPelayanan, set: setGaPelayanan },
                      { label: "4. Presisi Tagihan Invoice", score: gaKetepatan, set: setGaKetepatan },
                      { label: "5. Kepatuhan Syarat Kontrak", score: gaKontrak, set: setGaKontrak },
                      { label: "6. Dukungan Operasional Lapangan", score: gaOperasional, set: setGaOperasional }
                    ].map((sld, idx) => (
                      <div key={idx} className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-100">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-extrabold text-slate-700">{sld.label}</span>
                          <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">{sld.score} ⭐</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          value={sld.score}
                          disabled={!isSectionEditable("ga")}
                          onChange={(e) => sld.set(parseInt(e.target.value))}
                          className="w-full h-1.5 focus:outline-none accent-indigo-600 cursor-pointer disabled:opacity-40"
                        />
                        <div className="flex justify-between text-[8px] text-slate-400">
                          <span>Sangat Buruk (1)</span>
                          <span>Sangat Baik (5)</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Upload Proof & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl bg-slate-50 border p-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-750 block">Upload Bukti Pendukung (PDF/Gambar)</label>
                  <div className="relative border border-dashed border-slate-300 rounded-xl bg-white p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition">
                    <input
                      type="file"
                      id="eval-proof-file"
                      onChange={(e) => handleFileChange(e, "eval")}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept="image/*,application/pdf"
                    />
                    <Upload className="h-6 w-6 text-slate-400" />
                    <span className="text-[11px] font-bold text-indigo-650 mt-1.5">Pilih berkas pembuktian</span>
                    <span className="text-[9px] text-slate-400">Dimensi maks. 5MB</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-750 block">Catatan Tambahan Evaluator</label>
                  <textarea
                    value={evalCatatan}
                    onChange={(e) => setEvalCatatan(e.target.value)}
                    placeholder="Masukkan memo, rincian keluhan, atau feedback korektif untuk pihak vendor..."
                    rows={4}
                    className="w-full border p-2 bg-white rounded-xl text-xs outline-none"
                  ></textarea>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => {
                    resetEvalForm();
                    setActiveTab("evaluations");
                  }}
                  className="px-4 py-2 border hover:bg-slate-100 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Batalkan
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-705 text-white font-extrabold px-6 py-2 rounded-xl text-xs transition uppercase tracking-widest cursor-pointer select-none"
                >
                  Simpan Laporan Evaluasi
                </button>
              </div>
            </form>
          </div>

          {/* Side panel score preview card helper */}
          <div className="lg:col-span-4 bg-slate-910 p-5 rounded-3xl text-white border border-slate-800 shadow-xl space-y-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
                <span className="text-xs font-black uppercase text-indigo-400 tracking-wider">Hasil Rapor Simulasi</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-slate-800 rounded text-slate-350">Preview</span>
              </div>

              {/* Large central Nilai Akhir preview */}
              {(() => {
                const hasConfidentialSection = 
                  !canSeeSectionScore({ status: evalStatus, evaluatorUser, evaluatorHse, evaluatorGa }, "user") ||
                  !canSeeSectionScore({ status: evalStatus, evaluatorUser, evaluatorHse, evaluatorGa }, "hse") ||
                  !canSeeSectionScore({ status: evalStatus, evaluatorUser, evaluatorHse, evaluatorGa }, "ga");

                const finalScore = calcFinalScore({
                  userPrice, userQuality, userQuantity, userDelivery,
                  hseK3, hseApd, hseProcedure, hseTemuan, hseDokumentasi, hseLingkungan,
                  gaAdministrasi, gaRespons, gaPelayanan, gaKetepatan, gaKontrak, gaOperasional
                });
                const category = getCategoryClassAndLabel(finalScore);

                return (
                  <div className="text-center py-6">
                    <span className="block text-[11px] uppercase tracking-widest text-slate-400 font-bold">Estimasi Nilai Akhir</span>
                    {hasConfidentialSection ? (
                      <>
                        <span className="block text-2xl font-extrabold text-slate-400 mt-3 font-sans flex items-center justify-center gap-1.5">
                          <Lock className="h-5 w-5 text-indigo-400" /> CONFIDENTIAL
                        </span>
                        <span className="mt-3.5 inline-block px-3 py-1 rounded-full text-[10px] font-black tracking-wide border border-dashed border-slate-700 bg-slate-900 text-slate-400">
                          SELESAIKAN SEMUA PIC
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="block text-5xl font-black text-indigo-300 mt-2 font-mono">
                          {finalScore.toFixed(2)}
                        </span>
                        <span className={`mt-3.5 inline-block px-3 py-1 rounded-full text-xs font-black tracking-wide border font-sans ${category.color.replace("text-indigo-700 bg-indigo-50 border-indigo-200", "bg-indigo-500/15 text-indigo-300 border-indigo-500/30")}`}>
                          {category.label.toUpperCase()}
                        </span>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Sub components list values bars */}
              <div className="space-y-3 pt-3 border-t border-white/10 text-xs font-sans">
                {/* User Dept */}
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-300 font-bold">
                    <span>User Dept Score (x{weights.user}%)</span>
                    <span className="font-bold font-mono text-white">
                      {canSeeSectionScore({ status: evalStatus, evaluatorUser, evaluatorHse, evaluatorGa }, "user") 
                        ? calcUserScore({ userPrice, userQuality, userQuantity, userDelivery }).toFixed(2) 
                        : "🔒 Confidential"}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-purple-500 h-full transition-all duration-300" style={{ 
                      width: canSeeSectionScore({ status: evalStatus, evaluatorUser, evaluatorHse, evaluatorGa }, "user") 
                        ? `${(calcUserScore({ userPrice, userQuality, userQuantity, userDelivery }) / 5.0) * 100}%` 
                        : "0%" 
                    }}></div>
                  </div>
                </div>

                {/* HSE Dept */}
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-300 font-bold">
                    <span>HSE Dept Score (x{weights.hse}%)</span>
                    <span className="font-bold font-mono text-white">
                      {canSeeSectionScore({ status: evalStatus, evaluatorUser, evaluatorHse, evaluatorGa }, "hse") 
                        ? calcHseScore({ hseK3, hseApd, hseProcedure, hseTemuan, hseDokumentasi, hseLingkungan }).toFixed(2) 
                        : "🔒 Confidential"}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full transition-all duration-300" style={{ 
                      width: canSeeSectionScore({ status: evalStatus, evaluatorUser, evaluatorHse, evaluatorGa }, "hse") 
                        ? `${(calcHseScore({ hseK3, hseApd, hseProcedure, hseTemuan, hseDokumentasi, hseLingkungan }) / 5.0) * 100}%` 
                        : "0%" 
                    }}></div>
                  </div>
                </div>

                {/* GA Dept */}
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-300 font-bold">
                    <span>GA Dept Score (x{weights.ga}%)</span>
                    <span className="font-bold font-mono text-white">
                      {canSeeSectionScore({ status: evalStatus, evaluatorUser, evaluatorHse, evaluatorGa }, "ga") 
                        ? calcGaScore({ gaAdministrasi, gaRespons, gaPelayanan, gaKetepatan, gaKontrak, gaOperasional }).toFixed(2) 
                        : "🔒 Confidential"}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-400 h-full transition-all duration-300" style={{ 
                      width: canSeeSectionScore({ status: evalStatus, evaluatorUser, evaluatorHse, evaluatorGa }, "ga") 
                        ? `${(calcGaScore({ gaAdministrasi, gaRespons, gaPelayanan, gaKetepatan, gaKontrak, gaOperasional }) / 5.0) * 100}%` 
                        : "0%" 
                    }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated automated workflow notifications alerts */}
            <div className="bg-slate-800/60 p-3 rounded-2xl border border-white/5 space-y-2 text-[10px] leading-relaxed text-slate-300 font-sans">
              <span className="block font-black uppercase text-indigo-400 flex items-center gap-1">
                <Mail className="h-3 w-3 text-indigo-400" /> Alur Persetujuan & Notifikasi Email:
              </span>
              <p>Setiap kali nilai diganti ke <strong>Review</strong> atau <strong>Closed</strong>, sistem akan mengirimkan log notifikasi email otomatis ke PIC Departemen penilai & Vendor terkait secara mandiri.</p>
            </div>
          </div>

        </div>
      )}

      {/* 5. LAPORAN & REKAPITULASI PRINT OUT SECTION */}
      {activeTab === "reports" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          <div className="print:hidden bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
            <div>
              <h3 className="text-base font-black text-slate-800">Pusat Rapat & Laporan Kinerja Vendor</h3>
              <p className="text-xs text-slate-400">Ekspor laporan penilaian vendor berorientasi cetak, saring berdasarkan parameter terpilih.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
              {/* Penandatangan Selector */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 px-3 rounded-2xl text-xs">
                <span className="font-bold text-slate-500 whitespace-nowrap">Penandatangan:</span>
                <select
                  value={signerName}
                  onChange={(e) => handleSelectSigner(e.target.value)}
                  className="bg-white border border-slate-300 px-2.5 py-1.5 rounded-xl font-bold text-slate-800 text-xs outline-none max-w-[200px]"
                >
                  <option value={userRealName}>{userRealName} (Akun Login)</option>
                  {karyawanList
                    .filter(k => k.nama && k.nama.toLowerCase().trim() !== (userRealName || "").toLowerCase().trim())
                    .map(k => (
                      <option key={k.nama} value={k.nama}>
                        {k.nama} {k.jabatan ? `(${k.jabatan})` : ''}
                      </option>
                    ))}
                </select>
                <input
                  type="text"
                  placeholder="Jabatan Penandatangan"
                  value={signerJabatan}
                  onChange={(e) => setSignerJabatan(e.target.value)}
                  className="bg-white border border-slate-300 px-2.5 py-1.5 rounded-xl font-semibold text-slate-800 text-xs outline-none w-36"
                  title="Ubah Jabatan Penandatangan"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="px-3.5 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="h-4 w-4 text-slate-500" /> Ekspor Excel (CSV)
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="h-4 w-4" /> Cetak Laporan (A4 PDF)
                </button>
              </div>
            </div>
          </div>

          {/* Printable visual frame wrapping */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 max-w-4xl mx-auto printable-report print:p-0 print:border-none print:shadow-none print:max-w-full">
            {/* Kop Laporan Header */}
            <div className="border-b-4 border-slate-900 pb-5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <img
                  src="https://lh3.googleusercontent.com/d/1zE6dEUc98zDbaIVKBwfVDGX_s2abcmz_"
                  alt="Corporate Logo"
                  className="h-10 object-contain"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h2 className="text-base font-black text-slate-900 uppercase leading-none">PT INDOTRUCK UTAMA</h2>
                  <p className="text-[10px] text-slate-500 font-extrabold tracking-wider mt-0.5">Procurement & HSE Vendor Alignment Panel</p>
                </div>
              </div>

              <div className="text-right">
                <span className="block text-[11px] font-black uppercase text-slate-900 tracking-wide border border-slate-900 px-2 py-0.5 rounded">LAPORAN REKAPITULASI EVALUASI</span>
                <span className="text-[9px] text-slate-400 font-bold font-mono">Printed on: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
              </div>
            </div>

            {/* Quick Summary row metrics */}
            <div className="grid grid-cols-4 justify-between text-center bg-slate-50 border p-3 rounded-2xl text-[10px]">
              <div>
                <span className="block text-slate-400 uppercase tracking-widest text-[8px] font-bold">TOTAL VENDOR</span>
                <span className="block font-black text-slate-800 text-base">{vendors.length}</span>
              </div>
              <div className="border-l">
                <span className="block text-emerald-650 uppercase tracking-widest text-[8px] font-bold">SANGAT MEMUASKAN</span>
                <span className="block font-black text-emerald-700 text-base">{countByCategory("Sangat Memuaskan")}</span>
              </div>
              <div className="border-l">
                <span className="block text-indigo-650 uppercase tracking-widest text-[8px] font-bold">MEMUASKAN</span>
                <span className="block font-black text-indigo-700 text-base">{countByCategory("Memuaskan")}</span>
              </div>
              <div className="border-l">
                <span className="block text-rose-650 uppercase tracking-widest text-[8px] font-bold">PERBAIKAN</span>
                <span className="block font-black text-rose-700 text-base">{countByCategory("Perlu Perbaikan")}</span>
              </div>
            </div>

            {/* Main Table for the printable report */}
            <table className="w-full text-left border-collapse text-xs border">
              <thead>
                <tr className="bg-slate-100 text-slate-805 font-bold uppercase text-[9px] border-b">
                  <th className="py-2.5 px-3 border-r w-10 text-center">No</th>
                  <th className="py-2.5 px-3 border-r">Kode</th>
                  <th className="py-1 px-3 border-r">Nama Vendor</th>
                  <th className="py-1 px-3 border-r">Kategori</th>
                  <th className="py-1 px-3 border-r text-center w-20">User Score</th>
                  <th className="py-1 px-3 border-r text-center w-20">HSE Score</th>
                  <th className="py-1 px-3 border-r text-center w-20">GA Score</th>
                  <th className="py-1 px-3 border-r text-center w-20">Final Score</th>
                  <th className="py-1 px-3 text-center">Status Akhir</th>
                </tr>
              </thead>
              <tbody className="divide-y text-[10.5px]">
                {vendorsWithScores.map((v, idx) => {
                  const sc = getVendorLatestScoreInfo(v.kode);
                  return (
                    <tr key={v.kode}>
                      <td className="py-2.5 px-3 border-r text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-3 border-r font-mono font-bold text-slate-700">{v.kode}</td>
                      <td className="py-2.5 px-3 border-r font-bold text-slate-800">{v.nama}</td>
                      <td className="py-2.5 px-3 border-r text-slate-500">{v.kategori}</td>
                      <td className="py-2.5 px-3 border-r text-center font-mono font-semibold">{sc.empty ? "-" : sc.user.toFixed(2)}</td>
                      <td className="py-2.5 px-3 border-r text-center font-mono font-semibold">{sc.empty ? "-" : sc.hse.toFixed(2)}</td>
                      <td className="py-2.5 px-3 border-r text-center font-mono font-semibold">{sc.empty ? "-" : sc.ga.toFixed(2)}</td>
                      <td className="py-2.5 px-3 border-r text-center font-mono font-black text-indigo-700 bg-indigo-50/20">{sc.empty ? "-" : sc.final.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-center">
                        {sc.empty ? (
                          <span className="text-slate-400 italic text-[9px]">Belum Evaluasi</span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded font-black text-[8.5px] border ${sc.color}`}>
                            {sc.label.toUpperCase()}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Report Sign off Footer inside Printable report */}
            <div className="pt-8 flex justify-between text-xs" style={{ breakInside: "avoid" }}>
              <div></div>
              <div className="text-center w-64">
                <p className="text-[10px] text-slate-500 font-medium">Dibuat dan Disahkan di Tanjung</p>
                {/* Space for physical signature */}
                <div className="h-16"></div>
                {/* Signature line right on top of name */}
                <div className="border-b border-black w-48 mx-auto mb-1"></div>
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-900 uppercase tracking-wide leading-tight">{signerName || userRealName || "MUHAMMAD RIFKI HIDAYAT"}</p>
                  <p className="text-[10px] text-slate-600 font-semibold uppercase leading-tight">{signerJabatan || "HSE OFFICER"}</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* 6. MODALS DIALOGS BACKEND ACTIONS POPUPS */}
      {/* ======================================================== */}

      {/* A. VENDOR REGISTER MODAL */}
      {isVendorModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-black text-slate-801">
                {selectedVendor ? `Ubah Data Vendor [${vendorKode}]` : "Masukkan Data Vendor Baru"}
              </h3>
              <button onClick={() => setIsVendorModalOpen(false)} className="text-slate-400 hover:text-slate-705">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVendor} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block">Kode Vendor *</label>
                  <input
                    type="text"
                    required
                    value={vendorKode}
                    disabled={!!selectedVendor}
                    placeholder="Contoh: INDO-001"
                    onChange={(e) => setVendorKode(e.target.value)}
                    className="w-full border p-2 bg-slate-50 focus:bg-white rounded-xl outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block">Nama Vendor *</label>
                  <input
                    type="text"
                    required
                    value={vendorNama}
                    placeholder="Nama Badan Usaha / PT / CV"
                    onChange={(e) => setVendorNama(e.target.value)}
                    className="w-full border p-2 bg-slate-50 focus:bg-white rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block">Kategori Pembiayaan / Vendor</label>
                  {isCustomCategory ? (
                    <div className="flex gap-1.5 items-center">
                      <input
                        type="text"
                        required
                        value={customCategoryName}
                        onChange={(e) => setCustomCategoryName(e.target.value)}
                        placeholder="Nama kategori baru..."
                        className="flex-1 border p-2.5 bg-slate-50 focus:bg-white rounded-xl outline-none text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomCategory(false);
                          setCustomCategoryName("");
                          setVendorKat("Supplier APD");
                        }}
                        className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition shrink-0"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <select
                      value={vendorKat}
                      onChange={(e) => {
                        if (e.target.value === "NEW_CATEGORY") {
                          setIsCustomCategory(true);
                          setCustomCategoryName("");
                        } else {
                          setVendorKat(e.target.value);
                        }
                      }}
                      className="w-full border p-2.5 bg-slate-50 rounded-xl outline-none text-xs"
                    >
                      {allCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="NEW_CATEGORY" className="text-indigo-600 font-bold">+ Tambah Kategori Baru...</option>
                    </select>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block">PIC Pendamping Vendor</label>
                  <input
                    type="text"
                    value={vendorPic}
                    placeholder="Nama PIC Utama"
                    onChange={(e) => setVendorPic(e.target.value)}
                    className="w-full border p-2 bg-slate-50 focus:bg-white rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1 col-span-1">
                  <label className="font-bold text-slate-600 block">Nomor Telepon</label>
                  <input
                    type="text"
                    value={vendorTel}
                    placeholder="No WhatsApp / Hp"
                    onChange={(e) => setVendorTel(e.target.value)}
                    className="w-full border p-2 bg-slate-50 focus:bg-white rounded-xl outline-none"
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="font-bold text-slate-600 block">Alamat Email Korespondensi</label>
                  <input
                    type="email"
                    value={vendorEmail}
                    placeholder="pic@vendor-perusahaan.com"
                    onChange={(e) => setVendorEmail(e.target.value)}
                    className="w-full border p-2 bg-slate-50 focus:bg-white rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block">No. Kontrak Kerja</label>
                  <input
                    type="text"
                    value={vendorNoKontrak}
                    placeholder="Contoh: No_01/MCU/SHE/ITU/2026"
                    onChange={(e) => setVendorNoKontrak(e.target.value)}
                    className="w-full border p-2 bg-slate-50 focus:bg-white rounded-xl outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block">Masa Berlaku Akhir Kontrak</label>
                  <input
                    type="date"
                    value={vendorMasaBerlaku}
                    onChange={(e) => setVendorMasaBerlaku(e.target.value)}
                    className="w-full border p-2 bg-slate-50 focus:bg-white rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block">Status Operasional</label>
                  <div className="flex gap-4 pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="status_radio"
                        checked={vendorStatus === "Aktif"}
                        onChange={() => setVendorStatus("Aktif")}
                        className="accent-indigo-600 h-4 w-4"
                      />
                      <span>Masa Aktif</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="status_radio"
                        checked={vendorStatus === "Non Aktif"}
                        onChange={() => setVendorStatus("Non Aktif")}
                        className="accent-indigo-600 h-4 w-4"
                      />
                      <span className="text-slate-500 font-bold">Non Aktif</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-600 block">Alamat Kantor Vendor</label>
                  <input
                    type="text"
                    value={vendorAlamat}
                    placeholder="Alamat Lengkap Perusahaan"
                    onChange={(e) => setVendorAlamat(e.target.value)}
                    className="w-full border p-2 bg-slate-50 focus:bg-white rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1 bg-slate-50 p-3 rounded-2xl border">
                <label className="font-bold text-slate-700 block mb-1">Upload Dokumen Pendukung Vendor (PDF/Gambar)</label>
                <div className="flex items-center gap-3">
                  <div className="relative border border-dashed border-slate-300 rounded-lg p-2 flex-grow bg-white text-center cursor-pointer hover:bg-slate-50">
                    <input
                      type="file"
                      onChange={(e) => handleFileChange(e, "vendor")}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      accept=".pdf,image/*"
                    />
                    <span className="text-[11px] text-indigo-700 font-bold">Pilih berkas profil vendor</span>
                  </div>
                  {vendorDocBase64 && <span className="text-[9px] text-emerald-600 font-mono italic shrink-0 font-bold">Ready</span>}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsVendorModalOpen(false)}
                  className="px-4 py-2 border rounded-xl hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-705 text-white font-bold rounded-xl"
                >
                  {loading ? "Menyimpan data..." : "Simpan Vendor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* B. BOBOT PENILAIAN MODAL MANAGEMENT */}
      {isWeightModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 font-sans">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-black text-slate-805 flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-indigo-600" /> Konfigurasi Bobot Penilaian (ERP)
              </h3>
              <button onClick={() => setIsWeightModalOpen(false)} className="text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWeights} className="space-y-4 text-xs font-sans">
              <p className="text-slate-500 italic">Nilai total persentase bobot wajib bernilai tepat 100%.</p>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>1. User Department</span>
                    <span>{weights.user}%</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={weights.user}
                    onChange={(e) => setWeights({ ...weights, user: parseInt(e.target.value) || 0 })}
                    className="w-full border p-2 rounded-xl bg-slate-50"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>2. HSE Department (Safety)</span>
                    <span>{weights.hse}%</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={weights.hse}
                    onChange={(e) => setWeights({ ...weights, hse: parseInt(e.target.value) || 0 })}
                    className="w-full border p-2 rounded-xl bg-slate-50"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>3. General Affair</span>
                    <span>{weights.ga}%</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={weights.ga}
                    onChange={(e) => setWeights({ ...weights, ga: parseInt(e.target.value) || 0 })}
                    className="w-full border p-2 rounded-xl bg-slate-50"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-2 text-center rounded-xl border font-black text-indigo-700">
                Total Persentase: {weights.user + weights.hse + weights.ga}% / 100%
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsWeightModalOpen(false)}
                  className="px-4 py-2 border rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-705 text-white font-bold rounded-xl"
                >
                  Simpan Bobot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
