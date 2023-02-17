<template>
  <router-link class="flex items-center gap-2 w-max" to="/">
    <div>
      <div class="flex items-center gap-2 py-1">
        <NewspaperIcon class="md:w-5 md:h-5 w-7 h-7" />
        <p class="md:text-base text-2xl">
          Opennotes <span v-if="isPublic" class="md:hidden">Public</span>
        </p>
      </div>

      <h1 v-if="isPublic" class="text-3xl font-medium hidden md:inline-block">
        Public
      </h1>
    </div>
  </router-link>
</template>

<script lang="ts">
import { NewspaperIcon } from "@heroicons/vue/24/outline";
import { defineComponent } from "vue";

export default defineComponent({
  components: { NewspaperIcon },
  props: {
    isPublic: Boolean,
  },
  setup() {},
});
</script>
