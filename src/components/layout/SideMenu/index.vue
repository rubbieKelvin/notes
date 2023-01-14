<template>
  <div class="w-72 border-r border-stroke p-3">
    <NavItem v-for="item in navItems" :key="item.id" :item="item" />
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
