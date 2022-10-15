import { App, ref, Ref } from "vue";
import { onKeyStroke } from "@vueuse/core";

export type KeyboardShortcut = {
  id: string;
  keystroke: string;
  callback: (event: KeyboardEvent) => any;
};

export default {
  install: (app: App) => {
    const keybindings: Ref<Array<KeyboardShortcut>> = ref([]);
    app.provide("keybindings", keybindings);

    onKeyStroke(true, (e) => {
      const sequence = Array.from(
        new Set(
          [
            e.ctrlKey && "Control",
            e.altKey && "Alt",
            e.shiftKey && "Shift",
            e.key,
          ].filter(Boolean)
        )
      )
        .join("+")
        .toLowerCase();

      const shortcut = keybindings.value.find(
        (s) => s.keystroke.toLowerCase() === sequence
      );

      if (shortcut) {
        e.preventDefault();
        shortcut.callback(e);
      }
    });
  },
};
