<template>
  <div
    class="md:w-96 md:max-w-[15vw] md:border-r md:border-t-0 border-r-0 md:border-r-stroke border-t border-t-stroke py-2 md:p-3 h-min md:h-auto"
  >
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
    hidden: true,
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
