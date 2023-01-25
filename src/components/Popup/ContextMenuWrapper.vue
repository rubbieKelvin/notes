<template>
  <div class="ctx-handler" ref="ctxhandler">
    <div @contextmenu="handleContextMenu">
      <slot />
    </div>
    <MenuList
      v-model="open"
      :list="list"
      :y-offset="yOffset"
      :align-right="alignRight"
    />
  </div>
</template>

<script lang="ts">
import { MenuItem } from "@/types";
import { defineComponent, onMounted, onUnmounted, Ref, ref } from "vue";
import MenuList from "./MenuList.vue";

export default defineComponent({
  components: { MenuList },
  props: {
    alignRight: Boolean,
    yOffset: Number,
    list: {
      type: Array as () => Array<MenuItem>,
      required: true,
    },
  },
  setup() {
    const ctxhandler: Ref<HTMLElement | null> = ref(null);
    const open = ref(false);

    function checkAll(e: MouseEvent) {
      if (ctxhandler.value && !e.composedPath().includes(ctxhandler.value))
        open.value = false;
    }

    onMounted(() => {
      window.addEventListener("contextmenu", checkAll);
    });

    onUnmounted(() => {
      window.removeEventListener("contextmenu", checkAll);
    });

    return {
      open,
      ctxhandler,
      handleContextMenu: (e: MouseEvent) => {
        e.preventDefault();
        open.value = true;
      },
    };
  },
});
</script>
