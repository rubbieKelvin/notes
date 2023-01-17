<template>
  <div class="w-72 border-r border-stroke p-3">
    <template v-for="item in navItems" :key="item.id">
      <NavItem v-if="!item.hidden" :item="item" />
    </template>
  </div>
</template>

<script lang="ts">
import { MenuItem } from "@/types";
import { defineComponent } from "vue";
import NavItem from "./NavItem.vue";

const navItems: Array<MenuItem> = [
  { id: Symbol(), icon: "FolderIcon", title: "notes", link: { name: "Notes" } },
  {
    id: Symbol(),
    icon: "TagIcon",
    title: "tags",
    link: { name: "Tags" },
    hidden: true,
  },
  {
    id: Symbol(),
    icon: "UsersIcon",
    title: "shared notes",
    link: { name: "Shared" },
  },
  {
    id: Symbol(),
    icon: "ArchiveBoxIcon",
    title: "archived",
    link: { name: "Archive" },
  },
  {
    id: Symbol(),
    icon: "StarIcon",
    title: "starred",
    link: { name: "Starred" },
  },
  {
    id: Symbol(),
    icon: "TrashIcon",
    title: "trash",
    link: { name: "Trash" },
  },
];

export default defineComponent({
  data: () => ({
    navItems,
  }),
  setup() {},
  components: { NavItem },
});
</script>
