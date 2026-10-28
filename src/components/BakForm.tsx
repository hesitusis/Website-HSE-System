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
  Image as ImageIcon,
  Check,
  Crop,
  RotateCw,
  Move,
  Undo,
  ZoomIn,
  Download,
  ZoomOut
} from 'lucide-react';
import { formatTanggalIndonesia, kompresDanProsesFile } from '../utils.js';
import { PageHeader } from './common/index.js';

const companyLogo = 'https://images.seeklogo.com/logo-png/36/1/pt-indotruck-utama-logo-png_seeklogo-363267.png';
const hseLogo = 'https://lh3.googleusercontent.com/d/156hm6i1ksZjjLvYvivwgVPfcuo-CP1fy';

interface BakItemRow {
  id: string;
  description: string;
  qty: number;
  uom: string;
  lamaPemakaian: string;
  keterangan: string;
}

interface BakDocument {
  id: string; // timestamp
  docNumber: string;
  dept: string;
  applicant: string;
  branchSite: string;
  noReg: string;
  costCenter: string;
  tanggalKerusakan: string;
  items: BakItemRow[];
  gambar1: string; // base64
  gambar2: string; // base64
  gambar3: string; // base64
  keteranganLain: string;
  tanggalTtd: string;
  namaPembuat: string;
  rolePembuat: string;
  namaRequest: string;
  roleRequest: string;
  namaDiketahui: string;
  createdAt: string;
  createdBy?: string;
  ttdPembuat?: string;
  ttdRequest?: string;
  ttdDiketahui?: string;
}

