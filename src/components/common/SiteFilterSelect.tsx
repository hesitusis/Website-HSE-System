import React from 'react';
import { MapPin } from 'lucide-react';
import { SITES, SiteFilter, SiteId } from '../../constants/sites.js';

interface SiteFilterSelectProps {
  value: SiteFilter;
  onChange: (site: SiteFilter) => void;
  allowAll?: boolean;
  allLabel?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const SiteFilterSelect: React.FC<SiteFilterSelectProps> = ({
  value,
  onChange,
  allowAll = true,
  allLabel = 'Semua Site (Semua Lokasi)',
  size = 'sm',
  className = ''
}) => {
  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SiteFilter)}
        className={`w-full px-3 pr-8 bg-white border border-slate-200 hover:border-slate-300 rounded-xl font-bold text-slate-700 outline-none transition-all shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 cursor-pointer ${
          size === 'sm' ? 'py-1.5 text-xs' : 'py-2 text-sm'
        }`}
      >
        {allowAll && (
          <option value="ALL">🌐 {allLabel}</option>
        )}
        {SITES.map((site) => (
          <option key={site.id} value={site.id}>
            📍 {site.name} — {site.shortName} ({site.location.split(',')[0]})
          </option>
        ))}
      </select>
    </div>
  );
};

interface SiteFormFieldProps {
  value: SiteId | string;
  onChange: (site: SiteId) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const SiteFormField: React.FC<SiteFormFieldProps> = ({
  value,
  onChange,
  label = 'Lokasi / Site Proyek',
  required = true,
  disabled = false,
  className = ''
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-indigo-500" />
            {label}
            {required && <span className="text-rose-500">*</span>}
          </span>
          <span className="text-[10px] text-slate-400 lowercase font-medium">3 site aktif</span>
        </label>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {SITES.map((site) => {
          const isSelected = value === site.id;
          return (
            <button
              type="button"
              key={site.id}
              disabled={disabled}
              onClick={() => onChange(site.id)}
              className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between gap-2 cursor-pointer ${
                isSelected
                  ? `${site.badgeBg} ${site.badgeBorder} ring-2 ring-indigo-400/40 shadow-sm`
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${site.dotColor}`} />
                  <span className={`text-xs font-black tracking-tight ${isSelected ? site.badgeText : 'text-slate-800'}`}>
                    {site.name}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                  {site.shortName} • {site.location.split(',')[0]}
                </div>
              </div>
              {isSelected && (
                <span className="text-indigo-600 text-xs font-bold shrink-0">✓</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
