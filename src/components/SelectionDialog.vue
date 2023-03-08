<template>
  <UiDialog
    v-model="visible"
    dim
    escape
    closeOnClickOutside
    :verticalCenter="false"
    :extraContainerClasses="[
      'lg:mt-[10%]',
      'xl:mt-[10%]',
      'h-full',
      'lg:max-h-[50vh]',
    ]"
  >
    <div
      class="bg-themed-bg text-themed-text border border-themed-stroke lg:rounded-lg w-screen lg:w-auto lg:min-w-[50rem] flex gap-3 flex-col h-full lg:h-auto lg:max-h-full"
    >
      <!-- top -->
      <div class="flex flex-col">
        <div
          class="flex gap-4 items-center px-4 border-b border-b-themed-stroke h-[4rem]"
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
            class="btn p-1 lg:hidden"
          >
            <XMarkIcon class="w-6 h-6" />
          </button>
        </div>
        <div
          v-if="searchText.trim() && doCreateItem"
          @click="createItem"
          class="py-3 px-4 bg-themed-bg-elevated flex gap-3 hover:bg-themed-hover-bg active:bg-themed-active-bg"
        >
          <Icon name="PlusIcon" class="w-6 h-6 text-themed-accent-bg" />
          <span>Create "{{ searchText.trim() }}" {{ resourceType }}</span>
        </div>
      </div>

      <!-- results -->
      <div class="overflow-y-auto custom-scrollbar max-h-[calc(100%-5rem)]">
        <div
          v-if="loading"
          class="flex items-center flex-col gap-4 justify-center h-full"
        >
          <loading class="text-themed-accent-bg" />
        </div>
        <template v-else>
          <div v-if="groupedList.length > 0" class="flex flex-col relative">
            <template v-for="(group, index) in groupedList" :key="index">
              <template v-if="group.type === 'heading'">
                <p
                  v-if="group.title"
                  class="px-4 text-themed-text-subtle font-medium uppercase pb-2 sticky -top-1 bg-themed-bg mb-1 mt-2"
                >
                  {{ group.title }}
                </p>
              </template>
              <template v-else-if="group.type === 'item'">
                <div
                  v-if="group.item"
                  :key="index"
                  class="flex px-4 gap-2 py-2 select-none hover:bg-themed-hover-bg hover:text-themed-hover-text items-center active:bg-themed-active-bg text-themed-text mb-1"
                  @click="
                    () => {
                      group.item?.action();
                      visible = false;
                    }
                  "
                >
                  <Icon
                    v-if="group.item?.icon"
                    :name="group.item?.icon"
                    class="w-5 h-5"
                  />
                  <div>
                    <p>{{ group.item?.title }}</p>
                    <p
                      class="text-sm text-themed-text-subtle"
                      v-if="group.item?.subtitle"
                    >
                      {{ group.item?.subtitle }}
                    </p>
                  </div>
                </div>
              </template>
            </template>
          </div>
          <div
            v-else
            class="flex items-center flex-col gap-4 justify-center h-full py-12"
          >
            <EmptystateSearchIcon />
            <p class="font-bold text-2xl">Couldnt find {{ resourceType }}</p>
            <p v-if="searchText">"{{ searchText }}" didn't yield any results</p>
            <p v-else>Enter search query</p>
          </div>
        </template>
      </div>
    </div>
  </UiDialog>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  PropType,
  ref,
  Ref,
  watch,
  WritableComputedRef,
} from "vue";
import UiDialog from "@/components/Dialog/index.vue";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/vue/24/outline";
import { promiseTimeout, useFocus } from "@vueuse/core";
import EmptystateSearchIcon from "@/assets/emptystates/searchs.vue";
import { SearchedItem } from "@/types";
import Loading from "./Loading.vue";
import Icon from "./Icon";
import { UseTimeAgo } from "@vueuse/components";
import { linearGrouping } from "@/utils/grouping";

export default defineComponent({
  components: {
    UiDialog,
    MagnifyingGlassIcon,
    EmptystateSearchIcon,
    Loading,
    Icon,
    XMarkIcon,
    UseTimeAgo,
  },
  props: {
    resourceType: { type: String, default: "items" },
    modelValue: { type: Boolean },
    doCreateItem: { type: Function as PropType<(name: string) => any> },
    performSearch: {
      type: Function as PropType<
        (query?: string) => Promise<SearchedItem[] | null>
      >,
      required: true,
    },
  },
  emits: ["update:model-value", "searchmodalclose", "action:create"],
  setup(props, { emit }) {
    const searchInputEl: Ref<HTMLInputElement | null> = ref(null);
    const searchText = ref("");
    const searchItems: Ref<SearchedItem[]> = ref([]);
    const loading = ref(false);

    const { focused } = useFocus(searchInputEl, { initialValue: true });

    const groupedList = computed(() =>
      linearGrouping<SearchedItem>(searchItems.value, (item) => item.group)
    );

    const visible: WritableComputedRef<boolean> = computed({
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
      () => [searchText.value, visible.value],
      async () => {
        if (!visible.value) return;
        const text = searchText.value;

        // lets not search until he stops typing
        await promiseTimeout(200);
        if (text !== searchText.value) return;

        // search
        loading.value = true;

        const items = await props.performSearch(text ? text.trim() : undefined);
        searchItems.value = items ?? [];
        loading.value = false;
      },
      { immediate: true }
    );

    function clearText() {
      searchText.value = "";
      focused.value = true;
    }

    function createItem() {
      if (props.doCreateItem) {
        props.doCreateItem(searchText.value);
        visible.value = false;
      }
    }

    return {
      visible,
      searchInputEl,
      searchText,
      clearText,
      searchItems,
      loading,
      groupedList,
      createItem,
    };
  },
});
</script>
