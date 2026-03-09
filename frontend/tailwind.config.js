/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Okolea Earth-Tone Palette
        cream: '#D4C8B5',
        tan: '#C4A995',
        beige: '#D5BFA4',
        warmgray: '#B4A58B',
        taupe: '#CABAA1',
        darkgray: '#3E3D39',
        sagegray: '#9AA8A8',
        nearblack: '#050505',
        olivegray: '#6D7464',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
      },
    },
  },
  plugins: [],
}
