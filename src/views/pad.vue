<template>
  <div class="bg-gray-50 min-h-screen flex justify-center items-end">
    <div
      class="bg-white shadow-md rounded-t-md h-[90vh] max-h-[90vh] max-w-[850px] w-full flex-col flex flex-grow"
    >
      <template v-if="note">
        <div
          class="flex items-center px-5 py-2 border-b border-b-gray-200 gap-5"
        >
          <IconButton class="w-[30px] h-[30px]" @click="$router.push('/')">
            <LeftChevronSvg />
          </IconButton>

          <h1 class="flex-grow capitalize">{{ note.name }}</h1>

          <div class="tools">
            <!-- ... -->
          </div>
        </div>

        <!-- ...pad -->
        <div class="view-pad">
          <!-- heading -->
          <input v-model="noteHeading" type="text" class="subject-heading" />

          <FuzzyDate :datetime="note.created_at" v-slot="{ fuzzy }">
            <p class="">
              Created by
              <span class="bg-gray-100 rounded p-1">{{ author.fullname }}</span
              >, {{ fuzzy }}
            </p>
          </FuzzyDate>

          <!-- ...editable -->
          <Texteditor class="flex-grow" v-model="content" />
        </div>
      </template>

      <template v-else>
        <div class="h-full flex flex-col gap-4 items-center justify-center">
          <EmptyStateSvg />
          <div class="flex gap-2 flex-col items-center">
            <h1 class="text-5xl">404</h1>
            <p class="text-gray-500 max-w-[200px] text-center">
              Couldnt find
              <span class="text-gray-800 bg-gray-100 rounded-md p-1">{{
                slug
              }}</span>
              in your notes.
            </p>
            <router-link
              class="bg-primary-basic p-2 bg-opacity-10 hover:bg-opacity-25 text-primary-basic rounded-md"
              to="/"
              >Go Home</router-link
            >
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import DetailItem from "@/components/DetailItem.vue";
import Texteditor from "@/components/texteditor/index.vue";
import FuzzyDate from "@/components/FuzzyDate.vue";
import { ADD_ITEM } from "@/constants/mutations";
import IconButton from "@/components/IconButton.vue";
import useNote from "@/composables/useNotes";
import { computed, ref } from "@vue/runtime-core";
import EditModeSvg from "../assets/svgs/editModeSvg.vue";
import LeftChevronSvg from "../assets/svgs/leftChevronSvg.vue";
import EmptyStateSvg from "../assets/svgs/emptyStateSvg.vue";
import { useStore } from 'vuex';

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
  },
  setup(props) {
    const { getNote, getNoteAuthor } = useNote();
    const note = computed(() => getNote(props.ld));
    const store = useStore()
    const content = ref('');

    const author = computed(() => {
      const a = getNoteAuthor(note.value);
      return {
        ...a,
        fullname: `${a.first_name} ${a.last_name}`,
      };
    });

    const noteHeading = computed({
      get() {
        return note.value.name;
      },
      set(name) {
        const newNote = { ...note.value, name };
        store.commit(ADD_ITEM, newNote);
      },
    });

    return { note, content, author, noteHeading };
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
