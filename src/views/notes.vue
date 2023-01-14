<template>
  <div>
    <PageHeader title="Notes" :menu="menu" />
    <div>
      <NotesItem v-for="note in notes" :key="note.id" :note="note" />
    </div>
    <NewNoteDialog v-model="modals.newnote" />
  </div>
</template>

<script lang="ts">
import {
  computed,
  ComputedRef,
  defineComponent,
  inject,
  ref,
  Ref,
  watch,
} from "vue";
import PageHeader from "@/components/layout/ApplicationMenu/PageHeader.vue";
import { MenuItem } from "@/types";
import NewNoteDialog from "@/components/Dialog/NewNoteDialog.vue";
import slug from "@/utils/slug";
import { useRoute } from "vue-router";
import { useToasts } from "@/utils/toasts";
import NotesItem from "@/components/NotesItem.vue";
import { Note } from "@/types/models";

export default defineComponent({
  components: { PageHeader, NewNoteDialog, NotesItem },
  setup() {
    const route = useRoute();
    const notes: ComputedRef<Note[]> = computed(() => []);
    const toasts = useToasts();

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

    watch(
      () => route.fullPath,
      () => {
        if (route.name === "Note") {
          const username = route.params.username;
          const identifier = route.params.identifier;

          if (username == "@local") {
            // read from local storage
            const note = notes.value.find(
              (note) => note.id === identifier && note.author === null
            );
            if (note) {
              // ...
            } else {
              toasts.addToast({
                id: Symbol(),
                title: "Couldn't find note",
                timeout: 4000,
                icon: "ExclamationTriangleIcon",
                colorClasses: {
                  bg: "bg-red-500",
                  fg: "text-white",
                  accent: "bg-gray-200",
                },
              });
            }
          }
        }
      },
      { immediate: true }
    );

    return { menu, modals, notes, slug };
  },
});
</script>
