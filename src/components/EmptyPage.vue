<template>
  <div
    class="flex gap-3 h-full flex-col text-gray-600 items-center justify-center flex-grow"
  >
    <span class="font-bold text-2xl">Empty page</span>

    <span v-if="authstore.isAuthenticated" class=""
      >Select a note on the side or create a new note</span
    >
    <span v-else class="">Sign in to create a new note</span>

    <button
      v-if="authstore.isAuthenticated"
      class="btn p-1 flex items-center justify-center gap-2"
      @click="() => (modalstore.modalstates.createNote = true)"
    >
      <span> Create note </span>
      <KeyboardShortcut :sequence="['ctrl', 'alt', 'n']" />
    </button>
    <router-link
      v-else
      class="btn p-1 flex items-center justify-center gap-2"
      to="/"
    >
      <span> Sign In </span>
    </router-link>
  </div>
</template>

<script lang="ts">
import { useAuthStore } from "@/stores/auth";
import { useModalStore } from "@/stores/modals";
import { defineComponent } from "vue";
import KeyboardShortcut from "./KeyboardShortcut.vue";

export default defineComponent({
  components: { KeyboardShortcut },
  setup() {
    const modalstore = useModalStore();
    const authstore = useAuthStore();

    return { modalstore, authstore };
  },
});
</script>
