<template>
  <!-- base router -->
  <router-view class="text-base h-full" />
</template>

<script>
export default {}
// import { useStore } from "vuex";
// import { get, values } from "idb-keyval";
// import { onMounted } from "@vue/runtime-core";
// import useNotes from "./composables/useNotes";
// // ...
// import { DELETE_NOTE, UPDATE_NOTE, UPDATE_SETTINGS } from "./constants/mutations";
// import { DEFAULT_SETTINGS } from "@/constants/settings";
// import useUtils from "./composables/useUtils";

// export default {
//   setup() {
//     const store = useStore();
//     const { isValidNoteObject } = useUtils();

//     onMounted(async () => {
//       const dbvalues = await values();
//       const notekeys = Object.keys(store.state.notes);

//       // loop through all values in our local db
//       // we want to select all the items that have _type='note'
//       dbvalues.forEach((value) => {
//         const jsonValue = JSON.parse(value);
//         const _type = jsonValue?._type;
//         // ...
//         if (_type === "note") {
//           if (isValidNoteObject(jsonValue)) {
//             if (typeof jsonValue.ld === 'string' && jsonValue.ld?.length > 0 && !notekeys.includes(jsonValue.ld))
//               store.commit(UPDATE_NOTE, jsonValue);
//           } else {
//             // remove the object from the store
//             store.commit(DELETE_NOTE, jsonValue.ld)
//           }
//         }
//       });

//       // if theres no note in store after loading from db,
//       // create a welcome note
//       if (Object.keys(store.state.notes).length === 0) {
//         const { createWelcomeNote } = useNotes();
//         createWelcomeNote(store);
//       }

//       // get settings
//       let settings = await get("@settings");
//       try {
//         settings = JSON.parse(settings);
//         settings = { ...DEFAULT_SETTINGS, ...settings };
//         store.commit(UPDATE_SETTINGS, settings);
//       } catch {
//         // error loading up json, so just use the default settings
//         store.commit(UPDATE_SETTINGS, DEFAULT_SETTINGS);
//       }
//     });

//     // ...
//     return {};
//   },
// };
</script>
