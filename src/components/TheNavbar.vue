<template>
  <div class="bg-gray-50">
    <div class="py-4 container mx-auto px-5 flex gap-12 items-center">
      <div class="flex flex-col select-none">
        <h1 class="text-xl font-bold font-serif">Notes</h1>
        <p class="text-xs font-medium">stuffsbyrubbie</p>
      </div>

      <div class="flex gap-4">
        <template v-for="link in (links.left || [])" :key="link.text">
          <router-link
            class="link"
            :class="{ asbutton: link.asbutton }"
            :to="link.href"
            v-if="link.userouter"
            >{{ link.text }}</router-link
          >
          <a
            class="link"
            :class="{ asbutton: link.asbutton }"
            :href="link.href"
            v-else
            >{{ link.text }}</a
          >
        </template>
      </div>

      <div class="flex-grow" />

      <div class="flex gap-4">
        <template v-for="link in (links.right || [])" :key="link.text">
          <router-link
            class="link"
            :class="{ asbutton: link.asbutton, alt: link.alternatestyle }"
            :to="link.href"
            v-if="link.userouter"
            >{{ link.text }}</router-link
          >
          <a
            class="link"
            :class="{ asbutton: link.asbutton, alt: link.alternatestyle }"
            :href="link.href"
            v-else
            >{{ link.text }}</a
          >
        </template>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
a {
  cursor: pointer;
}

.link {
  @apply font-medium;
  &.asbutton {
    @apply bg-black text-white rounded-full px-5 py-2;
    @apply hover:bg-gray-700;

    &.alt {
      @apply bg-black text-black bg-opacity-0 border-2 border-black;
      @apply hover:bg-black hover:bg-opacity-10;
    }
  }

  &:not(.asbutton) {
    @apply text-slate-700 hover:text-black;
  }
}
</style>

<script lang="ts">
import { NavbarLinkType, NavLinks } from "@/constants/links";
import { NAVBAR_STATES } from "@/constants/states";
import { computed, ComputedRef, ref } from "vue-demi";

export default {
  setup() {
    const state = ref(NAVBAR_STATES.DEFAULT);
    const links: ComputedRef<NavbarLinkType> = computed(() => {
      return NavLinks[state.value];
    });

    return { state, links };
  },
};
</script>
