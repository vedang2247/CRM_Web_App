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

        // CRM palette — indigo, distinct from WA green and Gmail blue
        "crm-bg":          "#f8fafc",
        "crm-card":        "#ffffff",
        "crm-accent":      "#6366f1",   // indigo-500
        "crm-accent-dark": "#4f46e5",   // indigo-600 (hover)
        "crm-border":      "#e2e8f0",
        "crm-muted":       "#94a3b8",

        // Task status colours
        "status-open":        "#64748b",   // slate-500
        "status-in-progress": "#3b82f6",   // blue-500
        "status-waiting":     "#f59e0b",   // amber-500
        "status-resolved":    "#10b981",   // emerald-500
        "status-closed":      "#94a3b8",   // slate-400

        // Task priority colours
        "prio-urgent": "#ef4444",   // red-500
        "prio-high":   "#f97316",   // orange-500
        "prio-medium": "#eab308",   // yellow-500
        "prio-low":    "#94a3b8",   // slate-400
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
