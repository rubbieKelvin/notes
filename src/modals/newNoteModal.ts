import { noteRoute } from "@/composables/useNavigation";
import { useAuthStore } from "@/stores/auth";
import { ButtonData, useModalStore } from "@/stores/modals";
import { useNotesStore } from "@/stores/notes";
import { usePublicSignalStore } from "@/stores/publicsignals";
import { v4 as uuid4 } from "uuid";
import { Router } from "vue-router";

export const createNewNoteModal = (router: Router) => {
  const sessionID = Symbol();
  const modalstore = useModalStore();
  const authstore = useAuthStore();
  const notestore = useNotesStore();
  const publicsignalstore = usePublicSignalStore();

  const validateInput = (text: string): { message: string; valid: boolean } => {
    if (text.startsWith("/"))
      return { message: "Dont start text with '/'", valid: false };
    if (text.endsWith("/"))
      return { message: "Dont end text with '/'", valid: false };
    if (text.split("/").length > 2)
      return { message: "Dont use more than 2 '/'", valid: false };
    return { message: "", valid: true };
  };

  async function createnote(ctx: { title: string }) {
    if (
      authstore.isAuthenticated &&
      authstore.user &&
      ctx.title.trim() &&
      validateInput(ctx.title).valid
    ) {
      let title = ctx.title.trim();

      if (title.includes("/")) {
        const [path, name] = title.split("/");
        title = `${path.trim()}/${name.trim()}`;
      }

      console.log({ title });
      const note = await notestore.createNote({
        title,
        author: authstore.user.id,
      });
      if (note) {
        modalstore.closeExtensibleModal(sessionID);
        router.push(noteRoute(note));
      }
    }
  }

  const createButton: ButtonData = {
    id: uuid4(),
    text: "Create",
    isPrimary: true,
    action: createnote,
  };

  modalstore.openExtensibleModal(sessionID, {
    heading: "New Note",
    dim: true,
    formContent: [
      {
        type: "textinput",
        id: "title",
        textinput: {
          label: "Title",
          placeholder: "Enter note title...",
          focus: true,
          validateInput,
          keydownReturn: async (title) => {
            try {
              publicsignalstore.fire({
                id: createButton.id,
                payload: {
                  variable: "loading",
                  value: true,
                },
              });
              await createnote({ title });
            } catch {
              publicsignalstore.fire({
                id: createButton.id,
                payload: {
                  variable: "error",
                  value: true,
                },
              });
            }
            publicsignalstore.fire({
              id: createButton.id,
              payload: {
                variable: "loading",
                value: false,
              },
            });
          },
        },
      },
    ],
    buttons: {
      useRowLoyout: true,
      items: [
        {
          id: uuid4(),
          text: "Close",
          action: () => {
            modalstore.closeExtensibleModal(sessionID);
          },
        },
        createButton,
      ],
    },
  });
};
