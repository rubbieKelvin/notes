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
          v-for="note in notes"
          :key="note.id"
          :note="note"
          :page="section"
        />
      </template>
    </div>
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
import { useModalStore } from "@/stores/modals";
import { NotePages } from "@/plugins/useNavigation";

export default defineComponent({
  props: {
    section: {
      type: String as () => keyof NotePages,
      default: "Note",
    },
  },
  components: { PageHeader, NewNoteDialog, NotesItem, Loading },
  setup(props) {
    const selecting = ref(false);
    const notestore = useNotesStore();
    const authstore = useAuthStore();
    const modalstore = useModalStore();

    const notes = computed(() => {
      if (props.section === "Note") {
        return notestore.notes;
      } else if (props.section === "StarredNote") {
        return notestore.starredNotes;
      }
    });

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
        {
          id: Symbol(),
          title: "Sort by",
          icon: "AdjustmentsHorizontalIcon",
          children: [
            { id: Symbol(), title: "No sort" },
            { id: Symbol(), title: "Title" },
            { id: Symbol(), title: "Updated" },
            { id: Symbol(), title: "Created" },
            { id: Symbol(), type: "SEPARATOR" },
            {
              id: Symbol(),
              title: "Ascending",
              type: "CHECKBOX",
              value: notestore.sort.ascending,
              action: () => {
                notestore.sort.ascending = !notestore.sort.ascending;
              },
            },
          ],
        },
        { id: Symbol(), type: "SEPARATOR" },
        {
          id: Symbol(),
          title: "Select",
          icon: "ListBulletIcon",
          action: () => {
            selecting.value = true;
          },
        },
        {
          id: Symbol(),
          title: "Select All",
          action: () => {
            selecting.value = true;
          },
        },
      ]
    );

    return { menu, notestore, authstore, notes };
  },
});
</script>
