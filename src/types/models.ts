import { JSONContent } from "@tiptap/vue-3";

export type User = {
  id: string;
  username: string;
};

export type Folder = {};

export type Tag = {};

export type Note = {
  id: string;
  title: string;
  description: string | null;
  author: User | null;
  date_created: string;
  last_updated: string;
  folder: Folder | null;
  tags: Array<Tag> | null;
  is_archived: boolean;
  content: JSONContent;
};

export type NoteUpdate = {
  title?: string;
  description?: string | null;
  author?: User | null;
  date_created?: string;
  last_updated?: string;
  folder?: Folder | null;
  tags?: Array<Tag> | null;
  is_archived?: boolean;
  content?: JSONContent;
};
