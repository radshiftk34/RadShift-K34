/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9eaff',
          200: '#bcd9ff',
          300: '#8ec2ff',
          400: '#589fff',
          500: '#327bf7',
          600: '#1d5de9',
          700: '#1648d6',
          800: '#183cac',
          900: '#183688',
          950: '#112253',
        },
      },
    },
  },
  plugins: [],
}
