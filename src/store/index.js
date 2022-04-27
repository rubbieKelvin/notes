import { createStore } from "vuex";
import { APPEND_NOTES } from "@/constants/mutations";

export default createStore({
    state: () => ({
        notes: []
    }),
    mutations: {
        [APPEND_NOTES](state, payload){
            state.notes.push(payload)
        }
    }
})