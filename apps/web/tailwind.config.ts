import type { Config } from "tailwindcss";

const config: Config = {
  content: {
    relative: true,
    files: [
      "./app/**/*.{js,ts,jsx,tsx,mdx}",
      "./components/**/*.{js,ts,jsx,tsx,mdx}",
      "./lib/**/*.{js,ts,jsx,tsx,mdx}"
    ]
  },
  theme: {
    extend: {
      colors: {
        "bg-0": "#050505",
        "bg-1": "#0B0D10",
        "bg-2": "#111315",
        "bg-3": "#181A1D",
        "border-1": "#2B2E33",
        "border-2": "rgba(255,255,255,0.06)",
        "text-primary": "#FFFFFF",
        "text-secondary": "#A0A0A0",
        "text-muted": "#6F737A",
        "gold-primary": "#FFD700",
        "gold-soft": "#E8C84A",
        success: "#00FF41",
        warning: "#F59E0B",
        danger: "#FF4D2E",
        info: "#38BDF8",
        "analytics-purple": "#8B5CF6",
        pitch: "#050505",
        panel: "#111315",
        line: "#2B2E33",
        gold: "#FFD700",
        paid: "#00FF41",
        steel: "#A0A0A0"
      },
      borderRadius: {
        DEFAULT: "16px",
        sm: "10px",
        md: "14px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px"
      },
      fontFamily: {
        header: [
          "Space Grotesk",
          "Sora",
          "Inter Tight",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ],
        sans: [
          "Inter",
          "Geist",
          "IBM Plex Sans",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ],
        mono: [
          "IBM Plex Mono",
          "Roboto Mono",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace"
        ],
        label: [
          "IBM Plex Mono",
          "Roboto Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace"
        ]
      },
      boxShadow: {
        card: "0 8px 24px rgba(0,0,0,.35)",
        "gold-glow": "0 0 0 1px rgba(255,255,255,.02), 0 0 40px rgba(255,215,0,.18)",
        "green-glow": "0 0 0 1px rgba(255,255,255,.02), 0 0 40px rgba(0,255,65,.18)",
        "purple-glow": "0 0 0 1px rgba(255,255,255,.02), 0 0 40px rgba(139,92,246,.16)"
      }
    }
  },
  plugins: []
};

export default config;
