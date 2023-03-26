import { ToastData, ToastDataUpdate } from "@/types";
import { defineStore } from "pinia";

interface State {
  toasts: ToastData[];
}

export const useToast = defineStore("toast", {
  state: (): State => ({
    toasts: [],
  }),
  actions: {
    updateToast(
      id: string | number | symbol,
      updates: Partial<ToastDataUpdate>
    ) {
      const index = this.toasts.findIndex((t) => t.id === id);
      if (index !== -1) {
        const toast = { ...this.toasts[index], ...updates, id };
        this.toasts[index] = toast;
      }
    },
    removeToast(id: string | number | symbol) {
      const index = this.toasts.findIndex((t) => t.id === t.id);
      if (index !== -1) {
        this.toasts.splice(index, 1);
      }
    },
    success(options: { message: string; title?: string }): ToastData {
      const title = options.title ?? "Success";
      const toast: ToastData = {
        id: Symbol(),
        title,
        desciption: options.message,
        timeout: 3000,
        icon: "InformationCircleIcon",
      };
      this.toasts.push(toast);
      return toast;
    },
    warning(options: { message: string; title?: string }): ToastData {
      const title = options.title ?? "Warning";
      const toast: ToastData = {
        id: Symbol(),
        title,
        desciption: options.message,
        timeout: 3000,
        icon: "ExclamationCircleIcon",
      };
      this.toasts.push(toast);
      return toast;
    },
    error(options: { message: string; title?: string }): ToastData {
      const title = options.title ?? "Error";
      const toast: ToastData = {
        id: Symbol(),
        title,
        desciption: options.message,
        timeout: 5000,
        icon: "ExclamationTriangleIcon",
        colorClasses: {
          bg: "bg-red-500",
          fg: "text-white",
        },
      };
      this.toasts.push(toast);
      return toast;
    },
    async promise<T = any>(
      id: symbol,
      options: {
        action: () => Promise<T>;
        onError?: (e: any) => any;
        title:
          | { loading: string; error: string; success: string }
          | (() => { loading: string; error: string; success: string });
        messages:
          | { loading: string; error: string; success: string }
          | (() => { loading: string; error: string; success: string });
      }
    ): Promise<T | undefined> {
      const toast: ToastData = {
        id,
        title:
          typeof options.title === "function"
            ? options.title().loading
            : options.title.loading,
        desciption:
          typeof options.messages === "function"
            ? options.messages().loading
            : options.messages.loading,
        timeout: false,
      };

      this.toasts.push(toast);
      try {
        const res = await options.action();
        this.updateToast(toast.id, {
          title:
            typeof options.title === "function"
              ? options.title().success
              : options.title.success,
          desciption:
            typeof options.messages === "function"
              ? options.messages().success
              : options.messages.success,
          timeout: 5000,
          icon: "InformationCircleIcon",
        });

        return res;
      } catch (e) {
        this.updateToast(toast.id, {
          title:
            typeof options.title === "function"
              ? options.title().error
              : options.title.error,
          desciption:
            typeof options.messages === "function"
              ? options.messages().error
              : options.messages.error,
          timeout: 5000,
          icon: "ExclamationTriangleIcon",
          colorClasses: {
            bg: "bg-red-500",
            fg: "text-white",
          },
        });
        if (options.onError) options.onError(e);
        else throw e;
      }
    },
  },
});
