<template>
  <div>
    <div class="flex flex-col h-28 border-b border-b-gray-200 pt-6 px-5">
      <div class="flex flex-grow items-center">
        <h1 class="flex-grow text-3xl">Notes</h1>
        <button @click="newNoteModal = true" class="
            flex
            items-center
            gap-3
            font-semibold
            bg-primary-basic
            text-white
            hover:bg-primary-vibrant
            rounded-md
            px-3
            py-2
          ">
          <PlusIcon class="h-5 w-5" />
          <span>Create a Note</span>
        </button>
      </div>
      <div class="tab">
        <button class="capitalize" @click="activeMenu = folder.enabled ? folder : activeMenu"
          :class="{ active: activeMenu.name === folder.name }" v-for="folder in noteFolders" :key="folder.name"
          :title="folder.enabled ? null : folder.disabledMessage">
          <BanIcon v-if="!folder.enabled" />
          {{ folder.name }}
          <div class="" />
        </button>
      </div>
    </div>

    <!-- search -->
    <NoteSearch @update:searchtext="setSearch" />

    <!-- empty banner -->
    <div v-if="filteredNotes.length === 0" class="p-3">
      <div class="
          flex
          items-center
          gap-3
          text-primary-basic
          p-3
          rounded-md
          bg-primary-basic bg-opacity-10
        ">
        <BanIcon class="w-5 h-5" />
        <template v-if="searchText.length === 0">
          <p class="font-medium flex-grow">No notes in this folder</p>
          <button @click="createNoteUnderCurrentFolder"
            class="bg-primary-basic hover:bg-primary-vibrant rounded-md p-2">
            <PlusIcon class="w-4 h-4 text-white" />
          </button>
        </template>
        <p v-else class="font-medium flex-grow">
          No search result for
          <span class="font-semibold">{{ searchText }}</span>
        </p>
      </div>
    </div>

    <!-- notes -->
    <div class="notes">
      <NoteItemDelegate v-for="note in filteredNotes" :key="note.ld" :data="note" />
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
import { useStore } from "vuex";
import { SETTING_KEYS } from "@/constants/settings";
import { ORDER } from "@/constants/sorting";

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
    const store = useStore();
    const { notes, addNote, noteFolders, sort } = useNotes();

    const newNoteModal = ref(false);
    const cn_modal = ref(null);
    const searchText = ref("");
    const activeMenu = ref(noteFolders.value[0]);
    const order = computed(
      () => store.state.settings[SETTING_KEYS.SORTING_ORDER]
    );

    const filteredNotes = computed(() => {
      let res = notes.value.filter((note) => {
        return (
          note.folder === activeMenu.value.noteTypeKey &&
          note.name.toLowerCase().includes(searchText.value.trim())
        );
      });
      const sortingName = store.state.settings[SETTING_KEYS.SORTING_TYPE];
      const sortingFunc = sort()[sortingName];
      if (typeof sortingFunc === "function") res = sortingFunc(res);

      if (order.value === ORDER.ACSENDING) return res.reverse();
      return res;
    });

    watch(newNoteModal, (value) => {
      if (value) {
        window.requestAnimationFrame(() => cn_modal.value.focus());
      } else {
        cn_modal.value.reset()
      }
    });

    const add_note = (title, folder) => {
      const note = addNote(title, folder);
      newNoteModal.value = false;
      push(`/${note.ld}`);
    };

    const setSearch = (value) => (searchText.value = value);

    const createNoteUnderCurrentFolder = () => {
      cn_modal.value.setComboValue(activeMenu.value)
      newNoteModal.value = true
    }

    return {
      notes,
      noteFolders,
      setSearch,
      add_note,
      activeMenu,
      filteredNotes,
      newNoteModal,
      cn_modal,
      searchText,
      createNoteUnderCurrentFolder
    };
  },
};
</script>

<style lang="scss" scoped>
.tab {
  @apply flex gap-3;

  >button {
    @apply flex items-center gap-2 font-semibold py-3 px-2 text-sm text-gray-400;

    > :deep(svg) {
      @apply w-4 h-4;
    }

    >div {
      @apply h-4 absolute;
    }
  }

  >button.active {
    @apply overflow-clip text-gray-700 relative;

    >div {
      @apply rounded-md bg-primary-basic left-0 right-0 top-10;
    }
  }

  .notes{
    @apply overflow-y-scroll;
  }
}
</style>
