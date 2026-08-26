import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Brand';
import {
  IconChevronDown,
  IconClose,
  IconGrid,
  IconClock,
  IconHistory,
  IconLayers,
  IconLogout,
  IconMenu,
  IconSliders,
  IconUsers,
} from './Icons';

type IconComponent = (props: { className?: string }) => JSX.Element;

interface NavItem {
  path: string;
  label: string;
  icon: IconComponent;
  desc?: string;
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDefsMenuOpen, setIsDefsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const defsMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const navItems: NavItem[] = [
    { path: '/', label: 'Puantaj', icon: IconGrid },
    { path: '/mesailer', label: 'Mesailer', icon: IconClock },
    { path: '/log', label: 'İşlem Geçmişi', icon: IconHistory },
  ];

  // "Tanımlamalar" altındaki yönetim sayfaları
  const definitionItems: NavItem[] = [
    {
      path: '/calisanlar',
      label: 'Çalışanlar',
      icon: IconUsers,
      desc: 'Kadro, maaş ve sigorta bilgileri',
    },
    {
      path: '/kategoriler',
      label: 'Kategoriler',
      icon: IconLayers,
      desc: 'Çalışma alanları ve sıralama',
    },
  ];

  const isActive = (path: string) => location.pathname === path;
  const isDefinitionsActive = definitionItems.some((item) => isActive(item.path));

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const initials = (user?.username ?? '?').trim().charAt(0).toLocaleUpperCase('tr-TR');

