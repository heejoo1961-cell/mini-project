import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: "var(--color-primary)", accent: "var(--color-accent-end)", "accent-start": "var(--color-accent-start)", "accent-end": "var(--color-accent-end)", ink: "var(--color-text)", text: "var(--color-text)", muted: "var(--color-text-secondary)", faint: "var(--color-text-tertiary)", canvas: "var(--color-bg)", surface: "var(--color-surface)", "surface-alt": "var(--color-surface-subtle)", "surface-blue": "var(--color-surface-blue)", line: "var(--color-border)", success: "var(--color-success)", warning: "var(--color-warning)", error: "var(--color-danger)",
      },
      borderRadius: { card: "var(--radius-card)", pill: "var(--radius-pill)" },
      maxWidth: { content: "var(--content-width)" },
    },
  },
  plugins: [],
};
export default config;
