<template>
  <NodeViewWrapper class="max-w-full" :class="[!attrs.row ? 'w-96' : 'w-max']">
    <div
      class="flex rounded-md flex-col"
      draggable="true"
      data-drag-handle
      :class="[
        selected ? 'border-2 border-blue-500' : 'border border-themed-stroke',
      ]"
    >
      <!-- header -->
      <div
        class="flex items-center z-20"
        :class="[
          attrs.compact
            ? 'bg-transparent absolute p-4'
            : 'bg-themed-bg-elevated px-2 py-1',
        ]"
      >
        <div
          class="py-1 px-2 flex items-center justify-center"
          :class="{ 'bg-themed-bg rounded-md': attrs.compact }"
        >
          <input
            :disabled="!editor.isEditable"
            class="text-sm text-themed-text select-none outline-0 focus:outline-none bg-transparent"
            v-model="title"
          />
        </div>

        <span class="flex-grow" />
        <MenuList :list="menu" alignRight>
          <template v-slot:trigger="{ open }">
            <div
              class="flex items-center justify-center"
              :class="{ 'bg-themed-bg rounded-md': attrs.compact }"
            >
              <button @click="open" class="btn p-1">
                <Icon name="EllipsisVerticalIcon" class="w-5 h-5" />
              </button>
            </div>
          </template>
        </MenuList>
      </div>
      <!-- images -->
      <div class="p-2">
        <div
          class="flex gap-1 rounded-md overflow-clip"
          :class="[attrs.row ? 'flex-row' : 'flex-col']"
        >
          <SingleImageNode
            v-for="image in attrs.images"
            class="max-h-96 flex-grow"
            :key="image.uploadID"
            :imagedata="image"
            :row="attrs.row"
            @update="updateImageCell"
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
import { mdiTableColumn, mdiTableRow, mdiViewCompact } from "@mdi/js";
import { MenuItem } from "@/types";
import Icon from "@/components/Icon";
import MenuList from "@/components/Popup/MenuList.vue";
import SingleImageNode from "./SingleImageNode.vue";

export default defineComponent({
  props: nodeViewProps,
  components: {
    NodeViewWrapper,
    Icon,
    MenuList,
    SingleImageNode,
  },
  setup(props) {
    function updateAttrs(update: Partial<ImageExtensionAttributes>) {
      if (!props.editor.isEditable) return;
      props.updateAttributes(update);
    }

    const attrs = computed(() => props.node.attrs as ImageExtensionAttributes);
    const title = computed({
      get: () => props.node.attrs.title as string,
      set: (val: string) => {
        updateAttrs({ title: val });
      },
    });

    const menu = computed((): MenuItem[] => [
      {
        id: Symbol(),
        type: "HEADER",
        title: "No edit action",
        hidden: () => props.editor.isEditable,
      },
      {
        id: Symbol(),
        mdiIconPath: attrs.value.row ? mdiTableColumn : mdiTableRow,
        hidden: () =>
          (attrs.value.images?.length ?? 0) < 2 || !props.editor.isEditable,
        title: "Switch layout",
        action: () => updateAttrs({ row: !attrs.value.row }),
      },
      {
        id: Symbol(),
        mdiIconPath: mdiViewCompact,
        hidden: () => !props.editor.isEditable,
        title: attrs.value.compact ? "Normal view" : "Compact view",
        action: () => updateAttrs({ compact: !attrs.value.compact }),
      },
      {
        id: Symbol(),
        icon: "TrashIcon",
        hidden: () => !props.editor.isEditable,
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

    function updateImageCell(payload: { url: string; uploadID: string }) {
      const images = attrs.value.images;
      if (!images) return;

      const index = images.findIndex((i) => i.uploadID === payload.uploadID);
      const data = images[index];
      data.url = payload.url;

      images[index] = data;
      updateAttrs({ images });
    }

    return {
      title,
      attrs,
      onLoad,
      onLoadError,
      mdiTableRow,
      mdiTableColumn,
      menu,
      deleteNode,
      updateImageCell,
    };
  },
});
</script>
