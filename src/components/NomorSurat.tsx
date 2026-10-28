import React, { useState, useEffect } from 'react';
import {
  FileText,
  Building2,
  ShieldCheck,
  Wrench,
  Package,
  Search,
  Plus,
  Eye,
  Printer,
  MoreVertical,
  Calendar,
  X,
  Edit2,
  Trash2,
  Check,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { PageHeader, Button } from './common/index.js';

interface NomorSuratData {
  id: string;
  nomorSurat: string;
  tanggal: string; // YYYY-MM-DD
  perihal: string;
  tujuan: string;
  createdBy: string;
  status: 'Digunakan' | 'Draft' | 'Batal';
  departemen: 'HRGAFA' | 'HSE' | 'Service' | 'Part';
  createdAt?: string;
}

interface NomorSuratProps {
  userRealName: string;
  userNrp: string;
  userRole: 'admin' | 'operator';
  onBack: () => void;
}

const DEPARTMENTS: ('HRGAFA' | 'HSE' | 'Service' | 'Part')[] = ['HRGAFA', 'HSE', 'Service', 'Part'];

const MONTHS_ROMAN = [
  'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'
];

export default function NomorSurat({ userRealName, userNrp, userRole, onBack }: NomorSuratProps) {
  const [dataList, setDataList] = useState<NomorSuratData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDept, setActiveDept] = useState<'HRGAFA' | 'HSE' | 'Service' | 'Part'>('HRGAFA');
  const [userDept, setUserDept] = useState<'HRGAFA' | 'HSE' | 'Service' | 'Part' | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterYear, setFilterYear] = useState('Semua');
  const [filterMonth, setFilterMonth] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedSurat, setSelectedSurat] = useState<NomorSuratData | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // Form states
  const [formId, setFormId] = useState<string | null>(null);
  const [formNomor, setFormNomor] = useState('');
  const [formTanggal, setFormTanggal] = useState('');
  const [formPerihal, setFormPerihal] = useState('');
  const [formTujuan, setFormTujuan] = useState('');
  const [formStatus, setFormStatus] = useState<'Digunakan' | 'Draft' | 'Batal'>('Digunakan');
  const [formDept, setFormDept] = useState<'HRGAFA' | 'HSE' | 'Service' | 'Part'>('HRGAFA');
  const [isManualNomor, setIsManualNomor] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/nomor-surat');
      const json = await res.json();
      if (json.success) {
        setDataList(json.list);
        
        // Also fetch employee info to find operator's department
        const empRes = await fetch('/api/karyawan');
        const empJson = await empRes.json();
        
        let detectedDept: 'HRGAFA' | 'HSE' | 'Service' | 'Part' = 'HRGAFA';
        if (userRole === 'operator' && empJson.karyawanDetail) {
          const normNrp = userNrp.toLowerCase().trim();
          const normName = userRealName.toLowerCase().trim();
          
          const found = empJson.karyawanDetail.find((k: any) => 
            (normNrp && k.nik && k.nik.toLowerCase().trim() === normNrp) ||
            (normName && k.nama && k.nama.toLowerCase().trim() === normName) ||
            (normName && k.nama && normName.includes(k.nama.toLowerCase().trim())) ||
            (k.nama && k.nama.toLowerCase().trim().includes(normName))
          );
          
          if (found && found.dept) {
            const dUpper = found.dept.toUpperCase();
            if (dUpper.includes('HSE')) detectedDept = 'HSE';
            else if (dUpper.includes('SERVICE') || dUpper.includes('MEKANIK') || dUpper.includes('MECHANIC')) detectedDept = 'Service';
            else if (dUpper.includes('PART') || dUpper.includes('STORE') || dUpper.includes('GUDANG')) detectedDept = 'Part';
            else detectedDept = 'HRGAFA';
          } else {
            // Check direct name matchers
            if (normName.includes('rifki')) detectedDept = 'HSE';
            else if (normName.includes('ali')) detectedDept = 'Service';
          }
          
          setUserDept(detectedDept);
          setActiveDept(detectedDept);
        }
      }
    } catch (err) {
      console.error("Gagal memuat data nomor surat:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Close active dropdown on click elsewhere
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveDropdownId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Calculate dynamic sequence and construct nomor surat format
  // Format: [sequence]/[DEPT]/[ROMAN_MONTH]/[YEAR]
  const updateGeneratedNomorSurat = (dept: 'HRGAFA' | 'HSE' | 'Service' | 'Part', dateStr: string) => {
    if (!dateStr) return;
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return;

    const year = dateObj.getFullYear();
    const monthIndex = dateObj.getMonth();
    const romanMonth = MONTHS_ROMAN[monthIndex];

    // Filter items in the same dept and year to find the next index
    const deptItems = dataList.filter(item => 
      item.departemen === dept && 
      new Date(item.tanggal).getFullYear() === year
    );

    let nextSeq = 1;
    if (deptItems.length > 0) {
      // Extract numeric sequence from nomorSurat strings (Format: XXX/DEPT/ROMAN/YEAR)
      const seqs = deptItems.map(item => {
        const parts = item.nomorSurat.split('/');
        const firstPart = parseInt(parts[0], 10);
        return isNaN(firstPart) ? 0 : firstPart;
      });
      const maxSeq = Math.max(...seqs, 0);
      nextSeq = maxSeq + 1;
    }

    const paddedSeq = String(nextSeq).padStart(3, '0');
    const generated = `${paddedSeq}/${dept.toUpperCase()}/${romanMonth}/${year}`;
    
    if (!isManualNomor) {
      setFormNomor(generated);
    }
  };

  // Trigger auto-nomor generation when dept, tanggal, or manual state changes
  useEffect(() => {
    if (isCreateModalOpen && !formId) {
      updateGeneratedNomorSurat(formDept, formTanggal);
    }
  }, [formDept, formTanggal, isManualNomor, isCreateModalOpen, dataList, formId]);

  // Open Create Modal
  const handleOpenCreateModal = (existingItem: NomorSuratData | null = null) => {
    setErrorMsg('');
    if (existingItem) {
      // Edit mode
      setFormId(existingItem.id);
      setFormNomor(existingItem.nomorSurat);
      setFormTanggal(existingItem.tanggal);
      setFormPerihal(existingItem.perihal);
      setFormTujuan(existingItem.tujuan);
      setFormStatus(existingItem.status);
      setFormDept(existingItem.departemen);
      setIsManualNomor(true); // Treat as manual so it doesn't overwrite on date edit
    } else {
      // New mode
      setFormId(null);
      const today = new Date().toISOString().split('T')[0];
      setFormTanggal(today);
      setFormPerihal('');
      setFormTujuan('');
      setFormStatus('Digunakan');
      // Operators are locked to their own department
      const initialDept = userDept || activeDept || 'HRGAFA';
      setFormDept(initialDept);
      setIsManualNomor(false);
      setFormNomor('');
    }
    setIsCreateModalOpen(true);
  };

  const handleSaveSurat = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formNomor.trim()) {
      setErrorMsg('Nomor surat wajib diisi.');
      return;
    }
    if (!formTanggal) {
      setErrorMsg('Tanggal surat wajib dipilih.');
      return;
    }
    if (!formPerihal.trim()) {
      setErrorMsg('Perihal wajib diisi.');
      return;
    }
    if (!formTujuan.trim()) {
      setErrorMsg('Tujuan surat wajib diisi.');
      return;
    }

    const payload = {
      id: formId,
      nomorSurat: formNomor.trim(),
      tanggal: formTanggal,
      perihal: formPerihal.trim(),
      tujuan: formTujuan.trim(),
      status: formStatus,
      departemen: formDept,
      createdBy: formId ? (dataList.find(d => d.id === formId)?.createdBy || userRealName) : userRealName
    };

    try {
      const res = await fetch('/api/nomor-surat/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        setDataList(json.list);
        setIsCreateModalOpen(false);
      } else {
        setErrorMsg(json.message || 'Gagal menyimpan data.');
      }
    } catch (err: any) {
      setErrorMsg('Terjadi kesalahan jaringan: ' + err.message);
    }
  };

  const handleDeleteSurat = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus nomor surat ini?')) return;
    try {
      const res = await fetch(`/api/nomor-surat/delete/${id}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.success) {
        setDataList(json.list);
        if (selectedSurat && selectedSurat.id === id) {
          setIsDetailModalOpen(false);
        }
      }
    } catch (err) {
      console.error("Gagal menghapus nomor surat:", err);
    }
  };

  const handleChangeStatus = async (item: NomorSuratData, newStatus: 'Digunakan' | 'Draft' | 'Batal') => {
    const payload = {
      ...item,
      status: newStatus
    };
    try {
      const res = await fetch('/api/nomor-surat/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        setDataList(json.list);
      }
    } catch (err) {
      console.error("Gagal mengubah status:", err);
    }
  };

  const handlePrint = (item: NomorSuratData) => {
    // Elegant system print trigger
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const formattedDate = formatDateIndo(item.tanggal);
    printWindow.document.write(`
      <html>
        <head>
          <title>Bukti Pengambilan Nomor Surat</title>
          <style>
            body { font-family: 'Poppins', 'Inter', sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; text-align: center; }
            .logo-placeholder { font-weight: bold; font-size: 20px; color: #5B3DF5; margin-bottom: 8px; }
            .title { font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
            .info-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .info-table th, .info-table td { padding: 12px; text-align: left; border-bottom: 1px solid #f1f5f9; }
            .info-table th { width: 30%; font-weight: 600; color: #64748b; }
            .badge { display: inline-block; padding: 4px 12px; font-size: 11px; font-weight: 700; border-radius: 9999px; }
            .badge-green { background-color: #dcfce7; color: #15803d; }
            .badge-blue { background-color: #dbeafe; color: #1d4ed8; }
            .badge-red { background-color: #fee2e2; color: #b91c1c; }
            .footer { margin-top: 60px; font-size: 12px; text-align: center; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-placeholder">PT INDOTRUCK UTAMA</div>
            <div class="title">Bukti Registrasi Nomor Surat</div>
          </div>
          <table class="info-table">
            <tr>
              <th>Nomor Surat</th>
              <td style="font-weight: 700; color: #5B3DF5; font-size: 16px;">${item.nomorSurat}</td>
            </tr>
            <tr>
              <th>Tanggal Registrasi</th>
              <td>${formattedDate}</td>
            </tr>
            <tr>
              <th>Departemen</th>
              <td>${item.departemen}</td>
            </tr>
            <tr>
              <th>Perihal</th>
              <td>${item.perihal}</td>
            </tr>
            <tr>
              <th>Tujuan</th>
              <td>${item.tujuan}</td>
            </tr>
            <tr>
              <th>Dibuat Oleh</th>
              <td>${item.createdBy}</td>
            </tr>
            <tr>
              <th>Status</th>
              <td>
                <span class="badge ${
                  item.status === 'Digunakan' ? 'badge-green' : item.status === 'Draft' ? 'badge-blue' : 'badge-red'
                }">${item.status.toUpperCase()}</span>
              </td>
            </tr>
          </table>
          <div class="footer">
            Dokumen ini dicetak otomatis melalui Aplikasi HSE & Departemen PT. Indotruck Utama.<br>
            Dicetak pada: ${new Date().toLocaleString('id-ID')}
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Helper date formatter
  const formatDateIndo = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Department icon mapper
  const getDeptIcon = (dept: 'HRGAFA' | 'HSE' | 'Service' | 'Part') => {
    switch (dept) {
      case 'HRGAFA': return <Building2 className="h-4.5 w-4.5" />;
      case 'HSE': return <ShieldCheck className="h-4.5 w-4.5" />;
      case 'Service': return <Wrench className="h-4.5 w-4.5" />;
      case 'Part': return <Package className="h-4.5 w-4.5" />;
    }
  };

  // Filter & Search Logic
  const filteredData = dataList.filter(item => {
    // 1. Filter by active department
    if (item.departemen !== activeDept) return false;

    // 2. Search query (nomorSurat, perihal, tujuan, createdBy)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNo = item.nomorSurat.toLowerCase().includes(q);
      const matchPerihal = item.perihal.toLowerCase().includes(q);
      const matchTujuan = item.tujuan.toLowerCase().includes(q);
      const matchCreator = item.createdBy.toLowerCase().includes(q);
      if (!matchNo && !matchPerihal && !matchTujuan && !matchCreator) return false;
    }

    // 3. Filter Year
    if (filterYear !== 'Semua') {
      const yearOfItem = new Date(item.tanggal).getFullYear().toString();
      if (yearOfItem !== filterYear) return false;
    }

    // 4. Filter Month
    if (filterMonth !== 'Semua') {
      const monthOfItem = (new Date(item.tanggal).getMonth() + 1).toString();
      if (monthOfItem !== filterMonth) return false;
    }

    // 5. Filter Status
    if (filterStatus !== 'Semua') {
      if (item.status !== filterStatus) return false;
    }

    return true;
  });

  // Extract years and months from data for filter options
  const yearsOptions = Array.from(new Set(dataList.map(item => new Date(item.tanggal).getFullYear().toString()))).sort((a: string, b: string) => b.localeCompare(a));

  // Pagination Logic
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeDept, searchQuery, filterYear, filterMonth, filterStatus]);

  return (
    <div className="space-y-6 font-sans">
      {/* HEADER SECTION */}
      <PageHeader
        title="NOMOR SURAT"
        subtitle="Kelola daftar nomor surat resmi berdasarkan departemen."
        onBack={onBack}
        icon={<FileText className="h-6 w-6" />}
        actions={
          <Button
            variant="primary"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setFormId(null);
              setFormPerihal('');
              setFormTujuan('');
              setFormStatus('Digunakan');
              setFormDept(activeDept);
              setIsManualNomor(false);
              setErrorMsg('');
              setIsCreateModalOpen(true);
            }}
          >
            Ambil Nomor Surat Baru
          </Button>
        }
      />

      {/* DEPARTMENT PIL-BUTTONS */}
      <div className="flex flex-wrap items-center gap-2 pb-1">
        {DEPARTMENTS.map((dept) => {
          const isActive = activeDept === dept;
          const isUserLocked = userRole === 'operator' && userDept && userDept !== dept;
          
          if (isUserLocked) return null; // Hide tabs operator is not allowed to see!

          return (
            <button
              key={dept}
              onClick={() => setActiveDept(dept)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold border transition cursor-pointer select-none shadow-xs ${
                isActive
                  ? 'bg-[#5B3DF5] border-[#5B3DF5] text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              {getDeptIcon(dept)}
              <span>{dept}</span>
            </button>
          );
        })}
      </div>

      {/* FILTER AREA */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-200 shadow-xs">
        {/* Search */}
        <div className="relative md:col-span-5">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari nomor surat, perihal, atau tujuan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition placeholder:text-slate-400"
          />
        </div>

        {/* Tahun Filter */}
        <div className="md:col-span-2 relative">
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-700 cursor-pointer appearance-none"
          >
            <option value="Semua">Semua Tahun</option>
            {yearsOptions.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <div className="absolute right-3 top-3.5 pointer-events-none text-slate-400">
            <Filter className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Bulan Filter */}
        <div className="md:col-span-2 relative">
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-700 cursor-pointer appearance-none"
          >
            <option value="Semua">Semua Bulan</option>
            <option value="1">Januari</option>
            <option value="2">Februari</option>
            <option value="3">Maret</option>
            <option value="4">April</option>
            <option value="5">Mei</option>
            <option value="6">Juni</option>
            <option value="7">Juli</option>
            <option value="8">Agustus</option>
            <option value="9">September</option>
            <option value="10">Oktober</option>
            <option value="11">November</option>
            <option value="12">Desember</option>
          </select>
          <div className="absolute right-3 top-3.5 pointer-events-none text-slate-400">
            <Filter className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Status Filter */}
        <div className="md:col-span-2 relative">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition text-slate-700 cursor-pointer appearance-none"
          >
            <option value="Semua">Semua Status</option>
            <option value="Digunakan">Digunakan</option>
            <option value="Draft">Draft</option>
            <option value="Batal">Batal</option>
          </select>
          <div className="absolute right-3 top-3.5 pointer-events-none text-slate-400">
            <Filter className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={() => handleOpenCreateModal()}
          className="md:col-span-1 flex items-center justify-center gap-1 px-3 py-2.5 bg-[#5B3DF5] hover:bg-[#4828db] text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer whitespace-nowrap min-w-max"
        >
          <Plus className="h-4 w-4" />
          Buat Baru
        </button>
      </div>

      {/* TABLE DATA */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 text-[#5B3DF5] animate-spin" />
          <p className="text-xs text-slate-500">Memuat data nomor surat...</p>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-white border border-slate-200 rounded-3xl text-center gap-4 shadow-xs">
          <div className="h-14 w-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shadow-inner">
            <FileText className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Tidak Ada Data</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Tidak ditemukan nomor surat untuk departemen {activeDept} yang cocok dengan filter aktif Anda.
            </p>
          </div>
          <button
            onClick={() => handleOpenCreateModal()}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-[#5B3DF5] border border-indigo-200 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Registrasi Nomor Surat Baru
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="py-3 px-4 text-[11px] font-extrabold text-slate-500 tracking-wider w-12 text-center">NO</th>
                  <th className="py-3 px-4 text-[11px] font-extrabold text-slate-500 tracking-wider">NOMOR SURAT</th>
                  <th className="py-3 px-4 text-[11px] font-extrabold text-slate-500 tracking-wider w-36">TANGGAL</th>
                  <th className="py-3 px-4 text-[11px] font-extrabold text-slate-500 tracking-wider">PERIHAL</th>
                  <th className="py-3 px-4 text-[11px] font-extrabold text-slate-500 tracking-wider">TUJUAN SURAT</th>
                  <th className="py-3 px-4 text-[11px] font-extrabold text-slate-500 tracking-wider">OLEH</th>
                  <th className="py-3 px-4 text-[11px] font-extrabold text-slate-500 tracking-wider w-28 text-center">STATUS</th>
                  <th className="py-3 px-4 text-[11px] font-extrabold text-slate-500 tracking-wider w-24 text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {currentItems.map((item, index) => {
                  const globalNo = indexOfFirstItem + index + 1;
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/50 transition duration-150 group"
                    >
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-400 group-hover:text-slate-600">
                        {globalNo}
                      </td>
                      <td className="py-3.5 px-4 font-bold">
                        <button
                          onClick={() => {
                            setSelectedSurat(item);
                            setIsDetailModalOpen(true);
                          }}
                          className="text-[#5B3DF5] hover:underline hover:text-[#4828db] text-left cursor-pointer font-bold focus:outline-none"
                        >
                          {item.nomorSurat}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {formatDateIndo(item.tanggal)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 font-medium truncate max-w-xs" title={item.perihal}>
                        {item.perihal}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 truncate max-w-xs" title={item.tujuan}>
                        {item.tujuan}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {item.createdBy}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ${
                          item.status === 'Digunakan'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : item.status === 'Draft'
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'bg-rose-50 border-rose-200 text-rose-700'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            item.status === 'Digunakan' ? 'bg-emerald-500' : item.status === 'Draft' ? 'bg-blue-500' : 'bg-rose-500'
                          }`} />
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center relative">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedSurat(item);
                              setIsDetailModalOpen(true);
                            }}
                            title="Lihat Detail"
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handlePrint(item)}
                            title="Cetak Bukti"
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition cursor-pointer"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          
                          {/* Dropdown Menu Toggle */}
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownId(activeDropdownId === item.id ? null : item.id);
                              }}
                              title="Menu Opsi"
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition cursor-pointer"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {/* Dropdown Box */}
                            {activeDropdownId === item.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-30 text-left animate-in fade-in slide-in-from-top-2 duration-150"
                              >
                                <button
                                  onClick={() => {
                                    handleOpenCreateModal(item);
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full px-3.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition cursor-pointer font-medium"
                                >
                                  <Edit2 className="h-3.5 w-3.5 text-slate-400" />
                                  Ubah Data
                                </button>
                                
                                <div className="border-t border-slate-100 my-1"></div>
                                <div className="px-3 py-1 text-[9px] font-extrabold text-slate-400 tracking-wider">UBAH STATUS</div>

                                <button
                                  onClick={() => {
                                    handleChangeStatus(item, 'Digunakan');
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full px-3.5 py-1 text-xs text-emerald-700 hover:bg-emerald-50/50 flex items-center gap-2 transition cursor-pointer font-semibold"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  Set Digunakan
                                </button>
                                <button
                                  onClick={() => {
                                    handleChangeStatus(item, 'Draft');
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full px-3.5 py-1 text-xs text-blue-700 hover:bg-blue-50/50 flex items-center gap-2 transition cursor-pointer font-semibold"
                                >
                                  <Clock className="h-3.5 w-3.5" />
                                  Set Draft
                                </button>
                                <button
                                  onClick={() => {
                                    handleChangeStatus(item, 'Batal');
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full px-3.5 py-1 text-xs text-rose-700 hover:bg-rose-50/50 flex items-center gap-2 transition cursor-pointer font-semibold"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Set Batal
                                </button>

                                <div className="border-t border-slate-100 my-1"></div>
                                <button
                                  onClick={() => {
                                    handleDeleteSurat(item.id);
                                    setActiveDropdownId(null);
                                  }}
                                  className="w-full px-3.5 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 transition cursor-pointer font-bold"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Hapus Permanen
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* TABLE FOOTER */}
          <div className="bg-slate-50 px-5 py-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <span className="text-xs text-slate-500 font-medium">
              Menampilkan <span className="font-bold text-slate-700">{indexOfFirstItem + 1}</span>–
              <span className="font-bold text-slate-700">{Math.min(indexOfLastItem, totalItems)}</span> dari{' '}
              <span className="font-bold text-slate-700">{totalItems}</span> data nomor surat
            </span>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-white transition cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`h-7.5 w-7.5 flex items-center justify-center rounded-lg text-xs font-bold border transition cursor-pointer ${
                      currentPage === page
                        ? 'bg-[#5B3DF5] border-[#5B3DF5] text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:hover:bg-white transition cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT NOMOR SURAT */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-lg w-full flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-150 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5B3DF5]">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">
                    {formId ? 'Ubah Registrasi Nomor Surat' : 'Registrasi Nomor Surat Baru'}
                  </h3>
                  <p className="text-[10px] text-slate-400">Department: {formDept}</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveSurat} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium leading-relaxed">
                  {errorMsg}
                </div>
              )}

              {/* Department Option - Disabled for operator, selectable for Admin */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Departemen Pemilik Nomor</label>
                <select
                  disabled={userRole === 'operator'}
                  value={formDept}
                  onChange={(e) => {
                    setFormDept(e.target.value as any);
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 disabled:bg-slate-50/50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                >
                  {DEPARTMENTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                {userRole === 'operator' && (
                  <p className="text-[10px] text-amber-600 font-semibold">Terkunci otomatis ke departemen akun Anda.</p>
                )}
              </div>

              {/* Tanggal */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Tanggal Registrasi
                </label>
                <input
                  type="date"
                  value={formTanggal}
                  onChange={(e) => setFormTanggal(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Nomor Surat Generative Display */}
              <div className="space-y-1.5 bg-indigo-50/40 p-3.5 border border-indigo-100 rounded-2xl">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-[#5B3DF5]">NOMOR SURAT GENERATOR</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsManualNomor(!isManualNomor);
                      if (isManualNomor) {
                        // Turning manual OFF, re-generate
                        updateGeneratedNomorSurat(formDept, formTanggal);
                      }
                    }}
                    className="text-[10px] font-bold text-indigo-600 hover:underline"
                  >
                    {isManualNomor ? 'Auto-Generate Nomor' : 'Tulis Nomor Manual'}
                  </button>
                </div>
                <input
                  type="text"
                  disabled={!isManualNomor}
                  value={formNomor}
                  onChange={(e) => setFormNomor(e.target.value)}
                  placeholder="Nomor Surat Resmi..."
                  className={`w-full px-3 py-2.5 mt-1.5 border rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    isManualNomor 
                      ? 'bg-white border-indigo-300 text-slate-800' 
                      : 'bg-slate-100/50 border-slate-200 text-[#5B3DF5]'
                  }`}
                />
                {!isManualNomor && (
                  <p className="text-[9px] text-indigo-500 font-semibold mt-1">
                    Sistem mengidentifikasi urutan terakhir di departemen {formDept} untuk mengusulkan nomor urut di atas.
                  </p>
                )}
              </div>

              {/* Perihal */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Perihal / Isi Ringkas Surat</label>
                <textarea
                  placeholder="Contoh: Undangan Rapat Evaluasi K3 Lapangan..."
                  value={formPerihal}
                  onChange={(e) => setFormPerihal(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Tujuan */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Tujuan Surat / Kepada Siapa</label>
                <input
                  type="text"
                  placeholder="Contoh: Seluruh Karyawan, HSE Manager, Mitra Kerja..."
                  value={formTujuan}
                  onChange={(e) => setFormTujuan(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Status Select */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Status Awal</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {(['Digunakan', 'Draft', 'Batal'] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setFormStatus(st)}
                      className={`py-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                        formStatus === st
                          ? st === 'Digunakan'
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                            : st === 'Draft'
                            ? 'bg-blue-50 border-blue-400 text-blue-800'
                            : 'bg-rose-50 border-rose-400 text-rose-800'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        st === 'Digunakan' ? 'bg-emerald-500' : st === 'Draft' ? 'bg-blue-500' : 'bg-rose-500'
                      }`} />
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Batalkan
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#5B3DF5] hover:bg-[#4828db] text-white rounded-xl text-xs font-extrabold transition shadow-md cursor-pointer"
                >
                  {formId ? 'Simpan Perubahan' : 'Registrasi Nomor Surat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DETAIL NOMOR SURAT */}
      {isDetailModalOpen && selectedSurat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full flex flex-col animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-150 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5B3DF5]">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">Detail Registrasi Nomor Surat</h3>
                  <p className="text-[10px] text-slate-500">Dept: {selectedSurat.departemen}</p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content Details */}
            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-1 bg-slate-50 p-4 border border-slate-100 rounded-2xl text-center">
                <span className="text-[9px] font-extrabold text-slate-400 tracking-wider">NOMOR RESMI</span>
                <div className="text-lg font-mono font-extrabold text-[#5B3DF5] tracking-wide mt-0.5">
                  {selectedSurat.nomorSurat}
                </div>
                <div className="mt-1.5">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold border ${
                    selectedSurat.status === 'Digunakan'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : selectedSurat.status === 'Draft'
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-rose-50 border-rose-200 text-rose-700'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      selectedSurat.status === 'Digunakan' ? 'bg-emerald-500' : selectedSurat.status === 'Draft' ? 'bg-blue-500' : 'bg-rose-500'
                    }`} />
                    {selectedSurat.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Data grid */}
              <div className="space-y-3">
                <div className="grid grid-cols-3 border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-450">Tanggal Daftar</span>
                  <span className="col-span-2 text-slate-800 font-semibold">{formatDateIndo(selectedSurat.tanggal)}</span>
                </div>
                <div className="grid grid-cols-3 border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-450">Departemen</span>
                  <span className="col-span-2 text-slate-800 font-semibold">{selectedSurat.departemen}</span>
                </div>
                <div className="grid grid-cols-3 border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-450">Dibuat Oleh</span>
                  <span className="col-span-2 text-slate-800 font-semibold">{selectedSurat.createdBy}</span>
                </div>
                <div className="grid grid-cols-3 border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-450">Tujuan Surat</span>
                  <span className="col-span-2 text-slate-800 font-semibold leading-relaxed">{selectedSurat.tujuan}</span>
                </div>
                <div className="grid grid-cols-3 pb-1">
                  <span className="font-bold text-slate-450">Perihal / Isi</span>
                  <span className="col-span-2 text-slate-800 font-semibold leading-relaxed whitespace-pre-wrap">{selectedSurat.perihal}</span>
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-4 border-t border-slate-150 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    handlePrint(selectedSurat);
                  }}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  Print Bukti
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      handleOpenCreateModal(selectedSurat);
                      setIsDetailModalOpen(false);
                    }}
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-[#5B3DF5] border border-indigo-200 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Ubah
                  </button>
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
