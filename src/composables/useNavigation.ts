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
  PublicNote: string;
};

export const noteRoute = (
  note: Note,
  name: keyof NotePages = "Note",
  params?: Record<string, string>
): Route => {
  return {
    name,
    params: {
      identifier: note.id,
      ...params,
    },
  };
};

export const goToLogin = () => {
  const router = useRouter();
  router.push("/");
};
