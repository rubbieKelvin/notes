import { Ctx } from "@/plugins/provider";
import { ToastData } from "@/types";
import { computed, inject, Ref } from "vue";

export const useToasts = () => {
  const ctx = inject("ctx") as Ref<Ctx>;
  const toasts = computed({
    get: () => ctx.value.toasts,
    set: (v) => (ctx.value.toasts = v),
  });

  function addToast(toast: ToastData) {
    toasts.value.push(toast);

    const meta = {
      progress: 0,
      timerId: -1,
    };

    toast.meta = meta;

    const timeout = Number(toast.timeout ?? 0);
    const start = new Date().getTime();

    if (timeout) {
      meta.timerId = setInterval(() => {
        const now = new Date().getTime();
        meta.progress = ((now - start) / timeout) * 100;

        if (now - start > timeout) {
          removeToast(toast.id);
        }
      }, 50);
    }
  }

  function removeToast(id: symbol | number | string) {
    const toast = toasts.value.find((t) => t.id === id);
    if (toast) {
      if (toast?.meta?.timerId) {
        clearInterval(toast.meta.timerId);
      }
      toasts.value = toasts.value.filter((toast) => toast.id !== id);
    }
  }

  return { toasts, addToast, removeToast };
};
