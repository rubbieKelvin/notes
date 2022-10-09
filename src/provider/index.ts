import { App, ref, Ref } from "vue";
import { ToastData } from "@/types";
import { Note } from "@/types/models";
import { localModels } from "@/utils/localModel";

export default (app: App) => {
  const toasts: Ref<ToastData[]> = ref([]);
  const notes: Ref<Note[]> = ref(localModels.note.all());

  app.provide("toasts", toasts);
  app.provide("notes", notes);
};
