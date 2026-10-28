import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, 
  Trash2, 
  Printer, 
  Save, 
  Search, 
  FileText, 
  Eye, 
  Calendar, 
  FileCheck2, 
  Clock, 
  UserCheck,
  CheckCircle2,
  ListOrdered,
  Layers,
  Sparkles,
  AlertCircle,
  Pencil,
  RefreshCw,
  X,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { formatTanggalIndonesia } from '../utils.js';
import { PageHeader, Button } from './common/index.js';

const companyLogo = 'https://lh3.googleusercontent.com/d/1zE6dEUc98zDbaIVKBwfVDGX_s2abcmz_';
const hseLogo = 'https://lh3.googleusercontent.com/d/156hm6i1ksZjjLvYvivwgVPfcuo-CP1fy';

interface DpbItemRow {
  id: string;
  description: string;
  qty: number | string;
  uom: string;
  priority: 'P1' | 'P2' | 'P3' | string;
}

interface DpbDocument {
  id: string; // timestamp / ID
  noReg: string;
  dimintaOleh: string;
  departemen: string;
  tanggal: string;
  items: DpbItemRow[];
  jabatanAdmin?: string;
  namaAdmin: string;
  jabatanGlSupervisor?: string;
  namaGlSupervisor: string;
  jabatanDeputyPjo?: string;
  namaDeputyPjo: string;
  jabatanPjo?: string;
  namaPjo: string;
  approverMode?: 'both' | 'deputy' | 'pjo';
  namaPpic?: string;
  note: string;
  photos?: string[];
  createdAt: string;
  createdBy?: string;
}

interface NamePickerFieldProps {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  namesList: string[];
}

