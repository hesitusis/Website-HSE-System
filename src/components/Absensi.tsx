import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Search,
  Plus,
  Trash2,
  Edit2,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  X,
  ChevronRight,
  UserPlus,
  Printer,
  FileSpreadsheet,
  Building,
  Briefcase,
  User,
  Hash,
  AlertCircle,
  CalendarCheck,
  Users
} from 'lucide-react';
import { PageHeader, Button } from './common/index.js';

interface Presence {
  id: string;
  nama: string;
  nrp?: string;
  departemen: string;
  jabatan: string;
  waktu: string; // e.g. "08:15"
  metode: 'Akun' | 'Ditambahkan';
  addedBy?: string; // name of the user who added them
}

interface RoomAbsensi {
  id: string;
  judul: string;
  tanggal: string; // e.g. "2026-06-17"
  jamMulai: string; // e.g. "08:00"
  jamSelesai: string; // e.g. "10:00"
  lokasi: string;
  deskripsi?: string;
  status: 'Aktif' | 'Selesai';
  peserta: Presence[];
  createdAt: string;
  createdBy: string;
}

interface AbsensiProps {
  userRealName: string;
  userNrp?: string;
  userRole: 'admin' | 'operator';
  onBack: () => void;
}

const DEPARTMENTS = [
  'HSE',
  'Service',
  'Part',
  'HRGAFA'
];

const PRE_FILLED_ROOMS: RoomAbsensi[] = [
  {
    id: 'room-1',
    judul: 'Safety Toolbox Meeting - Briefing Pagi HSE',
    tanggal: '2026-06-17',
    jamMulai: '07:30',
    jamSelesai: '08:00',
    lokasi: 'Main Yard Workshop - PT Indotruck Utama',
    deskripsi: 'Pengarahan rutin harian terkait potensi bahaya kerja di workshop serta penggunaan mandatory APD bagi seluruh mekanik.',
    status: 'Aktif',
    createdBy: 'HSE Coordinator',
    createdAt: new Date().toISOString(),
    peserta: [
      { id: 'p-1', nama: 'Andi Ramadhan', nrp: 'ITU-HR-0482', departemen: 'Service', jabatan: 'Lead Mechanic', waktu: '07:32 WIB', metode: 'Akun' },
      { id: 'p-2', nama: 'Siti Lestari', nrp: 'ITU-GA-0192', departemen: 'HRGAFA', jabatan: 'Officer', waktu: '07:35 WIB', metode: 'Akun' },
      { id: 'p-3', nama: 'Budi Santoso', nrp: 'ITU-OP-0351', departemen: 'Service', jabatan: 'Driver DT', waktu: '07:38 WIB', metode: 'Ditambahkan', addedBy: 'Admin Admo' }
    ]
  },
  {
    id: 'room-2',
    judul: 'Training Ergonomi & K3 Perkantoran',
    tanggal: '2026-06-16',
    jamMulai: '09:00',
    jamSelesai: '11:30',
    lokasi: 'Aula Lt. 3 Gedung Admin Utama',
    deskripsi: 'Pelatihan dasar mengenai ergonomi kerja guna mencegah cidera otot serta sirkulasi evakuasi jika terjadi gempa atau kebakaran.',
    status: 'Selesai',
    createdBy: 'HSE Coordinator',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    peserta: [
      { id: 'p-201', nama: 'Rian Hidayat', nrp: 'ITU-SE-4451', departemen: 'Service', jabatan: 'Sales Representative', waktu: '08:55 WIB', metode: 'Akun' },
      { id: 'p-202', nama: 'Dewi Sartika', nrp: 'ITU-FN-0033', departemen: 'HRGAFA', jabatan: 'Auditor', waktu: '08:58 WIB', metode: 'Akun' },
      { id: 'p-203', nama: 'Ahmad Subardjo', nrp: '', departemen: 'Service', jabatan: 'Mechanic Assistant', waktu: '09:02 WIB', metode: 'Ditambahkan', addedBy: 'HSE Staff' },
      { id: 'p-204', nama: 'Farhan Azis', nrp: 'ITU-PL-1190', departemen: 'Part', jabatan: 'Warehouseman', waktu: '09:05 WIB', metode: 'Akun' }
    ]
  }
];

