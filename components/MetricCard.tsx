interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: string;
  onClick?: () => void;
  subtitle?: string;
  subtitleColor?: string;
}

export function MetricCard({ label, value, icon, accent = '#007AFF', onClick, subtitle, subtitleColor }: MetricCardProps) {
  return (
    <div className={`metric-card flex items-start gap-3${onClick ? ' cursor-pointer active:scale-[0.98] transition-transform' : ''}`} onClick={onClick}>
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${accent}18` }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs text-[var(--text-secondary)] font-medium truncate">{label}</div>
        <div className="text-xl font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{value}</div>
        {subtitle && (
          <div className="text-xs mt-0.5 font-medium" style={{ color: subtitleColor || 'var(--text-secondary)' }}>{subtitle}</div>
        )}
      </div>
    </div>
  );
}
