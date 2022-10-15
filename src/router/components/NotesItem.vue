<template>
  <router-link
    :to="{
      name: 'Note',
      params: {
        username: note.author ? note.author.username : '@local',
        identifier: note.id,
      },
    }"
  >
    <div class="p-2 hover:bg-hover w-full">
      <div>
        <div>
          <div class="">
            <p class="text-lg capitalize">
              {{ note.title }}
            </p>
            <p v-if="note.description">{{ note.description }}</p>
            <p
              v-else-if="note.author === null"
              class="text-xs bg-gray-200 w-min px-1 rounded"
            >
              local
            </p>
          </div>
          <p class="text-xs text-gray-600">
            {{ fuzzy(note.last_updated) }}
          </p>
        </div>
      </div>
    </div>
  </router-link>
</template>

<script lang="ts">
import { Note } from "@/types/models";
import { useTimeAgo } from "@vueuse/core";
import { defineComponent } from "vue";

export default defineComponent({
  props: {
    note: { type: Object as () => Note, required: true },
  },
  setup() {
    return {
      fuzzy: (datetime: string): string => {
        return useTimeAgo(new Date(datetime)).value;
      },
    };
  },
});
</script>
