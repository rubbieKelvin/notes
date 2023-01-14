<template>
  <!-- <AuthWrapper> -->
  <div class="h-screen flex flex-col">
    <AppHeader />
    <div class="flex-grow flex">
      <MainNav class="h-full" />
      <ApplicationMenu class="h-full" />
      <!-- <TextEditor
          v-if="ctx.note"
          v-model="content"
          class="flex-grow"
          :note="ctx.note"
        /> -->
      <router-view name="extended"> </router-view>
    </div>

    <!-- ... -->
    <Toast />
    <NewNoteDialog v-model="modals.newnote" />
  </div>
  <!-- </AuthWrapper> -->
</template>

<script lang="ts">
import { defineComponent, inject, onMounted, onUnmounted, Ref, ref } from "vue";
import AppHeader from "@/components/layout/Header.vue";
import MainNav from "@/components/layout/SideMenu/index.vue";
import ApplicationMenu from "@/components/layout/ApplicationMenu/index.vue";
import TextEditor from "@/components/TextEditor/index.vue";
import Toast from "@/components/Toast.vue";
import NewNoteDialog from "@/components/Dialog/NewNoteDialog.vue";
import useKeybinding from "@/plugins/shortcuts/useKeybinding";
import { Ctx } from "@/plugins/context";
import KeyboardShortcut from "@/components/KeyboardShortcut.vue";
import AuthWrapper from "./wrappers/AuthWrapper.vue";

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
    const content = ref({
      type: "doc",
      content: [],
    });

    const ctx = inject("ctx") as Ref<Ctx>;

    const modals = ref({ newnote: false });

    // keybindings
    const keybinding = useKeybinding("application");

    onMounted(() => {
      keybinding.bind("newnote", "control+alt+n", () => {
        modals.value.newnote = true;
      });
    });

    onUnmounted(() => {
      keybinding.unbind();
    });

    return { content, modals, ctx };
  },
});
</script>
