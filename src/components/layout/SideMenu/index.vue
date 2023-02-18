<template>
  <div class="side-menu">
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
    icon: "GlobeEuropeAfricaIcon",
    title: "public",
    link: { name: "Public" },
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

<style lang="scss" scoped>
.side-menu {
  @apply border-r-0 border-t;
  @apply border-t-themed-stroke py-2 h-min;
}

@screen md {
  .side-menu {
    @apply border-r border-t-0 border-r-themed-stroke;
    @apply p-3 h-auto gap-6 flex-col;
  }
}

@screen lg {
  .side-menu {
    @apply min-w-[16rem] max-w-[16rem] gap-2;
  }
}
</style>
