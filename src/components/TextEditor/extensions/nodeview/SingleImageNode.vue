<template>
  <div>
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
    <div v-else>
      <img
        :src="resolvedData.url"
        :alt="resolvedData.alt ?? undefined"
        class="object-center object-cover"
        @load="onLoad"
        @error="onLoadError"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { ImageUploadData, useUploadStore } from "@/stores/upload";
import { computed, defineComponent, watch } from "vue";
import { StructuredImageData } from "../ImageNode";

const API_URL = import.meta.env.VITE_API_BASE;

const resolveUploadedUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return API_URL + url;
};

export default defineComponent({
  props: {
    imagedata: {
      type: Object as () => StructuredImageData,
      required: true,
    },
  },
  emits: ["update", "delete"],
  setup(props, { emit }) {
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

    return { uploadData, resolvedData, onLoad, onLoadError };
  },
});
</script>
