import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Własne kolory można dodać tutaj
      colors: {
        'gov-blue': '#1E40AF',
        'gov-red': '#DC2626',
      },
    },
  },
  plugins: [],
}

export default config
