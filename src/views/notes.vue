<template>
  <div>
    <div class="flex flex-col h-28 border-b border-b-gray-200 pt-6 px-5">
      <div class="flex flex-grow items-center">
        <h1 class="flex-grow text-3xl">Notes</h1>
        <button
          @click="newNoteModal = true"
          class="
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
          "
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
      <div class="bg-white rounded-md w-[300px] p-3 flex flex-col gap-6">
        <div>
          <p>New Note</p>
        </div>

        <div class="flex flex-col gap-4">
          <input
            ref="modalTitleInput"
            v-model="newNoteForm.title"
            class="input-text"
            type="text"
            placeholder="Title"
            @keypress.enter="add_note"
          />
          <p class="text-red-500 text-sm">{{ errormessage }}</p>
          <button
            @click="add_note"
            class="
              bg-primary-basic
              px-4
              py-2
              rounded-md
              text-white
              hover:bg-primary-vibrant
            "
          >
            Create
          </button>
        </div>
      </div>
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
  },
  setup() {
    const activeMenu = ref(MENUS[0]);
    const { notes, addNote } = useNotes();
    const newNoteModal = ref(false);
    const modalTitleInput = ref(null);
    const { push } = useRouter();
    const errormessage = ref("");

    const newNoteForm = ref({
      title: "",
    });

    const filteredNotes = computed(() =>
      notes.value.filter((note) => note.note_type === activeMenu.value.noteTypeKey)
    );

    watch(newNoteModal, (oldValue, newValue) => {
      if (oldValue) {
        window.requestAnimationFrame(() => modalTitleInput.value.focus());
        errormessage.value = "";
      }
    });

    const add_note = () => {
      const title = newNoteForm.value.title.trim();

      if (title) {
        const note = addNote(title);
        newNoteForm.value.title = "";
        newNoteModal.value = false;
        push(`/${note.ld}`);
      } else {
        errormessage.value = "*Title cannot be empty";
        newNoteForm.value.title = "";
      }
    };

    return {
      MENUS,
      errormessage,
      add_note,
      activeMenu,
      filteredNotes,
      newNoteModal,
      newNoteForm,
      modalTitleInput
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