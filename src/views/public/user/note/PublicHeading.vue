<template>
  <div class="border-b border-themed-stroke">
    <div
      class="flex justify-between gap-4 md:gap-10 px-6 py-3 items-center container mx-auto"
    >
      <logo />

      <button class="btn p-1 md:hidden" @click="dialogOpen = true">
        <Icon name="InformationCircleIcon" class="w-5 h-5" />
      </button>
    </div>

    <Dialog
      v-if="note"
      v-model="dialogOpen"
      class="md:hidden"
      dim
      escape
      closeOnClickOutside
    >
      <div
        class="bg-themed-bg border border-stroke py-2 rounded-md w-screen h-screen md:h-auto md:w-auto md:min-w-[400px] flex gap-3 flex-col"
      >
        <DialogHeading
          :title="note.title"
          :buttons="[
            {
              icon: 'XMarkIcon',
              action: () => {
                dialogOpen = false;
              },
            },
          ]"
        />
        <NoteDetails :note="note" class="w-full px-4 pt-3" />
      </div>
    </Dialog>
  </div>
</template>

<script lang="ts">
import NoteDetails from "@/components/NoteDetails.vue";

import Dialog from "@/components/Dialog/index.vue";
import DialogHeading from "@/components/Dialog/Heading.vue";
import { defineComponent, ref } from "vue";
import { NewspaperIcon } from "@heroicons/vue/24/outline";
import { Note } from "@/types/models";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo.vue";

export default defineComponent({
  components: {
    NewspaperIcon,
    Dialog,
    DialogHeading,
    Icon,
    NoteDetails,
    Logo,
  },
  props: {
    note: { type: Object as () => Note },
  },
  setup() {
    const dialogOpen = ref(false);

    return { dialogOpen };
  },
});
</script>
