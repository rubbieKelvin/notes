<template>
  <div class="notepad">
    <!-- heading -->
    <div class="heading">
      <div class="info">
        <span class="title">Note Title</span>
        <span class="descr">Edited 2 minutes ago, by rubbie.</span>
      </div>

      <div class="more-menu">
        <button class="hover:bg-gray-100 p-2 rounded-md">
          <menu-icon class="w-6 h-6" />
        </button>
      </div>
    </div>
    <!-- tools -->
    <div class="tools">
      <!-- ... -->
      <!-- <button :title="tool.name" v-for="tool in padtools" :key="tool.name">
        <icon :name="tool.icon" class="w-5 h-5" />
      </button> -->

      <!-- ... -->
      <!-- <div class="divider" /> -->

      <!-- ... -->
      <!-- <button :title="tool.name" v-for="tool in notetools" :key="tool.name">
        <icon :name="tool.icon" class="w-5 h-5" />
      </button> -->
    </div>
  </div>
</template>

<style lang="scss" scoped>
.notepad {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  .heading {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: center;
    @apply px-6 py-[14px] border-b border-b-wall;

    .info {
      @apply flex flex-col flex-grow;
      .title {
        @apply font-medium text-xl;
      }
      .descr {
        @apply text-sm text-slate-400;
      }
    }
  }

  .tools {
    @apply px-6 border-b border-b-wall py-[0.65rem] flex gap-3;
    > .divider {
      @apply border-r border-r-wall;
    }
    > button {
      @apply p-2 hover:bg-gray-100 rounded-md text-slate-700;
    }
  }
}
</style>
