<template>
  <AuthWrapper>
    <div class="h-screen flex flex-col">
      <AppHeader />
      <div class="flex-grow flex">
        <MainNav class="h-full" />
        <ApplicationMenu class="h-full" />
        <router-view name="extended"> </router-view>
      </div>

      <!-- ... -->
      <Toast />
      <NewNoteDialog v-model="modalstore.createNote" />
    </div>
  </AuthWrapper>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from "vue";
import AppHeader from "@/components/layout/Header.vue";
import MainNav from "@/components/layout/SideMenu/index.vue";
import ApplicationMenu from "@/components/layout/ApplicationMenu/index.vue";
import TextEditor from "@/components/TextEditor/index.vue";
import Toast from "@/components/Toast.vue";
import NewNoteDialog from "@/components/Dialog/NewNoteDialog.vue";
import KeyboardShortcut from "@/components/KeyboardShortcut.vue";
import AuthWrapper from "./wrappers/AuthWrapper.vue";
import { useAuthStore } from "./stores/auth";
import { useNotesStore } from "./stores/notes";
import { useModalStore } from "./stores/modals";
import { onKeyStroke } from "@vueuse/core";

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
  },
  setup() {
    const authstore = useAuthStore();
    const notestore = useNotesStore();
    const modalstore = useModalStore();

    onKeyStroke(["Control", "Alt", "n"], (e) => {
      if (e.ctrlKey && e.altKey && e.key === "n") {
        e.preventDefault();
        modalstore.createNote = true;
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

    return { modalstore };
  },
});
</script>
