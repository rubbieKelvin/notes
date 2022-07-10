<template>
  <div class="flex-grow h-full flex">
    <!-- side bar -->
    <NotesSidebar />
    <!-- pad -->
    <router-view/>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import NotesSidebar from "@/layouts/NotesSidebar.vue";

export default defineComponent({
  components: { NotesSidebar },
});
</script>
