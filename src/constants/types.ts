import { Note, User } from "@/packages/api/types/models";

export interface ApplicationDataContext {
    user: User|null,
    notes: Note[],
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