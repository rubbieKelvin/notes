<template>
  <div
    class="text-themed-text overflow-clip rounded-md border border-themed-stroke select-none"
    :class="toast.colorClasses?.bg || ' bg-themed-bg-elevated'"
  >
    <!-- content -->
    <div class="flex items-center gap-4 py-2 px-4 min-w-[350px]">
      <Loading v-if="toast.timeout === false" class="w-6 h-6" />
      <Icon
        v-else-if="toast.icon"
        :name="toast.icon"
        class="w-6 h-6"
        :class="toast.colorClasses?.fg || ''"
      />

      <div
        class="flex flex-grow flex-col min-w-[120px]"
        :class="toast.colorClasses?.fg || ''"
      >
        <p class="">{{ toast.title }}</p>
        <p class="text-sm opacity-70">{{ toast.desciption }}</p>
      </div>

      <div class="flex gap-1">
        <button
          v-for="(action, aindex) in toast.actions"
          :key="aindex"
          @click="action.action"
          class="text-sm bg-gray-800 px-3 py-2 rounded-md hover:bg-gray-900 text-gray-200 hover:text-white"
        >
          {{ action.title }}
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Icon from "../Icon";
import { ToastData } from "@/types";
import { defineComponent, onMounted, watch } from "vue";
import { promiseTimeout } from "@vueuse/core";
import { useToast } from "@/stores/toasts";
import Loading from "../Loading.vue";

export default defineComponent({
  components: { Icon, Loading },
  props: {
    toast: { type: Object as () => ToastData, required: true },
  },
  setup(props) {
    const toaststore = useToast();
    const timeout = props.toast.timeout ?? 1000;

    onMounted(() => {
      if (timeout) {
        promiseTimeout(timeout).then(() => {
          toaststore.removeToast(props.toast.id);
        });
      }
    });

    watch(
      () => props.toast.timeout,
      (tout, oldtout) => {
        // only create a new timeout if the timeout was proviously false
        if (tout && oldtout === false) {
          promiseTimeout(tout).then(() => {
            toaststore.removeToast(props.toast.id);
          });
        }
      }
    );
  },
});
</script>
