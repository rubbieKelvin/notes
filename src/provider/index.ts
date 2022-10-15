import { App, ref, Ref } from "vue";
import { ToastData } from "@/types";
import { Note } from "@/types/models";
import { localModels } from "@/utils/localModel";

export type Ctx = {
  note: Note | null;
  notes: Array<Note>;
  toasts: Array<ToastData>;
};

export default (app: App) => {
  const ctx: Ref<Ctx> = ref({
    note: null,
    toasts: [],
    notes: localModels.note.all(),
  });
  app.provide("ctx", ctx);
};
