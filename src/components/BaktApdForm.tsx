import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Printer, 
  Save, 
  Search, 
  FileText, 
  Upload, 
  Link2, 
  Eye, 
  Calendar, 
  FileCheck2, 
  Layout, 
  Coins, 
  Clock, 
  UserCheck,
  Check,
  CheckCircle2,
  Crop,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Move,
  Pencil,
  Undo,
  Download,
  FileSpreadsheet,
  Filter,
  X
} from 'lucide-react';
import { formatTanggalIndonesia, kompresDanProsesFile } from '../utils.js';
import { PageHeader } from './common/index.js';
const companyLogo = 'https://lh3.googleusercontent.com/d/156hm6i1ksZjjLvYvivwgVPfcuo-CP1fy';
const hseLogo = 'https://lh3.googleusercontent.com/d/1zE6dEUc98zDbaIVKBwfVDGX_s2abcmz_';

interface BaktApdFormProps {
  userRealName: string;
  userRole: 'admin' | 'operator';
  userTtdUrl?: string;
  username?: string;
  onBack: () => void;
}

interface SafetyItemRow {
  id: string;
  itemName: string;
  qty: number;
  tanggalTerakhir: string;
  lamaPemakaian: string;
  keterangan: string;
}

interface BaktDocument {
  id: string; // doc number or timestamp
  docNumber: string;
  costCentre: string;
  dept: string;
  karyawanNama: string;
  karyawanNik: string;
  branchSite: string;
  tanggalPengajuan: string;
  items: SafetyItemRow[];
  gambar1: string; // base64 or url
  gambar2: string; // base64 or url
  gambar3: string; // base64 or url
  keteranganLain: string;
  lokasiTtd: string;
  namaAtasan: string;
  namaPicApd: string;
  createdAt: string;
  createdBy?: string;
  ttdKaryawan?: string;
  ttdAtasan?: string;
  ttdPic?: string;
}

const checkThreeImagesRequired = (itemsList: SafetyItemRow[]): boolean => {
  if (!itemsList || itemsList.length === 0) return false;
  
  const targetSizes = [
    { no: '5', uk: '38' },
    { no: '6', uk: '40' },
    { no: '7', uk: '41' },
    { no: '8', uk: '42' },
    { no: '9', uk: '43' },
    { no: '10', uk: '45' },
    { no: '11', uk: '46' },
  ];

  return itemsList.some(item => {
    if (!item.itemName) return false;
    const name = item.itemName.toLowerCase().trim();
    if (!name.includes('safety shoes')) return false;
    
    return targetSizes.some(target => {
      const noRegex = new RegExp(`no\\.?\\s*${target.no}\\b`);
      const hasNo = noRegex.test(name) || name.includes(`shoes ${target.no}`);
      const hasUk = name.includes(target.uk);
      return hasNo && hasUk;
    });
  });
};

