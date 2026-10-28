import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  Download,
  Printer,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  User,
  Hash,
  Briefcase,
  FileSpreadsheet,
  Users,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  FileText
} from 'lucide-react';
import { PageHeader, Button, Badge } from './common/index.js';

interface EmployeeDetail {
  nama: string;
  nik: string; // nrp
  dept: string; // departemen
  jabatan?: string; // jabatan
  tanggalLahir?: string;
  grade?: string;
  masaBerlakuMinePermit?: string;
}

interface MinePermitMonitoringProps {
  activeSite?: string;
  userRole?: 'admin' | 'operator';
  onBack: () => void;
}

export default function MinePermitMonitoring({ activeSite, userRole = 'admin', onBack }: MinePermitMonitoringProps) {
  const [employees, setEmployees] = useState<EmployeeDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'aktif' | 'akan_expired' | 'expired'>('all');
  
  // Sorting state for "Berlaku Mine Permit"
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'none'>('none');

  // Edit Mine Permit states
  const [editingEmployee, setEditingEmployee] = useState<EmployeeDetail | null>(null);
  const [editDateText, setEditDateText] = useState('');
  const [editDatePick, setEditDatePick] = useState('');
  const [saving, setSaving] = useState(false);

  // Helper date-to-HTML formatter
  const getHtmlDateString = (dateStr?: string): string => {
    if (!dateStr) return '';
    const dateObj = parseMinePermitDate(dateStr);
    if (!dateObj || isNaN(dateObj.getTime())) return '';
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const formatDateToSheet = (dateStr: string): string => {
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return dateStr;
    const day = String(dateObj.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    return `${day}-${month}-${year}`; // e.g. "08-Aug-2026"
  };

  const handleStartEdit = (emp: EmployeeDetail) => {
    setEditingEmployee(emp);
    const dateStr = emp.masaBerlakuMinePermit || '';
    setEditDateText(dateStr);
    setEditDatePick(getHtmlDateString(dateStr));
  };

  const handleSaveMinePermit = async () => {
    if (!editingEmployee || !editDateText.trim()) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/karyawan/update-mine-permit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nama: editingEmployee.nama,
          nrp: editingEmployee.nik,
          newDate: editDateText.trim()
        })
      });

      const data = await response.json();
      if (data.success) {
        setEmployees(prev => prev.map(emp => {
          if (emp.nama.toLowerCase().trim() === editingEmployee.nama.toLowerCase().trim() && emp.nik === editingEmployee.nik) {
            return {
              ...emp,
              masaBerlakuMinePermit: editDateText.trim()
            };
          }
          return emp;
        }));
        setEditingEmployee(null);
      } else {
        alert(data.error || 'Gagal menyimpan perubahan.');
      }
    } catch (err) {
      console.error('Error saving mine permit:', err);
      alert('Terjadi kesalahan koneksi saat menyimpan.');
    } finally {
      setSaving(false);
    }
  };

  const [showExtendConfirm, setShowExtendConfirm] = useState<string | null>(null);

  const addOneYearToDateString = (dateStr?: string): string => {
    if (!dateStr) {
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      const day = String(nextYear.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[nextYear.getMonth()];
      const year = nextYear.getFullYear();
      return `${day}-${month}-${year}`;
    }

    const parsed = parseMinePermitDate(dateStr);
    if (!parsed || isNaN(parsed.getTime())) {
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      const day = String(nextYear.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[nextYear.getMonth()];
      const year = nextYear.getFullYear();
      return `${day}-${month}-${year}`;
    }

    // Add 1 year locally
    const originalYear = parsed.getFullYear();
    parsed.setFullYear(originalYear + 1);

    const day = String(parsed.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[parsed.getMonth()];
    const year = parsed.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleExtendOneYear = async (emp: EmployeeDetail) => {
    const originalDate = emp.masaBerlakuMinePermit || '';
    const updatedDate = addOneYearToDateString(originalDate);

    setSaving(true);
    try {
      const response = await fetch('/api/karyawan/update-mine-permit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nama: emp.nama,
          nrp: emp.nik,
          newDate: updatedDate
        })
      });

      const data = await response.json();
      if (data.success) {
        setEmployees(prev => prev.map(item => {
          if (item.nama.toLowerCase().trim() === emp.nama.toLowerCase().trim() && item.nik === emp.nik) {
            return {
              ...item,
              masaBerlakuMinePermit: updatedDate
            };
          }
          return item;
        }));
        setShowExtendConfirm(null);
      } else {
        alert(data.error || 'Gagal memperpanjang secara otomatis.');
      }
    } catch (err) {
      console.error('Error auto-extending:', err);
      alert('Terjadi kesalahan koneksi.');
    } finally {
      setSaving(false);
    }
  };

  const toggleSort = () => {
    if (sortOrder === 'none') {
      setSortOrder('asc');
    } else if (sortOrder === 'asc') {
      setSortOrder('desc');
    } else {
      setSortOrder('none');
    }
  };

  // Custom period monitoring (month & year)
  // Default to today's month/year
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth()); // 0-11
  const [selectedYear, setSelectedYear] = useState<number>(2026); // Default 2026 as per workspace system time

  // Selection keys for multi-selecting workers for Surat Pengantar MCU
  const [selectedEmpKeys, setSelectedEmpKeys] = useState<string[]>([]);
  const [showMcuLetterDrawer, setShowMcuLetterDrawer] = useState(false);
  const [mcuLetterNo, setMcuLetterNo] = useState('01/SHE/EXT/VI/2026');
  const [mcuLetterHal, setMcuLetterHal] = useState('Surat Pengantar MCU Reinduksi Periode Juli 2026');
  const [mcuLetterDate, setMcuLetterDate] = useState('20-Jul-2026');
  const [mcuLetterLampiran, setMcuLetterLampiran] = useState('1 Berkas (Rincian Biaya MCU)');
  const [mcuLetterPic1, setMcuLetterPic1] = useState('Muhammad Ali (muhammad.ali@indotruck-utama.co.id)');
  const [mcuLetterPic2, setMcuLetterPic2] = useState('Rahmat Hidayat (rahmat.hidayat@indotruck-utama.co.id)');
  const [mcuLetterRecipient, setMcuLetterRecipient] = useState(
    'Klinik Ultra Medica Tanjung Tabalong\nJl. Jendral Ahmad Yani RT 04. Murung Pudak\nTabalong - Kalimantan Selatan'
  );
  const [mcuLetterPjo, setMcuLetterPjo] = useState('Mulyanto');

  // Customization per peserta (Rank, Posisi/Jabatan, Usia, Keterangan)
  const [mcuLetterEmployeeKeterangan, setMcuLetterEmployeeKeterangan] = useState<Record<string, string>>({});
  const [mcuLetterEmployeeRank, setMcuLetterEmployeeRank] = useState<Record<string, string>>({});
  const [mcuLetterEmployeePosisi, setMcuLetterEmployeePosisi] = useState<Record<string, string>>({});
  const [mcuLetterEmployeeAge, setMcuLetterEmployeeAge] = useState<Record<string, string>>({});

  // MCU cost breakdown states
  const [mcuBasePrice, setMcuBasePrice] = useState<number>(608920);
  const [mcuTreadmillPrice, setMcuTreadmillPrice] = useState<number>(350000);
  const [showMcuCostTable, setShowMcuCostTable] = useState<boolean>(true);
  const [mcuCostTableFontSize, setMcuCostTableFontSize] = useState<'8px' | '8.5px' | '9px' | '10px'>('8.5px');
  const [printError, setPrintError] = useState<string | null>(null);

  const getAge = (birthDateStr?: string): number => {
    if (!birthDateStr) return 0;
    const parsed = parseMinePermitDate(birthDateStr);
    if (!parsed || isNaN(parsed.getTime())) return 0;
    const todayObj = new Date();
    let age = todayObj.getFullYear() - parsed.getFullYear();
    const m = todayObj.getMonth() - parsed.getMonth();
    if (m < 0 || (m === 0 && todayObj.getDate() < parsed.getDate())) {
      age--;
    }
    return age > 0 && age < 100 ? age : 0;
  };

  const getEmployeeRank = (emp: EmployeeDetail): string => {
    if (mcuLetterEmployeeRank[emp.nik] !== undefined) return mcuLetterEmployeeRank[emp.nik];
    return emp.grade || '';
  };

  const getEmployeePosisi = (emp: EmployeeDetail): string => {
    if (mcuLetterEmployeePosisi[emp.nik] !== undefined) return mcuLetterEmployeePosisi[emp.nik];
    return emp.jabatan || emp.dept || '';
  };

  const getEmployeeAge = (emp: EmployeeDetail): string => {
    if (mcuLetterEmployeeAge[emp.nik] !== undefined) return mcuLetterEmployeeAge[emp.nik];
    const calc = getAge(emp.tanggalLahir);
    return calc > 0 ? String(calc) : '';
  };

  const formatAgeWithUnit = (val: string): string => {
    if (!val || !val.trim()) return '-';
    const trimmed = val.trim();
    if (/tahun$/i.test(trimmed)) {
      return trimmed.replace(/tahun$/i, 'Thn').trim();
    }
    if (/thn$/i.test(trimmed)) {
      return trimmed;
    }
    return `${trimmed} Thn`;
  };

  const getEmployeeKeterangan = (emp: EmployeeDetail): string => {
    if (mcuLetterEmployeeKeterangan[emp.nik] !== undefined) return mcuLetterEmployeeKeterangan[emp.nik];
    const ageStr = getEmployeeAge(emp);
    const ageNum = parseInt(ageStr, 10);
    const is35Plus = !isNaN(ageNum) ? ageNum >= 35 : getAge(emp.tanggalLahir) >= 35;
    return is35Plus ? '(MCU BERKALA) TAHUNAN + TREADMILL' : '(MCU BERKALA) TAHUNAN';
  };

  const monthsIndonesian = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const yearsAvailable = [2025, 2026, 2027, 2028, 2029, 2030];

  const toggleSelectEmployee = (nik: string) => {
    setSelectedEmpKeys(prev =>
      prev.includes(nik) ? prev.filter(k => k !== nik) : [...prev, nik]
    );
  };

  const toggleSelectAll = () => {
    const allKeys = sortedEmployees.map(emp => emp.nik);
    const isAllSelected = allKeys.length > 0 && allKeys.every(k => selectedEmpKeys.includes(k));
    if (isAllSelected) {
      setSelectedEmpKeys(prev => prev.filter(k => !allKeys.includes(k)));
    } else {
      setSelectedEmpKeys(prev => {
        const copy = [...prev];
        allKeys.forEach(k => {
          if (!copy.includes(k)) copy.push(k);
        });
        return copy;
      });
    }
  };

  // Load employee data on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/karyawan');
        const data = await res.json();
        if (data.success && Array.isArray(data.karyawanDetail)) {
          // Filter out pure login accounts without Mine Permit date so they don't clog the expired list
          let validMinePermitEmployees = data.karyawanDetail.filter((emp: EmployeeDetail) => {
            const deptUpper = (emp.dept || '').toUpperCase().trim();
            return deptUpper !== 'USER / MANAGEMENT' && deptUpper !== 'USER MANAGEMENT';
          });
          
          if (userRole === 'operator' && activeSite && activeSite !== 'ALL') {
            validMinePermitEmployees = validMinePermitEmployees.filter((emp: any) => {
              const empSite = emp.site || 'ITU-Admo';
              return empSite.toLowerCase() === activeSite.toLowerCase();
            });
          }
          
          setEmployees(validMinePermitEmployees);
        } else {
          setError('Format data karyawan tidak valid atau kosong.');
        }
      } catch (err) {
        console.error('Failed to fetch employee list:', err);
        setError('Gagal memuat data dari server.');
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  // Helper date parser
  const monthsMap: Record<string, number> = {
    jan: 0, januari: 0,
    feb: 1, februari: 1,
    mar: 2, maret: 2,
    apr: 3, april: 3,
    mei: 4, may: 4,
    jun: 5, juni: 5,
    jul: 6, juli: 6,
    agu: 7, ags: 7, agustus: 7, aug: 7,
    sep: 8, september: 8,
    okt: 9, oktober: 9, oct: 9,
    nov: 10, november: 10,
    des: 11, desember: 11, dec: 11,
  };

  const parseMinePermitDate = (dateStr?: string): Date | null => {
    if (!dateStr) return null;
    const clean = dateStr.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, ' ');
    const parts = clean.split(/[-\s]+/);
    
    if (parts.length >= 3) {
      const day = parseInt(parts[0], 10);
      const mStr = parts[1];
      const year = parseInt(parts[2], 10);
      
      let mIdx = -1;
      if (monthsMap[mStr] !== undefined) {
        mIdx = monthsMap[mStr];
      } else {
        const parsedNum = parseInt(mStr, 10);
        if (!isNaN(parsedNum)) {
          mIdx = parsedNum - 1;
        }
      }
      
      if (!isNaN(day) && mIdx !== -1 && !isNaN(year)) {
        const fullYear = year < 100 ? (year + 2000) : year;
        return new Date(fullYear, mIdx, day);
      }
    }
    
    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) {
      return new Date(parsed);
    }
    return null;
  };

  // Process and compute stats and categorized list
  const processedEmployees = employees.map(emp => {
    const permitDate = parseMinePermitDate(emp.masaBerlakuMinePermit);
    
    let status: 'aktif' | 'akan_expired' | 'expired' = 'aktif';
    let monthsDiff = 999;

    if (permitDate) {
      const expiryYear = permitDate.getFullYear();
      const expiryMonth = permitDate.getMonth(); // 0-11

      // Calculate relative delta in months compared to selected month/year
      monthsDiff = (expiryYear - selectedYear) * 12 + (expiryMonth - selectedMonth);

      if (monthsDiff < 0) {
        status = 'expired';
      } else if (monthsDiff >= 0 && monthsDiff <= 4) {
        status = 'akan_expired';
      } else {
        status = 'aktif';
      }
    } else {
      status = 'expired'; // fallback if no permit date is specified
    }

    return {
      ...emp,
      parsedDate: permitDate,
      status,
      monthsDiff
    };
  });

  // Calculate statistics based on current active month
  const totalAktif = processedEmployees.filter(e => e.status === 'aktif').length;
  const totalAkanExpired = processedEmployees.filter(e => e.status === 'akan_expired').length;
  const totalExpired = processedEmployees.filter(e => e.status === 'expired').length;

  // Filtered list based on search query and status filter
  const filteredEmployees = processedEmployees.filter(emp => {
    // Search query matches nama, nrp, jabatan, or dept
    const query = searchQuery.toLowerCase().trim();
    const matchSearch =
      emp.nama.toLowerCase().includes(query) ||
      emp.nik.toLowerCase().includes(query) ||
      (emp.jabatan || '').toLowerCase().includes(query) ||
      (emp.dept || '').toLowerCase().includes(query);

    // Status match
    const matchStatus = selectedStatus === 'all' || emp.status === selectedStatus;

    return matchSearch && matchStatus;
  });

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    if (sortOrder === 'none') return 0;

    const dateA = a.parsedDate;
    const dateB = b.parsedDate;

    // Put null/invalid dates at the end
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;

    if (sortOrder === 'asc') {
      return dateA.getTime() - dateB.getTime();
    } else {
      return dateB.getTime() - dateA.getTime();
    }
  });

  // Export to CSV/Excel Action
  const handleExportCSV = () => {
    const separator = ';';
    const headers = ['Nama Karyawan', 'NRP', 'Jabatan', 'Departemen', 'Grade', 'Masa Berlaku Mine Permit', 'Status Monitoring'];
    
    const csvRows = [
      headers.join(separator),
      ...sortedEmployees.map(emp => {
        const rowStatus = emp.status === 'aktif' 
          ? 'Aktif' 
          : emp.status === 'akan_expired' 
            ? 'Akan Expired (< 4 Bulan)' 
            : 'Expired';
        return [
          `"${emp.nama}"`,
          `"${emp.nik}"`,
          `"${emp.jabatan || '-'}"`,
          `"${emp.dept || '-'}"`,
          `"${emp.grade || '-'}"`,
          `"${emp.masaBerlakuMinePermit || '-'}"`,
          `"${rowStatus}"`
        ].join(separator);
      })
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csvRows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    const fileName = `Monitoring_Mine_Permit_${monthsIndonesian[selectedMonth]}_${selectedYear}.csv`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export PDF layout by utilizing native window.print() restricted to report layout
  const handlePrint = () => {
    const originalTitle = document.title;
    try {
      setPrintError(null);
      if (mcuLetterHal) {
        document.title = mcuLetterHal;
      }
      window.print();
    } catch (err) {
      console.error("Print blocked/restricted inside iframe sandbox:", err);
      setPrintError("Cetak diblokir oleh browser di dalam frame preview ini. Silakan klik tombol 'Buka di Tab Baru' (New Tab) di bagian kanan atas layar Anda untuk mencetak PDF dengan sukses.");
    } finally {
      // Revert the document title after a short delay so the print subsystem correctly registers it
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      <div id="mcu-monitoring-dashboard-container" className="space-y-6 print:hidden">
      {/* Header and Back Button */}
      <PageHeader
        title="Monitoring Masa Expired Mine Permit"
        subtitle="Sistem pemantauan validitas dan periodisasi Mine Permit karyawan PT Indotruck Utama."
        onBack={onBack}
        badge={<Badge variant="warning">NEW MODULE</Badge>}
        icon={<ShieldCheck className="h-6 w-6 text-indigo-650" />}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              icon={<FileSpreadsheet className="h-4 w-4 text-emerald-600" />}
              disabled={filteredEmployees.length === 0}
              onClick={handleExportCSV}
            >
              Export ke Excel (CSV)
            </Button>
            <Button
              variant="secondary"
              icon={<Printer className="h-4 w-4 text-slate-500" />}
              disabled={filteredEmployees.length === 0}
              onClick={handlePrint}
            >
              Cetak / PDF
            </Button>
            <Button
              variant="primary"
              icon={<FileText className="h-4 w-4" />}
              onClick={() => {
                if (selectedEmpKeys.length === 0) {
                  alert("Silakan centang/pilih karyawan terlebih dahulu pada tabel di bawah.");
                  return;
                }
                const currentMonthName = monthsIndonesian[selectedMonth];
                setMcuLetterHal(`Surat Pengantar MCU Reinduksi Periode ${currentMonthName} ${selectedYear}`);
                setMcuLetterDate(`20 ${currentMonthName} ${selectedYear}`);
                setShowMcuLetterDrawer(true);
              }}
            >
              Buat Surat Pengantar MCU ({selectedEmpKeys.length})
            </Button>
          </div>
        }
      />

      {/* PRINT-ONLY HEADER */}
      <div className="hidden print:block space-y-2 border-b-2 border-slate-900 pb-3 text-slate-950">
        <h1 className="text-xl font-black text-center uppercase tracking-wider">
          LAPORAN MONITORING MASA EXPIRED MINE PERMIT
        </h1>
        <p className="text-xs font-bold text-center">
          Periode Monitoring: {monthsIndonesian[selectedMonth]} {selectedYear} (Akan Kadaluwarsa s.d {monthsIndonesian[(selectedMonth + 4) % 12]} {selectedYear + Math.floor((selectedMonth + 4) / 12)})
        </p>
        <p className="text-[10px] text-right italic font-semibold">
          Dicetak pada: {new Date().toLocaleString('id-ID')}
        </p>
      </div>

      {/* Period Selection Controls / Filtering Panel */}
      <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-200/80 print:hidden space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Calendar className="h-4.5 w-4.5 text-indigo-650" />
          <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider">
            Konfigurasi Periode Bulan Monitoring
          </h3>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          {/* Select Month */}
          <div className="flex-1 space-y-1">
            <label htmlFor="select-month-permit" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Bulan Acuan Monitoring
            </label>
            <select
              id="select-month-permit"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(Number(e.target.value));
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-205 bg-white text-xs font-bold focus:border-indigo-550 focus:outline-none focus:ring-1 focus:ring-indigo-550 transition shadow-sm cursor-pointer"
            >
              {monthsIndonesian.map((m, idx) => (
                <option key={idx} value={idx}>{m}</option>
              ))}
            </select>
          </div>

          {/* Select Year */}
          <div className="flex-1 space-y-1">
            <label htmlFor="select-year-permit" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Tahun Acuan
            </label>
            <select
              id="select-year-permit"
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(Number(e.target.value));
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-205 bg-white text-xs font-bold focus:border-indigo-550 focus:outline-none focus:ring-1 focus:ring-indigo-550 transition shadow-sm cursor-pointer"
            >
              {yearsAvailable.map((yr) => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          {/* Prompt info */}
          <div className="md:w-1/3 bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 flex items-start gap-2 text-xs">
            <div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-black text-indigo-700">i</span>
            </div>
            <p className="text-slate-650 font-semibold leading-normal">
              Acuan bulan monitoring akan membandingkan validitas Mine Permit. Target <span className="text-indigo-900 font-extrabold">&quot;Akan Expired&quot;</span> adalah karyawan yang berakhir pada bulan <b>{monthsIndonesian[(selectedMonth + 4) % 12]} {selectedYear + Math.floor((selectedMonth + 4) / 12)}</b> (4 bulan pasca periode dipilih) beserta bulan-bulan transisi perantaranya.
            </p>
          </div>
        </div>
      </div>

      {/* Database Integration Loading and Error handling */}
      {loading && (
        <div className="p-8 text-center bg-white border rounded-3xl animate-pulse">
          <p className="text-slate-500 font-bold text-sm">Memuat data monitoring mine permit...</p>
        </div>
      )}

      {error && (
        <div className="p-5 bg-rose-50 border border-rose-200 text-rose-850 rounded-2xl text-xs font-bold">
          ⚠ {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Summary Cards Dashboard Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Total Aktif */}
            <div
              id="card-status-aktif"
              onClick={() => setSelectedStatus(selectedStatus === 'aktif' ? 'all' : 'aktif')}
              className={`p-4 rounded-2xl border-2 transition cursor-pointer select-none ${
                selectedStatus === 'aktif' 
                  ? 'bg-emerald-50/80 border-emerald-500 shadow-md ring-2 ring-emerald-500/20' 
                  : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">
                  Total Mine Permit Aktif
                </span>
                <span className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="h-4.5 w-4.5" />
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900">{totalAktif}</span>
                <span className="text-[10px] font-bold text-slate-500">Karyawan</span>
              </div>
              <p className="text-[9.5px] mt-1.5 text-slate-400 font-bold">
                Masa berlaku lebih dari 4 bulan mendatang.
              </p>
            </div>

            {/* Total Akan Expired */}
            <div
              id="card-status-akan-expired"
              onClick={() => setSelectedStatus(selectedStatus === 'akan_expired' ? 'all' : 'akan_expired')}
              className={`p-4 rounded-2xl border-2 transition cursor-pointer select-none ${
                selectedStatus === 'akan_expired' 
                  ? 'bg-amber-50/80 border-amber-500 shadow-md ring-2 ring-amber-500/20' 
                  : 'bg-white border-slate-200 hover:border-amber-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">
                  Akan Expired dalam 4 Bulan
                </span>
                <span className="h-7 w-7 rounded-lg bg-amber-100 text-amber-705 flex items-center justify-center">
                  <AlertTriangle className="h-4.5 w-4.5" />
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900">{totalAkanExpired}</span>
                <span className="text-[10px] font-bold text-slate-500">Karyawan</span>
              </div>
              <p className="text-[9.5px] mt-1.5 text-slate-400 font-bold">
                Kadaluwarsa s.d {monthsIndonesian[(selectedMonth + 4) % 12]} {selectedYear + Math.floor((selectedMonth + 4) / 12)}.
              </p>
            </div>

            {/* Total Sudah Expired */}
            <div
              id="card-status-expired"
              onClick={() => setSelectedStatus(selectedStatus === 'expired' ? 'all' : 'expired')}
              className={`p-4 rounded-2xl border-2 transition cursor-pointer select-none ${
                selectedStatus === 'expired' 
                  ? 'bg-rose-50/80 border-rose-500 shadow-md ring-2 ring-rose-500/20' 
                  : 'bg-white border-slate-205 hover:border-rose-350 hover:bg-slate-50'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">
                  Total Sudah Expired
                </span>
                <span className="h-7 w-7 rounded-lg bg-rose-100 text-rose-650 flex items-center justify-center">
                  <XCircle className="h-4.5 w-4.5" />
                </span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900">{totalExpired}</span>
                <span className="text-[10px] font-bold text-slate-500">Karyawan</span>
              </div>
              <p className="text-[9.5px] mt-1.5 text-slate-400 font-bold">
                Masa berlaku kedaluwarsa sudah lewat acuan.
              </p>
            </div>

          </div>

          {/* Filtering and Search Input controls */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
            
            {/* Search Input */}
            <div className="w-full md:w-1/3 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="inp-search-permit"
                type="text"
                placeholder="Cari Nama, NRP, atau Jabatan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 border border-slate-205 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white bg-slate-50/40 transition"
              />
            </div>

            {/* Quick status tabs */}
            <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider shrink-0 mr-1.5">
                Pilih Kelompok Status:
              </span>
              <button
                type="button"
                onClick={() => setSelectedStatus('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-tight transition shrink-0 cursor-pointer ${
                  selectedStatus === 'all' 
                    ? 'bg-slate-900 text-white shadow-sm' 
                    : 'bg-slate-100 font-semibold hover:bg-slate-200 text-slate-650'
                }`}
              >
                Semua ({processedEmployees.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('aktif')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-tight transition shrink-0 cursor-pointer ${
                  selectedStatus === 'aktif' 
                    ? 'bg-emerald-650 text-white border-emerald-700 shadow-sm' 
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-100'
                }`}
              >
                Aktif ({totalAktif})
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('akan_expired')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-tight transition shrink-0 cursor-pointer ${
                  selectedStatus === 'akan_expired' 
                    ? 'bg-amber-600 text-white border-amber-700 shadow-sm' 
                    : 'bg-amber-50 text-amber-805 hover:bg-amber-100 border border-amber-150'
                }`}
              >
                Akan Expired ({totalAkanExpired})
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('expired')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-tight transition shrink-0 cursor-pointer ${
                  selectedStatus === 'expired' 
                    ? 'bg-rose-650 text-white border-rose-700 shadow-sm' 
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-150'
                }`}
              >
                Expired ({totalExpired})
              </button>
            </div>

          </div>

          {/* Results Info and Datatable wrapper */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="table-wrapper overflow-x-auto w-full">
              <table id="tbl-mine-permit-monitoring" className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-205 font-extrabold uppercase text-slate-500 tracking-wider font-mono text-[10px]">
                    <th scope="col" className="py-3.5 px-4 w-12 text-center print:hidden">
                      <input
                        type="checkbox"
                        checked={sortedEmployees.length > 0 && sortedEmployees.every(emp => selectedEmpKeys.includes(emp.nik))}
                        onChange={toggleSelectAll}
                        title="Pilih Semua"
                        className="h-4 w-4 rounded border-slate-205 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </th>
                    <th scope="col" className="py-3.5 px-4"><div className="flex items-center gap-1.5"><User className="h-3 w-3 shrink-0" /> Nama Karyawan</div></th>
                    <th scope="col" className="py-3.5 px-4"><div className="flex items-center gap-1.5"><Hash className="h-3 w-3 shrink-0" /> NRP</div></th>
                    <th scope="col" className="py-3.5 px-4"><div className="flex items-center gap-1.5"><Briefcase className="h-3 w-3 shrink-0" /> Jabatan</div></th>
                    <th scope="col" className="py-3.5 px-4">Departemen</th>
                    <th scope="col" className="py-3.5 px-4">Grade</th>
                    <th
                      scope="col"
                      className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 select-none transition group/th print:pointer-events-none"
                      onClick={toggleSort}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3 shrink-0" /> Berlaku Mine Permit</div>
                        <div className="flex items-center text-slate-400 group-hover/th:text-slate-600 print:hidden transition">
                          {sortOrder === 'none' && <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />}
                          {sortOrder === 'asc' && <ArrowUp className="h-3.5 w-3.5 text-indigo-650" />}
                          {sortOrder === 'desc' && <ArrowDown className="h-3.5 w-3.5 text-indigo-650" />}
                        </div>
                      </div>
                    </th>
                    <th scope="col" className="py-3.5 px-4 text-center print:hidden">Sudah Diperpanjang?</th>
                    <th scope="col" className="py-3.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedEmployees.length > 0 ? (
                    sortedEmployees.map((emp, index) => {
                      return (
                        <tr
                          key={emp.nik + index}
                          className={`hover:bg-slate-50/70 transition font-semibold text-slate-755 ${selectedEmpKeys.includes(emp.nik) ? 'bg-indigo-50/20' : ''}`}
                        >
                          <td className="py-3.5 px-4 text-center print:hidden">
                            <input
                              type="checkbox"
                              checked={selectedEmpKeys.includes(emp.nik)}
                              onChange={() => toggleSelectEmployee(emp.nik)}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 group-hover:text-indigo-900">
                            {emp.nama}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-550 font-bold">
                            {emp.nik}
                          </td>
                          <td className="py-3.5 px-4 text-slate-800 font-semibold">
                            {emp.jabatan || emp.dept || '-'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 text-[11.5px]">
                            {emp.dept || '-'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-mono text-[11px] bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                              {emp.grade || '-'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold">
                            <div className="flex items-center justify-between gap-1.5 group/cell">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className="font-mono text-[11.5px] text-slate-800">
                                  {emp.masaBerlakuMinePermit || 'Belum Terdata'}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(emp)}
                                title="Edit Masa Berlaku"
                                className="p-1 px-2 text-indigo-850 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-[10px] font-bold transition flex items-center gap-1 opacity-0 group-hover/cell:opacity-100 focus:opacity-100 cursor-pointer print:hidden select-none"
                              >
                                <Pencil className="h-2.5 w-2.5" /> Edit
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center print:hidden">
                            {showExtendConfirm === emp.nik ? (
                              <div className="flex items-center justify-center gap-1.5 animate-in fade-in duration-100">
                                <button
                                  type="button"
                                  onClick={() => handleExtendOneYear(emp)}
                                  className="px-2.5 py-1 text-[10px] font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-sm cursor-pointer"
                                >
                                  Iya
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowExtendConfirm(null)}
                                  className="px-2.5 py-1 text-[10px] font-black bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg transition cursor-pointer"
                                >
                                  Tidak
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setShowExtendConfirm(emp.nik)}
                                className="px-2.5 py-1 bg-indigo-55 hover:bg-indigo-600 hover:text-white text-indigo-700 text-[10.5px] font-bold rounded-lg border border-indigo-100 transition cursor-pointer flex items-center justify-center gap-1 mx-auto"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Sudah Diperpanjang?
                              </button>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {emp.status === 'expired' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-150 uppercase tracking-wider">
                                <XCircle className="h-3 w-3" />
                                Expired
                              </span>
                            ) : emp.status === 'akan_expired' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-150 uppercase tracking-wider animate-pulse">
                                <AlertTriangle className="h-3 w-3 text-amber-500" />
                                Akan Expired (&lt; 4 Bulan)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-150 uppercase tracking-wider">
                                <CheckCircle2 className="h-3 w-3" />
                                Aktif
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <Users className="h-10 w-10 mx-auto opacity-35 text-slate-400 mb-2.5" />
                        <p className="font-bold text-sm">Tidak menemukan hasil monitoring karyawan.</p>
                        <p className="text-[10.5px] text-slate-400 mt-1 font-semibold">Coba ubah kata kunci atau ganti status monitoring.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Information Footer help Card */}
      <div className="bg-slate-100 border border-slate-200 p-4.5 rounded-2xl relative shadow-inner print:hidden">
        <h4 className="text-[11px] font-black uppercase text-slate-600 tracking-wider mb-1 flex items-center gap-1">
          💡 Tips & Ketentuan Laba Saringan
        </h4>
        <ul className="list-disc list-inside text-[11px] leading-relaxed text-slate-550 space-y-1 font-semibold">
          <li>Penghitungan bulan acuan monitoring memproses tanggal validasi yang berada di lembar <b>&quot;Data Karyawan&quot;</b> secara langsung.</li>
          <li>Apabila Anda mencetak laporan ini, elemen kontrol navigasi, tombol ekspor, serta filter otomatis akan disembunyikan agar tampilan PDF bersih dan siap dibagikan kepada jajaran Manajemen.</li>
        </ul>
      </div>

      {/* Edit Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in duration-150">
            <div className="flex justify-between items-center border-b pb-3.5">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-700" />
                Edit Masa Berlaku Mine Permit
              </h3>
              <button
                type="button"
                onClick={() => setEditingEmployee(null)}
                className="text-slate-400 hover:text-slate-600 transition p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nama</span>
                  <span className="font-extrabold text-slate-900">{editingEmployee.nama}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">NRP / NIK</span>
                  <span className="font-mono font-bold text-indigo-950 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">{editingEmployee.nik}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Jabatan</span>
                  <span className="font-bold text-slate-700">{editingEmployee.jabatan || editingEmployee.dept || '-'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Departemen</span>
                  <span className="font-bold text-slate-700">{editingEmployee.dept || '-'}</span>
                </div>
              </div>

              {/* Datepicker input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Pilih Tanggal Baru (Date Picker)
                </label>
                <input
                  type="date"
                  value={editDatePick}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditDatePick(val);
                    if (val) {
                      setEditDateText(formatDateToSheet(val));
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-250 text-xs font-bold bg-white focus:outline-none focus:border-indigo-500 shadow-sm cursor-pointer"
                />
              </div>

              {/* Text representation input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-505 uppercase tracking-wider">
                  Format Teks Simpan (DD-Mmm-YYYY)
                </label>
                <input
                  type="text"
                  value={editDateText}
                  onChange={(e) => setEditDateText(e.target.value)}
                  placeholder="Contoh: 20-Aug-2026"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-250 text-xs font-bold bg-white focus:outline-none focus:border-indigo-500 shadow-sm"
                />
                <p className="text-[9.5px] text-slate-400 leading-relaxed font-semibold">
                  Sistem menyimpan data ini ke sheet. Pastikan format penulisan seragam (contoh: <b>20-Aug-2026</b> atau <b>05-Apr-2027</b>).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2.5">
              <button
                type="button"
                onClick={() => setEditingEmployee(null)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-205 text-slate-705 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveMinePermit}
                disabled={saving}
                className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Surat Pengantar MCU Modal / Drawer */}
      {showMcuLetterDrawer && (
        <div id="mcu-letter-drawer" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex flex-col md:flex-row animate-in fade-in duration-150 print:p-0 print:bg-white overflow-hidden">
          
          {/* Left Panel: Configuration Editor (hidden on print) */}
          <div id="mcu-letter-drawer-left" className="w-full md:w-[380px] bg-white border-r border-slate-200 flex flex-col h-full print:hidden">
            {/* Title */}
            <div className="p-4 border-b border-slate-150 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-black text-slate-950 flex items-center gap-1.5">
                  <FileText className="h-4.5 w-4.5 text-indigo-600" />
                  Pengaturan Surat Pengantar
                </h3>
                <p className="text-[10px] text-slate-450 font-bold">Kustomisasi isi surat sebelum cetak</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMcuLetterDrawer(false)}
                className="p-1 px-2.5 text-[10px] font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg transition cursor-pointer"
              >
                Tutup
              </button>
            </div>

            {/* Editor Body */}
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              
              {/* Nomor Surat */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Nomor Surat</label>
                <input
                  type="text"
                  value={mcuLetterNo}
                  onChange={(e) => setMcuLetterNo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-205 rounded-xl text-xs font-bold"
                />
              </div>

              {/* Tanggal Surat */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Tanggal Surat</label>
                <input
                  type="text"
                  value={mcuLetterDate}
                  onChange={(e) => setMcuLetterDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-205 rounded-xl text-xs font-bold"
                />
              </div>

              {/* Lampiran Surat */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Lampiran Surat</label>
                <input
                  type="text"
                  value={mcuLetterLampiran}
                  onChange={(e) => setMcuLetterLampiran(e.target.value)}
                  placeholder="Contoh: 1 Berkas (Rincian Biaya MCU) atau -"
                  className="w-full px-3 py-2 border border-slate-205 rounded-xl text-xs font-bold"
                />
              </div>

              {/* Hal / Perihal */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Hal / Perihal</label>
                <input
                  type="text"
                  value={mcuLetterHal}
                  onChange={(e) => setMcuLetterHal(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-205 rounded-xl text-xs font-bold"
                />
              </div>

              {/* Penerima Surat */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Kepada Yth. / Klinik</label>
                <textarea
                  value={mcuLetterRecipient}
                  onChange={(e) => setMcuLetterRecipient(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-205 rounded-xl text-xs font-bold resize-none leading-normal"
                />
              </div>

              {/* PIC Emails */}
              <div className="space-y-3 p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                <span className="block text-[9px] font-black text-indigo-800 uppercase tracking-widest">Kontak Email PIC</span>
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold text-slate-450">PIC 1 (Ali)</label>
                  <input
                    type="text"
                    value={mcuLetterPic1}
                    onChange={(e) => setMcuLetterPic1(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-indigo-100 bg-white rounded-lg text-[10px] font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold text-slate-450">PIC 2 (Rahmat)</label>
                  <input
                    type="text"
                    value={mcuLetterPic2}
                    onChange={(e) => setMcuLetterPic2(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-indigo-100 bg-white rounded-lg text-[10px] font-medium"
                  />
                </div>
              </div>

              {/* Penandatangan (PJO) */}
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Nama Penandatangan (PJO)</label>
                <input
                  type="text"
                  value={mcuLetterPjo}
                  onChange={(e) => setMcuLetterPjo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-205 rounded-xl text-xs font-bold"
                />
              </div>

              {/* Rincian Biaya MCU Settings */}
              <div className="p-3.5 bg-indigo-50/40 rounded-2xl border border-indigo-100/80 mt-2 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black text-indigo-950 uppercase tracking-wider block">Rincian Biaya MCU</span>
                    <span className="text-[8.5px] text-slate-450 font-bold block mt-0.5">Sesuai lampiran rincian Excel</span>
                  </div>
                  <input
                    type="checkbox"
                    id="checkbox-show-mcu-cost"
                    checked={showMcuCostTable}
                    onChange={(e) => setShowMcuCostTable(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 border-indigo-200 cursor-pointer"
                  />
                </div>
                
                {showMcuCostTable && (
                  <div className="space-y-2.5 pt-2.5 border-t border-indigo-100">
                    <div className="space-y-1">
                      <label className="block text-[9px] uppercase tracking-wide text-slate-500 font-extrabold">Biaya MCU Standar (Rp)</label>
                      <input
                        type="number"
                        id="input-mcu-base-price"
                        value={mcuBasePrice}
                        onChange={(e) => setMcuBasePrice(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 border border-indigo-100 bg-white rounded-lg text-[10px] font-extrabold text-slate-800"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] uppercase tracking-wide text-slate-500 font-extrabold">Biaya Tambahan Treadmill (Rp)</label>
                      <input
                        type="number"
                        id="input-mcu-treadmill-price"
                        value={mcuTreadmillPrice}
                        onChange={(e) => setMcuTreadmillPrice(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 border border-indigo-100 bg-white rounded-lg text-[10px] font-extrabold text-slate-800"
                      />
                    </div>
                    <div className="space-y-1 pt-1">
                      <label className="block text-[9px] uppercase tracking-wide text-slate-500 font-extrabold">Ukuran Font Tabel Rincian Biaya</label>
                      <div className="grid grid-cols-4 gap-1">
                        {(['8px', '8.5px', '9px', '10px'] as const).map(size => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => setMcuCostTableFontSize(size)}
                            className={`py-1 text-[9px] font-bold rounded-lg border transition ${
                              mcuCostTableFontSize === size 
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Custom Employee Keterangan & Fields */}
              <div className="space-y-2 pt-2 border-t border-slate-150">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">Keterangan Tiap Peserta</span>
                    <span className="text-[8.5px] text-slate-450 font-medium block">Isi Rank, Posisi/Jabatan, Usia, dan Keterangan MCU</span>
                  </div>
                  <span className="text-[9.5px] font-bold text-slate-450 bg-slate-100 px-2 py-0.5 rounded-full">
                    {sortedEmployees.filter(emp => selectedEmpKeys.includes(emp.nik)).length} Orang
                  </span>
                </div>
                
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {sortedEmployees.filter(emp => selectedEmpKeys.includes(emp.nik)).map((emp, i) => {
                    const currentRank = getEmployeeRank(emp);
                    const currentPosisi = getEmployeePosisi(emp);
                    const currentAge = getEmployeeAge(emp);
                    const currentKet = getEmployeeKeterangan(emp);

                    return (
                      <div key={emp.nik + i} className="space-y-2 bg-slate-50 p-2.5 border border-slate-200 rounded-xl">
                        <div className="flex justify-between items-center text-[10px] pb-1 border-b border-slate-200">
                          <span className="font-black text-slate-800 truncate max-w-[190px]">
                            {i + 1}. {emp.nama} <span className="font-mono text-slate-500 font-bold">({emp.nik})</span>
                          </span>
                          <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-150 px-1.5 py-0.5 rounded-full inline-block">
                            {currentAge ? `Usia: ${currentAge} Thn` : (emp.tanggalLahir ? `DOB: ${emp.tanggalLahir}` : 'No DOB')}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {/* Rank */}
                          <div className="space-y-0.5">
                            <label className="block text-[8.5px] font-black uppercase tracking-wider text-slate-600">Rank</label>
                            <input
                              type="text"
                              value={currentRank}
                              onChange={(e) => setMcuLetterEmployeeRank(prev => ({ ...prev, [emp.nik]: e.target.value }))}
                              className="w-full px-2 py-1.5 border border-slate-300 bg-white rounded-lg text-[10px] font-bold text-slate-800"
                              placeholder="Rank (cth: 3, Staff)"
                            />
                          </div>

                          {/* Usia */}
                          <div className="space-y-0.5">
                            <label className="block text-[8.5px] font-black uppercase tracking-wider text-slate-600">Usia (Tahun)</label>
                            <input
                              type="text"
                              value={currentAge}
                              onChange={(e) => setMcuLetterEmployeeAge(prev => ({ ...prev, [emp.nik]: e.target.value }))}
                              className="w-full px-2 py-1.5 border border-slate-300 bg-white rounded-lg text-[10px] font-bold text-slate-800"
                              placeholder="Usia (cth: 30)"
                            />
                          </div>
                        </div>

                        {/* Posisi (Jabatan) */}
                        <div className="space-y-0.5">
                          <label className="block text-[8.5px] font-black uppercase tracking-wider text-slate-600">Posisi / Jabatan</label>
                          <input
                            type="text"
                            value={currentPosisi}
                            onChange={(e) => setMcuLetterEmployeePosisi(prev => ({ ...prev, [emp.nik]: e.target.value }))}
                            className="w-full px-2 py-1.5 border border-slate-300 bg-white rounded-lg text-[10px] font-bold text-slate-800"
                            placeholder="Posisi (cth: PART ANALIST, MEKANIK 3)"
                          />
                        </div>

                        {/* Keterangan MCU */}
                        <div className="space-y-0.5">
                          <label className="block text-[8.5px] font-black uppercase tracking-wider text-slate-600">Keterangan MCU</label>
                          <input
                            type="text"
                            value={currentKet}
                            onChange={(e) => setMcuLetterEmployeeKeterangan(prev => ({ ...prev, [emp.nik]: e.target.value }))}
                            className="w-full px-2 py-1.5 border border-slate-300 bg-white rounded-lg text-[10px] font-bold text-slate-800"
                            placeholder="Contoh: (MCU BERKALA) TAHUNAN"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Quick Action Block */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
              {printError && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-[10.5px] font-semibold leading-relaxed">
                  ⚠️ {printError}
                </div>
              )}
              <button
                type="button"
                onClick={handlePrint}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <Printer className="h-4 w-4 shrink-0" />
                Cetak Surat Pengantar (Print / PDF)
              </button>
            </div>

          </div>

          {/* Right Panel: Letter Canvas Preview (print wrapper) */}
          <div id="mcu-letter-drawer-right" className="flex-1 bg-slate-600/20 p-6 overflow-y-auto flex justify-center print:bg-white print:p-0 print:overflow-visible h-full">
            
            {/* High-Fidelity Letter page */}
            <div
              id="mcu-print-section"
              className="bg-white w-[793.7px] min-h-[1122.5px] p-10 pr-12 pl-12 shadow-2xl relative text-slate-950 font-serif leading-normal text-[11px] print:shadow-none print:w-full print:min-h-0 print:p-0 print:m-0"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            >
              {/* Style injection for pristine printer rendering */}
              <style>{`
                @media print {
                  @page {
                    size: A4 portrait;
                    margin: 15mm 20mm 15mm 20mm;
                  }
                  
                  /* Lift clipping and flex behavior on all parent layout elements */
                  html, body, #root, #root > div, main, #mcu-letter-drawer, #mcu-letter-drawer-right {
                    display: block !important;
                    position: static !important;
                    height: auto !important;
                    min-height: 0 !important;
                    overflow: visible !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: white !important;
                    box-shadow: none !important;
                  }
                  
                  /* Explicitly disable non-printable panels & components completely to prevent blank sheets */
                  header, footer, .print\:hidden, [class*="print:hidden"], 
                  #mcu-monitoring-dashboard-container, 
                  #mcu-letter-drawer-left {
                    display: none !important;
                    height: 0 !important;
                    width: 0 !important;
                    overflow: hidden !important;
                    margin: 0 !important;
                    padding: 0 !important;
                  }
                  
                  #mcu-print-section {
                    display: block !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    box-shadow: none !important;
                    border: none !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: white !important;
                    color: black !important;
                  }
                  
                  .print-page-break {
                    page-break-before: always !important;
                    break-before: page !important;
                    display: block !important;
                    margin-top: 0 !important;
                    padding-top: 0 !important;
                  }
                  
                  /* Prevent table rows and details from being severed in mid-page */
                  tr {
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                  }
                }
              `}</style>

              {/* Corporate Header Block */}
              <div className="flex items-center justify-between border-b-2 border-indigo-900 pb-2 mb-4">
                <img
                  src="https://lh3.googleusercontent.com/d/1zE6dEUc98zDbaIVKBwfVDGX_s2abcmz_"
                  alt="PT Indotruck Utama Logo"
                  className="h-12 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Tanjung, Date */}
              <div className="text-right mb-3">
                Tanjung, {mcuLetterDate}
              </div>

              {/* Letter Info Block */}
              <div className="space-y-0.5 mb-4">
                <div className="flex">
                  <span className="w-24 font-bold">Nomor Surat</span>
                  <span className="mr-2">:</span>
                  <span className="font-sans font-semibold text-xs tracking-tight">{mcuLetterNo}</span>
                </div>
                <div className="flex">
                  <span className="w-24 font-bold">Lampiran</span>
                  <span className="mr-2">:</span>
                  <span>{mcuLetterLampiran || '-'}</span>
                </div>
                <div className="flex items-start">
                  <span className="w-24 font-bold">Hal</span>
                  <span className="mr-2">:</span>
                  <span className="font-bold underline">{mcuLetterHal}</span>
                </div>
              </div>

              {/* Recipient */}
              <div className="space-y-0.5 mb-4 leading-snug">
                <p className="font-bold">Kepada Yth.,</p>
                <p className="font-bold whitespace-pre-line leading-relaxed">{mcuLetterRecipient}</p>
              </div>

              {/* Salutation & Body 1 */}
              <div className="space-y-2 mb-4 leading-relaxed text-justify">
                <p className="font-bold">Dengan Hormat,</p>
                <p>
                  Bersama ini mohon dilakukan pemeriksaan kesehatan (Medical Check Up) berkala/tahunan untuk karyawan PT. Indotruck Utama Site SIS Admo Tutupan Tabalong yang akan melakukan reinduksi.
                </p>
                <p>
                  Adapun peserta yang akan melakukan MCU tersebut sebagai berikut:
                </p>
              </div>

              {/* Participants Table */}
              <div className="mb-4 overflow-hidden">
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-slate-50 font-bold uppercase text-slate-900 border border-slate-400">
                      <th className="py-1.5 px-2 text-center border border-slate-400 w-10">NO</th>
                      <th className="py-1.5 px-2 border border-slate-400 w-24">NRP</th>
                      <th className="py-1.5 px-2 border border-slate-400">NAMA</th>
                      <th className="py-1.5 px-2 border border-slate-400">JABATAN</th>
                      <th className="py-1.5 px-2 border border-slate-400 w-28 text-center">EXPIRED PERMIT</th>
                      <th className="py-1.5 px-2 border border-slate-400">KETERANGAN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedEmployees.filter(emp => selectedEmpKeys.includes(emp.nik)).map((emp, idx) => {
                      const currentKet = getEmployeeKeterangan(emp);
                      const currentPosisi = getEmployeePosisi(emp);

                      return (
                        <tr key={emp.nik + idx} className="border border-slate-400 text-slate-950">
                          <td className="py-1 px-2 text-center border border-slate-400 font-bold">{idx + 1}</td>
                          <td className="py-1 px-2 border border-slate-400 font-sans font-bold tracking-tight">{emp.nik}</td>
                          <td className="py-1 px-2 border border-slate-400 font-bold tracking-wide uppercase">{emp.nama}</td>
                          <td className="py-1 px-2 border border-slate-400 uppercase">{currentPosisi}</td>
                          <td className="py-1 px-2 border border-slate-400 font-sans font-bold text-center">
                            {emp.masaBerlakuMinePermit || '-'}
                          </td>
                          <td className="py-1 px-2 border border-slate-400 text-[9px] font-bold uppercase whitespace-pre-line leading-tight">
                            {currentKet}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Body 2 */}
              <div className="space-y-2 mb-4 text-justify leading-relaxed">
                <p>
                  Kami berharap hasil pemeriksaan ini dapat kami peroleh dalam waktu yang tidak terlalu lama dari dimulainya pemeriksaan tersebut. Adapun pemeriksaan standar parameter MCU tersebut sesuai dengan matrix yang berlaku di PT. Adaro Indonesia.
                </p>
                <p className="leading-normal text-[10.5px] text-slate-800">
                  Mohon untuk hasil softcopy (scan) dan resume excel tersebut dapat dikirimkan ke email PIC an.<br />
                  <strong>Muhammad Ali</strong> (<span className="underline select-all text-indigo-900">{mcuLetterPic1.includes('(') ? mcuLetterPic1.split('(')[1].replace(')', '') : 'muhammad.ali@indotruck-utama.co.id'}</span>), <strong>Rahmat Hidayat</strong> (<span className="underline select-all text-indigo-900">{mcuLetterPic2.includes('(') ? mcuLetterPic2.split('(')[1].replace(')', '') : 'rahmat.hidayat@indotruck-utama.co.id'}</span>) dan Hardcopy juga dapat dikirimkan ke :
                </p>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-[10px] leading-normal mx-2 italic font-sans" style={{ fontFamily: "Inter, sans-serif" }}>
                  <strong>Mess PT. Indotruck Utama / Omah Homestay</strong><br />
                  Jl. Ahmad Yani, Mabuun Raya (Belakang Dealer Daihatsu), Kelurahan Murung Pudak, Kabupaten Tabalong, Propinsi Kalimantan Selatan
                </div>
                <p>
                  Demikian perihal surat pengantar ini disampaikan dan atas perhatiannya diucapkan terima kasih.
                </p>
                <p className="font-extrabold text-[10px] italic text-slate-900 bg-amber-50 px-2 py-1.5 rounded-lg border border-dashed border-amber-200 mt-1 font-sans" style={{ fontFamily: "Inter, sans-serif" }}>
                  * Note : Untuk usia dimulai 35 Tahun mohon ditambahkan Test Treadmill
                </p>
              </div>

              {/* Signature Area */}
              <div className="flex justify-between items-end pt-2">
                <div className="w-1/2 text-left">
                  <p className="mb-0.5">Hormat kami,</p>
                  <div className="h-12"></div>
                  <p className="font-bold underline uppercase">{mcuLetterPjo}</p>
                  <p className="text-[9.5px] text-slate-500 font-sans font-bold uppercase tracking-wider" style={{ fontFamily: "Inter, sans-serif" }}>PJO PT. Indotruck Utama</p>
                </div>
                <div className="w-1/3 text-right">
                  {/* Visual spacer */}
                </div>
              </div>

              {/* Rincian Biaya MCU Periodik */}
              {showMcuCostTable && (
                <div 
                  className="print-page-break mt-12 pt-8 border-t-2 border-dashed border-slate-300 print:mt-4 print:pt-4 print:border-none"
                  style={{ pageBreakBefore: 'always', breakBefore: 'page' }}
                >
                  {/* Title of Excel Section */}
                  <h4 className="text-[11px] font-black uppercase text-slate-900 tracking-wide mb-3 text-left font-sans" style={{ fontFamily: "Inter, sans-serif" }}>
                    RINCIAN BIAYA MCU PERIODIK - {monthsIndonesian[selectedMonth].toUpperCase()} {selectedYear} :
                  </h4>

                  {/* Excel Style Table matching official template */}
                  <div className="overflow-hidden border border-slate-900">
                    <table 
                      className="w-full text-left border-collapse font-sans" 
                      style={{ fontFamily: "Inter, sans-serif", fontSize: mcuCostTableFontSize }}
                    >
                      <thead>
                        <tr className="bg-slate-50 font-bold text-slate-900 border-b border-slate-900 text-center" style={{ fontSize: mcuCostTableFontSize }}>
                          <th className="py-1.5 px-1 border-r border-slate-900 w-8">No</th>
                          <th className="py-1.5 px-1.5 border-r border-slate-900 w-14">NRP</th>
                          <th className="py-1.5 px-2 border-r border-slate-900 text-left">Nama Karyawan</th>
                          <th className="py-1.5 px-1.5 border-r border-slate-900 w-14 text-center">Rank</th>
                          <th className="py-1.5 px-1.5 border-r border-slate-900 text-center">Posisi</th>
                          <th className="py-1.5 px-1 border-r border-slate-900 w-12 text-center">Usia</th>
                          <th className="py-1.5 px-1.5 border-r border-slate-900 w-18 text-center">Tipe MCU</th>
                          <th className="py-1.5 px-1.5 border-r border-slate-900 text-right w-22">Biaya MCU</th>
                          <th className="py-1.5 px-1.5 border-r border-slate-900 text-center w-24">
                            <div>+Biaya</div>
                            <div>Treadmill</div>
                          </th>
                          <th className="py-1.5 px-2 text-right w-22">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedEmployees.filter(emp => selectedEmpKeys.includes(emp.nik)).map((emp, idx) => {
                          const rank = getEmployeeRank(emp);
                          const posisi = getEmployeePosisi(emp);
                          const ageStr = getEmployeeAge(emp);
                          const currentKet = getEmployeeKeterangan(emp);

                          const ageNum = parseInt(ageStr, 10);
                          const hasTreadmill = currentKet.toUpperCase().includes('TREADMILL') || (!isNaN(ageNum) && ageNum >= 35);
                          const treadmillCost = hasTreadmill ? mcuTreadmillPrice : 0;
                          const totalCost = mcuBasePrice + treadmillCost;

                          return (
                            <tr key={'cost-row-' + emp.nik + idx} className="border-b border-slate-900 text-slate-950 font-medium">
                              <td className="py-1 px-1 text-center border-r border-slate-900 font-bold">{idx + 1}</td>
                              <td className="py-1 px-1.5 text-center border-r border-slate-900 font-bold">{emp.nik}</td>
                              <td className="py-1 px-2 border-r border-slate-900 uppercase text-slate-900 font-medium tracking-tight">{emp.nama}</td>
                              <td className="py-1 px-1.5 text-center border-r border-slate-900">{rank}</td>
                              <td className="py-1 px-1.5 text-center border-r border-slate-900 uppercase font-medium tracking-tight">{posisi}</td>
                              <td className="py-1 px-1 text-center border-r border-slate-900 whitespace-nowrap font-medium">
                                {formatAgeWithUnit(ageStr)}
                              </td>
                              <td className="py-1 px-1.5 text-center border-r border-slate-900">Periodic</td>
                              <td className="py-1 px-1.5 text-right border-r border-slate-900 font-mono">
                                Rp{new Intl.NumberFormat('id-ID').format(mcuBasePrice)}
                              </td>
                              <td className="py-1 px-1.5 text-center border-r border-slate-900 font-mono">
                                {treadmillCost > 0 ? `Rp${new Intl.NumberFormat('id-ID').format(treadmillCost)}` : '0'}
                              </td>
                              <td className="py-1 px-2 text-right font-bold font-mono">
                                Rp{new Intl.NumberFormat('id-ID').format(totalCost)}
                              </td>
                            </tr>
                          );
                        })}

                        {/* Grand Total Row */}
                        {(() => {
                          const selectedList = sortedEmployees.filter(emp => selectedEmpKeys.includes(emp.nik));
                          const grandTotal = selectedList.reduce((acc, emp) => {
                            const ageStr = getEmployeeAge(emp);
                            const currentKet = getEmployeeKeterangan(emp);
                            const ageNum = parseInt(ageStr, 10);
                            const hasTreadmill = currentKet.toUpperCase().includes('TREADMILL') || (!isNaN(ageNum) && ageNum >= 35);
                            const treadmillCost = hasTreadmill ? mcuTreadmillPrice : 0;
                            return acc + mcuBasePrice + treadmillCost;
                          }, 0);

                          return (
                            <tr className="border-b border-slate-900">
                              <td colSpan={9} className="py-1.5 px-3 text-center border-r border-slate-900 font-extrabold bg-[#E2EFDA] text-[#375623]" style={{ fontSize: `calc(${mcuCostTableFontSize} + 0.5px)` }}>
                                Grand Total
                              </td>
                              <td className="py-1.5 px-2 text-right font-extrabold bg-[#E2EFDA] text-[#375623] font-mono" style={{ fontSize: `calc(${mcuCostTableFontSize} + 0.5px)` }}>
                                Rp{new Intl.NumberFormat('id-ID').format(grandTotal)}
                              </td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
