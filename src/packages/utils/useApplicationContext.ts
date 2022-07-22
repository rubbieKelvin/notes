import { ApplicationDataContext } from "@/constants/types";
import { ref, Ref } from "@vue/runtime-core";
import { get_my_notes, get_user } from "@/packages/api";


export default () => {
  const ctx: Ref<ApplicationDataContext> = ref({
    user: null,
    notes: [],
    current_note: null,
    updateUser: async () => {
      const user = await get_user();
      ctx.value.user = user;
    },
    updateNotes: async () => {
      const notes = await get_my_notes();
      ctx.value.notes = notes;
    },
    fetchCurrentNote: async (slug) => {
        
    },
  });

  return ctx;
};
