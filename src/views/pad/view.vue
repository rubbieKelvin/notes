<template>
  <div class="view-pad flex flex-col gap-4 flex-grow md:h-[90%]">
    <h1 class="subject-heading">{{ data.name }}</h1>

    <div class="pb-4">
      <DetailItem>
        <svg
          width="18"
          height="18"
          viewBox="0 0 21 21"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M10.7765 18.4124C12.8982 18.4124 14.9331 17.5696 16.4333 16.0693C17.9336 14.569 18.7765 12.5342 18.7765 10.4124C18.7765 8.29071 17.9336 6.25588 16.4333 4.75559C14.9331 3.2553 12.8982 2.41244 10.7765 2.41244C8.65476 2.41244 6.61993 3.2553 5.11964 4.75559C3.61934 6.25588 2.77649 8.29071 2.77649 10.4124C2.77649 12.5342 3.61934 14.569 5.11964 16.0693C6.61993 17.5696 8.65476 18.4124 10.7765 18.4124V18.4124ZM11.7765 6.41244C11.7765 6.14723 11.6711 5.89287 11.4836 5.70534C11.2961 5.5178 11.0417 5.41244 10.7765 5.41244C10.5113 5.41244 10.2569 5.5178 10.0694 5.70534C9.88185 5.89287 9.77649 6.14723 9.77649 6.41244V10.4124C9.77655 10.6776 9.88194 10.932 10.0695 11.1194L12.8975 13.9484C12.9904 14.0414 13.1007 14.1151 13.2221 14.1653C13.3435 14.2156 13.4736 14.2415 13.605 14.2415C13.7364 14.2415 13.8665 14.2156 13.9879 14.1653C14.1093 14.1151 14.2196 14.0414 14.3125 13.9484C14.4054 13.8555 14.4791 13.7452 14.5294 13.6238C14.5797 13.5024 14.6055 13.3723 14.6055 13.2409C14.6055 13.1095 14.5797 12.9794 14.5294 12.858C14.4791 12.7367 14.4054 12.6264 14.3125 12.5334L11.7765 9.99844V6.41244Z"
            fill="currentColor"
          />
        </svg>

        <FuzzyDate :datetime="data.created_at" v-slot="{ fuzzy }">
          <p class="">
            Created by
            <span class="bg-gray-100 rounded p-1">{{ author.fullname }}</span
            >, {{ fuzzy }}
          </p>
        </FuzzyDate>
      </DetailItem>
    </div>

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

export default {
  name: "ViewPad",
  props: {
    data: {
      type: Object,
      required: true,
    },
  },
  components: { DetailItem, FuzzyDate, TextSr, ImageSr, ListSr },
  setup(props) {
    const { getNoteAuthor, getNoteContent } = useNotes();
    const author = computed(() => {
      const a = getNoteAuthor(props.data)
      
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
  @apply capitalize font-medium text-5xl;
}
</style>
