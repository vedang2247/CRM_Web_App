/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // WhatsApp brand palette
        "wa-panel":    "#f0f2f5",   // sidebar / panel background
        "wa-chat-bg":  "#efeae2",   // chat message area background
        "wa-outgoing": "#d9fdd3",   // your own message bubbles
        "wa-incoming": "#ffffff",   // received message bubbles
        "wa-accent":   "#00a884",   // primary green (send btn, ticks, highlights)
        "wa-accent-dark": "#017560",// hover / pressed state
        "wa-header":   "#202c33",   // top bar dark teal
        "wa-text":     "#111b21",   // primary text
        "wa-muted":    "#667781",   // timestamps, secondary text
        "wa-divider":  "#e9edef",   // horizontal rules

        // Gmail / Email neutral palette
        "em-bg":       "#f6f8fc",
        "em-panel":    "#ffffff",
        "em-border":   "#e2e8f0",
        "em-accent":   "#1a73e8",   // Gmail blue
        "em-unread":   "#1a73e8",
        "em-text":     "#202124",
        "em-muted":    "#5f6368",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "chat": "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)",
        "bubble": "0 1px 0.5px rgba(0,0,0,0.13)",
        "panel": "2px 0 5px rgba(0,0,0,0.07)",
      },
      width: {
        "sidebar": "320px",
        "sidebar-sm": "260px",
      },
      minWidth: {
        "sidebar": "260px",
      },
    },
  },
  plugins: [],
};
