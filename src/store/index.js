import { createStore } from "vuex";
import { ADD_ITEM } from "@/constants/mutations";

export default createStore({
  state: () => ({
    kvdb: {},
  }),
  mutations: {
    [ADD_ITEM](state, payload){
      if (!payload.ld) return
      state.kvdb[payload.ld] = payload
    },
  },
});
