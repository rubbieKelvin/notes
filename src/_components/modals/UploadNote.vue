<template>
  <div
    class="flex max-w-[360px] p-4 flex-col gap-3 justify-center bg-white rounded-md"
  >
    <template v-if="state === STATES.INITIAL">
      <img :src="img" alt="" />
      <h1 class="">Upload Note</h1>
      <p class="">Upload a .json file from your device.</p>
      <div class="flex gap-3">
        <button
          @click="$emit('signal:close')"
          class="bg-gray-50 hover:bg-gray-100 flex-grow rounded-md text-center py-2 text-gray-600"
        >
          Close
        </button>
        <button
          @click="$refs.fileinput.click()"
          class="bg-primary-basic flex-grow hover:bg-primary-vibrant rounded-md text-center py-2 text-white"
        >
          Upload
        </button>
      </div>

      <!-- hidden file input -->
      <input
        type="file"
        class="hidden"
        ref="fileinput"
        accept=".json"
        @change="handlefilechange"
      />
    </template>
    <template v-if="state === STATES.UPLOADED">
      <div class="flex gap-3">
        <svg
          class="animate-spin h-5 w-5 text-primary-basic"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
            data-darkreader-inline-stroke=""
            style="--darkreader-inline-stroke: currentColor"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            data-darkreader-inline-fill=""
            style="--darkreader-inline-fill: currentColor"
          ></path>
        </svg>
        <p v-if="filename" class="text-gray-700">
          Uploading
          <span class="text-gray-500 font-semibold">"{{ filename }}"</span>
        </p>
      </div>
    </template>
    <template v-if="state === STATES.SUCCESS">
      <template v-if="contentData">
        <h1>{{ contentData.name }}</h1>
        <p>
          Created by
          <span>{{ contentData?.author?.firstname ?? "Unknown" }}</span>
          <FuzzyDate
            v-if="contentData.created_at"
            :datetime="contentData.created_at"
            v-slot="{ fuzzy }"
          >
            <span>, {{ fuzzy }}.</span>
          </FuzzyDate>
        </p>
        <div class="flex gap-3">
          <button
            @click="canceloperation"
            class="rounded-md py-2 w-1/2 bg-gray-50 hover:bg-gray-100 text-gray-700"
          >
            Cancel
          </button>
          <button
            @click="addtonotes"
            class="rounded-md py-2 w-1/2 bg-primary-basic hover:bg-primary-vibrant text-white"
          >
            Add to Notes
          </button>
        </div>
      </template>
    </template>
    <template v-if="state === STATES.ERROR">
      <h1>Error Uploading note</h1>
      <p>
        You probably uploaded a none json file, or maybe a json file not
        compactible with this app. Please ensure your're uploading a json file
        that's was exported from this app.
      </p>
      <div class="flex gap-3">
        <button
          @click="canceloperation"
          class="rounded-md py-2 w-1/2 bg-gray-50 hover:bg-gray-100 text-gray-700"
        >
          Cancel
        </button>
        <button
          @click="state = STATES.INITIAL"
          class="rounded-md py-2 w-1/2 bg-primary-basic hover:bg-primary-vibrant text-white"
        >
          Try Again
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
h1 {
  @apply font-medium text-gray-800 text-lg text-center;
}

p {
  @apply text-gray-500 text-center;
}
</style>

<script>
import img from "@/assets/Demo.png";
import { ref } from "@vue/reactivity";
import useDownload from "@/composables/useDownload";
import useUtils from "@/composables/useUtils";
import useNotes from "@/composables/useNotes";
import FuzzyDate from "../FuzzyDate.vue";

const STATES = {
  INITIAL: "INITIAL",
  UPLOADED: "UPLOADED",
  SUCCESS: "SUCCESS",
  ERROR: "ERROR",
};

export default {
  emits: ["signal:close"],
  setup(props, ctx) {
    const { readJSONFile } = useDownload();
    const { isValidNoteObject } = useUtils();
    const { uploadNote } = useNotes();
    const contentData = ref(null);
    const state = ref(STATES.INITIAL);
    const filename = ref("");

    const reset = () => {
      state.value = STATES.INITIAL;
      filename.value = "";
      contentData.value = null;
    };

    const canceloperation = () => {
      reset();
      ctx.emit("signal:close");
    };

    const addtonotes = () => {
      if (contentData.value) uploadNote(contentData.value);
      reset();
      ctx.emit("signal:close");
    };

    const handlefilechange = async (event) => {
      state.value = STATES.UPLOADED;
      const file = event.target.files[0];
      filename.value = file.name;
      if (file) {
        let content = await readJSONFile(file);
        try {
          content = JSON.parse(content);
          if (isValidNoteObject(content)) {
            contentData.value = content;
            state.value = STATES.SUCCESS;
          } else window.setTimeout(() => (state.value = STATES.ERROR), 1000);
        } catch {
          window.setTimeout(() => (state.value = STATES.ERROR), 1000);
        }
      } else window.setTimeout(() => (state.value = STATES.ERROR), 1000);
    };

    return {
      img,
      handlefilechange,
      state,
      STATES,
      filename,
      contentData,
      canceloperation,
      addtonotes,
    };
  },
  components: { FuzzyDate },
};
</script>
