import React from 'react';
import { 
  FileText, 
  ChevronRight, 
  ShieldCheck
} from 'lucide-react';
import { PageHeader } from './common/index.js';

interface PengajuanMenuProps {
  onSelectForm: (formId: string) => void;
  onBack: () => void;
}

export default function PengajuanMenu({ onSelectForm, onBack }: PengajuanMenuProps) {
  const availableForms = [
    {
      id: 'dpb',
      title: 'DAFTAR PERMINTAAN BARANG (DPB)',
      subtitle: 'ITU SIS Admo Tutupan Tabalong',
      desc: 'Formulir daftar permintaan barang resmi (DPB) dengan rincian barang, UoM, prioritas, pengesahan Admin/GL/PJO, serta cetak format A4.',
      icon: <FileText className="h-6 w-6 text-sky-600" />,
      colorClass: 'bg-sky-50/80 border-sky-150 text-sky-950 hover:bg-sky-100/50',
      badge: 'Baku & Siap Cetak'
    },
    {
      id: 'bakt_apd',
      title: 'Pengajuan BAKT APD',
      subtitle: 'Berita Acara Kerusakan / Penggantian APD',
      desc: 'Formulir resmi pengajuan penggantian APD rusak (sepatu/sepatu safety, helm, earplug dll) lengkap dengan lampiran 3 foto bukti dan cetak format baku.',
      icon: <ShieldCheck className="h-6 w-6 text-indigo-650" />,
      colorClass: 'bg-indigo-50 border-indigo-150 text-indigo-950 hover:bg-indigo-100/50',
      badge: 'Baku & Siap Cetak'
    },
    {
      id: 'bak',
      title: 'Pengajuan BAK (Berita Acara Kerusakan)',
      subtitle: 'Berita Acara Kerusakan Alat & Perlengkapan Umum',
      desc: 'Formulir berita acara kerusakan inventaris lapangan, alat kerja (tools), aset tambahan, atau perlengkapan umum siap cetak A4.',
      icon: <FileText className="h-6 w-6 text-emerald-650" />,
      colorClass: 'bg-emerald-55/40 border-emerald-150 text-emerald-950 hover:bg-emerald-100/50',
      badge: 'Baku & Siap Cetak'
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Header section */}
      <PageHeader
        title="Menu Pengajuan Dokumen"
        subtitle="Pusat administrasi pelaporan, permohonan surat berita acara, dan lembar kelayakan operasional krosis digital."
        onBack={onBack}
        icon={<FileText className="h-6 w-6" />}
      />

      {/* Main Forms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
        {availableForms.map((f) => {
          const isAvailable = f.id === 'bakt_apd' || f.id === 'bak' || f.id === 'dpb';
          const isBak = f.id === 'bak';
          const isDpb = f.id === 'dpb';
          const badgeTheme = isAvailable 
            ? (isBak ? 'bg-emerald-600 text-white shadow-sm' : isDpb ? 'bg-sky-600 text-white shadow-sm' : 'bg-indigo-600 text-white shadow-sm') 
            : 'bg-slate-200 text-slate-600';
          const textLinkTheme = isBak ? 'text-emerald-700' : 'text-indigo-600';

          return (
            <div
              key={f.id}
              onClick={() => isAvailable && onSelectForm(f.id)}
              className={`p-5 rounded-2xl border transition duration-200 flex flex-col justify-between cursor-pointer relative overflow-hidden group ${f.colorClass} ${
                !isAvailable && 'opacity-65 cursor-not-allowed'
              }`}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-white rounded-xl shadow-sm border">
                    {f.icon}
                  </div>
                  {f.badge && (
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase ${badgeTheme}`}>
                      {f.badge}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-black tracking-tight text-slate-900 group-hover:text-emerald-950">{f.title}</h3>
                  <p className="text-[10px] font-bold text-slate-500 font-mono mt-0.5">{f.subtitle}</p>
                  <p className="text-xs text-slate-600 mt-3 leading-relaxed">{f.desc}</p>
                </div>
              </div>

              {isAvailable && (
                <div className={`mt-5 pt-3.5 border-t border-black/5 flex items-center justify-between text-xs font-bold ${textLinkTheme}`}>
                  <span>Isi permohonan sekarang</span>
                  <ChevronRight className={`h-4 w-4 transition group-hover:translate-x-1 ${textLinkTheme}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}

