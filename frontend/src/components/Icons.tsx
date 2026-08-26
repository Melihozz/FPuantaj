/**
 * Uygulama genelinde kullanılan ince çizgili ikon seti.
 * Hepsi 24x24 viewBox, `currentColor` ile boyanır; boyut className ile verilir.
 */

interface IconProps {
  className?: string;
}

const base = 'shrink-0';

function Stroke({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      className={`${base} ${className ?? 'h-5 w-5'}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IconGrid = (p: IconProps) => (
  <Stroke {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <path d="M3 9.5h18M9 9.5V20M15 9.5V20" />
  </Stroke>
);

export const IconClock = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5V12l3 1.8" />
  </Stroke>
);

export const IconHistory = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
    <path d="M3 4v4.5h4.5" />
    <path d="M12 8v4.3l2.9 1.7" />
  </Stroke>
);

export const IconUsers = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 19.2c.6-3.1 3-4.8 6-4.8s5.4 1.7 6 4.8" />
    <path d="M16.5 5.2a3.2 3.2 0 0 1 0 5.9M18 14.7c2.1.5 3.4 1.9 3.9 4.1" />
  </Stroke>
);

export const IconLayers = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M12 3.5 21 8l-9 4.5L3 8l9-4.5Z" />
    <path d="m4.5 12 7.5 3.8L19.5 12M4.5 16l7.5 3.8L19.5 16" />
  </Stroke>
);

export const IconSliders = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M5 20v-6M5 10V4M12 20v-9M12 7V4M19 20v-4M19 12V4" />
    <path d="M3 14h4M10 7h4M17 16h4" />
  </Stroke>
);

export const IconAlertTriangle = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M10.3 4.3 2.6 17.4A2 2 0 0 0 4.3 20.4h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9.5v4M12 17h.01" />
  </Stroke>
);

export const IconChevronDown = (p: IconProps) => (
  <Stroke {...p}>
    <path d="m6 9 6 6 6-6" />
  </Stroke>
);

export const IconMenu = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Stroke>
);

export const IconClose = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Stroke>
);

export const IconLogout = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M15 4h2.5A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5H15" />
    <path d="M10 8 6 12l4 4M6 12h9" />
  </Stroke>
);

export const IconPlus = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M12 5v14M5 12h14" />
  </Stroke>
);

export const IconDownload = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M12 3.5v11M8 11l4 4 4-4" />
    <path d="M4 17v1.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V17" />
  </Stroke>
);

export const IconTrash = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M4 7h16M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7" />
    <path d="M6.5 7 7.4 19a2 2 0 0 0 2 1.9h5.2a2 2 0 0 0 2-1.9L17.5 7" />
    <path d="M10.5 11v6M13.5 11v6" />
  </Stroke>
);

export const IconPencil = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
    <path d="m14.5 6 3.5 3.5" />
  </Stroke>
);

export const IconCalendar = (p: IconProps) => (
  <Stroke {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2.5" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Stroke>
);

export const IconWallet = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M3 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2" />
    <rect x="3" y="8" width="18" height="12" rx="2.5" />
    <path d="M16 14h2" />
  </Stroke>
);

export const IconTrendUp = (p: IconProps) => (
  <Stroke {...p}>
    <path d="m3 16 5.5-5.5 3.5 3.5L21 5" />
    <path d="M15 5h6v6" />
  </Stroke>
);

export const IconShield = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M12 3.2 5 6v5.5c0 4.3 2.9 7.7 7 9.3 4.1-1.6 7-5 7-9.3V6l-7-2.8Z" />
    <path d="m9.2 12 2 2 3.6-3.8" />
  </Stroke>
);

export const IconSparkles = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M12 3.5 13.6 8 18 9.6 13.6 11.2 12 15.7 10.4 11.2 6 9.6 10.4 8 12 3.5Z" />
    <path d="M18.5 15.5 19.3 17.6 21.4 18.4 19.3 19.2 18.5 21.3 17.7 19.2 15.6 18.4 17.7 17.6 18.5 15.5Z" />
  </Stroke>
);

export const IconLock = (p: IconProps) => (
  <Stroke {...p}>
    <rect x="4.5" y="10" width="15" height="10.5" rx="2.5" />
    <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
  </Stroke>
);

export const IconUser = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="12" cy="8.5" r="3.6" />
    <path d="M4.5 20c.8-3.6 3.7-5.6 7.5-5.6s6.7 2 7.5 5.6" />
  </Stroke>
);

export const IconEye = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Stroke>
);

export const IconEyeOff = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M9.6 6.2A9.6 9.6 0 0 1 12 5.8c6 0 9.5 6.2 9.5 6.2a17 17 0 0 1-3.2 3.9M6.4 8A16.9 16.9 0 0 0 2.5 12S6 18.2 12 18.2c1.3 0 2.4-.2 3.4-.6" />
    <path d="M10 10a2.9 2.9 0 0 0 4 4" />
    <path d="m3.5 3.5 17 17" />
  </Stroke>
);

export const IconArrowRight = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </Stroke>
);

export const IconSearch = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </Stroke>
);

export const IconCheck = (p: IconProps) => (
  <Stroke {...p}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Stroke>
);

export const IconInfo = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 7.8h.01" />
  </Stroke>
);

export const IconInbox = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M3.5 13.5 6 5.5A2 2 0 0 1 7.9 4h8.2a2 2 0 0 1 1.9 1.5l2.5 8" />
    <path d="M3.5 13.5H8l1.3 2.6h5.4L16 13.5h4.5v4.4a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2v-4.4Z" />
  </Stroke>
);

export const IconRefresh = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M20 11a8 8 0 0 0-13.7-5L3 9" />
    <path d="M3 4.5V9h4.5" />
    <path d="M4 13a8 8 0 0 0 13.7 5L21 15" />
    <path d="M21 19.5V15h-4.5" />
  </Stroke>
);

export const IconDrag = (p: IconProps) => (
  <svg
    className={`${base} ${p.className ?? 'h-4 w-4'}`}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <circle cx="9" cy="6" r="1.6" />
    <circle cx="15" cy="6" r="1.6" />
    <circle cx="9" cy="12" r="1.6" />
    <circle cx="15" cy="12" r="1.6" />
    <circle cx="9" cy="18" r="1.6" />
    <circle cx="15" cy="18" r="1.6" />
  </svg>
);
