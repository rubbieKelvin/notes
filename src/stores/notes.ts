import { Note, NoteInsert, NoteUpdate, Tag } from "@/types/models";
import { defineStore } from "pinia";
import useSharedUQL from "@/plugins/uql";
import { useAuthStore } from "./auth";
import { MenuItem } from "@/types";
import { useRouter } from "vue-router";
import { noteRoute } from "@/plugins/useNavigation";

interface State {
  notes: Note[] | null;
  openedNote: Note | null;
  tags: Tag[];
  sort: {
    by: keyof Note | null;
    ascending: boolean;
  };
}

export const useNotesStore = defineStore("notes", {
  state: (): State => ({
    notes: null,
    openedNote: null,
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
    basicNotes: (state): Note[] => {
      if (state.notes === null) return [];
      return state.notes.filter(
        (note) => !note.is_archived && !note.is_trashed
      );
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
    async openNote(rid: number) {
      const authstore = useAuthStore();
      if (authstore.isAuthenticated) {
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
      try {
        const notes = await this.notemodel.updateMany({
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
        });

        if (notes) {
          const res = notes.map((note) => note.id);

          if (this.openedNote && res.includes(this.openedNote.id))
            this.openedNote = null;

          if (this.notes)
            this.notes = this.notes.filter((note) => !res.includes(note.id));

          if (!permernant) this.notes = [...(this.notes ?? []), ...notes];

          return res;
        }
        return null;
      } catch {
        return null;
      }
    },
    async moveNotesToArchive(
      pks: string[],
      archive = true
    ): Promise<Note[] | null> {
      try {
        const notes = await this.notemodel.updateMany({
          objects: pks.map((pk) => ({
            pk,
            updatedFields: { is_archived: archive },
          })),
          fields: true,
        });

        if (notes) {
          const res = notes.map((note) => note.id);

          if (this.notes) {
            this.notes = this.notes.filter((note) => !res.includes(note.id));
          }

          this.notes = [...(this.notes ?? []), ...notes];

          return notes;
        }
        return null;
      } catch {
        return null;
      }
    },
    async restoreNotes(pks: string[]): Promise<Note[] | null> {
      try {
        const notes = await this.notemodel.updateMany({
          objects: pks.map((pk) => ({
            pk,
            updatedFields: { is_trashed: false },
          })),
          fields: true,
        });

        if (notes) {
          const res = notes.map((note) => note.id);

          if (this.notes) {
            this.notes = this.notes.filter((note) => !res.includes(note.id));
          }

          this.notes = [...(this.notes ?? []), ...notes];

          return notes;
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
    noteContextMenu(
      note: Note,
      {
        showOpen = false,
        useRouterToOpenNote = true,
        onNoteEdited = (notes: Note[]) => {},
      }
    ): MenuItem[] {
      const router = useRouter();

      return [
        {
          id: Symbol(),
          title: "Open",
          hidden: !showOpen,
          icon: "BookOpenIcon",
          action: () => {
            if (useRouterToOpenNote) router.push(noteRoute(note));
            else this.openedNote = note;
          },
        },
        { id: Symbol(), type: "SEPARATOR", hidden: !showOpen },
        {
          id: Symbol(),
          title: "Move to archive",
          icon: "ArchiveBoxIcon",
          hidden: note.is_archived,
          action: async () => {
            const notes = await this.moveNotesToArchive([note.id]);
            if (notes) {
              onNoteEdited(notes);
            }
          },
        },
        {
          id: Symbol(),
          title: "Unarchive",
          icon: "ArchiveBoxXMarkIcon",
          hidden: !note.is_archived,
          action: async () => {
            const notes = await this.moveNotesToArchive([note.id], false);
            if (notes) {
              onNoteEdited(notes);
            }
          },
        },
        { id: Symbol(), title: "Make public", hidden: true },
        { id: Symbol(), title: "Share", hidden: true },
        { id: Symbol(), title: "Export", hidden: true },
        {
          id: Symbol(),
          title: "Delete",
          icon: "TrashIcon",
          action: async () => {
            if (await this.deleteNotes([note.id])) {
              if (note.id === this.openedNote?.id) {
                this.openedNote = null;
              }
            }
          },
        },
      ];
    },
  },
});
