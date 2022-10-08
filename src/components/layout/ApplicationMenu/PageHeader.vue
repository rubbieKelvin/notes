<template>
  <div class="h-11 border-b border-stroke flex items-center px-2">
    <h2 class="flex-grow text-black">{{ title }}</h2>
    <ContextMenu :list="menu" alignRight>
      <template v-slot:trigger="{ open }">
        <button
          @click="open"
          class="hover:bg-hover w-7 h-7 rounded-md border border-fadedStroke"
        >
          <EllipsisVerticalIcon class="w-6 h-6" />
        </button>
      </template>
    </ContextMenu>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { MenuItem } from "@/types";
import { EllipsisVerticalIcon } from "@heroicons/vue/24/outline";
import ContextMenu from "@/components/Popup/ContextMenu.vue";

export default defineComponent({
  components: { EllipsisVerticalIcon, ContextMenu },
  props: {
    title: { type: String, default: "Title" },
    menu: { type: Array as () => Array<MenuItem>, default: () => [] },
  },
  setup() {},
});
</script>
