import { JSONContent } from "@tiptap/vue-3";

export type User = {
  id: string;
  username: string;
  date_created: string;
  last_login: string | null;
  first_name: string | null;
  last_name: string | null;
  notes: Note[];
};

export type Tag = {};

export type Note = {
  id: string;
  title: string;
  content: JSONContent;
  readable_id: number | null;
  author: User | null;
  date_created: string;
  last_updated: string;
  is_archived: boolean;
  is_public: boolean;
};

export type NoteInsert = {
  title: string;
  is_public?: boolean;
};

export type NoteUpdate = {
  title?: string;
  content?: JSONContent;
  is_archived?: boolean;
  is_public?: boolean;
};