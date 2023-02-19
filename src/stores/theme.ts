import { defineStore } from "pinia";

export type ThemeClass =
  | ""
  | "dark"
  | "funky"
  | "solarized-yellow"
  | "ocean-breeze"
  | "minty-fresh"
  | "midnight-blue";

interface State {
  availableThemes: ThemeClass[];
  current: ThemeClass;
}

export const useThemeStore = defineStore("themestore", {
  state: (): State => ({
    availableThemes: [
      "",
      "dark",
      "solarized-yellow",
      "ocean-breeze",
      "minty-fresh",
      "midnight-blue",
      "funky",
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
    toggletheme() {
      const currentIndex = this.availableThemes.indexOf(this.current);
      const nextindex = (currentIndex + 1) % this.availableThemes.length;
      this.setTheme(this.availableThemes[nextindex]);
    },
  },
});