export default function Absensi({ userRealName, userNrp, userRole, onBack }: AbsensiProps) {
  const [rooms, setRooms] = useState<RoomAbsensi[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<RoomAbsensi | null>(null);
  const [activeTab, setActiveTab] = useState<'Aktif' | 'Selesai'>('Aktif');

  // Form states for creating/editing room
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [formIsEditing, setFormIsEditing] = useState(false);
  const [editRoomId, setEditRoomId] = useState<string | null>(null);

  const [formJudul, setFormJudul] = useState('');
  const [formTanggal, setFormTanggal] = useState('');
  const [formJamMulai, setFormJamMulai] = useState('');
  const [formJamSelesai, setFormJamSelesai] = useState('');
  const [formLokasi, setFormLokasi] = useState('');
  const [formDeskripsi, setFormDeskripsi] = useState('');

  // Form state for adding other person
  const [showAddPersonModal, setShowAddPersonModal] = useState(false);
  const [addNama, setAddNama] = useState('');
  const [addNrp, setAddNrp] = useState('');
  const [addDept, setAddDept] = useState(DEPARTMENTS[0]);
  const [addJabatan, setAddJabatan] = useState('');

  // Form state for self check-in confirmation modal/fields
  const [showSelfCheckIn, setShowSelfCheckIn] = useState(false);
  const [selfDept, setSelfDept] = useState(DEPARTMENTS[0]);
  const [selfJabatan, setSelfJabatan] = useState('');
  const [selfNrp, setSelfNrp] = useState('');

  // Search & Filter state for attendees list
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('Semua Departemen');
  const [showPrintPreviewDialog, setShowPrintPreviewDialog] = useState(false);

  // Form state for editing attendee (Admin only)
  const [showEditAttendeeModal, setShowEditAttendeeModal] = useState(false);
  const [editingAttendee, setEditingAttendee] = useState<Presence | null>(null);
  const [editAttendeeNama, setEditAttendeeNama] = useState('');
  const [editAttendeeNrp, setEditAttendeeNrp] = useState('');
  const [editAttendeeDept, setEditAttendeeDept] = useState(DEPARTMENTS[0]);
  const [editAttendeeJabatan, setEditAttendeeJabatan] = useState('');
  const [editAttendeeWaktu, setEditAttendeeWaktu] = useState('');

  // Karyawan cache for prefill
  const [karyawanData, setKaryawanData] = useState<{nama: string; nik: string; dept: string; jabatan?: string}[]>([]);

  // Fetch rooms from backend on mount
  useEffect(() => {
    fetchRooms();
    fetchKaryawanData();
  }, []);

  const fetchKaryawanData = async () => {
    try {
      const res = await fetch('/api/karyawan');
      const data = await res.json();
      if (data.success && data.karyawanDetail) {
        setKaryawanData(data.karyawanDetail);
      }
    } catch (err) {
      console.error("Gagal mengambil data karyawan", err);
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/absensi');
      const data = await res.json();
      if (data.success && data.list && data.list.length > 0) {
        setRooms(data.list);
        if (selectedRoom) {
          const currentSelected = data.list.find((r: RoomAbsensi) => r.id === selectedRoom.id);
          setSelectedRoom(currentSelected || null);
        }
      } else {
        setRooms([]);
      }
    } catch (err) {
      console.error("Gagal mengambil data absensi:", err);
    }
  };

  const updateRoomState = (updatedList: RoomAbsensi[]) => {
    setRooms(updatedList);
    if (selectedRoom) {
      const currentSelected = updatedList.find(r => r.id === selectedRoom.id);
      setSelectedRoom(currentSelected || null);
    }
  };

  const syncRoomToBackend = async (room: RoomAbsensi) => {
    try {
      const res = await fetch('/api/absensi/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(room)
      });
      const data = await res.json();
      if (data.success) {
        updateRoomState(data.list);
      }
    } catch (err) {
      console.error("Failed to save room", err);
    }
  };

  const deleteRoomFromBackend = async (roomId: string) => {
    try {
      const res = await fetch(`/api/absensi/delete/${roomId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        updateRoomState(data.list);
      }
    } catch (err) {
      console.error("Failed to delete room", err);
    }
  };

  // Pre-fill fields for adding new Room
  const openNewRoomModal = () => {
    setFormJudul('');
    // default date to today
    const todayStr = new Date().toISOString().split('T')[0];
    setFormTanggal(todayStr);
    setFormJamMulai('08:00');
    setFormJamSelesai('09:00');
    setFormLokasi('');
    setFormDeskripsi('');
    setFormIsEditing(false);
    setEditRoomId(null);
    setShowRoomModal(true);
  };

  // Pre-fill fields for editing Room
  const openEditRoomModal = (room: RoomAbsensi, e: React.MouseEvent) => {
    e.stopPropagation();
    setFormJudul(room.judul);
    setFormTanggal(room.tanggal);
    setFormJamMulai(room.jamMulai);
    setFormJamSelesai(room.jamSelesai);
    setFormLokasi(room.lokasi);
    setFormDeskripsi(room.deskripsi || '');
    setFormIsEditing(true);
    setEditRoomId(room.id);
    setShowRoomModal(true);
  };

  // Save Room (Create/Update)
  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formJudul.trim() || !formTanggal || !formJamMulai || !formJamSelesai || !formLokasi.trim()) {
      alert("Harap isi seluruh field bertanda wajib!");
      return;
    }

    if (formIsEditing && editRoomId) {
      const roomToUpdate = rooms.find(r => r.id === editRoomId);
      if (roomToUpdate) {
        const updatedRoom = {
          ...roomToUpdate,
          judul: formJudul,
          tanggal: formTanggal,
          jamMulai: formJamMulai,
          jamSelesai: formJamSelesai,
          lokasi: formLokasi,
          deskripsi: formDeskripsi
        };
        syncRoomToBackend(updatedRoom);
      }
      alert("Detail Room Absensi berhasil diperbarui!");
    } else {
      const newRoom: RoomAbsensi = {
        id: 'room-' + Date.now(),
        judul: formJudul,
        tanggal: formTanggal,
        jamMulai: formJamMulai,
        jamSelesai: formJamSelesai,
        lokasi: formLokasi,
        deskripsi: formDeskripsi,
        status: 'Aktif',
        createdBy: userRealName,
        createdAt: new Date().toISOString(),
        peserta: []
      };
      syncRoomToBackend(newRoom);
      alert("Room Absensi Baru berhasil dibuka!");
    }
    setShowRoomModal(false);
  };

  // Toggle Room status
  const handleToggleRoomStatus = (room: RoomAbsensi, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = room.status === 'Aktif' ? 'Selesai' : 'Aktif';
    const updatedRoom = { ...room, status: newStatus as 'Aktif' | 'Selesai' };
    syncRoomToBackend(updatedRoom);
    alert(`Status absensi diubah menjadi: ${newStatus}`);
  };

  // Delete Room
  const handleDeleteRoom = (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Apakah Anda yakin ingin menghapus Room Absensi ini beserta seluruh data hadirnya? Tindakan ini tidak dapat dibatalkan.")) {
      deleteRoomFromBackend(roomId);
      alert("Room Absensi berhasil dihapus.");
    }
  };

  // Self "Hadir" Click - Add current logged-in user to presence
  const handleSelfPresenceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;

    // Check if empty fields
    if (!selfJabatan.trim()) {
      alert("Harap masukkan jabatan/posisi Anda!");
      return;
    }

    // Capture time format
    const timeNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    const newPres: Presence = {
      id: 'pres-self-' + Date.now(),
      nama: userRealName,
      nrp: selfNrp.trim() || undefined,
      departemen: selfDept,
      jabatan: selfJabatan.trim(),
      waktu: timeNow,
      metode: 'Akun'
    };

    const updatedRoom = {
      ...selectedRoom,
      peserta: [newPres, ...selectedRoom.peserta]
    };

    syncRoomToBackend(updatedRoom);
    
    // Sync single peseta to Google Sheets
    fetch('/api/absensi/sync-peserta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room: selectedRoom, peserta: newPres })
    }).catch(err => console.error("Failed to sync peserta to GSheets", err));

    setShowSelfCheckIn(false);
    alert("Koreksi kehadiran sukses! Status Anda telah tercatat hadir.");
  };

  // Check if self is already checked-in inside selected room
  const userHasCheckedIn = useMemo(() => {
    if (!selectedRoom) return false;
    return selectedRoom.peserta.some(p => p.nama.toLowerCase() === userRealName.toLowerCase() && p.metode === 'Akun');
  }, [selectedRoom, userRealName]);

  // "Add other person" submit
  const handleAddOtherPerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;

    if (!addNama.trim() || !addJabatan.trim()) {
      alert("Nama Peserta dan Jabatan wajib diisi!");
      return;
    }

    const timeNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

    const newAttendee: Presence = {
      id: 'pres-add-' + Date.now(),
      nama: addNama.trim(),
      nrp: addNrp.trim() || undefined,
      departemen: addDept,
      jabatan: addJabatan.trim(),
      waktu: timeNow,
      metode: 'Ditambahkan',
      addedBy: userRealName
    };

    // prevent duplicate addition by name
    const alreadyExists = selectedRoom.peserta.some(p => p.nama.toLowerCase() === addNama.trim().toLowerCase());
    if (alreadyExists) {
      if (!confirm(`Nama "${addNama}" sudah tercatat hadir. Tetap tambahkan orang ini?`)) {
        return;
      }
    }

    const updatedRoom = {
      ...selectedRoom,
      peserta: [newAttendee, ...selectedRoom.peserta]
    };

    syncRoomToBackend(updatedRoom);
    
    // Sync single peseta to Google Sheets
    fetch('/api/absensi/sync-peserta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room: selectedRoom, peserta: newAttendee })
    }).catch(err => console.error("Failed to sync peserta to GSheets", err));

    setAddNama('');
    setAddNrp('');
    setAddJabatan('');
    setShowAddPersonModal(false);
    alert(`Berhasil menambahkan kehadiran: ${addNama.trim()}`);
  };

  // Delete attendee record
  const handleDeleteAttendee = (attendeeId: string) => {
    if (!selectedRoom) return;

    const findAttendee = selectedRoom.peserta.find(p => p.id === attendeeId);
    if (!findAttendee) return;

    // Permissions check: admin can delete anyone. Operator can only delete attendees they added or if it is themselves.
    const isOwner = findAttendee.addedBy === userRealName;
    if (userRole !== 'admin' && !isOwner) {
      alert("Anda tidak memiliki hak akses untuk menghapus peserta ini. Hanya admin atau operator penginput yang dapat menghapusnya.");
      return;
    }

    if (confirm(`Hapus pencatatan kehadiran untuk ${findAttendee.nama}?`)) {
      const updatedRoom = {
        ...selectedRoom,
        peserta: selectedRoom.peserta.filter(x => x.id !== attendeeId)
      };
      syncRoomToBackend(updatedRoom);
    }
  };

  const handleOpenEditAttendeeModal = (peserta: Presence) => {
    setEditingAttendee(peserta);
    setEditAttendeeNama(peserta.nama);
    setEditAttendeeNrp(peserta.nrp || '');
    setEditAttendeeDept(peserta.departemen);
    setEditAttendeeJabatan(peserta.jabatan);
    setEditAttendeeWaktu(peserta.waktu);
    setShowEditAttendeeModal(true);
  };

  const handleSaveEditedAttendee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom || !editingAttendee) return;

    if (!editAttendeeNama.trim() || !editAttendeeJabatan.trim()) {
      alert("Nama Peserta dan Jabatan wajib diisi!");
      return;
    }

    const updatedPesertaList = selectedRoom.peserta.map(p => {
      if (p.id === editingAttendee.id) {
        return {
          ...p,
          nama: editAttendeeNama.trim(),
          nrp: editAttendeeNrp.trim() || undefined,
          departemen: editAttendeeDept,
          jabatan: editAttendeeJabatan.trim(),
          waktu: editAttendeeWaktu.trim()
        };
      }
      return p;
    });

    const updatedRoom = {
      ...selectedRoom,
      peserta: updatedPesertaList
    };

    syncRoomToBackend(updatedRoom);
    setShowEditAttendeeModal(false);
    setEditingAttendee(null);
    alert("Data kehadiran peserta berhasil diperbarui!");
  };

  // Group rooms for list view
  const filteredRooms = useMemo(() => {
    return rooms.filter(r => r.status === activeTab);
  }, [rooms, activeTab]);

  // Filter and Search the attendee records in detail view
  const filteredAndSearchedAttendees = useMemo(() => {
    if (!selectedRoom) return [];
    return selectedRoom.peserta.filter(p => {
      const matchSearch = p.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.nrp && p.nrp.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          p.jabatan.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchDept = selectedDeptFilter === 'Semua Departemen' || p.departemen === selectedDeptFilter;

      return matchSearch && matchDept;
    });
  }, [selectedRoom, searchQuery, selectedDeptFilter]);

  // Format date helper
  const getDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${parseInt(parts[2])} ${months[parseInt(parts[1]) - 1]} ${parts[0]}`;
  };

  // Indonesian Day/Date helper
  const getTanggalIndoDenganHari = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const dateObj = new Date(dateStr);
    const dayIndex = dateObj.getDay();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dayName = days[dayIndex] || 'Senin';
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${parseInt(parts[2])} ${months[parseInt(parts[1]) - 1]} ${parts[0]} (${dayName})`;
  };

  // Export to CSV Helper
  const exportToExcelFormat = () => {
    if (!selectedRoom) return;
    const records = selectedRoom.peserta;
    
    // Header
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "LAPORAN KEHADIRAN / ABSENSI KEGIATAN\r\n";
    csvContent += `Judul Kegiatan,${selectedRoom.judul}\r\n`;
    csvContent += `Tanggal,${getDisplayDate(selectedRoom.tanggal)}\r\n`;
    csvContent += `Waktu,${selectedRoom.jamMulai} s/d ${selectedRoom.jamSelesai}\r\n`;
    csvContent += `Lokasi,${selectedRoom.lokasi}\r\n`;
    csvContent += `Status,${selectedRoom.status}\r\n`;
    csvContent += `Total Peserta Hadir,${records.length}\r\n\r\n`;
    
    csvContent += "No,Nama Peserta,NRP/NIK,Departemen,Jabatan,Waktu Hadir,Metode Kehadiran,Ditambahkan Oleh\r\n";
    
    records.forEach((p, index) => {
      const row = [
        index + 1,
        `"${p.nama.replace(/"/g, '""')}"`,
        p.nrp ? `"${p.nrp.replace(/"/g, '""')}"` : "-",
        `"${p.departemen}"`,
        `"${p.jabatan.replace(/"/g, '""')}"`,
        `"${p.waktu}"`,
        p.metode,
        p.addedBy ? `"${p.addedBy.replace(/"/g, '""')}"` : "-"
      ].join(",");
      csvContent += row + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const sanitizedTitle = selectedRoom.judul.replace(/[^a-zA-Z0-9]/g, "_");
    link.setAttribute("download", `Absensi_${sanitizedTitle}_${selectedRoom.tanggal}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const triggerPDFPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Detail Room Dashboard Layout OR List of Rooms Layout */}
      {!selectedRoom ? (
        <div className="animate-in fade-in duration-200">
          {/* Header Bar */}
          <PageHeader
            title="Absensi Kegiatan & Pertemuan"
            subtitle="Kelola pencatatan daftar hadir untuk safety talk harian, briefing pagi, toolbox meeting, training, dan kegiatan operasional lainnya."
            onBack={onBack}
            icon={<CalendarCheck className="h-6 w-6 text-sky-600" />}
            actions={
              userRole === 'admin' ? (
                <Button
                  variant="primary"
                  icon={<Plus className="h-4 w-4" />}
                  onClick={openNewRoomModal}
                >
                  Buka Room Absensi
                </Button>
              ) : (
                <div className="bg-sky-50 border border-sky-150 rounded-xl px-4 py-2 text-[11px] text-sky-800 font-semibold max-w-sm">
                  ℹ️ Anda login sebagai <b>Operator</b>. Anda dapat melakukan absensi sendiri & menambahkan orang lain ke absensi aktif yang sedang berjalan.
                </div>
              )
            }
          />

          {/* Tab Selection Filter */}
          <div className="flex items-center justify-between mt-6">
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl border border-slate-205">
              <button
                onClick={() => setActiveTab('Aktif')}
                className={`px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'Aktif'
                    ? 'bg-white text-sky-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Active Rooms
              </button>
              <button
                onClick={() => setActiveTab('Selesai')}
                className={`px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'Selesai'
                    ? 'bg-white text-slate-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                Completed History
              </button>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Total {filteredRooms.length} item ditemukan
            </span>
          </div>

          {/* Rooms Grid */}
          {filteredRooms.length === 0 ? (
            <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 mt-6 space-y-3">
              <CalendarCheck className="h-12 w-12 text-slate-300 mx-auto" />
              <div>
                <p className="text-sm font-bold text-slate-500">Tidak Ada Room Absensi {activeTab === 'Aktif' ? 'Aktif' : 'Riwayat'}</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {activeTab === 'Aktif'
                    ? "Belum ada agenda absensi harian yang dibuka. Hubungi Admin untuk membuat room baru."
                    : "Belum ada riwayat absensi yang telah diselesaikan pada server lokal ini."}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {filteredRooms.map((room) => {
                const uniqueDepts = Array.from(new Set(room.peserta.map(p => p.departemen)));
                return (
                  <div
                    key={room.id}
                    onClick={() => { setSelectedRoom(room); setSearchQuery(''); setSelectedDeptFilter('Semua Departemen'); }}
                    className="group border border-slate-200 hover:border-sky-300 bg-white rounded-2xl p-5 hover:shadow transition duration-150 cursor-pointer flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      {/* Top Header Row of card */}
                      <div className="flex justify-between items-start gap-2">
                        {room.status === 'Aktif' ? (
                          <span className="px-2.5 py-0.5 text-[9.5px] font-black uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-700 border border-emerald-150 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full"></span> AKTIF
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 text-[9.5px] font-black uppercase tracking-wider rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 bg-slate-400 rounded-full"></span> SELESAI
                          </span>
                        )}

                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md font-mono">
                          {room.peserta.length} Peserta Hadir
                        </span>
                      </div>

                      {/* Title block */}
                      <div className="space-y-1">
                        <h3 className="text-sm font-black text-slate-800 group-hover:text-sky-700 transition leading-snug">
                          {room.judul}
                        </h3>
                        {room.deskripsi && (
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                            {room.deskripsi}
                          </p>
                        )}
                      </div>

                      {/* Icons Metadata Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1 font-medium border-t border-slate-50">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{getDisplayDate(room.tanggal)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>Waktu: {room.jamMulai} - {room.jamSelesai}</span>
                        </div>
                        <div className="flex items-center gap-1.5 sm:col-span-2 text-slate-600 font-bold truncate">
                          <MapPin className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                          <span className="truncate">{room.lokasi}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom action drawer on card */}
                    <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 italic">
                        <span>Oleh: {room.createdBy}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {userRole === 'admin' && (
                          <>
                            <button
                              onClick={(e) => openEditRoomModal(room, e)}
                              className="p-1.5 bg-white text-slate-500 hover:text-sky-600 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
                              title="Edit Room"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleToggleRoomStatus(room, e)}
                              className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition ${
                                room.status === 'Aktif'
                                  ? 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700'
                                  : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700'
                              }`}
                              title={room.status === 'Aktif' ? 'Tandai Selesai' : 'Tandai Aktif'}
                            >
                              {room.status === 'Aktif' ? 'Selesai' : 'Aktifkan'}
                            </button>
                            <button
                              onClick={(e) => handleDeleteRoom(room.id, e)}
                              className="p-1.5 bg-white text-rose-500 hover:bg-rose-50 rounded-lg border border-rose-100 transition"
                              title="Hapus Room"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                        <span className="text-[11px] font-bold text-sky-600 group-hover:translate-x-0.5 transition flex items-center gap-0.5 ml-2">
                          Buka Room <ChevronRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* DETAIL ROOM VIEW SCREEN (ACTUAL ACTIVE ABSENSI MEETING / TRAINING WORKSPACE) */
        <div className="animate-in fade-in duration-200 print:hidden">
          
          {/* Back button and title */}
          <div className="print:hidden flex items-center justify-between pb-5 border-b border-gray-100">
            <button
              onClick={() => setSelectedRoom(null)}
              className="px-3.5 py-1.5 bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Room
            </button>

            {/* Quick status badge */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">Status Room:</span>
              {selectedRoom.status === 'Aktif' ? (
                <span className="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-700 border border-emerald-150 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping"></span> AKTIF
                </span>
              ) : (
                <span className="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full bg-slate-100 text-slate-600 border border-slate-205 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-slate-400 rounded-full"></span> SELESAI
                </span>
              )}
            </div>
          </div>



          {/* Core Info Banner */}
          <div className="mt-6 bg-slate-50 p-5 rounded-2xl border border-slate-200 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-sky-600 tracking-wider font-mono">JUDUL KEGIATAN & PERTEMUAN:</span>
                <h1 className="text-lg font-extrabold text-slate-900 leading-tight">
                  {selectedRoom.judul}
                </h1>
              </div>

              {selectedRoom.deskripsi && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">DESKRIPSI:</span>
                  <p className="text-xs text-slate-600 leading-relaxed font-sans">
                    {selectedRoom.deskripsi}
                  </p>
                </div>
              )}
            </div>

            {/* Quick Metadata list */}
            <div className="bg-white/80 border border-slate-200 rounded-xl p-4 space-y-2.5 font-medium text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                <span>Tanggal: <b>{getDisplayDate(selectedRoom.tanggal)}</b></span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                <span>Jam: <b>{selectedRoom.jamMulai} s/d {selectedRoom.jamSelesai} WIB</b></span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-sky-500 shrink-0 mt-0.5" />
                <span>Lokasi: <b className="text-slate-800">{selectedRoom.lokasi}</b></span>
              </div>
              <div className="flex items-start gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-400 font-mono">
                <span>Dibuat Oleh: {selectedRoom.createdBy}</span>
              </div>
            </div>
          </div>

          {/* PRESENCE INTERACTIVE ACTION HUB (Only visible in screen mode) */}
          <div className="print:hidden mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Self check-in card */}
            <div className="bg-white border-2 border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between items-start gap-4">
              <div className="space-y-2 w-full">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                    <User className="h-4 w-4" />
                  </div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Absensi Diri Sendiri (Akun)
                  </h3>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Konfirmasi kehadiran fisik Anda langsung ke dalam room ini dengan menggunakan akun <b>{userRealName}</b> yang sedang masuk.
                </p>
              </div>

              {selectedRoom.status === 'Selesai' ? (
                <div className="w-full p-3 bg-slate-55/70 border border-slate-150 rounded-xl text-center text-xs text-slate-500 font-semibold flex items-center justify-center gap-2">
                  <AlertCircle className="h-4 w-4 text-slate-400" />
                  Absensi telah ditutup oleh Admin
                </div>
              ) : userHasCheckedIn ? (
                <div className="w-full p-4 bg-emerald-50 border border-emerald-150 text-emerald-900 rounded-xl space-y-1">
                  <p className="text-xs font-extrabold flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Status: Sudah Terdaftar Hadir
                  </p>
                  <p className="text-[10px] text-emerald-750 font-medium">
                    Kehadiran Anda berhasil divalidasi oleh sistem pada daftar hadir di bawah.
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => {
                    const match = karyawanData.find(k => (k.nama.toLowerCase() === userRealName.toLowerCase()) || (userNrp && k.nik === userNrp));
                    setSelfNrp(userNrp || (match ? match.nik : ''));
                    setSelfDept(match && DEPARTMENTS.includes(match.dept) ? match.dept : DEPARTMENTS[0]);
                    setSelfJabatan(match ? (match.jabatan || match.dept) : '');
                    setShowSelfCheckIn(true);
                  }}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition shadow flex items-center justify-center gap-2 cursor-pointer select-none"
                >
                  ✅ Konfirmasi Hadir Saya
                </button>
              )}
            </div>

            {/* Tambah Orang card (If others don't have accounts) */}
            <div className="bg-white border-2 border-slate-200/80 rounded-2xl p-5 flex flex-col justify-between items-start gap-4">
              <div className="space-y-2 w-full">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Tambahkan Orang Lain
                  </h3>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Untuk mendaftarkan rekan kerja, kru lapangan, tamu, atau peserta lain yang tidak membawa device atau belum memiliki akun.
                </p>
              </div>

              {selectedRoom.status === 'Selesai' ? (
                <div className="w-full p-3 bg-slate-55/70 border border-slate-150 rounded-xl text-center text-xs text-slate-500 font-semibold flex items-center justify-center gap-2">
                  <AlertCircle className="h-4 w-4 text-slate-400" />
                  Registrasi peserta tambahan ditutup
                </div>
              ) : (
                <button
                  onClick={() => {
                    setAddNama('');
                    setAddNrp('');
                    setAddDept(DEPARTMENTS[0]);
                    setAddJabatan('');
                    setShowAddPersonModal(true);
                  }}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition shadow flex items-center justify-center gap-2 cursor-pointer select-none"
                >
                  ➕ Tambahkan Peserta Lain
                </button>
              )}
            </div>

          </div>

          {/* DYNAMIC CONFIRMATION MODAL SELF PRESENCE */}
          {showSelfCheckIn && (
            <div className="print:hidden fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl p-6 relative">
                <button
                  onClick={() => setShowSelfCheckIn(false)}
                  className="absolute right-4 top-4 hover:bg-slate-100 p-1.5 rounded-lg transition text-slate-400 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">Lengkapi Status Kehadiran Anda</h3>
                </div>

                <form onSubmit={handleSelfPresenceSubmit} className="space-y-4">
                  <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1 border">
                    <p className="text-slate-400 font-bold">Nama Karyawan:</p>
                    <p className="font-extrabold text-slate-800">{userRealName}</p>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">NIK / NRP (Opsional)</label>
                    <input
                      type="text"
                      value={selfNrp}
                      onChange={(e) => setSelfNrp(e.target.value)}
                      placeholder="Contoh: ITU-HR-0482"
                      className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs border focus:border-emerald-500 focus:outline-none transition font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Departemen</label>
                    <select
                      value={selfDept}
                      onChange={(e) => setSelfDept(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs border focus:border-emerald-500 focus:outline-none transition font-semibold"
                    >
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Jabatan / Posisi *</label>
                    <input
                      type="text"
                      value={selfJabatan}
                      onChange={(e) => setSelfJabatan(e.target.value)}
                      placeholder="Contoh: Mechanic Assistant, Auditor, Officer dll"
                      required
                      className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs border focus:border-emerald-500 focus:outline-none transition font-semibold"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSelfCheckIn(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase rounded-lg"
                    >
                      Simpan Absensi Saya
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* DYNAMIC CONFIRMATION MODAL ADD OTHER PERSON */}
          {showAddPersonModal && (
            <div className="print:hidden fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl p-6 relative">
                <button
                  onClick={() => setShowAddPersonModal(false)}
                  className="absolute right-4 top-4 hover:bg-slate-100 p-1.5 rounded-lg transition text-slate-400 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
                  <UserPlus className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">Input Kehadiran Peserta Lain</h3>
                </div>

                <form onSubmit={handleAddOtherPerson} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama Peserta *</label>
                    <input
                      type="text"
                      value={addNama}
                      onChange={(e) => setAddNama(e.target.value)}
                      placeholder="Masukkan nama lengkap peserta"
                      required
                      className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs border focus:border-indigo-500 focus:outline-none transition font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">NIK / NRP (Opsional)</label>
                    <input
                      type="text"
                      value={addNrp}
                      onChange={(e) => setAddNrp(e.target.value)}
                      placeholder="Contoh: ITU-SE-1234 atau kosongkan"
                      className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs border focus:border-indigo-500 focus:outline-none transition font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Departemen</label>
                    <select
                      value={addDept}
                      onChange={(e) => setAddDept(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs border focus:border-indigo-500 focus:outline-none transition font-semibold"
                    >
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Jabatan / Posisi *</label>
                    <input
                      type="text"
                      value={addJabatan}
                      onChange={(e) => setAddJabatan(e.target.value)}
                      placeholder="Contoh: Helper, Staff, Mechanic dll"
                      required
                      className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs border focus:border-indigo-500 focus:outline-none transition font-semibold"
                    />
                  </div>

                  <div className="p-2.5 bg-indigo-50/50 rounded-lg text-[10px] text-indigo-805 font-medium leading-normal">
                    💡 Sistem log: Data peserta ini akan ditandai diinput oleh <b>{userRealName}</b> dan terdaftar sebagai metode <b>Ditambahkan</b>.
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddPersonModal(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-lg"
                    >
                      Konfirmasi Tambah
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showEditAttendeeModal && (
            <div className="print:hidden fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl p-6 relative">
                <button
                  onClick={() => {
                    setShowEditAttendeeModal(false);
                    setEditingAttendee(null);
                  }}
                  className="absolute right-4 top-4 hover:bg-slate-100 p-1.5 rounded-lg transition text-slate-400 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
                  <Edit2 className="h-5 w-5 text-sky-600" />
                  <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">Edit Data Kehadiran Peserta</h3>
                </div>

                <form onSubmit={handleSaveEditedAttendee} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nama Peserta *</label>
                    <input
                      type="text"
                      value={editAttendeeNama}
                      onChange={(e) => setEditAttendeeNama(e.target.value)}
                      placeholder="Masukkan nama lengkap peserta"
                      required
                      className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs border focus:border-sky-500 focus:outline-none transition font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">NIK / NRP (Opsional)</label>
                    <input
                      type="text"
                      value={editAttendeeNrp}
                      onChange={(e) => setEditAttendeeNrp(e.target.value)}
                      placeholder="Contoh: ITU-SE-1234 atau kosongkan"
                      className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs border focus:border-sky-500 focus:outline-none transition font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Departemen</label>
                    <select
                      value={editAttendeeDept}
                      onChange={(e) => setEditAttendeeDept(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs border focus:border-sky-500 focus:outline-none transition font-semibold"
                    >
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Jabatan / Posisi *</label>
                    <input
                      type="text"
                      value={editAttendeeJabatan}
                      onChange={(e) => setEditAttendeeJabatan(e.target.value)}
                      placeholder="Contoh: Helper, Staff, Mechanic dll"
                      required
                      className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs border focus:border-sky-500 focus:outline-none transition font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Waktu Hadir *</label>
                    <input
                      type="text"
                      value={editAttendeeWaktu}
                      onChange={(e) => setEditAttendeeWaktu(e.target.value)}
                      placeholder="Contoh: 08:30 WIB"
                      required
                      className="w-full px-3 py-2 bg-slate-50 rounded-xl text-xs border focus:border-sky-500 focus:outline-none transition font-semibold font-mono"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditAttendeeModal(false);
                        setEditingAttendee(null);
                      }}
                      className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-black uppercase rounded-lg"
                    >
                      Simpan Perubahan
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TABLE OF ATTENDEE PRESENCE DATA */}
          <div className="mt-8 bg-white border border-slate-205 rounded-3xl p-5 shadow-sm space-y-4 print:border-none print:shadow-none print:p-0">
            
            {/* Table Header and controls */}
            <div className="print:hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-4 border-b border-slate-150">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-slate-500" />
                  Daftar Peserta Hadir
                  <span className="bg-slate-100 text-slate-650 font-mono text-xs px-2.5 py-0.5 rounded-full font-black ml-1">
                    {filteredAndSearchedAttendees.length} Hadir
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">Saring data kehadiran berdasar kata kunci pencarian nama atau departemen.</p>
              </div>

              {/* Utility Export triggers (Admin Only) */}
              {userRole === 'admin' ? (
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  <button
                    onClick={exportToExcelFormat}
                    className="px-3.5 py-2 bg-emerald-55 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    title="Ekspor rekap ke format spreadsheet Excel/CSV"
                  >
                    <FileSpreadsheet className="h-4 w-4" /> Export Excel
                  </button>
                  <button
                    onClick={() => setShowPrintPreviewDialog(true)}
                    className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer font-sans"
                    title="Buka Preview Cetak Dokumen Absensi (A4 Form)"
                  >
                    <FileText className="h-4 w-4" /> Preview Cetak
                  </button>
                  <button
                    onClick={triggerPDFPrint}
                    className="px-3.5 py-2 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    title="Cetak Berkas Daftar Hadir ke Format PDF A4"
                  >
                    <Printer className="h-4 w-4" /> Cetak PDF
                  </button>
                </div>
              ) : (
                <div className="bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-[11px] text-slate-500 font-bold flex items-center gap-1">
                  🔒 Akses Absensi (No Review & No Print)
                </div>
              )}
            </div>

            {/* Print Header for Sheet table */}
            <div className="hidden print:block text-center mb-4">
              <h3 className="text-sm font-black text-slate-900 border-b border-dashed border-slate-300 pb-1 uppercase tracking-wider">
                BERKAS REKAPITULASI KEHADIRAN PESERTA
              </h3>
            </div>

            {/* Real Search Inputs */}
            <div className="print:hidden grid grid-cols-1 sm:grid-cols-3 gap-3 md:pt-1">
              <div className="sm:col-span-2 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari berdasarkan nama, NRP, atau jabatan..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 hover:bg-slate-50 focus:bg-white rounded-xl text-xs border border-slate-200 focus:border-sky-500 focus:outline-none transition font-semibold"
                />
              </div>

              <div>
                <select
                  value={selectedDeptFilter}
                  onChange={(e) => setSelectedDeptFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 hover:bg-slate-50 focus:bg-white rounded-xl text-xs border border-slate-205 focus:border-sky-500 focus:outline-none transition font-semibold cursor-pointer"
                >
                  <option value="Semua Departemen">Semua Departemen</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            {/* Attendance list table container */}
            <div className="overflow-x-auto border border-slate-150 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-150 text-[11px] font-black uppercase text-slate-500 text-left font-mono">
                  <tr>
                    <th className="px-4 py-3 text-center w-10">No</th>
                    <th className="px-5 py-3">Nama Lengkap / NIK-NRP</th>
                    <th className="px-5 py-3">Departemen</th>
                    <th className="px-5 py-3">Jabatan</th>
                    <th className="px-4 py-3 whitespace-nowrap">Waktu Hadir</th>
                    <th className="px-4 py-3 text-center w-28 whitespace-nowrap">Metode</th>
                    <th className="print:hidden px-4 py-3 text-center w-16">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans font-medium text-slate-700">
                  {filteredAndSearchedAttendees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        <User className="h-8 w-8 mx-auto opacity-30 mb-2" />
                        <p className="font-bold text-xs">Belum ada peserta terdaftar</p>
                        <p className="text-[10px] text-slate-400">Silahkan isi kehadiran diatas untuk memulai pencatatan absensi.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAndSearchedAttendees.map((p, index) => {
                      const isOwner = p.addedBy === userRealName;
                      const canDelete = userRole === 'admin' || isOwner;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-4 py-3 text-center font-mono text-slate-400">
                            {index + 1}
                          </td>
                          <td className="px-5 py-3">
                            <div>
                              <strong className="font-black text-slate-800 font-sans block">{p.nama}</strong>
                              {p.nrp && <span className="font-mono text-[9px] bg-slate-100 text-slate-500 px-1 py-0.2 rounded font-bold break-all mt-0.5 inline-block">{p.nrp}</span>}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-slate-650 font-bold whitespace-nowrap">
                            <span className="flex items-center gap-1">
                              <Building className="h-3 w-3 text-slate-400" />
                              {p.departemen}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-slate-600 font-bold whitespace-nowrap">
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3 w-3 text-slate-400" />
                              {p.jabatan}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-bold whitespace-nowrap">
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="h-3 w-3 text-slate-350" />
                              {p.waktu}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {p.metode === 'Akun' ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-150 inline-block uppercase font-mono shadow-sm">
                                Akun
                              </span>
                            ) : (
                              <div className="inline-block text-center">
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-50 border border-indigo-150 text-indigo-700 inline-block uppercase font-mono shadow-sm">
                                  Ditambahkan
                                </span>
                                {p.addedBy && (
                                  <span className="block text-[8px] text-slate-400 italic mt-0.5 whitespace-nowrap leading-none">
                                    oleh: {p.addedBy}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="print:hidden px-4 py-1 text-center font-sans">
                            <div className="flex items-center justify-center gap-1">
                              {userRole === 'admin' && (
                                <button
                                  onClick={() => handleOpenEditAttendeeModal(p)}
                                  className="p-1.5 hover:bg-sky-50 text-slate-500 hover:text-sky-600 rounded-lg transition border border-transparent hover:border-sky-100"
                                  title="Edit Peserta"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {canDelete ? (
                                <button
                                  onClick={() => handleDeleteAttendee(p.id)}
                                  className="p-1.5 hover:bg-rose-50 text-slate-380 hover:text-rose-600 rounded-lg transition border border-transparent hover:border-rose-100"
                                  title={isOwner && userRole !== 'admin' ? "Hapus peserta yang telah Anda tambahkan" : "Hapus Peserta"}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-300 font-mono">-</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>



          </div>

        </div>
      )}

      {/* DYNAMIC ROOM FORM MODAL (ONLY FOR CREATE/EDIT ROOM) */}
      {showRoomModal && (
        <div className="print:hidden fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl border border-slate-200 shadow-2xl p-6 relative">
            <button
              onClick={() => setShowRoomModal(false)}
              className="absolute right-4 top-4 hover:bg-slate-100 p-1.5 rounded-lg transition text-slate-400 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-100">
              <CalendarCheck className="h-5 w-5 text-sky-600" />
              <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                {formIsEditing ? 'Edit Room Absensi Kegiatan' : 'Buka Room Absensi Baru'}
              </h3>
            </div>

            <form onSubmit={handleSaveRoom} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-600 uppercase tracking-widest">Judul Absensi / Kegiatan *</label>
                <input
                  type="text"
                  value={formJudul}
                  onChange={(e) => setFormJudul(e.target.value)}
                  placeholder="Contoh: Safety Talk Pagi, Briefing Operasional, Training Crane, lapor..."
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white rounded-xl text-xs border border-slate-200 focus:border-sky-500 focus:outline-none transition font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-600 uppercase tracking-widest">Tanggal Kegiatan *</label>
                  <input
                    type="date"
                    value={formTanggal}
                    onChange={(e) => setFormTanggal(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white rounded-xl text-xs border border-slate-200 focus:border-sky-500 focus:outline-none transition font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-600 uppercase tracking-widest">Jam Mulai *</label>
                  <input
                    type="time"
                    value={formJamMulai}
                    onChange={(e) => setFormJamMulai(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white rounded-xl text-xs border border-slate-200 focus:border-sky-500 focus:outline-none transition font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-600 uppercase tracking-widest">Jam Selesai *</label>
                  <input
                    type="time"
                    value={formJamSelesai}
                    onChange={(e) => setFormJamSelesai(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white rounded-xl text-xs border border-slate-200 focus:border-sky-500 focus:outline-none transition font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-600 uppercase tracking-widest">Lokasi Pertemuan *</label>
                <input
                  type="text"
                  value={formLokasi}
                  onChange={(e) => setFormLokasi(e.target.value)}
                  placeholder="Contoh: Kantor HSE Lt.1, Lapangan Workshop, Area Coal Mining..."
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white rounded-xl text-xs border border-slate-200 focus:border-sky-500 focus:outline-none transition font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-600 uppercase tracking-widest">Detail/Keterangan Acara (Opsional)</label>
                <textarea
                  value={formDeskripsi}
                  onChange={(e) => setFormDeskripsi(e.target.value)}
                  placeholder="Rincikan poin bahasan, narasumber, atau instruksi kerja..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white rounded-xl text-xs border border-slate-200 focus:border-sky-500 focus:outline-none transition resize-none font-semibold"
                ></textarea>
              </div>

              <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRoomModal(false)}
                  className="px-4.5 py-2.5 text-xs font-black text-slate-500 hover:bg-slate-50 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition shadow"
                >
                  {formIsEditing ? 'Simpan Perubahan' : 'Publish & Buka Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admins Printable Document & Print Preview triggers */}
      {selectedRoom && userRole === 'admin' && (
        <PrintableAttendeeSheet selectedRoom={selectedRoom} userRealName={userRealName} />
      )}

      {selectedRoom && userRole === 'admin' && showPrintPreviewDialog && (
        <PrintPreviewModal 
          onClose={() => setShowPrintPreviewDialog(false)} 
          selectedRoom={selectedRoom} 
          userRealName={userRealName} 
        />
      )}

    </div>
  );
}

// ==========================================
// NEW HIGH-FIDELITY PRINT-READY LAYOUTS
// ==========================================

interface FormSheetLayoutProps {
  room: RoomAbsensi;
  userRealName: string;
}

function FormSheetLayout({ room, userRealName }: FormSheetLayoutProps) {
  const formattedRoomId = `ABS-${room.tanggal.replace(/-/g, '')}-${room.id.substring(Math.max(0, room.id.length - 3)).toUpperCase()}`;
  
  // Format Indonesian Day / Date
  const getTanggalIndoDenganHariText = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const dateObj = new Date(dateStr);
    const dayIndex = dateObj.getDay();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dayName = days[dayIndex] || 'Senin';
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${parseInt(parts[2])} ${months[parseInt(parts[1]) - 1]} ${parts[0]} (${dayName})`;
  };

  return (
    <div className="bg-white text-slate-900 p-6 md:p-8 rounded-none shadow-none font-sans max-w-[210mm] mx-auto min-h-[297mm] flex flex-col justify-between">
      <div>
        {/* Mockup Header Line */}
        <div className="flex flex-col md:flex-row justify-between items-stretch border-b-2 border-blue-600 pb-4 mb-6 gap-4">
          {/* Left: Logo */}
          <div className="flex items-center">
            <img 
              src="https://lh3.googleusercontent.com/d/1zE6dEUc98zDbaIVKBwfVDGX_s2abcmz_" 
              alt="Logo" 
              className="h-11 w-auto shrink-0 object-contain" 
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Center: document title spacer */}
          <div className="text-center flex flex-col justify-center items-center">
            <h1 className="text-base font-black tracking-wider text-blue-950 uppercase leading-none">DAFTAR HADIR</h1>
            <h2 className="text-xs font-black tracking-widest text-[#003399] uppercase mt-1 leading-none">ABSENSI KEGIATAN</h2>
          </div>

          {/* Right: Room ID and QR Code Block */}
          <div className="flex items-center gap-3.5 md:justify-end">
            <div className="text-right space-y-1">
              <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest block font-mono leading-none">ROOM ID</span>
              <div className="bg-[#003399] text-white font-mono text-[10px] font-black px-2.5 py-0.5 rounded tracking-wider leading-none">
                {formattedRoomId}
              </div>
              <p className="text-[7.5px] text-slate-500 leading-none max-w-[130px] pt-1">
                Scan untuk info Room
              </p>
            </div>
            <div className="border border-slate-200 p-1 bg-white rounded-md shrink-0">
              <svg className="h-10 w-10 text-slate-800" viewBox="0 0 29 29" fill="currentColor">
                <path d="M0 0h7v7H0zm1 1v5h5V1zm1 1h3v3H2z" />
                <path d="M22 0h7v7h-7zm1 1v5h5V1zm1 1h3v3h-3z" />
                <path d="M0 22h7v7H0zm1 1v5h5v-5zm1 1h3v3H2z" />
                <path d="M9 1h2v2H9zm4 0h3v1h-3zm4 0h1v4h-1zm3 1h1v1h-1zm1 2h2v1h-2zm-9 2h1v1H9zm2-1v1h1v-1zm4 1h1v3h-1zm-6 2h1v1h-1zm3 0h1v1h-1zm4 1h2v2h-2zm1-2h1v1h-1zm2 1h1v1h-1zm-10 2h2v1H9zm4 1h1v1h-1zm2 0h1v2h-1zm-6 2h1v1H9zm2 1h1v1h-1zm5 0h2v1h-2zm1-2h1v1h-1zm4 1h1v2h-1zm-9 2h2v1H9zm11-1h1v1h-1zm-12 2h3v1h-3zm5 0h1v1h-1zm2-2h1v1h-1zm1 2h1v1h-1zm4-1h1v1h-1zm-2 2h2v1h-2zm4 0h1v1h-1z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Info detail banner columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5 text-[10.5px]">
          {/* Left Metadata Grid */}
          <div className="md:col-span-2 space-y-1.5 border-r border-slate-100 pr-5">
            <div className="grid grid-cols-[105px_4px_1fr] gap-x-1.5 leading-snug">
              <span className="font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1">Judul Kegiatan</span>
              <span>:</span>
              <span className="font-bold text-slate-900">{room.judul}</span>
            </div>
            <div className="grid grid-cols-[105px_4px_1fr] gap-x-1.5 leading-snug">
              <span className="font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1">Tanggal</span>
              <span>:</span>
              <span className="font-bold text-slate-900">{getTanggalIndoDenganHariText(room.tanggal)}</span>
            </div>
            <div className="grid grid-cols-[105px_4px_1fr] gap-x-1.5 leading-snug">
              <span className="font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1">Waktu</span>
              <span>:</span>
              <span className="font-semibold text-slate-850">{room.jamMulai} - {room.jamSelesai} WIB</span>
            </div>
            <div className="grid grid-cols-[105px_4px_1fr] gap-x-1.5 leading-snug">
              <span className="font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1">Lokasi</span>
              <span>:</span>
              <span className="font-bold text-slate-900">{room.lokasi}</span>
            </div>
            <div className="grid grid-cols-[105px_4px_1fr] gap-x-1.5 leading-snug">
              <span className="font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1">Penyelenggara</span>
              <span>:</span>
              <span className="font-semibold text-slate-800">HSE Department</span>
            </div>
            <div className="grid grid-cols-[105px_4px_1fr] gap-x-1.5 leading-snug">
              <span className="font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1">Dibuat Oleh</span>
              <span>:</span>
              <span className="font-semibold text-slate-800">{room.createdBy} (HSE Officer)</span>
            </div>
            <div className="grid grid-cols-[105px_4px_1fr] gap-x-1.5 leading-snug">
              <span className="font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1">Dibuat Pada</span>
              <span>:</span>
              <span className="font-medium text-slate-500">{getTanggalIndoDenganHariText(room.tanggal)} &mdash; {room.jamMulai} WIB</span>
            </div>
            <div className="grid grid-cols-[105px_4px_1fr] gap-x-1.5 leading-normal">
              <span className="font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1">Keterangan</span>
              <span>:</span>
              <span className="text-slate-750 font-medium italic">{room.deskripsi || 'Wajib bagi seluruh pekerja area terkait.'}</span>
            </div>
          </div>

          {/* Right total attendees card box */}
          <div className="border border-slate-200 bg-slate-50/60 rounded-xl p-4 flex flex-col justify-center items-center text-center">
            <svg className="h-7 w-7 text-blue-600 mb-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-[8px] font-black uppercase tracking-widest text-blue-900 leading-none">TOTAL PESERTA</span>
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1 leading-none">YANG HADIR</span>
            <span className="text-3xl font-extrabold text-blue-950 mt-1 leading-none">{room.peserta.length}</span>
            <span className="text-[10px] font-bold text-slate-500 mt-1.5">Orang</span>
          </div>
        </div>

        {/* Table of attendees */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[10.5px] border-collapse border border-slate-200 font-sans">
            <thead className="bg-[#003399] text-white">
              <tr>
                <th className="border border-slate-200 px-3 py-2 text-center w-8">No</th>
                <th className="border border-slate-200 px-3.5 py-2">Nama Peserta</th>
                <th className="border border-slate-200 px-3 py-2 text-center w-28">NIK / NRP (Opsional)</th>
                <th className="border border-slate-200 px-3.5 py-2 w-32">Departemen</th>
                <th className="border border-slate-200 px-3.5 py-2 w-32">Jabatan</th>
                <th className="border border-slate-200 px-3 py-2 text-center w-24">Waktu Hadir</th>
                <th className="border border-slate-200 px-3 py-2 text-center w-24">Metode</th>
              </tr>
            </thead>
            <tbody>
              {room.peserta.length === 0 ? (
                <tr>
                  <td colSpan={7} className="border border-slate-200 text-center py-10 text-slate-400 italic font-medium">
                    Belum ada peserta terdaftar dalam lembar absensi ini.
                  </td>
                </tr>
              ) : (
                room.peserta.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="border border-slate-200 px-3 py-1.5 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                    <td className="border border-slate-200 px-3.5 py-1.5 font-bold text-slate-850">{p.nama}</td>
                    <td className="border border-slate-200 px-3 py-1.5 text-center font-mono font-bold text-slate-500">{p.nrp || '-'}</td>
                    <td className="border border-slate-200 px-3.5 py-1.5 font-bold text-slate-600">{p.departemen}</td>
                    <td className="border border-slate-200 px-3.5 py-1.5 font-bold text-slate-650">{p.jabatan}</td>
                    <td className="border border-slate-200 px-3 py-1.5 text-center font-mono font-bold text-slate-650">{p.waktu}</td>
                    <td className="border border-slate-200 px-3 py-1.5 text-center">
                      {p.metode === 'Akun' ? (
                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-250 inline-block font-mono">
                          Akun
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-250 inline-block font-mono">
                          Ditambahkan
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom informational footers */}
      <div className="space-y-4 pt-6 mt-6 border-t border-slate-100 shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
          {/* Method Info Block */}
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-1.5 text-[9.5px]">
            <h4 className="font-extrabold uppercase text-slate-700 tracking-wider border-b border-slate-150 pb-1">KETERANGAN METODE ABSENSI</h4>
            <div className="flex gap-2.5 pt-1">
              <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[7.5px] uppercase font-mono font-black shrink-0 h-fit leading-none">Akun</span>
              <p className="text-slate-550 leading-relaxed font-semibold">
                Peserta melakukan absensi sendiri menggunakan akun pada sistem.
              </p>
            </div>
            <div className="flex gap-2.5">
              <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[7.5px] uppercase font-mono font-black shrink-0 h-fit leading-none">Ditambahkan</span>
              <p className="text-slate-550 leading-relaxed font-semibold">
                Peserta ditambahkan oleh pengguna lain karena belum memiliki akun pada sistem.
              </p>
            </div>
          </div>

          {/* System Info Block */}
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 text-[9.5px] space-y-1">
            <h4 className="font-extrabold uppercase text-slate-700 tracking-wider border-b border-slate-150 pb-1">INFORMASI SISTEM</h4>
            <div className="grid grid-cols-[80px_4px_1fr] gap-x-1 font-semibold text-slate-500">
              <span className="font-bold">Dicetak Pada</span>
              <span>:</span>
              <span className="text-slate-700">{new Date().toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} {new Date().toLocaleTimeString('id-ID')} WIB</span>
            </div>
            <div className="grid grid-cols-[80px_4px_1fr] gap-x-1 font-semibold text-slate-500">
              <span className="font-bold">Dicetak Oleh</span>
              <span>:</span>
              <span className="text-slate-750 font-black">{userRealName}</span>
            </div>
            <div className="grid grid-cols-[80px_4px_1fr] gap-x-1 font-semibold text-slate-500">
              <span className="font-bold">Sistem</span>
              <span>:</span>
              <span className="text-slate-600 font-mono">Sistem Absensi v1.0</span>
            </div>
            <div className="grid grid-cols-[80px_4px_1fr] gap-x-1 font-semibold text-slate-500">
              <span className="font-bold">Dokumen ID</span>
              <span>:</span>
              <span className="text-slate-705 font-mono font-bold tracking-wider">{formattedRoomId}-PRINT</span>
            </div>
          </div>
        </div>

        {/* Auto Generated footer banner */}
        <div className="bg-sky-50/60 border border-sky-100 text-sky-900 rounded-lg py-2 px-3 flex items-center justify-center gap-1.5 text-[9.5px] font-bold text-center leading-none">
          <svg className="h-3.5 w-3.5 text-sky-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Dokumen ini digenerate secara otomatis oleh sistem dan tidak memerlukan tanda tangan.</span>
        </div>
      </div>
    </div>
  );
}

interface PrintableAttendeeSheetProps {
  selectedRoom: RoomAbsensi;
  userRealName: string;
}

function PrintableAttendeeSheet({ selectedRoom, userRealName }: PrintableAttendeeSheetProps) {
  return (
    <div className="hidden print:block absolute inset-0 bg-white z-[9999]">
      <FormSheetLayout room={selectedRoom} userRealName={userRealName} />
    </div>
  );
}

interface PrintPreviewModalProps {
  onClose: () => void;
  selectedRoom: RoomAbsensi;
  userRealName: string;
}

function PrintPreviewModal({ onClose, selectedRoom, userRealName }: PrintPreviewModalProps) {
  const triggerPrint = () => {
    window.print();
  };

  return (
    <div className="print:hidden fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex justify-center items-start p-4 md:p-8">
      <div className="bg-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden mt-4 mb-4 border border-slate-700 flex flex-col max-h-[92vh]">
        {/* Modal Controls Banner */}
        <div className="bg-slate-900 border-b border-slate-700 px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
            <h3 className="text-xs font-black text-slate-350 uppercase tracking-widest">Preview Cetak Formulir Absensi (Admin Only)</h3>
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={triggerPrint}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow hover:shadow-sky-500/10"
            >
              <Printer className="h-4 w-4" /> Cetak Sekarang
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white font-extrabold text-xs uppercase tracking-widest rounded-xl transition cursor-pointer"
            >
              Tutup Preview
            </button>
          </div>
        </div>

        {/* Form viewport container */}
        <div className="p-4 md:p-10 overflow-y-auto bg-slate-700 flex justify-center items-start">
          <div className="shadow-2xl border border-slate-200 rounded-lg overflow-hidden shrink-0 bg-white">
            <FormSheetLayout room={selectedRoom} userRealName={userRealName} />
          </div>
        </div>
      </div>
    </div>
  );
}
