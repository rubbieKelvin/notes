import { NAVBAR_STATES } from "./states";

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

export const NavLinks: Record<string, NavbarLinkType> = {
  [NAVBAR_STATES.DEFAULT]: {
    right: [
      {
        text: "Login",
        href: '/login',
        userouter: true,
        asbutton: true,
        alternatestyle: true,
      },
      {
        text: "Signup",
        href: '/signup',
        userouter: true,
        asbutton: true,
      },
    ],
  },
};
