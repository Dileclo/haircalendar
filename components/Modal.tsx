'use client';

import { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  center?: boolean;
}

export function Modal({ open, onClose, title, children, center }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={center ? { alignItems: 'center' } : undefined}>
      <div className="dialog" onClick={e => e.stopPropagation()}>
        {title && (
          <h2 className="text-lg font-semibold mb-4 text-center">{title}</h2>
        )}
        {children}
      </div>
    </div>
  );
}
