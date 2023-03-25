<template>
  <div class="">
    <template v-for="(detail, index) in details" :key="index">
      <div
        v-if="!detail.hidden"
        class="mb-2 flex gap-3 w-full text-themed-text"
      >
        <Icon v-if="detail.icon" :name="detail.icon" class="w-6 h-6" />
        <div class="flex-grow">
          <h1 class="font-medium capitalize text-sm select-none">
            {{ detail.title }}
          </h1>
          <p class="text-themed-text-subtle">{{ detail.subtitle }}</p>
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
    </template>
  </div>
</template>

<script lang="ts">
import { Note } from "@/types/models";
import { promiseTimeout, useClipboard, useDateFormat } from "@vueuse/core";
import { computed, defineComponent, ref } from "vue";
import { IconName } from "./Icon/types";
import { boolToString } from "@/utils/helpers";
import Icon from "./Icon";
import { useAuthStore } from "@/stores/auth";
import { noteRoute } from "@/composables/useNavigation";
import { useRoute, useRouter } from "vue-router";

export default defineComponent({
  components: { Icon },
  props: { note: { type: Object as () => Note, required: true } },
  setup(props) {
    const router = useRouter();
    const publicLink = computed(() => {
      if (!props.note?.id) return "";
      const link = new URL(window.location.origin);
      link.pathname = router.resolve(
        noteRoute(props.note, "PublicNote", {
          username: props.note.author.username,
        })
      ).href;
      return link.toString();
    });

    const authstore = useAuthStore();
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
            hidden?: boolean;
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
                title: "Author",
                subtitle: props.note.author.username,
                icon: "UserIcon",
                hidden: authstore.user?.username === props.note.author.username,
              },
              {
                title: "Public",
                icon: "GlobeEuropeAfricaIcon",
                hidden: !authstore.isAuthenticated,
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
                hidden: !authstore.isAuthenticated,
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
