<template>
  <router-link :to="`/${data.slug}`" class="flex px-4 py-1 hover:bg-slate-100 select-none cursor-default">
    <div class="flex flex-grow flex-col">
      <h2 class="text-sm">{{ data.name }}</h2>
      <p class="text-xs text-gray-600">
        {{ data.description ? data.description : "[no-description]" }}
      </p>
    </div>
    <FuzzyDate :datetime="data.last_edited" v-slot="{ fuzzy }">
      <p class="text-xs text-gray-400">{{ fuzzy }}</p>
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
