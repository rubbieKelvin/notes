<template>
  <p>Hello</p>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import useUqlClient from "@/composable/useUqlClient";

export default defineComponent({
  setup() {
    const client = useUqlClient();
    return { client };
  },
});
</script>
