import { IconName } from "@/components/Icon/types";

export type MenuItemType = "NORMAL" | "SEPARATOR" | "HEADER" | "CHECKBOX";
export type RouteName =
  | "Notes"
  | "Shared"
  | "Archive"
  | "Trash"
  | "Starred"
  | "PublicHome";

export type MenuItem = {
  id: string | number | symbol;
  title?: string;
  subtitle?: string;
  icon?: IconName;
  mdiIconPath?: string;
  badgeText?: string;
  action?: () => any;
  value?: any;
  disabled?: boolean;
  hidden?: boolean | (() => boolean);
  link?: string | { name: RouteName; params?: Record<string, string> };
  isExternal?: boolean;
  hideOnMobile?: boolean;
  colorClasses?: {
    bg?: string;
    fg?: string;
    badge: string;
  };
  fetchMessage?: string;
  children?:
    | Array<MenuItem>
    | (() => Array<MenuItem>)
    | (() => Promise<Array<MenuItem>>);
  type?: MenuItemType;
  keybinding?: Array<string>;
};

export type ToastDataUpdate = {
  icon?: IconName;
  title?: string;
  desciption?: string;
  timeout?: number | false;
  actions?: Array<{
    title: string;
    action: () => any;
    colorClasses?: { fg?: string; bg?: string };
  }>;
  colorClasses?: {
    fg?: string | Array<string>;
    bg?: string | Array<string>;
    accent?: string | Array<string>;
  };
  meta?: Record<string, any>;
};

export interface ToastData extends ToastDataUpdate {
  id: symbol | number | string;
}

export interface ModelHandler<Model> {
  __type: string;
  all: () => Array<Model>;
  find: (func: (model: Model) => boolean) => Model | null;
  add: (data: Model) => void;
  update: (func: (model: Model) => boolean, update: Model) => void;
  delete: (func: (model: Model) => boolean) => void;
}

export interface TaggedFile {
  id: string;
  file: File;
}

export interface SearchedItem {
  title: string;
  subtitle?: string;
  icon?: IconName;
  group?: string;
  image?: string;
  action: () => any;
}
