import { Note, NoteUpdate } from "@/types/models";
import { v4 as uuid4 } from "uuid";
import { localModels } from "@/utils/localModel";
import { computed, ComputedRef, WritableComputedRef } from "vue";
import { useToasts } from "@/utils/toasts";

const noteIDPrifix = "l-";

export const useNotesManager = () => {
  const notes: WritableComputedRef<Note[]> = computed({
    get: () => [],
    set: (v) => {},
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
      content: { type: "doc", content: [{ type: "paragraph" }] },
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
  ): Promise<Note | void> => {};

  return {
    createNote,
    updateNote,
  };
};
