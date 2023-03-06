import { IconName } from "@/components/Icon/types";
import { promiseTimeout } from "@vueuse/core";
import { defineStore } from "pinia";

export interface ButtonData {
  id: string;
  text: string;
  isPrimary?: boolean;
  icon?: IconName;
  action: (ctx: any) => any;
  finally?: (ctx: any) => any;
}

export interface FormContentItem {
  id: string;
  type: "textinput";
  defaultValue?: any;
  textinput?: {
    icon?: IconName;
    placeholder?: string;
    focus?: boolean;
    keydownReturn?: (text: string) => any;
    button?: {
      text?: string;
      icon?: IconName;
      loading?: boolean;
      action: (text: string) => any;
    };
  };
}

export interface ExtensibleDialog {
  dim?: boolean;
  escape?: boolean;
  closeOnClickOutside?: boolean;
  headingIcon?: IconName;
  heading: string;
  textContent?: string;
  footerTextContent?: string;
  coverImage?: string;
  formContent?: FormContentItem[];
  buttons?: {
    useRowLoyout?: boolean;
    items: ButtonData[];
  };
}

export interface State {
  extensibleDialogSessionID: Symbol | null;
  extensibleDialogData: ExtensibleDialog | null;
  modalstates: {
    createNote: boolean;
    noteDetails: boolean;
    themeSelectionOpen: boolean;
  };
}

export const useModalStore = defineStore("modal", {
  state: (): State => {
    return {
      extensibleDialogSessionID: null,
      extensibleDialogData: null,
      modalstates: {
        createNote: false,
        noteDetails: false,
        themeSelectionOpen: false
      },
    };
  },
  getters: {
    extensibleDialogVisible(): boolean {
      return !!this.extensibleDialogData;
    },
  },
  actions: {
    async openExtensibleModal(id: Symbol, data: ExtensibleDialog) {
      this.extensibleDialogData = null;
      this.extensibleDialogSessionID = null;
      await promiseTimeout(50);

      this.extensibleDialogSessionID = id;
      this.extensibleDialogData = data;
    },

    closeExtensibleModal(id: Symbol) {
      // we need the id to check if we're trying to close the same modal as the one we opened
      // if it's not the same and we dont check, a dialog might close another dialogs modal
      if (id === this.extensibleDialogSessionID) {
        this.forceCloseExtensibleModal();
      }
    },
    forceCloseExtensibleModal() {
      this.extensibleDialogData = null;
      this.extensibleDialogSessionID = null;
    },
  },
});
