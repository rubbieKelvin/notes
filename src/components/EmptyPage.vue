<template>
  <div
    class="flex gap-3 h-full flex-col text-themed-text items-center justify-center flex-grow"
  >
    <span class="font-bold text-2xl">Empty page</span>

    <span v-if="authstore.isAuthenticated" class=""
      >Select a note on the side or create a new note</span
    >
    <span v-else class="">Sign in to create a new note</span>

    <button
      v-if="authstore.isAuthenticated"
      class="btn p-1 flex items-center justify-center gap-2"
      @click="openNotemodal"
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
import { createNewNoteModal } from "@/modals/newNoteModal";
import { useAuthStore } from "@/stores/auth";
import { defineComponent } from "vue";
import { useRouter } from "vue-router";
import KeyboardShortcut from "./KeyboardShortcut.vue";

export default defineComponent({
  components: { KeyboardShortcut },
  setup() {
    const router = useRouter();
    const authstore = useAuthStore();

    const openNotemodal = () => createNewNoteModal(router);

    return { authstore, openNotemodal };
  },
});
</script>
