import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'rgb(17, 17, 17)',
        foreground: 'rgb(255, 255, 255)',
        primary: {
          DEFAULT: 'rgb(0, 180, 216)',
          foreground: 'rgb(255, 255, 255)',
        },
        secondary: {
          DEFAULT: 'rgb(30, 30, 30)',
          foreground: 'rgb(255, 255, 255)',
        },
        muted: {
          DEFAULT: 'rgb(40, 40, 40)',
          foreground: 'rgb(160, 160, 160)',
        },
        accent: {
          DEFAULT: 'rgb(0, 180, 216)',
          foreground: 'rgb(255, 255, 255)',
        },
        destructive: {
          DEFAULT: 'rgb(239, 68, 68)',
          foreground: 'rgb(255, 255, 255)',
        },
        success: {
          DEFAULT: 'rgb(34, 197, 94)',
          foreground: 'rgb(255, 255, 255)',
        },
        card: {
          DEFAULT: 'rgb(24, 24, 24)',
          foreground: 'rgb(255, 255, 255)',
        },
        border: 'rgb(50, 50, 50)',
      },
      borderRadius: {
        lg: '12px',
        md: '8px',
        sm: '4px',
      },
    },
  },
  plugins: [],
}
export default config
