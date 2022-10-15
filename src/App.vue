<template>
  <div class="h-screen flex flex-col">
    <AppHeader />
    <div class="flex-grow flex">
      <MainNav class="h-full" />
      <ApplicationMenu class="h-full" />
      <router-view name="extended" />
      <TextEditor v-model="content" class="flex-grow" />
    </div>

    <!-- ... -->
    <Toast />
    <NewNoteDialog v-model="modals.newnote" />
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref } from "vue";
import AppHeader from "@/components/layout/Header.vue";
import MainNav from "@/components/layout/SideMenu/index.vue";
import ApplicationMenu from "@/components/layout/ApplicationMenu/index.vue";
import TextEditor from "@/components/TextEditor/index.vue";
import Toast from "@/components/Toast.vue";
import NewNoteDialog from "@/components/Dialog/NewNoteDialog.vue";
import useKeybinding from "@/plugins/shortcuts/useKeybinding";

export default defineComponent({
  components: {
    AppHeader,
    MainNav,
    ApplicationMenu,
    TextEditor,
    Toast,
    NewNoteDialog,
  },
  setup() {
    const content = ref({
      type: "doc",
      content: [],
    });

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

    return { content, modals };
  },
});
</script>
