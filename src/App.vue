<template>
  <router-view class="text-base" />
</template>

<script>
import { onMounted } from "@vue/runtime-core";
import { values } from "idb-keyval";
import { useStore } from "vuex";
import { UPDATE_NOTE } from "./constants/mutations";
import useNotes from "./composables/useNotes";

export default {
  setup() {
    const store = useStore();

    onMounted(async () => {
      const dbvalues = await values();
      const notekeys = Object.keys(store.state.notes);

      dbvalues.forEach((value) => {
        const jsonValue = JSON.parse(value);
        if (jsonValue?._type === "note" && !notekeys.includes(jsonValue.ld)) {
          store.commit(UPDATE_NOTE, jsonValue);
        }
      });

      if (Object.keys(store.state.notes).length === 0) {
        const { createWelcomeNote } = useNotes();
        createWelcomeNote(store);
      }
    });
    return {};
  },
};
</script>
