<template>
  <NodeViewWrapper class="flex">
    <div
      v-if="attrs.image"
      class="rounded-lg w-max max-w-full overflow-clip border p-1"
      :class="[selected ? 'border-themed-accent-bg' : 'border-themed-stroke']"
    >
      <img
        v-if="attrs.image.url"
        :src="attrs.image.url"
        :alt="attrs.image.alt || attrs.image.uploadID"
        class="max-h-[30rem] object-cover w-full rounded-lg"
      />
      <div v-else-if="uploading" class="flex gap-4 p-2">
        <loading />
        <span class="text-sm uppercase text-themed-text-subtle"
          >Uploading image...</span
        >
      </div>
      <div v-else class="p-2">
        <Icon name="ExclamationTriangleIcon" class="w-6 h-6 text-red-600" />
        <span class="text-sm uppercase text-themed-text-subtle"
          >Error gettting image</span
        >
      </div>
    </div>
  </NodeViewWrapper>
</template>

<script lang="ts">
import { NodeViewWrapper, nodeViewProps } from "@tiptap/vue-3";
import { defineComponent, computed, onMounted, ref } from "vue";
import { ImageExtensionAttributes } from "../ImageNode";
import { mdiTableColumn, mdiTableRow } from "@mdi/js";
import Icon from "@/components/Icon";
import MenuList from "@/components/Popup/MenuList.vue";
import { usePublicSignalStore } from "@/stores/publicsignals";
import Loading from "@/components/Loading.vue";

const API_URL = import.meta.env.VITE_API_BASE;

const resolveUploadedUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return API_URL + url;
};

export default defineComponent({
  props: nodeViewProps,
  components: {
    NodeViewWrapper,
    Icon,
    MenuList,
    Loading,
  },
  setup(props) {
    const publicsignal = usePublicSignalStore();
    const uploading = ref(true);
    const error = ref(false);
    const attrs = computed(() => props.node.attrs as ImageExtensionAttributes);

    function updateAttrs(update: Partial<ImageExtensionAttributes>) {
      if (!props.editor.isEditable) return;
      props.updateAttributes(update);
    }

    onMounted(() => {
      const uploadID = attrs.value.image?.uploadID;

      if (!uploadID || !attrs.value.image.url) {
        const signalID = `imageupload:${uploadID}`;
        publicsignal.listen(signalID, (val) => {
          const payload = val as {
            uploading: boolean;
            error: boolean;
            url: string | null;
          };

          uploading.value = payload.uploading;
          error.value = payload.error;

          if (payload.url) {
            updateAttrs({
              image: {
                ...attrs.value.image,
                url: resolveUploadedUrl(payload.url),
              },
            });
          }
        });
      } else {
        uploading.value = false;
        error.value = false;
      }
    });

    function onLoad() {}
    function onLoadError() {}

    return {
      uploading,
      error,
      attrs,
      onLoad,
      onLoadError,
      mdiTableRow,
      mdiTableColumn,
    };
  },
});
</script>
