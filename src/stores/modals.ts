import { IconName } from "@/components/Icon/types";
import { defineStore } from "pinia";

export interface ButtonData {
  text: string;
  isPrimary?: boolean;
  icon?: IconName;
  action: (ctx: Record<string, any>) => any;
  finally?: (ctx: Record<string, any>) => any;
}

export interface FormContentItem {
  id: string;
  type: "textinput";
  defaultValue?: any;
  textinput?: {
    icon?: IconName;
    placeholder?: string;
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
    useRowLoyout: boolean;
    items: ButtonData[];
  };
}

export interface State {
  extensibleDialogData: ExtensibleDialog | null;
  modalstates: {
    createNote: boolean;
    noteDetails: boolean;
  };
}

export const useModalStore = defineStore("modal", {
  state: (): State => {
    return {
      extensibleDialogData: null,
      modalstates: {
        createNote: false,
        noteDetails: false,
      },
    };
  },
  getters: {
    extensibleDialogVisible(): boolean {
      return !!this.extensibleDialogData;
    },
  },
});
