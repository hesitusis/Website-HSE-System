import React from 'react';

export interface FormFieldProps {
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required,
  error,
  helperText,
  children,
  className = ''
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-[11px] font-semibold text-red-600 animate-in fade-in">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
};

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  className = '',
  error,
  icon,
  ...props
}, ref) => {
  return (
    <div className="relative w-full">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          {icon}
        </div>
      )}
      <input
        ref={ref}
        className={`w-full px-3.5 py-2 text-xs sm:text-sm font-semibold bg-slate-50 border rounded-xl transition-all duration-150 focus:bg-white focus:outline-none focus:ring-2 ${
          icon ? 'pl-9' : ''
        } ${
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
            : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200/50'
        } ${className}`}
        {...props}
      />
    </div>
  );
});

Input.displayName = 'Input';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({
  className = '',
  error,
  children,
  ...props
}, ref) => {
  return (
    <select
      ref={ref}
      className={`w-full px-3.5 py-2 text-xs sm:text-sm font-semibold bg-slate-50 border rounded-xl transition-all duration-150 focus:bg-white focus:outline-none focus:ring-2 ${
        error
          ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
          : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200/50'
      } ${className}`}
      {...props}
    >
      {children}
    </select>
  );
});

Select.displayName = 'Select';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({
  className = '',
  error,
  ...props
}, ref) => {
  return (
    <textarea
      ref={ref}
      className={`w-full px-3.5 py-2 text-xs sm:text-sm font-semibold bg-slate-50 border rounded-xl transition-all duration-150 focus:bg-white focus:outline-none focus:ring-2 ${
        error
          ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
          : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-200/50'
      } ${className}`}
      {...props}
    />
  );
});

Textarea.displayName = 'Textarea';
