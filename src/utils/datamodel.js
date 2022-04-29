import { v4 as uuid4 } from "uuid";
import { NO_COLOR } from "@/constants/colors";
import * as types from '@/constants/types'

const baseObject = () => ({
  id: uuid4(),
  _type: null,
  value: null,
  note: null, // note id here
});

export const createNote = ({ name = "Untitled", description = null }) => ({
  _type: types.TYPE_NOTE,
  name,
  description,
  version: "0.0.0",
  created_at: new Date().toISOString(),
  last_edited: new Date().toISOString(),
  last_backup: null,
  tag: null, // pass the tag id here
  author: null, // pass the author id here
  ld: uuid4(),
  id: null,
});

export const createAuthor = ({
  id = "local",
  first_name,
  last_name,
  email = null,
  website = null,
  twitter = null,
}) => {
  const _id = id || uuid4();
  return {
    _type: types.TYPE_AUTHOR,
    first_name,
    last_name,
    email,
    website,
    twitter,
    id: _id,
  };
};

export const createTag = ({ name, color = NO_COLOR }) => ({
  _type: types.TYPE_TAG,
  name,
  color,
  id: uuid4(),
});

export const createText = ({ value, links={} }) => ({
  ...baseObject(),
  _type: types.TYPE_PARAGRAPH,
  links,
  value,
});

export const createImage = ({ value, alt = "image" }) => ({
  ...baseObject(),
  _type: types.TYPE_IMAGE,
  alt,
  value,
});

export const createList = () => ({
  ...baseObject(),
  _type: types.TYPE_LIST,
});

export const createHeading = () => ({
  ...baseObject(),
  _type: types.TYPE_HEADING,
});

export const createListItem = ({
  value,
  list,
  checkable = false,
  checked = false,
}) => ({
  _type: types.TYPE_LIST_ITEM,
  id: uuid4(),
  value,
  list,
  checked,
  checkable,
});
