<template>
  <UiDialog v-model="visible" dim escape closeOnClickOutside>
    <div
      class="bg-themed-bg border border-themed-stroke py-2 rounded-md w-screen h-screen md:h-auto md:w-auto md:min-w-[400px] flex gap-3 flex-col"
    >
      <DialogHeading
        title="Details"
        :buttons="[
          {
            icon: 'XMarkIcon',
            action: () => {
              visible = false;
            },
          },
        ]"
      />
      <NoteDetails class="px-2" :note="editableNote" />
    </div>
  </UiDialog>
</template>

<script lang="ts">
import { computed, defineComponent } from "vue";
import UiDialog from "@/components/Dialog/index.vue";
import useTextEditor from "@/composables/useTextEditor";
import DialogHeading from "@/components/Dialog/Heading.vue";
import Icon from "@/components/Icon";
import NoteDetails from "@/components/NoteDetails.vue";

export default defineComponent({
  components: { UiDialog, DialogHeading, Icon, NoteDetails },
  props: {
    modelValue: { type: Boolean },
  },
  emits: ["update:model-value"],
  setup(props, { emit }) {
    const { editableNote } = useTextEditor();

    const visible = computed({
      get() {
        return props.modelValue;
      },
      set(val) {
        emit("update:model-value", val);
      },
    });

    return { visible, editableNote };
  },
});
</script>
