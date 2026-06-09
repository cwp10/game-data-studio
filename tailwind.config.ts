import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: "#185FA5",
        "brand-light": "#e6f1fb",
        danger: "#A32D2D",
        warn: "#854F0B",
        success: "#27500A",
      },
    },
  },
  plugins: [],
};

export default config;
