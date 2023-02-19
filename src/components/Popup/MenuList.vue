<template>
  <Popup
    v-model="visible"
    :escape="!navigation.history.slice(-1)[0]"
    :alignRight="alignRight"
    :yOffset="yOffset"
  >
    <template #trigger="{ open }">
      <slot name="trigger" :open="open" />
    </template>
    <div
      class="min-w-[220px] w-max bg-themed-bg pt-1 rounded-md border border-themed-stroke text-themed-text transition-all duration-150"
    >
      <!-- heading -->
      <div
        v-if="!!navigation.history.slice(-1)[0]"
        class="border-b border-themed-stroke flex items-center py-1 px-2 gap-1"
      >
        <button
          @click="navigation.history.pop()"
          class="hover:border-themed-stroke border border-transparent rounded-md hover:bg-themed-hover-bg"
        >
          <Icon name="ChevronLeftIcon" class="w-5 h-5" />
        </button>
        <p class="font-medium text-sm text-themed-text-subtle select-none">
          {{ navigation.history.slice(-1)[0].title }}
        </p>
      </div>
      <!-- menu -->
      <!-- error -->
      <div
        v-if="navigation.resolveError"
        class="py-4 px-2 flex items-center justify-center flex-col gap-1 text-gray-700"
      >
        <Icon name="ExclamationTriangleIcon" class="w-20 h-20 text-amber-300" />
        <p class="uppercase text-sm font-medium">Couldn't get items</p>
        <button
          @click="reloadMenuItems"
          class="border border-themed-stroke w-full py-1 rounded-md hover:bg-themed-hover-bg"
        >
          refresh
        </button>
      </div>
      <!-- loading -->
      <div v-else-if="navigation.resolving" class="flex items-center p-2 gap-2">
        <svg
          class="animate-spin h-4 w-4 text-blue-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <p class="text-sm">
          {{
            navigation.history.slice(-1)[0].fetchMessage ||
            "Fetching options..."
          }}
        </p>
      </div>
      <!-- list -->
      <div v-else class="max-h-[50vh] overflow-y-auto pb-1">
        <template v-for="item in current" :key="item.id">
          <template
            v-if="
              typeof item.hidden === 'function' ? !item.hidden() : !item.hidden
            "
          >
            <!-- normal -->
            <div
              v-if="
                item.type === 'NORMAL' || item.type === 'CHECKBOX' || !item.type
              "
              @click="!item.disabled && itemClicked(item)"
              class="px-3 md:px-2 py-3 md:py-1 transition-colors flex gap-1 items-center relative select-none"
              :class="{
                'hover:text-themed-hover-text hover:bg-themed-hover-bg':
                  !item.disabled,
                'text-gray-400': !!item.disabled,
              }"
              :disabled="!!item.disabled"
            >
              <!-- icon -->
              <div v-if="item.icon || item.mdiIconPath">
                <Icon v-if="item.icon" :name="item.icon" class="w-5 h-5" />
                <MdiIcon
                  v-else-if="item.mdiIconPath"
                  :path="item.mdiIconPath"
                  class="w-5 h-5"
                />
              </div>
              <div v-else-if="listHasIcon(current)" class="w-5 h-5" />
              <!-- checkbox -->
              <input
                v-if="item.type === 'CHECKBOX'"
                class="pointer-events-none"
                :checked="item.value"
                type="checkbox"
              />
              <!-- text -->
              <div class="flex-grow">
                <p style="font-size: 14px" class="">
                  {{ item.title }}
                </p>
                <p v-if="item.subtitle" class="text-xs text-gray-500">
                  {{ item.subtitle }}
                </p>
              </div>
              <!-- badge -->
              <div
                v-if="item.badgeText"
                class="text-xs font-medium border bg-white border-themed-stroke py-0.5 px-1.5 rounded-full"
              >
                {{ item.badgeText }}
              </div>
              <!-- keybindings -->
              <KeyboardShortcut
                v-if="item.keybinding"
                :sequence="item.keybinding"
              />
              <!-- chevron -->
              <Icon
                v-if="item.children"
                name="ChevronRightIcon"
                class="w-4 h-4"
              />

              <template v-if="item.link">
                <template v-if="typeof item.link === 'string'">
                  <a
                    v-if="isExternalUrl(item.link)"
                    :href="item.link"
                    target="_blank"
                    class="overlay-link"
                  />
                  <router-link v-else class="overlay-link" :to="item.link" />
                </template>
                <router-link v-else class="overlay-link" :to="item.link" />
              </template>
            </div>
            <!-- separator -->
            <div
              v-else-if="item.type === 'SEPARATOR'"
              class="w-[96%] mx-auto h-[1px] bg-stroke"
            />
            <!-- header -->
            <p
              v-if="item.type === 'HEADER'"
              class="px-2 py-1 text-xs font-bold uppercase"
            >
              {{ item.title || "Section" }}
            </p>
          </template>
        </template>
      </div>
    </div>
  </Popup>
