<template>
  <IconButton
    title="more menu"
    class="h-[30px] tools w-[30px] flex items-center justify-center"
  >
    <MenuIcon class="w-[18px] h-[18px]" />
    <div class="popup" ref="popup" v-if="popupAlive">
      <button
        class="py-1 rounded-md hover:bg-slate-100 text-sm text-left px-1 border-b-gray-500"
        v-for="signal in signals"
        :key="signal.emits"
        @click="$emit(signal.emits), hidepopup()"
      >
        {{ signal.name }}
      </button>
    </div>
  </IconButton>
</template>

<style lang="scss" scoped>
.tools {
  @apply flex gap-2 relative;

  > .popup {
    @apply absolute bg-white shadow-md p-2 right-0 top-2;
    @apply focus-within:flex flex-col gap-1 hidden min-w-[180px];

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
import { MenuIcon } from "@heroicons/vue/outline";
import { ref } from "@vue/reactivity";

const _signal = ({ name, emits, danger = false }) => ({ name, emits, danger });

const signals = [
  _signal({ emits: "click:share", name: "Share note" }),
  _signal({ emits: "click:delete", name: "Delete" }),
];

export default {
  emits: signals.map((i) => i.emits),
  setup() {
    const popup = ref(null);
    const popupAlive = ref(true);

    const hidepopup = () => {
      popupAlive.value = false;
      window.setInterval(() => (popupAlive.value = true), 10);
    };

    return {
      signals,
      popup,
      popupAlive,
      hidepopup,
    };
  },
  components: { IconButton, MenuIcon },
};
</script>
