export type UserWritable = {
  username: string;
  first_name: string | null;
  last_name: string | null;
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
  last_login: string;
  id: string;
  date_created: string;
  notes: Note[];
}
