/**
 * Marka bileşenleri.
 * `LogoMark` tek başına kullanılabilen amblem, `Logo` amblem + kelime markası.
 */

interface LogoMarkProps {
  className?: string;
  /** Koyu zeminlerde amblemin çevresine ince bir ışık halkası ekler */
  glow?: boolean;
}

export function LogoMark({ className = 'h-10 w-10', glow = false }: LogoMarkProps) {
  return (
    <span className={`relative inline-flex ${className}`}>
      {glow && (
        <span
          aria-hidden="true"
          className="absolute -inset-2 rounded-2xl bg-brand-500/40 blur-xl"
        />
      )}
      <svg
        viewBox="0 0 48 48"
        className="relative h-full w-full drop-shadow-sm"
        role="img"
        aria-label="Furnigo"
      >
        <defs>
          <linearGradient id="furnigo-mark" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8C8CFA" />
            <stop offset="55%" stopColor="#5B4BE8" />
            <stop offset="100%" stopColor="#3C30A1" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="13" fill="url(#furnigo-mark)" />
        <g fill="#fff">
          <rect x="13" y="12" width="5.5" height="24" rx="2.75" />
          <rect x="13" y="12" width="22" height="5.5" rx="2.75" />
          <rect x="13" y="21.25" width="15" height="5.5" rx="2.75" />
        </g>
        <circle cx="33.5" cy="33.5" r="3.75" fill="#FFA932" />
      </svg>
    </span>
  );
}

interface LogoProps {
  className?: string;
  /** Koyu zemin için açık renkli yazı */
  tone?: 'light' | 'dark';
  markClassName?: string;
  subtitle?: string;
}

export function Logo({
  className = '',
  tone = 'dark',
  markClassName = 'h-9 w-9',
  subtitle = 'PUANTAJ',
}: LogoProps) {
  const isLight = tone === 'light';
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className={markClassName} glow={isLight} />
      <span className="flex flex-col leading-none">
        <span
          className={`font-display text-[17px] font-extrabold tracking-tight ${
            isLight ? 'text-white' : 'text-ink-900'
          }`}
        >
          FURNİGO
        </span>
        {subtitle && (
          <span
            className={`mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${
              isLight ? 'text-white/60' : 'text-ink-400'
            }`}
          >
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}
