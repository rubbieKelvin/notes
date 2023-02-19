<template>
  <CoreDialog
    v-if="modalData"
    v-model="visible"
    :dim="modalData.dim"
    :close-on-click-outside="modalData.closeOnClickOutside"
    :escape="modalData.escape"
  >
    <div class="ed drop-shadow text-themed-text">
      <img
        v-if="modalData.coverImage"
        :src="modalData.coverImage"
        class="h-56 object-cover rounded-lg"
      />

      <Icon
        v-if="modalData.headingIcon"
        :name="modalData.headingIcon"
        class="text-themed-accent-bg w-11 h-11"
      />

      <!-- heading -->
      <div class="">
        <h1 class="font-bold text-xl">{{ modalData.heading }}</h1>
      </div>

      <!-- text content -->
      <p v-if="modalData.textContent" class="text-themed-text-subtle">
        {{ modalData.textContent }}
      </p>

      <FormContent
        v-if="modalData.formContent"
        v-model="formValues"
        :content="modalData.formContent"
      />

      <!-- footer text -->
      <p
        v-if="modalData.footerTextContent"
        class="text-themed-text-subtle text-sm"
      >
        {{ modalData.footerTextContent }}
      </p>

      <!-- footer buttons -->
      <div
        v-if="modalData.buttons"
        class="flex gap-3"
        :class="[modalData.buttons.useRowLoyout ? 'flex-row' : 'flex-col']"
      >
        <ModalButton
          v-for="(button, index) in modalData.buttons.items"
          :key="index"
          :button="button"
          :form-values="formValues"
        />
      </div>
    </div>
  </CoreDialog>
</template>

<script lang="ts">
import CoreDialog from "@/components/Dialog/index.vue";
import { ExtensibleDialog } from "@/stores/modals";
import Icon from "@/components/Icon";
import { computed, defineComponent, ref, watch } from "vue";
import ModalButton from "./ModalButton.vue";
import FormContent from "./FormContent.vue";

export default defineComponent({
  name: "ExtensibleDialog",
  components: { CoreDialog, Icon, ModalButton, FormContent },
  props: {
    modalData: {
      type: Object as () => ExtensibleDialog | null,
      default: null,
      required: true,
    },
    modelValue: { type: Boolean },
  },
  emits: ["update:model-value"],
  setup(props, ctx) {
    const formValues = ref({});
    const visible = computed({
      get() {
        return props.modelValue;
      },
      set(v: boolean) {
        ctx.emit("update:model-value", v);
      },
    });

    watch(visible, () => {
      formValues.value = {};
    });

    return { visible, formValues };
  },
});
</script>

<style lang="scss" scoped>
.drop-shadow {
  box-shadow: 0px 8px 36px rgba(0, 0, 0, 0.16);
}

.ed {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  @apply rounded-lg bg-themed-bg flex flex-col gap-4 p-6 pb-14;

  @screen md {
    position: relative;
    @apply min-w-[400px] max-w-[500px] pb-6;
  }

  :deep(.ed-button) {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-grow: 1;
    font-weight: 500;
    @apply gap-4 h-12;
    @apply text-themed-text-subtle border-themed-stroke border rounded-lg;

    &:hover {
      @apply bg-themed-hover-bg;
    }

    &:active {
      @apply bg-themed-active-bg;
    }

    &.primary {
      @apply text-themed-accent-text bg-themed-accent-bg border-0;

      &:hover {
        @apply bg-themed-accent-hover-bg;
      }

      &:active {
        @apply bg-themed-accent-active-bg;
      }
    }
  }
}
</style>
