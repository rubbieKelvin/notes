import { useAuthStore } from "@/stores/auth";
import { ButtonData, useModalStore } from "@/stores/modals";
import { usePublicSignalStore } from "@/stores/publicsignals";
import { useTagStore } from "@/stores/tag";
import { v4 as uuid4 } from "uuid";
import { Router } from "vue-router";

export const createNewTagModal = (router?: Router) => {
  const sessionID = Symbol();
  const modalstore = useModalStore();
  const authstore = useAuthStore();
  const tagstore = useTagStore();
  const publicsignalstore = usePublicSignalStore();

  async function createTag(ctx: { title: string }) {
    if (authstore.isAuthenticated && authstore.user && ctx.title.trim()) {
      const tag = await tagstore.createTag({
        title: ctx.title,
        author: authstore.user.id,
      });
      if (tag) {
        modalstore.closeExtensibleModal(sessionID);
        // router.push(noteRoute(tag));
      }
    }
  }

  const createButton: ButtonData = {
    id: uuid4(),
    text: "Create",
    isPrimary: true,
    action: createTag,
  };

  modalstore.openExtensibleModal(sessionID, {
    heading: "New tag",
    dim: true,
    formContent: [
      {
        type: "textinput",
        id: "title",
        textinput: {
          placeholder: "Enter tag title...",
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
              await createTag({ title });
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
