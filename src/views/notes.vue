<template>
  <div class="flex flex-col h-full">
    <page-header title="Notes">
      <menu-list :list="menu" alignRight>
        <template v-slot:trigger="{ open }">
          <div
            class="flex items-center rounded-lg justify-center overflow-clip"
          >
            <button
              @click="openNewNoteDialog"
              class="flex gap-2 p-2 items-center justify-center bg-themed-accent-bg hover:bg-themed-accent-hover-bg active:bg-themed-accent-active-bg text-themed-accent-text"
            >
              <Icon name="PlusIcon" class="w-5 h-5" />
              <span class="text-sm font-medium">Add note</span>
            </button>
            <button
              @click="open"
              class="p-2 bg-themed-bg-elevated hover:bg-themed-hover-bg"
            >
              <Icon class="w-5 h-5" name="ChevronDownIcon" />
            </button>
          </div>
        </template>
      </menu-list>
    </page-header>
    <!-- ... -->
    <div class="h-0 flex-grow overflow-y-auto custom-scrollbar">
      <!-- empty state -->
      <div
        v-if="notestore.notes === null"
        class="flex justify-center pt-6 gap-3"
      >
        <Loading v-if="authstore.isAuthenticated" class="text-black" />
        <p>Checking for notes</p>
      </div>
      <!-- notes -->
      <template v-else>
        <template v-if="notesTree.length > 0">
          <!-- folder -->
          <template
            v-for="(item, index) in notesTree.filter(
              (i) => i.type === 'folder'
            )"
            :key="index"
          >
            <notes-folder
              v-if="item.items"
              :items="item.items"
              :title="item.title"
              :selecting="selecting"
              :selectedNotes="selectedNotes"
              @notedeselect="deselect"
              @noteselect="(id) => selectedNotes.push(id)"
            />
          </template>
          <!-- notes -->
          <template
            v-for="(item, index) in notesTree.filter((i) => i.type === 'item')"
            :key="index"
          >
            <NotesItem
              v-if="item.item"
              :key="item.item.id"
              :note="item.item"
              :page="section"
              :selecting="selecting"
              :selected="selectedNotes.includes(item.item.id)"
              @select="if (item.item) selectedNotes.push(item.item.id);"
              @deselect="() => deselect(item.item)"
            />
          </template>
        </template>
        <template v-else>
          <div class="bg-gray-100 m-2 rounded-md p-3 flex gap-2 text-gray-500">
            <Icon name="NoSymbolIcon" class="w-5 h-5" />
            <span class="font-medium"> You dont have any notes </span>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import PageHeader from "@/components/layout/ApplicationMenu/PageHeader.vue";
import MenuList from "@/components/Popup/MenuList.vue";
import { createNewNoteModal } from "@/modals/newNoteModal";
import { useNotesStore } from "@/stores/notes";
import { MenuItem } from "@/types";
import { manyNotesContextMenu } from "@/utils/contextmenus";
import { computed, ComputedRef, defineComponent, Ref, ref } from "vue";
import { useRouter } from "vue-router";
import Icon from "@/components/Icon";
import { filePathTree } from "@/utils/grouping";
import { Note } from "@/types/models";
import { useAuthStore } from "@/stores/auth";
import { NotePages } from "@/composables/useNavigation";
import Loading from "@/components/Loading.vue";
import NotesItem from "@/components/NotesItem.vue";
import NotesFolder from "@/components/NotesFolder.vue";

export default defineComponent({
  props: {
    section: {
      type: String as () => keyof NotePages,
      default: "Note",
    },
  },
  components: { PageHeader, MenuList, Icon, Loading, NotesItem, NotesFolder },
  setup() {
    const selecting = ref(false);
    const router = useRouter();
    const notestore = useNotesStore();
    const selectedNotes: Ref<string[]> = ref([]);
    const notes = computed(() => notestore.basicNotes);
    const authstore = useAuthStore();

    const menu: ComputedRef<Array<MenuItem>> = computed(
      (): Array<MenuItem> =>
        manyNotesContextMenu({
          selecting,
          notes,
          selectedNotes,
        })
    );

    const notesTree = computed(() =>
      filePathTree<Note>(notes.value, (note) => note.title)
    );

    return {
      menu,
      selecting,
      notesTree,
      notestore,
      authstore,
      selectedNotes,
      deselect: (note?: Note) => {
        if (note) {
          selectedNotes.value = selectedNotes.value.filter(
            (n) => n !== note.id
          );
        }
      },
      openNewNoteDialog: () => createNewNoteModal(router),
    };
  },
});
</script>
