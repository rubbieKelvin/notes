<template>
  <div class="bg-white rounded-md shadow-lg min-w-[340px] overflow-clip">
    <div class="px-3 py-2 border-b border-b-gray-200">
      <h1>Share Note</h1>
    </div>
    <div class="body">
      <button class="" @click="downloadJSON">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        <span>Download as JSON</span>
      </button>
    </div>

    <a ref="jsonDownloadLink" class="hidden" href="" />
  </div>
</template>

<script>
import useDownload from "@/composables/useDownload";
import { ref } from "@vue/reactivity";

export default {
  props: {
    note: {
      type: Object,
      required: true,
    },
  },
  emits: ['close:modal'],
  setup(props, ctx) {
    const { getJSONDownload } = useDownload();
    const jsonDownloadLink = ref(null);

    const downloadJSON = () => {
      const jd = getJSONDownload(props.note);
      jsonDownloadLink.value.href = jd.href;
      jsonDownloadLink.value.download = jd.download;
      jsonDownloadLink.value.dataset.downloadurl = jd.dataset.downloadurl;
      jsonDownloadLink.value.click();
      ctx.emit('close:modal')
    };

    return {
      downloadJSON,
      jsonDownloadLink,
    };
  },
};
</script>

<style lang="scss" scoped>
.body {
  display: flex;
  flex-direction: column;
  padding: 0.6em;
  > button {
    display: flex;
    gap: 4px;
    padding: 0.6em;
    @apply hover:bg-gray-100 rounded-md;

    > span {
      @apply text-sm;
    }
  }
}
</style>