<template>
  <div class="p-2">
    <div v-if="loading">
      <Loading class="text-black" />
      <span>{{ loadingMesage }}</span>
    </div>
    <div v-else>
      <h2 class="">{{ title }}</h2>
      <p v-if="subTitle">{{ subTitle }}</p>
      <slot />
    </div>
  </div>
</template>

<script lang="ts">
import Loading from "@/components/Loading.vue";
import { defineComponent } from "vue";

export default defineComponent({
  props: {
    loading: Boolean,
    loadingMesage: { type: String, default: "Loading..." },
    title: { type: String, default: "No items here" },
    subTitle: String,
  },
  setup() {},
  components: { Loading },
});
</script>
