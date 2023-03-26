import { JSONContent } from "@tiptap/vue-3";

export type UUID = string;
export type DateTime = string;
export type NoteContent = JSONContent;

export interface User {
  id: UUID;
  username: string;
  date_created: DateTime;
  last_login: DateTime | null;
  first_name: string | null;
  last_name: string | null;
}

export interface Note {
  id: UUID;
  title: string;
  content: NoteContent;
  readable_id: number;
  author: User;
  date_created: DateTime;
  last_updated: DateTime;
  is_starred: boolean;
  is_archived: boolean;
  is_public: boolean;
  is_trashed: boolean;
}

export interface NoteInsert {
  title: string;
  author: string;
  is_public?: boolean;
}

export interface NoteUpdate {
  title?: string;
  content?: NoteContent;
  is_starred?: boolean;
  is_archived?: boolean;
  is_public?: boolean;
  is_deleted?: boolean;
  is_trashed?: boolean;
}

export interface SharedNote {
  id: UUID;
  note: Note;
  shared_to: User;
  is_active: boolean;
  allow_edit: boolean;
  shared_on: DateTime;
  content: NoteContent | null;
}
