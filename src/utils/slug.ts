import slugify from "slugify";

export default (text: string): string => {
  return slugify(text, {
    replacement: "-",
    lower: true,
    strict: true,
    trim: true,
  });
};
