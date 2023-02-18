import { useModalStore } from "@/stores/modals";

export const createAlertDialog = (options: {
  title: string;
  type: "error" | "info";
  subtitle: string;
}) => {
  const id = Symbol();
  const modalstore = useModalStore();

  modalstore.openExtensibleModal(id, {
    headingIcon:
      options.type === "info"
        ? "InformationCircleIcon"
        : options.type === "error"
        ? "ExclamationCircleIcon"
        : undefined,
    heading: options.title,
    textContent: options.subtitle,
    dim: true,
    closeOnClickOutside: true,
    escape: true,
  });

  return id;
};
