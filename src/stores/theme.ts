import { defineStore } from "pinia";

export const useThemeStore = defineStore("themestore", {
  state: () => ({
    current: "",
  }),
  actions: {
    loadTheme() {
      this.current = localStorage.getItem("theme") ?? "";
    },
    setTheme(name: string) {
      localStorage.setItem("theme", name);
      this.current = name;
    },
  },
});
