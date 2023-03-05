import { Note } from "@/types/models";

export const noteSorting: Record<string, (a: Note, b: Note) => number> = {
  UPDATED: (a, b) =>
    new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime(),
};
