<template>
  <div class="">
    <div
      v-for="(detail, index) in details"
      :key="index"
      class="mb-2 flex gap-3 w-full"
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
          class="btn p-2 p text-sm flex item-center justify-center gap-2"
          @click="detail.button?.action"
        >
          <Icon
            v-if="detail.button.icon"
            :name="detail.button.icon"
            class="w-5 h-5"
          />
          <span v-if="detail.button.text">
            {{ detail.button.text }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Note } from "@/types/models";
import { promiseTimeout, useClipboard, useDateFormat } from "@vueuse/core";
import { computed, defineComponent, ref } from "vue";
import { IconName } from "./Icon/types";
import { boolToString } from "@/utils/helpers";
import Icon from "./Icon";

export default defineComponent({
  components: { Icon },
  props: { note: { type: Object as () => Note, required: true } },
  setup(props) {
    const publicLink = computed(() => {
      if (!props.note?.id) return "";
      const link = new URL(window.location.origin);
      link.pathname = `/public/${props.note.author?.username}/note-${props.note.readable_id}`;
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
            button?: { action: () => any; text?: string; icon?: IconName };
          }[]
        | null =>
        props.note?.id
          ? [
              {
                title: "Title",
                subtitle: props.note.title,
                icon: "InformationCircleIcon",
              },
              {
                title: "Public",
                icon: "GlobeEuropeAfricaIcon",
                subtitle: boolToString(props.note.is_public),
                button: props.note.is_public
                  ? {
                      text: copystatus.value.public ? "Copied" : undefined,
                      icon: "LinkIcon",
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
                subtitle: boolToString(props.note.is_starred),
              },
              {
                title: "Date created",
                icon: "CalendarDaysIcon",
                subtitle: useDateFormat(
                  props.note.date_created,
                  "YYYY-MM-DD HH:mm"
                ).value,
              },
              {
                title: "Last updated",
                icon: "ClockIcon",
                subtitle: useDateFormat(
                  props.note.last_updated,
                  "YYYY-MM-DD HH:mm"
                ).value,
              },
            ]
          : null
    );

    return { details };
  },
});
</script>
