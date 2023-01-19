<template>
  <div class="flex flex-col h-full">
    <PageHeader title="Notes" :menu="menu" />
    <div class="h-0 flex-grow overflow-y-auto">
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
  </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent } from "vue";
import PageHeader from "@/components/layout/ApplicationMenu/PageHeader.vue";
import { MenuItem } from "@/types";
import NewNoteDialog from "@/components/Dialog/NewNoteDialog.vue";
import NotesItem from "@/components/NotesItem.vue";
import Loading from "@/components/Loading.vue";
import { useNotesStore } from "@/stores/notes";
import { useAuthStore } from "@/stores/auth";
import { useModalStore } from "@/stores/modals";

export default defineComponent({
  components: { PageHeader, NewNoteDialog, NotesItem, Loading },
  setup() {
    const notestore = useNotesStore();
    const authstore = useAuthStore();
    const modalstore = useModalStore();

    const menu: ComputedRef<Array<MenuItem>> = computed(
      (): Array<MenuItem> => [
        {
          id: Symbol(),
          title: "Create note",
          icon: "PlusIcon",
          keybinding: ["ctrl", "alt", "n"],
          action: () => (modalstore.createNote = true),
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

    return { menu, notestore, authstore };
  },
});
</script>
