import { Note } from "@/types/models";
import { useRouter } from "vue-router";

export type Route = {
  name: string;
  params?: Record<string, any>;
};

export type NotePages = {
  Note: string;
  SharedNote: string;
  ArchivedNote: string;
  StarredNote: string;
  Trash: string;
};

export const noteRoute = (
  note: Note,
  name: keyof NotePages = "Note"
): Route => {
  return {
    name,
    params: {
      identifier: note.readable_id,
    },
  };
};

export const goToLogin = () => {
  const router = useRouter();
  router.push("/");
};