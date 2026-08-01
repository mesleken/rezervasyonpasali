/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Gökova / Ege Tema Paleti
        brand: {
          bg:        '#07111e',
          surface:   '#0d1e34',
          surface2:  '#112240',
          border:    'rgba(0,180,216,0.18)',
          cyan:      '#00b4d8',
          blue:      '#0077b6',
          gold:      '#f4a261',
          green:     '#2a9d8f',
          olive:     '#52b788',
          red:       '#e63946',
          muted:     '#8ba0b5',
        },
        // Doluluk Durumu Renkleri
        status: {
          empty:    '#2a9d8f',  // Yeşil — Boş
          occupied: '#c0392b',  // Koyu kırmızı — Dolu/Aktif
          pending:  '#f4a261',  // Sarı — Kapora Bekleniyor
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      screens: {
        'tablet': '768px',
        'desktop': '1280px',
      }
    },
  },
  plugins: [],
}
