import type { Config } from "tailwindcss";
const { heroui } = require("@heroui/react");

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  darkMode: "class",
  plugins: [
    heroui({
      prefix: "heroui", // 主题变量前缀
      addCommonColors: false, // 是否覆盖通用颜色（如 "blue"、"green"、"pink"）
      defaultTheme: "light", // themes 对象中的默认主题
      defaultExtendTheme: "light", // 自定义主题扩展所基于的默认主题
      layout: {}, // 通用布局令牌（应用于所有主题）
      themes: {
        light: {
          layout: {}, // 浅色主题布局令牌
          colors: {}, // 浅色主题颜色
        },
        dark: {
          layout: {}, // 深色主题布局令牌
          colors: {}, // 深色主题颜色
        },
        // ... 自定义主题
      },
    }),
  ],
};
export default config;
