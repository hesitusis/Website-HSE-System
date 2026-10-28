import React, { useState } from 'react';
import { MapPin, ChevronDown, Check, Globe, Building2 } from 'lucide-react';
import { SITES, SiteFilter, SiteId, getSiteInfo } from '../../constants/sites.js';

interface SiteHeaderSwitcherProps {
  activeSite: SiteFilter;
  onSelectSite: (site: SiteFilter) => void;
  className?: string;
  compact?: boolean;
}

export const SiteHeaderSwitcher: React.FC<SiteHeaderSwitcherProps> = ({
  activeSite,
  onSelectSite,
  className = '',
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const isAll = activeSite === 'ALL';
  const siteInfo = !isAll ? getSiteInfo(activeSite as SiteId) : null;

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition shadow-xs cursor-pointer select-none ${
          isAll
            ? 'bg-purple-50 hover:bg-purple-100/70 border-purple-200 text-purple-900'
            : `${siteInfo?.badgeBg} hover:opacity-90 ${siteInfo?.badgeBorder} ${siteInfo?.badgeText}`
        }`}
        title="Klik untuk mengganti Site aktif"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`h-2 w-2 rounded-full shrink-0 ${isAll ? 'bg-purple-500 animate-pulse' : siteInfo?.dotColor}`} />
          {isAll ? (
            <Globe className="h-3.5 w-3.5 text-purple-600 shrink-0" />
          ) : (
            <MapPin className="h-3.5 w-3.5 shrink-0" />
          )}
          <span className="text-xs font-black tracking-tight truncate">
            {isAll ? 'Semua Site (3 Lokasi)' : siteInfo?.name}
          </span>
          {!compact && !isAll && (
            <span className="hidden md:inline-block text-[10px] opacity-75 font-medium truncate max-w-[110px]">
              • {siteInfo?.shortName}
            </span>
          )}
        </div>
        <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0 ml-0.5" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 sm:left-0 sm:right-auto top-full mt-2 w-80 bg-white border border-slate-200 shadow-2xl rounded-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-2.5 py-2 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                Pilih Lokasi Kerja / Site
              </span>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                3 Site Aktif
              </span>
            </div>

            <div className="py-2 space-y-1.5">
              {/* Option: Semua Site */}
              <button
                type="button"
                onClick={() => {
                  onSelectSite('ALL');
                  setIsOpen(false);
                }}
                className={`w-full text-left p-2.5 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                  isAll
                    ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-200'
                    : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <Globe className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-900">
                      Semua Site (Multi-Site Global)
                    </div>
                    <div className="text-[10.5px] text-slate-500">
                      Tampilkan data gabungan Admo, MMI & Vale
                    </div>
                  </div>
                </div>
                {isAll && <Check className="h-4 w-4 text-purple-600 shrink-0 font-bold" />}
              </button>

              <div className="h-px bg-slate-100 my-1" />

              {/* 3 Sites */}
              {SITES.map((site) => {
                const isSelected = activeSite === site.id;
                return (
                  <button
                    type="button"
                    key={site.id}
                    onClick={() => {
                      onSelectSite(site.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? `${site.badgeBg} ${site.badgeBorder} ring-2 ring-indigo-300`
                        : 'bg-white border-slate-150 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${site.badgeBg} ${site.badgeText} border ${site.badgeBorder}`}>
                        <span className="text-xs font-black">{site.shortName[0]}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${site.dotColor}`} />
                          <span className="text-xs font-extrabold text-slate-900">
                            {site.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium truncate">
                            ({site.shortName})
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">
                          📍 {site.location}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 ml-1">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 px-2 text-[10px] text-slate-400 text-center">
              Perubahan site otomatis menyesuaikan data formulir & monitoring
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SiteHeaderSwitcher;
