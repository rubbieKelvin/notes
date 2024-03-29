<template>
  <ContextMenuWrapper :list="menu">
    <div
      @click="handleClick"
      class="flex gap-2 md:p-2 py-2 px-6 group"
      :class="{
        'hover:bg-themed-hover-bg hover:text-themed-hover-text':
          !note.is_trashed || selecting,
      }"
    >
      <input
        v-if="selecting"
        type="checkbox"
        :checked="selected"
        class="pointer-events-none accent-themed-accent-bg w-5"
      />

      <router-link
        class="flex-grow"
        :class="{ 'pointer-events-none': hide_routing }"
        :to="shouldDirectlyOpenNote ? '#' : noteRoute(note, page)"
      >
        <div class="w-full flex gap-2 items-center">
          <div class="flex-grow">
            <div class="">
              <p class="">
                {{ nodeItemName(note.title) }}
              </p>
            </div>
            <p
              class="text-xs group-hover:text-themed-hover-text-subtle text-themed-text-subtle"
            >
              <UseTimeAgo
                v-slot="{ timeAgo }"
                :time="new Date(note.last_updated)"
              >
                {{ timeAgo }}
              </UseTimeAgo>
            </p>
          </div>

          <template v-if="!note.is_trashed">
            <Icon
              v-if="note.is_archived"
              name="LockClosedIcon"
              class="w-3 h-3"
            />
            <Icon
              v-else-if="note.is_starred"
              name="StarIcon"
              class="w-3 h-3 text-yellow-400"
              solid
            />
          </template>
          <template v-else>
            <button
              v-if="!selecting"
              @click="restoreNote"
              class="btn p-1 text-xs pointer-events-auto group-hover:flex hidden"
            >
              Restore
            </button>
          </template>
        </div>
      </router-link>
    </div>
  </ContextMenuWrapper>
</template>

<script lang="ts">
import { Note } from "@/types/models";
import { NotePages, noteRoute } from "@/composables/useNavigation";
import { UseTimeAgo } from "@vueuse/components";
import { computed, defineComponent, watch } from "vue";
import ContextMenuWrapper from "@/components/Popup/ContextMenuWrapper.vue";
import { MenuItem } from "@/types";
import { useRoute } from "vue-router";
import { useNotesStore } from "@/stores/notes";
import Icon from "./Icon";
import { noteContextMenu } from "@/utils/contextmenus";
import { nodeItemName } from "@/utils/grouping";

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
    const route = useRoute();
    const notestore = useNotesStore();

    const shouldDirectlyOpenNote = computed(() =>
      ["Trash"].includes(route.name as string)
    );

    const handleClick = () => {
      if (props.selecting) {
        if (props.selected) emit("deselect");
        else emit("select");
      } else if (
        shouldDirectlyOpenNote.value &&
        props.note.readable_id !== null
      ) {
        if (!props.note.is_trashed) notestore.openNote(props.note.id);
      }
    };

    const hide_routing = computed(() => {
      return props.selecting || shouldDirectlyOpenNote.value;
    });

    const menu = computed((): MenuItem[] =>
      noteContextMenu(props.note, {
        showMenuItemOpen: true,
        useRouterToOpenNote: !shouldDirectlyOpenNote.value,
      })
    );

    const restoreNote = () => {
      notestore.setManyNoteAttrs({
        pks: [props.note.id],
        attrs: { is_trashed: false },
      });
    };

    return {
      menu,
      handleClick,
      noteRoute,
      hide_routing,
      shouldDirectlyOpenNote,
      restoreNote,
      nodeItemName,
    };
  },
});
</script>
