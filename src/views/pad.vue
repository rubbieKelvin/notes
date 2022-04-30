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

          <h1 class="flex-grow capitalize">{{ note.name }}</h1>

          <div class="tools">
            <IconButton
              class="w-[30px] h-[30px]"
              :class="{
                'bg-primary-basic hover:bg-primary-vibrant w-auto px-2 gap-2':
                  editmode,
              }"
              @click="editmode = !editmode"
            >
              <EditModeSvg
                :class="[editmode ? 'text-white' : 'text-inherit']"
              />
              <span v-if="editmode" class="text-white">Save</span>
            </IconButton>
          </div>
        </div>

        <EditPad v-if="editmode" :data="note" />
        <ViewPad v-else :data="note" />
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
              class="
                bg-primary-basic
                p-2
                bg-opacity-10
                hover:bg-opacity-25
                text-primary-basic
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
import IconButton from "@/components/IconButton.vue";
import useNote from "@/composables/useNotes";
import { computed, ref } from "@vue/runtime-core";
import ViewPad from "./pad/view.vue";
import EditModeSvg from "../assets/svgs/editModeSvg.vue";
import LeftChevronSvg from "../assets/svgs/leftChevronSvg.vue";
import EmptyStateSvg from "../assets/svgs/emptyStateSvg.vue";
import EditPad from "./pad/edit.vue";

export default {
  props: {
    ld: {
      type: String,
      default: null,
    },
  },
  components: {
    IconButton,
    ViewPad,
    EditModeSvg,
    LeftChevronSvg,
    EmptyStateSvg,
    EditPad,
  },
  setup(props) {
    const { getNote } = useNote();
    const note = computed(() => getNote(props.ld));
    const editmode = ref(false);

    return { note, editmode };
  },
};
</script>
