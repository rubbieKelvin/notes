import { PaginatedFetch } from "@/packages/api/types";
import { Note, User } from "@/packages/api/types/models";

export interface ApplicationDataContext {
  user: User | null;
  notes: Note[];
  current_note: Note|null;
  updateUser: () => Promise<void>;
  updateNotes: () => Promise<void>;
  fetchCurrentNote: (slug:string) => Promise<void>;
}

export interface Link {
  text: string;
  href?: string;
  callback?: () => any;
  userouter?: boolean;
  icon?: string;
  asbutton?: boolean;
  alternatestyle?: boolean;
}

export interface NavbarLinkType {
  left?: Link[];
  right?: Link[];
}

export interface QuickLink {
  name: string;
  icon?: string;
  link: string;
  enabled: boolean;
}