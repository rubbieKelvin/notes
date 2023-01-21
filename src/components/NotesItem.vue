<template>
  <ContextMenuWrapper :list="menu">
    <div @click="handleClick" class="hover:bg-hover flex gap-2 p-2">
      <input
        v-if="selecting"
        type="checkbox"
        :checked="selected"
        class="pointer-events-none"
      />
      <router-link
        class="flex-grow"
        :class="{ 'pointer-events-none': hide_routing }"
        :to="noteRoute(note, page)"
      >
        <div class="w-full flex gap-2 items-center">
          <div class="flex-grow">
            <div class="">
              <p class="capitalize">
                {{ note.title }}
              </p>
            </div>
            <p class="text-xs text-gray-600">
              <UseTimeAgo
                v-slot="{ timeAgo }"
                :time="new Date(note.last_updated)"
              >
                {{ timeAgo }}
              </UseTimeAgo>
            </p>
          </div>

          <Icon v-if="note.is_archived" name="LockClosedIcon" class="w-3 h-3" />
          <Icon
            v-else-if="note.is_starred"
            name="StarIcon"
            class="w-3 h-3 text-yellow-400"
            solid
          />
        </div>
      </router-link>
    </div>
  </ContextMenuWrapper>
</template>

<script lang="ts">
import { Note } from "@/types/models";
import { NotePages, noteRoute } from "@/plugins/useNavigation";
import { UseTimeAgo } from "@vueuse/components";
import { computed, defineComponent } from "vue";
import ContextMenuWrapper from "@/components/Popup/ContextMenuWrapper.vue";
import { MenuItem } from "@/types";
import { useRoute, useRouter } from "vue-router";
import { useNotesStore } from "@/stores/notes";
import Icon from "./Icon";

export default defineComponent({
  props: {
    note: { type: Object as () => Note, required: true },
    page: { type: String as () => keyof NotePages, default: "Note" },
    selected: { type: Boolean },
    selecting: { type: Boolean },
  },
  components: { ContextMenuWrapper, UseTimeAgo, Icon },
  emits: ["select", "deselect"],
  setup(props, { emit }) {
    const router = useRouter();
    const route = useRoute();
    const notestore = useNotesStore();

    const shouldDirectlyOpenNote = computed(() => route.name === "Search");

    const handleClick = () => {
      if (props.selecting) {
        if (props.selected) emit("deselect");
        else emit("select");
      } else if (
        shouldDirectlyOpenNote.value &&
        props.note.readable_id !== null
      ) {
        notestore.openNote(props.note.readable_id);
      }
    };

    const hide_routing = computed(() => {
      return props.selecting || shouldDirectlyOpenNote.value;
    });

    const menu: MenuItem[] = notestore.noteContextMenu(props.note, {
      showOpen: true,
      useRouterToOpenNote: !shouldDirectlyOpenNote.value,
    });

    return {
      menu,
      handleClick,
      noteRoute,
      hide_routing,
    };
  },
});
</script>
