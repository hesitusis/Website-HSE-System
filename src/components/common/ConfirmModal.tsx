import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal.js';
import Button from './Button.js';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Konfirmasi Tindakan',
  message,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  variant = 'danger',
  isLoading = false
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md">
      <div className="flex flex-col items-center text-center p-2 space-y-4">
        <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${
          variant === 'danger' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
        }`}>
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{message}</p>
        </div>
        <div className="flex items-center justify-center gap-3 w-full pt-4">
          <Button variant="secondary" onClick={onClose} disabled={isLoading} className="w-1/2">
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
            className="w-1/2"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
