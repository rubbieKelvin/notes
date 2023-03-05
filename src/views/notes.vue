<template>
  <div class="flex flex-col h-full">
    <PageHeader :title="noteTitle">
      <MenuList :list="menu" alignRight>
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
      </MenuList>
    </PageHeader>
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
          <div class="bg-gray-100 m-2 rounded-md p-3 flex gap-2 text-gray-500">
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
import NotesItem from "@/components/NotesItem.vue";
import Loading from "@/components/Loading.vue";
import { useNotesStore } from "@/stores/notes";
import { useAuthStore } from "@/stores/auth";
import { NotePages } from "@/composables/useNavigation";
import { onKeyStroke } from "@vueuse/core";
import { useRoute, useRouter } from "vue-router";
import Icon from "@/components/Icon";
import { manyNotesContextMenu } from "@/utils/contextmenus";
import MenuList from "@/components/Popup/MenuList.vue";
import { createNewNoteModal } from "@/modals/newNoteModal";

export default defineComponent({
  props: {
    section: {
      type: String as () => keyof NotePages,
      default: "Note",
    },
  },
  components: { PageHeader, NotesItem, Loading, Icon, MenuList },
  setup(props) {
    const route = useRoute();
    const router = useRouter();
    const selecting = ref(false);
    const notestore = useNotesStore();
    const authstore = useAuthStore();
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
      } else if (props.section === "PublicNote") {
        return notestore.publicNotes;
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
        manyNotesContextMenu({
          selecting,
          notes,
          selectedNotes,
        })
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

    function openNewNoteDialog() {
      createNewNoteModal(router);
    }

    return {
      menu,
      noteTitle,
      notestore,
      authstore,
      notes,
      selecting,
      selectedNotes,
      openNewNoteDialog,
    };
  },
});
</script>
