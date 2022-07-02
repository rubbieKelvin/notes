<template>
  <div class="flex gap-3 items-center">
    <IconButton class="w-[30px] h-[30px]" @click="addFile">
      <PlusIcon class="w-[18px] h-[18px]" />
    </IconButton>

    <IconButton
      class="h-[30px] tools w-[30px] flex items-center justify-center"
    >
      <MenuIcon class="w-[18px] h-[18px]" />
      <div class="popup" ref="popup" v-if="popupAlive">
        <button
          class="py-2 rounded-md text-sm text-left px-2 border-b-gray-500"
          :class="[
            signal.danger
              ? 'hover:bg-red-500 hover:text-white'
              : 'hover:bg-slate-100',
          ]"
          v-for="signal in signals"
          :key="signal.emits"
          @click="$emit(signal.emits), hidepopup()"
        >
          {{ signal.name }}
        </button>
      </div>
    </IconButton>
  </div>
</template>

<style lang="scss" scoped>
.tools {
  @apply flex gap-2 relative;

  > .popup {
    @apply absolute bg-white shadow-md p-2 right-0 top-2;
    @apply focus-within:flex flex-col hidden min-w-[180px];

    &:hover {
      @apply flex;
    }
  }

  &:focus > .popup {
    @apply flex;
  }
}
</style>

<script>
import IconButton from "@/components/IconButton.vue";
import { MenuIcon, PlusIcon } from "@heroicons/vue/outline";
import { ref } from "@vue/reactivity";

const _signal = ({ name, emits, danger = false }) => ({ name, emits, danger });

const signals = [
  _signal({ emits: "click:share", name: "Share note" }),
  _signal({ emits: "click:delete", name: "Delete", danger: true }),
];

export default {
  emits: signals.map((i) => i.emits),
  props: {
    editor: {
      type: Object,
    },
  },
  setup(props) {
    const popup = ref(null);
    const popupAlive = ref(true);

    const hidepopup = () => {
      popupAlive.value = false;
      window.setInterval(() => (popupAlive.value = true), 10);
    };

    const addFile = () => {
      const editor = props.editor;
      editor.commands.addFile();
    };

    return {
      signals,
      popup,
      popupAlive,
      hidepopup,
      addFile,
    };
  },
  components: { IconButton, MenuIcon, PlusIcon },
};
</script>
