import { Note, NoteUpdate } from "@/types/models";
import { v4 as uuid4 } from "uuid";
import { localModels } from "@/utils/localModel";
import { computed } from "vue";
import { useToasts } from "@/utils/toasts";
import { provideContext } from "@/plugins/context";

const noteIDPrifix = "l-";

export const useNotesManager = () => {
  const ctx = provideContext();
  const notes = computed({
    get: () => ctx.value.notes,
    set: (v) => (ctx.value.notes = v),
  });

  const toasts = useToasts();

  const createNote = async (title: string): Promise<Note> => {
    // create note over api or local
    // local
    const note: Note = {
      id: `${noteIDPrifix}${uuid4()}`,
      title: title.trim(),
      description: null,
      author: null,
      date_created: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      folder: null,
      tags: [],
      content: { type: "doc" },
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

  const updateNote = async (
    id: string,
    update: NoteUpdate
  ): Promise<Note | void> => {
    if (id.startsWith(noteIDPrifix)) {
      // local note
      const note = ctx.value.notes.find((n) => n.id === id);
      if (!note) return;

      const index = ctx.value.notes.findIndex((n) => n.id === id);
      const updatedInstace = {
        ...note,
        ...(update as Note),
        id,
        last_updated: new Date().toISOString(),
      };

      localModels.note.update((n) => n.id === id, updatedInstace);
      ctx.value.notes[index] = updatedInstace;
      return updatedInstace;
    }
  };

  return {
    createNote,
    updateNote,
  };
};
