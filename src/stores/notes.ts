import { Note, NoteInsert, NoteUpdate, Tag } from "@/types/models";
import { defineStore } from "pinia";
import useSharedUQL from "@/plugins/uql";
import { useAuthStore } from "./auth";

interface State {
  notes: Note[] | null;
  tags: Tag[];
  sort: {
    by: keyof Note | null;
    ascending: boolean;
  };
}

export const useNotesStore = defineStore("notes", {
  state: (): State => ({
    notes: null,
    tags: [],
    sort: {
      by: null,
      ascending: true,
    },
  }),
  getters: {
    notemodel() {
      const { model } = useSharedUQL();
      const authstore = useAuthStore();

      return model<Note, NoteInsert, NoteUpdate>("api.note", {
        headers: authstore.authHeader,
      });
    },
    sharedNotes: (): Note[] => {
      return [];
    },
    archivedNotes: (): Note[] => {
      return [];
    },
    starredNotes: (state): Note[] => {
      if (state.notes === null) return [];
      return state.notes.filter((note) => note.is_starred);
    },
    trashedNotes: (): Note[] => {
      return [];
    },
  },
  actions: {
    async createNote(object: NoteInsert) {
      const note = await this.notemodel.insert({ object, fields: true });
      if (note) {
        if (this.notes !== null) this.notes.push(note);
        else this.notes = [note];
      }
      return note;
    },
    async deleteNotes(pks: string[]): Promise<string[] | null> {
      try {
        const notes = await this.notemodel.updateMany({
          objects: pks.map((pk) => ({
            pk,
            updatedFields: { is_deleted: true },
          })),
          fields: {
            id: true,
          },
        });

        if (notes) {
          const res = notes.map((note) => note.id);

          if (this.notes)
            this.notes = this.notes.filter((note) => !res.includes(note.id));

          return res;
        }
        return null;
      } catch {
        return null;
      }
    },
    async searchNotes(query: string): Promise<Note[]> {
      const notes = await this.notemodel.findMany({
        where: {
          _or: [
            { title: { _icontains: query } },
            { content: { _icontains: query } },
          ],
        },
        fields: true,
        limit: 100,
      });

      return notes ?? [];
    },
    async getNoteByRiD(rid: number) {
      if (this.notes === null) {
        const note =
          (
            await this.notemodel.findMany({
              where: { readable_id: { _eq: rid } },
              fields: true,
              limit: 1,
            })
          )?.slice(0, 1)[0] ?? null;

        // just append this one as a dummy until notes are filled
        if (this.notes === null && note !== null) this.notes = [note];
        return note;
      }
      return this.notes?.find((n) => n.readable_id === rid) ?? null;
    },
    async updateNote(note: Note, updates: NoteUpdate) {
      const updatedNote = await this.notemodel.update({
        updatedFields: updates,
        pk: note.id,
        fields: true,
      });
      if (updatedNote && this.notes) {
        const index = this.notes.findIndex((n) => n.id === note.id);
        if (index === -1) {
          // add the note to list if it never existed
          this.notes.push(updatedNote);
        } else {
          // just change where the note has been
          this.notes[index] = updatedNote;
        }
      }
      return updatedNote;
    },
    async fetchNotes() {
      const notes = await this.notemodel.findMany({
        where: { is_deleted: { _eq: false } },
        fields: true,
      });

      this.notes = notes;
    },
  },
});
