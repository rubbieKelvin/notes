import { computed } from "vue";
import { useStore } from "vuex";
import { TYPE_AUTHOR, TYPE_LIST_ITEM, TYPE_NOTE } from "@/constants/types";

const _obj_in_obj2 = (obj1, obj2) => {
  const e = Object.keys(obj1);

  for (let i = 0; i < e.length; i += 1) {
    const key = e[i];
    if (obj1[key] !== obj2[key]) return false;
  }

  return true;
};

export default function () {
  const store = useStore();
  const kvdb = computed(() => store.state.kvdb);

  const _getKind = (key, value) =>
    Object.values(kvdb.value).filter((obj) => obj[key] === value);

  const getDBItems = (options) =>
    Object.values(kvdb.value).filter((obj) => _obj_in_obj2(options, obj));

  const notes = computed(() => _getKind("_type", TYPE_NOTE));
  const authors = computed(() => _getKind("_type", TYPE_AUTHOR));

  const getNote = (ld) => notes.value.filter((note) => note.ld === ld)[0];

  const getNoteAuthor = (note) =>
    authors.value.filter((author) => note.author == author.ld)[0];

  const getNoteContent = (note) => _getKind("note", note.ld);

  const getListContent = (list) =>
    _getKind("_type", TYPE_LIST_ITEM).filter((item) => item.list === list.ld);

  return {
    notes,
    getNote,
    getDBItems,
    getNoteAuthor,
    getNoteContent,
    getListContent,
  };
}
