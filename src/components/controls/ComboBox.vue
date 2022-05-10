<template>
  <div
    ref="dom"
    tabindex="0"
    class="border relative select-none rounded-md border-gray-200"
  >
    <slot :open="open" :selectedText="selectedText" />
    <div tabindex="0" ref="popup" class="popup">
      <button
        v-for="item in list"
        :key="getItemText(item)"
        class="px-4 py-2 rounded hover:bg-gray-100 text-left capitalize min-w-max w-full"
        @click="select(item)"
      >
        {{ getItemText(item) }}
      </button>
    </div>
  </div>
</template>

<script>
import { ref } from "@vue/reactivity";

export default {
  props: {
    list: {
      type: Array,
      default: () => [],
    },
    getDefault: {
      type: Function,
      default: (items) => items[0]
    },
    getItemText: {
      // use this to get the item text from an item,
      // useful if item is a object
      type: Function,
      default: (item) => item,
    },
    noSelectionText: {
      type: String,
      default: "Select item",
    },
  },
  methods: {
    setSelected(item){
      this.selectedText = this.getItemText(item);
      this.$emit("selected", item);
      window.requestAnimationFrame(this.close)
    }
  },
  setup(props, ctx) {
    const popup = ref(null);
    const dom = ref(null);
    
    const selectedText = ref(
      props.getItemText(props.getDefault(props.list)) || props.noSelectionText
    );

    const open = () => popup.value.focus();
    const close = () => dom.value.focus();

    const select = (item) => {
      selectedText.value = props.getItemText(item);
      ctx.emit("selected", item);
      window.requestAnimationFrame(close)
    };

    return { open, popup, close, selectedText, select, dom };
  },
  emits: ["selected"],
};
</script>

<style lang="scss" scoped>
.popup {
  @apply absolute flex-col gap-2 rounded-md py-2 opacity-0 pointer-events-none;
  @apply bg-white shadow-lg top-0 px-2 min-w-full left-0 flex;
  @apply focus:opacity-100 focus:pointer-events-auto focus-within:pointer-events-auto;
  @apply focus-within:opacity-100;
}
</style>
