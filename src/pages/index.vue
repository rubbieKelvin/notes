<template>
  <div>
    <TheNavbar />

    <div class="hero">
      <span class="p-3 bg-pink-50 text-pink-400 rounded-full"
        >Awesome note taking for everyone</span
      >
      <h1 class="hero-text">
        Work on big ideas,<br />without the <span>complex</span> toolkit.
      </h1>
      <p class="hero-subtext">
        From the small stuff to the big picture, Notes organizes your work and
        activity timelines,<br />so you always know what to do and how to get it
        done.
      </p>
      <div class="flex gap-4 mt-4">
        <router-link
          class="flex px-5 py-4 rounded-full bg-primary-basic bg-opacity-20 text-primary-basic"
          to="/signup"
          >Explore Notes for free</router-link
        >
        <a
          class="flex px-5 py-4 bg-black rounded-full text-white gap-3 items-center"
          href="https://github.com/rubbieKelvin/notes/"
        >
          <Icon name="CodeIcon" class="w-6 h-6" />
          <span>See source</span>
        </a>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.hero {
  @apply container mx-auto flex flex-col items-center py-20 gap-10;

  &-text {
    @apply text-center text-[60px] font-medium text-slate-800;
    line-height: 80px;

    > span {
      @apply text-white px-2 font-serif relative;

      &::before {
        content: "";
        @apply bg-primary-basic absolute right-0 left-0 top-0 bottom-0 -z-10 rotate-3;
      }
    }
  }

  &-subtext {
    @apply text-slate-700 text-center;
  }
}
</style>

<script lang="ts">
import Icon from "@/packages/heroicons";
import TheNavbar from "@/components/TheNavbar.vue";
import useAccountStore from "@/store/useAccountStore";

export default {
  components: { TheNavbar, Icon },
  beforeRouteEnter(to: any, from: any, next: any) {
    const account = useAccountStore();
    account
      .getUser()
      .then((user) => {
        if (user) return next('/app');
        next();
      })
      .catch(() => next());
  },
};
</script>
