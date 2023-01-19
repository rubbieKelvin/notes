<template>
  <div
    class="flex gap-3 flex-col text-gray-600 items-center justify-center flex-grow"
  >
    <span class="font-bold text-2xl">Empty page</span>
    <span class="">select a note on the side or create a new note</span>
    <!-- TODO: open model when clicked -->
    <button
      class="btn p-1 flex items-center justify-center gap-2"
      @click="() => (modalstore.createNote = true)"
    >
      <span> Create note </span>
      <KeyboardShortcut :sequence="['ctrl', 'alt', 'n']" />
    </button>
  </div>
</template>

<script lang="ts">
import { useModalStore } from "@/stores/modals";
import { defineComponent } from "vue";
import KeyboardShortcut from "./KeyboardShortcut.vue";

export default defineComponent({
  components: { KeyboardShortcut },
  setup() {
    const modalstore = useModalStore();
    return { modalstore };
  },
});
</script>
