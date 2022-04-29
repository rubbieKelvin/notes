import { computed } from "vue";
import { useStore } from "vuex";
import {
  createAuthor,
  createImage,
  createNote,
  createText,
  TYPE_AUTHOR,
  TYPE_NOTE,
} from "@/constants/datamodel";
import { ADD_ITEM } from "@/constants/mutations";

export default function () {
  const store = useStore();
  const kvdb = computed(() => store.state.kvdb);

  const _getKind = (key, value) =>
    Object.values(kvdb.value).filter((obj) => obj[key] === value);

  const notes = computed(() => _getKind("_type", TYPE_NOTE));
  const authors = computed(() => _getKind("_type", TYPE_AUTHOR));

  const getNote = (ld) => notes.value.filter((note) => note.ld === ld)[0];

  const getNoteAuthor = (note) =>
    authors.value.filter((author) => note.author == author.id)[0];

  const getNoteContent = (note) => _getKind("note", note.ld);
  const _buildWelcomeDocument = () => {
    const note = createNote({
      name: "🥳 Welcome to Notes",
      description: "With love from rubbie",
    });
    note.ld = "welcome";

    const text = createText({
      value:
        "Hello World, i'm rubbie kelvin. I'm a UI/UX Designer and Software developer, i easily adapt to any tech i get my hands on. Super hyped when working impossible tasks and solving complex problems.",
      links: {
        "rubbie kelvin": "https://rubbiekelvin.netlify.app/",
      },
    });
    text.note = note.ld;

    const img = createImage({
      value:
        "https://images.unsplash.com/photo-1618828665011-0abd973f7bb8?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxzZWFyY2h8MXx8bGFnb3N8ZW58MHx8MHx8&auto=format&fit=crop&w=900&q=60",
      alt: "Image of Lagos",
    });
    img.note = note.ld;

    const author = createAuthor({
      id: "rubbie",
      first_name: "rubbie",
      last_name: "kelvin",
      website: "rubbiekelvin.netlify.app",
      twitter: "kelvinrubbie",
      email: "dev.rubbie@gmail.com",
    });
    note.author = author.id;

    store.commit(ADD_ITEM, note);
    store.commit(ADD_ITEM, text);
    store.commit(ADD_ITEM, img);
    store.commit(ADD_ITEM, author);
  };

  return {
    notes,
    _buildWelcomeDocument,
    getNote,
    getNoteAuthor,
    getNoteContent,
  };
}
