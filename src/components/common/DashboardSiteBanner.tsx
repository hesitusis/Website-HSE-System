import React from 'react';
import { MapPin, Building2, CheckCircle2, ChevronRight, Globe, Layers } from 'lucide-react';
import { SITES, SiteFilter, SiteId } from '../../constants/sites.js';

interface DashboardSiteBannerProps {
  activeSite: SiteFilter;
  onSelectSite: (site: SiteFilter) => void;
  siteStats?: Record<string, { totalTransactions?: number; totalKaryawan?: number }>;
}

export const DashboardSiteBanner: React.FC<DashboardSiteBannerProps> = ({
  activeSite,
  onSelectSite,
  siteStats
}) => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-50 border border-indigo-150 flex items-center justify-center text-indigo-600">
              <Building2 className="h-4 w-4" />
            </div>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
              Pusat Kendali Multi-Site Operasional K3 & HSE
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 ml-9">
            Pilih site untuk memfilter seluruh data APD, Training, MCU, Formulir, dan Laporan Keselamatan.
          </p>
        </div>

        {/* Global All Sites Button */}
        <button
          type="button"
          onClick={() => onSelectSite('ALL')}
          className={`self-start sm:self-auto px-3.5 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSite === 'ALL'
              ? 'bg-purple-600 text-white border-purple-600 shadow-sm ring-2 ring-purple-200'
              : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
          }`}
        >
          <Globe className="h-3.5 w-3.5" />
          <span>Semua Site (Multi-Site)</span>
          {activeSite === 'ALL' && <CheckCircle2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* 3 Site Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
        {SITES.map((site, index) => {
          const isActive = activeSite === site.id;
          return (
            <div
              key={site.id}
              onClick={() => onSelectSite(site.id)}
              className={`relative rounded-2xl border p-4 cursor-pointer transition-all duration-150 flex flex-col justify-between ${
                isActive
                  ? `${site.badgeBg} ${site.badgeBorder} ring-2 ring-indigo-500/30 shadow-md`
                  : 'bg-slate-50/60 hover:bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-white border border-slate-200 shadow-2xs text-slate-700">
                      Site {index + 1}
                    </span>
                    <span className={`h-2 w-2 rounded-full ${site.dotColor}`} />
                  </div>
                  {isActive ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/70 border border-emerald-300 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="h-3 w-3" /> Aktif
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-400 group-hover:text-slate-600 flex items-center gap-0.5">
                      Pilih <ChevronRight className="h-3 w-3" />
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                  {site.name}
                </h3>
                <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
                  {site.fullName.replace('PT Indotruck Utama - ', '')}
                </p>
                <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-2">
                  <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                  <span className="truncate">{site.location}</span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[10.5px]">
                <span className="text-slate-500 font-medium">Status Operasi:</span>
                <span className="font-extrabold text-emerald-600 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Terhubung
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardSiteBanner;
