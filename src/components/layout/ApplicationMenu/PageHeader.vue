<template>
  <div class="py-4 border-themed-stroke flex items-center px-6 md:px-2 gap-2">
    <Icon v-if="icon" :name="icon" class="h-6 w-6" />
    <h2 class="flex-grow text-2xl font-medium">{{ title }}</h2>
    <slot>
      <MenuList :list="menu" alignRight>
        <template v-slot:trigger="{ open }">
          <button @click="open" class="btn p-1">
            <EllipsisVerticalIcon class="w-5 h-5" />
          </button>
        </template>
      </MenuList>
    </slot>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { MenuItem } from "@/types";
import { EllipsisVerticalIcon } from "@heroicons/vue/24/outline";
import MenuList from "@/components/Popup/MenuList.vue";
import Icon from "@/components/Icon";
import { IconName } from "@/components/Icon/types";

export default defineComponent({
  components: { EllipsisVerticalIcon, MenuList, Icon },
  props: {
    icon: String as () => IconName,
    title: { type: String, default: "Title" },
    menu: { type: Array as () => Array<MenuItem>, default: () => [] },
  },
  setup() {},
});
</script>
