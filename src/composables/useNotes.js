import { APPEND_NOTES } from "@/constants/mutations";
import { v4 as uuid4 } from "uuid";
import { computed } from "vue";
import { useStore } from "vuex";
import slug from "slug";

// templates
import note_template from "@/templates/note.json";
import text_template from "@/templates/text.json";
import author_template from "@/templates/author.json";

export const Note = (_note) => {
  const _wrapper = {
    __type__: "Note",
    value: { ...note_template, ...(_note || {}) },
    update,
    addText,
    updateAuthor,
  };

  // add some updates
  updateAuthor();

  function update(options) {
    _wrapper.value = { ..._wrapper.value, ...options };
  }

  function addText(options) {
    _wrapper.value.content?.append({ ...text_template, ...options });
  }

  function updateAuthor(author) {
    author = author || {};
    _wrapper.value.author = {
      ...author_template,
      ...author,
    };
  }

  return _wrapper;
};

export const _buildWelcomeDocument = () => {
  const note = Note({
    ld: uuid4(),
    id: "_",
    slug: "welcome-to-notes-by-rubbie",
    name: "🥳 Welcome to Notes",
    description: "With love from rubbie",
    created_at: new Date().toISOString(),
    last_edited: new Date().toISOString()
  });

  note.updateAuthor({
    id: "_",
    first_name: "rubbie",
    last_name: "kelvin",
    email: "dev.rubbie@gmail.com",
  });

  return note;
};

export default function () {
  const store = useStore();

  const notes = computed(() => store.state.notes);

  const makeSlug = (text) => {
    const same_name_count = notes.value.filter(
      (_) => _.name.trim() === text
    ).length;
    const _slug = slug(text, {
      replacement: "-",
      lower: true,
      trim: true,
    });

    if (same_name_count > 0) return _slug + `-${same_name_count}`;
    return _slug;
  };

  const $createNote = ({ name, description = null }) => {
    // create a new note
    const note = Note({
      name,
      slug: makeSlug(name),
      description,
      created_at: new Date().toISOString(),
      last_edited: new Date().toISOString(),
      ld: uuid4(),
    });

    store.commit(APPEND_NOTES, note.value);
  };

  /**
   * Add a note object to note list
   * @param {Note} note
   */
  const $addNote = (note) => {
    store.commit(APPEND_NOTES, note.value);
  };

  const $getAuthor = (note) => {
    const author = note?.author;

    return {
      ...author,
      fullname:
        author?.id === "local"
          ? "Me"
          : `${author?.first_name} ${author?.last_name}`,
    };
  };

  const $getNoteBySlug = (slug) =>
    notes.value.filter((note) => note.slug === slug)[0];

  return {
    notes,
    $createNote,
    $getNoteBySlug,
    $getAuthor,
    $addNote,
  };
}