function NamePickerField({ value, onChange, placeholder, namesList }: NamePickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredNames = namesList.filter(n => n.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="flex gap-1 items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-500"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="px-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold whitespace-nowrap transition cursor-pointer shrink-0 flex items-center gap-1"
          title="Klik untuk memilih nama"
        >
          <UserCheck className="h-3.5 w-3.5 text-indigo-600" />
          Pilih
        </button>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-2 text-xs space-y-1.5 animate-in fade-in zoom-in-95">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama..."
            className="w-full px-2 py-1 border border-slate-200 rounded-md text-xs focus:outline-none focus:border-indigo-500"
            autoFocus
          />
          <div className="max-h-40 overflow-y-auto divide-y divide-slate-100">
            {filteredNames.length === 0 ? (
              <p className="p-2 text-slate-400 text-[11px] text-center italic">Tidak ada nama ditemukan</p>
            ) : (
              filteredNames.map((name, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onChange(name);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className="w-full text-left px-2 py-1.5 hover:bg-indigo-50 hover:text-indigo-700 rounded transition font-medium text-slate-800"
                >
                  {name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface DpbFormProps {
  userRealName: string;
  userRole?: 'admin' | 'operator';
  username?: string;
  onBack: () => void;
}

export default function DpbForm({
  userRealName,
  userRole = 'admin',
  username = '',
  onBack
}: DpbFormProps) {
  const [activeTab, setActiveTab] = useState<'form' | 'archive'>('form');
  const [savedDocs, setSavedDocs] = useState<DpbDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPrintingModalOpen, setIsPrintingModalOpen] = useState(false);
  const [selectedDocToPrint, setSelectedDocToPrint] = useState<DpbDocument | null>(null);

  // Form Fields
  const [docId, setDocId] = useState<string | null>(null);
  const [dimintaOleh, setDimintaOleh] = useState(userRealName || '');
  const [departemen, setDepartemen] = useState('HSE & Safety');
  const [tanggal, setTanggal] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [noReg, setNoReg] = useState(() => {
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    return `DPB/${year}/${month}/${randomSeq}`;
  });

  // Table Items State
  const [items, setItems] = useState<DpbItemRow[]>([
    { id: '1', description: '', qty: 1, uom: 'Pcs', priority: 'P1' },
    { id: '2', description: '', qty: 1, uom: 'Pcs', priority: 'P1' },
    { id: '3', description: '', qty: 1, uom: 'Pcs', priority: 'P1' },
    { id: '4', description: '', qty: 1, uom: 'Pcs', priority: 'P1' },
    { id: '5', description: '', qty: 1, uom: 'Pcs', priority: 'P1' }
  ]);

  // Signatures Names & Roles State
  const [jabatanAdmin, setJabatanAdmin] = useState('Admin');
  const [namaAdmin, setNamaAdmin] = useState(userRealName || 'Admin HSE');
  const [jabatanGlSupervisor, setJabatanGlSupervisor] = useState('GL / Supervisor');
  const [namaGlSupervisor, setNamaGlSupervisor] = useState('');
  const [jabatanDeputyPjo, setJabatanDeputyPjo] = useState('Deputy PJO');
  const [namaDeputyPjo, setNamaDeputyPjo] = useState('');
  const [jabatanPjo, setJabatanPjo] = useState('PJO');
  const [namaPjo, setNamaPjo] = useState('');
  const [approverMode, setApproverMode] = useState<'both' | 'deputy' | 'pjo'>('both');
  const [karyawanList, setKaryawanList] = useState<string[]>([]);

  // Fetch users & employees for autocomplete/selection
  useEffect(() => {
    const fetchNames = async () => {
      try {
        const defaultNames = [
          "Muhammad Rifki Hidayat",
        ];
        const nameSet = new Set<string>(defaultNames);
        if (userRealName) nameSet.add(userRealName);

        // Fetch users
        try {
          const resUsers = await fetch('/api/users');
          const uData = await resUsers.json();
          if (uData.success && Array.isArray(uData.list)) {
            uData.list.forEach((u: any) => {
              if (u.nama) nameSet.add(u.nama.trim());
            });
          }
        } catch (e) {}

        // Fetch karyawan
        try {
          const resKaryawan = await fetch('/api/karyawan');
          const kData = await resKaryawan.json();
          if (kData.success && Array.isArray(kData.data)) {
            kData.data.forEach((k: any) => {
              const rawName = typeof k === 'string' ? k : k.nama;
              if (rawName) {
                const cleanName = rawName.includes(' - ') ? rawName.split(' - ')[1] : rawName;
                nameSet.add(cleanName.trim());
              }
            });
          }
        } catch (e) {}

        setKaryawanList(Array.from(nameSet));
      } catch (e) {
        console.warn("Failed to load employee list:", e);
      }
    };
    fetchNames();
  }, [userRealName]);

  // Note State
  const [note, setNote] = useState('');

  // Photos State
  const [photos, setPhotos] = useState<string[]>([]);

  // Status & Notification
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Photo Upload Handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        alert('Harap pilih file gambar (JPG/PNG).');
        continue;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setPhotos(prev => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Auto No Reg Generator based on highest sequence in documents
  const generateNextNoReg = (docs: DpbDocument[]) => {
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');

    let maxSeq = 0;
    docs.forEach(doc => {
      if (!doc || !doc.noReg) return;
      const parts = doc.noReg.split('/');
      const lastPart = parts[parts.length - 1];
      const num = parseInt(lastPart, 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    });

    const nextSeq = maxSeq + 1;
    return `DPB/${year}/${month}/${String(nextSeq).padStart(3, '0')}`;
  };

  const cleanDocsList = (list: DpbDocument[]): DpbDocument[] => {
    if (!Array.isArray(list)) return [];
    return list.filter(doc => {
      if (!doc) return false;
      const nr = (doc.noReg || '').toLowerCase();
      const dohl = (doc.dimintaOleh || '').toLowerCase();
      if (nr.includes('registrasi') || nr === 'no reg' || dohl === 'diminta oleh') return false;
      return true;
    });
  };

  // Load Saved Archives from Backend Database & Google Sheets
  const fetchDpbDocs = async () => {
    let localDocs: DpbDocument[] = [];
    try {
      const localData = localStorage.getItem('dpb_documents_archive');
      if (localData) {
        localDocs = cleanDocsList(JSON.parse(localData));
      }
    } catch (e) {
      console.warn("Failed to read local DPB archive:", e);
    }

    try {
      const res = await fetch('/api/dpb/list');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.list)) {
          let mergedList = [...data.list];
          // Merge local documents that aren't already in server response
          localDocs.forEach(localDoc => {
            if (localDoc && localDoc.id && !mergedList.some(d => d.id === localDoc.id || d.noReg === localDoc.noReg)) {
              mergedList.push(localDoc);
            }
          });

          const cleaned = cleanDocsList(mergedList);
          setSavedDocs(cleaned);
          saveArchiveToLocal(cleaned);
          if (data.nextNoReg) {
            setNoReg(data.nextNoReg);
          } else {
            setNoReg(generateNextNoReg(cleaned));
          }
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to fetch DPB docs from API, falling back to localStorage:", e);
    }

    // Fallback to localStorage if API call failed
    setSavedDocs(localDocs);
    saveArchiveToLocal(localDocs);
    setNoReg(generateNextNoReg(localDocs));
  };

  useEffect(() => {
    fetchDpbDocs();
  }, []);

  // Save Archive to localStorage fallback
  const saveArchiveToLocal = (docs: DpbDocument[]) => {
    try {
      localStorage.setItem('dpb_documents_archive', JSON.stringify(docs));
      setSavedDocs(docs);
    } catch (e) {
      console.error("Failed to save DPB archive to local:", e);
    }
  };

  const handleAddItemRow = () => {
    const newRow: DpbItemRow = {
      id: Date.now().toString(),
      description: '',
      qty: 1,
      uom: 'Pcs',
      priority: 'P1'
    };
    setItems([...items, newRow]);
  };

  const handleRemoveItemRow = (id: string) => {
    if (items.length <= 1) {
      alert("Minimal harus ada 1 baris item.");
      return;
    }
    setItems(items.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof DpbItemRow, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleResetForm = () => {
    if (confirm("Apakah Anda yakin ingin mengosongkan/reset formulir DPB ini?")) {
      const nextReg = generateNextNoReg(savedDocs);

      setDocId(null);
      setDimintaOleh(userRealName || '');
      setDepartemen('HSE & Safety');
      setTanggal(new Date().toISOString().split('T')[0]);
      setNoReg(nextReg);
      setItems([
        { id: '1', description: '', qty: 1, uom: 'Pcs', priority: 'P1' },
        { id: '2', description: '', qty: 1, uom: 'Pcs', priority: 'P1' },
        { id: '3', description: '', qty: 1, uom: 'Pcs', priority: 'P1' },
        { id: '4', description: '', qty: 1, uom: 'Pcs', priority: 'P1' },
        { id: '5', description: '', qty: 1, uom: 'Pcs', priority: 'P1' }
      ]);
      setJabatanAdmin('Admin');
      setNamaAdmin(userRealName || 'Admin HSE');
      setJabatanGlSupervisor('GL / Supervisor');
      setNamaGlSupervisor('');
      setJabatanDeputyPjo('Deputy PJO');
      setNamaDeputyPjo('');
      setJabatanPjo('PJO');
      setNamaPjo('');
      setApproverMode('both');
      setNote('');
      setPhotos([]);
    }
  };

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();

    // Filter valid non-empty items or keep at least filled ones
    const validItems = items.filter(it => it.description.trim() !== '');
    if (validItems.length === 0) {
      alert("Harap isi setidaknya 1 deskripsi barang yang diminta.");
      return;
    }

    const newDocId = docId || Date.now().toString();
    const docData: DpbDocument = {
      id: newDocId,
      noReg,
      dimintaOleh: dimintaOleh || '-',
      departemen: departemen || '-',
      tanggal,
      items: validItems,
      jabatanAdmin: jabatanAdmin || 'Admin',
      namaAdmin: namaAdmin || '-',
      jabatanGlSupervisor: jabatanGlSupervisor || 'GL / Supervisor',
      namaGlSupervisor: namaGlSupervisor || '-',
      jabatanDeputyPjo: jabatanDeputyPjo || 'Deputy PJO',
      namaDeputyPjo: approverMode === 'pjo' ? '' : (namaDeputyPjo || '-'),
      jabatanPjo: jabatanPjo || 'PJO',
      namaPjo: approverMode === 'deputy' ? '' : (namaPjo || '-'),
      approverMode: approverMode,
      note: note || '',
      photos: photos || [],
      createdAt: new Date().toISOString(),
      createdBy: username || userRealName
    };

    // Immediate local save
    const existingIndex = savedDocs.findIndex(d => d.id === newDocId || d.noReg === noReg);
    let updatedDocs: DpbDocument[];
    if (existingIndex >= 0) {
      updatedDocs = [...savedDocs];
      updatedDocs[existingIndex] = docData;
    } else {
      updatedDocs = [docData, ...savedDocs];
    }

    saveArchiveToLocal(updatedDocs);
    setDocId(newDocId);

    // Save to Database & Google Sheets "Arsip DPB"
    try {
      const res = await fetch('/api/dpb/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docData)
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          if (Array.isArray(result.list)) {
            setSavedDocs(result.list);
            saveArchiveToLocal(result.list);
          }
          if (result.nextNoReg) {
            setNoReg(result.nextNoReg);
          } else {
            setNoReg(generateNextNoReg(result.list || updatedDocs));
          }
        }
      }
    } catch (err) {
      console.error("Error saving DPB document to database:", err);
    }

    setSaveSuccessMsg("Dokumen Daftar Permintaan Barang (DPB) Berhasil Disimpan ke Database & Google Sheets!");
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleEditFromArchive = (doc: DpbDocument) => {
    setDocId(doc.id);
    setNoReg(doc.noReg);
    setDimintaOleh(doc.dimintaOleh);
    setDepartemen(doc.departemen);
    setTanggal(doc.tanggal);
    setItems(doc.items.length > 0 ? doc.items : [
      { id: '1', description: '', qty: 1, uom: 'Pcs', priority: 'P1' }
    ]);
    setJabatanAdmin(doc.jabatanAdmin || 'Admin');
    setNamaAdmin(doc.namaAdmin);
    setJabatanGlSupervisor(doc.jabatanGlSupervisor || 'GL / Supervisor');
    setNamaGlSupervisor(doc.namaGlSupervisor);
    setJabatanDeputyPjo(doc.jabatanDeputyPjo || 'Deputy PJO');
    setNamaDeputyPjo(doc.namaDeputyPjo);
    setJabatanPjo(doc.jabatanPjo || 'PJO');
    setNamaPjo(doc.namaPjo);
    
    const detectedMode = doc.approverMode || (
      (doc.namaDeputyPjo && doc.namaPjo && doc.namaDeputyPjo !== '-' && doc.namaPjo !== '-' && doc.namaDeputyPjo !== '' && doc.namaPjo !== '')
        ? 'both'
        : (doc.namaDeputyPjo && doc.namaDeputyPjo !== '-' && doc.namaDeputyPjo !== '' ? 'deputy' : 'pjo')
    );
    setApproverMode(detectedMode);

    setNote(doc.note || '');
    setPhotos(doc.photos || []);
    setActiveTab('form');
  };

  const handleDeleteFromArchive = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus arsip DPB ini?")) {
      const updated = savedDocs.filter(d => d.id !== id && d.noReg !== id);
      saveArchiveToLocal(updated);

      try {
        const res = await fetch(`/api/dpb/delete/${encodeURIComponent(id)}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          const result = await res.json();
          if (result.success && Array.isArray(result.list)) {
            setSavedDocs(result.list);
            saveArchiveToLocal(result.list);
            if (result.nextNoReg) {
              setNoReg(result.nextNoReg);
            }
          }
        }
      } catch (err) {
        console.error("Error deleting DPB document:", err);
      }
    }
  };

  const handleOpenPrintPreview = (customDoc?: DpbDocument) => {
    if (customDoc) {
      setSelectedDocToPrint(customDoc);
    } else {
      // Create snapshot from current form state
      const validItems = items.filter(it => it.description.trim() !== '');
      const currentDoc: DpbDocument = {
        id: docId || Date.now().toString(),
        noReg,
        dimintaOleh: dimintaOleh || '-',
        departemen: departemen || '-',
        tanggal,
        items: validItems.length > 0 ? validItems : items,
        jabatanAdmin: jabatanAdmin || 'Admin',
        namaAdmin: namaAdmin || '-',
        jabatanGlSupervisor: jabatanGlSupervisor || 'GL / Supervisor',
        namaGlSupervisor: namaGlSupervisor || '-',
        jabatanDeputyPjo: jabatanDeputyPjo || 'Deputy PJO',
        namaDeputyPjo: approverMode === 'pjo' ? '' : (namaDeputyPjo || '-'),
        jabatanPjo: jabatanPjo || 'PJO',
        namaPjo: approverMode === 'deputy' ? '' : (namaPjo || '-'),
        approverMode: approverMode,
        note: note || '',
        photos: photos || [],
        createdAt: new Date().toISOString()
      };
      setSelectedDocToPrint(currentDoc);
    }
    setIsPrintingModalOpen(true);
  };

  const filteredArchive = savedDocs.filter(d => {
    const q = searchTerm.toLowerCase();
    return (
      d.noReg.toLowerCase().includes(q) ||
      d.dimintaOleh.toLowerCase().includes(q) ||
      d.departemen.toLowerCase().includes(q) ||
      d.items.some(it => it.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Header section */}
      <PageHeader
        title="DAFTAR PERMINTAAN BARANG (DPB)"
        subtitle="ITU SIS Admo Tutupan Tabalong — Formulir Resmi Pengajuan & Permintaan Barang"
        onBack={onBack}
        icon={<FileText className="h-6 w-6 text-indigo-600" />}
        actions={
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'form' 
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Formulir DPB
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('archive')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'archive' 
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Arsip Dokumen ({savedDocs.length})
            </button>
          </div>
        }
      />

      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* TAB 1: FORMULIR ENTRY */}
      {activeTab === 'form' && (
        <form onSubmit={handleSaveDocument} className="space-y-6">
          
          {/* Card 1: Header Information */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                <FileCheck2 className="h-4 w-4 text-indigo-600" /> Informasi Pemohon & Reg
              </span>
              <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
                No Reg: {noReg}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              
              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Diminta Oleh <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={dimintaOleh}
                  onChange={(e) => setDimintaOleh(e.target.value)}
                  placeholder="Nama Pemohon Barang"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Departemen <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={departemen}
                  onChange={(e) => setDepartemen(e.target.value)}
                  placeholder="Contoh: HSE, Service, PPIC"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Tanggal <span className="text-rose-500">*</span></label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">No Reg / Registrasi</label>
                <input
                  type="text"
                  value={noReg}
                  onChange={(e) => setNoReg(e.target.value)}
                  placeholder="No Registrasi DPB"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

            </div>
          </div>

          {/* Card 2: Items Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-3 gap-2">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                  <ListOrdered className="h-4 w-4 text-indigo-600" /> Daftar Rincian Barang (DPB)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Isikan deskripsi barang, jumlah (qty), satuan (UoM), serta tingkat prioritas.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddItemRow}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Tambah Baris
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[#00AEEF] text-slate-900 font-extrabold uppercase border-b border-slate-300" style={{ backgroundColor: '#00AEEF', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-center w-12">No</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 min-w-[240px]">Description (Deskripsi Barang)</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-center w-24">Qty</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-center w-28">UoM</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-center w-32">Priority</th>
                    <th className="py-2.5 px-3 text-center w-14">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 border-b border-slate-200">
                  {items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2 px-3 text-center font-bold text-slate-600 border-r border-slate-200">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                          placeholder="Deskripsi/Nama barang yang diminta..."
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200">
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => handleItemChange(item.id, 'qty', e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center text-slate-800 focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200">
                        <input
                          type="text"
                          value={item.uom}
                          onChange={(e) => handleItemChange(item.id, 'uom', e.target.value)}
                          placeholder="Pcs/Box/Set"
                          className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-center text-slate-800 focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200">
                        <select
                          value={item.priority}
                          onChange={(e) => handleItemChange(item.id, 'priority', e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center text-slate-800 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="P1">P1</option>
                          <option value="P2">P2</option>
                          <option value="P3">P3</option>
                        </select>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(item.id)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                          title="Hapus Baris"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 3: Signatures / Penandatangan Form */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-3 gap-3">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                <UserCheck className="h-4 w-4 text-indigo-600" /> Pengesahan & Otorisasi Penandatangan
              </h3>

              <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl text-xs font-bold">
                <span className="text-[10px] text-slate-600 uppercase px-2 font-bold">Penandatangan Menyetujui:</span>
                <button
                  type="button"
                  onClick={() => setApproverMode('both')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer text-xs ${
                    approverMode === 'both'
                      ? 'bg-indigo-600 text-white shadow-xs font-bold'
                      : 'bg-transparent text-slate-700 hover:text-slate-900'
                  }`}
                >
                  Keduanya (Deputy & PJO)
                </button>
                <button
                  type="button"
                  onClick={() => setApproverMode('deputy')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer text-xs ${
                    approverMode === 'deputy'
                      ? 'bg-indigo-600 text-white shadow-xs font-bold'
                      : 'bg-transparent text-slate-700 hover:text-slate-900'
                  }`}
                >
                  Hanya Deputy PJO
                </button>
                <button
                  type="button"
                  onClick={() => setApproverMode('pjo')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer text-xs ${
                    approverMode === 'pjo'
                      ? 'bg-indigo-600 text-white shadow-xs font-bold'
                      : 'bg-transparent text-slate-700 hover:text-slate-900'
                  }`}
                >
                  Hanya PJO
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              
              {/* Dibuat Oleh */}
              <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200">
                <p className="text-[11px] font-bold text-slate-500 uppercase">Dibuat Oleh</p>
                <input
                  type="text"
                  value={jabatanAdmin}
                  onChange={(e) => setJabatanAdmin(e.target.value)}
                  placeholder="Jabatan (cth: Admin / Staff)"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-indigo-900 focus:outline-none focus:border-indigo-500"
                />
                <NamePickerField
                  value={namaAdmin}
                  onChange={setNamaAdmin}
                  placeholder="Nama Pembuat / Admin"
                  namesList={karyawanList}
                />
              </div>

              {/* Request: GL/Supervisor */}
              <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200">
                <p className="text-[11px] font-bold text-slate-500 uppercase">Request</p>
                <input
                  type="text"
                  value={jabatanGlSupervisor}
                  onChange={(e) => setJabatanGlSupervisor(e.target.value)}
                  placeholder="Jabatan (cth: GL / Supervisor)"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-indigo-900 focus:outline-none focus:border-indigo-500"
                />
                <NamePickerField
                  value={namaGlSupervisor}
                  onChange={setNamaGlSupervisor}
                  placeholder="Nama GL/Supervisor"
                  namesList={karyawanList}
                />
              </div>

              {/* Menyetujui: Deputy PJO */}
              {(approverMode === 'both' || approverMode === 'deputy') && (
                <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">Menyetujui (Deputy PJO)</p>
                  <input
                    type="text"
                    value={jabatanDeputyPjo}
                    onChange={(e) => setJabatanDeputyPjo(e.target.value)}
                    placeholder="Jabatan (cth: Deputy PJO)"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-indigo-900 focus:outline-none focus:border-indigo-500"
                  />
                  <NamePickerField
                    value={namaDeputyPjo}
                    onChange={setNamaDeputyPjo}
                    placeholder="Nama Deputy PJO"
                    namesList={karyawanList}
                  />
                </div>
              )}

              {/* Menyetujui: PJO */}
              {(approverMode === 'both' || approverMode === 'pjo') && (
                <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">Menyetujui (PJO)</p>
                  <input
                    type="text"
                    value={jabatanPjo}
                    onChange={(e) => setJabatanPjo(e.target.value)}
                    placeholder="Jabatan (cth: PJO)"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-indigo-900 focus:outline-none focus:border-indigo-500"
                  />
                  <NamePickerField
                    value={namaPjo}
                    onChange={setNamaPjo}
                    placeholder="Nama PJO"
                    namesList={karyawanList}
                  />
                </div>
              )}

            </div>
          </div>

          {/* Card 4: Note & Upload Foto Lampiran */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-800 uppercase tracking-widest">
                Note (Catatan Tambahan)
              </label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Catatan khusus permintaan barang, lokasi unit/worksite, instruksi pengiriman dll..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Photo Upload Section */}
            <div className="space-y-2.5 border-t border-slate-100 pt-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4 text-indigo-600" /> Foto Lampiran / Dokumentasi Barang
                  </label>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Upload gambar/foto pendukung barang yang diminta (opsional). Foto akan ditampilkan di bawah Note pada cetakan PDF.
                  </p>
                </div>
                <label className="inline-flex items-center justify-center px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition flex-shrink-0 cursor-pointer gap-1.5 shadow-2xs">
                  <Upload className="h-3.5 w-3.5 text-indigo-600" /> Upload Foto
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {photos.length === 0 ? (
                <div className="border border-dashed border-slate-300 bg-slate-50 rounded-xl p-4 text-center text-slate-400 text-xs font-medium">
                  Belum ada foto diunggah. Klik <span className="font-bold text-indigo-600">"Upload Foto"</span> untuk melampirkan dokumentasi barang atau fisik kerusakan/kebutuhan.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-1">
                  {photos.map((imgSrc, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-square shadow-xs">
                      <img src={imgSrc} alt={`Lampiran ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute top-1.5 right-1.5 bg-rose-600/90 hover:bg-rose-700 text-white p-1 rounded-lg transition shadow-md cursor-pointer"
                        title="Hapus Foto"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Control Buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleResetForm}
              className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer w-full sm:w-auto justify-center"
            >
              <RefreshCw className="h-4 w-4 text-slate-500" /> Reset Form
            </button>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleOpenPrintPreview()}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
              >
                <Printer className="h-4 w-4 text-indigo-300" /> Pratinjau & Cetak A4
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
              >
                <Save className="h-4 w-4" /> Simpan Dokumen DPB
              </button>
            </div>
          </div>

        </form>
      )}

      {/* TAB 2: ARSIP DOKUMEN DPB */}
      {activeTab === 'archive' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 border border-slate-200 rounded-2xl">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari No Reg / Pemohon / Barang..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="text-xs text-slate-500 font-bold">
              Total Dokumen: {filteredArchive.length}
            </div>
          </div>

          {filteredArchive.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 space-y-3">
              <FileText className="h-12 w-12 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-600">Belum Ada Dokumen DPB Tersimpan</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Silakan isi formulir DPB lalu klik "Simpan Dokumen DPB" untuk membuat arsip baru.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredArchive.map((doc) => (
                <div key={doc.id} className="bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-5 shadow-xs transition space-y-4">
                  <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                        {doc.noReg}
                      </span>
                      <h4 className="text-sm font-black text-slate-800 mt-1.5">{doc.dimintaOleh}</h4>
                      <p className="text-xs text-slate-500 font-medium">{doc.departemen} • {formatTanggalIndonesia(doc.tanggal)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenPrintPreview(doc)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition"
                        title="Cetak A4 / PDF"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEditFromArchive(doc)}
                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition"
                        title="Edit Dokumen"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteFromArchive(doc.id)}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition"
                        title="Hapus Dokumen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Item preview list */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Item Permintaan ({doc.items.length}):</p>
                    <ul className="text-xs space-y-1">
                      {doc.items.slice(0, 3).map((it, idx) => (
                        <li key={idx} className="flex justify-between text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg">
                          <span className="font-semibold truncate max-w-[200px]">{idx + 1}. {it.description}</span>
                          <span className="font-mono text-slate-500 font-bold">{it.qty} {it.uom} ({it.priority})</span>
                        </li>
                      ))}
                      {doc.items.length > 3 && (
                        <p className="text-[10px] text-slate-400 italic pl-1">+ {doc.items.length - 3} item barang lainnya...</p>
                      )}
                    </ul>
                  </div>

                  {/* Signature tags */}
                  <div className="text-[10px] text-slate-500 border-t border-slate-100 pt-2.5 flex justify-between items-center">
                    <span>Admin: <strong className="text-slate-800">{doc.namaAdmin || '-'}</strong></span>
                    <span>Approval: <strong className="text-slate-800">{doc.namaPjo || doc.namaGlSupervisor || '-'}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PRINT PREVIEW MODAL & PRINT PORTAL */}
      {isPrintingModalOpen && selectedDocToPrint && (
        <>
          {/* Global Print Styles for Portal */}
          <style>{`
            @media print {
              @page {
                size: A4 portrait;
                margin: 10mm;
              }
              body > *:not(#dpb-print-mount) {
                display: none !important;
              }
              #dpb-print-mount {
                display: block !important;
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                background: #ffffff !important;
                color: #000000 !important;
              }
            }
            @media screen {
              #dpb-print-mount {
                display: none !important;
              }
            }
          `}</style>

          {/* Screen Modal Preview */}
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full shadow-2xl overflow-hidden my-auto">
              
              {/* Top Bar Controls */}
              <div className="bg-slate-900 text-white px-5 py-3.5 flex justify-between items-center border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-400" />
                  <span className="font-bold text-sm">
                    Pratinjau Cetak DPB A4 ({selectedDocToPrint.noReg})
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
                    onClick={() => setIsPrintingModalOpen(false)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
                    title="Tutup"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Printable Form Content (Screen Preview) */}
              <div className="p-8 space-y-5 text-black bg-white font-sans max-h-[80vh] overflow-y-auto">
                
                {/* Header Logos & Title */}
                <div className="border-2 border-black p-2 flex justify-between items-center gap-2">
                  {/* Left Logo: PT INDOTRUCK UTAMA */}
                  <div className="w-44 flex items-center justify-start">
                    <img src={companyLogo} alt="PT INDOTRUCK UTAMA" className="h-10 object-contain" referrerPolicy="no-referrer" />
                  </div>

                  {/* Title */}
                  <div className="text-center flex-1 px-2">
                    <h1 className="text-sm sm:text-base font-black text-black tracking-wide uppercase leading-tight">
                      DAFTAR PERMINTAAN BARANG (DPB)
                    </h1>
                    <p className="text-xs font-bold text-black uppercase tracking-normal mt-0.5">
                      ITU SIS Admo Tutupan Tabalong
                    </p>
                  </div>

                  {/* Right Logo: HSE PT ITU */}
                  <div className="w-44 flex justify-end items-center">
                    <img src={hseLogo} alt="HEALTH ENVIRONMENT & SAFETY PT ITU" className="h-10 object-contain" referrerPolicy="no-referrer" />
                  </div>
                </div>

                {/* Form Meta Header Information */}
                <div className="text-xs space-y-1 font-semibold text-black py-1">
                  <div className="grid grid-cols-[110px_auto] items-center">
                    <span>Diminta Oleh</span>
                    <span>: {selectedDocToPrint.dimintaOleh || '-'}</span>
                  </div>
                  <div className="grid grid-cols-[110px_auto] items-center">
                    <span>Departemen</span>
                    <span>: {selectedDocToPrint.departemen || '-'}</span>
                  </div>
                  <div className="grid grid-cols-[110px_auto] items-center">
                    <span>Tanggal</span>
                    <span>: {formatTanggalIndonesia(selectedDocToPrint.tanggal)}</span>
                  </div>
                  <div className="grid grid-cols-[110px_auto] items-center">
                    <span>No Reg</span>
                    <span className="font-mono font-bold">: {selectedDocToPrint.noReg || '-'}</span>
                  </div>
                </div>

                {/* Main Items Table */}
                <table className="w-full text-xs text-left border-collapse border border-black">
                  <thead>
                    <tr className="bg-[#00AEEF] text-black font-extrabold uppercase border-b border-black print:bg-[#00AEEF]" style={{ backgroundColor: '#00AEEF', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                      <th className="py-2 px-3 border-r border-black text-center w-12">No</th>
                      <th className="py-2 px-3 border-r border-black">Description</th>
                      <th className="py-2 px-3 border-r border-black text-center w-20">Qty</th>
                      <th className="py-2 px-3 border-r border-black text-center w-24">UoM</th>
                      <th className="py-2 px-3 border-black text-center w-28">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDocToPrint.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-black">
                        <td className="py-1.5 px-3 border-r border-black text-center font-bold">{idx + 1}</td>
                        <td className="py-1.5 px-3 border-r border-black font-semibold">{item.description}</td>
                        <td className="py-1.5 px-3 border-r border-black text-center font-bold">{item.qty}</td>
                        <td className="py-1.5 px-3 border-r border-black text-center">{item.uom}</td>
                        <td className="py-1.5 px-3 text-center font-bold">{item.priority}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Approval Signatures Grid */}
                <div className="pt-2 text-xs text-black">
                  {(() => {
                    const printMode = selectedDocToPrint.approverMode || (
                      (selectedDocToPrint.namaDeputyPjo && selectedDocToPrint.namaPjo && selectedDocToPrint.namaDeputyPjo !== '-' && selectedDocToPrint.namaPjo !== '-' && selectedDocToPrint.namaDeputyPjo !== '' && selectedDocToPrint.namaPjo !== '')
                        ? 'both'
                        : (selectedDocToPrint.namaDeputyPjo && selectedDocToPrint.namaDeputyPjo !== '-' && selectedDocToPrint.namaDeputyPjo !== '' ? 'deputy' : 'pjo')
                    );

                    if (printMode === 'both') {
                      return (
                        <div className="grid grid-cols-4 text-center border-collapse">
                          <div className="space-y-1">
                            <p className="font-medium">Dibuat Oleh,</p>
                            <div className="h-16 flex items-end justify-center pb-1">
                              <span className="font-bold underline uppercase">{selectedDocToPrint.namaAdmin || ''}</span>
                            </div>
                            <p className="font-bold">{selectedDocToPrint.jabatanAdmin || 'Admin'}</p>
                          </div>

                          <div className="space-y-1">
                            <p className="font-medium">Request,</p>
                            <div className="h-16 flex items-end justify-center pb-1">
                              <span className="font-bold underline uppercase">{selectedDocToPrint.namaGlSupervisor || ''}</span>
                            </div>
                            <p className="font-bold">{selectedDocToPrint.jabatanGlSupervisor || 'GL / Supervisor'}</p>
                          </div>

                          <div className="col-span-2 space-y-1">
                            <p className="font-medium">Menyetujui,</p>
                            <div className="grid grid-cols-2">
                              <div className="space-y-1">
                                <div className="h-16 flex items-end justify-center pb-1">
                                  <span className="font-bold underline uppercase">{selectedDocToPrint.namaDeputyPjo || ''}</span>
                                </div>
                                <p className="font-bold">{selectedDocToPrint.jabatanDeputyPjo || 'Deputy PJO'}</p>
                              </div>
                              <div className="space-y-1">
                                <div className="h-16 flex items-end justify-center pb-1">
                                  <span className="font-bold underline uppercase">{selectedDocToPrint.namaPjo || ''}</span>
                                </div>
                                <p className="font-bold">{selectedDocToPrint.jabatanPjo || 'PJO'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-3 text-center border-collapse">
                        <div className="space-y-1">
                          <p className="font-medium">Dibuat Oleh,</p>
                          <div className="h-16 flex items-end justify-center pb-1">
                            <span className="font-bold underline uppercase">{selectedDocToPrint.namaAdmin || ''}</span>
                          </div>
                          <p className="font-bold">{selectedDocToPrint.jabatanAdmin || 'Admin'}</p>
                        </div>

                        <div className="space-y-1">
                          <p className="font-medium">Request,</p>
                          <div className="h-16 flex items-end justify-center pb-1">
                            <span className="font-bold underline uppercase">{selectedDocToPrint.namaGlSupervisor || ''}</span>
                          </div>
                          <p className="font-bold">{selectedDocToPrint.jabatanGlSupervisor || 'GL / Supervisor'}</p>
                        </div>

                        <div className="space-y-1">
                          <p className="font-medium">Menyetujui,</p>
                          <div className="h-16 flex items-end justify-center pb-1">
                            <span className="font-bold underline uppercase">
                              {printMode === 'deputy' ? (selectedDocToPrint.namaDeputyPjo || '') : (selectedDocToPrint.namaPjo || '')}
                            </span>
                          </div>
                          <p className="font-bold">
                            {printMode === 'deputy' ? (selectedDocToPrint.jabatanDeputyPjo || 'Deputy PJO') : (selectedDocToPrint.jabatanPjo || 'PJO')}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Note Box & Photos */}
                <div className="pt-2">
                  <p className="text-xs font-bold mb-1">Note :</p>
                  <div className="border-2 border-black min-h-[120px] p-3 text-xs font-medium rounded-sm space-y-3">
                    <p className="whitespace-pre-wrap">{selectedDocToPrint.note || ''}</p>

                    {selectedDocToPrint.photos && selectedDocToPrint.photos.length > 0 && (
                      <div className="border-t border-black/30 pt-2 space-y-1.5">
                        <p className="text-[11px] font-bold uppercase text-slate-800">Lampiran Foto :</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedDocToPrint.photos.map((photo, pIdx) => (
                            <div key={pIdx} className="border border-black p-1 bg-white rounded-xs">
                              <img src={photo} alt={`Lampiran ${pIdx + 1}`} className="h-28 max-w-[180px] object-contain" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Portal rendered directly under <body> for actual Printing */}
          {createPortal(
            <div id="dpb-print-mount" className="p-8 space-y-5 text-black bg-white font-sans">
              
              {/* Header Logos & Title */}
              <div className="border-2 border-black p-2 flex justify-between items-center gap-2">
                {/* Left Logo: PT INDOTRUCK UTAMA */}
                <div className="w-44 flex items-center justify-start">
                  <img src={companyLogo} alt="PT INDOTRUCK UTAMA" className="h-10 object-contain" referrerPolicy="no-referrer" />
                </div>

                {/* Title */}
                <div className="text-center flex-1 px-2">
                  <h1 className="text-sm sm:text-base font-black text-black tracking-wide uppercase leading-tight">
                    DAFTAR PERMINTAAN BARANG (DPB)
                  </h1>
                  <p className="text-xs font-bold text-black uppercase tracking-normal mt-0.5">
                    ITU SIS Admo Tutupan Tabalong
                  </p>
                </div>

                {/* Right Logo: HSE PT ITU */}
                <div className="w-44 flex justify-end items-center">
                  <img src={hseLogo} alt="HEALTH ENVIRONMENT & SAFETY PT ITU" className="h-10 object-contain" referrerPolicy="no-referrer" />
                </div>
              </div>

              {/* Form Meta Header Information */}
              <div className="text-xs space-y-1 font-semibold text-black py-1">
                <div className="grid grid-cols-[110px_auto] items-center">
                  <span>Diminta Oleh</span>
                  <span>: {selectedDocToPrint.dimintaOleh || '-'}</span>
                </div>
                <div className="grid grid-cols-[110px_auto] items-center">
                  <span>Departemen</span>
                  <span>: {selectedDocToPrint.departemen || '-'}</span>
                </div>
                <div className="grid grid-cols-[110px_auto] items-center">
                  <span>Tanggal</span>
                  <span>: {formatTanggalIndonesia(selectedDocToPrint.tanggal)}</span>
                </div>
                <div className="grid grid-cols-[110px_auto] items-center">
                  <span>No Reg</span>
                  <span className="font-mono font-bold">: {selectedDocToPrint.noReg || '-'}</span>
                </div>
              </div>

              {/* Main Items Table */}
              <table className="w-full text-xs text-left border-collapse border border-black">
                <thead>
                  <tr className="bg-[#00AEEF] text-black font-extrabold uppercase border-b border-black print:bg-[#00AEEF]" style={{ backgroundColor: '#00AEEF', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <th className="py-2 px-3 border-r border-black text-center w-12">No</th>
                    <th className="py-2 px-3 border-r border-black">Description</th>
                    <th className="py-2 px-3 border-r border-black text-center w-20">Qty</th>
                    <th className="py-2 px-3 border-r border-black text-center w-24">UoM</th>
                    <th className="py-2 px-3 border-black text-center w-28">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDocToPrint.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-black">
                      <td className="py-1.5 px-3 border-r border-black text-center font-bold">{idx + 1}</td>
                      <td className="py-1.5 px-3 border-r border-black font-semibold">{item.description}</td>
                      <td className="py-1.5 px-3 border-r border-black text-center font-bold">{item.qty}</td>
                      <td className="py-1.5 px-3 border-r border-black text-center">{item.uom}</td>
                      <td className="py-1.5 px-3 text-center font-bold">{item.priority}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Approval Signatures Grid */}
              <div className="pt-2 text-xs text-black">
                {(() => {
                  const printMode = selectedDocToPrint.approverMode || (
                    (selectedDocToPrint.namaDeputyPjo && selectedDocToPrint.namaPjo && selectedDocToPrint.namaDeputyPjo !== '-' && selectedDocToPrint.namaPjo !== '-' && selectedDocToPrint.namaDeputyPjo !== '' && selectedDocToPrint.namaPjo !== '')
                      ? 'both'
                      : (selectedDocToPrint.namaDeputyPjo && selectedDocToPrint.namaDeputyPjo !== '-' && selectedDocToPrint.namaDeputyPjo !== '' ? 'deputy' : 'pjo')
                  );

                  if (printMode === 'both') {
                    return (
                      <div className="grid grid-cols-4 text-center border-collapse">
                        <div className="space-y-1">
                          <p className="font-medium">Dibuat Oleh,</p>
                          <div className="h-16 flex items-end justify-center pb-1">
                            <span className="font-bold underline uppercase">{selectedDocToPrint.namaAdmin || ''}</span>
                          </div>
                          <p className="font-bold">{selectedDocToPrint.jabatanAdmin || 'Admin'}</p>
                        </div>

                        <div className="space-y-1">
                          <p className="font-medium">Request,</p>
                          <div className="h-16 flex items-end justify-center pb-1">
                            <span className="font-bold underline uppercase">{selectedDocToPrint.namaGlSupervisor || ''}</span>
                          </div>
                          <p className="font-bold">{selectedDocToPrint.jabatanGlSupervisor || 'GL / Supervisor'}</p>
                        </div>

                        <div className="col-span-2 space-y-1">
                          <p className="font-medium">Menyetujui,</p>
                          <div className="grid grid-cols-2">
                            <div className="space-y-1">
                              <div className="h-16 flex items-end justify-center pb-1">
                                <span className="font-bold underline uppercase">{selectedDocToPrint.namaDeputyPjo || ''}</span>
                              </div>
                              <p className="font-bold">{selectedDocToPrint.jabatanDeputyPjo || 'Deputy PJO'}</p>
                            </div>
                            <div className="space-y-1">
                              <div className="h-16 flex items-end justify-center pb-1">
                                <span className="font-bold underline uppercase">{selectedDocToPrint.namaPjo || ''}</span>
                              </div>
                              <p className="font-bold">{selectedDocToPrint.jabatanPjo || 'PJO'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-3 text-center border-collapse">
                      <div className="space-y-1">
                        <p className="font-medium">Dibuat Oleh,</p>
                        <div className="h-16 flex items-end justify-center pb-1">
                          <span className="font-bold underline uppercase">{selectedDocToPrint.namaAdmin || ''}</span>
                        </div>
                        <p className="font-bold">{selectedDocToPrint.jabatanAdmin || 'Admin'}</p>
                      </div>

                      <div className="space-y-1">
                        <p className="font-medium">Request,</p>
                        <div className="h-16 flex items-end justify-center pb-1">
                          <span className="font-bold underline uppercase">{selectedDocToPrint.namaGlSupervisor || ''}</span>
                        </div>
                        <p className="font-bold">{selectedDocToPrint.jabatanGlSupervisor || 'GL / Supervisor'}</p>
                      </div>

                      <div className="space-y-1">
                        <p className="font-medium">Menyetujui,</p>
                        <div className="h-16 flex items-end justify-center pb-1">
                          <span className="font-bold underline uppercase">
                            {printMode === 'deputy' ? (selectedDocToPrint.namaDeputyPjo || '') : (selectedDocToPrint.namaPjo || '')}
                          </span>
                        </div>
                        <p className="font-bold">
                          {printMode === 'deputy' ? (selectedDocToPrint.jabatanDeputyPjo || 'Deputy PJO') : (selectedDocToPrint.jabatanPjo || 'PJO')}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Note Box & Photos */}
              <div className="pt-2">
                <p className="text-xs font-bold mb-1">Note :</p>
                <div className="border-2 border-black min-h-[140px] p-3 text-xs font-medium rounded-sm space-y-3">
                  <p className="whitespace-pre-wrap">{selectedDocToPrint.note || ''}</p>

                  {selectedDocToPrint.photos && selectedDocToPrint.photos.length > 0 && (
                    <div className="border-t border-black/30 pt-2 space-y-1.5">
                      <p className="text-[11px] font-bold uppercase text-black">Lampiran Foto :</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedDocToPrint.photos.map((photo, pIdx) => (
                          <div key={pIdx} className="border border-black p-1 bg-white rounded-xs">
                            <img src={photo} alt={`Lampiran ${pIdx + 1}`} className="h-28 max-w-[180px] object-contain" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>,
            document.body
          )}
        </>
      )}

    </div>
  );
}
