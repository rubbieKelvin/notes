import { computed } from "vue";
import { useRoute } from "vue-router";

export default () => {
  const route = useRoute();
  const isPublicNotePage = computed(() => route.name === "PublicNote");
  const isNotePage = computed(() =>
    route.name ? route.name.toString().endsWith("Note") : false
  );

  return { isPublicNotePage, isNotePage };
};
