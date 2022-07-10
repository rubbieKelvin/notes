import { NAVBAR_STATES } from "./states";
import { NavbarLinkType, QuickLink } from "./types";

export const NavLinks: Record<string, NavbarLinkType> = {
  [NAVBAR_STATES.DEFAULT]: {
    right: [
      {
        text: "Login",
        href: "/login",
        userouter: true,
        asbutton: true,
        alternatestyle: true,
      },
      {
        text: "Signup",
        href: "/signup",
        userouter: true,
        asbutton: true,
      },
    ],
  },
};


export const QuickLinks = <QuickLink[]>[
  { name: "All Notes", icon: "NewspaperIcon", link: "/app/mynotes/", enabled: true },
  { name: "Favorites", icon: "HeartIcon", link: "/app/favorites/", enabled: true },
  { name: "Tags", icon: "TagIcon", link: "/app/tags/", enabled: true },
  { name: "Public", icon: "UserGroupIcon", link: "/app/public/", enabled: true },
  { name: "Archive", icon: "ArchiveIcon", link: "/app/archive/", enabled: true },
];
