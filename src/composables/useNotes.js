import { computed } from "vue";
import { useStore } from "vuex";
import { v4 as uuid4 } from "uuid";
import { DELETE_NOTE, UPDATE_NOTE } from "@/constants/mutations";
import welcomeNote from "@/templates/welcome.json";

export default function () {
  const store = useStore();
  const notes = computed(() => Object.values(store.state.notes));

  const _note = (options) => ({
    name: null,
    ld: uuid4(),
    id: null,
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
   */
  const addNote = (name) => {
    const note = _note({
      name,
    });

    store.commit(UPDATE_NOTE, note);
    return note
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
    store.commit(DELETE_NOTE, ld)
  }

  return {
    notes,
    addNote,
    Note,
    getAuthorFullName,
    createWelcomeNote,
    deleteNote
  };
}
