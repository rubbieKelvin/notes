import { ToastData } from "@/types";
import { inject, Ref } from "vue";

export const useToasts = () => {
  const toasts = inject("toasts") as Ref<ToastData[]>;

  function addToast(toast: ToastData) {
    toasts.value.push(toast);

    const meta = {
      progress: 0,
    };

    toast.meta = meta;

    const timeout = Number(toast.timeout ?? 0);
    const start = new Date().getTime();

    if (timeout) {
      const timeout_timer = setInterval(() => {
        const now = new Date().getTime();
        meta.progress = ((now - start) / timeout) * 100;

        if (now - start > timeout) {
          removeToast(toast.id);
          clearInterval(timeout_timer);
        }
      }, 50);
    }
  }

  function removeToast(id: symbol | number | string) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
  }

  return { toasts, addToast, removeToast };
};
