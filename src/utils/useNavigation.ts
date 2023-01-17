import { Note } from "@/types/models";

export type Route = {
  name: string;
  params?: Record<string, any>;
};

export const noteRoute = (note: Note): Route => ({
  name: "Note",
  params: {
    username: note.author?.username,
    identifier: note.readable_id,
  },
});
