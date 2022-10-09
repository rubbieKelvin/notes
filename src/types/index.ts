import { IconName } from "@/components/Icon/types";

export type MenuItemType = "NORMAL" | "SEPARATOR" | "HEADER";
export type RouteName = "Notes";

export type MenuItem = {
  id: string | number | symbol;
  title?: string;
  subtitle?: string;
  icon?: IconName;
  badgeText?: string;
  action?: () => any;
  disabled?: boolean;
  link?: string | { name: RouteName; params?: Record<string, string> };
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
};

export type ToastData = {
  id: symbol | number | string;
  icon?: IconName;
  title?: string;
  desciption?: string;
  timeout?: number | false;
  persistent?: boolean;
  actions?: Array<{
    title: string;
    action: () => any;
    colorClasses?: { fg?: string; bg?: string };
  }>;
  colorClasses?: {
    fg?: string;
    bg: string;
  };
  meta?: Record<string, any>;
};

export type LocalData = {
  __type: string;
  data: any;
  date_added: string;
};
