import { createStore } from "vuex";
import { ADD_ITEM } from "@/constants/mutations";

export default createStore({
  state: () => ({
    kvdb: {},
  }),
  mutations: {
    [ADD_ITEM](state, payload){
      const identifier = payload.ld || payload.id
      if (!identifier) return
      state.kvdb[identifier] = payload
    }
  },
});
