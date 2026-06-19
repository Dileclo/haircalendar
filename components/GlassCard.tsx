'use client';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  padding?: boolean;
}

export function GlassCard({ children, className = '', onClick, padding = true }: GlassCardProps) {
  return (
    <div
      className={`glass ${padding ? 'p-4' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      {children}
    </div>
  );
}
