import { computed } from "vue";
import { useStore } from "vuex";
import { v4 as uuid4 } from "uuid";
import { UPDATE_NOTE } from "@/constants/mutations";

// const _obj_in_obj2 = (obj1, obj2) => {
//   const e = Object.keys(obj1);

//   for (let i = 0; i < e.length; i += 1) {
//     const key = e[i];
//     if (obj1[key] !== obj2[key]) return false;
//   }

//   return true;
// };

export default function () {
  const store = useStore();
  const notes = computed(() => Object.values(store.state.notes));

  /**
   *
   * @param {String} name
   */
  const addNote = (name) => {
    const note = {
      name,
      ld: uuid4(),
      id: null,
      version: "0.0.0",
      created_at: new Date().toISOString(),
      last_edited: new Date().toISOString(),
      last_backup: null,
      content: null,
      author: {
        // TODO: if cloud backup is added, update this to recieve auth data
        id: "local",
        first_name: null,
        last_name: null,
        email: null,
      },
    };

    store.commit(UPDATE_NOTE, note);
  };

  const getNote = (ld) => {
    return computed(() => notes.value.filter((note) => note.ld === ld));
  };

  return {
    notes,
    addNote,
    getNote
  }
  // const kvdb = computed(() => store.state.kvdb);

  // const _getKind = (key, value) =>
  //   Object.values(kvdb.value).filter((obj) => obj[key] === value);

  // const getDBItems = (options) =>
  //   Object.values(kvdb.value).filter((obj) => _obj_in_obj2(options, obj));

  // const notes = computed(() => _getKind("_type", TYPE_NOTE));
  // const authors = computed(() => _getKind("_type", TYPE_AUTHOR));

  // const getNote = (ld) => notes.value.filter((note) => note.ld === ld)[0];

  // const getNoteAuthor = (note) =>
  //   authors.value.filter((author) => note.author == author.ld)[0];

  // const getNoteContent = (note) => _getKind("note", note.ld);

  // const getListContent = (list) =>
  //   _getKind("_type", TYPE_LIST_ITEM).filter((item) => item.list === list.ld);

  // return {
  //   notes,
  //   getNote,
  //   getDBItems,
  //   getNoteAuthor,
  //   getNoteContent,
  //   getListContent,
  // };
}
