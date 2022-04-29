import { v4 as uuid4 } from "uuid";
import { NO_COLOR } from "@/constants/colors";
import * as types from "@/constants/types";

export const NotePad = () => {
  let session = [];

  const baseObject = () => ({
    id: null,
    ld: uuid4(),
    _type: null,
  });

  const createNote = ({ name = "Untitled", description = null }) => {
    const obj = {
      ...baseObject(),
      _type: types.TYPE_NOTE,
      name,
      description,
      version: "0.0.0",
      created_at: new Date().toISOString(),
      last_edited: new Date().toISOString(),
      last_backup: null,
      tag: null, // pass the tag id here
      author: null, // pass the author id here
    };
    session.push(obj);
    return obj;
  };

  const createAuthor = ({
    id = "local",
    first_name,
    last_name,
    email = null,
    website = null,
    twitter = null,
  }) => {
    const ld = id || uuid4();
    const obj = {
      ...baseObject(),
      _type: types.TYPE_AUTHOR,
      first_name,
      last_name,
      email,
      website,
      twitter,
      ld,
    };
    session.push(obj);
    return obj;
  };

  const createTag = ({ value, color = NO_COLOR }) => {
    const obj = {
      ...baseObject(),
      _type: types.TYPE_TAG,
      value,
      color,
    };
    session.push(obj);
    return obj;
  };

  const createText = ({ value, note, links = {} }) => {
    const obj = {
      ...baseObject(),
      _type: types.TYPE_PARAGRAPH,
      links,
      value,
      note,
    };
    session.push(obj);
    return obj;
  };

  const createImage = ({ value, note, alt = "image" }) => {
    const obj = {
      ...baseObject(),
      _type: types.TYPE_IMAGE,
      alt,
      value,
      note,
    };
    session.push(obj);
    return obj;
  };

  const createList = ({ note }) => {
    const obj = {
      ...baseObject(),
      _type: types.TYPE_LIST,
      note,
    };
    session.push(obj);
    return obj;
  };

  const createHeading = ({ note, value }) => {
    const obj = {
      ...baseObject(),
      _type: types.TYPE_HEADING,
      value,
      note,
    };
    session.push(obj);
    return obj;
  };

  const createListItem = ({
    value,
    list,
    note,
    checkable = false,
    checked = false,
  }) => {
    const obj = {
      ...baseObject(),
      _type: types.TYPE_LIST_ITEM,
      ld: uuid4(),
      value,
      list,
      checked,
      note,
      checkable,
    };
    session.push(obj);
    return obj;
  };

  const dump = (func) => {
    session.forEach((item) => func(item));
    session = [];
  };

  return {
    dump,
    createAuthor,
    createHeading,
    createImage,
    createList,
    createListItem,
    createNote,
    createTag,
    createText,
  };
};
