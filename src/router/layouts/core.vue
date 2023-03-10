<template>
  <AuthWrapper>
    <div class="h-full flex flex-col bg-bg">
      <AppHeader />

      <div class="flex-grow flex">
        <MainNav
          class="h-full hidden md:flex flex-col bg-themed-bg text-themed-text"
        />
        <ApplicationMenu
          class="h-full md:flex-auto flex-grow"
          :class="{ 'mobile-hide': isNotePage }"
        />
        <router-view name="extended" :class="{ 'mobile-hide': !isNotePage }">
        </router-view>
      </div>

      <MainNav
        class="h-full bg-themed-accent-bg text-themed-accent-text flex px-6 sm:px-0 md:hidden justify-between sm:justify-center gap-0 sm:gap-20"
      />

      <!-- ... -->
      <Toast />
      <extensible-dialog
        v-if="modalstore.extensibleDialogData"
        :modelValue="modalstore.extensibleDialogVisible"
        :modalData="modalstore.extensibleDialogData"
        @update:model-value="
          (visible) => {
            if (!visible) {
              modalstore.forceCloseExtensibleModal();
            }
          }
        "
      />
      <NotesDetailsDialog
        v-if="notestore.openedNote"
        v-model="modalstore.modalstates.noteDetails"
      />
      <selection-dialog
        v-model="modalstore.modalstates.themeSelectionOpen"
        resource-type="Themes"
        :perform-search="searchThemes"
        @searchmodalclose="modalstore.modalstates.themeSelectionOpen = false"
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
import Toast from "@/components/Toast/index.vue";
import KeyboardShortcut from "@/components/KeyboardShortcut.vue";
import AuthWrapper from "@/wrappers/PassiveAuthWrapper.vue";
import { useAuthStore } from "@/stores/auth";
import { useNotesStore } from "@/stores/notes";
import { useModalStore } from "@/stores/modals";
import { onKeyStroke } from "@vueuse/core";
import useUtils from "@/composables/useUtils";
import NotesDetailsDialog from "@/modals/NotesDetailsDialog.vue";
import ExtensibleDialog from "@/components/ExtensibleDialog/index.vue";
import { createNewNoteModal } from "@/modals/newNoteModal";
import { useRouter } from "vue-router";
import SelectionDialog from "@/components/SelectionDialog.vue";
import { useThemeStore } from "@/stores/theme";
import { SearchedItem } from "@/types";
import { useToast } from "@/stores/toasts";

export default defineComponent({
  components: {
    AppHeader,
    MainNav,
    ApplicationMenu,
    TextEditor,
    Toast,
    KeyboardShortcut,
    AuthWrapper,
    NotesDetailsDialog,
    ExtensibleDialog,
    SelectionDialog,
  },
  setup() {
    const utils = useUtils();
    const authstore = useAuthStore();
    const notestore = useNotesStore();
    const modalstore = useModalStore();
    const router = useRouter();
    const themestore = useThemeStore();
    const toaststore = useToast();

    onKeyStroke(["Control", "Alt", "n"], (e) => {
      // create new note
      if (e.ctrlKey && e.altKey && e.key === "n") {
        e.preventDefault();
        createNewNoteModal(router);
      }
    });

    onKeyStroke(["Control", "Alt", "i"], (e) => {
      // show note information
      if (e.ctrlKey && e.altKey && e.key === "i" && notestore.openedNote?.id) {
        e.preventDefault();
        modalstore.modalstates.noteDetails = true;
      }
    });

    async function searchThemes(query?: string): Promise<SearchedItem[]> {
      if (!query)
        return themestore.availableThemes.map(
          (theme): SearchedItem => ({
            title: transformThemeName(theme.className),
            group: theme.group,
            icon: "PaintBrushIcon",
            action: () => {
              themestore.setTheme(theme.className);
            },
          })
        );

      const fquery = query.toLowerCase();
      return themestore.availableThemes
        .filter((theme) =>
          transformThemeName(theme.className).toLowerCase().includes(fquery)
        )
        .map(
          (theme): SearchedItem => ({
            title: transformThemeName(theme.className),
            group: theme.group,
            icon: "PaintBrushIcon",
            action: () => {
              themestore.setTheme(theme.className);
            },
          })
        );
    }
    function transformThemeName(name: string) {
      const res = (name || "Default").replaceAll("-", " ").split("");
      res[0] = res[0].toUpperCase();
      return res.join("");
    }

    watch(
      () => authstore.isAuthenticated,
      () => {
        if (!authstore.isAuthenticated) notestore.notes = [];
      }
    );

    return {
      modalstore,
      authstore,
      ...utils,
      notestore,
      searchThemes,
      transformThemeName,
    };
  },
});
</script>
