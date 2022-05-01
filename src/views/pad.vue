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
    const { Note, getAuthorFullName } = useNote();
    const note = Note(props.ld);

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

    return { note, noteBody, author, noteHeading };
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
