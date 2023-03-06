import { defineStore } from "pinia";

export type ThemeClass =
  | ""
  | "dark"
  | "oceanic"
  | "minty"
  | "pastel"
  | "old-newspaper"
  | "warm-earth"
  | "dark-forest"
  | "midnight-blue"
  | "monokai-2"
  | "dark-funky"
  | "jetbrains"
  | "black";

interface State {
  availableThemes: {
    className: ThemeClass;
    group: "Light" | "Dark";
  }[];
  current: ThemeClass;
}

export const useThemeStore = defineStore("themestore", {
  state: (): State => ({
    availableThemes: [
      { className: "", group: "Light" },
      { className: "dark", group: "Dark" },
      { className: "oceanic", group: "Light" },
      { className: "minty", group: "Light" },
      { className: "pastel", group: "Light" },
      { className: "old-newspaper", group: "Light" },
      { className: "warm-earth", group: "Light" },
      { className: "dark-forest", group: "Dark" },
      { className: "midnight-blue", group: "Dark" },
      { className: "monokai-2", group: "Dark" },
      { className: "jetbrains", group: "Dark" },
      { className: "dark-funky", group: "Dark" },
      { className: "black", group: "Dark" },
    ],
    current: "",
  }),
  actions: {
    loadTheme() {
      this.current = (localStorage.getItem("theme") ?? "") as ThemeClass;
    },
    setTheme(name: ThemeClass) {
      localStorage.setItem("theme", name);
      this.current = name;
    },
  },
});
