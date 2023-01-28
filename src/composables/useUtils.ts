import { computed } from "vue";
import { useRoute } from "vue-router";

export default () => {
  const route = useRoute();
  const isPublicNotePage = computed(() => route.name === "PublicNote");

  return { isPublicNotePage };
};
