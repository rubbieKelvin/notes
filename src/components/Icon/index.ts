import * as icons from "@heroicons/vue/24/outline";
import { h } from "vue";
import { IconName } from "./types";

export default function (props: {name: IconName}) {
  const icon = icons[props.name];
  if (!icon) return
  return h(icon);
}