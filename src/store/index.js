import { createStore } from "vuex";
import { DELETE_NOTE, UPDATE_NOTE } from "@/constants/mutations";
import { del, set } from 'idb-keyval'

export default createStore({
  state: () => ({
    notes: {}
  }),
  mutations: {
    [UPDATE_NOTE](state, payload){
      if (!payload.ld) return
      state.notes[payload.ld] = payload
      set(payload.ld, JSON.stringify(payload))
    },
    [DELETE_NOTE](state, ld){
      delete state.notes[ld]
      del(ld)
    }
  },
});
