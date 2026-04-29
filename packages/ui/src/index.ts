export const deepModeTheme = {
  colors: {
    background: "#000000",
    surface: "#1A1A1A",
    text: "#FFFFFF",
    secondaryText: "#A0A0A0",
    border: "#333333",
    cta: "#FFD700",
    success: "#00FF41"
  },
  radii: {
    sm: "2px"
  },
  fonts: {
    header: "Share Tech Mono",
    ui: "Roboto Mono",
    label: "Rajdhani"
  }
} as const;

export type DeepModeTheme = typeof deepModeTheme;
