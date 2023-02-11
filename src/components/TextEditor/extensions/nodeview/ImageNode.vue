<template>
  <NodeViewWrapper>
    <div
      class="flex overflow-clip rounded-md flex-col"
      :class="[
        selected ? 'border-2 border-red-600' : 'border border-themed-stroke',
      ]"
    >
      <!-- header -->
      <div class="flex bg-themed-bg-elevated px-2 py-1">
        <p class="text-sm text-themed-text select-none">
          {{ attrs.title }}
          <span v-if="attrs.images" class="text-themed-text-subtle">{{
            attrs.images.length
          }}</span>
        </p>
        <span class="flex-grow" />
        <MenuList :list="menu" alignRight>
          <template v-slot:trigger="{ open }">
            <button @click="open" class="btn p-1">
              <Icon name="EllipsisVerticalIcon" class="w-5 h-5" />
            </button>
          </template>
        </MenuList>
      </div>
      <!-- images -->
      <div class="p-2">
        <div
          class="flex flex-grow gap-1 rounded-md overflow-clip"
          :class="[attrs.row ? 'flex-row' : 'flex-col']"
        >
          <img
            v-for="(image, index) in attrs.images"
            :key="index"
            :src="image.url"
            :alt="image.alt ?? undefined"
            class="flex-grow max-h-96 object-center object-cover"
            @load="onLoad"
            @error="onLoadError"
          />
        </div>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<script lang="ts">
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { defineComponent, computed } from "vue";
import { ImageExtensionAttributes } from "../ImageNode";
import { mdiTableColumn, mdiTableRow } from "@mdi/js";
import { MenuItem } from "@/types";
import Icon from "@/components/Icon";
import MenuList from "@/components/Popup/MenuList.vue";

export default defineComponent({
  props: nodeViewProps,
  components: {
    NodeViewWrapper,
    Icon,
    MenuList,
  },
  setup(props) {
    const attrs = computed(() => props.node.attrs as ImageExtensionAttributes);
    const menu = computed((): MenuItem[] => [
      {
        id: Symbol(),
        mdiIconPath: attrs.value.row ? mdiTableColumn : mdiTableRow,
        hidden: (attrs.value.images?.length ?? 0) < 2,
        title: "Switch layout",
        action: () => props.updateAttributes({ row: !attrs.value.row }),
      },
      {
        id: Symbol(),
        icon: "TrashIcon",
        title: `Delete ${(attrs.value.images?.length ?? 0) < 2 ? "" : " all"}`,
        action: () => deleteNode(),
      },
    ]);

    function onLoad() {}
    function onLoadError() {}

    function deleteNode() {
      const { view } = props.editor;
      const pos = props.getPos();

      const transaction = view.state.tr.deleteRange(pos, pos + 1);

      view.dispatch(transaction);
    }

    return {
      attrs,
      onLoad,
      onLoadError,
      mdiTableRow,
      mdiTableColumn,
      menu,
      deleteNode,
    };
  },
});
</script>
