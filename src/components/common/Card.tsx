import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  header,
  footer
}) => {
  return (
    <div className={`bg-white border border-slate-200/90 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden ${className}`}>
      {header && (
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          {header}
        </div>
      )}
      <div className="p-5">{children}</div>
      {footer && (
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
