<template>
  <div class="bg-black overflow-clip">
    <div v-if="resolvedData.uploading">
      <p>uploading</p>
    </div>
    <div v-else-if="resolvedData.uploadError">
      <p>upload error</p>
    </div>
    <div v-else-if="!resolvedData.url">
      <p>Currupt image node</p>
      <button>Delete</button>
    </div>
    <img
      v-else
      :src="resolvedData.url"
      :alt="resolvedData.alt ?? undefined"
      class="object-center object-cover hover:opacity-70 w-full"
      :class="{ 'h-96': row }"
      @click="modalOpen = true"
      @load="onLoad"
      @error="onLoadError"
    />

    <Dialog
      v-if="resolvedData.url"
      v-model="modalOpen"
      dim
      escape
      closeOnClickOutside
      class="z-[9999]"
    >
      <div class="bg-themed-bg p-2 flex rounded-md">
        <img
          :src="resolvedData.url"
          :alt="resolvedData.alt ?? undefined"
          class="object-center object-cover max-w-[80vh] max-h-[80vh]"
          @load="onLoad"
          @error="onLoadError"
        />
      </div>
    </Dialog>
  </div>
</template>

<script lang="ts">
import { ImageUploadData, useUploadStore } from "@/stores/upload";
import { computed, defineComponent, ref, watch } from "vue";
import { StructuredImageData } from "../ImageNode";
import Dialog from "@/components/Dialog/index.vue";

const API_URL = import.meta.env.VITE_API_BASE;

const resolveUploadedUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return API_URL + url;
};

export default defineComponent({
  components: { Dialog },
  props: {
    row: Boolean,
    imagedata: {
      type: Object as () => StructuredImageData,
      required: true,
    },
  },
  emits: ["update", "delete"],
  setup(props, { emit }) {
    const modalOpen = ref(false);
    const uploadstore = useUploadStore();

    const uploadData = computed((): ImageUploadData | null => {
      return uploadstore.uploads[props.imagedata.uploadID] ?? null;
    });

    watch(
      uploadData,
      (value, old) => {
        if (value?.url) {
          emit("update", {
            uploadID: props.imagedata.uploadID,
            url: resolveUploadedUrl(value.url),
          });
        }
      },
      { immediate: true, deep: true }
    );

    const resolvedData = computed(() => {
      return {
        alt: props.imagedata.alt,
        uploadID: props.imagedata.uploadID,
        url: resolveUploadedUrl(props.imagedata.url || uploadData.value?.url),
        uploading: uploadData.value?.uploading ?? false,
        uploadError: uploadData.value?.error ?? false,
      };
    });

    function onLoad() {}
    function onLoadError() {}

    return { uploadData, resolvedData, onLoad, onLoadError, modalOpen };
  },
});
</script>
