<template>
  <div class="tools">
    <IconButton title="share" class="icon-button" @click="$emit(CLICK_SHARE)">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
        />
      </svg>
    </IconButton>
    <!-- delete -->
    <IconButton title="delete" class="icon-button hover:bg-red-500 hover:text-white" @click="$emit(CLICK_DELETE)">
      <svg
        viewBox="0 0 18 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        class=""
      >
        <path
          d="M3 5.25H15M14.25 5.25L13.5997 14.3565C13.5728 14.7349 13.4035 15.0891 13.1258 15.3477C12.8482 15.6063 12.4829 15.75 12.1035 15.75H5.8965C5.5171 15.75 5.1518 15.6063 4.87416 15.3477C4.59653 15.0891 4.42719 14.7349 4.40025 14.3565L3.75 5.25H14.25ZM7.5 8.25V12.75V8.25ZM10.5 8.25V12.75V8.25ZM11.25 5.25V3C11.25 2.80109 11.171 2.61032 11.0303 2.46967C10.8897 2.32902 10.6989 2.25 10.5 2.25H7.5C7.30109 2.25 7.11032 2.32902 6.96967 2.46967C6.82902 2.61032 6.75 2.80109 6.75 3V5.25H11.25Z"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </IconButton>
  </div>
</template>

<style lang="scss" scoped>
.tools {
  @apply flex gap-2;
  
  > .icon-button {
    @apply p-1;

    > svg {
      @apply h-4 w-4;
    }
  }
}
</style>

<script>
import IconButton from "@/components/IconButton.vue";

const signals = {
  CLICK_DELETE: "click:delete",
  CLICK_SHARE: "click:share",
};
export default {
  emits: Object.values(signals),
  setup() {
    return {
      ...signals,
    };
  },
  components: { IconButton },
};
</script>