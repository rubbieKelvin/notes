import { defineStore } from "pinia";

export interface State {
  modalstates: {
    createNote: boolean;
    noteDetails: boolean;
  };
}

export const useModalStore = defineStore("modal", {
  state: (): State => {
    return {
      modalstates: {
        createNote: false,
        noteDetails: false,
      },
    };
  },
});
