interface QuickLink {
  name: string;
  icon: string;
  link: string;
}

export const QUICK_LINKS = <QuickLink[]>[
  { name: "All Notes", icon: "note", link: "/notes/" },
  { name: "Timeline", icon: "clock", link: "/" },
  { name: "Trash", icon: "trash", link: "/" },
];

export interface ToolType {
  name: string;
  icon: string;
  on?: () => void;
}

export const PAD_TOOLS = () =>
  <ToolType[]>[
    { name: "Level one heading", icon: "h1" },
    { name: "Level two heading", icon: "h2" },
    { name: "Level three heading", icon: "h3" },
    { name: "Bold text", icon: "bold-text" },
    { name: "Italic text", icon: "italic" },
    { name: "Underline text", icon: "underline" },
    { name: "Strike-out text", icon: "strikeout" },
    { name: "Small-quote", icon: "small-quote" },
    { name: "Quote", icon: "quote" },
  ];

export const NOTE_TOOLS = () =>
  <ToolType[]>[
    { name: "Duplicate", icon: "" },
    { name: "Delete", icon: "" },
    { name: "Share", icon: "" },
    { name: "Export", icon: "" },
  ];

export interface FontType {
  name: string;
}

export const FONTS = <FontType[]>[
  { name: "Inter" },
  { name: "Roboto" },
  { name: "Open Sans" },
];

export const TOKEN_STORE_KEY = 'x-auth'