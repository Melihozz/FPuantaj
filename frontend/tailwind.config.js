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
    extend: {},
  },
  plugins: [],
}
