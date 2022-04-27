import { APPEND_NOTES } from "@/constants/mutations";
import { v4 as uuid4 } from "uuid";
import { computed } from "vue";
import { useStore } from "vuex";

export default function () {
  const store = useStore();

  const notes = computed(() => store.state.notes);

  function $createNote({ name, description = null }) {
    store.commit(APPEND_NOTES, {
      name,
      description,
      create_at: new Date().toISOString(),
      last_edited: new Date().toISOString(),
      last_backup: null,
      content: [],
      tags: [],
      ld: uuid4(),
    });
  }

  return {
    notes,
    $createNote,
  };
}
