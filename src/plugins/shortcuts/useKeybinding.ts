import { inject, Ref } from "vue";
import { KeyboardShortcut } from ".";

export default (group: string) => {
  const bindings = inject("keybindings") as Ref<Array<KeyboardShortcut>>;
  return {
    bindings,
    bind: (
      name: string,
      keystroke: string,
      callback: (e: KeyboardEvent) => any
    ) => {
      bindings.value.push({
        id: `@${group}.${name}`,
        keystroke,
        callback,
      });
    },
    unbind: (name?: string) => {
      if (name)
        bindings.value = bindings.value.filter(
          (binding) => binding.id !== `@${group}.${name}`
        );
      else
        bindings.value = bindings.value.filter(
          (binding) => !binding.id.startsWith(`@${group}.`)
        );
    },
  };
};
