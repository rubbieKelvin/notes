<template>
  <NodeViewWrapper>
    <img
      src="https://i1.wp.com/techprimelab.com/wp-content/uploads/2020/06/SCSS-or-CSS.jpg?fit=1200%2C675&ssl=1"
      alt=""
    />
    <p>Hello</p>
  </NodeViewWrapper>
</template>

<script lang="ts">
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { defineComponent } from "vue";

export default defineComponent({
  props: nodeViewProps,
  components: {
    NodeViewWrapper,
  },
  setup() {},
});
</script>
