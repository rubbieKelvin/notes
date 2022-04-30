<template>
  <router-link :to="`/${data.ld}`" class="flex md:px-4 px-5 md:py-1 py-2 hover:bg-slate-100 select-none cursor-default">
    <div class="flex flex-grow flex-col">
      <h2 class="md:text-sm">{{ data.name }}</h2>
      <p class="md:text-xs text-sm text-gray-600">
        {{ data.description ? data.description : "[no-description]" }}
      </p>
    </div>
    <FuzzyDate :datetime="data.last_edited" v-slot="{ fuzzy }">
      <p class="md:text-xs text-sm text-gray-400">{{ fuzzy }}</p>
    </FuzzyDate>
  </router-link>
</template>

<script>
import FuzzyDate from "./FuzzyDate.vue";
export default {
  props: {
    data: {
      type: Object,
      required: true,
    },
  },
  setup() {},
  components: { FuzzyDate },
};
</script>
