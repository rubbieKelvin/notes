import { computed } from "vue";
import { useStore } from "vuex";
import {
  createImage,
  createNote,
  createText,
  TYPE_NOTE,
} from "@/constants/datamodel";
import { ADD_ITEM } from "@/constants/mutations";

export default function () {
  const store = useStore();
  const kvdb = computed(() => store.state.kvdb);

  const notes = computed(() =>
    Object.values(kvdb.value).filter((obj) => obj._type === TYPE_NOTE)
  );

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

    store.commit(ADD_ITEM, note);
    store.commit(ADD_ITEM, text);
    store.commit(ADD_ITEM, img);
  };

  return { notes, _buildWelcomeDocument };
}
