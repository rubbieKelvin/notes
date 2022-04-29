<template>
  <div v-if="data" class="">
    <ListItem v-for="item in items" :key="item.ld" :item="item" />
  </div>
</template>

<script>
import useNotes from "@/composables/useNotes";
import { computed } from "@vue/runtime-core";

import ListItem from "./ListItem.vue";

export default {
  props: {
    data: {
      type: Object,
      required: true,
    },
    parent: {
      type: Object,
      default: () => ({}),
    },
  },
  setup(props) {
    const { getListContent } = useNotes();
    const items = computed(() => getListContent(props.data));

    return { items };
  },
  components: { ListItem },
};
</script>
