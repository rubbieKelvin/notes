<template>
  <div>
    <PageHeader title="Notes" :menu="menu" />
    <div>
      <router-link
        v-for="note in notes"
        :to="{
          name: 'Note',
          params: {
            username: note.author ? note.author.username : '@local',
            title: slug(note.title),
          },
        }"
        :key="note.id"
      >
        <div class="p-2 hover:bg-hover w-full">
          <div>
            <p>
              {{ note.title }}
            </p>
            <p v-if="note.description">{{ note.description }}</p>
            <p
              v-else-if="note.author === null"
              class="text-xs bg-gray-200 w-min px-1 rounded"
            >
              local
            </p>
          </div>
          <p class="text-xs text-gray-600">{{ fuzzy(note.last_updated) }}</p>
        </div>
      </router-link>
    </div>
    <NewNoteDialog v-model="modals.newnote" />
  </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, inject, ref, Ref } from "vue";
import PageHeader from "@/components/layout/ApplicationMenu/PageHeader.vue";
import { MenuItem, ToastData } from "@/types";
import NewNoteDialog from "@/components/Dialog/NewNoteDialog.vue";
import { Note } from "@/types/models";
import slug from "@/utils/slug";
import { useTimeAgo } from "@vueuse/core";

export default defineComponent({
  components: { PageHeader, NewNoteDialog },
  setup() {
    const notes = inject("notes") as Ref<Note[]>;
    const toasts = inject("toasts") as Ref<ToastData[]>;
    const modals = ref({
      newnote: false,
    });
    const menu: ComputedRef<Array<MenuItem>> = computed(
      (): Array<MenuItem> => [
        {
          id: Symbol(),
          title: "Create note",
          icon: "PlusIcon",
          action: () => (modals.value.newnote = true),
        },
        {
          id: Symbol(),
          title: "Create folder",
          icon: "FolderPlusIcon",
          disabled: true,
          hidden: true,
          subtitle: "Signin to use feature",
        },
        { id: Symbol(), title: "Sort", icon: "AdjustmentsHorizontalIcon" },
      ]
    );
    const fuzzy = (datetime: string): string => {
      return useTimeAgo(new Date(datetime)).value;
    };
    return { menu, toasts, modals, notes, slug, fuzzy };
  },
});
</script>
