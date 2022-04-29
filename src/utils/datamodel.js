import { v4 as uuid4 } from "uuid";
import { NO_COLOR } from "@/constants/colors";
import * as types from "@/constants/types";

export const NotePad = () => {
  let session = [];

  const baseObject = () => ({
    id: uuid4(),
    _type: null,
    value: null,
    note: null, // note id here
  });

  const createNote = ({ name = "Untitled", description = null }) => {
    const obj = {
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
    const _id = id || uuid4();
    const obj = {
      _type: types.TYPE_AUTHOR,
      first_name,
      last_name,
      email,
      website,
      twitter,
      id: _id,
    };
    session.push(obj);
    return obj;
  };

  const createTag = ({ name, color = NO_COLOR }) => {
    const obj = {
      _type: types.TYPE_TAG,
      name,
      color,
      id: uuid4(),
    };
    session.push(obj);
    return obj;
  };

  const createText = ({ value, links = {} }) => {
    const obj = {
      ...baseObject(),
      _type: types.TYPE_PARAGRAPH,
      links,
      value,
    };
    session.push(obj);
    return obj;
  };

  const createImage = ({ value, alt = "image" }) => {
    const obj = {
      ...baseObject(),
      _type: types.TYPE_IMAGE,
      alt,
      value,
    };
    session.push(obj);
    return obj;
  };

  const createList = () => {
    const obj = {
      ...baseObject(),
      _type: types.TYPE_LIST,
    };
    session.push(obj);
    return obj;
  };

  const createHeading = () => {
    const obj = {
      ...baseObject(),
      _type: types.TYPE_HEADING,
    };
    session.push(obj);
    return obj;
  };

  const createListItem = ({
    value,
    list,
    checkable = false,
    checked = false,
  }) => {
    const obj = {
      _type: types.TYPE_LIST_ITEM,
      id: uuid4(),
      value,
      list,
      checked,
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
