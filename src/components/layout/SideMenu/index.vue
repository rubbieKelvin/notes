<template>
  <div class="w-72 border-r border-stroke p-3">
    <NavItem
      v-for="item in navItems"
      :key="item.title"
      :icon="item.icon"
      :title="item.title"
    />
  </div>
</template>

<script lang="ts">
import { IconName } from "@/components/Icon/types";
import { defineComponent } from "vue";
import NavItem from "./NavItem.vue";

const navItems: { icon: IconName; title: string }[] = [
  { icon: "FolderIcon", title: "notes" },
  { icon: "UsersIcon", title: "shared notes" },
  { icon: "TagIcon", title: "tags" },
  { icon: "ArchiveBoxIcon", title: "archived" },
];

export default defineComponent({
  data: () => ({
    navItems,
  }),
  setup() {},
  components: { NavItem },
});
</script>
