<template>
  <div class="h-11 border-b border-stroke flex items-center px-2">
    <h2 class="flex-grow text-black">{{ title }}</h2>
    <MenuList :list="menu" alignRight>
      <template v-slot:trigger="{ open }">
        <button @click="open" class="btn p-1">
          <EllipsisVerticalIcon class="w-5 h-5" />
        </button>
      </template>
    </MenuList>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { MenuItem } from "@/types";
import { EllipsisVerticalIcon } from "@heroicons/vue/24/outline";
import MenuList from "@/components/Popup/MenuList.vue";

export default defineComponent({
  components: { EllipsisVerticalIcon, MenuList },
  props: {
    title: { type: String, default: "Title" },
    menu: { type: Array as () => Array<MenuItem>, default: () => [] },
  },
  setup() {},
});
</script>
