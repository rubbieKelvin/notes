<template>
  <div>
    <div class="flex flex-col h-28 border-b border-b-gray-200 pt-6 px-5">
      <div class="flex flex-grow items-center">
        <h1 class="flex-grow text-3xl">Notes</h1>
        <button
          class="
            flex
            items-center
            gap-3
            font-semibold
            bg-primary-basic
            text-white
            hover:bg-primary-vibrant
            rounded-md
            px-3
            py-2
          "
        >
          <PlusIcon class="h-5 w-5" />
          <span>Create a Note</span>
        </button>
      </div>
      <div class="tab">
        <button
          class="capitalize"
          @click="activeMenu = menu.enabled ? menu.name : activeMenu"
          :class="{ active: activeMenu === menu.name }"
          v-for="menu in MENUS"
          :key="menu.name"
          :title="menu.enabled ? null : menu.disabledMessage"
        >
          <BanIcon v-if="!menu.enabled" />
          {{ menu.name }}
          <div class="" />
        </button>
      </div>
    </div>

    <!-- search -->
    <NoteSearch/>

    <!-- notes -->
  </div>
</template>

<script>
import { PlusIcon, BanIcon } from "@heroicons/vue/outline";
import { ref } from "@vue/reactivity";
import NoteSearch from "@/components/panels/NoteSearch.vue";

const _menu = ({
  name,
  enabled = false,
  disabledMessage = "This Feature is not implemented yet",
}) => ({ name, enabled, disabledMessage });

const MENUS = [
  _menu({ name: "Classic", enabled: true }),
  _menu({ name: "Important" }),
];

export default {
  components: {
    PlusIcon,
    BanIcon,
    NoteSearch
},
  setup() {
    const activeMenu = ref(MENUS[0].name);
    return { MENUS, activeMenu };
  },
};
</script>

<style lang="scss" scoped>
.tab {
  @apply flex gap-3;
  > button {
    @apply flex items-center gap-2 font-semibold py-3 px-2 text-sm text-gray-400;

    > :deep(svg) {
      @apply w-4 h-4;
    }

    > div{
      @apply h-4;
    }
  }
  > button.active {
    @apply overflow-clip text-gray-700 relative;

    > div {
      @apply absolute rounded-md bg-primary-basic left-0 right-0 top-10;
    }
  }
}
</style>