<template>
  <div class="side-menu">
    <h2 class="hidden lg:flex font-medium text-themed-text-tinted px-2">
      Quick links
    </h2>
    <template v-for="item in navItems" :key="item.id">
      <NavItem v-if="!item.hidden" :item="item" />
    </template>
    <div class="flex-grow hidden md:flex flex-col justify-end">
      <button
        class="flex items-center p-2 gap-2 text-themed-text w-min lg:w-auto hover:bg-themed-hover-bg hover:text-themed-hover-text rounded-md"
        @click="modalstore.modalstates.themeSelectionOpen = true">
        <MoonIcon class="w-5 h-5" />
        <span class="hidden lg:inline capitalize">
          {{ (themestore.current || "light").replaceAll("-", " ") }}
        </span>
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { FEATURES, useFeatures } from "@/stores/features";
import { useThemeStore } from "@/stores/theme";
import { MenuItem, SearchedItem } from "@/types";
import { MoonIcon } from "@heroicons/vue/24/outline";
import { computed, defineComponent, onMounted, ref } from "vue";
import NavItem from "./NavItem.vue";
import { useModalStore } from "@/stores/modals";

export default defineComponent({
  components: { NavItem, MoonIcon },
  setup() {
    const themestore = useThemeStore();
    const featurestore = useFeatures();
    const modalstore = useModalStore()

    const navItems = computed((): MenuItem[] => [
      {
        id: Symbol(),
        icon: "FolderIcon",
        title: "notes",
        link: { name: "Notes" },
      },
      {
        id: Symbol(),
        icon: "TagIcon",
        title: "tags",
        link: { name: "Tags" },
        hidden: !featurestore.features[FEATURES.TAGS],
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
        hidden: true,
      },
      {
        id: Symbol(),
        icon: "TrashIcon",
        title: "trash",
        link: { name: "Trash" },
      },
    ]);

    onMounted(async () => {
      await featurestore.hasFeature(FEATURES.TAGS);
    });

    return { themestore, navItems, modalstore };
  },
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
