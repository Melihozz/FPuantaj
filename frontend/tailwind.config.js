/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'from-amber-500', 'to-orange-600',
    'from-emerald-500', 'to-teal-600',
    'from-violet-500', 'to-purple-600',
    'from-slate-500', 'to-gray-600',
    'bg-gradient-to-r',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter var', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system',
          'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif',
        ],
        display: [
          'Plus Jakarta Sans', 'Inter var', 'Inter', 'ui-sans-serif',
          'system-ui', '-apple-system', 'Segoe UI', 'sans-serif',
        ],
        mono: [
          'JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'SF Mono',
          'Menlo', 'Consolas', 'monospace',
        ],
      },
      colors: {
        // Kurumsal ana renk - "iris" tonlu derin mor-mavi
        brand: {
          50: '#F3F4FF',
          100: '#E8EAFF',
          200: '#D2D6FF',
          300: '#B1B6FE',
          400: '#8C8CFA',
          500: '#6F66F4',
          600: '#5B4BE8',
          700: '#4A39C7',
          800: '#3C30A1',
          900: '#332B80',
          950: '#1E1A4D',
        },
        // Sıcak vurgular (mobilya/ahşap dokusundan ilham)
        accent: {
          50: '#FFF9ED',
          100: '#FFF1D3',
          200: '#FFDFA5',
          300: '#FFC76D',
          400: '#FFA932',
          500: '#F98F0B',
          600: '#DD6D06',
          700: '#B74E09',
          800: '#943D0F',
          900: '#7A3410',
          950: '#421705',
        },
        // Nötr metin/yüzey skalası
        ink: {
          50: '#F7F8FC',
          100: '#EDEFF6',
          200: '#DCE0EC',
          300: '#BFC6D9',
          400: '#949DB8',
          500: '#6F7997',
          600: '#565F7B',
          700: '#454C63',
          800: '#333A4C',
          900: '#1F2432',
          950: '#11141D',
        },
        canvas: '#F4F5FA',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(17 20 29 / 0.04), 0 1px 3px 0 rgb(17 20 29 / 0.06)',
        soft: '0 4px 16px -6px rgb(17 20 29 / 0.10), 0 12px 32px -12px rgb(17 20 29 / 0.12)',
        lifted: '0 8px 24px -8px rgb(17 20 29 / 0.16), 0 24px 48px -24px rgb(17 20 29 / 0.22)',
        glow: '0 8px 20px -8px rgb(91 75 232 / 0.55)',
        'glow-lg': '0 16px 40px -12px rgb(91 75 232 / 0.55)',
        'inner-top': 'inset 0 1px 0 0 rgb(255 255 255 / 0.14)',
      },
      backgroundImage: {
        'grid-light':
          "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 0H0v40' fill='none' stroke='rgba(255,255,255,0.06)' stroke-width='1'/%3E%3C/svg%3E\")",
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(.97)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(24px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        aurora: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '33%': { transform: 'translate3d(4%, -6%, 0) scale(1.12)' },
          '66%': { transform: 'translate3d(-5%, 4%, 0) scale(.94)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'progress-bar': {
          from: { transform: 'scaleX(1)' },
          to: { transform: 'scaleX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in .35s ease-out both',
        'fade-up': 'fade-up .45s cubic-bezier(.21,1.02,.73,1) both',
        'scale-in': 'scale-in .22s cubic-bezier(.21,1.02,.73,1) both',
        'slide-in-right': 'slide-in-right .32s cubic-bezier(.21,1.02,.73,1) both',
        aurora: 'aurora 18s ease-in-out infinite',
        float: 'float 7s ease-in-out infinite',
        'progress-bar': 'progress-bar 4s linear forwards',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(.21,1.02,.73,1)',
      },
    },
  },
  plugins: [],
}
