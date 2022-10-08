<template>
  <Popup
    v-model="visible"
    :escape="!navigation.history.slice(-1)[0]"
    :alignRight="alignRight"
  >
    <template #trigger="{ open }">
      <slot name="trigger" :open="open" />
    </template>
    <div
      class="min-w-[220px] w-max bg-white pt-1 rounded-md border border-stroke transition-all duration-150"
    >
      <!-- heading -->
      <div
        v-if="!!navigation.history.slice(-1)[0]"
        class="border-b border-stroke flex items-center pb-1 px-2 gap-1"
      >
        <button
          @click="navigation.history.pop()"
          class="hover:border-stroke border border-transparent rounded-md hover:bg-hover"
        >
          <Icon name="ChevronLeftIcon" class="w-5 h-5" />
        </button>
        <p class="font-medium text-sm text-gray-600 select-none">
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
          class="border border-stroke w-full py-1 rounded-md hover:bg-hover"
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
          <!-- normal -->
          <div
            v-if="item.type === 'NORMAL' || !item.type"
            @click="!item.disabled && itemClicked(item)"
            class="px-2 py-1 transition-colors flex gap-1 items-center relative"
            :class="{
              'hover:text-black hover:bg-hover': !item.disabled,
              'text-gray-400': !!item.disabled,
            }"
            :disabled="!!item.disabled"
          >
            <!-- icon -->
            <Icon v-if="item.icon" :name="item.icon" class="w-5 h-5" />
            <div v-else-if="listHasIcon(current)" class="w-5 h-5" />
            <!-- text -->
            <div class="flex-grow">
              <p style="font-size: 14px" class="select-none">
                {{ item.title }}
              </p>
              <p v-if="item.subtitle" class="text-sm text-gray-500">
                {{ item.subtitle }}
              </p>
            </div>
            <!-- badge -->
            <div
              v-if="item.badgeText"
              class="text-xs font-medium border bg-white border-stroke py-0.5 px-1.5 rounded-full"
            >
              {{ item.badgeText }}
            </div>
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
            class="px-2 text-xs font-bold uppercase"
          >
            {{ item.title || "Section" }}
          </p>
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

export default defineComponent({
  props: {
    alignRight: Boolean,
    list: {
      type: Array as () => Array<MenuItem>,
      required: true,
    },
  },
  components: { Popup, Icon },
  setup(props) {
    const visible = ref(false);
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

    const current = ref(props.list);

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
    });

    onKeyDown("Escape", (e) => {
      window.requestAnimationFrame(() => {
        if (visible.value && !!navigation.value.history.slice(-1)[0]) {
          e.preventDefault();
          navigation.value.history.pop();
        }
      });
    });

    function listHasIcon(list: Array<MenuItem>) {
      return !!list.find((item) => !!item.icon);
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
