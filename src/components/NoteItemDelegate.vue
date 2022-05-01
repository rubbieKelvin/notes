<template>
  <router-link
    :to="`/${data.ld}`"
    class="
      flex
      md:px-4
      px-5
      md:py-1
      py-2
      hover:bg-slate-100
      select-none
      cursor-default
    "
  >
    <div class="flex flex-grow flex-col">
      <h2 class="md:text-sm capitalize">{{ data.name }}</h2>
      <FuzzyDate :datetime="data.created_at" v-slot="{fuzzy}">
      <p class="md:text-xs text-sm text-gray-600">
        {{ description + fuzzy }}
      </p>
        
      </FuzzyDate>
    </div>
    <FuzzyDate :datetime="data.last_edited" v-slot="{ fuzzy }">
      <p class="md:text-xs text-sm text-gray-400">{{ fuzzy }}</p>
    </FuzzyDate>
  </router-link>
</template>

<script>
import { computed } from "@vue/runtime-core";
import FuzzyDate from "./FuzzyDate.vue";

export default {
  props: {
    data: {
      type: Object,
      required: true,
    },
  },
  setup(props) {
    const description = computed(() => {
      const author = props.data.author;
      const author_name = author.id === "local" ? "Me" : author.first_name;
      return `Created by ${author_name} `;
    });
    return { description }
  },
  components: { FuzzyDate },
};
</script>
