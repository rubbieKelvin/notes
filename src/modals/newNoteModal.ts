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

  async function createnote(ctx: { title: string }) {
    if (authstore.isAuthenticated && authstore.user && ctx.title.trim()) {
      const note = await notestore.createNote({
        title: ctx.title,
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
          placeholder: "Enter note title...",
          focus: true,
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
