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
          @click="activeMenu = folder.enabled ? folder : activeMenu"
          :class="{ active: activeMenu.name === folder.name }"
          v-for="folder in noteFolders"
          :key="folder.name"
          :title="folder.enabled ? null : folder.disabledMessage"
        >
          <BanIcon v-if="!folder.enabled" />
          {{ folder.name }}
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
import { computed, ref, watch } from "@vue/runtime-core";
import NoteItemDelegate from "@/components/NoteItemDelegate.vue";
import Modal from "@/components/Modal.vue";
import { useRouter } from "vue-router";
import CreateNoteModal from "@/components/modals/CreateNoteModal.vue";

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
    const { push } = useRouter();
    const { notes, addNote, noteFolders } = useNotes();

    const newNoteModal = ref(false);
    const cn_modal = ref(null)
    const activeMenu = ref(noteFolders.value[0]);

    const filteredNotes = computed(() =>
      notes.value.filter(
        (note) => note.folder === activeMenu.value.noteTypeKey
      )
    );

    watch(newNoteModal, (value) => {
      if (value) {
        window.requestAnimationFrame(() => cn_modal.value.focus());
      }
    });

    const add_note = (title, folder) => {
      const note = addNote(title, folder);
      newNoteModal.value = false;
      push(`/${note.ld}`);
    };

    return {
      notes,
      noteFolders,
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
      @apply h-4 absolute;
    }
  }
  > button.active {
    @apply overflow-clip text-gray-700 relative;

    > div {
      @apply rounded-md bg-primary-basic left-0 right-0 top-10;
    }
  }
}
</style>
