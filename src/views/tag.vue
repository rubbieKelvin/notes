<template>
  <div class="flex flex-col h-full">
    <page-header v-if="tag" :title="tag.title" :menu="menu" icon="TagIcon" />
    <!-- list -->
    <div class="h-0 flex-grow overflow-y-auto">
      <div
        v-if="tag === null"
        class="m-2 p-2 border-themed-stroke rounded-lg border bg-themed-bg-elevated flex gap-2"
      >
        <Icon name="ExclamationTriangleIcon" class="w-5 h-5" />
        <span class="text-sm"> Tag does not exist </span>
      </div>
      <div
        v-else-if="tag.note_attachments.length === 0"
        class="m-2 p-2 border-themed-stroke rounded-lg border bg-themed-bg-elevated flex gap-2"
      >
        <Icon name="InformationCircleIcon" class="w-5 h-5" />
        <span class="text-sm">
          When you add a this tag to your note, you'd see it here
        </span>
      </div>
      <notes-item
        v-else
        v-for="note_attachment in tag.note_attachments"
        :key="note_attachment.note.id"
        :note="note_attachment.note"
      />
    </div>
  </div>
</template>

<script lang="ts">
import PageHeader from "@/components/layout/ApplicationMenu/PageHeader.vue";
import NotesItem from "@/components/NotesItem.vue";
import { useAuthStore } from "@/stores/auth";
import { useTagStore } from "@/stores/tag";
import { MenuItem } from "@/types";
import { Tag } from "@/types/models";
import { computed, defineComponent, Ref, ref, watch } from "vue";
import { useRoute } from "vue-router";
import Icon from "@/components/Icon";
import { openDeleteDialog } from "@/modals/deletedialog";
import router from "@/router";

export default defineComponent({
  components: { PageHeader, NotesItem, Icon },
  setup() {
    const route = useRoute();
    const tagstore = useTagStore();
    const authstore = useAuthStore();

    const tagId = route.params?.id as string | null;
    const tag: Ref<Tag | null> = ref(null);
    const menu = computed((): MenuItem[] => [
      {
        id: Symbol(),
        title: "Delete",
        icon: "TrashIcon",
        action: () => {
          openDeleteDialog({
            resourceType: "Tag",
            action: async () => {
              await tagstore.updateTag(tagId as string, { is_deleted: true });
              router.push({ name: "Tags" });
            },
          });
        },
      },
    ]);

    watch(
      () => authstore.isAuthenticated,
      async () => {
        if (authstore.isAuthenticated) {
          try {
            if (tagId) tag.value = await tagstore.getTag(tagId);
          } catch {}
        }
      },
      { immediate: true }
    );

    return { tag, menu };
  },
});
</script>
