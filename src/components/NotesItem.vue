<template>
  <ContextMenuWrapper :list="menu">
    <div @click="select" class="hover:bg-hover flex gap-2 p-2">
      <input
        v-if="selecting"
        type="checkbox"
        :checked="selected"
        class="pointer-events-none"
      />
      <router-link
        class="flex-grow"
        :class="{ 'pointer-events-none': selecting }"
        :to="noteRoute(note, page)"
      >
        <div class="w-full">
          <div>
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
        </div>
      </router-link>
    </div>
  </ContextMenuWrapper>
</template>

<script lang="ts">
import { Note } from "@/types/models";
import { NotePages, noteRoute } from "@/plugins/useNavigation";
import { UseTimeAgo } from "@vueuse/components";
import { defineComponent } from "vue";
import ContextMenuWrapper from "@/components/Popup/ContextMenuWrapper.vue";
import { MenuItem } from "@/types";
import { useRouter } from "vue-router";

export default defineComponent({
  props: {
    note: { type: Object as () => Note, required: true },
    page: { type: String as () => keyof NotePages, default: "Note" },
    selected: { type: Boolean },
    selecting: { type: Boolean },
  },
  components: { ContextMenuWrapper, UseTimeAgo },
  emits: ["select", "deselect"],
  setup(props, { emit }) {
    const router = useRouter();

    const select = () => {
      if (props.selecting) {
        if (props.selected) emit("deselect");
        else emit("select");
      }
    };

    const menu: MenuItem[] = [
      {
        id: Symbol(),
        title: "Open",
        action: () => router.push(noteRoute(props.note)),
      },
    ];

    return {
      menu,
      select,
      noteRoute,
    };
  },
});
</script>