</template>

<script lang="ts">
import { MenuItem } from "@/types";
import Icon from "@/components/Icon";
import { defineComponent, Ref, ref, watch } from "vue";
import Popup from "./index.vue";
import { onKeyDown } from "@vueuse/core";
import { v4 as uuid4 } from "uuid";
import KeyboardShortcut from "@/components/KeyboardShortcut.vue";
import MdiIcon from "../MdiIcon.vue";

export default defineComponent({
  props: {
    modelValue: Boolean,
    alignRight: Boolean,
    yOffset: Number,
    list: {
      type: Array as () => Array<MenuItem>,
      required: true,
    },
  },
  emits: ["update:model-value"],
  components: { Popup, Icon, KeyboardShortcut, MdiIcon },
  setup(props, { emit }) {
    const visible = ref(false);
    const current = ref(props.list);
    const navigation: Ref<{
      session: string;
      resolving: boolean;
      resolveError: boolean;
      history: Array<MenuItem>;
    }> = ref({
      session: uuid4(), // used to track menu sessions, incase navigation occurs before menu is resolved
      resolving: false,
      resolveError: false,
      history: [],
    });

    watch(
      () => props.list,
      () => {
        if (navigation.value.history.length === 0) current.value = props.list;
      }
    );

    watch(
      () => navigation.value.history[navigation.value.history.length - 1]?.id,
      async () => {
        navigation.value.session = uuid4();
        navigation.value.resolving = false;

        current.value = await resolveCurrentSelectionChildren();
      }
    );

    watch(visible, (val) => {
      if (val) {
        // clear history when the popup closes
        navigation.value.history = [];
        navigation.value.session = uuid4();
        navigation.value.resolveError = false;
        navigation.value.resolving = false;
      }
      emit("update:model-value", val);
    });

    watch(
      () => props.modelValue,
      () => {
        visible.value = props.modelValue;
      },
      {
        immediate: true,
      }
    );

    const reloadMenuItems = async () => {
      current.value = await resolveCurrentSelectionChildren();
    };

    const resolveCurrentSelectionChildren = async (): Promise<
      Array<MenuItem>
    > => {
      if (!navigation.value.history[navigation.value.history.length - 1])
        return props.list;

      const fetchSession = navigation.value.session;
      const item =
        navigation.value.history[navigation.value.history.length - 1];
      const children = item.children;
      if (!children) throw new Error("menu does not have children");

      navigation.value.resolveError = false;

      if (Array.isArray(children)) return children;
      if (children.constructor.name === "AsyncFunction") {
        navigation.value.resolving = true;
        try {
          const res = await children();
          navigation.value.resolving = false;

          // make sure that at the end we're returning the current item's children
          if (fetchSession === navigation.value.session) return res;

          // navigation changed, return menu for current selection
          return await resolveCurrentSelectionChildren();
        } catch {
          navigation.value.resolveError = true;
          navigation.value.resolving = false;
          return [];
        }
      } else {
        return children();
      }
    };

    onKeyDown("Escape", (e) => {
      window.requestAnimationFrame(() => {
        if (visible.value && !!navigation.value.history.slice(-1)[0]) {
          e.preventDefault();
          navigation.value.history.pop();
        }
      });
    });

    function listHasIcon(list: Array<MenuItem>) {
      return !!list.find((item) => item.icon || item.mdiIconPath);
    }

    function isExternalUrl(url: string) {
      return /^http(s?):\/\//.test(url);
    }

    function itemClicked(item: MenuItem) {
      if (item.link) return;
      if (item.children) {
        navigation.value.history.push(item);
      } else {
        if (item?.action) item.action();
        visible.value = false;
      }
    }

    return {
      listHasIcon,
      current,
      navigation,
      itemClicked,
      visible,
      reloadMenuItems,
      isExternalUrl,
    };
  },
});
</script>

<style lang="scss" scoped>
.overlay-link {
  position: absolute;
  @apply top-0 bottom-0 right-0 left-0;
}
</style>
