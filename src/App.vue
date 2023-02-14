<template>
  <AuthWrapper>
    <div class="h-full flex flex-col bg-bg">
      <AppHeader />

      <div class="flex-grow flex">
        <MainNav
          v-if="!isPublicNotePage"
          class="h-full hidden md:flex flex-col"
        />
        <ApplicationMenu
          v-if="!isPublicNotePage"
          class="h-full md:flex-auto flex-grow"
          :class="{ 'mobile-hide': isNotePage }"
        />
        <router-view name="extended" :class="{ 'mobile-hide': !isNotePage }">
        </router-view>
      </div>

      <MainNav
        v-if="!isPublicNotePage"
        class="h-full flex md:hidden justify-center gap-12 sm:gap-20"
      />

      <!-- ... -->
      <Toast />
      <NewNoteDialog v-model="modalstore.modalstates.createNote" />
      <NotesDetailsDialog
        v-if="notestore.openedNote"
        v-model="modalstore.modalstates.noteDetails"
      />
    </div>
  </AuthWrapper>
</template>

<script lang="ts">
import { defineComponent, watch } from "vue";
import AppHeader from "@/components/layout/Header.vue";
import MainNav from "@/components/layout/SideMenu/index.vue";
import ApplicationMenu from "@/components/layout/ApplicationMenu/index.vue";
import TextEditor from "@/components/TextEditor/index.vue";
import Toast from "@/components/Toast.vue";
import NewNoteDialog from "@/modals/NewNoteDialog.vue";
import KeyboardShortcut from "@/components/KeyboardShortcut.vue";
import AuthWrapper from "./wrappers/AuthWrapper.vue";
import { useAuthStore } from "./stores/auth";
import { useNotesStore } from "./stores/notes";
import { useModalStore } from "./stores/modals";
import { onKeyStroke } from "@vueuse/core";
import useUtils from "./composables/useUtils";
import { useUploadStore } from "./stores/upload";
import NotesDetailsDialog from "./modals/NotesDetailsDialog.vue";

export default defineComponent({
  components: {
    AppHeader,
    MainNav,
    ApplicationMenu,
    TextEditor,
    Toast,
    NewNoteDialog,
    KeyboardShortcut,
    AuthWrapper,
    NotesDetailsDialog,
  },
  setup() {
    const utils = useUtils();
    const authstore = useAuthStore();
    const notestore = useNotesStore();
    const modalstore = useModalStore();
    const uploads = useUploadStore();

    onKeyStroke(["Control", "Alt", "n"], (e) => {
      // create new note
      if (e.ctrlKey && e.altKey && e.key === "n") {
        e.preventDefault();
        modalstore.modalstates.createNote = true;
      }
    });

    onKeyStroke(["Control", "Alt", "i"], (e) => {
      // show note information
      if (e.ctrlKey && e.altKey && e.key === "i" && notestore.openedNote?.id) {
        e.preventDefault();
        modalstore.modalstates.noteDetails = true;
      }
    });

    watch(
      () => authstore.isAuthenticated,
      () => {
        if (!authstore.isAuthenticated) {
          notestore.notes = [];
        }
      }
    );

    return { modalstore, authstore, ...utils, notestore };
  },
});
</script>