export default function BaktApdForm({ 
  userRealName, 
  userRole, 
  userTtdUrl = '', 
  username = '', 
  onBack 
}: BaktApdFormProps) {
  // Saved documents archive state
  const [savedDocs, setSavedDocs] = useState<BaktDocument[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'form' | 'archive'>('form');
  const [selectedArchiveDoc, setSelectedArchiveDoc] = useState<BaktDocument | null>(null);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveStartDate, setArchiveStartDate] = useState('');
  const [archiveEndDate, setArchiveEndDate] = useState('');

  // APD transaction history reference states
  const [dataOrderHistory, setDataOrderHistory] = useState<any[]>([]);
  const [latestApdInfo, setLatestApdInfo] = useState<{ barang: string; tanggal: string; jumlah: number } | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [expandedHistoryGroup, setExpandedHistoryGroup] = useState<string | null>(null);

  // Signatures State
  const [ttdKaryawan, setTtdKaryawan] = useState('');
  const [ttdAtasan, setTtdAtasan] = useState('');
  const [ttdPic, setTtdPic] = useState('');

  // Form Field States
  const [docNumber, setDocNumber] = useState('');
  const [costCentre, setCostCentre] = useState('-');
  const [dept, setDept] = useState('Mekanik M3');
  const [karyawanNama, setKaryawanNama] = useState('');
  const [karyawanNik, setKaryawanNik] = useState('');
  const [branchSite, setBranchSite] = useState('SIS Adaro Tutupan');
  const [tanggalPengajuan, setTanggalPengajuan] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const [items, setItems] = useState<SafetyItemRow[]>([
    {
      id: '1',
      itemName: 'Safety Shoes No. 5 / Uk. 38',
      qty: 1,
      tanggalTerakhir: '2025-01-30',
      lamaPemakaian: '1 Tahun 4 Bulan',
      keterangan: '-'
    }
  ]);

  // Image states
  const [gambar1, setGambar1] = useState('');
  const [gambar2, setGambar2] = useState('');
  const [gambar3, setGambar3] = useState('');

  // Image loading feedback
  const [isUploading1, setIsUploading1] = useState(false);
  const [isUploading2, setIsUploading2] = useState(false);
  const [isUploading3, setIsUploading3] = useState(false);

  // Additional settings
  const [keteranganLain, setKeteranganLain] = useState('Safety Shoes bagian samping kiri terbuka sehingga air masuk kedalam sepatu');
  const [lokasiTtd, setLokasiTtd] = useState('Tabalong');
  const [namaAtasan, setNamaAtasan] = useState('SPV / Atasan');
  const [namaPicApd, setNamaPicApd] = useState('PIC APD');

  // Employee list autocompletion or fast-picker
  const [karyawanList, setKaryawanList] = useState<{ nama: string; nik: string; dept: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  
  // Master APD option list
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

  // Print notice instruction check state
  const [printNoticeOpen, setPrintNoticeOpen] = useState(false);

  // Toast notification for auto-populating APD item from history
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleOpenEditor = (slot: 1 | 2 | 3, imgSrc: string) => {
    setEditorSlot(slot);
    setEditorSrc(imgSrc);
    // Reset defaults
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

  // Helper to translate mouse/touch coordinate to canvas internal 640x480 space
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
    
    // Scale client coordinate to canvas internal 640x480 coordinate
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  // Redraw hook for the cropping editor canvas
  useEffect(() => {
    if (!editorOpen || !editorSrc || !editorCanvasRef.current) return;
    const canvas = editorCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Clear background with dark slate color for high visibility framing
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      // Move to center of canvas for rotation and scaling
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
      ctx.strokeStyle = "#ef4444"; // high visibility red color
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

  // Canvas Mouse and Touch Drag Interaction Events
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
      // Prevent screen scrolling when drawing
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

      // Render red drawings on top (scale coordinates x1.25)
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 5.0; // thicker lines for the final 800x600 canvas
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

      const finalBase64 = outputCanvas.toDataURL('image/jpeg', 0.85);
      
      if (editorSlot === 1) setGambar1(finalBase64);
      if (editorSlot === 2) setGambar2(finalBase64);
      if (editorSlot === 3) setGambar3(finalBase64);

      setEditorOpen(false);
    };
    img.src = editorSrc;
  };

  // Auto-generate formal Document Number
  useEffect(() => {
    const date = new Date(tanggalPengajuan);
    const monthsRoman = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
    const monthRoman = monthsRoman[date.getMonth()];
    const year = date.getFullYear();
    const isRnd = Math.floor(10 + Math.random() * 90);
    // Draft template: 022/ITU-SIS/BAKT/V/2026
    setDocNumber(`0${isRnd}/ITU-SIS/BAKT/${monthRoman}/${year}`);
  }, [tanggalPengajuan]);

  // Load Archive from local storage upon mounting
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/users');
        const data = await res.json();
        if (data.success) {
          setAllUsers(data.list || []);
        }
      } catch (e) {
        console.warn("Gagal memuat list user", e);
      }
    };
    fetchUsers();

    const fetchSharedDocs = async () => {
      try {
        const res = await fetch('/api/bakt/list');
        const data = await res.json();
        if (data.success && Array.isArray(data.list)) {
          let mergedList = [...data.list];
          const stored = localStorage.getItem('bakt_apd_archives');
          if (stored) {
            try {
              const localList = JSON.parse(stored);
              if (Array.isArray(localList)) {
                localList.forEach((localDoc: any) => {
                  if (localDoc && localDoc.id && !mergedList.some((d: any) => String(d.id) === String(localDoc.id))) {
                    mergedList.push(localDoc);
                    // Proactively post back to server to restore it
                    fetch('/api/bakt/save', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(localDoc)
                    }).catch(err => console.warn("Gagal sinkronisasi data BAKT lokal ke server", err));
                  }
                });
              }
            } catch (e) {
              console.warn("Gagal parsing local storage bakt_apd_archives", e);
            }
          }
          setSavedDocs(mergedList);
          localStorage.setItem('bakt_apd_archives', JSON.stringify(mergedList));

          // Support URL Deep-linking for email notification actions
          const targetId = sessionStorage.getItem('highlightDocId');
          const targetType = sessionStorage.getItem('highlightDocType');
          if (targetId && targetType === 'BAKT') {
            const found = mergedList.find((d: any) => String(d.id) === String(targetId));
            if (found) {
              setSelectedArchiveDoc(found);
              setActiveTab('archive');
              sessionStorage.removeItem('highlightDocId');
              sessionStorage.removeItem('highlightDocType');
            }
          }
        } else {
          // Fallback to local storage if API is offline
          const stored = localStorage.getItem('bakt_apd_archives');
          if (stored) {
            setSavedDocs(JSON.parse(stored));
          }
        }
      } catch (err) {
        const stored = localStorage.getItem('bakt_apd_archives');
        if (stored) {
          setSavedDocs(JSON.parse(stored));
        }
      }
    };
    fetchSharedDocs();

    // Try to pre-load employee database for autocomplete
    const fetchEmployees = async () => {
      try {
        const res = await fetch('/api/karyawan');
        const data = await res.json();
        // Fallback or dynamic loading
        if (data.success) {
          if (Array.isArray(data.karyawanDetail) && data.karyawanDetail.length > 0) {
            setKaryawanList(data.karyawanDetail);
          } else if (Array.isArray(data.karyawan)) {
            // Fallback if detail is missing
            const mapped = data.karyawan.map((emp: string, i: number) => ({
              nama: emp,
              nik: String(9000 + i),
              dept: 'Mekanik M3'
            }));
            setKaryawanList(mapped);
          } else {
            setKaryawanList([
              { nama: 'Muhammad Rizal', nik: '9010', dept: 'Mekanik M3' },
              { nama: 'Supian', nik: '8912', dept: 'Operator HD' },
              { nama: 'Bambang Hermawan', nik: '9320', dept: 'Welder Workshop' },
              { nama: 'Dedi Setiawan', nik: '9055', dept: 'Mekanik Unit' }
            ]);
          }
        } else {
          setKaryawanList([
            { nama: 'Muhammad Rizal', nik: '9010', dept: 'Mekanik M3' },
            { nama: 'Supian', nik: '8912', dept: 'Operator HD' },
            { nama: 'Bambang Hermawan', nik: '9320', dept: 'Welder Workshop' },
            { nama: 'Dedi Setiawan', nik: '9055', dept: 'Mekanik Unit' }
          ]);
        }
      } catch (err) {
        console.warn("Daftar karyawan fallback loaded.");
        setKaryawanList([
          { nama: 'Muhammad Rizal', nik: '9010', dept: 'Mekanik M3' },
          { nama: 'Supian', nik: '8912', dept: 'Operator HD' },
          { nama: 'Bambang Hermawan', nik: '9320', dept: 'Welder Workshop' },
          { nama: 'Dedi Setiawan', nik: '9055', dept: 'Mekanik Unit' }
        ]);
      }
    };
    fetchEmployees();

    const fetchMasterApd = async () => {
      try {
        const res = await fetch('/api/master-apd');
        const data = await res.json();
        if (data.success && Array.isArray(data.list) && data.list.length > 0) {
          setMasterApdList(data.list);
        }
      } catch (err) {
        console.warn("Daftar master APD dari server gagal dimuat, menggunakan default offline.");
      }
    };
    fetchMasterApd();
  }, []);

  // Fetch full Data Order history for APD reference
  useEffect(() => {
    const fetchDataOrderHistory = async () => {
      try {
        const res = await fetch('/api/inventory');
        const data = await res.json();
        if (data && Array.isArray(data.history)) {
          setDataOrderHistory(data.history);
        }
      } catch (err) {
        console.warn("Gagal memuat history data order:", err);
      }
    };
    fetchDataOrderHistory();
  }, []);

  // Auto-lookup the most recent APD received when worker name is selected / modified
  useEffect(() => {
    if (!karyawanNama) {
      setLatestApdInfo(null);
      return;
    }
    const target = karyawanNama.toLowerCase().trim();
    if (!target) {
      setLatestApdInfo(null);
      return;
    }

    // Filter APD transaction records for this employee that are "Barang Keluar"
    const apdRecords = dataOrderHistory.filter((item: any) => {
      const isApd = item.kategori && item.kategori.toLowerCase().trim() === 'apd';
      const isBarangKeluar = item.jenis && item.jenis.toLowerCase().trim() === 'barang keluar';
      const normKet = item.keterangan ? item.keterangan.toLowerCase().trim().replace(/\s+/g, ' ') : '';
      const normTarget = target.replace(/\s+/g, ' ');
      const isEmpMatch = normKet === normTarget;
      return isApd && isBarangKeluar && isEmpMatch;
    });

    if (apdRecords.length > 0) {
      const monthsIndo: Record<string, number> = {
        januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
        juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11
      };

      const parseDate = (dStr: string) => {
        if (!dStr) return 0;
        const clean = dStr.toLowerCase().trim();
        const parts = clean.split(/\s+/);
        if (parts.length >= 3) {
          const datePart = parseInt(parts[0], 10);
          const monthIdx = monthsIndo[parts[1]] !== undefined ? monthsIndo[parts[1]] : -1;
          const yearPart = parseInt(parts[2], 10);
          if (!isNaN(datePart) && monthIdx !== -1 && !isNaN(yearPart)) {
            return new Date(yearPart, monthIdx, datePart).getTime();
          }
        }
        
        const slashes = clean.split(/[/, :-\s]+/);
        if (slashes.length >= 3) {
          const p0 = parseInt(slashes[0], 10);
          const p1 = parseInt(slashes[1], 10);
          const p2 = parseInt(slashes[2], 10);

          if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
            let year = p2;
            let month = p1 - 1;
            let day = p0;

            if (slashes[0].length === 4 || p0 > 1000) {
              year = p0;
              month = p1 - 1;
              day = p2;
            } else {
              if (year < 100) year += 2000;
              if (p1 > 12) {
                day = p1;
                month = p0 - 1;
              } else if (p0 > 12) {
                day = p0;
                month = p1 - 1;
              }
            }
            if (year > 1000 && month >= 0 && month < 12 && day >= 1 && day <= 31) {
              return new Date(year, month, day).getTime();
            }
          }
        }

        const parsed = Date.parse(dStr);
        return isNaN(parsed) ? 0 : parsed;
      };

      // Sort with latest timestamp first
      const sorted = [...apdRecords].sort((a: any, b: any) => {
        const tA = parseDate(a.timestamp);
        const tB = parseDate(b.timestamp);
        return tB - tA;
      });

      const latest = sorted[0];
      setLatestApdInfo({
        barang: latest.barang,
        tanggal: latest.timestamp,
        jumlah: latest.jumlah
      });
    } else {
      setLatestApdInfo(null);
    }
  }, [karyawanNama, dataOrderHistory]);

  const selectEmployee = (emp: { nama: string; nik: string; dept: string }) => {
    setKaryawanNama(emp.nama);
    setKaryawanNik(emp.nik);
    setDept(emp.dept);
    setEmployeeSearch(emp.nama);
    setShowDropdown(false);
  };

  // Row Manipulation
  const handleAddRow = () => {
    const newId = String(items.length + 1);
    setItems([
      ...items,
      {
        id: newId,
        itemName: '',
        qty: 1,
        tanggalTerakhir: '',
        lamaPemakaian: '',
        keterangan: '-'
      }
    ]);
  };

  const handleRemoveRow = (id: string) => {
    if (items.length <= 1) return;
    const filtered = items.filter(item => item.id !== id).map((item, idx) => ({
      ...item,
      id: String(idx + 1)
    }));
    setItems(filtered);
  };

  const handleUpdateItem = (id: string, field: keyof SafetyItemRow, value: any) => {
    const updated = items.map(item => {
      if (item.id === id) {
        const newObj = { ...item, [field]: value };
        // If they modified "tanggalTerakhir", we can estimate "lamaPemakaian" automatically!
        if (field === 'tanggalTerakhir' && value) {
          try {
            const start = new Date(value);
            const end = new Date(tanggalPengajuan);
            let diffYears = end.getFullYear() - start.getFullYear();
            let diffMonths = end.getMonth() - start.getMonth();
            if (diffMonths < 0) {
              diffYears--;
              diffMonths += 12;
            }
            let label = '';
            if (diffYears > 0) label += `${diffYears} Tahun `;
            if (diffMonths > 0) label += `${diffMonths} Bulan`;
            if (diffYears === 0 && diffMonths === 0) label = "Baru 1 Bulan";
            newObj.lamaPemakaian = label.trim();
          } catch(e) {}
        }
        return newObj;
      }
      return item;
    });
    setItems(updated);
  };

  const parseDateToYMD = (dStr: string): string => {
    if (!dStr) return '';
    const monthsIndo: Record<string, string> = {
      januari: '01', februari: '02', maret: '03', april: '04', mei: '05', juni: '06',
      juli: '07', agustus: '08', september: '09', oktober: '10', november: '11', desember: '12'
    };
    const clean = dStr.toLowerCase().trim();
    
    // Format like "Kamis, 15 Januari 2026" or "15 Januari 2026"
    const parts = clean.split(/\s+/);
    if (parts.length >= 3) {
      let day = parseInt(parts[0], 10);
      let monthStr = monthsIndo[parts[1]];
      let year = parseInt(parts[2], 10);
      
      if (isNaN(day) && parts.length >= 4) {
        day = parseInt(parts[1], 10);
        monthStr = monthsIndo[parts[2]];
        year = parseInt(parts[3], 10);
      }
      
      if (!isNaN(day) && monthStr && !isNaN(year)) {
        const dd = String(day).padStart(2, '0');
        return `${year}-${monthStr}-${dd}`;
      }
    }

    // Format like "15/01/2026" or "2026-01-15"
    const slashes = clean.split(/[/, :-\s]+/);
    if (slashes.length >= 3) {
      const p0 = parseInt(slashes[0], 10);
      const p1 = parseInt(slashes[1], 10);
      const p2 = parseInt(slashes[2], 10);
      if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
        if (slashes[0].length === 4 || p0 > 1000) {
          return `${p0}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
        } else {
          let yr = p2;
          if (yr < 100) yr += 2000;
          return `${yr}-${String(p1).padStart(2, '0')}-${String(p0).padStart(2, '0')}`;
        }
      }
    }

    try {
      const dt = new Date(dStr);
      if (!isNaN(dt.getTime())) {
        return dt.toISOString().split('T')[0];
      }
    } catch(e) {}

    return '';
  };

  const calculateLamaPemakaian = (startDateStr: string, endDateStr: string): string => {
    if (!startDateStr) return '';
    try {
      const start = new Date(startDateStr);
      const end = new Date(endDateStr);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';
      
      let diffYears = end.getFullYear() - start.getFullYear();
      let diffMonths = end.getMonth() - start.getMonth();
      if (diffMonths < 0) {
        diffYears--;
        diffMonths += 12;
      }
      let label = '';
      if (diffYears > 0) label += `${diffYears} Tahun `;
      if (diffMonths > 0) label += `${diffMonths} Bulan`;
      if (diffYears === 0 && diffMonths === 0) label = "Baru 1 Bulan";
      return label.trim();
    } catch(e) {
      return '';
    }
  };

  const handleSelectApdFromHistory = (groupName: string, rawTimestamp?: string, qtyParam?: number) => {
    let ymdDate = '';
    if (rawTimestamp) {
      ymdDate = parseDateToYMD(rawTimestamp);
    }
    const calcLama = ymdDate ? calculateLamaPemakaian(ymdDate, tanggalPengajuan) : '';

    setItems((prevItems) => {
      // If there's only 1 item and its name is empty or default placeholder, replace it!
      const isDefaultSingle = prevItems.length === 1 && (
        !prevItems[0].itemName || 
        prevItems[0].itemName === 'Safety Shoes No. 5 / Uk. 38' ||
        prevItems[0].itemName.trim() === ''
      );

      if (isDefaultSingle) {
        return [{
          id: '1',
          itemName: groupName,
          qty: qtyParam || 1,
          tanggalTerakhir: ymdDate,
          lamaPemakaian: calcLama,
          keterangan: '-'
        }];
      }

      // Check if item already exists in prevItems
      const existingIndex = prevItems.findIndex(it => it.itemName.toLowerCase().trim() === groupName.toLowerCase().trim());
      if (existingIndex !== -1) {
        const updated = [...prevItems];
        updated[existingIndex] = {
          ...updated[existingIndex],
          qty: qtyParam || updated[existingIndex].qty || 1,
          tanggalTerakhir: ymdDate || updated[existingIndex].tanggalTerakhir,
          lamaPemakaian: calcLama || updated[existingIndex].lamaPemakaian
        };
        return updated;
      }

      // Append new row
      const newId = String(prevItems.length + 1);
      return [
        ...prevItems,
        {
          id: newId,
          itemName: groupName,
          qty: qtyParam || 1,
          tanggalTerakhir: ymdDate,
          lamaPemakaian: calcLama,
          keterangan: '-'
        }
      ];
    });

    setToastMessage(`✓ ${groupName} ${ymdDate ? `(${formatTanggalIndonesia(ymdDate)})` : ''} berhasil dimasukkan ke Tabel APD!`);
    setTimeout(() => setToastMessage(null), 3500);

    setShowHistoryModal(false);
    setTimeout(() => {
      const tableEl = document.getElementById('tabel-apd-section');
      if (tableEl) {
        tableEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  // Image Upload processors
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>, slot: 1 | 2 | 3) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (slot === 1) setIsUploading1(true);
    if (slot === 2) setIsUploading2(true);
    if (slot === 3) setIsUploading3(true);

    try {
      const result = await kompresDanProsesFile(files[0]);
      if (result) {
        // Automatically open the zoom/crop editor for them to adjust!
        handleOpenEditor(slot, result.data);
      }
    } catch (err) {
      console.error("Gagal memproses unggah gambar:", err);
    } finally {
      if (slot === 1) setIsUploading1(false);
      if (slot === 2) setIsUploading2(false);
      if (slot === 3) setIsUploading3(false);
    }
  };

  const notifyFirstCreator = async (doc: BaktDocument) => {
    const targetName = doc.karyawanNama;
    if (!targetName) return;

    const foundUser = allUsers.find(u => u.nama.toLowerCase().trim() === targetName.toLowerCase().trim());
    if (foundUser && foundUser.email) {
      try {
        const appUrl = window.location.origin;
        const approveUrl = `${appUrl}/?view=pengajuan_menu&tab=archive&docId=${doc.id}&docType=BAKT`;
        await fetch('/api/send-approval-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toEmail: foundUser.email,
            approverName: foundUser.nama,
            docType: 'BAKT',
            docNumber: doc.docNumber || doc.id,
            createdBy: doc.createdBy || 'Karyawan',
            createdAt: doc.tanggalPengajuan || doc.createdAt || new Date().toISOString().split('T')[0],
            roleType: 'Pengaju APD / Karyawan (S-1)',
            approveUrl
          })
        });
      } catch (e) {
        console.error("Gagal mengirim email pengaju:", e);
      }
    }
  };

  const notifyNextApprover = async (doc: BaktDocument, currentRole: 'karyawan' | 'atasan' | 'pic') => {
    let nextApproverName = "";
    let nextRole = "";

    if (currentRole === 'karyawan') {
      nextApproverName = doc.namaAtasan;
      nextRole = "Supervisor / Atasan Langsung";
    } else if (currentRole === 'atasan') {
      nextApproverName = doc.namaPicApd;
      nextRole = "PIC APD / HSE Specialist";
    }

    if (!nextApproverName) return;

    const foundUser = allUsers.find(u => u.nama.toLowerCase().trim() === nextApproverName.toLowerCase().trim());
    if (foundUser && foundUser.email) {
      try {
        const appUrl = window.location.origin;
        const approveUrl = `${appUrl}/?view=pengajuan_menu&tab=archive&docId=${doc.id}&docType=BAKT`;
        await fetch('/api/send-approval-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toEmail: foundUser.email,
            approverName: foundUser.nama,
            docType: 'BAKT',
            docNumber: doc.docNumber || doc.id,
            createdBy: doc.createdBy || 'Karyawan',
            createdAt: doc.tanggalPengajuan || doc.createdAt || new Date().toISOString().split('T')[0],
            roleType: nextRole,
            approveUrl
          })
        });
      } catch (err) {
        console.error("Gagal kirim notifikasi", err);
      }
    }
  };

  // Save document to internal list
  const handleSaveDocument = async () => {
    if (!karyawanNama) {
      alert("Harap isi atau pilih nama karyawan terlebih dahulu.");
      return;
    }

    const threeReq = checkThreeImagesRequired(items);
    const newDoc: BaktDocument = {
      id: String(Date.now()),
      docNumber,
      costCentre,
      dept,
      karyawanNama,
      karyawanNik,
      branchSite,
      tanggalPengajuan,
      items,
      gambar1,
      gambar2: threeReq ? gambar2 : "",
      gambar3: threeReq ? gambar3 : "",
      keteranganLain,
      lokasiTtd,
      namaAtasan,
      namaPicApd,
      createdAt: new Date().toISOString(),
      createdBy: userRealName,
      ttdKaryawan: ttdKaryawan || "",
      ttdAtasan: ttdAtasan || "",
      ttdPic: ttdPic || ""
    };

    try {
      await fetch('/api/bakt/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDoc)
      });
    } catch (err) {
      console.warn("Gagal menyimpan ke server, menyimpan secara lokal", err);
    }

    const updatedArchive = [newDoc, ...savedDocs];
    setSavedDocs(updatedArchive);
    localStorage.setItem('bakt_apd_archives', JSON.stringify(updatedArchive));
    alert(`Dokumen Berita Acara ${docNumber} berhasil disimpan ke arsip server!`);
    setActiveTab('archive');

    // Notify next recipient
    if (newDoc.ttdKaryawan) {
      await notifyNextApprover(newDoc, 'karyawan');
    } else {
      await notifyFirstCreator(newDoc);
    }
    
    // reset form fields & signatures
    setTtdKaryawan('');
    setTtdAtasan('');
    setTtdPic('');
  };

  const handleLoadFromArchive = (doc: BaktDocument) => {
    setSelectedArchiveDoc(doc);
  };

  const handleLoadToForm = (doc: BaktDocument) => {
    setDocNumber(doc.docNumber);
    setCostCentre(doc.costCentre);
    setDept(doc.dept);
    setKaryawanNama(doc.karyawanNama);
    setKaryawanNik(doc.karyawanNik);
    setBranchSite(doc.branchSite);
    setTanggalPengajuan(doc.tanggalPengajuan);
    setItems(doc.items);
    setGambar1(doc.gambar1);
    setGambar2(doc.gambar2);
    setGambar3(doc.gambar3);
    setKeteranganLain(doc.keteranganLain);
    setLokasiTtd(doc.lokasiTtd);
    setNamaAtasan(doc.namaAtasan);
    setNamaPicApd(doc.namaPicApd);
    setTtdKaryawan(doc.ttdKaryawan || '');
    setTtdAtasan(doc.ttdAtasan || '');
    setTtdPic(doc.ttdPic || '');
    setActiveTab('form');
    setSelectedArchiveDoc(null);
  };

  const handleDeleteArchive = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Apakah Anda yakin ingin menghapus dokumen berita acara terpilih ini dari arsip?")) return;
    
    try {
      await fetch(`/api/bakt/delete/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn("Gagal menghapus dari server");
    }

    const remaining = savedDocs.filter(doc => doc.id !== id);
    setSavedDocs(remaining);
    localStorage.setItem('bakt_apd_archives', JSON.stringify(remaining));
    if (selectedArchiveDoc?.id === id) {
      setSelectedArchiveDoc(null);
    }
  };

  const handleExportDraftsToExcel = (docsToExport: BaktDocument[]) => {
    if (!docsToExport || docsToExport.length === 0) {
      alert("Tidak ada dokumen draft BAKT tersimpan untuk diekspor.");
      return;
    }

    const headers = [
      "No",
      "No. Berita Acara (BAKT)",
      "Dibuat Oleh",
      "Nama Karyawan Pemohon",
      "NIK Karyawan",
      "Departemen",
      "Cost Centre",
      "Branch / Site",
      "Tanggal Pengajuan",
      "Waktu Disimpan (Draft)",
      "Daftar Barang (APD)",
      "Total Qty Barang",
      "Nama Atasan Direct",
      "Nama PIC APD",
      "Keterangan Lain"
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
          const parts = [`${i + 1}. ${item.itemName || 'Barang'} (${item.qty || 1} Pcs)`];
          if (item.tanggalTerakhir) parts.push(`Tgl Terakhir: ${item.tanggalTerakhir}`);
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
        doc.karyawanNama || "-",
        doc.karyawanNik || "-",
        doc.dept || "-",
        doc.costCentre || "-",
        doc.branchSite || "-",
        doc.tanggalPengajuan || "-",
        formattedCreatedAt,
        itemsSummary || "-",
        totalQty,
        doc.namaAtasan || "-",
        doc.namaPicApd || "-",
        doc.keteranganLain || "-"
      ];

      csvRows.push(row.map(escapeCsv).join(","));
    });

    const BOM = "\uFEFF";
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(BOM + csvRows.join("\r\n"));

    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    const dateStr = new Date().toISOString().split("T")[0];
    link.setAttribute("download", `Daftar_Draft_BAKT_APD_Tersimpan_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format Date for Print Section
  const formatTanggalBAKT = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      const months = [
        "January", "February", "March", "April", "May", "June", 
        "July", "August", "September", "October", "November", "December"
      ];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch(e) {
      return dateStr;
    }
  };

  const getSignaturePreviewSrc = (url: string) => {
    if (!url) return '';
    if (url.startsWith('data:')) return url;
    return `/api/drive-proxy?url=${encodeURIComponent(url)}`;
  };

  const handleSignDocument = async (roleType: 'karyawan' | 'atasan' | 'pic') => {
    if (!userTtdUrl) {
      alert("Anda belum memiliki tanda tangan disimpan. Silakan buat dahulu melalui tombol 'Tanda Tangan Saya' di bagian atas halaman.");
      return;
    }

    let targetName = "";
    if (selectedArchiveDoc) {
      if (roleType === 'karyawan') targetName = selectedArchiveDoc.karyawanNama;
      else if (roleType === 'atasan') targetName = selectedArchiveDoc.namaAtasan;
      else if (roleType === 'pic') targetName = selectedArchiveDoc.namaPicApd;
    } else {
      if (roleType === 'karyawan') targetName = karyawanNama;
      else if (roleType === 'atasan') targetName = namaAtasan;
      else if (roleType === 'pic') targetName = namaPicApd;
    }

    if (!targetName) return;

    // Enforce approval authority (Requirement 4)
    if (targetName.toLowerCase().trim() !== userRealName.toLowerCase().trim()) {
      alert(`Persetujuan Ditolak! Hanya "${targetName}" yang berwenang memberikan ttd pada kolom ini.\nNama login Anda: "${userRealName}".`);
      return;
    }

    if (selectedArchiveDoc) {
      // Signing an archived document
      const updatedDoc = { ...selectedArchiveDoc };
      if (roleType === 'karyawan') {
        updatedDoc.ttdKaryawan = userTtdUrl;
      } else if (roleType === 'atasan') {
        updatedDoc.ttdAtasan = userTtdUrl;
      } else if (roleType === 'pic') {
        updatedDoc.ttdPic = userTtdUrl;
      }

      try {
        await fetch('/api/bakt/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedDoc)
        });
      } catch (err) {
        console.warn("Gagal mengupdate tanda tangan di server", err);
      }

      const updatedDocs = savedDocs.map(d => d.id === selectedArchiveDoc.id ? updatedDoc : d);
      setSavedDocs(updatedDocs);
      localStorage.setItem('bakt_apd_archives', JSON.stringify(updatedDocs));
      setSelectedArchiveDoc(updatedDoc);
      alert("Tanda tangan otomatis Anda berhasil disematkan!");

      // Update and notify the next chain of commands
      await notifyNextApprover(updatedDoc, roleType);
    } else {
      // Signing the active form draft
      if (roleType === 'karyawan') {
        setTtdKaryawan(userTtdUrl);
      } else if (roleType === 'atasan') {
        setTtdAtasan(userTtdUrl);
      } else if (roleType === 'pic') {
        setTtdPic(userTtdUrl);
      }
      alert("Tanda tangan berhasil ditempelkan di draf aktif!");
    }
  };

  // Dynamic Trigger to open browser native print dialog
  const handlePrint = () => {
    let isInIframe = false;
    try {
      isInIframe = window.self !== window.top;
    } catch (e) {
      isInIframe = true;
    }

    if (isInIframe) {
      setPrintNoticeOpen(true);
    }

    try {
      window.focus();
      window.print();
    } catch (e) {
      console.warn("Pencetakan diblokir di sandbox iframe:", e);
    }
  };

  // Active Document to display in the Print Mockup
  const activePrintTarget: BaktDocument = selectedArchiveDoc || {
    id: 'draft',
    docNumber,
    costCentre,
    dept,
    karyawanNama: karyawanNama || '............................',
    karyawanNik: karyawanNik || '............................',
    branchSite,
    tanggalPengajuan,
    items,
    gambar1,
    gambar2,
    gambar3,
    keteranganLain,
    lokasiTtd,
    namaAtasan,
    namaPicApd,
    createdAt: ''
  };

  const employeeApdHistory = useMemo(() => {
    if (!karyawanNama || !dataOrderHistory.length) return [];
    const normEmp = karyawanNama.toLowerCase().trim().replace(/\s+/g, ' ');
    return dataOrderHistory.filter((item: any) => {
      const isApd = item.kategori && item.kategori.toLowerCase().trim() === 'apd';
      const isBarangKeluar = item.jenis && item.jenis.toLowerCase().trim() === 'barang keluar';
      const normKet = item.keterangan ? item.keterangan.toLowerCase().trim().replace(/\s+/g, ' ') : '';
      return isApd && isBarangKeluar && normKet === normEmp;
    });
  }, [karyawanNama, dataOrderHistory]);

  const filteredEmployees = useMemo(() => {
    const search = employeeSearch.toLowerCase().trim();
    if (!search) return karyawanList.slice(0, 30);
    return karyawanList
      .filter(emp => emp.nama.toLowerCase().includes(search) || emp.nik.toLowerCase().includes(search))
      .slice(0, 30);
  }, [karyawanList, employeeSearch]);

  return (
    <div className="space-y-6">
      
      {/* Tab bar header (Hidden on print) */}
      <div className="print:hidden">
        <PageHeader
          title="Pengajuan BAKT APD"
          subtitle="Sistem pengisian Berita Acara Kerusakan / Penggantian Alat Pelindung Diri (BAKT APD) dengan penataan format baku siap print / PDF."
          onBack={onBack}
          icon={<FileText className="h-6 w-6 text-indigo-600" />}
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setActiveTab('form'); setSelectedArchiveDoc(null); }}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition border cursor-pointer ${
                  activeTab === 'form' && !selectedArchiveDoc
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                    : 'bg-white border-slate-250 hover:bg-slate-50 text-slate-700'
                }`}
              >
                Form Input Baru
              </button>
              
              <button
                onClick={() => { setActiveTab('archive'); setSelectedArchiveDoc(null); }}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition border relative cursor-pointer ${
                  activeTab === 'archive' && !selectedArchiveDoc
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                    : 'bg-white border-slate-250 hover:bg-slate-50 text-slate-705'
                }`}
              >
                Arsip Dokumen
                {savedDocs.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white font-black text-[9px] h-4 min-w-4 px-1 flex items-center justify-center rounded-full">
                    {savedDocs.length}
                  </span>
                )}
              </button>
            </div>
          }
        />
      </div>

      {/* Main Split Interface Area (Hidden in document print) */}
      <div className="print:hidden grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Input form tools or archived selection */}
        <div className="lg:col-span-5 space-y-6">
          
          {selectedArchiveDoc ? (
            /* VIEW ARCHIVE SELECTION HEADER BANNER */
            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl space-y-3">
              <span className="bg-indigo-600 text-white text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full uppercase">
                Meninjau Arsip
              </span>
              <div>
                <h3 className="text-xs font-bold text-slate-800 font-mono text-[11px]">{selectedArchiveDoc.docNumber}</h3>
                <h4 className="text-sm font-black text-slate-905">{selectedArchiveDoc.karyawanNama} ({selectedArchiveDoc.karyawanNik})</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Disimpan pada: {new Date(selectedArchiveDoc.createdAt).toLocaleString('id-ID')}</p>
              </div>

              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 transition font-bold rounded-lg text-xs"
                >
                  <Printer className="h-3.5 w-3.5" /> Cetak Dokumen ini
                </button>
                <button
                  onClick={() => handleLoadToForm(selectedArchiveDoc)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-300 hover:bg-indigo-50 text-indigo-700 transition font-bold rounded-lg text-xs"
                >
                  <Save className="h-3.5 w-3.5" /> Edit/Salin ke Form
                </button>
                <button
                  onClick={() => setSelectedArchiveDoc(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 transition text-slate-700 font-bold rounded-lg text-xs"
                >
                  Kembali ke Daftar
                </button>
              </div>
            </div>
          ) : activeTab === 'archive' ? (
            /* ARCHIVE LIST TAB CONTAINER */
            (() => {
              const baseDocs = savedDocs;

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

              const query = archiveSearch.toLowerCase().trim();
              const displayedDocs = baseDocs.filter((doc) => {
                if (query) {
                  const num = (doc.docNumber || "").toLowerCase();
                  const nama = (doc.karyawanNama || "").toLowerCase();
                  const nik = (doc.karyawanNik || "").toLowerCase();
                  const creator = (doc.createdBy || "").toLowerCase();
                  const dept = (doc.dept || "").toLowerCase();
                  const itemsStr = (doc.items || []).map(i => i.itemName || "").join(" ").toLowerCase();
                  const matches = num.includes(query) || nama.includes(query) || nik.includes(query) || creator.includes(query) || dept.includes(query) || itemsStr.includes(query);
                  if (!matches) return false;
                }

                if (archiveStartDate || archiveEndDate) {
                  const docIsoDate = parseToIsoDate(doc.tanggalPengajuan, doc.createdAt);
                  if (docIsoDate) {
                    if (archiveStartDate && docIsoDate < archiveStartDate) return false;
                    if (archiveEndDate && docIsoDate > archiveEndDate) return false;
                  }
                }

                return true;
              });

              return (
                <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Daftar Dokumen BAKT Tersimpan</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Laporan &amp; draft Berita Acara APD tersimpan dalam sistem</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleExportDraftsToExcel(displayedDocs)}
                        disabled={displayedDocs.length === 0}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white disabled:text-slate-400 text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer disabled:cursor-not-allowed"
                        title="Unduh rekap daftar draft BAKT tersimpan ke format Excel (CSV)"
                      >
                        <Download className="h-4 w-4" />
                        <span>Export Excel</span>
                      </button>
                      <span className="bg-slate-100 font-bold font-mono text-slate-600 text-xs px-2.5 py-1 rounded-lg">
                        Total {displayedDocs.length}
                      </span>
                    </div>
                  </div>

                  {/* Filter controls: Search and Date Range Filter */}
                  <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
                    {/* Search Bar */}
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={archiveSearch}
                        onChange={(e) => setArchiveSearch(e.target.value)}
                        placeholder="Cari No BAKT, Pemohon, NIK, Pembuat, atau Jenis APD..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                      />
                    </div>

                    {/* Rentang Tanggal Filter */}
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

                      {(archiveStartDate || archiveEndDate || archiveSearch) && (
                        <button
                          type="button"
                          onClick={() => {
                            setArchiveStartDate('');
                            setArchiveEndDate('');
                            setArchiveSearch('');
                          }}
                          className="px-2 py-1 bg-slate-200 hover:bg-rose-100 text-slate-600 hover:text-rose-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ml-1"
                          title="Reset Filter"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Reset</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {displayedDocs.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 space-y-2">
                      <FileText className="h-10 w-10 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold">Arsip Masih Kosong</p>
                      <p className="text-[10px] text-slate-400 leading-normal max-w-xs mx-auto">
                        Anda belum menyimpan pengajuan apapun. Pastikan Anda menekan tombol ketuk &quot;Simpan ke Arsip&quot; di bawah form pengisian.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                      {displayedDocs.map((doc) => (
                        <div
                          key={doc.id}
                          onClick={() => handleLoadFromArchive(doc)}
                          className="group p-4 bg-slate-50/50 hover:bg-indigo-50/45 border border-slate-200 hover:border-indigo-300 rounded-2xl cursor-pointer transition duration-150 flex items-start justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="bg-indigo-100 text-indigo-805 font-mono text-[8px] font-black px-1.5 py-0.5 rounded-md">
                                {doc.docNumber.split('/')[0]}
                              </span>
                              {userRole === 'admin' && doc.createdBy && (
                                <span className="bg-emerald-150/40 text-emerald-900 font-mono text-[8px] font-bold px-1.5 py-0.5 rounded-md">
                                  Oleh: {doc.createdBy}
                                </span>
                              )}
                            </div>
                            <h4 className="text-xs font-black text-slate-800 tracking-tight leading-snug group-hover:text-indigo-900">
                              {doc.karyawanNama}
                            </h4>
                            <p className="text-[10px] text-slate-500 font-mono">
                              NIK: {doc.karyawanNik} &bull; {doc.dept}
                            </p>
                            <p className="text-[9px] text-slate-400 flex items-center gap-1 pt-1">
                              <Clock className="h-2.5 w-2.5" />
                              {new Date(doc.createdAt).toLocaleDateString('id-ID')}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleLoadFromArchive(doc); }}
                              className="p-1.5 bg-white text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg border border-slate-200 transition"
                              title="Tinjau PDF"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteArchive(doc.id, e)}
                              className="p-1.5 bg-white text-rose-600 hover:bg-rose-100 rounded-lg border border-rose-100 transition"
                              title="Hapus"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            /* DYNAMIC FORM BUILDER PANEL */
            <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-5 shadow-sm">
              <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
                <span className="text-xs font-black text-slate-700 uppercase tracking-widest">
                  1. Data Pelapor & Dokumen
                </span>
                <span className="bg-amber-100 text-amber-800 font-bold text-[9px] px-2 py-0.5 rounded-full uppercase">
                  Format Baku
                </span>
              </div>

              {/* Autocomplete / Selection employee search */}
              <div className="space-y-1 relative">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Nama Karyawan
                  </label>
                  <button
                    type="button"
                    disabled={!karyawanNama}
                    onClick={() => {
                      setExpandedHistoryGroup(null);
                      setShowHistoryModal(true);
                    }}
                    className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition duration-200 border ${
                      karyawanNama 
                        ? 'bg-indigo-50 hover:bg-slate-900 hover:text-white hover:border-slate-900 text-indigo-700 border-indigo-150 cursor-pointer shadow-sm animate-pulse'
                        : 'bg-slate-50 text-slate-400 border-slate-205 cursor-not-allowed'
                    }`}
                    title={karyawanNama ? "Lihat riwayat pengambilan APD" : "Pilih karyawan terlebih dahulu"}
                  >
                    <Clock className="h-3 w-3 shrink-0" />
                    History Pengambilan APD
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={employeeSearch}
                    onChange={(e) => {
                      setEmployeeSearch(e.target.value);
                      setKaryawanNama(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Ketik/Pilih Nama Karyawan..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-205 focus:border-indigo-500 rounded-xl text-xs font-bold outline-none font-sans"
                  />
                </div>
                
                {showDropdown && filteredEmployees.length > 0 && (
                  <div className="absolute z-30 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 shadow-xl rounded-xl p-1.5 space-y-0.5">
                    {filteredEmployees.map((emp) => (
                      <button
                        key={emp.nama}
                        type="button"
                        onClick={() => selectEmployee(emp)}
                        className="w-full text-left p-2.5 hover:bg-indigo-50/60 hover:text-indigo-950 text-xs font-bold rounded-lg flex items-center justify-between transition-colors border-b last:border-0 border-slate-50"
                      >
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-3.5 w-3.5 text-indigo-550" />
                          <span>{emp.nama}</span>
                        </div>
                        <span className="text-[9px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                          {emp.nik}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Dynamic last APD reference based on sheet Data Order */}
              {karyawanNama && (
                <div className="bg-gradient-to-r from-emerald-50/80 to-teal-50/40 border border-emerald-100/80 p-3.5 rounded-2xl space-y-2 mt-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-emerald-950">
                      <Clock className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="text-[10px] font-black uppercase tracking-wider">
                        Riwayat APD Terakhir ({karyawanNama})
                      </span>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest">
                      Kategori APD
                    </span>
                  </div>

                  {latestApdInfo ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div className="bg-white/90 backdrop-blur-sm p-2 rounded-xl border border-emerald-100/50 shadow-sm">
                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block leading-none mb-1">
                          APD Terakhir
                        </span>
                        <span className="font-bold text-slate-800 truncate block">
                          {latestApdInfo.barang}
                        </span>
                      </div>
                      <div className="bg-white/90 backdrop-blur-sm p-2 rounded-xl border border-emerald-100/50 shadow-sm font-mono text-[11px]">
                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block leading-none mb-1 font-sans">
                          Tanggal Pengeluaran Terakhir
                        </span>
                        <span className="font-bold text-slate-800 block">
                          {latestApdInfo.tanggal}
                        </span>
                      </div>
                      <div className="bg-white/90 backdrop-blur-sm p-2 rounded-xl border border-emerald-100/50 shadow-sm">
                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block leading-none mb-1">
                          Jumlah
                        </span>
                        <span className="font-bold text-slate-800 block">
                          {latestApdInfo.jumlah} Pcs
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/50 p-2.5 rounded-xl border border-dashed border-emerald-200/60 text-center">
                      <span className="text-slate-500 text-[10px] font-bold">
                        Belum ada riwayat pengeluaran APD tercatat di Data Order untuk karyawan ini.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* NIK and Dept Input fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    NIK Karyawan
                  </label>
                  <input
                    type="text"
                    value={karyawanNik}
                    onChange={(e) => setKaryawanNik(e.target.value)}
                    placeholder="Contoh: 9010"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Departemen
                  </label>
                  <input
                    type="text"
                    value={dept}
                    onChange={(e) => setDept(e.target.value)}
                    placeholder="Contoh: Mekanik M3"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>
              </div>

              {/* Cost center and site site */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Cost Centre
                  </label>
                  <input
                    type="text"
                    value={costCentre}
                    onChange={(e) => setCostCentre(e.target.value)}
                    placeholder="Isi jika ada"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Branch / Site
                    </label>
                    <span className="text-[9px] text-slate-400 font-semibold">3 Site</span>
                  </div>
                  <div className="flex gap-1 mb-1 flex-wrap">
                    {[
                      { label: 'ITU-Admo', full: 'ITU - Site Admo (SIS Adaro)' },
                      { label: 'ITU-MMI', full: 'ITU - Site MMI' },
                      { label: 'ITU-Vale', full: 'ITU - Site Vale' }
                    ].map(s => (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => setBranchSite(s.full)}
                        className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold border transition cursor-pointer ${
                          branchSite.includes(s.label) || branchSite === s.full
                            ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>
              </div>

              {/* No Document & Tanggal bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    No. Berita Acara
                  </label>
                  <input
                    type="text"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold font-mono text-indigo-700 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    Tanggal Pengajuan
                  </label>
                  <input
                    type="date"
                    value={tanggalPengajuan}
                    onChange={(e) => setTanggalPengajuan(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div id="tabel-apd-section" className="border-t border-slate-100 pt-4 space-y-3 scroll-mt-6">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-slate-705 uppercase tracking-widest">
                    2. Tabel Alat Pelindung Diri
                  </span>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-[10px] flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Tambah Baris
                  </button>
                </div>

                <div className="space-y-3.5 max-h-48 overflow-y-auto pr-1">
                  {items.map((it, idx) => (
                    <div key={it.id} className="relative p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <div className="absolute top-2 right-2 flex items-center gap-1.5">
                        <span className="bg-slate-200 text-slate-700 font-black text-[9px] px-1.5 rounded-md font-mono">
                          #{it.id}
                        </span>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(it.id)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                            title="Hapus baris"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Item description */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Nama Item Safety (Klik 2x / ketik untuk memilih)</label>
                        <input
                          type="text"
                          list="bakt-apd-masters"
                          value={it.itemName}
                          onChange={(e) => handleUpdateItem(it.id, 'itemName', e.target.value)}
                          placeholder="Pilih atau cari dari Master APD..."
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-indigo-500/30 font-semibold"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3.5">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Jumlah (QTY)</label>
                          <input
                            type="number"
                            min="1"
                            value={it.qty}
                            onChange={(e) => handleUpdateItem(it.id, 'qty', parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Tarif Terima Terakhir</label>
                          <input
                            type="date"
                            value={it.tanggalTerakhir}
                            onChange={(e) => handleUpdateItem(it.id, 'tanggalTerakhir', e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3.5">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Lama Pemakaian</label>
                          <input
                            type="text"
                            value={it.lamaPemakaian}
                            onChange={(e) => handleUpdateItem(it.id, 'lamaPemakaian', e.target.value)}
                            placeholder="cth: 1 Tahun 4 Bulan"
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Detail Alasan Cacat</label>
                          <input
                            type="text"
                            value={it.keterangan}
                            onChange={(e) => handleUpdateItem(it.id, 'keterangan', e.target.value)}
                            placeholder="cth: Samping terbuka, robek"
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Shared datalist for safety items */}
                <datalist id="bakt-apd-masters">
                  {masterApdList.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>

              </div>

              {/* Gambar / Foto Bukti attachments slots */}
              <div className="border-t border-slate-100 pt-4 space-y-4">
                <span className="text-xs font-black text-slate-705 uppercase tracking-widest block">
                  3. Unggah Lampiran Visual Bukti
                </span>

                {(() => {
                  const isThreeReq = checkThreeImagesRequired(items);
                  return (
                    <>
                      {/* SLOT 1 */}
                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-600">
                            {isThreeReq ? "Gambar 1: Foto grafir NIK" : "Gambar Bukti"}
                          </span>
                          {gambar1 && (
                            <div className="flex items-center gap-2">
                              <button 
                                type="button"
                                onClick={() => handleOpenEditor(1, gambar1)}
                                className="text-[9.5px] font-extrabold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-0.5 cursor-pointer"
                              >
                                <Crop className="h-3 w-3" /> Potong & Zoom Out
                              </button>
                              <span className="text-slate-300">|</span>
                              <button 
                                type="button"
                                onClick={() => setGambar1('')}
                                className="text-[9.5px] font-bold text-rose-600 hover:underline cursor-pointer"
                              >
                                Hapus
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {gambar1 ? (
                          <div className="relative aspect-video rounded-xl overflow-hidden border">
                            <img src={gambar1} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="relative border border-dashed border-slate-300 rounded-xl p-4 bg-white text-center hover:bg-slate-100 transition">
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={(e) => handleImageFileChange(e, 1)}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full" 
                            />
                            <Upload className={`h-5 w-5 mx-auto ${isUploading1 ? 'text-indigo-550 animate-bounce' : 'text-slate-400'}`} />
                            <p className="text-[10px] text-slate-500 font-bold mt-1">
                              {isUploading1 ? 'Mengompres...' : 'Ketuk untuk Unggah / Drop Foto'}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* SLOT 2 */}
                      {isThreeReq && (
                        <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl space-y-2 animate-in fade-in duration-200">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-600">Gambar 2: Kode Produksi (Bagian Bawah)</span>
                            {gambar2 && (
                              <div className="flex items-center gap-2">
                                <button 
                                  type="button"
                                  onClick={() => handleOpenEditor(2, gambar2)}
                                  className="text-[9.5px] font-extrabold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-0.5 cursor-pointer"
                                >
                                  <Crop className="h-3 w-3" /> Potong & Zoom Out
                                </button>
                                <span className="text-slate-300">|</span>
                                <button 
                                  type="button"
                                  onClick={() => setGambar2('')}
                                  className="text-[9.5px] font-bold text-rose-600 hover:underline cursor-pointer"
                                >
                                  Hapus
                                </button>
                              </div>
                            )}
                          </div>
                          
                          {gambar2 ? (
                            <div className="relative aspect-video rounded-xl overflow-hidden border">
                              <img src={gambar2} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="relative border border-dashed border-slate-300 rounded-xl p-4 bg-white text-center hover:bg-slate-100 transition">
                              <input 
                                type="file" 
                                accept="image/*"
                                onChange={(e) => handleImageFileChange(e, 2)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full" 
                              />
                              <Upload className={`h-5 w-5 mx-auto ${isUploading2 ? 'text-indigo-550 animate-bounce' : 'text-slate-400'}`} />
                              <p className="text-[10px] text-slate-500 font-bold mt-1">
                                {isUploading2 ? 'Mengompres...' : 'Ketuk untuk Unggah / Drop Foto'}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* SLOT 3 */}
                      {isThreeReq && (
                        <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl space-y-2 animate-in fade-in duration-200">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-600">Gambar 3: Bagian sepatu yang rusak</span>
                            {gambar3 && (
                              <div className="flex items-center gap-2">
                                <button 
                                  type="button"
                                  onClick={() => handleOpenEditor(3, gambar3)}
                                  className="text-[9.5px] font-extrabold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-0.5 cursor-pointer"
                                >
                                  <Crop className="h-3 w-3" /> Potong & Zoom Out
                                </button>
                                <span className="text-slate-300">|</span>
                                <button 
                                  type="button"
                                  onClick={() => setGambar3('')}
                                  className="text-[9.5px] font-bold text-rose-600 hover:underline cursor-pointer"
                                >
                                  Hapus
                                </button>
                              </div>
                            )}
                          </div>
                          
                          {gambar3 ? (
                            <div className="relative aspect-video rounded-xl overflow-hidden border">
                              <img src={gambar3} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="relative border border-dashed border-slate-300 rounded-xl p-4 bg-white text-center hover:bg-slate-100 transition">
                              <input 
                                type="file" 
                                accept="image/*"
                                onChange={(e) => handleImageFileChange(e, 3)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full" 
                              />
                              <Upload className={`h-5 w-5 mx-auto ${isUploading3 ? 'text-indigo-550 animate-bounce' : 'text-slate-400'}`} />
                              <p className="text-[10px] text-slate-500 font-bold mt-1">
                                {isUploading3 ? 'Mengompres...' : 'Ketuk untuk Unggah / Drop Foto'}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Other parameters */}
              <div className="border-t border-slate-100 pt-4 space-y-4">
                <span className="text-xs font-black text-slate-705 uppercase tracking-widest block">
                  4. Penutup & Tanda Tangan
                </span>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Keterangan lain-lain
                  </label>
                  <textarea
                    value={keteranganLain}
                    onChange={(e) => setKeteranganLain(e.target.value)}
                    rows={2}
                    placeholder="Contoh: Safety Shoes bagian samping kiri terbuka..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-202 focus:border-indigo-500 rounded-xl text-xs font-semibold outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Tempat / Lokasi</label>
                    <input
                      type="text"
                      value={lokasiTtd}
                      onChange={(e) => setLokasiTtd(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Nama SPV / Atasan</label>
                    <select
                      value={namaAtasan}
                      onChange={(e) => setNamaAtasan(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none"
                    >
                      <option value="">-- Pilih Atasan --</option>
                      {allUsers.map((u, ui) => (
                        <option key={ui} value={u.nama}>{u.nama}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase">Nama PIC APD</label>
                    <select
                      value={namaPicApd}
                      onChange={(e) => setNamaPicApd(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none"
                    >
                      <option value="">-- Pilih PIC APD --</option>
                      {allUsers.map((u, ui) => (
                        <option key={ui} value={u.nama}>{u.nama}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Triggers */}
              <div className="border-t border-slate-100 pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handleSaveDocument}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition shadow flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Save className="h-4 w-4" /> Simpan ke Arsip
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition shadow flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="h-4 w-4" /> Cetak / Save PDF
                </button>
              </div>

            </div>
          )}

          {/* Online Signature Action Panel */}
          <div className="bg-slate-900 border border-slate-800 text-white p-5 rounded-3xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[9px] bg-indigo-600/30 text-indigo-400 font-extrabold px-2.5 py-0.5 rounded uppercase tracking-wider">
                Online Approval Panel
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Bakt APD</span>
            </div>
            
            <div className="space-y-1">
              <h4 className="text-xs font-black tracking-tight">Bubuhkan Tanda Tangan Digitamu</h4>
              <p className="text-[10px] text-slate-400">Pilih slot persetujuan di bawah untuk menempelkan tanda tangan resmi Anda pada dokumen.</p>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => handleSignDocument('karyawan')}
                className="p-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700/50 rounded-xl text-center transition flex flex-col justify-center items-center gap-1 text-xs font-bold text-white cursor-pointer"
              >
                <span>Diajukan</span>
                <span className="text-[8.5px] font-normal text-slate-400">(Karyawan)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSignDocument('atasan')}
                className="p-2.5 bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-900/60 rounded-xl text-center transition flex flex-col justify-center items-center gap-1 text-xs font-bold text-emerald-400 cursor-pointer"
              >
                <span>Diketahui</span>
                <span className="text-[8.5px] font-normal text-emerald-500">(Supervisor)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSignDocument('pic')}
                className="p-2.5 bg-amber-950/40 hover:bg-amber-900/40 border border-amber-900/60 rounded-xl text-center transition flex flex-col justify-center items-center gap-1 text-xs font-bold text-amber-400 cursor-pointer"
              >
                <span>Diperiksa</span>
                <span className="text-[8.5px] font-normal text-amber-500">(PIC APD)</span>
              </button>
            </div>
            
            {!userTtdUrl && (
              <p className="text-[10px] text-amber-300 leading-normal font-bold bg-amber-955/40 p-2.5 rounded-xl border border-amber-900/30">
                ⚠️ Anda belum mengatur tanda tangan digital Anda. Silakan isi terlebih dahulu lewat tombol &quot;Tanda Tangan Saya&quot; di header atas.
              </p>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: REAL-TIME PREMIUM WYSIWYG PRINT PREVIEW FOR A4 */}
        <div className="lg:col-span-7 bg-slate-100 border border-slate-200 rounded-3xl p-4 lg:p-6 overflow-hidden flex flex-col items-center">
          
          <div className="w-full flex items-center justify-between mb-4 shrink-0">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" /> Live Preview Lembar Cetak (Format Resmi)
            </span>
            <button
              onClick={handlePrint}
              className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-extrabold text-[11px] rounded-lg flex items-center gap-1 shadow-sm transition"
            >
              <Printer className="h-3 w-3" /> Buka Cetak Sistem
            </button>
          </div>

          {/* Interactive Document Area Simulation */}
          <div className="w-full overflow-x-auto pr-1">
            <div className="w-[660px] bg-white border border-slate-350 mx-auto pointer-events-none select-none shadow-md overflow-hidden aspect-[1/1.41] p-6 text-slate-900 font-sans flex flex-col justify-between" style={{ fontSize: '11px' }}>
              
              {/* Core Sheet Render Wrapper to clone identical layout */}
              <div className="space-y-4">
                
                {/* 1. Header with Border Grid Frame */}
                <div className="border-2 border-slate-900 p-2 flex items-center justify-between gap-1">
                  {/* Left Column Logo */}
                  <img
                    src={hseLogo}
                    alt="Health Safety Logo"
                    className="h-10 object-contain"
                    referrerPolicy="no-referrer"
                  />

                  {/* Center title */}
                  <div className="text-center">
                    <h3 className="text-[11px] font-black tracking-wide text-slate-905 uppercase">
                      BERITA ACARA KERUSAKAN / PENGGANTIAN APD
                    </h3>
                    <p className="text-[9px] font-mono font-bold text-slate-600 mt-0.5">
                      NO: {activePrintTarget.docNumber}
                    </p>
                  </div>

                  {/* Right Column Logo */}
                  <img
                    src={companyLogo}
                    alt="PT INDOTRUCK UTAMA"
                    className="h-10 object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Meta details segment */}
                <div className="grid grid-cols-2 gap-4 text-[10px] pb-1 pt-1.5">
                  <div className="space-y-1.5">
                    <p className="flex items-start">
                      <span className="text-slate-500 w-24 shrink-0">Cost Centre</span>
                      <span className="text-slate-800 font-bold shrink-0 mr-1.5">:</span>
                      <span className="text-slate-800 font-bold flex-grow">{activePrintTarget.costCentre}</span>
                    </p>
                    <p className="flex items-start">
                      <span className="text-slate-500 w-24 shrink-0">Dept</span>
                      <span className="text-slate-800 font-bold shrink-0 mr-1.5">:</span>
                      <span className="text-slate-800 font-bold flex-grow">{activePrintTarget.dept}</span>
                    </p>
                    <p className="flex items-start">
                      <span className="text-slate-500 w-24 shrink-0">Karyawan</span>
                      <span className="text-slate-850 font-black shrink-0 mr-1.5">:</span>
                      <span className="text-slate-850 font-black flex-grow">{activePrintTarget.karyawanNama}</span>
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <p className="flex items-start">
                      <span className="text-slate-500 w-24 shrink-0">NIK</span>
                      <span className="text-slate-800 font-mono font-bold shrink-0 mr-1.5">:</span>
                      <span className="text-slate-800 font-mono font-bold flex-grow">{activePrintTarget.karyawanNik}</span>
                    </p>
                    <p className="flex items-start">
                      <span className="text-slate-500 w-24 shrink-0">Branch / Site</span>
                      <span className="text-slate-800 font-bold shrink-0 mr-1.5">:</span>
                      <span className="text-slate-800 font-bold flex-grow">{activePrintTarget.branchSite}</span>
                    </p>
                  </div>
                </div>

                {/* Sub instruction sentence */}
                <p className="text-[10px] text-slate-800 pt-1.5">
                  Pada hari ini, tanggal <b className="font-extrabold">{formatTanggalBAKT(activePrintTarget.tanggalPengajuan)}</b> mengajukan permintaan baru:
                </p>

                {/* Formal Data Items Table Grid */}
                <table className="w-full border-collapse border-2 border-slate-900 text-[9.5px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-black text-center border-b-2 border-slate-900">
                      <th className="border-r border-slate-900 p-1.5 w-[5%]">No</th>
                      <th className="border-r border-slate-900 p-1.5 w-[40%]">Safety Items</th>
                      <th className="border-r border-slate-900 p-1.5 w-[8%]">QTY</th>
                      <th className="border-r border-slate-900 p-1.5 w-[15%]">Tanggal Terima Terakhir</th>
                      <th className="border-r border-slate-900 p-1.5 w-[15%]">Lama Pemakaian (Tahun)</th>
                      <th className="p-1.5 w-[17%]">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activePrintTarget.items.map((it, i) => (
                      <tr key={it.id} className="border-b border-slate-900 last:border-0 text-center">
                        <td className="border-r border-slate-900 p-1.5 font-bold">{i + 1}</td>
                        <td className="border-r border-slate-900 p-1.5 text-left font-bold">{it.itemName || '-'}</td>
                        <td className="border-r border-slate-900 p-1.5 font-bold">{it.qty}</td>
                        <td className="border-r border-slate-900 p-1.5 font-mono">{formatTanggalBAKT(it.tanggalTerakhir)}</td>
                        <td className="border-r border-slate-900 p-1.5 font-bold">{it.lamaPemakaian || '-'}</td>
                        <td className="p-1.5 text-slate-700 italic">{it.keterangan || '-'}</td>
                      </tr>
                    ))}
                    {/* Fill padding rows up to 3 to keep layout sizing exact if short */}
                    {activePrintTarget.items.length < 3 && (
                      Array.from({ length: 3 - activePrintTarget.items.length }).map((_, index) => (
                        <tr key={`fill-${index}`} className="border-b border-slate-900 last:border-0 text-center opacity-25">
                          <td className="border-r border-slate-900 p-1.5 font-bold font-mono text-slate-400">{activePrintTarget.items.length + index + 1}</td>
                          <td className="border-r border-slate-900 p-1.5 text-left text-slate-450">-</td>
                          <td className="border-r border-slate-900 p-1.5 text-slate-450">-</td>
                          <td className="border-r border-slate-900 p-1.5 text-slate-450">-</td>
                          <td className="border-r border-slate-900 p-1.5 text-slate-450">-</td>
                          <td className="p-1.5 text-slate-450">-</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Visual Attachment Images Area */}
                <div className="border-2 border-slate-900 p-2 space-y-2">
                  <p className="font-extrabold text-[9px] uppercase tracking-wide text-slate-900">
                    Keterangan gambar
                  </p>

                  {(() => {
                    const isThreeReq = checkThreeImagesRequired(activePrintTarget.items);
                    return (
                      <div className={`grid ${isThreeReq ? 'grid-cols-3' : 'grid-cols-1 max-w-[200px] mx-auto'} gap-2.5`}>
                        {/* IMAGE SLOT 1 */}
                        <div className="border border-slate-400 p-1.5 rounded bg-slate-50 flex flex-col justify-between items-center text-center aspect-[4/3]">
                          <span className="text-[11px] font-black text-slate-900 mb-1 leading-snug">
                            {isThreeReq ? "Gambar 1: Foto grafir NIK" : "Gambar Bukti"}
                          </span>
                          {activePrintTarget.gambar1 ? (
                            <img src={activePrintTarget.gambar1} className="w-full h-16 object-contain rounded flex-grow" />
                          ) : (
                            <div className="flex-grow flex items-center justify-center w-full border border-dashed rounded text-slate-400 text-[8px] font-mono">
                              Belum ada Foto Bukti
                            </div>
                          )}
                        </div>

                        {/* IMAGE SLOT 2 */}
                        {isThreeReq && (
                          <div className="border border-slate-400 p-1.5 rounded bg-slate-50 flex flex-col justify-between items-center text-center aspect-[4/3] animate-in fade-in duration-200">
                            <span className="text-[11px] font-black text-slate-900 mb-1 leading-snug">
                              Gambar 2: Kode produksi (bagian bawah)
                            </span>
                            {activePrintTarget.gambar2 ? (
                              <img src={activePrintTarget.gambar2} className="w-full h-16 object-contain rounded" />
                            ) : (
                              <div className="flex-grow flex items-center justify-center w-full border border-dashed rounded text-slate-400 text-[8px] font-mono">
                                Belum ada Kode
                              </div>
                            )}
                          </div>
                        )}

                        {/* IMAGE SLOT 3 */}
                        {isThreeReq && (
                          <div className="border border-slate-400 p-1.5 rounded bg-slate-50 flex flex-col justify-between items-center text-center aspect-[4/3] animate-in fade-in duration-200">
                            <span className="text-[11px] font-black text-slate-900 mb-1 leading-snug">
                              Gambar 3: Bagian yang rusak
                            </span>
                            {activePrintTarget.gambar3 ? (
                              <img src={activePrintTarget.gambar3} className="w-full h-16 object-contain rounded" />
                            ) : (
                              <div className="flex-grow flex items-center justify-center w-full border border-dashed rounded text-slate-455 text-[8px] font-mono text-center">
                                Belum ada Bagian Rosak
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Additional Text Segment */}
                <div className="border-2 border-slate-900 border-t-0 p-2 space-y-1">
                  <p className="font-extrabold text-[9px] uppercase tracking-wide text-slate-900 leading-none">
                    Keterangan lain-lain:
                  </p>
                  <p className="text-[9.5px] text-slate-800 leading-normal italic bg-slate-50/50 p-1 rounded">
                    {activePrintTarget.keteranganLain || ".........................................................................................................................................................................."}
                  </p>
                </div>

                {/* Signatures Panel */}
                <div className="pt-4 flex flex-col items-end text-[9.5px]">
                  <p className="font-bold text-slate-800 text-right pr-4">
                    {activePrintTarget.lokasiTtd}, {formatTanggalBAKT(activePrintTarget.tanggalPengajuan)}
                  </p>

                  <div className="w-full grid grid-cols-3 text-center pt-3 pb-8">
                    <div className="flex flex-col items-center">
                      <p className="text-slate-500 font-bold mb-1">Diajukan oleh,</p>
                      <div className="h-[45px] flex items-center justify-center">
                        {activePrintTarget.ttdKaryawan ? (
                          <img
                            src={getSignaturePreviewSrc(activePrintTarget.ttdKaryawan)}
                            alt="Diajukan oleh"
                            className="h-full object-contain max-h-[45px]"
                            crossOrigin="anonymous"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          null
                        )}
                      </div>
                      <p className="font-black text-slate-850 underline uppercase mt-1">
                        ({activePrintTarget.karyawanNama})
                      </p>
                      <p className="text-[8.5px] text-slate-450 mt-0.5 font-bold">Karyawan</p>
                    </div>

                    <div className="flex flex-col items-center">
                      <p className="text-slate-500 font-bold mb-1">Diketahui Oleh,</p>
                      <div className="h-[45px] flex items-center justify-center">
                        {activePrintTarget.ttdAtasan ? (
                          <img
                            src={getSignaturePreviewSrc(activePrintTarget.ttdAtasan)}
                            alt="Diketahui oleh"
                            className="h-full object-contain max-h-[45px]"
                            crossOrigin="anonymous"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          null
                        )}
                      </div>
                      <p className="font-black text-slate-850 underline uppercase mt-1">
                        ({activePrintTarget.namaAtasan})
                      </p>
                      <p className="text-[8.5px] text-slate-450 mt-0.5 font-bold">SPV / Atasan</p>
                    </div>

                    <div className="flex flex-col items-center">
                      <p className="text-slate-500 font-bold mb-1">Diperiksa Oleh,</p>
                      <div className="h-[45px] flex items-center justify-center">
                        {activePrintTarget.ttdPic ? (
                          <img
                            src={getSignaturePreviewSrc(activePrintTarget.ttdPic)}
                            alt="Diperiksa oleh"
                            className="h-full object-contain max-h-[45px]"
                            crossOrigin="anonymous"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          null
                        )}
                      </div>
                      <p className="font-black text-slate-850 underline uppercase mt-1">
                        ({activePrintTarget.namaPicApd})
                      </p>
                      <p className="text-[8.5px] text-slate-450 mt-0.5 font-bold">PIC APD</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* QHESC Official Document Footer */}
              <div className="border-t border-slate-350 pt-2 text-center text-[8.5px] font-mono text-slate-500 flex justify-between items-center shrink-0">
                <span>No. Dokumen – QHESF – QHESC – 010 – 004/Rev01/04/2013</span>
                <span>Halaman 1 dari 1</span>
              </div>

            </div>
          </div>

          <p className="text-[10px] text-slate-400 mt-4 text-center max-w-sm">
            💡 <b>Tips PDF:</b> Di layar dialog cetak Sistem, pilih <b>&quot;Save as PDF&quot; (Simpan sebagai PDF)</b> dan atur Layout menjadi <b>Portrait</b> dengan margin <b>Default/None</b>.
          </p>
        </div>

      </div>

      {/* ======================= PRINT ONLY CONTAINER (COMPRESSED A4 SIZE) ======================= */}
      {/* This element is rendered hidden to the screen, but becomes the ONLY visible section during window.print() triggers */}
      <div className="hidden print:block printable-a4-area bg-white text-slate-900 font-sans animate-none" style={{ fontSize: '11px', lineHeight: '1.4' }}>
        
        <div className="h-full flex flex-col justify-between">
          <div className="space-y-4">
            
            {/* Header */}
            <div className="border-2 border-slate-900 p-2 flex items-center justify-between">
              <img
                src={hseLogo}
                alt="Health Safety Logo"
                className="h-11 object-contain"
                referrerPolicy="no-referrer"
              />

              <div className="text-center">
                <h3 className="text-[11px] font-black tracking-wide uppercase">
                  BERITA ACARA KERUSAKAN / PENGGANTIAN APD
                </h3>
                <p className="text-[10px] font-mono font-bold mt-0.5">
                  NO: {activePrintTarget.docNumber}
                </p>
              </div>

              <img
                src={companyLogo}
                alt="PT INDOTRUCK UTAMA"
                className="h-11 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-4 text-[10px] pt-2">
              <div className="space-y-1.5">
                <p className="flex items-start">
                  <span className="text-slate-550 w-24 shrink-0">Cost Centre</span>
                  <span className="font-bold shrink-0 mr-1.5">:</span>
                  <span className="font-bold flex-grow">{activePrintTarget.costCentre}</span>
                </p>
                <p className="flex items-start">
                  <span className="text-slate-550 w-24 shrink-0">Dept</span>
                  <span className="font-bold shrink-0 mr-1.5">:</span>
                  <span className="font-bold flex-grow">{activePrintTarget.dept}</span>
                </p>
                <p className="flex items-start">
                  <span className="text-slate-550 w-24 shrink-0">Karyawan</span>
                  <span className="font-black shrink-0 mr-1.5">:</span>
                  <span className="font-black flex-grow border-b border-black/20 break-words">{activePrintTarget.karyawanNama}</span>
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="flex items-start">
                  <span className="text-slate-550 w-24 shrink-0">NIK</span>
                  <span className="font-mono font-bold shrink-0 mr-1.5">:</span>
                  <span className="font-mono font-bold flex-grow break-words">{activePrintTarget.karyawanNik}</span>
                </p>
                <p className="flex items-start">
                  <span className="text-slate-550 w-24 shrink-0">Branch / Site</span>
                  <span className="font-bold shrink-0 mr-1.5">:</span>
                  <span className="font-bold flex-grow break-words">{activePrintTarget.branchSite}</span>
                </p>
              </div>
            </div>

            {/* Premise date info */}
            <p className="text-[10px] pt-2">
              Pada hari ini, tanggal <b>{formatTanggalBAKT(activePrintTarget.tanggalPengajuan)}</b> mengajukan permintaan baru:
            </p>

            {/* Safety Items Table */}
            <table className="w-full border-collapse border-2 border-slate-900 text-[10px]">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-extrabold text-center border-b-2 border-slate-900">
                  <th className="border-r border-slate-900 p-2 w-[5%]">No</th>
                  <th className="border-r border-slate-900 p-2 w-[40%]">Safety Items</th>
                  <th className="border-r border-slate-900 p-2 w-[8%]">QTY</th>
                  <th className="border-r border-slate-900 p-2 w-[15%]">Tanggal Terima Terakhir</th>
                  <th className="border-r border-slate-900 p-2 w-[15%]">Lama Pemakaian (Tahun)</th>
                  <th className="p-2 w-[17%]">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {activePrintTarget.items.map((it, i) => (
                  <tr key={it.id} className="border-b border-slate-900 last:border-0 text-center">
                    <td className="border-r border-slate-900 p-2 font-bold">{i + 1}</td>
                    <td className="border-r border-slate-900 p-2 text-left font-bold">{it.itemName || '-'}</td>
                    <td className="border-r border-slate-900 p-2 font-bold">{it.qty}</td>
                    <td className="border-r border-slate-900 p-2 font-mono">{formatTanggalBAKT(it.tanggalTerakhir)}</td>
                    <td className="border-r border-slate-900 p-2 font-bold">{it.lamaPemakaian || '-'}</td>
                    <td className="p-2 italic">{it.keterangan || '-'}</td>
                  </tr>
                ))}
                {activePrintTarget.items.length < 3 && (
                  Array.from({ length: 3 - activePrintTarget.items.length }).map((_, index) => (
                    <tr key={`print-fill-${index}`} className="border-b border-slate-900 last:border-0 text-center opacity-40">
                      <td className="border-r border-slate-900 p-2 font-bold font-mono text-slate-400">{activePrintTarget.items.length + index + 1}</td>
                      <td className="border-r border-slate-900 p-2 text-left">-</td>
                      <td className="border-r border-slate-900 p-2">-</td>
                      <td className="border-r border-slate-900 p-2">-</td>
                      <td className="border-r border-slate-900 p-2">-</td>
                      <td className="p-2">-</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Images layout matching picture */}
            <div className="border-2 border-slate-900 p-2 space-y-2">
              <p className="font-extrabold text-[9px] uppercase tracking-wide leading-none">
                Keterangan gambar
              </p>

              {(() => {
                const isThreeReq = checkThreeImagesRequired(activePrintTarget.items);
                return (
                  <div className={`grid ${isThreeReq ? 'grid-cols-3' : 'grid-cols-1 max-w-[240px] mx-auto'} gap-3`}>
                    {/* PHOTO 1 */}
                    <div className="border border-slate-400 p-2 rounded bg-slate-50 flex flex-col justify-between items-center text-center">
                      <span className="text-[11px] font-black text-slate-900 mb-1 leading-snug">
                        {isThreeReq ? "Gambar 1 : Foto grafir NIK" : "Gambar : Lampiran Foto Bukti"}
                      </span>
                      {activePrintTarget.gambar1 ? (
                        <img src={activePrintTarget.gambar1} className="w-full h-24 object-contain rounded" />
                      ) : (
                        <div className="h-24 w-full border border-dashed rounded flex items-center justify-center text-slate-400 text-[8px] font-mono">
                          Belum ada Foto Bukti
                        </div>
                      )}
                    </div>

                    {/* PHOTO 2 */}
                    {isThreeReq && (
                      <div className="border border-slate-400 p-2 rounded bg-slate-50 flex flex-col justify-between items-center text-center">
                        <span className="text-[11px] font-black text-slate-900 mb-1 leading-snug">
                           Gambar 2 : Kode produksi ( bagian bawah )
                        </span>
                        {activePrintTarget.gambar2 ? (
                          <img src={activePrintTarget.gambar2} className="w-full h-24 object-contain rounded" />
                        ) : (
                          <div className="h-24 w-full border border-dashed rounded flex items-center justify-center text-slate-400 text-[8px] font-mono">
                            Belum ada Kode
                          </div>
                        )}
                      </div>
                    )}

                    {/* PHOTO 3 */}
                    {isThreeReq && (
                      <div className="border border-slate-400 p-2 rounded bg-slate-50 flex flex-col justify-between items-center text-center">
                        <span className="text-[11px] font-black text-slate-900 mb-1 leading-snug">
                          Gambar 3 : Bagian yang rusak
                        </span>
                        {activePrintTarget.gambar3 ? (
                          <img src={activePrintTarget.gambar3} className="w-full h-24 object-contain rounded" />
                        ) : (
                          <div className="h-24 w-full border border-dashed rounded flex items-center justify-center text-slate-400 text-[8px] font-mono">
                            Belum ada Bagian Rosak
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Others comments */}
            <div className="border-2 border-slate-900 border-t-0 p-2 space-y-1">
              <p className="font-extrabold text-[9px] uppercase tracking-wide leading-none">
                Keterangan lain-lain :
              </p>
              <p className="text-[10px] italic leading-normal whitespace-pre-line">
                {activePrintTarget.keteranganLain || "................................................................................................................................................................................................................................................................................................................................"}
              </p>
            </div>

            {/* Signature Area print setup */}
            <div className="pt-3 flex flex-col items-end">
              <p className="font-bold text-[10px] text-right pr-4 mb-1">
                {activePrintTarget.lokasiTtd}, {formatTanggalBAKT(activePrintTarget.tanggalPengajuan)}
              </p>

              <div className="w-full grid grid-cols-3 text-center pt-2 pb-2">
                <div className="flex flex-col items-center">
                  <p className="text-slate-500 font-bold mb-1 text-[9px]">Diajukan oleh,</p>
                  <div className="h-[35px] flex items-center justify-center">
                    {activePrintTarget.ttdKaryawan ? (
                      <img
                        src={getSignaturePreviewSrc(activePrintTarget.ttdKaryawan)}
                        alt="Diajukan oleh"
                        className="h-full object-contain max-h-[35px]"
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      null
                    )}
                  </div>
                  <p className="font-black underline uppercase text-[10px] mt-1">
                    ({activePrintTarget.karyawanNama})
                  </p>
                  <p className="text-[8px] mt-0.5 font-bold text-slate-500">Karyawan</p>
                </div>

                <div className="flex flex-col items-center">
                  <p className="text-slate-500 font-bold mb-1 text-[9px]">Diketahui Oleh,</p>
                  <div className="h-[35px] flex items-center justify-center">
                    {activePrintTarget.ttdAtasan ? (
                      <img
                        src={getSignaturePreviewSrc(activePrintTarget.ttdAtasan)}
                        alt="Diketahui oleh"
                        className="h-full object-contain max-h-[35px]"
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      null
                    )}
                  </div>
                  <p className="font-black underline uppercase text-[10px] mt-1">
                    ({activePrintTarget.namaAtasan})
                  </p>
                  <p className="text-[8px] mt-0.5 font-bold text-slate-500">SPV / Atasan</p>
                </div>

                <div className="flex flex-col items-center">
                  <p className="text-slate-500 font-bold mb-1 text-[9px]">Diperiksa Oleh,</p>
                  <div className="h-[35px] flex items-center justify-center">
                    {activePrintTarget.ttdPic ? (
                      <img
                        src={getSignaturePreviewSrc(activePrintTarget.ttdPic)}
                        alt="Diperiksa oleh"
                        className="h-full object-contain max-h-[35px]"
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      null
                    )}
                  </div>
                  <p className="font-black underline uppercase text-[10px] mt-1">
                    ({activePrintTarget.namaPicApd})
                  </p>
                  <p className="text-[8px] mt-0.5 font-bold text-slate-500">PIC APD</p>
                </div>
              </div>
            </div>

          </div>

          <div className="border-t border-slate-500 pt-1.5 text-center text-[9px] font-mono text-slate-605 flex justify-between items-center">
            <span>No. Dokumen – QHESF – QHESC – 010 – 004/Rev01/04/2013</span>
            <span>Halaman 1 dari 1</span>
          </div>
        </div>

      </div>

      {/* ======================= INTERACTIVE IMAGE CROP & ZOOM-OUT MODAL ======================= */}
      {editorOpen && editorSlot && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 animate-in zoom-in-95 duration-250 text-slate-900">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3.5">
              <div className="space-y-0.5">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Crop className="h-5 w-5 text-indigo-650" />
                  Atur Foto & Potong Gambar {editorSlot}
                </h3>
                <p className="text-xs text-slate-500">
                  Gunakan slider, tombol, atau tarik langsung untuk zoom-out, geser, koordinasikan, dan potong.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="p-1.5 px-3 text-xs bg-slate-100 font-bold hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
              >
                Tutup
              </button>
            </div>

            {/* Mode selection: Pan vs Pen */}
            <div className="flex gap-2 border-b pb-3.5">
              <button
                type="button"
                onClick={() => setEditorMode('pan')}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                  editorMode === 'pan'
                    ? 'bg-slate-900 border-slate-900 text-white shadow'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Move className="h-4 w-4" /> 1. Geser & Skala Foto
              </button>
              <button
                type="button"
                onClick={() => setEditorMode('draw_red')}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                  editorMode === 'draw_red'
                    ? 'bg-rose-600 border-rose-600 text-white shadow'
                    : 'bg-rose-50 border-rose-200 text-rose-750 hover:bg-rose-100'
                }`}
              >
                <Pencil className="h-4 w-4" /> 2. Pensil Penanda Kerusakan (Merah)
              </button>
            </div>

            {/* Interactive Canvas Stage Area */}
            <div className="flex flex-col items-center justify-center space-y-2">
              {editorMode === 'pan' ? (
                <div className="text-[11px] font-black text-indigo-600 bg-indigo-50/80 px-3 py-1 rounded-full flex items-center gap-1.5 shrink-0 self-center">
                  <Move className="h-3.5 w-3.5 animate-pulse" /> Seret/Geser foto di bawah ke bagian yang ingin difokuskan
                </div>
              ) : (
                <div className="text-[11px] font-black text-rose-600 bg-rose-50/80 px-3 py-1 rounded-full flex items-center justify-between w-full shrink-0">
                  <span className="flex items-center gap-1.5">
                    <Pencil className="h-3.5 w-3.5 animate-pulse text-rose-500" /> Coret langsung di gambar untuk menandai area yang rusak/robek
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setStrokes(prev => prev.slice(0, -1))}
                      disabled={strokes.length === 0}
                      className="px-2 py-0.5 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-800 border rounded text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Undo className="h-3 w-3" /> Undo
                    </button>
                    <button
                      type="button"
                      onClick={() => setStrokes([])}
                      disabled={strokes.length === 0}
                      className="px-2 py-0.5 bg-rose-600 hover:bg-rose-750 disabled:opacity-50 text-white rounded text-[10px] font-bold cursor-pointer"
                    >
                      Reset Coreti
                    </button>
                  </div>
                </div>
              )}
              
              <div className="relative w-full max-w-[480px] aspect-[4/3] bg-slate-950 rounded-2xl shadow-inner overflow-hidden border-2 border-slate-800 flex items-center justify-center select-none" style={{ cursor: editorMode === 'draw_red' ? 'crosshair' : 'move' }}>
                <canvas
                  ref={editorCanvasRef}
                  width={640}
                  height={480}
                  className="w-full h-full object-contain"
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUpOrLeave}
                  onMouseLeave={handleCanvasMouseUpOrLeave}
                  onTouchStart={handleCanvasTouchStart}
                  onTouchMove={handleCanvasTouchMove}
                  onTouchEnd={handleCanvasMouseUpOrLeave}
                />
              </div>
            </div>

            {/* Editing Controls panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              
              {/* Zoom Out & Zoom In Controls */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-650 flex justify-between items-center">
                  <span>Zoom / Skala ({Math.round(zoom * 100)}%)</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setZoom(prev => Math.max(0.1, +(prev - 0.15).toFixed(2)))}
                      className="p-1 px-2.5 bg-white border font-bold text-xs rounded hover:bg-indigo-50 text-indigo-750 cursor-pointer"
                      title="Zoom Out"
                    >
                      Zoom -
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoom(prev => Math.min(3.0, +(prev + 0.15).toFixed(2)))}
                      className="p-1 px-2.5 bg-white border font-bold text-xs rounded hover:bg-indigo-50 text-indigo-750 cursor-pointer"
                      title="Zoom In"
                    >
                      Zoom +
                    </button>
                  </div>
                </label>
                <div className="flex items-center gap-2">
                  <ZoomOut className="h-4 w-4 text-slate-400 shrink-0" />
                  <input
                    type="range"
                    min="0.1"
                    max="3.0"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <ZoomIn className="h-4 w-4 text-slate-400 shrink-0" />
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setZoom(0.3)}
                    className="flex-1 py-1 text-[10px] bg-white border border-slate-200 rounded font-bold hover:bg-indigo-50 text-slate-800 cursor-pointer"
                  >
                    0.3x (Jauh)
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(0.65)}
                    className="flex-1 py-1 text-[10px] bg-white border border-slate-200 rounded font-bold hover:bg-indigo-50 text-slate-800 cursor-pointer"
                  >
                    0.65x (Out)
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(1.0)}
                    className="flex-1 py-1 text-[10px] bg-white border border-slate-200 rounded font-bold hover:bg-indigo-50 text-slate-800 cursor-pointer"
                  >
                    1.0x (Asli)
                  </button>
                </div>
              </div>

              {/* Rotasi & Reset */}
              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 block">
                  Rotasi & Posisi
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRotate(prev => (prev + 90) % 360)}
                    className="py-1.5 bg-white hover:bg-indigo-50 border text-indigo-750 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCw className="h-3.5 w-3.5" /> Putar 90°
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setZoom(1.0);
                      setRotate(0);
                      setOffsetX(0);
                      setOffsetY(0);
                      setStrokes([]);
                    }}
                    className="py-1.5 bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    Reset Total
                  </button>
                </div>

                <div className="pt-1 flex flex-wrap gap-1 items-center justify-between text-[11px] text-slate-500">
                  <span>Geser: {offsetX}px, {offsetY}px</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setOffsetX(prev => prev - 15)}
                      className="p-1 px-1.5 bg-white border rounded hover:bg-slate-100 font-bold"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => setOffsetY(prev => prev - 15)}
                      className="p-1 px-1.5 bg-white border rounded hover:bg-slate-100 font-bold"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => setOffsetY(prev => prev + 15)}
                      className="p-1 px-1.5 bg-white border rounded hover:bg-slate-100 font-bold"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => setOffsetX(prev => prev + 15)}
                      className="p-1 px-1.5 bg-white border rounded hover:bg-slate-100 font-bold"
                    >
                      →
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* Action Bar */}
            <div className="flex gap-3 pt-2 border-t text-right">
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveCroppedImage}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl font-bold text-xs shadow flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save className="h-4 w-4" /> Potong & Simpan
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ======================= PRINT NOTIFICATION INSTRUCTIONS DIALOG ======================= */}
      {printNoticeOpen && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200 text-slate-900">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-250">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Printer className="h-5 w-5 text-indigo-650 animate-pulse" />
                Sistem Pencetakan Diaktifkan
              </h3>
              <button
                type="button"
                onClick={() => setPrintNoticeOpen(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 px-2.5 py-1 rounded"
              >
                Tutup
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <div className="p-3 bg-indigo-50 text-indigo-900 rounded-2xl border border-indigo-150">
                <p className="font-extrabold text-[12px] flex items-center gap-1">
                  💡 Mengapa dialog cetak tidak langsung muncul?
                </p>
                <p className="mt-1 font-semibold leading-relaxed">
                  Sistem pratinjau saat ini berjalan di dalam bingkai mini (iframe / AI Studio Sandbox). Dikarenakan sistem keamanan browser, pencetakan langsung dari dalam bingkai mini ini terkadang diblokir.
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-black text-slate-800 uppercase tracking-wide text-[10px]">
                  Langkah Cetak / Save PDF 100% Berhasil:
                </p>
                
                <ol className="list-decimal pl-4 space-y-2 font-semibold text-slate-700">
                  <li>
                    Lihat ke <b className="text-indigo-650">pojok kanan atas layar Anda</b> (di atas layar pratinjau).
                  </li>
                  <li>
                    Temukan dan klik tombol <b className="bg-indigo-50 px-1 py-0.5 rounded text-indigo-700 font-extrabold inline-flex items-center gap-0.5">Buka di Tab Baru <Printer className="h-3 w-3 inline" /></b> atau tombol panah luar.
                  </li>
                  <li>
                    Setelah terbuka di halaman tab penuh (mandiri), klik tombol <b className="font-black">Cetak / Save PDF</b> kembali. Dialog cetak resmi browser Anda akan langsung terbuka dengan rapi!
                  </li>
                  <li>
                    Pilih printer fisik Anda atau pilih opsi <b className="text-emerald-700 font-extrabold">&quot;Save as PDF&quot; (Simpan sebagai PDF)</b> untuk mengunduh berkas.
                  </li>
                </ol>
              </div>
            </div>

            <div className="pt-3 border-t flex gap-2">
              <button
                type="button"
                onClick={() => setPrintNoticeOpen(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-755 font-black rounded-xl text-xs cursor-pointer"
              >
                Saya Mengerti
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    window.focus();
                    window.print();
                  } catch(e) {}
                }}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-755 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Printer className="h-4 w-4" /> Tetap Coba Cetak
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[99999] bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 font-bold text-xs animate-in slide-in-from-top duration-300 border border-emerald-400">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-200 animate-bounce" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ======================= HISTORY PENGAMBILAN APD MODAL ======================= */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95 duration-250 text-slate-900">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-3.5">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-950 flex items-center gap-2">
                  <Clock className="h-4.5 w-4.5 text-indigo-650" />
                  History Pengambilan APD
                </h3>
                <p className="text-[11px] font-semibold text-slate-500 leading-snug">
                  Riwayat transaksi karyawan <span className="text-slate-800 font-bold">{karyawanNama}</span> untuk kategori APD dari Data Order. Klik tombol <span className="text-emerald-700 font-bold">&quot;✓ Pilih / OK&quot;</span> untuk otomatis memasukkan ke Tabel APD.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="p-1 px-2.5 text-[10px] bg-slate-100 font-bold hover:bg-slate-200 text-slate-705 rounded-lg cursor-pointer transition"
              >
                Tutup
              </button>
            </div>

            {/* List of APD Groups */}
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {masterApdList.map((groupName) => {
                const records = employeeApdHistory.filter((item: any) => 
                  item.barang && item.barang.toLowerCase().trim() === groupName.toLowerCase().trim()
                );

                // Sort records from latest to earliest depending on timestamp
                const sortedRecords = [...records].sort((a: any, b: any) => {
                  const monthsIndo: Record<string, number> = {
                    januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
                    juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11
                  };
                  const parseDate = (dStr: string) => {
                    if (!dStr) return 0;
                    const clean = dStr.toLowerCase().trim();
                    const parts = clean.split(/\s+/);
                    if (parts.length >= 3) {
                      const datePart = parseInt(parts[0], 10);
                      const monthIdx = monthsIndo[parts[1]] !== undefined ? monthsIndo[parts[1]] : -1;
                      const yearPart = parseInt(parts[2], 10);
                      if (!isNaN(datePart) && monthIdx !== -1 && !isNaN(yearPart)) {
                        return new Date(yearPart, monthIdx, datePart).getTime();
                      }
                    }
                    const slashes = clean.split(/[/, :-\s]+/);
                    if (slashes.length >= 3) {
                      const p0 = parseInt(slashes[0], 10);
                      const p1 = parseInt(slashes[1], 10);
                      const p2 = parseInt(slashes[2], 10);
                      if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
                        let year = p2;
                        let month = p1 - 1;
                        let day = p0;
                        if (slashes[0].length === 4 || p0 > 1000) {
                          year = p0;
                          month = p1 - 1;
                          day = p2;
                        } else {
                          if (year < 100) year += 2000;
                          if (p1 > 12) {
                            day = p1;
                            month = p0 - 1;
                          } else if (p0 > 12) {
                            day = p0;
                            month = p1 - 1;
                          }
                        }
                        if (year > 1000 && month >= 0 && month < 12 && day >= 1 && day <= 31) {
                          return new Date(year, month, day).getTime();
                        }
                      }
                    }
                    const parsed = Date.parse(dStr);
                    return isNaN(parsed) ? 0 : parsed;
                  };
                  return parseDate(b.timestamp) - parseDate(a.timestamp);
                });

                const isExpanded = expandedHistoryGroup === groupName;
                const isAlreadySelected = items.some(it => it.itemName.toLowerCase().trim() === groupName.toLowerCase().trim());

                return (
                  <div key={groupName} className={`border rounded-2xl overflow-hidden shadow-xs transition ${isAlreadySelected ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200'}`}>
                    
                    {/* Item Group Header */}
                    <div className={`w-full flex items-center justify-between p-3 text-left transition duration-150 ${
                      isExpanded ? 'bg-indigo-50/60 text-indigo-950 font-bold border-b border-indigo-100' : 'bg-slate-50/70 hover:bg-slate-100/80'
                    }`}>
                      <button
                        type="button"
                        onClick={() => setExpandedHistoryGroup(isExpanded ? null : groupName)}
                        className="flex-1 flex items-center gap-2 cursor-pointer pr-2 text-left"
                      >
                        <span className="text-xs font-bold text-slate-800">{groupName}</span>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                          records.length > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200/60 text-slate-500'
                        }`}>
                          {records.length} Riwayat
                        </span>
                        {isAlreadySelected && (
                          <span className="text-[9px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-md flex items-center gap-0.5">
                            <Check className="h-2.5 w-2.5 stroke-[3]" /> Terpilih
                          </span>
                        )}
                        <span className="text-slate-400 text-[10px] ml-auto sm:ml-0">
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </button>

                      {/* Quick Select Button */}
                      <button
                        type="button"
                        onClick={() => {
                          const latestRec = sortedRecords.length > 0 ? sortedRecords[0] : null;
                          handleSelectApdFromHistory(
                            groupName, 
                            latestRec ? latestRec.timestamp : undefined, 
                            latestRec ? latestRec.jumlah : 1
                          );
                        }}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[10px] font-extrabold rounded-xl transition flex items-center gap-1 shadow-xs cursor-pointer shrink-0"
                        title="Pilih & Otomatis Masukkan ke Tabel APD"
                      >
                        <Check className="h-3 w-3 stroke-[3]" />
                        <span>Pilih / OK</span>
                      </button>
                    </div>

                    {/* Expanded Detail Records */}
                    {isExpanded && (
                      <div className="p-3 bg-white space-y-2">
                        {sortedRecords.length > 0 ? (
                          <div className="space-y-1.5 font-sans">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Pilih Riwayat Tanggal Pengambilan Spesifik:
                            </p>
                            {sortedRecords.map((rec: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between py-2 px-3 bg-slate-50 hover:bg-indigo-50/50 border border-slate-100 hover:border-indigo-200 rounded-xl text-[11px] font-semibold text-slate-700 transition">
                                <div className="flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full bg-indigo-500" />
                                  <span className="font-bold text-slate-900">{formatTanggalIndonesia(rec.timestamp)}</span>
                                  <span className="bg-indigo-100/80 text-indigo-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                                    {rec.jumlah} Pcs
                                  </span>
                                </div>
                                
                                <button
                                  type="button"
                                  onClick={() => handleSelectApdFromHistory(groupName, rec.timestamp, rec.jumlah)}
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-[10px] font-extrabold rounded-lg transition flex items-center gap-1 cursor-pointer shadow-2xs"
                                >
                                  <Check className="h-3 w-3 stroke-[3]" />
                                  <span>Pilih Record Ini</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-xl">
                            <p className="text-[10px] text-slate-400 italic font-semibold">
                              Belum ada riwayat transaksi pengambilan.
                            </p>
                            <button
                              type="button"
                              onClick={() => handleSelectApdFromHistory(groupName)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold rounded-lg transition flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="h-3 w-3 stroke-[3]" />
                              <span>Pilih Item Ini</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t text-[10px] text-slate-400 text-center leading-normal">
              💡 <b>Catatan:</b> Daftar kategori APD di atas bersumber dari sheet &quot;Master APD&quot;, dan kecocokan riwayat bersumber dari sheet &quot;Data Order&quot; dengan pencarian nama karyawan.
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
