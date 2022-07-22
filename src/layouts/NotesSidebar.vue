<template>
  <div class="notesidebar">
    <!-- heading -->
    <div class="heading">
      <p class="title">Notes</p>
      <div class="buttons">
        <button>
          <icon name="PlusIcon" class="w-5 h-5 text-white" />
        </button>
      </div>
    </div>

    <!-- search -->
    <div class="search">
      <Icon name="SearchIcon" class="icon" />
      <input type="text" placeholder="Search notes..." />
      <!-- <sort-descending-icon class="icon button" /> -->
    </div>

    <!-- notes -->
    <div class="notelist">
      <!-- note item -->
      <router-link v-for="note in notes" :key="note.id" class="noteitem" :to="`/app/mynotes/${note.slug}/`">
        <span class="date">2 Months ago</span>
        <span class="title">{{note.name}}</span>
        <span class="descr">A number of people have claimed that a full-scale nuclear war is likely to cause human...</span>
        <span class="edited">Last edited 2 minutes ago</span>
      </router-link>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, inject, Ref } from "@vue/runtime-core";
import Icon from '@/packages/heroicons'
import { ApplicationDataContext } from "@/constants/types";

export default defineComponent({
  components: { Icon },

  setup(){
    const ctx = inject('ctx') as Ref<ApplicationDataContext>
    const notes = computed(() => ctx.value.notes)
    return {notes, ctx}
  }
});

</script>

<style lang="scss" scoped>
.notesidebar {
  width: 480px;
  height: 100%;
  background-color: white;
  @apply flex flex-col border-r border-r-wall;

  .heading {
    display: flex;
    align-items: center;
    @apply px-6 py-4 border-b border-wall;

    .title {
      @apply text-xl font-medium flex-grow select-none;
    }

    .buttons {
      button {
        @apply bg-primary-basic hover:bg-primary-vibrant;
        @apply w-9 h-9 rounded-md shadow-md;
        @apply flex items-center justify-center;
      }
    }
  }

  .search {
    @apply border-b border-wall flex gap-4 px-6;
    @apply items-center;

    .icon {
      @apply w-7 h-7 p-0.5 text-gray-500 rounded-md;
    }

    .icon.button {
      @apply hover:bg-gray-50;
    }

    input[type="text"] {
      @apply w-0 flex-grow h-14 outline-0 bg-white;
    }
  }

  .notelist{
    @apply flex flex-col h-0 flex-grow overflow-y-scroll gap-2;

    .noteitem{
      @apply px-6 flex gap-2 flex-col py-2 bg-white hover:bg-gray-100;
      user-select: none;

      .date{
        @apply uppercase text-sm text-gray-500;
      }

      .title{
        @apply text-lg font-medium;
      }

      .descr{
        @apply text-gray-600;
      }

      .edited{
        @apply text-gray-400 text-sm;
      }
    }
  }
}
</style>
