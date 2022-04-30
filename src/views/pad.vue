<template>
  <div class="bg-gray-50 min-h-screen flex justify-center items-end">
    <div class="bg-white shadow-md rounded-t-md md:h-[90vh] md:max-h-[90vh] h-screen max-w-[850px] w-full flex-col flex flex-grow">
      <template v-if="note">
        <div
          class="flex items-center px-5 py-2 border-b border-b-gray-200 gap-5"
        >
          <IconButton class="w-[30px] h-[30px]" @click="$router.push('/')">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15 19L8 12L15 5"
                stroke="black"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </IconButton>
          <h1 class="flex-grow capitalize">{{note.name}}</h1>
          <div class="tools">
            <IconButton class="w-[30px] h-[30px]">
              <svg
                width="18"
                height="18"
                viewBox="0 0 25 25"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11.2326 5.39535H6.23257C5.70214 5.39535 5.19343 5.60606 4.81836 5.98114C4.44329 6.35621 4.23257 6.86492 4.23257 7.39535V18.3953C4.23257 18.9258 4.44329 19.4345 4.81836 19.8096C5.19343 20.1846 5.70214 20.3953 6.23257 20.3953H17.2326C17.763 20.3953 18.2717 20.1846 18.6468 19.8096C19.0219 19.4345 19.2326 18.9258 19.2326 18.3953V13.3953L11.2326 5.39535ZM17.8186 3.98135C18.0031 3.79033 18.2238 3.63796 18.4678 3.53315C18.7118 3.42833 18.9742 3.37316 19.2398 3.37085C19.5053 3.36854 19.7687 3.41914 20.0145 3.51971C20.2603 3.62027 20.4836 3.76877 20.6714 3.95656C20.8591 4.14435 21.0077 4.36765 21.1082 4.61344C21.2088 4.85923 21.2594 5.12259 21.2571 5.38815C21.2548 5.65371 21.1996 5.91615 21.0948 6.16016C20.99 6.40417 20.8376 6.62486 20.6466 6.80935L12.0606 15.3953H9.23257V12.5673L17.8186 3.98135Z"
                  stroke="black"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </IconButton>
          </div>
        </div>

        <ViewPad :data="note"/>
      </template>
      <template v-else>
          <div class="h-full flex flex-col gap-4 items-center justify-center">
              <Emptystate_note/>
              <div class="flex gap-2 flex-col items-center">
              <h1 class=" text-5xl">404</h1>
              <p class="text-gray-500 max-w-[200px] text-center">Couldnt find <span class="text-gray-800 bg-gray-100 rounded-md p-1">{{slug}}</span> in your notes.</p>
                <router-link class=" bg-primary-basic p-2 bg-opacity-10 hover:bg-opacity-25 text-primary-basic rounded-md" to="/">Go Home</router-link>
              </div>
          </div>
      </template>
    </div>
  </div>
</template>

<script>
import IconButton from "@/components/IconButton.vue";
import useNote from "@/composables/useNotes";
import { computed } from "@vue/runtime-core";
import Emptystate_note from "@/assets/svgs/emptystate_note.vue";
import ViewPad from "./pad/view.vue";

export default {
  props: {
    ld: {
      type: String,
      default: null,
    }
  },
  components: { IconButton, Emptystate_note, ViewPad },
  setup(props) {
    const { getNote } = useNote();
    const note = computed(() => getNote(props.ld));
    return { note };
  },
};
</script>
