import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Memuat data...',
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center space-y-3 ${className}`}>
      <div className="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
      <p className="text-xs sm:text-sm font-semibold text-slate-500">{message}</p>
    </div>
  );
};

export default LoadingState;
