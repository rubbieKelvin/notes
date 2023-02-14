<template>
  <UiDialog v-model="visible" dim escape closeOnClickOutside>
    <div
      class="bg-themed-bg border border-stroke py-2 rounded-md w-screen h-screen md:h-auto md:w-auto md:min-w-[400px] flex gap-3 flex-col"
    >
      <DialogHeading
        title="New Note"
        :buttons="[
          {
            icon: 'XMarkIcon',
            action: () => {
              visible = false;
            },
          },
        ]"
      />

      <div class="px-2">
        <div
          v-for="(detail, index) in details"
          :key="index"
          class="mb-2 flex gap-3"
        >
          <Icon v-if="detail.icon" :name="detail.icon" class="w-6 h-6" />
          <div class="flex-grow">
            <h1 class="font-medium capitalize text-sm select-none">
              {{ detail.title }}
            </h1>
            <p class="text-gray-600">{{ detail.subtitle }}</p>
          </div>
          <div class="flex items-center">
            <button
              v-if="detail.button"
              class="btn px-2 p text-sm py-1"
              @click="detail.button?.action"
            >
              {{ detail.button.text }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </UiDialog>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from "vue";
import UiDialog from "@/components/Dialog/index.vue";
import useTextEditor from "@/composables/useTextEditor";
import { IconName } from "@/components/Icon/types";
import DialogHeading from "@/components/Dialog/Heading.vue";
import Icon from "@/components/Icon";
import { promiseTimeout, useClipboard, useDateFormat } from "@vueuse/core";

const boolToString = (val: boolean): string => (val ? "Yes" : "No");

export default defineComponent({
  components: { UiDialog, DialogHeading, Icon },
  props: {
    modelValue: { type: Boolean },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const { editableNote } = useTextEditor();

    const publicLink = computed(() => {
      if (!editableNote.value?.id) return "";
      const link = new URL(window.location.origin);
      link.pathname = `/public/${editableNote.value.author?.username}/note-${editableNote.value.readable_id}`;
      return link.toString();
    });

    const clipboard = useClipboard();
    const copystatus = ref({
      public: false,
    });

    const details = computed(
      ():
        | {
            title: string;
            subtitle: string;
            icon?: IconName;
            button?: { action: () => any; text: string };
          }[]
        | null =>
        editableNote.value?.id
          ? [
              {
                title: "Title",
                subtitle: editableNote.value.title,
                icon: "InformationCircleIcon",
              },
              {
                title: "Public",
                icon: "GlobeEuropeAfricaIcon",
                subtitle: boolToString(editableNote.value.is_public),
                button: editableNote.value.is_public
                  ? {
                      text: copystatus.value.public
                        ? "Copied"
                        : "Copy public link",
                      action: async () => {
                        if (copystatus.value.public) return;
                        if (clipboard.isSupported) {
                          clipboard.copy(publicLink.value);
                          copystatus.value.public = true;
                          await promiseTimeout(2000);
                          copystatus.value.public = false;
                        } else {
                          // TODO: use toast when implemented
                          alert("Browser doesnt support");
                        }
                      },
                    }
                  : undefined,
              },
              {
                title: "Starred",
                icon: "StarIcon",
                subtitle: boolToString(editableNote.value.is_starred),
              },
              {
                title: "Date created",
                icon: "CalendarDaysIcon",
                subtitle: useDateFormat(
                  editableNote.value.date_created,
                  "YYYY-MM-DD HH:mm"
                ).value,
              },
              {
                title: "Last updated",
                icon: "ClockIcon",
                subtitle: useDateFormat(
                  editableNote.value.last_updated,
                  "YYYY-MM-DD HH:mm"
                ).value,
              },
            ]
          : null
    );

    const visible = computed({
      get() {
        return props.modelValue;
      },
      set(val) {
        emit("update:modelValue", val);
      },
    });

    return { visible, details };
  },
});
</script>
