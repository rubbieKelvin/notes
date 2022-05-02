<template>
  <div class="bg-gray-50 min-h-screen flex justify-center items-end">
    <div
      class="
        bg-white
        shadow-md
        rounded-t-md
        h-[90vh]
        max-h-[90vh] max-w-[850px]
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

          <div class="tools">
            <!-- ... -->
            <IconButton
              class="hover:bg-red-500 p-1 hover:text-white"
              @click="deleteModalOpened = true"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                class=""
              >
                <path
                  d="M3 5.25H15M14.25 5.25L13.5997 14.3565C13.5728 14.7349 13.4035 15.0891 13.1258 15.3477C12.8482 15.6063 12.4829 15.75 12.1035 15.75H5.8965C5.5171 15.75 5.1518 15.6063 4.87416 15.3477C4.59653 15.0891 4.42719 14.7349 4.40025 14.3565L3.75 5.25H14.25ZM7.5 8.25V12.75V8.25ZM10.5 8.25V12.75V8.25ZM11.25 5.25V3C11.25 2.80109 11.171 2.61032 11.0303 2.46967C10.8897 2.32902 10.6989 2.25 10.5 2.25H7.5C7.30109 2.25 7.11032 2.32902 6.96967 2.46967C6.82902 2.61032 6.75 2.80109 6.75 3V5.25H11.25Z"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </IconButton>
          </div>
        </div>

        <!-- ...pad -->
        <div class="view-pad">
          <!-- heading -->
          <input
            v-model="noteHeading"
            placeholder="Note title...."
            type="text"
            class="subject-heading"
          />

          <FuzzyDate :datetime="note.created_at" v-slot="{ fuzzy }">
            <p class="">
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

    <Modal v-model="deleteModalOpened" dim closeOnClickOutside closeOnEsc>
      <ConfirmDialog
        :noAction="() => (deleteModalOpened = false)"
        :yesAction="() => delete_note()"
        :yesClass="['bg-red-400 hover:bg-red-500']"
        :noClass="['bg-gray-300 hover:bg-gray-400 text-black']"
        message="You cannot undo this action, are you sure you want to delete this note?"
        :title="`Delete ${note.name}`"
        noText="No, Take me back"
        yesText="Yes, Delete this note"
      />
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
import ConfirmDialog from "@/components/ConfirmDialog.vue";

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
  },
  setup(props) {
    const { Note, getAuthorFullName, deleteNote } = useNote();
    const note = Note(props.ld);
    const router = useRouter();
    const deleteModalOpened = ref(false);

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
      deleteModalOpened,
    };
  },
};
</script>

<style scoped>
.view-pad {
  @apply px-10 pt-5 flex flex-col;
  @apply gap-4 flex-grow h-[90%];
}

.subject-heading {
  @apply font-medium text-5xl outline-none;
}
</style>
