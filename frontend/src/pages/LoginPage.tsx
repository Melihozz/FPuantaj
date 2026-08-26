import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Brand';
import {
  IconAlertTriangle,
  IconArrowRight,
  IconEye,
  IconEyeOff,
  IconLock,
  IconShield,
  IconSparkles,
  IconTrendUp,
  IconUser,
} from '../components/Icons';

const HIGHLIGHTS = [
  {
    icon: IconTrendUp,
    title: 'Anlık hakediş hesabı',
    desc: 'Gün, mesai ve avans girildiği anda net tutar yeniden hesaplanır.',
  },
  {
    icon: IconSparkles,
    title: 'Tek ekranda tüm dönem',
    desc: 'Kategori bazlı gruplar, toplamlar ve avans dökümü bir arada.',
  },
  {
    icon: IconShield,
    title: 'İzlenebilir kayıt',
    desc: 'Her değişiklik kullanıcı ve zaman bilgisiyle işlem geçmişine yazılır.',
  },
];

const APP_VERSION = '1.0.3';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, error, clearError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setIsSubmitting(true);

    try {
      await login(username, password);
      navigate('/');
    } catch {
      // Error is handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] bg-canvas">
      {/* ------------------------------------------------ Marka paneli (sol) */}
      <aside className="relative isolate overflow-hidden bg-ink-950 px-6 py-10 sm:px-10 lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-14">
        {/* Renk huzmeleri */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-24 -top-32 h-[30rem] w-[30rem] rounded-full bg-brand-600/40 blur-[110px] animate-aurora" />
          <div
            className="absolute -bottom-40 -right-16 h-[26rem] w-[26rem] rounded-full bg-accent-500/25 blur-[120px] animate-aurora"
            style={{ animationDelay: '-6s' }}
          />
          <div
            className="absolute left-1/3 top-1/2 h-72 w-72 rounded-full bg-sky-500/20 blur-[100px] animate-aurora"
            style={{ animationDelay: '-12s' }}
          />
          <div className="absolute inset-0 bg-grid-light opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
        </div>

        <header className="flex items-center justify-between gap-4">
          <Logo tone="light" markClassName="h-11 w-11" />
          <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgb(52_211_153/.25)]" />
            Sistem aktif
          </span>
        </header>

        <div className="mt-10 max-w-xl lg:mt-0">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-200 backdrop-blur animate-fade-up">
            Personel ve hakediş yönetimi
          </p>

          <h1
            className="mt-6 font-display text-3xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-4xl xl:text-5xl animate-fade-up text-balance"
            style={{ animationDelay: '60ms' }}
          >
            Puantajın tamamı{' '}
            <span className="bg-gradient-to-r from-brand-300 via-white to-accent-300 bg-clip-text text-transparent">
              tek bir panelde
            </span>
            .
          </h1>

          <p
            className="mt-4 max-w-md text-[15px] leading-relaxed text-white/60 animate-fade-up"
            style={{ animationDelay: '120ms' }}
          >
            Çalışan kayıtlarından mesai ve avanslara, dönem toplamlarından Excel çıktılarına kadar
            her şey aynı akışta.
          </p>

          <ul className="mt-10 space-y-4 lg:space-y-5">
            {HIGHLIGHTS.map(({ icon: Icon, title, desc }, i) => (
              <li
                key={title}
                className="flex items-start gap-4 animate-fade-up"
                style={{ animationDelay: `${180 + i * 80}ms` }}
              >
                <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.07] text-brand-200 backdrop-blur">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">{title}</span>
                  <span className="mt-0.5 block text-[13px] leading-relaxed text-white/50">
                    {desc}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <footer className="mt-10 hidden text-xs text-white/35 lg:block">
          © {new Date().getFullYear()} Furnigo · Puantaj Yönetim Sistemi
        </footer>
      </aside>

      {/* --------------------------------------------------- Form paneli (sağ) */}
      <main className="relative flex items-center justify-center px-5 py-12 sm:px-8 lg:py-14">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 app-backdrop" />

        <div className="relative w-full max-w-[26rem] animate-fade-up">
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo markClassName="h-11 w-11" />
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/85 p-7 shadow-lifted backdrop-blur-xl sm:p-9">
            <div className="mb-7">
              <h2 className="font-display text-[26px] font-extrabold tracking-tight text-ink-900">
                Tekrar hoş geldiniz
              </h2>
              <p className="mt-1.5 text-sm text-ink-500">
                Devam etmek için hesabınıza giriş yapın.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {error && (
                <div className="alert alert-danger animate-scale-in" role="alert">
                  <IconAlertTriangle className="h-5 w-5 shrink-0 text-rose-500" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <div>
                <label htmlFor="username" className="form-label">
                  Kullanıcı Adı
                </label>
                <div className="relative">
                  <IconUser className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-400" />
                  <input
                    id="username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="field pl-11 py-3"
                    placeholder="Kullanıcı adınızı girin"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="form-label">
                  Şifre
                </label>
                <div className="relative">
                  <IconLock className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-400" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="field pl-11 pr-12 py-3"
                    placeholder="Şifrenizi girin"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 btn-icon"
                    aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <IconEyeOff className="h-[18px] w-[18px]" />
                    ) : (
                      <IconEye className="h-[18px] w-[18px]" />
                    )}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-lg w-full group">
                {isSubmitting ? (
                  <>
                    <span className="spinner h-4 w-4 border-white/40 border-t-white" />
                    Giriş yapılıyor...
                  </>
                ) : (
                  <>
                    Giriş Yap
                    <IconArrowRight className="h-[18px] w-[18px] transition-transform duration-200 group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-7 flex items-center justify-center gap-2 text-xs text-ink-400">
              <IconShield className="h-4 w-4" />
              Oturum bilgileriniz şifrelenerek doğrulanır
            </p>
          </div>

          <div className="mt-5 flex justify-center">
            <span className="inline-flex items-center rounded-full border border-ink-200/70 bg-white/70 px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-ink-400 shadow-soft backdrop-blur">
              Sürüm {APP_VERSION}
            </span>
          </div>

          <p className="mt-6 text-center text-xs text-ink-400 lg:hidden">
            © {new Date().getFullYear()} Furnigo · Puantaj Yönetim Sistemi
          </p>
        </div>
      </main>
    </div>
  );
}
