<template>
  <div
    class="flex gap-3 flex-col text-gray-600 items-center justify-center flex-grow"
  >
    <span class="font-bold text-2xl">Empty page</span>
    <span class="">select a note on the side or create a new note</span>
    <!-- TODO: open model when clicked -->
    <button
      class="btn p-1 flex items-center justify-center gap-2"
      @click="() => {}"
    >
      <span> Create note</span>
    </button>
  </div>
</template>
