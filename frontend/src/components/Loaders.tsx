import { LogoMark } from './Brand';

/** Oturum doğrulanırken gösterilen tam ekran markalı yükleyici */
export function FullPageLoader({ label = 'Yükleniyor...' }: { label?: string }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-canvas">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 app-backdrop" />
      <div className="relative flex flex-col items-center gap-5 animate-fade-up">
        <span className="relative inline-flex">
          <span
            aria-hidden="true"
            className="absolute -inset-4 rounded-3xl bg-brand-500/25 blur-2xl animate-pulse"
          />
          <LogoMark className="relative h-14 w-14 animate-float" />
        </span>
        <span className="spinner h-6 w-6" />
        <p className="text-sm font-medium text-ink-500">{label}</p>
      </div>
    </div>
  );
}

/** Kart/panel içinde veri beklenirken gösterilen yükleyici */
export function PanelLoader({ label = 'Yükleniyor...' }: { label?: string }) {
  return (
    <div className="card">
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-16">
        <span className="spinner h-8 w-8" />
        <p className="text-sm font-medium text-ink-500">{label}</p>
      </div>
    </div>
  );
}

/** Liste/tablo yüklenirken kullanılan iskelet satırlar */
export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-5">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-10 rounded-xl animate-shimmer"
          style={{ animationDelay: `${i * 90}ms` }}
        />
      ))}
    </div>
  );
}
