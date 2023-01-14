import { App, inject, ref, Ref } from "vue";
import { ToastData } from "@/types";
import { Note, User } from "@/types/models";
import { localModels } from "@/utils/localModel";

export type Ctx = {
  user: User | null;
  note: Note | null;
  notes: Array<Note>;
  toasts: Array<ToastData>;
};

export const provideContext = () => {
  return inject("ctx") as Ref<Ctx>;
};

export default {
  install: (app: App) => {
    const ctx: Ref<Ctx> = ref({
      user: null,
      note: null,
      toasts: [],
      notes: localModels.note.all(),
    });
    app.provide("ctx", ctx);
  },
};
