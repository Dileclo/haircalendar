'use client';

import { useEffect } from 'react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="bottom-sheet no-scrollbar" onClick={e => e.stopPropagation()}>
        <div className="bottom-sheet-handle" />
        {title && (
          <h2 className="text-lg font-semibold mb-4 text-center">{title}</h2>
        )}
        {children}
      </div>
    </div>
  );
}
