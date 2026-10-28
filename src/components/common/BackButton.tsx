import React from 'react';
import { ArrowLeft } from 'lucide-react';

export interface BackButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClick: () => void;
  label?: string;
  showLabel?: boolean;
}

export const BackButton: React.FC<BackButtonProps> = ({
  onClick,
  label = 'Kembali',
  showLabel = true,
  className = '',
  ...props
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100/80 active:bg-slate-200 border border-slate-200 rounded-xl shadow-sm hover:shadow transition-all duration-150 shrink-0 touch-manipulation focus:outline-none focus:ring-2 focus:ring-indigo-500/20 active:scale-95 ${className}`}
      title={label}
      aria-label={label}
      {...props}
    >
      <ArrowLeft className="h-4 w-4 text-slate-600 shrink-0" />
      {showLabel && <span className="hidden sm:inline text-slate-700 font-semibold">{label}</span>}
    </button>
  );
};

export default BackButton;
