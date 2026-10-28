import React from 'react';

export interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export const Table: React.FC<TableProps> = ({ children, className = '' }) => {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/80 shadow-sm bg-white">
      <table className={`w-full text-left border-collapse ${className}`}>
        {children}
      </table>
    </div>
  );
};

export interface TableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const TableHeader: React.FC<TableHeaderProps> = ({ children, className = '' }) => {
  return (
    <thead className={`bg-slate-50 border-b border-slate-200/80 ${className}`}>
      {children}
    </thead>
  );
};

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
  className?: string;
}

export const TableHead: React.FC<TableHeadProps> = ({ children, className = '', ...props }) => {
  return (
    <th
      className={`py-3.5 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-left ${className}`}
      {...props}
    >
      {children}
    </th>
  );
};

export interface TableBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const TableBody: React.FC<TableBodyProps> = ({ children, className = '' }) => {
  return (
    <tbody className={`divide-y divide-slate-100 text-xs text-slate-700 font-medium ${className}`}>
      {children}
    </tbody>
  );
};

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
  className?: string;
}

export const TableRow: React.FC<TableRowProps> = ({ children, className = '', ...props }) => {
  return (
    <tr
      className={`hover:bg-slate-50/80 transition-colors duration-150 ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
};

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
  className?: string;
}

export const TableCell: React.FC<TableCellProps> = ({ children, className = '', ...props }) => {
  return (
    <td className={`py-3 px-4 align-middle ${className}`} {...props}>
      {children}
    </td>
  );
};

export default Table;
