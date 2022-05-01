import { computed } from "vue";
import { useStore } from "vuex";
import { v4 as uuid4 } from "uuid";
import { UPDATE_NOTE } from "@/constants/mutations";

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
    };

    store.commit(UPDATE_NOTE, note);
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

  return {
    notes,
    addNote,
    Note,
    getAuthorFullName,
  };
}
