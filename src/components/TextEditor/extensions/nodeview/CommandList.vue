<template>
  <div class="items text-themed-text">
    <template v-if="items.length">
      <button
        class="item"
        :class="{ 'is-selected': index === selectedIndex }"
        v-for="(item, index) in items"
        :key="index"
        @click="selectItem(index)"
      >
        {{ item.title }}
      </button>
    </template>
    <div class="item" v-else>No result</div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from "vue";

export default defineComponent({
  props: {
    items: {
      type: Array as () => { title: string }[],
      required: true,
    },

    command: {
      type: Function,
      required: true,
    },
  },
  setup(props) {
    const selectedIndex = ref(0);

    function onKeyDown({ event }: { event: KeyboardEvent }) {
      if (event.key === "ArrowUp") {
        upHandler();
        return true;
      }

      if (event.key === "ArrowDown") {
        downHandler();
        return true;
      }

      if (event.key === "Enter") {
        enterHandler();
        return true;
      }

      return false;
    }

    function upHandler() {
      selectedIndex.value =
        (selectedIndex.value + props.items.length - 1) % props.items.length;
    }

    function downHandler() {
      selectedIndex.value = (selectedIndex.value + 1) % props.items.length;
    }

    function enterHandler() {
      selectItem(selectedIndex.value);
    }

    function selectItem(index: number) {
      const item = props.items[index];

      if (item) {
        props.command(item);
      }
    }

    watch(
      () => props.items,
      () => (selectedIndex.value = 0)
    );

    return {
      selectedIndex,
      onKeyDown,
      upHandler,
      downHandler,
      enterHandler,
      selectItem,
    };
  },
});
</script>

<style lang="scss">
.items {
  padding: 0.2rem;
  position: relative;
  border-radius: 0.5rem;
  overflow: hidden;
  font-size: 0.9rem;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05), 0px 10px 20px rgba(0, 0, 0, 0.1);
  @apply bg-themed-bg-elevated border border-themed-stroke min-w-[180px];
}

.item {
  display: block;
  margin: 0;
  width: 100%;
  text-align: left;
  border-radius: 0.4rem;
  padding: 0.2rem 0.4rem;

  &.is-selected {
    @apply bg-themed-accent-bg text-themed-accent-text;
  }

  &:not(.is-selected) {
    background: transparent;
  }
}
</style>
