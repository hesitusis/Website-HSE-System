import React, { useState, useEffect, useMemo } from 'react';
import { Award, UserCheck, Calendar, FileText, Search, RefreshCw, UploadCloud, ArrowLeft, CheckCircle2, AlertCircle, Edit2, Trash2, X, Eye, Users, ChevronRight } from 'lucide-react';
import { formatTanggalIndonesia, kompresDanProsesFile } from '../utils.js';
import { TrainingRecord } from '../types.js';
import { PageHeader } from './common/index.js';

interface TrainingManagerProps {
  userRealName: string;
  activeSite?: string;
  userRole?: 'admin' | 'operator';
  onBack: () => void;
}

export default function TrainingManager({ userRealName, activeSite, userRole = 'admin', onBack }: TrainingManagerProps) {
  const targetSite = activeSite && activeSite !== 'ALL' ? activeSite : 'ITU-Admo';
  const [namaKaryawan, setNamaKaryawan] = useState('');
  const [nrp, setNrp] = useState('');
  const [trainingName, setTrainingName] = useState('');
  const [tglPelaksanaan, setTglPelaksanaan] = useState('');
  const [tglExpired, setTglExpired] = useState('');
  const [selamanya, setSelamanya] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [existingSertifikatUrl, setExistingSertifikatUrl] = useState('-');

  // State for user custom training types and form controls
  const [customTypes, setCustomTypes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("custom_training_types");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showAddTypeForm, setShowAddTypeForm] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  // Save custom training types to localStorage
  useEffect(() => {
    localStorage.setItem("custom_training_types", JSON.stringify(customTypes));
  }, [customTypes]);

  // State for deleted training types (to allow hiding/deleting any type)
  const [deletedTypes, setDeletedTypes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("deleted_training_types");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save deleted training types to localStorage
  useEffect(() => {
    localStorage.setItem("deleted_training_types", JSON.stringify(deletedTypes));
  }, [deletedTypes]);

  const [karyawanList, setKaryawanList] = useState<string[]>([]);
  const [karyawanDetailList, setKaryawanDetailList] = useState<any[]>([]);
  const [trainingList, setTrainingList] = useState<TrainingRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Category Monitoring sub-tabs states
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'category' | 'exempted'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [detailTab, setDetailTab] = useState<'registered' | 'unregistered'>('registered');

  // Unregistered / Not inputted training states
  const [unregisteredSelectedTraining, setUnregisteredSelectedTraining] = useState<string>('');
  const [unregisteredSearchTerm, setUnregisteredSearchTerm] = useState<string>('');
  const [unregisteredSortField, setUnregisteredSortField] = useState<'nama' | 'nik' | 'dept' | null>(null);
  const [unregisteredSortOrder, setUnregisteredSortOrder] = useState<'asc' | 'desc'>('asc');

  // Sorting states
  const [sortField, setSortField] = useState<'nama' | 'nrp' | 'training' | 'tglPelaksanaan' | 'tglExpired' | 'status' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [detailSortField, setDetailSortField] = useState<'nama' | 'nrp' | 'tglPelaksanaan' | 'tglExpired' | 'status' | null>(null);
  const [detailSortOrder, setDetailSortOrder] = useState<'asc' | 'desc'>('asc');

  const [categorySortMode, setCategorySortMode] = useState<'name_asc' | 'name_desc' | 'total_desc' | 'active_desc' | 'expired_desc'>('name_asc');

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [isKaryawanDropdownOpen, setIsKaryawanDropdownOpen] = useState(false);
  const [isTrainingDropdownOpen, setIsTrainingDropdownOpen] = useState(false);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'pdf' | 'image' | null>(null);

  const [exemptions, setExemptions] = useState<any[]>([]);

  const fetchExemptions = async () => {
    try {
      const res = await fetch("/api/training-exemptions");
      const d = await res.json();
      if (d.success) {
        setExemptions(d.list || []);
      }
    } catch (err) {
      console.error("Gagal memuat daftar pengecualian:", err);
    }
  };

  useEffect(() => {
    fetchKaryawanList();
    fetchTrainingList();
    fetchExemptions();
  }, []);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      setPreviewType(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    if (selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setPreviewType('pdf');
    } else {
      setPreviewType('image');
    }
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedFile]);

  const convertToInputDate = (ddMMyyyy: string) => {
    if (!ddMMyyyy || ddMMyyyy === "-") return "";
    const parts = ddMMyyyy.split("/");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return "";
  };

  const handleStartEdit = (item: any) => {
    setEditingRowId(String(item.rowId));
    const matchedKaryawanOption = karyawanList.find(k => k.includes(item.nrp) || k === item.nama) || `${item.nrp} - ${item.nama}`;
    setNamaKaryawan(matchedKaryawanOption);
    setNrp(item.nrp);
    setTrainingName(item.training);
    setTglPelaksanaan(convertToInputDate(item.tglPelaksanaan));
    if (item.tglExpired === "-") {
      setSelamanya(true);
      setTglExpired('');
    } else {
      setSelamanya(false);
      setTglExpired(convertToInputDate(item.tglExpired));
    }
    setExistingSertifikatUrl(item.sertifikatUrl || '-');
    setSelectedFile(null);
    setFeedback(null);
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setNamaKaryawan('');
    setNrp('');
    setTrainingName('');
    setTglPelaksanaan('');
    setTglExpired('');
    setSelamanya(false);
    setExistingSertifikatUrl('-');
    setSelectedFile(null);
    setFeedback(null);
  };

  const handleDelete = async (rowId: string, training: string, nama: string) => {
    const displayName = nama.includes(" - ") ? nama.split(" - ")[1] : nama;
    if (!window.confirm(`Apakah Anda yakin ingin menghapus data kualifikasi training "${training}" untuk ${displayName}?`)) {
      return;
    }
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/training/${rowId}`, {
        method: "DELETE"
      });
      const d = await res.json();
      if (d.success) {
        setFeedback({ type: 'success', msg: d.message || "Data kualifikasi training berhasil dihapus!" });
        fetchTrainingList();
        if (editingRowId === String(rowId)) {
          handleCancelEdit();
        }
      } else {
        setFeedback({ type: 'error', msg: d.message || "Gagal menghapus data training." });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: "Kesalahan jaringan: " + err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExemptKaryawan = async (nama: string, training: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin mengecualikan karyawan "${nama}" dari training "${training}"?\nNama karyawan ini tidak akan lagi muncul di daftar "Belum Training" untuk jenis training ini.`)) {
      return;
    }
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/training-exemptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ nama, training })
      });
      const d = await res.json();
      if (d.success) {
        setFeedback({ type: 'success', msg: `Karyawan "${nama}" berhasil dikecualikan dari training "${training}".` });
        await fetchExemptions();
      } else {
        setFeedback({ type: 'error', msg: d.message || "Gagal mengecualikan karyawan." });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: "Kesalahan jaringan: " + err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveExemption = async (nama: string, training: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin membatalkan pengecualian training "${training}" untuk ${nama}?\nKaryawan ini akan kembali muncul di daftar "Belum Training" jika belum mengikutinya.`)) {
      return;
    }
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/training-exemptions", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ nama, training })
      });
      const d = await res.json();
      if (d.success) {
        setFeedback({ type: 'success', msg: `Pengecualian training berhasil dibatalkan untuk ${nama}.` });
        await fetchExemptions();
      } else {
        setFeedback({ type: 'error', msg: d.message || "Gagal membatalkan pengecualian." });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: "Kesalahan jaringan: " + err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchKaryawanList = async () => {
    try {
      const res = await fetch("/api/karyawan");
      const d = await res.json();
      if (d.success) {
        setKaryawanList(d.karyawan);
        if (d.karyawanDetail) {
          setKaryawanDetailList(d.karyawanDetail);
        }
      }
    } catch (e) {
      console.error("Gagal memuat karyawan", e);
    }
  };

  const fetchTrainingList = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/training");
      const d = await res.json();
      if (d.data) {
        setTrainingList(d.data);
      }
    } catch (e) {
      console.error("Gagal memuat training list", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKaryawanChange = (selectedVal: string) => {
    setNamaKaryawan(selectedVal);
    
    // Cari detail karyawan dari list untuk otomatis isi NRP/ID
    const matched = karyawanDetailList.find(
      (k) => k.nama && k.nama.toLowerCase() === selectedVal.toLowerCase()
    );
    
    if (matched) {
      setNrp(matched.nik || '');
    } else if (selectedVal && selectedVal.includes(" - ")) {
      const parts = selectedVal.split(" - ");
      setNrp(parts[0]);
    } else {
      setNrp('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaKaryawan) {
      alert("Mohon pilih nama karyawan!");
      return;
    }
    if (!trainingName) {
      alert("Mohon isi jenis training!");
      return;
    }
    if (!tglPelaksanaan) {
      alert("Mohon tentukan tanggal pelaksanaan!");
      return;
    }
    if (!selamanya && !tglExpired) {
      alert("Mohon tentukan tanggal berakhir sertifikat!");
      return;
    }

    const confirmMessage = editingRowId 
      ? `Perbarui kualifikasi training "${trainingName}" untuk ${namaKaryawan}?` 
      : `Simpan kualifikasi training "${trainingName}" untuk ${namaKaryawan}?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsSubmitLoading(true);
    setFeedback(null);

    try {
      let fileDataPayload: { data: string; name: string } | null = null;
      if (selectedFile) {
        fileDataPayload = await kompresDanProsesFile(selectedFile);
      }

      const formattedPelaksanaan = tglPelaksanaan.split('-').reverse().join('/');
      const formattedExpired = selamanya ? "-" : tglExpired.split('-').reverse().join('/');

      const res = await fetch("/api/training/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: namaKaryawan,
          nrp,
          training: trainingName,
          tglPelaksanaan: formattedPelaksanaan,
          tglExpired: formattedExpired,
          fileData: fileDataPayload,
          userName: userRealName,
          rowId: editingRowId,
          existingSertifikatUrl,
          site: targetSite
        })
      });

      const d = await res.json();
      if (d.success) {
        setFeedback({ type: 'success', msg: d.message });
        handleCancelEdit();
        const fileInput = document.getElementById("trainFile") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
        
        fetchTrainingList();
      } else {
        setFeedback({ type: 'error', msg: d.message || "Gagal menyimpan data training." });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', msg: "Kesalahan jaringan: " + err.message });
    } finally {
      setIsSubmitLoading(false);
    }
  };

  // Status computation for certifications
  const getSertifikatStatus = (tglExpStr: string) => {
    if (!tglExpStr || tglExpStr === "-") return { text: "Selamanya", color: "bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold" };
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const parts = tglExpStr.split("/");
      if (parts.length !== 3) return { text: "Invalid Format", color: "bg-red-50 text-red-500" };

      const expDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      const diffTime = expDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        return { text: "Expired", color: "bg-rose-50 text-rose-700 border border-rose-200 font-bold" };
      } else if (diffDays <= 90) {
        return { text: `Akan Expired (${diffDays} Hari)`, color: "bg-amber-50 text-amber-850 border border-amber-200 font-bold" };
      } else {
        return { text: "Aktif", color: "bg-emerald-50 text-emerald-700 border border-emerald-250 font-bold" };
      }
    } catch (e) {
      return { text: "Error Date", color: "bg-red-100 text-red-600" };
    }
  };

  // Date parsing utility for sorting
  const parseDDMMYYYY = (dateStr: string): number => {
    if (!dateStr || dateStr === "-") return 9999999999999; // Far future
    const parts = dateStr.split("/");
    if (parts.length !== 3) return 0;
    try {
      const d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      return d.getTime();
    } catch (e) {
      return 0;
    }
  };

  // Status scoring helper for sorting
  const getStatusScore = (tglExpStr: string): number => {
    const status = getSertifikatStatus(tglExpStr);
    if (status.text === "Expired") return 0;
    if (status.text.startsWith("Akan Expired")) return 1;
    if (status.text === "Aktif") return 2;
    return 3; // "Selamanya" or other
  };

  // Site-filtered training list for operators
  const siteFilteredTrainingList = useMemo(() => {
    return trainingList.filter(item => {
      if (userRole === 'operator' && activeSite && activeSite !== 'ALL') {
        const itemSite = item.site || 'ITU-Admo';
        if (itemSite.toLowerCase() !== activeSite.toLowerCase()) return false;
      }
      return true;
    });
  }, [trainingList, userRole, activeSite]);

  // Simple key filtering and sorting
  const filteredList = useMemo(() => {
    const k = searchTerm.toLowerCase();
    const filtered = siteFilteredTrainingList.filter((item) => {
      return (
        item.nama.toLowerCase().includes(k) ||
        item.training.toLowerCase().includes(k) ||
        item.nrp.toLowerCase().includes(k)
      );
    });

    if (!sortField) return filtered;

    return [...filtered].sort((a, b) => {
      let valA: any = a[sortField as keyof TrainingRecord] || '';
      let valB: any = b[sortField as keyof TrainingRecord] || '';

      if (sortField === 'tglPelaksanaan' || sortField === 'tglExpired') {
        const timeA = parseDDMMYYYY(valA);
        const timeB = parseDDMMYYYY(valB);
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }

      if (sortField === 'status') {
        const scoreA = getStatusScore(a.tglExpired);
        const scoreB = getStatusScore(b.tglExpired);
        return sortOrder === 'asc' ? scoreA - scoreB : scoreB - scoreA;
      }

      // Default string comparison
      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [siteFilteredTrainingList, searchTerm, sortField, sortOrder]);

  // Group training list by training type
  const trainingGroups = useMemo(() => {
    const groups: Record<string, {
      name: string;
      records: TrainingRecord[];
      activeCount: number;
      expiredCount: number;
      warningCount: number;
    }> = {};

    const predefined = [
      "BASIC LIFE SUPPORT",
      "BASIC FIRE FIGHTER",
      "K3 UMUM",
      "K3 MANDATORI",
      "WORKING AT HEIGHT",
      "CONFINED SPACE",
      "SCAFFOLDING",
      "FIRST AID",
      "OPERATOR CRANE",
      "OPERATOR FORKLIFT",
      "LOGOUT / TAGOUT (LOTO)",
      "SAFE DRIVING / DEFENSIVE DRIVING"
    ];

    // Combine predefined + customTypes + trainingList names to ensure they are all initialized
    const allCategories = Array.from(new Set([
      ...predefined,
      ...customTypes,
      ...siteFilteredTrainingList.map(item => String(item.training || '').trim().toUpperCase()).filter(Boolean)
    ])).filter(cat => !deletedTypes.includes(cat.trim().toUpperCase()));

    allCategories.forEach(cat => {
      const normName = cat.trim().toUpperCase();
      if (!normName) return;
      groups[normName] = {
        name: cat,
        records: [],
        activeCount: 0,
        expiredCount: 0,
        warningCount: 0
      };
    });

    siteFilteredTrainingList.forEach(item => {
      const normName = String(item.training || '').trim().toUpperCase();
      if (!normName) return;
      if (deletedTypes.includes(normName)) return;

      if (!groups[normName]) {
        groups[normName] = {
          name: item.training || normName,
          records: [],
          activeCount: 0,
          expiredCount: 0,
          warningCount: 0
        };
      }

      groups[normName].records.push(item);

      const status = getSertifikatStatus(item.tglExpired);
      if (status.text === "Aktif" || status.text === "Selamanya") {
        groups[normName].activeCount++;
      } else if (status.text === "Expired") {
        groups[normName].expiredCount++;
      } else {
        groups[normName].warningCount++;
      }
    });

    return Object.values(groups);
  }, [siteFilteredTrainingList, customTypes, deletedTypes]);

  // Compute unregistered employees for selected training
  const unregisteredList = useMemo(() => {
    if (!unregisteredSelectedTraining) return [];
    
    const group = trainingGroups.find(g => g.name.toUpperCase() === unregisteredSelectedTraining.toUpperCase());
    const participantNrpSet = new Set(
      group ? group.records.map(r => String(r.nrp || '').trim().toLowerCase()) : []
    );
    const participantNameSet = new Set(
      group ? group.records.map(r => String(r.nama || '').trim().toLowerCase()) : []
    );
    
    const activeExemptedNames = new Set(
      exemptions
        .filter(e => e.training.toUpperCase().trim() === unregisteredSelectedTraining.toUpperCase().trim())
        .map(e => e.nama.toLowerCase().trim())
    );
    
    return karyawanDetailList.filter(emp => {
      const empNik = String(emp.nik || '').trim().toLowerCase();
      const empNama = String(emp.nama || '').trim().toLowerCase();
      
      const hasNrpMatch = empNik ? participantNrpSet.has(empNik) : false;
      const hasNameMatch = empNama ? participantNameSet.has(empNama) : false;
      const isExempted = activeExemptedNames.has(empNama);
      
      return !hasNrpMatch && !hasNameMatch && !isExempted;
    });
  }, [karyawanDetailList, trainingGroups, unregisteredSelectedTraining, exemptions]);

  const unregisteredPredefinedOptions = useMemo(() => {
    const predefined = [
      "BASIC LIFE SUPPORT",
      "BASIC FIRE FIGHTER",
      "K3 UMUM",
      "K3 MANDATORI",
      "WORKING AT HEIGHT",
      "CONFINED SPACE",
      "SCAFFOLDING",
      "FIRST AID",
      "OPERATOR CRANE",
      "OPERATOR FORKLIFT",
      "LOGOUT / TAGOUT (LOTO)",
      "SAFE DRIVING / DEFENSIVE DRIVING"
    ];
    const uniqueExisting = Array.from(
      new Set(trainingList.map((t) => String(t.training || '')).filter(Boolean))
    ) as string[];
    return Array.from(new Set([...predefined, ...customTypes, ...uniqueExisting]))
      .filter(opt => !deletedTypes.includes(opt.trim().toUpperCase()))
      .sort();
  }, [trainingList, customTypes, deletedTypes]);

  useEffect(() => {
    if (!unregisteredSelectedTraining && unregisteredPredefinedOptions.length > 0) {
      setUnregisteredSelectedTraining(unregisteredPredefinedOptions[0]);
    }
  }, [unregisteredPredefinedOptions, unregisteredSelectedTraining]);

  // Filter and Sort unregistered list
  const filteredAndSortedUnregistered = useMemo(() => {
    let result = [...unregisteredList];
    
    // Search
    if (unregisteredSearchTerm) {
      const q = unregisteredSearchTerm.toLowerCase();
      result = result.filter(emp => 
        (emp.nama || '').toLowerCase().includes(q) ||
        (emp.nik || '').toLowerCase().includes(q) ||
        (emp.dept || '').toLowerCase().includes(q)
      );
    }
    
    // Sort
    if (unregisteredSortField) {
      result.sort((a, b) => {
        let valA = a[unregisteredSortField as keyof typeof a] || '';
        let valB = b[unregisteredSortField as keyof typeof b] || '';
        
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
        
        if (valA < valB) return unregisteredSortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return unregisteredSortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return result;
  }, [unregisteredList, unregisteredSearchTerm, unregisteredSortField, unregisteredSortOrder]);

  // Compute unregistered employees specifically for the currently selected category
  const unregisteredForSelectedCategory = useMemo(() => {
    if (!selectedCategory) return [];
    
    const group = trainingGroups.find(g => g.name.toUpperCase() === selectedCategory.toUpperCase());
    const participantNrpSet = new Set(
      group ? group.records.map(r => String(r.nrp || '').trim().toLowerCase()) : []
    );
    const participantNameSet = new Set(
      group ? group.records.map(r => String(r.nama || '').trim().toLowerCase()) : []
    );
    
    const activeExemptedNames = new Set(
      exemptions
        .filter(e => e.training.toUpperCase().trim() === selectedCategory.toUpperCase().trim())
        .map(e => e.nama.toLowerCase().trim())
    );
    
    return karyawanDetailList.filter(emp => {
      const empNik = String(emp.nik || '').trim().toLowerCase();
      const empNama = String(emp.nama || '').trim().toLowerCase();
      
      const hasNrpMatch = empNik ? participantNrpSet.has(empNik) : false;
      const hasNameMatch = empNama ? participantNameSet.has(empNama) : false;
      const isExempted = activeExemptedNames.has(empNama);
      
      return !hasNrpMatch && !hasNameMatch && !isExempted;
    });
  }, [karyawanDetailList, trainingGroups, selectedCategory, exemptions]);

  const handleSort = (field: 'nama' | 'nrp' | 'training' | 'tglPelaksanaan' | 'tglExpired' | 'status') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleDetailSort = (field: 'nama' | 'nrp' | 'tglPelaksanaan' | 'tglExpired' | 'status') => {
    if (detailSortField === field) {
      setDetailSortOrder(detailSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setDetailSortField(field);
      setDetailSortOrder('asc');
    }
  };

  const handleUnregisteredSort = (field: 'nama' | 'nik' | 'dept') => {
    if (unregisteredSortField === field) {
      setUnregisteredSortOrder(unregisteredSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setUnregisteredSortField(field);
      setUnregisteredSortOrder('asc');
    }
  };

  const handleInputFromUnregistered = (empName: string, selectedTr: string) => {
    setNamaKaryawan(empName);
    handleKaryawanChange(empName);
    setTrainingName(selectedTr);
    
    // Smooth scroll to training input card form
    const formHeading = document.querySelector('form');
    if (formHeading) {
      formHeading.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const renderSortableHeader = (
    label: string,
    field: any,
    currentField: any,
    currentOrder: any,
    onSort: (f: any) => void
  ) => {
    const isSorted = currentField === field;
    return (
      <th 
        onClick={() => onSort(field)}
        className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 transition select-none group border-b border-slate-150"
      >
        <div className="flex items-center gap-1 font-extrabold text-slate-700">
          <span>{label}</span>
          <span className="text-slate-500 text-[10px] flex items-center font-bold">
            {isSorted ? (
              currentOrder === 'asc' ? ' ▲' : ' ▼'
            ) : (
              <span className="opacity-30 group-hover:opacity-80 transition"> ↕</span>
            )}
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Manajemen Training Karyawan"
        subtitle="Pencatatan pelatihan kepatuhan keselamatan (K3) serta monitoring validitas sertifikat kualifikasi."
        onBack={onBack}
        icon={<Award className="h-6 w-6 text-emerald-600" />}
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
        {/* Registration Form */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-2 flex justify-between items-center">
            <span>{editingRowId ? 'Edit Data Training Karyawan' : 'Tambah Data Training Karyawan'}</span>
            {editingRowId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-rose-500 hover:text-rose-700 font-semibold text-xs flex items-center gap-1 cursor-pointer"
              >
                <X className="h-3 w-3" /> Batal
              </button>
            )}
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
                      const query = namaKaryawan.toLowerCase();
                      const filtered = karyawanDetailList.length > 0
                        ? karyawanDetailList.filter(k => 
                            (k.nama || "").toLowerCase().includes(query) ||
                            (k.nik || "").toLowerCase().includes(query)
                          )
                        : karyawanList.filter(k => k.toLowerCase().includes(query)).map(name => ({ nama: name, nik: '' }));

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
                              {k.nik && (
                                <div className="text-xs text-slate-400 font-mono">{k.nik} - {k.dept || 'No Jabatan'}</div>
                              )}
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
                  onChange={(e) => setNrp(e.target.value)}
                  placeholder="ID Karyawan"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500 outline-none font-mono"
                />
              </div>
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                  Jenis Training <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={trainingName}
                  onChange={(e) => {
                    setTrainingName(e.target.value);
                    setIsTrainingDropdownOpen(true);
                  }}
                  onFocus={() => setIsTrainingDropdownOpen(true)}
                  onBlur={() => {
                    setTimeout(() => setIsTrainingDropdownOpen(false), 200);
                  }}
                  placeholder="Contoh: K3 Umum / Crane"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none transition"
                  required
                />

                {isTrainingDropdownOpen && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100">
                    {(() => {
                      const query = trainingName.toLowerCase();
                      const predefined = [
                        "BASIC LIFE SUPPORT",
                        "BASIC FIRE FIGHTER",
                        "K3 UMUM",
                        "K3 MANDATORI",
                        "WORKING AT HEIGHT",
                        "CONFINED SPACE",
                        "SCAFFOLDING",
                        "FIRST AID",
                        "OPERATOR CRANE",
                        "OPERATOR FORKLIFT",
                        "LOGOUT / TAGOUT (LOTO)",
                        "SAFE DRIVING / DEFENSIVE DRIVING"
                      ];
                      
                      const uniqueExisting: string[] = Array.from(
                        new Set(trainingList.map((t) => String(t.training || '')).filter(Boolean))
                      ) as string[];
                      const allOptions: string[] = Array.from(new Set([...predefined, ...customTypes, ...uniqueExisting]))
                        .filter(opt => !deletedTypes.includes(opt.trim().toUpperCase()));
                      
                      const filtered = allOptions.filter((opt: string) => 
                        opt.toLowerCase().includes(query)
                      );

                      if (filtered.length > 0) {
                        return filtered.map((opt, index) => (
                          <button
                            key={index}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setTrainingName(opt);
                              setIsTrainingDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs text-slate-700 font-medium transition flex items-center justify-between"
                          >
                            <span className="font-semibold text-slate-800">{opt}</span>
                            <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-semibold font-mono">Pilih</span>
                          </button>
                        ));
                      } else {
                        return (
                          <div className="px-4 py-2 text-xs text-slate-400 italic">
                            Tekan Enter atau simpan sebagai "{trainingName}" (Kustom)
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
                  Tgl Pelaksanaan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={tglPelaksanaan}
                  onChange={(e) => setTglPelaksanaan(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5 flex justify-between items-center">
                  <span>Tgl Expired {!selamanya && <span className="text-rose-500">*</span>}</span>
                </label>
                <input
                  type="date"
                  value={selamanya ? '' : tglExpired}
                  onChange={(e) => setTglExpired(e.target.value)}
                  className={`w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-500 ${
                    selamanya ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-50'
                  }`}
                  required={!selamanya}
                  disabled={selamanya}
                />
                <div className="flex items-center gap-1.5 mt-2">
                  <input
                    type="checkbox"
                    id="selamanya"
                    checked={selamanya}
                    onChange={(e) => {
                      setSelamanya(e.target.checked);
                      if (e.target.checked) setTglExpired('');
                    }}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                  />
                  <label htmlFor="selamanya" className="text-[10px] font-semibold text-slate-500 cursor-pointer select-none">
                    Sertifikat Berlaku Selamanya
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                Upload Sertifikat (Opsional)
              </label>
              <div 
                onClick={() => document.getElementById("trainFile")?.click()}
                className="mt-1 flex justify-center px-4 py-4 border-2 border-slate-300 border-dashed rounded-xl hover:border-indigo-400 hover:bg-slate-50 transition relative cursor-pointer"
              >
                <div className="space-y-1 text-center pointer-events-none">
                  <UploadCloud className="mx-auto h-8 w-8 text-slate-400" />
                  <div className="flex text-xs text-slate-600 justify-center">
                    <span className="font-semibold text-indigo-600">Pilih Sertifikat</span>
                    <input
                      id="trainFile"
                      type="file"
                      className="sr-only"
                      accept=".pdf,image/*"
                      onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">PDF, JPG, PNG up to 10MB</p>
                  {selectedFile && (
                    <div 
                      className="mt-2 flex flex-col items-center gap-1.5 pointer-events-auto" 
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="text-xs font-bold text-slate-800 truncate max-w-[200px]">
                        📄 {selectedFile.name}
                      </p>
                      <button
                        type="button"
                        onClick={() => setPreviewOpen(true)}
                        className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold rounded-lg transition border border-indigo-150 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="h-3 w-3" /> Pratinjau File
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {editingRowId && existingSertifikatUrl && existingSertifikatUrl !== "-" && (
                <div className="mt-2 p-2.5 bg-indigo-50 border border-indigo-150 rounded-xl flex items-center justify-between text-xs">
                  <div className="text-indigo-800">
                    <p className="font-semibold">Sertifikat terunggah ada</p>
                    <p className="text-[10px] text-slate-400">Kosongkan jika tidak ingin mengubah</p>
                  </div>
                  <a 
                    href={existingSertifikatUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    referrerPolicy="no-referrer"
                    className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-3 rounded-lg transition"
                  >
                    Lihat File
                  </a>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSubmitLoading}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 rounded-xl transition shadow-sm text-sm cursor-pointer disabled:bg-slate-400"
              >
                {isSubmitLoading ? 'Menyimpan...' : (editingRowId ? 'Perbarui Data Training' : 'Simpan Data Training')}
              </button>
              {editingRowId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition text-sm cursor-pointer"
                >
                  Batal
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Database log view with tabs */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          {/* Sub Tab Navigation */}
          <div className="flex border-b border-slate-100 pb-px gap-4">
            <button
              type="button"
              onClick={() => setActiveSubTab('all')}
              className={`pb-3 text-xs font-black tracking-wider uppercase transition-all border-b-2 -mb-px flex items-center gap-2 cursor-pointer ${
                activeSubTab === 'all'
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-600 font-semibold'
              }`}
            >
              <FileText className="h-4 w-4" /> Riwayat Lengkap ({filteredList.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('category');
                setSelectedCategory(null); // Reset selection
                setCategorySearchTerm('');
              }}
              className={`pb-3 text-xs font-black tracking-wider uppercase transition-all border-b-2 -mb-px flex items-center gap-2 cursor-pointer ${
                activeSubTab === 'category'
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-600 font-semibold'
              }`}
            >
              <Award className="h-4 w-4" /> Pantau Per Jenis Training ({trainingGroups.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('exempted');
              }}
              className={`pb-3 text-xs font-black tracking-wider uppercase transition-all border-b-2 -mb-px flex items-center gap-2 cursor-pointer ${
                activeSubTab === 'exempted'
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-600 font-semibold'
              }`}
            >
              <X className="h-4 w-4 text-rose-500" /> Pengecualian ({exemptions.length})
            </button>
          </div>

          {activeSubTab === 'all' ? (
            /* Traditional Full Database View */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-emerald-600" /> Database Riwayat & Status Training
                </h3>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-grow">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Cari nama atau jenis..."
                      className="pl-8 pr-3 py-1.5 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl text-xs outline-none w-full sm:w-56 font-bold"
                    />
                  </div>
                  <button
                    onClick={fetchTrainingList}
                    disabled={isLoading}
                    className="p-2 border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition cursor-pointer shrink-0"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                {isLoading ? (
                  <div className="text-center py-10 text-slate-400 text-xs font-bold">Memuat database training...</div>
                ) : filteredList.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs font-semibold italic">Tidak ditemukan kualifikasi training.</div>
                ) : (
                  <table className="w-full text-xs text-left text-slate-600 border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-150">
                        <th className="py-2.5 px-3 text-slate-500 font-extrabold w-12">No</th>
                        {renderSortableHeader('Karyawan', 'nama', sortField, sortOrder, handleSort)}
                        {renderSortableHeader('NRP', 'nrp', sortField, sortOrder, handleSort)}
                        {renderSortableHeader('Jenis Pelatihan', 'training', sortField, sortOrder, handleSort)}
                        {renderSortableHeader('Pelaksanaan', 'tglPelaksanaan', sortField, sortOrder, handleSort)}
                        {renderSortableHeader('Expired', 'tglExpired', sortField, sortOrder, handleSort)}
                        {renderSortableHeader('Status', 'status', sortField, sortOrder, handleSort)}
                        <th className="py-2.5 px-3 text-center text-slate-500 font-extrabold">Kredensial</th>
                        <th className="py-2.5 px-3 text-center text-slate-500 font-extrabold">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredList.map((item, id) => {
                        const status = getSertifikatStatus(item.tglExpired);
                        return (
                          <tr key={id} className="border-b border-slate-100 hover:bg-slate-50 font-medium">
                            <td className="py-2.5 px-3 text-slate-400 font-bold">{id + 1}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">{item.nama}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-500">{item.nrp}</td>
                            <td className="py-2.5 px-3 text-indigo-750 font-bold">{item.training}</td>
                            <td className="py-2.5 px-3 text-slate-500">{item.tglPelaksanaan}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-800">{item.tglExpired}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${status.color}`}>
                                {status.text.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {item.sertifikatUrl && item.sertifikatUrl !== "-" ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <a
                                    href={item.sertifikatUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    referrerPolicy="no-referrer"
                                    className="bg-slate-900 border border-slate-900 text-white font-semibold py-1 px-2.5 rounded-[6px] text-[10px] hover:bg-slate-800 transition cursor-pointer inline-block"
                                  >
                                    Lihat
                                  </a>
                                  {item.sertifikatUrl.startsWith("/api/uploads/") && (
                                    <span 
                                      className="text-[9px] text-amber-600 font-bold flex items-center gap-0.5" 
                                      title="Peringatan: File disimpan sementara di server lokal karena Google Drive belum diberi akses. Hubungi Admin untuk membagikan Folder Drive Anda dengan email Service Account."
                                    >
                                      ⚠️ Lokal (Sementara)
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleStartEdit(item)}
                                  title="Edit Data"
                                  className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition cursor-pointer"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(String(item.rowId), item.training, item.nama)}
                                  title="Hapus Data"
                                  className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : (
            /* Category Grouped View */
            <div className="space-y-4">
              {selectedCategory ? (
                /* Detail Table of Selected Category */
                (() => {
                  const group = trainingGroups.find(g => g.name.toUpperCase() === selectedCategory.toUpperCase());
                  if (!group) return <div className="text-center py-6 text-slate-400">Kategori tidak ditemukan.</div>;

                  // Filter records by categorySearchTerm
                  const recordsFiltered = group.records.filter(r => 
                    r.nama.toLowerCase().includes(categorySearchTerm.toLowerCase()) ||
                    r.nrp.toLowerCase().includes(categorySearchTerm.toLowerCase())
                  );

                  // Apply detail table sorting
                  if (detailSortField) {
                    recordsFiltered.sort((a, b) => {
                      let valA: any = a[detailSortField as keyof TrainingRecord] || '';
                      let valB: any = b[detailSortField as keyof TrainingRecord] || '';

                      if (detailSortField === 'tglPelaksanaan' || detailSortField === 'tglExpired') {
                        const timeA = parseDDMMYYYY(valA);
                        const timeB = parseDDMMYYYY(valB);
                        return detailSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
                      }

                      if (detailSortField === 'status') {
                        const scoreA = getStatusScore(a.tglExpired);
                        const scoreB = getStatusScore(b.tglExpired);
                        return detailSortOrder === 'asc' ? scoreA - scoreB : scoreB - scoreA;
                      }

                      valA = String(valA).toLowerCase();
                      valB = String(valB).toLowerCase();
                      if (valA < valB) return detailSortOrder === 'asc' ? -1 : 1;
                      if (valA > valB) return detailSortOrder === 'asc' ? 1 : -1;
                      return 0;
                    });
                  }

                  // Compute filtered and sorted unregistered list for this category
                  const unregisteredFiltered = unregisteredForSelectedCategory.filter(emp => 
                    (emp.nama || '').toLowerCase().includes(categorySearchTerm.toLowerCase()) ||
                    (emp.nik || '').toLowerCase().includes(categorySearchTerm.toLowerCase()) ||
                    (emp.dept || '').toLowerCase().includes(categorySearchTerm.toLowerCase())
                  );

                  if (detailSortField) {
                    unregisteredFiltered.sort((a, b) => {
                      let fieldKey = detailSortField === 'nrp' ? 'nik' : detailSortField;
                      let valA = a[fieldKey as keyof typeof a] || '';
                      let valB = b[fieldKey as keyof typeof b] || '';

                      valA = String(valA).toLowerCase();
                      valB = String(valB).toLowerCase();
                      if (valA < valB) return detailSortOrder === 'asc' ? -1 : 1;
                      if (valA > valB) return detailSortOrder === 'asc' ? 1 : -1;
                      return 0;
                    });
                  }

                  return (
                    <div className="space-y-4">
                      {/* Back & Breadcrumb header */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategory(null);
                              setCategorySearchTerm('');
                              setDetailSortField(null);
                              setDetailTab('registered');
                            }}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 transition"
                          >
                            <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Daftar Jenis
                          </button>
                          <h4 className="text-sm font-black text-slate-800 mt-1 uppercase tracking-tight flex items-center gap-1.5">
                            <Award className="h-4 w-4 text-indigo-600" /> {group.name}
                          </h4>
                          <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                            <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-lg">
                              Total: {group.records.length} Karyawan
                            </span>
                            {group.activeCount > 0 && (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-lg">
                                {group.activeCount} Aktif
                              </span>
                            )}
                            {group.warningCount > 0 && (
                              <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-lg">
                                {group.warningCount} Akan Expired
                              </span>
                            )}
                            {group.expiredCount > 0 && (
                              <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-lg">
                                {group.expiredCount} Expired
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Search in selected category */}
                        <div className="relative w-full sm:w-auto">
                          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="text"
                            value={categorySearchTerm}
                            onChange={(e) => setCategorySearchTerm(e.target.value)}
                            placeholder="Cari nama, nrp, atau dept..."
                            className="pl-8 pr-3 py-1.5 border border-slate-200 bg-white rounded-xl text-xs outline-none w-full sm:w-52 font-bold"
                          />
                        </div>
                      </div>

                      {/* Inner Toggle for Registered vs Unregistered */}
                      <div className="flex border-b border-slate-200">
                        <button
                          type="button"
                          onClick={() => {
                            setDetailTab('registered');
                            setDetailSortField(null);
                          }}
                          className={`pb-2.5 px-4 text-xs font-black tracking-wider uppercase transition-all border-b-2 -mb-px flex items-center gap-2 cursor-pointer ${
                            detailTab === 'registered'
                              ? 'border-indigo-600 text-indigo-600 font-bold'
                              : 'border-transparent text-slate-400 hover:text-slate-600 font-semibold'
                          }`}
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Sudah Training ({group.records.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDetailTab('unregistered');
                            setDetailSortField(null);
                          }}
                          className={`pb-2.5 px-4 text-xs font-black tracking-wider uppercase transition-all border-b-2 -mb-px flex items-center gap-2 cursor-pointer ${
                            detailTab === 'unregistered'
                              ? 'border-indigo-600 text-indigo-600 font-bold'
                              : 'border-transparent text-slate-400 hover:text-slate-600 font-semibold'
                          }`}
                        >
                          <AlertCircle className="h-4 w-4 text-amber-600" /> Belum Training ({unregisteredForSelectedCategory.length})
                        </button>
                      </div>

                      {/* Records Table for this category */}
                      {detailTab === 'registered' ? (
                        <div className="overflow-x-auto">
                          {recordsFiltered.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-xs italic">
                              Tidak ada karyawan yang cocok dengan pencarian "{categorySearchTerm}"
                            </div>
                          ) : (
                            <table className="w-full text-xs text-left text-slate-600 border-collapse">
                              <thead>
                                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-150">
                                  <th className="py-2.5 px-3 text-slate-500 font-extrabold w-12">No</th>
                                  {renderSortableHeader('Nama Karyawan', 'nama', detailSortField, detailSortOrder, handleDetailSort)}
                                  {renderSortableHeader('NRP', 'nrp', detailSortField, detailSortOrder, handleDetailSort)}
                                  {renderSortableHeader('Tgl Pelaksanaan', 'tglPelaksanaan', detailSortField, detailSortOrder, handleDetailSort)}
                                  {renderSortableHeader('Expired Date', 'tglExpired', detailSortField, detailSortOrder, handleDetailSort)}
                                  {renderSortableHeader('Status', 'status', detailSortField, detailSortOrder, handleDetailSort)}
                                  <th className="py-2.5 px-3 text-center text-slate-500 font-extrabold">Sertifikat</th>
                                  <th className="py-2.5 px-3 text-center text-slate-500 font-extrabold">Aksi</th>
                                </tr>
                              </thead>
                              <tbody>
                                {recordsFiltered.map((item, index) => {
                                  const status = getSertifikatStatus(item.tglExpired);
                                  return (
                                    <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 font-medium">
                                      <td className="py-2.5 px-3 text-slate-400 font-bold">{index + 1}</td>
                                      <td className="py-2.5 px-3 font-semibold text-slate-800">{item.nama}</td>
                                      <td className="py-2.5 px-3 font-mono text-slate-500">{item.nrp}</td>
                                      <td className="py-2.5 px-3 text-slate-500">{item.tglPelaksanaan}</td>
                                      <td className="py-2.5 px-3 font-bold text-slate-800">{item.tglExpired}</td>
                                      <td className="py-2.5 px-3 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${status.color}`}>
                                          {status.text.toUpperCase()}
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-3 text-center">
                                        {item.sertifikatUrl && item.sertifikatUrl !== "-" ? (
                                          <a
                                            href={item.sertifikatUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            referrerPolicy="no-referrer"
                                            className="bg-slate-900 text-white font-semibold py-1 px-2.5 rounded-[6px] text-[10px] hover:bg-slate-800 transition cursor-pointer inline-block"
                                          >
                                            Lihat
                                          </a>
                                        ) : (
                                          <span className="text-slate-300">-</span>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                          <button
                                            onClick={() => handleStartEdit(item)}
                                            title="Edit"
                                            className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition cursor-pointer"
                                          >
                                            <Edit2 className="h-3.5 w-3.5" />
                                          </button>
                                          <button
                                            onClick={() => handleDelete(String(item.rowId), item.training, item.nama)}
                                            title="Hapus"
                                            className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition cursor-pointer"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          {unregisteredFiltered.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-slate-100">
                              Semua karyawan telah mengikuti training "{selectedCategory}" atau tidak ada hasil pencarian yang cocok.
                            </div>
                          ) : (
                            <table className="w-full text-xs text-left text-slate-600 border-collapse">
                              <thead>
                                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-150">
                                  <th className="py-2.5 px-3 text-slate-500 font-extrabold w-12">No</th>
                                  {renderSortableHeader('Nama Karyawan', 'nama', detailSortField, detailSortOrder, handleDetailSort)}
                                  {renderSortableHeader('NRP / ID', 'nrp', detailSortField, detailSortOrder, handleDetailSort)}
                                  <th className="py-2.5 px-3 text-slate-500 font-extrabold">Departemen</th>
                                  <th className="py-2.5 px-3 text-center text-slate-500 font-extrabold w-32">Status</th>
                                  <th className="py-2.5 px-3 text-center text-slate-500 font-extrabold w-36">Aksi</th>
                                </tr>
                              </thead>
                              <tbody>
                                {unregisteredFiltered.map((emp, index) => (
                                  <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 font-medium">
                                    <td className="py-2.5 px-3 text-slate-400 font-bold">{index + 1}</td>
                                    <td className="py-2.5 px-3 font-semibold text-slate-800">{emp.nama}</td>
                                    <td className="py-2.5 px-3 font-mono text-slate-500">{emp.nik || '-'}</td>
                                    <td className="py-2.5 px-3 text-slate-500">{emp.dept || '-'}</td>
                                    <td className="py-2.5 px-3 text-center">
                                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                                        BELUM INPUT
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      <div className="flex items-center justify-center gap-1.5 mx-auto">
                                        <button
                                          type="button"
                                          onClick={() => handleInputFromUnregistered(emp.nama, selectedCategory)}
                                          className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition duration-150 cursor-pointer flex items-center justify-center gap-1"
                                        >
                                          <UserCheck className="h-3 w-3" /> Input Data
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleExemptKaryawan(emp.nama, selectedCategory || '')}
                                          title="Sembunyikan / Kecualikan dari Training ini"
                                          className="p-1 text-rose-600 hover:text-white hover:bg-rose-600 rounded-lg transition duration-150 cursor-pointer flex items-center justify-center border border-rose-200 hover:border-rose-600 bg-white"
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
                      )}
                    </div>
                  );
                })()
              ) : (
                /* List of Categories in Beautiful Cards Grid */
                <div className="space-y-4">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                    <div className="space-y-0.5">
                      <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                        Ringkasan per Kategori Pelatihan
                      </h3>
                      <p className="text-[11px] text-slate-500 font-semibold">
                        Pilih jenis training untuk melihat daftar karyawan yang telah mengikuti program tersebut.
                      </p>
                    </div>
                    {/* Controls (Sort + Search) */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
                      <button
                        type="button"
                        onClick={() => setShowAddTypeForm(true)}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
                      >
                        <Award className="h-3.5 w-3.5" /> + Jenis Training
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Sort:</span>
                        <select
                          value={categorySortMode}
                          onChange={(e) => setCategorySortMode(e.target.value as any)}
                          className="bg-transparent border-none text-xs font-bold outline-none text-slate-700 cursor-pointer"
                        >
                          <option value="name_asc">Kategori (A-Z)</option>
                          <option value="name_desc">Kategori (Z-A)</option>
                          <option value="total_desc">Peserta Terbanyak</option>
                          <option value="active_desc">Aktif Terbanyak</option>
                          <option value="expired_desc">Expired Terbanyak</option>
                        </select>
                      </div>
                      
                      <div className="relative flex-grow sm:flex-grow-0">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Filter jenis pelatihan..."
                          className="pl-8 pr-3 py-1.5 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl text-xs outline-none w-full sm:w-48 font-bold"
                          onChange={(e) => {
                            setCategorySearchTerm(e.target.value);
                          }}
                          value={categorySearchTerm}
                        />
                      </div>
                    </div>
                  </div>

                  {showAddTypeForm && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-end sm:items-center gap-3 animate-fade-in">
                      <div className="flex-1 space-y-1 w-full">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Nama Jenis Training Baru
                        </label>
                        <input
                          type="text"
                          value={newTypeName}
                          onChange={(e) => setNewTypeName(e.target.value.toUpperCase())}
                          placeholder="CONTOH: AHLI K3 KIMIA"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-indigo-500 font-bold"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const trimmed = newTypeName.trim().toUpperCase();
                              if (!trimmed) {
                                alert("Nama jenis training tidak boleh kosong!");
                                return;
                              }
                              if (deletedTypes.includes(trimmed)) {
                                setDeletedTypes(prev => prev.filter(t => t !== trimmed));
                                const isPredefined = [
                                  "BASIC LIFE SUPPORT",
                                  "BASIC FIRE FIGHTER",
                                  "K3 UMUM",
                                  "K3 MANDATORI",
                                  "WORKING AT HEIGHT",
                                  "CONFINED SPACE",
                                  "SCAFFOLDING",
                                  "FIRST AID",
                                  "OPERATOR CRANE",
                                  "OPERATOR FORKLIFT",
                                  "LOGOUT / TAGOUT (LOTO)",
                                  "SAFE DRIVING / DEFENSIVE DRIVING"
                                ].includes(trimmed);
                                if (!isPredefined) {
                                  setCustomTypes(prev => Array.from(new Set([...prev, trimmed])));
                                }
                                setNewTypeName('');
                                setShowAddTypeForm(false);
                                setFeedback({ type: 'success', msg: `Jenis training "${trimmed}" berhasil dipulihkan!` });
                                return;
                              }
                              if (unregisteredPredefinedOptions.some(opt => opt.toUpperCase() === trimmed)) {
                                alert("Jenis training tersebut sudah ada!");
                                return;
                              }
                              setCustomTypes(prev => [...prev, trimmed]);
                              setNewTypeName('');
                              setShowAddTypeForm(false);
                              setFeedback({ type: 'success', msg: `Jenis training "${trimmed}" berhasil ditambahkan ke daftar!` });
                            }
                          }}
                        />
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddTypeForm(false);
                            setNewTypeName('');
                          }}
                          className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = newTypeName.trim().toUpperCase();
                            if (!trimmed) {
                              alert("Nama jenis training tidak boleh kosong!");
                              return;
                            }
                            if (deletedTypes.includes(trimmed)) {
                              setDeletedTypes(prev => prev.filter(t => t !== trimmed));
                              const isPredefined = [
                                "BASIC LIFE SUPPORT",
                                "BASIC FIRE FIGHTER",
                                "K3 UMUM",
                                "K3 MANDATORI",
                                "WORKING AT HEIGHT",
                                "CONFINED SPACE",
                                "SCAFFOLDING",
                                "FIRST AID",
                                "OPERATOR CRANE",
                                "OPERATOR FORKLIFT",
                                "LOGOUT / TAGOUT (LOTO)",
                                "SAFE DRIVING / DEFENSIVE DRIVING"
                              ].includes(trimmed);
                              if (!isPredefined) {
                                  setCustomTypes(prev => Array.from(new Set([...prev, trimmed])));
                              }
                              setNewTypeName('');
                              setShowAddTypeForm(false);
                              setFeedback({ type: 'success', msg: `Jenis training "${trimmed}" berhasil dipulihkan!` });
                              return;
                            }
                            if (unregisteredPredefinedOptions.some(opt => opt.toUpperCase() === trimmed)) {
                              alert("Jenis training tersebut sudah ada!");
                              return;
                            }
                            setCustomTypes(prev => [...prev, trimmed]);
                            setNewTypeName('');
                            setShowAddTypeForm(false);
                            setFeedback({ type: 'success', msg: `Jenis training "${trimmed}" berhasil ditambahkan ke daftar!` });
                          }}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                          Simpan
                        </button>
                      </div>
                    </div>
                  )}

                  {trainingGroups.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                      Belum ada data pelatihan terdaftar.
                    </div>
                  ) : (
                    (() => {
                      const filteredGroups = trainingGroups.filter(g => 
                        g.name.toLowerCase().includes(categorySearchTerm.toLowerCase())
                      );

                      // Apply category card grid sorting
                      filteredGroups.sort((a, b) => {
                        if (categorySortMode === 'name_asc') {
                          return a.name.localeCompare(b.name);
                        } else if (categorySortMode === 'name_desc') {
                          return b.name.localeCompare(a.name);
                        } else if (categorySortMode === 'total_desc') {
                          return b.records.length - a.records.length;
                        } else if (categorySortMode === 'active_desc') {
                          return b.activeCount - a.activeCount;
                        } else if (categorySortMode === 'expired_desc') {
                          return b.expiredCount - a.expiredCount;
                        }
                        return 0;
                      });

                      if (filteredGroups.length === 0) {
                        return (
                          <div className="text-center py-12 text-slate-400 text-xs italic">
                            Tidak ditemukan jenis training yang cocok dengan "{categorySearchTerm}"
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {filteredGroups.map((g, i) => {
                            return (
                              <div
                                key={i}
                                onClick={() => {
                                  setSelectedCategory(g.name);
                                  setCategorySearchTerm(''); // clear search term
                                }}
                                className="p-4 border border-slate-200 hover:border-indigo-400 bg-slate-50 hover:bg-white rounded-2xl shadow-xs transition duration-200 cursor-pointer group flex flex-col justify-between space-y-3 relative overflow-hidden"
                              >
                                {/* Decorative badge background */}
                                <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 opacity-[0.03] group-hover:scale-110 transition duration-300 pointer-events-none">
                                  <Award className="h-32 w-32 text-indigo-900" />
                                </div>

                                <div className="space-y-1.5 z-10">
                                  <div className="flex items-start justify-between">
                                    <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition duration-200">
                                      <Award className="h-5 w-5" />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (g.records && g.records.length > 0) {
                                            alert(`Tidak dapat menghapus jenis training "${g.name}" karena masih terdapat ${g.records.length} data karyawan yang terdaftar. Silakan hapus atau ubah data training karyawan tersebut terlebih dahulu.`);
                                            return;
                                          }
                                          const isConfirmed = window.confirm(`Apakah Anda yakin ingin menghapus jenis training "${g.name}" dari daftar?`);
                                          if (!isConfirmed) return;
                                          
                                          // Remove from custom types if it exists there
                                          setCustomTypes(prev => prev.filter(t => t.toUpperCase() !== g.name.toUpperCase()));
                                          
                                          // Add to deleted types list
                                          setDeletedTypes(prev => Array.from(new Set([...prev, g.name.trim().toUpperCase()])));
                                          
                                          setFeedback({ type: 'success', msg: `Jenis training "${g.name}" berhasil dihapus!` });
                                        }}
                                        title="Hapus Jenis Training"
                                        className="p-1 text-rose-600 hover:text-white hover:bg-rose-600 rounded-lg transition duration-150 cursor-pointer z-20 relative flex items-center justify-center border border-rose-200 hover:border-rose-600 bg-white"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                      <div className="flex items-center text-xs text-indigo-600 font-bold group-hover:translate-x-1 transition duration-200">
                                        Pantau <ChevronRight className="h-4 w-4" />
                                      </div>
                                    </div>
                                  </div>
                                  <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm tracking-tight group-hover:text-indigo-600 transition uppercase font-sans">
                                    {g.name}
                                  </h4>
                                </div>

                                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-bold z-10 font-mono">
                                  <span className="text-slate-500 flex items-center gap-1 font-extrabold font-sans">
                                    <Users className="h-3.5 w-3.5 text-slate-400" /> {g.records.length} Karyawan
                                  </span>
                                  
                                  <div className="flex gap-1 text-[9px]">
                                    {g.activeCount > 0 && (
                                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded-md font-extrabold" title="Aktif">
                                        {g.activeCount} Aktif
                                      </span>
                                    )}
                                    {g.warningCount > 0 && (
                                      <span className="bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded-md font-extrabold" title="Akan Expired">
                                        {g.warningCount} Warning
                                      </span>
                                    )}
                                    {g.expiredCount > 0 && (
                                      <span className="bg-rose-50 text-rose-700 border border-rose-100 px-1.5 py-0.5 rounded-md font-extrabold" title="Expired">
                                        {g.expiredCount} Expired
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()
                  )}
                </div>
              )}
            </div>
          )}



          {activeSubTab === 'exempted' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <X className="h-3.5 w-3.5 text-rose-600" /> Daftar Karyawan Dikecualikan dari Pelatihan
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-bold">
                    Nama-nama karyawan di bawah ini dikecualikan dari jenis pelatihan tertentu agar tidak muncul di daftar "Belum Training".
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-[10px] font-black text-slate-500 uppercase tracking-wider shadow-sm">
                  Total: {exemptions.length} Pengecualian
                </div>
              </div>

              <div className="overflow-x-auto">
                {exemptions.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs font-semibold italic bg-slate-50 rounded-xl border border-slate-100">
                    Tidak ada karyawan yang dikecualikan dari pelatihan saat ini.
                  </div>
                ) : (
                  <table className="w-full text-xs text-left text-slate-600 border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-150">
                        <th className="py-2.5 px-3 text-slate-500 font-extrabold w-12">No</th>
                        <th className="py-2.5 px-3 text-slate-500 font-extrabold">Nama Karyawan</th>
                        <th className="py-2.5 px-3 text-slate-500 font-extrabold">Jenis Training</th>
                        <th className="py-2.5 px-3 text-center text-slate-500 font-extrabold w-36">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exemptions.map((ex, index) => (
                        <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 font-medium">
                          <td className="py-2.5 px-3 text-slate-400 font-bold">{index + 1}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{ex.nama}</td>
                           <td className="py-2.5 px-3 font-bold text-slate-600">{ex.training}</td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveExemption(ex.nama, ex.training)}
                              className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition duration-150 cursor-pointer flex items-center justify-center gap-1 mx-auto"
                            >
                              Pulihkan Ke Daftar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal for selected upload file */}
      {previewOpen && previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Pratinjau File Sertifikat</h3>
                  <p className="text-xs text-slate-500 font-medium truncate max-w-xs md:max-w-md">
                    {selectedFile?.name || 'Sertifikat'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-150 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 bg-slate-100 flex-1 overflow-auto flex items-center justify-center min-h-[350px]">
              {previewType === 'pdf' ? (
                <iframe
                  src={previewUrl}
                  title="PDF Preview"
                  className="w-full h-[65vh] rounded-xl border border-slate-200 bg-white shadow-sm"
                />
              ) : (
                <div className="max-w-full max-h-[65vh] overflow-auto flex justify-center">
                  <img
                    src={previewUrl}
                    alt="Pratinjau Gambar"
                    className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-md border border-slate-200"
                  />
                </div>
              )}
            </div>

            <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
