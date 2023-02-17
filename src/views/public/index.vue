<template>
  <div class="h-full flex items-center justify-center">
    <div
      class="md:p-2 p-5 w-full md:h-min h-full md:w-min md:min-w-[40rem] rounded-md flex flex-col gap-4"
    >
      <logo isPublic />

      <div class="flex flex-col gap-3">
        <TextInput
          class="min-w-full"
          placeholder="Search public directory"
          icon="MagnifyingGlassIcon"
          :button="{
            icon: 'ArrowRightIcon',
            action: () => {},
          }"
        />
        <Banner
          :useTimer="false"
          icon="InformationCircleIcon"
          modelValue="Info"
          subtitle="Only public notes and users who have public notes are shown"
          class="text-yellow-600 bg-yellow-600"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Banner from "@/components/Banner.vue";
import Logo from "@/components/Logo.vue";
import TextInput from "@/components/TextInput.vue";
import { NewspaperIcon } from "@heroicons/vue/24/outline";
import { defineComponent } from "vue";

export default defineComponent({
  components: { NewspaperIcon, TextInput, Logo, Banner },
  setup() {},
});
</script>

<style lang="scss" scoped>
:deep(.textinput--button) {
  @apply bg-themed-accent-bg text-white rounded-md;

  &:hover {
    @apply bg-themed-accent-hover-bg;
  }
}
</style>
