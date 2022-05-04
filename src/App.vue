<template>
  <router-view class="text-base" />
</template>

<script>
import { onMounted } from "@vue/runtime-core";
import { get, values } from "idb-keyval";
import { useStore } from "vuex";
import { UPDATE_NOTE, UPDATE_SETTINGS } from "./constants/mutations";
import { DEFAULT_SETTINGS } from '@/constants/settings'
import useNotes from "./composables/useNotes";

export default {
  setup() {
    const store = useStore();

    onMounted(async () => {
      const dbvalues = await values();
      const notekeys = Object.keys(store.state.notes);

      dbvalues.forEach((value) => {
        const jsonValue = JSON.parse(value);
        const _type = jsonValue?._type;
        if (_type === "note") {
          if (!notekeys.includes(jsonValue.ld))
            store.commit(UPDATE_NOTE, jsonValue);
        }
      });

      if (Object.keys(store.state.notes).length === 0) {
        const { createWelcomeNote } = useNotes();
        createWelcomeNote(store);
      }

      // get settings
      let settings = await get('@settings')
      try{
        settings = JSON.parse(settings)
        settings = {...DEFAULT_SETTINGS, ...settings}
        store.commit(UPDATE_SETTINGS, settings)
      }catch{
        store.commit(UPDATE_SETTINGS, DEFAULT_SETTINGS)
      }
    });
    return {};
  },
};
</script>
