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

    <!-- list -->
    <div class="h-0 flex-grow overflow-y-auto">
      <router-link
        v-for="tag in tagstore.tags"
        :key="tag.id"
        :to="tagRoute(tag)"
        class="gap-3"
      >
        <div class="flex p-3 gap-4 items-center hover:bg-themed-hover-bg group">
          <Icon
            name="TagIcon"
            class="w-6 h-6"
            :style="{ color: tag.color ?? 'initial' }"
          />
          <div class="flex flex-col flex-grow">
            <span class="text-lg">{{ tag.title }}</span>
            <span
              v-if="tag.description"
              class="text-themed-text-subtle group-hover:text-themed-hover-text-subtle"
              >{{ tag.description }}</span
            >
          </div>
        </div>
      </router-link>
    </div>
  </div>
</template>

<script lang="ts">
import Icon from "@/components/Icon";
import PageHeader from "@/components/layout/ApplicationMenu/PageHeader.vue";
import { tagRoute } from "@/composables/useNavigation";
import { useTagStore } from "@/stores/tag";
import { defineComponent } from "vue";

export default defineComponent({
  components: { PageHeader, Icon },
  setup() {
    const tagstore = useTagStore();

    return { tagstore, tagRoute };
  },
});
</script>
