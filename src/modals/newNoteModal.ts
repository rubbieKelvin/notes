import { noteRoute } from "@/composables/useNavigation";
import { useAuthStore } from "@/stores/auth";
import { useModalStore } from "@/stores/modals";
import { useNotesStore } from "@/stores/notes";
import { Router } from "vue-router";

export const createNewNoteModal = (router: Router) => {
  const sessionID = Symbol();
  const modalstore = useModalStore();
  const authstore = useAuthStore();
  const notestore = useNotesStore();

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
        },
      },
    ],
    buttons: {
      useRowLoyout: true,
      items: [
        {
          text: "Close",
          action: () => {
            modalstore.closeExtensibleModal(sessionID);
          },
        },
        {
          text: "Create",
          isPrimary: true,
          async action(ctx) {
            if (
              authstore.isAuthenticated &&
              authstore.user &&
              ctx.title.trim()
            ) {
              const note = await notestore.createNote({
                title: ctx.title,
                author: authstore.user.id,
              });
              if (note) {
                modalstore.closeExtensibleModal(sessionID);
                router.push(noteRoute(note));
              }
            }
          },
        },
      ],
    },
  });
};
