<template>
  <UiDialog
    v-model="visible"
    dim
    escape
    closeOnClickOutside
    :verticalCenter="false"
    :extraContainerClasses="['lg:mt-[14%]']"
  >
    <div
      class="bg-themed-bg border border-themed-stroke rounded-lg w-screen h-screen lg:h-auto lg:w-auto lg:min-w-[50rem] flex gap-3 flex-col"
    >
      <div class="w-full h-full flex flex-col gap-2">
        <!-- top -->
        <div
          class="flex gap-4 items-center px-4 border-b border-b-themed-stroke"
        >
          <MagnifyingGlassIcon class="w-6 h-6 text-themed-accent-bg" />
          <input
            ref="searchInputEl"
            type="text"
            v-model="searchText"
            class="outline-none bg-transparent flex-grow focus:outline-none py-4 text-lg"
            :placeholder="`Search ${resourceType}...`"
          />
          <button
            v-if="searchText.length > 0"
            class="font-medium"
            @click="clearText"
          >
            Clear
          </button>
          <button
            v-else
            @click="$emit('searchmodalclose')"
          >
          <ChevronRightIcon class="w-6 h-6 text-themed-accent-bg"/>
          </button>
        </div>

        <!-- results -->
        <div class="">
          <div class="h-full max-h-full lg:max-h-[30rem] overflow-scroll">
            <div
              v-if="loading"
              class="flex items-center flex-col gap-4 justify-center h-full"
            >
              <loading class="text-themed-accent-bg" />
            </div>
            <template v-else>
              <template v-if="groupedList.length > 0">
                <div
                  v-for="group in groupedList"
                  :key="group.key"
                  class="flex flex-col mb-4 relative"
                >
                  <p
                    class="px-4 text-themed-text-subtle font-medium uppercase pb-2 sticky -top-1 bg-themed-bg"
                  >
                    {{ group.key }}
                  </p>
                  <div
                    v-for="(item, index) in group.items"
                    :key="index"
                    class="flex px-4 gap-2 py-2 select-none hover:bg-themed-hover-bg hover:text-themed-hover-text items-center active:bg-themed-active-bg"
                    @click="
                      () => {
                        item.action();
                        visible = false;
                      }
                    "
                  >
                    <Icon v-if="item.icon" :name="item.icon" class="w-5 h-5" />
                    <div>
                      <p>{{ item.title }}</p>
                      <p class="text-sm text-themed-text-subtle">
                        {{ item.subtitle }}
                      </p>
                    </div>
                  </div>
                </div>
              </template>
              <div
                v-else
                class="flex items-center flex-col gap-4 justify-center h-full py-12"
              >
                <EmptystateSearchIcon />
                <p class="font-bold text-2xl">
                  Couldnt find {{ resourceType }}
                </p>
                <p v-if="searchText">
                  "{{ searchText }}" didn't yield any results
                </p>
                <p v-else>Enter search query</p>
                <!-- <button
                  v-if="searchText"
                  class="bg-themed-accent-bg rounded-md px-4 py-2 hover:bg-themed-accent-hover-bg active:bg-themed-accent-active-bg text-themed-accent-text"
                >
                  Create "{{ searchText }}"
                </button> -->
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </UiDialog>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, ref, Ref, watch } from "vue";
import UiDialog from "@/components/Dialog/index.vue";
import { MagnifyingGlassIcon, ChevronRightIcon } from "@heroicons/vue/24/outline";
import { promiseTimeout, useFocus } from "@vueuse/core";
import EmptystateSearchIcon from "@/assets/emptystates/searchs.vue";
import { SearchedItem } from "@/types";
import Loading from "./Loading.vue";
import Icon from "./Icon";

export default defineComponent({
  components: {
    UiDialog,
    MagnifyingGlassIcon,
    EmptystateSearchIcon,
    Loading,
    Icon,
    ChevronRightIcon
},
  props: {
    resourceType: { type: String, default: "items" },
    modelValue: { type: Boolean },
    performSearch: {
      type: Function as PropType<
        (query?: string) => Promise<SearchedItem[] | null>
      >,
      required: true,
    },
  },
  emits: ["update:model-value", "searchmodalclose"],
  setup(props, { emit }) {
    const searchInputEl: Ref<HTMLInputElement | null> = ref(null);
    const searchText = ref("");
    const searchItems: Ref<SearchedItem[]> = ref([]);
    const loading = ref(false);

    const { focused } = useFocus(searchInputEl, { initialValue: true });

    const groupedList = computed(() => {
      const groups: Record<string, SearchedItem[]> = {};

      searchItems.value.forEach((item) => {
        const key = item.group ?? "";
        if (groups[key]) groups[key].push(item);
        else groups[key] = [item];
      });

      return Object.keys(groups).map((key) => ({ key, items: groups[key] }));
    });

    const visible = computed({
      get() {
        return props.modelValue;
      },
      set(val) {
        emit("update:model-value", val);
      },
    });

    watch(
      () => props.modelValue,
      (value) => {
        if (!value) {
          searchText.value = "";
        }
      }
    );

    watch(
      searchText,
      async (text) => {
        // lets not search until he stops typing
        await promiseTimeout(200);
        if (text !== searchText.value) return;

        // search
        loading.value = true;

        const items = await props.performSearch(text ?? undefined);
        searchItems.value = items ?? [];
        loading.value = false;
      },
      { immediate: true }
    );

    function clearText() {
      searchText.value = "";
      focused.value = true;
    }


    return {
      visible,
      searchInputEl,
      searchText,
      clearText,
      searchItems,
      loading,
      groupedList,
    };
  },
});
</script>
