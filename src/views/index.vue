<template>
  <div class="root">
    <div class="board">
      <div class="side">
        <div class="h-28 border-b px-5 pt-6 border-b-gray-200">
          <WorkspaceWidget />
        </div>
        <div class="ql px-5 py-3">
          <h2>Quick Links</h2>
          <router-link to="/notes">
            <FolderIcon class="svg" />
            <span>Notes</span>
          </router-link>
        </div>
      </div>
      <div class="main">
          <router-view/>
      </div>
    </div>
  </div>
</template>

<script>
import WorkspaceWidget from "@/components/user/WorkspaceWidget.vue";
import { FolderIcon } from "@heroicons/vue/outline/";

export default {
  components: {
    WorkspaceWidget,
    FolderIcon,
  },
};
</script>

<style lang="scss" scoped>
.root {
  @apply h-screen flex items-center justify-center bg-slate-200;

  .board {
    @apply overflow-clip;
    @apply w-[70%] max-w-[1250px] h-[80%] max-h-[800px] bg-white;
    @apply rounded-md border border-gray-200 flex;

    > .side {
      @apply w-[30%] bg-gray-50 border-r border-r-gray-200;
      @apply flex flex-col gap-4;

      > .ql {
        display: flex;
        flex-direction: column;
        gap: 0.7em;

        > h2 {
          @apply font-semibold text-sm text-gray-600 mb-2;
        }

        > :deep(a) {
          display: flex;
          align-items: center;
          gap: 1em;
          @apply hover:bg-slate-100 p-2 rounded-md;
          > svg {
            @apply text-orange-400 h-5 w-5;
          }
        }
      }
    }

    > .main{
        @apply flex-grow;
    }
  }
}
</style>