import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Printer, 
  Save, 
  Search, 
  FileText, 
  Eye, 
  Calendar, 
  ShieldAlert, 
  ListOrdered, 
  ClipboardList, 
  CheckCircle2, 
  ChevronRight,
  Info,
  Edit2
} from 'lucide-react';
import { formatTanggalIndonesia } from '../utils.js';
import { ProsedurRecord } from '../types.js';

const companyLogo = 'https://images.seeklogo.com/logo-png/36/1/pt-indotruck-utama-logo-png_seeklogo-363267.png';

interface ProsedurManagerProps {
  userRealName: string;
  userRole: 'admin' | 'operator';
  userTtdUrl?: string;
  onBack: () => void;
}

export default function ProsedurManager({ 
  userRealName, 
  userRole, 
  userTtdUrl = '', 
  onBack 
}: ProsedurManagerProps) {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<'hira' | 'jsa' | 'sop'>('jsa'); // Default to JSA as requested
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'preview'>('list');
  
  // Data states
  const [records, setRecords] = useState<ProsedurRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDept, setFilterDept] = useState('Semua');

  // Selected or Active record state
  const [currentRecord, setCurrentRecord] = useState<Partial<ProsedurRecord> | null>(null);
  const [previewRecord, setPreviewRecord] = useState<ProsedurRecord | null>(null);

  // Load records on mount
  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/prosedur/list');
      const data = await res.json();
      if (data.success) {
        setRecords(data.list || []);
      }
    } catch (err) {
      console.error('Failed to load procedures:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskLevelAndColor = (score: number): { level: 'Low' | 'Medium' | 'High' | 'Extreme'; color: string; bg: string } => {
    if (score <= 4) return { level: 'Low', color: 'text-emerald-700 border-emerald-200', bg: 'bg-emerald-50' };
    if (score <= 9) return { level: 'Medium', color: 'text-amber-700 border-amber-200', bg: 'bg-amber-50' };
    if (score <= 15) return { level: 'High', color: 'text-orange-700 border-orange-200', bg: 'bg-orange-50' };
    return { level: 'Extreme', color: 'text-rose-700 border-rose-200', bg: 'bg-rose-50' };
  };

  const convertRowsToSteps = (rows: any[]): any[] => {
    if (!rows || rows.length === 0) return [];
    return rows.map((row, idx) => ({
      id: `step_${row.id || idx}_${Date.now()}`,
      stepNo: row.stepNo || (idx + 1),
      stepDescription: row.stepDescription || '',
      hazards: [
        {
          id: `haz_${row.id || idx}_${Date.now()}`,
          hazardNo: `${row.stepNo || (idx + 1)}.1`,
          hazardDescription: row.potentialHazard || '',
          actions: [
            {
              id: `act_${row.id || idx}_${Date.now()}`,
              actionNo: `${row.stepNo || (idx + 1)}.1.1`,
              actionDescription: row.safeAction || ''
            }
          ]
        }
      ]
    }));
  };

  // Initialize new document form
  const handleCreateNew = () => {
    const today = new Date().toISOString().split('T')[0];
    const docNoPrefix = activeTab.toUpperCase();
    const generatedNo = `ITU/HSE/${docNoPrefix}/${Date.now().toString().slice(-6)}`;
    
    const baseDoc: Partial<ProsedurRecord> = {
      type: activeTab,
      documentNo: generatedNo,
      title: '',
      department: 'HSE',
      date: today,
      createdBy: userRealName,
    };

    if (activeTab === 'hira') {
      baseDoc.hiraRows = [
        {
          id: `hira_row_${Date.now()}_0`,
          activity: '',
          hazard: '',
          risk: '',
          initProbability: 3,
          initSeverity: 3,
          initRiskScore: 9,
          initRiskLevel: 'Medium',
          mitigation: '',
          resProbability: 2,
          resSeverity: 2,
          resRiskScore: 4,
          resRiskLevel: 'Low'
        }
      ];
    } else if (activeTab === 'jsa') {
      baseDoc.namaJabatan = 'Grup Leader';
      baseDoc.seksiDepartemen = 'Plant Hauler & Wheel Loader';
      baseDoc.jabatanSuperior = 'Unit Head';
      baseDoc.disusunOleh = userRealName;
      baseDoc.diperiksaOleh = 'Abdul Rahman';
      baseDoc.disetujuiOleh = 'Hengky';
      baseDoc.noRevisi = '1';
      baseDoc.direviewOleh = 'Muhammad Ali - SHE Officer';
      baseDoc.apdWajib = 'Helm safety, Kacamata Safety, Sepatu safety, Sarung tangan';
      baseDoc.lokasiKerja = 'PT Saptaindra Sejati Site Admo';
      baseDoc.jsaSteps = [
        {
          id: `jsa_step_${Date.now()}_0`,
          stepNo: 1,
          stepDescription: 'Parkir unit service pada posisi area yang rata',
          hazards: [
            {
              id: `jsa_haz_${Date.now()}_0_0`,
              hazardNo: '1.1',
              hazardDescription: 'Unit Tertabrak/Menabrak Unit lain yang ada di area tersebut.',
              actions: [
                {
                  id: `jsa_act_${Date.now()}_0_0_0`,
                  actionNo: '1.1.1',
                  actionDescription: 'Harus ada spotter untuk mengarahkan unit saat parkir/ keluar parkir di area workhsop'
                },
                {
                  id: `jsa_act_${Date.now()}_0_0_1`,
                  actionNo: '1.1.2',
                  actionDescription: 'Orang yang mengoperasikan unit R100E (pengawas/mechanic) harus memiliki Kimper aktif'
                }
              ]
            }
          ]
        }
      ];
    } else if (activeTab === 'sop') {
      baseDoc.sopPurpose = '';
      baseDoc.sopScope = '';
      baseDoc.sopReferences = 'Undang-Undang No 1 Tahun 1970 tentang Keselamatan Kerja';
      baseDoc.sopToolsMaterials = '';
      baseDoc.sopSteps = [
        {
          id: `sop_row_${Date.now()}_0`,
          stepNo: 1,
          title: '',
          description: ''
        }
      ];
    }

    setCurrentRecord(baseDoc);
    setViewMode('form');
  };

  const handleEditRecord = (rec: ProsedurRecord) => {
    let copy = { ...rec };
    if (copy.type === 'jsa' && !copy.jsaSteps && (copy as any).jsaRows) {
      copy.jsaSteps = convertRowsToSteps((copy as any).jsaRows);
    }
    setCurrentRecord(copy);
    setViewMode('form');
  };

  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus dokumen ini?')) return;
    try {
      const res = await fetch(`/api/prosedur/delete/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setRecords(data.list || []);
        if (previewRecord?.id === id) setPreviewRecord(null);
      }
    } catch (err) {
      console.error('Failed to delete procedure:', err);
    }
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRecord || !currentRecord.title || !currentRecord.documentNo) {
      alert('Harap lengkapi Judul dan Nomor Dokumen!');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/prosedur/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentRecord)
      });
      const data = await res.json();
      if (data.success) {
        setRecords(data.list || []);
        setViewMode('list');
        setCurrentRecord(null);
      } else {
        alert(data.message || 'Gagal menyimpan dokumen.');
      }
    } catch (err) {
      console.error('Error saving document:', err);
      alert('Terjadi kesalahan koneksi.');
    } finally {
      setIsLoading(false);
    }
  };

  // Dynamic state modifiers for HIRA
  const addHiraRow = () => {
    if (!currentRecord) return;
    const rows = [...(currentRecord.hiraRows || [])];
    rows.push({
      id: `hira_row_${Date.now()}_${rows.length}`,
      activity: '',
      hazard: '',
      risk: '',
      initProbability: 3,
      initSeverity: 3,
      initRiskScore: 9,
      initRiskLevel: 'Medium',
      mitigation: '',
      resProbability: 2,
      resSeverity: 2,
      resRiskScore: 4,
      resRiskLevel: 'Low'
    });
    setCurrentRecord({ ...currentRecord, hiraRows: rows });
  };

  const removeHiraRow = (index: number) => {
    if (!currentRecord || (currentRecord.hiraRows?.length || 0) <= 1) return;
    const rows = (currentRecord.hiraRows || []).filter((_, i) => i !== index);
    setCurrentRecord({ ...currentRecord, hiraRows: rows });
  };

  const updateHiraRowValue = (index: number, field: string, value: any) => {
    if (!currentRecord) return;
    const rows = [...(currentRecord.hiraRows || [])];
    const row = { ...rows[index], [field]: value };

    if (field === 'initProbability' || field === 'initSeverity') {
      const p = field === 'initProbability' ? parseInt(value) : row.initProbability;
      const s = field === 'initSeverity' ? parseInt(value) : row.initSeverity;
      row.initRiskScore = p * s;
      row.initRiskLevel = getRiskLevelAndColor(row.initRiskScore).level;
    }
    if (field === 'resProbability' || field === 'resSeverity') {
      const p = field === 'resProbability' ? parseInt(value) : row.resProbability;
      const s = field === 'resSeverity' ? parseInt(value) : row.resSeverity;
      row.resRiskScore = p * s;
      row.resRiskLevel = getRiskLevelAndColor(row.resRiskScore).level;
    }

    rows[index] = row;
    setCurrentRecord({ ...currentRecord, hiraRows: rows });
  };

  // Dynamic state modifiers for hierarchical JSA
  const addJsaStep = () => {
    if (!currentRecord) return;
    const steps = [...(currentRecord.jsaSteps || [])];
    const newStepNo = steps.length + 1;
    steps.push({
      id: `jsa_step_${Date.now()}_${steps.length}`,
      stepNo: newStepNo,
      stepDescription: '',
      hazards: [
        {
          id: `jsa_haz_${Date.now()}_${steps.length}_0`,
          hazardNo: `${newStepNo}.1`,
          hazardDescription: '',
          actions: [
            {
              id: `jsa_act_${Date.now()}_${steps.length}_0_0`,
              actionNo: `${newStepNo}.1.1`,
              actionDescription: ''
            }
          ]
        }
      ]
    });
    setCurrentRecord({ ...currentRecord, jsaSteps: steps });
  };

  const removeJsaStep = (stepIndex: number) => {
    if (!currentRecord || (currentRecord.jsaSteps?.length || 0) <= 1) return;
    const steps = (currentRecord.jsaSteps || [])
      .filter((_, i) => i !== stepIndex)
      .map((step, idx) => {
        const newStepNo = idx + 1;
        const updatedHazards = step.hazards.map((haz, hIdx) => {
          const newHazNo = `${newStepNo}.${hIdx + 1}`;
          const updatedActions = haz.actions.map((act, aIdx) => ({
            ...act,
            actionNo: `${newHazNo}.${aIdx + 1}`
          }));
          return {
            ...haz,
            hazardNo: newHazNo,
            actions: updatedActions
          };
        });
        return {
          ...step,
          stepNo: newStepNo,
          hazards: updatedHazards
        };
      });
    setCurrentRecord({ ...currentRecord, jsaSteps: steps });
  };

  const updateJsaStepDescription = (stepIndex: number, desc: string) => {
    if (!currentRecord) return;
    const steps = [...(currentRecord.jsaSteps || [])];
    steps[stepIndex] = { ...steps[stepIndex], stepDescription: desc };
    setCurrentRecord({ ...currentRecord, jsaSteps: steps });
  };

  const addJsaHazard = (stepIndex: number) => {
    if (!currentRecord) return;
    const steps = [...(currentRecord.jsaSteps || [])];
    const step = steps[stepIndex];
    const newHazNo = `${step.stepNo}.${step.hazards.length + 1}`;
    step.hazards.push({
      id: `jsa_haz_${Date.now()}_${stepIndex}_${step.hazards.length}`,
      hazardNo: newHazNo,
      hazardDescription: '',
      actions: [
        {
          id: `jsa_act_${Date.now()}_${stepIndex}_${step.hazards.length}_0`,
          actionNo: `${newHazNo}.1`,
          actionDescription: ''
        }
      ]
    });
    setCurrentRecord({ ...currentRecord, jsaSteps: steps });
  };

  const removeJsaHazard = (stepIndex: number, hazIndex: number) => {
    if (!currentRecord) return;
    const steps = [...(currentRecord.jsaSteps || [])];
    const step = steps[stepIndex];
    if (step.hazards.length <= 1) return;
    step.hazards = step.hazards
      .filter((_, i) => i !== hazIndex)
      .map((haz, idx) => {
        const newHazNo = `${step.stepNo}.${idx + 1}`;
        const updatedActions = haz.actions.map((act, aIdx) => ({
          ...act,
          actionNo: `${newHazNo}.${aIdx + 1}`
        }));
        return {
          ...haz,
          hazardNo: newHazNo,
          actions: updatedActions
        };
      });
    setCurrentRecord({ ...currentRecord, jsaSteps: steps });
  };

  const updateJsaHazardDescription = (stepIndex: number, hazIndex: number, desc: string) => {
    if (!currentRecord) return;
    const steps = [...(currentRecord.jsaSteps || [])];
    steps[stepIndex].hazards[hazIndex] = {
      ...steps[stepIndex].hazards[hazIndex],
      hazardDescription: desc
    };
    setCurrentRecord({ ...currentRecord, jsaSteps: steps });
  };

  const addJsaAction = (stepIndex: number, hazIndex: number) => {
    if (!currentRecord) return;
    const steps = [...(currentRecord.jsaSteps || [])];
    const haz = steps[stepIndex].hazards[hazIndex];
    const newActNo = `${haz.hazardNo}.${haz.actions.length + 1}`;
    haz.actions.push({
      id: `jsa_act_${Date.now()}_${stepIndex}_${hazIndex}_${haz.actions.length}`,
      actionNo: newActNo,
      actionDescription: ''
    });
    setCurrentRecord({ ...currentRecord, jsaSteps: steps });
  };

  const removeJsaAction = (stepIndex: number, hazIndex: number, actIndex: number) => {
    if (!currentRecord) return;
    const steps = [...(currentRecord.jsaSteps || [])];
    const haz = steps[stepIndex].hazards[hazIndex];
    if (haz.actions.length <= 1) return;
    haz.actions = haz.actions
      .filter((_, i) => i !== actIndex)
      .map((act, idx) => ({
        ...act,
        actionNo: `${haz.hazardNo}.${idx + 1}`
      }));
    setCurrentRecord({ ...currentRecord, jsaSteps: steps });
  };

  const updateJsaActionDescription = (stepIndex: number, hazIndex: number, actIndex: number, desc: string) => {
    if (!currentRecord) return;
    const steps = [...(currentRecord.jsaSteps || [])];
    steps[stepIndex].hazards[hazIndex].actions[actIndex] = {
      ...steps[stepIndex].hazards[hazIndex].actions[actIndex],
      actionDescription: desc
    };
    setCurrentRecord({ ...currentRecord, jsaSteps: steps });
  };

  // Dynamic state modifiers for SOP
  const addSopStep = () => {
    if (!currentRecord) return;
    const steps = [...(currentRecord.sopSteps || [])];
    steps.push({
      id: `sop_row_${Date.now()}_${steps.length}`,
      stepNo: steps.length + 1,
      title: '',
      description: ''
    });
    setCurrentRecord({ ...currentRecord, sopSteps: steps });
  };

  const removeSopStep = (index: number) => {
    if (!currentRecord || (currentRecord.sopSteps?.length || 0) <= 1) return;
    const steps = (currentRecord.sopSteps || [])
      .filter((_, i) => i !== index)
      .map((item, idx) => ({ ...item, stepNo: idx + 1 }));
    setCurrentRecord({ ...currentRecord, sopSteps: steps });
  };

  const updateSopStepValue = (index: number, field: string, value: any) => {
    if (!currentRecord) return;
    const steps = [...(currentRecord.sopSteps || [])];
    steps[index] = { ...steps[index], [field]: value };
    setCurrentRecord({ ...currentRecord, sopSteps: steps });
  };

  // Filter & Search Records
  const filteredRecords = records.filter(rec => {
    if (rec.type !== activeTab) return false;
    const matchSearch = rec.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        rec.documentNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        rec.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchDept = filterDept === 'Semua' || rec.department.toLowerCase() === filterDept.toLowerCase();
    return matchSearch && matchDept;
  });

  const triggerPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* ----------------- BREADCRUMB / HEADER ----------------- */}
      <div className="print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-indigo-600" />
            PROSEDUR & KESELAMATAN KERJA (HSE)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manajemen Dokumen HIRA (Hazard Identification), JSA (Job Safety Analysis), & SOP (Standard Operasional Prosedur).
          </p>
        </div>
        <button
          onClick={viewMode === 'list' ? onBack : () => { setViewMode('list'); setCurrentRecord(null); setPreviewRecord(null); }}
          className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          {viewMode === 'list' ? 'Kembali ke Dashboard' : 'Kembali ke Daftar'}
        </button>
      </div>

      {/* ----------------- SUB-MENU SELECTOR TAB ----------------- */}
      {viewMode === 'list' && (
        <div className="print:hidden flex border-b border-slate-200 gap-1 p-1 bg-slate-100 rounded-2xl w-fit">
          <button
            onClick={() => { setActiveTab('hira'); setSearchQuery(''); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'hira' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            HIRA (Hazard Identification)
          </button>
          <button
            onClick={() => { setActiveTab('jsa'); setSearchQuery(''); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'jsa' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListOrdered className="h-4 w-4" />
            JSA (Job Safety Analysis)
          </button>
          <button
            onClick={() => { setActiveTab('sop'); setSearchQuery(''); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'sop' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="h-4 w-4" />
            SOP (Standart Operasional Prosedur)
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CASE 1: LISTING VIEW WITH SEARCH & CARDS                      */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'list' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
            <div className="flex flex-col sm:flex-row gap-2 flex-grow max-w-xl">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Cari nomor, departemen, atau judul dokumen ${activeTab.toUpperCase()}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
              >
                <option value="Semua">Semua Departemen</option>
                <option value="HSE">HSE</option>
                <option value="Service">Service</option>
                <option value="Plant">Plant</option>
                <option value="Gudang">Gudang / Warehouse</option>
                <option value="HRD">HRD</option>
                <option value="Operation">Operation</option>
              </select>
            </div>

            <button
              onClick={handleCreateNew}
              className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Buat {activeTab.toUpperCase()} Baru
            </button>
          </div>

          {/* List display */}
          {isLoading ? (
            <div className="text-center py-12 text-xs text-slate-500">
              Memuat data dokumen...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
              <div className="inline-flex h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-500 items-center justify-center">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Dokumen Belum Tersedia</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Silakan mulai dengan menekan tombol "Buat {activeTab.toUpperCase()} Baru" di atas untuk mendokumentasikan prosedur keselamatan pertama Anda.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecords.map((rec) => (
                <div 
                  key={rec.id}
                  className="bg-white border border-slate-200 hover:border-indigo-400 hover:shadow rounded-2xl p-5 flex flex-col justify-between transition group space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 border border-indigo-150 text-indigo-700 uppercase tracking-wider">
                        {rec.type.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {rec.date}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition">
                        {rec.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        No: {rec.documentNo}
                      </p>
                    </div>
                    <div className="flex gap-4 text-[11px] text-slate-500 pt-1">
                      <div>
                        <span className="font-semibold text-slate-700">Dept:</span> {rec.department}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">Dibuat:</span> {rec.createdBy}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                    <div className="text-[10px] text-slate-400 font-bold">
                      {rec.type === 'hira' ? `${rec.hiraRows?.length || 0} Bahaya` : 
                       rec.type === 'jsa' ? `${rec.jsaSteps?.length || convertRowsToSteps((rec as any).jsaRows).length || 0} Langkah Kerja` : 
                       `${rec.sopSteps?.length || 0} Prosedur`}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => { setPreviewRecord(rec); setViewMode('preview'); }}
                        className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg transition"
                        title="Pratinjau / Cetak"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEditRecord(rec)}
                        className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg transition"
                        title="Edit Dokumen"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRecord(rec.id)}
                        className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition"
                        title="Hapus Dokumen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CASE 2: FORM FOR SAVING / EDITING RECORDS                     */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'form' && currentRecord && (
        <form onSubmit={handleSaveSubmit} className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 animate-in fade-in duration-200 shadow-sm print:hidden">
          <div className="flex justify-between items-center border-b border-slate-200 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 uppercase">
              Formulir Dokumen {currentRecord.type?.toUpperCase()} {currentRecord.id ? '(Edit)' : '(Baru)'}
            </h3>
            <span className="text-xs text-indigo-600 font-semibold flex items-center gap-1">
              <Info className="h-4 w-4" /> Lengkapi kolom di bawah
            </span>
          </div>

          {/* Core Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase">Nomor Dokumen / JSEA</label>
              <input
                type="text"
                value={currentRecord.documentNo || ''}
                onChange={(e) => setCurrentRecord({ ...currentRecord, documentNo: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-250 rounded-xl focus:outline-none"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase">Nama Pekerjaan (Job Title)</label>
              <input
                type="text"
                placeholder="cth: Remove & Install Engine unit Volvo Rigid R100E"
                value={currentRecord.title || ''}
                onChange={(e) => setCurrentRecord({ ...currentRecord, title: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-250 rounded-xl focus:outline-none"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase">Seksi / Departemen</label>
              <select
                value={currentRecord.department || 'HSE'}
                onChange={(e) => setCurrentRecord({ ...currentRecord, department: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-250 rounded-xl focus:outline-none"
              >
                <option value="HSE">HSE</option>
                <option value="Service">Service</option>
                <option value="Plant">Plant</option>
                <option value="Gudang">Gudang / Warehouse</option>
                <option value="HRD">HRD</option>
                <option value="Operation">Operation</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase">Tanggal</label>
              <input
                type="date"
                value={currentRecord.date || ''}
                onChange={(e) => setCurrentRecord({ ...currentRecord, date: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-250 rounded-xl focus:outline-none"
                required
              />
            </div>
          </div>

          {/* JSA Metadata Fields */}
          {currentRecord.type === 'jsa' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-200">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-600 uppercase">Nama Jabatan</label>
                <input
                  type="text"
                  placeholder="cth: Grup Leader"
                  value={currentRecord.namaJabatan || ''}
                  onChange={(e) => setCurrentRecord({ ...currentRecord, namaJabatan: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-250 rounded-lg focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-600 uppercase">Seksi Detail (Seksi/Dept)</label>
                <input
                  type="text"
                  placeholder="cth: Plant Hauler & Wheel Loader"
                  value={currentRecord.seksiDepartemen || ''}
                  onChange={(e) => setCurrentRecord({ ...currentRecord, seksiDepartemen: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-250 rounded-lg focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-600 uppercase">Jabatan Superior</label>
                <input
                  type="text"
                  placeholder="cth: Unit Head"
                  value={currentRecord.jabatanSuperior || ''}
                  onChange={(e) => setCurrentRecord({ ...currentRecord, jabatanSuperior: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-250 rounded-lg focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-600 uppercase">Disusun Oleh</label>
                <input
                  type="text"
                  value={currentRecord.disusunOleh || ''}
                  onChange={(e) => setCurrentRecord({ ...currentRecord, disusunOleh: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-250 rounded-lg focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-600 uppercase">Diperiksa Oleh</label>
                <input
                  type="text"
                  value={currentRecord.diperiksaOleh || ''}
                  onChange={(e) => setCurrentRecord({ ...currentRecord, diperiksaOleh: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-250 rounded-lg focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-600 uppercase">Disetujui Oleh</label>
                <input
                  type="text"
                  value={currentRecord.disetujuiOleh || ''}
                  onChange={(e) => setCurrentRecord({ ...currentRecord, disetujuiOleh: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-250 rounded-lg focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-600 uppercase">No Revisi</label>
                <input
                  type="text"
                  value={currentRecord.noRevisi || '1'}
                  onChange={(e) => setCurrentRecord({ ...currentRecord, noRevisi: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-250 rounded-lg focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-600 uppercase">Direview Oleh</label>
                <input
                  type="text"
                  placeholder="cth: Muhammad Ali - SHE Officer"
                  value={currentRecord.direviewOleh || ''}
                  onChange={(e) => setCurrentRecord({ ...currentRecord, direviewOleh: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-250 rounded-lg focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Lokasi Kerja</label>
                  <span className="text-[9px] text-slate-400 font-semibold">3 Site</span>
                </div>
                <div className="flex gap-1 mb-1 flex-wrap">
                  {[
                    { label: 'ITU-Admo', full: 'PT Saptaindra Sejati Site Admo' },
                    { label: 'ITU-MMI', full: 'PT Indotruck Utama Site MMI' },
                    { label: 'ITU-Vale', full: 'PT Indotruck Utama Site Vale' }
                  ].map(s => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => setCurrentRecord({ ...currentRecord, lokasiKerja: s.full })}
                      className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold border transition cursor-pointer ${
                        currentRecord.lokasiKerja === s.full
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
                  placeholder="cth: PT Saptaindra Sejati Site Admo"
                  value={currentRecord.lokasiKerja || ''}
                  onChange={(e) => setCurrentRecord({ ...currentRecord, lokasiKerja: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-250 rounded-lg focus:outline-none"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2 md:col-span-3">
                <label className="text-[10px] font-bold text-slate-600 uppercase">Alat Pelindung Diri (APD) Yang Wajib Dipakai</label>
                <input
                  type="text"
                  placeholder="cth: Helm safety, Kacamata Safety, Sepatu safety, Sarung tangan"
                  value={currentRecord.apdWajib || ''}
                  onChange={(e) => setCurrentRecord({ ...currentRecord, apdWajib: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-250 rounded-lg focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* ----------------- IF HIRA SUB-FORM ----------------- */}
          {currentRecord.type === 'hira' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-t border-slate-200 pt-4">
                <h4 className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                  <ShieldAlert className="h-4 w-4" />
                  DAFTAR IDENTIFIKASI BAHAYA DAN PENILAIAN RISIKO (HIRA)
                </h4>
                <button
                  type="button"
                  onClick={addHiraRow}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-indigo-150"
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah Baris Bahaya
                </button>
              </div>

              {/* Matrix Help Guide */}
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-2.5 text-xs text-indigo-800 leading-normal">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Panduan Matriks K3:</span> Probabilitas (P) & Keparahan (S) dinilai dengan skala 1-5. Skor Risiko = P x S. Badges akan mengkategorikan secara otomatis menjadi <span className="font-bold text-emerald-700">Low (1-4)</span>, <span className="font-bold text-amber-700">Medium (5-9)</span>, <span className="font-bold text-orange-700">High (10-15)</span>, atau <span className="font-bold text-rose-700">Extreme (16-25)</span>.
                </div>
              </div>

              {/* HIRA Row Inputs */}
              <div className="space-y-4">
                {currentRecord.hiraRows?.map((row, idx) => (
                  <div key={row.id} className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-4 relative">
                    <div className="flex justify-between items-center border-b border-slate-150 pb-2">
                      <span className="text-xs font-bold text-slate-700 font-mono">Bahaya #{idx + 1}</span>
                      {currentRecord.hiraRows!.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeHiraRow(idx)}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-0.5 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Hapus
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Aktivitas Kerja</label>
                        <textarea
                          placeholder="cth: Naik ke atas Scaffolding"
                          rows={2}
                          value={row.activity}
                          onChange={(e) => updateHiraRowValue(idx, 'activity', e.target.value)}
                          className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Potensi Bahaya (Hazard)</label>
                        <textarea
                          placeholder="cth: Pipa scaffolding licin/rusak"
                          rows={2}
                          value={row.hazard}
                          onChange={(e) => updateHiraRowValue(idx, 'hazard', e.target.value)}
                          className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase">Risiko / Konsekuensi</label>
                        <textarea
                          placeholder="cth: Karyawan terjatuh, patah tulang"
                          rows={2}
                          value={row.risk}
                          onChange={(e) => updateHiraRowValue(idx, 'risk', e.target.value)}
                          className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-3.5 rounded-xl border border-slate-200/80">
                      {/* Initial Risk */}
                      <div className="space-y-2 border-r border-slate-150 pr-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-bold text-slate-700 uppercase">1. Penilaian Risiko Awal</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${getRiskLevelAndColor(row.initRiskScore).bg} ${getRiskLevelAndColor(row.initRiskScore).color}`}>
                            {row.initRiskLevel} ({row.initRiskScore})
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-500 font-bold">Probabilitas (P)</label>
                            <select
                              value={row.initProbability}
                              onChange={(e) => updateHiraRowValue(idx, 'initProbability', parseInt(e.target.value))}
                              className="w-full p-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none"
                            >
                              <option value={1}>1 - Sangat Jarang</option>
                              <option value={2}>2 - Jarang terjadi</option>
                              <option value={3}>3 - Mungkin terjadi</option>
                              <option value={4}>4 - Sering terjadi</option>
                              <option value={5}>5 - Hampir selalu terjadi</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-500 font-bold">Keparahan (S)</label>
                            <select
                              value={row.initSeverity}
                              onChange={(e) => updateHiraRowValue(idx, 'initSeverity', parseInt(e.target.value))}
                              className="w-full p-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none"
                            >
                              <option value={1}>1 - Sangat Ringan</option>
                              <option value={2}>2 - Cedera Ringan</option>
                              <option value={3}>3 - Cedera Sedang</option>
                              <option value={4}>4 - Cedera Berat</option>
                              <option value={5}>5 - Fatal (Kematian)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Residual Risk */}
                      <div className="space-y-2 pl-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[11px] font-bold text-slate-700 uppercase">2. Penilaian Risiko Sisa</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${getRiskLevelAndColor(row.resRiskScore).bg} ${getRiskLevelAndColor(row.resRiskScore).color}`}>
                            {row.resRiskLevel} ({row.resRiskScore})
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-500 font-bold">Probabilitas (P)</label>
                            <select
                              value={row.resProbability}
                              onChange={(e) => updateHiraRowValue(idx, 'resProbability', parseInt(e.target.value))}
                              className="w-full p-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none"
                            >
                              <option value={1}>1 - Sangat Jarang</option>
                              <option value={2}>2 - Jarang terjadi</option>
                              <option value={3}>3 - Mungkin terjadi</option>
                              <option value={4}>4 - Sering terjadi</option>
                              <option value={5}>5 - Hampir selalu terjadi</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-500 font-bold">Keparahan (S)</label>
                            <select
                              value={row.resSeverity}
                              onChange={(e) => updateHiraRowValue(idx, 'resSeverity', parseInt(e.target.value))}
                              className="w-full p-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none"
                            >
                              <option value={1}>1 - Sangat Ringan</option>
                              <option value={2}>2 - Cedera Ringan</option>
                              <option value={3}>3 - Cedera Sedang</option>
                              <option value={4}>4 - Cedera Berat</option>
                              <option value={5}>5 - Fatal (Kematian)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 bg-indigo-50/20 p-3 rounded-xl border border-indigo-100">
                      <label className="text-[11px] font-bold text-indigo-900 uppercase">Tindakan Pengendalian / Mitigasi</label>
                      <textarea
                        placeholder="cth: Wajib menggunakan safety harness 100% tie-off, lakukan toolbox meeting sebelum kerja..."
                        rows={2}
                        value={row.mitigation}
                        onChange={(e) => updateHiraRowValue(idx, 'mitigation', e.target.value)}
                        className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ----------------- IF JSA SUB-FORM (HIERARCHICAL) ----------------- */}
          {currentRecord.type === 'jsa' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex justify-between items-center border-t border-slate-200 pt-4">
                <h4 className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                  <ListOrdered className="h-4 w-4" />
                  ANALISIS KESELAMATAN PEKERJAAN (HIERARCHICAL JSA STEPS)
                </h4>
                <button
                  type="button"
                  onClick={addJsaStep}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah Urutan Langkah Dasar
                </button>
              </div>

              <div className="space-y-6">
                {(currentRecord.jsaSteps || []).map((step, sIdx) => (
                  <div key={step.id} className="p-5 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-4 shadow-xs relative">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-xs font-extrabold text-slate-800 flex items-center gap-2">
                        <span className="bg-slate-800 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-mono">
                          {step.stepNo}
                        </span>
                        Urutan Dasar Langkah Kerja #{step.stepNo}
                      </span>
                      {(currentRecord.jsaSteps || []).length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeJsaStep(sIdx)}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-0.5 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Hapus Langkah #{step.stepNo}
                        </button>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Uraian Langkah Kerja Dasar (Task Step)</label>
                      <textarea
                        placeholder="cth: Parkir unit service pada posisi area yang rata atau Berjalan dan membawa peralatan..."
                        rows={2}
                        value={step.stepDescription}
                        onChange={(e) => updateJsaStepDescription(sIdx, e.target.value)}
                        className="w-full p-2.5 text-xs bg-white border border-slate-250 rounded-xl focus:outline-none"
                        required
                      />
                    </div>

                    {/* Nested Hazards Section */}
                    <div className="pl-4 border-l-2 border-rose-200 space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-rose-750 uppercase tracking-wide">
                          Identifikasi Bahaya Terkait Langkah {step.stepNo}
                        </span>
                        <button
                          type="button"
                          onClick={() => addJsaHazard(sIdx)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer border border-rose-100"
                        >
                          <Plus className="h-3 w-3" /> Tambah Bahaya Terkait
                        </button>
                      </div>

                      {step.hazards.map((haz, hIdx) => (
                        <div key={haz.id} className="p-4 border border-rose-150 bg-white rounded-xl space-y-3 shadow-xs">
                          <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                            <span className="text-[11px] font-extrabold text-rose-700 font-mono">
                              Bahaya #{haz.hazardNo} (Identifikasi Bahaya)
                            </span>
                            {step.hazards.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeJsaHazard(sIdx, hIdx)}
                                className="text-[10px] font-semibold text-rose-500 hover:text-rose-700 flex items-center gap-0.5 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Hapus Bahaya
                              </button>
                            )}
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Potensi Bahaya Terkait terhadap kemungkinan terjadinya kecelakaan</label>
                            <input
                              type="text"
                              placeholder="cth: Unit Tertabrak/Menabrak Unit lain atau Kaki terpeleset pada lantai licin..."
                              value={haz.hazardDescription}
                              onChange={(e) => updateJsaHazardDescription(sIdx, hIdx, e.target.value)}
                              className="w-full px-3 py-2 text-xs bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white"
                              required
                            />
                          </div>

                          {/* Nested Actions Section */}
                          <div className="pl-4 border-l-2 border-indigo-150 space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wide">
                                Tindakan atau Prosedur Pencegahan untuk Bahaya {haz.hazardNo}
                              </span>
                              <button
                                type="button"
                                onClick={() => addJsaAction(sIdx, hIdx)}
                                className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md text-[9px] font-bold transition flex items-center gap-0.5 cursor-pointer border border-indigo-100"
                              >
                                <Plus className="h-2.5 w-2.5" /> Tambah Tindakan/Prosedur
                              </button>
                            </div>

                            {haz.actions.map((act, aIdx) => (
                              <div key={act.id} className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-indigo-600 font-mono shrink-0 w-12 text-center bg-indigo-50 py-0.5 rounded">
                                  {act.actionNo}
                                </span>
                                <input
                                  type="text"
                                  placeholder="cth: Harus ada spotter untuk mengarahkan unit..."
                                  value={act.actionDescription}
                                  onChange={(e) => updateJsaActionDescription(sIdx, hIdx, aIdx, e.target.value)}
                                  className="flex-grow px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400"
                                  required
                                />
                                {haz.actions.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeJsaAction(sIdx, hIdx, aIdx)}
                                    className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer hover:bg-rose-50 rounded"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ----------------- IF SOP SUB-FORM ----------------- */}
          {currentRecord.type === 'sop' && (
            <div className="space-y-6">
              <div className="border-t border-slate-200 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase">Tujuan SOP (Purpose)</label>
                  <textarea
                    placeholder="Tuliskan tujuan dibuatnya instruksi kerja/SOP ini secara ringkas..."
                    rows={3}
                    value={currentRecord.sopPurpose || ''}
                    onChange={(e) => setCurrentRecord({ ...currentRecord, sopPurpose: e.target.value })}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase">Ruang Lingkup (Scope)</label>
                  <textarea
                    placeholder="Tuliskan pihak/area yang wajib menerapkan standar operasional ini..."
                    rows={3}
                    value={currentRecord.sopScope || ''}
                    onChange={(e) => setCurrentRecord({ ...currentRecord, sopScope: e.target.value })}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase">Referensi / Undang-Undang Terkait</label>
                  <input
                    type="text"
                    placeholder="cth: Undang-Undang No 1 Tahun 1970"
                    value={currentRecord.sopReferences || ''}
                    onChange={(e) => setCurrentRecord({ ...currentRecord, sopReferences: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase">Alat & Bahan Pendukung</label>
                  <input
                    type="text"
                    placeholder="cth: Kunci Pas, Majun, Safety Belt, Sarung Tangan Kulit..."
                    value={currentRecord.sopToolsMaterials || ''}
                    onChange={(e) => setCurrentRecord({ ...currentRecord, sopToolsMaterials: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              {/* SOP Steps */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-t border-slate-200 pt-4">
                  <h4 className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    LANGKAH OPERASIONAL / METODOLOGI KERJA
                  </h4>
                  <button
                    type="button"
                    onClick={addSopStep}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-indigo-150"
                  >
                    <Plus className="h-3.5 w-3.5" /> Tambah Prosedur Langkah
                  </button>
                </div>

                <div className="space-y-4">
                  {currentRecord.sopSteps?.map((step, idx) => (
                    <div key={step.id} className="p-4 border border-slate-200 bg-slate-50/50 rounded-2xl space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                        <span className="text-xs font-bold text-slate-800">Langkah Prosedur #{step.stepNo}</span>
                        {currentRecord.sopSteps!.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSopStep(idx)}
                            className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-0.5 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Hapus
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-1 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Sub-Judul Langkah</label>
                          <input
                            type="text"
                            placeholder="cth: LOTO Isolation"
                            value={step.title}
                            onChange={(e) => updateSopStepValue(idx, 'title', e.target.value)}
                            className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none"
                            required
                          />
                        </div>
                        <div className="md:col-span-3 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Instruksi Kerja Detail (Description)</label>
                          <textarea
                            placeholder="Tuliskan secara urut dan jelas tindakan apa yang harus diambil pada proses ini..."
                            rows={2}
                            value={step.description}
                            onChange={(e) => updateSopStepValue(idx, 'description', e.target.value)}
                            className="w-full p-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => { setViewMode('list'); setCurrentRecord(null); }}
              className="px-4 py-2.5 border border-slate-250 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold cursor-pointer"
            >
              Batalkan
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="h-4 w-4" /> Simpan Dokumen
            </button>
          </div>
        </form>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CASE 3: OFFICIAL PRINT PREVIEW / PREVIEW SCREEN               */}
      {/* ------------------------------------------------------------- */}
      {viewMode === 'preview' && previewRecord && (
        <div className="space-y-6">
          {/* Header controls outside of print scope */}
          <div className="print:hidden flex justify-between items-center bg-indigo-50 border border-indigo-100 p-4 rounded-2xl">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-indigo-900">Formulir Resmi Berhasil Di-render! Siap untuk dicetak ke PDF atau Printer.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={triggerPrint}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow"
              >
                <Printer className="h-3.5 w-3.5" /> Cetak Sekarang (PDF)
              </button>
              <button
                onClick={() => setViewMode('list')}
                className="px-3.5 py-1.5 bg-white border border-slate-250 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-bold cursor-pointer"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* THE OFFICIAL PRINTABLE PAGE (Styled for PDF / Print Output)       */}
          {/* ----------------------------------------------------------------- */}
          <div className="bg-white p-6 sm:p-10 border border-slate-300 shadow-lg rounded-2xl max-w-4xl mx-auto print:p-0 print:border-none print:shadow-none print:max-w-full font-serif text-xs">
            
            {/* OFFICIAL HIRA & SOP LAYOUTS */}
            {previewRecord.type !== 'jsa' && (
              <>
                {/* 1. Official Header Table */}
                <div className="border border-slate-800 flex items-stretch">
                  <div className="w-[15%] p-2 border-r border-slate-800 flex items-center justify-center">
                    <img
                      src={companyLogo}
                      alt="PT ITU LOGO"
                      className="h-10 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="w-[50%] p-2 border-r border-slate-800 flex flex-col justify-center text-center">
                    <span className="font-extrabold text-xs uppercase leading-snug">PT INDOTRUCK UTAMA</span>
                    <span className="text-[10px] font-bold text-slate-500">DEPARTEMEN KESELAMATAN & KESEHATAN KERJA (HSE)</span>
                    <span className="text-xs font-black tracking-tight mt-1 uppercase text-slate-900">
                      {previewRecord.type === 'hira' ? 'IDENTIFIKASI BAHAYA & PENILAIAN RISIKO (HIRA)' : 'STANDART OPERASIONAL PROSEDUR (SOP)'}
                    </span>
                  </div>
                  <div className="w-[35%] p-2 flex flex-col justify-between text-[10px] font-mono leading-relaxed bg-slate-50/50">
                    <div>
                      <span className="font-bold text-slate-600">No. Dokumen:</span> <span className="font-black text-slate-900">{previewRecord.documentNo}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-600">Departemen:</span> <span className="font-black text-slate-900">{previewRecord.department}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-600">Tanggal:</span> <span className="font-black text-slate-900">{formatTanggalIndonesia(previewRecord.date)}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Document Details */}
                <div className="mt-4 border border-slate-800 bg-slate-50/20 p-3 flex flex-col sm:flex-row justify-between gap-2">
                  <div>
                    <span className="font-bold uppercase text-slate-600">Judul Prosedur / Nama Pekerjaan:</span>
                    <h3 className="text-sm font-black text-slate-900 mt-0.5">{previewRecord.title}</h3>
                  </div>
                  <div className="text-right">
                    <span className="font-bold uppercase text-slate-600">Disiapkan Oleh:</span>
                    <p className="text-xs font-black text-slate-800 mt-0.5">{previewRecord.createdBy}</p>
                  </div>
                </div>
              </>
            )}

            {/* Layout A: HIRA Content */}
            {previewRecord.type === 'hira' && previewRecord.hiraRows && (
              <div className="mt-6 space-y-4">
                <div className="border border-slate-800 rounded-lg overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[10.5px]">
                    <thead>
                      <tr className="bg-slate-900 text-white font-extrabold uppercase text-[10px]">
                        <th className="p-2 border border-slate-800 w-[5%] text-center">No</th>
                        <th className="p-2 border border-slate-800 w-[20%]">Aktivitas Kerja</th>
                        <th className="p-2 border border-slate-800 w-[20%]">Bahaya (Hazard)</th>
                        <th className="p-2 border border-slate-800 w-[20%]">Risiko Kerja</th>
                        <th className="p-2 border border-slate-800 w-[10%] text-center">Risiko Awal (P x S)</th>
                        <th className="p-2 border border-slate-800 w-[15%]">Pengendalian (Mitigasi)</th>
                        <th className="p-2 border border-slate-800 w-[10%] text-center">Risiko Sisa (P x S)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRecord.hiraRows.map((row, idx) => {
                        const initBadge = getRiskLevelAndColor(row.initRiskScore);
                        const resBadge = getRiskLevelAndColor(row.resRiskScore);
                        return (
                          <tr key={row.id} className="hover:bg-slate-50/50 align-top">
                            <td className="p-2 border border-slate-800 text-center font-mono font-bold">{idx + 1}</td>
                            <td className="p-2 border border-slate-800 leading-normal font-sans">{row.activity}</td>
                            <td className="p-2 border border-slate-800 leading-normal font-sans">{row.hazard}</td>
                            <td className="p-2 border border-slate-800 leading-normal font-sans">{row.risk}</td>
                            <td className="p-2 border border-slate-800 text-center font-sans font-semibold">
                              <div>{row.initProbability} x {row.initSeverity} = {row.initRiskScore}</div>
                              <span className={`inline-block mt-1 px-1.5 py-0.2 rounded text-[8px] font-extrabold border ${initBadge.color} ${initBadge.bg}`}>
                                {row.initRiskLevel}
                              </span>
                            </td>
                            <td className="p-2 border border-slate-800 leading-normal font-sans italic text-indigo-900">{row.mitigation}</td>
                            <td className="p-2 border border-slate-800 text-center font-sans font-semibold">
                              <div>{row.resProbability} x {row.resSeverity} = {row.resRiskScore}</div>
                              <span className={`inline-block mt-1 px-1.5 py-0.2 rounded text-[8px] font-extrabold border ${resBadge.color} ${resBadge.bg}`}>
                                {row.resRiskLevel}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Layout B: JSA Official PDF Layout Replica (THE NEW HIERARCHICAL LAYOUT) */}
            {previewRecord.type === 'jsa' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* 1. Official Header Table replica */}
                <div className="border border-slate-800">
                  {/* Row 1: Title and Logos */}
                  <div className="flex border-b border-slate-800 items-stretch">
                    <div className="w-[15%] p-3 border-r border-slate-800 flex items-center justify-center">
                      <img
                        src={companyLogo}
                        alt="PT INDOTRUCK UTAMA"
                        className="h-9 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="w-[70%] p-3 border-r border-slate-800 flex flex-col items-center justify-center text-center">
                      <h1 className="text-[13px] font-black tracking-wider text-slate-900">
                        ANALISIS KESELAMATAN KERJA ( JOB SAFETY ANALYSIS )
                      </h1>
                    </div>
                    <div className="w-[15%] p-2 flex flex-col justify-center items-center text-center">
                      <span className="text-[9px] font-black text-indigo-900 tracking-wider">PT INDOTRUCK UTAMA</span>
                      <span className="text-[7.5px] font-bold text-slate-500 mt-0.5 leading-none">PT SIS Admo Site</span>
                    </div>
                  </div>

                  {/* Row 2: Nomor Pekerjaan and Dates */}
                  <div className="grid grid-cols-12 border-b border-slate-800 text-[9.5px]">
                    <div className="col-span-4 p-2 border-r border-slate-800 flex flex-col justify-between h-11">
                      <span className="font-bold text-slate-500 text-[8px] uppercase">Nomor dan Nama Pekerjaan</span>
                      <span className="font-extrabold text-slate-900 truncate uppercase">{previewRecord.title || '-'}</span>
                    </div>
                    <div className="col-span-3 p-2 border-r border-slate-800 flex flex-col justify-between h-11">
                      <span className="font-bold text-slate-500 text-[8px] uppercase">Tanggal</span>
                      <span className="font-extrabold text-slate-900">{formatTanggalIndonesia(previewRecord.date)}</span>
                    </div>
                    <div className="col-span-5 p-2 flex flex-col justify-between h-11">
                      <span className="font-bold text-slate-500 text-[8px] uppercase">No JSEA</span>
                      <span className="font-extrabold text-slate-900 font-mono">{previewRecord.documentNo || '-'}</span>
                    </div>
                  </div>

                  {/* Row 3: Nama Jabatan, Disusun, Revisi */}
                  <div className="grid grid-cols-12 border-b border-slate-800 text-[9.5px]">
                    <div className="col-span-4 p-2 border-r border-slate-800">
                      <span className="font-bold text-slate-500 block text-[7.5px] uppercase leading-none">Nama Jabatan</span>
                      <span className="font-extrabold text-slate-800 mt-1 block uppercase">{previewRecord.namaJabatan || 'Grup Leader'}</span>
                    </div>
                    <div className="col-span-4 p-2 border-r border-slate-800">
                      <span className="font-bold text-slate-500 block text-[7.5px] uppercase leading-none">Disusun Oleh</span>
                      <span className="font-extrabold text-slate-800 mt-1 block uppercase">{previewRecord.disusunOleh || previewRecord.createdBy}</span>
                    </div>
                    <div className="col-span-4 p-2">
                      <span className="font-bold text-slate-500 block text-[7.5px] uppercase leading-none">No Revisi</span>
                      <span className="font-extrabold text-slate-800 mt-1 block uppercase">{previewRecord.noRevisi || '1'}</span>
                    </div>
                  </div>

                  {/* Row 4: Seksi, Diperiksa, Direview */}
                  <div className="grid grid-cols-12 border-b border-slate-800 text-[9.5px]">
                    <div className="col-span-4 p-2 border-r border-slate-800">
                      <span className="font-bold text-slate-500 block text-[7.5px] uppercase leading-none">Seksi / Departement</span>
                      <span className="font-extrabold text-slate-800 mt-1 block uppercase">{previewRecord.seksiDepartemen || 'Plant Hauler & Wheel Loader'}</span>
                    </div>
                    <div className="col-span-4 p-2 border-r border-slate-800">
                      <span className="font-bold text-slate-500 block text-[7.5px] uppercase leading-none">Diperiksa Oleh</span>
                      <span className="font-extrabold text-slate-800 mt-1 block uppercase">{previewRecord.diperiksaOleh || 'Abdul Rahman'}</span>
                    </div>
                    <div className="col-span-4 p-2">
                      <span className="font-bold text-slate-500 block text-[7.5px] uppercase leading-none">Direview</span>
                      <span className="font-extrabold text-slate-800 mt-1 block uppercase">{previewRecord.direviewOleh || 'Muhammad Ali - SHE Officer'}</span>
                    </div>
                  </div>

                  {/* Row 5: Superior, Disetujui */}
                  <div className="grid grid-cols-12 border-b border-slate-800 text-[9.5px]">
                    <div className="col-span-4 p-2 border-r border-slate-800">
                      <span className="font-bold text-slate-500 block text-[7.5px] uppercase leading-none">Jabatan Superior</span>
                      <span className="font-extrabold text-slate-800 mt-1 block uppercase">{previewRecord.jabatanSuperior || 'Unit Head'}</span>
                    </div>
                    <div className="col-span-4 p-2 border-r border-slate-800">
                      <span className="font-bold text-slate-500 block text-[7.5px] uppercase leading-none">Disetujui Oleh</span>
                      <span className="font-extrabold text-slate-800 mt-1 block uppercase">{previewRecord.disetujuiOleh || 'Hengky'}</span>
                    </div>
                    <div className="col-span-4 p-2 flex flex-col justify-center">
                      <span className="text-[7px] text-slate-400 uppercase font-bold tracking-wider block">Status Persetujuan</span>
                      <span className="text-emerald-700 font-extrabold uppercase text-[9px] mt-0.5">Telah Disetujui Secara Digital</span>
                    </div>
                  </div>

                  {/* Row 6: APD and Lokasi */}
                  <div className="grid grid-cols-12 text-[9.5px]">
                    <div className="col-span-8 p-2 border-r border-slate-800">
                      <span className="font-bold text-slate-500 block text-[7.5px] uppercase">Alat Pelindung Diri Yang Harus Dipakai :</span>
                      <span className="font-extrabold text-slate-800 mt-0.5 block">{previewRecord.apdWajib || 'Helm safety, Kacamata Safety, Sepatu safety, Sarung tangan'}</span>
                    </div>
                    <div className="col-span-4 p-2">
                      <span className="font-bold text-slate-500 block text-[7.5px] uppercase">Lokasi Kerja :</span>
                      <span className="font-extrabold text-slate-800 mt-0.5 block">{previewRecord.lokasiKerja || 'PT Saptaindra Sejati Site Admo'}</span>
                    </div>
                  </div>
                </div>

                {/* Hierarchical Official JSA Steps Table */}
                <div className="border border-slate-800 overflow-hidden mt-6">
                  <table className="w-full text-left border-collapse text-[9.5px] font-sans">
                    <thead>
                      <tr className="bg-slate-100 text-slate-900 font-extrabold uppercase text-[8.5px] text-center border-b border-slate-800">
                        <th className="p-2.5 border-r border-slate-800 w-[26%]">Urutan Dasar Langkah Kerja</th>
                        <th className="p-2.5 border-r border-slate-800 w-[34%]">Bahaya yang terkait</th>
                        <th className="p-2.5 w-[40%]">Tindakan atau Prosedur Pencegahan yang direkomendasikan</th>
                      </tr>
                      <tr className="bg-slate-50 text-[7.5px] text-slate-500 text-center italic leading-tight border-b border-slate-800">
                        <td className="p-2 border-r border-slate-800 px-3 font-medium">Uraian pekerjaan tersebut menjadi beberapa langkah kerja dasar</td>
                        <td className="p-2 border-r border-slate-800 px-3 font-medium">Identifikasi bahaya yang berhubungan dengan tiap-tiap langkah kerja tersebut terhadap kemungkinan terjadinya kecelakaan</td>
                        <td className="p-2 px-3 font-medium">Gunakan kedua kolom tadi sebagai pembimbing, tentukan tindakan apa yang perlu diambil untuk menghilangkan atau memperkecil bahaya yang dapat menimbulkan kecelakaan, cidera atau penyakit akibat kerja</td>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const steps = previewRecord.jsaSteps || convertRowsToSteps((previewRecord as any).jsaRows || []);
                        if (!steps || steps.length === 0) {
                          return (
                            <tr>
                              <td colSpan={3} className="p-8 text-center text-slate-400 italic">
                                Belum ada data langkah kerja untuk JSA ini.
                              </td>
                            </tr>
                          );
                        }

                        return steps.map((step) => {
                          const totalActions = step.hazards.reduce((acc, haz) => acc + haz.actions.length, 0);

                          return step.hazards.map((haz, hazIdx) => {
                            const hazRowSpan = haz.actions.length;

                            return haz.actions.map((act, actIdx) => {
                              const isFirstActionOfStep = hazIdx === 0 && actIdx === 0;
                              const isFirstActionOfHazard = actIdx === 0;

                              return (
                                <tr key={act.id} className="align-top border-b border-slate-800 last:border-b-0">
                                  {isFirstActionOfStep && (
                                    <td
                                      rowSpan={totalActions}
                                      className="p-3 border-r border-slate-800 font-sans font-bold text-slate-950 bg-white"
                                    >
                                      <div className="flex gap-2">
                                        <span className="text-slate-900 bg-slate-100 rounded px-1.5 py-0.5 text-[9px] font-mono h-fit">
                                          {step.stepNo}
                                        </span>
                                        <span className="leading-relaxed">{step.stepDescription}</span>
                                      </div>
                                    </td>
                                  )}

                                  {isFirstActionOfHazard && (
                                    <td
                                      rowSpan={hazRowSpan}
                                      className="p-3 border-r border-slate-800 font-sans bg-white"
                                    >
                                      <div className="flex gap-1.5">
                                        <span className="font-extrabold text-rose-700 font-mono shrink-0">
                                          {haz.hazardNo}
                                        </span>
                                        <span className="text-slate-850 leading-relaxed font-medium">{haz.hazardDescription}</span>
                                      </div>
                                    </td>
                                  )}

                                  <td className="p-3 font-sans bg-white">
                                    <div className="flex gap-1.5">
                                      <span className="font-extrabold text-indigo-700 font-mono shrink-0">
                                        {act.actionNo}
                                      </span>
                                      <span className="text-slate-900 leading-relaxed font-medium">{act.actionDescription}</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            });
                          });
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Layout C: SOP Content */}
            {previewRecord.type === 'sop' && (
              <div className="mt-6 space-y-6 text-[11px]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-slate-800 p-3 space-y-1 rounded-lg">
                    <h4 className="font-bold text-slate-800 uppercase border-b border-slate-200 pb-1">1. Tujuan (Purpose)</h4>
                    <p className="leading-relaxed text-slate-700 font-sans">{previewRecord.sopPurpose || '-'}</p>
                  </div>
                  <div className="border border-slate-800 p-3 space-y-1 rounded-lg">
                    <h4 className="font-bold text-slate-800 uppercase border-b border-slate-200 pb-1">2. Ruang Lingkup (Scope)</h4>
                    <p className="leading-relaxed text-slate-700 font-sans">{previewRecord.sopScope || '-'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-slate-800 p-3 space-y-1 rounded-lg">
                    <h4 className="font-bold text-slate-800 uppercase border-b border-slate-200 pb-1">3. Referensi / Acuan Hukum</h4>
                    <p className="leading-relaxed text-slate-700 font-sans">{previewRecord.sopReferences || '-'}</p>
                  </div>
                  <div className="border border-slate-800 p-3 space-y-1 rounded-lg">
                    <h4 className="font-bold text-slate-800 uppercase border-b border-slate-200 pb-1">4. Peralatan & Bahan</h4>
                    <p className="leading-relaxed text-slate-700 font-sans">{previewRecord.sopToolsMaterials || '-'}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 uppercase">5. Prosedur Pelaksanaan Kerja / Langkah Operasional</h4>
                  <div className="border border-slate-800 rounded-lg overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-white font-extrabold uppercase text-[10px]">
                          <th className="p-2 border border-slate-800 w-[10%] text-center">Urutan</th>
                          <th className="p-2 border border-slate-800 w-[25%]">Proses Kerja</th>
                          <th className="p-2 border border-slate-800 w-[65%]">Detail Instruksi Kerja</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewRecord.sopSteps?.map((step) => (
                          <tr key={step.id} className="hover:bg-slate-50/50 align-top">
                            <td className="p-2.5 border border-slate-800 text-center font-mono font-bold">Langkah #{step.stepNo}</td>
                            <td className="p-2.5 border border-slate-800 font-sans font-bold text-indigo-900">{step.title}</td>
                            <td className="p-2.5 border border-slate-800 leading-relaxed font-sans text-slate-700">{step.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Official Signatures Section (HIRA, JSA, SOP) */}
            <div className="mt-8 border-t border-slate-350 pt-5">
              <p className="text-[9.5px] text-center italic text-slate-400 mb-4">
                Dokumen Keselamatan Kerja PT INDOTRUCK UTAMA - Site PT SIS Admo. Pengesahan terverifikasi secara elektronik.
              </p>
              <div className="grid grid-cols-3 gap-6 text-center text-[9px] uppercase font-sans">
                {/* Prepared By (Creator) */}
                <div className="flex flex-col justify-between h-24 border border-slate-200 p-2 bg-slate-50/30 rounded-lg">
                  <span className="font-bold text-slate-500">Dibuat Oleh,</span>
                  <div className="flex justify-center my-1 h-10 items-center">
                    {userTtdUrl && (previewRecord.createdBy === userRealName || !previewRecord.disusunOleh) ? (
                      <img
                        src={userTtdUrl}
                        alt="Signature Creator"
                        className="h-10 max-w-full object-contain mix-blend-multiply animate-in fade-in duration-200"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-[8px] text-slate-400 italic">Terdaftar Secara Digital</span>
                    )}
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-950 underline block leading-none">{previewRecord.disusunOleh || previewRecord.createdBy}</span>
                    <span className="text-[7.5px] text-slate-500 mt-0.5 block leading-none">{previewRecord.namaJabatan || 'HSE Officer'}</span>
                  </div>
                </div>

                {/* Checked By (Supervisor) */}
                <div className="flex flex-col justify-between h-24 border border-slate-200 p-2 bg-slate-50/30 rounded-lg">
                  <span className="font-bold text-slate-500">Diperiksa Oleh,</span>
                  <div className="flex justify-center my-1 h-10 items-center">
                    <span className="text-[8px] text-slate-400 italic">Disetujui Digital</span>
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-950 underline block leading-none">{previewRecord.diperiksaOleh || 'Abdul Rahman'}</span>
                    <span className="text-[7.5px] text-slate-500 mt-0.5 block leading-none">Supervisor / Officer</span>
                  </div>
                </div>

                {/* Approved By (Manager) */}
                <div className="flex flex-col justify-between h-24 border border-slate-200 p-2 bg-slate-50/30 rounded-lg">
                  <span className="font-bold text-slate-500">Disetujui Oleh,</span>
                  <div className="flex justify-center my-1 h-10 items-center">
                    <span className="text-[8px] text-slate-400 italic">Disetujui Digital</span>
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-950 underline block leading-none">{previewRecord.disetujuiOleh || 'Hengky'}</span>
                    <span className="text-[7.5px] text-slate-500 mt-0.5 block leading-none">Unit Head / Manager</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer copyright for printable view */}
            <div className="mt-8 text-center text-[7.5px] text-slate-400 border-t border-slate-200 pt-3 font-mono">
              PT Indotruck Utama_Site PT SIS Admo | JSA 11 | Dokumen terkontrol elektronik. Tanggal Cetak: {new Date().toLocaleDateString('id-ID')}.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
