'use client';

export default function OfflinePage() {
  return (
    <div className="page-enter flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
      <div style={{ fontSize: 80, marginBottom: 16 }}>
        📡
      </div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
        Нет подключения
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 24, maxWidth: 280 }}>
        Проверьте соединение с интернетом и попробуйте снова
      </p>
      <button
        className="btn-primary"
        onClick={() => window.location.reload()}
        style={{ minWidth: 160 }}
      >
        Повторить
      </button>
    </div>
  );
}
