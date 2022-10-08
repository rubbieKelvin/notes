import { IconName } from "@/components/Icon/types";

export type MenuItemType = "NORMAL" | "SEPARATOR" | "HEADER";

export type MenuItem = {
  id: string | number;
  title?: string;
  subtitle?: string;
  icon?: IconName;
  badgeText?: string;
  action?: () => any;
  disabled?: boolean;
  link?: string | { name: string; params: Record<string, string> };
  colors?: {
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
