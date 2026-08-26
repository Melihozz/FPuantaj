import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  const location = useLocation();

  return (
    <div className="relative min-h-screen bg-canvas text-ink-800">
      {/* Sayfa zemini: yumuşak marka ışıkları */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 app-backdrop" />

      <div className="relative flex min-h-screen flex-col">
        <Navbar />

        <main className="w-full flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {/* key: sayfa değişince içerik yeniden monte olur ve .page-header
              giriş animasyonu tekrar çalışır.
              Not: bu sarmalayıcıya animasyon/transform verilmez - aksi halde
              yeni bir yığın bağlamı oluşup fixed konumlu modalleri hapseder. */}
          <div key={location.pathname}>
            <Outlet />
          </div>
        </main>

        <footer className="w-full px-4 pb-6 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-2 border-t border-ink-200/70 pt-5 text-xs text-ink-400 sm:flex-row">
            <span>© {new Date().getFullYear()} Furnigo · Puantaj Yönetim Sistemi</span>
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Bağlantı aktif
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
