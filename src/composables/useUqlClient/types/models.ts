export type UserWritable = {
  username: string;
  first_name: string;
  last_name: string;
};

export type NoteWritable = {
  title: string;
  content: Record<string, any>;
  is_archived: boolean;
  is_public: boolean;
};

export interface Note extends NoteWritable {
  id: string;
  readable_id: number;
  author: string;
  date_created: string;
  last_updated: string;
}

export interface User extends UserWritable {
  last_login: null | string;
  id: string;
  date_created: string;
  notes: Note[];
}
