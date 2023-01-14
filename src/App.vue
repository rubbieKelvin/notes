<template>
  <div class="h-full max-h-[100%] bg-red-500 flex flex-col">
    <AppHeader />
    <div class="flex flex-grow">
      <SideBar />
      <div class="w-[18%] min-w-[300px] border-r border-r-stroke bg-green-500">
        <router-view />
      </div>
      <div class="flex-grow">
        <router-view name="appSection" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import AppHeader from "./components/molecules/AppHeader.vue";
import SideBar from "./components/molecules/SideBar.vue";

export default defineComponent({
  components: { AppHeader, SideBar },
  setup() {},
});
</script>
