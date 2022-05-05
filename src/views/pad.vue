<template>
  <div class="bg-gray-50 min-h-screen flex justify-center items-end">
    <div
      class="
        bg-white
        shadow-md
        rounded-t-md
        h-[95vh]
        max-h-[95vh] max-w-[1200px]
        w-full
        flex-col flex flex-grow
      "
    >
      <template v-if="note">
        <div
          class="flex items-center px-5 py-2 border-b border-b-gray-200 gap-5"
        >
          <IconButton class="w-[30px] h-[30px]" @click="$router.push('/')">
            <LeftChevronSvg />
          </IconButton>

          <div class="flex flex-grow gap-3 items-center">
            <h1 class="capitalize">{{ note.name }}</h1>
            <FuzzyDate :datetime="note.last_edited" v-slot="{ fuzzy }">
              <p class="text-sm text-gray-400">edited {{ fuzzy }}</p>
            </FuzzyDate>
          </div>

          <NoteTools
            @click:delete="modals.delete = true"
            @click:share="modals.share = true"
          />
        </div>

        <!-- ...pad -->
        <div class="view-pad">
          <!-- heading -->
          <input
            v-model="noteHeading"
            placeholder="Note title...."
            type="text"
            class="subject-heading mx-10"
          />

          <FuzzyDate :datetime="note.created_at" v-slot="{ fuzzy }">
            <p class="px-10">
              Created by
              <span class="bg-gray-100 rounded p-1">{{ author }}</span
              >, {{ fuzzy }}
            </p>
          </FuzzyDate>

          <!-- ...editable -->
          <Texteditor class="flex-grow" v-model="noteBody" />
        </div>
      </template>

      <template v-else>
        <div class="h-full flex flex-col gap-4 items-center justify-center">
          <EmptyStateSvg />
          <div class="flex gap-2 flex-col items-center">
            <h1 class="text-5xl">404</h1>
            <p class="text-gray-500 max-w-[200px] text-center">
              Couldnt find this note.
            </p>
            <router-link
              class="
                bg-primary-basic
                p-2
                bg-opacity-5
                hover:bg-opacity-10
                text-sm text-primary-basic
                rounded-md
              "
              to="/"
              >Go Home</router-link
            >
          </div>
        </div>
      </template>
    </div>

    <!-- modals -->
    <!-- delete modal -->
    <Modal v-model="modals.delete" dim closeOnClickOutside closeOnEsc>
      <ConfirmDialog
        :noAction="() => (modals.delete = false)"
        :yesAction="() => delete_note()"
        :yesClass="['bg-red-400 hover:bg-red-500']"
        :noClass="['bg-gray-200 hover:bg-gray-300 text-black']"
        message="You cannot undo this action, are you sure you want to delete this note?"
        :title="`Delete ${note ? note.name : 'Note'}`"
        noText="No, Take me back"
        yesText="Yes, Delete this note"
      />
    </Modal>

    <!-- share modal -->
    <Modal v-model="modals.share" dim closeOnClickOutside closeOnEsc>
      <ShareNote :note="note" @close:modal="modals.share = false" />
    </Modal>
  </div>
</template>

<script>
import DetailItem from "@/components/DetailItem.vue";
import Texteditor from "@/components/texteditor/index.vue";
import FuzzyDate from "@/components/FuzzyDate.vue";
import IconButton from "@/components/IconButton.vue";
import useNote from "@/composables/useNotes";
import { computed, ref } from "@vue/runtime-core";
import EditModeSvg from "../assets/svgs/editModeSvg.vue";
import LeftChevronSvg from "../assets/svgs/leftChevronSvg.vue";
import EmptyStateSvg from "../assets/svgs/emptyStateSvg.vue";
import { useRouter } from "vue-router";
import Modal from "@/components/Modal.vue";
import ConfirmDialog from "@/components/modals/ConfirmDialog.vue";
import NoteTools from "@/components/menu/NoteTools.vue";
import ShareNote from "@/components/modals/ShareNote.vue";

export default {
  props: {
    ld: {
      type: String,
      default: null,
    },
  },
  components: {
    IconButton,
    EditModeSvg,
    LeftChevronSvg,
    EmptyStateSvg,
    DetailItem,
    Texteditor,
    FuzzyDate,
    Modal,
    ConfirmDialog,
    NoteTools,
    ShareNote,
  },
  setup(props) {
    const { Note, getAuthorFullName, deleteNote } = useNote();
    const note = Note(props.ld);
    const router = useRouter();
    const modals = ref({
      delete: false,
      share: false,
    });

    const author = getAuthorFullName(note.value?.author);

    const noteHeading = computed({
      get() {
        return note.value.name;
      },
      set(name) {
        note.value = { name };
      },
    });

    const noteBody = computed({
      get() {
        return note.value.body;
      },
      set(body) {
        note.value = { body };
      },
    });

    const delete_note = () => {
      deleteNote(props.ld);
      router.push("/");
    };

    return {
      note,
      noteBody,
      author,
      noteHeading,
      delete_note,
      modals,
    };
  },
};
</script>

<style scoped>
.view-pad {
  @apply pt-5 flex flex-col;
  @apply gap-4 flex-grow h-[90%];
}

.subject-heading {
  @apply font-medium text-5xl outline-none;
}
</style>
