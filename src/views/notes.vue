<template>
  <div>
    <div class="flex flex-col h-28 border-b border-b-gray-200 pt-6 px-5">
      <div class="flex flex-grow items-center">
        <h1 class="flex-grow text-3xl">Notes</h1>
        <button
          @click="newNoteModal = true"
          class="flex items-center gap-3 font-semibold bg-primary-basic text-white hover:bg-primary-vibrant rounded-md px-3 py-2"
        >
          <PlusIcon class="h-5 w-5" />
          <span>Create a Note</span>
        </button>
      </div>
      <div class="tab">
        <button
          class="capitalize"
          @click="activeMenu = menu.enabled ? menu : activeMenu"
          :class="{ active: activeMenu.name === menu.name }"
          v-for="menu in MENUS"
          :key="menu.name"
          :title="menu.enabled ? null : menu.disabledMessage"
        >
          <BanIcon v-if="!menu.enabled" />
          {{ menu.name }}
          <div class="" />
        </button>
      </div>
    </div>

    <!-- search -->
    <NoteSearch />

    <!-- notes -->
    <div>
      <NoteItemDelegate
        v-for="note in filteredNotes"
        :key="note.ld"
        :data="note"
      />
    </div>

    <!-- modal -->
    <Modal v-model="newNoteModal" dim closeOnClickOutside closeOnEsc>
      <CreateNoteModal ref="cn_modal" :callback="add_note" />
    </Modal>
  </div>
</template>

<script>
import { PlusIcon, BanIcon } from "@heroicons/vue/outline";
import NoteSearch from "@/components/panels/NoteSearch.vue";
import useNotes from "@/composables/useNotes";
import { NOTE_TYPES } from "@/constants/note";
import { computed, ref, watch } from "@vue/runtime-core";
import NoteItemDelegate from "@/components/NoteItemDelegate.vue";
import Modal from "@/components/Modal.vue";
import { useRouter } from "vue-router";
import CreateNoteModal from "@/components/modals/CreateNoteModal.vue";

const _menu = ({
  name,
  enabled = false,
  noteTypeKey = NOTE_TYPES.CLASSIC_NOTE,
  disabledMessage = "This Feature is not implemented yet",
}) => ({ name, enabled, disabledMessage, noteTypeKey });

const MENUS = [
  _menu({ name: "Classic", enabled: true }),
  _menu({ name: "Important", noteTypeKey: NOTE_TYPES.IMPORTANT_NOTE }),
];

export default {
  components: {
    PlusIcon,
    BanIcon,
    NoteSearch,
    Modal,
    NoteItemDelegate,
    CreateNoteModal,
  },
  setup() {
    const activeMenu = ref(MENUS[0]);
    const newNoteModal = ref(false);
    const cn_modal = ref(null)

    const { push } = useRouter();
    const { notes, addNote } = useNotes();

    const filteredNotes = computed(() =>
      notes.value.filter(
        (note) => note.note_type === activeMenu.value.noteTypeKey
      )
    );

    watch(newNoteModal, (value) => {
      if (value) {
        window.requestAnimationFrame(() => cn_modal.value.focus());
      }
    });

    const add_note = (title) => {
      const note = addNote(title);
      newNoteModal.value = false;
      push(`/${note.ld}`);
    };

    return {
      MENUS,
      add_note,
      activeMenu,
      filteredNotes,
      newNoteModal,
      cn_modal
    };
  },
};
</script>

<style lang="scss" scoped>
.tab {
  @apply flex gap-3;
  > button {
    @apply flex items-center gap-2 font-semibold py-3 px-2 text-sm text-gray-400;

    > :deep(svg) {
      @apply w-4 h-4;
    }

    > div {
      @apply h-4;
    }
  }
  > button.active {
    @apply overflow-clip text-gray-700 relative;

    > div {
      @apply absolute rounded-md bg-primary-basic left-0 right-0 top-10;
    }
  }
}
</style>
