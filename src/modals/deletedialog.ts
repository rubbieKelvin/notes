import { useModalStore } from "@/stores/modals";
import { v4 as uuid4 } from "uuid";

export const openDeleteDialog = (options: {
  action: () => any;
  resourceType: string;
}) => {
  const sessionID = Symbol();
  const modalstore = useModalStore();

  modalstore.openExtensibleModal(sessionID, {
    headingIcon: "TrashIcon",
    heading: `Delete ${options.resourceType}?`,
    textContent: "This action cannot be undone",
    dim: true,
    escape: true,
    closeOnClickOutside: true,
    buttons: {
      useRowLoyout: true,
      items: [
        {
          id: uuid4(),
          text: "Cancel",
          action: () => {
            modalstore.closeExtensibleModal(sessionID);
          },
        },
        {
          id: uuid4(),
          text: "Delete",
          isPrimary: true,
          action: async () => {
            await options.action();
            modalstore.closeExtensibleModal(sessionID);
          },
        },
      ],
    },
  });
};
