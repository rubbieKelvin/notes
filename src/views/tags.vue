<template>
  <div class="flex flex-col h-full">
    <PageHeader title="Tags">
      <button
        class="flex items-center justify-center p-2 bg-themed-accent-bg rounded-lg gap-2 hover:bg-themed-accent-hover-bg active:bg-themed-accent-active-bg text-themed-accent-text font-medium uppercase text-sm"
      >
        <Icon name="PlusIcon" class="w-5 h-5" />
        <span>New tag</span>
      </button>
    </PageHeader>
    <div class="h-0 flex-grow overflow-y-auto">
        
    </div>
  </div>
</template>

<script lang="ts">
import Icon from "@/components/Icon";
import PageHeader from "@/components/layout/ApplicationMenu/PageHeader.vue";
import { defineComponent } from "vue";

export default defineComponent({
  components: { PageHeader, Icon },
  setup() {},
});
</script>
