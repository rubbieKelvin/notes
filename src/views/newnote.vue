<template>
  <div class="h-full">
    <div class="p-5 max-w-[500px]">
      <h1 class="text-2xl mb-5 font-medium">Create new note</h1>
      <div class="flex gap-4 flex-col">
        <div class="flex gap-2 flex-col">
          <label for="title">Title</label>
          <input
            name="title"
            type="text"
            placeholder="Untitled note..."
            class="border-stroke p-3 min-w-[300px] border rounded-md"
          />
        </div>
        <div class="flex gap-2 flex-col">
          <label for="tags">Tags</label>
          <input
            name="tags"
            type="text"
            placeholder="Tags, seperated by comma"
            class="border-stroke p-3 min-w-[300px] border rounded-md"
          />
        </div>
        <div>
          <button
            class="border border-stroke py-2 px-3 rounded-md min-w-[100px] hover:bg-hover active:bg-gray-200"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
