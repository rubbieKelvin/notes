<template>
  <div class="side select-none">
    <div class="mx-5 flex flex-row gap-2 items-center">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M13 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V13C20.9996 13.0116 20.9975 13.023 20.994 13.034C20.9911 13.0431 20.9891 13.0525 20.988 13.062C20.9823 13.1502 20.9652 13.2373 20.937 13.321L20.928 13.348C20.9213 13.3706 20.9129 13.3926 20.903 13.414C20.8546 13.5229 20.7868 13.6222 20.703 13.707L13.703 20.707C13.5165 20.8936 13.2638 20.9989 13 21ZM5 5V19H12V13C12 12.4477 12.4477 12 13 12H19V5H5ZM14 14V17.587L17.586 14H14Z"
          fill="#2E3A59"
        />
      </svg>

      <h1 class="flex-grow text-2xl">Notes.</h1>
      <button class="bg-blue-500 text-white text-sm px-2 py-2 rounded-md">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M13 13V19H11V13H5V11H11V5H13V11H19V13H13Z" fill="currentColor" />
        </svg>
      </button>
    </div>

    <div class="px-3 flex flex-grow flex-col h-0 overflow-scroll">
      <NoteItemDelegateVue v-for="i in 10" :key="i" />
    </div>
  </div>
</template>

<style scoped>
.side {
  width: 350px;
  height: 100vh;
  @apply pt-5 pb-5;
  @apply bg-gray-50 flex flex-col gap-5;
}
</style>

<script>
import NoteItemDelegateVue from "./NoteItemDelegate.vue";

export default {
  components: { NoteItemDelegateVue },
};
</script>
