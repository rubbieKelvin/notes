<template>
  <div
    class="flex gap-4 md:gap-10 px-6 py-3 border-b border-stroke items-center"
  >
    <div class="h-min">
      <h1 class="gap-2 text-black flex">
        <NewspaperIcon class="w-5 h-5" :class="{ 'mobile-hide': isNotePage }" />
        <button
          @click="goBack"
          class="btn p-2 only-on-mobile"
          :class="{ 'mobile-hide': !isNotePage }"
        >
          <ChevronLeftIcon class="w-5 h-5" />
        </button>
        <span class="select-none hidden md:inline">OpenNotes</span>
      </h1>
    </div>
    <div class="flex-grow">
      <SearchBar v-if="!isPublicNotePage" />
    </div>
    <div>
      <Avatar v-if="authstore.isAuthenticated" />
      <router-link v-else class="btn px-2 py-1" to="/">Sign In</router-link>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  MagnifyingGlassIcon,
  NewspaperIcon,
} from "@heroicons/vue/24/outline";
import Avatar from "@/components/Avatar.vue";
import SearchBar from "@/components/SearchBar.vue";
import { useAuthStore } from "@/stores/auth";
import useUtils from "@/composables/useUtils";
import { useRouter } from "vue-router";

export default defineComponent({
  components: {
    MagnifyingGlassIcon,
    Avatar,
    NewspaperIcon,
    SearchBar,
    ArrowLeftIcon,
    ChevronLeftIcon,
  },
  setup() {
    const utils = useUtils();
    const router = useRouter();
    const authstore = useAuthStore();

    const goBack = () => {
      router.back();
    };
    return { authstore, ...utils, goBack };
  },
});
</script>
