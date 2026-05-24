/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        surface: '#121212',
        'surface-light': '#1A1A1A',
        panel: '#1A1A1A',
        card: '#222222',
        'card-hover': '#2A2A2A',
        accent: 'var(--color-accent, #E8470A)',
        'accent-hover': 'var(--color-accent-hover, #CF3D07)',
        accentAlt: 'var(--color-accent-alt, #FF8C00)',
        'accentAlt-hover': 'var(--color-accent-alt-hover, #E67E00)',
        softText: '#A0A0A0',
        dimText: '#666666',
        border: 'rgba(255,255,255,0.07)',
      },
      backgroundImage: {
        'go-gradient': 'linear-gradient(135deg, #E8470A 0%, #FF8C00 100%)',
        'go-gradient-hover': 'linear-gradient(135deg, #CF3D07 0%, #E67E00 100%)',
        'go-gradient-vertical': 'linear-gradient(180deg, #E8470A 0%, #FF8C00 100%)',
        'go-gradient-subtle': 'linear-gradient(135deg, rgba(232,71,10,0.15) 0%, rgba(255,140,0,0.10) 100%)',
        'fade-down': 'linear-gradient(180deg, rgba(18,18,18,0) 0%, #121212 100%)',
        'fade-up': 'linear-gradient(0deg, rgba(18,18,18,0) 0%, #121212 100%)',
      },
      boxShadow: {
        glow: '0 20px 80px rgba(232, 71, 10, 0.18)',
        'glow-sm': '0 8px 30px rgba(232, 71, 10, 0.12)',
        'glow-lg': '0 30px 120px rgba(232, 71, 10, 0.25)',
        'card-hover': '0 12px 40px rgba(0,0,0,0.5)',
        float: '0 8px 30px rgba(0,0,0,0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-in-up': 'fadeInUp 0.4s ease-out',
        'fade-in-down': 'fadeInDown 0.3s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
        'slide-down': 'slideDown 0.35s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'marquee': 'marquee 12s linear infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        shimmer: 'shimmer 1.5s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'bounce-gentle': 'bounceGentle 2s ease-in-out infinite',
        'equalizer-1': 'eq1 0.8s ease-in-out infinite',
        'equalizer-2': 'eq2 0.6s ease-in-out infinite',
        'equalizer-3': 'eq3 0.9s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255,59,48,0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(255,59,48,0.4)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        eq1: {
          '0%, 100%': { height: '4px' },
          '50%': { height: '16px' },
        },
        eq2: {
          '0%, 100%': { height: '8px' },
          '50%': { height: '20px' },
        },
        eq3: {
          '0%, 100%': { height: '6px' },
          '50%': { height: '14px' },
        },
      },
      borderRadius: {
        '4xl': '2rem',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
    },
  },
  plugins: [],
};
