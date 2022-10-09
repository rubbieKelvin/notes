<template>
  <Dialog v-model="visible">
    <div
      class="bg-white border border-stroke py-2 rounded-md min-w-[400px] flex gap-3 flex-col"
    >
      <div class="pb-2 px-3 border-b border-stroke flex">
        <p class="flex-grow">New note</p>
        <button class="btn p-1" @click="visible = false">
          <Icon name="XMarkIcon" class="w-5 h-5" />
        </button>
      </div>
      <div class="px-3 flex flex-col gap-2">
        <div class="form-input-wrapper">
          <label class="text-input-label">title</label>
          <input
            class="text-input"
            type="text"
            placeholder="Title"
            ref="noteTitleRef"
            autofocus
          />
        </div>
        <div class="flex justify-end">
          <button class="btn px-4 py-2">Create</button>
        </div>
      </div>
    </div>
  </Dialog>
</template>

<script lang="ts">
import { computed, defineComponent, Ref, ref, watch } from "vue";
import Dialog from "./index.vue";
import Icon from "@/components/Icon";
import { useFocus } from "@vueuse/core";

export default defineComponent({
  components: { Dialog, Icon },
  props: {
    modelValue: Boolean,
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const noteTitleRef: Ref<HTMLInputElement | null> = ref(null);
    const visible = computed({
      get() {
        return props.modelValue;
      },
      set(val) {
        emit("update:modelValue", val);
      },
    });

    const { focused: noteTitleFocus } = useFocus(noteTitleRef, {
      initialValue: true,
    });

    watch(visible, () => {
      if (visible.value) {
        noteTitleFocus.value = true;
      }
    });
    return { visible, noteTitleRef };
  },
});
</script>
