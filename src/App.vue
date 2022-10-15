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
import { defineComponent, ref } from "vue";
import AppHeader from "@/components/layout/Header.vue";
import MainNav from "@/components/layout/SideMenu/index.vue";
import ApplicationMenu from "@/components/layout/ApplicationMenu/index.vue";
import TextEditor from "@/components/TextEditor/index.vue";
import Toast from "./components/Toast.vue";

export default defineComponent({
  components: { AppHeader, MainNav, ApplicationMenu, TextEditor, Toast },
  setup() {
    const content = ref({
      type: "doc",
      content: [],
    });

    return { content };
  },
});
</script>
