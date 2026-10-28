import React from 'react';
import BackButton from './BackButton.js';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  onBack,
  backLabel = 'Kembali',
  badge,
  actions,
  icon,
  className = ''
}) => {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-slate-200/80 ${className}`}>
      <div className="flex items-start sm:items-center gap-3">
        {onBack && (
          <BackButton onClick={onBack} label={backLabel} />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {icon && <span className="text-indigo-600 shrink-0">{icon}</span>}
            <h1 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight leading-snug truncate">
              {title}
            </h1>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2 flex-wrap sm:shrink-0 pt-1 sm:pt-0">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
