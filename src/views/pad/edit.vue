<template>
  <div class="view-pad flex flex-col gap-4 flex-grow h-[90%]">
    <Paragraph class="subject-heading" :text="data.name"/>

    <div v-if="data.description" class="border-b border-gray-200 pb-3">
      <h2 class="font-medium text-xl">{{ data.description }}</h2>
    </div>

    <!-- content -->
    <div
      class="
        flex flex-col
        gap-3
        flex-grow
        overflow-y-hidden
        hover:overflow-y-auto
        custom-scrollbar
      "
    >
      <template v-for="item in content">
        <TextSr
          v-if="item._type == types.TYPE_PARAGRAPH"
          :data="item"
          :parent="data"
          :key="item.ld"
        />
        <ImageSr
          v-if="item._type == types.TYPE_IMAGE"
          :data="item"
          :parent="data"
          :key="item.ld"
        />
        <ListSr
          v-if="item._type == types.TYPE_LIST"
          :data="item"
          :parent="data"
          :key="item.ld"
        />
      </template>
    </div>
  </div>
</template>

<script>
import DetailItem from "@/components/DetailItem.vue";
import useNotes from "@/composables/useNotes";
import { computed } from "@vue/runtime-core";
import FuzzyDate from "@/components/FuzzyDate.vue";
import TextSr from "@/components/sr/TextSr.vue";
import ImageSr from "@/components/sr/ImageSr.vue";
import ListSr from "@/components/sr/ListSr.vue";
import * as types from "@/constants/types";
import Paragraph from "@/components/texteditor/Paragraph.vue";

export default {
  name: "EditPad",
  props: {
    data: {
      type: Object,
      required: true,
    },
  },
  components: { DetailItem, FuzzyDate, TextSr, ImageSr, ListSr, Paragraph },
  setup(props) {
    const { getNoteAuthor, getNoteContent } = useNotes();
    const author = computed(() => {
      const a = getNoteAuthor(props.data);
      return {
        ...a,
        fullname: `${a.first_name} ${a.last_name}`,
      };
    });

    const content = computed(() => getNoteContent(props.data));

    return { author, content, types };
  },
};
</script>

<style scoped>
.view-pad {
  @apply px-10 pt-5;
}

.subject-heading {
  @apply font-medium text-5xl;
}
</style>