  // Sayfa kaydırıldığında üst çubuğa derinlik ver
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Dışarı tıklayınca veya Esc ile açılır menüleri kapat
  useEffect(() => {
    if (!isDefsMenuOpen && !isUserMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (defsMenuRef.current && !defsMenuRef.current.contains(target)) {
        setIsDefsMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDefsMenuOpen(false);
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDefsMenuOpen, isUserMenuOpen]);

  // Sayfa değişince menüleri kapat
  useEffect(() => {
    setIsDefsMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [location.pathname]);

  const desktopLinkClass = (active: boolean) =>
    `relative inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-200 ease-smooth ${
      active
        ? 'bg-brand-50 text-brand-700 shadow-[inset_0_0_0_1px_theme(colors.brand.200)]'
        : 'text-ink-500 hover:bg-ink-100/70 hover:text-ink-900'
    }`;

  const mobileLinkClass = (active: boolean) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition-colors ${
      active ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
    }`;

  return (
    <nav
      className={`sticky top-0 z-40 border-b transition-all duration-300 glass ${
        isScrolled ? 'border-ink-200/80 shadow-soft' : 'border-ink-200/50'
      }`}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-[68px] items-center justify-between gap-4">
          {/* Marka */}
          <Link to="/" className="shrink-0 rounded-xl transition-opacity hover:opacity-90">
            <Logo markClassName="h-9 w-9" />
          </Link>

          {/* Masaüstü gezinme */}
          <div className="hidden flex-1 items-center justify-center lg:flex">
            <div className="flex items-center gap-1 rounded-2xl border border-ink-200/70 bg-white/60 p-1 shadow-card">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link key={item.path} to={item.path} className={desktopLinkClass(active)}>
                    <Icon className={`h-[18px] w-[18px] ${active ? 'text-brand-600' : 'text-ink-400'}`} />
                    {item.label}
                  </Link>
                );
              })}

              {/* Tanımlamalar açılır menüsü */}
              <div className="relative" ref={defsMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsDefsMenuOpen((open) => !open)}
                  aria-expanded={isDefsMenuOpen}
                  aria-haspopup="true"
                  className={desktopLinkClass(isDefinitionsActive || isDefsMenuOpen)}
                >
                  <IconSliders
                    className={`h-[18px] w-[18px] ${
                      isDefinitionsActive ? 'text-brand-600' : 'text-ink-400'
                    }`}
                  />
                  Tanımlamalar
                  <IconChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      isDefsMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isDefsMenuOpen && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-72 origin-top-left animate-scale-in rounded-2xl border border-ink-200/70 bg-white p-1.5 shadow-lifted">
                    {definitionItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.path);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setIsDefsMenuOpen(false)}
                          className={`flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                            active ? 'bg-brand-50' : 'hover:bg-ink-50'
                          }`}
                        >
                          <span
                            className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                              active
                                ? 'bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow'
                                : 'bg-ink-100 text-ink-500'
                            }`}
                          >
                            <Icon className="h-[18px] w-[18px]" />
                          </span>
                          <span className="min-w-0">
                            <span
                              className={`block text-sm font-semibold ${
                                active ? 'text-brand-700' : 'text-ink-800'
                              }`}
                            >
                              {item.label}
                            </span>
                            <span className="mt-0.5 block text-xs leading-snug text-ink-500">
                              {item.desc}
                            </span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Kullanıcı menüsü (masaüstü) */}
          <div className="hidden shrink-0 items-center gap-2 lg:flex" ref={userMenuRef}>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((open) => !open)}
                aria-expanded={isUserMenuOpen}
                aria-haspopup="true"
                className={`flex items-center gap-2.5 rounded-2xl border py-1.5 pl-1.5 pr-3 transition-all duration-200 ${
                  isUserMenuOpen
                    ? 'border-brand-200 bg-brand-50'
                    : 'border-ink-200/70 bg-white/70 hover:border-ink-300 hover:bg-white'
                }`}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-[13px] font-bold text-white shadow-glow">
                  {initials}
                </span>
                <span className="max-w-[10rem] truncate text-sm font-semibold text-ink-700">
                  {user?.username}
                </span>
                <IconChevronDown
                  className={`h-4 w-4 text-ink-400 transition-transform duration-200 ${
                    isUserMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-60 origin-top-right animate-scale-in rounded-2xl border border-ink-200/70 bg-white p-1.5 shadow-lifted">
                  <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
                      {initials}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink-900">
                        {user?.username}
                      </span>
                      <span className="block text-xs text-ink-500">Oturum açık</span>
                    </span>
                  </div>
                  <div className="my-1.5 h-px bg-ink-200/70" />
                  <button
                    onClick={logout}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                  >
                    <IconLogout className="h-[18px] w-[18px]" />
                    Çıkış Yap
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobil menü düğmesi */}
          <div className="flex items-center gap-2 lg:hidden">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-[13px] font-bold text-white shadow-glow">
              {initials}
            </span>
            <button
              onClick={toggleMobileMenu}
              className="btn-icon h-10 w-10 border border-ink-200/70 bg-white/70"
              aria-label="Ana menüyü aç"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <IconClose /> : <IconMenu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobil menü */}
      <div
        className={`overflow-hidden border-t border-ink-200/70 bg-white/95 backdrop-blur transition-[max-height,opacity] duration-300 ease-smooth lg:hidden ${
          isMobileMenuOpen ? 'max-h-[36rem] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="space-y-1 px-4 pb-4 pt-3 sm:px-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeMobileMenu}
                className={mobileLinkClass(active)}
              >
                <Icon className={`h-5 w-5 ${active ? 'text-brand-600' : 'text-ink-400'}`} />
                {item.label}
              </Link>
            );
          })}

          <div className="pt-3">
            <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-ink-400">
              Tanımlamalar
            </div>
            {definitionItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={closeMobileMenu}
                  className={mobileLinkClass(active)}
                >
                  <Icon className={`h-5 w-5 ${active ? 'text-brand-600' : 'text-ink-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-ink-200/70 bg-ink-50/70 px-3 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
                {initials}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-ink-900">{user?.username}</div>
                <div className="text-xs text-ink-500">Oturum açık</div>
              </div>
            </div>
            <button
              onClick={() => {
                closeMobileMenu();
                logout();
              }}
              className="btn btn-sm btn-secondary text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            >
              <IconLogout className="h-4 w-4" />
              Çıkış
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
