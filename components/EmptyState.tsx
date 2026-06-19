interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
}

export function EmptyState({ icon = '📭', title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="text-5xl mb-4">{icon}</div>
      <div className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{title}</div>
      {description && (
        <div className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>{description}</div>
      )}
    </div>
  );
}
