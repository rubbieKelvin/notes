import { computed } from "vue";
import { useStore } from "vuex";
import { TYPE_AUTHOR, TYPE_NOTE } from "@/constants/types";

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

  return {
    notes,
    getNote,
    getNoteAuthor,
    getNoteContent,
  };
}
