import * as icons from "@heroicons/vue/24/outline";
import * as solidicons from "@heroicons/vue/24/solid";
import { defineComponent, h } from "vue";
import { IconName } from "./types";

export default defineComponent({
  name: "HeroIcon",
  props: {
    name: { type: String as () => IconName, required: true },
    solid: { type: Boolean, default: false },
  },
  setup(props, ctx) {
    return () => {
      const icon = (props.solid ? solidicons : icons)[props.name];
      if (!icon) return h("div", "Invalid icon");
      return h(icon);
    };
  },
});
