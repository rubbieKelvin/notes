<template>
  <UiDialog v-model="visible" dim escape closeOnClickOutside>
    <div
      class="bg-themed-bg border border-themed-stroke py-2 rounded-md w-screen h-screen md:h-auto md:w-auto md:min-w-[400px] flex gap-3 flex-col"
    >
      <div class="w-full h-full flex flex-col p-5 gap-4">
        <h1 class="font-medium text-2xl">Select {{ resourceType }}</h1>
        <input
          type="text"
          class="outline-none focus:outline-none p-2 text-lg border border-themed-stroke bg-themed-bg-elevated rounded-lg"
          :placeholder="`Search ${resourceType}...`"
        />
      </div>
    </div>
  </UiDialog>
</template>

<script lang="ts">
import { computed, defineComponent } from "vue";
import UiDialog from "@/components/Dialog/index.vue";

export default defineComponent({
  components: { UiDialog },
  props: {
    resourceType: { type: String, default: "" },
    modelValue: { type: Boolean },
  },
  emits: ["update:model-value"],
  setup(props, { emit }) {
    const visible = computed({
      get() {
        return props.modelValue;
      },
      set(val) {
        emit("update:model-value", val);
      },
    });

    return { visible };
  },
});
</script>
