import { createStore } from "vuex";
import { UPDATE_NOTE } from "@/constants/mutations";

export default createStore({
  state: () => ({
    notes: {}
  }),
  mutations: {
    [UPDATE_NOTE](state, payload){
      if (!payload.ld) return
      state.notes[payload.ld] = payload
    },
  },
});
