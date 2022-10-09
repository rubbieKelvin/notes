<template>
  <div class="h-screen flex flex-col">
    <AppHeader />
    <div class="flex-grow flex">
      <MainNav class="h-full" />
      <ApplicationMenu class="h-full" />
      <router-view name="extended" />
      <TextEditor v-model="content" class="flex-grow" />
    </div>
    <Toast />
  </div>
</template>

<script lang="ts">
import { defineComponent, Ref, ref } from "vue";
import AppHeader from "@/components/layout/Header.vue";
import MainNav from "@/components/layout/SideMenu/index.vue";
import ApplicationMenu from "@/components/layout/ApplicationMenu/index.vue";
import TextEditor from "@/components/TextEditor/index.vue";
import Toast from "./components/Toast.vue";
import { useToasts } from "@/utils/toasts";

export default defineComponent({
  components: { AppHeader, MainNav, ApplicationMenu, TextEditor, Toast },
  setup() {
    const content = ref({
      type: "doc",
      content: [],
    });

    const { addToast } = useToasts();

    addToast({
      id: Symbol(),
      title: "Hello",
      desciption: "this is a subtitle",
      icon: "ServerStackIcon",
      timeout: 10000,
      actions: [
        {
          title: "Delete",
          action: () => console.log("delete"),
        },
        {
          title: "Restore",
          action: () => console.log("restore"),
        },
      ],
    });

    addToast({
      id: Symbol(),
      title: "My second toast",
      desciption: "this is a subtitle",
      icon: "TrophyIcon",
      // timeout: 15000,
    });

    return { content };
  },
});
</script>
