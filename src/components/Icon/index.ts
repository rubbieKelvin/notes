import * as icons from "@heroicons/vue/24/outline";
import { defineComponent, h } from "vue";
import { IconName } from "./types";

export default defineComponent({
  name: "HeroIcon",
  props: {
    name: { type: String as () => IconName, required: true },
  },
  setup(props) {
    return () => {
      const icon = icons[props.name];
      if (!icon) return h("div", "Invalid icon");
      return h(icon);
    };
  },
});
