import { computed } from "vue";
import { useStore } from "vuex";
import { v4 as uuid4 } from "uuid";
import { DELETE_NOTE, UPDATE_NOTE } from "@/constants/mutations";
import welcomeNote from "@/templates/welcome.json";
import { FIXED_FOLDERS } from "@/constants/note";
import { OPTIONS as SORTING_OPTIONS } from "@/constants/sorting";

const _menu = ({
  name,
  enabled = false,
  noteTypeKey = FIXED_FOLDERS.CLASSIC_NOTE,
  disabledMessage = "This Feature is not implemented yet",
}) => ({ name, enabled, disabledMessage, noteTypeKey });

export default function () {
  const store = useStore();
  const notes = computed(() => Object.values(store.state.notes));

  const _note = (options) => ({
    name: null,
    ld: uuid4(),
    id: null,
    folder: FIXED_FOLDERS.CLASSIC_NOTE,
    _type: "note",
    version: "0.0.0",
    created_at: new Date().toISOString(),
    last_edited: new Date().toISOString(),
    last_backup: null,
    body: {
      type: "doc",
      content: [],
    },
    author: {
      // TODO: if cloud backup is added, update this to recieve auth data
      id: "local",
      first_name: null,
      last_name: null,
      email: null,
    },
    ...options,
  });

  /**
   *
   * @param {String} name
   * @param {String} note_type
   */
  const addNote = (name, folder) => {
    const note = _note({
      name,
      folder: folder || FIXED_FOLDERS.CLASSIC_NOTE,
    });

    store.commit(UPDATE_NOTE, note);
    return note;
  };

  const Note = (ld) => {
    const get = () => notes.value.filter((note) => note.ld === ld)[0];

    return computed({
      get,
      set: (update) => {
        const newNote = {
          ...get(),
          ...update,
          last_edited: new Date().toISOString(),
        };

        store.commit(UPDATE_NOTE, newNote);
      },
    });
  };

  const getAuthorFullName = (author) => {
    if (!author) return null;
    return author.id === "local" ? "Me" : author.first_name + author.last_name;
  };

  const createWelcomeNote = (store) => {
    const _raw = _note({
      name: "Your very first Note 🥳",
      body: welcomeNote,
    });
    _raw.author = {
      ..._raw.author,
      id: "app_author",
      first_name: "rubbie",
      last_name: "kelvin",
      email: "dev.rubbie@gmail.com",
    };
    store.commit(UPDATE_NOTE, _raw);
  };

  const deleteNote = (ld) => {
    store.commit(DELETE_NOTE, ld);
  };

  const noteFolders = computed(() => [
    _menu({ name: "Classic", enabled: true }),
    _menu({
      name: "Important",
      noteTypeKey: FIXED_FOLDERS.IMPORTANT_NOTE,
      enabled: true,
    }),
  ]);

  const sort = () => ({
    [SORTING_OPTIONS.DEFAULT]: (list) => list,
    [SORTING_OPTIONS.ALPHABETICAL]: (list) =>
      list.sort((n1, n2) => n1.name.localeCompare(n2.name)),
    [SORTING_OPTIONS.DATE_CREATED]: (list) =>
      list.sort(
        (n1, n2) => Date.parse(n2.created_at) - Date.parse(n1.created_at)
      ),
    [SORTING_OPTIONS.DATE_EDITED]: (list) =>
      list.sort(
        (n1, n2) => Date.parse(n2.last_edited) - Date.parse(n1.last_edited)
      ),
  });

  const uploadNote = (note) => {
    const newNote = _note(note)
    newNote.ld = uuid4()
    newNote.last_edited = new Date().toISOString()
    console.log(newNote)
    store.commit(UPDATE_NOTE, newNote);
    return newNote;
  }

  return {
    notes,
    addNote,
    Note,
    sort,
    getAuthorFullName,
    createWelcomeNote,
    deleteNote,
    noteFolders,
    uploadNote
  };
}
