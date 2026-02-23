/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                bg: '#0a0e1a',
                card: '#111827',
                blue: {
                    500: '#3b82f6',
                    600: '#2563eb',
                    700: '#1d4ed8',
                },
                red: {
                    500: '#ef4444',
                },
                purple: {
                    500: '#a855f7',
                },
                gold: {
                    DEFAULT: '#f5a623',
                    dark: '#d97706',
                },
            },
            fontFamily: {
                syne: ['Syne', 'sans-serif'],
                body: ['Space Grotesk', 'sans-serif'],
            },
            animation: {
                pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'fade-in': 'fadeIn 0.3s ease-in',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(8px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [],
}
