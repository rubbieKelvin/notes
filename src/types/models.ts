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
};
