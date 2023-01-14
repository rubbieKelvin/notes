import { App, inject, ref, Ref } from "vue";
import { onKeyStroke } from "@vueuse/core";

export type KeyboardShortcut = {
  id: string;
  keystroke: string;
  callback: (event: KeyboardEvent) => any;
};

export const keybindingListening = () => {
  return inject("keybindingListening") as Ref<boolean>;
};

export default {
  install: (app: App) => {
    const listening = ref(true);
    const keybindings: Ref<Array<KeyboardShortcut>> = ref([]);

    app.provide("keybindings", keybindings);
    app.provide("keybindingListening", listening);

    onKeyStroke(true, (e) => {
      if (!listening.value) return;

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
