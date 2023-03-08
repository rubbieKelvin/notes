<template>
  <div>
    <div
      @click="opened = !opened"
      class="flex gap-2 px-2 py-2 hover:bg-themed-hover-bg hover:text-themed-hover-text select-none active:bg-themed-active-bg"
    >
      <Icon name="FolderIcon" class="w-6 h-6" />
      <span class="flex-grow">{{ title }}</span>
      <Icon
        :name="opened ? 'ChevronDownIcon' : 'ChevronRightIcon'"
        class="w-5 h-5 text-themed-text-subtle"
      />
    </div>
    <!-- items -->
    <div v-if="opened" class="flex flex-col px-4">
      <template v-for="item in items">
        <NotesItem
          v-if="item.type === 'item' && item.item"
          :key="item.item.id"
          :note="item.item"
          :page="section"
          :selecting="selecting"
          :selected="selectedNotes.includes(item.item.id)"
          @select="
            () => {
              if (item.item) $emit('noteselect', item.item.id);
            }
          "
          @deselect="() => $emit('notedeselect', item.item)"
        />
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { TreeItem } from "@/utils/grouping";
import { Note } from "@/types/models";
import Icon from "./Icon";
import NotesItem from "./NotesItem.vue";
import { NotePages } from "@/composables/useNavigation";

export default defineComponent({
  components: { Icon, NotesItem },
  props: {
    section: String as () => keyof NotePages,
    selecting: Boolean,
    selectedNotes: { type: Array as () => string[], required: true },
    title: { type: String, required: true },
    items: { type: Array as () => TreeItem<Note>[], required: true },
  },
  emits: ["noteselect", "notedeselect"],
  setup() {
    const opened = ref(false);
    return { opened };
  },
});
</script>
