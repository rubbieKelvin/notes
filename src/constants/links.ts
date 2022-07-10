import { NAVBAR_STATES } from "./states";
import { NavbarLinkType } from "./types";

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
