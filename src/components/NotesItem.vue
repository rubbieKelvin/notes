<template>
  <ContextMenuWrapper :list="menu">
    <router-link :to="noteRoute(note)">
      <div class="p-2 hover:bg-hover w-full">
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
  </ContextMenuWrapper>
</template>

<script lang="ts">
import { Note } from "@/types/models";
import { noteRoute } from "@/plugins/useNavigation";
import { UseTimeAgo } from "@vueuse/components";
import { defineComponent } from "vue";
import ContextMenuWrapper from "@/components/Popup/ContextMenuWrapper.vue";
import { MenuItem } from "@/types";
import { useRouter } from "vue-router";

export default defineComponent({
  props: {
    note: { type: Object as () => Note, required: true },
  },
  components: { ContextMenuWrapper, UseTimeAgo },
  setup(props) {
    const router = useRouter();

    const menu: MenuItem[] = [
      {
        id: Symbol(),
        title: "Open",
        action: () => router.push(noteRoute(props.note)),
      },
    ];

    return {
      menu,
      noteRoute,
    };
  },
});
</script>
