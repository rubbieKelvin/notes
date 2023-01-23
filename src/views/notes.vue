<template>
  <div class="flex flex-col h-full">
    <PageHeader :title="noteTitle" :menu="menu" />
    <div class="h-0 flex-grow overflow-y-auto">
      <div
        v-if="notestore.notes === null"
        class="flex justify-center pt-6 gap-3"
      >
        <Loading v-if="authstore.isAuthenticated" class="text-black" />
        <p>Checking for notes</p>
      </div>
      <template v-else>
        <template v-if="notes.length > 0">
          <NotesItem
            v-for="note in notes"
            :key="note.id"
            :note="note"
            :page="section"
            :selecting="selecting"
            :selected="selectedNotes.includes(note.id)"
            @select="selectedNotes.push(note.id)"
            @deselect="
              selectedNotes = selectedNotes.filter((n) => n !== note.id)
            "
          />
        </template>
        <template v-else>
          <div class="bg-gray-100 m-2 rounded-md p-3 flex gap-2">
            <Icon name="NoSymbolIcon" class="w-5 h-5" />
            <span class="font-medium"> No items in {{ noteTitle }} </span>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, ComputedRef, defineComponent, Ref, ref, watch } from "vue";
import PageHeader from "@/components/layout/ApplicationMenu/PageHeader.vue";
import { MenuItem } from "@/types";
import NewNoteDialog from "@/components/Dialog/NewNoteDialog.vue";
import NotesItem from "@/components/NotesItem.vue";
import Loading from "@/components/Loading.vue";
import { useNotesStore } from "@/stores/notes";
import { useAuthStore } from "@/stores/auth";
import { useModalStore } from "@/stores/modals";
import { NotePages } from "@/plugins/useNavigation";
import { onKeyStroke } from "@vueuse/core";
import { useRoute } from "vue-router";
import Icon from "@/components/Icon";

export default defineComponent({
  props: {
    section: {
      type: String as () => keyof NotePages,
      default: "Note",
    },
  },
  components: { PageHeader, NewNoteDialog, NotesItem, Loading, Icon },
  setup(props) {
    const route = useRoute();
    const selecting = ref(false);
    const notestore = useNotesStore();
    const authstore = useAuthStore();
    const modalstore = useModalStore();
    const selectedNotes: Ref<string[]> = ref([]);

    const notes = computed(() => {
      if (props.section === "Note") {
        return notestore.basicNotes;
      } else if (props.section === "StarredNote") {
        return notestore.starredNotes;
      } else if (props.section === "ArchivedNote") {
        return notestore.archivedNotes;
      } else if (props.section === "Trash") {
        return notestore.trashedNotes;
      }
      return [];
    });

    const noteTitle = computed(() => {
      if (props.section.endsWith("Note") && props.section !== "Note") {
        return props.section.slice(0, -4);
      }
      return props.section;
    });

    const menu: ComputedRef<Array<MenuItem>> = computed(
      (): Array<MenuItem> =>
        selecting.value
          ? [
              { id: Symbol(), title: "Selection", type: "HEADER" },
              {
                id: Symbol(),
                title:
                  route.name === "Trash" ? "Delete Selected" : "Move to trash",
                icon: "TrashIcon",
                action: async () => {
                  const res = await notestore.deleteNotes(
                    selectedNotes.value,
                    route.name === "Trash"
                  );
                  if (res) {
                    selectedNotes.value = [];
                    selecting.value = false;
                  }
                },
              },
              {
                id: Symbol(),
                title: "Restore",
                hidden: route.name !== "Trash",
                action: async () => {
                  const res = await notestore.restoreNotes(selectedNotes.value);

                  if (res) {
                    selectedNotes.value = [];
                    selecting.value = false;
                  }
                },
              },

              {
                id: Symbol(),
                title: "Archive Selected",
                icon: "ArchiveBoxIcon",
                hidden: ["Trash", "ArchivedNote", "Archive"].includes(
                  route.name as string
                ),
                action: async () => {
                  const res = await notestore.moveNotesToArchive(
                    selectedNotes.value
                  );
                  if (res) {
                    selectedNotes.value = [];
                    selecting.value = false;
                  }
                },
              },
              {
                id: Symbol(),
                title: "Reverse Selection",
                icon: "ArrowPathIcon",
                action: () => {
                  selectedNotes.value = notes.value
                    .map((note) => note.id)
                    .filter((nid) => !selectedNotes.value.includes(nid));
                },
              },
              {
                id: Symbol(),
                title: "Close Selection",
                icon: "XMarkIcon",
                action: () => {
                  selectedNotes.value = [];
                  selecting.value = false;
                },
              },
            ]
          : [
              {
                id: Symbol(),
                title: "Create note",
                icon: "PlusIcon",
                keybinding: ["ctrl", "alt", "n"],
                action: () => (modalstore.createNote = true),
                hidden: !["Note", "Notes"].includes(route.name as string),
              },
              {
                id: Symbol(),
                title: "Import",
                icon: "CloudArrowDownIcon",
                hidden: true,
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
                  selectedNotes.value = notes.value.map((n) => n.id);
                },
              },
            ]
    );

    onKeyStroke(["Escape"], (e) => {
      if (selecting.value) {
        e.preventDefault();
        selecting.value = false;
      }
    });

    watch(
      () => route.fullPath,
      () => {
        selecting.value = false;
        selectedNotes.value = [];
      }
    );

    return {
      menu,
      noteTitle,
      notestore,
      authstore,
      notes,
      selecting,
      selectedNotes,
    };
  },
});
</script>
