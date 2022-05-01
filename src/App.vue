<template>
  <router-view class="text-base" />
</template>

<script>
import { onMounted } from "@vue/runtime-core";
import { values } from "idb-keyval";
import { useStore } from "vuex";
import { UPDATE_NOTE } from './constants/mutations';
// import { _buildWelcomeDocument } from "./utils"

export default {
  setup() {
    // _buildWelcomeDocument()
    const store = useStore();

    onMounted(async () => {
      const dbvalues = await values();
      const notekeys = Object.keys(store.state.notes);

      dbvalues.forEach((value) => {
        const jsonValue = JSON.parse(value);
        if (jsonValue?._type === "note" && !notekeys.includes(jsonValue.ld)) {
          store.commit(UPDATE_NOTE, jsonValue)
        }
      });
    });
    return {};
  },
};
</script>