interface BakFormProps {
  userRealName: string;
  userRole: 'admin' | 'operator';
  userTtdUrl?: string;
  username?: string;
  onBack: () => void;
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
          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-500 text-slate-800"
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

export default function BakForm({ 
  userRealName, 
  userRole, 
  userTtdUrl = '', 
  username = '', 
  onBack 
}: BakFormProps) {
  // Archive & active tab states
  const [savedDocs, setSavedDocs] = useState<BakDocument[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'form' | 'archive'>('form');
  const [searchTerm, setSearchTerm] = useState('');
  const [archiveStartDate, setArchiveStartDate] = useState('');
  const [archiveEndDate, setArchiveEndDate] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Printing Modal states
  const [isPrintingModalOpen, setIsPrintingModalOpen] = useState(false);
  const [selectedDocToPrint, setSelectedDocToPrint] = useState<BakDocument | null>(null);

  // Signatures State
  const [ttdPembuat, setTtdPembuat] = useState('');
  const [ttdRequest, setTtdRequest] = useState('');
  const [ttdDiketahui, setTtdDiketahui] = useState('');

  // Form states
  const [docId, setDocId] = useState<string | null>(null);
  const [docNumber, setDocNumber] = useState('17/SVC/ITU/VI/2026');
  const [dept, setDept] = useState('Service');
  const [applicant, setApplicant] = useState('Additional Asset');
  const [branchSite, setBranchSite] = useState('ITU - FMC SIS ADARO');
  const [noReg, setNoReg] = useState('15');
  const [costCenter, setCostCenter] = useState('-');
  const [tanggalKerusakan, setTanggalKerusakan] = useState(() => new Date().toISOString().split('T')[0]);

  const [items, setItems] = useState<BakItemRow[]>([
    {
      id: '1',
      description: '',
      qty: 1,
      uom: 'Pcs',
      lamaPemakaian: '1 Tahun 4 Bulan',
      keterangan: '-'
    }
  ]);

  // Images state
  const [gambar1, setGambar1] = useState('');
  const [gambar2, setGambar2] = useState('');
  const [gambar3, setGambar3] = useState('');
  const [isUploading1, setIsUploading1] = useState(false);
  const [isUploading2, setIsUploading2] = useState(false);
  const [isUploading3, setIsUploading3] = useState(false);

  // HTML5 Image processing & zooming & cropping states
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSlot, setEditorSlot] = useState<1 | 2 | 3 | null>(null);
  const [editorSrc, setEditorSrc] = useState('');
  const [zoom, setZoom] = useState(1.0);
  const [rotate, setRotate] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const editorCanvasRef = React.useRef<HTMLCanvasElement | null>(null);

  // Pensil Merah & Drawing states
  const [editorMode, setEditorMode] = useState<'pan' | 'draw_red'>('pan');
  const [strokes, setStrokes] = useState<{ x: number; y: number }[][]>([]);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([]);

  // Additional detail
  const [keteranganLain, setKeteranganLain] = useState('Kondisi perlengkapan mengalami aus berat akibat pemakaian operasional reguler.');
  const [tanggalTtd, setTanggalTtd] = useState(() => new Date().toISOString().split('T')[0]);
  const [namaPembuat, setNamaPembuat] = useState('Subhannor');
  const [rolePembuat, setRolePembuat] = useState('Admin');
  const [namaRequest, setNamaRequest] = useState('Yuda Pratama Rianto');
  const [roleRequest, setRoleRequest] = useState('SPV/Foreman');
  const [namaDiketahui, setNamaDiketahui] = useState('HSE Dept.');

  // Employee list autocomplete
  const [karyawanList, setKaryawanList] = useState<{ nama: string; nik: string; dept: string }[]>([]);
  const [namesOptionsList, setNamesOptionsList] = useState<string[]>([]);

  // Master APD options from sheet or default
  const [masterApdList, setMasterApdList] = useState<string[]>([
    "Kacamata",
    "Helm Safety Biru",
    "Helm Safety Kuning",
    "Helm Safety Hijau",
    "Helm Safety Putih",
    "Tali Helm",
    "Earplug",
    "Safety Shoes No. 5 / Uk. 38",
    "Safety Shoes No. 6 / Uk. 40",
    "Safety Shoes No. 7 / Uk. 41",
    "Safety Shoes No. 8 / Uk. 42",
    "Safety Shoes No. 9 / Uk. 43",
    "Safety Shoes No. 10 / Uk. 45",
    "Safety Shoes No. 11 / Uk. 46"
  ]);

  // Load saved archive, system users, and employee DB
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/users');
        const data = await res.json();
        if (data.success && Array.isArray(data.list)) {
          setAllUsers(data.list);
        }
      } catch (e) {
        console.warn("Gagal memuat list user", e);
      }
    };
    fetchUsers();

    const fetchSharedDocs = async () => {
      try {
        const res = await fetch('/api/bak/list');
        const data = await res.json();
        if (data.success && Array.isArray(data.list)) {
          let mergedList = [...data.list];
          const stored = localStorage.getItem('bak_archives');
          if (stored) {
            try {
              const localList = JSON.parse(stored);
              if (Array.isArray(localList)) {
                localList.forEach((localDoc: any) => {
                  if (localDoc && localDoc.id && !mergedList.some((d: any) => String(d.id) === String(localDoc.id))) {
                    mergedList.push(localDoc);
                  }
                });
              }
            } catch (e) {
              console.warn("Gagal parsing local storage bak_archives", e);
            }
          }
          setSavedDocs(mergedList);
          localStorage.setItem('bak_archives', JSON.stringify(mergedList));
          
          // Check for deep-link highlighting
          const targetId = sessionStorage.getItem('highlightDocId');
          const targetType = sessionStorage.getItem('highlightDocType');
          if (targetId && targetType === 'BAK') {
            const found = mergedList.find((d: any) => String(d.id) === String(targetId));
            if (found) {
              setSelectedDocToPrint(found);
              setIsPrintingModalOpen(true);
              sessionStorage.removeItem('highlightDocId');
              sessionStorage.removeItem('highlightDocType');
            }
          }
        } else {
          const stored = localStorage.getItem('bak_archives');
          if (stored) {
            setSavedDocs(JSON.parse(stored));
          }
        }
      } catch (err) {
        const stored = localStorage.getItem('bak_archives');
        if (stored) {
          setSavedDocs(JSON.parse(stored));
        }
      }
    };
    fetchSharedDocs();

    const fetchKaryawan = async () => {
      try {
        const res = await fetch('/api/karyawan');
        const data = await res.json();
        if (data.success && Array.isArray(data.karyawanDetail)) {
          setKaryawanList(data.karyawanDetail);
          const names = data.karyawanDetail.map((k: any) => k.nama).filter(Boolean);
          setNamesOptionsList(Array.from(new Set(names)));
        }
      } catch (e) {
        console.warn("Gagal memuat data karyawan");
      }
    };
    fetchKaryawan();

    const fetchMasterApd = async () => {
      try {
        const res = await fetch('/api/master-apd');
        const data = await res.json();
        if (data.success && Array.isArray(data.list) && data.list.length > 0) {
          setMasterApdList(data.list);
        }
      } catch (err) {
        console.warn("Daftar master APD gagal dimuat, menggunakan default.");
      }
    };
    fetchMasterApd();
  }, []);

  // Update names options when allUsers change
  useEffect(() => {
    if (allUsers.length > 0) {
      const userNames = allUsers.map(u => u.nama).filter(Boolean);
      const combined = Array.from(new Set([...namesOptionsList, ...userNames]));
      setNamesOptionsList(combined);
    }
  }, [allUsers]);

  // Auto-generate No. Reg and No. Surat (docNumber) based on tanggalKerusakan and saved archives
  useEffect(() => {
    if (activeTab === 'form' && !docId) {
      const date = new Date(tanggalKerusakan);
      const monthsRoman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
      const monthRoman = monthsRoman[isNaN(date.getTime()) ? new Date().getMonth() : date.getMonth()];
      const year = isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear();

      const counter = savedDocs.length + 1;
      setDocNumber(`${counter}/SVC/ITU/${monthRoman}/${year}`);
      setNoReg(String(10 + counter));
    }
  }, [tanggalKerusakan, savedDocs.length, activeTab, docId]);

  // Format Helper
  const getTanggalIndo = (dateStr: string) => {
    if (!dateStr) return '';
    return formatTanggalIndonesia(dateStr);
  };

  // Row operations
  const handleAddItemRow = () => {
    const newId = String(items.length + 1);
    setItems([
      ...items,
      {
        id: newId,
        description: '',
        qty: 1,
        uom: 'Pcs',
        lamaPemakaian: '1 Tahun 4 Bulan',
        keterangan: '-'
      }
    ]);
  };

  const handleRemoveItemRow = (id: string) => {
    if (items.length === 1) return;
    const filtered = items.filter(it => it.id !== id).map((it, idx) => ({
      ...it,
      id: String(idx + 1)
    }));
    setItems(filtered);
  };

  const handleUpdateItem = (id: string, field: keyof BakItemRow, val: any) => {
    const updated = items.map(it => {
      if (it.id === id) {
        return { ...it, [field]: val };
      }
      return it;
    });
    setItems(updated);
  };

  // Image upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, slot: 1 | 2 | 3) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (slot === 1) setIsUploading1(true);
    if (slot === 2) setIsUploading2(true);
    if (slot === 3) setIsUploading3(true);

    try {
      const result = await kompresDanProsesFile(files[0]);
      if (result) {
        if (slot === 1) setGambar1(result.data);
        if (slot === 2) setGambar2(result.data);
        if (slot === 3) setGambar3(result.data);
      }
    } catch (err) {
      console.error("Gagal mengompres gambar:", err);
    } finally {
      if (slot === 1) setIsUploading1(false);
      if (slot === 2) setIsUploading2(false);
      if (slot === 3) setIsUploading3(false);
    }
  };

  const handleOpenEditor = (slot: 1 | 2 | 3, imgSrc: string) => {
    setEditorSlot(slot);
    setEditorSrc(imgSrc);
    setZoom(1.0);
    setRotate(0);
    setOffsetX(0);
    setOffsetY(0);
    setIsDragging(false);
    setEditorMode('pan');
    setStrokes([]);
    setCurrentStroke([]);
    setEditorOpen(true);
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!editorCanvasRef.current) return { x: 0, y: 0 };
    const canvas = editorCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let clientX = 0;
    let clientY = 0;
    
    if ('touches' in e) {
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  useEffect(() => {
    if (!editorOpen || !editorSrc || !editorCanvasRef.current) return;
    const canvas = editorCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(canvas.width / 2 + offsetX, canvas.height / 2 + offsetY);
      ctx.rotate((rotate * Math.PI) / 180);

      const scaleX = canvas.width / img.width;
      const scaleY = canvas.height / img.height;
      const baseScale = Math.min(scaleX, scaleY);
      const currentScale = baseScale * zoom;

      const drawWidth = img.width * currentScale;
      const drawHeight = img.height * currentScale;

      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();

      // Guideline frame overlay
      ctx.strokeStyle = "rgba(99, 102, 241, 0.75)";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
      
      // Target crosshair/grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 3, 0);
      ctx.lineTo(canvas.width / 3, canvas.height);
      ctx.moveTo((canvas.width * 2) / 3, 0);
      ctx.lineTo((canvas.width * 2) / 3, canvas.height);
      ctx.moveTo(0, canvas.height / 3);
      ctx.lineTo(canvas.width, canvas.height / 3);
      ctx.moveTo(0, (canvas.height * 2) / 3);
      ctx.lineTo(canvas.width, (canvas.height * 2) / 3);
      ctx.stroke();
      
      ctx.setLineDash([]);

      // Draw all saved drawing strokes
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      
      strokes.forEach(stroke => {
        if (stroke.length === 0) return;
        ctx.beginPath();
        ctx.moveTo(stroke[0].x, stroke[0].y);
        for (let i = 1; i < stroke.length; i++) {
          ctx.lineTo(stroke[i].x, stroke[i].y);
        }
        ctx.stroke();
      });

      // Draw current active drawing stroke
      if (currentStroke.length > 0) {
        ctx.beginPath();
        ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
        for (let i = 1; i < currentStroke.length; i++) {
          ctx.lineTo(currentStroke[i].x, currentStroke[i].y);
        }
        ctx.stroke();
      }
    };
    img.src = editorSrc;
  }, [editorOpen, editorSrc, zoom, rotate, offsetX, offsetY, strokes, currentStroke]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    if (editorMode === 'pan') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - offsetX, y: e.clientY - offsetY });
    } else if (editorMode === 'draw_red') {
      setIsDragging(true);
      setCurrentStroke([coords]);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    if (editorMode === 'pan') {
      setOffsetX(e.clientX - dragStart.x);
      setOffsetY(e.clientY - dragStart.y);
    } else if (editorMode === 'draw_red') {
      const coords = getCanvasCoords(e);
      setCurrentStroke(prev => [...prev, coords]);
    }
  };

  const handleCanvasMouseUpOrLeave = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (editorMode === 'draw_red' && currentStroke.length > 0) {
      setStrokes(prev => [...prev, currentStroke]);
      setCurrentStroke([]);
    }
  };

  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    if (editorMode === 'pan') {
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({ x: touch.clientX - offsetX, y: touch.clientY - offsetY });
    } else if (editorMode === 'draw_red') {
      setIsDragging(true);
      setCurrentStroke([coords]);
    }
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
    if (editorMode === 'pan') {
      const touch = e.touches[0];
      setOffsetX(touch.clientX - dragStart.x);
      setOffsetY(touch.clientY - dragStart.y);
    } else if (editorMode === 'draw_red') {
      const coords = getCanvasCoords(e);
      if (e.cancelable) e.preventDefault();
      setCurrentStroke(prev => [...prev, coords]);
    }
  };

  const handleSaveCroppedImage = () => {
    if (!editorSlot) return;

    const img = new Image();
    img.onload = () => {
      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = 800;
      outputCanvas.height = 600;
      const ctx = outputCanvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

      ctx.save();
      const offsetScale = outputCanvas.width / 640;
      
      ctx.translate(outputCanvas.width / 2 + offsetX * offsetScale, outputCanvas.height / 2 + offsetY * offsetScale);
      ctx.rotate((rotate * Math.PI) / 180);

      const scaleX = outputCanvas.width / img.width;
      const scaleY = outputCanvas.height / img.height;
      const baseScale = Math.min(scaleX, scaleY);
      const currentScale = baseScale * zoom;

      const drawWidth = img.width * currentScale;
      const drawHeight = img.height * currentScale;

      ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.restore();

      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 5.0;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      strokes.forEach(stroke => {
        if (stroke.length === 0) return;
        ctx.beginPath();
        ctx.moveTo(stroke[0].x * 1.25, stroke[0].y * 1.25);
        for (let i = 1; i < stroke.length; i++) {
          ctx.lineTo(stroke[i].x * 1.25, stroke[i].y * 1.25);
        }
        ctx.stroke();
      });

      const finalDataUrl = outputCanvas.toDataURL('image/jpeg', 0.88);
      if (editorSlot === 1) setGambar1(finalDataUrl);
      else if (editorSlot === 2) setGambar2(finalDataUrl);
      else if (editorSlot === 3) setGambar3(finalDataUrl);

      setEditorOpen(false);
    };
    img.src = editorSrc;
  };

  const handleDeletePhoto = (slot: 1 | 2 | 3) => {
    if (slot === 1) {
      setGambar1(gambar2);
      setGambar2(gambar3);
      setGambar3('');
    } else if (slot === 2) {
      setGambar2(gambar3);
      setGambar3('');
    } else {
      setGambar3('');
    }
  };

  const getSignaturePreviewSrc = (url: string) => {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    return `/api/drive-proxy?url=${encodeURIComponent(url)}`;
  };

  const notifyFirstCreator = async (doc: BakDocument) => {
    const targetName = doc.namaPembuat;
    if (!targetName) return;

    const foundUser = allUsers.find(u => u.nama.toLowerCase().trim() === targetName.toLowerCase().trim());
    if (foundUser && foundUser.email) {
      try {
        const appUrl = window.location.origin;
        const approveUrl = `${appUrl}/?view=pengajuan_menu&tab=archive&docId=${doc.id}&docType=BAK`;
        await fetch('/api/send-approval-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toEmail: foundUser.email,
            approverName: foundUser.nama,
            docType: 'BAK',
            docNumber: doc.docNumber || doc.noReg || doc.id,
            createdBy: doc.createdBy || 'Karyawan',
            createdAt: doc.tanggalKerusakan || doc.createdAt || new Date().toISOString().split('T')[0],
            roleType: 'Pembuat Berita Acara (Pengaju Pertama)',
            approveUrl
          })
        });
      } catch (e) {
        console.error("Gagal mengirim notifikasi email ke pembuat pertama:", e);
      }
    }
  };

  const notifyNextApprover = async (doc: BakDocument, currentRole: 'pembuat' | 'request' | 'diketahui') => {
    let nextApproverName = "";
    let nextRole = "";

    if (currentRole === 'pembuat') {
      nextApproverName = doc.namaRequest;
      nextRole = "Requester / Pengaju Utama";
    } else if (currentRole === 'request') {
      nextApproverName = doc.namaDiketahui;
      nextRole = "Pihak HSE / Penanggungjawab (Diketahui)";
    }

    if (!nextApproverName) return;

    const foundUser = allUsers.find(u => u.nama.toLowerCase().trim() === nextApproverName.toLowerCase().trim());
    
    if (foundUser && foundUser.email) {
      try {
        const appUrl = window.location.origin;
        const approveUrl = `${appUrl}/?view=pengajuan_menu&tab=archive&docId=${doc.id}&docType=BAK`;
        
        await fetch('/api/send-approval-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toEmail: foundUser.email,
            approverName: foundUser.nama,
            docType: 'BAK',
            docNumber: doc.docNumber || doc.noReg || doc.id,
            createdBy: doc.createdBy || 'Karyawan',
            createdAt: doc.tanggalKerusakan || doc.createdAt || new Date().toISOString().split('T')[0],
            roleType: nextRole,
            approveUrl
          })
        });
      } catch (err) {
        console.error("Gagal mengirim email notifikasi otomatis ke approver berikutnya:", err);
      }
    }
  };

  const handleSignDocument = async (doc: BakDocument, roleType: 'pembuat' | 'request' | 'diketahui') => {
    if (!userTtdUrl) {
      alert("Anda belum memiliki tanda tangan disimpan. Silakan buat dahulu melalui tombol 'Tanda Tangan Saya' di bagian atas halaman.");
      return;
    }

    let targetName = "";
    if (roleType === 'pembuat') targetName = doc.namaPembuat;
    else if (roleType === 'request') targetName = doc.namaRequest;
    else if (roleType === 'diketahui') targetName = doc.namaDiketahui;

    if (!targetName) return;

    if (targetName.toLowerCase().trim() !== userRealName.toLowerCase().trim()) {
      alert(`Gagal Menyetujui! Hanya "${targetName}" yang berwenang memberikan persetujuan pada peran ini.\nAkun login Anda: "${userRealName}".`);
      return;
    }

    const updatedDoc = { ...doc };
    if (roleType === 'pembuat') {
      updatedDoc.ttdPembuat = userTtdUrl;
    } else if (roleType === 'request') {
      updatedDoc.ttdRequest = userTtdUrl;
    } else if (roleType === 'diketahui') {
      updatedDoc.ttdDiketahui = userTtdUrl;
    }

    try {
      await fetch('/api/bak/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedDoc)
      });
    } catch (err) {
      console.warn("Gagal menyimpan update tanda tangan ke server", err);
    }

    const updatedDocs = savedDocs.map(d => d.id === doc.id ? updatedDoc : d);
    setSavedDocs(updatedDocs);
    localStorage.setItem('bak_archives', JSON.stringify(updatedDocs));
    if (selectedDocToPrint?.id === doc.id) {
      setSelectedDocToPrint(updatedDoc);
    }
    alert("Persetujuan sukses! Tanda tangan digital Anda telah disematkan pada dokumen BAK.");

    await notifyNextApprover(updatedDoc, roleType);
  };

  const handleResetForm = () => {
    if (confirm("Apakah Anda yakin ingin mengosongkan/reset formulir BAK ini?")) {
      const counter = savedDocs.length + 1;
      const date = new Date();
      const monthsRoman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
      const monthRoman = monthsRoman[date.getMonth()];
      const year = date.getFullYear();

      setDocId(null);
      setDocNumber(`${counter}/SVC/ITU/${monthRoman}/${year}`);
      setNoReg(String(10 + counter));
      setDept('Service');
      setApplicant('Additional Asset');
      setBranchSite('ITU - FMC SIS ADARO');
      setCostCenter('-');
      setTanggalKerusakan(date.toISOString().split('T')[0]);
      setItems([
        {
          id: '1',
          description: '',
          qty: 1,
          uom: 'Pcs',
          lamaPemakaian: '1 Tahun 4 Bulan',
          keterangan: '-'
        }
      ]);
      setGambar1('');
      setGambar2('');
      setGambar3('');
      setKeteranganLain('Kondisi perlengkapan mengalami aus berat akibat pemakaian operasional reguler.');
      setTanggalTtd(date.toISOString().split('T')[0]);
      setNamaPembuat(userRealName || 'Subhannor');
      setRolePembuat('Admin');
      setNamaRequest('Yuda Pratama Rianto');
      setRoleRequest('SPV/Foreman');
      setNamaDiketahui('HSE Dept.');
      setTtdPembuat('');
      setTtdRequest('');
      setTtdDiketahui('');
    }
  };

  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = items.filter(it => it.description.trim() !== '');
    if (validItems.length === 0) {
      alert("Harap isi setidaknya 1 deskripsi barang/perlengkapan yang mengalami kerusakan.");
      return;
    }

    const newDocId = docId || String(Date.now());
    const doc: BakDocument = {
      id: newDocId,
      docNumber,
      dept: dept || '-',
      applicant: applicant || '-',
      branchSite: branchSite || '-',
      noReg: noReg || '-',
      costCenter: costCenter || '-',
      tanggalKerusakan,
      items: validItems,
      gambar1,
      gambar2,
      gambar3,
      keteranganLain: keteranganLain || '-',
      tanggalTtd,
      namaPembuat: namaPembuat || '-',
      rolePembuat: rolePembuat || 'Admin',
      namaRequest: namaRequest || '-',
      roleRequest: roleRequest || 'SPV/Foreman',
      namaDiketahui: namaDiketahui || 'HSE Dept.',
      createdAt: new Date().toISOString(),
      createdBy: userRealName,
      ttdPembuat: ttdPembuat || "",
      ttdRequest: ttdRequest || "",
      ttdDiketahui: ttdDiketahui || ""
    };

    // Save to server
    try {
      await fetch('/api/bak/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc)
      });
    } catch (err) {
      console.warn("Gagal menyimpan ke server, menyimpan di penyimpanan lokal", err);
    }

    const existingIdx = savedDocs.findIndex(d => d.id === newDocId);
    let updatedDocs: BakDocument[];
    if (existingIdx >= 0) {
      updatedDocs = [...savedDocs];
      updatedDocs[existingIdx] = doc;
    } else {
      updatedDocs = [doc, ...savedDocs];
    }

    setSavedDocs(updatedDocs);
    localStorage.setItem('bak_archives', JSON.stringify(updatedDocs));
    setDocId(newDocId);
    setSaveSuccessMsg("Dokumen Berita Acara Kerusakan (BAK) Berhasil Disimpan ke Server & Google Sheets!");
    setTimeout(() => setSaveSuccessMsg(null), 4000);

    if (doc.ttdPembuat) {
      await notifyNextApprover(doc, 'pembuat');
    } else {
      await notifyFirstCreator(doc);
    }
  };

  const handleEditFromArchive = (doc: BakDocument) => {
    setDocId(doc.id);
    setDocNumber(doc.docNumber || '');
    setDept(doc.dept || '');
    setApplicant(doc.applicant || '');
    setBranchSite(doc.branchSite || '');
    setNoReg(doc.noReg || '');
    setCostCenter(doc.costCenter || '-');
    setTanggalKerusakan(doc.tanggalKerusakan || new Date().toISOString().split('T')[0]);
    setItems(doc.items && doc.items.length > 0 ? doc.items : [
      { id: '1', description: '', qty: 1, uom: 'Pcs', lamaPemakaian: '', keterangan: '-' }
    ]);
    setGambar1(doc.gambar1 || '');
    setGambar2(doc.gambar2 || '');
    setGambar3(doc.gambar3 || '');
    setKeteranganLain(doc.keteranganLain || '');
    setTanggalTtd(doc.tanggalTtd || doc.tanggalKerusakan || new Date().toISOString().split('T')[0]);
    setNamaPembuat(doc.namaPembuat || '');
    setRolePembuat(doc.rolePembuat || 'Admin');
    setNamaRequest(doc.namaRequest || '');
    setRoleRequest(doc.roleRequest || 'SPV/Foreman');
    setNamaDiketahui(doc.namaDiketahui || 'HSE Dept.');
    setTtdPembuat(doc.ttdPembuat || '');
    setTtdRequest(doc.ttdRequest || '');
    setTtdDiketahui(doc.ttdDiketahui || '');
    setActiveTab('form');
  };

  const handleDeleteDoc = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Apakah Anda yakin ingin menghapus Berita Acara Kerusakan ini dari arsip?")) return;
    
    try {
      await fetch(`/api/bak/delete/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn("Gagal menghapus dokumen di server");
    }

    const filtered = savedDocs.filter(d => d.id !== id);
    setSavedDocs(filtered);
    localStorage.setItem('bak_archives', JSON.stringify(filtered));
  };

  const handleExportBakArchiveToExcel = (docsToExport: BakDocument[]) => {
    if (!docsToExport || docsToExport.length === 0) {
      alert("Tidak ada dokumen BAK tersimpan untuk diekspor.");
      return;
    }

    const headers = [
      "No",
      "No. BAK",
      "Dibuat Oleh",
      "Nama Pemohon",
      "Departemen",
      "No Reg / NIK",
      "Branch / Site",
      "Cost Centre",
      "Tanggal Kejadian",
      "Waktu Disimpan",
      "Daftar Barang Kerusakan",
      "Total Qty Barang",
      "Nama Pembuat",
      "Nama Menyetujui / Request",
      "Nama Diketahui",
      "Catatan / Keterangan Lain"
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvRows = [headers.map(escapeCsv).join(",")];

    docsToExport.forEach((doc, idx) => {
      const itemsSummary = (doc.items || [])
        .map((item, i) => {
          const parts = [`${i + 1}. ${item.description || 'Barang'} (${item.qty || 1} ${item.uom || 'Unit'})`];
          if (item.lamaPemakaian) parts.push(`Lama Pakai: ${item.lamaPemakaian}`);
          if (item.keterangan) parts.push(`Ket: ${item.keterangan}`);
          return parts.join(" - ");
        })
        .join(" ; ");

      const totalQty = (doc.items || []).reduce((sum, it) => sum + (Number(it.qty) || 1), 0);

      let formattedCreatedAt = "-";
      if (doc.createdAt) {
        try {
          formattedCreatedAt = new Date(doc.createdAt).toLocaleString("id-ID");
        } catch (e) {
          formattedCreatedAt = doc.createdAt;
        }
      }

      const row = [
        idx + 1,
        doc.docNumber || "-",
        doc.createdBy || "-",
        doc.applicant || "-",
        doc.dept || "-",
        doc.noReg || "-",
        doc.branchSite || "-",
        doc.costCenter || "-",
        doc.tanggalKerusakan || "-",
        formattedCreatedAt,
        itemsSummary || "-",
        totalQty,
        doc.namaPembuat || "-",
        doc.namaRequest || "-",
        doc.namaDiketahui || "-",
        doc.keteranganLain || "-"
      ];

      csvRows.push(row.map(escapeCsv).join(","));
    });

    const BOM = "\uFEFF";
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(BOM + csvRows.join("\r\n"));

    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    const dateStr = new Date().toISOString().split("T")[0];
    link.setAttribute("download", `Daftar_Arsip_BAK_Tersimpan_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenPrintPreview = (customDoc?: BakDocument) => {
    if (customDoc) {
      setSelectedDocToPrint(customDoc);
    } else {
      const validItems = items.filter(it => it.description.trim() !== '');
      const currentDoc: BakDocument = {
        id: docId || String(Date.now()),
        docNumber,
        dept,
        applicant,
        branchSite,
        noReg,
        costCenter,
        tanggalKerusakan,
        items: validItems.length > 0 ? validItems : items,
        gambar1,
        gambar2,
        gambar3,
        keteranganLain,
        tanggalTtd,
        namaPembuat,
        rolePembuat,
        namaRequest,
        roleRequest,
        namaDiketahui,
        createdAt: new Date().toISOString(),
        createdBy: userRealName,
        ttdPembuat,
        ttdRequest,
        ttdDiketahui
      };
      setSelectedDocToPrint(currentDoc);
    }
    setIsPrintingModalOpen(true);
  };

  const parseToIsoDate = (dateStr?: string, fallbackCreatedAt?: string): string => {
    if (dateStr) {
      const trimmed = String(dateStr).trim();
      const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (isoMatch) {
        return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
      }
      if (trimmed.includes('/')) {
        const parts = trimmed.split('/');
        if (parts.length === 3) {
          if (parts[2].length === 4) {
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          } else if (parts[0].length === 4) {
            return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
          }
        }
      }
      if (trimmed.includes('-')) {
        const parts = trimmed.split('-');
        if (parts.length === 3 && parts[2].length === 4) {
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
    }
    if (fallbackCreatedAt) {
      try {
        const d = new Date(fallbackCreatedAt);
        if (!isNaN(d.getTime())) {
          return d.toISOString().split('T')[0];
        }
      } catch (e) {}
    }
    return '';
  };

  const filteredArchive = savedDocs.filter(d => {
    const q = searchTerm.toLowerCase().trim();
    if (q) {
      const matchesSearch = 
        (d.docNumber || '').toLowerCase().includes(q) ||
        (d.noReg || '').toLowerCase().includes(q) ||
        (d.applicant || '').toLowerCase().includes(q) ||
        (d.dept || '').toLowerCase().includes(q) ||
        (d.items || []).some(it => (it.description || '').toLowerCase().includes(q));
      if (!matchesSearch) return false;
    }

    if (archiveStartDate || archiveEndDate) {
      const docIsoDate = parseToIsoDate(d.tanggalKerusakan, d.createdAt);
      if (docIsoDate) {
        if (archiveStartDate && docIsoDate < archiveStartDate) return false;
        if (archiveEndDate && docIsoDate > archiveEndDate) return false;
      }
    }

    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Header section */}
      <PageHeader
        title="BERITA ACARA KERUSAKAN (BAK)"
        subtitle="ITU SIS Admo Tutupan Tabalong — Formulir Resmi Pengajuan & Berita Acara Kerusakan"
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
              Formulir BAK
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
        <form onSubmit={handleSaveDoc} className="space-y-6">
          
          {/* Card 1: Header Information */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                <FileCheck2 className="h-4 w-4 text-indigo-600" /> Detail Registrasi & Informasi Pemohon
              </span>
              <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
                No. BAK: {docNumber}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              
              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Nomor Surat BAK <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="Contoh: 17/SVC/ITU/VI/2026"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-800 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">No. Registrasi / Unit No</label>
                <input
                  type="text"
                  value={noReg}
                  onChange={(e) => setNoReg(e.target.value)}
                  placeholder="Contoh: 15"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Applicant (Pemohon) <span className="text-rose-500">*</span></label>
                <NamePickerField
                  value={applicant}
                  onChange={setApplicant}
                  placeholder="Nama Pemohon Kerusakan"
                  namesList={namesOptionsList}
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Departemen <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={dept}
                  onChange={(e) => setDept(e.target.value)}
                  placeholder="Contoh: Service, HSE, Plant"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Cost Center</label>
                <input
                  type="text"
                  value={costCenter}
                  onChange={(e) => setCostCenter(e.target.value)}
                  placeholder="Contoh: -"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700">Branch Office / Site</label>
                  <span className="text-[10px] text-slate-400 font-semibold">3 Site Tersedia</span>
                </div>
                <div className="flex gap-1.5 mb-1.5 flex-wrap">
                  {[
                    { label: 'ITU-Admo', full: 'ITU - Site Admo (SIS Adaro)' },
                    { label: 'ITU-MMI', full: 'ITU - Site MMI' },
                    { label: 'ITU-Vale', full: 'ITU - Site Vale' }
                  ].map(s => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => setBranchSite(s.full)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                        branchSite.includes(s.label) || branchSite === s.full
                          ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={branchSite}
                  onChange={(e) => setBranchSite(e.target.value)}
                  placeholder="Contoh: ITU - FMC SIS ADARO"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="block font-bold text-slate-700">Tanggal Kejadian / Kerusakan <span className="text-rose-500">*</span></label>
                <input
                  type="date"
                  value={tanggalKerusakan}
                  onChange={(e) => setTanggalKerusakan(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

            </div>
          </div>

          {/* Card 2: Items Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-3 gap-2">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                  <ListOrdered className="h-4 w-4 text-indigo-600" /> Daftar Perlengkapan yang Mengalami Kerusakan
                </h3>
                <p className="text-[11px] text-slate-500">
                  Isikan nama item/deskripsi, jumlah (qty), satuan (UoM), lama pemakaian, serta keterangan sebab kerusakan.
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
                    <th className="py-2.5 px-3 border-r border-slate-300 min-w-[220px]">Description (Nama Perlengkapan)</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-center w-20">Qty</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 text-center w-24">Satuan</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 min-w-[140px]">Lama Pemakaian</th>
                    <th className="py-2.5 px-3 border-r border-slate-300 min-w-[180px]">Keterangan Kerusakan</th>
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
                          list="bak-masters-suggest"
                          value={item.description}
                          onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                          placeholder="Nama perlengkapan / barang..."
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200">
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => handleUpdateItem(item.id, 'qty', parseInt(e.target.value) || 1)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center text-slate-800 focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200">
                        <select
                          value={item.uom}
                          onChange={(e) => handleUpdateItem(item.id, 'uom', e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-center text-slate-800 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="Pcs">Pcs</option>
                          <option value="Pair">Pair</option>
                          <option value="Unit">Unit</option>
                          <option value="Set">Set</option>
                          <option value="Box">Box</option>
                        </select>
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200">
                        <input
                          type="text"
                          value={item.lamaPemakaian}
                          onChange={(e) => handleUpdateItem(item.id, 'lamaPemakaian', e.target.value)}
                          placeholder="cth: 1 Tahun 4 Bulan"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                        />
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200">
                        <input
                          type="text"
                          value={item.keterangan}
                          onChange={(e) => handleUpdateItem(item.id, 'keterangan', e.target.value)}
                          placeholder="Sebab / kondisi kerusakan..."
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                        />
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

            <datalist id="bak-masters-suggest">
              {masterApdList.map((option) => (
                <option key={option} value={option} />
              ))}
              <option value="Kunci Pas Set 8-24" />
              <option value="Bor Tangan Listrik Makita" />
              <option value="Palu Konde Tekiro" />
              <option value="Senter Kepala LED" />
              <option value="Hand Pallet Jack 3 Ton" />
            </datalist>
          </div>

          {/* Card 3: Photo Upload Section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <label className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-indigo-600" /> Foto Lampiran Bukti Kerusakan (Max 3 Foto)
                </label>
                <p className="text-[11px] text-slate-500 font-medium">
                  Sesuai ketentuan, foto kerusakan detail serta foto menyeluruh dianjurkan untuk dilampirkan pada dokumen cetak PDF.
                </p>
              </div>
              <div className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                {[gambar1, gambar2, gambar3].filter(Boolean).length} / 3 Foto
              </div>
            </div>

            {(() => {
              const activePhotos: { slot: 1 | 2 | 3; pic: string }[] = [];
              if (gambar1) activePhotos.push({ slot: 1, pic: gambar1 });
              if (gambar2) activePhotos.push({ slot: 2, pic: gambar2 });
              if (gambar3) activePhotos.push({ slot: 3, pic: gambar3 });

              const count = activePhotos.length;
              const nextSlot = (count < 3 ? (count + 1) as 1 | 2 | 3 : null);
              const nextUploading = nextSlot === 1 ? isUploading1 : nextSlot === 2 ? isUploading2 : isUploading3;

              const gridClass = count === 0 
                ? "grid grid-cols-1 gap-4" 
                : count === 1 
                ? "grid grid-cols-1 sm:grid-cols-2 gap-4" 
                : "grid grid-cols-1 sm:grid-cols-3 gap-4";

              return (
                <div className={gridClass}>
                  {activePhotos.map((item, index) => (
                    <div key={item.slot} className="space-y-1.5 flex flex-col">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold text-slate-600 uppercase">Foto Bukti #{index + 1}</p>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditor(item.slot, item.pic)}
                            className="text-[10px] font-extrabold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md cursor-pointer border border-indigo-200"
                            title="Edit / Potong, Rotate, dan Coret Penanda Kerusakan"
                          >
                            <Crop className="h-3 w-3" /> Edit / Potong
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePhoto(item.slot)}
                            className="text-[10px] font-bold text-rose-600 hover:text-rose-800 transition flex items-center gap-1 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-md cursor-pointer border border-rose-200"
                            title="Hapus Foto"
                          >
                            <X className="h-3 w-3" /> Hapus
                          </button>
                        </div>
                      </div>

                      <div className={`relative group rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-sm flex-1 ${count === 1 ? 'min-h-[220px] max-h-[320px]' : 'aspect-[4/3]'}`}>
                        <img
                          src={item.pic}
                          alt={`Foto Kerusakan ${index + 1}`}
                          className="w-full h-full object-contain bg-slate-950/40"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditor(item.slot, item.pic)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow"
                          >
                            <Crop className="h-3 w-3" /> Atur / Rotate / Coret
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Plus Button Slot for adding next photo if count < 3 */}
                  {nextSlot && (
                    <div className="space-y-1.5 flex flex-col justify-end">
                      <p className="text-[11px] font-bold text-slate-500 uppercase">
                        {count === 0 ? "Upload Foto Pertama" : `+ Tambah Foto #${count + 1}`}
                      </p>
                      <label className={`border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/20 hover:bg-indigo-50/70 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition shadow-xs flex-1 ${count === 1 ? 'min-h-[220px]' : count === 0 ? 'min-h-[160px]' : 'aspect-[4/3]'}`}>
                        {nextUploading ? (
                          <div className="flex flex-col items-center gap-2">
                            <RefreshCw className="h-6 w-6 text-indigo-600 animate-spin" />
                            <span className="text-xs text-indigo-600 font-bold">Mengompres Foto...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs group-hover:scale-110 transition-transform">
                              <Plus className="h-6 w-6 stroke-[2.5]" />
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-xs font-black text-indigo-700 block">
                                {count === 0 ? "Klik untuk Unggah Foto #1" : `+ Tambah Foto #${count + 1}`}
                              </span>
                              <span className="text-[10px] text-slate-400 block font-medium">Format JPG / PNG (Maks. 3 Foto)</span>
                            </div>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, nextSlot)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Card 4: Signatures / Penandatangan Form & Keterangan */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                <UserCheck className="h-4 w-4 text-indigo-600" /> Pengesahan & Otorisasi Penandatangan
              </h3>
              <div className="space-y-1">
                <input
                  type="date"
                  value={tanggalTtd}
                  onChange={(e) => setTanggalTtd(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              
              {/* Dibuat Oleh */}
              <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-slate-200">
                <p className="text-[11px] font-bold text-slate-500 uppercase">Dibuat Oleh (1)</p>
                <input
                  type="text"
                  value={rolePembuat}
                  onChange={(e) => setRolePembuat(e.target.value)}
                  placeholder="Jabatan (cth: Admin / Staff)"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-indigo-900 focus:outline-none focus:border-indigo-500"
                />
                <NamePickerField
                  value={namaPembuat}
                  onChange={setNamaPembuat}
                  placeholder="Nama Pembuat"
                  namesList={namesOptionsList}
                />
                {ttdPembuat && (
                  <div className="pt-1 flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Tanda Tangan Tersedia
                  </div>
                )}
              </div>

              {/* Direquest Oleh */}
              <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-slate-200">
                <p className="text-[11px] font-bold text-slate-500 uppercase">Direquest Oleh (2)</p>
                <input
                  type="text"
                  value={roleRequest}
                  onChange={(e) => setRoleRequest(e.target.value)}
                  placeholder="Jabatan (cth: SPV / Foreman)"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-indigo-900 focus:outline-none focus:border-indigo-500"
                />
                <NamePickerField
                  value={namaRequest}
                  onChange={setNamaRequest}
                  placeholder="Nama Requester"
                  namesList={namesOptionsList}
                />
                {ttdRequest && (
                  <div className="pt-1 flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Tanda Tangan Tersedia
                  </div>
                )}
              </div>

              {/* Diketahui Oleh */}
              <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-slate-200">
                <p className="text-[11px] font-bold text-slate-500 uppercase">Diketahui Oleh (3)</p>
                <input
                  type="text"
                  value="HSE Dept."
                  readOnly
                  className="w-full px-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-600"
                />
                <NamePickerField
                  value={namaDiketahui}
                  onChange={setNamaDiketahui}
                  placeholder="Nama Penanggungjawab / HSE"
                  namesList={namesOptionsList}
                />
                {ttdDiketahui && (
                  <div className="pt-1 flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Tanda Tangan Tersedia
                  </div>
                )}
              </div>

            </div>

            {/* Note / Keterangan Lain-Lain */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200">
              <label className="block text-xs font-black text-slate-800 uppercase tracking-widest">
                Keterangan Lain-Lain / Kronologi Kerusakan
              </label>
              <textarea
                rows={3}
                value={keteranganLain}
                onChange={(e) => setKeteranganLain(e.target.value)}
                placeholder="Penjelasan detail kondisi barang, kronologi kerusakan, lokasi kerja dll..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
              />
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
                <Save className="h-4 w-4" /> Simpan Dokumen BAK
              </button>
            </div>
          </div>

        </form>
      )}

      {/* TAB 2: ARSIP DOKUMEN BAK */}
      {activeTab === 'archive' && (
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 bg-white p-4 border border-slate-200 rounded-2xl">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari No BAK / Pemohon / Barang..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Date Range Controls */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 p-1.5 rounded-xl shrink-0">
              <div className="flex items-center gap-1.5 pl-1.5">
                <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                <span className="text-[11px] font-bold text-slate-500">Mulai:</span>
                <input
                  type="date"
                  value={archiveStartDate}
                  onChange={(e) => setArchiveStartDate(e.target.value)}
                  className="bg-white border border-slate-200 text-xs text-slate-700 font-semibold rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <span className="text-slate-400 text-xs font-bold">s/d</span>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500">Sampai:</span>
                <input
                  type="date"
                  value={archiveEndDate}
                  onChange={(e) => setArchiveEndDate(e.target.value)}
                  className="bg-white border border-slate-200 text-xs text-slate-700 font-semibold rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {(archiveStartDate || archiveEndDate || searchTerm) && (
                <button
                  type="button"
                  onClick={() => {
                    setArchiveStartDate('');
                    setArchiveEndDate('');
                    setSearchTerm('');
                  }}
                  className="px-2 py-1 bg-slate-200 hover:bg-rose-100 text-slate-600 hover:text-rose-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ml-1"
                  title="Reset Filter"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleExportBakArchiveToExcel(filteredArchive)}
                disabled={filteredArchive.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white disabled:text-slate-400 text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer disabled:cursor-not-allowed"
                title="Unduh rekap daftar dokumen BAK tersimpan ke format Excel (CSV)"
              >
                <Download className="h-4 w-4" />
                <span>Export Excel</span>
              </button>
              <div className="text-xs text-slate-500 font-bold bg-slate-100 px-2.5 py-1.5 rounded-xl">
                Total Dokumen: {filteredArchive.length}
              </div>
            </div>
          </div>

          {filteredArchive.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 space-y-3">
              <FileText className="h-12 w-12 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-600">Belum Ada Dokumen BAK Tersimpan</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Silakan isi formulir BAK lalu klik &quot;Simpan Dokumen BAK&quot; untuk membuat arsip baru.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredArchive.map((doc) => (
                <div key={doc.id} className="bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-5 shadow-xs transition space-y-4">
                  <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                        {doc.docNumber || `No. BAK: #${doc.id}`}
                      </span>
                      <h4 className="text-sm font-black text-slate-800 mt-1.5">{doc.applicant}</h4>
                      <p className="text-xs text-slate-500 font-medium">{doc.dept} • {getTanggalIndo(doc.tanggalKerusakan)}</p>
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
                        onClick={(e) => handleDeleteDoc(doc.id, e)}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition"
                        title="Hapus Dokumen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Item preview list */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Item Kerusakan ({doc.items?.length || 0}):</p>
                    <ul className="text-xs space-y-1">
                      {(doc.items || []).slice(0, 3).map((it, idx) => (
                        <li key={idx} className="flex justify-between text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg">
                          <span className="font-semibold truncate max-w-[200px]">{idx + 1}. {it.description}</span>
                          <span className="font-mono text-slate-500 font-bold">{it.qty} {it.uom}</span>
                        </li>
                      ))}
                      {(doc.items || []).length > 3 && (
                        <p className="text-[10px] text-slate-400 italic pl-1">+ {doc.items.length - 3} item barang lainnya...</p>
                      )}
                    </ul>
                  </div>

                  {/* Digital Sign Status & Action Bar */}
                  <div className="border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between gap-2 text-[10.5px]">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded font-bold ${doc.ttdPembuat ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                        Pembuat {doc.ttdPembuat ? '✓' : ''}
                      </span>
                      <span className={`px-2 py-0.5 rounded font-bold ${doc.ttdRequest ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                        Request {doc.ttdRequest ? '✓' : ''}
                      </span>
                      <span className={`px-2 py-0.5 rounded font-bold ${doc.ttdDiketahui ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                        Diketahui {doc.ttdDiketahui ? '✓' : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {!doc.ttdPembuat && doc.namaPembuat?.toLowerCase().trim() === userRealName.toLowerCase().trim() && (
                        <button
                          onClick={() => handleSignDocument(doc, 'pembuat')}
                          className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg font-bold text-[10px] hover:bg-indigo-700 transition"
                        >
                          TTD Pembuat
                        </button>
                      )}
                      {!doc.ttdRequest && doc.namaRequest?.toLowerCase().trim() === userRealName.toLowerCase().trim() && (
                        <button
                          onClick={() => handleSignDocument(doc, 'request')}
                          className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg font-bold text-[10px] hover:bg-indigo-700 transition"
                        >
                          TTD Request
                        </button>
                      )}
                      {!doc.ttdDiketahui && doc.namaDiketahui?.toLowerCase().trim() === userRealName.toLowerCase().trim() && (
                        <button
                          onClick={() => handleSignDocument(doc, 'diketahui')}
                          className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg font-bold text-[10px] hover:bg-indigo-700 transition"
                        >
                          TTD Diketahui
                        </button>
                      )}
                    </div>
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
              body > *:not(#bak-print-mount) {
                display: none !important;
              }
              #bak-print-mount {
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
              #bak-print-mount {
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
                    Pratinjau Cetak BAK A4 ({selectedDocToPrint.docNumber || selectedDocToPrint.noReg})
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
                      BERITA ACARA KERUSAKAN (BAK)
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
                  <div className="grid grid-cols-[140px_auto] items-center">
                    <span>Nomor Surat BAK</span>
                    <span className="font-mono font-bold">: {selectedDocToPrint.docNumber || '-'}</span>
                  </div>
                  <div className="grid grid-cols-[140px_auto] items-center">
                    <span>No. Registrasi / Unit</span>
                    <span className="font-mono font-bold">: {selectedDocToPrint.noReg || '-'}</span>
                  </div>
                  <div className="grid grid-cols-[140px_auto] items-center">
                    <span>Applicant (Pemohon)</span>
                    <span>: {selectedDocToPrint.applicant || '-'}</span>
                  </div>
                  <div className="grid grid-cols-[140px_auto] items-center">
                    <span>Departemen</span>
                    <span>: {selectedDocToPrint.dept || '-'}</span>
                  </div>
                  <div className="grid grid-cols-[140px_auto] items-center">
                    <span>Cost Center</span>
                    <span>: {selectedDocToPrint.costCenter || '-'}</span>
                  </div>
                  <div className="grid grid-cols-[140px_auto] items-center">
                    <span>Branch Site</span>
                    <span>: {selectedDocToPrint.branchSite || '-'}</span>
                  </div>
                  <div className="grid grid-cols-[140px_auto] items-center">
                    <span>Tanggal Kejadian</span>
                    <span>: {getTanggalIndo(selectedDocToPrint.tanggalKerusakan)}</span>
                  </div>
                </div>

                {/* Main Items Table */}
                <table className="w-full text-xs text-left border-collapse border border-black">
                  <thead>
                    <tr className="bg-[#00AEEF] text-black font-extrabold uppercase border-b border-black print:bg-[#00AEEF]" style={{ backgroundColor: '#00AEEF', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                      <th className="py-2 px-3 border-r border-black text-center w-12">No</th>
                      <th className="py-2 px-3 border-r border-black">Perlengkapan / Item Kerusakan</th>
                      <th className="py-2 px-3 border-r border-black text-center w-16">Qty</th>
                      <th className="py-2 px-3 border-r border-black text-center w-20">Satuan</th>
                      <th className="py-2 px-3 border-r border-black text-center w-32">Lama Pemakaian</th>
                      <th className="py-2 px-3 border-black text-center">Keterangan Kerusakan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedDocToPrint.items || []).map((item, idx) => (
                      <tr key={idx} className="border-b border-black">
                        <td className="py-1.5 px-3 border-r border-black text-center font-bold">{idx + 1}</td>
                        <td className="py-1.5 px-3 border-r border-black font-semibold">{item.description}</td>
                        <td className="py-1.5 px-3 border-r border-black text-center font-bold">{item.qty}</td>
                        <td className="py-1.5 px-3 border-r border-black text-center">{item.uom}</td>
                        <td className="py-1.5 px-3 border-r border-black text-center">{item.lamaPemakaian || '-'}</td>
                        <td className="py-1.5 px-3 font-medium">{item.keterangan || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Keterangan Lain-Lain & Photos */}
                <div className="pt-2 space-y-3">
                  <div>
                    <p className="text-xs font-bold mb-1">Keterangan Lain-Lain / Kronologi :</p>
                    <div className="border border-black p-3 text-xs font-medium rounded-xs">
                      <p className="whitespace-pre-wrap">{selectedDocToPrint.keteranganLain || '-'}</p>
                    </div>
                  </div>

                  {/* Photo attachments */}
                  {(selectedDocToPrint.gambar1 || selectedDocToPrint.gambar2 || selectedDocToPrint.gambar3) && (
                    <div className="border border-black p-3 space-y-2 rounded-xs">
                      <p className="text-xs font-bold uppercase">Lampiran Bukti Foto Kerusakan :</p>
                      <div className="grid grid-cols-3 gap-3">
                        {selectedDocToPrint.gambar1 && (
                          <div className="border border-black p-1 bg-white text-center">
                            <img src={selectedDocToPrint.gambar1} alt="Foto 1" className="h-28 w-full object-contain" referrerPolicy="no-referrer" />
                            <span className="text-[9px] font-bold block mt-1">FOTO #1</span>
                          </div>
                        )}
                        {selectedDocToPrint.gambar2 && (
                          <div className="border border-black p-1 bg-white text-center">
                            <img src={selectedDocToPrint.gambar2} alt="Foto 2" className="h-28 w-full object-contain" referrerPolicy="no-referrer" />
                            <span className="text-[9px] font-bold block mt-1">FOTO #2</span>
                          </div>
                        )}
                        {selectedDocToPrint.gambar3 && (
                          <div className="border border-black p-1 bg-white text-center">
                            <img src={selectedDocToPrint.gambar3} alt="Foto 3" className="h-28 w-full object-contain" referrerPolicy="no-referrer" />
                            <span className="text-[9px] font-bold block mt-1">FOTO #3</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Approval Signatures Grid */}
                <div className="pt-4 text-xs text-black">
                  <div className="grid grid-cols-3 text-center border-collapse">
                    
                    {/* Pembuat */}
                    <div className="space-y-1">
                      <p className="font-medium">Dibuat Oleh,</p>
                      <div className="h-20 flex items-center justify-center py-1">
                        {selectedDocToPrint.ttdPembuat ? (
                          <img src={getSignaturePreviewSrc(selectedDocToPrint.ttdPembuat)} alt="TTD Pembuat" className="h-16 max-w-[120px] object-contain" />
                        ) : (
                          <span className="text-[10px] text-slate-400 italic"></span>
                        )}
                      </div>
                      <p className="font-bold underline uppercase">{selectedDocToPrint.namaPembuat || ''}</p>
                      <p className="font-bold">{selectedDocToPrint.rolePembuat || 'Admin'}</p>
                    </div>

                    {/* Request */}
                    <div className="space-y-1">
                      <p className="font-medium">Direquest Oleh,</p>
                      <div className="h-20 flex items-center justify-center py-1">
                        {selectedDocToPrint.ttdRequest ? (
                          <img src={getSignaturePreviewSrc(selectedDocToPrint.ttdRequest)} alt="TTD Request" className="h-16 max-w-[120px] object-contain" />
                        ) : (
                          <span className="text-[10px] text-slate-400 italic"></span>
                        )}
                      </div>
                      <p className="font-bold underline uppercase">{selectedDocToPrint.namaRequest || ''}</p>
                      <p className="font-bold">{selectedDocToPrint.roleRequest || 'SPV/Foreman'}</p>
                    </div>

                    {/* Diketahui */}
                    <div className="space-y-1">
                      <p className="font-medium">Diketahui Oleh,</p>
                      <div className="h-20 flex items-center justify-center py-1">
                        {selectedDocToPrint.ttdDiketahui ? (
                          <img src={getSignaturePreviewSrc(selectedDocToPrint.ttdDiketahui)} alt="TTD Diketahui" className="h-16 max-w-[120px] object-contain" />
                        ) : (
                          <span className="text-[10px] text-slate-400 italic"></span>
                        )}
                      </div>
                      <p className="font-bold underline uppercase">{selectedDocToPrint.namaDiketahui || 'HSE Dept.'}</p>
                      <p className="font-bold">HSE Dept.</p>
                    </div>

                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Portal rendered directly under <body> for actual Printing */}
          {createPortal(
            <div id="bak-print-mount" className="p-8 space-y-5 text-black bg-white font-sans">
              
              {/* Header Logos & Title */}
              <div className="border-2 border-black p-2 flex justify-between items-center gap-2">
                {/* Left Logo: PT INDOTRUCK UTAMA */}
                <div className="w-44 flex items-center justify-start">
                  <img src={companyLogo} alt="PT INDOTRUCK UTAMA" className="h-10 object-contain" referrerPolicy="no-referrer" />
                </div>

                {/* Title */}
                <div className="text-center flex-1 px-2">
                  <h1 className="text-sm sm:text-base font-black text-black tracking-wide uppercase leading-tight">
                    BERITA ACARA KERUSAKAN (BAK)
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
                <div className="grid grid-cols-[140px_auto] items-center">
                  <span>Nomor Surat BAK</span>
                  <span className="font-mono font-bold">: {selectedDocToPrint.docNumber || '-'}</span>
                </div>
                <div className="grid grid-cols-[140px_auto] items-center">
                  <span>No. Registrasi / Unit</span>
                  <span className="font-mono font-bold">: {selectedDocToPrint.noReg || '-'}</span>
                </div>
                <div className="grid grid-cols-[140px_auto] items-center">
                  <span>Applicant (Pemohon)</span>
                  <span>: {selectedDocToPrint.applicant || '-'}</span>
                </div>
                <div className="grid grid-cols-[140px_auto] items-center">
                  <span>Departemen</span>
                  <span>: {selectedDocToPrint.dept || '-'}</span>
                </div>
                <div className="grid grid-cols-[140px_auto] items-center">
                  <span>Cost Center</span>
                  <span>: {selectedDocToPrint.costCenter || '-'}</span>
                </div>
                <div className="grid grid-cols-[140px_auto] items-center">
                  <span>Branch Site</span>
                  <span>: {selectedDocToPrint.branchSite || '-'}</span>
                </div>
                <div className="grid grid-cols-[140px_auto] items-center">
                  <span>Tanggal Kejadian</span>
                  <span>: {getTanggalIndo(selectedDocToPrint.tanggalKerusakan)}</span>
                </div>
              </div>

              {/* Main Items Table */}
              <table className="w-full text-xs text-left border-collapse border border-black">
                <thead>
                  <tr className="bg-[#00AEEF] text-black font-extrabold uppercase border-b border-black print:bg-[#00AEEF]" style={{ backgroundColor: '#00AEEF', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                    <th className="py-2 px-3 border-r border-black text-center w-12">No</th>
                    <th className="py-2 px-3 border-r border-black">Perlengkapan / Item Kerusakan</th>
                    <th className="py-2 px-3 border-r border-black text-center w-16">Qty</th>
                    <th className="py-2 px-3 border-r border-black text-center w-20">Satuan</th>
                    <th className="py-2 px-3 border-r border-black text-center w-32">Lama Pemakaian</th>
                    <th className="py-2 px-3 border-black text-center">Keterangan Kerusakan</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedDocToPrint.items || []).map((item, idx) => (
                    <tr key={idx} className="border-b border-black">
                      <td className="py-1.5 px-3 border-r border-black text-center font-bold">{idx + 1}</td>
                      <td className="py-1.5 px-3 border-r border-black font-semibold">{item.description}</td>
                      <td className="py-1.5 px-3 border-r border-black text-center font-bold">{item.qty}</td>
                      <td className="py-1.5 px-3 border-r border-black text-center">{item.uom}</td>
                      <td className="py-1.5 px-3 border-r border-black text-center">{item.lamaPemakaian || '-'}</td>
                      <td className="py-1.5 px-3 font-medium">{item.keterangan || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Keterangan Lain-Lain & Photos */}
              <div className="pt-2 space-y-3">
                <div>
                  <p className="text-xs font-bold mb-1">Keterangan Lain-Lain / Kronologi :</p>
                  <div className="border border-black p-3 text-xs font-medium rounded-xs">
                    <p className="whitespace-pre-wrap">{selectedDocToPrint.keteranganLain || '-'}</p>
                  </div>
                </div>

                {/* Photo attachments */}
                {(selectedDocToPrint.gambar1 || selectedDocToPrint.gambar2 || selectedDocToPrint.gambar3) && (
                  <div className="border border-black p-3 space-y-2 rounded-xs">
                    <p className="text-xs font-bold uppercase">Lampiran Bukti Foto Kerusakan :</p>
                    <div className="grid grid-cols-3 gap-3">
                      {selectedDocToPrint.gambar1 && (
                        <div className="border border-black p-1 bg-white text-center">
                          <img src={selectedDocToPrint.gambar1} alt="Foto 1" className="h-28 w-full object-contain" referrerPolicy="no-referrer" />
                          <span className="text-[9px] font-bold block mt-1">FOTO #1</span>
                        </div>
                      )}
                      {selectedDocToPrint.gambar2 && (
                        <div className="border border-black p-1 bg-white text-center">
                          <img src={selectedDocToPrint.gambar2} alt="Foto 2" className="h-28 w-full object-contain" referrerPolicy="no-referrer" />
                          <span className="text-[9px] font-bold block mt-1">FOTO #2</span>
                        </div>
                      )}
                      {selectedDocToPrint.gambar3 && (
                        <div className="border border-black p-1 bg-white text-center">
                          <img src={selectedDocToPrint.gambar3} alt="Foto 3" className="h-28 w-full object-contain" referrerPolicy="no-referrer" />
                          <span className="text-[9px] font-bold block mt-1">FOTO #3</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Approval Signatures Grid */}
              <div className="pt-4 text-xs text-black">
                <div className="grid grid-cols-3 text-center border-collapse">
                  
                  {/* Pembuat */}
                  <div className="space-y-1">
                    <p className="font-medium">Dibuat Oleh,</p>
                    <div className="h-20 flex items-center justify-center py-1">
                      {selectedDocToPrint.ttdPembuat ? (
                        <img src={getSignaturePreviewSrc(selectedDocToPrint.ttdPembuat)} alt="TTD Pembuat" className="h-16 max-w-[120px] object-contain" />
                      ) : (
                        <span className="text-[10px] text-slate-400 italic"></span>
                      )}
                    </div>
                    <p className="font-bold underline uppercase">{selectedDocToPrint.namaPembuat || ''}</p>
                    <p className="font-bold">{selectedDocToPrint.rolePembuat || 'Admin'}</p>
                  </div>

                  {/* Request */}
                  <div className="space-y-1">
                    <p className="font-medium">Direquest Oleh,</p>
                    <div className="h-20 flex items-center justify-center py-1">
                      {selectedDocToPrint.ttdRequest ? (
                        <img src={getSignaturePreviewSrc(selectedDocToPrint.ttdRequest)} alt="TTD Request" className="h-16 max-w-[120px] object-contain" />
                      ) : (
                        <span className="text-[10px] text-slate-400 italic"></span>
                      )}
                    </div>
                    <p className="font-bold underline uppercase">{selectedDocToPrint.namaRequest || ''}</p>
                    <p className="font-bold">{selectedDocToPrint.roleRequest || 'SPV/Foreman'}</p>
                  </div>

                  {/* Diketahui */}
                  <div className="space-y-1">
                    <p className="font-medium">Diketahui Oleh,</p>
                    <div className="h-20 flex items-center justify-center py-1">
                      {selectedDocToPrint.ttdDiketahui ? (
                        <img src={getSignaturePreviewSrc(selectedDocToPrint.ttdDiketahui)} alt="TTD Diketahui" className="h-16 max-w-[120px] object-contain" />
                      ) : (
                        <span className="text-[10px] text-slate-400 italic"></span>
                      )}
                    </div>
                    <p className="font-bold underline uppercase">{selectedDocToPrint.namaDiketahui || 'HSE Dept.'}</p>
                    <p className="font-bold">HSE Dept.</p>
                  </div>

                </div>
              </div>

            </div>,
            document.body
          )}
        </>
      )}

      {/* HTML5 Image Editor Modal (Cropping, Zoom, Rotation, Drawing Red Pencil) */}
      {editorOpen && editorSlot && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col my-auto max-h-[95vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-800/90 border-b border-slate-700/80 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                  <Crop className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Editor Image & Crop Photo #{editorSlot}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Atur posisi, perbesar / perkecil (zoom out), putar rotasi, atau tandai area kerusakan dengan pensil merah.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-xl transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6 overflow-y-auto">
              {/* Canvas Area */}
              <div className="flex flex-col items-center justify-center bg-slate-950/80 border border-slate-800 rounded-2xl p-3 min-h-[340px]">
                <div className="relative border-2 border-dashed border-indigo-500/50 rounded-xl overflow-hidden shadow-xl">
                  <canvas
                    ref={editorCanvasRef}
                    width={640}
                    height={480}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUpOrLeave}
                    onMouseLeave={handleCanvasMouseUpOrLeave}
                    onTouchStart={handleCanvasTouchStart}
                    onTouchMove={handleCanvasTouchMove}
                    onTouchEnd={handleCanvasMouseUpOrLeave}
                    className={`max-w-full h-auto touch-none ${editorMode === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
                  />
                  <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700/60 text-[10px] font-bold text-slate-300 pointer-events-none flex items-center gap-1.5">
                    {editorMode === 'pan' ? (
                      <><Move className="h-3 w-3 text-indigo-400" /> Mode Geser & Zoom</>
                    ) : (
                      <><Pencil className="h-3 w-3 text-rose-400" /> Mode Pensil Merah</>
                    )}
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 font-medium text-center mt-3">
                  {editorMode === 'pan' 
                    ? "💡 Klik & tahan / seret foto untuk menggeser posisi. Gunakan slider zoom untuk memperkecil/memperbesar."
                    : "✏️ Klik & seret pada canvas di atas untuk menggambar coretan penanda kerusakan berwarna merah."}
                </p>
              </div>

              {/* Controls Sidebar */}
              <div className="space-y-5 bg-slate-800/50 border border-slate-700/60 p-4 rounded-2xl flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Mode Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                      Pilih Alat Editor
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditorMode('pan')}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                          editorMode === 'pan'
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Move className="h-4 w-4" />
                        1. Geser & Skala
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorMode('draw_red')}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                          editorMode === 'draw_red'
                            ? 'bg-rose-600 border-rose-500 text-white shadow-md'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Pencil className="h-4 w-4" />
                        2. Pensil Merah
                      </button>
                    </div>
                  </div>

                  {/* Zoom Controls */}
                  <div className="space-y-2 border-t border-slate-700/60 pt-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-300 flex items-center gap-1">
                        <ZoomIn className="h-3.5 w-3.5 text-indigo-400" /> Zoom / Ukuran
                      </span>
                      <span className="font-mono text-indigo-400 font-extrabold">{Math.round(zoom * 100)}%</span>
                    </div>

                    <input
                      type="range"
                      min="0.2"
                      max="3.0"
                      step="0.05"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 bg-slate-700 rounded-lg h-2 cursor-pointer"
                    />

                    <div className="grid grid-cols-4 gap-1">
                      <button
                        type="button"
                        onClick={() => setZoom(0.35)}
                        className="py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-[10px] font-bold cursor-pointer"
                      >
                        0.35x
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoom(0.65)}
                        className="py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-[10px] font-bold cursor-pointer"
                      >
                        0.65x
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoom(1.0)}
                        className="py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-[10px] font-bold cursor-pointer"
                      >
                        1.0x
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoom(1.5)}
                        className="py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-[10px] font-bold cursor-pointer"
                      >
                        1.5x
                      </button>
                    </div>
                  </div>

                  {/* Rotate & Position Reset */}
                  <div className="space-y-2 border-t border-slate-700/60 pt-3">
                    <span className="text-xs font-bold text-slate-300 block">Rotasi & Posisi</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRotate((prev) => (prev + 90) % 360)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
                      >
                        <RotateCw className="h-3.5 w-3.5 text-indigo-400" /> Putar 90°
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOffsetX(0);
                          setOffsetY(0);
                          setRotate(0);
                          setZoom(1.0);
                        }}
                        className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
                      >
                        <RefreshCw className="h-3.5 w-3.5 text-amber-400" /> Reset Posisi
                      </button>
                    </div>
                  </div>

                  {/* Stroke / Drawing Controls */}
                  {strokes.length > 0 && (
                    <div className="space-y-2 border-t border-slate-700/60 pt-3">
                      <span className="text-xs font-bold text-slate-300 block">Coretan Penanda ({strokes.length})</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setStrokes((prev) => prev.slice(0, -1))}
                          className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
                        >
                          <Undo className="h-3.5 w-3.5 text-rose-400" /> Undo Coretan
                        </button>
                        <button
                          type="button"
                          onClick={() => setStrokes([])}
                          className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-rose-400 hover:text-rose-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Hapus Semua
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Save & Cancel Actions */}
                <div className="space-y-2 border-t border-slate-700/60 pt-4 mt-4">
                  <button
                    type="button"
                    onClick={handleSaveCroppedImage}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer transition"
                  >
                    <Check className="h-4 w-4" /> Simpan Hasil Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorOpen(false)}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs text-center cursor-pointer transition"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
