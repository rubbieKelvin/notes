<template>
  <div>
    <PageHeader title="Notes" :menu="menu" />
    <div>
      <div
        v-if="notestore.notes === null"
        class="flex justify-center pt-6 gap-3"
      >
        <Loading v-if="authstore.isAuthenticated" class="text-black" />
        <p>Checking for notes</p>
      </div>
      <template v-else>
        <NotesItem
          v-for="note in notestore.notes"
          :key="note.id"
          :note="note"
        />
      </template>
    </div>
    <NewNoteDialog v-model="modals.newnote" />
  </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, ref } from "vue";
import PageHeader from "@/components/layout/ApplicationMenu/PageHeader.vue";
import { MenuItem } from "@/types";
import NewNoteDialog from "@/components/Dialog/NewNoteDialog.vue";
import NotesItem from "@/components/NotesItem.vue";
import Loading from "@/components/Loading.vue";
import { useNotesStore } from "@/stores/notes";
import { useAuthStore } from "@/stores/auth";

export default defineComponent({
  components: { PageHeader, NewNoteDialog, NotesItem, Loading },
  setup() {
    const notestore = useNotesStore();
    const authstore = useAuthStore();

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
          title: "Import",
          icon: "CloudArrowDownIcon",
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

    return { menu, modals, notestore, authstore };
  },
});
</script>
