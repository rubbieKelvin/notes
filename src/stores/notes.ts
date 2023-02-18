import { Note, NoteInsert, NoteUpdate, Tag } from "@/types/models";
import { defineStore } from "pinia";
import useSharedUQL from "@/composables/uql";
import { useAuthStore } from "./auth";
import { MenuItem } from "@/types";
import { useRouter } from "vue-router";
import { noteRoute } from "@/composables/useNavigation";
import { Pk } from "@/composables/uql/types";
import { useModalStore } from "./modals";

interface State {
  notes: Note[] | null;
  openedNote: Note | null;
  tags: Tag[];
  settings: {
    autosave: boolean;
    sort: {
      by: keyof Note | null;
      ascending: boolean;
    };
  };
}

interface UpdateNoteAction {
  objects: {
    updatedFields: NoteUpdate;
    pk: Pk;
  }[];
  fields?: Record<any, any> | boolean;
  removeFromList?: boolean;
  closeNoteIfAffected?: boolean;
}

export const useNotesStore = defineStore("notes", {
  state: (): State => ({
    notes: null,
    openedNote: null,
    tags: [],
    settings: {
      autosave: true,
      sort: {
        by: null,
        ascending: true,
      },
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
    basicNotes: (state): Note[] => {
      if (state.notes === null) return [];
      return state.notes.filter(
        (note) => !note.is_archived && !note.is_trashed
      );
    },
    publicNotes(state): Note[] {
      return this.basicNotes.filter((note) => note.is_public);
    },
    sharedNotes: (): Note[] => {
      return [];
    },
    archivedNotes: (state): Note[] => {
      if (state.notes === null) return [];
      return state.notes.filter((note) => note.is_archived && !note.is_trashed);
    },
    starredNotes: (state): Note[] => {
      if (state.notes === null) return [];
      return state.notes.filter(
        (note) => note.is_starred && !note.is_archived && !note.is_trashed
      );
    },
    trashedNotes: (state): Note[] => {
      if (state.notes === null) return [];
      return state.notes.filter((note) => note.is_trashed);
    },
  },
  actions: {
    async _updateManyNotes({
      objects,
      fields = true,
      removeFromList = false,
      closeNoteIfAffected = true,
    }: UpdateNoteAction): Promise<Note[] | null> {
      try {
        const notes = await this.notemodel.updateMany({
          objects,
          fields,
        });

        if (notes) {
          const res = notes.map((note) => note.id);

          if (
            this.openedNote &&
            res.includes(this.openedNote.id) &&
            closeNoteIfAffected
          )
            this.openedNote = null;

          if (this.notes)
            this.notes = this.notes.filter((note) => !res.includes(note.id));

          if (!removeFromList) this.notes = [...(this.notes ?? []), ...notes];

          return notes;
        }
        return null;
      } catch {
        return null;
      }
    },
    async openNote(rid: number, username: string | null = null) {
      const authstore = useAuthStore();
      if (username) {
        this.openedNote = await this.getNoteByRiD(rid, username);
      } else if (authstore.isAuthenticated) {
        this.openedNote = await this.getNoteByRiD(rid);
      }
    },
    async createNote(object: NoteInsert) {
      const note = await this.notemodel.insert({ object, fields: true });
      if (note) {
        if (this.notes !== null) this.notes.push(note);
        else this.notes = [note];
      }
      return note;
    },
    async deleteNotes(
      pks: string[],
      permernant = false
    ): Promise<string[] | null> {
      const res = await this._updateManyNotes({
        objects: pks.map((pk) => ({
          pk,
          updatedFields: permernant
            ? { is_deleted: true }
            : { is_trashed: true },
        })),
        fields: permernant
          ? {
              id: true,
            }
          : true,
        removeFromList: permernant,
      });

      if (res !== null) return res.map((note) => note.id);
      return null;
    },
    async setManyNoteAttrs(options: {
      pks: string[];
      attrs: Partial<Note>;
      closeNoteIfAffected?: boolean;
    }): Promise<Note[] | null> {
      return await this._updateManyNotes({
        objects: options.pks.map((pk) => ({
          pk,
          updatedFields: options.attrs,
        })),
        fields: true,
        closeNoteIfAffected: !!options.closeNoteIfAffected,
      });
    },
    async searchNotes(query: string): Promise<Note[]> {
      const authstore = useAuthStore();
      const notes = await this.notemodel.findMany({
        where: {
          _or: [
            { title: { _icontains: query } },
            { content: { _icontains: query } },
          ],
          author__id: { _eq: authstore.user?.id },
        },
        fields: true,
        limit: 100,
      });

      return notes ?? [];
    },
    async getNoteByRiD(
      rid: number,
      username: string | null = null,
      forceRemote: boolean = false
    ) {
      if (this.notes === null || forceRemote) {
        const note =
          (
            await this.notemodel.findMany({
              where: {
                readable_id: { _eq: rid },
                ...(username
                  ? { author: { username: { _eq: username } } }
                  : {}),
              },
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
      const authstore = useAuthStore();

      if (authstore.isAuthenticated) {
        const notes = await this.notemodel.findMany({
          // adding author id to query so we dont get other peoples public note in this call
          where: { author: { id: { _eq: authstore.user?.id } } },
          fields: true,
        });

        this.notes = notes;
      }
    },
  },
});
