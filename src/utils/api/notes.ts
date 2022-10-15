import { Note } from "@/types/models";
import { v4 as uuid4 } from "uuid";
import { localModels } from "@/utils/localModel";
import { computed, inject, Ref } from "vue";
import { useToasts } from "@/utils/toasts";
import { Ctx } from "@/plugins/context";

export const useNotesManager = () => {
  const ctx = inject("ctx") as Ref<Ctx>;
  const notes = computed({
    get: () => ctx.value.notes,
    set: (v) => (ctx.value.notes = v),
  });

  const toasts = useToasts();
  const createNote = async (title: string): Promise<Note> => {
    // create note over api or local
    // local
    const note: Note = {
      id: `l-${uuid4()}`,
      title: title.trim(),
      description: null,
      author: null,
      date_created: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      folder: null,
      tags: [],
      is_archived: false,
    };
    localModels.note.add(note);
    notes.value.push(note);
    toasts.addToast({
      id: Symbol(),
      title: "Created note",
      desciption: `Added "${note.title}" added to list`,
      timeout: 2000,
      icon: "BookOpenIcon",
    });
    return note;
  };

  return {
    createNote,
  };
};
