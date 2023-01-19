import { Note } from "@/types/models";

export type Route = {
  name: string;
  params?: Record<string, any>;
};

export type NotePages = {
  Note: string;
  SharedNote: string;
  ArchivedNote: string;
  StarredNote: string;
};

export const noteRoute = (
  note: Note,
  name: keyof NotePages = "Note"
): Route => {
  return {
    name,
    params: {
      username: note.author?.username,
      identifier: note.readable_id,
    },
  };
};
